"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { SEGMENTOS, CATEGORIAS_POR_SEGMENTO, produtosExemplo } from "@/lib/seed";
import type { Canal } from "@/lib/types";
import { Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";

const CANAIS: { id: Canal; label: string }[] = [
  { id: "loja", label: "Loja física" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
];

export default function Onboarding() {
  const router = useRouter();
  const { setConfig, addProduto, addRevendedora, completarOnboarding, hydrate } = useStore();
  const ready = useStore((s) => s.ready);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!ready) hydrate();
  }, [ready, hydrate]);

  const [step, setStep] = useState(0);
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

  async function finalizar() {
    setSalvando(true);
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
    router.replace("/painel");
  }

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));

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
            onClick={finalizar}
            disabled={!ready || salvando}
            className="btn-primary w-full disabled:opacity-60"
          >
            {salvando ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Configurando…
              </>
            ) : (
              <>
                Concluir e abrir meu painel <Sparkles size={18} />
              </>
            )}
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
