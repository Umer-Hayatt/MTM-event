import type { StreamLine, TraceEvent } from "./types.ts";

export type NdjsonHandlers = {
  onTrace?(e: TraceEvent): void;
  onText?(delta: string): void;
  onResult?(data: unknown): void;
  onError?(msg: string): void;
};

function dispatchLine(raw: string, h: NdjsonHandlers) {
  const line = raw.trim();
  if (!line) return;
  let parsed: StreamLine;
  try {
    parsed = JSON.parse(line) as StreamLine;
  } catch {
    h.onError?.(`Malformed stream line: ${line.slice(0, 120)}`);
    return;
  }
  if (!parsed || typeof parsed !== "object") {
    h.onError?.(`Unexpected stream line: ${line.slice(0, 120)}`);
    return;
  }
  switch (parsed.type) {
    case "trace": if (parsed.event) h.onTrace?.(parsed.event); break;
    case "text": h.onText?.(parsed.delta); break;
    case "result": h.onResult?.(parsed.data); break;
    case "error": h.onError?.(parsed.message); break;
    default: break; // unknown line types are ignored for forward compatibility
  }
}

/**
 * Reads an NDJSON response body and calls handlers per line.
 * Safe across chunk boundaries (including multi-byte characters split between
 * chunks), multiple lines per chunk, and a final line without a newline.
 * A bad line reports through onError and does not stop the stream.
 */
export async function readNdjson(response: Response, handlers: NdjsonHandlers, signal?: AbortSignal): Promise<void> {
  if (!response.body) {
    handlers.onError?.(response.ok ? "Response has no body" : `Request failed (${response.status})`);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const onAbort = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", onAbort);
  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        dispatchLine(line, handlers);
      }
    }
    buffer += decoder.decode();
    if (!signal?.aborted && buffer.trim()) dispatchLine(buffer, handlers);
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}
