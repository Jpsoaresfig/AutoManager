"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { aplicarCorMarca } from "@/lib/brand";
import { uploadLogo } from "@/lib/uploadLogo";
import { brl } from "@/lib/analytics";
import { slugSugerido } from "@/lib/slug";
import { FONTES, carregarFonte } from "@/lib/fontes";
import Guard from "@/components/Guard";
import type { Produto } from "@/lib/types";
import {
  Globe,
  Palette,
  Type,
  Image as ImageIcon,
  Upload,
  Loader2,
  Copy,
  ExternalLink,
  Check,
  Gem,
  Eye,
  EyeOff,
  AlertTriangle,
  Smartphone,
  MessageCircle,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Music2,
  Info,
  AtSign,
} from "lucide-react";

export default function MinhaLojaPage() {
  return (
    <Guard>
      <MinhaLoja />
    </Guard>
  );
}

const CORES = ["#db2777", "#7c3aed", "#2563eb", "#0d9488", "#ea580c", "#dc2626", "#ca8a04", "#111827"];

function MinhaLoja() {
  const { config, orgId, produtos, setConfig, definirSlug } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(config.nomeLoja);
  const [descricao, setDescricao] = useState(config.lojaDescricao ?? "");
  const [slug, setSlug] = useState(config.slug ?? "");
  const [cor, setCor] = useState<string | null>(config.corMarca);
  const [logoUrl, setLogoUrl] = useState<string | null>(config.logoUrl);
  const [fonte, setFonte] = useState(config.lojaFonte ?? "padrao");
  const [sobre, setSobre] = useState(config.lojaSobre ?? "");

  // contato + redes
  const [whatsapp, setWhatsapp] = useState(config.lojaWhatsapp ?? "");
  const [telefone, setTelefone] = useState(config.lojaTelefone ?? "");
  const [email, setEmail] = useState(config.lojaEmail ?? "");
  const [instagram, setInstagram] = useState(config.lojaInstagram ?? "");
  const [facebook, setFacebook] = useState(config.lojaFacebook ?? "");
  const [tiktok, setTiktok] = useState(config.lojaTiktok ?? "");

  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [salvandoSlug, setSalvandoSlug] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  const [fontStack, setFontStack] = useState("");
  useEffect(() => {
    setFontStack(carregarFonte(fonte));
  }, [fonte]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = config.slug ? `${origin}/loja/${config.slug}` : "";

  const visiveis = produtos.filter((p) => p.ativo);
  const ocultos = produtos.length - visiveis.length;
  const semEstoque = visiveis.filter((p) => p.estoqueAtual <= 0).length;

  async function toggleAtiva() {
    setErro(null);
    const ativar = !config.lojaAtiva;
    if (ativar && !config.slug) {
      const s = slugSugerido(config.nomeLoja || "minha-loja");
      const r = await definirSlug(s);
      if (!r.ok) {
        setErro(r.erro || "Não foi possível gerar o link");
        return;
      }
      setSlug(s);
    }
    await setConfig({ lojaAtiva: ativar });
  }

  async function salvarSlug() {
    setErro(null);
    const limpo = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
    if (!limpo) {
      setErro("Informe um link válido");
      return;
    }
    if (limpo === config.slug) return;
    setSalvandoSlug(true);
    const r = await definirSlug(limpo);
    setSalvandoSlug(false);
    if (!r.ok) setErro(r.erro || "Erro ao salvar o link");
    else setSlug(limpo);
  }

  function escolherCor(hex: string | null) {
    setCor(hex);
    aplicarCorMarca(hex);
    setConfig({ corMarca: hex });
  }

  function escolherFonte(k: string) {
    setFonte(k);
    setConfig({ lojaFonte: k === "padrao" ? null : k });
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setEnviandoLogo(true);
    try {
      const u = await uploadLogo(orgId, file);
      setLogoUrl(u);
      await setConfig({ logoUrl: u });
    } catch (err: any) {
      alert("Não foi possível enviar a logo: " + (err?.message || "erro"));
    } finally {
      setEnviandoLogo(false);
    }
  }

  function copiar() {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  const salvar = (campo: string, valor: string) => setConfig({ [campo]: valor || null } as any);

  return (
    <div className="space-y-4 pb-10">
      <header className="pt-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minha Loja</h1>
          <p className="text-sm text-muted">Monte sua loja online: link, identidade, contato e vitrine.</p>
        </div>
        <button
          onClick={toggleAtiva}
          className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            config.lojaAtiva ? "bg-brand-600 text-white" : "surface-alt text-muted"
          }`}
        >
          {config.lojaAtiva ? <Eye size={16} /> : <EyeOff size={16} />}
          {config.lojaAtiva ? "No ar" : "Fora do ar"}
        </button>
      </header>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* ---------------- edição ---------------- */}
        <div className="space-y-4">
          {/* Link */}
          <section className="card space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Globe size={18} className="text-brand-500" /> Link da loja
            </div>
            {!config.lojaAtiva && (
              <p className="text-sm text-muted">
                Sua loja está <b>fora do ar</b>. Ative em “No ar” para gerar o link e deixá-la visível.
              </p>
            )}
            <div>
              <label className="label">Endereço da loja</label>
              <div className="flex gap-2">
                <span className="input flex items-center text-sm text-muted truncate max-w-[45%]">{origin}/loja/</span>
                <input className="input flex-1" value={slug} placeholder="minha-loja" onChange={(e) => setSlug(e.target.value)} onBlur={salvarSlug} />
              </div>
              {salvandoSlug && <p className="text-xs text-muted mt-1">Salvando…</p>}
            </div>
            {url && (
              <div className="flex gap-2">
                <button onClick={copiar} className="btn-ghost flex-1 py-2 text-sm">
                  {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado!" : "Copiar link"}
                </button>
                <a href={url} target="_blank" rel="noreferrer" className="btn-ghost flex-1 py-2 text-sm">
                  <ExternalLink size={15} /> Abrir loja
                </a>
              </div>
            )}
            {erro && <p className="text-sm text-red-500">{erro}</p>}
          </section>

          {/* Identidade */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <Palette size={18} className="text-brand-500" /> Identidade
            </div>
            <div>
              <label className="label">Nome da loja</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => setConfig({ nomeLoja: nome || "Minha Loja" })} />
            </div>
            <div>
              <label className="label">Chamada curta (subtítulo)</label>
              <textarea
                className="input"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onBlur={() => setConfig({ lojaDescricao: descricao || null })}
                placeholder="Ex.: Semijoias folheadas com garantia. Entrega para toda a cidade."
              />
            </div>

            {/* logo */}
            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl surface-alt grid place-items-center overflow-hidden border border-default">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={22} className="text-muted" />
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
                <button onClick={() => fileRef.current?.click()} disabled={enviandoLogo} className="btn-ghost py-2 px-3 text-sm">
                  {enviandoLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {logoUrl ? "Trocar logo" : "Enviar logo"}
                </button>
              </div>
            </div>

            {/* cor */}
            <div>
              <label className="label">Cor da loja</label>
              <div className="flex flex-wrap items-center gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    onClick={() => escolherCor(c)}
                    className={`h-8 w-8 rounded-full border-2 ${cor === c ? "border-white ring-2 ring-brand-500" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
                <label className="h-8 w-8 rounded-full border border-default grid place-items-center cursor-pointer overflow-hidden">
                  <input type="color" className="h-10 w-10 cursor-pointer" value={cor || "#db2777"} onChange={(e) => escolherCor(e.target.value)} />
                </label>
                <button onClick={() => escolherCor(null)} className="text-xs text-muted ml-1 underline">
                  padrão
                </button>
              </div>
            </div>

            {/* fonte */}
            <div>
              <label className="label flex items-center gap-1">
                <Type size={14} /> Fonte das letras
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FONTES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => escolherFonte(f.key)}
                    style={{ fontFamily: carregarFonte(f.key) || undefined }}
                    className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                      fonte === f.key ? "border-brand-500 bg-brand-500/5" : "border-default hover:surface-alt"
                    }`}
                  >
                    <div className="font-semibold truncate">Aa</div>
                    <div className="text-[11px] text-muted truncate">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Sobre */}
          <section className="card space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Info size={18} className="text-brand-500" /> Sobre a loja
            </div>
            <textarea
              className="input"
              rows={4}
              value={sobre}
              onChange={(e) => setSobre(e.target.value)}
              onBlur={() => setConfig({ lojaSobre: sobre || null })}
              placeholder="Conte a história da sua loja, diferenciais, garantia, prazos de entrega, formas de pagamento…"
            />
          </section>

          {/* Contato */}
          <section className="card space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Phone size={18} className="text-brand-500" /> Contato
            </div>
            <div>
              <label className="label flex items-center gap-1"><MessageCircle size={13} /> WhatsApp</label>
              <input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} onBlur={() => salvar("lojaWhatsapp", whatsapp)} placeholder="Ex.: 11 99999-9999" />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Phone size={13} /> Telefone</label>
              <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} onBlur={() => salvar("lojaTelefone", telefone)} placeholder="Ex.: (11) 3333-3333" />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Mail size={13} /> E-mail</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => salvar("lojaEmail", email)} placeholder="contato@sualoja.com" />
            </div>
          </section>

          {/* Redes sociais */}
          <section className="card space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <AtSign size={18} className="text-brand-500" /> Redes sociais
            </div>
            <div>
              <label className="label flex items-center gap-1"><Instagram size={13} /> Instagram</label>
              <input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} onBlur={() => salvar("lojaInstagram", instagram)} placeholder="@sualoja" />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Facebook size={13} /> Facebook</label>
              <input className="input" value={facebook} onChange={(e) => setFacebook(e.target.value)} onBlur={() => salvar("lojaFacebook", facebook)} placeholder="sualoja ou link completo" />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Music2 size={13} /> TikTok</label>
              <input className="input" value={tiktok} onChange={(e) => setTiktok(e.target.value)} onBlur={() => salvar("lojaTiktok", tiktok)} placeholder="@sualoja" />
            </div>
          </section>

          {/* Resumo da vitrine */}
          <section className="card space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Gem size={18} className="text-brand-500" /> Produtos na vitrine
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="surface-alt rounded-xl py-2">
                <div className="text-xl font-bold">{visiveis.length}</div>
                <div className="text-[11px] text-muted">aparecem</div>
              </div>
              <div className="surface-alt rounded-xl py-2">
                <div className="text-xl font-bold">{ocultos}</div>
                <div className="text-[11px] text-muted">ocultos (inativos)</div>
              </div>
              <div className="surface-alt rounded-xl py-2">
                <div className="text-xl font-bold">{semEstoque}</div>
                <div className="text-[11px] text-muted">sem estoque</div>
              </div>
            </div>
            {semEstoque > 0 && (
              <p className="text-xs text-amber-600 flex items-start gap-1">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {semEstoque} produto(s) sem estoque aparecem como “Esgotado”. Desative-os em Produtos para ocultar.
              </p>
            )}
          </section>
        </div>

        {/* ---------------- preview ---------------- */}
        <div className="lg:sticky lg:top-4">
          <div className="flex items-center gap-2 text-sm text-muted mb-2">
            <Smartphone size={15} /> Pré-visualização — é assim que sua cliente vê
          </div>
          <PreviewLoja
            nome={nome || "Minha Loja"}
            descricao={descricao}
            sobre={sobre}
            logoUrl={logoUrl}
            produtos={visiveis}
            fontStack={fontStack}
            contato={{ whatsapp, telefone, email, instagram, facebook, tiktok }}
          />
        </div>
      </div>
    </div>
  );
}

type Contato = { whatsapp: string; telefone: string; email: string; instagram: string; facebook: string; tiktok: string };

function PreviewLoja({
  nome,
  descricao,
  sobre,
  logoUrl,
  produtos,
  fontStack,
  contato,
}: {
  nome: string;
  descricao: string;
  sobre: string;
  logoUrl: string | null;
  produtos: Produto[];
  fontStack: string;
  contato: Contato;
}) {
  const temContato = contato.whatsapp || contato.telefone || contato.email;
  const temRede = contato.instagram || contato.facebook || contato.tiktok;
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border-4 border-default surface overflow-hidden shadow-xl">
      <div className="h-6 surface-alt flex items-center justify-center">
        <div className="h-1.5 w-16 rounded-full bg-default/60" />
      </div>

      <div className="max-h-[620px] overflow-auto bg-[var(--bg)]" style={fontStack ? { fontFamily: fontStack } : undefined}>
        <header className="surface border-b border-default">
          <div className="px-4 py-4 flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={nome} className="h-12 w-12 rounded-2xl object-cover border border-default" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-brand-600 grid place-items-center text-white">
                <Gem size={22} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{nome}</h2>
              {descricao && <p className="text-xs text-muted line-clamp-2">{descricao}</p>}
            </div>
          </div>
        </header>

        <main className="px-3 py-3">
          {produtos.length === 0 ? (
            <div className="card text-center text-muted text-sm">Cadastre produtos para preencher sua vitrine.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {produtos.map((p) => (
                <PreviewCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </main>

        {sobre && (
          <section className="px-4 py-3 border-t border-default">
            <div className="text-sm font-semibold mb-1">Sobre</div>
            <p className="text-xs text-muted whitespace-pre-line">{sobre}</p>
          </section>
        )}

        {(temContato || temRede) && (
          <section className="px-4 py-4 border-t border-default space-y-2">
            <div className="text-sm font-semibold">Fale com a gente</div>
            <div className="flex flex-wrap gap-2">
              {contato.whatsapp && <Pill icon={<MessageCircle size={13} />} txt="WhatsApp" />}
              {contato.telefone && <Pill icon={<Phone size={13} />} txt={contato.telefone} />}
              {contato.email && <Pill icon={<Mail size={13} />} txt="E-mail" />}
              {contato.instagram && <Pill icon={<Instagram size={13} />} txt="Instagram" />}
              {contato.facebook && <Pill icon={<Facebook size={13} />} txt="Facebook" />}
              {contato.tiktok && <Pill icon={<Music2 size={13} />} txt="TikTok" />}
            </div>
          </section>
        )}

        <div className="sticky bottom-2 flex justify-end px-3 pb-2">
          <span className="bg-brand-600 text-white rounded-full shadow-lg flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
            <MessageCircle size={14} /> Falar com a loja
          </span>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, txt }: { icon: React.ReactNode; txt: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full surface-alt px-3 py-1.5 text-xs">
      {icon} {txt}
    </span>
  );
}

function PreviewCard({ p }: { p: Produto }) {
  const temDesconto = p.precoComparativo != null && p.precoComparativo > p.precoVenda;
  const esgotado = p.estoqueAtual <= 0;
  return (
    <div className="surface rounded-2xl border border-default overflow-hidden flex flex-col">
      <div className="aspect-square surface-alt relative">
        {p.imagens[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagens[0]} alt={p.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted">
            <Gem size={24} />
          </div>
        )}
        <span className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${esgotado ? "bg-red-500 text-white" : "bg-black/55 text-white"}`}>
          {esgotado ? "Esgotado" : `${p.estoqueAtual} em estoque`}
        </span>
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <div className="text-xs font-semibold leading-tight line-clamp-2">{p.nome}</div>
        {p.marca && <div className="text-[10px] text-muted">{p.marca}</div>}
        <div className="mt-auto pt-1.5">
          {temDesconto && <div className="text-[10px] text-muted line-through">{brl(p.precoComparativo!)}</div>}
          <div className="font-bold text-brand-500 text-sm">{brl(p.precoVenda)}</div>
          {p.variacoes.length > 0 && <div className="text-[10px] text-muted">{p.variacoes.length} opções</div>}
        </div>
      </div>
    </div>
  );
}
