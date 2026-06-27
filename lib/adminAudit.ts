import type { SupabaseClient } from "@supabase/supabase-js";

// Grava uma linha na trilha de auditoria do super-admin (tabela public.admin_log,
// migration 0032). Recebe o client com service_role (ignora RLS). Nunca lança:
// a auditoria não pode derrubar a ação que ela registra — só loga no console se falhar.
export async function registrarAdminLog(
  admin: SupabaseClient,
  entrada: {
    actorEmail: string;
    acao: string;
    alvoOrgId?: string | null;
    alvoDescricao?: string | null;
    detalhe?: Record<string, unknown> | null;
  }
) {
  try {
    const { error } = await admin.from("admin_log").insert({
      actor_email: entrada.actorEmail,
      acao: entrada.acao,
      alvo_org_id: entrada.alvoOrgId ?? null,
      alvo_descricao: entrada.alvoDescricao ?? null,
      detalhe: entrada.detalhe ?? null,
    });
    if (error) console.error("admin_log: falha ao registrar", error.message);
  } catch (e) {
    console.error("admin_log: exceção ao registrar", e);
  }
}
