"use client";

// Inbox → Plan. One prompt page (text + files) and a sidebar that holds every result view.
// Talks to POST /api/run (same run() as the CLI). Missing facts go to POST /api/answer (HITL contract).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import { ArrowUp, ChevronDown, Download, FileText, Loader2, Paperclip, Plus, X } from "lucide-react";
import { Globe } from "@/components/globe";
import type { MessageRecord, MessageStatus, Plan, Role, TraceCall, TraceLine } from "@/lib/planner/types";

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
type View = "new" | "overview" | "schedule" | "budget" | "inbox" | "trace";
type Answer = (k: string, a: "value" | "tba" | "ignore", v?: string) => Promise<void>;

/* ---------------- plain-language helpers ---------------- */

const rs = (n: number | null | undefined) => (n == null || n === Infinity ? "No limit" : `Rs ${n.toLocaleString("en-US")}`);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const dur = (m: number) => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h && r ? `${h}h ${r}m` : h ? `${h}h` : `${r} min`; };
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
const pretty = (s: string) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } };

const STATUS: Record<MessageStatus, { label: string; tone: string }> = {
  accepted: { label: "Used in the plan", tone: "bg-success/12 text-success" },
  rejected: { label: "Not used", tone: "bg-danger/12 text-danger" },
  superseded: { label: "Replaced by a newer message", tone: "bg-surface text-muted" },
  ignored: { label: "Not about the plan", tone: "bg-surface text-muted" },
  duplicate: { label: "Repeat of another message", tone: "bg-surface text-muted" },
};
const ROLE: Record<Role, string> = {
  authority: "Authority", venue: "Venue", caterer: "Caterer", finance: "Finance", judging_coordinator: "Judging lead",
  participant: "Participant", unknown: "Unknown sender", organiser: "Organiser",
};

const list: Variants = { show: { transition: { staggerChildren: 0.05 } } };
const item: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } };

// "Message 3" chips open the Inbox on that message.
const OpenMessage = createContext<(id: number) => void>(() => {});

