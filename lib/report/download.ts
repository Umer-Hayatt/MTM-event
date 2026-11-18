export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, csv, "text/csv;charset=utf-8");
}

export function downloadJson(filename: string, data: unknown): void {
  downloadText(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

/** ("Flood response: 24h report", "csv") -> "flood-response-24h-report-2026-11-18.csv" */
export function slugFilename(title: string, ext: string, date: Date = new Date()): string {
  const slug =
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "report";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "txt";
  return `${slug}-${stamp}.${safeExt}`;
}
