"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import Guard from "@/components/Guard";
import ThemeToggle from "@/components/ThemeToggle";
import { brl } from "@/lib/analytics";
import { Store, Mail, Palette, LogOut, BadgeCheck } from "lucide-react";

export default function PerfilPage() {
  return (
    <Guard>
      <Perfil />
    </Guard>
  );
}

function Perfil() {
  const router = useRouter();
  const { config, produtos, vendas } = useStore();
  const [email, setEmail] = useState("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function sair() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const faturamento = vendas.reduce((a, v) => a + v.total, 0);

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-muted">Conta e preferências</p>
      </header>

      {/* conta */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-brand-600 text-white grid place-items-center">
            <Store size={20} />
          </span>
          <div>
            <div className="font-semibold">{config.nomeLoja || "Minha Loja"}</div>
            <div className="text-xs text-muted capitalize">{config.segmento}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Mail size={15} /> {email || "—"}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Produtos" value={String(produtos.length)} />
          <Stat label="Vendas" value={String(vendas.length)} />
          <Stat label="Faturado" value={brl(faturamento)} />
        </div>
      </div>

      {/* tema */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Palette size={18} className="text-brand-500" /> Aparência
        </div>
        <p className="text-sm text-muted -mt-1">Escolha o tema do aplicativo.</p>
        <ThemeToggle />
      </div>

      {/* plano */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgeCheck size={18} className="text-brand-500" />
          <span className="font-semibold">
            Plano <span className="capitalize">{(config as any).plano || "free"}</span>
          </span>
        </div>
        <span className="text-xs surface-alt rounded-full px-3 py-1 text-muted">Em breve: Pro</span>
      </div>

      <button onClick={sair} className="btn-ghost w-full text-red-500">
        <LogOut size={18} /> Sair da conta
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-alt rounded-xl px-3 py-2 text-center">
      <div className="font-bold text-sm">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
