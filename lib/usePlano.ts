"use client";
import { useStore } from "./store";
import {
  capacidades,
  planoEfetivo,
  trialAtivo,
  diasDeTrial,
  atingiuLimite,
  planoDef,
  type PlanoDef,
  type PlanoId,
  type UsoRecursos,
  type Recurso,
} from "./plans";

// Hook único de assinatura/limites. Toda checagem de plano na UI passa por aqui.
export function usePlano() {
  const assinatura = useStore((s) => s.assinatura);
  const revendedoras = useStore((s) => s.revendedoras);
  const membros = useStore((s) => s.membros);

  const caps = capacidades(assinatura);
  const planoEf: PlanoId = planoEfetivo(assinatura);
  const planoContratado: PlanoId = assinatura?.plano ?? "solo";

  const uso: UsoRecursos = {
    revendedoras: revendedoras.filter((r) => r.ativa).length,
    vendedores: membros.filter((m) => m.role === "vendedor").length,
    motoboys: membros.filter((m) => m.role === "motoboy").length,
  };

  return {
    assinatura,
    caps, // PlanoDef efetivo (considera trial)
    planoEfetivo: planoEf,
    planoContratado,
    defContratado: planoDef(planoContratado),
    emTrial: trialAtivo(assinatura),
    diasTrial: diasDeTrial(assinatura),
    uso,
    // helpers de checagem
    pode: (chave: keyof PlanoDef) => Boolean(caps[chave]),
    limiteAtingido: (r: Recurso) => atingiuLimite(uso, caps, r),
  };
}
