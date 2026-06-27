"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// Diálogos do design system (confirmar / prompt / alerta) substituindo os
// confirm()/prompt()/alert() nativos — com backdrop blur, animação e teclado.

type ConfirmOpts = {
  titulo: string;
  mensagem?: string;
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
};
type PromptOpts = {
  titulo: string;
  mensagem?: string;
  valorInicial?: string;
  placeholder?: string;
  confirmar?: string;
  tipo?: "text" | "number" | "email";
  inputMode?: "text" | "decimal" | "numeric" | "email" | "tel";
};
type AlertaOpts = { titulo: string; mensagem?: string; ok?: string };

type Estado =
  | { tipo: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { tipo: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | { tipo: "alerta"; opts: AlertaOpts; resolve: () => void };

type Ctx = {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
  alerta: (o: AlertaOpts) => Promise<void>;
};

const DialogCtx = createContext<Ctx | null>(null);

export function useDialog(): Ctx {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("useDialog precisa do <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [valor, setValor] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => setEstado({ tipo: "confirm", opts, resolve })),
    []
  );
  const prompt = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        setValor(opts.valorInicial ?? "");
        setEstado({ tipo: "prompt", opts, resolve });
      }),
    []
  );
  const alerta = useCallback(
    (opts: AlertaOpts) => new Promise<void>((resolve) => setEstado({ tipo: "alerta", opts, resolve })),
    []
  );

  function fechar(resultado: boolean | string | null) {
    if (!estado) return;
    if (estado.tipo === "confirm") estado.resolve(resultado === true);
    else if (estado.tipo === "prompt") estado.resolve(resultado === false ? null : (resultado as string | null));
    else estado.resolve();
    setEstado(null);
  }

  // foco no input ao abrir prompt; Esc cancela; Enter confirma
  useEffect(() => {
    if (!estado) return;
    if (estado.tipo === "prompt") setTimeout(() => inputRef.current?.focus(), 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") fechar(estado!.tipo === "prompt" ? null : false);
      if (e.key === "Enter" && estado!.tipo !== "alerta" && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        fechar(estado!.tipo === "prompt" ? valor : true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, valor]);

  return (
    <DialogCtx.Provider value={{ confirm, prompt, alerta }}>
      {children}
      {estado && (
        <div
          className="modal-backdrop fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => fechar(estado.tipo === "prompt" ? null : false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="sheet-panel sm:modal-panel surface shadow-pop w-full sm:max-w-sm rounded-t-2xl sm:rounded-3xl border border-default p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {estado.tipo !== "prompt" && (estado as any).opts.perigo && (
                <span className="shrink-0 grid place-items-center h-10 w-10 rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle size={20} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-lg leading-tight">{estado.opts.titulo}</h2>
                {estado.opts.mensagem && (
                  <p className="text-sm text-muted mt-1 whitespace-pre-line">{estado.opts.mensagem}</p>
                )}
              </div>
              <button
                onClick={() => fechar(estado.tipo === "prompt" ? null : false)}
                aria-label="Fechar"
                className="shrink-0 grid place-items-center h-8 w-8 -mr-1 -mt-1 rounded-full text-muted hover:bg-[var(--hover)] hover:text-strong active:scale-90 transition"
              >
                <X size={18} />
              </button>
            </div>

            {estado.tipo === "prompt" && (
              <input
                ref={inputRef}
                className="input"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={estado.opts.placeholder}
                type={estado.opts.tipo ?? "text"}
                inputMode={estado.opts.inputMode}
              />
            )}

            <div className="flex gap-2 pt-1">
              {estado.tipo !== "alerta" && (
                <button onClick={() => fechar(estado.tipo === "prompt" ? null : false)} className="btn-ghost flex-1">
                  {(estado.opts as ConfirmOpts).cancelar ?? "Cancelar"}
                </button>
              )}
              <button
                onClick={() => fechar(estado.tipo === "prompt" ? valor : estado.tipo === "alerta" ? null : true)}
                className={`flex-1 btn ${
                  estado.tipo !== "prompt" && (estado as any).opts.perigo
                    ? "bg-red-600 text-white hover:bg-red-700 px-4 py-3"
                    : "btn-primary"
                }`}
              >
                {estado.tipo === "alerta"
                  ? (estado.opts as AlertaOpts).ok ?? "Entendi"
                  : (estado.opts as ConfirmOpts).confirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  );
}
