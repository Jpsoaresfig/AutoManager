"use client";
import Link from "next/link";
import { Lock, Sparkles, X, ArrowRight } from "lucide-react";
import type { PlanoDef } from "@/lib/plans";
import { brlPreco } from "@/lib/plans";

// Bloco de página inteira para recursos bloqueados (ex.: analytics avançado).
export function UpgradeBlock({
  titulo,
  descricao,
  planoNecessario,
}: {
  titulo: string;
  descricao: string;
  planoNecessario?: PlanoDef | null;
}) {
  return (
    <div className="card text-center py-12 px-6 space-y-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-500/10 grid place-items-center">
        <Lock className="text-brand-500" size={28} />
      </div>
      <div>
        <div className="text-xl font-bold">{titulo}</div>
        <p className="text-sm text-muted max-w-md mx-auto mt-1">{descricao}</p>
      </div>
      <Link href="/planos" className="btn-primary inline-flex w-auto px-6 mx-auto">
        <Sparkles size={16} />
        {planoNecessario
          ? `Desbloquear com o ${planoNecessario.nome} · ${brlPreco(planoNecessario.precoCentavos)}/mês`
          : "Ver planos"}
      </Link>
    </div>
  );
}

// Modal para ações bloqueadas (ex.: tentar criar vendedor/4ª revendedora).
export function UpgradeModal({
  aberto,
  onClose,
  titulo,
  descricao,
  planoNecessario,
}: {
  aberto: boolean;
  onClose: () => void;
  titulo: string;
  descricao: string;
  planoNecessario?: PlanoDef | null;
}) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5" onClick={onClose}>
      <div className="surface w-full max-w-sm rounded-3xl p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-500/10 grid place-items-center -mt-2">
          <Sparkles className="text-brand-500" size={28} />
        </div>
        <div>
          <div className="text-lg font-bold">{titulo}</div>
          <p className="text-sm text-muted mt-1">{descricao}</p>
        </div>

        {planoNecessario && (
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="font-bold">Plano {planoNecessario.nome}</span>
              <span className="text-brand-500 font-bold">{brlPreco(planoNecessario.precoCentavos)}/mês</span>
            </div>
            <ul className="mt-2 space-y-1">
              {planoNecessario.beneficios.slice(0, 4).map((b) => (
                <li key={b} className="text-xs text-muted flex items-center gap-1.5">
                  <ArrowRight size={12} className="text-brand-500 shrink-0" /> {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/planos" className="btn-primary w-full">
          <Sparkles size={16} /> Fazer upgrade
        </Link>
        <button onClick={onClose} className="text-sm text-muted w-full">
          Agora não
        </button>
      </div>
    </div>
  );
}
