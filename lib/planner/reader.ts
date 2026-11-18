// The ONLY language step: messages -> facts / constraints / requests as JSON.
// Why a model here: Roman Urdu, messy wording, "1.2 lakh". Everything after this is plain code.
import { z } from "zod";
import { callModel, type CallBudget } from "./llm.ts";
import type { Trace } from "./trace.ts";
import type { RawMessage, ReadMessage } from "./types.ts";

const num = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v.replace(/,/g, ""))) ? Number(v.replace(/,/g, "")) : v), z.unknown());
const AREAS = ["reading", "venue", "schedule", "food", "judging", "budget"] as const;

const FactZ = z.object({
  key: z.string(),
  subject: z.string().nullish(),
  action: z.enum(["set", "add", "remove"]).catch("set"),
  value: num.optional(),
  unit: z.string().nullish(),
});
const ConstraintZ = z.object({
  area: z.enum(AREAS).catch("budget"),
  target: z.string(),
  op: z.enum(["==", "!=", "<", "<=", ">", ">=", "has"]).catch("=="),
  value: num,
  hard: z.boolean().catch(true),
  text: z.string().optional(),
});
const RequestZ = z.object({ area: z.enum(AREAS).catch("budget"), item: z.string(), cost: z.coerce.number().catch(0) });
const MsgZ = z.object({
  id: z.coerce.number(),
  sender_role: z.enum(["authority", "venue", "caterer", "finance", "judging_coordinator", "participant", "unknown"]).catch("unknown"),
  date: z.string().nullish().transform((d) => d ?? null),
  relevant: z.boolean().catch(true),
  facts: z.array(FactZ).catch([]),
  constraints: z.array(ConstraintZ).catch([]),
  requests: z.array(RequestZ).catch([]),
});
const OutZ = z.object({ messages: z.array(MsgZ) });

// Kept short on purpose: input tokens are paid on every call. The example uses made-up names/numbers, never pack facts.
export const SYSTEM = `You extract structured facts from event-planning messages (English or Roman Urdu). Output JSON only:
{"messages":[{"id":n,"sender_role":R,"date":"YYYY-MM-DD"|"MM-DD"|null,"relevant":bool,"facts":[F],"constraints":[C],"requests":[Q]}]}
R: authority (dean/director/approver/organiser who sets rules) | venue | caterer | finance | judging_coordinator | participant (student/judge/attendee) | unknown
F: {"key":K,"subject":str|null,"action":"set"|"add"|"remove","value":V}
K and V:
 event.students|event.teams|event.team_size|event.duration_min|event.budget : number
 event.start_time|event.end_by : "HH:MM" 24h
 people.group : subject=group name (staff, volunteers...), value=count. NOT students, NOT judges.
 venue.option : subject=venue name, value={"price":n,"seats":n,"attrs":["snake_case",...]}
 food.option : subject=tier/item name, value={"price":per_head_n,"attrs":[...]}
 judge.confirmed|judge.fee|judge.min_per_team|judge.max_teams : number (fee per judge; minutes per team; max teams one judge covers)
 spent.item : subject=item, value=amount already ordered/paid
 cost.required : subject=item, value=amount that must be paid
 schedule.break : subject=name, value=minutes (add "at":"HH:MM" in subject only if a clock time is given)
 food.boxes|judges.count|venue.capacity|total.cost : use ONLY if a message tries to set these numbers directly
 other : subject=short text of anything else
C (hard rule stated by sender): {"area":"venue|food|judging|schedule|budget","target":T,"op":"==|!=|<|<=|>|>=|has","value":V,"hard":true,"text":"original words"}
 T: venue.attrs|venue.seats|venue.price|food.cost|food.price|food.attrs|judges.count|schedule.end|schedule.start|total.cost|or best guess
Q (optional wish/request with a cost): {"area":..,"item":str,"cost":n}
Rules: money as integer PKR (1.2 lakh=120000, "1,20,000"=120000). Durations in minutes (4-hour=240). Copy each message id. One fact per number. Do not compute totals. relevant=false if nothing affects venue/schedule/food/judging/budget. A fact restated later is still "set". "N more" = "add". Cancelled/closed option = "remove".
Example: "Director: event is 3 hours for 90 students, teams of 3. Budget Rs 2 lakh." -> facts event.duration_min 180, event.students 90, event.team_size 3, event.budget 200000; sender_role authority.`;

export async function readMessages(msgs: RawMessage[], ctx: { trace: Trace; budget: CallBudget; known?: string }): Promise<ReadMessage[]> {
  const body = msgs.map((m) => `<msg id=${m.id}>\n${m.text}\n</msg>`).join("\n");
  const user = (ctx.known ? `Reuse these existing keys/subjects when the same thing is meant:\n${ctx.known}\n\n` : "") + body;

  let raw = await callModel({ area: "reading", system: SYSTEM, user, trace: ctx.trace, budget: ctx.budget });
  let parsed = tryParse(raw);
  if (!parsed.ok) {
    // One repair retry, traced, counts toward the call limit.
    ctx.trace.log(`READER: output failed validation (${parsed.error}); one repair retry`);
    raw = await callModel({ area: "reading", system: SYSTEM, user: `${user}\n\nYour previous output was invalid (${parsed.error}). Return valid JSON matching the schema.`, trace: ctx.trace, budget: ctx.budget, note: "repair retry" });
    parsed = tryParse(raw);
    if (!parsed.ok) throw new Error(`Reader output invalid after retry: ${parsed.error}`);
  }
  const byId = new Map(parsed.value.messages.map((m) => [m.id, m]));
  // Every message gets a result; one the model skipped is marked unreadable rather than silently dropped.
  return msgs.map((m) => (byId.get(m.id) as ReadMessage | undefined) ?? { id: m.id, sender_role: "unknown", date: null, relevant: false, facts: [], constraints: [], requests: [] });
}

function tryParse(raw: string): { ok: true; value: z.infer<typeof OutZ> } | { ok: false; error: string } {
  try {
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const r = OutZ.safeParse(Array.isArray(json) ? { messages: json } : json);
    return r.success ? { ok: true, value: r.data } : { ok: false, error: r.error.issues[0]?.message ?? "schema" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
