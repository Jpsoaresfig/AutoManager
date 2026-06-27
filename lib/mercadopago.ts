// ============================================================================
// Integração Mercado Pago - Assinaturas (preapproval) dos planos do AutoManager.
// Uso EXCLUSIVO no servidor (route handlers). O MP_ACCESS_TOKEN é segredo.
//
// Fluxo: criamos uma "preapproval" (assinatura recorrente mensal) e redirecionamos
// o dono para o init_point do MP. Quando ele autoriza, o MP chama nosso webhook e
// nós aplicamos o plano na tabela `assinatura` (via service role).
// ============================================================================

import { createClient as createAdmin } from "@supabase/supabase-js";
import { PLANOS, type PlanoId } from "./plans";

const MP_BASE = "https://api.mercadopago.com";

export function mpToken(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN não configurado");
  return t;
}

export function appUrl(): string {
  // remove barra final p/ montar URLs previsíveis
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// reais (ex.: 99.00) a partir dos centavos do catálogo de planos
function precoReais(plano: PlanoId): number {
  return Math.round(PLANOS[plano].precoCentavos) / 100;
}

// referência que viaja com a assinatura no MP e volta no webhook
export function montarRef(orgId: string, plano: PlanoId): string {
  return `${orgId}:${plano}`;
}
export function lerRef(ref: string | null | undefined): { orgId: string; plano: PlanoId } | null {
  if (!ref) return null;
  const [orgId, plano] = ref.split(":");
  if (!orgId || !["ambulante", "solo", "equipe", "expansao"].includes(plano)) return null;
  return { orgId, plano: plano as PlanoId };
}

export interface Preapproval {
  id: string;
  init_point?: string;
  status?: string; // pending | authorized | paused | cancelled
  external_reference?: string;
  payer_email?: string;
}

// ---- cria a assinatura recorrente e devolve o link de checkout (init_point) ----
export async function criarPreapproval(params: {
  plano: PlanoId;
  email: string;
  orgId: string;
}): Promise<Preapproval> {
  const { plano, email, orgId } = params;
  const def = PLANOS[plano];

  const body = {
    reason: `AutoManager - Plano ${def.nome}`,
    external_reference: montarRef(orgId, plano),
    payer_email: email,
    back_url: `${appUrl()}/configuracoes/plano?mp=retorno`,
    notification_url: `${appUrl()}/api/mercadopago/webhook`,
    status: "pending",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: precoReais(plano),
      currency_id: "BRL",
    },
  };

  const res = await fetch(`${MP_BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Mercado Pago retornou ${res.status}`);
  }
  return json as Preapproval;
}

// ============================================================================
// Recebimentos (pagamentos avulsos) -> caixa de entrada da loja.
// Quando um pagamento cai numa conta conectada, o MP chama o webhook com
// type=payment. Consultamos o pagamento real e, se aprovado, gravamos uma
// "entrada_pendente" para o dono confirmar se foi venda da loja.
//
// Como o MP sabe de qual org é o pagamento: a cobrança precisa carregar o
// external_reference = orgId (ex.: ao gerar o QR/Point da loja). Sem isso não
// há como atribuir o dinheiro a uma loja, então a entrada é ignorada.
// ============================================================================

export interface Pagamento {
  id: number | string;
  status?: string; // approved | pending | rejected | ...
  transaction_amount?: number;
  description?: string;
  external_reference?: string;
  payment_method_id?: string; // pix | master | visa | ...
  payment_type_id?: string; // credit_card | debit_card | account_money | bank_transfer
  payer?: { email?: string; first_name?: string; last_name?: string };
}

// consulta o pagamento real na API do MP (fonte da verdade, não confiar no webhook)
export async function buscarPagamento(id: string): Promise<Pagamento> {
  const res = await fetch(`${MP_BASE}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${mpToken()}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Mercado Pago retornou ${res.status}`);
  return json as Pagamento;
}

// extrai o orgId do external_reference, ignorando o formato de assinatura (orgId:plano)
function orgIdDoPagamento(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (ref.includes(":")) return null; // é uma assinatura (preapproval), não um recebimento
  return ref;
}

