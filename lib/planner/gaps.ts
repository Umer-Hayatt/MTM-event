// Human-in-the-loop: when a fact is missing the planner marks that section TBA and asks the organiser.
// Answers become facts from the "organiser" (0 model calls; only the solver re-runs).
import type { Fact, Gap, MessageRecord } from "./types.ts";

export type Answer = { key: string; action: "value" | "tba" | "ignore"; value?: unknown };

/** The questions we can ask. `blocks` = plan sections shown as TBA while the gap is open. */
export const GAP_DEFS: Record<string, Omit<Gap, "key" | "status" | "value">> = {
  "event.students": { question: "How many students are taking part?", kind: "number", blocks: ["everything"] },
  "event.duration_min": { question: "How long is the event? (minutes, or e.g. 4h)", kind: "number", blocks: ["schedule"] },
  "event.budget": { question: "What is the total budget (Rs)?", kind: "number", blocks: ["budget"] },
  "judge.max_teams": { question: "How many teams can one judge cover?", kind: "number", blocks: ["judging"] },
  "venue.option": { question: "Which venue? (name, seats, price — e.g. Hall Q, 120 seats, Rs 45,000)", kind: "text", blocks: ["venue"] },
  "food.option": { question: "Which food option? (name and price per head — e.g. Lunch box, Rs 900)", kind: "text", blocks: ["food"] },
};

export function makeGap(key: string): Gap {
  return { key, status: "open", ...GAP_DEFS[key] };
}

const nums = (s: string) => [...s.replace(/(\d),(?=\d)/g, "$1").matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));

/** Minutes from "240", "4h", "4 hours", "3.5h", "2h30". */
function minutes(v: unknown): number | undefined {
  const s = String(v).trim().toLowerCase();
  const h = s.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\s*(\d+)?/);
  if (h) return Math.round(Number(h[1]) * 60 + Number(h[2] ?? 0));
  const n = nums(s)[0];
  return n === undefined ? undefined : n;
}

/** Turn one organiser answer into ordinary facts the ledger already understands. */
export function answerToFacts(key: string, value: unknown): Fact[] {
  const s = String(value ?? "").trim();
  if (key === "event.duration_min") {
    const m = minutes(s);
    return m ? [{ key, action: "set", value: m }] : [];
  }
  if (key === "venue.option") {
    const name = s.split(/[,;]|\d/)[0].trim() || "Organiser venue";
    const ns = nums(s.slice(name.length));
    const seatsMatch = s.match(/(\d[\d,]*)\s*(?:seats|people|pax|capacity)/i);
    const seats = seatsMatch ? Number(seatsMatch[1].replace(/,/g, "")) : ns[0];
    const price = ns.find((n) => n !== seats) ?? ns[1];
    return [{ key, subject: name, action: "set", value: { price, seats, attrs: [] } }];
  }
  if (key === "food.option") {
    const name = s.split(/[,;]|\d|rs/i)[0].trim() || "Organiser food";
    return [{ key, subject: name, action: "set", value: { price: nums(s)[0] } }];
  }
  const n = nums(s)[0];
  return n === undefined ? [] : [{ key, action: "set", value: n }];
}

/** All organiser value-answers as one synthetic accepted message, folded last (newest wins). */
export function answersRecord(answers: Answer[]): MessageRecord | undefined {
  const facts = answers.filter((a) => a.action === "value").flatMap((a) => answerToFacts(a.key, a.value));
  if (!facts.length) return undefined;
  return {
    id: 0, seq: Number.MAX_SAFE_INTEGER, text: "Organiser answers", hash: "organiser", status: "accepted",
    read: { id: 0, sender_role: "organiser", date: null, relevant: true, facts, constraints: [], requests: [] },
  };
}

/** Merge the solver's current gaps with the organiser's choices (tba / ignore / answered). */
export function mergeGaps(current: Gap[], answers: Answer[]): Gap[] {
  const out: Gap[] = current.map((g) => {
    const a = [...answers].reverse().find((x) => x.key === g.key);
    return a && a.action !== "value" ? { ...g, status: a.action === "tba" ? "tba" : "ignored" } : g;
  });
  for (const a of answers) {
    if (a.action === "value" && !out.some((g) => g.key === a.key) && GAP_DEFS[a.key]) out.push({ ...makeGap(a.key), status: "answered", value: a.value });
  }
  return out;
}
