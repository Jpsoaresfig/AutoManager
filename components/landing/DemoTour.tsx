"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LineChart,
  Package,
  Search,
  Share2,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const COMECAR = "/login";

const real = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Tour guiado do app numa página própria: um celular "vivo" e a pessoa desliza
// para o lado vendo cada parte (painel, venda, estoque, revendedoras, lucro,
// vitrine) com dados fictícios só para exibição.
type Slide = {
  tab: string;
  titulo: string;
  desc: string;
  tela: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    tab: "Painel",
    titulo: "Seu negócio num relance",
    desc: "Faturamento, lucro, estoque e comissões do dia em uma tela só - atualiza sozinho a cada venda.",
    tela: <TelaPainel />,
  },
  {
    tab: "Nova venda",
    titulo: "Registre a venda em segundos",
    desc: "Escolhe o produto, a cliente e a forma de pagamento. A comissão da revendedora já sai calculada.",
    tela: <TelaVenda />,
  },
  {
    tab: "Estoque",
    titulo: "Nunca mais venda o que não tem",
    desc: "O estoque baixa sozinho a cada venda e te avisa quando um produto está acabando.",
    tela: <TelaEstoque />,
  },
  {
    tab: "Revendedoras",
    titulo: "Sua equipe vendendo, você no controle",
    desc: "Ranking de quem mais vende e exatamente quanto você precisa pagar de comissão para cada uma.",
    tela: <TelaRevendedoras />,
  },
  {
    tab: "Relatórios",
    titulo: "Saiba o lucro real, sem achismo",
    desc: "Quanto sobrou de verdade e quais produtos puxam o seu lucro - por canal e por período.",
    tela: <TelaRelatorios />,
  },
  {
    tab: "Loja online",
    titulo: "Uma vitrine pronta pra vender",
    desc: "Link próprio pra mandar no Insta e no WhatsApp. A cliente escolhe e o pedido cai no seu painel.",
    tela: <TelaVitrine />,
  },
];

