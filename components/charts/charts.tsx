"use client";

import { useId } from "react";
import {
  Area, AreaChart as RArea, Bar, BarChart as RBar, CartesianGrid, Cell, Line, LineChart as RLine, Pie, PieChart as RPie,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import clsx from "clsx";

/* ---------------------------------------------------------------
   Theme-driven chart wrappers (Recharts under the hood).
   Every chart takes plain rows + a list of series:

   <AreaChart data={rows} x="month" series={[{ key: "revenue", label: "Revenue" }]} />
---------------------------------------------------------------- */

/** Series colors come from the theme, in this order. */
export const CHART_COLORS = ["var(--teal)", "var(--mist)", "var(--ink)", "var(--foreground)", "var(--surface)"];

export type Series = {
  key: string;
  label?: string;
  color?: string;
  /** bars only: striped fill (as in the cashflow reference) */
  striped?: boolean;
};

type Fmt = (v: number) => string;
const defaultFmt: Fmt = (v) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));
const colorOf = (s: Series, i: number) => s.color ?? CHART_COLORS[i % CHART_COLORS.length];

/* ---------------- shared tooltip ---------------- */
type TipItem = { name?: unknown; value?: unknown; color?: string; dataKey?: unknown; payload?: { fill?: string } };
function ChartTooltip({ active, payload, label, format = defaultFmt, series }: { active?: boolean; payload?: readonly TipItem[]; label?: string | number; format?: Fmt; series: Series[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <p key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <i className="size-2 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} />
              {s?.label ?? String(p.name ?? "")}
            </span>
            <span className="font-medium tabular-nums">{typeof p.value === "number" ? format(p.value) : String(p.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function ChartLegend({ series, className }: { series: Series[]; className?: string }) {
  return (
    <div className={clsx("flex flex-wrap gap-4 text-xs text-muted", className)}>
      {series.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <i className={clsx("size-2.5 rounded-sm", s.striped && "stripes")} style={s.striped ? { color: colorOf(s, i), border: `1px solid ${colorOf(s, i)}` } : { background: colorOf(s, i) }} />
          {s.label ?? s.key}
        </span>
      ))}
    </div>
  );
}

const axisProps = { tickLine: false, axisLine: false, tick: { fontSize: 12, fill: "var(--muted)" } } as const;

type CartesianProps<T> = {
  data: T[];
  x: keyof T & string;
  series: Series[];
  height?: number;
  format?: Fmt;
  grid?: boolean;
  yAxis?: boolean;
};

/* ---------------- Area ---------------- */
export function AreaChart<T extends object>({ data, x, series, height = 260, format = defaultFmt, grid = true, yAxis = true, stacked = false }: CartesianProps<T> & { stacked?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RArea data={data as Record<string, unknown>[]} margin={{ top: 8, right: 4, left: yAxis ? -4 : 4, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {grid && <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />}
        <XAxis dataKey={x as string} {...axisProps} dy={6} interval="preserveStartEnd" padding={{ left: 8, right: 8 }} />
        {yAxis && <YAxis {...axisProps} tickFormatter={format} width={52} />}
        <Tooltip cursor={{ stroke: "var(--muted)", strokeDasharray: "4 4" }} content={(p) => <ChartTooltip {...p} format={format} series={series} />} />
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key} stackId={stacked ? "1" : undefined}
            stroke={colorOf(s, i)} strokeWidth={2} fill={`url(#${uid}-${s.key})`} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        ))}
      </RArea>
    </ResponsiveContainer>
  );
}

/* ---------------- Line ---------------- */
export function LineChart<T extends object>({ data, x, series, height = 260, format = defaultFmt, grid = true, yAxis = true, dots = false }: CartesianProps<T> & { dots?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLine data={data as Record<string, unknown>[]} margin={{ top: 8, right: 4, left: yAxis ? -4 : 4, bottom: 0 }}>
        {grid && <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />}
        <XAxis dataKey={x as string} {...axisProps} dy={6} interval="preserveStartEnd" padding={{ left: 8, right: 8 }} />
        {yAxis && <YAxis {...axisProps} tickFormatter={format} width={52} />}
        <Tooltip cursor={{ stroke: "var(--muted)", strokeDasharray: "4 4" }} content={(p) => <ChartTooltip {...p} format={format} series={series} />} />
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key} stroke={colorOf(s, i)} strokeWidth={2}
            dot={dots ? { r: 3.5, fill: "var(--card)", strokeWidth: 2 } : false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--card)" }} />
        ))}
      </RLine>
    </ResponsiveContainer>
  );
}

