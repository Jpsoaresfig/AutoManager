import { NextResponse } from "next/server";
import { buscarPreapproval, aplicarPreapproval } from "@/lib/mercadopago";

// Webhook do Mercado Pago para assinaturas (preapproval).
// Segurança: NÃO confiamos no corpo da notificação. Pegamos só o ID e
// re-consultamos o status real na API do MP com nosso access token - assim
// uma notificação forjada não consegue ativar um plano.

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

  // só tratamos eventos de assinatura (preapproval)
  const ehPreapproval = typeof tipo === "string" && tipo.includes("preapproval");
  if (!ehPreapproval || !id) {
    // responde 200 para o MP não reenviar eventos que não nos interessam
    return NextResponse.json({ ignorado: true });
  }

  try {
    const pre = await buscarPreapproval(String(id));
    await aplicarPreapproval(pre);
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
