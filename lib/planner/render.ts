// Turns a plan + message log into the human-readable plan.md (also used for the upload form).
import { fmtRel } from "./schedule.ts";
import type { MessageRecord, Plan } from "./types.ts";

const rs = (n: number) => (n === Infinity ? "no cap" : `Rs ${n.toLocaleString("en-US")}`);

export function renderPlan(plan: Plan | null, msgs: MessageRecord[], infeasible?: string): string {
  const out: string[] = ["# Event plan", ""];
  if (infeasible) out.push(`> **Latest change could not be planned:** ${infeasible}`, "");
  if (!plan) {
    out.push("No valid plan yet.");
  } else {
    out.push(
      "## Venue",
      `- **${plan.venue.name}**: seats ${plan.venue.seats}, ${rs(plan.venue.price)}${plan.venue.attrs.length ? `, ${plan.venue.attrs.join(", ")}` : ""} (msg ${plan.venue.source})`,
      `- Headcount ${plan.headcount.total} = ${Object.entries(plan.headcount.parts).map(([k, v]) => `${k} ${v}`).join(" + ")}`,
      "",
      "## Food",
      `- **${plan.food.name}** x ${plan.food.boxes} boxes @ ${rs(plan.food.price)} = ${rs(plan.food.cost)} (msg ${plan.food.source})`,
      "",
      "## Judging",
      `- ${plan.judging.needed} judges needed (${plan.teams} teams, max ${plan.judging.teamsPerJudge} each), ${plan.judging.confirmed} confirmed`,
      `- ${plan.judging.minutesPerTeam} min per team -> judging block ${plan.judging.blockMinutes} min, all judges in parallel`,
      `- Honorarium ${plan.judging.needed} x ${rs(plan.judging.fee)} = ${rs(plan.judging.cost)}`,
      "",
      "## Schedule",
      ...plan.schedule.blocks.map((b) => `- ${b.clock ?? `${fmtRel(b.start)}-${fmtRel(b.end)}`}  ${b.name} (${b.end - b.start} min)`),
      ...plan.schedule.notes.map((n) => `- _Note: ${n}_`),
      "",
      "## Budget",
      ...plan.budget.lines.map((l) => `- ${l.label}: ${rs(l.amount)}${l.source ? ` (msg ${l.source})` : ""}`),
      `- **Total ${rs(plan.budget.total)} of ${rs(plan.budget.cap)}** (remaining ${rs(plan.budget.remaining)})`,
      ...plan.extras.map((e) => `- Optional ${e.item} ${rs(e.cost)}: ${e.included ? "included" : "dropped"} (${e.why})`),
      "",
      "## Checks",
      ...plan.checks.map((c) => `- ${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`),
      ...(plan.unhandled.length ? ["", "## Unhandled constraints (shown, not silently ignored)", ...plan.unhandled.map((u) => `- ${u}`)] : []),
      "",
      `_${plan.ranking}_`,
    );
  }
  out.push("", "## Messages", ...msgs.map((m) => `- #${m.id} **${m.status.toUpperCase()}**${m.read ? ` [${m.read.sender_role}${m.read.date ? `, ${m.read.date}` : ""}]` : ""}${m.reason ? `: ${m.reason}` : ""}\n  > ${m.text.replace(/\s+/g, " ").slice(0, 160)}`));
  const rejected = msgs.filter((m) => m.status === "rejected");
  out.push("", "## Rejected messages", ...(rejected.length ? rejected.map((m) => `- #${m.id}: ${m.reason}`) : ["- none"]));
  return out.join("\n");
}
