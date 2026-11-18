"use client";

// MTM Event Planner — Operate-mode dashboard.
// Calls POST /api/run, same run() as the CLI. No duplicate code paths.
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Download,
  FileUp,
  Gavel,
  Inbox as InboxIcon,
  Loader2,
  Send,
  UtensilsCrossed,
  Wallet,
  XCircle,
  Cpu,
  CircleDot,
} from "lucide-react";
import { StatCard } from "@/components/app/stat-card";
import { GapsPanel } from "@/components/gaps-panel";
import type { Gap, MessageRecord, Plan, TraceCall, TraceLine } from "@/lib/planner/types";

type Session = {
  messages: MessageRecord[];
  plan: Plan | null;
  infeasible?: string;
  trace: TraceLine[];
  runs: { mode: string; at: string; calls: number; tokens: number }[];
  gaps?: Gap[];
  mode?: string;
  modeReason?: string;
  error?: string;
};

const rs = (n: number) => (n === Infinity || n == null ? "no cap" : `Rs ${n.toLocaleString("en-US")}`);
const rel = (m: number) => `T+${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
const pretty = (s: string) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } };

export default function Page() {
  const [s, setS] = useState<Session | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/run").then((r) => r.json()).then((d) => d && setS(d)).catch(() => {});
  }, []);

  async function submit(input: string) {
    if (!input.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else { setS(d); setText(""); }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const calls = useMemo(() => (s?.trace ?? []).flatMap((l) => (l.kind === "call" ? [l.call] : [])), [s]);
  const tokens = calls.reduce((a, c) => a + c.inputTokens + c.outputTokens, 0);
  const rejected = (s?.messages ?? []).filter((m) => m.status === "rejected");
  const p = s?.plan;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-5 py-3">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">
              <InboxIcon className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-foreground">MTM Event Planner</p>
              <p className="text-[11px] text-muted">Inbox → valid, budgeted plan</p>
            </div>
          </div>

          {/* Mode pill */}
          {s?.mode && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted">
              <CircleDot className="size-3 text-success" />
              <b className="text-foreground font-medium">{s.mode}</b>
              <span className="text-muted/70">·</span>
              {s.modeReason}
            </span>
          )}

          {/* Downloads */}
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/api/run?download=plan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-foreground transition-colors"
            >
              <Download className="size-3.5" />
              plan.md
            </a>
            <a
              href="/api/run?download=trace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-foreground transition-colors"
            >
              <Download className="size-3.5" />
              trace.txt
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-5 py-5">

        {/* ── Composer ── */}
        <section className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <p className="mb-3 text-xs font-medium text-muted uppercase tracking-wider">New input</p>
          <div className="flex flex-col gap-3 md:flex-row">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a message pack (3+ messages starts a fresh plan) or a single message to update the current plan."
              className="min-h-[96px] flex-1 resize-y rounded-xl border border-border bg-background p-3.5 text-sm leading-relaxed outline-none placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
            />
            <div className="flex flex-row gap-2 md:w-44 md:flex-col">
              <button
                onClick={() => submit(text)}
                disabled={busy || !text.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm disabled:opacity-40 hover:bg-accent/90 active:scale-[0.98] transition-all"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {busy ? "Planning…" : "Run"}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-border/60 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                <FileUp className="size-4" />
                Upload .txt
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) submit(await f.text());
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          {err && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
              <AlertTriangle className="size-4 shrink-0" />
              {err}
            </p>
          )}
        </section>

        {/* ── Infeasible banner ── */}
        {s?.infeasible && (
          <div className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-5 py-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div>
              <span className="font-semibold">Could not plan the latest input.</span>{" "}
              {s.infeasible}
              {p && " The last valid plan is still shown."}
            </div>
          </div>
        )}

        {/* ── HITL gaps ── */}
        <GapsPanel gaps={s?.gaps ?? []} onSession={(d) => setS(d as Session)} />

        {/* ── Stat row ── */}
        {p && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Total cost" value={p.budget.total} prefix="Rs " icon={Wallet} />
            <StatCard label="Budget left" value={p.budget.cap === Infinity ? 0 : p.budget.remaining} prefix="Rs " icon={Wallet} />
            <StatCard label="People to feed" value={p.headcount.total} icon={UtensilsCrossed} />
            <StatCard label="Judges needed" value={p.judging.needed} icon={Gavel} />
            <StatCard label="Tokens" value={tokens} suffix={` / ${calls.length} calls`} icon={Cpu} className="col-span-2 lg:col-span-1" />
          </section>
        )}

        {/* ── Three-column layout: Inbox / Plan / Trace ── */}
        <div className="grid gap-4 lg:grid-cols-12">

          {/* Inbox */}
          <section className="flex flex-col gap-3 lg:col-span-4">
            {rejected.length > 0 && (
              <div className="rounded-2xl border border-danger/25 bg-card p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger">
                  <XCircle className="size-4" />
                  Rejected ({rejected.length})
                </h2>
                <ul className="space-y-2">
                  {rejected.map((m) => (
                    <li key={m.id} className="rounded-xl bg-danger/5 px-3 py-2.5 text-sm">
                      <p className="font-medium text-foreground">#{m.id} &ldquo;{clip(m.text, 120)}&rdquo;</p>
                      <p className="mt-0.5 text-xs text-muted">Reason: {m.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Panel title="Inbox" icon={InboxIcon} right={`${s?.messages.length ?? 0} messages`}>
              {!s?.messages.length && <Empty>Paste a message pack above to get started.</Empty>}
              <ul className="space-y-2">
                {[...(s?.messages ?? [])].reverse().map((m) => <MessageRow key={m.id} m={m} />)}
              </ul>
            </Panel>
          </section>

          {/* Plan */}
          <section className="flex flex-col gap-3 lg:col-span-5">
            {!p && (
              <Panel title="Plan" icon={CalendarClock}>
                <Empty>No valid plan yet. Submit messages above.</Empty>
              </Panel>
            )}
            {p && (
              <>
                {/* Check pills */}
                <div className="flex flex-wrap gap-1.5">
                  {p.checks.map((c) => (
                    <span
                      key={c.name}
                      title={c.detail}
                      className={clsx(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        c.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      )}
                    >
                      {c.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                      {c.name}
                    </span>
                  ))}
                </div>

                {/* Area cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Area title="Venue" icon={Building2}>
                    <Big>{p.venue.name}</Big>
                    <p>Seats {p.venue.seats} · {rs(p.venue.price)} <Src id={p.venue.source} /></p>
                    {p.venue.attrs.length > 0 && <p className="text-muted">{p.venue.attrs.join(", ")}</p>}
                  </Area>
                  <Area title="Food" icon={UtensilsCrossed}>
                    <Big>{p.food.boxes} × {p.food.name}</Big>
                    <p>{rs(p.food.price)} each = {rs(p.food.cost)} <Src id={p.food.source} /></p>
                    <p className="text-muted">{Object.entries(p.headcount.parts).map(([k, v]) => `${k} ${v}`).join(" + ")}</p>
                  </Area>
                  <Area title="Judging" icon={Gavel}>
                    <Big>{p.judging.needed} judges</Big>
                    <p>{p.teams} teams · max {p.judging.teamsPerJudge} each · {p.judging.confirmed} confirmed</p>
                    <p className="text-muted">{p.judging.minutesPerTeam} min/team → {p.judging.blockMinutes} min · {rs(p.judging.cost)}</p>
                  </Area>
                  <Area title="Budget" icon={Wallet}>
                    <Big>{rs(p.budget.total)}</Big>
                    <p>of {rs(p.budget.cap)} · {rs(p.budget.remaining)} left</p>
                    {p.budget.cap !== Infinity && (
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${Math.min(100, (p.budget.total / p.budget.cap) * 100)}%` }}
                        />
                      </div>
                    )}
                  </Area>
                </div>

                {/* Schedule */}
                <Panel title="Schedule" icon={CalendarClock} right={p.schedule.relative ? "relative times" : "clock times"}>
                  <div className="flex h-6 overflow-hidden rounded-lg gap-px">
                    {p.schedule.blocks.map((b, i) => (
                      <div
                        key={i}
                        title={`${b.name} · ${b.end - b.start} min`}
                        style={{ flex: b.end - b.start }}
                        className={clsx(
                          "transition-opacity hover:opacity-80",
                          /build/i.test(b.name) ? "bg-accent" : /judg/i.test(b.name) ? "bg-highlight" : "bg-surface"
                        )}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 divide-y divide-border/60 text-sm">
                    {p.schedule.blocks.map((b, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 py-2">
                        <span className="font-mono text-[11px] text-muted tabular-nums">{b.clock ?? `${rel(b.start)}–${rel(b.end)}`}</span>
                        <span className="flex-1 font-medium">{b.name}</span>
                        <span className="text-xs text-muted tabular-nums">{b.end - b.start} min</span>
                      </li>
                    ))}
                  </ul>
                  {p.schedule.notes.map((n) => (
                    <p key={n} className="mt-1.5 text-xs text-muted">Note: {n}</p>
                  ))}
                </Panel>

                {/* Budget lines */}
                <Panel title="Budget lines" icon={Wallet}>
                  <ul className="divide-y divide-border/60 text-sm">
                    {p.budget.lines.map((l, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 py-2">
                        <span className="text-foreground">{l.label} <Src id={l.source} /></span>
                        <span className="tabular-nums font-medium">{rs(l.amount)}</span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between py-2.5 font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{rs(p.budget.total)}</span>
                    </li>
                  </ul>
                  {p.extras.map((e) => (
                    <p
                      key={e.item}
                      className={clsx(
                        "mt-2 rounded-lg px-3 py-2 text-xs",
                        e.included ? "bg-success/8 text-success" : "bg-surface text-muted"
                      )}
                    >
                      Optional &ldquo;{e.item}&rdquo; ({rs(e.cost)}): {e.included ? "included" : "dropped"} — {e.why}
                    </p>
                  ))}
                  {p.unhandled.map((u) => (
                    <p key={u} className="mt-2 rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger">
                      Unhandled constraint: {u}
                    </p>
                  ))}
                  <p className="mt-2 text-xs text-muted">{p.ranking}</p>
                </Panel>
              </>
            )}
          </section>

          {/* Trace */}
          <section className="lg:col-span-3">
            <TracePanel lines={s?.trace ?? []} tokens={tokens} calls={calls.length} />
          </section>
        </div>
      </main>
    </div>
  );
}

/* ── Subcomponents ───────────────────────────────────────── */

function MessageRow({ m }: { m: MessageRecord }) {
  const tone = {
    accepted: "bg-success/10 text-success",
    rejected: "bg-danger/10 text-danger",
    superseded: "bg-surface text-muted",
    ignored: "bg-surface text-muted",
    duplicate: "bg-surface text-muted",
  }[m.status];
  return (
    <li className="rounded-xl border border-border bg-background/60 p-3 text-sm transition-colors hover:bg-background">
      <div className="mb-1.5 flex items-center gap-2 text-[11px]">
        <span className="font-mono text-muted">#{m.id}</span>
        <span className={clsx("rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide", tone)}>{m.status}</span>
        {m.read && (
          <span className="text-muted">
            {m.read.sender_role.replace("_", " ")}
            {m.read.date ? ` · ${m.read.date}` : ""}
          </span>
        )}
      </div>
      <p className="whitespace-pre-line text-foreground leading-relaxed">{clip(m.text, 260)}</p>
      {m.reason && <p className="mt-1.5 text-xs text-muted">{m.reason}</p>}
    </li>
  );
}

function TracePanel({ lines, tokens, calls }: { lines: TraceLine[]; tokens: number; calls: number }) {
  const [onlyCalls, setOnlyCalls] = useState(false);
  const shown = onlyCalls ? lines.filter((l) => l.kind === "call") : lines;
  return (
    <div className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Cpu className="size-4 text-muted" />
          Trace
        </h2>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted select-none">
          <input
            type="checkbox"
            checked={onlyCalls}
            onChange={(e) => setOnlyCalls(e.target.checked)}
            className="accent-accent"
          />
          model calls only
        </label>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {!lines.length && <Empty>Every model call will appear here, numbered.</Empty>}
        {shown.map((l, i) =>
          l.kind === "call" ? (
            <CallRow key={i} c={l.call} />
          ) : (
            <p
              key={i}
              className={clsx(
                "whitespace-pre-wrap font-mono text-[11px] leading-relaxed",
                /REJECTED|INFEASIBLE|ERROR|FAIL /.test(l.text)
                  ? "text-danger"
                  : /ACCEPTED|PASS/.test(l.text)
                    ? "text-success"
                    : /=====/.test(l.text)
                      ? "pt-2 font-semibold text-foreground"
                      : "text-muted"
              )}
            >
              {l.text.trim()}
            </p>
          )
        )}
      </div>
      <div className="border-t border-border/60 px-4 py-2.5 text-xs text-muted">
        <span className="tabular-nums font-medium text-foreground">{tokens.toLocaleString()}</span> tokens across{" "}
        <span className="font-medium text-foreground">{calls}</span> calls
      </div>
    </div>
  );
}

function CallRow({ c }: { c: TraceCall }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("rounded-xl border p-3 text-xs transition-colors", c.ok ? "border-border bg-surface/50" : "border-danger/25 bg-danger/5")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <span className="font-mono font-bold text-foreground">#{c.n}</span>
        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">{c.area}</span>
        <span className="min-w-0 flex-1 truncate text-muted">{c.model}</span>
        <ChevronDown className={clsx("ml-auto size-3.5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <p className="mt-1 text-muted">
        {c.inputTokens} in · {c.outputTokens} out · {c.ms} ms
        {c.note && ` · ${c.note}`}
        {!c.ok && <span className="ml-1 font-semibold text-danger">FAILED</span>}
      </p>
      {open && (
        <div className="mt-2 space-y-2">
          <pre className="max-h-48 overflow-auto rounded-lg bg-background p-2.5 text-[10px] leading-relaxed">{c.input}</pre>
          <pre className="max-h-64 overflow-auto rounded-lg bg-background p-2.5 text-[10px] leading-relaxed">{pretty(c.output)}</pre>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  icon: typeof Cpu;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted" />
          {title}
        </h2>
        {right && <span className="text-[11px] text-muted">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Area({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Cpu;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
        <Icon className="size-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}

const Big = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[17px] font-semibold tracking-tight text-foreground leading-snug">{children}</p>
);

const Src = ({ id }: { id?: number }) =>
  id ? (
    <span
      className="ml-1 inline-flex items-center rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted"
      title="source message"
    >
      msg {id}
    </span>
  ) : null;

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="py-8 text-center text-sm text-muted/70">{children}</p>
);