// mapeia o meio de pagamento do MP para a forma_pagamento interna
function formaPagamentoMP(p: Pagamento): string {
  if (p.payment_method_id === "pix" || p.payment_type_id === "bank_transfer") return "pix";
  if (p.payment_type_id === "credit_card") return "credito";
  if (p.payment_type_id === "debit_card") return "debito";
  if (p.payment_type_id === "ticket") return "boleto";
  return "pix";
}

// grava o pagamento aprovado como entrada pendente (idempotente pelo id do MP).
// Retorna true se gravou, false se ignorou (não aprovado / sem org / duplicado).
export async function registrarRecebimentoMP(p: Pagamento): Promise<boolean> {
  if (p.status !== "approved") return false;
  const orgId = orgIdDoPagamento(p.external_reference);
  if (!orgId) return false;
  const valor = Number(p.transaction_amount || 0);
  if (!valor) return false;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const pagador =
    p.payer?.email ||
    [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" ") ||
    null;

  // onConflict no índice único (org_id, provider_pagamento_id) evita duplicar em reenvio
  const { error } = await admin
    .from("entrada_pendente")
    .upsert(
      {
        org_id: orgId,
        valor,
        origem: "mercadopago",
        descricao: p.description || "Pagamento via Mercado Pago",
        pagador,
        forma_pagamento: formaPagamentoMP(p),
        provider_pagamento_id: String(p.id),
        status: "pendente",
      },
      { onConflict: "org_id,provider_pagamento_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
  return true;
}

// ---- consulta o status real de uma assinatura no MP (fonte da verdade) ----
export async function buscarPreapproval(id: string): Promise<Preapproval> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${mpToken()}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Mercado Pago retornou ${res.status}`);
  return json as Preapproval;
}

// ---- cancela uma assinatura no MP (usado ao trocar de plano p/ não cobrar duas vezes) ----
export async function cancelarPreapproval(id: string): Promise<void> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${mpToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || `Mercado Pago retornou ${res.status}`);
  }
}

// soma 1 mês mantendo o dia (fim do ciclo mensal pago)
function umMesDepois(de: Date): Date {
  const d = new Date(de);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// ---- aplica o resultado de uma preapproval na tabela `assinatura` (service role) ----
// Retorna o plano aplicado (ou null se nada foi alterado).
export async function aplicarPreapproval(p: Preapproval): Promise<PlanoId | null> {
  const ref = lerRef(p.external_reference);
  if (!ref) return null;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // mapeia status do MP -> status interno
  const st = p.status;
  if (st === "authorized") {
    // assinatura que estava ativa antes desta (p/ não cobrar dois planos ao trocar)
    const { data: atual } = await admin
      .from("assinatura")
      .select("provider_assinatura_id")
      .eq("org_id", ref.orgId)
      .maybeSingle();

    const inicio = new Date();
    await admin
      .from("assinatura")
      .update({
        plano: ref.plano,
        status: "active",
        preco_centavos: PLANOS[ref.plano].precoCentavos,
        periodo: "mensal",
        trial_ate: null,
        data_inicio: inicio.toISOString(),
        data_fim: umMesDepois(inicio).toISOString(), // fim do ciclo pago (próxima cobrança)
        provider: "mercadopago",
        provider_assinatura_id: p.id,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", ref.orgId);

    // cancela a assinatura ANTERIOR no MP, se houver outra diferente desta.
    // Em try/catch: conceder o plano novo é prioridade; falha aqui não pode
    // derrubar a ativação (no pior caso o cancelamento é refeito num retry/manual).
    const antiga = atual?.provider_assinatura_id;
    if (antiga && antiga !== p.id) {
      try {
        await cancelarPreapproval(antiga);
      } catch (e) {
        console.error("Falha ao cancelar assinatura MP anterior", antiga, e);
      }
    }
    return ref.plano;
  }

  if (st === "cancelled" || st === "paused") {
    await admin
      .from("assinatura")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("org_id", ref.orgId)
      .eq("provider_assinatura_id", p.id);
    return null;
  }

  return null;
}
