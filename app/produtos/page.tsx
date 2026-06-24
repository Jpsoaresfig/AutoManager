"use client";
import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { categoriasDaLoja } from "@/lib/seed";
import { brl } from "@/lib/analytics";
import { uploadProdutoImagem } from "@/lib/uploadProdutoImagem";
import type { Produto, Variacao } from "@/lib/types";
import Guard from "@/components/Guard";
import { Plus, X, PackagePlus, Pencil, ImagePlus, Trash2, Layers } from "lucide-react";

export default function ProdutosPage() {
  return (
    <Guard>
      <Produtos />
    </Guard>
  );
}

function Produtos() {
  const { produtos, config, entradaEstoque, ajustarEstoque, role } = useStore();
  const podeEditar = role === "owner";
  const [form, setForm] = useState<{ open: boolean; editar: Produto | null }>({
    open: false,
    editar: null,
  });
  const [filtroCat, setFiltroCat] = useState<string | null>(null);
  const cats = categoriasDaLoja(config);

  // categorias realmente presentes nos produtos (na ordem da loja, sobras no fim)
  const catsPresentes = (() => {
    const usadas = new Set(produtos.map((p) => p.categoria).filter(Boolean));
    const ordenadas = cats.filter((c) => usadas.has(c));
    const extras = [...usadas].filter((c) => !cats.includes(c));
    return [...ordenadas, ...extras];
  })();

  const produtosFiltrados = filtroCat ? produtos.filter((p) => p.categoria === filtroCat) : produtos;

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-bold">Estoque</h1>
        {podeEditar && (
          <button
            onClick={() => setForm({ open: true, editar: null })}
            className="btn-primary py-2 px-3 text-sm"
          >
            <Plus size={18} /> Produto
          </button>
        )}
      </header>

      {produtos.length === 0 && (
        <div className="card text-center text-muted">
          Nenhum produto ainda. Toque em <b>+ Produto</b>.
        </div>
      )}

      {produtos.length > 0 &&
        (() => {
          const ativos = produtos.filter((p) => p.ativo);
          const semEstoque = ativos.filter((p) => p.estoqueAtual <= 0).length;
          const acabando = ativos.filter(
            (p) => p.estoqueAtual > 0 && p.estoqueAtual <= p.estoqueMinimo
          ).length;
          const ok = ativos.length - semEstoque - acabando;
          return (
            <div className="grid grid-cols-3 gap-2">
              <ResumoEstoque label="Em estoque" valor={ok} cor="text-green-500" />
              <ResumoEstoque label="Acabando" valor={acabando} cor="text-amber-500" />
              <ResumoEstoque label="Sem estoque" valor={semEstoque} cor="text-red-500" />
            </div>
          );
        })()}

      {/* filtro por categoria */}
      {catsPresentes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setFiltroCat(null)}
            className={`chip whitespace-nowrap ${
              filtroCat === null ? "bg-brand-600 text-white border-brand-600" : "border-default"
            }`}
          >
            Todas
          </button>
          {catsPresentes.map((c) => (
            <button
              key={c}
              onClick={() => setFiltroCat(c)}
              className={`chip whitespace-nowrap ${
                filtroCat === c ? "bg-brand-600 text-white border-brand-600" : "border-default"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {produtosFiltrados.length === 0 && filtroCat && (
          <div className="card text-center text-muted">Nenhum produto em “{filtroCat}”.</div>
        )}
        {produtosFiltrados.map((p) => {
          const baixo = p.estoqueAtual <= p.estoqueMinimo;
          const temGrade = p.variacoes.length > 0;
          return (
            <div key={p.id} className="card flex items-center gap-3">
              {p.imagens[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imagens[0]}
                  alt={p.nome}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 rounded-lg object-cover shrink-0 border border-default"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg surface-alt shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {p.nome}
                  {p.marca ? <span className="text-muted font-normal"> · {p.marca}</span> : null}
                </div>
                <div className="text-xs text-muted truncate">
                  {p.categoria} · {brl(p.precoVenda)} · margem{" "}
                  {p.custo > 0 ? (((p.precoVenda - p.custo) / p.custo) * 100).toFixed(0) : "-"}%
                  {temGrade && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-brand-500">
                      <Layers size={11} /> {p.variacoes.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-bold ${baixo ? "text-red-500" : ""}`}>{p.estoqueAtual} un</div>
                <div className="flex gap-2 mt-1 justify-end">
                  {podeEditar && (
                  <button
                    onClick={() => setForm({ open: true, editar: p })}
                    className="text-brand-500"
                    title="Editar produto"
                  >
                    <Pencil size={16} />
                  </button>
                  )}
                  {podeEditar && !temGrade && (
                    <>
                      <button
                        onClick={() => {
                          const q = prompt(`Repor quantas unidades de "${p.nome}"?`, "10");
                          const n = parseInt(q || "");
                          if (n > 0) entradaEstoque(p.id, n);
                        }}
                        className="text-brand-600"
                        title="Entrada de estoque"
                      >
                        <PackagePlus size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const q = prompt(
                            `Ajustar estoque de "${p.nome}" para:`,
                            String(p.estoqueAtual)
                          );
                          const n = parseInt(q || "");
                          if (!isNaN(n)) ajustarEstoque(p.id, n, "Ajuste manual");
                        }}
                        className="text-muted"
                        title="Ajustar"
                      >
                        <Pencil size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {form.open && (
        <ProdutoForm
          editar={form.editar}
          categorias={cats}
          onClose={() => setForm({ open: false, editar: null })}
        />
      )}
    </div>
  );
}

function ProdutoForm({
  editar,
  categorias,
  onClose,
}: {
  editar: Produto | null;
  categorias: string[];
  onClose: () => void;
}) {
  const { addProduto, updateProduto, config, orgId } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(editar?.nome ?? "");
  const [categoria, setCategoria] = useState(editar?.categoria ?? categorias[0]);
  const [marca, setMarca] = useState(editar?.marca ?? "");
  const [descricao, setDescricao] = useState(editar?.descricao ?? "");
  const [custo, setCusto] = useState(editar ? String(editar.custo) : "");
  const [preco, setPreco] = useState(editar ? String(editar.precoVenda) : "");
  const [precoDe, setPrecoDe] = useState(
    editar?.precoComparativo != null ? String(editar.precoComparativo) : ""
  );
  const [imposto, setImposto] = useState(editar ? String(editar.impostoPercent) : "0");
  const [estoque, setEstoque] = useState(editar ? String(editar.estoqueAtual) : "");
  const [minimo, setMinimo] = useState(editar ? String(editar.estoqueMinimo) : "5");
  const [imagens, setImagens] = useState<string[]>(editar?.imagens ?? []);
  const [usaGrade, setUsaGrade] = useState((editar?.variacoes.length ?? 0) > 0);
  const [variacoes, setVariacoes] = useState<Variacao[]>(editar?.variacoes ?? []);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // sugere preço pela margem ao digitar custo (só no cadastro novo)
  function onCusto(v: string) {
    setCusto(v);
    const c = parseFloat(v);
    if (!isNaN(c) && !preco && !editar) {
      setPreco((c * (1 + config.margemPadrao / 100)).toFixed(2));
    }
  }

  async function onUpload(files: FileList | null) {
    if (!files || !orgId) return;
    setEnviando(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadProdutoImagem(orgId, f));
      setImagens((prev) => [...prev, ...urls]);
    } catch (e: any) {
      alert("Falha ao enviar imagem: " + (e?.message || e));
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addVariacao() {
    setVariacoes((v) => [
      ...v,
      { id: "", nome: "", sku: "", estoqueAtual: 0, precoAjuste: 0, ativo: true },
    ]);
  }
  function setVar(i: number, patch: Partial<Variacao>) {
    setVariacoes((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function rmVar(i: number) {
    setVariacoes((v) => v.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    if (!nome || !custo || !preco) return;
    const vars = usaGrade
      ? variacoes
          .filter((v) => v.nome.trim())
          .map((v) => ({ ...v, nome: v.nome.trim() }))
      : [];
    const base = {
      nome,
      categoria,
      marca: marca || undefined,
      descricao: descricao || undefined,
      custo: parseFloat(custo),
      precoVenda: parseFloat(preco),
      precoComparativo: precoDe ? parseFloat(precoDe) : undefined,
      impostoPercent: parseFloat(imposto) || 0,
      estoqueMinimo: parseInt(minimo) || 5,
      imagens,
    };
    setSalvando(true);
    try {
      if (editar) {
        await updateProduto(editar.id, {
          ...base,
          estoqueAtual: usaGrade ? editar.estoqueAtual : parseInt(estoque) || 0,
          variacoes: vars,
        });
      } else {
        await addProduto({
          ...base,
          estoqueAtual: usaGrade ? 0 : parseInt(estoque) || 0,
          variacoes: vars.map(({ id, ...rest }) => rest),
        });
      }
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center">
      <div className="surface w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 space-y-3 max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editar ? "Editar produto" : "Novo produto"}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* fotos */}
        <div>
          <label className="label">Fotos</label>
          <div className="flex gap-2 flex-wrap">
            {imagens.map((url, i) => (
              <div key={url} className="relative h-16 w-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover border border-default" />
                <button
                  onClick={() => setImagens((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={enviando}
              className="h-16 w-16 rounded-lg border border-dashed border-default flex items-center justify-center text-muted disabled:opacity-50"
            >
              {enviando ? "…" : <ImagePlus size={20} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onUpload(e.target.files)}
            />
          </div>
        </div>

        <div>
          <label className="label">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {(categoria && !categorias.includes(categoria) ? [categoria, ...categorias] : categorias).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Marca</label>
            <input className="input" value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes que aparecem na mini-loja"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Custo (R$)</label>
            <input className="input" inputMode="decimal" value={custo} onChange={(e) => onCusto(e.target.value)} />
          </div>
          <div>
            <label className="label">Preço venda (R$)</label>
            <input className="input" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
          </div>
          <div>
            <label className="label">Preço "de" (R$)</label>
            <input
              className="input"
              inputMode="decimal"
              placeholder="opcional"
              value={precoDe}
              onChange={(e) => setPrecoDe(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Imposto (%)</label>
            <input className="input" inputMode="decimal" value={imposto} onChange={(e) => setImposto(e.target.value)} />
          </div>
        </div>

        {/* grade / variações */}
        <div className="rounded-xl surface-alt p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={usaGrade} onChange={(e) => setUsaGrade(e.target.checked)} />
            <Layers size={15} className="text-brand-500" /> Usar variações / grade (tamanho, cor…)
          </label>
          {usaGrade && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted">
                O estoque do produto passa a ser a soma das variações.
              </p>
              {variacoes.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <input
                    className="input col-span-4 py-1.5 text-sm"
                    placeholder="Aro 16"
                    value={v.nome}
                    onChange={(e) => setVar(i, { nome: e.target.value })}
                  />
                  <input
                    className="input col-span-3 py-1.5 text-sm"
                    placeholder="SKU"
                    value={v.sku ?? ""}
                    onChange={(e) => setVar(i, { sku: e.target.value })}
                  />
                  <input
                    className="input col-span-2 py-1.5 text-sm"
                    inputMode="numeric"
                    placeholder="Qtd"
                    value={v.estoqueAtual || ""}
                    onChange={(e) => setVar(i, { estoqueAtual: parseInt(e.target.value) || 0 })}
                  />
                  <input
                    className="input col-span-2 py-1.5 text-sm"
                    inputMode="decimal"
                    placeholder="±R$"
                    value={v.precoAjuste || ""}
                    onChange={(e) => setVar(i, { precoAjuste: parseFloat(e.target.value) || 0 })}
                  />
                  <button onClick={() => rmVar(i)} className="col-span-1 text-red-500 flex justify-center">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button onClick={addVariacao} className="text-brand-500 text-sm flex items-center gap-1">
                <Plus size={14} /> Adicionar variação
              </button>
            </div>
          )}
        </div>

        {!usaGrade && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estoque atual</label>
              <input className="input" inputMode="numeric" value={estoque} onChange={(e) => setEstoque(e.target.value)} />
            </div>
            <div>
              <label className="label">Estoque mínimo</label>
              <input className="input" inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            </div>
          </div>
        )}
        {usaGrade && (
          <div>
            <label className="label">Estoque mínimo (alerta)</label>
            <input className="input" inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </div>
        )}

        <button onClick={salvar} disabled={salvando || enviando} className="btn-primary w-full disabled:opacity-60">
          {salvando ? "Salvando…" : editar ? "Salvar alterações" : "Salvar produto"}
        </button>
      </div>
    </div>
  );
}

function ResumoEstoque({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="card py-3 text-center">
      <div className={`text-2xl font-bold ${cor}`}>{valor}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
