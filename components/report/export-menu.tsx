"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import { toCsv } from "@/lib/report/csv";
import { downloadCsv, downloadJson, slugFilename } from "@/lib/report/download";
import type { Report, Row } from "@/lib/report/types";
import { PrintPortal } from "./print-portal";

/**
 * "Export report" button with a dropdown: PDF (print), CSV, JSON.
 * CSV uses `rows` if given, otherwise the first table section of the report.
 */
export function ExportMenu({ report, rows, filenameBase, className }: {
  report: Report;
  rows?: Row[];
  filenameBase?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const base = filenameBase ?? report.title;

  const firstTable = report.sections.find((s) => s.type === "table");
  const csvRows = rows ?? (firstTable?.type === "table" ? firstTable.rows : undefined);
  const csvColumns = rows ? undefined : firstTable?.type === "table" ? firstTable.columns : undefined;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onPrintDone = useCallback(() => setPrinting(false), []);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Download className="size-4" aria-hidden />
        Export report
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-border bg-card p-1.5 shadow-lg">
          <button role="menuitem" type="button" className={item} disabled={printing} onClick={() => { setOpen(false); setPrinting(true); }}>
            <Printer className="size-4 text-muted" aria-hidden />
            <span>PDF (print)<span className="block text-xs text-muted">Choose &quot;Save as PDF&quot;</span></span>
          </button>
          <button
            role="menuitem"
            type="button"
            className={item}
            disabled={!csvRows}
            onClick={() => {
              if (!csvRows) return;
              downloadCsv(slugFilename(base, "csv"), toCsv(csvRows, csvColumns, { bom: true }));
              setOpen(false);
            }}
          >
            <FileSpreadsheet className="size-4 text-muted" aria-hidden />
            <span>CSV<span className="block text-xs text-muted">{csvRows ? `${csvRows.length} rows, opens in Excel` : "No table in this report"}</span></span>
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => { downloadJson(slugFilename(base, "json"), report); setOpen(false); }}>
            <FileJson className="size-4 text-muted" aria-hidden />
            <span>JSON<span className="block text-xs text-muted">Full report, machine-readable</span></span>
          </button>
        </div>
      )}
      {printing && <PrintPortal report={report} onDone={onPrintDone} />}
    </div>
  );
}
