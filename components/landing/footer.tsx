import { wrap } from "./ui";

const links = [["#how-it-works", "How it works"], ["#audit", "Audit"], ["#sample-plan", "Sample plan"]];

export function Footer() {
  return (
    <footer className="on-dark bg-ink py-10 text-paper">
      <div className={wrap}>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-3 sm:gap-x-9 text-[15px] font-medium">
            {links.map(([h, l]) => (
              <li key={h}><a href={h} className="underline-offset-4 hover:underline">{l}</a></li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
