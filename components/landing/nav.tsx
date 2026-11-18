"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark, wrap } from "./ui";

const links = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#audit", label: "Audit" },
  { href: "#sample-plan", label: "Sample plan" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled || open ? "bg-paper/85 backdrop-blur-md" : "bg-transparent"}`}>
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-5 md:px-[72px] min-[1440px]:px-[72px]">
        <Link href="/" aria-label="Convene home" className="text-ink">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] font-medium text-ink underline-offset-[6px] hover:underline">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/app" className="hidden rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink sm:inline-flex">
            Open workspace
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-ink/20 text-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3.5 6.5h13M3.5 13.5h13" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-ink/10 bg-paper md:hidden">
          <nav aria-label="Mobile" className={`${wrap} flex flex-col py-4`}>
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-ink/10 py-4 font-serif text-2xl font-bold text-ink">
                {l.label}
              </a>
            ))}
            <Link href="/app" className="mt-5 inline-flex justify-center rounded-full bg-teal px-5 py-3.5 text-base font-semibold text-white">
              Open workspace
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
