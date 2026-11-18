"use client";

// Inbox → Plan. One prompt page (text + files) and a sidebar that holds every result view.
// Talks to POST /api/run (same run() as the CLI). Gap answers go to POST /api/answer (HITL contract).
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import {
  AlertTriangle, ArrowUp, Building2, CalendarClock, CheckCircle2, ChevronDown, Cpu, Download, FileText,
  Gavel, HelpCircle, Inbox as InboxIcon, LayoutGrid, Loader2, Paperclip, Plus, Sparkles, UtensilsCrossed,
  Wallet, X, XCircle,
} from "lucide-react";
import type { MessageRecord, Plan, TraceCall, TraceLine } from "@/lib/planner/types";

type Gap = { key: string; question: string; kind: "number" | "time" | "text"; blocks: string[]; status: "open" | "answered" | "tba" | "ignored"; value?: unknown };
type Session = {
  messages: MessageRecord[];
  plan: (Plan & { tba?: string[] }) | null;
  gaps?: Gap[];
  infeasible?: string;
  trace: TraceLine[];
  mode?: string;
  modeReason?: string;
  error?: string;
};
type View = "new" | "overview" | "schedule" | "budget" | "inbox" | "input" | "trace";

const rs = (n: number) => (n === Infinity || n == null ? "No cap" : `Rs ${n.toLocaleString("en-US")}`);
const rel = (m: number) => `T+${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
const pretty = (s: string) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } };

const list: Variants = { show: { transition: { staggerChildren: 0.06 } } };
const item: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

export default function Page() {
  const [s, setS] = useState<Session | null>(null);
  const [view, setView] = useState<View>("new");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ name: string; body: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/run").then((r) => r.json()).then((d) => { if (d?.plan || d?.messages?.length) { setS(d); setView("overview"); } }).catch(() => {});
  }, []);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const read = await Promise.all([...list].map(async (f) => ({ name: f.name, body: await f.text() })));
    setFiles((cur) => [...cur, ...read]);
  }

  async function submit() {
    const input = [...files.map((f) => f.body), text].filter((t) => t.trim()).join("\n\n");
    if (!input.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: input }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else { setS(d); setText(""); setFiles([]); setView("overview"); }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function answer(key: string, action: "value" | "tba" | "ignore", value?: string) {
    const r = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, action, value }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    setS(d);
  }

  const calls = useMemo(() => (s?.trace ?? []).flatMap((l) => (l.kind === "call" ? [l.call] : [])), [s]);
  const tokens = calls.reduce((a, c) => a + c.inputTokens + c.outputTokens, 0);
  const openGaps = (s?.gaps ?? []).filter((g) => g.status === "open");
  const rejected = (s?.messages ?? []).filter((m) => m.status === "rejected").length;
  const has = !!s && (!!s.plan || s.messages.length > 0);

  const nav: { id: View; label: string; icon: typeof Cpu; badge?: number; tone?: "warn" }[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "schedule", label: "Schedule", icon: CalendarClock },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "inbox", label: "Inbox", icon: InboxIcon, badge: rejected || undefined, tone: "warn" },
    { id: "input", label: "Needs your input", icon: HelpCircle, badge: openGaps.length || undefined, tone: "warn" },
    { id: "trace", label: "Trace", icon: Cpu },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen bg-background text-foreground">
        {/* ---------------- Sidebar ---------------- */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-3 md:flex">
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="grid size-8 place-items-center rounded-lg bg-ink text-ink-foreground"><InboxIcon className="size-4" /></span>
            <span className="font-semibold tracking-tight">Inbox → Plan</span>
          </div>

          <button onClick={() => setView("new")} className={clsx("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition", view === "new" ? "bg-card shadow-sm" : "hover:bg-card/60")}>
            <Plus className="size-4" />New plan
          </button>

          <p className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Results</p>
          <nav className="flex flex-col gap-0.5">
            {nav.map((n) => (
              <button key={n.id} onClick={() => has && setView(n.id)} disabled={!has}
                className={clsx("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-45",
                  view === n.id ? "bg-card font-medium shadow-sm" : "hover:bg-card/60")}>
                <n.icon className="size-4" />
                <span className="flex-1 text-left">{n.label}</span>
                {n.badge ? <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">{n.badge}</span> : null}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            {has && (
              <div className="flex flex-col gap-0.5">
                <a href="/api/run?download=plan" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-card/60"><Download className="size-4" />Download plan.md</a>
                <a href="/api/run?download=trace" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-card/60"><Download className="size-4" />Download trace.txt</a>
              </div>
            )}
            <div className="rounded-xl bg-card p-3 text-sm">
              <p className="text-xs text-muted">Model usage this session</p>
              <p className="mt-1 font-semibold tabular-nums">{tokens.toLocaleString()} tokens</p>
              <p className="text-xs text-muted">{calls.length} model calls</p>
            </div>
          </div>
        </aside>

        {/* ---------------- Main ---------------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
            <h1 className="text-sm font-semibold">{view === "new" ? "New plan" : nav.find((n) => n.id === view)?.label}</h1>
            {s?.mode && <span className="rounded-full bg-surface px-3 py-1 text-xs text-muted">Last run: <b className="text-foreground">{s.mode}</b>{s.modeReason ? ` · ${s.modeReason}` : ""}</span>}
          </header>

          {/* mobile nav */}
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface p-2 md:hidden">
            {[{ id: "new" as View, label: "New plan" }, ...(has ? nav : [])].map((n) => (
              <button key={n.id} onClick={() => setView(n.id)} className={clsx("shrink-0 rounded-lg px-3 py-1.5 text-sm", view === n.id ? "bg-card font-medium" : "text-muted")}>{n.label}</button>
            ))}
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="h-full">
                {view === "new" && (
                  <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-5 py-10">
                    <h2 className="text-center text-3xl font-semibold tracking-tight">What event are we planning?</h2>
                    <p className="mt-2 text-center text-muted">Paste your messages or attach the files. You get a valid, budgeted plan and the reason for every figure.</p>

                    <div
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                      onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                      className={clsx("mt-8 rounded-2xl border bg-card p-3 shadow-sm transition", drag ? "border-accent ring-2 ring-accent/30" : "border-border")}
                    >
                      <AnimatePresence initial={false}>
                        {files.length > 0 && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-2 overflow-hidden px-1 pb-2">
                            {files.map((f, i) => (
                              <motion.span key={f.name + i} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1.5 rounded-lg bg-surface py-1 pl-2 pr-1 text-sm">
                                <FileText className="size-3.5 text-muted" />{f.name}
                                <button onClick={() => setFiles((c) => c.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="grid size-5 place-items-center rounded hover:bg-border"><X className="size-3" /></button>
                              </motion.span>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <textarea
                        value={text} onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                        placeholder="Paste the messages here, or one new message to update the current plan…"
                        className="block min-h-[150px] w-full resize-none bg-transparent p-2 text-[15px] outline-none placeholder:text-muted"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-foreground">
                          <Paperclip className="size-4" />Attach files
                        </button>
                        <input ref={fileRef} type="file" multiple accept=".txt,.md,text/plain" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                        <button onClick={submit} disabled={busy || (!text.trim() && !files.length)} aria-label="Run"
                          className="flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-ink-foreground transition active:scale-95 disabled:opacity-40">
                          {busy ? <><Loader2 className="size-4 animate-spin" />Planning…</> : <>Make plan<ArrowUp className="size-4" /></>}
                        </button>
                      </div>
                    </div>
                    {err && <p className="mt-3 flex items-center gap-2 text-sm text-danger"><AlertTriangle className="size-4" />{err}</p>}

                    <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                      <Hint icon={FileText} title="3 or more messages">Starts a fresh plan from scratch.</Hint>
                      <Hint icon={Sparkles} title="1 or 2 messages">Updates the current plan. Only what changed is re-checked.</Hint>
                    </div>
                  </div>
                )}

                {view !== "new" && s && (
                  <motion.div variants={list} initial="hidden" animate="show" className="mx-auto max-w-5xl space-y-4 px-5 py-6">
                    {s.infeasible && (
                      <motion.div variants={item} className="flex items-start gap-3 rounded-xl border border-danger bg-card p-4 text-sm">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                        <p><b>This input could not be planned.</b> {s.infeasible} {s.plan && "The last valid plan is still shown."}</p>
                      </motion.div>
                    )}
                    {view === "overview" && <Overview s={s} openGaps={openGaps.length} goInput={() => setView("input")} />}
                    {view === "schedule" && <Schedule p={s.plan} />}
                    {view === "budget" && <Budget p={s.plan} />}
                    {view === "inbox" && <Inbox messages={s.messages} />}
                    {view === "input" && <Gaps gaps={s.gaps ?? []} answer={answer} />}
                    {view === "trace" && <Trace lines={s.trace} tokens={tokens} calls={calls.length} />}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}

/* ---------------- views ---------------- */

function Overview({ s, openGaps, goInput }: { s: Session; openGaps: number; goInput: () => void }) {
  const p = s.plan;
  if (!p) return <Empty>No valid plan yet. Check the Inbox for the reason.</Empty>;
  const tba = (k: string) => p.tba?.includes(k);
  return (
    <>
      {openGaps > 0 && (
        <motion.button variants={item} onClick={goInput} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm transition hover:border-foreground">
          <HelpCircle className="size-5 text-danger" />
          <span className="flex-1"><b>{openGaps} {openGaps === 1 ? "detail is" : "details are"} missing.</b> Those parts show as TBA. Answer, keep as TBA, or ignore.</span>
          <span className="font-medium">Review</span>
        </motion.button>
      )}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total cost" value={rs(p.budget.total)} />
        <Stat label="Budget left" value={tba("budget") ? "TBA" : rs(p.budget.remaining)} />
        <Stat label="People to feed" value={String(p.headcount.total)} />
        <Stat label="Judges needed" value={tba("judging") ? "TBA" : String(p.judging.needed)} />
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap gap-2">
        {p.checks.map((c) => (
          <span key={c.name} title={c.detail} className={clsx("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", c.ok ? "border-success text-success" : "border-danger text-danger")}>
            {c.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}{c.name}
          </span>
        ))}
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Area title="Venue" icon={Building2} tba={tba("venue")}>
          <Big>{p.venue.name}</Big>
          <p>Seats {p.venue.seats} for {p.headcount.total} people</p>
          <p className="text-muted">{rs(p.venue.price)} <Src id={p.venue.source} />{p.venue.attrs.length > 0 && ` · ${p.venue.attrs.join(", ")}`}</p>
        </Area>
        <Area title="Food" icon={UtensilsCrossed} tba={tba("food")}>
          <Big>{p.food.boxes} × {p.food.name}</Big>
          <p>{rs(p.food.price)} each, {rs(p.food.cost)} in total <Src id={p.food.source} /></p>
          <p className="text-muted">{Object.entries(p.headcount.parts).map(([k, v]) => `${k} ${v}`).join(" + ")}</p>
        </Area>
        <Area title="Judging" icon={Gavel} tba={tba("judging")}>
          <Big>{p.judging.needed} judges</Big>
          <p>{p.teams} teams, up to {p.judging.teamsPerJudge} each · {p.judging.confirmed} confirmed</p>
          <p className="text-muted">{p.judging.minutesPerTeam} min per team, {p.judging.blockMinutes} min block · {rs(p.judging.cost)}</p>
        </Area>
        <Area title="Budget" icon={Wallet} tba={tba("budget")}>
          <Big>{rs(p.budget.total)}</Big>
          <p>of {rs(p.budget.cap)} · {rs(p.budget.remaining)} left</p>
          {p.budget.cap !== Infinity && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (p.budget.total / p.budget.cap) * 100)}%` }} transition={{ duration: 0.8, delay: 0.3 }} className="h-full rounded-full bg-accent" />
            </div>
          )}
        </Area>
      </div>
      {p.unhandled.map((u) => <motion.p variants={item} key={u} className="rounded-lg border border-danger bg-card px-3 py-2 text-sm text-danger">Unhandled constraint: {u}</motion.p>)}
    </>
  );
}

