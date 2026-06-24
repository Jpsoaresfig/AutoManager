"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { brl } from "@/lib/analytics";
import type { Entrega, StatusEntrega } from "@/lib/types";
import Guard from "@/components/Guard";
import { usePlano } from "@/lib/usePlano";
import { UpgradeBlock } from "@/components/UpgradeGate";
import { planoQueLibera } from "@/lib/plans";
import { Truck, Plus, X, MapPin, Phone, Check, Bike } from "lucide-react";

export default function EntregasPage() {
  return (
    <Guard>
      <Entregas />
    </Guard>
  );
}

const STATUS_LABEL: Record<StatusEntrega, string> = {
  pendente: "Pendente",
  a_caminho: "A caminho",
  entregue: "Entregue",
};
const STATUS_COR: Record<StatusEntrega, string> = {
  pendente: "text-amber-500",
  a_caminho: "text-blue-500",
  entregue: "text-green-500",
};

function Entregas() {
  const { entregas, membros, role, addEntrega, atribuirMotoboy, setStatusEntrega } = useStore();
  const { caps } = usePlano();
  const dono = role === "owner";

  // owner em plano sem entregas vê tela de upgrade (motoboy só existe no Expansão)
  if (dono && !caps.allowEntregas) {
    return (
      <div className="space-y-4">
        <header className="flex items-center gap-2 pt-1">
          <Truck className="text-brand-600" />
          <h1 className="text-2xl font-bold">Entregas</h1>
        </header>
        <UpgradeBlock
          titulo="Entregas não está no seu plano"
          descricao="Tenha motoboys com painel próprio, atribuição e acompanhamento de entregas. Disponível no plano Expansão."
          planoNecessario={planoQueLibera((p) => p.allowEntregas)}
        />
      </div>
    );
  }

  const motoboys = membros.filter((m) => m.role === "motoboy");
  const [aberto, setAberto] = useState(false);

  const ativas = entregas.filter((e) => e.status !== "entregue");
  const concluidas = entregas.filter((e) => e.status === "entregue");

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Truck className="text-brand-600" />
          <h1 className="text-2xl font-bold">Entregas</h1>
        </div>
        {dono && (
          <button onClick={() => setAberto(true)} className="btn-primary py-2 px-3 text-sm">
            <Plus size={18} /> Entrega
          </button>
        )}
      </header>

      {entregas.length === 0 && (
        <div className="card text-center text-muted">
          {dono ? "Nenhuma entrega ainda." : "Nenhuma entrega atribuída a você."}
        </div>
      )}

      {ativas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Em aberto ({ativas.length})</h2>
          {ativas.map((e) => (
            <EntregaCard
              key={e.id}
              e={e}
              dono={dono}
              motoboys={motoboys}
              nomeMotoboy={membros.find((m) => m.id === e.motoboyId)?.nome}
              onAtribuir={atribuirMotoboy}
              onStatus={setStatusEntrega}
            />
          ))}
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Entregues ({concluidas.length})</h2>
          {concluidas.map((e) => (
            <EntregaCard
              key={e.id}
              e={e}
              dono={dono}
              motoboys={motoboys}
              nomeMotoboy={membros.find((m) => m.id === e.motoboyId)?.nome}
              onAtribuir={atribuirMotoboy}
              onStatus={setStatusEntrega}
            />
          ))}
        </div>
      )}

      {aberto && (
        <NovaEntrega
          motoboys={motoboys}
          onClose={() => setAberto(false)}
          onSalvar={async (dados) => {
            await addEntrega(dados);
            setAberto(false);
          }}
        />
      )}
    </div>
  );
}

function EntregaCard({
  e,
  dono,
  motoboys,
  nomeMotoboy,
  onAtribuir,
  onStatus,
}: {
  e: Entrega;
  dono: boolean;
  motoboys: { id: string; nome: string | null }[];
  nomeMotoboy?: string | null;
  onAtribuir: (id: string, motoboyId: string | null) => void;
  onStatus: (id: string, s: StatusEntrega) => void;
}) {
  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{e.clienteNome || "Cliente"}</div>
          {e.endereco && (
            <div className="text-xs text-muted flex items-center gap-1">
              <MapPin size={12} /> {e.endereco}
            </div>
          )}
          {e.telefone && (
            <a href={`tel:${e.telefone}`} className="text-xs text-brand-500 flex items-center gap-1">
              <Phone size={12} /> {e.telefone}
            </a>
          )}
          {e.observacao && <div className="text-xs text-muted mt-0.5">{e.observacao}</div>}
        </div>
        <div className="text-right shrink-0">
          {e.taxa > 0 && <div className="text-sm font-semibold">{brl(e.taxa)}</div>}
          <div className={`text-xs font-medium ${STATUS_COR[e.status]}`}>
            {STATUS_LABEL[e.status]}
          </div>
        </div>
      </div>

      {dono && (
        <select
          className="input py-1.5 text-sm"
          value={e.motoboyId ?? ""}
          onChange={(ev) => onAtribuir(e.id, ev.target.value || null)}
        >
          <option value="">Sem motoboy</option>
          {motoboys.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome || "Motoboy"}
            </option>
          ))}
        </select>
      )}
      {!dono && nomeMotoboy && (
        <div className="text-xs text-muted flex items-center gap-1">
          <Bike size={12} /> {nomeMotoboy}
        </div>
      )}

      {e.status !== "entregue" && (
        <div className="flex gap-2">
          {e.status === "pendente" && (
            <button
              onClick={() => onStatus(e.id, "a_caminho")}
              className="btn-ghost flex-1 py-2 text-sm"
            >
              <Bike size={16} /> Saí para entrega
            </button>
          )}
          <button
            onClick={() => onStatus(e.id, "entregue")}
            className="btn-primary flex-1 py-2 text-sm"
          >
            <Check size={16} /> Entregue
          </button>
        </div>
      )}
    </div>
  );
}

function NovaEntrega({
  motoboys,
  onClose,
  onSalvar,
}: {
  motoboys: { id: string; nome: string | null }[];
  onClose: () => void;
  onSalvar: (d: {
    clienteNome: string;
    endereco: string;
    telefone?: string;
    taxa?: number;
    motoboyId?: string | null;
    observacao?: string;
  }) => void;
}) {
  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [taxa, setTaxa] = useState("");
  const [motoboyId, setMotoboyId] = useState("");
  const [obs, setObs] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center">
      <div className="surface w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 space-y-3 max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Nova entrega</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div>
          <label className="label">Cliente</label>
          <input className="input" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </div>
        <div>
          <label className="label">Endereço</label>
          <input className="input" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefone</label>
            <input className="input" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div>
            <label className="label">Taxa (R$)</label>
            <input className="input" inputMode="decimal" placeholder="0,00" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
          </div>
        </div>
        {motoboys.length > 0 && (
          <div>
            <label className="label">Motoboy</label>
            <select className="input" value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
              <option value="">Atribuir depois</option>
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome || "Motoboy"}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Observação</label>
          <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: ponto de referência" />
        </div>
        <button
          onClick={() => {
            if (!cliente && !endereco) return;
            onSalvar({
              clienteNome: cliente,
              endereco,
              telefone: telefone || undefined,
              taxa: parseFloat(taxa) || 0,
              motoboyId: motoboyId || null,
              observacao: obs || undefined,
            });
          }}
          className="btn-primary w-full"
        >
          Criar entrega
        </button>
      </div>
    </div>
  );
}
