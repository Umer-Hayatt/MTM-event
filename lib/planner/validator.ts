// The validator: the judges' six checks, run on every plan before it is accepted.
// Why separate from the solver: an independent re-check catches solver bugs instead of trusting them.
import type { FactState, Plan } from "./types.ts";

export function validate(p: Plan, st: FactState): Plan["checks"] {
  const sumLines = p.budget.lines.reduce((s, l) => s + l.amount, 0);
  const schedTotal = p.schedule.blocks.reduce((s, b) => s + (b.end - b.start), 0);
  const contiguous = p.schedule.blocks.every((b, i) => i === 0 || b.start === p.schedule.blocks[i - 1].end);
  const requiredBreaks = Object.keys(st.breaks).filter((k) => !/opening|closing|lunch/.test(k));
  const breaksPresent = requiredBreaks.every((k) => p.schedule.blocks.some((b) => b.name.toLowerCase().startsWith(k)));
  const judgingOk = p.judging.teamsPerJudge > 0 && p.judging.needed * p.judging.teamsPerJudge >= p.teams;

  const sectionFor: Record<string, string> = { "within budget": "budget", "venue fits": "venue", "schedule valid": "schedule", "enough judges": "judging" };
  const tba = p.tba ?? [];
  const raw = [
    { name: "figures", ok: sumLines === p.budget.total && p.food.boxes === p.headcount.total, detail: `budget lines sum ${sumLines} = total ${p.budget.total}; boxes ${p.food.boxes} = headcount ${p.headcount.total}` },
    { name: "within budget", ok: p.budget.total <= p.budget.cap, detail: `${p.budget.total} of ${p.budget.cap === Infinity ? "no cap stated" : p.budget.cap}` },
    { name: "venue fits", ok: (p.venue.seats ?? 0) >= p.headcount.total, detail: `${p.venue.name} seats ${p.venue.seats} for ${p.headcount.total}` },
    { name: "schedule valid", ok: schedTotal === p.schedule.lengthMin && contiguous && breaksPresent, detail: `${schedTotal}/${p.schedule.lengthMin} min, no gaps: ${contiguous}, required breaks present: ${breaksPresent}` },
    { name: "enough judges", ok: judgingOk && p.judging.confirmed >= p.judging.needed, detail: `${p.judging.needed} needed (${p.teams} teams, max ${p.judging.teamsPerJudge} each), ${p.judging.confirmed} confirmed` },
    { name: "all areas covered", ok: !!(p.venue && p.food && p.judging.needed && p.schedule.blocks.length && p.budget.lines.length), detail: "venue, food, judging, schedule, budget" },
  ];
  // Human in the loop: a check on a TBA section is pending, not failed.
  return raw.map((c) => {
    const sec = c.name === "all areas covered" ? tba[0] : sectionFor[c.name];
    if (sec && tba.includes(sec)) return { ...c, ok: true, pending: true, detail: `pending: ${tba.join(", ")} TBA (waiting for organiser input)` };
    return c;
  });
}
