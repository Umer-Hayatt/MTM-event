import { wrap } from "./ui";

const links = [["#product", "Product"], ["#how-it-works", "How it works"], ["#audit", "Audit"], ["#sample-plan", "Sample plan"]];

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
        <p className="mt-8 border-t border-paper/20 pt-6 text-[13px] text-paper/85">
          Photo credits:{" "}
          <a className="underline underline-offset-2" href="https://unsplash.com/photos/an-auditorium-is-filled-with-empty-seats-jBS44aPweh4">set.sj</a>
          {" and "}
          <a className="underline underline-offset-2" href="https://unsplash.com/photos/hand-writing-notes-in-a-notebook-at-a-desk-1rm4_SojyNM">Jakub Żerdzicki</a>
          , via Unsplash.
        </p>
      </div>
    </footer>
  );
}
