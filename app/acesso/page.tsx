"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Gem, Loader2 } from "lucide-react";

export default function AcessoPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"ativar" | "entrar">("ativar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrarERedirecionar(supabase: ReturnType<typeof createClient>) {
    const { data: me } = await supabase.rpc("revendedora_me");
    if (!me) {
      setErro("Esse acesso não é de revendedora. Verifique com a loja.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    router.replace("/revenda");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const mail = email.trim().toLowerCase();

    try {
      if (modo === "ativar") {
        const res = await fetch("/api/revendedora/ativar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: mail, senha }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErro(data?.erro || "Não foi possível ativar o acesso.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email: mail, password: senha });
      if (error) {
        setErro(/invalid login/i.test(error.message) ? "E-mail ou senha incorretos." : error.message);
        setLoading(false);
        return;
      }
      await entrarERedirecionar(supabase);
    } catch {
      setErro("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 bg-[var(--bg)]">
      <div className="w-full max-w-sm reveal">
        <div className="flex items-center justify-center gap-2 font-extrabold text-brand-500 text-xl mb-2">
          <Gem className="text-brand-600" /> Área da Revendedora
        </div>
        <p className="text-center text-sm text-muted mb-6">Acesse o catálogo e registre suas vendas.</p>

        <div className="card space-y-4">
          <div className="flex rounded-xl surface-alt p-1 text-sm font-semibold">
            <button
              onClick={() => setModo("ativar")}
              className={`flex-1 rounded-lg py-2 transition active:scale-95 ${modo === "ativar" ? "surface shadow" : "text-muted hover:text-strong"}`}
            >
              Primeiro acesso
            </button>
            <button
              onClick={() => setModo("entrar")}
              className={`flex-1 rounded-lg py-2 transition active:scale-95 ${modo === "entrar" ? "surface shadow" : "text-muted hover:text-strong"}`}
            >
              Entrar
            </button>
          </div>

          <p className="text-xs text-muted">
            {modo === "ativar"
              ? "Use o e-mail que a loja cadastrou e crie a sua senha agora."
              : "Entre com o e-mail e a senha que você criou."}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">{modo === "ativar" ? "Crie sua senha" : "Senha"}</label>
              <input
                type="password"
                className="input"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                autoComplete={modo === "ativar" ? "new-password" : "current-password"}
              />
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" size={18} /> : modo === "ativar" ? "Ativar e entrar" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
