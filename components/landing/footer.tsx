import Link from "next/link";
import { wrap } from "./ui";

const links = [["/privacy", "Privacy"], ["/terms", "Terms and Conditions"], ["/help", "Help"], ["/contact", "Contact"]];

export function Footer() {
  return (
    <footer className="on-dark border-t border-paper/15 bg-ink py-10 text-paper">
      <div className={`${wrap} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-3 text-[15px] font-medium sm:gap-x-9">
            {links.map(([h, l]) => (
              <li key={h}><Link href={h} className="underline-offset-4 hover:underline">{l}</Link></li>
            ))}
          </ul>
        </nav>
        <p className="text-[13px] text-paper/85">© 2026 Convene</p>
      </div>
    </footer>
  );
}
