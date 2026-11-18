export type CsvColumn = { key: string; label?: string };

export type CsvOptions = {
  /** Prepend a UTF-8 BOM so Excel detects the encoding. */
  bom?: boolean;
  /** Line terminator. RFC 4180 says CRLF (default). */
  eol?: string;
  /** Prefix "'" to text cells that start with = + - @ tab or CR. Default true. */
  guardFormulas?: boolean;
};

const FORMULA_START = /^[=+\-@\t\r]/;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function csvCell(value: unknown, guardFormulas = true): string {
  let s = cellText(value);
  // Real numbers (e.g. -5) are safe; only guard text.
  if (guardFormulas && typeof value !== "number" && typeof value !== "bigint" && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: CsvColumn[], options: CsvOptions = {}): string {
  const { bom = false, eol = "\r\n", guardFormulas = true } = options;
  const cols: CsvColumn[] =
    columns ??
    (() => {
      const keys: string[] = [];
      for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
      return keys.map((key) => ({ key }));
    })();
  const lines = [cols.map((c) => csvCell(c.label ?? c.key, guardFormulas)).join(",")];
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c.key], guardFormulas)).join(","));
  return (bom ? "﻿" : "") + lines.join(eol) + eol;
}
