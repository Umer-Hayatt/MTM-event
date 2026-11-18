# Inbox → Plan: design

An event organiser's inbox is a mess of emails, WhatsApp texts and notices, in English and in Roman Urdu. This system reads that inbox and produces a **valid, budgeted event plan**, and it shows where each figure came from. When a new message arrives, it updates only what changed. A message that would break the plan is rejected, and the reason is printed.

**The core idea:** the model only reads, and plain code does the deciding.

## One command

```
node plan.ts <file>
```

- **Fresh run:** no saved state, or the file holds 3 or more messages. Old state is archived to `state/archive/<ts>/`.
- **Update:** the file holds 1 or 2 messages and state exists. The new facts are merged and the plan is re-solved.
- The first trace line prints the mode and the reason.
- Messages the system has already seen (matched by text hash) are skipped and cost 0 calls.
- Outputs go to `out/plan.md`, `out/plan.json` and `out/trace.txt`. The trace accumulates over a session, and call numbers continue between runs.
- The web UI (`npm run dev`) calls **the same `run()` function**. There is no second code path.

## Pipeline (`lib/planner/`)

| Part | File | Why it exists | What breaks without it |
|---|---|---|---|
| Splitter | `split.ts` | Cuts the file into messages on structural markers such as numbering, `From:` lines and separators. Blank lines don't count, because one email can have several paragraphs. | Messages get merged or cut apart, and facts get attached to the wrong sender. |
| LLM port | `llm.ts` | One `fetch` to an OpenAI-compatible API. Groq `llama-3.1-8b-instant` is the main model. Cerebras `llama3.1-8b` is used only if Groq fails. Uses JSON mode, temperature 0 and a 20 s timeout. | We would be tied to one provider, with no fallback and no honest token counts. |
| Trace | `trace.ts` | Numbers every model call and records the model, the area tag, the input, the output and the token counts the API reports. Failed calls and retries are logged too. Ends with the total tokens. | The brief's requirement 3 fails, and we would be disqualified for misreporting. |
| Reader | `reader.ts` | The **only** language step. It turns messages into facts, constraints and requests in a fixed schema checked by zod. One call reads the whole pack. An update makes one call. If the output fails validation, there is one repair retry. | Code cannot understand Roman Urdu or messy wording. |
| Ledger | `ledger.ts` | Decides for each message whether to **accept / stale / ignore / reject**. It checks relevance, then date, then ownership, then re-solves and validates. | Old prices win, or a wrong message corrupts the plan. |
| Policy | `policy.ts` | Holds every product rule in one place, such as who owns which facts, how options are ranked and how long the opening lasts. Each rule is printed in the trace when it is applied. | Rules end up scattered and hidden, and a judge can't audit them. |
| Solver | `solver.ts` | Lists every **hall × food tier × subset of optional requests**, drops the combinations that break a hard constraint or the budget, and ranks the rest. | Greedy picks miss the valid plans, and over-budget plans get through. |
| Schedule | `schedule.ts` | Builds the timeline as relative times (T+0:00). It uses clock times only if a message gives a start time. | The schedule isn't valid, or it invents facts. |
| Validator | `validator.ts` | Runs the judges' six checks plus every hard constraint taken from the messages. | We could print an invalid plan without noticing. |
| Run | `run.ts` | Wires the steps together and loads and saves state. The CLI and the API both call this. | The CLI and UI would drift apart. |

## What the model returns (reader schema)

The model returns one entry per message. Code assigns each message its id, and the model echoes it back:

`{ id, sender_role, date|null, relevant, facts[], constraints[], requests[] }`

- **sender_role** is one of: `authority`, `venue`, `caterer`, `finance`, `judging_coordinator`, `participant`, `unknown`.
- Each **fact** has the shape `{ key, subject?, action: set|add|remove, value, unit? }`. The model does no arithmetic. Code applies `add` and `remove`.
  - The `event.*` keys are `students`, `teams`, `team_size`, `duration_min`, `start_time`, `end_by` and `budget`.
  - `people.group` holds an on-site group: the subject is the group name and the value is its head count.
  - `venue.option` and `food.option` hold an option: the subject is its name and the value is `{ price, seats?, attrs[] }`.
  - The `judge.*` keys are `confirmed`, `fee`, `min_per_team` and `max_teams`.
  - `spent.item` records money already spent. `cost.required` records a cost that must be paid. `schedule.break` records a break, given in minutes.
  - The **derived** keys `food.boxes`, `judges.count`, `venue.capacity` and `total.cost` are computed by code. A message that tries to set one of them is always rejected.
- Each **constraint** has the shape `{ area, target, op, value, hard }`, where `op` is one of `== != < <= > >= has`. Targets come from a registry of values that code can compute. A target that isn't in the registry is reported as **unhandled** in the trace and the UI. It is never ignored silently.
- Each **request** has the shape `{ area, item, cost }`. Requests are always soft. The DJ is an example.

All money is in whole PKR, all durations in minutes, and all times in 24-hour format. The model normalises the numbers it reads (lakh, commas, Roman Urdu).

## Accept or reject (checks run in this order)

1. **Not relevant?** The message is ignored and logged. Example: a judge saying they'll be 10 minutes late.
2. **Older than the current fact?** The message is stale, and the newer fact stays. Example: the 20 Oct price loses to the 12 Nov price.
3. **Does the sender's role own this fact?** If not, the message is rejected. Owners are roles, not names, and the ownership map is policy. An unknown sender owns nothing. Derived values have no owner at all.
4. **Re-solve and validate.** If a rule breaks or no valid plan exists, the message is rejected with the exact rule, and the last valid plan is kept.
5. Otherwise the message is **accepted**. The plan is re-solved and the change is logged.

Messages are accepted or rejected as a whole. The `authority` role outranks everyone else. When a sender changes a fact it owns, the plan is re-solved; the message is not rejected.

## Policies (`policy.ts`, printed in the trace when applied)

- **Headcount** = every on-site group, with judges counted as *needed*, not *confirmed*.
- **Judges needed** = ⌈teams ÷ max teams per judge⌉. The validator checks that confirmed ≥ needed. Judges paid = judges needed.
- **Venue** must seat the full headcount. Nice-to-haves only break ties, unless a message turns them into a constraint.
- **Ranking**: the highest food tier comes first, then the most optional requests, then the lowest cost, then the most capacity.
- **Schedule**: opening 10 min, then build, then the required breaks, then lunch 30 min, then build, then judging, then closing 15 min.
  - Judging takes max teams per judge × minutes per team, with all judges working in parallel.
  - Build time absorbs whatever time is left, and must be at least 50% of the event.
  - If any of these rules can't be met, the plan is reported as infeasible.

## Updates and the change prediction

An update is **1 `reading` call**. If a message brings a kind of constraint the registry can't express, the update makes **1 more call, tagged with that constraint's area**. The rule for the prediction slip: *"reading only, plus area X if the message introduces a new kind of constraint for X."*

## Roadmap (product, after the MVP)

- An organiser can override a rejected message, through an approval queue with a decision log.
- Several events per account, with a database instead of a JSON file.
- Messages arrive directly from email and WhatsApp.
