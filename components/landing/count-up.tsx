"use client";

import { useEffect, useRef } from "react";

/*
  CountUp: counts from 0 to `value` once, when it enters the viewport (plus `delay` ms).
  The final text is always in the DOM, and a hidden sizer reserves its width, so
  nothing shifts while the digits change. Reduced motion keeps the final value.
*/
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  delay = 0,
  duration = 700,
  align = "left",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  duration?: number;
  align?: "left" | "center" | "right";
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => prefix + n.toLocaleString("en-US", { maximumFractionDigits: decimals }) + suffix;

  useEffect(() => {
    const wrap = wrapRef.current;
    const node = textRef.current?.firstChild;
    if (!wrap || !node) return;
    const finalText = prefix + value.toLocaleString("en-US", { maximumFractionDigits: decimals }) + suffix;
    const show = (n: number) => {
      node.nodeValue = prefix + n.toLocaleString("en-US", { maximumFractionDigits: decimals }) + suffix;
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    show(0);
    let raf = 0;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            show(value * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(tick);
            else node.nodeValue = finalText;
          };
          raf = requestAnimationFrame(tick);
        }, delay);
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(wrap);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      node.nodeValue = finalText;
    };
  }, [value, prefix, suffix, decimals, delay, duration]);

  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <span ref={wrapRef} className="tnum relative inline-block" aria-label={fmt(value)}>
      <span className="invisible" aria-hidden="true">{fmt(value)}</span>
      <span ref={textRef} className={`absolute inset-0 ${textAlign}`} aria-hidden="true">{fmt(value)}</span>
    </span>
  );
}
