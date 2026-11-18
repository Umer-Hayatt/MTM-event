// The one command:  node plan.ts <file>
// Full pack or a single new message: same command, the system decides the mode itself.
import { existsSync } from "node:fs";
import { formatTrace } from "./lib/planner/trace.ts";
import { renderPlan } from "./lib/planner/render.ts";
import { run } from "./lib/planner/run.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
process.stdout.setDefaultEncoding?.("utf-8");

const file = process.argv[2];
if (!file) {
  console.error("usage: node plan.ts <messages-file>");
  process.exit(1);
}

const t0 = Date.now();
const res = await run(file);
const runLines = res.trace.slice(res.trace.length - countRunLines(res));
console.log(formatTrace(runLines));
console.log("\n" + renderPlan(res.plan, res.messages, res.infeasible));
console.log(`\nMode: ${res.mode} (${res.modeReason}). ${res.runTokens.calls} calls, ${res.runTokens.total} tokens this run, ${res.grandTotal} in session. ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log("Saved: out/plan.md, out/plan.json, out/trace.txt");

function countRunLines(r: typeof res): number {
  // Lines from this run start at the last "===== RUN" header.
  for (let i = r.trace.length - 1; i >= 0; i--) {
    const l = r.trace[i];
    if (l.kind === "log" && l.text.includes("===== RUN")) return r.trace.length - i;
  }
  return r.trace.length;
}
