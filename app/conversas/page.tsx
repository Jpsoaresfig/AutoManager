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

type Conversa = { id: string; cliente_nome: string | null; ultima_em: string };
type Msg = { id: string; autor_tipo: string; texto: string };

function Conversas() {
  const orgId = useStore((s) => s.orgId);
  const meId = useStore((s) => s.usuarioId);
  const sb = useRef(createClient());
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  // carrega conversas + realtime de novas mensagens da org
  useEffect(() => {
    const client = sb.current;
    let ch: ReturnType<typeof client.channel> | null = null;

    client
      .from("conversa")
      .select("id, cliente_nome, ultima_em")
      .order("ultima_em", { ascending: false })
      .then(({ data }) => setConversas((data as Conversa[]) || []));

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
        // reordena a conversa pro topo
        setConversas((prev) => {
          const found = prev.find((c) => c.id === m.conversa_id);
          if (!found) return prev;
          return [{ ...found, ultima_em: m.criada_em }, ...prev.filter((c) => c.id !== m.conversa_id)];
        });
        if (m.conversa_id === sel)
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m as Msg]));
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
      </header>

      {/* lista */}
      {!sel && (
        <div className="space-y-2">
          {conversas.length === 0 && (
            <div className="card text-center text-muted">
              Nenhuma conversa ainda. Ative a mini-loja em Configurações e compartilhe o link.
            </div>
          )}
          {conversas.map((c) => (
            <button
              key={c.id}
              onClick={() => setSel(c.id)}
              className="card w-full text-left flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-brand-600/15 grid place-items-center text-brand-500 font-bold">
                {(c.cliente_nome || "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="font-medium">{c.cliente_nome || "Cliente"}</div>
            </button>
          ))}
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
