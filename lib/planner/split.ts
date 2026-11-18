// Cuts an input file into messages using STRUCTURAL markers only.
// Why not blank lines: one email can have several paragraphs; splitting on blank lines would cut it apart.
import { createHash } from "node:crypto";

const NUMBERED = /^\s*(?:#\s*\d+|\d+\s*[.):|\t-]|\[\d+\]|(?:message|msg)\s*#?\s*\d+\b)/i;
const FROM_LINE = /^\s*(?:from|sender)\s*:/i;
const WHATSAPP = /^\s*\[\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?,?\s+\d{1,2}:\d{2}/;
const SEPARATOR = /^\s*(?:-{3,}|={3,}|\*{3,}|_{3,})\s*$/;

export function hashText(text: string): string {
  return createHash("sha256").update(text.replace(/\s+/g, " ").trim().toLowerCase()).digest("hex").slice(0, 16);
}

/** Returns message texts in file order. */
export function splitMessages(raw: string): string[] {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");

  // Pick the first marker style that actually appears at least twice; otherwise fall back.
  const markers = [NUMBERED, FROM_LINE, WHATSAPP];
  for (const m of markers) {
    const starts = lines.map((l, i) => (m.test(l) ? i : -1)).filter((i) => i >= 0);
    if (starts.length >= 2) return cut(lines, starts);
  }
  if (lines.some((l) => SEPARATOR.test(l))) {
    return text.split(/\n\s*(?:-{3,}|={3,}|\*{3,}|_{3,})\s*\n/).map((s) => s.trim()).filter(Boolean);
  }
  // Last resort: two or more blank lines between blocks; else the whole file is one message.
  const blocks = text.split(/\n\s*\n\s*\n+/).map((s) => s.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;
  const single = text.trim();
  return single ? [single] : [];
}

function cut(lines: string[], starts: number[]): string[] {
  const out: string[] = [];
  // Text before the first marker (e.g. a title line) is dropped only if it is a short header.
  const pre = lines.slice(0, starts[0]).join("\n").trim();
  if (pre && pre.split("\n").length > 2) out.push(pre);
  starts.forEach((s, i) => {
    const chunk = lines.slice(s, starts[i + 1] ?? lines.length).join("\n").trim();
    if (chunk) out.push(chunk);
  });
  return out;
}
