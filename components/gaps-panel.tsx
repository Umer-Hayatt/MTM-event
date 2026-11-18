"use client";

// Human in the loop: one card per missing fact. The organiser can answer it, keep it TBA, or ignore it.
// Answering calls POST /api/answer (re-solve only, 0 model calls). The UI branch may restyle this freely.
import { useState } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import type { Gap } from "@/lib/planner/types";

type Props = { gaps: Gap[]; onSession: (s: unknown) => void };

export function GapsPanel({ gaps, onSession }: Props) {
  const visible = gaps.filter((g) => g.status === "open" || g.status === "tba");
  if (!visible.length) return null;
  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><HelpCircle className="size-4 text-amber-600" />Needs your input ({visible.length})</h2>
      <p className="mb-3 text-xs text-muted">These facts are missing, so the plan shows them as TBA. Answer, keep as TBA, or ignore.</p>
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
      const r = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: g.key, action, value: action === "value" ? value : undefined }) });
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
    <li className="rounded-xl bg-card p-3 text-sm">
      <p className="font-medium">{g.question}</p>
      <p className="mt-0.5 text-xs text-muted">{g.key} · holds up: {g.blocks.join(", ")}{g.status === "tba" ? " · kept as TBA" : ""}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send("value")}
          inputMode={g.kind === "number" ? "decimal" : "text"}
          placeholder={g.kind === "number" ? "e.g. 240" : "type the answer"}
          className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-1.5"
          aria-label={g.question}
        />
        <button onClick={() => send("value")} disabled={busy || !value.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Answer"}
        </button>
        <button onClick={() => send("tba")} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">Keep TBA</button>
        <button onClick={() => send("ignore")} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">Ignore</button>
      </div>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </li>
  );
}
