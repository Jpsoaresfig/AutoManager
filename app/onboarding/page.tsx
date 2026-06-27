"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { SEGMENTOS, CATEGORIAS_POR_SEGMENTO, produtosExemplo } from "@/lib/seed";
import type { Canal } from "@/lib/types";
import { Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";

// Emojis que "flutuam" no fundo da tela de geração — variam por segmento,
// deixando a experiência única para cada tipo de negócio.
const EMOJIS_SEG: Record<string, string[]> = {
  doces: ["🍰", "🧁", "🍫", "🍪", "🎂", "🍬", "🥧"],
  semijoias: ["💎", "✨", "💍", "📿", "🌟", "💫"],
  bijuteria: ["📿", "✨", "💫", "🌸", "💎", "⭐"],
  joias: ["💎", "💍", "👑", "✨", "🌟", "💫"],
  cosmeticos: ["💄", "💅", "🌸", "✨", "🧴", "💋"],
  roupas: ["👗", "👠", "👜", "🧥", "✨", "🛍️"],
  papelaria: ["✏️", "📒", "🎁", "🖍️", "📎", "✨"],
  petshop: ["🐶", "🐱", "🦴", "🐾", "🐹", "🐰"],
  outro: ["✨", "🌟", "💫", "🎉", "⭐", "🚀"],
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

  const totalSteps = 5;
  const usaRevendedoras = qtdRev !== "0";

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
        emojis={EMOJIS_SEG[segmento] || EMOJIS_SEG.outro}
        executar={executar}
        onConcluir={() => router.replace("/painel")}
      />
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-6 flex flex-col">
      {/* progresso */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-600" : "surface-alt"}`}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <div className="space-y-5">
            <div className="text-brand-600">
              <Sparkles size={40} />
            </div>
            <h1 className="text-2xl font-bold leading-tight">
              Em 2 minutos seu negócio vai estar organizado 💎
            </h1>
            <p className="text-muted">
              Vamos configurar estoque, vendas e comissão das suas revendedoras
              automaticamente. Sem planilha.
            </p>
            <div>
              <label className="label">Qual o nome da sua loja?</label>
              <input
                className="input"
                placeholder="Ex.: Doces da Ana, Bijoux da Lu, Moda Bella…"
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">O que você vende?</h2>
            <div className="grid grid-cols-2 gap-3">
              {SEGMENTOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSegmento(s.id)}
                  className={`card text-left ${
                    segmento === s.id ? "ring-2 ring-brand-500" : ""
                  }`}
                >
                  <span className="font-semibold">{s.label}</span>
                </button>
              ))}
            </div>
            <h2 className="text-xl font-bold pt-2">Como você vende?</h2>
            <div className="flex flex-wrap gap-2">
              {CANAIS.map((c) => {
                const on = canais.includes(c.id);
                return (
                  <span
                    key={c.id}
                    onClick={() => toggleCanal(c.id)}
                    className={`chip ${
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

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Quantas revendedoras você tem?</h2>
            <div className="grid grid-cols-2 gap-3">
              {["0", "1-5", "6-20", "20+"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQtdRev(q)}
                  className={`card text-left ${qtdRev === q ? "ring-2 ring-brand-500" : ""}`}
                >
                  <span className="font-semibold">
                    {q === "0" ? "Nenhuma" : q} {q === "0" ? "" : "revendedoras"}
                  </span>
                </button>
              ))}
            </div>
            {usaRevendedoras && (
              <p className="text-sm text-muted">
                Vamos calcular comissão e quanto cada uma te deve, automaticamente. ✨
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Sua margem de lucro média</h2>
              <p className="text-sm text-muted mb-3">Usamos pra sugerir o preço de venda.</p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200].map((m) => (
                  <span
                    key={m}
                    onClick={() => setMargem(m)}
                    className={`chip ${
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
                <h2 className="text-xl font-bold mb-1">Comissão das revendedoras</h2>
                <p className="text-sm text-muted mb-3">% padrão sobre cada venda.</p>
                <div className="flex flex-wrap gap-2">
                  {[20, 30, 40].map((c) => (
                    <span
                      key={c}
                      onClick={() => setComissao(c)}
                      className={`chip ${
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

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Como você quer começar?</h2>
            <button
              onClick={() => setComExemplos(true)}
              className={`card w-full text-left ${comExemplos ? "ring-2 ring-brand-500" : ""}`}
            >
              <div className="font-semibold flex items-center gap-2">
                Começar com exemplos {comExemplos && <Check size={18} className="text-brand-600" />}
              </div>
              <p className="text-sm text-muted mt-1">
                Catálogo, categorias e 3 revendedoras de exemplo já prontos pra você testar agora.
              </p>
            </button>
            <button
              onClick={() => setComExemplos(false)}
              className={`card w-full text-left ${!comExemplos ? "ring-2 ring-brand-500" : ""}`}
            >
              <div className="font-semibold flex items-center gap-2">
                Começar do zero {!comExemplos && <Check size={18} className="text-brand-600" />}
              </div>
              <p className="text-sm text-muted mt-1">
                Cadastrar meus próprios produtos.
              </p>
            </button>
          </div>
        )}
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
            onClick={() => setStep((s) => s - 1)}
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
// Tela de geração animada — toca após "Concluir". Mostra os passos sendo
// "criados" com cores, emojis e animações enquanto o store grava de verdade.
// ============================================================================
function GeneratingScreen({
  passos,
  loja,
  emojis,
  executar,
  onConcluir,
}: {
  passos: Passo[];
  loja: string;
  emojis: string[];
  executar: () => Promise<void>;
  onConcluir: () => void;
}) {
  const total = passos.length;
  const [atual, setAtual] = useState(0); // passo em andamento
  const [feitos, setFeitos] = useState(0); // quantos concluídos
  const [pronto, setPronto] = useState(false);
  const iniciado = useRef(false); // evita rodar 2x (StrictMode em dev)

  // partículas que flutuam no fundo (geradas uma única vez no mount)
  const [particulas] = useState(() =>
    Array.from({ length: 16 }).map((_, i) => ({
      e: emojis[i % emojis.length],
      left: Math.round(Math.random() * 100),
      size: 16 + Math.round(Math.random() * 26),
      dur: 7 + Math.random() * 7,
      delay: Math.random() * 6,
      op: 0.22 + Math.random() * 0.4,
    }))
  );
  // confete da comemoração final
  const [confete] = useState(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      e: ["🎉", "✨", "🎊", "💖", "⭐", "💫"][i % 6],
      left: Math.round(Math.random() * 100),
      size: 14 + Math.round(Math.random() * 18),
      dur: 2.4 + Math.random() * 2,
      delay: Math.random() * 1.2,
    }))
  );

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
      await sleep(2400);
      onConcluir();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = pronto ? 100 : Math.round((feitos / total) * 100);
  const passoAtual = passos[Math.min(atual, total - 1)];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden text-white bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 ob-anim-gradient">
      {/* partículas flutuantes */}
      <div className="pointer-events-none absolute inset-0">
        {particulas.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 ob-anim-float select-none"
            style={{
              left: `${p.left}%`,
              fontSize: p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              ["--ob-op" as any]: String(p.op),
            }}
          >
            {p.e}
          </span>
        ))}
      </div>

      {/* confete (comemoração) */}
      {pronto && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {confete.map((c, i) => (
            <span
              key={i}
              className="absolute top-0 ob-anim-fall select-none"
              style={{
                left: `${c.left}%`,
                fontSize: c.size,
                animationDuration: `${c.dur}s`,
                animationDelay: `${c.delay}s`,
              }}
            >
              {c.e}
            </span>
          ))}
        </div>
      )}

      {/* conteúdo central */}
      <div className="relative z-20 min-h-screen max-w-md mx-auto px-6 flex flex-col items-center justify-center text-center">
        {/* orbe */}
        <div className="relative mb-8 h-28 w-28">
          {!pronto && (
            <>
              <span className="absolute inset-0 rounded-full bg-white/25 ob-anim-ring" />
              <span
                className="absolute inset-0 rounded-full bg-white/20 ob-anim-ring"
                style={{ animationDelay: "0.7s" }}
              />
            </>
          )}
          <div className="absolute inset-0 rounded-[2rem] bg-white/15 backdrop-blur-sm border border-white/30 grid place-items-center shadow-2xl">
            {pronto ? (
              <span className="text-5xl ob-anim-pop">🎉</span>
            ) : (
              <span key={atual} className="text-5xl inline-block ob-anim-pop ob-anim-bob">
                {passoAtual.emoji}
              </span>
            )}
          </div>
        </div>

        {/* título dinâmico */}
        {pronto ? (
          <div key="done" className="ob-anim-rise">
            <h1 className="text-3xl font-extrabold">Tudo pronto! ✨</h1>
            <p className="mt-2 text-white/85">
              <b>{loja}</b> está no ar. Bora vender! 🚀
            </p>
          </div>
        ) : (
          <div key={atual} className="ob-anim-rise">
            <h1 className="text-2xl font-extrabold leading-tight">{passoAtual.title}</h1>
            <p className="mt-1.5 text-white/80">{passoAtual.sub}</p>
          </div>
        )}

        {/* barra de progresso */}
        <div className="w-full mt-8">
          <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden ob-shimmer">
            <div
              className="h-full rounded-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-semibold text-white/75">{pct}%</div>
        </div>

        {/* checklist dos passos */}
        <div className="w-full mt-7 space-y-2.5 text-left">
          {passos.map((p, i) => {
            const ok = i < feitos;
            const cur = i === atual && !ok && !pronto;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 border transition-all duration-300 ${
                  ok || cur ? "bg-white/15 border-white/30" : "bg-white/5 border-white/10 opacity-60"
                }`}
              >
                <span className="grid place-items-center h-7 w-7 rounded-full shrink-0 bg-white/20">
                  {ok ? (
                    <Check size={16} className="ob-anim-pop" />
                  ) : cur ? (
                    <Loader2 size={15} className="ob-anim-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                  )}
                </span>
                <span className="text-sm font-semibold flex-1 min-w-0 truncate">{p.title}</span>
                <span className="text-base">{p.emoji}</span>
              </div>
            );
          })}
        </div>

        {/* botão final */}
        {pronto && (
          <button
            onClick={onConcluir}
            className="ob-anim-rise mt-8 w-full rounded-2xl bg-white text-brand-700 font-bold py-3.5 shadow-xl active:scale-[.98] transition"
          >
            Abrir meu painel →
          </button>
        )}
      </div>
    </div>
  );
}
