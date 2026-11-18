// The one command:  node plan.ts <file>
// Full pack or a single new message: same command, the system decides the mode itself.
import { existsSync } from "node:fs";
import { formatTrace } from "./lib/planner/trace.ts";
import { renderPlan } from "./lib/planner/render.ts";
import { answer, run } from "./lib/planner/run.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
process.stdout.setDefaultEncoding?.("utf-8");

// Human in the loop: node plan.ts --answer event.duration_min=240 | --tba <key> | --ignore <key>
const [flag, arg] = process.argv.slice(2);
const file = flag;
if (!file || (flag.startsWith("--") && !arg)) {
  console.error("usage: node plan.ts <messages-file>\n       node plan.ts --answer <key>=<value> | --tba <key> | --ignore <key>");
  process.exit(1);
}

const t0 = Date.now();
const res = flag === "--answer"
  ? await answer({ key: arg.slice(0, arg.indexOf("=")), action: "value", value: arg.slice(arg.indexOf("=") + 1) })
  : flag === "--tba" ? await answer({ key: arg, action: "tba" })
  : flag === "--ignore" ? await answer({ key: arg, action: "ignore" })
  : await run(file);
const runLines = res.trace.slice(res.trace.length - countRunLines(res));
console.log(formatTrace(runLines));
console.log("\n" + renderPlan(res.plan, res.messages, res.infeasible, res.gaps));
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
