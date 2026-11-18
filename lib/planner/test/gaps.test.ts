// Human-in-the-loop: missing facts become gaps + TBA sections instead of "no plan". Invented numbers only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fold } from "../ledger.ts";
import { solve } from "../solver.ts";
import { answersRecord, answerToFacts } from "../gaps.ts";
import type { MessageRecord, ReadMessage } from "../types.ts";

let seq = 100;
const msg = (read: Partial<ReadMessage>): MessageRecord => {
  seq++;
  return { id: seq, seq, text: "", hash: String(seq), status: "accepted", read: { id: seq, sender_role: "authority", date: null, relevant: true, facts: [], constraints: [], requests: [], ...read } };
};

const pack = (opts: { duration?: boolean; budget?: boolean; venue?: boolean; maxTeams?: boolean } = {}) => {
  const { duration = true, budget = true, venue = true, maxTeams = true } = opts;
  return [
    msg({ date: "03-01", facts: [
      { key: "event.students", action: "set", value: 40 }, { key: "event.team_size", action: "set", value: 4 },
      ...(budget ? [{ key: "event.budget", action: "set" as const, value: 90000 }] : []),
      ...(duration ? [{ key: "event.duration_min", action: "set" as const, value: 180 }] : []),
    ] }),
    ...(venue ? [msg({ sender_role: "venue", date: "03-02", facts: [{ key: "venue.option", subject: "Room X", action: "set", value: { price: 7000, seats: 80, attrs: [] } }] })] : []),
    msg({ sender_role: "caterer", date: "03-02", facts: [{ key: "food.option", subject: "box", action: "set", value: { price: 400 } }] }),
    msg({ sender_role: "judging_coordinator", date: "03-02", facts: [
      { key: "judge.confirmed", action: "set", value: 5 }, { key: "judge.fee", action: "set", value: 500 },
      { key: "judge.min_per_team", action: "set", value: 10 },
      ...(maxTeams ? [{ key: "judge.max_teams", action: "set" as const, value: 5 }] : []),
    ] }),
  ];
};

test("no duration: plan still produced, schedule TBA, one gap", () => {
  const r = solve(fold(pack({ duration: false })));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.deepEqual(r.plan.tba, ["schedule"]);
  assert.deepEqual(r.gaps.map((g) => g.key), ["event.duration_min"]);
  assert.equal(r.plan.schedule.blocks.length, 0);
  assert.ok(r.plan.checks.find((c) => c.name === "schedule valid")?.pending);
  // money still computed: venue 7000 + food 400*(40+0+2 judges)=16800 + judges 2*500
  assert.equal(r.plan.budget.total, 7000 + 400 * 42 + 1000);
});

test("answering the duration fills the schedule and clears the gap", () => {
  const recs = [...pack({ duration: false }), answersRecord([{ key: "event.duration_min", action: "value", value: "3h" }])!];
  const r = solve(fold(recs));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.deepEqual(r.plan.tba, []);
  assert.equal(r.gaps.length, 0);
  assert.equal(r.plan.schedule.lengthMin, 180);
});

test("no budget and no venue: both TBA, rest planned", () => {
  const r = solve(fold(pack({ budget: false, venue: false })));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.deepEqual([...r.plan.tba].sort(), ["budget", "venue"]);
  assert.deepEqual(r.gaps.map((g) => g.key).sort(), ["event.budget", "venue.option"]);
  assert.equal(r.plan.venue.name, "TBA");
});

test("no max teams per judge: judging TBA instead of failing", () => {
  const r = solve(fold(pack({ maxTeams: false })));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.ok(r.plan.tba.includes("judging"));
  assert.ok(r.gaps.some((g) => g.key === "judge.max_teams"));
});

test("no students/teams stays blocking but reports a gap", () => {
  const recs = pack().map((m) => (m.read!.sender_role === "authority" ? { ...m, read: { ...m.read!, facts: m.read!.facts.filter((f) => !/students|team_size/.test(f.key)) } } : m));
  const r = solve(fold(recs));
  assert.equal(r.ok, false);
  assert.ok(r.gaps.some((g) => g.key === "event.students"));
});

test("venue answer text is parsed into an option", () => {
  const f = answerToFacts("venue.option", "Hall Q, 120 seats, Rs 45,000");
  assert.equal(f[0].subject, "Hall Q");
  assert.deepEqual(f[0].value, { price: 45000, seats: 120, attrs: [] });
});
