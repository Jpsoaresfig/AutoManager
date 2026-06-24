"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { aplicarAparencia, temaBaseDef } from "@/lib/aparencia";
import { Moon, Sun } from "lucide-react";

// Atalho rápido claro/escuro (preferência da sessão). Compõe com a cor da marca
// e a fonte definidas pela loja. O tema base completo fica em Configurações.
export default function ThemeToggle() {
  const config = useStore((s) => s.config);
  const [claro, setClaro] = useState(false);

  useEffect(() => {
    setClaro(temaBaseDef(config.temaBase).claro);
  }, [config.temaBase]);

  function escolher(querClaro: boolean) {
    setClaro(querClaro);
    aplicarAparencia({
      corMarca: config.corMarca,
      appFonte: config.appFonte,
      temaBase: querClaro ? "claro" : "escuro",
    });
  }

  const opcoes = [
    { claro: false, label: "Escuro", icon: Moon },
    { claro: true, label: "Claro", icon: Sun },
  ];

  return (
    <div className="flex surface-alt rounded-xl p-1 gap-1">
      {opcoes.map((o) => {
        const Icon = o.icon;
        const ativo = claro === o.claro;
        return (
          <button
            key={o.label}
            onClick={() => escolher(o.claro)}
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
