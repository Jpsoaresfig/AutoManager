"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { SEGMENTOS, CATEGORIAS_POR_SEGMENTO, produtosExemplo } from "@/lib/seed";
import type { Canal } from "@/lib/types";
import { usePlano } from "@/lib/usePlano";
import { fmtLimite } from "@/lib/plans";
import { Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";

// Quantidade de revendedoras oferecida no onboarding, limitada ao que o
// plano contratado permite (ambulante nem chega aqui).
const REV_BUCKETS: Record<string, string[]> = {
  solo: ["0", "1-3"],
  equipe: ["0", "1-5", "6-15"],
  expansao: ["0", "1-5", "6-20", "20+"],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Passo = { emoji: string; title: string; sub: string; ms: number };

const CANAIS: { id: Canal; label: string }[] = [
  { id: "loja", label: "Loja física" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
];

export default function Onboarding() {
  const router = useRouter();
  const { setConfig, addProduto, addRevendedora, completarOnboarding, hydrate } = useStore();
  const ready = useStore((s) => s.ready);
  const completo = useStore((s) => s.config.onboardingCompleto);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!ready) hydrate();
  }, [ready, hydrate]);

  // onboarding já concluído: sai daqui (evita re-rodar o seed / sobrescrever a config)
  useEffect(() => {
    if (ready && completo) router.replace("/painel");
  }, [ready, completo, router]);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [nomeLoja, setNomeLoja] = useState("");
  const [segmento, setSegmento] = useState("semijoias");
  const [canais, setCanais] = useState<Canal[]>(["whatsapp"]);
  const [qtdRev, setQtdRev] = useState("6-20");
  const [margem, setMargem] = useState(100);
  const [comissao, setComissao] = useState(30);
  const [comExemplos, setComExemplos] = useState(true);

  // Plano CONTRATADO define o escopo das perguntas (no trial, o efetivo vira
  // Expansão — mas as perguntas seguem o que o cliente realmente assinou).
  const { defContratado: plano } = usePlano();
  const temRevendedoras = plano.maxRevendedoras > 0;
  const temEquipe = plano.allowVendedores;
  const temEntregas = plano.allowEntregas;
  const revBuckets = REV_BUCKETS[plano.id] ?? ["0", "1-5", "6-20", "20+"];

  // Sequência de passos montada conforme o plano.
  const steps = [
    "nome",
    "segmento",
    ...(temRevendedoras ? ["revendedoras"] : []),
    "numeros",
    "inicio",
  ];
  const totalSteps = steps.length;
  const stepKey = steps[Math.min(step, totalSteps - 1)];
  const usaRevendedoras = temRevendedoras && qtdRev !== "0";

  // garante que a quantidade de revendedoras seja uma opção válida do plano
  useEffect(() => {
    const buckets = REV_BUCKETS[plano.id];
    if (buckets && !buckets.includes(qtdRev)) setQtdRev(buckets[1] ?? "0");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano.id]);

  function toggleCanal(c: Canal) {
    setCanais((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  // Trabalho real (gravação no store). Desacoplado da animação: a tela de
  // geração toca os passos no seu ritmo e só redireciona quando isto terminar.
  async function executar() {
    // trava de segurança: nunca re-roda o seed nem sobrescreve a config se já concluiu
    if (useStore.getState().config.onboardingCompleto) return;
    await setConfig({
      nomeLoja: nomeLoja || "Minha Loja",
      segmento,
      canais: canais.length ? canais : ["whatsapp"],
      usaRevendedoras,
      margemPadrao: margem,
      comissaoPadrao: comissao,
    });

    if (comExemplos) {
      const cats = CATEGORIAS_POR_SEGMENTO[segmento] || ["Geral"];
      for (const p of produtosExemplo(cats)) {
        await addProduto({
          nome: p.nome,
          categoria: p.categoria,
          custo: p.custo,
          precoVenda: p.precoVenda,
          estoqueAtual: p.estoqueAtual,
          estoqueMinimo: 5,
        });
      }
      if (usaRevendedoras) {
        for (const nome of ["Ana", "Bruna", "Carla"]) {
          await addRevendedora({ nome, comissaoPercent: comissao, metaMensal: 0 });
        }
      }
    }

    await completarOnboarding();
  }

  // Passos exibidos na geração — personalizados pelas respostas do usuário.
  function montarPassos(): Passo[] {
    const segLabel = (SEGMENTOS.find((s) => s.id === segmento)?.label || "loja").toLowerCase();
    const loja = nomeLoja.trim() || "sua loja";
    const passos: Passo[] = [
      { emoji: "🔍", title: "Analisando seu perfil", sub: `Entendendo sua ${segLabel}`, ms: 1100 },
      { emoji: "🏪", title: "Criando sua loja", sub: `Montando a vitrine de ${loja}`, ms: 1200 },
    ];
    if (comExemplos)
      passos.push({ emoji: "📦", title: "Organizando seu estoque", sub: "Adicionando produtos de exemplo", ms: 1100 });
    if (usaRevendedoras)
      passos.push({ emoji: "💸", title: "Configurando comissões", sub: "Cálculo automático das revendedoras", ms: 1050 });
    if (temEquipe)
      passos.push({ emoji: "👥", title: "Preparando sua equipe", sub: "Acessos de vendedores e ranking", ms: 1000 });
    if (temEntregas)
      passos.push({ emoji: "🛵", title: "Ativando as entregas", sub: "Rotas e acompanhamento de motoboys", ms: 1000 });
    passos.push({ emoji: "⚙️", title: "Criando seu sistema admin", sub: "Ligando seu painel de controle", ms: 1200 });
    passos.push({ emoji: "📊", title: "Preparando seus relatórios", sub: "Lucro, vendas e estoque em tempo real", ms: 1000 });
    return passos;
  }

  const next = () => {
    setDir("fwd");
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const back = () => {
    setDir("back");
    setStep((s) => Math.max(s - 1, 0));
  };

  if (gerando) {
    return (
      <GeneratingScreen
        passos={montarPassos()}
        loja={nomeLoja.trim() || "Minha Loja"}
        executar={executar}
        onConcluir={() => router.replace("/painel")}
      />
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-6 flex flex-col">
      {/* progresso */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-muted mb-2">
          <span>Passo {step + 1} de {totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                i <= step ? "bg-brand-600" : "surface-alt"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-clip">
        <div key={step} className={dir === "fwd" ? "ob-in-right" : "ob-in-left"}>
          {stepKey === "nome" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-brand-600/10 text-brand-500 ob-anim-bob">
                  <Sparkles size={28} />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-600/10 text-brand-500">
                  Plano {plano.nome}
                </span>
              </div>
              <h1 className="text-2xl font-bold leading-tight">
                Vamos dar vida ao seu negócio 🚀
              </h1>
              <p className="text-muted">
                Em 2 minutos seu estoque, suas vendas e seu lucro ficam no controle —
                do seu jeito, sem planilha.
              </p>
              <div>
                <label className="label">Como o seu negócio se chama?</label>
                <input
                  className="input"
                  placeholder="Ex.: Doces da Ana, Bijoux da Lu, Moda Bella…"
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted mt-1.5">Pode trocar depois — esse nome é seu. ✨</p>
              </div>
            </div>
          )}

          {stepKey === "segmento" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">O que você vende por aí?</h2>
                <p className="text-sm text-muted mt-1">Escolha o que mais combina com o seu negócio.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SEGMENTOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSegmento(s.id)}
                    className={`card text-left transition active:scale-[.98] ${
                      segmento === s.id ? "ring-2 ring-brand-500 bg-brand-500/5" : "hover:surface-alt"
                    }`}
                  >
                    <span className="font-semibold">{s.label}</span>
                  </button>
                ))}
              </div>
              <h2 className="text-xl font-bold pt-2">E onde você faz suas vendas?</h2>
              <div className="flex flex-wrap gap-2">
                {CANAIS.map((c) => {
                  const on = canais.includes(c.id);
                  return (
                    <span
                      key={c.id}
                      onClick={() => toggleCanal(c.id)}
                      className={`chip transition active:scale-95 ${
                        on ? "bg-brand-600 text-white border-brand-600" : "border-default"
                      }`}
                    >
                      {c.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {stepKey === "revendedoras" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Quem vende junto com você?</h2>
                <p className="text-sm text-muted mt-1">
                  Sua rede de revendedoras — seu plano {plano.nome} inclui até{" "}
                  <b>{fmtLimite(plano.maxRevendedoras)}</b>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {revBuckets.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQtdRev(q)}
                    className={`card text-left transition active:scale-[.98] ${
                      qtdRev === q ? "ring-2 ring-brand-500 bg-brand-500/5" : "hover:surface-alt"
                    }`}
                  >
                    <span className="font-semibold">
                      {q === "0" ? "Só eu por enquanto" : q} {q === "0" ? "" : "revendedoras"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">
                {usaRevendedoras
                  ? "Combinado! Eu calculo a comissão e quanto cada uma te deve, no automático. ✨"
                  : "Tranquilo — você toca tudo, e dá pra adicionar sua equipe quando quiser. 💪"}
              </p>
            </div>
          )}

          {stepKey === "numeros" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Quanto você quer lucrar?</h2>
                <p className="text-sm text-muted mb-3">Uso isso pra sugerir o preço de venda certinho pra você.</p>
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 200].map((m) => (
                    <span
                      key={m}
                      onClick={() => setMargem(m)}
                      className={`chip transition active:scale-95 ${
                        margem === m ? "bg-brand-600 text-white border-brand-600" : "border-default"
                      }`}
                    >
                      {m}%
                    </span>
                  ))}
                </div>
              </div>
              {usaRevendedoras && (
                <div>
                  <h2 className="text-xl font-bold mb-1">Quanto sua equipe ganha por venda?</h2>
                  <p className="text-sm text-muted mb-3">A comissão padrão de cada revendedora.</p>
                  <div className="flex flex-wrap gap-2">
                    {[20, 30, 40].map((c) => (
                      <span
                        key={c}
                        onClick={() => setComissao(c)}
                        className={`chip transition active:scale-95 ${
                          comissao === c
                            ? "bg-brand-600 text-white border-brand-600"
                            : "border-default"
                        }`}
                      >
                        {c}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {stepKey === "inicio" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Por onde a gente começa?</h2>
                <p className="text-sm text-muted mt-1">Você decide o ponto de partida.</p>
              </div>
              <button
                onClick={() => setComExemplos(true)}
                className={`card w-full text-left transition active:scale-[.98] ${
                  comExemplos ? "ring-2 ring-brand-500 bg-brand-500/5" : "hover:surface-alt"
                }`}
              >
                <div className="font-semibold flex items-center gap-2">
                  🚀 Já quero ver funcionando
                  {comExemplos && <Check size={18} className="text-brand-600 ml-auto" />}
                </div>
                <p className="text-sm text-muted mt-1">
                  {temRevendedoras
                    ? "Catálogo, categorias e 3 revendedoras de exemplo prontos pra você testar agora."
                    : "Catálogo e categorias de exemplo prontos pra você testar agora."}
                </p>
              </button>
              <button
                onClick={() => setComExemplos(false)}
                className={`card w-full text-left transition active:scale-[.98] ${
                  !comExemplos ? "ring-2 ring-brand-500 bg-brand-500/5" : "hover:surface-alt"
                }`}
              >
                <div className="font-semibold flex items-center gap-2">
                  ✏️ Começar do zero
                  {!comExemplos && <Check size={18} className="text-brand-600 ml-auto" />}
                </div>
                <p className="text-sm text-muted mt-1">
                  Quero cadastrar os meus próprios produtos.
                </p>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6">
        {step < totalSteps - 1 ? (
          <button onClick={next} className="btn-primary w-full">
            Continuar <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={() => setGerando(true)}
            disabled={!ready}
            className="btn-primary w-full disabled:opacity-60"
          >
            Concluir e criar minha loja <Sparkles size={18} />
          </button>
        )}
        {step > 0 && (
          <button
            onClick={back}
            className="w-full text-center text-sm text-muted mt-3"
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Tela de carregamento — toca após "Concluir". Minimalista e mobile-first:
// um ícone de carregamento + uma barra de progresso, com o texto do passo
// atual trocando enquanto o store grava de verdade.
// ============================================================================
function GeneratingScreen({
  passos,
  loja,
  executar,
  onConcluir,
}: {
  passos: Passo[];
  loja: string;
  executar: () => Promise<void>;
  onConcluir: () => void;
}) {
  const total = passos.length;
  const [atual, setAtual] = useState(0); // passo em andamento
  const [feitos, setFeitos] = useState(0); // quantos concluídos
  const [pronto, setPronto] = useState(false);
  const iniciado = useRef(false); // evita rodar 2x (StrictMode em dev)

  useEffect(() => {
    if (iniciado.current) return; // roda exatamente uma vez
    iniciado.current = true;
    const trabalho = executar().catch(() => {}); // grava no store em paralelo
    (async () => {
      for (let i = 0; i < passos.length; i++) {
        setAtual(i);
        await sleep(passos[i].ms);
        setFeitos(i + 1);
      }
      await trabalho; // garante que o backend terminou antes de seguir
      setPronto(true);
      await sleep(1400);
      onConcluir();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = pronto ? 100 : Math.round((feitos / total) * 100);
  const passoAtual = passos[Math.min(atual, total - 1)];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--text)] flex items-center justify-center px-6">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        {/* ícone de carregamento */}
        <div className="relative grid place-items-center h-16 w-16 mb-6">
          {pronto ? (
            <Check size={40} className="text-brand-500 ob-anim-pop" strokeWidth={3} />
          ) : (
            <Loader2 size={44} className="text-brand-500 ob-anim-spin" />
          )}
        </div>

        {/* texto do passo atual */}
        <div key={pronto ? "done" : atual} className="ob-anim-rise min-h-[3.5rem]">
          <p className="text-lg font-bold leading-tight">
            {pronto ? "Tudo pronto! 🎉" : passoAtual.title}
          </p>
          <p className="text-sm text-muted mt-1">
            {pronto ? `${loja} está no ar.` : passoAtual.sub}
          </p>
        </div>

        {/* barra de carregamento */}
        <div className="w-full mt-6">
          <div className="h-2 w-full rounded-full surface-alt overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-semibold text-muted">{pct}%</div>
        </div>
      </div>
    </div>
  );
}
