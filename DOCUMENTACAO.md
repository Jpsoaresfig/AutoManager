# AutoManager - Documentação

> Estado deste documento: **2026-06-26**. Reflete o código atual no branch
> `fix/auditoria-fluxos` (repositório: `https://github.com/Jpsoaresfig/AutoManager.git`),
> já com o plano **Ambulante**, a **caixa de recebimentos**, o **painel de plataforma do
> super-admin** e a **auditoria de fluxos** (Lotes 1–4: venda/recebimento atômicos,
> idempotência do webhook, hardening do chat/upload e enforcement de plano no banco).

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

Todos os blocos abaixo estão **implementados, com build verde e validados
contra o banco real**.

| Módulo | Status | Observação |
|---|---|---|
| **Planos & assinatura** (Ambulante/Solo/Equipe/Expansão) + trial + enforcement | ✅ Pronto | Tabela `assinatura`, limites em `lib/plans.ts`, triggers no banco |
| **Pagamento (Mercado Pago)** — checkout + webhook (assinatura + recebimentos) | ✅ Integrado | `/planos` → checkout; `api/mercadopago/*`; webhook valida `x-signature` |
| **Caixa de recebimentos** (`/recebimentos`) — confirma "foi venda?" → vira venda | ✅ Pronto | Tabela `entrada_pendente`, webhook MP grava, dono confirma (atômico/idempotente) |
| **Painel da plataforma** (super-admin): MRR/ARR, lojas, moderar contas, trocar plano | ✅ Pronto | `/admin` (resumo/lojas/chamados) + `api/admin/*` |
| **Auditoria de fluxos** (Lotes 1–4): atomicidade, idempotência e hardening | ✅ Pronto | Ver §13 |
| **Chat persistente por cliente** + badges de não lidas (loja e cliente) | ✅ Pronto | Token no localStorage + RPC de recuperação |
| **Admin/suporte** (superadmin) — chamados | ✅ Pronto | `/admin` restrito por e-mail (ver §12) |
| Cadastro/onboarding + multi-tenant (RLS) | ✅ Pronto | Trigger cria a org no signup |
| Produto completo (marca, imposto, preço "de", fotos, variações/grade) | ✅ Pronto | |
| Estoque (entrada, ajuste, mínimo, baixa na venda) | ✅ Pronto | |
| Venda rápida (carrinho, canal, desconto, fiado, **forma de pagamento + parcelas**) | ✅ Pronto | Boleto e parcelas no crédito |
| Revendedoras internas (comissão, meta, ranking) | ✅ Pronto | |
| **Acesso self-service das revendedoras** (login próprio, catálogo, registrar venda) | ✅ Pronto | Validado com testes de isolamento |
| Papéis (owner/vendedor/motoboy) + 4 planos | ✅ Pronto | 15/15 testes de RLS |
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
- **Webhook do MP:** definir `MP_WEBHOOK_SECRET` em produção (sem ele, a validação de
  assinatura é pulada por retrocompat — ver §13).
- **Recebimentos:** só o Mercado Pago grava entradas hoje; integração com o **Banco Inter**
  (origem `inter`) está modelada mas não conectada. A tela tem um modo "Testar o fluxo"
  para simular entradas enquanto não há banco conectado.
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
1. **Ambulante — R$ 20/mês** — entrada para vendedor de rua: estoque, vendas, lojinha + chat e
   relatórios básicos. **Sem** revendedoras, vendedores internos, motoboys/entregas nem analytics.
2. **Solo — R$ 49/mês** — só o dono, até 3 revendedoras, loja online, relatórios básicos.
3. **Equipe — R$ 99/mês** ⭐ — + vendedores internos, até 15 revendedoras, ranking, analytics, chat.
4. **Expansão — R$ 199/mês** — + motoboys/entregas, revendedoras ilimitadas, analytics avançado (tendência + ruptura).

