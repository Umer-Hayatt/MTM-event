"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import clsx from "clsx";
import {
  ChartNoAxesGantt, Check, ChevronRight, Cpu, Database, Layers, ListTree, RotateCcw, Search,
  ShieldCheck, Shuffle, TriangleAlert, Wrench, type LucideIcon,
} from "lucide-react";
import {
  buildTree, computeTotals, eventDuration, formatCost, formatDuration, formatTokens, type TraceNode,
} from "./trace-state";
import { TraceWaterfall } from "./trace-waterfall";
import { useNow } from "./use-now";
import type { TraceEvent } from "./types";

const KIND: Record<TraceEvent["kind"], { icon: LucideIcon; label: string }> = {
  step: { icon: Layers, label: "Step" },
  llm: { icon: Cpu, label: "Model call" },
  tool: { icon: Wrench, label: "Tool" },
  retrieval: { icon: Search, label: "Retrieval" },
  validation: { icon: ShieldCheck, label: "Validation" },
  fallback: { icon: Shuffle, label: "Fallback" },
  retry: { icon: RotateCcw, label: "Retry" },
  error: { icon: TriangleAlert, label: "Error" },
  cache: { icon: Database, label: "Cache" },
};

const BUBBLE: Record<TraceEvent["status"], string> = {
  running: "bg-teal/10 text-teal",
  ok: "bg-teal/10 text-ink",
  warn: "bg-mist text-ink",
  error: "bg-danger/10 text-danger",
};

const STATUS_WORD: Record<TraceEvent["status"], string> = { running: "running", ok: "completed", warn: "completed with a warning", error: "failed" };

function safeJson(data: unknown) {
  try { return JSON.stringify(data, null, 2); } catch { return String(data); }
}

/**
 * Live panel of an AI run: nested steps, status, live durations, expandable detail,
 * a summary strip (time, tokens, cost, steps, retries) and an optional waterfall view.
 *
 *   <TracePanel events={events} />
 */
export function TracePanel({ events, title = "Reasoning trace", compact = false, emptyHint, className }: {
  events: TraceEvent[];
  title?: string;
  compact?: boolean;
  emptyHint?: string;
  className?: string;
}) {
  const [view, setView] = useState<"timeline" | "waterfall">("timeline");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const running = events.some((e) => e.status === "running");
  const now = useNow(running);
  const totals = useMemo(() => computeTotals(events, now), [events, now]);
  const tree = useMemo(() => buildTree(events), [events]);
  const t0 = events.length ? Math.min(...events.map((e) => e.startedAt)) : 0;
  const viewId = useId();

  const toggle = (id: string) =>
    setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Polite announcements when a step finishes.
  const announced = useRef(new Map<string, TraceEvent["status"]>());
  // Written straight to the live region (an external DOM node), so no extra render per step.
  const liveRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (events.length === 0) { announced.current.clear(); return; }
    const msgs: string[] = [];
    for (const e of events) {
      if (e.status !== "running" && announced.current.get(e.id) !== e.status) {
        announced.current.set(e.id, e.status);
        msgs.push(`${e.label} ${STATUS_WORD[e.status]} in ${formatDuration(eventDuration(e))}.`);
      }
    }
    if (msgs.length && liveRegion.current) liveRegion.current.textContent = msgs.slice(-2).join(" ");
  }, [events]);

  // Keep the newest step in view while a run is streaming in.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || view !== "timeline") return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 140) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [events.length, view]);

  const finished = events.length > 0 && !running;
  const hasError = events.some((e) => e.status === "error");

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label={title} className={clsx("overflow-hidden rounded-2xl border border-border bg-card", className)}>
        <header className={clsx("flex items-center justify-between gap-3 border-b border-border", compact ? "px-4 py-3" : "px-5 py-4")}>
          <div className="flex min-w-0 items-center gap-2.5">
            <h3 className={clsx("truncate font-semibold tracking-tight", compact ? "text-sm" : "text-base")}>{title}</h3>
            {events.length > 0 && (
              <span className={clsx(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                running ? "bg-teal/10 text-teal" : "bg-surface text-muted",
              )}>
                {running && <PulseDot />}
                {running ? "Live" : finished && totals.errors === 0 ? "Complete" : "Finished with errors"}
              </span>
            )}
          </div>
          <div role="group" aria-label="Trace view" className="flex shrink-0 rounded-xl bg-surface p-0.5">
            {([["timeline", "Timeline", ListTree], ["waterfall", "Waterfall", ChartNoAxesGantt]] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-controls={`${viewId}-${v}`}
                onClick={() => setView(v)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                <span className={compact ? "sr-only sm:not-sr-only" : ""}>{label}</span>
              </button>
            ))}
          </div>
        </header>

        <SummaryStrip totals={totals} compact={compact} running={running} />

        <div
          ref={scroller}
          id={`${viewId}-${view}`}
          className={clsx("overflow-auto", compact ? "max-h-[380px] p-2.5" : "max-h-[620px] p-3.5")}
        >
          {events.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <span className="grid size-9 place-items-center rounded-xl bg-surface"><ListTree className="size-4 text-muted" aria-hidden /></span>
              <p className="max-w-xs text-sm text-muted">{emptyHint ?? "Run an analysis to watch each retrieval, model call and validation appear here."}</p>
            </div>
          ) : view === "timeline" ? (
            <ol className="space-y-0.5">
              <AnimatePresence initial={false}>
                {tree.map((n) => (
                  <TraceRow key={n.event.id} node={n} now={now} t0={t0} open={open} toggle={toggle} compact={compact} />
                ))}
              </AnimatePresence>
            </ol>
          ) : (
            <TraceWaterfall events={events} now={now} compact={compact} />
          )}
        </div>

        {hasError && finished && totals.retries > 0 && (
          <p className="border-t border-border bg-mist/30 px-5 py-2.5 text-xs text-foreground">
            Recovered: {totals.errors} failed {totals.errors === 1 ? "step" : "steps"} handled by {totals.retries} retry/fallback {totals.retries === 1 ? "action" : "actions"}.
          </p>
        )}

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" ref={liveRegion} />
      </section>
    </MotionConfig>
  );
}

