# AutoManager - Documentação

> Estado deste documento: **2026-06-24**. Reflete o código atual no branch `main`
> (repositório: `https://github.com/Jpsoaresfig/AutoManager.git`).

---

## 1. O que é a aplicação

**AutoManager** é um SaaS de gestão **acessível para micronegócios brasileiros** - doces e
comida caseira, bijuterias, semijoias, cosméticos, roupas, papelaria, pet shop, artesanato e
qualquer pequena loja que hoje não pode pagar caro por um sistema. É um **PWA mobile-first** que
controla estoque, vendas, comissões, entregas e ainda dá à loja uma **vitrine pública própria**
com chat em tempo real. A loja é **totalmente configurável** (categorias, comissões, marca e
cores), então o sistema se molda ao negócio - não o contrário.

Cada conta é uma **loja (org)** isolada das demais por **RLS** (Row Level Security) no
Postgres do Supabase. Vários papéis de usuário convivem na mesma loja (dono, vendedor,
motoboy) e há um acesso externo separado para **revendedoras**.

### Para quem
- **Dono/gerente:** controla tudo (estoque, vendas, financeiro, equipe, loja online).
- **Vendedor (interno):** registra vendas e vê estoque, sem mexer em cadastro/config.
- **Motoboy:** vê e atualiza só as próprias entregas.
- **Revendedora (externa):** acessa o catálogo e registra as próprias vendas pelo celular.
- **Cliente final:** navega na vitrine pública e fala com a loja pelo chat.

---

## 2. Em que pé está (status atual)

Todos os blocos abaixo estão **implementados, com build verde (28 rotas) e validados
contra o banco real**.

| Módulo | Status | Observação |
|---|---|---|
| **Planos & assinatura** (Solo/Equipe/Expansão) + trial + enforcement | ✅ Pronto | Tabela `assinatura`, limites em `lib/plans.ts`, triggers no banco |
| **Pagamento (Mercado Pago)** — checkout + webhook | ✅ Integrado | `/planos` → checkout; `api/mercadopago/*` |
| **Chat persistente por cliente** + badges de não lidas (loja e cliente) | ✅ Pronto | Token no localStorage + RPC de recuperação |
| **Admin/suporte** (superadmin) — chamados | ✅ Pronto | `/admin` restrito por e-mail (ver §12) |
| Cadastro/onboarding + multi-tenant (RLS) | ✅ Pronto | Trigger cria a org no signup |
| Produto completo (marca, imposto, preço "de", fotos, variações/grade) | ✅ Pronto | |
| Estoque (entrada, ajuste, mínimo, baixa na venda) | ✅ Pronto | |
| Venda rápida (carrinho, canal, desconto, fiado, **forma de pagamento + parcelas**) | ✅ Pronto | Boleto e parcelas no crédito |
| Revendedoras internas (comissão, meta, ranking) | ✅ Pronto | |
| **Acesso self-service das revendedoras** (login próprio, catálogo, registrar venda) | ✅ Pronto | Validado com testes de isolamento |
| Papéis (owner/vendedor/motoboy) + 3 planos | ✅ Pronto | 15/15 testes de RLS |
| Entregas + painel do motoboy | ✅ Pronto | |
| **Mini-loja pública** (`/loja/[slug]`) + chat em tempo real | ✅ Pronto | RPC segura, sem vazar dados |
| **Construtor da loja** (`/minha-loja`): link, fonte, cor, logo, sobre, contato, redes | ✅ Pronto | Preview ao vivo |
| **Categorias personalizadas por loja** + filtro no estoque e na vitrine | ✅ Pronto | |
| Analytics/Inteligência (receita, canal, tendência, ruptura) | ✅ Pronto | |
| Relatórios + exportação | ✅ Pronto | |
| Tema claro/escuro | ✅ Pronto | |

### Pendências conhecidas / próximos passos
- **Segurança operacional:** rotacionar o token de management `sbp_…` e a `service_role`
  usados em desenvolvimento (foram digitados em texto puro durante o build).
