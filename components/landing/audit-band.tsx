import { wrap } from "./ui";
import { CountUp } from "./count-up";
import { Reveal } from "./reveal";

type Line = { status: "ACCEPTED" | "REJECTED" | "SUPERSEDED"; msg: string; text: string; tokens?: number };

const lines: Line[] = [
  { status: "ACCEPTED", msg: "Msg 1", text: "Dean's office set budget.cap = 650,000", tokens: 2413 },
  { status: "SUPERSEDED", msg: "Msg 3", text: "Caterer food.standard = 1,000, replaced by Msg 4", tokens: 1124 },
  { status: "ACCEPTED", msg: "Msg 4", text: "Caterer set food.standard = 1,200", tokens: 1187 },
  { status: "REJECTED", msg: "Practice", text: "Caterer does not own food.boxes", tokens: 982 },
];

const tone = {
  ACCEPTED: "bg-teal text-white",
  SUPERSEDED: "bg-mist text-ink",
  REJECTED: "bg-rejected text-white",
} as const;

const stats: [number, string][] = [[5, "outcomes per message"], [6, "checks per plan"], [0, "figures guessed"]];

/* Sequence (ms): heading 0, text 100, stats 200, panel 150, rows 350 + 110 each, total 800, trace rail draws up from the total at 600. */
export function AuditBand() {
  const total = lines.reduce((a, l) => a + (l.tokens ?? 0), 0);
  return (
    <section id="audit" aria-labelledby="audit-title" className="on-dark relative scroll-mt-20 overflow-hidden bg-ink py-24 text-paper md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal/25 via-transparent to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-paper/15" aria-hidden="true" />
      <div className={`${wrap} relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`}>
        <div>
          <Reveal>
            <p className="text-sm font-medium text-mist">Audit</p>
            <h2 id="audit-title" className="mt-4 font-serif text-[clamp(2.5rem,5.2vw,4.5rem)] font-bold leading-[1] tracking-[-0.025em]">
              Every decision leaves a trail.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-6 max-w-[480px] text-[17px] leading-relaxed text-paper">
              Each message ends up accepted, rejected, superseded, ignored or duplicate, with the reason shown. Every model call is logged with exact token counts from the provider response.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <dl className="mt-10 grid max-w-[480px] grid-cols-3 gap-6 border-t border-paper/20 pt-8">
              {stats.map(([n, l]) => (
                <div key={l}>
                  <dt className="text-[44px] font-medium leading-none text-mist"><CountUp value={n} delay={450} /></dt>
                  <dd className="mt-2 text-[13px] leading-snug text-paper">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <div className="relative rounded-[32px] border border-paper/15 bg-paper/[0.06] p-4 sm:p-6" role="figure" aria-label="Sample trace log">
            {/* Trace rail: draws upward from the token total back to the first message */}
            <span className="grow-y-up pointer-events-none absolute bottom-[78px] left-[7px] top-[64px] w-0.5 rounded-full bg-mist/60 sm:left-[11px]" style={{ "--bar-base": "600ms" } as React.CSSProperties} aria-hidden="true" />
            <div className="flex items-center justify-between px-2 pb-4">
              <p className="text-[13px] font-medium text-paper">Trace log</p>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium leading-none text-ink">Sample</span>
            </div>
            <ul className="space-y-2">
              {lines.map((l, i) => (
                <Reveal as="li" key={l.msg + l.status} delay={350 + i * 110} y={12} className="rounded-[20px] bg-paper/[0.07] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.04em] ${tone[l.status]}`}>{l.status}</span>
                      <span className="text-[13px] font-medium text-mist">{l.msg}</span>
                    </span>
                    <span className="tnum text-[13px] font-medium text-paper">{l.tokens?.toLocaleString("en-US")} tokens</span>
                  </div>
                  <p className="mt-2 text-[15px] leading-snug text-paper">{l.text}</p>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={800} y={8} className="mt-4 flex items-center justify-between border-t border-paper/15 px-2 pt-4 text-[13px] font-medium">
              <span className="text-paper">Total across {lines.length} calls</span>
              <span className="text-mist"><CountUp value={total} delay={900} align="right" /> tokens</span>
            </Reveal>
            <p className="mt-3 px-2 text-xs text-paper/80">Illustrative trace. Token counts here are sample values.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
