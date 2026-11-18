// The solver: plain arithmetic + enumerate-and-rank. No model calls.
// Builds every hall x food option x subset of optional requests, drops any that break a hard rule or the budget,
// then ranks the rest by policy. Greedy picking can miss the valid plan; enumeration cannot (inputs are tiny).
import { MAX_REQUESTS_ENUMERATED, POLICY_TEXT } from "./policy.ts";
import { buildSchedule, fmtClock, toMin, type ScheduleResult } from "./schedule.ts";
import { validate } from "./validator.ts";
import type { Constraint, FactState, Option, Plan } from "./types.ts";

export type SolveResult = { ok: true; plan: Plan; log: string[] } | { ok: false; reason: string; log: string[] };

type Candidate = { venue: Option; food: Option; extras: { item: string; cost: number }[]; total: number; failures: string[] };

export function solve(st: FactState): SolveResult {
  const log: string[] = [];
  const missing = (what: string): SolveResult => ({ ok: false, reason: `cannot plan: ${what} not stated in any accepted message`, log });

  // --- people & judging (pure arithmetic) ---
  const students = Number(st.event.students) || 0;
  const teamSize = Number(st.event.team_size) || 0;
  const teams = Number(st.event.teams) || (students && teamSize ? Math.ceil(students / teamSize) : 0);
  if (!students && !teams) return missing("number of students/teams");
  const maxTeams = st.judge.max_teams || 0;
  const minPerTeam = st.judge.min_per_team || 0;
  const judgesNeeded = maxTeams ? Math.ceil(teams / maxTeams) : 0;
  if (!maxTeams) log.push("WARN: no 'max teams per judge' stated; judges needed cannot be derived");
  const confirmed = st.judge.confirmed;
  if (confirmed !== undefined && judgesNeeded > confirmed) {
    return { ok: false, reason: `needs ${judgesNeeded} judges (ceil(${teams} teams / ${maxTeams} per judge)) but only ${confirmed} confirmed`, log };
  }
  const fee = st.judge.fee || 0;
  const judgeCost = judgesNeeded * fee;

  const parts: Record<string, number> = { students: students || teams * teamSize };
  for (const [g, n] of Object.entries(st.groups)) parts[g] = n;
  parts["judges (needed)"] = judgesNeeded;
  const headcount = Object.values(parts).reduce((s, n) => s + n, 0);
  log.push(`POLICY: ${POLICY_TEXT[0]} -> ${Object.entries(parts).map(([k, v]) => `${k} ${v}`).join(" + ")} = ${headcount}`);
  log.push(`POLICY: ${POLICY_TEXT[1]} -> ceil(${teams}/${maxTeams || "?"}) = ${judgesNeeded}, paid ${judgesNeeded} x ${fee} = ${judgeCost}`);

  // --- schedule (independent of venue/food choice) ---
  const judgingBlock = (maxTeams || 0) * minPerTeam;
  const foods = Object.values(st.foods).filter((f) => isFinite(f.price));
  const venues = Object.values(st.venues).filter((v) => isFinite(v.price));
  if (!venues.length) return missing("any venue option with a price");
  if (!foods.length) return missing("any food option with a price");
  const sched = buildSchedule(st, judgingBlock, true);
  if (sched.error) return { ok: false, reason: `schedule: ${sched.error}`, log };
  log.push(`POLICY: ${POLICY_TEXT[4]}`);

  // --- money that does not depend on the choice ---
  const cap = Number(st.event.budget) || Infinity;
  const spent = Object.values(st.spent).reduce((s, n) => s + n, 0);
  const required = Object.values(st.required).reduce((s, n) => s + n, 0);
  const fixed = judgeCost + spent + required;

  // --- enumerate ---
  const reqs = st.requests.filter((r) => r.cost >= 0);
  const enumReqs = reqs.slice(0, MAX_REQUESTS_ENUMERATED);
  const subsets: (typeof reqs)[] = [];
  for (let mask = 0; mask < 1 << enumReqs.length; mask++) subsets.push(enumReqs.filter((_, i) => mask & (1 << i)));

  const unhandled = new Set<string>();
  const cands: Candidate[] = [];
  for (const venue of venues) for (const food of foods) for (const extras of subsets) {
    const foodCost = food.price * headcount;
    const total = venue.price + foodCost + fixed + extras.reduce((s, e) => s + e.cost, 0);
    const failures: string[] = [];
    if (venue.seats === undefined) failures.push(`${venue.name}: seating unknown`);
    else if (venue.seats < headcount) failures.push(`${venue.name} seats ${venue.seats} < headcount ${headcount}`);
    if (total > cap) failures.push(`total ${total} > budget ${cap}`);
    const ctx = { venue, food, foodCost, total, cap, judgesNeeded, judgeCost, headcount, sched };
    for (const c of st.constraints.filter((c) => c.hard)) {
      const r = checkConstraint(c, ctx);
      if (r === "unhandled") unhandled.add(`${c.area}: ${c.text ?? `${c.target} ${c.op} ${JSON.stringify(c.value)}`} (msg ${c.source})`);
      else if (r !== true) failures.push(r);
    }
    cands.push({ venue, food, extras, total, failures });
  }

  const valid = cands.filter((c) => !c.failures.length);
  if (!valid.length) {
    const counts = new Map<string, number>();
    for (const c of cands) for (const f of c.failures) counts.set(f.replace(/^[^:]+: /, ""), (counts.get(f) ?? 0) + 1);
    const nearest = [...cands].sort((a, b) => a.failures.length - b.failures.length || a.total - b.total)[0];
    return { ok: false, reason: `no valid plan among ${cands.length} options; closest (${nearest.venue.name} + ${nearest.food.name}) fails: ${nearest.failures.join("; ")}`, log };
  }

  // --- rank (policy) ---
  valid.sort((a, b) =>
    b.food.price - a.food.price ||
    b.extras.length - a.extras.length ||
    a.total - b.total ||
    (b.venue.seats ?? 0) - (a.venue.seats ?? 0) ||
    b.venue.attrs.length - a.venue.attrs.length,
  );
  const best = valid[0];
  const ranking = `${cands.length} plans checked, ${valid.length} valid; chose ${best.venue.name} + ${best.food.name}${best.extras.length ? ` + ${best.extras.map((e) => e.item).join(", ")}` : ""} (${POLICY_TEXT[3]})`;
  log.push(`SOLVER: ${ranking}`);

  const foodCost = best.food.price * headcount;
  const lines = [
    { label: `Venue: ${best.venue.name}`, amount: best.venue.price, source: best.venue.source },
    { label: `Food: ${best.food.name} ${headcount} x ${best.food.price}`, amount: foodCost, source: best.food.source },
    { label: `Judges: ${judgesNeeded} x ${fee}`, amount: judgeCost, source: st.sources["judge.fee"] },
    ...Object.entries(st.spent).map(([k, v]) => ({ label: `Already spent: ${k}`, amount: v, source: st.sources[`spent.item|${k}`] })),
    ...Object.entries(st.required).map(([k, v]) => ({ label: `Required: ${k}`, amount: v, source: st.sources[`cost.required|${k}`] })),
    ...best.extras.map((e) => ({ label: `Optional: ${e.item}`, amount: e.cost, source: (e as { source?: number }).source })),
  ];
  const remaining = cap === Infinity ? 0 : cap - best.total;
  const extras = reqs.map((r) => {
    const included = best.extras.includes(r);
    return { item: r.item, cost: r.cost, included, why: included ? `fits: ${remaining} left after it` : `dropped: would exceed budget or a rule (needs ${r.cost}, ${cap - best.total} left)` };
  });
  for (const e of extras) log.push(`REQUEST: ${e.item} (${e.cost}) ${e.included ? "INCLUDED" : "DROPPED"}: ${e.why}`);

  const plan: Plan = {
    headcount: { total: headcount, parts },
    teams,
    venue: best.venue,
    food: { ...best.food, boxes: headcount, cost: foodCost },
    judging: { needed: judgesNeeded, confirmed: confirmed ?? judgesNeeded, fee, cost: judgeCost, minutesPerTeam: minPerTeam, teamsPerJudge: maxTeams, blockMinutes: judgingBlock },
    schedule: { blocks: sched.blocks, lengthMin: sched.lengthMin, relative: sched.relative, notes: sched.notes },
    budget: { cap, lines, total: best.total, remaining },
    extras,
    checks: [],
    unhandled: [...unhandled],
    ranking,
  };
  plan.checks = validate(plan, st);
  const failed = plan.checks.filter((c) => !c.ok);
  if (failed.length) return { ok: false, reason: `validator: ${failed.map((c) => `${c.name}: ${c.detail}`).join("; ")}`, log };
  return { ok: true, plan, log };
}

