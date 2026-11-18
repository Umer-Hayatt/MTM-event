import Link from "next/link";
import { Arrow, wrap } from "./ui";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="bg-teal py-20 text-white md:py-28">
      <div className={`${wrap} flex flex-col gap-10 md:flex-row md:items-end md:justify-between`}>
        <div className="max-w-[760px]">
          <h2 id="cta-title" className="font-serif text-[clamp(2.5rem,5.6vw,5rem)] font-bold leading-[1] tracking-[-0.025em]">
            Bring your messiest thread.
          </h2>
          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-white">
            Paste it in, read the plan, and follow any figure back to the message it came from.
          </p>
        </div>
        <Link href="/app" className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-paper px-8 py-4 text-base font-semibold text-ink transition hover:bg-white md:self-auto">
          Open workspace
          <Arrow className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
