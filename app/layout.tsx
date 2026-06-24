import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APARENCIA_NO_FLASH } from "@/lib/aparencia";

export const metadata: Metadata = {
  title: "AutoManager - Gestão simples para o seu micronegócio",
  description:
    "Controle de estoque, vendas, comissões e revendedoras para micronegócios: doces, bijuterias, cosméticos, roupas e muito mais. Configure do seu jeito. A partir de R$49/mês.",
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
        <script dangerouslySetInnerHTML={{ __html: APARENCIA_NO_FLASH }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
