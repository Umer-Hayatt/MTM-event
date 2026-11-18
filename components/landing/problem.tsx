import { Check, MsgChip, Pill, SAMPLE, rs, wrap } from "./ui";

const scattered = [
  { who: "Dean's office", via: "Email", when: "9 Nov", text: "Approved: a 4-hour hackathon for 150 students. The budget is Rs 650,000, all in.", cls: "md:ml-0 md:-rotate-[1.2deg]", bg: "bg-white" },
  { who: "Caterer", via: "WhatsApp", when: "20 Oct", text: "Standard lunch box Rs 1,000 per head.", cls: "md:ml-14 md:rotate-[1deg]", bg: "bg-white", stale: true },
  { who: "Caterer", via: "WhatsApp", when: "12 Nov", text: "Salam bhai! Standard lunch box ab Rs 1,200 per head hoga, basic wala Rs 800.", cls: "md:ml-4 md:-rotate-[0.6deg]", bg: "bg-white" },
  { who: "Student society", via: "WhatsApp", when: "13 Nov", text: "Can we get a DJ for the closing? The quote is Rs 50,000.", cls: "md:ml-20 md:rotate-[1.4deg]", bg: "bg-white" },
];

const points = [
  { h: "Stale prices survive", p: "The caterer quoted Rs 1,000 on 20 October and Rs 1,200 on 12 November. The older number is the one that ends up in the spreadsheet." },
  { h: "Senders overreach", p: "A caterer rounds your order down to 100 boxes. A society wants a DJ. Neither gets to decide, but nothing in a chat thread says so." },
  { h: "No trail back", p: "When the total moves, nobody can say which message moved it, or why a figure was believed." },
];

export function Problem() {
  return (
    <section id="product" aria-labelledby="problem-title" className="scroll-mt-20 py-24 md:py-32">
      <div className={wrap}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <p className="text-sm font-medium text-ink">The problem</p>
            <h2 id="problem-title" className="mt-4 font-serif text-[clamp(2.25rem,4.4vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
              Event details arrive from everywhere. Nobody can say which one is right.
            </h2>
            <dl className="mt-12 space-y-8 border-t border-ink/15 pt-8">
              {points.map((x) => (
                <div key={x.h} className="grid gap-1 sm:grid-cols-[170px_1fr] sm:gap-6">
                  <dt className="text-[15px] font-semibold text-ink">{x.h}</dt>
                  <dd className="text-[15px] leading-relaxed text-ink">{x.p}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Scattered messages, then one plan */}
          <div className="relative rounded-[32px] bg-mist p-5 sm:p-8 md:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink">Before: the inbox</p>
            <ul className="mt-5 space-y-3">
              {scattered.map((m) => (
                <li key={m.text} className={`rounded-[20px] ${m.bg} p-4 shadow-[0_10px_30px_-14px_rgb(7_27_43/0.3)] ${m.cls}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium text-ink">{m.who} · {m.via}</p>
                    <span className="flex items-center gap-2">
                      {m.stale && <Pill tone="paper">Out of date</Pill>}
                      <span className="tnum text-xs text-ink/70">{m.when}</span>
                    </span>
                  </div>
                  <p className={`mt-1.5 text-[15px] leading-snug text-ink ${m.stale ? "line-through decoration-ink/40" : ""}`}>{m.text}</p>
                </li>
              ))}
            </ul>

            <div className="my-6 flex items-center gap-3 text-ink" aria-hidden="true">
              <span className="h-px flex-1 bg-ink/25" />
              <span className="text-xs font-medium uppercase tracking-[0.08em]">Convene reads, code decides</span>
              <span className="h-px flex-1 bg-ink/25" />
            </div>

            <div className="rounded-[20px] bg-ink p-6 text-paper md:mx-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-mist">After: one plan</p>
                <Pill tone="mist">Sample plan</Pill>
              </div>
              <ul className="mt-4 divide-y divide-paper/15">
                {[
                  ["Venue", SAMPLE.hall, 2],
                  ["Headcount", `${SAMPLE.headcount} people`, 1],
                  ["Lunch box", "Rs 1,200", 4],
                  ["Total", rs(SAMPLE.total), 4],
                ].map(([k, v, n]) => (
                  <li key={k as string} className="flex items-center justify-between py-2.5 text-[15px]">
                    <span className="text-paper/80">{k}</span>
                    <span className="flex items-center gap-3"><span className="tnum font-medium">{v}</span><MsgChip n={n as number} dark /></span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-mist"><Check className="size-4" />Rs 1,000 quote replaced by the newer Rs 1,200</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
