"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import Guard from "@/components/Guard";
import { MessageCircle, Send, ChevronLeft } from "lucide-react";

export default function ConversasPage() {
  return (
    <Guard>
      <Conversas />
    </Guard>
  );
}

type Conversa = { id: string; cliente_nome: string | null; ultima_em: string; ultima_cliente_em: string | null };
type Msg = { id: string; autor_tipo: string; texto: string };

const vistoKey = (id: string) => "aminbox_visto_" + id;

function Conversas() {
  const orgId = useStore((s) => s.orgId);
  const meId = useStore((s) => s.usuarioId);
  const sb = useRef(createClient());
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [vistos, setVistos] = useState<Record<string, number>>({});
  const fimRef = useRef<HTMLDivElement>(null);

  function naoLida(c: Conversa) {
    if (!c.ultima_cliente_em) return false;
    return new Date(c.ultima_cliente_em).getTime() > (vistos[c.id] || 0);
  }
  function marcarVisto(id: string) {
    const agora = Date.now();
    if (typeof localStorage !== "undefined") localStorage.setItem(vistoKey(id), String(agora));
    setVistos((v) => ({ ...v, [id]: agora }));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("aminbox-visto")); // atualiza o badge do menu
  }
  function abrir(id: string) {
    marcarVisto(id);
    setSel(id);
  }

  // carrega conversas + realtime de novas mensagens da org
  useEffect(() => {
    const client = sb.current;
    let ch: ReturnType<typeof client.channel> | null = null;

    client
      .from("conversa")
      .select("id, cliente_nome, ultima_em, ultima_cliente_em")
      .order("ultima_em", { ascending: false })
      .then(({ data }) => {
        const lista = (data as Conversa[]) || [];
        setConversas(lista);
        if (typeof localStorage !== "undefined") {
          const seed: Record<string, number> = {};
          for (const c of lista) seed[c.id] = Number(localStorage.getItem(vistoKey(c.id)) || 0);
          setVistos(seed);
        }
      });

    // garante token no realtime (RLS) antes de assinar
    client.auth.getSession().then(({ data }) => {
      if (data.session) client.realtime.setAuth(data.session.access_token);
    });

    ch = client
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversa" }, (p) => {
        const c = p.new as Conversa;
        setConversas((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagem" }, (p) => {
        const m = p.new as any;
        const doCliente = m.autor_tipo === "cliente";
        // reordena pro topo e atualiza a hora da última msg do cliente
        setConversas((prev) => {
          const found = prev.find((c) => c.id === m.conversa_id);
          if (!found) return prev;
          const atualizada: Conversa = {
            ...found,
            ultima_em: m.criada_em,
            ultima_cliente_em: doCliente ? m.criada_em : found.ultima_cliente_em,
          };
          return [atualizada, ...prev.filter((c) => c.id !== m.conversa_id)];
        });
        if (sel && m.conversa_id === sel) {
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m as Msg]));
          if (doCliente) marcarVisto(sel); // já está vendo -> não conta como não lida
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(ch);
    };
  }, [sel]);

  useEffect(() => {
    if (!sel) return;
    sb.current
      .from("mensagem")
      .select("id, autor_tipo, texto")
      .eq("conversa_id", sel)
      .order("criada_em")
      .then(({ data }) => setMsgs((data as Msg[]) || []));
  }, [sel]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviar() {
    const t = texto.trim();
    if (!t || !sel || !meId || !orgId) return;
    setTexto("");
    const { data } = await sb.current
      .from("mensagem")
      .insert({ conversa_id: sel, org_id: orgId, autor_id: meId, autor_tipo: "loja", texto: t })
      .select("id, autor_tipo, texto")
      .single();
    if (data) setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
    await sb.current.from("conversa").update({ ultima_em: new Date().toISOString() }).eq("id", sel);
  }

  const selConversa = conversas.find((c) => c.id === sel);
  const totalNaoLidas = conversas.filter(naoLida).length;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 pt-1">
        {sel && (
          <button onClick={() => setSel(null)} className="md:hidden text-muted">
            <ChevronLeft />
          </button>
        )}
        <MessageCircle className="text-brand-600" />
        <h1 className="text-2xl font-bold">{sel ? selConversa?.cliente_nome || "Cliente" : "Conversas"}</h1>
        {!sel && totalNaoLidas > 0 && (
          <span className="ml-1 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px] h-5 px-1.5 grid place-items-center">
            {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
          </span>
        )}
      </header>

      {/* lista */}
      {!sel && (
        <div className="space-y-2">
          {conversas.length === 0 && (
            <div className="card text-center text-muted">
              Nenhuma conversa ainda. Ative a mini-loja em Configurações e compartilhe o link.
            </div>
          )}
          {conversas.map((c) => {
            const nova = naoLida(c);
            return (
              <button
                key={c.id}
                onClick={() => abrir(c.id)}
                className={`card w-full text-left flex items-center gap-3 ${nova ? "border-brand-500/40" : ""}`}
              >
                <div className="relative h-10 w-10 rounded-full bg-brand-600/15 grid place-items-center text-brand-500 font-bold">
                  {(c.cliente_nome || "C").slice(0, 1).toUpperCase()}
                  {nova && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-[var(--surface)]" />
                  )}
                </div>
                <div className={`flex-1 ${nova ? "font-bold" : "font-medium"}`}>{c.cliente_nome || "Cliente"}</div>
                {nova && (
                  <span className="text-[11px] font-semibold text-white bg-brand-600 rounded-full px-2 py-0.5">nova</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* chat */}
      {sel && (
        <div className="card flex flex-col h-[70vh] p-0 overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {msgs.length === 0 && <p className="text-center text-sm text-muted">Sem mensagens ainda.</p>}
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.autor_tipo === "loja" ? "bg-brand-600 text-white ml-auto" : "surface-alt"
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
              placeholder="Responder…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
            />
            <button onClick={enviar} className="btn-primary px-4">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