function PulseDot() {
  const reduce = useReducedMotion();
  return (
    <span className="relative flex size-2" aria-hidden>
      {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-teal opacity-60" />}
      <span className="relative size-2 rounded-full bg-teal" />
    </span>
  );
}

function SummaryStrip({ totals, compact, running }: { totals: ReturnType<typeof computeTotals>; compact: boolean; running: boolean }) {
  const cells: { label: string; value: string; accent?: boolean }[] = [
    { label: "Time", value: formatDuration(totals.durationMs), accent: running },
    { label: "Tokens in", value: formatTokens(totals.inputTokens) },
    { label: "Tokens out", value: formatTokens(totals.outputTokens) },
    { label: "Est. cost", value: formatCost(totals.costUsd) },
    { label: "Steps", value: String(totals.steps) },
    { label: "Retries / fallbacks", value: String(totals.retries) },
  ];
  return (
    <dl className={clsx("grid border-b border-border bg-surface/50", compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
      {cells.map((c, i) => {
        const flagged = c.label.startsWith("Retries") && totals.retries > 0;
        return (
          <div key={c.label} className={clsx("min-w-0", compact ? "px-3 py-2" : "px-4 py-3", i > 0 && "sm:border-l sm:border-border")}>
            <dt className="truncate text-[10px] font-medium uppercase tracking-wider text-muted">{c.label}</dt>
            <dd className={clsx("mt-0.5 font-semibold tabular-nums tracking-tight", compact ? "text-sm" : "text-lg")}>
              {flagged ? (
                <span className="rounded-md bg-mist px-1.5 text-ink">{c.value}</span>
              ) : (
                <span className={c.accent ? "text-teal" : undefined}>{c.value}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function TraceRow({ node, now, t0, open, toggle, compact }: {
  node: TraceNode; now: number; t0: number; open: Set<string>; toggle: (id: string) => void; compact: boolean;
}) {
  const e = node.event;
  const Icon = KIND[e.kind].icon;
  const expanded = open.has(e.id);
  const panelId = useId();
  const dur = eventDuration(e, now);
  const hasBody = Boolean(e.detail || e.data || e.usage);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={hasBody ? panelId : undefined}
        onClick={() => hasBody && toggle(e.id)}
        className={clsx(
          "group flex w-full items-center gap-3 rounded-xl px-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal",
          compact ? "py-1.5" : "py-2",
          hasBody ? "cursor-pointer hover:bg-surface" : "cursor-default",
          expanded && "bg-surface",
        )}
      >
        <span className={clsx("relative grid shrink-0 place-items-center rounded-lg", compact ? "size-6" : "size-8", BUBBLE[e.status])}>
          <Icon className={compact ? "size-3" : "size-4"} aria-hidden />
          {e.status === "running" && <RunningRing />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx("block truncate font-medium", compact ? "text-[13px]" : "text-sm", node.depth === 0 && node.children.length > 0 && "font-semibold")}>
            {e.label}
          </span>
          {!compact && (
            <span className="block truncate text-xs text-muted">
              {KIND[e.kind].label}
              {e.usage && ` · ${formatTokens(e.usage.inputTokens)} in / ${formatTokens(e.usage.outputTokens)} out`}
              {e.usage?.costUsd != null && ` · ${formatCost(e.usage.costUsd)}`}
            </span>
          )}
        </span>
        <StatusChip status={e.status} />
        <span className={clsx(
          "w-16 shrink-0 text-right text-xs tabular-nums",
          e.status === "running" ? "font-medium text-teal" : e.status === "error" ? "text-danger" : "text-muted",
        )}>
          {formatDuration(dur)}
        </span>
        <ChevronRight
          aria-hidden
          className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", expanded && "rotate-90", !hasBody && "opacity-0")}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && hasBody && (
          <motion.div
            id={panelId}
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <TraceDetail event={e} t0={t0} dur={dur} compact={compact} />
          </motion.div>
        )}
      </AnimatePresence>

      {node.children.length > 0 && (
        <ol className={clsx("space-y-0.5 border-l border-border", compact ? "ml-5 pl-2" : "ml-6 pl-3")}>
          <AnimatePresence initial={false}>
            {node.children.map((c) => (
              <TraceRow key={c.event.id} node={c} now={now} t0={t0} open={open} toggle={toggle} compact={compact} />
            ))}
          </AnimatePresence>
        </ol>
      )}
    </motion.li>
  );
}

function RunningRing() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -inset-0.5 rounded-[10px] border-2 border-teal"
      animate={reduce ? { opacity: 0.6 } : { opacity: [0.7, 0.1, 0.7], scale: [1, 1.12, 1] }}
      transition={reduce ? undefined : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function StatusChip({ status }: { status: TraceEvent["status"] }) {
  const word = status === "running" ? "Running" : status === "ok" ? "OK" : status === "warn" ? "Warning" : "Failed";
  return (
    <span className={clsx(
      "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
      status === "ok" && "text-ink",
      status === "running" && "text-teal",
      status === "warn" && "bg-mist text-ink",
      status === "error" && "bg-danger/10 text-danger",
    )}>
      {status === "ok" && <Check className="size-3" aria-hidden />}
      {status === "error" && <TriangleAlert className="size-3" aria-hidden />}
      {word}
    </span>
  );
}

function TraceDetail({ event: e, t0, dur, compact }: { event: TraceEvent; t0: number; dur: number; compact: boolean }) {
  const meta: [string, string][] = [
    ["Started", `+${formatDuration(Math.max(0, e.startedAt - t0))}`],
    ["Duration", formatDuration(dur)],
  ];
  if (e.usage?.model) meta.push(["Model", e.usage.model]);
  if (e.usage) {
    meta.push(["Tokens in", formatTokens(e.usage.inputTokens)], ["Tokens out", formatTokens(e.usage.outputTokens)]);
    if (e.usage.costUsd != null) meta.push(["Cost", formatCost(e.usage.costUsd)]);
  }
  return (
    <div className={clsx("mb-1 space-y-2.5 pb-2", compact ? "pl-9 pr-1" : "pr-2")} style={compact ? undefined : { paddingLeft: "3.25rem" }}>
      {e.detail && <p className="pt-1 text-sm leading-relaxed text-foreground/85">{e.detail}</p>}
      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {meta.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-1.5">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {e.data && (
        <pre
          tabIndex={0}
          aria-label={`Data for ${e.label}`}
          className="max-h-56 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper focus-visible:outline-2 focus-visible:outline-teal"
        >
          {safeJson(e.data)}
        </pre>
      )}
    </div>
  );
}