// ---- constraint registry: the values code can compute for a candidate ----
type Ctx = { venue: Option; food: Option; foodCost: number; total: number; cap: number; judgesNeeded: number; judgeCost: number; headcount: number; sched: ScheduleResult };

const REGISTRY: Record<string, (c: Ctx) => unknown> = {
  "venue.attrs": (c) => c.venue.attrs,
  "venue.seats": (c) => c.venue.seats,
  "venue.price": (c) => c.venue.price,
  "venue.name": (c) => c.venue.name,
  "food.attrs": (c) => c.food.attrs,
  "food.price": (c) => c.food.price,
  "food.cost": (c) => c.foodCost,
  "food.name": (c) => c.food.name,
  "food.boxes": (c) => c.headcount,
  "judges.count": (c) => c.judgesNeeded,
  "judges.cost": (c) => c.judgeCost,
  "total.cost": (c) => c.total,
  "budget.remaining": (c) => c.cap - c.total,
  "headcount": (c) => c.headcount,
  "schedule.length": (c) => c.sched.lengthMin,
  "schedule.start": (c) => c.sched.startMin,
  "schedule.end": (c) => (c.sched.startMin === undefined ? undefined : c.sched.startMin + c.sched.lengthMin),
};

/** true = passes, string = failure reason, "unhandled" = no code can compute this target. */
export function checkConstraint(c: Constraint & { source?: number }, ctx: Ctx): true | string | "unhandled" {
  const target = c.target.toLowerCase().replace(/\s+/g, "");
  const getter = REGISTRY[target] ?? REGISTRY[target.replace(/s$/, "")] ?? (target.endsWith(".attr") ? REGISTRY[target + "s"] : undefined);
  if (!getter) return "unhandled";
  const actual = getter(ctx);
  const label = `${c.text ?? `${c.target} ${c.op} ${JSON.stringify(c.value)}`} (msg ${c.source ?? "?"})`;

  if (target.startsWith("schedule.") && actual === undefined) return true; // no start time: handled as a note by the schedule builder
  if (c.op === "has" || Array.isArray(actual)) {
    const want = String(c.value).toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const list = (Array.isArray(actual) ? actual : [actual]).map((a) => String(a).toLowerCase());
    const has = list.some((a) => a.includes(want) || want.includes(a));
    const pass = c.op === "!=" ? !has : has;
    return pass ? true : `${ctx.venue.name}/${ctx.food.name} fails "${label}"`;
  }
  const want = typeof c.value === "string" && /\d:\d\d/.test(c.value) ? toMin(c.value) : Number(c.value);
  const got = Number(actual);
  if (want === undefined || !isFinite(want) || !isFinite(got)) {
    if (c.op === "==" || c.op === "!=") {
      const eq = String(actual).toLowerCase() === String(c.value).toLowerCase();
      return (c.op === "==") === eq ? true : `fails "${label}"`;
    }
    return "unhandled";
  }
  const ok = { "==": got === want, "!=": got !== want, "<": got < want, "<=": got <= want, ">": got > want, ">=": got >= want }[c.op];
  const shown = target.startsWith("schedule.") && target !== "schedule.length" ? fmtClock(got) : got;
  return ok ? true : `${target}=${shown} fails "${label}"`;
}
