"use client";
import { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { aplicarAparencia } from "@/lib/aparencia";
import { homeDe, podeAcessar } from "@/lib/permissoes";
import AppShell from "./AppShell";

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
  const role = useStore((s) => s.role);

  useEffect(() => {
    if (jaMontado) return;
    if (!ready) hydrate();
  }, [jaMontado, ready, hydrate]);

  useEffect(() => {
    if (jaMontado) return;
    aplicarAparencia({ corMarca, temaBase, appFonte, appRaio });
  }, [jaMontado, corMarca, temaBase, appFonte, appRaio]);

  useEffect(() => {
    if (jaMontado || !ready) return;
    // só o dono passa pelo onboarding; membros já entram numa loja pronta
    if (!completo && role === "owner") {
      router.replace("/onboarding");
      return;
    }
    // bloqueia rota fora do papel
    if (!podeAcessar(role, path)) router.replace(homeDe(role));
  }, [jaMontado, ready, completo, role, path, router]);

  // Já há um Guard/AppShell acima (no layout) -> não duplica, só repassa.
  if (jaMontado) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-brand-600">
        <div className="animate-pulse font-semibold">Carregando…</div>
      </div>
    );
  }
  return (
    <GuardMontado.Provider value={true}>
      <AppShell>{children}</AppShell>
    </GuardMontado.Provider>
  );
}
