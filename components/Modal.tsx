"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Modal/sheet padronizado de toda a área logada.
//
// IMPORTANTE: renderiza via PORTAL no document.body. As páginas ficam dentro do
// PageTransition (.page-enter), que mantém um `transform` residual (animation
// fill-mode: both). Um ancestral com transform vira "containing block" do
// position: fixed, então um modal fixo declarado dentro da página se prende à
// área de conteúdo (e corta o form) em vez de ocupar a viewport. O portal tira o
// modal de dentro desse ancestral e resolve o corte de uma vez.
//
// Estrutura fixa: cabeçalho (não rola) + corpo rolável + rodapé opcional (botões,
// também não rola). Cada tela passa só os campos e o rodapé que precisa.
export default function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean; // usa max-w-lg (ex.: tabela de preview na importação)
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // trava o scroll do fundo
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/40 modal-backdrop flex items-end md:items-center justify-center md:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // clique fora fecha
      }}
    >
      <div
        className={`surface modal-panel w-full ${
          wide ? "max-w-lg" : "max-w-md"
        } rounded-t-3xl md:rounded-3xl flex flex-col max-h-[90dvh] md:max-h-[88vh]`}
      >
        {/* cabeçalho fixo */}
        <div className="flex items-center justify-between gap-3 p-5 pb-3 border-b border-default shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 min-w-0">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-strong transition shrink-0">
            <X />
          </button>
        </div>

        {/* corpo rolável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">{children}</div>

        {/* rodapé fixo (opcional) */}
        {footer && <div className="p-4 border-t border-default shrink-0 space-y-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
