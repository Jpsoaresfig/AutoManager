// Gera uma paleta 50..900 a partir de uma cor base (tratada como o tom 600)
// e aplica nas variáveis CSS --brand-*. Usado para a identidade da loja.

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix([r, g, b]: number[], [tr, tg, tb]: number[], t: number) {
  return [
    Math.round(r + (tr - r) * t),
    Math.round(g + (tg - g) * t),
    Math.round(b + (tb - b) * t),
  ];
}

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// fração de clareamento/escurecimento por tom
const ESCALA: Record<number, { alvo: number[]; t: number }> = {
  50: { alvo: WHITE, t: 0.92 },
  100: { alvo: WHITE, t: 0.84 },
  200: { alvo: WHITE, t: 0.7 },
  300: { alvo: WHITE, t: 0.52 },
  400: { alvo: WHITE, t: 0.3 },
  500: { alvo: WHITE, t: 0.14 },
  600: { alvo: WHITE, t: 0 },
  700: { alvo: BLACK, t: 0.18 },
  800: { alvo: BLACK, t: 0.34 },
  900: { alvo: BLACK, t: 0.48 },
};

export function aplicarCorMarca(hex: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tons = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  if (!hex) {
    // remove overrides -> volta ao padrão definido no globals.css
    tons.forEach((t) => root.style.removeProperty(`--brand-${t}`));
    return;
  }
  const base = hexToRgb(hex);
  if (!base) return;
  for (const tom of tons) {
    const { alvo, t } = ESCALA[tom];
    const [r, g, b] = mix(base, alvo, t);
    root.style.setProperty(`--brand-${tom}`, `${r} ${g} ${b}`);
  }
}
