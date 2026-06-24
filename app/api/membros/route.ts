import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

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