- **Ativação da revendedora:** modelo self-service tem uma pequena janela de risco entre
  "Liberar acesso" e a 1ª senha (ver §7). Endurecer com código de convite é opcional.
- **Ideias abertas:** contador por categoria nos chips; busca + filtro combinados;
  forma de pagamento/parcelas exibidas em Relatórios; preview "tela cheia" no desktop.

---

## 3. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | **Next.js 14** (App Router) + React 18 + TypeScript |
| Estilo | Tailwind CSS + `lucide-react` (ícones) |
| Gráficos | `recharts` (relatórios) + SVG próprio (analytics) |
| Estado | **Zustand** (`lib/store.ts`) - write-through: lê/grava direto no Supabase |
| Auth/sessão | `@supabase/ssr` (cookies) + `middleware.ts` (refresh + proteção de rota) |
| Banco | **Supabase Postgres** com RLS por loja |
| Storage | Supabase Storage (logos e fotos de produto) |
| Realtime | Supabase Realtime (chat) |

Scripts: `npm run dev` · `npm run build` · `npm start` · `npm run lint`.

---

## 4. Papéis, planos e assinatura

Papel mora em `public.usuario.role`; o plano vive em **`public.assinatura`** (fonte da
verdade — a coluna antiga `org.plano` foi removida).

**Papéis:** `owner` · `vendedor` · `motoboy` · *(revendedora é externa, ver §7)*.
Há ainda um **superadmin** do produto (suporte), fora das lojas — ver §12.

**Planos (assinatura):**
1. **Solo — R$ 49/mês** — só o dono, até 3 revendedoras, loja online, relatórios básicos.
2. **Equipe — R$ 99/mês** ⭐ — + vendedores internos, até 15 revendedoras, ranking, analytics, chat.
3. **Expansão — R$ 199/mês** — + motoboys/entregas, revendedoras ilimitadas, analytics avançado (tendência + ruptura).

Toda org nova nasce com **trial de 14 dias com acesso Expansão**. Os limites/permissões são
fonte única em **`lib/plans.ts`** (consumidos pelo hook `lib/usePlano.ts`) e **espelhados em
triggers no banco** (enforcement real: bloqueia revendedora acima do limite e criação de
vendedor/motoboy fora do plano). Troca de plano via RPC `mudar_plano` (owner); pagamento pelo
**Mercado Pago**. Downgrade é **não destrutivo** — dados ficam, novos cadastros bloqueiam até
regularizar.

Navegação e rotas se adaptam ao papel e às **capacidades do plano**
(`lib/permissoes.ts`, `components/Guard.tsx`, `components/AppShell.tsx`).

---

## 5. Funcionalidades por rota

### Área logada (dono/equipe)
| Rota | O que faz |
|---|---|
| `/login` | Criar conta / entrar. Revendedora é redirecionada para `/revenda`. |
| `/onboarding` | Auto-configuração inicial do dono (< 2 min; opção de dados de exemplo). |
| `/painel` | Dashboard: faturamento, lucro, comissão pendente, ranking, gráfico. |
| `/produtos` | Estoque: cadastro completo, variações/grade, entrada/ajuste, **filtro por categoria**. |
| `/vender` | Venda rápida: carrinho, canal, revendedora, desconto, fiado, **pagamento + parcelas**. |
| `/revendedoras` | Comissão/meta por revendedora + **gestão de acesso** (e-mail, liberar 1ª senha). |
| `/entregas` | Entregas (dono gerencia; motoboy vê/atualiza as suas). |
| `/reposicao` | Sugestões de compra (média de venda dos últimos 30 dias). |
| `/conversas` | Caixa de entrada do chat da vitrine (tempo real). |
| `/analytics` | Inteligência: receita por produto, mix de canal, tendência mensal, ruptura. |
| `/relatorios` | Relatórios + exportação. |
| `/minha-loja` | **Construtor da loja online** (ver §6). |
| `/planos` | Escolha/assinatura de plano (checkout Mercado Pago). |
| `/configuracoes` | Loja, identidade, **categorias**, aparência, equipe de acesso, atalho da loja. |
| `/configuracoes/plano` | Assinatura: plano atual, status, **uso × limites**. |
| `/admin` | **Superadmin** do produto: chamados de suporte de todas as lojas (ver §12). |
| `/perfil` | Dados do usuário logado. |

