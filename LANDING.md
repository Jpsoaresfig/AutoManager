# AutoManager - Landing Page de Alta Conversão

> Documento de estratégia + copy + especificação de implementação.
> Página implementada em `app/page.tsx` (Next.js 14 / App Router / Tailwind / lucide-react).

> **Estado da implementação (2026-06-27):** a landing foi reconstruída em padrão premium
> (dark **auto-contido**, hero **vivo**, scroll storytelling). Componentes atuais em
> `components/landing/`: **`LiveDashboard`** (demonstração viva — substitui o `DashboardMock`
> estático, que segue no repo como legado), **`Reveal`** (scroll-reveal por IntersectionObserver),
> `Pricing`, `Faq` (aceita lista curada de objeções) e `StickyCta`. A estratégia/copy abaixo
> continua válida. Resumo técnico em `DOCUMENTACAO.md` §15.

---

## 0. Princípio que guia tudo

A persona NÃO é "lojista". É a **Aline**: dona de um micronegócio (doces, bijuterias, cosméticos,
semijoias, roupas - tanto faz), vende sozinha ou com 2-5 ajudantes/revendedoras, controla tudo no
caderno + WhatsApp + calculadora, desconfia de "sistema" porque acha que é difícil e **caro demais
para o tamanho dela**. Ela não quer software. Ela quer **parar de perder dinheiro e tempo** - e
poder deixar o sistema com a cara do negócio dela. Por isso a copy bate em duas teclas extras:
**preço de micronegócio** e **tudo configurável do seu jeito**.

Regra de ouro da copy: **falar de dinheiro e de WhatsApp, nunca de "tecnologia"**. Cada seção
responde a uma pergunta da Aline, na ordem em que ela pensa:
`Isso é pra mim? → Eu tenho esse problema? → Como resolve? → É melhor que o resto? → Quanto custa? → E se der errado? → Por que agora?`

---

## 1. Estrutura completa da landing (ordem das seções)

| # | Seção | Função psicológica | Pergunta da Aline que responde |
|---|---|---|---|
| 1 | **Nav fixa** | Acesso + CTA sempre visível | "Como entro?" |
| 2 | **Hero** | Promessa + identificação | "Isso é pra mim?" |
| 3 | **Prova social (números)** | Credibilidade imediata | "Funciona mesmo?" |
| 4 | **Dor ("Isso acontece na sua loja?")** | Espelho / agitação | "Esse é o MEU problema" |
| 5 | **Solução (6 módulos + mock)** | Mecanismo | "Como isso resolve?" |
| 6 | **Diferencial** | Posicionamento vs concorrente | "Por que não o Bling/planilha?" |
| 7 | **Casos de uso** | Auto-encaixe por nicho | "Serve pro meu tipo de loja?" |
| 8 | **Depoimentos** | Prova social humana | "Outras como eu usam?" |
| 9 | **Planos** | Oferta + âncora + upsell | "Cabe no meu bolso?" |
| 10 | **FAQ (22 objeções)** | Remoção de risco | "E se...?" |
| 11 | **CTA final (custo de não agir)** | Urgência / inversão de risco | "Por que agora?" |
| 12 | **Footer** | Fechamento | - |
| ➕ | **Sticky CTA mobile** | Captura o impulso a qualquer hora | - |

Lógica: **dor antes de solução, prova antes de preço, objeções logo antes do CTA final.**
O preço aparece só depois de a Aline já estar convencida do valor.

---

## 2. HERO - 10 opções de título

> A versão implementada usa a **Opção 1** (mais visceral e específica da persona).
> As outras ficam aqui para **teste A/B**.

1. **Pare de controlar sua loja no caderno.** ← *(implementada)*
2. Saiba exatamente quanto você vende, quanto lucra e quem está te dando prejuízo.
3. Controle estoque, vendas e revendedoras em um único aplicativo.
4. Sua loja vende todo dia. Mas você sabe quanto realmente sobra?
5. O caderno não mente - ele só esconde quanto você está perdendo.
6. Chega de calcular comissão na calculadora e perder venda no WhatsApp.
7. Organize estoque, vendas e revendedoras em 2 minutos, direto do celular.
8. Transforme o caos do caderno e do Zap em lucro que você consegue enxergar.
9. Você trabalha demais pra continuar lucrando no escuro.
10. Tudo da sua loja em um app: estoque, vendas, comissão e vitrine online.

**Critério de escolha:** título 1 vence porque nomeia o inimigo concreto (o caderno) que a persona
reconhece na hora. Título 2 é o melhor "segundo" - racional, ótimo para público mais analítico.

### Subtítulo - versões

- *(implementada)* "Saiba exatamente **quanto você vende, quanto lucra e quem está te dando
  prejuízo**. Estoque, vendas e comissão de revendedoras em um único app - sem planilha, sem
  calculadora."
