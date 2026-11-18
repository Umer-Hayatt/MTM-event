import { Arrow, Check, Pill, Ring, SAMPLE, rs } from "./ui";

/* Floating product cards. Real HTML/CSS/SVG, sample data from the bundled sample pack. */

const card = "rounded-[20px] bg-white p-5 shadow-[0_18px_48px_-16px_rgb(7_27_43/0.28),0_2px_6px_rgb(7_27_43/0.06)]";

function PlanCard() {
  return (
    <div className={`${card} lift w-full`}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <Pill tone="ink">Plan</Pill>
          <Pill>Budget</Pill>
          <Pill>Audit</Pill>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/70">Sample plan</span>
      </div>
      <p className="mt-4 font-serif text-xl font-bold leading-tight text-ink">
        {SAMPLE.hall}, {SAMPLE.headcount} people, {SAMPLE.judges} judges
      </p>
      <div className="mt-4 flex items-center gap-5">
        <Ring value={SAMPLE.total / SAMPLE.cap} size={112} stroke={11} label="Budget used: 92 percent, Rs 597,400 of Rs 650,000">
          <span className="tnum text-[26px] font-medium leading-none text-teal">92%</span>
        </Ring>
        <div>
          <p className="tnum text-[17px] font-medium leading-tight text-ink">{rs(SAMPLE.total)}</p>
          <p className="tnum mt-0.5 text-[13px] text-ink/70">of {rs(SAMPLE.cap)}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-teal text-white"><Check className="size-3" /></span>
            6 of 6 checks passed
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageCard() {
  return (
    <div className={`${card} lift w-full`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">Caterer · WhatsApp</p>
        <Pill tone="mist">Accepted</Pill>
      </div>
      <p className="mt-3 text-[15px] leading-snug text-ink">
        &ldquo;Salam bhai! Standard lunch box ab Rs 1,200 per head hoga...&rdquo;
      </p>
      <div className="mt-3 flex items-center gap-2 text-teal">
        <Arrow className="size-5 shrink-0 rotate-90" />
        <span className="tnum rounded-[10px] bg-mist px-3 py-1.5 text-[13px] font-medium text-ink">food.standard = 1,200 PKR</span>
      </div>
    </div>
  );
}

function RejectedCard() {
  return (
    <div className={`${card} lift w-full`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">Caterer · Practice message</p>
        <Pill tone="rejected">Rejected</Pill>
      </div>
      <p className="mt-3 text-[15px] leading-snug text-ink">
        &ldquo;I have rounded your order down to 100 boxes to keep the cost low.&rdquo;
      </p>
      <p className="mt-3 border-t border-ink/10 pt-3 text-[13px] text-ink">
        Reason: <span className="font-medium">caterer does not own food.boxes</span>
      </p>
    </div>
  );
}

export function ProductCluster() {
  return (
    <>
      {/* Desktop: overlapping composition */}
      <div className="relative hidden h-[640px] xl:block" aria-label="Sample product cards">
        <div className="rise absolute right-2 top-0 w-[338px]" style={{ "--i": 4 } as React.CSSProperties}><PlanCard /></div>
        <div className="rise absolute left-0 top-[262px] w-[308px]" style={{ "--i": 5 } as React.CSSProperties}><MessageCard /></div>
        <div className="rise absolute right-[-8px] top-[426px] w-[300px]" style={{ "--i": 6 } as React.CSSProperties}><RejectedCard /></div>
        <div className="rise absolute left-6 top-[188px]" style={{ "--i": 7 } as React.CSSProperties}>
          <span className="tnum inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper shadow-[0_10px_28px_-10px_rgb(7_27_43/0.5)]">
            <span className="size-1.5 rounded-full bg-mist" aria-hidden="true" />
            Call 1 · 2,413 tokens <span className="text-mist/80">sample</span>
          </span>
        </div>
        <a href="#sample-plan" aria-label="Scroll to the sample plan" className="rise group absolute bottom-4 left-6 flex size-[68px] items-center justify-center rounded-full bg-paper text-ink shadow-[0_10px_28px_-10px_rgb(7_27_43/0.4)]" style={{ "--i": 8 } as React.CSSProperties}>
          <svg viewBox="0 0 68 68" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx="34" cy="34" r="30" fill="none" stroke="var(--mist)" strokeWidth="3" />
            <circle cx="34" cy="34" r="30" fill="none" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" className="ring-draw" style={{ "--ring-len": 188.5, "--ring-off": 47 } as React.CSSProperties} />
          </svg>
          <Arrow dir="down" className="size-5 transition-transform group-hover:translate-y-0.5" />
        </a>
      </div>

      {/* Below lg: two cards, stacked with a small offset */}
      <div className="flex flex-col gap-4 xl:hidden" aria-label="Sample product cards">
        <div className="rise" style={{ "--i": 4 } as React.CSSProperties}><PlanCard /></div>
        <div className="rise ml-6 sm:ml-16" style={{ "--i": 5 } as React.CSSProperties}><MessageCard /></div>
        <div className="rise mr-6 hidden sm:block sm:mr-16" style={{ "--i": 6 } as React.CSSProperties}><RejectedCard /></div>
      </div>
    </>
  );
}
