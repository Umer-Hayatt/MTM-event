// Builds the timeline in RELATIVE time (T+0:00). Clock times only if a message gives a start time:
// we never invent a start. Build time absorbs whatever is left after fixed blocks.
import { SCHEDULE_POLICY } from "./policy.ts";
import type { Block, FactState } from "./types.ts";

export type ScheduleResult = { blocks: Block[]; lengthMin: number; relative: boolean; notes: string[]; error?: string; startMin?: number };

export const toMin = (hhmm: string): number | undefined => {
  const m = String(hhmm).match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (!m) return undefined;
  let h = Number(m[1]);
  if (m[3]?.toLowerCase() === "pm" && h < 12) h += 12;
  if (m[3]?.toLowerCase() === "am" && h === 12) h = 0;
  return h * 60 + Number(m[2]);
};
export const fmtClock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const fmtRel = (min: number) => `T+${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

export function buildSchedule(st: FactState, judgingMinutes: number, hasFood: boolean): ScheduleResult {
  const notes: string[] = [];
  const length = Number(st.event.duration_min);
  if (!length) return { blocks: [], lengthMin: 0, relative: true, notes, error: "event length not stated in any message" };

  // Policy blocks; a message break with the same name overrides the policy length.
  const override = (name: string, dflt: number) => {
    const k = Object.keys(st.breaks).find((b) => b.includes(name));
    return k ? st.breaks[k].minutes : dflt;
  };
  const opening = override("opening", SCHEDULE_POLICY.opening);
  const closing = override("closing", SCHEDULE_POLICY.closing);
  const lunch = hasFood ? override("lunch", SCHEDULE_POLICY.lunch) : 0;
  const breaks = Object.entries(st.breaks).filter(([k]) => !/opening|closing|lunch/.test(k));

  const fixed = opening + closing + lunch + judgingMinutes + breaks.reduce((s, [, b]) => s + b.minutes, 0);
  const build = length - fixed;
  const minBuild = Math.ceil(length * SCHEDULE_POLICY.minBuildShare);
  if (build < minBuild) {
    return { blocks: [], lengthMin: length, relative: true, notes, error: `only ${build} min left for building after fixed blocks (${fixed} min); policy minimum is ${minBuild} min` };
  }
  const b1 = Math.floor(build / 2);
  const seq: [string, number][] = [["Opening", opening], ["Build (part 1)", b1], ...breaks.map(([k, b]) => [cap(k) + " break", b.minutes] as [string, number])];
  if (lunch) seq.push(["Lunch", lunch]);
  seq.push(["Build (part 2)", build - b1], ["Judging", judgingMinutes], ["Closing + results", closing]);

  const startMin = st.event.start_time ? toMin(String(st.event.start_time)) : undefined;
  let t = 0;
  const blocks: Block[] = seq.filter(([, d]) => d > 0).map(([name, d]) => {
    const b: Block = { name, start: t, end: t + d };
    if (startMin !== undefined) b.clock = `${fmtClock(startMin + t)}-${fmtClock(startMin + t + d)}`;
    t += d;
    return b;
  });

  if (st.event.end_by) {
    const end = toMin(String(st.event.end_by));
    if (end !== undefined && startMin === undefined) notes.push(`no start time given; to end by ${st.event.end_by} the event must start no later than ${fmtClock(end - length)}`);
    if (end !== undefined && startMin !== undefined && startMin + length > end) {
      return { blocks, lengthMin: length, relative: false, notes, error: `ends at ${fmtClock(startMin + length)}, after the required end ${st.event.end_by}` };
    }
  }
  if (startMin === undefined) notes.push("times are relative (T+h:mm) because no message states a start time");
  return { blocks, lengthMin: length, relative: startMin === undefined, notes, startMin };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
