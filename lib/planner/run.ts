// run(file): the ONE entry point. The CLI (plan.ts) and the web API both call this, so there is no second code path.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chronological, fold, isSuperseded, screen } from "./ledger.ts";
import { CallBudget } from "./llm.ts";
import { FRESH_RUN_MIN_MESSAGES, FULL_RUN_CALL_LIMIT, UPDATE_CALL_LIMIT, POLICY_TEXT } from "./policy.ts";
import { readMessages } from "./reader.ts";
import { answersRecord, mergeGaps, type Answer } from "./gaps.ts";
import { renderPlan } from "./render.ts";
import { solve } from "./solver.ts";
import { hashText, splitMessages } from "./split.ts";
import { Trace, formatTrace } from "./trace.ts";
import type { Gap, MessageRecord, Plan, TraceLine } from "./types.ts";

export type Session = {
  messages: MessageRecord[];
  plan: Plan | null;
  infeasible?: string;
  trace: TraceLine[];
  nextN: number;
  runs: { mode: string; at: string; calls: number; tokens: number }[];
  /** Human in the loop: facts still missing, and what the organiser chose for each. */
  gaps?: Gap[];
  answers?: Answer[];
};

type Mode = "fresh" | "update" | "answer";

export type RunResult = Session & { mode: Mode; modeReason: string; runTokens: { input: number; output: number; total: number; calls: number }; grandTotal: number };

// Vercel functions can only write under /tmp (ephemeral, per instance).
export const DATA_ROOT = process.env.VERCEL ? "/tmp/mtm" : process.cwd();
const ROOT = DATA_ROOT;
const STATE = join(ROOT, "state");
const OUT = join(ROOT, "out");
const SESSION = join(STATE, "session.json");

export function loadSession(): Session | null {
  if (!existsSync(SESSION)) return null;
  return JSON.parse(readFileSync(SESSION, "utf-8")) as Session;
}

export async function run(file: string): Promise<RunResult> {
  const raw = readFileSync(file, "utf-8");
  return runText(raw);
}

export async function runText(raw: string): Promise<RunResult> {
  const texts = splitMessages(raw);
  const prev = loadSession();

  // ---- mode: decided by the input itself, never by a flag ----
  const fresh = !prev || texts.length >= FRESH_RUN_MIN_MESSAGES;
  const modeReason = !prev ? "no saved state" : fresh ? `${texts.length} messages in file (>= ${FRESH_RUN_MIN_MESSAGES} means a new pack)` : `${texts.length} message(s), state exists`;
  if (fresh && prev) archive();

  const session: Session = fresh ? { messages: [], plan: null, trace: [], nextN: 1, runs: [], gaps: [], answers: [] } : prev!;
  const trace = new Trace(session.nextN);
  trace.log(`\n===== RUN ${session.runs.length + 1}: MODE ${fresh ? "fresh" : "update"} (${modeReason}) at ${new Date().toISOString()} =====`);
  if (fresh) for (const p of POLICY_TEXT) trace.log(`POLICY: ${p}`);

  // ---- register messages; skip exact duplicates (0 calls) ----
  const seen = new Set(session.messages.map((m) => m.hash));
  const fresh_: MessageRecord[] = [];
  for (const text of texts) {
    const hash = hashText(text);
    const id = session.messages.length + 1;
    const rec: MessageRecord = { id, seq: id, text, hash, status: "accepted" };
    session.messages.push(rec);
    if (seen.has(hash)) {
      rec.status = "duplicate";
      rec.reason = "already applied; skipped (0 calls)";
      trace.log(`MSG #${id}: DUPLICATE, skipped`);
      continue;
    }
    seen.add(hash);
    fresh_.push(rec);
  }

  // ---- read (the only model step) ----
  const budget = new CallBudget(fresh ? FULL_RUN_CALL_LIMIT : UPDATE_CALL_LIMIT);
  if (fresh_.length) {
    const known = fresh ? undefined : knownKeys(session);
    try {
      const reads = await readMessages(fresh_, { trace, budget, known });
      reads.forEach((r, i) => (fresh_[i].read = r));
    } catch (e) {
      trace.log(`ERROR: reading failed: ${(e as Error).message}. Plan left unchanged.`);
      for (const r of fresh_) { r.status = "rejected"; r.reason = `could not be read: ${(e as Error).message}`; }
      return finish(session, trace, fresh ? "fresh" : "update", modeReason);
    }
  }

  // ---- screen: relevance, derived values, ownership ----
  const candidates: MessageRecord[] = [];
  for (const r of fresh_) {
    const s = screen(r.read!);
    if (s.status === "ok") candidates.push(r);
    else { r.status = s.status; r.reason = s.reason; trace.log(`MSG #${r.id}: ${s.status.toUpperCase()}: ${s.reason}`); }
    if (s.status === "ok") trace.log(`MSG #${r.id}: read as ${r.read!.sender_role}${r.read!.date ? ` ${r.read!.date}` : ""}; areas touched: ${areasOf(r).join(", ") || "none"}`);
  }

  // ---- solve + validate ----
  const accepted = () => session.messages.filter((m) => m.status === "accepted" && m.read && !fresh_.includes(m));
  if (fresh) {
    let pool = [...candidates];
    let res = solve(fold(withAnswers(session, pool), (s) => trace.log(s)));
    // If the full pack cannot be planned, find the newest non-authority message whose removal fixes it: that one is wrong.
    if (!res.ok) {
      const firstReason = res.reason;
      for (const suspect of chronological(pool).reverse().filter((m) => m.read!.sender_role !== "authority")) {
        const without = pool.filter((m) => m !== suspect);
        const r2 = solve(fold(withAnswers(session, without)));
        if (r2.ok) {
          suspect.status = "rejected";
          suspect.reason = `conflicts with other facts: with it, ${firstReason}`;
          trace.log(`MSG #${suspect.id}: REJECTED: ${suspect.reason}`);
          pool = without;
          res = r2;
          break;
        }
      }
    }
    finalize(session, pool, res, trace);
  } else {
    for (const r of candidates) {
      const pool = [...accepted(), r];
      const res = solve(fold(withAnswers(session, pool)));
      if (res.ok) {
        const before = session.plan;
        finalize(session, pool, res, trace);
        trace.log(`MSG #${r.id}: ACCEPTED. ${diff(before, res.plan)}`);
      } else {
        r.status = "rejected";
        r.reason = `would break the plan: ${res.reason}. Last valid plan kept.`;
        trace.log(`MSG #${r.id}: REJECTED: ${r.reason}`);
      }
    }
    if (!candidates.length) trace.log("No plan-changing message in this update; plan unchanged.");
  }
  return finish(session, trace, fresh ? "fresh" : "update", modeReason);
}

