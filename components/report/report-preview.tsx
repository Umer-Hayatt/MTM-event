"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import type { Report, Row } from "@/lib/report/types";
import { ExportMenu } from "./export-menu";
import { ReportDocument } from "./report-document";

/** Button that opens an on-screen modal preview of the report, with export actions. */
export function ReportPreview({ report, rows, filenameBase, label = "Preview report" }: {
  report: Report;
  rows?: Row[];
  filenameBase?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-surface"
      >
        <Eye className="size-4" aria-hidden />
        {label}
      </button>
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Report preview" className="fixed inset-0 z-50 flex flex-col bg-ink/70">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
            <p className="truncate text-sm font-medium">{report.title}</p>
            <div className="flex items-center gap-2">
              <ExportMenu report={report} rows={rows} filenameBase={filenameBase} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close preview" className="grid size-10 place-items-center rounded-xl border border-border hover:bg-surface">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <ReportDocument report={report} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
