"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { brl } from "@/lib/analytics";
import Guard from "@/components/Guard";
import { useDialog } from "@/components/Dialog";
import Modal from "@/components/Modal";
import { Plus, X, MessageCircle, BadgeDollarSign, Target, Pencil, KeyRound, Check, Mail, Trash2 } from "lucide-react";
import type { Revendedora } from "@/lib/types";
import { usePlano } from "@/lib/usePlano";
import { UpgradeModal } from "@/components/UpgradeGate";
import { planoQueLibera, fmtLimite } from "@/lib/plans";
import MembrosManager from "@/components/MembrosManager";

export default function EquipePage() {
  return (
    <Guard>
      <Equipe />
    </Guard>
  );
}

// Página "Equipe": quem trabalha pela loja, separado por papel em abas.
// - Revendedores(a): vendem pelo celular (catálogo + registrar venda).
// - Entregadores: veem o balcão de entregas e fazem as entregas.
// O dono cadastra cada um e define o perfil; cada perfil tem sua própria visão.
function Equipe() {
  const [aba, setAba] = useState<"revendedores" | "entregadores">("revendedores");

  function tab(id: "revendedores" | "entregadores", label: string) {
    return (
      <button
        onClick={() => setAba(id)}
        className={`chip ${aba === id ? "bg-brand-600 text-white border-brand-600" : "border-default"}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <header className="pt-1">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <p className="text-sm text-muted">
          Quem vende e quem entrega pela sua loja. Você cadastra cada um e dá o perfil.
        </p>
      </header>

      <div className="flex gap-2">
        {tab("revendedores", "Revendedores(a)")}
        {tab("entregadores", "Entregadores")}
      </div>

      {aba === "revendedores" ? <RevendedoresTab /> : <EntregadoresTab />}
    </div>
  );
}

// Aba Entregadores: cria os logins dos entregadores (papel motoboy). Disponível
// no plano que libera entregas; nos demais aparece o convite de upgrade.
function EntregadoresTab() {
  return (
    <MembrosManager
      apenasPapeis={["motoboy"]}
      titulo="Entregadores"
      descricao="Crie um login para cada entregador. Ele entra no app, vê o balcão de entregas e atualiza o status das que pegar."
    />
  );
}

function RevendedoresTab() {
  const { revendedoras, vendas, config, addRevendedora, updateRevendedora, marcarComissaoPaga, removerRevendedora } =
    useStore();
  const { caps, uso, limiteAtingido } = usePlano();
  const { prompt, confirm, alerta } = useDialog();
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

  async function salvar() {
    if (!nome) return;
    const r = await addRevendedora({
      nome,
      whatsapp: whats,
      email: emailNova.trim().toLowerCase() || null,
      comissaoPercent: parseFloat(comissao) || config.comissaoPadrao,
      metaMensal: parseFloat(meta) || 0,
    });
    if (!r.ok) {
      alerta({ titulo: "Não foi possível cadastrar", mensagem: r.erro || "Tente novamente." });
      return; // mantém o formulário aberto
    }
    setNome("");
    setWhats("");
    setEmailNova("");
    setMeta("");
    setAberto(false);
  }

  async function editarMeta(id: string, atual: number) {
    const v = await prompt({
      titulo: "Meta do mês",
      mensagem: "Defina a meta de vendas mensal (R$):",
      valorInicial: String(atual || ""),
      tipo: "number",
      inputMode: "decimal",
      confirmar: "Salvar",
    });
    if (v === null) return;
    updateRevendedora(id, { metaMensal: parseFloat(v) || 0 });
  }

  async function pagarComissao(id: string, nome: string, valor: number) {
    const ok = await confirm({
      titulo: "Confirmar pagamento",
      mensagem: `Marcar ${brl(valor)} como pago para ${nome}?`,
      confirmar: "Marcar como pago",
    });
    if (ok) marcarComissaoPaga(id);
  }

  async function removerRev(r: Revendedora) {
    const temVendas = vendas.some((v) => v.revendedoraId === r.id);
    const ok = await confirm({
      titulo: `Remover ${r.nome}?`,
      mensagem: temVendas
        ? `As vendas registradas por ${r.nome} continuam no histórico, mas deixam de ficar vinculadas a ela. ${
            r.temAcesso ? "O login de acesso dela também será apagado. " : ""
          }Esta ação não pode ser desfeita.`
        : `${r.nome} será removida da loja.${
            r.temAcesso ? " O login de acesso dela também será apagado." : ""
          } Esta ação não pode ser desfeita.`,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    const res = await removerRevendedora(r.id);
    if (!res.ok) alerta({ titulo: "Não foi possível remover", mensagem: res.erro || "Tente novamente." });
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {uso.revendedoras} / {fmtLimite(caps.maxRevendedoras)} no seu plano
        </p>
        <button onClick={novaRevendedora} className="btn-primary py-2 px-3 text-sm">
          <Plus size={18} /> Novo(a)
        </button>
      </header>

      {noLimite && (
        <button
          onClick={() => setUpsell(true)}
          className="card w-full text-left bg-brand-500/5 border-brand-500/30 flex items-center justify-between"
        >
          <span className="text-sm">
            Você atingiu o limite de <b>{fmtLimite(caps.maxRevendedoras)}</b> revendedores(a).
          </span>
          <span className="text-brand-500 text-sm font-semibold">Fazer upgrade →</span>
        </button>
      )}

      <UpgradeModal
        aberto={upsell}
        onClose={() => setUpsell(false)}
        titulo="Limite de revendedores(a) atingido"
        descricao={`Seu plano permite até ${fmtLimite(
          caps.maxRevendedoras
        )} revendedores(a) ativos. Faça upgrade para cadastrar mais.`}
        planoNecessario={planoUpgrade}
      />

      {revendedoras.length === 0 && (
        <div className="card text-center text-muted">
          Cadastre seus revendedores(a) para acompanhar vendas e comissões.
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
                <div className="flex items-center gap-1 shrink-0">
                  {r.whatsapp && (
                    <a
                      href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      className="grid place-items-center h-9 w-9 rounded-lg text-green-600 hover:bg-[var(--hover)] transition"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                  <button
                    onClick={() => removerRev(r)}
                    className="grid place-items-center h-9 w-9 rounded-lg text-red-500 hover:bg-[var(--hover)] active:scale-90 transition"
                    title="Remover revendedor(a)"
                    aria-label="Remover revendedor(a)"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
                    onClick={() => pagarComissao(r.id, r.nome, pend)}
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

      {/* link de acesso dos revendedores(a) */}
      {revendedoras.some((r) => r.email) && (
        <div className="card text-xs text-muted">
          Os revendedores(a) acessam pela página{" "}
          <span className="font-mono text-brand-500">/acesso</span> com o e-mail cadastrado e o código.
        </div>
      )}

      {aberto && (
        <Modal
          title="Novo(a) revendedor(a)"
          onClose={() => setAberto(false)}
          footer={
            <button onClick={salvar} disabled={!nome.trim()} className="btn-primary w-full disabled:opacity-60">
              Salvar
            </button>
          }
        >
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
              placeholder="email@pessoa.com"
              type="email"
              value={emailNova}
              onChange={(e) => setEmailNova(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Com e-mail, a pessoa acessa o catálogo e registra as próprias vendas.</p>
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
        </Modal>
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
  const { liberarAcessoRevendedora, revogarAcessoRevendedora } = useStore();
  const { alerta } = useDialog();
  const [editando, setEditando] = useState(!r.email);
  const [email, setEmail] = useState(r.email ?? "");
  const [salvando, setSalvando] = useState(false);
  const [liberando, setLiberando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null); // só disponível logo após gerar
  const [copiado, setCopiado] = useState(false);

  async function salvarEmail() {
    setSalvando(true);
    await onUpdate(r.id, { email: email.trim().toLowerCase() || null });
    setSalvando(false);
    if (email.trim()) setEditando(false);
  }

  async function liberar() {
    setLiberando(true);
    const res = await liberarAcessoRevendedora(r.id);
    setLiberando(false);
    if (!res.ok) {
      alerta({ titulo: "Não foi possível liberar", mensagem: res.erro || "Tente novamente." });
      return;
    }
    setCodigo(res.codigo ?? null);
    setCopiado(false);
  }

  async function revogar() {
    setCodigo(null);
    await revogarAcessoRevendedora(r.id);
  }

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard indisponível: o código segue visível para copiar à mão */
    }
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
          <KeyRound size={14} className="text-brand-500" /> Acesso do(a) revendedor(a)
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
          onClick={r.acessoLiberado ? revogar : liberar}
          disabled={liberando}
          className={`w-full rounded-lg py-2 text-sm font-semibold disabled:opacity-60 ${
            r.acessoLiberado ? "surface-alt text-muted" : "btn-primary"
          }`}
        >
          {liberando ? "Gerando…" : r.acessoLiberado ? "Cancelar liberação" : "Liberar acesso (gerar código)"}
        </button>
      )}

      {/* código recém-gerado: mostrado uma vez, para o dono copiar e enviar */}
      {codigo && !r.temAcesso && (
        <div className="rounded-lg bg-brand-500/10 border border-brand-500/30 p-3 space-y-1.5">
          <div className="text-[11px] text-muted">Código de acesso (válido por 7 dias)</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-bold tracking-[0.25em] text-brand-600">{codigo}</span>
            <button onClick={copiar} className="btn-ghost py-1.5 px-3 text-xs whitespace-nowrap">
              {copiado ? <Check size={14} /> : "Copiar"}
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Envie para ela junto do link <b>/acesso</b>. Some assim que ela ativar - só aparece agora.
          </p>
        </div>
      )}

      {r.email && !r.temAcesso && r.acessoLiberado && !codigo && (
        <p className="text-[11px] text-muted">
          Acesso liberado. Se ela perdeu o código, clique em <b>Cancelar liberação</b> e libere de novo para gerar um novo.
        </p>
      )}
    </div>
  );
}
