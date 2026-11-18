# Plan: hackathon finish (2026-11-18)

**Final push by 13:15. Code freeze at 13:25. Test run at 13:30.**

## Done
- [x] Planner core: split, reader, ledger, solver, schedule, validator, trace, CLI (`92111f5`)
- [x] Web UI (inbox, plan, trace) on the same `run()` (`fa75865`)
- [x] Fix: `node plan.ts` crashed on Node 24 strip-only mode (parameter properties in `trace.ts` and `llm.ts`)
- [x] Docs: PRD, ARCHITECTURE, PLAN

## Live results (Gemini `gemini-3.5-flash-lite`, 1 call per run)
- Sample pack: 177 people, Hall A, Rs 597,400 with the DJ; msg 3 superseded, msg 8 ignored (about 2.5k tokens)
- Practice change: ACCEPTED, total Rs 602,400 (+5,000). Practice wrong: REJECTED (`food.boxes` is derived)
- Custom pack: Hall Beta (ramp), light snack box, ends 15:00, Rs 223,800; msg 5 rejected, msg 7 ignored
- UI: `docs/ui-screenshot.png`
- Providers: Groq, then Cerebras, then Gemini (2 models), then xAI; one retry on 429, 5xx or network errors

## In order
1. [ ] **Live run.** This needs a `gsk_` Groq key in `.env`. `node plan.ts samples/sample_pack.txt` should give 177 people, Hall A, Rs 547,400, and Rs 597,400 with the DJ.
2. [x] **Practice messages.** `practice_change.txt` should be ACCEPTED (+5,000 on the printing item). `practice_wrong.txt` should be REJECTED (derived key `food.boxes`).
3. [x] **Tune `SYSTEM`** in `reader.ts`, but only if the 8B model extracts something wrong. Keep the prompt short, with no pack facts.
4. [x] **Custom pack** `samples/custom_pack.txt`, covering wheelchair access (`has`), end by 17:00 and a food spend cap. Add solver tests that use invented numbers.
5. [x] **Ship.** Screenshot the UI after a real run, then `npm test` and `tsc`. Commit and push, check `git status` is clean, and record the hash. Save `out/plan.md` and `out/trace.txt` for the upload form.

## Rules (disqualification-level)
- Pack facts and messages never go into code or prompts.
- Token counts come only from the API's `usage` field, and failed calls are logged.
- Keys never go into `.env.example`.

## Agent split (keep token use low)
- **Main session:** live runs, reader tuning, commit and push. These steps need the conversation context.
- **`executor` (Sonnet), in the background:** the custom pack, registry targets and tests.
- Skip review and critic agents unless time remains after step 5.
