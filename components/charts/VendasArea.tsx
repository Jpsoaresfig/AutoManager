"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { brl } from "@/lib/analytics";

// Gráfico de área isolado, carregado sob demanda (next/dynamic), tirando o peso
// do recharts do bundle inicial. Reutilizado no painel e nos relatórios.
export default function VendasArea({
  data,
  xKey = "dia",
  yKey = "total",
  gradientId = "g",
  interval = 2,
  height = 140,
}: {
  data: any[];
  xKey?: string;
  yKey?: string;
  gradientId?: string;
  interval?: number | "preserveStart" | "preserveEnd" | "preserveStartEnd";
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#db2777" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#db2777" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} interval={interval} />
          <Tooltip formatter={(v: number) => brl(v)} />
          <Area type="monotone" dataKey={yKey} stroke="#db2777" fill={`url(#${gradientId})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
