# Human-in-the-loop contract (shared by `feat/human-in-loop` and `feat/ui`)

When a fact is missing, the planner no longer stops with "Could not plan". It builds the plan **anyway**, marks the missing sections **TBA**, and lists **gaps** for the organiser to answer.

## Data (in `lib/planner/types.ts`)
```ts
type Gap = {
  key: string;            // fact key, e.g. "event.duration_min"
  question: string;       // "How long is the event (minutes)?"
  kind: "number" | "time" | "text";
  blocks: string[];       // sections it holds up, e.g. ["schedule"]
  status: "open" | "answered" | "tba" | "ignored";
  value?: unknown;
};
Session.gaps: Gap[];          // returned by GET and POST /api/run
Session.plan?.tba: string[];  // plan sections to render as "TBA"
```

## API
```
POST /api/answer   { key, action: "value" | "tba" | "ignore", value? }  -> Session
POST /api/override { msgId, action: "accept" | "keep-rejected" }        -> Session   (phase 2)
```
- An answer is stored as a fact from the `organiser`. It re-runs the solver only and makes 0 model calls.
- `ignore` hides that gap's prompt, and the section stays TBA.

## Branch ownership (to avoid merge conflicts)
- `feat/human-in-loop` owns `lib/planner/**`, `app/api/**` and the new file `components/gaps-panel.tsx`. In `app/page.tsx` it changes only the one line that mounts the panel.
- `feat/ui` owns `app/page.tsx`, `components/**` (except `gaps-panel.tsx`) and the styles. It can build against the shapes above using mock data.
- Merge order: `feat/human-in-loop` goes into `main` first, then `feat/ui` is rebased onto it.
