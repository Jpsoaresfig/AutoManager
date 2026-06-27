"use client";
import { useEffect, useRef, useState } from "react";

// Anima um número de 0 até `value` ao montar/atualizar, com easing suave.
// `format` permite formatar (ex.: moeda). Respeita prefers-reduced-motion.
export default function CountUp({
  value,
  duration = 900,
  format = (n: number) => String(Math.round(n)),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduz =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz || duration <= 0) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    let start: number | null = null;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setDisplay(from + delta * easeOut(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value; // próxima animação parte do valor atual
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
