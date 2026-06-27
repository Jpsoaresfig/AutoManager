import { NextResponse } from "next/server";
import {
  buscarPreapproval,
  aplicarPreapproval,
  buscarPagamento,
  registrarRecebimentoMP,
} from "@/lib/mercadopago";

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
