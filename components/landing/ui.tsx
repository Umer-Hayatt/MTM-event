import type { CSSProperties, ReactNode } from "react";

/* Shared small pieces for the landing page. Tokens live in app/globals.css. */

export const wrap = "mx-auto w-full max-w-[1240px] px-5 md:px-8";

export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" className={className} role="img" aria-label="Convene mark">
      <circle cx="11" cy="14" r="10" fill="currentColor" />
      <circle cx="21" cy="14" r="10" fill="var(--teal)" />
      <path d="M16 5.34A10 10 0 0 1 16 22.66A10 10 0 0 1 16 5.34Z" fill="var(--mist)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-serif text-[22px] font-bold leading-none tracking-[-0.01em] ${className}`}>
      <Mark />
      Convene
    </span>
  );
}

export function Pill({ children, tone = "line" }: { children: ReactNode; tone?: "line" | "mist" | "ink" | "teal" | "rejected" | "paper" }) {
  const tones = {
    line: "border border-ink/25 text-ink",
    mist: "bg-mist text-ink",
    ink: "bg-ink text-paper",
    teal: "bg-teal text-white",
    rejected: "bg-rejected text-white",
    paper: "bg-paper text-ink",
  } as const;
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium leading-none ${tones[tone]}`}>{children}</span>;
}

export function MsgChip({ n, dark = false }: { n: number; dark?: boolean }) {
  return (
    <span className={`tnum inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${dark ? "bg-paper/10 text-mist" : "bg-mist text-ink"}`}>
      Msg {n}
    </span>
  );
}

export function Arrow({ className = "size-4", dir = "right" }: { className?: string; dir?: "right" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={dir === "down" ? { transform: "rotate(90deg)" } : undefined}>
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

export function Check({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/** Budget ring. value is 0..1. Animates once. */
export function Ring({ value, size = 132, stroke = 12, track = "var(--mist)", arc = "var(--teal)", children, label }: {
  value: number; size?: number; stroke?: number; track?: string; arc?: string; children?: ReactNode; label: string;
}) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const style = { "--ring-len": len, "--ring-off": len * (1 - value) } as CSSProperties;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={arc} strokeWidth={stroke} strokeLinecap="round" className="ring-draw" style={style} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* Sample plan figures. All from samples/sample_pack.txt; the lines add up to the total. */
export const SAMPLE = {
  headcount: 177,
  judges: 17,
  hall: "Hall A",
  total: 597_400,
  cap: 650_000,
  left: 52_600,
  lines: [
    { label: "Standard lunch boxes", detail: "177 at Rs 1,200", amount: 212_400, msg: 4 },
    { label: "Hall A", detail: "seats 200", amount: 120_000, msg: 2 },
    { label: "Prizes", detail: "already ordered", amount: 100_000, msg: 6 },
    { label: "Judge honoraria", detail: "17 at Rs 5,000", amount: 85_000, msg: 5 },
    { label: "Closing DJ", detail: "student society request", amount: 50_000, msg: 7 },
    { label: "Backup internet", detail: "already ordered", amount: 20_000, msg: 6 },
    { label: "Printing", detail: "already ordered", amount: 10_000, msg: 6 },
  ],
  checks: ["Figures", "Within budget", "Venue fits", "Schedule valid", "Enough judges", "All areas covered"],
} as const;

export const rs = (n: number) => `Rs ${n.toLocaleString("en-US")}`;
