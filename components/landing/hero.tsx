import Image from "next/image";
import Link from "next/link";
import { ProductCluster } from "./product-cluster";
import { BentoStats } from "./bento-stats";
import { heroBlur } from "./blur";
import { wrap } from "./ui";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative pb-8 md:pb-12">
      <div className="mx-0 md:mx-6">
        <div className="relative mx-auto max-w-[1392px] overflow-hidden rounded-none bg-mist md:rounded-[32px] md:ring-1 md:ring-ink/10">
          {/* Photo and grade */}
          <Image
            src="/images/auditorium-seating-hero.jpg"
            alt="Rows of empty wooden auditorium seats rising toward a panelled wall under a curved ceiling."
            fill
            priority
            sizes="(min-width: 1440px) 1392px, 100vw"
            placeholder="blur"
            blurDataURL={heroBlur}
            className="object-cover object-[60%_70%] saturate-[0.8]"
          />
          <div className="absolute inset-0 bg-teal/25 mix-blend-multiply" aria-hidden="true" />
          <div className="absolute inset-0 bg-ink/10" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-paper from-25% via-paper/80 to-transparent lg:bg-gradient-to-r lg:from-paper lg:from-30% lg:via-paper/80 lg:via-50% lg:to-transparent lg:to-75%" aria-hidden="true" />

          <div className="relative grid gap-12 px-5 pb-48 pt-10 md:px-12 md:pt-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-6 lg:pb-52 lg:pt-16">
            <div className="max-w-[760px]">
              <h1 className="rise font-serif text-[clamp(2.75rem,6.2vw,5.75rem)] font-bold leading-[0.98] tracking-[-0.025em] text-ink" style={{ "--i": 0 } as React.CSSProperties}>
                From scattered messages to a plan you can audit.
              </h1>
              <p className="rise mt-7 max-w-[520px] text-[17px] leading-relaxed text-ink md:text-lg" style={{ "--i": 1 } as React.CSSProperties}>
                Paste the emails, WhatsApp chats and memos. Convene reads them, checks who is allowed to say what, and builds a budgeted plan where every number points back to a message.
              </p>
              <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ "--i": 2 } as React.CSSProperties}>
                <Link href="/app" className="inline-flex items-center rounded-full bg-teal px-7 py-3.5 text-base font-semibold text-white transition hover:bg-ink">
                  Make a plan
                </Link>
                <a href="#sample-plan" className="inline-flex items-center rounded-full border border-ink px-7 py-3.5 text-base font-semibold text-ink transition hover:bg-ink hover:text-paper">
                  See a sample plan
                </a>
              </div>
              <p className="rise mt-8 text-[15px] font-medium text-ink" style={{ "--i": 3 } as React.CSSProperties}>
                / The model reads. Code decides. /
              </p>
            </div>

            <ProductCluster />
          </div>
        </div>
      </div>

      {/* Bento row overlaps the bottom edge of the photo panel */}
      <div className={`${wrap} relative z-10 -mt-36 lg:-mt-40`}>
        <BentoStats />
      </div>
    </section>
  );
}
