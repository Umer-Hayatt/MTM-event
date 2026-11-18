import type { CSSProperties } from "react";
import { MessageCard, RejectedCard } from "./product-cluster";
import { CountUp } from "./count-up";
import { Pill, Ring, SAMPLE } from "./ui";
import { Reveal } from "./reveal";

const card = "rounded-[20px] bg-white p-5 shadow-[0_18px_48px_-16px_rgb(7_27_43/0.28),0_2px_6px_rgb(7_27_43/0.06)]";
const line = "absolute bg-mist";
const at = (base: number) => ({ "--bar-base": `${base}ms` }) as CSSProperties;

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
    <div className={`${card} lift w-full`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/70">Sample</p>
          <p className="text-[13px] font-medium text-ink">Current plan</p>
        </div>
        <Ring value={SAMPLE.total / SAMPLE.cap} size={64} stroke={7} drawDelay={1300} label="Budget used: 92 percent of Rs 650,000">
          <span className="text-[14px] font-medium leading-none text-teal"><CountUp value={92} suffix="%" delay={1300} align="center" /></span>
        </Ring>
      </div>
      <p className="mt-3 text-[28px] font-medium leading-none text-ink"><CountUp prefix="Rs " value={SAMPLE.total} delay={1150} /></p>
      <p className="tnum mt-1.5 text-[13px] text-ink/70">of Rs {SAMPLE.cap.toLocaleString("en-US")}</p>
      <Reveal delay={1250} y={8} className="mt-4"><Pill tone="mist">Sources: Msg 1, 2, 4 to 7</Pill></Reveal>
    </div>
  );
}

/*
  Sequence (ms): message cards slide in from the left at 150 and 270, the Mist elbow lines draw
  from 450 to about 1100, the plan card settles in at 1000, its chip at 1250.
*/
export function CtaVisual() {
  return (
    <>
      {/* Desktop: message cards on the left, elbow lines into the current plan */}
      <Reveal y={0} className="relative mx-auto hidden h-[490px] w-full max-w-[620px] lg:block">
        <div aria-label="Sample: two messages feeding one plan" role="group" className="absolute inset-0">
          <Contours />
          {/* lines (transform only): message A, message B, joint, plan card */}
          <span className={`${line} grow-x left-[44%] top-[90px] h-0.5 w-[7%]`} style={at(450)} aria-hidden="true" />
          <span className={`${line} grow-y left-[calc(51%-1px)] top-[90px] h-[156px] w-0.5`} style={at(650)} aria-hidden="true" />
          <span className={`${line} grow-x left-[51%] top-[245px] h-0.5 w-[7%]`} style={at(850)} aria-hidden="true" />
          <span className={`${line} grow-x left-[50%] top-[330px] h-0.5 w-[4%]`} style={at(520)} aria-hidden="true" />
          <span className={`${line} grow-y-up left-[calc(54%-1px)] top-[246px] h-[85px] w-0.5`} style={at(720)} aria-hidden="true" />
          <Reveal x={-16} y={0} delay={150} className="absolute left-0 top-0 w-[44%] -rotate-[1.5deg]">
            <MessageCard chip={<Pill tone="mist">Replaces Msg 3</Pill>} />
          </Reveal>
          <Reveal x={-16} y={0} delay={270} className="absolute left-[6%] top-[240px] w-[44%] rotate-[1.2deg]">
            <RejectedCard />
          </Reveal>
          <Reveal y={8} delay={1000} className="absolute right-0 top-1/2 w-[42%] -translate-y-1/2">
            <CurrentPlan />
          </Reveal>
        </div>
      </Reveal>

      {/* Below lg: stacked and scaled down. One message card at 390. */}
      <Reveal y={0} className="relative flex flex-col lg:hidden">
        <Reveal x={-16} y={0} delay={150} className="w-full -rotate-[1deg] sm:w-[80%]"><MessageCard chip={<Pill tone="mist">Replaces Msg 3</Pill>} /></Reveal>
        <Reveal x={-16} y={0} delay={270} className="-mt-2 hidden w-[80%] self-end rotate-[1deg] sm:block"><RejectedCard /></Reveal>
        <span className="grow-y ml-10 h-8 w-0.5 bg-mist" style={at(450)} aria-hidden="true" />
        <Reveal y={8} delay={700} className="w-full sm:w-[70%]"><CurrentPlan /></Reveal>
      </Reveal>
    </>
  );
}
