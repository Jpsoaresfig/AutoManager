"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { usePlano } from "@/lib/usePlano";
import Guard from "@/components/Guard";
import { useDialog } from "@/components/Dialog";
import ThemeToggle from "@/components/ThemeToggle";
import CountUp from "@/components/CountUp";
import { Skeleton } from "@/components/Skeleton";
import { brl } from "@/lib/analytics";
import { Store, Mail, Palette, LogOut, BadgeCheck, ChevronRight } from "lucide-react";

export default function PerfilPage() {
  return (
    <Guard>
      <Perfil />
    </Guard>
  );
}

function Perfil() {
  const router = useRouter();
  const { config, produtos, vendas, role } = useStore();
  const { confirm } = useDialog();
  const dono = role === "owner";
  const [email, setEmail] = useState("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function sair() {
    const ok = await confirm({
      titulo: "Sair da conta?",
      mensagem: "Você precisará entrar de novo com seu e-mail e senha.",
      confirmar: "Sair",
      perigo: true,
    });
    if (!ok) return;
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
          <Mail size={15} /> {email ? email : <Skeleton className="h-4 w-40" />}
        </div>
        {/* números do negócio só para o dono (motoboy/vendedor não veem faturamento) */}
        {dono && (
          <div className="grid grid-cols-3 gap-2 pt-1 stagger">
            <Stat label="Produtos" value={<CountUp value={produtos.length} />} />
            <Stat label="Vendas" value={<CountUp value={vendas.length} />} />
            <Stat label="Faturado" value={<CountUp value={faturamento} format={brl} />} />
          </div>
        )}
      </div>

      {/* tema */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Palette size={18} className="text-brand-500" /> Aparência
        </div>
        <p className="text-sm text-muted -mt-1">Escolha o tema do aplicativo.</p>
        <ThemeToggle />
      </div>

      {/* plano - só o dono gerencia assinatura */}
      {dono && <PlanoLinha />}

      <button onClick={sair} className="btn-ghost w-full text-red-500">
        <LogOut size={18} /> Sair da conta
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface-alt rounded-xl px-3 py-2.5 text-center">
      <div className="font-bold text-base truncate">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

function PlanoLinha() {
  const role = useStore((s) => s.role);
  const { defContratado, emTrial, diasTrial } = usePlano();
  const conteudo = (
    <>
      <div className="flex items-center gap-2">
        <BadgeCheck size={18} className="text-brand-500" />
        <span className="font-semibold">Plano {defContratado.nome}</span>
        {emTrial && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-600 text-white">Trial · {diasTrial}d</span>
        )}
      </div>
      {role === "owner" ? (
        <ChevronRight size={18} className="text-muted" />
      ) : (
        <span className="text-xs surface-alt rounded-full px-3 py-1 text-muted">Ativo</span>
      )}
    </>
  );
  return role === "owner" ? (
    <Link href="/configuracoes/plano" className="card flex items-center justify-between hover:surface-alt transition">
      {conteudo}
    </Link>
  ) : (
    <div className="card flex items-center justify-between">{conteudo}</div>
  );
}
