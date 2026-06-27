import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPERADMIN_EMAIL } from "@/lib/admin";
import { registrarAdminLog } from "@/lib/adminAudit";

// Moderação de contas pelo super-admin (cortesia / abuso):
//   - desativar : suspende a loja (bloqueia login de todos os usuários dela). Reversível.
//   - banir     : bloqueia login (igual desativar no efeito, rótulo punitivo).  Reversível.
//   - reativar  : reabre o acesso (remove o ban) de uma loja desativada/banida.
//   - deletar   : APAGA a loja, todos os dados e as contas de auth. Irreversível.
// Tudo via service_role (ignora RLS), só depois de confirmar o super-admin.

const BAN_LONGO = "876000h"; // ~100 anos = bloqueado por tempo indeterminado

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function exigirSuperadmin() {
  const sb = createServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  if ((user.email ?? "").trim().toLowerCase() !== SUPERADMIN_EMAIL) return null;
  return user;
}

type Acao = "desativar" | "banir" | "reativar" | "deletar";

export async function POST(req: Request) {
  const su = await exigirSuperadmin();
  if (!su) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const { orgId, acao, confirmacao } = (await req.json().catch(() => ({}))) as {
    orgId?: string;
    acao?: Acao;
    confirmacao?: string;
  };
  if (!orgId || !["desativar", "banir", "reativar", "deletar"].includes(acao ?? ""))
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const a = admin();

  // membros internos da loja (id = id do auth.users) + papel p/ identificar o dono.
  const { data: usuarios, error: erroUsuarios } = await a
    .from("usuario")
    .select("id, email, role")
    .eq("org_id", orgId);
  if (erroUsuarios)
    return NextResponse.json({ erro: erroUsuarios.message }, { status: 500 });

  // revendedoras vivem num plano de auth paralelo (revendedora.user_id), fora de
  // public.usuario. Sem isto, banir/deletar a loja não as atingia (C-2).
  const { data: revs, error: erroRevs } = await a
    .from("revendedora")
    .select("user_id")
    .eq("org_id", orgId)
    .not("user_id", "is", null);
  if (erroRevs)
    return NextResponse.json({ erro: erroRevs.message }, { status: 500 });

  // trava de segurança: nunca agir sobre a própria conta do super-admin
  if ((usuarios ?? []).some((u) => (u.email ?? "").trim().toLowerCase() === SUPERADMIN_EMAIL))
    return NextResponse.json({ erro: "Não é possível moderar a conta de administração." }, { status: 400 });

  const idsMembros = (usuarios ?? []).map((u) => u.id);
  const idsRevendedoras = (revs ?? []).map((r) => r.user_id as string).filter(Boolean);
  // todas as contas de auth da loja (membros + revendedoras), sem duplicatas.
  const idsAuth = Array.from(new Set([...idsMembros, ...idsRevendedoras]));

  // descrição da loja p/ a trilha de auditoria (nome + e-mail do DONO — B-4).
  const { data: orgRow } = await a.from("org").select("nome").eq("id", orgId).maybeSingle();
  const donoEmail =
    (usuarios ?? []).find((u) => u.role === "owner")?.email ?? (usuarios ?? [])[0]?.email ?? null;
  const alvoDescricao = `${orgRow?.nome ?? "loja"}${donoEmail ? ` (${donoEmail})` : ""}`;
  const actorEmail = (su.email ?? "").trim().toLowerCase();

  try {
    if (acao === "deletar") {
      // B-5: confirmação forte no servidor — exige o nome exato da loja.
      const nomeEsperado = (orgRow?.nome ?? "").trim().toLowerCase();
      if (!nomeEsperado || (confirmacao ?? "").trim().toLowerCase() !== nomeEsperado)
        return NextResponse.json(
          { erro: "Confirmação inválida: digite o nome exato da loja." },
          { status: 400 }
        );
      // A-8: a ação mais irreversível do sistema é AUDITADA ANTES de destruir, e a
      // falha de auditoria ABORTA o delete — nunca apagamos uma loja sem deixar trace.
      const trace = await registrarAdminLog(a, {
        actorEmail,
        acao: "deletar",
        alvoOrgId: orgId,
        alvoDescricao,
        detalhe: {
          fase: "iniciado",
          usuarios: idsMembros.length,
          revendedoras: idsRevendedoras.length,
        },
      });
      if (!trace.ok)
        return NextResponse.json(
          { erro: "Não foi possível registrar a auditoria; exclusão abortada por segurança." },
          { status: 500 }
        );

      // apaga a org -> cascata remove todos os dados e as linhas de public.usuario.
      const { error } = await a.from("org").delete().eq("id", orgId);
      if (error) throw new Error(error.message);
      // remove TODAS as contas de autenticação (membros + revendedoras): não saem
      // na cascata da org (auth.users é tabela do GoTrue).
      let authRemovidos = 0;
      for (const id of idsAuth) {
        const { error: e } = await a.auth.admin.deleteUser(id);
        if (e) console.error("Falha ao deletar auth user", id, e.message);
        else authRemovidos++;
      }
      await registrarAdminLog(a, {
        actorEmail,
        acao: "deletar",
        alvoOrgId: orgId,
        alvoDescricao,
        detalhe: { fase: "concluido", auth_removidos: authRemovidos, esperados: idsAuth.length },
      });
      return NextResponse.json({ ok: true, acao });
    }

    // bloquear (desativar/banir) ou liberar (reativar) o login. O bloqueio real na
    // camada de dados é o org.acesso (migration 0035): current_org_id() retorna NULL
    // e as RPCs da revendedora barram — vale inclusive p/ JWTs já emitidos (M-4). O
    // ban_duration no auth impede novos logins/refresh; aplicamos a membros E
    // revendedoras (C-2).
    const banir = acao === "desativar" || acao === "banir";
    for (const id of idsAuth) {
      const { error: e } = await a.auth.admin.updateUserById(id, {
        ban_duration: banir ? BAN_LONGO : "none",
      });
      if (e) console.error("Falha ao alterar ban do usuário", id, e.message);
    }

    const acesso = acao === "banir" ? "banido" : acao === "desativar" ? "desativado" : "ativo";
    const { error } = await a.from("org").update({ acesso }).eq("id", orgId);
    if (error) throw new Error(error.message);

    await registrarAdminLog(a, {
      actorEmail,
      acao: acao!,
      alvoOrgId: orgId,
      alvoDescricao,
      detalhe: { acesso, membros_afetados: idsMembros.length, revendedoras_afetadas: idsRevendedoras.length },
    });

    return NextResponse.json({ ok: true, acao, acesso });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
