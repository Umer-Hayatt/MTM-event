"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readNdjson } from "./read-ndjson";
import { useTrace } from "./use-trace";

export type TraceRunStatus = "idle" | "running" | "done" | "error";

/**
 * POST to an NDJSON route and get everything a page needs:
 *   const { run, events, text, result, status, error, cancel } = useTraceRun();
 *   <button onClick={() => run("/api/llm/analyze", { question })}>Run</button>
 *   <TracePanel events={events} />
 */
export function useTraceRun<R = unknown>() {
  const trace = useTrace();
  const [text, setText] = useState("");
  const [result, setResult] = useState<R | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<TraceRunStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const { upsert, reset } = trace;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((s) => (s === "running" ? "idle" : s));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (url: string, body?: unknown) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    reset(); setText(""); setResult(undefined); setError(undefined); setStatus("running");
    let failed = false;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok && !(res.headers.get("content-type") ?? "").includes("ndjson")) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg.slice(0, 300) || `Request failed (${res.status})`);
      }
      await readNdjson(res, {
        onTrace: upsert,
        onText: (d) => setText((t) => t + d),
        onResult: (d) => setResult(d as R),
        onError: (m) => { failed = true; setError(m); },
      }, ac.signal);
      if (ac.signal.aborted) return;
      setStatus(failed ? "error" : "done");
    } catch (e) {
      if (ac.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, [upsert, reset]);

  return { run, events: trace.events, totals: trace.totals, text, result, error, status, cancel };
}
