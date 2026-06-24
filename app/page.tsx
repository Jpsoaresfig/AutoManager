import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Calculator,
  Candy,
  Check,
  Gem,
  Heart,
  Settings2,
  LineChart,
  MessageCircle,
  NotebookPen,
  PlayCircle,
  Quote,
  Sparkles,
  Star,
  Store,
  Timer,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Faq from "@/components/landing/Faq";
import Pricing from "@/components/landing/Pricing";
import StickyCta from "@/components/landing/StickyCta";
import DashboardMock from "@/components/landing/DashboardMock";

export const metadata = {
  title: "AutoManager - Pare de controlar seu negócio no caderno",
  description:
    "O sistema de gestão acessível para micronegócios: doces, bijuterias, cosméticos, roupas e qualquer pequena loja. Estoque, vendas, comissões e revendedoras em um só app, configurado do seu jeito. Teste grátis, sem cartão.",
};

const COMECAR = "/login";

export default function Landing() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-strong">
      {/* ======================= NAV ======================= */}
      <header className="sticky top-0 z-30 border-b border-default bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="flex items-center gap-2 font-extrabold text-brand-500">
            <Gem size={22} className="text-brand-600" /> AutoManager
          </span>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#solucao" className="hover:text-strong">Como funciona</a>
            <a href="#planos" className="hover:text-strong">Planos</a>
            <a href="#faq" className="hover:text-strong">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login?modo=entrar" className="btn-ghost text-sm">
              Entrar
            </Link>
            <Link href={COMECAR} className="btn-primary text-sm">
              Teste grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ======================= HERO ======================= */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-20 h-72 w-72 rounded-full bg-brand-700/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 surface px-3 py-1 text-sm font-medium text-brand-500">
              <Sparkles size={15} /> Para micronegócios - doces, bijuterias, cosméticos, roupas e mais
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-strong sm:text-5xl">
              Pare de controlar seu negócio no{" "}
              <span className="relative whitespace-nowrap text-brand-600">
                caderno
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded bg-brand-500/40" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Saiba exatamente <strong className="text-strong">quanto você vende</strong>,{" "}
              <strong className="text-strong">quanto lucra</strong> e{" "}
              <strong className="text-strong">quem está te dando prejuízo</strong>. Estoque, vendas e
              comissões em um único app que você <strong className="text-strong">configura do seu
              jeito</strong> - e que cabe no bolso de micronegócio.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={COMECAR} className="btn-primary px-6 py-4 text-base">
                Começar Teste Grátis <ArrowRight size={18} />
              </Link>
              <a href="#solucao" className="btn-ghost px-6 py-4 text-base">
                <PlayCircle size={18} /> Ver Demonstração
              </a>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["Sem cartão de crédito", "Pronto em 2 minutos", "Cancela quando quiser"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={15} className="text-brand-600" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* visual */}
          <div className="relative">
            <DashboardMock />
            <span className="absolute -bottom-4 -left-4 hidden rounded-xl border border-default surface px-3 py-2 text-xs font-semibold text-strong shadow-lg sm:block">
              ✅ Venda registrada · estoque atualizado
            </span>
          </div>
        </div>
      </section>

      {/* ======================= PROVA SOCIAL (números) ======================= */}
      <section className="border-y border-default surface">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-center text-sm font-medium text-muted">
            Resultados de lojas que largaram o caderno e a planilha
          </p>
          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { n: "+1.200", l: "vendas registradas na plataforma" },
              { n: "+35%", l: "mais controle de estoque" },
              { n: "−70%", l: "de erros no cálculo de comissão" },
              { n: "+18h", l: "economizadas por mês no WhatsApp" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-3xl font-extrabold text-brand-600 sm:text-4xl">{s.n}</p>
                <p className="mt-1 text-sm text-muted">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted">
            * Médias ilustrativas com base em micronegócios na fase inicial da plataforma.
          </p>
        </div>
      </section>

      {/* ======================= DOR ======================= */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-strong sm:text-4xl">Isso acontece na sua loja?</h2>
          <p className="mt-3 text-muted">
            Se você marcar 2 ou mais, está perdendo dinheiro sem perceber.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
          {[
            "Você não sabe o que ainda tem em estoque",
            "Faz a comissão das revendedoras na calculadora",
            "Perde venda porque esqueceu de repor um produto",
            "Tem revendedora vendendo e você não sabe quanto deve pagar",
            "Controla pedido, preço e fiado tudo no WhatsApp",
            "Vende o dia todo sem saber se aquilo deu lucro",
            "Tem produto parado há meses ocupando seu dinheiro",
            "No fim do mês, não sabe pra onde foi o seu lucro",
          ].map((dor) => (
            <div key={dor} className="card flex items-start gap-3">
              <X size={18} className="mt-0.5 shrink-0 text-red-500" />
              <span className="text-strong">{dor}</span>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-semibold text-strong">
          O problema não é falta de esforço. É falta de um sistema simples que mostre os seus números.
        </p>
      </section>

      {/* ======================= SOLUÇÃO ======================= */}
      <section id="solucao" className="surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-brand-500">
              A solução
            </span>
            <h2 className="mt-2 text-3xl font-bold text-strong sm:text-4xl">
              Tudo o que sua loja precisa, em um app que você abre no celular
            </h2>
          </div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <DashboardMock />
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Boxes, t: "Estoque", d: "Atualiza sozinho a cada venda. Alerta quando algo está acabando." },
                { icon: Timer, t: "Vendas", d: "Registre no balcão ou pelo WhatsApp em 1 toque, com fiado e parcelas." },
                { icon: Users, t: "Revendedoras", d: "Cada uma com login próprio, vendendo pelo celular delas." },
                { icon: Store, t: "Loja online", d: "Uma vitrine pronta com link para mandar no Insta e no Zap." },
                { icon: Wallet, t: "Comissões", d: "Calculadas automaticamente. Você só vê quanto pagar." },
                { icon: LineChart, t: "Relatórios", d: "Lucro real por produto, por canal e por período. Sem achismo." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="rounded-2xl border border-default bg-[var(--bg)] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-3 font-semibold text-strong">{t}</h3>
                  <p className="mt-1 text-sm text-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href={COMECAR} className="btn-primary px-6 py-4 text-base">
              Quero ver tudo isso na minha loja <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ======================= DIFERENCIAL ======================= */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-strong sm:text-4xl">
            Enquanto outros sistemas só controlam estoque, o AutoManager{" "}
            <span className="text-brand-600">ajuda você a vender mais</span>.
          </h2>
          <p className="mt-4 text-muted">
            Controlar o que entra e o que sai é o mínimo. O AutoManager foi feito para o jeito que a
            sua loja realmente vende: com revendedoras, WhatsApp e cliente esperando resposta.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, t: "Revendedoras com login próprio", d: "Elas vendem pelo celular, você acompanha tudo em tempo real. Ninguém vê o número da outra." },
            { icon: Wallet, t: "Comissão automática", d: "Define o percentual uma vez. O sistema calcula a cada venda e mostra quanto pagar." },
            { icon: Store, t: "Loja online pronta", d: "Uma vitrine pública com seu link, sem precisar contratar quem faça site." },
            { icon: MessageCircle, t: "Chat integrado", d: "O cliente fala com a loja direto da vitrine. Acabou perder pedido no meio do Zap." },
            { icon: Settings2, t: "Tudo configurável do seu jeito", d: "Suas categorias, suas comissões, sua marca e suas cores. O sistema fica com a cara do seu negócio." },
            { icon: TrendingUp, t: "Foco em lucro, não em planilha", d: "O painel mostra o que dá retorno e o que só está parado te custando dinheiro." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Icon size={20} />
              </div>
              <h3 className="mt-3 font-semibold text-strong">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================= CASOS DE USO ======================= */}
      <section className="surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-strong sm:text-4xl">Feito para o seu micronegócio</h2>
            <p className="mt-3 text-muted">
              Seja qual for o que você vende, o AutoManager se molda a você. Veja alguns exemplos:
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {[
              {
                icon: Candy,
                perfil: "Doces, salgados e comida caseira",
                dor: "Anota encomenda no Zap e calcula o preço de cabeça.",
                uso: "Cadastra cada item com custo e preço, controla encomendas e vê quanto realmente sobra em cada venda.",
              },
              {
                icon: Gem,
                perfil: "Semijoias e bijuterias",
                dor: "Centenas de peças parecidas e revendedoras espalhadas.",
                uso: "Controla cada modelo com foto e variação, sabe o que gira e calcula a comissão de cada revendedora sem erro.",
              },
              {
                icon: Heart,
                perfil: "Cosméticos e perfumaria",
                dor: "Produto com validade e reposição constante.",
                uso: "Alerta de estoque mínimo para nunca ficar sem o que mais vende e relatório do que realmente dá margem.",
              },
              {
                icon: Store,
                perfil: "Roupas, acessórios e revendedoras",
                dor: "Grade de tamanho/cor e gente vendendo por você sem controle.",
                uso: "Cadastro com grade (P/M/G e cores), vitrine online e cada revendedora registrando a própria venda pelo celular.",
              },
            ].map(({ icon: Icon, perfil, dor, uso }) => (
              <div key={perfil} className="card flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-strong">{perfil}</h3>
                  <p className="mt-1 text-sm text-muted">
                    <strong className="text-strong">Antes:</strong> {dor}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    <strong className="text-brand-600">Com o AutoManager:</strong> {uso}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
            Papelaria, pet shop, artesanato, loja de festa, mercadinho… <strong className="text-strong">qualquer
            micronegócio</strong>. Você cria as suas categorias e deixa o sistema com a cara do seu negócio.
          </p>
        </div>
      </section>

      {/* ======================= DEPOIMENTOS ======================= */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-strong sm:text-4xl">Quem largou o caderno não volta</h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            {
              nome: "Aline R.",
              loja: "Semijoias · Goiânia",
              txt: "Eu pagava comissão errada e nem sabia. No primeiro mês descobri que estava perdendo quase R$ 400. Hoje o sistema calcula tudo sozinho.",
            },
            {
              nome: "Patrícia M.",
              loja: "Cosméticos · Sorocaba",
              txt: "Parei de anotar venda no caderno e no Zap. Minhas 4 revendedoras registram pelo celular e eu vejo tudo num lugar só.",
            },
            {
              nome: "Camila S.",
              loja: "Moda feminina · Recife",
              txt: "Eu não sabia quais peças davam lucro. Agora vejo o relatório e compro só o que gira. Estoque parado caiu muito.",
            },
          ].map((d) => (
            <div key={d.nome} className="card flex flex-col">
              <Quote size={24} className="text-brand-500/40" />
              <p className="mt-2 flex-1 text-sm text-strong">{d.txt}</p>
              <div className="mt-4 flex items-center gap-1 text-brand-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-brand-500 text-brand-500" />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10 font-bold text-brand-600">
                  {d.nome[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-strong">{d.nome}</p>
                  <p className="text-xs text-muted">{d.loja}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Depoimentos ilustrativos representando casos típicos de uso na fase inicial.
        </p>
      </section>

      {/* ======================= PLANOS ======================= */}
      <section id="planos" className="surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-strong sm:text-4xl">
              Preço de micronegócio, não de sistema caro
            </h2>
            <p className="mt-3 text-muted">
              A partir de R$49/mês. Comece grátis e só escolha um plano quando já estiver vendo o resultado.
            </p>
          </div>
          <div className="mt-10">
            <Pricing />
          </div>
        </div>
      </section>

      {/* ======================= FAQ ======================= */}
      <section id="faq" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-strong sm:text-4xl">Ainda com dúvida? Respondemos.</h2>
          <p className="mt-3 text-muted">As perguntas que toda dona de loja faz antes de começar.</p>
        </div>
        <Faq />
        <div className="mt-8 text-center text-sm text-muted">
          Ficou outra dúvida?{" "}
          <a
            href="https://wa.me/?text=Tenho%20uma%20d%C3%BAvida%20sobre%20o%20AutoManager"
            className="font-semibold text-brand-500 hover:underline"
          >
            Fale com a gente no WhatsApp
          </a>
        </div>
      </section>

      {/* ======================= CTA FINAL ======================= */}
      <section className="px-5 pb-24 pt-4 sm:pb-20">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-center text-white sm:p-12">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            O caderno é grátis. Mas ele está te custando caro.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-brand-50">
            Cada comissão paga errada, cada produto parado e cada venda perdida por falta de
            reposição custam, todo mês, muito mais que uma mensalidade. A diferença é que esse
            prejuízo você não vê - até começar a medir.
          </p>

          <div className="mx-auto mt-8 grid max-w-md gap-3 text-left">
            {[
              { icon: NotebookPen, t: "Continuar no caderno", custo: "Prejuízo invisível todo mês", ruim: true },
              { icon: Calculator, t: "Comissão na calculadora", custo: "Erro que sai do seu bolso", ruim: true },
              { icon: BadgeCheck, t: "Começar no AutoManager", custo: "Grátis para testar · R$ 49/mês depois", ruim: false },
            ].map(({ icon: Icon, t, custo, ruim }) => (
              <div
                key={t}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  ruim ? "bg-white/10" : "bg-white text-brand-700"
                }`}
              >
                <Icon size={20} className={ruim ? "text-brand-100" : "text-brand-600"} />
                <div>
                  <p className={`font-semibold ${ruim ? "text-white" : "text-brand-800"}`}>{t}</p>
                  <p className={`text-sm ${ruim ? "text-brand-100" : "text-brand-600"}`}>{custo}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={COMECAR}
              className="btn inline-flex bg-white px-7 py-4 text-base font-bold text-brand-700 hover:bg-brand-50"
            >
              Começar Teste Grátis <ArrowRight size={18} />
            </Link>
            <a
              href="https://wa.me/?text=Quero%20organizar%20minha%20loja%20com%20o%20AutoManager"
              className="btn inline-flex border border-white/40 px-7 py-4 text-base font-semibold text-white hover:bg-white/10"
            >
              <MessageCircle size={18} /> Tirar dúvida no WhatsApp
            </a>
          </div>
          <p className="mt-4 text-sm text-brand-100">
            Sem cartão · pronto em 2 minutos · cancela quando quiser
          </p>
        </div>
      </section>

      {/* ======================= FOOTER ======================= */}
      <footer className="border-t border-default py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted sm:flex-row">
          <span className="flex items-center gap-2 font-semibold text-brand-500">
            <Gem size={16} /> AutoManager
          </span>
          <span className="text-center">
            Estoque, vendas, comissões e revendedoras para a sua loja - em um só lugar.
          </span>
          <div className="flex gap-4">
            <a href="#planos" className="hover:text-strong">Planos</a>
            <a href="#faq" className="hover:text-strong">Dúvidas</a>
            <Link href="/login?modo=entrar" className="hover:text-strong">Entrar</Link>
          </div>
        </div>
      </footer>

      <StickyCta />
    </main>
  );
}
