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
  Membro,
  Entrega,
  StatusEntrega,
  Chamado,
  TipoChamado,
  EntradaPendente,
  OrigemRecebimento,
  ContaPagar,
} from "./types";
import type { Assinatura, PlanoId } from "./plans";

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
  categorias: [],
  canais: ["whatsapp"],
  usaRevendedoras: true,
  margemPadrao: 100,
  comissaoPadrao: 30,
  onboardingCompleto: false,
  corMarca: null,
  temaBase: null,
  appFonte: null,
  appRaio: null,
  logoUrl: null,
  plano: "solo",
  slug: null,
  lojaAtiva: false,
  lojaDescricao: null,
  lojaCapaUrl: null,
  lojaFonte: null,
  lojaSobre: null,
  lojaEmail: null,
  lojaWhatsapp: null,
  lojaTelefone: null,
  lojaInstagram: null,
  lojaFacebook: null,
  lojaTiktok: null,
};

function mapChamado(r: any): Chamado {
  return {
    id: r.id,
    orgId: r.org_id ?? null,
    usuarioId: r.usuario_id ?? null,
    nomeLoja: r.nome_loja ?? null,
    emailContato: r.email_contato ?? null,
    whatsapp: r.whatsapp ?? null,
    tipo: (r.tipo ?? "erro") as TipoChamado,
    assunto: r.assunto,
    mensagem: r.mensagem,
    status: r.status ?? "aberto",
    criadoEm: new Date(r.created_at).getTime(),
    resolvidoEm: r.resolved_at ? new Date(r.resolved_at).getTime() : null,
  };
}
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

function mapEntradaPendente(r: any): EntradaPendente {
  return {
    id: r.id,
    valor: Number(r.valor ?? 0),
    origem: (r.origem ?? "manual") as OrigemRecebimento,
    descricao: r.descricao ?? null,
    pagador: r.pagador ?? null,
    formaPagamento: r.forma_pagamento ?? "pix",
    status: r.status ?? "pendente",
    vendaId: r.venda_id ?? null,
    recebidoEm: new Date(r.recebido_em).getTime(),
    decididoEm: r.decidido_em ? new Date(r.decidido_em).getTime() : null,
  };
}

function mapContaPagar(r: any): ContaPagar {
  return {
    id: r.id,
    descricao: r.descricao,
    categoria: r.categoria ?? null,
    fornecedor: r.fornecedor ?? null,
    valor: Number(r.valor ?? 0),
    vencimento: r.vencimento, // já vem "YYYY-MM-DD"
    status: r.status ?? "pendente",
    pagoEm: r.pago_em ? new Date(r.pago_em).getTime() : null,
    recorrente: !!r.recorrente,
    observacao: r.observacao ?? null,
    criadoEm: new Date(r.criado_em).getTime(),
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
  email: string | null;
  role: Role;
  // autenticado, porém sem loja própria (revendedora/visitante): não pertence ao painel
  semOrg: boolean;
  config: Config;
  assinatura: Assinatura | null;
  produtos: Produto[];
  revendedoras: Revendedora[];
  vendas: Venda[];
  movimentos: Movimento[];
  membros: Membro[];
  entregas: Entrega[];
  entradasPendentes: EntradaPendente[];
  contasPagar: ContaPagar[];

  hydrate: () => Promise<void>;

  setConfig: (c: Partial<Config>) => Promise<{ ok: boolean; erro?: string }>;
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
  }) => Promise<{ ok: boolean; erro?: string }>;
  atribuirMotoboy: (entregaId: string, motoboyId: string | null) => Promise<void>;
  setStatusEntrega: (entregaId: string, status: StatusEntrega) => Promise<void>;
  // pool do motoboy: pegar uma entrega disponível / devolver ao balcão
  pegarEntrega: (entregaId: string) => Promise<{ ok: boolean; erro?: string }>;
  devolverEntrega: (entregaId: string) => Promise<void>;
  recarregarEntregas: () => Promise<void>;

  addProduto: (p: NovoProduto) => Promise<{ ok: boolean; erro?: string }>;
  importarProdutos: (linhas: NovoProduto[]) => Promise<{ ok: boolean; inseridos: number; erro?: string }>;
  updateProduto: (id: string, patch: EditarProduto) => Promise<void>;
  entradaEstoque: (id: string, qtd: number) => Promise<{ ok: boolean; erro?: string }>;
  ajustarEstoque: (id: string, novaQtd: number, motivo: string) => Promise<{ ok: boolean; erro?: string }>;

  addRevendedora: (r: Omit<Revendedora, "id" | "criadaEm" | "ativa" | "acessoLiberado" | "temAcesso">) => Promise<{ ok: boolean; erro?: string }>;
  updateRevendedora: (id: string, patch: Partial<Revendedora>) => Promise<void>;
  removerRevendedora: (id: string) => Promise<{ ok: boolean; erro?: string }>;
  // libera o 1º acesso e devolve o código de convite (uso único) p/ o dono compartilhar
  liberarAcessoRevendedora: (id: string) => Promise<{ ok: boolean; codigo?: string; erro?: string }>;
  revogarAcessoRevendedora: (id: string) => Promise<void>;

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

  // contas a pagar (financeiro)
  addContaPagar: (c: {
    descricao: string;
    valor: number;
    vencimento: string;
    categoria?: string | null;
    fornecedor?: string | null;
    recorrente?: boolean;
    observacao?: string | null;
  }) => Promise<{ ok: boolean; erro?: string }>;
  marcarContaPaga: (id: string, paga: boolean) => Promise<{ ok: boolean; erro?: string }>;
  removerContaPagar: (id: string) => Promise<void>;

  // caixa de entrada de recebimentos
  confirmarEntrada: (entradaId: string) => Promise<Venda | null>;
  recusarEntrada: (entradaId: string) => Promise<void>;
  simularRecebimento: (args: { valor: number; descricao?: string }) => Promise<{ ok: boolean; erro?: string }>;

  // suporte / chamados
  abrirChamado: (args: {
    tipo: TipoChamado;
    assunto: string;
    mensagem: string;
    emailContato?: string;
    whatsapp?: string;
  }) => Promise<{ ok: boolean; erro?: string }>;
  listarChamados: () => Promise<Chamado[]>;
  resolverChamado: (id: string, resolvido: boolean) => Promise<void>;
}

