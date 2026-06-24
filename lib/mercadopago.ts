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
  if (!orgId || !["solo", "equipe", "expansao"].includes(plano)) return null;
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

// ---- consulta o status real de uma assinatura no MP (fonte da verdade) ----
export async function buscarPreapproval(id: string): Promise<Preapproval> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${mpToken()}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Mercado Pago retornou ${res.status}`);
  return json as Preapproval;
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
    await admin
      .from("assinatura")
      .update({
        plano: ref.plano,
        status: "active",
        preco_centavos: PLANOS[ref.plano].precoCentavos,
        periodo: "mensal",
        trial_ate: null,
        data_inicio: new Date().toISOString(),
        provider: "mercadopago",
        provider_assinatura_id: p.id,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", ref.orgId);
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