/** Organiser answers ride along as one synthetic message folded last, so they win like any newer fact. */
function withAnswers(session: Session, pool: MessageRecord[]): MessageRecord[] {
  const rec = answersRecord(session.answers ?? []);
  return rec ? [...pool, rec] : pool;
}

/** Human in the loop: apply one organiser answer (value / keep TBA / ignore). Re-solves only: 0 model calls. */
export async function answer(a: Answer): Promise<RunResult> {
  const session = loadSession();
  if (!session) throw new Error("no plan yet: run a message pack first");
  session.answers = [...(session.answers ?? []).filter((x) => x.key !== a.key), a];
  const trace = new Trace(session.nextN);
  const reason = `organiser ${a.action === "value" ? `answered ${a.key} = ${JSON.stringify(a.value)}` : a.action === "tba" ? `kept ${a.key} as TBA` : `ignored ${a.key}`}`;
  trace.log(`\n===== RUN ${session.runs.length + 1}: MODE answer (${reason}) at ${new Date().toISOString()} =====`);
  trace.log("ORGANISER: answers are facts from the organiser; re-solving only (0 model calls)");
  const pool = session.messages.filter((m) => (m.status === "accepted" || m.status === "superseded") && m.read);
  const res = solve(fold(withAnswers(session, pool), (s) => trace.log(s)));
  finalize(session, pool, res, trace);
  return finish(session, trace, "answer", reason);
}

