import Image from "next/image";
import Link from "next/link";
import { ProductCluster } from "./product-cluster";
import { BentoStats } from "./bento-stats";
import { Reveal } from "./reveal";
import { heroBlur } from "./blur";
import { wrap } from "./ui";

/* Contour arcs: Mist hairlines at low opacity, centred behind the card cluster. */
function Contours() {
  const radii = [160, 260, 360, 460, 560, 660, 760];
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1392 820" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      {radii.map((r, i) => (
        <circle key={r} cx="1080" cy="330" r={r} fill="none" stroke="var(--mist)" strokeWidth="1" opacity={i % 2 ? 0.07 : 0.11} />
      ))}
      <path d="M0 640 C 300 560, 520 700, 820 620 S 1260 560, 1392 600" fill="none" stroke="var(--mist)" strokeWidth="1" opacity="0.08" />
      <path d="M0 700 C 300 620, 520 760, 820 680 S 1260 620, 1392 660" fill="none" stroke="var(--mist)" strokeWidth="1" opacity="0.06" />
    </svg>
  );
}

/*
  Load sequence (ms): nav 0, pill 100, H1 lines 200 and 300, subline 450, buttons 550,
  photo 700, plan card 900, message card 1020, rejected card 1140, trace chip 1260.
*/
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative pb-8 md:pb-12">
      <div className="mx-0 md:mx-6">
        <div className="hero-surface relative mx-auto max-w-[1392px] overflow-hidden rounded-none md:rounded-[32px]">
          {/* Photo: right side on desktop, lower half on mobile, blended into the gradient */}
          <Reveal y={0} delay={700} className="hero-photo absolute inset-x-0 bottom-0 h-[62%] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[66%]">
            <Image
              src="/images/auditorium-seating-hero.jpg"
              alt="Rows of empty wooden auditorium seats rising toward a panelled wall under a curved ceiling."
              fill
              priority
              sizes="(min-width: 1440px) 920px, (min-width: 1024px) 66vw, 100vw"
              placeholder="blur"
              blurDataURL={heroBlur}
              className="object-cover object-[60%_65%] saturate-[0.35]"
            />
            <div className="absolute inset-0 bg-teal opacity-85 mix-blend-color" aria-hidden="true" />
            <div className="absolute inset-0 bg-ink/15 mix-blend-multiply" aria-hidden="true" />
          </Reveal>
          <Reveal y={0} delay={700} className="pointer-events-none absolute inset-0">
            <Contours />
          </Reveal>

          <div className="relative grid gap-12 px-5 pb-48 pt-12 md:px-12 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6 lg:pb-52 lg:pt-20">
            <div className="max-w-[640px]">
              <Reveal delay={100}>
                <span className="inline-flex items-center rounded-full bg-mist px-3.5 py-1.5 text-[13px] font-medium leading-none text-ink">
                  Inbox → Plan
                </span>
              </Reveal>
              <h1 id="hero-title" className="mt-6 font-serif text-[clamp(2.75rem,5.8vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.025em] text-paper">
                <Reveal as="span" delay={200} className="block">Messages in.</Reveal>
                <Reveal as="span" delay={300} className="block">Plan out.</Reveal>
              </h1>
              <Reveal delay={450}>
                <p className="mt-7 max-w-[440px] text-[17px] leading-relaxed text-mist md:text-lg">
                  Paste the chats and emails. Get a plan where every number has a source.
                </p>
              </Reveal>
              <Reveal delay={550} className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/app" className="btn-lift inline-flex items-center rounded-full bg-paper px-7 py-3.5 text-base font-semibold text-ink hover:bg-white">
                  Make a plan
                </Link>
                <a href="#sample-plan" className="btn-lift inline-flex items-center rounded-full border border-mist/70 px-7 py-3.5 text-base font-semibold text-paper hover:bg-paper/10">
                  See a sample plan
                </a>
              </Reveal>
            </div>

            <ProductCluster />
          </div>
        </div>
      </div>

      {/* Bento row overlaps the bottom edge of the panel */}
      <div className={`${wrap} relative z-10 -mt-36 lg:-mt-40`}>
        <BentoStats />
      </div>
    </section>
  );
}
