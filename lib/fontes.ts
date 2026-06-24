// Fontes selecionáveis para a vitrine da loja. As "google" são carregadas sob
// demanda via <link>; se a rede falhar, cai no fallback do stack (system fonts).

export type FonteDef = { key: string; label: string; stack: string; google?: string };

export const FONTES: FonteDef[] = [
  { key: "padrao", label: "Padrão (do app)", stack: "" },
  { key: "poppins", label: "Poppins", stack: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700" },
  { key: "montserrat", label: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700" },
  { key: "raleway", label: "Raleway", stack: "'Raleway', system-ui, sans-serif", google: "Raleway:wght@400;500;600;700" },
  { key: "playfair", label: "Playfair (elegante)", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;500;600;700" },
  { key: "lora", label: "Lora (serifa)", stack: "'Lora', Georgia, serif", google: "Lora:wght@400;500;600;700" },
  { key: "cormorant", label: "Cormorant (luxo)", stack: "'Cormorant Garamond', Georgia, serif", google: "Cormorant+Garamond:wght@400;500;600;700" },
  { key: "quicksand", label: "Quicksand (suave)", stack: "'Quicksand', system-ui, sans-serif", google: "Quicksand:wght@400;500;600;700" },
  { key: "mono", label: "Mono", stack: "'Courier New', monospace" },
];

export function fonteDef(key: string | null | undefined): FonteDef {
  return FONTES.find((f) => f.key === key) || FONTES[0];
}

// Injeta o <link> da Google Font (idempotente) e devolve o font-family a aplicar.
export function carregarFonte(key: string | null | undefined): string {
  const f = fonteDef(key);
  if (!f.google || typeof document === "undefined") return f.stack;
  const id = "gf-" + f.key;
  if (!document.getElementById(id)) {
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
    document.head.appendChild(l);
  }
  return f.stack;
}
