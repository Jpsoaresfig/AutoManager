import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  buscarPreapproval,
  aplicarPreapproval,
  buscarPagamento,
  registrarRecebimentoMP,
} from "@/lib/mercadopago";

// Valida a assinatura (x-signature) do Mercado Pago. Só atua se MP_WEBHOOK_SECRET
// estiver configurado (mantém retrocompat com setups que ainda não definiram o
// segredo). Manifesto conforme docs do MP: id:<data.id>;request-id:<id>;ts:<ts>;
function assinaturaValida(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // não configurado -> não bloqueia
  const sig = req.headers.get("x-signature") || "";
  const reqId = req.headers.get("x-request-id") || "";
  const parts: Record<string, string> = {};
  for (const kv of sig.split(",")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return (
      esperado.length === v1.length &&
      crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1))
    );
  } catch {
    return false;
  }
}

// Webhook do Mercado Pago. Trata dois tipos de evento:
//  - preapproval: assinatura de plano -> aplica o plano.
//  - payment: pagamento avulso recebido -> grava na caixa de entrada da loja.
// Segurança: NÃO confiamos no corpo da notificação. Pegamos só o ID e
// re-consultamos o estado real na API do MP com nosso access token - assim
// uma notificação forjada não consegue ativar plano nem lançar recebimento.

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const url = new URL(req.url);
  const tipo = body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const id =
    body?.data?.id || body?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

  const ehPreapproval = typeof tipo === "string" && tipo.includes("preapproval");
  // "payment" cobre os topics de pagamento avulso do MP
  const ehPagamento = typeof tipo === "string" && tipo.includes("payment");
  if ((!ehPreapproval && !ehPagamento) || !id) {
    // responde 200 para o MP não reenviar eventos que não nos interessam
    return NextResponse.json({ ignorado: true });
  }

  // rejeita notificações forjadas (quando o segredo do webhook está configurado)
  if (!assinaturaValida(req, String(id))) {
    return NextResponse.json({ erro: "assinatura invalida" }, { status: 401 });
  }

  try {
    if (ehPreapproval) {
      const pre = await buscarPreapproval(String(id));
      await aplicarPreapproval(pre);
    } else {
      const pag = await buscarPagamento(String(id));
      await registrarRecebimentoMP(pag);
    }
  } catch (e) {
    // 500 faz o MP reenviar mais tarde (retry) - bom para falhas transitórias
    const msg = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// O MP às vezes faz um GET de verificação na URL do webhook.
export async function GET() {
  return NextResponse.json({ ok: true });
}
