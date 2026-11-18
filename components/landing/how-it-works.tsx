import { Arrow, Check, Pill, SAMPLE, wrap } from "./ui";
import { Reveal } from "./reveal";

/* Arrow bead on the right edge of a step. It appears just after its card, joining it to the next one. */
function Bead({ delay }: { delay: number }) {
  return (
    <Reveal y={0} x={-8} delay={delay} className="absolute -right-[28px] top-10 z-10 hidden size-9 items-center justify-center rounded-full bg-paper text-ink shadow-[0_6px_16px_-6px_rgb(7_27_43/0.4)] lg:flex">
      <Arrow className="size-4" />
    </Reveal>
  );
}

function StepHead({ n, title, text, dark = false }: { n: string; title: string; text: string; dark?: boolean }) {
  return (
    <div>
      <p className={`tnum text-sm font-medium ${dark ? "text-mist" : "text-teal"}`}>{n}</p>
      <h3 className={`mt-2 font-serif text-[32px] font-bold leading-none tracking-[-0.015em] ${dark ? "text-paper" : "text-ink"}`}>{title}</h3>
      <p className={`mt-3 text-[15px] leading-relaxed ${dark ? "text-paper" : "text-ink"}`}>{text}</p>
    </div>
  );
}

/* Sequence (ms): heading 0, cards 150 / 270 / 390, beads and inner visuals 250 to 400 after their card. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 bg-mist/45 py-24 md:py-32">
      <div className={wrap}>
        <Reveal className="max-w-[720px]">
          <p className="text-sm font-medium text-ink">How it works</p>
          <h2 id="how-title" className="mt-4 font-serif text-[clamp(2.25rem,4.4vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
            Read every message. Keep what&apos;s current. Build the plan from it.
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-6 lg:grid-cols-12 lg:gap-5">
          {/* 1. Read */}
          <Reveal delay={150} className="lg:col-span-5 lg:mt-12">
            <article className="lift relative h-full rounded-[32px] bg-white p-7 shadow-[0_18px_48px_-24px_rgb(7_27_43/0.25)]">
              <Bead delay={400} />
              <StepHead n="01" title="Read" text="Each message goes to the model once. It returns facts in a fixed schema, and a failed parse gets one repair retry." />
              <Reveal delay={400} className="mt-6 rounded-[20px] bg-paper p-4">
                <p className="text-[13px] font-medium text-ink">Caterer · WhatsApp</p>
                <p className="mt-1.5 text-[15px] leading-snug text-ink">&ldquo;Salam bhai! Standard lunch box ab Rs 1,200 per head hoga, basic wala Rs 800.&rdquo;</p>
                <div className="my-3 flex items-center gap-2 text-teal"><Arrow dir="down" className="size-4" /><span className="text-xs font-medium text-ink">Facts, nothing else</span></div>
                <div className="flex flex-wrap gap-2">
                  {["food.standard = 1,200 PKR", "food.basic = 800 PKR", "sender_role = caterer"].map((f) => (
                    <span key={f} className="tnum rounded-[10px] bg-mist px-3 py-1.5 text-[13px] font-medium text-ink">{f}</span>
                  ))}
                </div>
              </Reveal>
            </article>
          </Reveal>

          {/* 2. Decide */}
          <Reveal delay={270} className="lg:col-span-4">
            <article className="lift relative h-full rounded-[32px] bg-ink p-7 text-paper">
              <Bead delay={520} />
              <StepHead dark n="02" title="Decide" text="Roles are checked, dates sorted, every venue and lunch combination is enumerated, and six checks run on the result." />
              <ul className="mt-6 space-y-2">
                {SAMPLE.checks.map((c, i) => (
                  <Reveal as="li" key={c} delay={520 + i * 80} y={8} className="flex items-center justify-between rounded-[10px] bg-paper/8 px-3 py-2 text-[14px] font-medium">
                    <span>{c}</span>
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-teal text-white"><Check className="size-3" /></span>
                  </Reveal>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* 3. Ask */}
          <Reveal delay={390} className="lg:col-span-3 lg:mt-24">
            <article className="lift relative h-full rounded-[32px] bg-teal p-7 text-white">
              <StepHead dark n="03" title="Ask" text="Missing details become TBA and a question to the organizer. Nothing is guessed." />
              <Reveal delay={640} className="mt-6 rounded-[20px] bg-white p-4 text-ink">
                <div className="flex items-center justify-between"><p className="text-[13px] font-medium">Question for you</p><Pill tone="mist">Open</Pill></div>
                <p className="mt-2 text-[15px] font-medium leading-snug">What time does the event start?</p>
                <p className="mt-1 text-[13px]">Schedule shows <span className="tnum font-medium">TBA</span> until answered.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-teal px-3 py-1.5 text-[12px] font-semibold text-white">Answer</span>
                  <span className="whitespace-nowrap rounded-full border border-ink/30 px-3 py-1.5 text-[12px] font-semibold">Leave as TBA</span>
                </div>
              </Reveal>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
