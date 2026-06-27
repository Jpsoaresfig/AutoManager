# 💎 AutoManager

SaaS de gestão para **micronegócios brasileiros** (doces, bijuterias, semijoias, cosméticos,
roupas, papelaria, artesanato e qualquer pequena loja). Estoque, vendas em 1 toque, comissão
automática de revendedoras, financeiro (a receber/a pagar), vitrine pública com chat e
relatórios de lucro real. PWA mobile-first com **dados na nuvem (Supabase)**, isolados por loja
via RLS. Documentação completa do sistema em **`DOCUMENTACAO.md`**.

## Rodar localmente

```bash
npm install
cp .env.local.example .env.local   # já preenchido com o projeto AutoManager
npm run dev
# abre http://localhost:3000
```

> `.env.local` contém apenas a **chave pública (publishable)** do Supabase - segura no browser.
> Nunca coloque a `service_role`/secret aqui.

## Autenticação e multi-tenant

- Cada conta (`auth.users`) recebe automaticamente uma **org** (loja) via trigger `on_auth_user_created`.
- Todos os dados (produtos, vendas, revendedoras, estoque) são isolados por org com **RLS**.
- Funções `SECURITY DEFINER` ficam no schema `private` (fora da Data API). Advisors de segurança: **limpos**.
- Confirmação de e-mail está **desligada** (`mailer_autoconfirm`) para o cadastro entrar em 2 minutos.

Build de produção:

```bash
npm run build && npm start
```

## Como usar (fluxo de demo)

0. **Criar conta** em `/login` (e-mail + senha, entra na hora).
1. **Onboarding** (< 2 min) - escolha "começar com exemplos" para já ter catálogo + 3 revendedoras.
2. **Vender** - toque no botão central, selecione produtos, escolha canal/revendedora, registre.
3. **Painel** - faturamento, lucro, comissão pendente, ranking e gráfico.
4. **Repor** - sugestões automáticas do que comprar (média de venda dos últimos 30 dias).
5. **Equipe** - comissão pendente por revendedora + botão "pagar" e link de WhatsApp.

> Cada conta tem seus próprios dados (isolados por RLS). Para começar do zero, crie outra conta.

## Arquitetura

| Camada | Stack |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind + lucide + recharts |
| Auth/sessão | `@supabase/ssr` (cookies) + `middleware.ts` (refresh + proteção de rotas) |
| Dados | Supabase Postgres - `lib/store.ts` (Zustand write-through) lê/grava via `supabase-js` |
| Lógica de negócio | `lib/store.ts` (estoque/comissão) + `lib/analytics.ts` (reposição/métricas) |
| Schema | `supabase/migrations/0001_init.sql` (multi-tenant + RLS + trigger de bootstrap) |

### Estrutura
```
app/
  onboarding/   → auto-configuração
  painel/       → dashboard executivo
  produtos/     → estoque (cadastro, entrada, ajuste)
  vender/       → venda rápida (carrinho + comissão)
  revendedoras/ → comissão por revendedora
  reposicao/    → sugestões de compra
lib/            → tipos, store, seed, analytics
components/     → AppShell (nav), Guard (hidratação/onboarding)
supabase/       → migration SQL de produção
```

## Reaplicar o schema em outro projeto Supabase

1. Crie o projeto e rode `supabase/migrations/0001_init.sql` (SQL Editor ou CLI).
2. Em **Auth → Providers → Email**, ligue *autoconfirm* (ou configure SMTP).
3. Preencha `.env.local` com a URL e a chave publishable do novo projeto.

## Modelo de monetização (resumo)

- **Free**: até 20 produtos, sem revendedoras (isca de TikTok).
- **Pro - R$ 49/mês** ⭐: ilimitado + revendedoras + comissão + reposição.
- **Loja+ - R$ 99/mês**: multiusuário + relatórios (ancoragem).

Meta: 10 clientes em 72h via DM manual no Instagram/grupos de Facebook do nicho.
