import Guard from "@/components/Guard";

// Layout PERSISTENTE das rotas autenticadas (route group "(app)", não muda a URL).
// Monta Guard/AppShell uma única vez: navegar entre as páginas do grupo só troca
// o conteúdo, sem remontar a shell nem refazer hydrate/realtime das não lidas.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <Guard>{children}</Guard>;
}