### Público / externo
| Rota | O que faz |
|---|---|
| `/` | Landing. |
| `/loja/[slug]` | **Vitrine pública** da loja: catálogo, filtro por categoria, sobre, contato, chat. |
| `/acesso` | Ativação/login self-service da **revendedora** (1º acesso cria a senha). |
| `/revenda` | Painel da revendedora: catálogo + registrar venda + "minhas vendas". |

### API (server-side, service role)
| Rota | O que faz |
|---|---|
| `POST /api/membros` | Dono cria/remove login de vendedor/motoboy (valida que quem chama é owner + plano). |
| `POST /api/revendedora/ativar` | Revendedora ativa o acesso com o e-mail liberado + senha escolhida. |
| `POST /api/mercadopago/assinar` | Inicia o checkout de assinatura no Mercado Pago. |
| `POST /api/mercadopago/webhook` | Recebe notificações de pagamento (sem sessão; auto-protegido). |

---

## 6. Mini-loja / Construtor (`/minha-loja`)

A loja monta a própria página pública, com **preview ao vivo** (moldura de celular) ao lado:

- **Link** próprio: `…/loja/<slug>` (editável, copiar/abrir, ligar/desligar "No ar").
- **Identidade:** nome, **escolha de fonte** (9 opções via Google Fonts sob demanda),
  cor da marca (gera paleta 50-900), logo.
- **Sobre**, **Contato** (WhatsApp, telefone, e-mail) e **Redes sociais** (Instagram,
  Facebook, TikTok) - viram botões/links na vitrine.
- **Vitrine:** mostra os produtos ativos com selo de estoque ("Esgotado" quando zerado),
  resumo de quantos aparecem/ocultos/sem estoque, e filtro por categoria.

A vitrine pública (`/loja/[slug]`) consome tudo isso via uma **RPC `loja_publica`**
`SECURITY DEFINER` que devolve só campos seguros (nunca expõe a tabela `org` nem o custo).

---

## 7. Acesso das revendedoras (modelo de segurança)

Decisão de arquitetura importante: a revendedora **não recebe linha em `public.usuario`**.
Como as policies de leitura são "org-wide", dar a ela um `usuario` vazaria vendas, custos e
lucros da loja. Em vez disso:

- A revendedora é identificada por `revendedora.user_id = auth.uid()`.
- Todo o acesso dela passa por **RPCs `SECURITY DEFINER` escopadas** ao próprio login:
  - `revendedora_me()` - identidade dela + da loja (sem dados sensíveis).
  - `revendedora_catalogo()` - produtos ativos **sem custo**.
  - `revendedora_registrar_venda(...)` - valida estoque, calcula total/comissão, baixa estoque.
  - `revendedora_minhas_vendas()` - só as vendas dela, **sem lucro/custo**.

**Fluxo de ativação:** o dono cadastra o e-mail e clica em **"Liberar acesso"**. A
revendedora vai em `/acesso`, informa o e-mail e **cria a própria senha** (1º acesso). A
rota `/api/revendedora/ativar` só cria o login se o acesso estiver liberado e ainda não
ativado. ⚠️ Como não há envio de e-mail, existe uma pequena janela entre liberar e ativar
em que alguém que conheça o e-mail poderia reivindicá-lo - endurecer com código é opcional.

**Validação:** testes end-to-end confirmaram (10/10) que a revendedora **não lê** `venda`
nem `produto.custo` diretamente, que o estoque baixa correto e que parcelas/comissão gravam.