// Janela inicial de vendas carregada na hydrate (cobre painel + analytics de 6 meses).
// O histórico mais antigo é buscado em segundo plano, paginado, e mesclado.
const JANELA_VENDAS_DIAS = 180;
const PAGINA_VENDAS = 500;
// teto do histórico carregado no cliente (2ª fase). Períodos além disso devem ser
// agregados no servidor — o navegador nunca baixa o histórico inteiro (A-5).
const HISTORICO_MAX_DIAS = 540;

export const useStore = create<State>()((set, get) => {
  const sb = () => createClient();

  return {
    ready: false,
    orgId: null,
    usuarioId: null,
    email: null,
    role: "owner",
    semOrg: false,
    config: configInicial,
    assinatura: null,
    produtos: [],
    revendedoras: [],
    vendas: [],
    movimentos: [],
    membros: [],
    entregas: [],
    entradasPendentes: [],
    contasPagar: [],

    hydrate: async () => {
      const supabase = sb();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ ready: true });
        return;
      }

      // só a janela recente entra na carga inicial (resto vem em 2º plano, abaixo)
      const corteISO = new Date(Date.now() - JANELA_VENDAS_DIAS * 86_400_000).toISOString();

      // papel + org + assinatura primeiro; a carga seguinte é POR PAPEL (A-1):
      // vendedor/motoboy não baixam tabelas financeiras (custo/lucro/comissão).
      const [{ data: org }, { data: eu }, { data: assin }] = await Promise.all([
        supabase.from("org").select("*").limit(1).maybeSingle(),
        supabase.from("usuario").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("assinatura").select("*").limit(1).maybeSingle(),
      ]);

      const role: Role = (eu?.role as Role) ?? "owner";
      const isOwner = role === "owner";
      const isMotoboy = role === "motoboy";
      const vazio = Promise.resolve([] as any[]);

      const [produtos, revendedoras, vendas, membros, entregas, entradas, contas] = await Promise.all([
        // produtos: owner lê a tabela (com custo, p/ analytics); vendedor recebe o
        // catálogo SEM custo via RPC produtos_para_venda; motoboy não precisa.
        isOwner
          ? supabase.from("produto").select("*, produto_variacao(*)").order("criado_em", { ascending: true }).then((r) => r.data ?? [])
          : role === "vendedor"
          ? supabase.rpc("produtos_para_venda").then((r) => (r.data as any[]) ?? [])
          : vazio,
        isOwner ? supabase.from("revendedora").select("*").order("criada_em", { ascending: true }).then((r) => r.data ?? []) : vazio,
        isOwner ? supabase.from("venda").select("*, venda_item(*)").gte("data", corteISO).order("data", { ascending: false }).then((r) => r.data ?? []) : vazio,
        isOwner ? supabase.from("usuario").select("id, nome, email, role").then((r) => r.data ?? []) : vazio,
        // entregas: owner vê todas; motoboy vê as suas + o pool (RLS cuida do escopo).
        isOwner || isMotoboy ? supabase.from("entrega").select("*").order("criada_em", { ascending: false }).then((r) => r.data ?? []) : vazio,
        // recebimentos / contas a pagar: só o owner (tabelas de 0024/0033).
        isOwner ? supabase.from("entrada_pendente").select("*").eq("status", "pendente").order("recebido_em", { ascending: false }).then((r) => r.data ?? []) : vazio,
        isOwner ? supabase.from("conta_pagar").select("*").order("vencimento", { ascending: true }).then((r) => r.data ?? []) : vazio,
      ]);

      const assinatura: Assinatura | null = assin
        ? {
            plano: assin.plano as PlanoId,
            status: assin.status,
            precoCentavos: Number(assin.preco_centavos ?? 0),
            periodo: assin.periodo ?? "mensal",
            dataInicio: assin.data_inicio ? new Date(assin.data_inicio).getTime() : null,
            dataFim: assin.data_fim ? new Date(assin.data_fim).getTime() : null,
            trialAte: assin.trial_ate ? new Date(assin.trial_ate).getTime() : null,
          }
        : null;

      set({
        ready: true,
        orgId: org?.id ?? null,
        usuarioId: user.id,
        email: user.email ?? null,
        role: (eu?.role as Role) ?? "owner",
        // sem linha em usuario = não é dono nem membro desta loja (revendedora/visitante)
        semOrg: !eu,
        assinatura,
        config: org
          ? {
              nomeLoja: org.nome,
              segmento: org.segmento,
              categorias: org.categorias ?? [],
              canais: org.canais,
              usaRevendedoras: org.usa_revendedoras,
              margemPadrao: Number(org.margem_padrao),
              comissaoPadrao: Number(org.comissao_padrao),
              onboardingCompleto: org.onboarding_completo,
              corMarca: org.cor_marca ?? null,
              temaBase: org.tema_base ?? null,
              appFonte: org.app_fonte ?? null,
              appRaio: org.app_raio ?? null,
              logoUrl: org.logo_url ?? null,
              plano: (assin?.plano as PlanoId) ?? "solo",
              slug: org.slug ?? null,
              lojaAtiva: org.loja_ativa ?? false,
              lojaDescricao: org.loja_descricao ?? null,
              lojaCapaUrl: org.loja_capa_url ?? null,
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
        entradasPendentes: (entradas || []).map(mapEntradaPendente),
        contasPagar: (contas || []).map(mapContaPagar),
      });

      // 2ª fase: histórico anterior à janela, paginado e mesclado em segundo plano.
      // Só o owner tem leitura de venda; demais papéis não entram aqui. A janela é
      // LIMITADA (HISTORICO_MAX_DIAS) para o navegador nunca baixar histórico
      // ilimitado — relatórios além disso devem ser agregados no servidor (A-5).
      const limiteHistoricoISO = new Date(Date.now() - HISTORICO_MAX_DIAS * 86_400_000).toISOString();
      if (isOwner) void (async () => {
        for (let offset = 0; ; offset += PAGINA_VENDAS) {
          const { data: antigas, error } = await supabase
            .from("venda")
            .select("*, venda_item(*)")
            .lt("data", corteISO)
            .gte("data", limiteHistoricoISO)
            .order("data", { ascending: false })
            .range(offset, offset + PAGINA_VENDAS - 1);
          if (error || !antigas || antigas.length === 0) break;
          const mapeadas = antigas.map(mapVenda);
          set((s) => {
            const ids = new Set(s.vendas.map((v) => v.id));
            const novas = mapeadas.filter((v) => !ids.has(v.id));
            return novas.length ? { vendas: [...s.vendas, ...novas] } : s;
          });
          if (antigas.length < PAGINA_VENDAS) break;
        }
      })();
    },

    setConfig: async (c) => {
      const anterior = get().config;
      set((s) => ({ config: { ...s.config, ...c } }));
      const { orgId } = get();
      if (!orgId) return { ok: true };
      const patch: any = {};
      if (c.nomeLoja !== undefined) patch.nome = c.nomeLoja;
      if (c.segmento !== undefined) patch.segmento = c.segmento;
      if (c.categorias !== undefined) patch.categorias = c.categorias;
      if (c.canais !== undefined) patch.canais = c.canais;
      if (c.usaRevendedoras !== undefined) patch.usa_revendedoras = c.usaRevendedoras;
      if (c.margemPadrao !== undefined) patch.margem_padrao = c.margemPadrao;
      if (c.comissaoPadrao !== undefined) patch.comissao_padrao = c.comissaoPadrao;
      if (c.onboardingCompleto !== undefined) patch.onboarding_completo = c.onboardingCompleto;
      if (c.corMarca !== undefined) patch.cor_marca = c.corMarca;
      if (c.temaBase !== undefined) patch.tema_base = c.temaBase;
      if (c.appFonte !== undefined) patch.app_fonte = c.appFonte;
      if (c.appRaio !== undefined) patch.app_raio = c.appRaio;
      if (c.logoUrl !== undefined) patch.logo_url = c.logoUrl;
      if (c.slug !== undefined) patch.slug = c.slug;
      if (c.lojaAtiva !== undefined) patch.loja_ativa = c.lojaAtiva;
      if (c.lojaDescricao !== undefined) patch.loja_descricao = c.lojaDescricao;
      if (c.lojaCapaUrl !== undefined) patch.loja_capa_url = c.lojaCapaUrl;
      if (c.lojaFonte !== undefined) patch.loja_fonte = c.lojaFonte;
      if (c.lojaSobre !== undefined) patch.loja_sobre = c.lojaSobre;
      if (c.lojaEmail !== undefined) patch.loja_email = c.lojaEmail;
      if (c.lojaWhatsapp !== undefined) patch.loja_whatsapp = c.lojaWhatsapp;
      if (c.lojaTelefone !== undefined) patch.loja_telefone = c.lojaTelefone;
      if (c.lojaInstagram !== undefined) patch.loja_instagram = c.lojaInstagram;
      if (c.lojaFacebook !== undefined) patch.loja_facebook = c.lojaFacebook;
      if (c.lojaTiktok !== undefined) patch.loja_tiktok = c.lojaTiktok;

      let { error } = await sb().from("org").update(patch).eq("id", orgId);
      // resiliência: se as colunas de aparência ainda não existem no banco
      // (migrations 0014/0020 não aplicadas), salva o resto sem elas em vez de falhar tudo.
      if (error && /tema_base|app_fonte|app_raio|loja_capa_url|column/i.test(error.message)) {
        delete patch.tema_base;
        delete patch.app_fonte;
        delete patch.app_raio;
        delete patch.loja_capa_url;
        ({ error } = await sb().from("org").update(patch).eq("id", orgId));
      }
      if (error) {
        set({ config: anterior }); // desfaz o otimista — sem falso "Salvo"
        return { ok: false, erro: error.message };
      }
      return { ok: true };
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
      if (!orgId) return { ok: true };
      const { error } = await sb().from("entrega").insert({
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
      // plano não libera entregas (trigger 0022) ou outro erro -> desfaz o otimista
      if (error) {
        set((s) => ({ entregas: s.entregas.filter((x) => x.id !== id) }));
        const erro = /entregas_nao_permitidas/.test(error.message)
          ? "Entregas estão disponíveis só no plano Expansão. Faça upgrade para registrar entregas."
          : error.message;
        return { ok: false, erro };
      }
      return { ok: true };
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

    // motoboy reivindica uma entrega do balcão. O `.is("motoboy_id", null)`
    // garante a corrida: se outro já pegou, este update não afeta linha nenhuma.
    pegarEntrega: async (entregaId) => {
      const { usuarioId } = get();
      if (!usuarioId) return { ok: false, erro: "Sessão expirada. Entre de novo." };
      set((s) => ({
        entregas: s.entregas.map((e) => (e.id === entregaId ? { ...e, motoboyId: usuarioId } : e)),
      }));
      const { data, error } = await sb()
        .from("entrega")
        .update({ motoboy_id: usuarioId })
        .eq("id", entregaId)
        .is("motoboy_id", null)
        .select("id");
      if (error || !data || data.length === 0) {
        // não conseguiu (já pegaram / RLS / rede): ressincroniza com o banco
        await get().recarregarEntregas();
        return { ok: false, erro: error ? error.message : "Outra pessoa já pegou esta entrega." };
      }
      return { ok: true };
    },

    // motoboy devolve a entrega ao balcão (volta a ficar sem dono).
    devolverEntrega: async (entregaId) => {
      const anterior = get().entregas.find((e) => e.id === entregaId);
      set((s) => ({
        entregas: s.entregas.map((e) => (e.id === entregaId ? { ...e, motoboyId: null } : e)),
      }));
      const { error } = await sb().from("entrega").update({ motoboy_id: null }).eq("id", entregaId);
      if (error && anterior)
        set((s) => ({ entregas: s.entregas.map((e) => (e.id === entregaId ? anterior : e)) }));
    },

    recarregarEntregas: async () => {
      const { data } = await sb().from("entrega").select("*").order("criada_em", { ascending: false });
      set({ entregas: (data || []).map(mapEntrega) });
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
      if (!orgId) return { ok: true };
      const supabase = sb();
      const { error } = await supabase.from("produto").insert({
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
      if (error) {
        set((s) => ({ produtos: s.produtos.filter((x) => x.id !== id) }));
        return { ok: false, erro: error.message };
      }
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
      return { ok: true };
    },

    // Importação em lote (CSV): grava todos os produtos numa tacada só, sem
    // variações (a grade é cadastrada produto a produto). Registra a entrada de
    // estoque inicial dos que vieram com quantidade.
    importarProdutos: async (linhas) => {
      if (linhas.length === 0) return { ok: true, inseridos: 0 };
      const { orgId } = get();
      const agora = Date.now();
      const novos: Produto[] = linhas.map((p) => ({
        id: uid(),
        nome: p.nome,
        categoria: p.categoria,
        sku: p.sku,
        marca: p.marca,
        custo: p.custo,
        precoVenda: p.precoVenda,
        precoComparativo: p.precoComparativo,
        impostoPercent: p.impostoPercent ?? 0,
        descricao: p.descricao,
        imagens: [],
        estoqueAtual: p.estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
        variacoes: [],
        ativo: true,
        criadoEm: agora,
      }));
      set((s) => ({ produtos: [...s.produtos, ...novos] }));
      if (!orgId) return { ok: true, inseridos: novos.length };

      const supabase = sb();
      const { error } = await supabase.from("produto").insert(
        novos.map((p) => ({
          id: p.id,
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
          imagens: [],
          estoque_atual: p.estoqueAtual,
          estoque_minimo: p.estoqueMinimo,
          ativo: true,
        }))
      );
      // falhou -> desfaz o otimista
      if (error) {
        const ids = new Set(novos.map((p) => p.id));
        set((s) => ({ produtos: s.produtos.filter((p) => !ids.has(p.id)) }));
        return { ok: false, inseridos: 0, erro: error.message };
      }

      const comEstoque = novos.filter((p) => p.estoqueAtual > 0);
      if (comEstoque.length > 0) {
        await supabase.from("movimento_estoque").insert(
          comEstoque.map((p) => ({
            org_id: orgId,
            produto_id: p.id,
            tipo: "entrada",
            qtd: p.estoqueAtual,
            motivo: "Importação inicial",
          }))
        );
      }
      return { ok: true, inseridos: novos.length };
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
      if (!prod) return { ok: false, erro: "Produto não encontrado." };
      // grade: o estoque é a soma das variações; dar entrada no agregado
      // criaria estoque "fantasma" invendável. Reposição vai na tela do produto.
      if (prod.variacoes.length > 0)
        return { ok: false, erro: "Produto com grade: ajuste o estoque por variação." };
      const anterior = prod.estoqueAtual;
      const novoEstoque = anterior + qtd;
      set((s) => ({
        produtos: s.produtos.map((x) => (x.id === id ? { ...x, estoqueAtual: novoEstoque } : x)),
      }));
      if (!orgId) return { ok: true };
      const { error } = await sb().from("produto").update({ estoque_atual: novoEstoque }).eq("id", id);
      if (error) {
        set((s) => ({ produtos: s.produtos.map((x) => (x.id === id ? { ...x, estoqueAtual: anterior } : x)) }));
        return { ok: false, erro: error.message };
      }
      await sb().from("movimento_estoque").insert({
        org_id: orgId,
        produto_id: id,
        tipo: "entrada",
        qtd,
        motivo: "Reposição de estoque",
      });
      return { ok: true };
    },

    ajustarEstoque: async (id, novaQtd, motivo) => {
      const { orgId } = get();
      const prod = get().produtos.find((x) => x.id === id);
      if (!prod) return { ok: false, erro: "Produto não encontrado." };
      // grade: ajuste é por variação (na tela do produto); não mexe no agregado.
      if (prod.variacoes.length > 0)
        return { ok: false, erro: "Produto com grade: ajuste o estoque por variação." };
      const anterior = prod.estoqueAtual;
      const delta = novaQtd - anterior;
      set((s) => ({
        produtos: s.produtos.map((x) => (x.id === id ? { ...x, estoqueAtual: novaQtd } : x)),
      }));
      if (!orgId) return { ok: true };
      const { error } = await sb().from("produto").update({ estoque_atual: novaQtd }).eq("id", id);
      if (error) {
        set((s) => ({ produtos: s.produtos.map((x) => (x.id === id ? { ...x, estoqueAtual: anterior } : x)) }));
        return { ok: false, erro: error.message };
      }
      await sb().from("movimento_estoque").insert({
        org_id: orgId,
        produto_id: id,
        tipo: "ajuste",
        qtd: delta,
        motivo,
      });
      return { ok: true };
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
      if (!orgId) return { ok: true };
      const { error } = await sb().from("revendedora").insert({
        id,
        org_id: orgId,
        nome: r.nome,
        whatsapp: r.whatsapp || null,
        email: r.email || null,
        comissao_percent: r.comissaoPercent,
        meta_mensal: r.metaMensal || 0,
        ativa: true,
      });
      // limite do plano (trigger no banco) ou outro erro -> desfaz o otimista
      if (error) {
        set((s) => ({ revendedoras: s.revendedoras.filter((x) => x.id !== id) }));
        return {
          ok: false,
          erro: /limite_revendedoras/.test(error.message)
            ? "Limite de revendedoras do seu plano atingido. Faça upgrade para adicionar mais."
            : error.message,
        };
      }
      return { ok: true };
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

    removerRevendedora: async (id) => {
      const anterior = get().revendedoras.find((r) => r.id === id);
      // otimista: some da lista
      set((s) => ({ revendedoras: s.revendedoras.filter((r) => r.id !== id) }));
      const res = await fetch("/api/revendedora/remover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // falhou -> devolve para a lista
        if (anterior) set((s) => ({ revendedoras: [...s.revendedoras, anterior].sort((a, b) => a.criadaEm - b.criadaEm) }));
        return { ok: false, erro: json?.erro || "Não foi possível remover." };
      }
      return { ok: true };
    },

    liberarAcessoRevendedora: async (id) => {
      const { data, error } = await sb().rpc("liberar_revendedora", { p_id: id });
      if (error) {
        const erro = /sem_email/.test(error.message)
          ? "Cadastre o e-mail dela antes de liberar o acesso."
          : /ja_ativada/.test(error.message)
          ? "Essa revendedora já ativou o acesso."
          : "Não foi possível liberar o acesso agora.";
        return { ok: false, erro };
      }
      set((s) => ({
        revendedoras: s.revendedoras.map((r) => (r.id === id ? { ...r, acessoLiberado: true } : r)),
      }));
      return { ok: true, codigo: (data as any)?.codigo };
    },

    revogarAcessoRevendedora: async (id) => {
      set((s) => ({
        revendedoras: s.revendedoras.map((r) => (r.id === id ? { ...r, acessoLiberado: false } : r)),
      }));
      await sb().rpc("revogar_revendedora", { p_id: id });
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

      const round2 = (n: number) => Math.round(n * 100) / 100;
      const bruto = vendaItens.reduce((a, i) => a + i.precoUnit * i.qtd, 0);
      const desc = round2(Math.min(Math.max(desconto, 0), bruto));
      const total = round2(bruto - desc);
      const custoTotal = round2(vendaItens.reduce((a, i) => a + i.custoUnit * i.qtd, 0));
      // comissão sobre o total JÁ com desconto (igual à UI e ao RPC registrar_venda)
      const comissaoTotal = round2((total * comissaoPercent) / 100);
      const lucro = round2(total - custoTotal - comissaoTotal);
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

      // otimista - baixa no agregado do produto e na variação correspondente
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

      // Tudo numa transação atômica no banco (valida estoque, grava venda+itens,
      // baixa estoque relativo e movimentos). O id vem do cliente p/ casar com o otimista.
      const { error } = await sb().rpc("registrar_venda", {
        p_venda_id: vendaId,
        p_itens: itens.map((it) => ({
          produto_id: it.produtoId,
          variacao_id: it.variacaoId ?? null,
          qtd: it.qtd,
        })),
        p_canal: canal,
        p_revendedora_id: revendedoraId,
        p_forma: formaPagamento,
        p_parcelas: parcelasNorm,
        p_desconto: desc,
        p_fiado: fiado,
      });

      // erro no banco (estoque, RLS, rede) -> desfaz o otimista: remove a venda
      // e restaura o estoque dos produtos afetados ao valor anterior à venda.
      if (error) {
        const afetados = new Set(baixaPorProduto.keys());
        set((st) => ({
          vendas: st.vendas.filter((v) => v.id !== vendaId),
          produtos: st.produtos.map((p) => {
            if (!afetados.has(p.id)) return p;
            const orig = s.produtos.find((o) => o.id === p.id);
            return orig ?? p;
          }),
        }));
        return null;
      }

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

    addContaPagar: async (c) => {
      const { orgId } = get();
      if (!c.descricao.trim()) return { ok: false, erro: "Informe a descrição da conta." };
      if (!c.valor || c.valor <= 0) return { ok: false, erro: "Informe um valor válido." };
      if (!c.vencimento) return { ok: false, erro: "Informe a data de vencimento." };
      const id = uid();
      const nova: ContaPagar = {
        id,
        descricao: c.descricao.trim(),
        categoria: c.categoria?.trim() || null,
        fornecedor: c.fornecedor?.trim() || null,
        valor: c.valor,
        vencimento: c.vencimento,
        status: "pendente",
        pagoEm: null,
        recorrente: !!c.recorrente,
        observacao: c.observacao?.trim() || null,
        criadoEm: Date.now(),
      };
      set((s) => ({ contasPagar: [...s.contasPagar, nova] }));
      if (!orgId) return { ok: true };
      const { error } = await sb().from("conta_pagar").insert({
        id,
        org_id: orgId,
        descricao: nova.descricao,
        categoria: nova.categoria,
        fornecedor: nova.fornecedor,
        valor: nova.valor,
        vencimento: nova.vencimento,
        recorrente: nova.recorrente,
        observacao: nova.observacao,
        status: "pendente",
      });
      if (error) {
        set((s) => ({ contasPagar: s.contasPagar.filter((x) => x.id !== id) }));
        return { ok: false, erro: error.message };
      }
      return { ok: true };
    },

    marcarContaPaga: async (id, paga) => {
      const anterior = get().contasPagar.find((c) => c.id === id);
      const pagoEm = paga ? Date.now() : null;
      set((s) => ({
        contasPagar: s.contasPagar.map((c) =>
          c.id === id ? { ...c, status: paga ? "paga" : "pendente", pagoEm } : c
        ),
      }));
      const { orgId } = get();
      if (!orgId) return { ok: true };
      const { error } = await sb()
        .from("conta_pagar")
        .update({
          status: paga ? "paga" : "pendente",
          pago_em: pagoEm ? new Date(pagoEm).toISOString() : null,
        })
        .eq("id", id);
      if (error && anterior) {
        set((s) => ({ contasPagar: s.contasPagar.map((c) => (c.id === id ? anterior : c)) }));
        return { ok: false, erro: error.message };
      }
      return { ok: true };
    },

    removerContaPagar: async (id) => {
      const anterior = get().contasPagar.find((c) => c.id === id);
      set((s) => ({ contasPagar: s.contasPagar.filter((c) => c.id !== id) }));
      const { error } = await sb().from("conta_pagar").delete().eq("id", id);
      if (error && anterior) set((s) => ({ contasPagar: [...s.contasPagar, anterior] }));
    },

    // "Sim, foi venda da loja": transforma o recebimento numa venda avulsa (sem itens,
    // só o valor) e marca a entrada como confirmada, ligando-a à venda criada.
    confirmarEntrada: async (entradaId) => {
      const s = get();
      const { orgId } = s;
      const entrada = s.entradasPendentes.find((e) => e.id === entradaId);
      if (!entrada || !orgId) return null;

      const vendaId = uid();
      const data = entrada.recebidoEm || Date.now();
      const venda: Venda = {
        id: vendaId,
        data,
        canal: "loja",
        revendedoraId: null,
        itens: [],
        total: entrada.valor,
        custoTotal: 0,
        comissaoTotal: 0,
        lucro: entrada.valor,
        statusComissao: "paga",
        formaPagamento: entrada.formaPagamento,
        parcelas: 1,
        statusPagamento: "paga",
        desconto: 0,
        dataPagamento: data,
      };

      // otimista: a venda entra na lista e a entrada sai da caixa
      set((st) => ({
        vendas: [venda, ...st.vendas],
        entradasPendentes: st.entradasPendentes.filter((e) => e.id !== entradaId),
      }));

      // cria a venda e marca a entrada como confirmada na MESMA transação.
      // Idempotente: confirmar de novo (duplo-clique/2ª aba) não duplica a venda.
      const { error } = await sb().rpc("confirmar_entrada", {
        p_entrada_id: entradaId,
        p_venda_id: vendaId,
      });

      // erro -> desfaz: tira a venda otimista e devolve a entrada à caixa
      if (error) {
        set((st) => ({
          vendas: st.vendas.filter((v) => v.id !== vendaId),
          entradasPendentes: st.entradasPendentes.some((e) => e.id === entradaId)
            ? st.entradasPendentes
            : [entrada, ...st.entradasPendentes],
        }));
        return null;
      }

      return venda;
    },

    // "Não foi da loja": só arquiva a entrada, sem gerar venda.
    recusarEntrada: async (entradaId) => {
      const anterior = get().entradasPendentes.find((e) => e.id === entradaId);
      set((st) => ({
        entradasPendentes: st.entradasPendentes.filter((e) => e.id !== entradaId),
      }));
      const { error } = await sb()
        .from("entrada_pendente")
        .update({ status: "recusada", decidido_em: new Date().toISOString() })
        .eq("id", entradaId)
        .eq("status", "pendente");
      // falhou -> devolve a entrada à caixa pra não "sumir" sem persistir
      if (error && anterior)
        set((st) => ({
          entradasPendentes: st.entradasPendentes.some((e) => e.id === entradaId)
            ? st.entradasPendentes
            : [anterior, ...st.entradasPendentes],
        }));
    },

    // Cria um recebimento de teste (enquanto não há banco conectado de verdade),
    // pra você ver a caixa de entrada e o fluxo de confirmação funcionando.
    simularRecebimento: async ({ valor, descricao }) => {
      const { orgId } = get();
      if (!orgId) return { ok: false, erro: "Loja não carregada" };
      if (!valor || valor <= 0) return { ok: false, erro: "Informe um valor válido." };
      const id = uid();
      const recebidoEm = Date.now();
      const { error } = await sb().from("entrada_pendente").insert({
        id,
        org_id: orgId,
        valor,
        origem: "manual",
        descricao: descricao || "Recebimento de teste",
        forma_pagamento: "pix",
        status: "pendente",
        recebido_em: new Date(recebidoEm).toISOString(),
      });
      if (error) return { ok: false, erro: error.message };
      set((st) => ({
        entradasPendentes: [
          {
            id,
            valor,
            origem: "manual",
            descricao: descricao || "Recebimento de teste",
            pagador: null,
            formaPagamento: "pix",
            status: "pendente",
            vendaId: null,
            recebidoEm,
            decididoEm: null,
          },
          ...st.entradasPendentes,
        ],
      }));
      return { ok: true };
    },

    abrirChamado: async ({ tipo, assunto, mensagem, emailContato, whatsapp }) => {
      const { orgId, usuarioId, email, config } = get();
      if (!usuarioId) return { ok: false, erro: "Sessão expirada. Entre novamente." };
      if (!assunto.trim() || !mensagem.trim())
        return { ok: false, erro: "Preencha assunto e mensagem." };
      const { error } = await sb().from("chamado").insert({
        org_id: orgId,
        usuario_id: usuarioId,
        nome_loja: config.nomeLoja || null,
        email_contato: (emailContato || email || "").trim() || null,
        whatsapp: (whatsapp || "").trim() || null,
        tipo,
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
      });
      if (error) return { ok: false, erro: error.message };
      return { ok: true };
    },

    listarChamados: async () => {
      const { data, error } = await sb()
        .from("chamado")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data || []).map(mapChamado);
    },

    resolverChamado: async (id, resolvido) => {
      await sb()
        .from("chamado")
        .update({
          status: resolvido ? "resolvido" : "aberto",
          resolved_at: resolvido ? new Date().toISOString() : null,
        })
        .eq("id", id);
    },
  };
});
