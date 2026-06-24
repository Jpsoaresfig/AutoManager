"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { aplicarCorMarca } from "@/lib/brand";
import { homeDe, podeAcessar } from "@/lib/permissoes";
import AppShell from "./AppShell";

export default function Guard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const ready = useStore((s) => s.ready);
  const hydrate = useStore((s) => s.hydrate);
  const completo = useStore((s) => s.config.onboardingCompleto);
  const corMarca = useStore((s) => s.config.corMarca);
  const role = useStore((s) => s.role);

  useEffect(() => {
    if (!ready) hydrate();
  }, [ready, hydrate]);

  useEffect(() => {
    aplicarCorMarca(corMarca);
  }, [corMarca]);

  useEffect(() => {
    if (!ready) return;
    // só o dono passa pelo onboarding; membros já entram numa loja pronta
    if (!completo && role === "owner") {
      router.replace("/onboarding");
      return;
    }
    // bloqueia rota fora do papel
    if (!podeAcessar(role, path)) router.replace(homeDe(role));
  }, [ready, completo, role, path, router]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-brand-600">
        <div className="animate-pulse font-semibold">Carregando…</div>
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