- "Mais vendas. Menos bagunça. Menos tempo perdido no WhatsApp."
- "Estoque, comissão e vitrine online em um lugar só. Pronto em 2 minutos, direto do celular."
- "Pare de adivinhar seus números. Comece a vê-los - e a vender com base neles."

---

## 3. Wireframe seção por seção (mobile-first)

Notação: `▢` bloco, `[btn]` botão, `◈` ícone, `▤` mock visual.

```
┌─ NAV (sticky) ──────────────────────────────┐
│ ◈ AutoManager      [Entrar] [Teste grátis]  │
└─────────────────────────────────────────────┘

┌─ HERO ──────────────────────────────────────┐
│ ◈ badge "Feito para semijoias..."           │
│ H1: Pare de controlar sua loja no CADERNO   │
│ P: quanto vende / lucra / prejuízo          │
│ [Começar Teste Grátis →] [▷ Ver Demonstração]│
│ ✓ sem cartão  ✓ 2 min  ✓ cancela quando quer │
│ ▤ DashboardMock (faturamento, gráfico, kpis) │
└─────────────────────────────────────────────┘

┌─ PROVA (números) ───────────────────────────┐
│ +1.200 │ +35% │ −70% │ +18h                 │
└─────────────────────────────────────────────┘

┌─ DOR "Isso acontece na sua loja?" ──────────┐
│ ✗ não sabe estoque   ✗ comissão na calc.    │
│ ✗ esquece de repor   ✗ revendedora sem ctrl │
│ ✗ tudo no WhatsApp   ✗ vende sem saber lucro│
│ "Não é falta de esforço. É falta de sistema"│
└─────────────────────────────────────────────┘

┌─ SOLUÇÃO ───────────────────────────────────┐
│ ▤ DashboardMock │ ◈Estoque ◈Vendas ◈Revend. │
│                 │ ◈Loja   ◈Comissão ◈Relat. │
│              [Quero ver na minha loja →]      │
└─────────────────────────────────────────────┘

┌─ DIFERENCIAL ───────────────────────────────┐
│ "Outros controlam estoque. AutoManager faz   │
│  você VENDER MAIS"                            │
│ ◈login revend. ◈comissão auto ◈loja online   │
│ ◈chat ◈equipe/entregas ◈foco em lucro        │
└─────────────────────────────────────────────┘

┌─ CASOS DE USO ──────────────────────────────┐
│ [Semijoias] [Cosméticos]                     │
│ [Roupas]    [Revendedora]   (antes → depois) │
└─────────────────────────────────────────────┘

┌─ DEPOIMENTOS ───────────────────────────────┐
│ “...” Aline │ “...” Patrícia │ “...” Camila  │
└─────────────────────────────────────────────┘

┌─ PLANOS ────────────────────────────────────┐
│ (toggle mensal/anual)                        │
│ SOLO 49 │ ★EQUIPE 99│ EXPANSÃO 199          │
│ tabela de comparação (11 linhas)             │
└─────────────────────────────────────────────┘

┌─ FAQ (22 acordeões) ────────────────────────┐
┌─ CTA FINAL (gradiente) ─────────────────────┐
│ "O caderno é grátis. Mas custa caro."        │
│ caderno=prejuízo │ calc=erro │ AutoManager=ok│
│ [Começar Teste Grátis] [WhatsApp]            │
└─ FOOTER ────────────────────────────────────┘
▣ STICKY CTA (mobile, aparece após 700px scroll)
```

---

## 4. Componentes React (implementados)

| Arquivo | Tipo | Responsabilidade |
|---|---|---|
| `app/page.tsx` | Server Component | Monta todas as seções estáticas (SEO + carregamento rápido) |
| `components/landing/DashboardMock.tsx` | Server | Mock visual do painel (hero + solução) |
| `components/landing/Pricing.tsx` | **Client** | Toggle mensal/anual + cards + tabela de comparação |
| `components/landing/Faq.tsx` | **Client** | Acordeão de 22 objeções (1 aberta por vez) |
| `components/landing/StickyCta.tsx` | **Client** | Barra fixa de CTA no mobile (aparece no scroll) |

**Decisão de arquitetura:** tudo o que é texto/SEO fica em Server Component (renderiza no servidor,
ótimo para Google e tempo de carregamento). Só o que precisa de estado (`useState`, scroll) virou
Client Component, isolado em arquivos pequenos. Reaproveita o design system existente
(`.btn-primary`, `.btn-ghost`, `.card`, `.surface`, cores `brand-*`, tokens `--bg/--text/--border`).

Sugestões de evolução (não implementadas, opcionais):
- `<Counter />` animado nos números da prova social (anima ao entrar na viewport).
- `<DemoModal />` com vídeo curto para o CTA "Ver Demonstração".
- Trocar `DashboardMock` por screenshot real do app quando houver.

---

## 5. Hierarquia visual

- **1 só CTA primário** em rosa cheio (`btn-primary`) por dobra. Secundário sempre "fantasma"
  (`btn-ghost`) para não competir. O olho nunca tem dúvida de onde clicar.
