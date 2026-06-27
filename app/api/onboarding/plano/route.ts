import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { PLANOS, type PlanoId } from "@/lib/plans";

// Define o plano escolhido no onboarding como TRIAL de 1 mês (grátis) — depois
// começa a cobrar (o ciclo pago é configurado no Mercado Pago ao fim do trial).
// Só o DONO (owner) da org pode definir, e a escrita usa service_role (a tabela
// `assinatura` não é gravável via RLS pelo usuário comum).

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function donoDaOrg() {
  const sb = createServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: eu } = await sb
    .from("usuario")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!eu || eu.role !== "owner") return null;
  return { orgId: eu.org_id as string };
}

export async function POST(req: Request) {
  const dono = await donoDaOrg();
  if (!dono) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const { plano } = (await req.json().catch(() => ({}))) as { plano?: PlanoId };
  if (!plano || !["ambulante", "solo", "equipe", "expansao"].includes(plano))
    return NextResponse.json({ erro: "Plano inválido" }, { status: 400 });

  const agora = new Date();
  const trialAte = new Date(agora);
  trialAte.setMonth(trialAte.getMonth() + 1); // 1 mês grátis

  const dados = {
    plano,
    status: "trialing" as const,
    preco_centavos: PLANOS[plano].precoCentavos,
    periodo: "mensal",
    trial_ate: trialAte.toISOString(),
    data_inicio: agora.toISOString(),
    data_fim: null as string | null,
    updated_at: new Date().toISOString(),
  };

  // tenta atualizar a linha existente da org; se não houver, cria uma.
  const { data, error } = await admin()
    .from("assinatura")
    .update(dados)
    .eq("org_id", dono.orgId)
    .select("org_id")
    .maybeSingle();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  if (!data) {
    const { error: e2 } = await admin()
      .from("assinatura")
      .insert({ org_id: dono.orgId, ...dados });
    if (e2) return NextResponse.json({ erro: e2.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plano });
}
