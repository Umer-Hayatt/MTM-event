// Solver/ledger tests with INVENTED numbers (never the real pack): they prove the arithmetic and the
// accept/reject rules, not any particular answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fold, screen } from "../ledger.ts";
import { solve } from "../solver.ts";
import type { MessageRecord, ReadMessage } from "../types.ts";

let seq = 0;
const msg = (read: Partial<ReadMessage>): MessageRecord => {
  seq++;
  return { id: seq, seq, text: "", hash: String(seq), status: "accepted", read: { id: seq, sender_role: "authority", date: null, relevant: true, facts: [], constraints: [], requests: [], ...read } };
};

const base = () => [
  msg({ date: "05-01", facts: [
    { key: "event.students", action: "set", value: 60 }, { key: "event.team_size", action: "set", value: 4 },
    { key: "event.budget", action: "set", value: 100000 }, { key: "event.duration_min", action: "set", value: 180 },
    { key: "people.group", subject: "staff", action: "set", value: 5 }, { key: "schedule.break", subject: "tea", action: "set", value: 10 },
  ] }),
  msg({ sender_role: "venue", date: "05-02", facts: [
    { key: "venue.option", subject: "Small", action: "set", value: { price: 5000, seats: 50, attrs: [] } },
    { key: "venue.option", subject: "Mid", action: "set", value: { price: 9000, seats: 90, attrs: ["ramp"] } },
    { key: "venue.option", subject: "Big", action: "set", value: { price: 20000, seats: 200, attrs: ["ramp", "generator"] } },
  ] }),
  msg({ sender_role: "caterer", date: "05-01", facts: [{ key: "food.option", subject: "full", action: "set", value: { price: 500 } }] }),
  msg({ sender_role: "caterer", date: "05-03", facts: [
    { key: "food.option", subject: "full", action: "set", value: { price: 600 } },
    { key: "food.option", subject: "light", action: "set", value: { price: 300 } },
  ] }),
  msg({ sender_role: "judging_coordinator", date: "05-02", facts: [
    { key: "judge.confirmed", action: "set", value: 6 }, { key: "judge.fee", action: "set", value: 1000 },
    { key: "judge.min_per_team", action: "set", value: 10 }, { key: "judge.max_teams", action: "set", value: 3 },
  ] }),
  msg({ sender_role: "finance", date: "05-02", facts: [{ key: "spent.item", subject: "prizes", action: "set", value: 20000 }] }),
  msg({ sender_role: "participant", date: "05-04", requests: [{ area: "budget", item: "photo booth", cost: 5000 }] }),
];

test("headcount, judges, newest price, cheapest fitting hall, optional extra", () => {
  const r = solve(fold(base()));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  const p = r.plan;
  // 60 students / 4 = 15 teams; ceil(15/3) = 5 judges; headcount 60 + 5 staff + 5 judges = 70
  assert.equal(p.teams, 15);
  assert.equal(p.judging.needed, 5);
  assert.equal(p.headcount.total, 70);
  assert.equal(p.venue.name, "Mid");            // Small too small, Big more expensive
  assert.equal(p.food.price, 600);              // newer caterer price wins
  // 9000 + 70*600 + 5*1000 + 20000 + 5000 = 81000
  assert.equal(p.budget.total, 81000);
  assert.ok(p.extras[0].included);
  assert.equal(p.schedule.blocks.reduce((s, b) => s + b.end - b.start, 0), 180);
  assert.ok(p.checks.every((c) => c.ok));
});

test("downgrades food tier when the budget is tight", () => {
  const msgs = base();
  msgs.push(msg({ date: "05-05", facts: [{ key: "event.budget", action: "set", value: 70000 }] }));
  const r = solve(fold(msgs));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.equal(r.plan.food.price, 300);
});

test("hard constraint from authority filters venues", () => {
  const msgs = base();
  msgs.push(msg({ date: "05-05", constraints: [{ area: "venue", target: "venue.attrs", op: "has", value: "generator", hard: true }] }));
  const r = solve(fold(msgs));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.equal(r.plan.venue.name, "Big");
});

test("caterer setting box count is rejected (derived value)", () => {
  const s = screen({ id: 1, sender_role: "caterer", date: null, relevant: true, facts: [{ key: "food.boxes", action: "set", value: 40 }], constraints: [], requests: [] });
  assert.equal(s.status, "rejected");
});

test("sender who does not own a fact is rejected", () => {
  const s = screen({ id: 1, sender_role: "caterer", date: null, relevant: true, facts: [{ key: "event.budget", action: "set", value: 1 }], constraints: [], requests: [] });
  assert.equal(s.status, "rejected");
});

test("finance update to an existing spent item replaces it", () => {
  const msgs = base();
  msgs.push(msg({ sender_role: "finance", facts: [{ key: "spent.item", subject: "prizes", action: "set", value: 25000 }] }));
  const r = solve(fold(msgs));
  assert.ok(r.ok);
  assert.equal(r.plan.budget.total, 86000);
});

test("venue `has` attr filter excludes halls without the attribute", () => {
  const msgs = base();
  msgs.push(msg({ date: "05-05", constraints: [{ area: "venue", target: "venue.attrs", op: "has", value: "ramp", hard: true }] }));
  const r = solve(fold(msgs));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.equal(r.plan.venue.name, "Mid");       // Small has no ramp; Mid is the cheapest with one
});

test("end_by constraint: passes when the event fits, fails when it cannot", () => {
  const fits = base();
  fits.push(msg({ date: "05-05", facts: [{ key: "event.start_time", action: "set", value: "09:00" }], constraints: [{ area: "schedule", target: "schedule.end", op: "<=", value: "13:00", hard: true }] }));
  const ok = solve(fold(fits));
  assert.ok(ok.ok, !ok.ok ? ok.reason : "");   // 09:00 + 180 min = 12:00
  const late = base();
  late.push(msg({ date: "05-05", facts: [{ key: "event.start_time", action: "set", value: "11:00" }], constraints: [{ area: "schedule", target: "schedule.end", op: "<=", value: "13:00", hard: true }] }));
  const bad = solve(fold(late));
  assert.equal(bad.ok, false);                  // 11:00 + 180 min = 14:00
});

test("food cost cap drops the dearer tier", () => {
  const msgs = base();
  msgs.push(msg({ date: "05-05", constraints: [{ area: "food", target: "food.cost", op: "<=", value: 25000, hard: true }] }));
  const r = solve(fold(msgs));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.equal(r.plan.food.price, 300);         // 70 x 600 = 42000 > cap; 70 x 300 = 21000 fits
});

test("unknown constraint target is reported as unhandled, not ignored", () => {
  const msgs = base();
  msgs.push(msg({ date: "05-05", constraints: [{ area: "venue", target: "venue.parking_slots", op: ">=", value: 40, hard: true }] }));
  const r = solve(fold(msgs));
  assert.ok(r.ok, !r.ok ? r.reason : "");
  assert.equal(r.plan.unhandled.length, 1);
  assert.match(r.plan.unhandled[0], /parking_slots/);
});
