import Link from "next/link";
import { Check, MsgChip, Pill, Ring, SAMPLE, rs, wrap } from "./ui";

// 4-hour event, 240 min. Opening 10, lunch 30, closing 15, prayer break 15 (from the pack),
// judging 45 (3 teams at 15 min), build absorbs the rest.
const blocks = [
  { label: "Opening", min: 10, cls: "bg-ink text-paper" },
  { label: "Build", min: 125, cls: "bg-teal text-white" },
  { label: "Lunch", min: 30, cls: "bg-mist text-ink" },
  { label: "Judging", min: 45, cls: "bg-ink text-paper" },
  { label: "Prayer", min: 15, cls: "bg-mist text-ink" },
  { label: "Closing", min: 15, cls: "bg-ink text-paper" },
];
const TOTAL = 240;
const BUILD = 125;

export function SamplePlan() {
  return (
    <section id="sample-plan" aria-labelledby="sample-title" className="scroll-mt-20 py-24 md:py-32">
      <div className={wrap}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-12">
          <div>
            <Pill tone="mist">Sample plan</Pill>
            <h2 id="sample-title" className="mt-5 font-serif text-[clamp(2.25rem,4.4vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
              What a finished plan looks like.
            </h2>
          </div>
          <div className="lg:justify-self-end lg:pb-1">
            <p className="max-w-[360px] text-[17px] leading-relaxed text-ink">Budget, schedule and checks, all built from eight sample messages.</p>
            <Link href="/app" className="mt-5 inline-flex items-center rounded-full bg-teal px-7 py-3.5 text-base font-semibold text-white transition hover:bg-ink">
              Try it with your own messages
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          {/* Budget ring */}
          <div className="rounded-[32px] bg-mist p-7 lg:col-span-4">
            <p className="text-sm font-semibold text-ink">Budget</p>
            <div className="mt-6 flex justify-center">
              <Ring value={SAMPLE.total / SAMPLE.cap} size={208} stroke={18} track="#fff" label="Budget used: 92 percent of Rs 650,000" >
                <span className="tnum text-[48px] font-medium leading-none text-teal">92%</span>
                <span className="mt-1 text-[13px] font-medium text-ink">used</span>
              </Ring>
            </div>
            <dl className="mt-7 space-y-2 text-[15px]">
              {[["Total", rs(SAMPLE.total)], ["Cap", rs(SAMPLE.cap)], ["Left", rs(SAMPLE.left)]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-t border-ink/15 pt-2"><dt className="text-ink">{k}</dt><dd className="tnum font-medium text-ink">{v}</dd></div>
              ))}
            </dl>
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Six checks, all passing">
              {SAMPLE.checks.map((c) => (
                <li key={c} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-ink"><Check className="size-3 text-teal" />{c}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-5 lg:col-span-8">
            {/* Schedule */}
            <div className="rounded-[32px] bg-white p-7 shadow-[0_18px_48px_-24px_rgb(7_27_43/0.25)]">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-ink">Schedule</p>
                <p className="tnum text-[13px] font-medium text-ink">240 min</p>
              </div>
              <div className="mt-5 flex h-12 gap-1" role="img" aria-label="Schedule: opening 10, build 125, lunch 30, judging 45, prayer break 15, closing 15 minutes">
                {blocks.map((b) => (
                  <div key={b.label} style={{ flexGrow: b.min }} className={`grow-x flex min-w-0 items-center justify-center overflow-hidden rounded-[10px] text-[12px] font-medium ${b.cls}`}>
                    <span className="truncate px-1">{b.min >= 30 ? b.label : ""}</span>
                  </div>
                ))}
              </div>
              <div className="relative mt-3 flex text-[12px] font-medium text-ink" aria-hidden="true">
                <span className="tnum">Opening 10 · Build 125 · Lunch 30 · Judging 45 · Prayer 15 · Closing 15 min</span>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-2.5 flex-1 rounded-full bg-mist">
                  <div className="grow-x h-full rounded-full bg-teal" style={{ width: `${(BUILD / TOTAL) * 100}%` }} />
                  <span className="absolute -top-1.5 h-5 w-px bg-ink" style={{ left: "40%" }} aria-hidden="true" />
                </div>
                <p className="tnum shrink-0 text-[13px] font-medium text-ink">Build 52%, minimum 40%</p>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-[32px] bg-ink p-7 text-paper on-dark">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">Line items</p>
                <p className="text-[13px] font-medium text-mist">Each one links to a message</p>
              </div>
              <table className="mt-4 w-full text-left text-[15px]">
                <thead className="sr-only"><tr><th>Item</th><th>Source</th><th>Amount</th></tr></thead>
                <tbody className="divide-y divide-paper/15">
                  {SAMPLE.lines.map((l) => (
                    <tr key={l.label}>
                      <td className="py-2.5 pr-3 font-medium">{l.label}<span className="ml-2 hidden text-[13px] font-normal text-paper/80 sm:inline">{l.detail}</span></td>
                      <td className="py-2.5 pr-3"><MsgChip n={l.msg} dark /></td>
                      <td className="tnum whitespace-nowrap py-2.5 text-right font-medium">{rs(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-paper/30">
                    <td className="pt-3 font-semibold" colSpan={2}>Total</td>
                    <td className="tnum whitespace-nowrap pt-3 text-right text-[18px] font-medium text-mist">{rs(SAMPLE.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
