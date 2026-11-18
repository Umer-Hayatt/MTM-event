import Link from "next/link";
import { Wordmark, wrap } from "./ui";

export function Footer() {
  return (
    <footer className="on-dark bg-ink py-16 text-paper">
      <div className={wrap}>
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Wordmark className="text-paper" />
            <p className="mt-5 max-w-[400px] text-[15px] leading-relaxed text-paper">
              Convene turns event messages into a validated, budgeted plan. The model reads. Plain code decides. Figures on this page are sample data from the bundled sample pack.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-[15px] font-medium">
            <ul className="space-y-3">
              {[["#product", "Product"], ["#how-it-works", "How it works"], ["#audit", "Audit"], ["#sample-plan", "Sample plan"]].map(([h, l]) => (
                <li key={h}><a href={h} className="underline-offset-4 hover:underline">{l}</a></li>
              ))}
            </ul>
            <ul className="space-y-3">
              <li><Link href="/app" className="inline-flex rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white">Open workspace</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-paper/20 pt-6 text-[13px] text-paper/85 md:flex-row md:justify-between">
          <p>
            Photo credits:{" "}
            <a className="underline underline-offset-2" href="https://unsplash.com/photos/an-auditorium-is-filled-with-empty-seats-jBS44aPweh4">set.sj</a>
            {" and "}
            <a className="underline underline-offset-2" href="https://unsplash.com/photos/hand-writing-notes-in-a-notebook-at-a-desk-1rm4_SojyNM">Jakub Żerdzicki</a>
            , via Unsplash.
          </p>
          <p>Convene, Inbox to Plan.</p>
        </div>
      </div>
    </footer>
  );
}
