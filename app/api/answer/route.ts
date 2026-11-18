// Human in the loop: the organiser answers a missing fact (or keeps it TBA / ignores it).
// Calls the SAME answer() as the CLI (`node plan.ts --answer key=value`). Re-solves only: 0 model calls.
import { answer } from "@/lib/planner/run.ts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { key, action, value } = (await req.json()) as { key?: string; action?: string; value?: unknown };
  if (!key || !["value", "tba", "ignore"].includes(action ?? "")) return Response.json({ error: "need key and action (value | tba | ignore)" }, { status: 400 });
  if (action === "value" && (value === undefined || String(value).trim() === "")) return Response.json({ error: "empty answer" }, { status: 400 });
  try {
    return Response.json(await answer({ key, action: action as "value" | "tba" | "ignore", value }));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
