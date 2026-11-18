"use client";

// Inbox → Plan. One prompt page (text + files) and a sidebar that holds every result view.
// Talks to POST /api/run (same run() as the CLI). Missing facts go to POST /api/answer (HITL contract).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowUp, ChevronDown, Download, FileText, Loader2, Paperclip, Plus, X } from "lucide-react";
import { Globe } from "@/components/globe";
import { Reveal } from "@/components/landing/reveal";
import { Wordmark } from "@/components/landing/ui";
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
  accepted: { label: "Used in the plan", tone: "bg-mist text-ink" },
  rejected: { label: "Not used", tone: "bg-danger/10 text-danger" },
  superseded: { label: "Replaced by a newer message", tone: "bg-surface text-muted" },
  ignored: { label: "Not about the plan", tone: "bg-surface text-muted" },
  duplicate: { label: "Repeat of another message", tone: "bg-surface text-muted" },
};
const ROLE: Record<Role, string> = {
  authority: "Authority", venue: "Venue", caterer: "Caterer", finance: "Finance", judging_coordinator: "Judging lead",
  participant: "Participant", unknown: "Unknown sender", organiser: "Organiser",
};

/* One soft Ink-tinted shadow for every card. */
const cardCls = "rounded-[20px] bg-card shadow-[0_10px_30px_-16px_rgb(7_27_43/0.22),0_1px_2px_rgb(7_27_43/0.05)]";
const primaryBtn = "bg-teal text-white hover:bg-ink disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/70 disabled:hover:bg-mist";

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
        <div className="ws flex h-screen bg-background text-foreground">
          {/* ---------------- Sidebar ---------------- */}
          <aside className="on-dark hidden w-60 shrink-0 flex-col bg-ink p-3 text-paper md:flex">
            <div className="px-3 pb-1 pt-2">
              <Wordmark />
            </div>
            <Link href="/" className="mx-3 mt-1.5 text-xs text-mist underline underline-offset-2">← Back to site</Link>

            <button onClick={() => setView("new")} className={clsx("mt-5 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition", view === "new" ? "bg-mist text-ink" : "bg-teal text-white hover:bg-white hover:text-ink")}>
              <Plus className="size-4" />New plan
            </button>

            <nav className="mt-5 flex flex-col gap-1" aria-label="Results">
              {nav.map((n) => (
                <button key={n.id} onClick={() => has && setView(n.id)} disabled={!has}
                  className={clsx("flex items-center rounded-full px-3.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-45", view === n.id ? "bg-mist font-semibold text-ink" : "text-paper/80 hover:bg-paper/10 hover:text-paper")}>
                  <span className="flex-1 text-left">{n.label}</span>
                  {n.badge ? <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">{n.badge}</span> : null}
                </button>
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              {/* Space is always reserved so the footer never moves when a plan loads. */}
              <div className={clsx("flex flex-col gap-0.5 text-sm", !has && "invisible")} aria-hidden={!has}>
                <a href="/api/run?download=plan" className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-paper/80 hover:bg-paper/10 hover:text-paper"><Download className="size-4" />Download the plan</a>
                <a href="/api/run?download=trace" className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-paper/80 hover:bg-paper/10 hover:text-paper"><Download className="size-4" />Download the log</a>
              </div>
              <div className="border-t border-paper/15 px-3.5 pt-3 text-xs text-mist">AI used: <span className="tabular-nums text-paper">{calls.length}</span> calls, <span className="tabular-nums text-paper">{tokens.toLocaleString()}</span> tokens</div>
            </div>
          </aside>

          {/* ---------------- Main ---------------- */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
              <h1 className="text-[15px] font-semibold">{title}</h1>
              <div className="flex items-center gap-3">
                {s?.mode && <span className="hidden text-xs text-muted sm:inline">{s.mode === "fresh" ? "Built a new plan" : "Updated the plan"}</span>}
                {openGaps.length > 0 && (
                  <button onClick={() => setAskOpen(true)} className="flex h-9 items-center gap-2 rounded-full bg-ink pl-1.5 pr-4 text-xs font-semibold text-paper transition hover:bg-teal">
                    <span className="grid size-6 place-items-center rounded-full bg-mist text-[11px] font-semibold text-ink tabular-nums">{openGaps.length}</span>
                    {openGaps.length === 1 ? "Question for you" : "Questions for you"}
                  </button>
                )}
              </div>
            </header>

            {/* mobile nav */}
            <div className="on-dark flex gap-1 overflow-x-auto bg-ink p-2 text-paper md:hidden">
              <Link href="/" className="shrink-0 rounded-full px-3 py-1.5 text-sm text-mist">← Site</Link>
              {[{ id: "new" as View, label: "New plan" }, ...(has ? nav : [])].map((n) => (
                <button key={n.id} onClick={() => setView(n.id)} className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-sm", view === n.id ? "bg-mist font-semibold text-ink" : "text-paper/80")}>{n.label}</button>
              ))}
            </div>

            <main className="min-h-0 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
                  {view === "new" && (
                    <div className="mx-auto grid min-h-full max-w-6xl items-center gap-4 px-6 py-8 lg:grid-cols-[minmax(0,34rem)_1fr] lg:gap-10">
                      <div className="order-2 lg:order-1">
                        <Reveal y={12}>
                          <h2 className="font-serif text-[clamp(2rem,3.6vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">Turn event messages into a plan</h2>
                          <p className="mt-4 max-w-md text-muted">Paste the messages from your venue, caterer and organisers. You get a schedule, a budget and the reason behind every number.</p>
                        </Reveal>

                        <Reveal y={12} delay={100}>
                          <div
                            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                            className={clsx("mt-7 rounded-[20px] border bg-card p-3 shadow-[0_10px_30px_-16px_rgb(7_27_43/0.22),0_1px_2px_rgb(7_27_43/0.05)] transition focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/40", drag ? "border-teal ring-2 ring-teal/40" : "border-border")}
                          >
                            <AnimatePresence initial={false}>
                              {files.length > 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-2 px-1 pb-2">
                                  {files.map((f, i) => (
                                    <motion.span key={f.name + i} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1.5 rounded-full bg-mist py-1 pl-3 pr-1.5 text-sm text-ink">
                                      <FileText className="size-3.5" />{f.name}
                                      <button onClick={() => setFiles((c) => c.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="grid size-5 place-items-center rounded-full hover:bg-teal hover:text-white"><X className="size-3" /></button>
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
                              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-ink transition hover:bg-surface">
                                <Paperclip className="size-4" />Attach files
                              </button>
                              <input ref={fileRef} type="file" multiple accept=".txt,.md,text/plain" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                              <button onClick={submit} disabled={busy || (!text.trim() && !files.length)} aria-busy={busy}
                                className={clsx("flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-95", primaryBtn)}>
                                {busy ? <><Loader2 className="size-4 animate-spin" />Planning…</> : <>Make the plan<ArrowUp className="size-4" /></>}
                              </button>
                            </div>
                          </div>
                          {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
                          <p className="mt-4 text-sm text-muted">Three or more messages start a new plan. One or two update the plan you have.</p>
                        </Reveal>
                      </div>

                      <Reveal y={0} delay={200} className="order-1 mx-auto w-full max-w-[13rem] sm:max-w-[22rem] lg:order-2 lg:max-w-[30rem] lg:justify-self-center">
                        <Globe className="aspect-square w-full" />
                      </Reveal>
                    </div>
                  )}

                  {view !== "new" && s && (
                    <div className="mx-auto max-w-4xl space-y-4 px-5 py-6">
                      {s.infeasible && (
                        <Reveal y={12}>
                          <div className="rounded-[20px] border border-danger bg-card p-4 text-sm">
                            <p><b>We could not build a plan from this.</b> {s.infeasible} {s.plan && "The last valid plan is still shown."}</p>
                          </div>
                        </Reveal>
                      )}
                      {view === "overview" && <Overview s={s} openGaps={openGaps.length} ask={() => setAskOpen(true)} go={setView} />}
                      {view === "schedule" && <Schedule p={s.plan} />}
                      {view === "budget" && <Budget p={s.plan} />}
                      {view === "inbox" && <Inbox messages={s.messages} focus={focusMsg} />}
                      {view === "trace" && <Trace lines={s.trace} tokens={tokens} calls={calls.length} />}
                    </div>
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
      <Reveal y={12}>
        <section className={clsx(cardCls, "grid gap-6 !rounded-[32px] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8")}>
          <div>
            <p className={clsx("flex items-center gap-2 text-sm font-medium", ready ? "text-ink" : "text-danger")}>
              <span className={clsx("size-2.5 rounded-full", ready ? "bg-teal" : "bg-danger")} aria-hidden="true" />
              {ready ? (waiting ? "Plan ready, some parts still to be confirmed" : "Plan ready, every check passed") : `${failed.length} ${failed.length === 1 ? "problem" : "problems"} to fix`}
            </p>
            <h2 className="mt-3 font-serif text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold leading-[1.12] tracking-[-0.015em]">
              {tba("venue") ? "Venue to be confirmed" : p.venue.name} for {p.headcount.total} people
              {!tba("judging") && <>, with {p.judging.needed} judges</>}
            </h2>
            <p className="mt-2 text-muted">
              {tba("schedule") ? "Event length not known yet." : `The event runs ${dur(p.schedule.lengthMin)}.`} {tba("food") ? "" : `${p.food.boxes} meals ordered.`}
            </p>
          </div>
          {capped && !tba("budget") && <Ring value={used} label="of budget used" />}
        </section>
      </Reveal>

      {openGaps > 0 && (
        <Reveal y={12} delay={80}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-mist px-5 py-4 text-sm text-ink">
            <p><b>{openGaps} {openGaps === 1 ? "detail is" : "details are"} missing.</b> Those parts show as TBA until you answer.</p>
            <button onClick={ask} className="rounded-full bg-teal px-4 py-2 font-semibold text-white transition hover:bg-ink">Answer now</button>
          </div>
        </Reveal>
      )}

      {failed.map((c) => <Reveal key={c.name} y={12}><p className="rounded-[20px] border border-danger bg-card px-4 py-3 text-sm"><b className="text-danger">{c.name}.</b> {c.detail}</p></Reveal>)}
      {p.unhandled.map((u) => <Reveal key={u} y={12}><p className="rounded-[20px] border border-danger bg-card px-4 py-3 text-sm"><b className="text-danger">Not handled:</b> {u}</p></Reveal>)}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Reveal y={12} delay={120}><Stat tone="ink" label="People coming" value={String(p.headcount.total)} /></Reveal>
        <Reveal y={12} delay={200}><Stat tone="white" label="Teams" value={String(p.teams)} /></Reveal>
        <Reveal y={12} delay={280}><Stat tone="teal" label="Money left" value={tba("budget") ? "TBA" : rs(p.budget.remaining)} /></Reveal>
        <Reveal y={12} delay={360}><Stat tone="mist" label="Judges needed" value={tba("judging") ? "TBA" : String(p.judging.needed)} /></Reveal>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile delay={160} title="Venue" tba={tba("venue")}>
          <Big>{p.venue.name}</Big>
          <p>Seats {p.venue.seats} · {rs(p.venue.price)} <Src id={p.venue.source} /></p>
          {p.venue.attrs.length > 0 && <p className="text-muted">{p.venue.attrs.join(", ")}</p>}
        </Tile>
        <Tile delay={240} title="Food" tba={tba("food")}>
          <Big>{p.food.boxes} × {p.food.name}</Big>
          <p>{rs(p.food.price)} each · {rs(p.food.cost)} total <Src id={p.food.source} /></p>
          <p className="text-muted">{Object.entries(p.headcount.parts).map(([k, v]) => `${k} ${v}`).join(" + ")}</p>
        </Tile>
        <Tile delay={320} title="Judging" tba={tba("judging")}>
          <Big>{p.judging.needed} judges for {p.teams} teams</Big>
          <p>{p.judging.confirmed} confirmed · {rs(p.judging.cost)}</p>
          <p className="text-muted">{p.judging.minutesPerTeam} min per team</p>
        </Tile>
        <Tile delay={400} title="Schedule" tba={tba("schedule")} onOpen={() => go("schedule")}>
          <Big>{dur(p.schedule.lengthMin)} in {p.schedule.blocks.length} parts</Big>
          <MiniBar blocks={p.schedule.blocks} length={p.schedule.lengthMin} />
          <p className="mt-2 text-muted">See the full schedule</p>
        </Tile>
      </div>

      <Reveal y={12} delay={120}>
        <details className={clsx(cardCls, "px-5 py-4 text-sm")}>
          <summary className="cursor-pointer font-semibold">Checks ({p.checks.filter((c) => c.ok && !c.pending).length} of {p.checks.length} passed)</summary>
          <ul className="mt-3 space-y-1.5">
            {p.checks.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", c.pending ? "bg-muted" : c.ok ? "bg-teal" : "bg-danger")} />
                <span><b className="font-medium">{c.name}.</b> <span className="text-muted">{c.pending ? "Waiting for missing details. " : ""}{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </details>
      </Reveal>
    </>
  );
}

/* ---------------- schedule ---------------- */

// Teal for the main work, Ink for emphasis, Mist for breaks.
const blockTone = (name: string) => (/build|hack|work/i.test(name) ? "bg-teal" : /judg|demo|present/i.test(name) ? "bg-ink" : /lunch|break|meal|dinner|tea|prayer/i.test(name) ? "bg-mist" : "bg-teal/50");

function Schedule({ p }: { p: Session["plan"] }) {
  if (!p) return <Empty>There is no plan yet.</Empty>;
  if (p.tba?.includes("schedule")) return <Card title="Schedule"><p className="py-6 text-center text-muted"><b className="text-foreground">To be announced.</b> The event length is missing. Use “Questions for you” at the top to add it.</p></Card>;
  const len = p.schedule.lengthMin;
  return (
    <Card title="Schedule" right={`${dur(len)} in total`}>
      <p className="-mt-2 mb-5 text-sm text-muted">{p.schedule.relative ? "Times count from the start of the event." : "Times are clock times."} The percentage is each part’s share of the whole event.</p>
      <ul className="space-y-1" style={{ "--bar-base": "250ms" } as React.CSSProperties}>
        {p.schedule.blocks.map((b, i) => {
          const d = b.end - b.start;
          return (
            <li key={i} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 rounded-lg px-2 py-2 sm:grid-cols-[7rem_minmax(8rem,14rem)_1fr_3rem]">
              <span className="text-xs text-muted tabular-nums">{b.clock ?? (b.start === 0 ? "At the start" : `After ${dur(b.start)}`)}</span>
              <span className="min-w-0 text-sm"><b className="font-medium">{b.name}</b><span className="block text-xs text-muted sm:inline sm:before:content-['_·_']">{dur(d)}</span></span>
              <span className="relative col-span-3 order-last h-3 rounded-full bg-mist/50 sm:order-none sm:col-span-1">
                <span
                  style={{ left: `${(b.start / len) * 100}%`, width: `${Math.max(1.5, (d / len) * 100)}%`, "--i": i } as React.CSSProperties}
                  className={clsx("grow-x absolute inset-y-0 rounded-full", blockTone(b.name))} />
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">{pct(d, len)}%</span>
            </li>
          );
        })}
      </ul>
      {p.schedule.notes.filter((n) => !/relative/i.test(n)).map((n) => <p key={n} className="mt-4 rounded-[10px] bg-surface px-3 py-2 text-sm text-muted">{n}</p>)}
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
            <p className="text-4xl font-semibold tracking-tight text-teal tabular-nums">{capped ? `${used}%` : rs(total)}</p>
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
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-mist/50">
            <div className={clsx("grow-x h-full rounded-full", over ? "bg-danger" : "bg-teal")} style={{ width: `${Math.min(100, used)}%`, "--bar-base": "250ms" } as React.CSSProperties} />
          </div>
        )}
      </Card>

      <Card title="Where the money goes" delay={80}>
        <ul className="space-y-4" style={{ "--bar-base": "300ms" } as React.CSSProperties}>
          {lines.map((l, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{l.label} <Src id={l.source} /></span>
                <span className="tabular-nums"><b className="font-semibold">{rs(l.amount)}</b> <span className="ml-1 inline-block w-9 text-right text-muted">{pct(l.amount, total)}%</span></span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist/50">
                <div className="grow-x h-full rounded-full bg-teal" style={{ width: `${pct(l.amount, total)}%`, "--i": i } as React.CSSProperties} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {p.extras.length > 0 && (
        <Card title="Optional extras" delay={160}>
          <ul className="space-y-2 text-sm">
            {p.extras.map((e) => (
              <li key={e.item} className="flex flex-wrap items-baseline justify-between gap-2">
                <span><b className="font-medium">{e.item}</b> <span className="text-muted">({rs(e.cost)})</span><span className="block text-muted">{e.why}</span></span>
                <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", e.included ? "bg-mist text-ink" : "bg-surface text-muted")}>{e.included ? "Included" : "Left out"}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {p.ranking && (
        <Reveal y={12} delay={200}>
          <details className={clsx(cardCls, "px-5 py-4 text-sm")}>
            <summary className="cursor-pointer font-semibold">Why these choices</summary>
            <p className="mt-2 text-muted">{p.ranking}</p>
          </details>
        </Reveal>
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
      <Reveal y={12}>
        <p className="text-sm text-muted">
          {messages.length} messages read. <b className="text-foreground">{used}</b> shaped the plan{unused > 0 && <>, <b className="text-danger">{unused}</b> could not be used</>}.
        </p>
      </Reveal>
      <Reveal y={12} delay={60}>
        <div className="flex gap-1.5" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
              className={clsx("rounded-full px-4 py-1.5 text-sm font-medium transition", filter === id ? "bg-ink text-paper" : "bg-card text-ink shadow-[0_1px_2px_rgb(7_27_43/0.08)] hover:bg-mist")}>{label}</button>
          ))}
        </div>
      </Reveal>
      <ul className="space-y-2.5">
        {[...shown].reverse().map((m, i) => {
          const st = STATUS[m.status];
          return (
            <Reveal as="li" y={12} delay={100 + Math.min(i, 6) * 60} key={m.id}>
              <div id={`msg-${m.id}`} className={clsx(cardCls, "border p-4 text-sm", focus === m.id ? "border-teal ring-2 ring-teal/25" : "border-transparent")}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <b className="font-semibold">Message {m.id}</b>
                  {m.read && <span className="text-muted">from {ROLE[m.read.sender_role] ?? m.read.sender_role}{m.read.date ? `, ${m.read.date}` : ""}</span>}
                  <span className={clsx("ml-auto rounded-full px-2.5 py-0.5 font-medium", st.tone)}>{st.label}</span>
                </div>
                <p className="whitespace-pre-line leading-relaxed">{clip(m.text, 320)}</p>
                {m.reason && <p className={clsx("mt-2 rounded-[10px] px-3 py-2 text-xs", m.status === "rejected" ? "bg-danger/8 text-danger" : "bg-surface text-muted")}>{m.status === "rejected" ? "Why it was not used: " : ""}{m.reason}</p>}
              </div>
            </Reveal>
          );
        })}
        {!shown.length && <Empty>No messages here.</Empty>}
      </ul>
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
          <motion.div key="shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} className="fixed inset-0 z-40 bg-ink/40" />
          <motion.aside key="panel" role="dialog" aria-modal="true" aria-label="Questions for you"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="ws fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-[-24px_0_48px_-24px_rgb(7_27_43/0.3)]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
              <h2 className="text-[15px] font-semibold">Questions for you</h2>
              <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-surface"><X className="size-4" /></button>
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
    <div className={clsx(cardCls, "p-4")}>
      <p className="font-medium">{g.question}</p>
      <p className="mt-0.5 text-sm text-muted">Affects: {g.blocks.join(", ")}</p>
      {done ? (
        <p className="mt-3 text-sm"><span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", g.status === "answered" ? "bg-mist text-ink" : "bg-surface text-muted")}>{g.status === "answered" ? `Answered: ${String(g.value)}` : "Left as TBA"}</span></p>
      ) : (
        <>
          <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim() && !busy) run("value"); }}
            inputMode={g.kind === "number" ? "numeric" : "text"} aria-label={g.question}
            placeholder={g.kind === "time" ? "For example 09:00" : g.kind === "number" ? "Type a number" : "Type your answer"}
            className="mt-3 h-10 w-full rounded-[10px] border border-border bg-background px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/40" />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => run("value")} disabled={busy || !v.trim()} className={clsx("h-9 rounded-full px-5 text-sm font-semibold", primaryBtn)}>{busy ? "Saving…" : "Save"}</button>
            <button onClick={() => run("tba")} disabled={busy} className="h-9 rounded-full border border-ink/25 px-4 text-sm font-medium hover:bg-surface">Leave as TBA</button>
            <button onClick={() => run("ignore")} disabled={busy} className="h-9 rounded-full px-3 text-sm text-muted hover:bg-surface">Skip</button>
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
      <label className="mb-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="size-4 accent-[var(--teal)]" checked={only} onChange={(e) => setOnly(e.target.checked)} />Show AI calls only</label>
      <div className="space-y-1.5">
        {!lines.length && <Empty>Every AI call shows up here, numbered.</Empty>}
        {shown.map((l, i) => l.kind === "call" ? <CallRow key={i} c={l.call} /> : (
          <p key={i} className={clsx("tnum whitespace-pre-wrap text-xs leading-relaxed", /REJECTED|INFEASIBLE|ERROR|FAIL /.test(l.text) ? "font-medium text-danger" : /ACCEPTED|PASS/.test(l.text) ? "font-medium text-ink" : /=====/.test(l.text) ? "pt-2 font-semibold" : "text-muted")}>{l.text.trim()}</p>
        ))}
      </div>
    </Card>
  );
}

function CallRow({ c }: { c: TraceCall }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("rounded-[10px] border p-3 text-xs", c.ok ? "border-border" : "border-danger")}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <span className="tnum font-semibold">#{c.n}</span>
        <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-paper">{c.area}</span>
        <span className="truncate text-muted">{c.model}</span>
        <ChevronDown className={clsx("ml-auto size-4 shrink-0 transition", open && "rotate-180")} />
      </button>
      <p className="tnum mt-1 text-muted">in {c.inputTokens} · out {c.outputTokens} · {c.ms} ms{c.note ? ` · ${c.note}` : ""}{!c.ok ? " · failed" : ""}</p>
      {open && (
        <div className="mt-2 space-y-2">
          <pre className="max-h-48 overflow-auto rounded-[10px] bg-surface p-2 font-mono text-[11px]">{c.input}</pre>
          <pre className="max-h-64 overflow-auto rounded-[10px] bg-surface p-2 font-mono text-[11px]">{pretty(c.output)}</pre>
        </div>
      )}
    </div>
  );
}

/* ---------------- small pieces ---------------- */

const Card = ({ title, right, delay = 0, children }: { title: string; right?: string; delay?: number; children: React.ReactNode }) => (
  <Reveal y={12} delay={delay}>
    <section className={clsx(cardCls, "p-5 sm:p-6")}>
      <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="font-semibold">{title}</h2>{right && <span className="tnum text-sm text-muted">{right}</span>}</div>
      {children}
    </section>
  </Reveal>
);
const STAT_TONE = {
  white: { box: "bg-card", label: "text-muted", value: "text-teal", tba: "text-muted" },
  ink: { box: "bg-ink", label: "text-mist", value: "text-paper", tba: "text-paper/70" },
  teal: { box: "bg-teal", label: "text-white", value: "text-white", tba: "text-white/80" },
  mist: { box: "bg-mist", label: "text-ink", value: "text-ink", tba: "text-ink/70" },
} as const;
const Stat = ({ label, value, tone }: { label: string; value: string; tone: keyof typeof STAT_TONE }) => {
  const t = STAT_TONE[tone];
  return (
    <div className={clsx("rounded-[20px] p-4 shadow-[0_10px_30px_-16px_rgb(7_27_43/0.22),0_1px_2px_rgb(7_27_43/0.05)]", t.box)}>
      <p className={clsx("text-sm", t.label)}>{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold tracking-tight tabular-nums", value === "TBA" ? t.tba : t.value)}>{value}</p>
    </div>
  );
};
function Tile({ title, tba, onOpen, delay = 0, children }: { title: string; tba?: boolean; onOpen?: () => void; delay?: number; children: React.ReactNode }) {
  const body = (
    <>
      <p className="mb-2 text-sm font-medium text-muted">{title}</p>
      {tba ? <p className="text-lg font-semibold text-muted">TBA</p> : children}
    </>
  );
  const cls = clsx(cardCls, "p-5 text-left text-sm");
  return <Reveal y={12} delay={delay}>{onOpen && !tba ? <button onClick={onOpen} className={clsx(cls, "block w-full transition hover:bg-mist/40")}>{body}</button> : <div className={cls}>{body}</div>}</Reveal>;
}
function Ring({ value, label }: { value: number; label: string }) {
  const r = 44, c = 2 * Math.PI * r, over = value > 100;
  const style = { "--ring-len": c, "--ring-off": c * (1 - Math.min(1, value / 100)), "--ring-delay": "350ms" } as React.CSSProperties;
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-mist" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className={clsx("ring-draw", over ? "stroke-danger" : "stroke-teal")} style={style} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center"><p className="text-3xl font-semibold tabular-nums text-teal">{value}%</p><p className="text-[11px] leading-tight text-muted">{label}</p></div>
    </div>
  );
}
const Big = ({ children }: { children: React.ReactNode }) => <p className="text-lg font-semibold tracking-tight">{children}</p>;
function Src({ id }: { id?: number }) {
  const open = useContext(OpenMessage);
  return id ? <button onClick={() => open(id)} title={`Open message ${id}`} className="tnum ml-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-ink transition hover:bg-teal hover:text-white">Message {id}</button> : null;
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-[20px] bg-surface px-4 py-10 text-center text-sm text-muted">{children}</p>;
