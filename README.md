# Inbox → Plan

Turns a messy event inbox (emails, WhatsApp texts, notices, English and Roman Urdu) into a **valid, budgeted event plan**, and shows where every figure came from.

- Paste the messages (or attach `.txt` / `.md` files) and get a schedule, a budget and the reason behind each number.
- Send one or two new messages later and only what changed is re-checked.
- A message that would break the plan is rejected, with the reason shown.
- Missing facts show as **TBA**. The organiser can answer them, leave them as TBA, or skip them.
- Every AI call is logged, numbered, with real token counts.

The model only reads the messages. Plain code does the deciding (ranking, budget, schedule, validation), so results can be audited. Details are in [`DESIGN.md`](DESIGN.md) and [`docs/`](docs/).

## Run it

Requires Node 22+.

```bash
npm install
cp .env.example .env.local   # or create it, then add at least one key (see below)
npm run dev                  # web UI at http://localhost:3000
```

Command line (same code path as the web UI):

```bash
node plan.ts samples/sample_pack.txt     # 3+ messages: fresh plan
node plan.ts samples/practice_change.txt # 1-2 messages: update the current plan
npm test
```

Outputs go to `out/plan.md`, `out/plan.json` and `out/trace.txt`. Session state is kept in `state/`.

## Environment

Set at least one provider key. Providers are tried in order, so a failure falls through to the next.

| Variable | Provider |
|---|---|
| `GROQ_API_KEY` | Groq, `llama-3.1-8b-instant` (main) |
| `CEREBRAS_API_KEY` | Cerebras, `llama3.1-8b` |
| `GEMINI_API_KEY` | Gemini flash-lite models |
| `XAI_API_KEY` | xAI `grok-3-mini` |

Model names can be overridden with `GROQ_MODEL`, `CEREBRAS_MODEL`, `GEMINI_MODEL`, `GEMINI_MODEL_B` and `XAI_MODEL`.

## The web app

| Page | What it shows |
|---|---|
| New plan | Paste or attach messages. A rotating globe sits beside the prompt. |
| Overview | Plain summary, budget ring, key figures, venue, food, judging, schedule, and the checks. |
| Schedule | Each part with its time, a bar for where it falls, and its share of the event in %. |
| Budget | Share of budget spent, and each cost line as a % of the total. |
| Inbox | Every message with its sender and whether it was used. "Message N" chips elsewhere jump here. |
| How it was decided | The full trace of AI calls. |
| Questions for you | Top-bar button that opens a drawer for missing facts. |

## Project layout

```
app/                 Next.js app (page.tsx is the whole UI) and API routes
  api/run            POST: run the planner. GET: current session and downloads
  api/answer         POST: organiser answers for missing facts
components/globe.tsx Canvas wireframe globe
lib/planner/         reader, ledger, policy, solver, schedule, validator, run
samples/             Example message packs
docs/                Architecture, PRD, plan, human-in-the-loop contract
```

## Deploying

The app deploys to Vercel as-is. On Vercel the planner writes its state and outputs to `/tmp/mtm`, so state does not persist between cold starts. Add the provider keys as environment variables.
