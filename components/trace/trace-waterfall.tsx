"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { buildTree, eventDuration, flattenTree, formatDuration } from "./trace-state";
import { useNow } from "./use-now";
import type { TraceEvent } from "./types";

const BAR: Record<TraceEvent["status"], string> = {
  running: "bg-accent/35 text-accent stripes",
  ok: "bg-accent",
  warn: "bg-highlight",
  error: "bg-danger",
};

/**
 * Compact waterfall: one horizontal bar per step, positioned by start/end time.
 * Pass `now` to share a clock with a parent; otherwise it ticks on its own while steps run.
 */
export function TraceWaterfall({ events, now: nowProp, compact = false, className }: {
  events: TraceEvent[];
  now?: number;
  compact?: boolean;
  className?: string;
}) {
  const running = events.some((e) => e.status === "running");
  const ownNow = useNow(running && nowProp === undefined);
  const now = nowProp ?? ownNow;

  const rows = useMemo(() => flattenTree(buildTree(events)), [events]);
  const t0 = events.length ? Math.min(...events.map((e) => e.startedAt)) : 0;
  const t1 = events.length ? Math.max(...events.map((e) => e.endedAt ?? (e.status === "running" ? now : e.startedAt))) : 0;
  const span = Math.max(t1 - t0, 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const rowH = compact ? "h-7" : "h-9";

  return (
    <div className={clsx("w-full", className)}>
      <div className="flex">
        <div className={clsx("shrink-0", compact ? "w-32 sm:w-40" : "w-40 sm:w-52")} />
        <div className="relative h-5 flex-1" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-muted first:translate-x-0 last:-translate-x-full"
              style={{ left: `${t * 100}%` }}
            >
              {formatDuration(span * t)}
            </span>
          ))}
        </div>
      </div>
      <ul className="relative" aria-label="Step timeline by start and end time">
        {rows.map(({ event: e, depth }) => {
          const dur = eventDuration(e, now);
          const left = ((e.startedAt - t0) / span) * 100;
          const width = Math.max((dur / span) * 100, 0.7);
          const label = `${e.label}, ${e.status}, ${formatDuration(dur)}`;
          return (
            <li key={e.id} className={clsx("flex items-center border-t border-border/70", rowH)}>
              <div className={clsx("shrink-0 truncate pr-3 text-xs", compact ? "w-32 sm:w-40" : "w-40 sm:w-52", depth === 0 ? "font-medium" : "text-muted")} style={{ paddingLeft: depth * 10 }} title={e.label}>
                {e.label}
              </div>
              <div className="relative h-full flex-1">
                {ticks.map((t) => (
                  <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-border/60" style={{ left: `${t * 100}%` }} />
                ))}
                <div
                  role="img"
                  aria-label={label}
                  title={label}
                  className={clsx("absolute top-1/2 h-3 -translate-y-1/2 rounded-full transition-[width,left] duration-150 ease-out", BAR[e.status])}
                  style={{ left: `${Math.min(left, 99.3)}%`, width: `${Math.min(width, 100 - Math.min(left, 99.3))}%` }}
                />
                {!compact && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-2 text-[10px] tabular-nums text-muted"
                    style={left + width > 82 ? { right: `${100 - left + 0.5}%`, paddingRight: 8, paddingLeft: 0 } : { left: `${left + width}%` }}
                  >
                    {formatDuration(dur)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
