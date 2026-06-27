import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { capacidades, limiteDoRecurso, type Assinatura, type PlanoId } from "@/lib/plans";

// Cria/remove membros (vendedor, motoboy) com login+senha definidos pelo admin.
// Usa a service_role (somente servidor) p/ criar usuários no Auth, mas SÓ depois
// de confirmar que quem chama é o dono (owner) da org.

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
  return { userId: user.id, orgId: eu.org_id as string };
}

export async function POST(req: Request) {
  const dono = await donoDaOrg();
  if (!dono) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const { nome, email, senha, role } = await req.json().catch(() => ({}));
  if (!email || !senha || senha.length < 6)
    return NextResponse.json({ erro: "E-mail e senha (mín. 6) obrigatórios" }, { status: 400 });
  if (!["vendedor", "motoboy"].includes(role))
    return NextResponse.json({ erro: "Papel inválido" }, { status: 400 });

  // checagem de plano ANTES de criar o usuário (evita órfão + dá erro amigável)
  const { data: a } = await admin()
    .from("assinatura")
    .select("plano, status, preco_centavos, periodo, data_inicio, data_fim, trial_ate")
    .eq("org_id", dono.orgId)
    .maybeSingle();
  const assinatura: Assinatura | null = a
    ? {
        plano: a.plano as PlanoId,
        status: a.status,
        precoCentavos: a.preco_centavos ?? 0,
        periodo: a.periodo ?? "mensal",
        dataInicio: a.data_inicio ? new Date(a.data_inicio).getTime() : null,
        dataFim: a.data_fim ? new Date(a.data_fim).getTime() : null,
        trialAte: a.trial_ate ? new Date(a.trial_ate).getTime() : null,
      }
    : null;
  const caps = capacidades(assinatura);
  if ((role === "vendedor" && !caps.allowVendedores) || (role === "motoboy" && !caps.allowMotoboys))
    return NextResponse.json(
      { erro: `Seu plano não permite criar ${role === "vendedor" ? "vendedores" : "motoboys"}. Faça upgrade.` },
      { status: 403 }
    );

  // limite de vendedores do plano (Equipe = 3): erro amigável antes de criar o órfão
  if (role === "vendedor") {
    const limite = limiteDoRecurso(caps, "vendedores");
    if (Number.isFinite(limite)) {
      const { count } = await admin()
        .from("usuario")
        .select("id", { count: "exact", head: true })
        .eq("org_id", dono.orgId)
        .eq("role", "vendedor");
      if ((count ?? 0) >= limite)
        return NextResponse.json(
          { erro: `Seu plano permite até ${limite} vendedores. Faça upgrade para adicionar mais.` },
          { status: 403 }
        );
    }
  }

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, org_id: dono.orgId, role },
  });
  if (error)
    return NextResponse.json(
      { erro: /already|exists|registered/i.test(error.message) ? "E-mail já cadastrado" : error.message },
      { status: 400 }
    );

  return NextResponse.json({
    membro: { id: data.user.id, nome: nome ?? null, email, role },
  });
}

export async function DELETE(req: Request) {
  const dono = await donoDaOrg();
  if (!dono) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const { id } = await req.json().catch(() => ({}));
  if (!id || id === dono.userId)
    return NextResponse.json({ erro: "ID inválido" }, { status: 400 });

  // garante que o alvo pertence à mesma org antes de excluir
  const sbAdmin = admin();
  const { data: alvo } = await sbAdmin
    .from("usuario")
    .select("org_id")
    .eq("id", id)
    .maybeSingle();
  if (!alvo || alvo.org_id !== dono.orgId)
    return NextResponse.json({ erro: "Membro não encontrado" }, { status: 404 });

  const { error } = await sbAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
