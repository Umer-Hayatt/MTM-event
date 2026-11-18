// The trace: every model call numbered with model, ONE area tag, input, output and the token counts
// the API reported. Plus decision log lines (MODE, POLICY, ACCEPT/REJECT). Required by the brief (#3, #5).
import type { Area, TraceCall, TraceLine } from "./types.ts";

export class Trace {
  lines: TraceLine[] = [];
  /** Call numbering continues across updates within a session. */
  constructor(public nextN = 1) {}

  log(text: string) {
    this.lines.push({ kind: "log", text });
  }

  call(c: Omit<TraceCall, "n">): TraceCall {
    const call = { ...c, n: this.nextN++ };
    this.lines.push({ kind: "call", call });
    return call;
  }

  calls(): TraceCall[] {
    return this.lines.flatMap((l) => (l.kind === "call" ? [l.call] : []));
  }

  tokens() {
    const calls = this.calls();
    const input = calls.reduce((s, c) => s + c.inputTokens, 0);
    const output = calls.reduce((s, c) => s + c.outputTokens, 0);
    return { input, output, total: input + output, calls: calls.length };
  }
}

export function formatCall(c: TraceCall): string {
  return [
    `#${c.n} [${c.area}] model=${c.model} ${c.ok ? "ok" : "FAILED"} ${c.ms}ms` + (c.note ? ` (${c.note})` : ""),
    `  tokens: input=${c.inputTokens} output=${c.outputTokens} total=${c.inputTokens + c.outputTokens}`,
    `  input:\n${indent(c.input)}`,
    `  output:\n${indent(c.output)}`,
  ].join("\n");
}

export function formatTrace(lines: TraceLine[]): string {
  return lines.map((l) => (l.kind === "call" ? formatCall(l.call) : l.text)).join("\n");
}

function indent(s: string) {
  return s.split("\n").map((l) => "    " + l).join("\n");
}

export type { Area };
