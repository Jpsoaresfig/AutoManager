"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { brl } from "@/lib/analytics";
import Guard from "@/components/Guard";
import { Plus, X, MessageCircle, BadgeDollarSign, Target, Pencil, KeyRound, Check, Mail } from "lucide-react";
import type { Revendedora } from "@/lib/types";
import { usePlano } from "@/lib/usePlano";
import { UpgradeModal } from "@/components/UpgradeGate";
import { planoQueLibera, fmtLimite } from "@/lib/plans";

export default function RevendedorasPage() {
  return (
    <Guard>
      <Revendedoras />
    </Guard>
  );
}

function Revendedoras() {
  const { revendedoras, vendas, config, addRevendedora, updateRevendedora, marcarComissaoPaga } =
    useStore();
  const { caps, uso, limiteAtingido } = usePlano();
  const [aberto, setAberto] = useState(false);
  const [upsell, setUpsell] = useState(false);
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [emailNova, setEmailNova] = useState("");
  const [comissao, setComissao] = useState(String(config.comissaoPadrao));
  const [meta, setMeta] = useState("");

  const noLimite = limiteAtingido("revendedoras");
  const planoUpgrade = planoQueLibera((p) => p.maxRevendedoras > uso.revendedoras);

  function novaRevendedora() {
    if (noLimite) setUpsell(true);
    else setAberto(true);
  }

  const inicioMes = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  })();

  function pendentePara(id: string) {
    return vendas
      .filter((v) => v.revendedoraId === id && v.statusComissao === "pendente")
      .reduce((a, v) => a + v.comissaoTotal, 0);
  }
  function vendidoNoMes(id: string) {
    return vendas
      .filter(
        (v) =>
          v.revendedoraId === id && v.statusPagamento !== "cancelada" && v.data >= inicioMes
      )
      .reduce((a, v) => a + v.total, 0);
  }

  function salvar() {
    if (!nome) return;
    addRevendedora({
      nome,
      whatsapp: whats,
      email: emailNova.trim().toLowerCase() || null,
      comissaoPercent: parseFloat(comissao) || config.comissaoPadrao,
      metaMensal: parseFloat(meta) || 0,
    });
    setNome("");
    setWhats("");
    setEmailNova("");
    setMeta("");
    setAberto(false);
  }

  function editarMeta(id: string, atual: number) {
    const v = prompt("Meta de vendas do mês (R$):", String(atual || ""));
    if (v === null) return;
    updateRevendedora(id, { metaMensal: parseFloat(v) || 0 });
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold">Revendedoras</h1>
          <p className="text-xs text-muted">
            {uso.revendedoras} / {fmtLimite(caps.maxRevendedoras)} no seu plano
          </p>
        </div>
        <button onClick={novaRevendedora} className="btn-primary py-2 px-3 text-sm">
          <Plus size={18} /> Nova
        </button>
      </header>

      {noLimite && (
        <button
          onClick={() => setUpsell(true)}
          className="card w-full text-left bg-brand-500/5 border-brand-500/30 flex items-center justify-between"
        >
          <span className="text-sm">
            Você atingiu o limite de <b>{fmtLimite(caps.maxRevendedoras)}</b> revendedoras.
          </span>
          <span className="text-brand-500 text-sm font-semibold">Fazer upgrade →</span>
        </button>
      )}

      <UpgradeModal
        aberto={upsell}
        onClose={() => setUpsell(false)}
        titulo="Limite de revendedoras atingido"
        descricao={`Seu plano permite até ${fmtLimite(
          caps.maxRevendedoras
        )} revendedoras ativas. Faça upgrade para cadastrar mais.`}
        planoNecessario={planoUpgrade}
      />

      {revendedoras.length === 0 && (
        <div className="card text-center text-muted">
          Cadastre suas revendedoras para acompanhar vendas e comissões.
        </div>
      )}

      <div className="space-y-2 stagger">
        {revendedoras.map((r) => {
          const pend = pendentePara(r.id);
          const vendMes = vendidoNoMes(r.id);
          const pct = r.metaMensal > 0 ? Math.min(100, (vendMes / r.metaMensal) * 100) : 0;
          const bateu = r.metaMensal > 0 && vendMes >= r.metaMensal;
          return (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{r.nome}</div>
                  <div className="text-xs text-muted">
                    {r.comissaoPercent}% · vendeu {brl(vendMes)} no mês
                  </div>
                </div>
                {r.whatsapp && (
                  <a
                    href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    className="text-green-600"
                  >
                    <MessageCircle />
                  </a>
                )}
              </div>

              {/* meta mensal */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-muted">
                    <Target size={13} />
                    {r.metaMensal > 0 ? (
                      <>
                        Meta {brl(r.metaMensal)} · {pct.toFixed(0)}%
                        {bateu && <span className="text-green-500 font-semibold"> ✓ batida</span>}
                      </>
                    ) : (
                      "Sem meta definida"
                    )}
                  </span>
                  <button onClick={() => editarMeta(r.id, r.metaMensal)} className="text-brand-500">
                    <Pencil size={13} />
                  </button>
                </div>
                {r.metaMensal > 0 && (
                  <div className="h-2 rounded-full surface-alt overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bateu ? "bg-green-500" : "bg-brand-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-brand-500/10 rounded-xl px-3 py-2">
                <span className="text-sm text-brand-500">
                  Comissão pendente: <b>{brl(pend)}</b>
                </span>
                {pend > 0 && (
                  <button
                    onClick={() => {
                      if (confirm(`Marcar ${brl(pend)} como pago para ${r.nome}?`))
                        marcarComissaoPaga(r.id);
                    }}
                    className="text-xs btn-primary py-1.5 px-2"
                  >
                    <BadgeDollarSign size={14} /> Pagar
                  </button>
                )}
              </div>

              {/* acesso da revendedora */}
              <AcessoRevendedora r={r} onUpdate={updateRevendedora} />
            </div>
          );
        })}
      </div>

      {/* link de acesso das revendedoras */}
      {revendedoras.some((r) => r.email) && (
        <div className="card text-xs text-muted">
          As revendedoras acessam pela página{" "}
          <span className="font-mono text-brand-500">/acesso</span> com o e-mail cadastrado.
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center">
          <div className="surface w-full max-w-md rounded-t-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nova revendedora</h2>
              <button onClick={() => setAberto(false)}>
                <X />
              </button>
            </div>
            <div>
              <label className="label">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="label">WhatsApp (opcional)</label>
              <input
                className="input"
                placeholder="DDD + número"
                inputMode="tel"
                value={whats}
                onChange={(e) => setWhats(e.target.value)}
              />
            </div>
            <div>
              <label className="label">E-mail de acesso (opcional)</label>
              <input
                className="input"
                placeholder="email@dela.com"
                type="email"
                value={emailNova}
                onChange={(e) => setEmailNova(e.target.value)}
              />
              <p className="text-xs text-muted mt-1">Com e-mail, ela pode acessar o catálogo e registrar as próprias vendas.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Comissão (%)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={comissao}
                  onChange={(e) => setComissao(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Meta mensal (R$)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                />
              </div>
            </div>
            <button onClick={salvar} className="btn-primary w-full">
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AcessoRevendedora({
  r,
  onUpdate,
}: {
  r: Revendedora;
  onUpdate: (id: string, patch: Partial<Revendedora>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(!r.email);
  const [email, setEmail] = useState(r.email ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvarEmail() {
    setSalvando(true);
    await onUpdate(r.id, { email: email.trim().toLowerCase() || null });
    setSalvando(false);
    if (email.trim()) setEditando(false);
  }

  // estado do acesso
  let status: { txt: string; cls: string };
  if (r.temAcesso) status = { txt: "Acesso ativo", cls: "text-green-600" };
  else if (r.acessoLiberado) status = { txt: "Aguardando 1º acesso", cls: "text-amber-600" };
  else status = { txt: "Sem acesso", cls: "text-muted" };

  return (
    <div className="rounded-xl border border-default p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <KeyRound size={14} className="text-brand-500" /> Acesso da revendedora
        </span>
        <span className={`text-xs font-semibold ${status.cls}`}>{status.txt}</span>
      </div>

      {editando ? (
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="email@dela.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={salvarEmail} disabled={salvando} className="btn-primary px-3 py-2 text-sm">
            {salvando ? "…" : <Check size={15} />}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted truncate">
            <Mail size={13} /> {r.email}
          </span>
          <button onClick={() => setEditando(true)} className="text-brand-500 text-xs">
            <Pencil size={13} />
          </button>
        </div>
      )}

      {r.email && !r.temAcesso && (
        <button
          onClick={() => onUpdate(r.id, { acessoLiberado: !r.acessoLiberado })}
          className={`w-full rounded-lg py-2 text-sm font-semibold ${
            r.acessoLiberado ? "surface-alt text-muted" : "btn-primary"
          }`}
        >
          {r.acessoLiberado ? "Cancelar liberação" : "Liberar acesso (1ª senha)"}
        </button>
      )}
      {r.email && !r.temAcesso && r.acessoLiberado && (
        <p className="text-[11px] text-muted">
          Peça para ela entrar em <b>/acesso</b>, usar este e-mail e criar a senha.
        </p>
      )}
    </div>
  );
}
