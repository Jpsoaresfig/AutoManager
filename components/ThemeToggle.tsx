"use client";
import { useEffect, useState } from "react";
import { getTema, applyTema, type Tema } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("escuro");

  useEffect(() => {
    setTema(getTema());
  }, []);

  function escolher(t: Tema) {
    setTema(t);
    applyTema(t);
  }

  const opcoes: { id: Tema; label: string; icon: typeof Moon }[] = [
    { id: "escuro", label: "Escuro", icon: Moon },
    { id: "claro", label: "Claro", icon: Sun },
  ];

  return (
    <div className="flex surface-alt rounded-xl p-1 gap-1">
      {opcoes.map((o) => {
        const Icon = o.icon;
        const ativo = tema === o.id;
        return (
          <button
            key={o.id}
            onClick={() => escolher(o.id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              ativo ? "surface shadow text-strong" : "text-muted"
            }`}
          >
            <Icon size={16} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}
