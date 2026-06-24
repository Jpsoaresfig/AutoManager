import { create } from "zustand";
import { createClient } from "./supabase/client";
import type {
  Produto,
  Variacao,
  Revendedora,
  Venda,
  VendaItem,
  Movimento,
  Config,
  Canal,
  FormaPagamento,
  Role,
  Plano,
  Membro,
  Entrega,
  StatusEntrega,
} from "./types";

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// entrada do cadastro de produto (campos novos opcionais p/ não quebrar o onboarding)
export type NovoProduto = {
  nome: string;
  categoria: string;
  custo: number;
  precoVenda: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  sku?: string;
  marca?: string;
  precoComparativo?: number;
  impostoPercent?: number;
  descricao?: string;
  imagens?: string[];
  variacoes?: Omit<Variacao, "id">[];
};

export type EditarProduto = Partial<
  Omit<Produto, "id" | "criadoEm" | "variacoes">
> & {
  variacoes?: Variacao[]; // lista completa desejada (com id p/ existentes, sem id p/ novas)
};

// soma o estoque das variações quando houver; senão usa o estoque base informado
function estoqueEfetivo(base: number, variacoes?: { estoqueAtual: number }[]) {
  if (variacoes && variacoes.length > 0)
    return variacoes.reduce((a, v) => a + (v.estoqueAtual || 0), 0);
  return base;
}

const configInicial: Config = {
  nomeLoja: "",
  segmento: "semijoias",
  canais: ["whatsapp"],
  usaRevendedoras: true,
  margemPadrao: 100,
  comissaoPadrao: 30,
  onboardingCompleto: false,
  corMarca: null,
  logoUrl: null,
  plano: "gerencia",
  slug: null,
  lojaAtiva: false,
  lojaDescricao: null,
  lojaFonte: null,
  lojaSobre: null,
  lojaEmail: null,
  lojaWhatsapp: null,
  lojaTelefone: null,
  lojaInstagram: null,
  lojaFacebook: null,
  lojaTiktok: null,
};

function mapMembro(r: any): Membro {
  return { id: r.id, nome: r.nome ?? null, email: r.email ?? null, role: r.role };
}
function mapEntrega(r: any): Entrega {
  return {
    id: r.id,
    vendaId: r.venda_id ?? null,
    motoboyId: r.motoboy_id ?? null,
    clienteNome: r.cliente_nome ?? null,
    endereco: r.endereco ?? null,
    telefone: r.telefone ?? null,
    taxa: Number(r.taxa ?? 0),
    status: r.status,
    observacao: r.observacao ?? null,
    criadaEm: new Date(r.criada_em).getTime(),
    entregueEm: r.entregue_em ? new Date(r.entregue_em).getTime() : null,
  };
}

// ----------------------------------------------------- mapeadores row -> tipo
function mapVariacao(r: any): Variacao {
  return {
    id: r.id,
    nome: r.nome,
    sku: r.sku ?? undefined,
    estoqueAtual: r.estoque_atual,
    precoAjuste: Number(r.preco_ajuste ?? 0),
    ativo: r.ativo,
  };
}
function mapProduto(r: any): Produto {
  return {
    id: r.id,
    nome: r.nome,
    categoria: r.categoria,
    sku: r.sku ?? undefined,
    marca: r.marca ?? undefined,
    custo: Number(r.custo),
    precoVenda: Number(r.preco_venda),
    precoComparativo: r.preco_comparativo != null ? Number(r.preco_comparativo) : undefined,
    impostoPercent: Number(r.imposto_percent ?? 0),
    descricao: r.descricao ?? undefined,
    imagens: r.imagens ?? [],
    estoqueAtual: r.estoque_atual,
    estoqueMinimo: r.estoque_minimo,
    variacoes: (r.produto_variacao || [])
      .map(mapVariacao)
      .sort((a: Variacao, b: Variacao) => a.nome.localeCompare(b.nome)),
    ativo: r.ativo,
    criadoEm: new Date(r.criado_em).getTime(),
  };
}
function mapRevendedora(r: any): Revendedora {
  return {
    id: r.id,
    nome: r.nome,
    whatsapp: r.whatsapp ?? undefined,
    email: r.email ?? null,
    comissaoPercent: Number(r.comissao_percent),
    metaMensal: Number(r.meta_mensal ?? 0),
    ativa: r.ativa,
    criadaEm: new Date(r.criada_em).getTime(),
    acessoLiberado: r.acesso_liberado ?? false,
    temAcesso: !!r.user_id,
  };
}
function mapVenda(r: any): Venda {
  return {
    id: r.id,
    data: new Date(r.data).getTime(),
    canal: r.canal,
    revendedoraId: r.revendedora_id,
    itens: (r.venda_item || []).map(
      (i: any): VendaItem => ({
        produtoId: i.produto_id,
        variacaoId: i.variacao_id ?? null,
        variacaoNome: i.variacao_nome ?? null,
        nome: i.nome,
        qtd: i.qtd,
        precoUnit: Number(i.preco_unit),
        custoUnit: Number(i.custo_unit),
        comissaoPercent: Number(i.comissao_percent_aplicada),
      })
    ),
    total: Number(r.total),
    custoTotal: Number(r.custo_total),
    comissaoTotal: Number(r.comissao_total),
    lucro: Number(r.lucro),
    statusComissao: r.status_comissao,
    formaPagamento: r.forma_pagamento ?? "dinheiro",
    parcelas: Number(r.parcelas ?? 1),
    statusPagamento: r.status_pagamento ?? "paga",
    desconto: Number(r.desconto ?? 0),
    dataPagamento: r.data_pagamento ? new Date(r.data_pagamento).getTime() : null,
  };
}

