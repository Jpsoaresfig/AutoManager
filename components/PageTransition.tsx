"use client";
import { usePathname } from "next/navigation";

// Transição suave entre rotas: re-dispara o fade+slide a cada mudança de URL.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div key={path} className="page-enter">
      {children}
    </div>
  );
}