Toda org nova nasce com **trial de 14 dias com acesso Expansão**. Os limites/permissões são
fonte única em **`lib/plans.ts`** (consumidos pelo hook `lib/usePlano.ts`) e **espelhados em
triggers/funções no banco** (enforcement real: bloqueia revendedora acima do limite, criação de
vendedor/motoboy fora do plano e criação de entrega fora do Expansão — ver §13). Pagamento pelo
**Mercado Pago**; a troca de plano efetiva acontece via webhook (RPC `mudar_plano` está revogada
para o cliente desde `0021`, e o super-admin pode trocar manualmente em `/admin`).

**Plano efetivo** (`planoEfetivo` em `lib/plans.ts` e `private.plano_efetivo` no banco):
durante o trial valem as capacidades de **Expansão**; assinatura **cancelada/inadimplente**
(`canceled`/`past_due`) cai no **piso Ambulante** (perde recursos, mas não apaga dados);
caso contrário vale o plano contratado. Downgrade é **não destrutivo** — os dados ficam e os
recursos voltam ao subir de plano. Revendedoras criadas no trial e que excedam o limite do
plano novo são bloqueadas **por posição** (só as N mais antigas operam — ver §7 e §13).

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
| `/entregas` | Entregas (dono gerencia; motoboy vê/atualiza as suas). Aba sempre visível: fora do Expansão mostra pitch de upgrade. |
| `/recebimentos` | **Caixa de recebimentos** (só dono): entradas de conta conectada (MP) para confirmar "foi venda?" → vira venda. Badge de pendentes no menu. |
| `/reposicao` | Sugestões de compra (média de venda dos últimos 30 dias; ciente de grade/variações). |
| `/conversas` | Caixa de entrada do chat da vitrine (tempo real). |
| `/analytics` | Inteligência: receita por produto, mix de canal, tendência mensal, ruptura. |
| `/relatorios` | Relatórios + exportação. |
| `/minha-loja` | **Construtor da loja online** (ver §6). |
| `/planos` | Escolha/assinatura de plano (checkout Mercado Pago). |
| `/configuracoes` | Loja, identidade, **categorias**, aparência, equipe de acesso, atalho da loja. |
| `/configuracoes/plano` | Assinatura: plano atual, status, **uso × limites**. |
| `/admin` | **Superadmin** do produto: 3 abas — **Resumo** (MRR/ARR, lojas por status, mix de planos), **Lojas** (moderar conta + trocar plano) e **Chamados** de suporte (ver §12). |
| `/perfil` | Dados do usuário logado. |

### Público / externo
| Rota | O que faz |
|---|---|
| `/` | Landing. |
| `/loja/[slug]` | **Vitrine pública** da loja: capa, navegação por abas (Início/Sobre/Contato), catálogo, filtro por categoria, chat. |
| `/acesso` | Ativação/login self-service da **revendedora** (1º acesso cria a senha). |
| `/revenda` | Painel da revendedora: catálogo + registrar venda + "minhas vendas". |

### API (server-side, service role)
| Rota | O que faz |
|---|---|
| `POST /api/membros` | Dono cria/remove login de vendedor/motoboy (valida que quem chama é owner + plano). |
| `POST /api/revendedora/ativar` | Revendedora ativa o acesso com o e-mail liberado + senha escolhida. |
| `POST /api/mercadopago/assinar` | Inicia o checkout de assinatura no Mercado Pago. |
| `POST /api/mercadopago/confirmar` | Pós-checkout: re-consulta a preapproval e aplica o plano na hora (valida que é da org do dono). |
| `POST,GET /api/mercadopago/webhook` | Notificações do MP — **preapproval** (aplica plano) e **payment** (grava recebimento). Re-consulta o ID na API do MP e valida `x-signature` (ver §13). |
| `GET /api/admin/overview` | Super-admin: agregados da plataforma (MRR/ARR, lojas, planos). Service role após checar o e-mail. |
| `POST /api/admin/plano` | Super-admin: troca manual de plano de uma loja (cortesia/suporte; sem cobrança no MP). |
| `POST /api/admin/usuario` | Super-admin: moderar conta da loja — `desativar`/`banir`/`reativar` (ban no `auth.users`) ou `deletar` (apaga org + contas). Nunca age sobre o próprio super-admin. |

