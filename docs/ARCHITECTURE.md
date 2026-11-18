# Architecture

> **The model only reads. Plain code decides.** The full spec and the reason for each decision are in `../DESIGN.md`. This page is the map.

```
 file ──► split.ts ──► reader.ts ──(LLM via llm.ts, logged by trace.ts)──► facts/constraints/requests
                                                                                │
           state/session.json ◄──── run.ts ◄──── render.ts ◄──── validator.ts ◄─┤
                                       ▲                         solver.ts  ◄───┤
            CLI: plan.ts ──────────────┤                         schedule.ts◄───┤
            UI:  app/api/run ──────────┘                         ledger.ts  ◄───┘ (accept/stale/ignore/reject)
                                                                 policy.ts  (all product rules, printed in trace)
```

## Modules (`lib/planner/`)
| File | Responsibility | Input → Output |
|---|---|---|
| `split.ts` | Splits the file into messages on structural markers (numbering, `From:` lines, separators). Blank lines are not markers. | text → `Msg[]` |
| `llm.ts` | Sends one OpenAI-compatible fetch. Groq first, Cerebras if Groq fails. Enforces a call budget. | prompt → JSON + `usage` |
| `trace.ts` | Logs each numbered call (model, area tag, input, output, tokens) and the decision log lines. | events → `trace.txt` |
| `reader.ts` | The **only** language step. Uses a short `SYSTEM` prompt, checks the output with zod and allows 1 repair retry. | `Msg[]` → `Reading[]` |
| `ledger.ts` | Runs the checks: relevance → date → ownership → re-solve and validate. Folds accepted facts into state. | `Reading` → verdict + facts |
| `policy.ts` | Holds the ownership map, derived keys, ranking, schedule rules and call limits. | constants |
| `solver.ts` | Enumerates hall × food tier × subset of requests, filters by the constraint registry and the budget, then ranks. | facts → best `Plan` |
| `schedule.ts` | Builds a relative timeline (T+0:00). Uses clock times only if a start time is given. | plan → timeline |
| `validator.ts` | Runs the six judge checks plus the hard constraints. | plan → checks[] |
| `render.ts` | Writes `plan.md` with the budget table, checks and message audit trail. | plan → markdown |
| `run.ts` | Orchestrates the steps, chooses fresh or update mode, and loads, saves and archives state. | file → outputs |

## Data contracts
- **Reading** = `{ id, sender_role, date|null, relevant, facts[], constraints[], requests[] }`
- **Fact** = `{ key, subject?, action: set|add|remove, value, unit? }`. The derived keys (`food.boxes`, `judges.count`, `venue.capacity`, `total.cost`) are always rejected.
- **Constraint** = `{ area, target, op, value, hard }`. `target` must be in the registry in `solver.ts`, otherwise it is reported as **unhandled**.
- **Request** = `{ area, item, cost }`. Requests are always soft.

## State and files
- `state/session.json` holds the current facts plus the per-message verdicts. It is archived to `state/archive/<ts>/` on a fresh run.
- `out/` holds the latest outputs. Both `state/` and `out/` are gitignored.

## Stack
- TypeScript only. Node 24 runs `.ts` in **strip-only mode**, so parameter properties, enums and namespaces are not allowed.
- The UI uses Next.js 16, React 19 and Tailwind 4. Tests use `node:test` (`npm test`).