export default function Page() {
  const [s, setS] = useState<Session | null>(null);
  const [view, setView] = useState<View>("new");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ name: string; body: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [focusMsg, setFocusMsg] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/run").then((r) => r.json()).then((d) => { if (d?.plan || d?.messages?.length) { setS(d); setView("overview"); } }).catch(() => {});
  }, []);

  async function addFiles(fl: FileList | null) {
    if (!fl) return;
    const read = await Promise.all([...fl].map(async (f) => ({ name: f.name, body: await f.text() })));
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

  const answer: Answer = async (key, action, value) => {
    const r = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, action, value }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    setS(d);
  };

  const calls = useMemo(() => (s?.trace ?? []).flatMap((l) => (l.kind === "call" ? [l.call] : [])), [s]);
  const tokens = calls.reduce((a, c) => a + c.inputTokens + c.outputTokens, 0);
  const openGaps = (s?.gaps ?? []).filter((g) => g.status === "open");
  const rejected = (s?.messages ?? []).filter((m) => m.status === "rejected").length;
  const has = !!s && (!!s.plan || s.messages.length > 0);

  const nav: { id: View; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "schedule", label: "Schedule" },
    { id: "budget", label: "Budget" },
    { id: "inbox", label: "Inbox", badge: rejected || undefined },
    { id: "trace", label: "How it was decided" },
  ];
  const title = view === "new" ? "New plan" : nav.find((n) => n.id === view)?.label;

  return (
    <MotionConfig reducedMotion="user">
      <OpenMessage.Provider value={(id) => { setFocusMsg(id); setView("inbox"); }}>
        <div className="flex h-screen bg-background text-foreground">
          {/* ---------------- Sidebar ---------------- */}
          <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-3 md:flex">
            <p className="px-3 py-2 text-[15px] font-semibold tracking-tight">Inbox → Plan</p>
            <Link href="/" className="mx-3 -mt-1 text-xs text-muted underline underline-offset-2">← Back to site</Link>

            <button onClick={() => setView("new")} className={clsx("mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition", view === "new" ? "bg-card shadow-sm" : "hover:bg-card/60")}>
              <Plus className="size-4" />New plan
            </button>

            <nav className="mt-5 flex flex-col gap-0.5" aria-label="Results">
              {nav.map((n) => (
                <button key={n.id} onClick={() => has && setView(n.id)} disabled={!has}
                  className={clsx("flex items-center rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40", view === n.id ? "bg-card font-medium shadow-sm" : "hover:bg-card/60")}>
                  <span className="flex-1 text-left">{n.label}</span>
                  {n.badge ? <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">{n.badge}</span> : null}
                </button>
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              {has && (
                <div className="flex flex-col gap-0.5 text-sm">
                  <a href="/api/run?download=plan" className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-card/60"><Download className="size-4" />Download the plan</a>
                  <a href="/api/run?download=trace" className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-card/60"><Download className="size-4" />Download the log</a>
                </div>
              )}
              <div className="px-3 text-xs text-muted">AI used: <span className="tabular-nums text-foreground">{calls.length}</span> calls, <span className="tabular-nums text-foreground">{tokens.toLocaleString()}</span> tokens</div>
            </div>
          </aside>

          {/* ---------------- Main ---------------- */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
              <h1 className="text-sm font-semibold">{title}</h1>
              <div className="flex items-center gap-3">
                {s?.mode && <span className="hidden text-xs text-muted sm:inline">{s.mode === "fresh" ? "Built a new plan" : "Updated the plan"}</span>}
                {openGaps.length > 0 && (
                  <button onClick={() => setAskOpen(true)} className="flex h-8 items-center gap-2 rounded-full bg-ws-ink px-3.5 text-xs font-medium text-ws-ink-foreground transition active:scale-95">
                    <span className="grid size-5 place-items-center rounded-full bg-highlight text-[11px] font-semibold text-highlight-foreground tabular-nums">{openGaps.length}</span>
                    {openGaps.length === 1 ? "Question for you" : "Questions for you"}
                  </button>
                )}
              </div>
            </header>

            {/* mobile nav */}
            <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface p-2 md:hidden">
              {[{ id: "new" as View, label: "New plan" }, ...(has ? nav : [])].map((n) => (
                <button key={n.id} onClick={() => setView(n.id)} className={clsx("shrink-0 rounded-lg px-3 py-1.5 text-sm", view === n.id ? "bg-card font-medium" : "text-muted")}>{n.label}</button>
              ))}
            </div>

            <main className="min-h-0 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }} className="h-full">
                  {view === "new" && (
                    <div className="mx-auto grid min-h-full max-w-6xl items-center gap-4 px-6 py-8 lg:grid-cols-[minmax(0,34rem)_1fr] lg:gap-10">
                      <div className="order-2 lg:order-1">
                        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Turn event messages into a plan</h2>
                        <p className="mt-3 max-w-md text-muted">Paste the messages from your venue, caterer and organisers. You get a schedule, a budget and the reason behind every number.</p>

                        <div
                          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                          className={clsx("mt-7 rounded-2xl border bg-card p-3 shadow-sm transition", drag ? "border-accent ring-2 ring-accent/25" : "border-border")}
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
                            aria-label="Event messages"
                            placeholder="Paste the messages here, or type one new message to update the current plan."
                            className="block min-h-[150px] w-full resize-none bg-transparent p-2 text-[15px] outline-none placeholder:text-muted"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-foreground">
                              <Paperclip className="size-4" />Attach files
                            </button>
                            <input ref={fileRef} type="file" multiple accept=".txt,.md,text/plain" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                            <button onClick={submit} disabled={busy || (!text.trim() && !files.length)}
                              className="flex h-9 items-center gap-2 rounded-full bg-ws-ink px-4 text-sm font-medium text-ws-ink-foreground transition active:scale-95 disabled:opacity-40">
                              {busy ? <><Loader2 className="size-4 animate-spin" />Planning…</> : <>Make the plan<ArrowUp className="size-4" /></>}
                            </button>
                          </div>
                        </div>
                        {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
                        <p className="mt-4 text-sm text-muted">Three or more messages start a new plan. One or two update the plan you have.</p>
                      </div>

                      <div className="order-1 mx-auto w-full max-w-[26rem] lg:order-2 lg:max-w-none">
                        <Globe className="aspect-square w-full" />
                      </div>
                    </div>
                  )}

                  {view !== "new" && s && (
                    <motion.div variants={list} initial="hidden" animate="show" className="mx-auto max-w-4xl space-y-4 px-5 py-6">
                      {s.infeasible && (
                        <motion.div variants={item} className="rounded-xl border border-danger bg-card p-4 text-sm">
                          <p><b>We could not build a plan from this.</b> {s.infeasible} {s.plan && "The last valid plan is still shown."}</p>
                        </motion.div>
                      )}
                      {view === "overview" && <Overview s={s} openGaps={openGaps.length} ask={() => setAskOpen(true)} go={setView} />}
                      {view === "schedule" && <Schedule p={s.plan} />}
                      {view === "budget" && <Budget p={s.plan} />}
                      {view === "inbox" && <Inbox messages={s.messages} focus={focusMsg} />}
                      {view === "trace" && <Trace lines={s.trace} tokens={tokens} calls={calls.length} />}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          <AskPanel open={askOpen} onClose={() => setAskOpen(false)} gaps={s?.gaps ?? []} answer={answer} />
        </div>
      </OpenMessage.Provider>
    </MotionConfig>
  );
}

/* ---------------- overview ---------------- */

function Overview({ s, openGaps, ask, go }: { s: Session; openGaps: number; ask: () => void; go: (v: View) => void }) {
  const p = s.plan;
  if (!p) return <Empty>There is no valid plan yet. Open the Inbox to see why messages were not used.</Empty>;
  const tba = (k: string) => p.tba?.includes(k);
  const failed = p.checks.filter((c) => !c.ok && !c.pending);
  const waiting = p.checks.filter((c) => c.pending).length;
  const used = pct(p.budget.total, p.budget.cap);
  const capped = p.budget.cap != null && p.budget.cap !== Infinity;
  const ready = failed.length === 0;

  return (
    <>
      <motion.section variants={item} className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className={clsx("text-sm font-medium", ready ? "text-success" : "text-danger")}>{ready ? (waiting ? "Plan ready, some parts still to be confirmed" : "Plan ready, every check passed") : `${failed.length} ${failed.length === 1 ? "problem" : "problems"} to fix`}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-snug tracking-tight">
            {tba("venue") ? "Venue to be confirmed" : p.venue.name} for {p.headcount.total} people
            {!tba("judging") && <>, with {p.judging.needed} judges</>}
          </h2>
          <p className="mt-2 text-muted">
            {tba("schedule") ? "Event length not known yet." : `The event runs ${dur(p.schedule.lengthMin)}.`} {tba("food") ? "" : `${p.food.boxes} meals ordered.`}
          </p>
        </div>
        {capped && !tba("budget") && <Ring value={used} label="of budget used" />}
      </motion.section>

      {openGaps > 0 && (
        <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p><b>{openGaps} {openGaps === 1 ? "detail is" : "details are"} missing.</b> <span className="text-muted">Those parts show as TBA until you answer.</span></p>
          <button onClick={ask} className="rounded-lg bg-ws-ink px-3.5 py-1.5 font-medium text-ws-ink-foreground">Answer now</button>
        </motion.div>
      )}

      {failed.map((c) => <motion.p variants={item} key={c.name} className="rounded-lg border border-danger bg-card px-4 py-3 text-sm"><b className="text-danger">{c.name}.</b> {c.detail}</motion.p>)}
      {p.unhandled.map((u) => <motion.p variants={item} key={u} className="rounded-lg border border-danger bg-card px-4 py-3 text-sm"><b className="text-danger">Not handled:</b> {u}</motion.p>)}

      <motion.div variants={item} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="People coming" value={String(p.headcount.total)} />
        <Stat label="Teams" value={String(p.teams)} />
        <Stat label="Money left" value={tba("budget") ? "TBA" : rs(p.budget.remaining)} />
        <Stat label="Judges needed" value={tba("judging") ? "TBA" : String(p.judging.needed)} />
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile title="Venue" tba={tba("venue")}>
          <Big>{p.venue.name}</Big>
          <p>Seats {p.venue.seats} · {rs(p.venue.price)} <Src id={p.venue.source} /></p>
          {p.venue.attrs.length > 0 && <p className="text-muted">{p.venue.attrs.join(", ")}</p>}
        </Tile>
        <Tile title="Food" tba={tba("food")}>
          <Big>{p.food.boxes} × {p.food.name}</Big>
          <p>{rs(p.food.price)} each · {rs(p.food.cost)} total <Src id={p.food.source} /></p>
          <p className="text-muted">{Object.entries(p.headcount.parts).map(([k, v]) => `${k} ${v}`).join(" + ")}</p>
        </Tile>
        <Tile title="Judging" tba={tba("judging")}>
          <Big>{p.judging.needed} judges for {p.teams} teams</Big>
          <p>{p.judging.confirmed} confirmed · {rs(p.judging.cost)}</p>
          <p className="text-muted">{p.judging.minutesPerTeam} min per team</p>
        </Tile>
        <Tile title="Schedule" tba={tba("schedule")} onOpen={() => go("schedule")}>
          <Big>{dur(p.schedule.lengthMin)} in {p.schedule.blocks.length} parts</Big>
          <MiniBar blocks={p.schedule.blocks} length={p.schedule.lengthMin} />
          <p className="mt-2 text-muted">See the full schedule</p>
        </Tile>
      </div>

      <motion.details variants={item} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Checks ({p.checks.filter((c) => c.ok && !c.pending).length} of {p.checks.length} passed)</summary>
        <ul className="mt-3 space-y-1.5">
          {p.checks.map((c) => (
            <li key={c.name} className="flex gap-2">
              <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", c.pending ? "bg-muted" : c.ok ? "bg-success" : "bg-danger")} />
              <span><b className="font-medium">{c.name}.</b> <span className="text-muted">{c.pending ? "Waiting for missing details. " : ""}{c.detail}</span></span>
            </li>
          ))}
        </ul>
      </motion.details>
    </>
  );
}

/* ---------------- schedule ---------------- */

const blockTone = (name: string) => (/build|hack|work/i.test(name) ? "bg-accent" : /judg|demo|present/i.test(name) ? "bg-highlight" : /lunch|break|meal|dinner|tea/i.test(name) ? "bg-muted/40" : "bg-ws-ink/70");

function Schedule({ p }: { p: Session["plan"] }) {
  if (!p) return <Empty>There is no plan yet.</Empty>;
  if (p.tba?.includes("schedule")) return <Card title="Schedule"><p className="py-6 text-center text-muted"><b className="text-foreground">To be announced.</b> The event length is missing. Use “Questions for you” at the top to add it.</p></Card>;
  const len = p.schedule.lengthMin;
  return (
    <Card title="Schedule" right={`${dur(len)} in total`}>
      <p className="-mt-2 mb-5 text-sm text-muted">{p.schedule.relative ? "Times count from the start of the event." : "Times are clock times."} The percentage is each part’s share of the whole event.</p>
      <ul className="space-y-1">
        {p.schedule.blocks.map((b, i) => {
          const d = b.end - b.start;
          return (
            <li key={i} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 rounded-lg px-2 py-2 sm:grid-cols-[7rem_minmax(8rem,14rem)_1fr_3rem]">
              <span className="text-xs text-muted tabular-nums">{b.clock ?? (b.start === 0 ? "At the start" : `After ${dur(b.start)}`)}</span>
              <span className="min-w-0 text-sm"><b className="font-medium">{b.name}</b><span className="block text-xs text-muted sm:inline sm:before:content-['_·_']">{dur(d)}</span></span>
              <span className="relative col-span-3 order-last h-3 rounded-full bg-surface sm:order-none sm:col-span-1">
                <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ left: `${(b.start / len) * 100}%`, width: `${Math.max(1.5, (d / len) * 100)}%`, transformOrigin: "left" }}
                  className={clsx("absolute inset-y-0 rounded-full", blockTone(b.name))} />
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">{pct(d, len)}%</span>
            </li>
          );
        })}
      </ul>
      {p.schedule.notes.filter((n) => !/relative/i.test(n)).map((n) => <p key={n} className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm text-muted">{n}</p>)}
    </Card>
  );
}

function MiniBar({ blocks, length }: { blocks: Plan["schedule"]["blocks"]; length: number }) {
  return (
    <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
      {blocks.map((b, i) => <span key={i} title={`${b.name}: ${pct(b.end - b.start, length)}%`} style={{ flex: b.end - b.start }} className={blockTone(b.name)} />)}
    </div>
  );
}

/* ---------------- budget ---------------- */

function Budget({ p }: { p: Session["plan"] }) {
  if (!p) return <Empty>There is no plan yet.</Empty>;
  const { total, cap, remaining, lines } = p.budget;
  const capped = cap != null && cap !== Infinity;
  const used = pct(total, cap);
  const over = capped && total > cap;
  return (
    <>
      <Card title="Budget">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">{capped ? `${used}%` : rs(total)}</p>
            <p className="mt-1 text-sm text-muted">{capped ? "of the budget is spent" : "spent. No budget limit was given."}</p>
          </div>
          {capped && (
            <dl className="grid grid-cols-3 gap-6 text-sm">
              <div><dt className="text-muted">Spent</dt><dd className="font-semibold tabular-nums">{rs(total)}</dd></div>
              <div><dt className="text-muted">Budget</dt><dd className="font-semibold tabular-nums">{rs(cap)}</dd></div>
              <div><dt className="text-muted">{over ? "Over by" : "Left"}</dt><dd className={clsx("font-semibold tabular-nums", over && "text-danger")}>{rs(Math.abs(remaining))}</dd></div>
            </dl>
          )}
        </div>
        {capped && (
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, used)}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className={clsx("h-full rounded-full", over ? "bg-danger" : "bg-accent")} />
          </div>
        )}
      </Card>

      <Card title="Where the money goes">
        <ul className="space-y-4">
          {lines.map((l, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{l.label} <Src id={l.source} /></span>
                <span className="tabular-nums"><b className="font-semibold">{rs(l.amount)}</b> <span className="ml-1 inline-block w-9 text-right text-muted">{pct(l.amount, total)}%</span></span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct(l.amount, total)}%` }} transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-accent" />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {p.extras.length > 0 && (
        <Card title="Optional extras">
          <ul className="space-y-2 text-sm">
            {p.extras.map((e) => (
              <li key={e.item} className="flex flex-wrap items-baseline justify-between gap-2">
                <span><b className="font-medium">{e.item}</b> <span className="text-muted">({rs(e.cost)})</span><span className="block text-muted">{e.why}</span></span>
                <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", e.included ? "bg-success/12 text-success" : "bg-surface text-muted")}>{e.included ? "Included" : "Left out"}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {p.ranking && (
        <motion.details variants={item} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Why these choices</summary>
          <p className="mt-2 text-muted">{p.ranking}</p>
        </motion.details>
      )}
    </>
  );
}

/* ---------------- inbox ---------------- */

function Inbox({ messages, focus }: { messages: MessageRecord[]; focus: number | null }) {
  const [filter, setFilter] = useState<"all" | "used" | "unused">("all");
  const used = messages.filter((m) => m.status === "accepted").length;
  const unused = messages.filter((m) => m.status === "rejected").length;
  const shown = messages.filter((m) => (filter === "all" ? true : filter === "used" ? m.status === "accepted" : m.status !== "accepted"));
  const tabs = [["all", `All ${messages.length}`], ["used", `Used ${used}`], ["unused", `Not used ${messages.length - used}`]] as const;

  useEffect(() => {
    if (focus == null) return;
    setFilter("all");
    requestAnimationFrame(() => document.getElementById(`msg-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [focus]);

  return (
    <>
      <motion.p variants={item} className="text-sm text-muted">
        {messages.length} messages read. <b className="text-foreground">{used}</b> shaped the plan{unused > 0 && <>, <b className="text-danger">{unused}</b> could not be used</>}.
      </motion.p>
      <motion.div variants={item} className="flex gap-1" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
            className={clsx("rounded-full px-3.5 py-1.5 text-sm transition", filter === id ? "bg-ws-ink text-ws-ink-foreground" : "bg-card text-muted hover:text-foreground")}>{label}</button>
        ))}
      </motion.div>
      <motion.ul variants={list} initial="hidden" animate="show" className="space-y-2.5">
        {[...shown].reverse().map((m) => {
          const st = STATUS[m.status];
          return (
            <motion.li variants={item} key={m.id} id={`msg-${m.id}`} className={clsx("rounded-xl border bg-card p-4 text-sm", focus === m.id ? "border-accent ring-2 ring-accent/20" : "border-border")}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <b className="font-semibold">Message {m.id}</b>
                {m.read && <span className="text-muted">from {ROLE[m.read.sender_role] ?? m.read.sender_role}{m.read.date ? `, ${m.read.date}` : ""}</span>}
                <span className={clsx("ml-auto rounded-full px-2.5 py-0.5 font-medium", st.tone)}>{st.label}</span>
              </div>
              <p className="whitespace-pre-line leading-relaxed">{clip(m.text, 320)}</p>
              {m.reason && <p className={clsx("mt-2 rounded-lg px-3 py-2 text-xs", m.status === "rejected" ? "bg-danger/8 text-danger" : "bg-surface text-muted")}>{m.status === "rejected" ? "Why it was not used: " : ""}{m.reason}</p>}
            </motion.li>
          );
        })}
        {!shown.length && <Empty>No messages here.</Empty>}
      </motion.ul>
    </>
  );
}

/* ---------------- questions drawer ---------------- */

function AskPanel({ open, onClose, gaps, answer }: { open: boolean; onClose: () => void; gaps: Gap[]; answer: Answer }) {
  const visible = gaps.filter((g) => g.status !== "ignored");
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-ws-ink/30" />
          <motion.aside key="panel" role="dialog" aria-modal="true" aria-label="Questions for you"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
              <h2 className="text-sm font-semibold">Questions for you</h2>
              <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg hover:bg-surface"><X className="size-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              <p className="text-sm text-muted">The plan could not fill these in from the messages. Answer them, leave them as TBA, or skip them.</p>
              {!visible.length && <Empty>Nothing is missing.</Empty>}
              {visible.map((g) => <GapCard key={g.key} g={g} answer={answer} />)}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function GapCard({ g, answer }: { g: Gap; answer: Answer }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async (a: "value" | "tba" | "ignore") => {
    setBusy(true); setErr("");
    try { await answer(g.key, a, v); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const done = g.status !== "open";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-medium">{g.question}</p>
      <p className="mt-0.5 text-sm text-muted">Affects: {g.blocks.join(", ")}</p>
      {done ? (
        <p className="mt-3 text-sm"><span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", g.status === "answered" ? "bg-success/12 text-success" : "bg-surface text-muted")}>{g.status === "answered" ? `Answered: ${String(g.value)}` : "Left as TBA"}</span></p>
      ) : (
        <>
          <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim() && !busy) run("value"); }}
            inputMode={g.kind === "number" ? "numeric" : "text"} aria-label={g.question}
            placeholder={g.kind === "time" ? "For example 09:00" : g.kind === "number" ? "Type a number" : "Type your answer"}
            className="mt-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground" />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => run("value")} disabled={busy || !v.trim()} className="h-9 rounded-lg bg-ws-ink px-4 text-sm font-medium text-ws-ink-foreground disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
            <button onClick={() => run("tba")} disabled={busy} className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-surface">Leave as TBA</button>
            <button onClick={() => run("ignore")} disabled={busy} className="h-9 rounded-lg px-3 text-sm text-muted hover:bg-surface">Skip</button>
          </div>
        </>
      )}
      {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
    </div>
  );
}

/* ---------------- trace ---------------- */

function Trace({ lines, tokens, calls }: { lines: TraceLine[]; tokens: number; calls: number }) {
  const [only, setOnly] = useState(false);
  const shown = only ? lines.filter((l) => l.kind === "call") : lines;
  return (
    <Card title="How it was decided" right={`${calls} AI calls · ${tokens.toLocaleString()} tokens`}>
      <p className="-mt-2 mb-4 text-sm text-muted">Every step, in order. Open an AI call to see exactly what it was asked and what it answered.</p>
      <label className="mb-3 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />Show AI calls only</label>
      <div className="space-y-1.5">
        {!lines.length && <Empty>Every AI call shows up here, numbered.</Empty>}
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
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <span className="font-mono font-semibold">#{c.n}</span>
        <span className="rounded bg-ws-ink px-1.5 py-0.5 text-[10px] font-medium uppercase text-ws-ink-foreground">{c.area}</span>
        <span className="truncate text-muted">{c.model}</span>
        <ChevronDown className={clsx("ml-auto size-4 shrink-0 transition", open && "rotate-180")} />
      </button>
      <p className="mt-1 text-muted">in {c.inputTokens} · out {c.outputTokens} · {c.ms} ms{c.note ? ` · ${c.note}` : ""}{!c.ok ? " · failed" : ""}</p>
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
  <motion.section variants={item} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="font-semibold">{title}</h2>{right && <span className="text-sm text-muted">{right}</span>}</div>
    {children}
  </motion.section>
);
const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted">{label}</p><p className={clsx("mt-1 text-2xl font-semibold tracking-tight tabular-nums", value === "TBA" && "text-muted")}>{value}</p></div>
);
function Tile({ title, tba, onOpen, children }: { title: string; tba?: boolean; onOpen?: () => void; children: React.ReactNode }) {
  const body = (
    <>
      <p className="mb-2 text-sm font-medium text-muted">{title}</p>
      {tba ? <p className="text-lg font-semibold text-muted">TBA</p> : children}
    </>
  );
  const cls = "rounded-xl border border-border bg-card p-4 text-left text-sm";
  return <motion.div variants={item}>{onOpen && !tba ? <button onClick={onOpen} className={clsx(cls, "block w-full transition hover:border-foreground")}>{body}</button> : <div className={cls}>{body}</div>}</motion.div>;
}
function Ring({ value, label }: { value: number; label: string }) {
  const r = 44, c = 2 * Math.PI * r, over = value > 100;
  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-surface" />
        <motion.circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(1, value / 100)) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className={over ? "stroke-danger" : "stroke-accent"} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center"><p className="text-2xl font-semibold tabular-nums">{value}%</p><p className="text-[11px] leading-tight text-muted">{label}</p></div>
    </div>
  );
}
const Big = ({ children }: { children: React.ReactNode }) => <p className="text-lg font-semibold tracking-tight">{children}</p>;
function Src({ id }: { id?: number }) {
  const open = useContext(OpenMessage);
  return id ? <button onClick={() => open(id)} title={`Open message ${id}`} className="ml-1 rounded bg-surface px-1.5 py-0.5 text-[11px] font-normal text-muted transition hover:text-foreground">Message {id}</button> : null;
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-10 text-center text-sm text-muted">{children}</p>;
