import { TrendingUp, Package, Wallet, Trophy, ArrowUpRight } from "lucide-react";

/** Mock visual do painel - usado no hero e na seção de solução. Puramente decorativo. */
export default function DashboardMock() {
  const barras = [40, 65, 52, 80, 72, 95, 88];
  return (
    <div className="rounded-2xl border border-default surface p-4 shadow-2xl shadow-brand-900/10">
      {/* topo */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Faturamento do mês</p>
          <p className="text-2xl font-extrabold text-strong">R$ 14.380</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-500">
          <ArrowUpRight size={13} /> +23%
        </span>
      </div>

      {/* mini gráfico */}
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {barras.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-md ${i === 5 ? "bg-brand-500" : "bg-brand-500/30"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* cards de métrica */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { icon: Package, t: "Em estoque", v: "1.247 peças" },
          { icon: Wallet, t: "Comissão a pagar", v: "R$ 1.120" },
          { icon: Trophy, t: "Top revendedora", v: "Aline · R$ 3.2k" },
          { icon: TrendingUp, t: "Ticket médio", v: "R$ 87,40" },
        ].map(({ icon: Icon, t, v }) => (
          <div key={t} className="surface-alt rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-brand-600">
              <Icon size={14} />
              <span className="text-[11px] text-muted">{t}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-strong">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
