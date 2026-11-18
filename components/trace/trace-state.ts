import type { TraceEvent } from "./types.ts";

export type TraceTotals = {
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  steps: number;
  errors: number;
  retries: number;
};

export const EMPTY_TOTALS: TraceTotals = { durationMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, steps: 0, errors: 0, retries: 0 };

/** Upsert by id, keep order by startedAt (stable for equal times). Returns a new array. */
export function upsertEvent(events: readonly TraceEvent[], event: TraceEvent): TraceEvent[] {
  const i = events.findIndex((e) => e.id === event.id);
  const next = events.slice();
  if (i >= 0) next[i] = event; else next.push(event);
  return sortEvents(next);
}

export function sortEvents(events: readonly TraceEvent[]): TraceEvent[] {
  // Array.prototype.sort is stable, so equal startedAt keeps arrival order.
  return events.slice().sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Totals across events. durationMs is the wall-clock span from the first start to the
 * last end (or `now` for steps still running). retries counts retry + fallback events.
 */
export function computeTotals(events: readonly TraceEvent[], now?: number): TraceTotals {
  if (events.length === 0) return { ...EMPTY_TOTALS };
  let start = Infinity, end = -Infinity;
  const t = { ...EMPTY_TOTALS };
  for (const e of events) {
    start = Math.min(start, e.startedAt);
    end = Math.max(end, e.endedAt ?? (e.status === "running" ? (now ?? Date.now()) : e.startedAt));
    t.steps += 1;
    if (e.status === "error") t.errors += 1;
    if (e.kind === "retry" || e.kind === "fallback") t.retries += 1;
    if (e.usage) {
      t.inputTokens += e.usage.inputTokens || 0;
      t.outputTokens += e.usage.outputTokens || 0;
      t.costUsd += e.usage.costUsd || 0;
    }
  }
  t.durationMs = Math.max(0, end - start);
  return t;
}

export type TraceNode = { event: TraceEvent; depth: number; children: TraceNode[] };

/** Nest events by parentId. Events whose parent is missing become roots. Order follows startedAt. */
export function buildTree(events: readonly TraceEvent[]): TraceNode[] {
  const nodes = new Map<string, TraceNode>();
  for (const e of events) nodes.set(e.id, { event: e, depth: 0, children: [] });
  const roots: TraceNode[] = [];
  for (const e of events) {
    const node = nodes.get(e.id)!;
    const parent = e.parentId && e.parentId !== e.id ? nodes.get(e.parentId) : undefined;
    if (parent) parent.children.push(node); else roots.push(node);
  }
  const seen = new Set<string>();
  const setDepth = (n: TraceNode, d: number) => {
    if (seen.has(n.event.id)) return;
    seen.add(n.event.id);
    n.depth = d;
    n.children.forEach((c) => setDepth(c, d + 1));
  };
  roots.forEach((r) => setDepth(r, 0));
  return roots;
}

/** Depth-first flatten, skipping the children of collapsed ids. */
export function flattenTree(roots: readonly TraceNode[], collapsed: ReadonlySet<string> = new Set()): TraceNode[] {
  const out: TraceNode[] = [];
  const walk = (n: TraceNode) => {
    out.push(n);
    if (!collapsed.has(n.event.id)) n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

export function eventDuration(e: TraceEvent, now?: number): number {
  // The clock is read only for a step that is still running, never while prerendering an empty panel.
  return Math.max(0, (e.endedAt ?? (e.status === "running" ? (now ?? Date.now()) : e.startedAt)) - e.startedAt);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  const m = Math.floor(ms / 60_000);
  return `${m}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`;
}

export function formatTokens(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString("en-US");
}
