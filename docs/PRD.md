# PRD: Inbox → Plan

## Problem
An event organiser's inbox holds emails, WhatsApp texts and notices, in English and Roman Urdu. Some messages are stale, some come from people who shouldn't decide, and some are traps. Building a plan by hand from that inbox is slow and error-prone, and nobody can audit it afterwards.

## Users
- **Organiser.** Drops in the whole pack, gets a plan, then feeds in new messages one at a time.
- **Judge / auditor.** Reads the plan and the trace to check every figure and every model call.

## Goals
1. Turn a message pack into one **valid, budgeted plan**: venue, food tier, headcount, judges, optional extras, schedule and total cost.
2. Show **where every figure came from**: the message id and the policy that was applied.
3. **Incremental updates.** A new message changes only what it affects, and costs 1 model call (2 if it brings a new kind of constraint).
4. **Reject bad messages with an exact reason.** That covers a wrong owner, an attempt to set a derived value, a stale date, or a change that breaks the plan. The last valid plan is kept.
5. **An honest trace.** Every model call is numbered, token counts come only from the API's `usage` field, and failed calls are logged.

## Non-goals (for the MVP)
Multiple events, a database, live email or WhatsApp ingestion, and an organiser override for rejected messages. These are on the roadmap.

## Functional requirements
| # | Requirement | Where |
|---|---|---|
| F1 | One command: `node plan.ts <file>`. 3 or more messages is a fresh run; 1–2 messages is an update. | `plan.ts`, `run.ts` |
| F2 | Outputs `out/plan.md`, `out/plan.json` and `out/trace.txt`. | `render.ts`, `trace.ts` |
| F3 | Each message is marked accept, stale, ignore or reject, with a reason. | `ledger.ts` |
| F4 | Hard constraints come from messages; an unknown target is reported as **unhandled**, never dropped. | `solver.ts` registry |
| F5 | The six judge checks plus all hard constraints are validated on every plan. | `validator.ts` |
| F6 | The web UI (inbox, plan and trace) calls the same `run()`. | `app/`, `app/api/run` |

## Non-functional requirements
- Input tokens are scored, so the reader prompt stays short and no pack facts appear in code.
- The model is Groq `llama-3.1-8b-instant`, with Cerebras as a fallback. Calls use temperature 0, JSON mode and a 20 s timeout.
- An update makes at most 5 calls (`policy.ts`).

## Success criteria (sample pack)
- **Headcount:** 177. **Venue:** Hall A. **Total:** Rs 547,400, or Rs 597,400 with the DJ, against a budget of 650,000.
- **Message outcomes:** message 3 is superseded (stale) and message 8 is ignored.
- **Practice messages:** the printing change is ACCEPTED (+5,000); "100 boxes" is REJECTED because it sets a derived key.
