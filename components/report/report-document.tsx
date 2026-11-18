"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AreaChart, BarChart, DonutChart, LineChart, type Series } from "@/components/charts/charts";
import type { Report, ReportSection, Row } from "@/lib/report/types";
import { Markdown } from "./markdown-lite";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const cellValue = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

function Heading({ children }: { children?: string }) {
  if (!children) return null;
  return <h2 className="mb-3 border-b border-border pb-1.5 font-display text-lg uppercase tracking-wide">{children}</h2>;
}

function Chart({ s }: { s: Extract<ReportSection, { type: "chart" }> }) {
  const series: Series[] = s.series;
  const data = s.data as Row[];
  // The wrappers are generic over row type; Row satisfies `object`, and x/series keys are validated by the report author.
  const common = { data, x: s.x, series, height: 220 };
  if (s.render === "donut") {
    return <DonutChart data={data} nameKey={s.x} valueKey={series[0]?.key ?? "value"} height={180} />;
  }
  if (s.render === "bar") return <BarChart {...common} />;
  if (s.render === "line") return <LineChart {...common} />;
  return <AreaChart {...common} />;
}

const TONES = {
  info: { icon: Info, box: "border-border bg-surface", iconCls: "text-accent", label: "Note" },
  warn: { icon: AlertTriangle, box: "border-danger/40 bg-danger/10", iconCls: "text-danger", label: "Attention" },
  success: { icon: CheckCircle2, box: "border-success/40 bg-success/10", iconCls: "text-success", label: "On track" },
} as const;

function Section({ s }: { s: ReportSection }) {
  switch (s.type) {
    case "text":
      return (
        <section className="report-section">
          <Heading>{s.heading}</Heading>
          <Markdown source={s.body} className="text-sm leading-relaxed" />
        </section>
      );
    case "kpis":
      return (
        <section className="report-section grid grid-cols-2 gap-3 sm:grid-cols-4">
          {s.items.map((k) => (
            <div key={k.label} className="report-card rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
              {k.delta && <p className="mt-0.5 text-xs text-muted">{k.delta}</p>}
            </div>
          ))}
        </section>
      );
    case "table":
      return (
        <section className="report-section">
          <Heading>{s.heading}</Heading>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="report-table w-full border-collapse text-xs">
              <thead>
                <tr className="bg-surface">
                  {s.columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium text-muted" style={{ textAlign: c.align ?? "left" }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {s.columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 tabular-nums" style={{ textAlign: c.align ?? "left" }}>
                        {c.format ? c.format(r[c.key], r) : cellValue(r[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    case "chart":
      return (
        <section className="report-section">
          <Heading>{s.heading}</Heading>
          <figure className="rounded-2xl border border-border bg-card p-4">
            <Chart s={s} />
          </figure>
        </section>
      );
    case "callout": {
      const t = TONES[s.tone];
      const Icon = t.icon;
      return (
        <section className="report-section">
          <div className={`report-card flex gap-3 rounded-2xl border p-4 ${t.box}`}>
            <Icon className={`mt-0.5 size-4 shrink-0 ${t.iconCls}`} aria-hidden />
            <div className="text-sm leading-relaxed">
              <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.label}</p>
              <Markdown source={s.body} />
            </div>
          </div>
        </section>
      );
    }
    case "citations":
      return (
        <section className="report-section">
          <Heading>Sources</Heading>
          <ol className="space-y-2.5">
            {s.items.map((c) => (
              <li key={c.n} className="flex gap-3 text-xs leading-relaxed">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-medium tabular-nums text-ink-foreground">{c.n}</span>
                <div>
                  <p className="font-medium">{c.source}</p>
                  <p className="text-muted">{c.excerpt}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
  }
}

/** A4-like report. Rendered on screen (preview) and into the print portal (PDF). */
export function ReportDocument({ report }: { report: Report }) {
  return (
    <article className="report-doc mx-auto w-[210mm] max-w-full space-y-6 rounded-2xl border border-border bg-card p-[14mm] text-foreground">
      <header className="report-section border-b-2 border-ink pb-5">
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted">Report</p>
        <h1 className="font-display text-4xl uppercase leading-none tracking-wide">{report.title}</h1>
        {report.subtitle && <p className="mt-2 font-serif text-xl text-muted">{report.subtitle}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3">
          <div><dt className="text-muted">Generated</dt><dd className="font-medium">{fmtDate(report.generatedAt)}</dd></div>
          {report.author && <div><dt className="text-muted">Author</dt><dd className="font-medium">{report.author}</dd></div>}
          {Object.entries(report.meta ?? {}).map(([k, v]) => (
            <div key={k}><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      </header>
      {report.summary && (
        <section className="report-section">
          <Heading>Summary</Heading>
          <Markdown source={report.summary} className="text-sm leading-relaxed" />
        </section>
      )}
      {report.sections.map((s, i) => <Section key={i} s={s} />)}
    </article>
  );
}
