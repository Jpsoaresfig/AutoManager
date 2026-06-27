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
  const { email, senha, codigo } = await req.json().catch(() => ({}));
  const mail = (email || "").trim().toLowerCase();
  const cod = (codigo || "").trim().toUpperCase();
  if (!mail || !senha || senha.length < 6)
    return NextResponse.json({ erro: "Informe o e-mail e uma senha de pelo menos 6 caracteres." }, { status: 400 });
  if (!cod)
    return NextResponse.json({ erro: "Informe o código de acesso que a loja enviou para você." }, { status: 400 });

  const sb = admin();

  // Mensagem única para os casos de "não elegível" (não cadastrada, não liberada,
  // código errado/expirado, plano sem revendedoras): evita que se descubra quais
  // e-mails estão cadastrados ou se um e-mail existe.
  const naoElegivel = NextResponse.json(
    { erro: "E-mail ou código inválido. Confirme com a loja o e-mail liberado e o código de acesso." },
    { status: 403 }
  );

  // revendedora liberada e ainda não ativada
  const { data: rev } = await sb
    .from("revendedora")
    .select("id, nome, org_id, acesso_liberado, user_id, ativa, acesso_codigo, acesso_codigo_expira")
    .ilike("email", mail)
    .eq("acesso_liberado", true)
    .is("user_id", null)
    .eq("ativa", true)
    .limit(1)
    .maybeSingle();

  if (!rev) return naoElegivel;

  // código de convite: precisa bater e não estar expirado (uso único — limpo no fim).
  const expira = rev.acesso_codigo_expira ? new Date(rev.acesso_codigo_expira).getTime() : 0;
  if (!rev.acesso_codigo || rev.acesso_codigo.toUpperCase() !== cod || expira < Date.now())
    return naoElegivel;

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
  if (capacidades(assinatura).maxRevendedoras === 0) return naoElegivel;

  // cria o login (role 'revendedora' -> trigger NÃO cria org/usuario)
  const { data: created, error: errCreate } = await sb.auth.admin.createUser({
    email: mail,
    password: senha,
    email_confirm: true,
    user_metadata: { role: "revendedora", nome: rev.nome },
  });
  if (errCreate) {
    const dup = /already|exists|registered/i.test(errCreate.message);
    // genérico: não confirma que o e-mail é de uma revendedora cadastrada,
    // mas ainda orienta quem já ativou a usar "Entrar".
    return NextResponse.json(
      { erro: dup ? "Se você já ativou antes, use a opção Entrar." : "Não foi possível concluir a ativação. Tente novamente." },
      { status: 400 }
    );
  }

  // vincula o login à revendedora e consome o código (uso único)
  const { error: errLink } = await sb
    .from("revendedora")
    .update({ user_id: created.user.id, acesso_codigo: null, acesso_codigo_expira: null })
    .eq("id", rev.id);
  if (errLink) {
    // desfaz o usuário órfão se não conseguiu vincular
    await sb.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ erro: "Não foi possível concluir a ativação. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