---

## 8. Modelo de dados (principais tabelas)

Todas com `org_id` e RLS por loja, exceto onde indicado.

| Tabela | Conteúdo |
|---|---|
| `org` | A loja: nome, segmento, **categorias[]**, cor/tema/fonte, logo, e campos da vitrine (slug, ativa, descrição, fonte, sobre, contato, redes). *(plano saiu daqui → `assinatura`)* |
| `assinatura` | Plano da loja: `plano`, `status`, `trial_ate`, preço, período + ganchos de pagamento (`provider*`). Fonte da verdade do plano. |
| `usuario` | Vínculo `auth.users` ↔ org + `role`. |
| `produto` | Nome, categoria, marca, custo, preço, preço "de", imposto, descrição, imagens[], estoque, mínimo, ativo. |
| `produto_variacao` | Grade (tamanho/cor) com SKU, estoque e ajuste de preço próprios. |
| `revendedora` | Nome, whatsapp, comissão, meta, **email/acesso_liberado/user_id** (acesso). |
| `venda` | Canal, revendedora, total, custo, comissão, lucro, **forma_pagamento, parcelas**, status pagamento/comissão, desconto. |
| `venda_item` | Item da venda (produto/variação, qtd, preços, comissão aplicada). |
| `movimento_estoque` | Entradas/saídas/ajustes (baixa de venda referencia a venda). |
| `entrega` | Entrega vinculada à venda + motoboy + status. |
| `conversa` / `mensagem` | Chat cliente ↔ loja (Realtime + RLS por participante). `conversa` tem `cliente_token` (persistência por cliente) e `ultima_cliente_em` (badge de não lidas). |
| `chamado` | Suporte: chamados das lojas, visíveis só ao superadmin (ver §12). |

Funções auxiliares ficam no schema **`private`** (fora da Data API): `current_org_id()`,
`current_role()`, `handle_new_user()` (bootstrap de signup, ciente de anônimo/revendedora).

---

## 9. Histórico de migrations (`supabase/migrations/`)

| Arquivo | Conteúdo |
|---|---|
| `0001_init` | Multi-tenant + RLS + trigger de bootstrap. |
| `0002_financeiro` | Forma de pagamento, status de pagamento, fiado. |
| `0003_metas` | Meta mensal por revendedora. |
| `0004_identidade` | Cor da marca e logo. |
| `0005_produto_completo` | Marca, imposto, preço "de", descrição, fotos, variações/grade. |
| `0006_papeis` | Papéis, planos, entregas e RLS por papel. |
| `0007_loja_chat` | Vitrine pública (RPC) + chat (conversa/mensagem) com Realtime. |
| `0008_anon_sem_org` | Login anônimo (chat) não cria org fantasma. |
| `0009_loja_estoque` | Vitrine expõe estoque (selo "Esgotado"). |
| `0010_loja_completa` | Fonte, sobre, contato e redes na vitrine. |
| `0011_revendedora_acesso` | Acesso self-service + RPCs da revendedora + parcelas. |
| `0012_categorias_loja` | Categorias personalizadas por loja (`org.categorias[]`). |
| `0013_assinaturas` | Tabela `assinatura` + trial + enforcement (triggers) + RPC `mudar_plano`; remove `org.plano`. |
| `0014_aparencia` | Tema base e fonte do app (personalização da aparência). |
| `0016_chamados` | Suporte: tabela `chamado` + RLS pelo e-mail do superadmin (ver §12). |
| `0017_chat_token` | Chat persistente por cliente (`conversa.cliente_token` + RPC `recuperar_conversa`). |
| `0018_chat_criada_em` | `recuperar_conversa` devolve `criada_em` (badge de não lidas no storefront). |
| `0019_conversa_ultima_cliente` | `conversa.ultima_cliente_em` + trigger (badge de não lidas no inbox). |

