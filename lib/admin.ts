// Configuração do suporte / superadmin do AutoManager.
//
// SUPERADMIN_EMAIL: a única conta com acesso à tela /admin (todos os chamados).
//   Precisa existir no Supabase Auth - crie com `node scripts/criar-admin.mjs`.
//   Se mudar aqui, mude também o e-mail no RLS de supabase/migrations/0016_chamados.sql.
export const SUPERADMIN_EMAIL = "admin@automanager.com";

// WhatsApp de suporte (formato wa.me, só dígitos com DDI).
export const SUPORTE_WHATSAPP = "5583993826429";
export const SUPORTE_WHATSAPP_LABEL = "+55 83 99382-6429";

export function ehSuperadmin(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

export function linkWhatsappSuporte(texto?: string): string {
  const base = `https://wa.me/${SUPORTE_WHATSAPP}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
