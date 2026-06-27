"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

type Depoimento = {
  nome: string;
  loja: string;
  txt: string;
};

// Depoimentos: histórias concretas com número e resultado - prova social que
// converte ("antes eu perdia X, hoje ganho Y"). Carrossel com auto-avanço,
// arrastar no touch, setas e indicadores.
const DEPOIMENTOS: Depoimento[] = [
  {
    nome: "Aline R.",
    loja: "Semijoias · Goiânia",
    txt: "Eu pagava comissão errada e nem sabia. No primeiro mês descobri que perdia quase R$ 400. Hoje o sistema calcula tudo sozinho e nunca mais errei um pagamento.",
  },
  {
    nome: "Patrícia M.",
    loja: "Cosméticos · Sorocaba",
    txt: "Parei de anotar venda no caderno e no Zap. Minhas 4 revendedoras registram pelo celular e eu vejo tudo num lugar só. Economizo umas 6 horas por semana só de fechamento.",
  },
  {
    nome: "Camila S.",
    loja: "Moda feminina · Recife",
    txt: "Eu não sabia quais peças davam lucro. Agora vejo o relatório e compro só o que gira. Meu estoque parado caiu de R$ 9 mil para menos de R$ 2 mil em três meses.",
  },
  {
    nome: "Juliana T.",
    loja: "Perfumaria · Belo Horizonte",
    txt: "Achava que vendia bem, mas no fim do mês não sobrava nada. Quando vi o lucro real por produto, cortei 12 itens que só davam prejuízo. Minha margem subiu 22%.",
  },
  {
    nome: "Fernanda L.",
    loja: "Acessórios · Curitiba",
    txt: "Tinha pavor de fechar o caixa, era sempre aquela bagunça de papel. Hoje abro o app e em 2 minutos sei exatamente quanto entrou, quanto saiu e quanto é meu.",
  },
  {
    nome: "Débora A.",
    loja: "Roupas infantis · Fortaleza",
    txt: "Comecei sozinha e já tenho 7 revendedoras. Sem o sistema eu não teria conseguido crescer - controlar isso no caderno seria impossível. Faturei 3x mais que ano passado.",
  },
  {
    nome: "Renata C.",
    loja: "Bijuterias · Campinas",
    txt: "O que me ganhou foi o suporte. Mandei dúvida no sábado de manhã e me responderam na hora. Em uma semana eu já tinha migrado tudo da planilha sem perder nenhum dado.",
  },
  {
    nome: "Mariana P.",
    loja: "Calçados · Porto Alegre",
    txt: "Descobri que duas clientes estavam me devendo há meses e eu nem lembrava. O controle de fiado me avisa sozinho. Só isso já pagou a assinatura do ano inteiro.",
  },
];

export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Sincroniza o ponto ativo com a posição real do scroll (arraste/touch).
  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    if (!card) return;
    const passo = card.offsetWidth + 20; // largura do card + gap
    setAtivo(Math.round(track.scrollLeft / passo));
  }, []);

  const irPara = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    if (!card) return;
    const passo = card.offsetWidth + 20;
    const total = DEPOIMENTOS.length;
    const idx = ((i % total) + total) % total;
    track.scrollTo({ left: idx * passo, behavior: "smooth" });
  }, []);

  // Auto-avanço, pausa no hover/foco/aba oculta.
  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setAtivo((a) => {
        const prox = (a + 1) % DEPOIMENTOS.length;
        irPara(prox);
        return prox;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [pausado, irPara]);

  return (
    <div
      className="mt-12"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="lp-carousel flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {DEPOIMENTOS.map((d) => (
          <div
            key={d.nome}
            data-card
            className="flex min-w-[85%] shrink-0 snap-start flex-col rounded-2xl border border-white/10 bg-[var(--bg)] p-6 sm:min-w-[calc(50%-10px)] lg:min-w-[calc(33.333%-14px)]"
          >
            <Quote size={26} className="text-brand-500/40" />
            <p className="mt-2 flex-1 text-sm leading-relaxed text-strong">{d.txt}</p>
            <div className="mt-4 flex items-center gap-1 text-brand-500">
              {Array.from({ length: 5 }).map((_, k) => (
                <Star key={k} size={13} className="fill-brand-500 text-brand-500" />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/10 font-bold text-brand-400">
                {d.nome[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-strong">{d.nome}</p>
                <p className="text-xs text-muted">{d.loja}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Depoimento anterior"
          onClick={() => irPara(ativo - 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-muted transition hover:border-brand-500/50 hover:text-brand-400"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          {DEPOIMENTOS.map((d, i) => (
            <button
              key={d.nome}
              type="button"
              aria-label={`Ir para o depoimento ${i + 1}`}
              aria-current={i === ativo}
              onClick={() => irPara(i)}
              className={`h-2 rounded-full transition-all ${
                i === ativo ? "w-6 bg-brand-500" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Próximo depoimento"
          onClick={() => irPara(ativo + 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-muted transition hover:border-brand-500/50 hover:text-brand-400"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
