import Link from "next/link";
import { Arrow, wrap } from "./ui";
import { CtaVisual } from "./cta-visual";
import { Reveal } from "./reveal";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="overflow-hidden bg-teal py-20 text-white md:py-28">
      <div className={`${wrap} grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10`}>
        <div className="max-w-[560px]">
          <Reveal>
            <h2 id="cta-title" className="font-serif text-[clamp(2.5rem,4.2vw,3.75rem)] font-bold leading-[1.06] tracking-[-0.025em]">
              Bring your messiest thread.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-white">
              Paste it in, read the plan, and follow any figure back to the message it came from.
            </p>
          </Reveal>
          <Reveal delay={200} className="mt-8">
            <Link href="/app" className="btn-lift group inline-flex items-center gap-3 rounded-full bg-paper px-8 py-4 text-base font-semibold text-ink hover:bg-white">
              Open workspace
              <Arrow className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
        <CtaVisual />
      </div>
    </section>
  );
}
