import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { capacidades, type Assinatura, type PlanoId, type StatusAssinatura } from "@/lib/plans";

// Ativação self-service da revendedora: ela informa o e-mail que a loja liberou e
// escolhe a própria senha no 1º acesso. Só funciona se o dono liberou o acesso
// (acesso_liberado = true) e ela ainda não ativou (user_id null).

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}));
  const mail = (email || "").trim().toLowerCase();
  if (!mail || !senha || senha.length < 6)
    return NextResponse.json({ erro: "Informe o e-mail e uma senha de pelo menos 6 caracteres." }, { status: 400 });

  const sb = admin();

  // revendedora liberada e ainda não ativada
  const { data: rev } = await sb
    .from("revendedora")
    .select("id, nome, org_id, acesso_liberado, user_id, ativa")
    .ilike("email", mail)
    .eq("acesso_liberado", true)
    .is("user_id", null)
    .eq("ativa", true)
    .limit(1)
    .maybeSingle();

  if (!rev)
    return NextResponse.json(
      { erro: "Este e-mail não está liberado para acesso. Fale com a loja." },
      { status: 403 }
    );

  // o plano atual da loja inclui revendedoras? (Ambulante = 0 -> bloqueia o acesso).
  // espelha private.permite_revendedoras; evita criar login que não vai conseguir entrar.
  const { data: assin } = await sb
    .from("assinatura")
    .select("plano, status, trial_ate")
    .eq("org_id", rev.org_id)
    .maybeSingle();
  const assinatura: Assinatura | null = assin
    ? {
        plano: assin.plano as PlanoId,
        status: assin.status as StatusAssinatura,
        precoCentavos: 0,
        periodo: "mensal",
        dataInicio: null,
        dataFim: null,
        trialAte: assin.trial_ate ? new Date(assin.trial_ate).getTime() : null,
      }
    : null;
  if (capacidades(assinatura).maxRevendedoras === 0)
    return NextResponse.json(
      { erro: "O plano atual da loja não inclui revendedoras. Fale com a loja." },
      { status: 403 }
    );

  // cria o login (role 'revendedora' -> trigger NÃO cria org/usuario)
  const { data: created, error: errCreate } = await sb.auth.admin.createUser({
    email: mail,
    password: senha,
    email_confirm: true,
    user_metadata: { role: "revendedora", nome: rev.nome },
  });
  if (errCreate) {
    const dup = /already|exists|registered/i.test(errCreate.message);
    return NextResponse.json(
      { erro: dup ? "Esse e-mail já tem acesso. Use a opção Entrar." : errCreate.message },
      { status: 400 }
    );
  }

  // vincula o login à revendedora
  const { error: errLink } = await sb.from("revendedora").update({ user_id: created.user.id }).eq("id", rev.id);
  if (errLink) {
    // desfaz o usuário órfão se não conseguiu vincular
    await sb.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ erro: "Não foi possível concluir a ativação. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
