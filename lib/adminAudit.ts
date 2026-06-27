import type { SupabaseClient } from "@supabase/supabase-js";

// Grava uma linha na trilha de auditoria do super-admin (tabela public.admin_log,
// migration 0032). Recebe o client com service_role (ignora RLS). Nunca lança.
// Retorna { ok } para que ações DESTRUTIVAS possam exigir a trilha ANTES de
// destruir (ver /api/admin/usuario "deletar"); ações reversíveis podem ignorar.
export async function registrarAdminLog(
  admin: SupabaseClient,
  entrada: {
    actorEmail: string;
    acao: string;
    alvoOrgId?: string | null;
    alvoDescricao?: string | null;
    detalhe?: Record<string, unknown> | null;
  }
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { error } = await admin.from("admin_log").insert({
      actor_email: entrada.actorEmail,
      acao: entrada.acao,
      alvo_org_id: entrada.alvoOrgId ?? null,
      alvo_descricao: entrada.alvoDescricao ?? null,
      detalhe: entrada.detalhe ?? null,
    });
    if (error) {
      console.error("admin_log: falha ao registrar", error.message);
      return { ok: false, erro: error.message };
    }
    return { ok: true };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "exceção";
    console.error("admin_log: exceção ao registrar", e);
    return { ok: false, erro };
  }
}
