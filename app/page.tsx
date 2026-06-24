import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  Gem,
  LineChart,
  ListChecks,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Wallet,
  X,
} from "lucide-react";

export const metadata = {
  title: "AutoManager — Organize sua loja de semijoias e venda mais",
  description:
    "Sistema simples que controla estoque, vendas e comissão de revendedoras automaticamente. Comece grátis em 2 minutos, sem planilhas e sem cartão.",
};

const COMECAR = "/login";

export default function Landing() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-strong">
      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-30 border-b border-brand-100/60 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="flex items-center gap-2 font-extrabold text-brand-500">
            <Gem size={22} className="text-brand-600" />
            AutoManager
          </span>
          <div className="flex items-center gap-2">
            <Link href="/login?modo=entrar" className="btn-ghost text-sm">
              Entrar
            </Link>
            <Link href={COMECAR} className="btn-primary text-sm">
              Teste grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 surface px-3 py-1 text-sm font-medium text-brand-500">
            <Sparkles size={15} /> Feito para revendedoras e lojas pequenas
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight text-strong sm:text-5xl">
            Transforme sua loja de semijoias em uma operação{" "}
            <span className="text-brand-600">organizada e lucrativa</span> em 2 minutos
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Controle estoque, vendas e comissões automaticamente — sem planilhas e sem erro de
            estoque. E descubra exatamente o que está te fazendo perder dinheiro.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={COMECAR} className="btn-primary px-6 py-4 text-base">
              Quero organizar minha loja <ArrowRight size={18} />
            </Link>
            <Link href={COMECAR} className="btn-ghost px-6 py-4 text-base">
              <PlayCircle size={18} /> Quero ver como funciona
            </Link>
          </div>

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <li className="flex items-center gap-1.5">
              <Check size={15} className="text-brand-600" /> Sem cartão
            </li>
            <li className="flex items-center gap-1.5">
              <Check size={15} className="text-brand-600" /> Configuração em 2 minutos
            </li>
            <li className="flex items-center gap-1.5">
              <Check size={15} className="text-brand-600" /> Sem planilhas
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- DOR ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="max-w-3xl text-3xl font-bold text-strong">
          O problema não é vender pouco. É não saber onde você está perdendo dinheiro.
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          A maioria das lojas de semijoias enfrenta isso todos os dias:
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Você não sabe exatamente seu estoque real",
            "Você não sabe quanto cada revendedora vendeu",
            "Comissão calculada “no olho” ou no WhatsApp",
            "Produtos que somem sem você perceber",
            "Vendas perdidas por falta de controle",
            "Nenhuma visão clara do que realmente dá lucro",
          ].map((dor) => (
            <div key={dor} className="card flex items-start gap-3">
              <X size={18} className="mt-0.5 shrink-0 text-red-500" />
              <span className="text-strong">{dor}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg font-semibold text-strong">
          O resultado? Você trabalha muito… e lucra menos do que deveria. Não é falta de esforço — é
          falta de um sistema simples.
        </p>
      </section>

      {/* ---------- SOLUÇÃO ---------- */}
      <section className="surface py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="max-w-3xl text-3xl font-bold text-strong">
            Um sistema simples que mostra exatamente o que acontece na sua loja
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Boxes, t: "Estoque em tempo real", d: "Atualizado automaticamente a cada venda." },
              { icon: Timer, t: "Vendas em segundos", d: "Presenciais e por WhatsApp, em 1 toque." },
              { icon: Wallet, t: "Comissão automática", d: "Calculada por revendedora, sem erro." },
              { icon: Trophy, t: "Ranking de revendedoras", d: "Veja quem mais vende e performa." },
              { icon: AlertTriangle, t: "Alerta de reposição", d: "Saiba o que está acabando e o que gira." },
              { icon: LineChart, t: "Visão clara do lucro", d: "Relatórios do que realmente dá retorno." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                  <Icon size={20} />
                </div>
                <h3 className="mt-3 font-semibold text-strong">{t}</h3>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- POR QUE CRESCE ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-bold text-strong">Não é organização. É crescimento.</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Quando você começa a enxergar seus dados, decisões deixam de ser no achismo:
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            "Você sabe quais produtos vender mais",
            "Você sabe quais revendedoras mais performam",
            "Você evita estoque parado perdendo valor",
            "Você aumenta o giro das vendas",
          ].map((b) => (
            <div key={b} className="flex items-start gap-3">
              <TrendingUp size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <span className="text-strong">{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xl font-bold text-brand-500">Lojas organizadas vendem mais. Sempre.</p>
      </section>

      {/* ---------- COMO FUNCIONA ---------- */}
      <section className="surface py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-bold text-strong">Comece em 2 minutos</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { n: 1, t: "Responda 4 perguntas", d: "Tipo de loja, produtos, revendedoras e vendas." },
              { n: 2, t: "O sistema monta sua loja", d: "Sua estrutura é criada automaticamente." },
              { n: 3, t: "Registre e acompanhe", d: "Comece a vender e veja tudo organizado." },
            ].map((s) => (
              <div key={s.n} className="card">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-3 font-semibold text-strong">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PROVA (PILOTO) ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-bold text-strong">Resultados do piloto inicial</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="card">
            <div className="flex items-center gap-2 font-semibold text-strong">
              <BarChart3 size={18} className="text-brand-600" /> Loja A (piloto)
            </div>
            <ul className="mt-3 space-y-2 text-sm text-strong">
              <li>+38% no giro de estoque</li>
              <li>−22% em erros de comissão</li>
              <li>2× mais controle de revendedoras</li>
            </ul>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 font-semibold text-strong">
              <BarChart3 size={18} className="text-brand-600" /> Loja B (piloto)
            </div>
            <ul className="mt-3 space-y-2 text-sm text-strong">
              <li>+41% em vendas registradas</li>
              <li>−35% de estoque parado</li>
              <li>Controle de horas para minutos</li>
            </ul>
          </div>
          <div className="card bg-brand-600 text-white">
            <div className="flex items-center gap-2 font-semibold">
              <ListChecks size={18} /> Média dos testes
            </div>
            <ul className="mt-3 space-y-2 text-sm text-brand-50">
              <li>+30% de eficiência operacional</li>
              <li>−40% de perda de estoque não rastreado</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          Dados baseados em testes iniciais com lojas de semijoias em fase beta.
        </p>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="surface py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-bold text-strong">
            Pare de perder dinheiro por desorganização
          </h2>
          <p className="mt-3 text-muted">
            A maioria das lojas perde dinheiro não por falta de venda, mas por falta de controle.
            Esse sistema mostra exatamente onde você está perdendo lucro.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href={COMECAR} className="btn-primary px-7 py-4 text-base">
              Entrar no teste gratuito <ArrowRight size={18} />
            </Link>
            <a
              href="https://wa.me/?text=Quero%20organizar%20minha%20loja%20de%20semijoias"
              className="btn-ghost px-7 py-4 text-base"
            >
              <MessageCircle size={18} /> Falar no WhatsApp
            </a>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-500">
            <Timer size={15} /> Vagas limitadas para os primeiros usuários
          </p>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-brand-100/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted sm:flex-row">
          <span className="flex items-center gap-2 font-semibold text-brand-500">
            <Gem size={16} /> AutoManager
          </span>
          <span>Controle de estoque, vendas e comissão para lojas de semijoias.</span>
        </div>
      </footer>
    </main>
  );
}
