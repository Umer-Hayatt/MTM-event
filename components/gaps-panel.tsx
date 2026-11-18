"use client";

// Human-in-the-loop: one card per missing fact.
// Answering calls POST /api/answer (re-solve only, 0 model calls).
import { useState } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import type { Gap } from "@/lib/planner/types";

type Props = { gaps: Gap[]; onSession: (s: unknown) => void };

export function GapsPanel({ gaps, onSession }: Props) {
  const visible = gaps.filter((g) => g.status === "open" || g.status === "tba");
  if (!visible.length) return null;
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-50/40 p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Needs your input <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700">{visible.length}</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            These facts are missing — the plan shows them as TBA until you answer.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {visible.map((g) => <GapRow key={g.key} g={g} onSession={onSession} />)}
      </ul>
    </section>
  );
}

function GapRow({ g, onSession }: { g: Gap; onSession: (s: unknown) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(action: "value" | "tba" | "ignore") {
    if (action === "value" && !value.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: g.key, action, value: action === "value" ? value : undefined }),
      });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else onSession(d);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-3.5 text-sm shadow-sm">
      <p className="font-medium text-foreground">{g.question}</p>
      <p className="mt-0.5 text-[11px] text-muted">
        {g.key} · holds up: {g.blocks.join(", ")}
        {g.status === "tba" ? " · kept as TBA" : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send("value")}
          inputMode={g.kind === "number" ? "decimal" : "text"}
          placeholder={g.kind === "number" ? "e.g. 240" : "type the answer"}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/10 transition"
          aria-label={g.question}
        />
        <button
          onClick={() => send("value")}
          disabled={busy || !value.trim()}
          className="rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-teal/90 active:scale-[0.98] transition-all"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Answer"}
        </button>
        <button
          onClick={() => send("tba")}
          disabled={busy}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-foreground active:scale-[0.98] transition-all"
        >
          Keep TBA
        </button>
        <button
          onClick={() => send("ignore")}
          disabled={busy}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-foreground active:scale-[0.98] transition-all"
        >
          Ignore
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-danger">{err}</p>}
    </li>
  );
}
