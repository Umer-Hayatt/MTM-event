"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeTotals, upsertEvent, type TraceTotals } from "./trace-state";
import type { TraceEvent } from "./types";

export type { TraceTotals };

/** Holds trace events (upsert by id, ordered by startedAt) plus live totals. */
export function useTrace() {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  // 0 until the first tick: the clock is only read inside effects, never during (pre)render.
  const [now, setNow] = useState(0);

  const upsert = useCallback((event: TraceEvent) => setEvents((prev) => upsertEvent(prev, event)), []);
  const reset = useCallback(() => setEvents([]), []);

  const running = events.some((e) => e.status === "running");
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 250);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [running]);

  const totals = useMemo(() => computeTotals(events, running && now ? now : undefined), [events, running, now]);
  return { events, upsert, reset, totals };
}
