"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { SEGMENTOS, categoriasDaLoja } from "@/lib/seed";
import { aplicarCorMarca } from "@/lib/brand";
import { uploadLogo } from "@/lib/uploadLogo";
import type { Canal, Plano, Role } from "@/lib/types";
import Guard from "@/components/Guard";
import {
  Store,
  Palette,
  ShoppingBag,
  CreditCard,
  Save,
  Upload,
  Loader2,
  Check,
  Image as ImageIcon,
  Users,
  UserPlus,
  Trash2,
  X,
  Globe,
  Copy,
  ExternalLink,
  Tags,
  Plus,
} from "lucide-react";
import { slugSugerido } from "@/lib/slug";

export default function ConfiguracoesPage() {
  return (
    <Guard>
      <Configuracoes />
    </Guard>
  );
}

const CANAIS: { id: Canal; label: string }[] = [
  { id: "loja", label: "Loja física" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
];

const CORES = ["#db2777", "#7c3aed", "#2563eb", "#0d9488", "#ea580c", "#dc2626", "#ca8a04", "#111827"];

const PLANOS: { id: Plano; nome: string; desc: string; perfis: string }[] = [
  {
    id: "gerencia",
    nome: "Gerência",
    desc: "Só o dono/admin. Estoque, vendas, financeiro e relatórios.",
    perfis: "1 perfil (dono)",
  },
  {
    id: "vendedor",
    nome: "Gerência + Vendedor",
    desc: "Dono + vendedores. O vendedor registra vendas, mas não cadastra produtos.",
    perfis: "2 perfis (dono e vendedor)",
  },
  {
    id: "entregas",
    nome: "Entregas",
    desc: "Tudo do anterior + perfil de motoboy com painel próprio de entregas.",
    perfis: "3 perfis (dono, vendedor e motoboy)",
  },
];

// papéis que cada plano permite criar
const PAPEIS_DO_PLANO: Record<Plano, Role[]> = {
  gerencia: [],
  vendedor: ["vendedor"],
  entregas: ["vendedor", "motoboy"],
};
const ROLE_LABEL: Record<Role, string> = {
  owner: "Dono",
  vendedor: "Vendedor",
  motoboy: "Motoboy",
};

function Configuracoes() {
  const { config, orgId, setConfig } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nomeLoja, setNomeLoja] = useState(config.nomeLoja);
  const [segmento, setSegmento] = useState(config.segmento);
  const [canais, setCanais] = useState<Canal[]>(config.canais);
  const [usaRev, setUsaRev] = useState(config.usaRevendedoras);
  const [margem, setMargem] = useState(String(config.margemPadrao));
  const [comissao, setComissao] = useState(String(config.comissaoPadrao));
  const [cor, setCor] = useState<string | null>(config.corMarca);
  const [logoUrl, setLogoUrl] = useState<string | null>(config.logoUrl);

  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  function toggleCanal(c: Canal) {
    setCanais((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function escolherCor(hex: string | null) {
    setCor(hex);
    aplicarCorMarca(hex); // preview imediato
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setEnviandoLogo(true);
    try {
      const url = await uploadLogo(orgId, file);
      setLogoUrl(url);
      await setConfig({ logoUrl: url });
    } catch (err: any) {
      alert("Não foi possível enviar a logo: " + (err?.message || "erro"));
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    await setConfig({
      nomeLoja: nomeLoja || "Minha Loja",
      segmento,
      canais: canais.length ? canais : ["whatsapp"],
      usaRevendedoras: usaRev,
      margemPadrao: parseFloat(margem) || 0,
      comissaoPadrao: parseFloat(comissao) || 0,
      corMarca: cor,
    });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="space-y-4">
      <header className="pt-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted">Gerencie as configurações da sua loja</p>
        </div>
        <button onClick={salvar} disabled={salvando} className="btn-primary py-2 px-4 text-sm">
          {salvando ? <Loader2 className="animate-spin" size={16} /> : salvo ? <Check size={16} /> : <Save size={16} />}
          {salvo ? "Salvo" : "Salvar"}
        </button>
      </header>

      {/* Loja */}
      <section className="card space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Store size={18} className="text-brand-500" /> Loja
        </div>
        <div>
          <label className="label">Nome da loja</label>
          <input className="input" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} />
        </div>
        <div>
          <label className="label">Segmento</label>
          <select className="input" value={segmento} onChange={(e) => setSegmento(e.target.value)}>
            {SEGMENTOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Identidade */}
      <section className="card space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <Palette size={18} className="text-brand-500" /> Identidade da loja
        </div>

        {/* logo */}
        <div>
          <label className="label">Logo</label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl surface-alt grid place-items-center overflow-hidden border border-default">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={22} className="text-muted" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={enviandoLogo}
              className="btn-ghost py-2 px-3 text-sm"
            >
              {enviandoLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
          </div>
          <p className="text-xs text-muted mt-1">Aparece no app e no painel. PNG/JPG.</p>
        </div>

        {/* cor */}
        <div>
          <label className="label">Cor da marca</label>
          <div className="flex flex-wrap items-center gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                onClick={() => escolherCor(c)}
                className={`h-8 w-8 rounded-full border-2 ${
                  cor === c ? "border-white ring-2 ring-brand-500" : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
            <label className="h-8 w-8 rounded-full border border-default grid place-items-center cursor-pointer overflow-hidden">
              <input
                type="color"
                className="h-10 w-10 cursor-pointer"
                value={cor || "#db2777"}
                onChange={(e) => escolherCor(e.target.value)}
              />
            </label>
            <button onClick={() => escolherCor(null)} className="text-xs text-muted ml-1 underline">
              padrão
            </button>
          </div>
          <p className="text-xs text-muted mt-1">O app inteiro adota a cor da sua loja.</p>
        </div>
      </section>

      {/* Categorias da loja */}
      <CategoriasSection />

      {/* Mini-loja pública */}
      <MiniLojaSection />

      {/* Vendas */}
      <section className="card space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag size={18} className="text-brand-500" /> Vendas
        </div>
        <label className="flex items-center justify-between">
          <span className="text-sm">Trabalho com revendedoras</span>
          <button
            onClick={() => setUsaRev((v) => !v)}
            className={`h-6 w-11 rounded-full transition relative ${usaRev ? "bg-brand-600" : "surface-alt"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                usaRev ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>
        <div>
          <label className="label">Canais de venda</label>
          <div className="flex flex-wrap gap-2">
            {CANAIS.map((c) => {
              const on = canais.includes(c.id);
              return (
                <span
                  key={c.id}
                  onClick={() => toggleCanal(c.id)}
                  className={`chip ${on ? "bg-brand-600 text-white border-brand-600" : "border-default"}`}
                >
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Margem padrão (%)</label>
            <input className="input" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} />
          </div>
          <div>
            <label className="label">Comissão padrão (%)</label>
            <input
              className="input"
              inputMode="decimal"
              value={comissao}
              onChange={(e) => setComissao(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="card space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <CreditCard size={18} className="text-brand-500" /> Planos
        </div>
        <div className="space-y-2">
          {PLANOS.map((p) => {
            const atual = config.plano === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setConfig({ plano: p.id })}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  atual ? "border-brand-500 bg-brand-500/5" : "border-default hover:surface-alt"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.nome}</span>
                  {atual ? (
                    <span className="text-xs text-brand-500 font-semibold flex items-center gap-1">
                      <Check size={13} /> Plano atual
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Selecionar</span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1">{p.desc}</p>
                <p className="text-xs text-muted mt-1">👤 {p.perfis}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Equipe de acesso (membros) */}
      <MembrosSection />
    </div>
  );
}

function CategoriasSection() {
  const { config, setConfig } = useStore();
  const [lista, setLista] = useState<string[]>(categoriasDaLoja(config));
  const [nova, setNova] = useState("");

  function persistir(next: string[]) {
    setLista(next);
    setConfig({ categorias: next });
  }
  function adicionar() {
    const n = nova.trim();
    if (!n) return;
    if (lista.some((c) => c.toLowerCase() === n.toLowerCase())) {
      setNova("");
      return;
    }
    persistir([...lista, n]);
    setNova("");
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Tags size={18} className="text-brand-500" /> Categorias dos produtos
      </div>
      <p className="text-sm text-muted">
        Cada loja tem as suas. Adicione ou remova quantas quiser — elas aparecem ao cadastrar produtos.
      </p>

      <div className="flex flex-wrap gap-2">
        {lista.map((c) => (
          <span key={c} className="chip border-default flex items-center gap-1.5">
            {c}
            <button
              onClick={() => persistir(lista.filter((x) => x !== c))}
              className="text-muted hover:text-red-500"
              aria-label={`Remover ${c}`}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        {lista.length === 0 && <span className="text-sm text-muted">Nenhuma categoria ainda.</span>}
      </div>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Nova categoria (ex.: Relógios)"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <button onClick={adicionar} className="btn-primary px-4">
          <Plus size={16} /> Adicionar
        </button>
      </div>
    </section>
  );
}

function MiniLojaSection() {
  const { config } = useStore();
  return (
    <Link href="/minha-loja" className="card flex items-center gap-3 hover:surface-alt transition">
      <div className="h-10 w-10 rounded-xl bg-brand-600/10 grid place-items-center shrink-0">
        <Globe size={20} className="text-brand-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold flex items-center gap-2">
          Minha Loja online
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              config.lojaAtiva ? "bg-brand-600 text-white" : "surface-alt text-muted"
            }`}
          >
            {config.lojaAtiva ? "No ar" : "Fora do ar"}
          </span>
        </div>
        <p className="text-sm text-muted">Link, identidade e vitrine dos produtos com chat.</p>
      </div>
      <ExternalLink size={16} className="text-muted shrink-0" />
    </Link>
  );
}

function MembrosSection() {
  const { config, membros, usuarioId, criarMembro, removerMembro } = useStore();
  const papeisDisponiveis = PAPEIS_DO_PLANO[config.plano] || [];
  const outros = membros.filter((m) => m.id !== usuarioId);

  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Role>(papeisDisponiveis[0] || "vendedor");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!email || senha.length < 6) {
      setErro("Informe e-mail e senha de pelo menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    const r = await criarMembro({ nome, email, senha, role: papel });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro || "Falha ao criar membro");
      return;
    }
    setNome("");
    setEmail("");
    setSenha("");
    setAberto(false);
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Users size={18} className="text-brand-500" /> Equipe de acesso
        </div>
        {papeisDisponiveis.length > 0 && (
          <button onClick={() => setAberto((v) => !v)} className="btn-ghost py-1.5 px-3 text-sm">
            <UserPlus size={16} /> Adicionar
          </button>
        )}
      </div>

      {papeisDisponiveis.length === 0 && (
        <p className="text-sm text-muted">
          Seu plano atual não inclui outros perfis. Escolha o plano <b>Gerência + Vendedor</b> ou{" "}
          <b>Entregas</b> acima para criar logins de vendedor e motoboy.
        </p>
      )}

      {/* lista de membros */}
      {outros.length > 0 && (
        <div className="space-y-2">
          {outros.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl surface-alt px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{m.nome || m.email}</div>
                <div className="text-xs text-muted truncate">
                  {m.email} · {ROLE_LABEL[m.role]}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Remover o acesso de ${m.nome || m.email}?`)) removerMembro(m.id);
                }}
                className="text-red-500 shrink-0"
                title="Remover acesso"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* form criar membro */}
      {aberto && papeisDisponiveis.length > 0 && (
        <div className="rounded-xl border border-default p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Novo acesso</span>
            <button onClick={() => setAberto(false)} className="text-muted">
              <X size={16} />
            </button>
          </div>
          <input className="input" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input
            className="input"
            type="email"
            placeholder="E-mail de login"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Senha (mín. 6)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {papeisDisponiveis.length > 1 ? (
            <select className="input" value={papel} onChange={(e) => setPapel(e.target.value as Role)}>
              {papeisDisponiveis.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted">Papel: {ROLE_LABEL[papeisDisponiveis[0]]}</p>
          )}
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <button onClick={salvar} disabled={salvando} className="btn-primary w-full disabled:opacity-60">
            {salvando ? "Criando…" : "Criar acesso"}
          </button>
          <p className="text-[11px] text-muted">
            O membro entra no app com este e-mail e senha. Você pode trocar a senha removendo e
            recriando o acesso.
          </p>
        </div>
      )}
    </section>
  );
}
