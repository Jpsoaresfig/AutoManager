import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

// Remove uma revendedora da loja. Só o dono (owner) da org pode. Usa service_role
// para apagar também a conta de auth dela (se já tiver ativado o login), senão
// sobraria um usuário órfão capaz de autenticar. As vendas dela NÃO são apagadas:
// a FK venda.revendedora_id é "on delete set null" (a venda fica, sem vínculo).

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function donoDaOrg() {
  const sb = createServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: eu } = await sb.from("usuario").select("org_id, role").eq("id", user.id).maybeSingle();
  if (!eu || eu.role !== "owner") return null;
  return { userId: user.id, orgId: eu.org_id as string };
}

export async function POST(req: Request) {
  const dono = await donoDaOrg();
  if (!dono) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });

  const a = admin();

  // confirma que a revendedora é desta loja antes de mexer
  const { data: rev } = await a
    .from("revendedora")
    .select("id, org_id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!rev || rev.org_id !== dono.orgId)
    return NextResponse.json({ erro: "Revendedora não encontrada" }, { status: 404 });

  // apaga o login dela, se existir (não sai na cascata da revendedora)
  if (rev.user_id) {
    const { error: eAuth } = await a.auth.admin.deleteUser(rev.user_id);
    if (eAuth) console.error("Falha ao apagar login da revendedora", rev.user_id, eAuth.message);
  }

  const { error } = await a.from("revendedora").delete().eq("id", id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
