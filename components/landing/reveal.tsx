"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/*
  Reveal: plays once when the element enters the viewport.
  Hidden-until-revealed styles only apply once the inline script in app/layout.tsx
  has added the `js` class to <html>, so content stays visible without JavaScript.
  Only opacity and transform change, so there is no layout shift.
*/

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Reveal({
  as = "div",
  delay = 0,
  x = 0,
  y,
  className,
  style,
  children,
}: {
  as?: "div" | "span" | "li";
  /** ms after the element enters the viewport */
  delay?: number;
  /** horizontal start offset in px (negative slides in from the left) */
  x?: number;
  /** vertical start offset in px; defaults to the shared --dist token, 0 for a pure fade */
  y?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || !("IntersectionObserver" in window)) {
      el.dataset.reveal = "in";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "in";
        io.disconnect();
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const vars: Record<string, string> = { "--delay": `${delay}ms` };
  if (x) vars["--rx"] = `${x}px`;
  if (y !== undefined) vars["--ry"] = `${y}px`;

  return (
    <Tag ref={ref as never} data-reveal="" className={className} style={{ ...vars, ...style } as CSSProperties}>
      {children}
    </Tag>
  );
}
