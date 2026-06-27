"use client";
import { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { aplicarAparencia, aplicarFavicon } from "@/lib/aparencia";
import { homeDe, podeAcessar } from "@/lib/permissoes";
import AppShell from "./AppShell";
import { Skeleton, SkeletonMetrics, SkeletonList } from "./Skeleton";

// Sinaliza que já existe um Guard/AppShell montado acima (layout persistente).
// Assim o <Guard> que cada página ainda usa vira passthrough e não remonta a shell.
const GuardMontado = createContext(false);

export default function Guard({ children }: { children: React.ReactNode }) {
  const jaMontado = useContext(GuardMontado);
  const router = useRouter();
  const path = usePathname();
  const ready = useStore((s) => s.ready);
  const hydrate = useStore((s) => s.hydrate);
  const completo = useStore((s) => s.config.onboardingCompleto);
  const corMarca = useStore((s) => s.config.corMarca);
  const temaBase = useStore((s) => s.config.temaBase);
  const appFonte = useStore((s) => s.config.appFonte);
  const appRaio = useStore((s) => s.config.appRaio);
  const logoUrl = useStore((s) => s.config.logoUrl);
  const nomeLoja = useStore((s) => s.config.nomeLoja);
  const role = useStore((s) => s.role);
  const semOrg = useStore((s) => s.semOrg);
  const suspenso = useStore((s) => s.suspenso);

  useEffect(() => {
    if (jaMontado) return;
    if (!ready) hydrate();
  }, [jaMontado, ready, hydrate]);

  useEffect(() => {
    if (jaMontado) return;
    aplicarAparencia({ corMarca, temaBase, appFonte, appRaio });
  }, [jaMontado, corMarca, temaBase, appFonte, appRaio]);

  // ícone da aba (favicon) = logo da loja; troca sozinho quando o dono muda a logo
  useEffect(() => {
    if (jaMontado) return;
    aplicarFavicon(logoUrl, nomeLoja || null);
  }, [jaMontado, logoUrl, nomeLoja]);

  useEffect(() => {
    if (jaMontado || !ready) return;
    // loja suspensa/banida (C-2): não redireciona — mostra aviso abaixo.
    if (suspenso) return;
    // autenticado mas sem loja própria (revendedora/visitante que caiu no painel):
    // não pertence ao painel do dono — manda para o acesso da revendedora.
    if (semOrg) {
      router.replace("/acesso");
      return;
    }
    // só o dono passa pelo onboarding; membros já entram numa loja pronta
    if (!completo && role === "owner") {
      router.replace("/onboarding");
      return;
    }
    // bloqueia rota fora do papel
    if (!podeAcessar(role, path)) router.replace(homeDe(role));
  }, [jaMontado, ready, completo, role, path, router, semOrg, suspenso]);

  // Já há um Guard/AppShell acima (no layout) -> não duplica, só repassa.
  if (jaMontado) return suspenso ? <ContaSuspensa /> : <>{children}</>;

  // continua abaixo: estados de loading / shell

  if (!ready) return <AppLoadingSkeleton />;

  if (suspenso) return <ContaSuspensa />;

  return (
    <GuardMontado.Provider value={true}>
      <AppShell>{children}</AppShell>
    </GuardMontado.Provider>
  );
}

// Aviso de conta suspensa/banida (C-2): a org não é mais legível na camada de
// dados. Não há dados a mostrar — só a orientação de contato.
function ContaSuspensa() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="surface border border-default rounded-2xl max-w-md w-full p-6 text-center space-y-3">
        <h1 className="text-xl font-bold">Conta suspensa</h1>
        <p className="text-sm text-muted">
          O acesso a esta loja está temporariamente bloqueado. Se você acredita que isso é um
          engano, entre em contato com o suporte para regularizar a situação.
        </p>
      </div>
    </div>
  );
}

// Skeleton da aplicação inteira (sidebar + conteúdo) enquanto hidrata — mantém
// o layout estável e transmite carregamento premium, sem spinner solto.
function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 surface border-r border-default p-4 gap-2">
        <div className="flex items-center gap-2 px-2 py-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mt-2 space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </aside>
      <div className="flex-1 md:pl-60">
        <main className="max-w-3xl mx-auto px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <SkeletonMetrics count={4} />
          <SkeletonList count={3} />
        </main>
      </div>
    </div>
  );
}
