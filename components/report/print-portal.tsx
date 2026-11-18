"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Report } from "@/lib/report/types";
import { ReportDocument } from "./report-document";
import "./report-print.css";

/**
 * Mounts the report as a direct child of <body> and opens the browser print dialog.
 * Calls onDone after the dialog closes (afterprint). Render it only while printing.
 */
export function PrintPortal({ report, onDone }: { report: Report; onDone: () => void }) {
  // Rendered only after a click, so `document` exists; the guard keeps prerendering safe.
  const [host] = useState<HTMLElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.className = "report-print-root";
    return el;
  });

  useEffect(() => {
    if (!host) return;
    document.body.appendChild(host);
    return () => {
      host.remove();
    };
  }, [host]);

  useEffect(() => {
    if (!host) return;
    const done = () => onDone();
    window.addEventListener("afterprint", done, { once: true });
    // Give charts one animation pass to lay out before the dialog snapshots the page.
    const t = setTimeout(() => window.print(), 700);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [host, onDone]);

  return host ? createPortal(<ReportDocument report={report} />, host) : null;
}
