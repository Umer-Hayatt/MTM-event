// One step in an AI run; emitted as the run progresses.
// Copied verbatim from Components/MODULES.md so this module stands alone.
export type TraceEvent = {
  id: string;            // unique per event
  runId: string;         // groups events of one run
  parentId?: string;     // nest a step under another (e.g. a tool call inside a step)
  kind: "step" | "llm" | "tool" | "retrieval" | "validation" | "fallback" | "retry" | "error" | "cache";
  label: string;         // human-readable, e.g. "Retrieved 5 passages"
  status: "running" | "ok" | "warn" | "error";
  startedAt: number;     // ms epoch
  endedAt?: number;
  detail?: string;       // short extra text (shown on expand)
  data?: Record<string, unknown>; // arbitrary payload (shown as JSON on expand)
  usage?: { inputTokens: number; outputTokens: number; costUsd?: number; model?: string };
};

export type TraceSink = (event: TraceEvent) => void;

// Streaming wire format from API routes: newline-delimited JSON (NDJSON).
export type StreamLine =
  | { type: "trace"; event: TraceEvent }   // upsert by event.id
  | { type: "text"; delta: string }        // answer text chunk
  | { type: "result"; data: unknown }      // final structured result
  | { type: "error"; message: string };
