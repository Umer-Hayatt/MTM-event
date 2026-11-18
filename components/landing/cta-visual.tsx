import type { CSSProperties } from "react";
import { MessageCard, RejectedCard } from "./product-cluster";
import { Pill, Ring, SAMPLE, rs } from "./ui";

const card = "rounded-[20px] bg-white p-5 shadow-[0_18px_48px_-16px_rgb(7_27_43/0.28),0_2px_6px_rgb(7_27_43/0.06)]";
const d = (i: number) => ({ "--i": i }) as CSSProperties;

/* Faint Mist contours, same family as the hero. */
function Contours() {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 600 490" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      {[120, 210, 300, 390, 480].map((r, i) => (
        <circle key={r} cx="470" cy="245" r={r} fill="none" stroke="var(--mist)" strokeWidth="1" opacity={i % 2 ? 0.1 : 0.16} />
      ))}
    </svg>
  );
}

function CurrentPlan() {
  return (
    <div className={`${card} w-full`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/70">Sample</p>
          <p className="text-[13px] font-medium text-ink">Current plan</p>
        </div>
        <Ring value={SAMPLE.total / SAMPLE.cap} size={64} stroke={7} label="Budget used: 92 percent of Rs 650,000">
          <span className="tnum text-[14px] font-medium leading-none text-teal">92%</span>
        </Ring>
      </div>
      <p className="tnum mt-3 text-[28px] font-medium leading-none text-ink">{rs(SAMPLE.total)}</p>
      <p className="tnum mt-1.5 text-[13px] text-ink/70">of {rs(SAMPLE.cap)}</p>
      <div className="mt-4"><Pill tone="mist">Sources: Msg 1, 2, 4 to 7</Pill></div>
    </div>
  );
}

export function CtaVisual() {
  return (
    <>
      {/* Desktop: message cards on the left, a line into the current plan */}
      <div className="relative mx-auto hidden h-[490px] w-full max-w-[620px] lg:block" aria-label="Sample: two messages feeding one plan">
        <Contours />
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M44 19 C 52 19, 50 50, 58 50" stroke="var(--mist)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          <path d="M50 67 C 55 67, 53 50, 58 50" stroke="var(--mist)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        <div className="rise-sm absolute left-0 top-0 w-[44%] -rotate-[1.5deg]" style={d(0)}>
          <MessageCard chip={<Pill tone="mist">Replaces Msg 3</Pill>} />
        </div>
        <div className="rise-sm absolute left-[6%] top-[240px] w-[44%] rotate-[1.2deg]" style={d(1)}>
          <RejectedCard />
        </div>
        <div className="rise-sm absolute right-0 top-1/2 w-[42%] -translate-y-1/2" style={d(2)}>
          <CurrentPlan />
        </div>
      </div>

      {/* Below lg: stacked and scaled down. One message card at 390. */}
      <div className="relative flex flex-col lg:hidden" aria-label="Sample: messages feeding one plan">
        <div className="rise-sm w-full sm:w-[80%] -rotate-[1deg]" style={d(0)}><MessageCard chip={<Pill tone="mist">Replaces Msg 3</Pill>} /></div>
        <div className="rise-sm -mt-2 hidden w-[80%] self-end rotate-[1deg] sm:block" style={d(1)}><RejectedCard /></div>
        <span className="ml-10 h-8 w-0.5 bg-mist" aria-hidden="true" />
        <div className="rise-sm w-full sm:w-[70%]" style={d(2)}><CurrentPlan /></div>
      </div>
    </>
  );
}