export default function DemoTour() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  const irPara = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const total = SLIDES.length;
    const idx = ((i % total) + total) % total;
    track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
  }, []);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setAtivo(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  // setas do teclado navegam o tour
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") irPara(ativo + 1);
      if (e.key === "ArrowLeft") irPara(ativo - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ativo, irPara]);

  const ultimo = ativo === SLIDES.length - 1;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="relative">
        {/* setas laterais (desktop) */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => irPara(ativo - 1)}
          disabled={ativo === 0}
          className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-14 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[var(--surface)] text-muted transition hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-30 sm:grid"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => irPara(ativo + 1)}
          disabled={ultimo}
          className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-14 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[var(--surface)] text-muted transition hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-30 sm:grid"
        >
          <ChevronRight size={20} />
        </button>

        {/* trilho de slides (desliza para o lado) */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="lp-carousel flex snap-x snap-mandatory overflow-x-auto rounded-3xl"
          style={{ scrollbarWidth: "none" }}
        >
          {SLIDES.map((s) => (
            <div key={s.tab} className="w-full shrink-0 snap-center px-1 pb-2 pt-1">
              <Phone tab={s.tab}>{s.tela}</Phone>
              <div className="mx-auto mt-6 max-w-md text-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-400">{s.tab}</span>
                <h3 className="mt-1 text-xl font-bold text-strong">{s.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* indicadores */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.tab}
            type="button"
            aria-label={`Ir para ${s.tab}`}
            aria-current={i === ativo}
            onClick={() => irPara(i)}
            className={`h-2 rounded-full transition-all ${
              i === ativo ? "w-7 bg-brand-500" : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* navegação mobile + CTA */}
      <div className="mt-7 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => irPara(ativo - 1)}
          disabled={ativo === 0}
          className="btn-ghost px-5 py-3 text-sm disabled:opacity-30 sm:hidden"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        {ultimo ? (
          <Link href={COMECAR} className="btn-primary px-6 py-3 text-sm shadow-lg shadow-brand-600/30">
            Criar minha loja grátis <ArrowRight size={16} />
          </Link>
        ) : (
          <button type="button" onClick={() => irPara(ativo + 1)} className="btn-primary px-6 py-3 text-sm">
            Próximo <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- moldura de celular ---------- */
function Phone({ tab, children }: { tab: string; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* brilho atrás do celular */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand-500/15 blur-3xl" />
      <div className="rounded-[2.2rem] border border-white/10 bg-[var(--bg)] p-2 shadow-2xl ring-1 ring-white/5">
        <div className="overflow-hidden rounded-[1.7rem] bg-[var(--bg)]">
          {/* barra superior do app */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[var(--surface)]/60 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-white">
                <ShoppingBag size={13} />
              </span>
              <span className="text-xs font-bold text-strong">Bella Semijoias</span>
            </div>
            <span className="text-[10px] font-medium text-muted">{tab}</span>
          </div>
          <div className="min-h-[340px] p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Linha({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 text-xs">{children}</div>;
}

/* ---------- telas (dados fictícios, só exibição) ---------- */
function TelaPainel() {
  const bars = [42, 64, 55, 80, 70, 92, 84];
  return (
    <div>
      <p className="text-[11px] text-muted">Faturamento do mês</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-strong">{real(14380)}</span>
        <span className="mb-0.5 inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-500">
          <TrendingUp size={10} /> +23%
        </span>
      </div>
      <div className="mt-3 flex h-20 items-end gap-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t ${i === bars.length - 1 ? "bg-brand-500" : "bg-brand-500/25"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Tile icon={Package} label="Estoque" valor="1.247" />
        <Tile icon={Wallet} label="Comissão" valor={real(1120)} />
        <Tile icon={LineChart} label="Ticket" valor={real(87)} />
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, valor }: { icon: any; label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-alt)] p-2">
      <div className="flex items-center gap-1 text-brand-500">
        <Icon size={11} />
        <span className="truncate text-[9px] text-muted">{label}</span>
      </div>
      <p className="mt-0.5 text-[11px] font-bold text-strong">{valor}</p>
    </div>
  );
}

function TelaVenda() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-2.5">
        <Linha>
          <span className="font-semibold text-strong">Colar Ponto de Luz</span>
          <span className="text-muted">2 un</span>
        </Linha>
        <Linha>
          <span className="text-muted">{real(89.9)} cada</span>
          <span className="font-semibold text-strong">{real(179.8)}</span>
        </Linha>
      </div>
      <div className="space-y-1.5 rounded-xl border border-white/10 bg-[var(--surface)] p-2.5 text-xs">
        <Linha>
          <span className="text-muted">Cliente</span>
          <span className="font-medium text-strong">Marina Alves</span>
        </Linha>
        <Linha>
          <span className="text-muted">Vendedora</span>
          <span className="font-medium text-strong">Aline R.</span>
        </Linha>
        <Linha>
          <span className="flex items-center gap-1 text-muted">
            <CreditCard size={12} /> Pagamento
          </span>
          <span className="font-medium text-strong">Pix</span>
        </Linha>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-brand-500/10 px-2.5 py-2 text-xs">
        <span className="font-medium text-brand-300">Comissão (30%)</span>
        <span className="font-bold text-brand-400">{real(53.94)}</span>
      </div>
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="text-muted">Total</span>
        <span className="font-extrabold text-strong">{real(179.8)}</span>
      </div>
      <div className="btn-primary w-full justify-center py-2.5 text-xs">
        <Check size={14} /> Registrar venda
      </div>
    </div>
  );
}

function TelaEstoque() {
  const itens = [
    { n: "Anel Solitário", q: 42, s: "ok" as const },
    { n: "Brinco Argola", q: 6, s: "baixo" as const },
    { n: "Kit Skincare", q: 0, s: "esgotado" as const },
    { n: "Vestido Midi", q: 23, s: "ok" as const },
    { n: "Pulseira Riviera", q: 4, s: "baixo" as const },
  ];
  const cor = {
    ok: "text-strong",
    baixo: "text-amber-400",
    esgotado: "text-red-400",
  };
  const badge = {
    ok: null,
    baixo: <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">baixo</span>,
    esgotado: <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-red-400">esgotado</span>,
  };
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5 rounded-lg bg-[var(--surface-alt)] px-2.5 py-1.5 text-[11px] text-muted">
        <Search size={12} /> Buscar produto
      </div>
      <div className="space-y-1.5">
        {itens.map((it) => (
          <div key={it.n} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface)] px-2.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-strong">
              <Package size={13} className="text-brand-500/70" /> {it.n}
            </span>
            <span className="flex items-center gap-1.5">
              {badge[it.s]}
              <span className={`font-bold ${cor[it.s]}`}>{it.q} un</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaRevendedoras() {
  const eq = [
    { n: "Aline R.", v: 3240, c: 972 },
    { n: "Patrícia M.", v: 2180, c: 654 },
    { n: "Camila S.", v: 1560, c: 468 },
  ];
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <Users size={13} className="text-brand-500" /> Ranking do mês
      </div>
      <div className="space-y-1.5">
        {eq.map((r, i) => (
          <div key={r.n} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--surface)] px-2.5 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/10 text-[11px] font-bold text-brand-400">
              {i + 1}º
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-strong">{r.n}</p>
              <p className="text-[10px] text-muted">vendeu {real(r.v)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-muted">comissão</p>
              <p className="text-xs font-bold text-brand-400">{real(r.c)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-brand-500/10 px-2.5 py-2 text-xs">
        <span className="font-medium text-brand-300">Total a pagar</span>
        <span className="font-bold text-brand-400">{real(2094)}</span>
      </div>
    </div>
  );
}

function TelaRelatorios() {
  const linhas = [
    { n: "Semijoias", pct: 62, v: 2988 },
    { n: "Cosméticos", pct: 24, v: 1157 },
    { n: "Moda", pct: 14, v: 675 },
  ];
  return (
    <div>
      <p className="text-[11px] text-muted">Lucro do mês</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-strong">{real(4820)}</span>
        <span className="mb-0.5 inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-500">
          <TrendingUp size={10} /> +18%
        </span>
      </div>
      <p className="mt-3 mb-1.5 text-[11px] font-semibold text-muted">Lucro por categoria</p>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.n}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-medium text-strong">{l.n}</span>
              <span className="text-muted">{real(l.v)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-alt)]">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${l.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaVitrine() {
  const prod = [
    { n: "Anel Solitário", p: 119.9 },
    { n: "Brinco Argola", p: 69.9 },
    { n: "Colar Ponto de Luz", p: 89.9 },
    { n: "Pulseira Riviera", p: 99.9 },
  ];
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <Store size={13} className="text-brand-500" /> bella.aut.app/loja
      </div>
      <div className="grid grid-cols-2 gap-2">
        {prod.map((p) => (
          <div key={p.n} className="overflow-hidden rounded-lg border border-white/10 bg-[var(--surface)]">
            <div className="grid h-14 place-items-center bg-gradient-to-br from-brand-500/20 to-brand-700/10 text-brand-400/70">
              <IconeJoia />
            </div>
            <div className="p-1.5">
              <p className="truncate text-[10px] font-medium text-strong">{p.n}</p>
              <p className="text-[11px] font-bold text-brand-400">{real(p.p)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white">
        <Share2 size={13} /> Compartilhar no WhatsApp
      </div>
    </div>
  );
}

function IconeJoia() {
  // mini ícone de joia (placeholder visual da foto do produto)
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}
