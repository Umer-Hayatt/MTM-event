export type Row = Record<string, unknown>;

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Optional display formatter (used in the PDF table; CSV/JSON keep raw values). */
  format?: (value: unknown, row: Row) => string;
};

export type ReportSeries = { key: string; label?: string; color?: string };

export type ReportKpi = { label: string; value: string; delta?: string };

export type ReportSection =
  | { type: "text"; heading?: string; body: string }
  | { type: "kpis"; items: ReportKpi[] }
  | { type: "table"; heading?: string; columns: ReportColumn[]; rows: Row[] }
  | {
      type: "chart";
      heading?: string;
      render: "area" | "bar" | "line" | "donut";
      data: Row[];
      /** category / time key (for "donut": the name key) */
      x: string;
      /** series to plot (for "donut": series[0].key is the value key) */
      series: ReportSeries[];
    }
  | { type: "callout"; tone: "info" | "warn" | "success"; body: string }
  | { type: "citations"; items: { n: number; source: string; excerpt: string }[] };

export type Report = {
  title: string;
  subtitle?: string;
  author?: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
  summary?: string;
  sections: ReportSection[];
  meta?: Record<string, string>;
};
