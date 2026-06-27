import Link from "next/link";
import { ArrowLeft, Gem, Sparkles } from "lucide-react";
import DemoTour from "@/components/landing/DemoTour";

export const metadata = {
  title: "Demonstração — veja o AutoManager por dentro",
  description:
    "Passeie pelo app do AutoManager: painel, vendas, estoque, comissões de revendedoras, relatórios de lucro e loja online. Dados de exemplo, só para você conhecer.",
};

// landing/demo sempre em dark premium (independente do tema salvo do visitante)
const TEMA_DARK = {
  "--bg": "#09090f",
  "--surface": "#111119",
  "--surface-alt": "#1a1a24",
  "--text": "#f5f5f7",
  "--text-muted": "#9aa0ac",
  "--border": "#24242e",
  "--brand-50": "253 242 248",
  "--brand-100": "252 231 243",
  "--brand-200": "251 207 232",
  "--brand-300": "249 168 212",
  "--brand-400": "244 114 182",
  "--brand-500": "236 72 153",
  "--brand-600": "219 39 119",
  "--brand-700": "190 24 93",
  "--brand-800": "157 23 77",
  "--brand-900": "131 24 67",
  colorScheme: "dark",
} as React.CSSProperties;

const COMECAR = "/login";

export default function Demonstracao() {
  return (
    <main style={TEMA_DARK} className="min-h-screen bg-[var(--bg)] text-strong antialiased">
      {/* ======================= NAV ======================= */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-brand-500">
            <Gem size={22} className="text-brand-500" /> AutoManager
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted transition hover:text-strong"
          >
            <ArrowLeft size={16} /> Voltar ao início
          </Link>
        </div>
      </header>

      {/* ======================= TOUR ======================= */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 lp-grid-bg opacity-[0.5]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-3xl px-5 py-14 sm:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-300 backdrop-blur">
              <Sparkles size={14} /> Tour pelo app
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-strong sm:text-4xl">
              Veja o AutoManager por dentro
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted">
              Deslize para o lado e conheça cada parte do app. Os dados são de exemplo, só para você
              ver como tudo funciona na prática.
            </p>
          </div>

          <div className="mt-12">
            <DemoTour />
          </div>
        </div>
      </section>

      {/* ======================= CTA ======================= */}
      <section className="border-t border-white/5 bg-[var(--surface)]/40 py-16">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-strong sm:text-3xl">
            Gostou? Sua loja pode ficar assim hoje.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Teste grátis, sem cartão. Em 2 minutos você registra a primeira venda.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={COMECAR} className="btn-primary px-6 py-4 text-base shadow-lg shadow-brand-600/30">
              Criar minha loja grátis
            </Link>
            <Link href="/" className="btn-ghost px-6 py-4 text-base">
              Voltar ao início
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
