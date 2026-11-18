import Image from "next/image";
import { MsgChip, SAMPLE, rs } from "./ui";
import { CountUp } from "./count-up";
import { Reveal } from "./reveal";
import { tileBlur } from "./blur";

const bars = [...SAMPLE.lines].sort((a, b) => b.amount - a.amount);
const max = bars[0].amount;

/* Tiles rise in left to right, 100ms apart. Chart bars grow after the chart tile, 90ms apart. */
export function BentoStats() {
  return (
    <div className="grid grid-cols-2 items-end gap-3 md:gap-4 lg:grid-cols-12">
      {/* Teal: checks */}
      <Reveal delay={0} className="col-span-1 lg:col-span-3">
        <div className="lift flex min-h-[208px] flex-col justify-between rounded-[20px] bg-teal p-6 text-white">
          <div className="flex gap-1.5" aria-hidden="true">
            {SAMPLE.checks.map((c) => <span key={c} className="size-2.5 rounded-full bg-white" />)}
          </div>
          <div>
            <p className="text-[64px] font-medium leading-none"><CountUp value={6} delay={250} /></p>
            <p className="mt-2 text-[15px] font-medium leading-snug">checks on every plan, run in plain code</p>
          </div>
        </div>
      </Reveal>

      {/* Ink: zero */}
      <Reveal delay={100} className="col-span-1 lg:col-span-3">
        <div className="lift flex min-h-[248px] flex-col justify-between rounded-[20px] bg-ink p-6 text-paper ring-1 ring-paper/20">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-mist">The model only reads</p>
          <div>
            <p className="tnum text-[88px] font-medium leading-[0.9] text-mist">0</p>
            <p className="mt-3 text-[15px] font-medium leading-snug">arithmetic done by the model</p>
          </div>
        </div>
      </Reveal>

      {/* Mist: chart */}
      <Reveal delay={200} className="col-span-2 lg:col-span-4">
        <div className="lift min-h-[288px] rounded-[20px] bg-mist p-6 text-ink">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-semibold">Every figure traces to a message</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/70">Sample plan</p>
          </div>
          <ul className="mt-4 space-y-2" aria-label={`Budget breakdown of ${rs(SAMPLE.total)}`} style={{ "--bar-base": "500ms" } as React.CSSProperties}>
            {bars.map((b, i) => (
              <li key={b.label} className="grid grid-cols-[104px_1fr_auto] items-center gap-3 text-[12px] font-medium">
                <span className="truncate">{b.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/60">
                  <span className="grow-x block h-full rounded-full bg-teal" style={{ width: `${(b.amount / max) * 100}%`, "--i": i } as React.CSSProperties} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-[52px] text-right"><CountUp value={b.amount / 1000} suffix="k" decimals={1} delay={500 + i * 90} align="right" /></span>
                  <MsgChip n={b.msg} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Photo tile */}
      <Reveal delay={300} className="col-span-2 lg:col-span-2">
        <figure className="lift relative min-h-[240px] overflow-hidden rounded-[20px] lg:min-h-[328px]">
          <Image
            src="/images/notebook-laptop-desk-tile.jpg"
            alt="A hand writing a checklist in a notebook beside a laptop on a desk."
            fill
            sizes="(min-width: 1024px) 200px, 100vw"
            placeholder="blur"
            blurDataURL={tileBlur}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-teal/20 mix-blend-multiply" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-4 pt-14">
            <figcaption className="text-[13px] font-medium leading-snug text-paper">Missing details become a question, not a guess.</figcaption>
          </div>
        </figure>
      </Reveal>
    </div>
  );
}
