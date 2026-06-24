"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { aplicarCorMarca } from "@/lib/brand";
import { carregarFonte } from "@/lib/fontes";
import { waLink, igLink, fbLink, ttLink } from "@/lib/contato";
import { brl } from "@/lib/analytics";
import { MessageCircle, X, Send, Gem, Loader2, Phone, Mail, Instagram, Facebook, Music2 } from "lucide-react";

type Variacao = { id: string; nome: string; preco_ajuste: number; estoque_atual: number };
type ProdutoPub = {
  id: string;
  nome: string;
  categoria: string | null;
  marca: string | null;
  preco_venda: number;
  preco_comparativo: number | null;
  descricao: string | null;
  imagens: string[];
  estoque_atual: number;
  variacoes: Variacao[];
};
type Loja = {
  org_id: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  cor_marca: string | null;
  fonte: string | null;
  sobre: string | null;
  email: string | null;
  whatsapp: string | null;
  telefone: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  produtos: ProdutoPub[];
};

export default function LojaPage({ params }: { params: { slug: string } }) {
  const sb = useRef(createClient());
  const [loja, setLoja] = useState<Loja | null | undefined>(undefined);
  const [chat, setChat] = useState(false);
  const [fontStack, setFontStack] = useState("");

  useEffect(() => {
    sb.current.rpc("loja_publica", { p_slug: params.slug }).then(({ data }) => {
      const d = (data as Loja) ?? null;
      setLoja(d);
      if (d?.cor_marca) aplicarCorMarca(d.cor_marca);
      if (d?.fonte) setFontStack(carregarFonte(d.fonte));
    });
  }, [params.slug]);

  if (loja === undefined)
    return (
      <div className="min-h-screen grid place-items-center text-brand-500">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (loja === null)
    return (
      <div className="min-h-screen grid place-items-center text-center px-6">
        <div>
          <div className="text-2xl font-bold">Loja não encontrada</div>
          <p className="text-muted mt-1">Este link pode estar incorreto ou a loja está fora do ar.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24" style={fontStack ? { fontFamily: fontStack } : undefined}>
      {/* cabeçalho da loja */}
      <header className="surface border-b border-default">
        <div className="max-w-3xl mx-auto px-5 py-6 flex items-center gap-4">
          {loja.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loja.logo_url} alt={loja.nome} className="h-16 w-16 rounded-2xl object-cover border border-default" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-brand-600 grid place-items-center text-white">
              <Gem size={28} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{loja.nome}</h1>
            {loja.descricao && <p className="text-sm text-muted">{loja.descricao}</p>}
          </div>
        </div>
      </header>

      {/* catálogo */}
      <main className="max-w-3xl mx-auto px-5 py-5">
        {loja.produtos.length === 0 ? (
          <div className="card text-center text-muted">Catálogo em breve.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {loja.produtos.map((p) => (
              <ProdutoCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>

      {/* sobre + contato */}
      <LojaRodape loja={loja} />

      {/* botão de chat */}
      <button
        onClick={() => setChat(true)}
        className="fixed bottom-5 right-5 z-40 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/30 flex items-center gap-2 px-5 py-3.5 font-semibold"
      >
        <MessageCircle size={20} /> Falar com a loja
      </button>

      {chat && <ChatWidget orgId={loja.org_id} sb={sb.current} nomeLoja={loja.nome} onClose={() => setChat(false)} />}
    </div>
  );
}

function ProdutoCard({ p }: { p: ProdutoPub }) {
  const temDesconto = p.preco_comparativo != null && p.preco_comparativo > p.preco_venda;
  const esgotado = p.estoque_atual <= 0;
  return (
    <div className={`surface rounded-2xl border border-default overflow-hidden flex flex-col ${esgotado ? "opacity-70" : ""}`}>
      <div className="aspect-square surface-alt relative">
        {p.imagens[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagens[0]} alt={p.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted">
            <Gem size={28} />
          </div>
        )}
        {esgotado && (
          <span className="absolute top-2 left-2 rounded-full bg-red-500 text-white px-2 py-0.5 text-[11px] font-semibold">
            Esgotado
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="text-sm font-semibold leading-tight">{p.nome}</div>
        {p.marca && <div className="text-[11px] text-muted">{p.marca}</div>}
        <div className="mt-auto pt-2">
          {temDesconto && (
            <div className="text-[11px] text-muted line-through">{brl(p.preco_comparativo!)}</div>
          )}
          <div className="font-bold text-brand-500">{brl(p.preco_venda)}</div>
          {p.variacoes.length > 0 && (
            <div className="text-[11px] text-muted">{p.variacoes.length} opções</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LojaRodape({ loja }: { loja: Loja }) {
  const links = [
    loja.whatsapp && { href: waLink(loja.whatsapp), icon: <MessageCircle size={18} />, label: "WhatsApp" },
    loja.telefone && { href: `tel:${loja.telefone.replace(/[^\d+]/g, "")}`, icon: <Phone size={18} />, label: "Telefone" },
    loja.email && { href: `mailto:${loja.email}`, icon: <Mail size={18} />, label: "E-mail" },
    loja.instagram && { href: igLink(loja.instagram), icon: <Instagram size={18} />, label: "Instagram" },
    loja.facebook && { href: fbLink(loja.facebook), icon: <Facebook size={18} />, label: "Facebook" },
    loja.tiktok && { href: ttLink(loja.tiktok), icon: <Music2 size={18} />, label: "TikTok" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  if (!loja.sobre && links.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-5 pb-6 space-y-5">
      {loja.sobre && (
        <div className="card">
          <div className="font-semibold mb-1">Sobre</div>
          <p className="text-sm text-muted whitespace-pre-line">{loja.sobre}</p>
        </div>
      )}
      {links.length > 0 && (
        <div className="card">
          <div className="font-semibold mb-3">Fale com a gente</div>
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full surface-alt hover:bg-brand-600 hover:text-white px-4 py-2 text-sm font-medium transition"
              >
                {l.icon} {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

type Msg = { id: string; autor_tipo: string; texto: string };

function ChatWidget({
  orgId,
  sb,
  nomeLoja,
  onClose,
}: {
  orgId: string;
  sb: ReturnType<typeof createClient>;
  nomeLoja: string;
  onClose: () => void;
}) {
  const [nome, setNome] = useState("");
  const [iniciado, setIniciado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const meId = useRef<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function iniciar() {
    setCarregando(true);
    try {
      let {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        user = data.user;
      }
      meId.current = user!.id;

      let { data: conv } = await sb
        .from("conversa")
        .select("id")
        .eq("org_id", orgId)
        .eq("cliente_id", user!.id)
        .maybeSingle();

      if (!conv) {
        const id = crypto.randomUUID();
        const { error } = await sb
          .from("conversa")
          .insert({ id, org_id: orgId, cliente_id: user!.id, cliente_nome: nome || null });
        if (error) throw error;
        conv = { id };
      } else if (nome) {
        await sb.from("conversa").update({ cliente_nome: nome }).eq("id", conv.id);
      }
      setConversaId(conv.id);

      const { data: m } = await sb
        .from("mensagem")
        .select("id, autor_tipo, texto")
        .eq("conversa_id", conv.id)
        .order("criada_em");
      setMsgs((m as Msg[]) || []);

      // garante que o realtime use o token do cliente (RLS)
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session) sb.realtime.setAuth(session.access_token);

      sb.channel("conv-" + conv.id)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "mensagem", filter: `conversa_id=eq.${conv.id}` },
          (payload) => {
            const nova = payload.new as Msg;
            setMsgs((prev) => (prev.some((x) => x.id === nova.id) ? prev : [...prev, nova]));
          }
        )
        .subscribe();

      setIniciado(true);
    } catch (e: any) {
      alert("Não foi possível iniciar o chat: " + (e?.message || e));
    } finally {
      setCarregando(false);
    }
  }

  async function enviar() {
    const t = texto.trim();
    if (!t || !conversaId || !meId.current) return;
    setTexto("");
    const { data, error } = await sb
      .from("mensagem")
      .insert({ conversa_id: conversaId, org_id: orgId, autor_id: meId.current, autor_tipo: "cliente", texto: t })
      .select("id, autor_tipo, texto")
      .single();
    if (error) {
      alert("Erro ao enviar: " + error.message);
      setTexto(t);
      return;
    }
    if (data) setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
  }

  useEffect(() => {
    return () => {
      sb.removeAllChannels();
    };
  }, [sb]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="surface w-full max-w-md md:rounded-3xl rounded-t-3xl flex flex-col h-[80vh] md:h-[600px]">
        <header className="flex items-center justify-between p-4 border-b border-default">
          <div className="font-semibold">{nomeLoja}</div>
          <button onClick={onClose}>
            <X />
          </button>
        </header>

        {!iniciado ? (
          <div className="flex-1 grid place-items-center p-6 text-center">
            <div className="space-y-3 w-full">
              <MessageCircle className="mx-auto text-brand-500" size={36} />
              <p className="text-sm text-muted">Mande uma mensagem direto para a loja.</p>
              <input
                className="input"
                placeholder="Seu nome (opcional)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <button onClick={iniciar} disabled={carregando} className="btn-primary w-full disabled:opacity-60">
                {carregando ? <Loader2 className="animate-spin" size={18} /> : "Iniciar conversa"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {msgs.length === 0 && (
                <p className="text-center text-sm text-muted">Diga olá 👋</p>
              )}
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.autor_tipo === "cliente"
                      ? "bg-brand-600 text-white ml-auto"
                      : "surface-alt"
                  }`}
                >
                  {m.texto}
                </div>
              ))}
              <div ref={fimRef} />
            </div>
            <div className="p-3 border-t border-default flex gap-2">
              <input
                className="input flex-1"
                placeholder="Escreva uma mensagem…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviar()}
              />
              <button onClick={enviar} className="btn-primary px-4">
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
