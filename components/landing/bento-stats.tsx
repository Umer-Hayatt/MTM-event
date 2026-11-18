import Image from "next/image";
import { MsgChip, SAMPLE, rs } from "./ui";
import { tileBlur } from "./blur";

const bars = [...SAMPLE.lines].sort((a, b) => b.amount - a.amount);
const max = bars[0].amount;

export function BentoStats() {
  return (
    <div className="grid grid-cols-2 items-end gap-3 md:gap-4 lg:grid-cols-12">
      {/* Teal: checks */}
      <div className="rise lift col-span-1 flex min-h-[208px] flex-col justify-between rounded-[20px] bg-teal p-6 text-white lg:col-span-3" style={{ "--i": 9 } as React.CSSProperties}>
        <div className="flex gap-1.5" aria-hidden="true">
          {SAMPLE.checks.map((c) => <span key={c} className="size-2.5 rounded-full bg-white" />)}
        </div>
        <div>
          <p className="tnum text-[64px] font-medium leading-none">6</p>
          <p className="mt-2 text-[15px] font-medium leading-snug">checks on every plan, run in plain code</p>
        </div>
      </div>

      {/* Ink: zero */}
      <div className="rise lift col-span-1 flex min-h-[248px] flex-col justify-between rounded-[20px] bg-ink p-6 text-paper lg:col-span-3" style={{ "--i": 10 } as React.CSSProperties}>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-mist">The model only reads</p>
        <div>
          <p className="tnum text-[88px] font-medium leading-[0.9] text-mist">0</p>
          <p className="mt-3 text-[15px] font-medium leading-snug">arithmetic done by the model</p>
        </div>
      </div>

      {/* Mist: chart */}
      <div className="rise lift col-span-2 min-h-[288px] rounded-[20px] bg-mist p-6 text-ink lg:col-span-4" style={{ "--i": 11 } as React.CSSProperties}>
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">Every figure traces to a message</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/70">Sample plan</p>
        </div>
        <ul className="mt-4 space-y-2" aria-label={`Budget breakdown of ${rs(SAMPLE.total)}`}>
          {bars.map((b) => (
            <li key={b.label} className="grid grid-cols-[104px_1fr_auto] items-center gap-3 text-[12px] font-medium">
              <span className="truncate">{b.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/60">
                <span className="grow-x block h-full rounded-full bg-teal" style={{ width: `${(b.amount / max) * 100}%` }} />
              </span>
              <span className="flex items-center gap-2"><span className="tnum w-[52px] text-right">{(b.amount / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k</span><MsgChip n={b.msg} /></span>
            </li>
          ))}
        </ul>
      </div>

      {/* Photo tile */}
      <figure className="rise lift relative col-span-2 min-h-[240px] overflow-hidden rounded-[20px] lg:col-span-2 lg:min-h-[328px]" style={{ "--i": 12 } as React.CSSProperties}>
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
    </div>
  );
}
