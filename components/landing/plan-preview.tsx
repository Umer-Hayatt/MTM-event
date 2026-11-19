import type { CSSProperties } from "react";
import { Check, Ring, SAMPLE, SAMPLE_BLOCKS } from "./ui";
import { Reveal } from "./reveal";

/*
  "What you will get" preview for the workspace New plan page. Purely decorative:
  aria-hidden, no focusable children, no hover. Same sample figures and schedule
  blocks as the landing Sample plan. A plain Mist card peeks out behind it.
  Hidden below 1024px, smaller from 1024 to 1279, full size from 1280.
*/
export function PlanPreview({ className = "" }: { className?: string }) {
  return (
    <Reveal y={12} delay={200} className={className}>
      <div aria-hidden="true" className="pointer-events-none relative select-none pb-3.5 pr-3.5">
        <div className="absolute bottom-0 left-3.5 right-0 top-3.5 rounded-[20px] bg-mist" />
        <div className="relative rounded-[20px] bg-white p-4 opacity-90 shadow-[0_10px_30px_-16px_rgb(7_27_43/0.22),0_1px_2px_rgb(7_27_43/0.05)] xl:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/70">Sample</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Ring value={SAMPLE.total / SAMPLE.cap} size={88} stroke={10} drawDelay={500} label="Budget used: 92 percent">
              <span className="text-[24px] font-medium leading-none text-teal">92%</span>
            </Ring>
            <div className="min-w-[7rem] flex-1">
              <p className="tnum text-[15px] font-medium leading-snug text-ink">Rs {SAMPLE.total.toLocaleString("en-US")} of {SAMPLE.cap.toLocaleString("en-US")}</p>
              <p className="tnum mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Check className="size-3.5 text-teal" />6 of 6 checks
              </p>
            </div>
          </div>

          <div className="mt-5 flex h-7 gap-1" style={{ "--bar-base": "700ms" } as CSSProperties}>
            {SAMPLE_BLOCKS.map((b, i) => (
              <div key={b.label} style={{ flexGrow: b.min, "--i": i } as CSSProperties} className={`grow-x min-w-0 rounded-[6px] ${b.cls.split(" ")[0]}`} />
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
