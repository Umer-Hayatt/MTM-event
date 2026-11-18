// Shared shapes for the planner. Pure types: no logic, no facts.

export type Role = "authority" | "venue" | "caterer" | "finance" | "judging_coordinator" | "participant" | "unknown";
export type Area = "reading" | "venue" | "schedule" | "food" | "judging" | "budget";

/** One raw message as cut from the input file. `seq` is arrival order across the whole session. */
export type RawMessage = { id: number; seq: number; text: string; hash: string };

/** A fact as the reader extracts it. The model never does arithmetic: `add`/`remove` are applied by code. */
export type Fact = { key: string; subject?: string | null; action: "set" | "add" | "remove"; value?: unknown; unit?: string | null };

/** A hard (or soft) rule a message imposes, checked against the target registry in solver.ts. */
export type Constraint = { area: Area; target: string; op: "==" | "!=" | "<" | "<=" | ">" | ">=" | "has"; value: unknown; hard: boolean; text?: string };

/** An optional ask (e.g. a DJ). Always soft: included only if the budget allows. */
export type Request = { area: Area; item: string; cost: number };

/** What the reader returns for one message. */
export type ReadMessage = {
  id: number;
  sender_role: Role;
  date: string | null;
  relevant: boolean;
  facts: Fact[];
  constraints: Constraint[];
  requests: Request[];
};

export type MessageStatus = "accepted" | "superseded" | "ignored" | "rejected" | "duplicate";

export type MessageRecord = RawMessage & {
  read?: ReadMessage;
  status: MessageStatus;
  reason?: string;
};

export type Option = { name: string; price: number; seats?: number; attrs: string[]; source: number };

/** Current world after folding every accepted message (ledger.ts). */
export type FactState = {
  event: Record<string, number | string>;     // students, teams, team_size, duration_min, start_time, end_by, budget
  groups: Record<string, number>;             // on-site people groups (staff, volunteers...)
  venues: Record<string, Option>;
  foods: Record<string, Option>;
  judge: Record<string, number>;              // confirmed, fee, min_per_team, max_teams
  spent: Record<string, number>;              // already paid
  required: Record<string, number>;           // must be paid
  breaks: Record<string, { minutes: number; at?: string }>;
  constraints: (Constraint & { source: number })[];
  requests: (Request & { source: number })[];
  sources: Record<string, number>;            // "key|subject" -> message id that set it (for UI chips)
};

export type Block = { name: string; start: number; end: number; clock?: string };

export type Plan = {
  headcount: { total: number; parts: Record<string, number> };
  teams: number;
  venue: Option;
  food: Option & { boxes: number; cost: number };
  judging: { needed: number; confirmed: number; fee: number; cost: number; minutesPerTeam: number; teamsPerJudge: number; blockMinutes: number };
  schedule: { blocks: Block[]; lengthMin: number; relative: boolean; notes: string[] };
  budget: { cap: number; lines: { label: string; amount: number; source?: number }[]; total: number; remaining: number };
  extras: { item: string; cost: number; included: boolean; why: string }[];
  checks: { name: string; ok: boolean; detail: string }[];
  unhandled: string[];
  ranking: string;
};

export type TraceCall = {
  n: number;
  model: string;
  area: Area;
  input: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
  ok: boolean;
  ms: number;
  note?: string;
};

export type TraceLine = { kind: "call"; call: TraceCall } | { kind: "log"; text: string };
