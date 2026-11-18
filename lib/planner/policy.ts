// Every PRODUCT RULE lives here. These are our decisions, not facts from the pack.
// Each rule is printed in the trace when it is applied, so a judge can audit it.
import type { Area, Role } from "./types.ts";

/** Which sender roles may change which fact keys. `authority` (e.g. dean, approver) may change anything. */
export const OWNERSHIP: Record<string, Role[]> = {
  "event.": ["authority", "organiser"],
  "people.group": ["authority"],
  "venue.option": ["venue", "authority", "organiser"],
  "food.option": ["caterer", "authority", "organiser"],
  "judge.": ["judging_coordinator", "authority", "organiser"],
  "spent.item": ["finance", "authority"],
  "cost.required": ["finance", "authority"],
  "schedule.break": ["authority"],
};

/** Which roles may impose a HARD constraint on which area. */
export const CONSTRAINT_OWNERS: Record<Area, Role[]> = {
  reading: ["authority"],
  venue: ["authority", "venue"],
  food: ["authority", "caterer"],
  judging: ["authority", "judging_coordinator"],
  budget: ["authority", "finance"],
  schedule: ["authority"],
};

/** Values the system COMPUTES. Nobody can set them by message; a message that tries is rejected. */
export const DERIVED_KEYS = ["food.boxes", "judges.count", "venue.capacity", "total.cost", "headcount"];

/** Schedule blocks we add by policy (minutes). A message can override them via schedule.break with the same name. */
export const SCHEDULE_POLICY = { opening: 10, lunch: 30, closing: 15, minBuildShare: 0.4 };

/** Above this many optional requests we stop enumerating subsets (2^n) and take them greedily. */
export const MAX_REQUESTS_ENUMERATED = 8;

/** Fresh run if the file holds at least this many messages; packs are ~10, updates arrive one at a time. */
export const FRESH_RUN_MIN_MESSAGES = 3;

/** Hard cap on model calls during an update (brief: at most 5). Full run cap keeps us honest too. */
export const UPDATE_CALL_LIMIT = 5;
export const FULL_RUN_CALL_LIMIT = 6;

export const POLICY_TEXT = [
  "headcount = students + every on-site group + judges NEEDED (not confirmed)",
  "judges needed = ceil(teams / max teams per judge); judges paid = needed",
  "venue must seat the full headcount; nice-to-haves only break ties",
  "rank valid plans: best food tier -> most optional requests -> lowest cost -> most seats",
  `schedule: opening ${SCHEDULE_POLICY.opening}m, build, breaks, lunch ${SCHEDULE_POLICY.lunch}m, build, judging, closing ${SCHEDULE_POLICY.closing}m; build >= ${SCHEDULE_POLICY.minBuildShare * 100}% of length`,
];

/** Human in the loop: a missing fact marks its section TBA (plan still built) and asks the organiser.
 *  Only a missing headcount (students/teams) blocks the whole plan, because nothing can be computed without it. */
export const GAP_POLICY_TEXT = "missing fact -> section shown as TBA, rest of the plan still built; organiser asked to answer, keep TBA, or ignore (answers outrank everyone but authority, 0 model calls)";

export function ownersFor(key: string): Role[] {
  for (const [prefix, roles] of Object.entries(OWNERSHIP)) if (key.startsWith(prefix)) return roles;
  return [];
}
