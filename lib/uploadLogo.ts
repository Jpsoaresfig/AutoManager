import { createClient } from "./supabase/client";

// Faz upload da logo para o bucket "lojas" na pasta da org e devolve a URL pública.
export async function uploadLogo(orgId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${orgId}/logo.${ext}`;

  const { error } = await supabase.storage.from("lojas").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || "image/png",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("lojas").getPublicUrl(path);
  // cache-buster para refletir a troca imediatamente
  return `${data.publicUrl}?v=${Date.now()}`;
}