---

## 6. Mini-loja / Construtor (`/minha-loja`)

A loja monta a própria página pública, com **preview ao vivo** (moldura de celular) ao lado:

- **Link** próprio: `…/loja/<slug>` (editável, copiar/abrir, ligar/desligar "No ar").
- **Identidade:** nome, **escolha de fonte** (via Google Fonts sob demanda),
  cor da marca (gera paleta 50-900), logo e **imagem de capa/banner** (topo da vitrine).
- **Sobre**, **Contato** (WhatsApp, telefone, e-mail) e **Redes sociais** (Instagram,
  Facebook, TikTok) - viram abas/links na vitrine.
- **Vitrine:** header com **navegação por abas** (Início · Sobre · Contato); o Início
  mostra a descrição curta no topo e os produtos ativos com selo de estoque ("Esgotado"
  quando zerado), resumo de quantos aparecem/ocultos/sem estoque, e filtro por categoria.

A vitrine pública (`/loja/[slug]`) consome tudo isso via uma **RPC `loja_publica`**
`SECURITY DEFINER` que devolve só campos seguros (nunca expõe a tabela `org` nem o custo).

---

## 7. Acesso das revendedoras (modelo de segurança)

Decisão de arquitetura importante: a revendedora **não recebe linha em `public.usuario`**.
Como as policies de leitura são "org-wide", dar a ela um `usuario` vazaria vendas, custos e
lucros da loja. Em vez disso:

- A revendedora é identificada por `revendedora.user_id = auth.uid()`.
- Todo o acesso dela passa por **RPCs `SECURITY DEFINER` escopadas** ao próprio login:
  - `revendedora_me()` - identidade dela + da loja (sem dados sensíveis). É o **gate** do `/acesso`.
  - `revendedora_catalogo()` - produtos ativos **sem custo**.
  - `revendedora_registrar_venda(...)` - valida estoque, calcula total/comissão, baixa estoque.
  - `revendedora_minhas_vendas()` - só as vendas dela, **sem lucro/custo**.