interface State {
  ready: boolean;
  orgId: string | null;
  usuarioId: string | null;
  role: Role;
  config: Config;
  produtos: Produto[];
  revendedoras: Revendedora[];
  vendas: Venda[];
  movimentos: Movimento[];
  membros: Membro[];
  entregas: Entrega[];

  hydrate: () => Promise<void>;

  setConfig: (c: Partial<Config>) => Promise<void>;
  definirSlug: (slug: string) => Promise<{ ok: boolean; erro?: string }>;
  completarOnboarding: () => Promise<void>;

  criarMembro: (args: {
    nome: string;
    email: string;
    senha: string;
    role: Role;
  }) => Promise<{ ok: boolean; erro?: string }>;
  removerMembro: (id: string) => Promise<void>;

  addEntrega: (e: {
    clienteNome: string;
    endereco: string;
    telefone?: string;
    taxa?: number;
    motoboyId?: string | null;
    vendaId?: string | null;
    observacao?: string;
  }) => Promise<void>;
  atribuirMotoboy: (entregaId: string, motoboyId: string | null) => Promise<void>;
  setStatusEntrega: (entregaId: string, status: StatusEntrega) => Promise<void>;

  addProduto: (p: NovoProduto) => Promise<void>;
  updateProduto: (id: string, patch: EditarProduto) => Promise<void>;
  entradaEstoque: (id: string, qtd: number) => Promise<void>;
  ajustarEstoque: (id: string, novaQtd: number, motivo: string) => Promise<void>;

  addRevendedora: (r: Omit<Revendedora, "id" | "criadaEm" | "ativa" | "acessoLiberado" | "temAcesso">) => Promise<void>;
  updateRevendedora: (id: string, patch: Partial<Revendedora>) => Promise<void>;

  registrarVenda: (args: {
    itens: { produtoId: string; variacaoId?: string | null; qtd: number }[];
    canal: Canal;
    revendedoraId: string | null;
    formaPagamento: FormaPagamento;
    parcelas?: number;
    desconto?: number;
    fiado?: boolean;
  }) => Promise<Venda | null>;
  marcarComissaoPaga: (revendedoraId: string) => Promise<void>;
  marcarVendaRecebida: (vendaId: string) => Promise<void>;
}

