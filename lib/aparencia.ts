// ============================================================================
// Sistema de aparência personalizável por loja.
// O admin escolhe: cor da marca + tema base (paleta de fundo) + fonte do app.
// Tudo é aplicado em runtime (admin e vitrine) e cacheado no localStorage para
// reaplicar antes da pintura (sem flash) na próxima visita.
// ============================================================================

import { gerarTonsMarca } from "./brand";
import { carregarFonte } from "./fontes";

export interface TemaBase {
  key: string;
  label: string;
  claro: boolean; // true = esquema claro (texto escuro)
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
}

// Paletas de fundo do app/admin. O admin troca livremente; a cor da marca
// (botões/destaques) é aplicada por cima de qualquer uma delas.
export const TEMAS_BASE: TemaBase[] = [
  {
    key: "escuro",
    label: "Escuro (padrão)",
    claro: false,
    bg: "#141019",
    surface: "#1d1726",
    surfaceAlt: "#2a2235",
    text: "#f5f3f7",
    textMuted: "#a79fb4",
    border: "#322a3e",
  },
  {
    key: "grafite",
    label: "Grafite",
    claro: false,
    bg: "#0f1115",
    surface: "#1a1d23",
    surfaceAlt: "#262a32",
    text: "#f3f4f6",
    textMuted: "#9aa3b2",
    border: "#2c313a",
  },
  {
    key: "meianoite",
    label: "Meia-noite (azul)",
    claro: false,
    bg: "#0c1322",
    surface: "#14203a",
    surfaceAlt: "#1f2d4d",
    text: "#eef2fb",
    textMuted: "#93a1bf",
    border: "#243353",
  },
  {
    key: "floresta",
    label: "Floresta",
    claro: false,
    bg: "#0c1714",
    surface: "#132420",
    surfaceAlt: "#1d352e",
    text: "#eef6f2",
    textMuted: "#93b5a8",
    border: "#234037",
  },
  {
    key: "claro",
    label: "Claro",
    claro: true,
    bg: "#faf7f8",
    surface: "#ffffff",
    surfaceAlt: "#f3f4f6",
    text: "#1f2937",
    textMuted: "#6b7280",
    border: "#ececf1",
  },
  {
    key: "areia",
    label: "Areia",
    claro: true,
    bg: "#f7f3ec",
    surface: "#fffdf8",
    surfaceAlt: "#efe7d8",
    text: "#2b2620",
    textMuted: "#8a7f6d",
    border: "#e6dcc9",
  },
  {
    key: "rosado",
    label: "Rosado",
    claro: true,
    bg: "#fdf5f8",
    surface: "#ffffff",
    surfaceAlt: "#fbeaf1",
    text: "#2a1d24",
    textMuted: "#8a6f7c",
    border: "#f3dce6",
  },
];

export function temaBaseDef(key: string | null | undefined): TemaBase {
  return TEMAS_BASE.find((t) => t.key === key) || TEMAS_BASE[0];
}

export interface Aparencia {
  corMarca: string | null;
  temaBase: string | null;
  appFonte: string | null;
}

const CHAVE_CACHE = "aparencia";

// Formato pré-computado que o script anti-flash aplica direto (sem cálculo).
interface AparenciaCache {
  light: boolean;
  tokens: Record<string, string>;
  brand: Record<number, string> | null;
  font: string;
}

function montarCache(a: Aparencia): AparenciaCache {
  const base = temaBaseDef(a.temaBase);
  return {
    light: base.claro,
    tokens: {
      "--bg": base.bg,
      "--surface": base.surface,
      "--surface-alt": base.surfaceAlt,
      "--text": base.text,
      "--text-muted": base.textMuted,
      "--border": base.border,
    },
    brand: gerarTonsMarca(a.corMarca),
    font: a.appFonte ? carregarFonte(a.appFonte) : "",
  };
}

function aplicarCache(c: AparenciaCache) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", c.light);
  root.style.colorScheme = c.light ? "light" : "dark";
  for (const [k, v] of Object.entries(c.tokens)) root.style.setProperty(k, v);
  const tons = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  if (c.brand) {
    for (const t of tons) root.style.setProperty(`--brand-${t}`, c.brand[t]);
  } else {
    for (const t of tons) root.style.removeProperty(`--brand-${t}`);
  }
  root.style.fontFamily = c.font || "";
}

// Aplica a aparência ao vivo e atualiza o cache (chamado no Guard e nas telas
// de configuração para preview imediato).
export function aplicarAparencia(a: Aparencia) {
  const cache = montarCache(a);
  aplicarCache(cache);
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache));
  } catch {
    /* ignora */
  }
}

// Script injetado no <head> - reaplica a aparência cacheada antes da pintura.
export const APARENCIA_NO_FLASH = `(function(){try{
var c=JSON.parse(localStorage.getItem('${CHAVE_CACHE}')||'null');if(!c)return;
var r=document.documentElement;
r.classList.toggle('light',!!c.light);
r.style.colorScheme=c.light?'light':'dark';
if(c.tokens)for(var k in c.tokens)r.style.setProperty(k,c.tokens[k]);
var T=[50,100,200,300,400,500,600,700,800,900],i;
if(c.brand){for(i=0;i<T.length;i++)r.style.setProperty('--brand-'+T[i],c.brand[T[i]]);}
if(c.font)r.style.fontFamily=c.font;
}catch(e){}})();`;
