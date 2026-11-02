import { shiftDateKey, weekdayOf } from "./dates";
import { isComplete, subtreeIds, type TaskIndex } from "./tree";
import type { UserDoc } from "./types";

export type DayStat = {
  date: string;
  /** Daily activities scheduled that day. */
  due: number;
  /** How many of those were checked off. */
  done: number;
  /** After today. */
  future: boolean;
};

/** Days since Monday for a date key (Mon = 0 .. Sun = 6). */
function mondayIndex(date: string): number {
  return (weekdayOf(date) + 6) % 7;
}

/**
 * Daily-goal results for `weeks` whole calendar weeks (Mon-Sun), ending with the
 * week that contains `today`. Past days judge today's activity list, since an
 * activity has no start date. Days before the first check-in count as untracked.
 */
export function dailyWeeks(doc: UserDoc, today: string, weeks: number): DayStat[] {
  const start = shiftDateKey(today, -mondayIndex(today) - 7 * (weeks - 1));
  const first = Object.keys(doc.log).reduce((min, k) => (k < min ? k : min), today);
  const out: DayStat[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = shiftDateKey(start, i);
    const dow = weekdayOf(date);
    const due =
      date < first ? [] : doc.activities.filter((a) => !a.days || a.days.includes(dow));
    const logged = new Set(doc.log[date] ?? []);
    out.push({
      date,
      due: due.length,
      done: due.filter((a) => logged.has(a.id)).length,
      future: date > today,
    });
  }
  return out;
}

const reached = (d: DayStat) => d.due > 0 && d.done === d.due;

/**
 * Days where every scheduled activity was done, and the current run of them.
 * Days with nothing scheduled neither extend nor break a streak, and a day that
 * isn't finished yet doesn't break it either.
 */
export function dailySummary(days: readonly DayStat[], today: string) {
  const past = days.filter((d) => !d.future);
  const goalDays = past.filter(reached).length;
  // Today only counts once it's complete; an unfinished day isn't a miss yet.
  const tracked = past.filter((d) => d.due > 0 && (d.date !== today || reached(d))).length;

  let streak = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const d = past[i];
    if (d.due === 0) continue;
    if (reached(d)) streak++;
    else if (d.date !== today) break;
  }
  return { goalDays, tracked, streak };
}

export type MainTaskDone = {
  id: string;
  title: string;
  /** When its last step was finished (ms), or null if unknown. */
  completedAt: number | null;
};

/**
 * Main (top-level) tasks only: how many are finished and which. Steps beneath a main
 * task don't count on their own. A main task finished when its last step was.
 */
export function mainTaskSummary(index: TaskIndex) {
  const completed: MainTaskDone[] = [];
  let open = 0;
  for (const root of index.children.get(null) ?? []) {
    if (!isComplete(index, root.id)) {
      open++;
      continue;
    }
    let at: number | null = null;
    for (const id of subtreeIds(index, root.id)) {
      const t = index.byId.get(id);
      if (t && t.completedAt !== null && (at === null || t.completedAt > at)) at = t.completedAt;
    }
    completed.push({ id: root.id, title: root.title, completedAt: at });
  }
  completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  return { completed, open };
}
