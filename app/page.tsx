import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AuditBand } from "@/components/landing/audit-band";
import { SamplePlan } from "@/components/landing/sample-plan";
import { CtaBand } from "@/components/landing/cta-band";
import { Footer } from "@/components/landing/footer";

export default function Landing() {
  return (
    <div className="landing bg-paper font-sans text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <AuditBand />
        <SamplePlan />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
