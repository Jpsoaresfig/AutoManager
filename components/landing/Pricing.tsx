"use client";

import Link from "next/link";
import { Check, X, ArrowRight, Star, MessageCircle, Sparkles } from "lucide-react";
import { PLANO_PERSONALIZADO } from "@/lib/plans";
import { linkWhatsappSuporte } from "@/lib/admin";

const COMECAR = "/login";

type Plano = {
  nome: string;
  preco: number;
  resumo: string;
  para: string;
  destaque?: boolean;
  badge?: string;
  cta: string;
};

const PLANOS: Plano[] = [
  {
    nome: "AMBULANTE",
    preco: 20,
    resumo: "Para quem vende na rua e quer controlar estoque e vendas no bolso.",
    para: "Vendedor ambulante",
    cta: "Começar no AMBULANTE",
  },
  {
    nome: "SOLO",
    preco: 49,
    resumo: "Para quem vende sozinha e quer parar com o caderno.",
    para: "Loja de 1 pessoa",
    cta: "Começar no SOLO",
  },
  {
    nome: "EQUIPE",
    preco: 99,
    resumo: "Para quem tem revendedoras e precisa de comissão no automático.",
    para: "Loja com equipe e revendedoras",
    destaque: true,
    badge: "⭐ MAIS VENDIDO",
    cta: "Começar no EQUIPE",
  },
  {
    nome: "EXPANSÃO",
    preco: 199,
    resumo: "Para quem está crescendo e quer escalar sem perder o controle.",
    para: "Várias revendedoras + entregas",
    cta: "Começar no EXPANSÃO",
  },
];

// linha de comparação: [recurso, ambulante, solo, equipe, expansao]
type Cel = boolean | string;
const COMPARACAO: [string, Cel, Cel, Cel, Cel][] = [
  ["Estoque ilimitado em tempo real", true, true, true, true],
  ["Venda rápida (balcão + WhatsApp)", true, true, true, true],
  ["Relatório de lucro real por produto", true, true, true, true],
  ["Vitrine online com link próprio", true, true, true, true],
  ["Chat com o cliente final", true, true, true, true],
  ["Revendedoras com login próprio", "-", "Até 3", "Até 15", "Ilimitado"],
  ["Vendedores internos", "-", "-", "Até 3", "Ilimitado"],
  ["Comissão automática + ranking", "-", "-", true, true],
  ["Controle de entregas / motoboy", "-", "-", true, true],
  ["Metas e bônus por revendedora", "-", "-", "-", true],
  ["Suporte prioritário no WhatsApp", "-", "-", true, true],
];

function Celula({ v }: { v: boolean | string }) {
  if (v === true) return <Check size={17} className="mx-auto text-brand-600" />;
  if (v === false || v === "-") return <X size={15} className="mx-auto text-muted opacity-40" />;
  return <span className="text-sm font-medium text-strong">{v}</span>;
}

export default function Pricing() {
  return (
    <div>
      {/* cards de plano */}
      <div className="mt-10 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANOS.map((p) => {
          const mensal = p.preco;
          return (
            <div
              key={p.nome}
              className={`card relative flex flex-col transition-all duration-200 hover:-translate-y-1.5 ${
                p.destaque
                  ? "border-brand-500 ring-2 ring-brand-500/40 shadow-pop lg:-mt-3 lg:mb-3 lg:scale-[1.03]"
                  : "hover:border-brand-500/30"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                  {p.badge}
                </span>
              )}
              <h3 className="mt-1 text-lg font-bold text-strong">{p.nome}</h3>
              <p className="text-sm text-muted">{p.para}</p>

              <div className="mt-4 flex items-end gap-1">
                <span className="text-sm text-muted">R$</span>
                <span className="text-4xl font-extrabold text-strong">{mensal}</span>
                <span className="mb-1 text-sm text-muted">/mês</span>
              </div>

              <p className="mt-4 text-sm text-muted">{p.resumo}</p>

              <Link
                href={COMECAR}
                className={`mt-6 px-5 py-3 text-sm ${p.destaque ? "btn-primary" : "btn-ghost"}`}
              >
                {p.cta} <ArrowRight size={16} />
              </Link>
              <p className="mt-3 text-center text-xs text-muted">
                Teste grátis · sem cartão · cancela quando quiser
              </p>
            </div>
          );
        })}
      </div>

      {/* plano personalizado - destaque logo abaixo dos cards (sob consulta) */}
      <div className="relative mt-6 overflow-hidden rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-600/15 via-brand-500/10 to-transparent p-6 shadow-pop sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
              <Sparkles size={13} /> NOVO · SOB MEDIDA
            </span>
            <h3 className="mt-3 text-2xl font-extrabold text-strong">
              {PLANO_PERSONALIZADO.nome}{" "}
              <span className="text-brand-500">- {PLANO_PERSONALIZADO.preco}</span>
            </h3>
            <p className="mt-1 text-base font-semibold text-strong">{PLANO_PERSONALIZADO.chamada}</p>
            <p className="mt-2 max-w-xl text-sm text-muted">{PLANO_PERSONALIZADO.descricao}</p>
          </div>
          <a
            href={linkWhatsappSuporte(PLANO_PERSONALIZADO.whatsappTexto)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary shrink-0 self-start px-6 py-4 text-base shadow-lg shadow-brand-600/30 sm:self-center"
          >
            <MessageCircle size={18} /> {PLANO_PERSONALIZADO.cta}
          </a>
        </div>
      </div>

      {/* tabela de comparação */}
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-default">
              <th className="py-3 pr-4 text-sm font-semibold text-muted">O que está incluso</th>
              <th className="px-4 py-3 text-center text-sm font-bold text-strong">AMBULANTE</th>
              <th className="px-4 py-3 text-center text-sm font-bold text-strong">SOLO</th>
              <th className="px-4 py-3 text-center text-sm font-bold text-brand-600">
                <span className="inline-flex items-center gap-1">
                  <Star size={13} className="fill-brand-500 text-brand-500" /> EQUIPE
                </span>
              </th>
              <th className="px-4 py-3 text-center text-sm font-bold text-strong">EXPANSÃO</th>
            </tr>
          </thead>
          <tbody>
            {COMPARACAO.map((linha) => (
              <tr key={linha[0]} className="border-b border-default/60">
                <td className="py-3 pr-4 text-sm text-strong">{linha[0]}</td>
                <td className="px-4 py-3 text-center">
                  <Celula v={linha[1]} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Celula v={linha[2]} />
                </td>
                <td className="bg-brand-500/[0.04] px-4 py-3 text-center">
                  <Celula v={linha[3]} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Celula v={linha[4]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* empurrão psicológico para o upgrade */}
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
        A maioria escolhe o <strong className="text-strong">EQUIPE</strong>: é o único que paga a
        própria mensalidade com <strong className="text-strong">uma comissão calculada certo</strong>.
        Uma revendedora paga errada por mês já custa mais que os R$ 99.
      </p>
    </div>
  );
}
