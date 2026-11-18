"use client";

import { useEffect, useId, useRef } from "react";
import { animate, motion, useInView } from "motion/react";
import clsx from "clsx";

/** Number that counts up when scrolled into view. */
export function NumberTicker({ value, decimals = 0, prefix = "", suffix = "", duration = 1.4, className }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const fmt = (v: number) => prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    const c = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = fmt(v)) });
    return () => c.stop();
  }, [inView, value, decimals, prefix, suffix, duration]);
  return <span ref={ref} className={clsx("tabular-nums", className)}>{prefix}0{suffix}</span>;
}

/** Tiny line chart with dots + soft area fill; draws itself in. */
export function Sparkline({ data, color = "var(--accent)", width = 80, height = 36, dots = true }: { data: number[]; color?: string; width?: number; height?: number; dots?: boolean }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * (width - 6) + 3, height - 4 - ((d - min) / (max - min || 1)) * (height - 8)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const id = `sg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${pts.at(-1)![0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${id})`} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="1.6" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
      {dots && pts.slice(1, -1).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white" stroke={color} strokeWidth="1.5" />)}
    </svg>
  );
}

/** Rounded white card. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}>{children}</div>;
}

/** Pill status badge. */
export function Badge({ tone = "neutral", children }: { tone?: "green" | "orange" | "blue" | "red" | "neutral"; children: React.ReactNode }) {
  const tones = {
    green: "bg-success/12 text-success",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-accent/10 text-accent",
    red: "bg-danger/10 text-danger",
    neutral: "bg-surface text-muted",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}
