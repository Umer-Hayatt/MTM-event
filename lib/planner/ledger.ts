// The ledger: turns accepted messages into the CURRENT facts, and screens each new message
// (relevant? sender owns it? tries to set a derived value?). Newer wins; add/remove are applied here, not by the model.
import { CONSTRAINT_OWNERS, DERIVED_KEYS, ownersFor } from "./policy.ts";
import type { FactState, MessageRecord, Option, ReadMessage } from "./types.ts";

export function emptyState(): FactState {
  return { event: {}, groups: {}, venues: {}, foods: {}, judge: {}, spent: {}, required: {}, breaks: {}, constraints: [], requests: [], sources: {} };
}

/** Order messages by date, oldest first. A message with no date takes the latest date seen before it (arrival order). */
export function chronological(records: MessageRecord[]): MessageRecord[] {
  let last = "";
  const keyed = [...records].sort((a, b) => a.seq - b.seq).map((r) => {
    const d = normDate(r.read?.date ?? null);
    const eff = d ?? last;
    if (d && d > last) last = d;
    return { r, eff };
  });
  return keyed.sort((a, b) => (a.eff === b.eff ? a.r.seq - b.r.seq : a.eff < b.eff ? -1 : 1)).map((k) => k.r);
}

/** Compare as MM-DD: packs rarely state a year, and every message is about one event. */
function normDate(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

const norm = (s: string | null | undefined) => (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
const snake = (s: unknown) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const asNum = (v: unknown): number | undefined => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v.replace(/[,\s]/g, "").replace(/^rs\.?/i, "")); return isFinite(n) && v.trim() !== "" ? n : undefined; }
  return undefined;
};

/** Fold accepted messages (in date order) into the current facts. Later facts overwrite earlier ones. */
export function fold(records: MessageRecord[], log?: (s: string) => void): FactState {
  const st = emptyState();
  for (const r of chronological(records)) {
    const m = r.read;
    if (!m) continue;
    for (const f of m.facts) applyFact(st, f.key, f.subject ?? null, f.action, f.value, r.id, log);
    for (const c of m.constraints) st.constraints.push({ ...c, source: r.id });
    for (const q of m.requests) {
      const i = st.requests.findIndex((x) => norm(x.item) === norm(q.item));
      if (i >= 0) st.requests.splice(i, 1);
      st.requests.push({ ...q, source: r.id });
    }
  }
  return st;
}

function applyFact(st: FactState, key: string, subject: string | null, action: "set" | "add" | "remove", value: unknown, src: number, log?: (s: string) => void) {
  const sub = norm(subject);
  const mark = (k: string) => (st.sources[k] = src);
  const numeric = (prev: number | undefined) => {
    const v = asNum(value);
    if (v === undefined) return prev;
    return action === "add" ? (prev ?? 0) + v : v;
  };

  if (key.startsWith("event.")) {
    const f = key.slice(6);
    if (f === "start_time" || f === "end_by") st.event[f] = String(value);
    else { const v = numeric(asNum(st.event[f])); if (v !== undefined) st.event[f] = v; }
    return mark(key);
  }
  if (key.startsWith("judge.")) {
    const f = key.slice(6);
    const v = numeric(st.judge[f]);
    if (v !== undefined) st.judge[f] = v;
    return mark(key);
  }
  const bucket = ({ "people.group": st.groups, "spent.item": st.spent, "cost.required": st.required } as Record<string, Record<string, number>>)[key];
  if (bucket) {
    if (key === "people.group" && /student|judge/.test(sub)) {
      log?.(`POLICY: ignored people.group "${subject}" from msg ${src} (students and judges are counted separately)`);
      return;
    }
    if (action === "remove") delete bucket[sub];
    else { const v = numeric(bucket[sub]); if (v !== undefined) bucket[sub] = v; }
    return mark(`${key}|${sub}`);
  }
  if (key === "venue.option" || key === "food.option") {
    const map = key === "venue.option" ? st.venues : st.foods;
    if (action === "remove") { delete map[sub]; return mark(`${key}|${sub}`); }
    const prev = map[sub];
    const obj = (typeof value === "object" && value ? value : { price: value }) as Record<string, unknown>;
    const attrs = Array.isArray(obj.attrs) ? obj.attrs.map(snake) : [];
    const next: Option = {
      name: subject ?? sub,
      price: asNum(obj.price) ?? prev?.price ?? NaN,
      seats: asNum(obj.seats) ?? asNum(obj.capacity) ?? prev?.seats,
      attrs: action === "add" || !attrs.length ? [...new Set([...(prev?.attrs ?? []), ...attrs])] : attrs,
      source: src,
    };
    map[sub] = next;
    return mark(`${key}|${sub}`);
  }
  if (key === "schedule.break") {
    const v = asNum(value);
    if (action === "remove") delete st.breaks[sub];
    else if (v !== undefined) st.breaks[sub] = { minutes: v };
    return mark(`${key}|${sub}`);
  }
  log?.(`UNHANDLED fact from msg ${src}: ${key}${subject ? ` (${subject})` : ""} = ${JSON.stringify(value)}`);
}

/** Pre-solve screening of one message. Returns a reason if it must be rejected/ignored. */
export function screen(m: ReadMessage): { status: "ok" | "ignored" | "rejected"; reason?: string } {
  if (!m.relevant && !m.facts.length && !m.constraints.length && !m.requests.length) return { status: "ignored", reason: "not relevant to venue, schedule, food, judging or budget" };
  for (const f of m.facts) {
    if (DERIVED_KEYS.some((d) => f.key === d || f.key.startsWith(d))) {
      return { status: "rejected", reason: `tries to set "${f.key}"${f.value !== undefined ? ` to ${JSON.stringify(f.value)}` : ""}, which is computed by the planner from other facts (nobody owns it)` };
    }
    if (f.key === "other") continue;
    const owners = ownersFor(f.key);
    if (owners.length && !owners.includes(m.sender_role)) {
      return { status: "rejected", reason: `sender role "${m.sender_role}" does not own "${f.key}${f.subject ? ` (${f.subject})` : ""}" (owners: ${owners.join(", ")})` };
    }
  }
  for (const c of m.constraints) {
    if (c.hard && !CONSTRAINT_OWNERS[c.area]?.includes(m.sender_role)) {
      return { status: "rejected", reason: `sender role "${m.sender_role}" cannot impose a hard ${c.area} rule ("${c.text ?? `${c.target} ${c.op} ${c.value}`}")` };
    }
  }
  if (!m.relevant && m.facts.every((f) => f.key === "other")) return { status: "ignored", reason: "not relevant to the plan" };
  return { status: "ok" };
}

/** A message is superseded when every fact it set has since been overwritten by a newer message. */
export function isSuperseded(r: MessageRecord, st: FactState): boolean {
  const m = r.read;
  if (!m || !m.facts.length || m.constraints.length || m.requests.length) return false;
  return m.facts.every((f) => {
    const k = f.subject && !f.key.startsWith("event.") && !f.key.startsWith("judge.") ? `${f.key}|${norm(f.subject)}` : f.key;
    return st.sources[k] !== undefined && st.sources[k] !== r.id;
  });
}