function finalize(session: Session, pool: MessageRecord[], res: ReturnType<typeof solve>, trace: Trace) {
  const st = fold(withAnswers(session, pool));
  session.gaps = mergeGaps(res.gaps, session.answers ?? []);
  for (const g of session.gaps.filter((g) => g.status === "open")) trace.log(`GAP (asking organiser): ${g.key}: ${g.question}`);
  for (const l of res.log) trace.log(l);
  if (res.ok) {
    session.plan = res.plan;
    session.infeasible = undefined;
    for (const c of res.plan.checks) trace.log(`CHECK ${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
    for (const u of res.plan.unhandled) trace.log(`UNHANDLED constraint (shown in UI): ${u}`);
  } else {
    session.infeasible = res.reason;
    trace.log(`INFEASIBLE: ${res.reason}`);
  }
  for (const m of pool) {
    if (isSuperseded(m, st)) { m.status = "superseded"; m.reason = "every figure in it was replaced by a newer message"; trace.log(`MSG #${m.id}: SUPERSEDED (newer facts win)`); }
    else if (m.status === "superseded") { m.status = "accepted"; m.reason = undefined; }
  }
}

function finish(session: Session, trace: Trace, mode: Mode, modeReason: string): RunResult {
  const t = trace.tokens();
  const prevTotal = session.runs.reduce((s, r) => s + r.tokens, 0);
  session.runs.push({ mode, at: new Date().toISOString(), calls: t.calls, tokens: t.total });
  trace.log(`RUN SUBTOTAL: ${t.calls} model calls, tokens input=${t.input} output=${t.output} total=${t.total}`);
  trace.log(`TOTAL TOKENS (session): ${prevTotal + t.total}`);
  session.trace.push(...trace.lines);
  session.nextN = trace.nextN;

  mkdirSync(STATE, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(SESSION, JSON.stringify(session, null, 2), "utf-8");
  writeFileSync(join(OUT, "plan.json"), JSON.stringify({ plan: session.plan, infeasible: session.infeasible, gaps: session.gaps ?? [], messages: session.messages.map(({ text, ...m }) => ({ ...m, text })) }, null, 2), "utf-8");
  writeFileSync(join(OUT, "plan.md"), renderPlan(session.plan, session.messages, session.infeasible, session.gaps), "utf-8");
  writeFileSync(join(OUT, "trace.txt"), formatTrace(session.trace), "utf-8");
  return { ...session, mode, modeReason, runTokens: t, grandTotal: prevTotal + t.total };
}

function archive() {
  const dir = join(STATE, "archive", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });
  renameSync(SESSION, join(dir, "session.json"));
}

/** Existing keys/subjects passed to update calls so the model reuses names instead of inventing new ones. */
function knownKeys(s: Session): string {
  const st = fold(s.messages.filter((m) => m.status === "accepted" || m.status === "superseded"));
  const parts = [
    `venue.option: ${Object.keys(st.venues).join(", ")}`,
    `food.option: ${Object.keys(st.foods).join(", ")}`,
    `spent.item: ${Object.keys(st.spent).join(", ")}`,
    `cost.required: ${Object.keys(st.required).join(", ")}`,
    `people.group: ${Object.keys(st.groups).join(", ")}`,
    `schedule.break: ${Object.keys(st.breaks).join(", ")}`,
  ];
  return parts.filter((p) => !p.endsWith(": ")).join("\n");
}

function areasOf(r: MessageRecord): string[] {
  const a = new Set<string>();
  for (const f of r.read?.facts ?? []) {
    if (f.key.startsWith("venue")) a.add("venue");
    else if (f.key.startsWith("food")) a.add("food");
    else if (f.key.startsWith("judge")) a.add("judging");
    else if (f.key.startsWith("schedule") || /duration|start|end_by/.test(f.key)) a.add("schedule");
    else a.add("budget");
  }
  for (const c of r.read?.constraints ?? []) a.add(c.area);
  for (const q of r.read?.requests ?? []) a.add(q.area);
  return [...a];
}

function diff(a: Plan | null, b: Plan): string {
  if (!a) return "First valid plan.";
  const ch: string[] = [];
  if (a.venue.name !== b.venue.name) ch.push(`venue ${a.venue.name} -> ${b.venue.name}`);
  if (a.food.name !== b.food.name || a.food.cost !== b.food.cost) ch.push(`food ${a.food.name} ${a.food.cost} -> ${b.food.name} ${b.food.cost}`);
  if (a.judging.needed !== b.judging.needed) ch.push(`judges ${a.judging.needed} -> ${b.judging.needed}`);
  if (a.headcount.total !== b.headcount.total) ch.push(`headcount ${a.headcount.total} -> ${b.headcount.total}`);
  if (a.budget.total !== b.budget.total) ch.push(`total ${a.budget.total} -> ${b.budget.total}`);
  const ea = a.extras.filter((e) => e.included).map((e) => e.item).join(",");
  const eb = b.extras.filter((e) => e.included).map((e) => e.item).join(",");
  if (ea !== eb) ch.push(`optional [${ea}] -> [${eb}]`);
  return ch.length ? `Changed: ${ch.join("; ")}` : "No change to the plan.";
}