**Gate por plano e posição (`0025`/`0027`):** essas RPCs são o ponto único de estrangulamento,
então cada uma checa `private.revendedora_no_limite(id)`. Se o **plano efetivo** não permite
revendedoras (ex.: **Ambulante** = 0, ou assinatura cancelada → piso Ambulante), **nenhuma**
loga, lê catálogo, vê vendas ou registra venda. Quando há limite (Solo = 3, Equipe = 15),
operam apenas as **N revendedoras mais antigas** (`order by criada_em`); as demais — tipicamente
criadas no trial Expansão — ficam bloqueadas até a loja subir de plano. **Nada é apagado**: o
acesso volta sozinho ao regularizar.

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
| `org` | A loja: nome, segmento, **categorias[]**, cor/tema/fonte/**raio**, logo, **acesso** (`ativo`/`desativado`/`banido`, moderação do super-admin) e campos da vitrine (slug, ativa, descrição, **capa**, fonte, sobre, contato, redes). *(plano saiu daqui → `assinatura`)* |
| `assinatura` | Plano da loja: `plano` (inclui `ambulante`), `status`, `trial_ate`, preço, período + ganchos de pagamento (`provider*`). Fonte da verdade do plano. |
| `entrada_pendente` | Caixa de recebimentos: dinheiro caído em conta conectada (origem `mercadopago`/`inter`/`manual`), valor, forma, pagador, `status` (`pendente`/`confirmada`/`recusada`), `venda_id` (venda gerada ao confirmar). Índice único `(org_id, provider_pagamento_id)` p/ idempotência. Realtime ligado. |
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
`current_role()`, `handle_new_user()` (bootstrap de signup, ciente de anônimo/revendedora) e o
enforcement de plano: `plano_efetivo()`, `limite_revendedoras()`, `permite_revendedoras()`,
`revendedora_no_limite()`, `permite_entregas()`, `permite_papel()` e `conversa_imutavel()` (§13).

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
| `0020_loja_capa_raio` | Imagem de capa da vitrine (`loja_capa_url`) + arredondamento do painel (`app_raio`); `loja_publica` passa a devolver `capa_url`. |
| `0021_planos_seguranca` | Revoga `execute` de `mudar_plano` do cliente: plano só muda via pagamento (webhook MP) ou super-admin. |
| `0022_entrega_plano` | Enforcement real de entregas no banco: trigger barra `insert` em `entrega` fora do Expansão (`permite_entregas`). |
| `0023_plano_ambulante` | Novo plano **Ambulante** (R$ 20): `limite_revendedoras` = 0 e `mudar_plano` passa a aceitar `ambulante` (2000 centavos). |
| `0024_recebimentos` | Tabela `entrada_pendente` (caixa de recebimentos) + RLS por org + índice único de idempotência + Realtime. |
| `0025_org_acesso` | Coluna `org.acesso` (`ativo`/`desativado`/`banido`) — rótulo de moderação do super-admin (o ban real é no `auth.users`). |
| `0025_revendedora_plano` | RPCs da revendedora passam a checar `permite_revendedoras`: plano sem revendedoras (Ambulante) bloqueia login/catálogo/venda. |
| `0026_registrar_venda_owner` | RPCs atômicas `registrar_venda` (dono/vendedor) e `confirmar_entrada` (recebimento → venda, idempotente). Ver §13. |
| `0027_plano_downgrade` | `plano_efetivo`: cancelado/inadimplente cai no piso Ambulante; gate da revendedora vira **por posição** (`revendedora_no_limite`). |
| `0028_chat_hardening` | Hardening do chat público (conversa só p/ loja ativa, `org_id`/`cliente_id` imutáveis, `autor_tipo` amarrado ao papel, cap de texto) + limite de tipo/tamanho nos buckets de imagem. |

> **Numeração:** as migrations do chat foram renumeradas (`0017`–`0019`) para não colidir
> com o fluxo paralelo de aparência/chamados (`0014`/`0016`). Por isso há um **gap no `0015`** —
> inofensivo, já que o Supabase CLI ordena por nome. **Há dois arquivos `0025_*`** (`org_acesso`
> e `revendedora_plano`): são independentes e ordenados por nome, sem conflito. A ordem de
> dependência do chat (`token → criada_em → conversa_ultima_cliente`) foi preservada. Tudo já
> aplicado no banco.

---

## 10. Como rodar

```bash
npm install
cp .env.local.example .env.local   # preencher com as chaves do Supabase
npm run dev                         # http://localhost:3000
```

**Variáveis de ambiente** (`.env.local`, fora do git — ver `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - chave pública (segura no browser).
- `SUPABASE_SERVICE_ROLE_KEY` - **secreta, só no servidor** (rotas `/api`). Nunca commitar.
- **Mercado Pago:** `MP_ACCESS_TOKEN` e `MP_CLIENT_SECRET` (secretos, server-only), `MP_CLIENT_ID`,
  `NEXT_PUBLIC_MP_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL` (domínio público).
- `MP_WEBHOOK_SECRET` - segredo do webhook do MP. Se ausente, a validação de `x-signature` é
  **pulada** (retrocompat) — **defina em produção** para rejeitar notificações forjadas (§13).

Build de produção: `npm run build && npm start`.

---

## 11. Estrutura de pastas

```
app/
  (app)/                       route group com o shell persistente (sidebar/bottom nav):
                               painel, produtos, vender, revendedoras, entregas,
                               recebimentos, reposicao, conversas, analytics, relatorios,
                               minha-loja, planos, configuracoes(+/plano), perfil
  admin/                       painel do super-admin (§12)
  onboarding, login           fora do shell
  loja/[slug] (vitrine), acesso, revenda      público/externo
  api/
    membros, revendedora/ativar
    mercadopago/{assinar,confirmar,webhook}
    admin/{overview,plano,usuario}            super-admin (service role)
lib/
  store.ts        → estado global (Zustand) + acesso ao Supabase (chama as RPCs atômicas)
  types.ts        → tipos do domínio (inclui EntradaPendente/OrigemRecebimento)
  plans.ts        → fonte única de planos/limites; usePlano.ts → hook de capacidades/uso
  admin.ts        → superadmin (e-mail), WhatsApp de suporte
  analytics.ts    → métricas, reposição, formatação (brl)
  seed.ts         → segmentos, categorias padrão, dados de exemplo
  brand.ts/aparencia.ts/theme.ts → paleta/tema/fonte; fontes.ts → fontes da loja
  contato.ts      → links de WhatsApp/Instagram/etc; slug.ts → slug da loja
  permissoes.ts   → rotas/home por papel; export.ts → exportação
  imagem.ts       → validação de imagem (tipo/tamanho) antes do upload
  uploadLogo.ts / uploadProdutoImagem.ts → upload p/ os buckets lojas/produtos
  useConversasNaoLidas.ts → contador de chat não lido (badge do menu)
  useRecebimentos.ts → Realtime da caixa de recebimentos + badge + notificação
  mercadopago.ts  → integração de pagamento (preapproval + recebimentos)
  supabase/       → client.ts, server.ts, middleware.ts (sessão/proteção)
components/
  AppShell.tsx    → navegação (sidebar desktop + bottom nav mobile) + badges
  Guard.tsx       → hidratação, onboarding e bloqueio por papel
  UpgradeGate.tsx → modal/bloco de upgrade de plano
  ThemeToggle.tsx → tema claro/escuro; Reporte.tsx → abrir chamado de suporte
  charts/         → VendasArea (gráfico de vendas)
  landing/        → DashboardMock, Pricing, Faq, StickyCta (página inicial)
scripts/criar-admin.mjs → cria/reseta a conta superadmin
supabase/migrations/  → SQL versionado (§9)
```

---

## 12. Admin / superadmin (plataforma + suporte)

O AutoManager tem uma área de **plataforma** separada das lojas, para o time do produto operar
o SaaS — não é o "admin" de uma loja (esse é o `owner`). Tudo nas rotas `/api/admin/*` roda com
`service_role` (ignora RLS) **só depois** de confirmar, pelo e-mail da sessão, que quem chama é
o super-admin.

- **Quem acessa:** uma única conta, definida em `lib/admin.ts` →
  `SUPERADMIN_EMAIL = "admin@automanager.com"`. Só esse e-mail vê o item **"Admin"** no menu e
  abre `/admin`.
- **Criar a conta (uma vez):** na raiz do projeto, `node scripts/criar-admin.mjs` — cria
  `admin@automanager.com` com senha provisória **`123mudar`** (precisa do `.env.local` com
  `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Se já existir, **redefine a senha**.
- **Entrar:** `/login` com esse e-mail → o item **"Admin"** aparece. **Troque a senha** depois
  (Supabase → Authentication → Users, ou pelo perfil).

**O painel `/admin` tem 3 abas:**
- **Resumo** (`GET /api/admin/overview`): **MRR** (só assinaturas ativas pagas), **ARR** (×12),
  contagem de lojas por status (ativas/trial/canceladas) e o **mix de planos** (ativas e MRR por
  plano). A rota tolera o banco sem a coluna `org.acesso` (conta tudo como `ativo`).
- **Lojas:** lista todas as lojas (dono, plano, status, membros). Por loja o super-admin pode
  **trocar o plano** (`POST /api/admin/plano` — cortesia/suporte, sem cobrança no MP) e **moderar
  a conta** (`POST /api/admin/usuario`): `desativar`/`banir` (bane todos os logins da loja no
  `auth.users` e marca `org.acesso`), `reativar` (remove o ban) ou `deletar` (apaga a org em
  cascata + as contas de auth — **irreversível**). Trava de segurança: nunca age sobre a própria
  conta do super-admin.
- **Chamados:** suporte das lojas. Tabela `chamado` (migration `0016_chamados.sql`) com RLS que
  libera **só** o e-mail do superadmin; o lojista abre chamado pelo componente `Reporte.tsx`.

- **Trocar quem é admin:** edite `SUPERADMIN_EMAIL` em `lib/admin.ts` **e** o e-mail no RLS de
  `0016_chamados.sql` (o arquivo avisa isso no comentário).
- **Suporte ao lojista:** `lib/admin.ts` também guarda o WhatsApp de suporte
  (`SUPORTE_WHATSAPP`) usado nos CTAs de ajuda.

---

## 13. Auditoria de fluxos (Lotes 1–4) e hardening

Revisão de segurança/robustez aplicada em quatro lotes (commits `c23cd53`, `7da24a8`,
`9860d5f`, `880504e`), por gravidade. Tudo já no banco e com build verde.

**Lote 1 — críticos: atomicidade e idempotência.**
- **Venda atômica** (`0026`): o caminho do dono em `lib/store.ts` fazia vários
  `INSERT/UPDATE` soltos no cliente, sem transação — dava para "confirmar" uma venda sem nada
  gravado, venda sem itens, estoque divergente e oversell. Agora `store.ts` chama a RPC
  `registrar_venda(...)` (`SECURITY DEFINER`), que valida estoque, grava venda + itens +
  movimentos e baixa estoque de forma **relativa** (`estoque_atual = estoque_atual - qtd`) numa
  só transação. O `id` vem do cliente para casar com o update otimista.
- **Recebimento → venda idempotente** (`0026`): `confirmar_entrada(entrada, venda)` trava a
  linha (`for update`), cria a venda e marca a entrada `confirmada` juntas; se a entrada já foi
  decidida (reenvio, duplo-clique, 2ª aba), **não cria outra venda** — devolve a existente.
- **Webhook idempotente** (`0024`): `entrada_pendente` tem índice único
  `(org_id, provider_pagamento_id)` (não-parcial, para o upsert do PostgREST), então o mesmo
  pagamento do MP não entra duas vezes.

**Lote 2 — altos: enforcement de plano no banco.** A UI já mostrava o paywall, mas as regras
de `lib/plans.ts` precisavam existir **no banco** (senão eram furáveis via API direta):
entregas só no Expansão (`0022`), Ambulante com 0 revendedoras (`0023`), e o gate da
revendedora **por posição** quando o plano encolhe (`0027`, ver §7). Inclui também correção da
grade/variações na reposição e do papel/role no onboarding.

**Lote 3 — médios/segurança: hardening do chat, upload e webhook.**
- **Chat** (`0028`): visitante só cria conversa para **loja existente e ativa** (sem
  spam cross-tenant); `org_id`/`cliente_id` viram **imutáveis** (trigger) para impedir sequestro
  de conversa para outro inbox; `autor_tipo` é amarrado ao papel (cliente só `cliente`, dono só
  `loja`), com `org_id` batendo a conversa e **cap de texto** (4000 no banco, 2000 na policy).
- **Upload** (`0028` + `lib/imagem.ts`): buckets `lojas`/`produtos` limitados a
  **5 MB** e a `jpeg/png/webp/gif` (bloqueia SVG inline) — validado no cliente **e** no servidor.
- **Webhook** (`mercadopago/webhook`): valida a assinatura `x-signature` do MP (HMAC, manifesto
  `id;request-id;ts`) quando `MP_WEBHOOK_SECRET` está definido, e **re-consulta** o ID na API do
  MP antes de aplicar plano/recebimento — uma notificação forjada não ativa nada.

**Lote 4 — baixos: robustez.** Realtime mais resiliente (re-subscribe/reconexão) e **estoque
não-negativo** como defesa adicional na baixa.