/* ---------------- Bar (grouped or stacked, optional stripes) ---------------- */
export function BarChart<T extends object>({ data, x, series, height = 260, format = defaultFmt, grid = true, yAxis = true, stacked = false, radius = 8 }: CartesianProps<T> & { stacked?: boolean; radius?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBar data={data as Record<string, unknown>[]} margin={{ top: 8, right: 4, left: yAxis ? -4 : 4, bottom: 0 }} barGap={4} barCategoryGap="22%">
        <defs>
          {series.map((s, i) => s.striped && (
            <pattern key={s.key} id={`${uid}-${s.key}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="var(--card)" />
              <rect width="3.5" height="8" fill={colorOf(s, i)} />
            </pattern>
          ))}
        </defs>
        {grid && <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />}
        <XAxis dataKey={x as string} {...axisProps} dy={6} interval="preserveStartEnd" padding={{ left: 8, right: 8 }} />
        {yAxis && <YAxis {...axisProps} tickFormatter={format} width={52} />}
        <Tooltip cursor={{ fill: "var(--surface)", radius: 8 }} content={(p) => <ChartTooltip {...p} format={format} series={series} />} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key} stackId={stacked ? "1" : undefined}
            fill={s.striped ? `url(#${uid}-${s.key})` : colorOf(s, i)}
            stroke={s.striped ? colorOf(s, i) : undefined}
            radius={stacked && i < series.length - 1 ? 0 : [radius, radius, radius, radius]}
            maxBarSize={36} />
        ))}
      </RBar>
    </ResponsiveContainer>
  );
}

/* ---------------- Donut ---------------- */
export function DonutChart<T extends object>({ data, nameKey, valueKey, height = 220, format = defaultFmt, centerLabel, colors = CHART_COLORS }: {
  data: T[]; nameKey: keyof T & string; valueKey: keyof T & string; height?: number; format?: Fmt; centerLabel?: string; colors?: string[];
}) {
  const total = data.reduce((s, d) => s + Number(d[valueKey] ?? 0), 0);
  const series: Series[] = data.map((d, i) => ({ key: String(d[nameKey]), color: colors[i % colors.length] }));
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full max-w-[220px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RPie>
            <Tooltip content={(p) => <ChartTooltip {...p} format={format} series={series.map((s) => ({ ...s, key: valueKey, label: undefined }))} />} />
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="66%" outerRadius="100%" paddingAngle={2} cornerRadius={6} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
          </RPie>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl font-semibold tabular-nums">{format(total)}</p>
            {centerLabel && <p className="text-xs text-muted">{centerLabel}</p>}
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d, i) => {
          const v = Number(d[valueKey] ?? 0);
          return (
            <li key={i} className="flex items-center gap-2">
              <i className="size-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span className="flex-1 text-muted">{String(d[nameKey])}</span>
              <span className="tabular-nums">{format(v)}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted">{total ? Math.round((v / total) * 100) : 0}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- Card wrapper ---------------- */
export function ChartCard({ title, value, delta, action, legend, children, className }: {
  title: string; value?: React.ReactNode; delta?: number; action?: React.ReactNode; legend?: Series[]; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={clsx("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-muted">{title}</h3>
          {value != null && (
            <p className="mt-1 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
              {value}
              {delta != null && <span className={clsx("text-xs font-medium", delta >= 0 ? "text-ink" : "text-danger")}>{delta >= 0 ? "+" : ""}{delta}%</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {legend && <ChartLegend series={legend} />}
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Segmented control for chart ranges (7D / 30D / 12M …). */
export function RangeTabs<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-surface p-0.5 text-xs">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={clsx("rounded-md px-2.5 py-1 transition", o === value ? "bg-card font-medium shadow-sm" : "text-muted hover:text-foreground")}>
          {o}
        </button>
      ))}
    </div>
  );
}