> **Numeração:** as migrations do chat foram renumeradas (`0017`–`0019`) para não colidir
> com o fluxo paralelo de aparência/chamados (`0014`/`0016`). Por isso há um **gap no `0015`** —
> inofensivo, já que o Supabase CLI ordena por nome. A ordem de dependência do chat
> (`token → criada_em → conversa_ultima_cliente`) foi preservada. Tudo já aplicado no banco.

---

## 10. Como rodar

```bash
npm install
cp .env.local.example .env.local   # preencher com as chaves do Supabase
npm run dev                         # http://localhost:3000
```

**Variáveis de ambiente** (`.env.local`, fora do git):
- `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - chave pública (segura no browser).
- `SUPABASE_SERVICE_ROLE_KEY` - **secreta, só no servidor** (rotas `/api`). Nunca commitar.

Build de produção: `npm run build && npm start`.

---

## 11. Estrutura de pastas

```
app/
  (rotas - ver §5)             onboarding, painel, produtos, vender, revendedoras,
                               entregas, reposicao, conversas, analytics, relatorios,
                               minha-loja, planos, configuracoes(+/plano), perfil, admin,
                               loja/[slug] (vitrine), acesso, revenda (público/externo),
                               api/membros, api/revendedora/ativar, api/mercadopago/*
lib/
  store.ts        → estado global (Zustand) + acesso ao Supabase
  types.ts        → tipos do domínio
  plans.ts        → fonte única de planos/limites; usePlano.ts → hook de capacidades/uso
  admin.ts        → superadmin (e-mail), WhatsApp de suporte
  analytics.ts    → métricas, reposição, formatação (brl)
  seed.ts         → segmentos, categorias padrão, dados de exemplo
  brand.ts/aparencia.ts → paleta/tema/fonte; fontes.ts → fontes da loja
  contato.ts      → links de WhatsApp/Instagram/etc; slug.ts → slug da loja
  permissoes.ts   → rotas/home por papel; export.ts → exportação
  useConversasNaoLidas.ts → contador de chat não lido (badge do menu)
  mercadopago.ts  → integração de pagamento
  supabase/       → client.ts, server.ts, middleware.ts (sessão/proteção)
components/
  AppShell.tsx    → navegação (sidebar desktop + bottom nav mobile)
  Guard.tsx       → hidratação, onboarding e bloqueio por papel
  UpgradeGate.tsx → modal/bloco de upgrade de plano
  ThemeToggle.tsx → tema claro/escuro
scripts/criar-admin.mjs → cria/reseta a conta superadmin
supabase/migrations/  → SQL versionado (§9)
```

---

## 12. Admin / superadmin (suporte)

O AutoManager tem uma área de **suporte** separada das lojas, para o time do produto atender
chamados — não é o "admin" de uma loja (esse é o `owner`).

- **Quem acessa:** uma única conta, definida em `lib/admin.ts` →
  `SUPERADMIN_EMAIL = "admin@automanager.com"`. Só esse e-mail vê o item **"Admin"** no menu e
  abre `/admin`.
- **Criar a conta (uma vez):** na raiz do projeto, `node scripts/criar-admin.mjs` — cria
  `admin@automanager.com` com senha provisória **`123mudar`** (precisa do `.env.local` com
  `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Se já existir, **redefine a senha**.
- **Entrar:** `/login` com esse e-mail → o item **"Admin"** aparece e `/admin` lista os
  chamados de todas as lojas. **Troque a senha** depois (Supabase → Authentication → Users,
  ou pelo perfil).
- **Dados:** tabela `chamado` (migration `0016_chamados.sql`) com RLS que libera **só** o
  e-mail do superadmin.
- **Trocar quem é admin:** edite `SUPERADMIN_EMAIL` em `lib/admin.ts` **e** o e-mail no RLS de
  `0016_chamados.sql` (o arquivo avisa isso no comentário).
- **Suporte ao lojista:** `lib/admin.ts` também guarda o WhatsApp de suporte
  (`SUPORTE_WHATSAPP`) usado nos CTAs de ajuda.
