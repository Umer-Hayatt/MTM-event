"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import clsx from "clsx";

export type Column<T> = {
  key: string;
  header: string;
  /** How to read the value used for sorting + search. Defaults to row[key]. */
  value?: (row: T) => string | number | Date | null | undefined;
  /** Custom cell. Defaults to the value as text. */
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
};

/**
 * Generic table: search, click-to-sort headers, pagination, row selection.
 *
 *   <DataTable rows={orders} columns={cols} getRowId={(o) => o.id} searchPlaceholder="Search orders" />
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  title,
  toolbar,
  pageSize = 8,
  searchable = true,
  searchPlaceholder = "Search",
  selectable = false,
  onSelectionChange,
  onRowClick,
  emptyMessage = "No results match your search.",
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  title?: string;
  /** Extra controls on the right of the toolbar (filters, buttons) */
  toolbar?: React.ReactNode;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const read = (row: T, c: Column<T>) => (c.value ? c.value(row) : (row as Record<string, unknown>)[c.key] as string | number | null | undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q ? rows.filter((r) => columns.some((c) => String(read(r, c) ?? "").toLowerCase().includes(q))) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)!;
      out = [...out].sort((a, b) => {
        const va = read(a, col), vb = read(b, col);
        const na = va instanceof Date ? va.getTime() : va, nb = vb instanceof Date ? vb.getTime() : vb;
        const r = typeof na === "number" && typeof nb === "number" ? na - nb : String(na ?? "").localeCompare(String(nb ?? ""), undefined, { numeric: true });
        return sort.dir === "asc" ? r : -r;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const updateSelection = (next: Set<string>) => { setSelected(next); onSelectionChange?.([...next]); };
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(getRowId(r)));
  const toggleAll = () => {
    const next = new Set(selected);
    visible.forEach((r) => (allVisibleSelected ? next.delete(getRowId(r)) : next.add(getRowId(r))));
    updateSelection(next);
  };
  const toggleOne = (id: string) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); updateSelection(next); };

  const cycleSort = (key: string) => {
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
    setPage(0);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-4">
        {title && <h3 className="mr-auto text-base font-semibold">{title}</h3>}
        {searchable && (
          <label className={clsx("flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-within:border-accent sm:w-64", !title && "mr-auto")}>
            <Search className="size-4 text-muted" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
          </label>
        )}
        {selectable && selected.size > 0 && <span className="rounded-lg bg-highlight/40 px-2.5 py-1 text-xs font-medium">{selected.size} selected</span>}
        {toolbar}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-surface/60 text-left text-xs text-muted">
              {selectable && (
                <th className="w-10 py-2.5 pl-4"><Checkbox checked={allVisibleSelected} onChange={toggleAll} label="Select all rows on this page" /></th>
              )}
              {columns.map((c) => {
                const on = sort?.key === c.key;
                const Icon = !on ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={c.key} className={clsx("px-4 py-2.5 font-medium", c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                    {c.sortable ? (
                      <button onClick={() => cycleSort(c.key)} className={clsx("inline-flex items-center gap-1 hover:text-foreground", on && "text-foreground")}>
                        {c.header}<Icon className={clsx("size-3.5", !on && "opacity-40")} />
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((row) => {
                const id = getRowId(row);
                const on = selected.has(id);
                return (
                  <motion.tr
                    key={id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => onRowClick?.(row)}
                    className={clsx("border-b border-border last:border-0 transition-colors", on ? "bg-highlight/20" : "hover:bg-surface/60", onRowClick && "cursor-pointer")}
                  >
                    {selectable && (
                      <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><Checkbox checked={on} onChange={() => toggleOne(id)} label="Select row" /></td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={clsx("px-4 py-3", c.align === "right" && "text-right tabular-nums", c.align === "center" && "text-center", c.className)}>
                        {c.cell ? c.cell(row) : String(read(row, c) ?? "—")}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {visible.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted">{emptyMessage}</p>}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
        <span>
          {filtered.length === 0 ? "0 rows" : `${current * pageSize + 1}–${Math.min((current + 1) * pageSize, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page" className="grid size-8 place-items-center rounded-lg border border-border enabled:hover:bg-surface disabled:opacity-40"><ChevronLeft className="size-4" /></button>
          <span className="px-2 tabular-nums">{current + 1} / {pages}</span>
          <button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page" className="grid size-8 place-items-center rounded-lg border border-border enabled:hover:bg-surface disabled:opacity-40"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </section>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className={clsx("grid size-4 place-items-center rounded border transition", checked ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card hover:border-muted")}>
      {checked && <svg viewBox="0 0 12 12" className="size-2.5"><path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

/** Small status pill for table cells. */
export function StatusPill({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral" | "accent"; children: React.ReactNode }) {
  const t = {
    success: "bg-success/12 text-success",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-danger/10 text-danger",
    neutral: "bg-surface text-muted",
    accent: "bg-accent/10 text-accent",
  }[tone];
  return <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", t)}><i className="size-1.5 rounded-full bg-current" />{children}</span>;
}
