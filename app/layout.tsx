import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TEMA_NO_FLASH } from "@/lib/theme";

export const metadata: Metadata = {
  title: "AutoManager — Gestão de Semijoias e Revendedoras",
  description: "Controle de estoque, vendas, comissão de revendedoras e reposição automática.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#db2777",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_NO_FLASH }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