function Schedule({ p }: { p: Session["plan"] }) {
  if (!p) return <Empty>No plan yet.</Empty>;
  if (p.tba?.includes("schedule")) return <Card title="Schedule"><p className="py-6 text-center text-muted"><b className="text-foreground">TBA.</b> Event length is missing. Add it under “Needs your input”.</p></Card>;
  return (
    <Card title="Schedule" right={p.schedule.relative ? "Relative times" : "Clock times"}>
      <div className="flex h-8 overflow-hidden rounded-lg">
        {p.schedule.blocks.map((b, i) => (
          <motion.div key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }} style={{ flex: b.end - b.start, transformOrigin: "left" }}
            title={`${b.name}, ${b.end - b.start} min`} className={clsx("border-r-2 border-card last:border-0", /build/i.test(b.name) ? "bg-accent" : /judg/i.test(b.name) ? "bg-highlight" : "bg-border")} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border text-sm">
        {p.schedule.blocks.map((b, i) => (
          <li key={i} className="grid grid-cols-[9rem_1fr_auto] gap-3 py-2.5">
            <span className="font-mono text-xs text-muted">{b.clock ?? `${rel(b.start)} – ${rel(b.end)}`}</span>
            <span className="font-medium">{b.name}</span>
            <span className="text-muted">{b.end - b.start} min</span>
          </li>
        ))}
      </ul>
      {p.schedule.notes.map((n) => <p key={n} className="mt-2 text-sm text-muted">Note: {n}</p>)}
    </Card>
  );
}

function Budget({ p }: { p: Session["plan"] }) {
  if (!p) return <Empty>No plan yet.</Empty>;
  return (
    <Card title="Budget" right={`${rs(p.budget.total)} of ${rs(p.budget.cap)}`}>
      <ul className="divide-y divide-border text-sm">
        {p.budget.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3 py-2.5"><span>{l.label} <Src id={l.source} /></span><span className="tabular-nums">{rs(l.amount)}</span></li>
        ))}
        <li className="flex justify-between py-2.5 font-semibold"><span>Total</span><span className="tabular-nums">{rs(p.budget.total)}</span></li>
      </ul>
      {p.extras.map((e) => (
        <p key={e.item} className={clsx("mt-3 rounded-lg border px-3 py-2 text-sm", e.included ? "border-success" : "border-border text-muted")}>
          Optional “{e.item}” ({rs(e.cost)}): <b>{e.included ? "included" : "dropped"}</b>. {e.why}
        </p>
      ))}
      <p className="mt-3 text-sm text-muted">{p.ranking}</p>
    </Card>
  );
}

