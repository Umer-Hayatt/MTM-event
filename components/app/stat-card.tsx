"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { NumberTicker, Sparkline } from "@/components/dashboard/primitives";

/**
 * KPI card: label, counting-up value, change vs. previous period, optional sparkline.
 *
 *   <StatCard label="Revenue" value={48210} prefix="$" delta={12.4} trend={[3,4,3.6,5.2,6]} />
 */
export function StatCard({ label, value, prefix, suffix, decimals = 0, delta, deltaLabel = "vs last month", trend, icon: Icon, invert = false, className }: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** percent change; positive = up */
  delta?: number;
  deltaLabel?: string;
  trend?: number[];
  icon?: LucideIcon;
  /** set for metrics where going down is good (churn, costs) */
  invert?: boolean;
  className?: string;
}) {
  const good = delta == null ? true : invert ? delta <= 0 : delta >= 0;
  const up = (delta ?? 0) >= 0;
  return (
    <div className={clsx("rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5", className)}>
      <div className="flex items-center gap-2 text-sm text-muted">
        {Icon && <span className="grid size-7 place-items-center rounded-lg bg-surface"><Icon className="size-3.5 text-foreground" /></span>}
        {label}
      </div>
      <NumberTicker value={value} prefix={prefix} suffix={suffix} decimals={decimals} className="mt-3 block text-2xl font-semibold tracking-tight" />
      <div className="mt-2 flex items-end justify-between gap-2">
        {delta != null && (
          <span className="flex items-center gap-1 text-xs">
            <span className={clsx("flex items-center font-medium", good ? "text-success" : "text-danger")}>
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(delta)}%
            </span>
            <span className="text-muted">{deltaLabel}</span>
          </span>
        )}
        {trend && <Sparkline data={trend} color={good ? "var(--success)" : "var(--danger)"} />}
      </div>
    </div>
  );
}
