"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { ehSuperadmin, linkWhatsappSuporte } from "@/lib/admin";
import Guard from "@/components/Guard";
import type { Chamado } from "@/lib/types";
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  Mail,
  MessageCircle,
  Store,
  Inbox,
} from "lucide-react";

export default function AdminPage() {
  return (
    <Guard>
      <Admin />
    </Guard>
  );
}

const TIPO_LABEL: Record<string, string> = {
  erro: "Erro",
  duvida: "Dúvida",
  sugestao: "Sugestão",
};

function quando(ms: number) {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Admin() {
  const email = useStore((s) => s.email);
  const listarChamados = useStore((s) => s.listarChamados);
  const resolverChamado = useStore((s) => s.resolverChamado);

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"abertos" | "todos">("abertos");

  const autorizado = ehSuperadmin(email);

  async function carregar() {
    setCarregando(true);
    const lista = await listarChamados();
    setChamados(lista);
    setCarregando(false);
  }

  useEffect(() => {
    if (autorizado) carregar();
    else setCarregando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado]);

  async function alternar(c: Chamado) {
    const resolvido = c.status !== "resolvido";
    // otimista
    setChamados((cs) =>
      cs.map((x) =>
        x.id === c.id
          ? { ...x, status: resolvido ? "resolvido" : "aberto", resolvidoEm: resolvido ? Date.now() : null }
          : x
      )
    );
    await resolverChamado(c.id, resolvido);
  }

  if (!autorizado) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <div className="space-y-3 max-w-sm">
          <Lock size={40} className="text-muted mx-auto" />
          <h1 className="text-xl font-bold">Área restrita</h1>
          <p className="text-muted text-sm">
            Esta tela é exclusiva da administração do AutoManager. Sua conta não tem acesso.
          </p>
        </div>
      </div>
    );
  }

  const lista =
    filtro === "abertos" ? chamados.filter((c) => c.status !== "resolvido") : chamados;
  const abertos = chamados.filter((c) => c.status !== "resolvido").length;

  return (
    <div className="space-y-4">
      <header className="pt-1 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-2xl">
            <ShieldCheck size={24} /> Admin
          </div>
          <p className="text-sm text-muted">
            Chamados de suporte de todas as lojas · {abertos} aberto(s)
          </p>
        </div>
        <button
          onClick={carregar}
          className="btn-ghost flex items-center gap-2 text-sm"
          disabled={carregando}
        >
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </header>

      <div className="flex gap-2">
        {(["abertos", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium border transition ${
              filtro === f
                ? "bg-brand-600 text-white border-brand-600"
                : "border-default text-muted hover:surface-alt"
            }`}
          >
            {f === "abertos" ? "Abertos" : "Todos"}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="card text-center text-muted py-10">Carregando chamados…</div>
      ) : lista.length === 0 ? (
        <div className="card text-center text-muted py-10 flex flex-col items-center gap-2">
          <Inbox size={32} />
          {filtro === "abertos" ? "Nenhum chamado em aberto 🎉" : "Nenhum chamado ainda."}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => (
            <div
              key={c.id}
              className={`card space-y-2 ${
                c.status === "resolvido" ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        c.tipo === "erro"
                          ? "bg-red-500/15 text-red-500"
                          : c.tipo === "sugestao"
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-brand-500/15 text-brand-600"
                      }`}
                    >
                      {TIPO_LABEL[c.tipo] ?? c.tipo}
                    </span>
                    {c.status === "resolvido" && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">
                        Resolvido
                      </span>
                    )}
                    <span className="text-xs text-muted">{quando(c.criadoEm)}</span>
                  </div>
                  <div className="font-semibold mt-1 truncate">{c.assunto}</div>
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap break-words">{c.mensagem}</p>

              <div className="flex items-center gap-3 text-xs text-muted flex-wrap pt-1">
                {c.nomeLoja && (
                  <span className="flex items-center gap-1">
                    <Store size={13} /> {c.nomeLoja}
                  </span>
                )}
                {c.emailContato && (
                  <a
                    href={`mailto:${c.emailContato}`}
                    className="flex items-center gap-1 hover:text-brand-600"
                  >
                    <Mail size={13} /> {c.emailContato}
                  </a>
                )}
                {c.whatsapp && (
                  <a
                    href={linkWhatsappSuporte()}
                    className="flex items-center gap-1 hover:text-green-600"
                  >
                    <MessageCircle size={13} /> {c.whatsapp}
                  </a>
                )}
              </div>

              <div className="pt-1">
                <button
                  onClick={() => alternar(c)}
                  className={`text-sm flex items-center gap-1.5 font-medium ${
                    c.status === "resolvido" ? "text-muted" : "text-green-600"
                  }`}
                >
                  {c.status === "resolvido" ? (
                    <>
                      <RotateCcw size={15} /> Reabrir
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Marcar como resolvido
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
