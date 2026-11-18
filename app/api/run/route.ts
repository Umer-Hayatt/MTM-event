// HTTP adapter for the UI. It saves pasted text to a file and calls the SAME run(file) as the CLI.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadSession, run } from "@/lib/planner/run.ts";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const dl = new URL(req.url).searchParams.get("download");
  if (dl === "plan" || dl === "trace") {
    const f = join(process.cwd(), "out", dl === "plan" ? "plan.md" : "trace.txt");
    if (!existsSync(f)) return new Response("not found", { status: 404 });
    return new Response(readFileSync(f, "utf-8"), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${dl === "plan" ? "plan.md" : "trace.txt"}"` },
    });
  }
  return Response.json(loadSession());
}

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) return Response.json({ error: "empty input" }, { status: 400 });
  const dir = join(process.cwd(), "state", "inbox");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.txt`);
  writeFileSync(file, text, "utf-8");
  try {
    return Response.json(await run(file));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