function Inbox({ messages }: { messages: MessageRecord[] }) {
  const rejected = messages.filter((m) => m.status === "rejected");
  const tone: Record<string, string> = { accepted: "bg-success text-white", rejected: "bg-danger text-white", superseded: "bg-surface text-muted", ignored: "bg-surface text-muted", duplicate: "bg-surface text-muted" };
  return (
    <>
      {rejected.length > 0 && (
        <motion.div variants={item} className="rounded-xl border border-danger bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger"><XCircle className="size-4" />Rejected ({rejected.length})</h2>
          <ul className="space-y-2 text-sm">{rejected.map((m) => <li key={m.id}><b>#{m.id}</b> “{clip(m.text, 120)}”<br /><span className="text-muted">Why: {m.reason}</span></li>)}</ul>
        </motion.div>
      )}
      <Card title="All messages" right={`${messages.length}`}>
        <motion.ul variants={list} initial="hidden" animate="show" className="space-y-2">
          {[...messages].reverse().map((m) => (
            <motion.li variants={item} key={m.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-mono text-muted">#{m.id}</span>
                <span className={clsx("rounded-full px-2 py-0.5 font-medium uppercase", tone[m.status])}>{m.status}</span>
                {m.read && <span className="text-muted">{m.read.sender_role.replace("_", " ")}{m.read.date ? ` · ${m.read.date}` : ""}</span>}
              </div>
              <p className="whitespace-pre-line">{clip(m.text, 300)}</p>
              {m.reason && <p className="mt-1 text-xs text-muted">{m.reason}</p>}
            </motion.li>
          ))}
        </motion.ul>
      </Card>
    </>
  );
}

function Gaps({ gaps, answer }: { gaps: Gap[]; answer: (k: string, a: "value" | "tba" | "ignore", v?: string) => Promise<void> }) {
  const visible = gaps.filter((g) => g.status !== "ignored");
  if (!visible.length) return <Empty>Nothing is missing. Every part of the plan has what it needs.</Empty>;
  return <>{visible.map((g) => <Gap key={g.key} g={g} answer={answer} />)}</>;
}

function Gap({ g, answer }: { g: Gap; answer: (k: string, a: "value" | "tba" | "ignore", v?: string) => Promise<void> }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async (a: "value" | "tba" | "ignore") => {
    setBusy(true); setErr("");
    try { await answer(g.key, a, v); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const done = g.status !== "open";
  return (
    <motion.div variants={item} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{g.question}</p>
          <p className="mt-0.5 text-sm text-muted">Holds up: {g.blocks.join(", ")}</p>
        </div>
        {done && <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", g.status === "answered" ? "bg-success text-white" : "bg-surface")}>{g.status === "answered" ? `Answered: ${String(g.value)}` : "Kept as TBA"}</span>}
      </div>
      {!done && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={v} onChange={(e) => setV(e.target.value)} inputMode={g.kind === "number" ? "numeric" : "text"} placeholder={g.kind === "time" ? "e.g. 09:00" : g.kind === "number" ? "Enter a number" : "Type your answer"}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground" />
          <button onClick={() => run("value")} disabled={busy || !v.trim()} className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-ink-foreground disabled:opacity-40">{busy ? "Saving…" : "Save answer"}</button>
          <button onClick={() => run("tba")} disabled={busy} className="h-10 rounded-lg border border-border px-4 text-sm hover:bg-surface">Keep as TBA</button>
          <button onClick={() => run("ignore")} disabled={busy} className="h-10 rounded-lg px-3 text-sm text-muted hover:bg-surface">Ignore</button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </motion.div>
  );
}

function Trace({ lines, tokens, calls }: { lines: TraceLine[]; tokens: number; calls: number }) {
  const [only, setOnly] = useState(false);
  const shown = only ? lines.filter((l) => l.kind === "call") : lines;
  return (
    <Card title="Trace" right={`${tokens.toLocaleString()} tokens · ${calls} calls`}>
      <label className="mb-3 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />Show model calls only</label>
      <div className="space-y-1.5">
        {!lines.length && <Empty>Every model call shows up here, numbered.</Empty>}
        {shown.map((l, i) => l.kind === "call" ? <CallRow key={i} c={l.call} /> : (
          <p key={i} className={clsx("whitespace-pre-wrap font-mono text-xs leading-relaxed", /REJECTED|INFEASIBLE|ERROR|FAIL /.test(l.text) ? "text-danger" : /ACCEPTED|PASS/.test(l.text) ? "text-success" : /=====/.test(l.text) ? "pt-2 font-semibold" : "text-muted")}>{l.text.trim()}</p>
        ))}
      </div>
    </Card>
  );
}

function CallRow({ c }: { c: TraceCall }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("rounded-lg border p-3 text-xs", c.ok ? "border-border" : "border-danger")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <span className="font-mono font-semibold">#{c.n}</span>
        <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-foreground">{c.area}</span>
        <span className="truncate text-muted">{c.model}</span>
        <ChevronDown className={clsx("ml-auto size-4 shrink-0 transition", open && "rotate-180")} />
      </button>
      <p className="mt-1 text-muted">in {c.inputTokens} · out {c.outputTokens} · {c.ms} ms{c.note ? ` · ${c.note}` : ""}{!c.ok ? " · FAILED" : ""}</p>
      {open && (
        <div className="mt-2 space-y-2">
          <pre className="max-h-48 overflow-auto rounded-lg bg-surface p-2 text-[11px]">{c.input}</pre>
          <pre className="max-h-64 overflow-auto rounded-lg bg-surface p-2 text-[11px]">{pretty(c.output)}</pre>
        </div>
      )}
    </div>
  );
}

/* ---------------- small pieces ---------------- */

const Card = ({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) => (
  <motion.section variants={item} className="rounded-xl border border-border bg-card p-5">
    <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title}</h2>{right && <span className="text-sm text-muted">{right}</span>}</div>
    {children}
  </motion.section>
);
const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted">{label}</p><p className={clsx("mt-1 text-2xl font-semibold tracking-tight tabular-nums", value === "TBA" && "text-muted")}>{value}</p></div>
);
function Area({ title, icon: Icon, tba, children }: { title: string; icon: typeof Cpu; tba?: boolean; children: React.ReactNode }) {
  return (
    <motion.div variants={item} className="rounded-xl border border-border bg-card p-4 text-sm transition hover:-translate-y-0.5 hover:border-foreground">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted"><Icon className="size-4" />{title}</p>
      {tba ? <p className="text-lg font-semibold text-muted">TBA</p> : children}
    </motion.div>
  );
}
const Hint = ({ icon: Icon, title, children }: { icon: typeof Cpu; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3 rounded-xl border border-border bg-card p-3"><Icon className="mt-0.5 size-4 shrink-0 text-muted" /><p><b className="font-medium">{title}.</b> <span className="text-muted">{children}</span></p></div>
);
const Big = ({ children }: { children: React.ReactNode }) => <p className="text-lg font-semibold tracking-tight">{children}</p>;
const Src = ({ id }: { id?: number }) => (id ? <span className="ml-1 rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">msg {id}</span> : null);
const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-10 text-center text-sm text-muted">{children}</p>;