- **Escala tipográfica:** H1 `text-5xl/extrabold` → H2 de seção `text-4xl/bold` → corpo
  `text-lg/muted`. Contraste forte entre `text-strong` e `text-muted` cria ritmo de leitura.
- **Cor como semáforo:** rosa (`brand`) = ação/positivo; vermelho = dor (`X` na seção de dor);
  branco sobre gradiente rosa = clímax (CTA final).
- **Respiro:** `py-16 sm:py-20` entre seções, `max-w-6xl` central, cards `rounded-2xl`. Muito espaço
  em branco (estilo Notion/Shopify) = sensação de produto premium e confiável.
- **Alternância de fundo:** seções alternam `bg-[var(--bg)]` e `.surface` para separar blocos sem
  precisar de bordas - guia o scroll.
- **Plano EQUIPE destacado:** elevado (`-mt-3`), com `ring` rosa e badge "⭐ MAIS VENDIDO" - âncora
  visual que direciona o olhar para o plano-alvo.

---

## 6. Elementos de conversão

1. **CTA repetido 6×** ao longo da página (nav, hero, solução, planos ×3, FAQ, CTA final) - a
   pessoa pode decidir em qualquer ponto.
2. **Sticky CTA mobile** - captura o impulso sem obrigar a rolar de volta ao topo.
3. **Microcopy de remoção de risco** colada em todo CTA: "sem cartão · 2 min · cancela quando quiser".
4. **Trust badges** no hero (3 garantias) - derrubam objeção antes de ela surgir.
5. **Prova social em números** logo após o hero (credibilidade antes da dor).
6. **Toggle anual com "2 meses grátis"** - âncora de preço + incentivo ao plano mais lucrativo.
7. **Tabela de comparação** - facilita a decisão e empurra para o EQUIPE.
8. **FAQ extenso (22)** - cada objeção respondida é um motivo a menos para não assinar.
9. **CTA final com inversão de custo** - reposiciona "não agir" como a opção cara.
10. **Canal WhatsApp** como CTA terciário - atende quem precisa de contato humano antes de decidir.

---

## 7. Gatilhos mentais utilizados

| Gatilho | Onde aparece |
|---|---|
| **Identificação / espelho** | Seção de dor ("Isso acontece na sua loja?") |
| **Dor → solução (PAS)** | Estrutura geral: agita a dor antes de apresentar a cura |
| **Prova social** | Números (+1.200 vendas) + depoimentos com nome/cidade |
| **Autoridade / especificidade** | Números exatos (−70%, +18h) em vez de "muito/pouco" |
| **Aversão à perda** | CTA final: "o caderno está te custando caro" |
| **Ancoragem** | EXPANSÃO 199 ancora o EQUIPE 99 como "razoável" |
| **Efeito chamariz (decoy)** | 3 planos com EQUIPE como alvo óbvio |
| **Inversão de risco** | "Sem cartão · cancela quando quiser" repetido |
| **Compromisso gradual** | Teste grátis → 4 perguntas → primeira venda |
| **Pertencimento** | "Quem largou o caderno não volta" / "feito pra revendedora" |
| **Simplicidade / esforço baixo** | "Pronto em 2 minutos", "se usa WhatsApp, usa AutoManager" |
| **Escassez (suave)** | Pode-se ativar "vagas para os primeiros usuários" se for verdade |

---

## 8. Melhorias para aumentar conversão (roadmap de CRO)

**Rápidas (alto impacto / baixo esforço):**
- A/B test do H1 (opção 1 vs 2) - maior alavanca isolada da página.
- Números animados (contador) ao entrar na viewport - aumenta percepção de prova.
- Screenshot/vídeo real do app no lugar do mock assim que possível (autenticidade > ilustração).
- Adicionar foto real (mesmo que de banco) nos depoimentos - rostos elevam confiança.

**Médias:**
- Calculadora interativa "Quanto você perde com comissão errada?" → resultado vira o CTA.
- Selo/garantia explícita ("7 dias grátis, sem compromisso") com ícone de escudo.
- Exit-intent no desktop oferecendo a demonstração por WhatsApp.
- Prova social dinâmica ("X lojas começaram esta semana") quando houver volume real.

**Estruturais:**
- Instrumentar funil (view → clique CTA → signup → ativação) com analytics/heatmap.
- Landing dedicada por nicho (`/semijoias`, `/cosmeticos`) com copy e casos específicos - sobe muito
  o match de mensagem para tráfego pago segmentado.
- Onboarding com "primeira venda em 5 min" como meta de ativação (o gargalo real de SaaS é ativar,
  não cadastrar).

> ⚠️ **Compliance:** os números (+1.200, +35%...) e depoimentos estão marcados como *ilustrativos*
> no rodapé de cada seção. Substitua por dados reais antes de tráfego pago - claim falso derruba
> confiança e gera risco legal. A honestidade aqui **aumenta** conversão a médio prazo.