export const useStore = create<State>()((set, get) => {
  const sb = () => createClient();

  return {
    ready: false,
    orgId: null,
    usuarioId: null,
    role: "owner",
    config: configInicial,
    produtos: [],
    revendedoras: [],
    vendas: [],
    movimentos: [],
    membros: [],
    entregas: [],

    hydrate: async () => {
      const supabase = sb();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ ready: true });
        return;
      }

      const [
        { data: org },
        { data: eu },
        { data: produtos },
        { data: revendedoras },
        { data: vendas },
        { data: membros },
        { data: entregas },
      ] = await Promise.all([
        supabase.from("org").select("*").limit(1).maybeSingle(),
        supabase.from("usuario").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("produto")
          .select("*, produto_variacao(*)")
          .order("criado_em", { ascending: true }),
        supabase.from("revendedora").select("*").order("criada_em", { ascending: true }),
        supabase.from("venda").select("*, venda_item(*)").order("data", { ascending: false }),
        supabase.from("usuario").select("id, nome, email, role"),
        supabase.from("entrega").select("*").order("criada_em", { ascending: false }),
      ]);

      set({
        ready: true,
        orgId: org?.id ?? null,
        usuarioId: user.id,
        role: (eu?.role as Role) ?? "owner",
        config: org
          ? {
              nomeLoja: org.nome,
              segmento: org.segmento,
              canais: org.canais,
              usaRevendedoras: org.usa_revendedoras,
              margemPadrao: Number(org.margem_padrao),
              comissaoPadrao: Number(org.comissao_padrao),
              onboardingCompleto: org.onboarding_completo,
              corMarca: org.cor_marca ?? null,
              logoUrl: org.logo_url ?? null,
              plano: (org.plano as Plano) ?? "gerencia",
              slug: org.slug ?? null,
              lojaAtiva: org.loja_ativa ?? false,
              lojaDescricao: org.loja_descricao ?? null,
              lojaFonte: org.loja_fonte ?? null,
              lojaSobre: org.loja_sobre ?? null,
              lojaEmail: org.loja_email ?? null,
              lojaWhatsapp: org.loja_whatsapp ?? null,
              lojaTelefone: org.loja_telefone ?? null,
              lojaInstagram: org.loja_instagram ?? null,
              lojaFacebook: org.loja_facebook ?? null,
              lojaTiktok: org.loja_tiktok ?? null,
            }
          : configInicial,
        produtos: (produtos || []).map(mapProduto),
        revendedoras: (revendedoras || []).map(mapRevendedora),
        vendas: (vendas || []).map(mapVenda),
        membros: (membros || []).map(mapMembro),
        entregas: (entregas || []).map(mapEntrega),
      });
    },

    setConfig: async (c) => {
      set((s) => ({ config: { ...s.config, ...c } }));
      const { orgId } = get();
      if (!orgId) return;
      const patch: any = {};
      if (c.nomeLoja !== undefined) patch.nome = c.nomeLoja;
      if (c.segmento !== undefined) patch.segmento = c.segmento;
      if (c.canais !== undefined) patch.canais = c.canais;
      if (c.usaRevendedoras !== undefined) patch.usa_revendedoras = c.usaRevendedoras;
      if (c.margemPadrao !== undefined) patch.margem_padrao = c.margemPadrao;
      if (c.comissaoPadrao !== undefined) patch.comissao_padrao = c.comissaoPadrao;
      if (c.onboardingCompleto !== undefined) patch.onboarding_completo = c.onboardingCompleto;
      if (c.corMarca !== undefined) patch.cor_marca = c.corMarca;
      if (c.logoUrl !== undefined) patch.logo_url = c.logoUrl;
      if (c.plano !== undefined) patch.plano = c.plano;
      if (c.slug !== undefined) patch.slug = c.slug;
      if (c.lojaAtiva !== undefined) patch.loja_ativa = c.lojaAtiva;
      if (c.lojaDescricao !== undefined) patch.loja_descricao = c.lojaDescricao;
      if (c.lojaFonte !== undefined) patch.loja_fonte = c.lojaFonte;
      if (c.lojaSobre !== undefined) patch.loja_sobre = c.lojaSobre;
      if (c.lojaEmail !== undefined) patch.loja_email = c.lojaEmail;
      if (c.lojaWhatsapp !== undefined) patch.loja_whatsapp = c.lojaWhatsapp;
      if (c.lojaTelefone !== undefined) patch.loja_telefone = c.lojaTelefone;
      if (c.lojaInstagram !== undefined) patch.loja_instagram = c.lojaInstagram;
      if (c.lojaFacebook !== undefined) patch.loja_facebook = c.lojaFacebook;
      if (c.lojaTiktok !== undefined) patch.loja_tiktok = c.lojaTiktok;
      await sb().from("org").update(patch).eq("id", orgId);
    },

    definirSlug: async (slug) => {
      const { orgId } = get();
      if (!orgId) return { ok: false, erro: "Loja não carregada" };
      const { error } = await sb().from("org").update({ slug }).eq("id", orgId);
      if (error)
        return {
          ok: false,
          erro: /duplicate|unique/i.test(error.message)
            ? "Esse link já está em uso. Tente outro."
            : error.message,
        };
      set((s) => ({ config: { ...s.config, slug } }));
      return { ok: true };
    },

    criarMembro: async ({ nome, email, senha, role }) => {
      const res = await fetch("/api/membros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, erro: json?.erro || "Falha ao criar membro" };
      if (json?.membro) set((s) => ({ membros: [...s.membros, json.membro] }));
      return { ok: true };
    },

    removerMembro: async (id) => {
      set((s) => ({ membros: s.membros.filter((m) => m.id !== id) }));
      await fetch("/api/membros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },

    addEntrega: async (e) => {
      const { orgId } = get();
      const id = uid();
      const nova: Entrega = {
        id,
        vendaId: e.vendaId ?? null,
        motoboyId: e.motoboyId ?? null,
        clienteNome: e.clienteNome,
        endereco: e.endereco,
        telefone: e.telefone ?? null,
        taxa: e.taxa ?? 0,
        status: "pendente",
        observacao: e.observacao ?? null,
        criadaEm: Date.now(),
        entregueEm: null,
      };
      set((s) => ({ entregas: [nova, ...s.entregas] }));
      if (!orgId) return;
      await sb().from("entrega").insert({
        id,
        org_id: orgId,
        venda_id: e.vendaId ?? null,
        motoboy_id: e.motoboyId ?? null,
        cliente_nome: e.clienteNome,
        endereco: e.endereco,
        telefone: e.telefone ?? null,
        taxa: e.taxa ?? 0,
        observacao: e.observacao ?? null,
        status: "pendente",
      });
    },

    atribuirMotoboy: async (entregaId, motoboyId) => {
      set((s) => ({
        entregas: s.entregas.map((e) => (e.id === entregaId ? { ...e, motoboyId } : e)),
      }));
      await sb().from("entrega").update({ motoboy_id: motoboyId }).eq("id", entregaId);
    },

    setStatusEntrega: async (entregaId, status) => {
      const entregueEm = status === "entregue" ? Date.now() : null;
      set((s) => ({
        entregas: s.entregas.map((e) =>
          e.id === entregaId ? { ...e, status, entregueEm } : e
        ),
      }));
      await sb()
        .from("entrega")
        .update({
          status,
          entregue_em: entregueEm ? new Date(entregueEm).toISOString() : null,
        })
        .eq("id", entregaId);
    },

    completarOnboarding: async () => {
      set((s) => ({ config: { ...s.config, onboardingCompleto: true } }));
      const { orgId } = get();
      if (orgId) await sb().from("org").update({ onboarding_completo: true }).eq("id", orgId);
    },

    addProduto: async (p) => {
      const { orgId } = get();
      const id = uid();
      const variacoes: Variacao[] = (p.variacoes || []).map((v) => ({
        ...v,
        id: uid(),
      }));
      const estoqueAtual = estoqueEfetivo(p.estoqueAtual, variacoes);
      const novo: Produto = {
        id,
        nome: p.nome,
        categoria: p.categoria,
        sku: p.sku,
        marca: p.marca,
        custo: p.custo,
        precoVenda: p.precoVenda,
        precoComparativo: p.precoComparativo,
        impostoPercent: p.impostoPercent ?? 0,
        descricao: p.descricao,
        imagens: p.imagens || [],
        estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
        variacoes,
        ativo: true,
        criadoEm: Date.now(),
      };
      set((s) => ({ produtos: [...s.produtos, novo] }));
      if (!orgId) return;
      const supabase = sb();
      await supabase.from("produto").insert({
        id,
        org_id: orgId,
        nome: p.nome,
        categoria: p.categoria,
        sku: p.sku || null,
        marca: p.marca || null,
        custo: p.custo,
        preco_venda: p.precoVenda,
        preco_comparativo: p.precoComparativo ?? null,
        imposto_percent: p.impostoPercent ?? 0,
        descricao: p.descricao || null,
        imagens: p.imagens || [],
        estoque_atual: estoqueAtual,
        estoque_minimo: p.estoqueMinimo,
        ativo: true,
      });
      if (variacoes.length > 0) {
        await supabase.from("produto_variacao").insert(
          variacoes.map((v) => ({
            id: v.id,
            org_id: orgId,
            produto_id: id,
            nome: v.nome,
            sku: v.sku || null,
            estoque_atual: v.estoqueAtual,
            preco_ajuste: v.precoAjuste,
            ativo: v.ativo,
          }))
        );
      }
      if (estoqueAtual > 0) {
        await supabase.from("movimento_estoque").insert({
          org_id: orgId,
          produto_id: id,
          tipo: "entrada",
          qtd: estoqueAtual,
          motivo: "Estoque inicial",
        });
      }
    },

    updateProduto: async (id, patch) => {
      const { orgId } = get();
      const atual = get().produtos.find((p) => p.id === id);
      if (!atual) return;

      // reconcilia variações (lista completa desejada substitui a atual)
      const novasVariacoes: Variacao[] | undefined = patch.variacoes
        ? patch.variacoes.map((v) => ({ ...v, id: v.id || uid() }))
        : undefined;
      const variacoesFinal = novasVariacoes ?? atual.variacoes;

      const merged: Produto = {
        ...atual,
        ...patch,
        variacoes: variacoesFinal,
      };
      merged.estoqueAtual = estoqueEfetivo(
        patch.estoqueAtual ?? atual.estoqueAtual,
        variacoesFinal
      );

      set((s) => ({ produtos: s.produtos.map((p) => (p.id === id ? merged : p)) }));
      if (!orgId) return;
      const supabase = sb();

      const row: any = {};
      if (patch.nome !== undefined) row.nome = patch.nome;
      if (patch.categoria !== undefined) row.categoria = patch.categoria;
      if (patch.sku !== undefined) row.sku = patch.sku || null;
      if (patch.marca !== undefined) row.marca = patch.marca || null;
      if (patch.custo !== undefined) row.custo = patch.custo;
      if (patch.precoVenda !== undefined) row.preco_venda = patch.precoVenda;
      if (patch.precoComparativo !== undefined)
        row.preco_comparativo = patch.precoComparativo ?? null;
      if (patch.impostoPercent !== undefined) row.imposto_percent = patch.impostoPercent;
      if (patch.descricao !== undefined) row.descricao = patch.descricao || null;
      if (patch.imagens !== undefined) row.imagens = patch.imagens;
      if (patch.estoqueMinimo !== undefined) row.estoque_minimo = patch.estoqueMinimo;
      if (patch.ativo !== undefined) row.ativo = patch.ativo;
      row.estoque_atual = merged.estoqueAtual;
      await supabase.from("produto").update(row).eq("id", id);

      if (novasVariacoes) {
        const antesIds = new Set(atual.variacoes.map((v) => v.id));
        const depoisIds = new Set(novasVariacoes.map((v) => v.id));
        const removidas = [...antesIds].filter((vid) => !depoisIds.has(vid));
        if (removidas.length > 0)
          await supabase.from("produto_variacao").delete().in("id", removidas);
        for (const v of novasVariacoes) {
          if (antesIds.has(v.id)) {
            await supabase
              .from("produto_variacao")
              .update({
                nome: v.nome,
                sku: v.sku || null,
                estoque_atual: v.estoqueAtual,
                preco_ajuste: v.precoAjuste,
                ativo: v.ativo,
              })
              .eq("id", v.id);
          } else {
            await supabase.from("produto_variacao").insert({
              id: v.id,
              org_id: orgId,
              produto_id: id,
              nome: v.nome,
              sku: v.sku || null,
              estoque_atual: v.estoqueAtual,
              preco_ajuste: v.precoAjuste,
              ativo: v.ativo,
            });
          }
        }
      }
    },

    entradaEstoque: async (id, qtd) => {
      const { orgId } = get();
      const prod = get().produtos.find((x) => x.id === id);
      if (!prod) return;
      const novoEstoque = prod.estoqueAtual + qtd;
      set((s) => ({
        produtos: s.produtos.map((x) => (x.id === id ? { ...x, estoqueAtual: novoEstoque } : x)),
      }));
      if (!orgId) return;
      await sb().from("produto").update({ estoque_atual: novoEstoque }).eq("id", id);
      await sb().from("movimento_estoque").insert({
        org_id: orgId,
        produto_id: id,
        tipo: "entrada",
        qtd,
        motivo: "Reposição de estoque",
      });
    },

    ajustarEstoque: async (id, novaQtd, motivo) => {
      const { orgId } = get();
      const prod = get().produtos.find((x) => x.id === id);
      if (!prod) return;
      const delta = novaQtd - prod.estoqueAtual;
      set((s) => ({
        produtos: s.produtos.map((x) => (x.id === id ? { ...x, estoqueAtual: novaQtd } : x)),
      }));
      if (!orgId) return;
      await sb().from("produto").update({ estoque_atual: novaQtd }).eq("id", id);
      await sb().from("movimento_estoque").insert({
        org_id: orgId,
        produto_id: id,
        tipo: "ajuste",
        qtd: delta,
        motivo,
      });
    },

    addRevendedora: async (r) => {
      const { orgId } = get();
      const id = uid();
      const nova: Revendedora = {
        ...r,
        id,
        ativa: true,
        criadaEm: Date.now(),
        acessoLiberado: false,
        temAcesso: false,
      };
      set((s) => ({ revendedoras: [...s.revendedoras, nova] }));
      if (!orgId) return;
      await sb().from("revendedora").insert({
        id,
        org_id: orgId,
        nome: r.nome,
        whatsapp: r.whatsapp || null,
        email: r.email || null,
        comissao_percent: r.comissaoPercent,
        meta_mensal: r.metaMensal || 0,
        ativa: true,
      });
    },

    updateRevendedora: async (id, patch) => {
      set((s) => ({
        revendedoras: s.revendedoras.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
      const { orgId } = get();
      if (!orgId) return;
      const row: any = {};
      if (patch.nome !== undefined) row.nome = patch.nome;
      if (patch.whatsapp !== undefined) row.whatsapp = patch.whatsapp || null;
      if (patch.email !== undefined) row.email = patch.email || null;
      if (patch.comissaoPercent !== undefined) row.comissao_percent = patch.comissaoPercent;
      if (patch.metaMensal !== undefined) row.meta_mensal = patch.metaMensal;
      if (patch.ativa !== undefined) row.ativa = patch.ativa;
      if (patch.acessoLiberado !== undefined) row.acesso_liberado = patch.acessoLiberado;
      await sb().from("revendedora").update(row).eq("id", id);
    },

    registrarVenda: async ({ itens, canal, revendedoraId, formaPagamento, parcelas = 1, desconto = 0, fiado = false }) => {
      const parcelasNorm = formaPagamento === "credito" ? Math.max(1, parcelas) : 1;
      const s = get();
      const { orgId } = s;
      const rev = revendedoraId ? s.revendedoras.find((r) => r.id === revendedoraId) : null;
      const comissaoPercent = rev ? rev.comissaoPercent : 0;

      // valida estoque (por variação quando houver)
      for (const it of itens) {
        const prod = s.produtos.find((p) => p.id === it.produtoId);
        if (!prod) return null;
        if (it.variacaoId) {
          const v = prod.variacoes.find((x) => x.id === it.variacaoId);
          if (!v || v.estoqueAtual < it.qtd) return null;
        } else if (prod.variacoes.length > 0) {
          return null; // produto com grade exige escolher variação
        } else if (prod.estoqueAtual < it.qtd) {
          return null;
        }
      }

      const vendaItens: VendaItem[] = itens.map((it) => {
        const prod = s.produtos.find((p) => p.id === it.produtoId)!;
        const v = it.variacaoId
          ? prod.variacoes.find((x) => x.id === it.variacaoId)
          : null;
        return {
          produtoId: prod.id,
          variacaoId: v ? v.id : null,
          variacaoNome: v ? v.nome : null,
          nome: prod.nome,
          qtd: it.qtd,
          precoUnit: prod.precoVenda + (v ? v.precoAjuste : 0),
          custoUnit: prod.custo,
          comissaoPercent,
        };
      });

      const bruto = vendaItens.reduce((a, i) => a + i.precoUnit * i.qtd, 0);
      const desc = Math.min(Math.max(desconto, 0), bruto);
      const total = bruto - desc;
      const custoTotal = vendaItens.reduce((a, i) => a + i.custoUnit * i.qtd, 0);
      const comissaoTotal = vendaItens.reduce(
        (a, i) => a + (i.precoUnit * i.qtd * i.comissaoPercent) / 100,
        0
      );
      const lucro = total - custoTotal - comissaoTotal;
      const vendaId = uid();
      const data = Date.now();
      const statusPagamento = fiado ? "pendente" : "paga";
      const dataPagamento = fiado ? null : data;

      const venda: Venda = {
        id: vendaId,
        data,
        canal,
        revendedoraId,
        itens: vendaItens,
        total,
        custoTotal,
        comissaoTotal,
        lucro,
        statusComissao: "pendente",
        formaPagamento,
        parcelas: parcelasNorm,
        statusPagamento,
        desconto: desc,
        dataPagamento,
      };

      // total vendido por produto (somando itens repetidos do mesmo produto)
      const baixaPorProduto = new Map<string, number>();
      for (const it of itens)
        baixaPorProduto.set(it.produtoId, (baixaPorProduto.get(it.produtoId) || 0) + it.qtd);

      // otimista — baixa no agregado do produto e na variação correspondente
      set((st) => ({
        vendas: [venda, ...st.vendas],
        produtos: st.produtos.map((p) => {
          const baixa = baixaPorProduto.get(p.id);
          if (!baixa) return p;
          const variacoes = p.variacoes.map((v) => {
            const venQtd = itens
              .filter((x) => x.variacaoId === v.id)
              .reduce((a, x) => a + x.qtd, 0);
            return venQtd ? { ...v, estoqueAtual: v.estoqueAtual - venQtd } : v;
          });
          return { ...p, estoqueAtual: p.estoqueAtual - baixa, variacoes };
        }),
      }));

      if (!orgId) return venda;

      const supabase = sb();
      await supabase.from("venda").insert({
        id: vendaId,
        org_id: orgId,
        canal,
        revendedora_id: revendedoraId,
        total,
        custo_total: custoTotal,
        comissao_total: comissaoTotal,
        lucro,
        status_comissao: "pendente",
        forma_pagamento: formaPagamento,
        parcelas: parcelasNorm,
        status_pagamento: statusPagamento,
        desconto: desc,
        data_pagamento: dataPagamento ? new Date(dataPagamento).toISOString() : null,
      });
      await supabase.from("venda_item").insert(
        vendaItens.map((i) => ({
          venda_id: vendaId,
          org_id: orgId,
          produto_id: i.produtoId,
          variacao_id: i.variacaoId || null,
          variacao_nome: i.variacaoNome || null,
          nome: i.nome,
          qtd: i.qtd,
          preco_unit: i.precoUnit,
          custo_unit: i.custoUnit,
          comissao_percent_aplicada: i.comissaoPercent,
        }))
      );
      // baixa no agregado do produto
      for (const [produtoId, baixa] of baixaPorProduto) {
        const prod = s.produtos.find((p) => p.id === produtoId)!;
        await supabase
          .from("produto")
          .update({ estoque_atual: prod.estoqueAtual - baixa })
          .eq("id", produtoId);
      }
      // baixa nas variações
      const baixaPorVariacao = new Map<string, number>();
      for (const it of itens)
        if (it.variacaoId)
          baixaPorVariacao.set(
            it.variacaoId,
            (baixaPorVariacao.get(it.variacaoId) || 0) + it.qtd
          );
      for (const [variacaoId, baixa] of baixaPorVariacao) {
        const prod = s.produtos.find((p) => p.variacoes.some((v) => v.id === variacaoId))!;
        const v = prod.variacoes.find((x) => x.id === variacaoId)!;
        await supabase
          .from("produto_variacao")
          .update({ estoque_atual: v.estoqueAtual - baixa })
          .eq("id", variacaoId);
      }
      await supabase.from("movimento_estoque").insert(
        vendaItens.map((i) => ({
          org_id: orgId,
          produto_id: i.produtoId,
          tipo: "saida",
          qtd: -i.qtd,
          motivo: "Venda",
          ref_venda_id: vendaId,
        }))
      );

      return venda;
    },

    marcarComissaoPaga: async (revendedoraId) => {
      set((s) => ({
        vendas: s.vendas.map((v) =>
          v.revendedoraId === revendedoraId && v.statusComissao === "pendente"
            ? { ...v, statusComissao: "paga" }
            : v
        ),
      }));
      const { orgId } = get();
      if (!orgId) return;
      await sb()
        .from("venda")
        .update({ status_comissao: "paga" })
        .eq("revendedora_id", revendedoraId)
        .eq("status_comissao", "pendente");
    },

    marcarVendaRecebida: async (vendaId) => {
      const agora = Date.now();
      set((s) => ({
        vendas: s.vendas.map((v) =>
          v.id === vendaId ? { ...v, statusPagamento: "paga", dataPagamento: agora } : v
        ),
      }));
      const { orgId } = get();
      if (!orgId) return;
      await sb()
        .from("venda")
        .update({ status_pagamento: "paga", data_pagamento: new Date(agora).toISOString() })
        .eq("id", vendaId);
    },
  };
});
