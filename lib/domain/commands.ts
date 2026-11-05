import { dayNumber, isDateKey } from "./dates";
import { indexTasks, subtreeIds } from "./tree";
import {
  DomainError,
  LIMITS,
  type Activity,
  type Task,
  type UserDoc,
} from "./types";

/**
 * Every mutation is a command. The client applies commands optimistically and the
 * server applies the same function to the stored document before persisting, so
 * both sides always agree. Commands are explicit ("set done = true"), never
 * toggles, which makes replays and retries idempotent.
 */
export type Command =
  | { type: "task.add"; id: string; parentId: string | null; title: string }
  | { type: "task.update"; id: string; title?: string; notes?: string }
  | { type: "task.setDone"; id: string; done: boolean }
  | { type: "task.setOrdered"; id: string; ordered: boolean }
  | { type: "task.delete"; id: string }
  | { type: "task.move"; id: string; parentId: string | null; index: number }
  | { type: "activity.add"; id: string; title: string }
  | { type: "activity.rename"; id: string; title: string }
  | { type: "activity.delete"; id: string }
  | { type: "activity.move"; id: string; index: number }
  | { type: "activity.setDays"; id: string; days: number[] }
  | { type: "activity.setDone"; id: string; date: string; done: boolean }
  | { type: "prefs.set"; dailyEnabled: boolean };

const ID = /^[A-Za-z0-9_-]{6,32}$/;

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

function cleanTitle(raw: unknown): string {
  if (typeof raw !== "string") throw new DomainError("A name is required.");
  const title = raw.replace(/\s+/g, " ").trim();
  if (!title) throw new DomainError("A name is required.");
  if (title.length > LIMITS.title) {
    throw new DomainError(`Names can be up to ${LIMITS.title} characters.`);
  }
  return title;
}

function cleanNotes(raw: unknown): string {
  if (typeof raw !== "string") throw new DomainError("Notes must be text.");
  const notes = raw.trim();
  if (notes.length > LIMITS.notes) {
    throw new DomainError(`Notes can be up to ${LIMITS.notes} characters.`);
  }
  return notes;
}

function checkNewId(id: unknown, existing: readonly { id: string }[]): string {
  if (typeof id !== "string" || !ID.test(id)) throw new DomainError("Invalid id.");
  if (existing.some((e) => e.id === id)) throw new DomainError("Id already exists.");
  return id;
}

/** Valid, sorted, unique weekdays; `undefined` when that means "every day". */
function cleanDays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) throw new DomainError("Pick at least one day.");
  const days = [...new Set(raw)]
    .filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (days.length === 0) throw new DomainError("Pick at least one day.");
  return days.length === 7 ? undefined : days;
}

function clampIndex(index: unknown, length: number): number {
  if (typeof index !== "number" || !Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.trunc(index)));
}

/** Rewrites `order` of a sibling group to 0..n-1 following the given sequence. */
function renumber<T extends { id: string; order: number }>(
  all: T[],
  sequence: readonly string[],
): T[] {
  const rank = new Map(sequence.map((id, i) => [id, i]));
  return all.map((item) => {
    const r = rank.get(item.id);
    return r === undefined || r === item.order ? item : { ...item, order: r };
  });
}

function siblingIds(tasks: readonly Task[], parentId: string | null): string[] {
  return tasks
    .filter((t) => t.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);
}

/** Only dates near "now" are accepted, which covers every timezone on Earth. */
function checkDate(date: unknown, now: number): string {
  if (!isDateKey(date)) throw new DomainError("Invalid date.");
  const utcToday = new Date(now).toISOString().slice(0, 10);
  if (Math.abs(dayNumber(date) - dayNumber(utcToday)) > 2) {
    throw new DomainError("That date is out of range.");
  }
  return date;
}

export function applyCommand(doc: UserDoc, cmd: Command, now: number): UserDoc {
  switch (cmd.type) {
    case "task.add": {
      if (doc.tasks.length >= LIMITS.tasks) throw new DomainError("Task limit reached.");
      const id = checkNewId(cmd.id, doc.tasks);
      const title = cleanTitle(cmd.title);
      const parentId = cmd.parentId ?? null;
      if (parentId !== null && !doc.tasks.some((t) => t.id === parentId)) {
        throw new DomainError("Parent task not found.");
      }
      const siblings = siblingIds(doc.tasks, parentId);
      const task: Task = {
        id,
        parentId,
        title,
        notes: "",
        done: false,
        order: siblings.length,
        createdAt: now,
        completedAt: null,
      };
      // Gaining a child turns a leaf into a container; its own flag no longer applies.
      const tasks = doc.tasks.map((t) =>
        t.id === parentId && (t.done || t.completedAt !== null)
          ? { ...t, done: false, completedAt: null }
          : t,
      );
      return { ...doc, tasks: [...tasks, task] };
    }

    case "task.update": {
      const target = doc.tasks.find((t) => t.id === cmd.id);
      if (!target) throw new DomainError("Task not found.");
      const next: Task = {
        ...target,
        title: cmd.title === undefined ? target.title : cleanTitle(cmd.title),
        notes: cmd.notes === undefined ? target.notes : cleanNotes(cmd.notes),
      };
      return { ...doc, tasks: doc.tasks.map((t) => (t.id === next.id ? next : t)) };
    }

    case "task.setDone": {
      const index = indexTasks(doc.tasks);
      const target = index.byId.get(cmd.id);
      if (!target) throw new DomainError("Task not found.");
      if ((index.children.get(cmd.id)?.length ?? 0) > 0) {
        throw new DomainError("Only tasks without subtasks can be completed.");
      }
      const done = cmd.done === true;
      if (target.done === done) return doc;
      return {
        ...doc,
        tasks: doc.tasks.map((t) =>
          t.id === cmd.id ? { ...t, done, completedAt: done ? now : null } : t,
        ),
      };
    }

    case "task.setOrdered": {
      const target = doc.tasks.find((t) => t.id === cmd.id);
      if (!target) throw new DomainError("Task not found.");
      const ordered = cmd.ordered === true;
      if ((target.ordered === true) === ordered) return doc;
      return {
        ...doc,
        tasks: doc.tasks.map((t) => {
          if (t.id !== cmd.id) return t;
          const next = { ...t };
          if (ordered) next.ordered = true;
          else delete next.ordered;
          return next;
        }),
      };
    }

    case "task.delete": {
      const index = indexTasks(doc.tasks);
      const target = index.byId.get(cmd.id);
      if (!target) throw new DomainError("Task not found.");
      const doomed = new Set(subtreeIds(index, cmd.id));
      const remaining = doc.tasks.filter((t) => !doomed.has(t.id));
      const seq = siblingIds(remaining, target.parentId);
      return { ...doc, tasks: renumber(remaining, seq) };
    }

    case "task.move": {
      const index = indexTasks(doc.tasks);
      const target = index.byId.get(cmd.id);
      if (!target) throw new DomainError("Task not found.");
      const parentId = cmd.parentId ?? null;
      if (parentId !== null) {
        if (!index.byId.has(parentId)) throw new DomainError("Destination not found.");
        // A task can't move into itself or anything beneath it (that would orphan a loop).
        if (subtreeIds(index, cmd.id).includes(parentId)) {
          throw new DomainError("A task can't be moved inside itself.");
        }
      }
      const oldParent = target.parentId;
      const destination = siblingIds(doc.tasks, parentId).filter((id) => id !== cmd.id);
      const at = clampIndex(cmd.index, destination.length);
      destination.splice(at, 0, cmd.id);

      let tasks = doc.tasks.map((t) => {
        if (t.id === cmd.id) return { ...t, parentId };
        if (t.id === parentId && (t.done || t.completedAt !== null)) {
          return { ...t, done: false, completedAt: null };
        }
        return t;
      });
      tasks = renumber(tasks, destination);
      if (oldParent !== parentId) {
        tasks = renumber(tasks, siblingIds(tasks, oldParent));
      }
      return { ...doc, tasks };
    }

    case "activity.add": {
      if (doc.activities.length >= LIMITS.activities) {
        throw new DomainError("Activity limit reached.");
      }
      const id = checkNewId(cmd.id, doc.activities);
      const activity: Activity = {
        id,
        title: cleanTitle(cmd.title),
        order: doc.activities.length,
      };
      return { ...doc, activities: [...doc.activities, activity] };
    }

    case "activity.rename": {
      if (!doc.activities.some((a) => a.id === cmd.id)) {
        throw new DomainError("Activity not found.");
      }
      const title = cleanTitle(cmd.title);
      return {
        ...doc,
        activities: doc.activities.map((a) => (a.id === cmd.id ? { ...a, title } : a)),
      };
    }

    case "activity.delete": {
      if (!doc.activities.some((a) => a.id === cmd.id)) {
        throw new DomainError("Activity not found.");
      }
      const remaining = [...doc.activities]
        .filter((a) => a.id !== cmd.id)
        .sort((a, b) => a.order - b.order)
        .map((a, i) => ({ ...a, order: i }));
      const log: UserDoc["log"] = {};
      for (const [date, ids] of Object.entries(doc.log)) {
        const kept = ids.filter((id) => id !== cmd.id);
        if (kept.length > 0) log[date] = kept;
      }
      return { ...doc, activities: remaining, log };
    }

    case "activity.move": {
      const sorted = [...doc.activities].sort((a, b) => a.order - b.order);
      if (!sorted.some((a) => a.id === cmd.id)) throw new DomainError("Activity not found.");
      const seq = sorted.map((a) => a.id).filter((id) => id !== cmd.id);
      seq.splice(clampIndex(cmd.index, seq.length), 0, cmd.id);
      return { ...doc, activities: renumber(doc.activities, seq) };
    }

    case "activity.setDays": {
      if (!doc.activities.some((a) => a.id === cmd.id)) {
        throw new DomainError("Activity not found.");
      }
      const days = cleanDays(cmd.days);
      return {
        ...doc,
        activities: doc.activities.map((a) => {
          if (a.id !== cmd.id) return a;
          const next = { ...a };
          if (days) next.days = days;
          else delete next.days;
          return next;
        }),
      };
    }

    case "activity.setDone": {
      if (!doc.activities.some((a) => a.id === cmd.id)) {
        throw new DomainError("Activity not found.");
      }
      const date = checkDate(cmd.date, now);
      const current = doc.log[date] ?? [];
      const has = current.includes(cmd.id);
      if (cmd.done === has) return doc;
      const next = cmd.done ? [...current, cmd.id] : current.filter((id) => id !== cmd.id);
      const log = { ...doc.log };
      if (next.length > 0) log[date] = next;
      else delete log[date];
      return { ...doc, log };
    }

    case "prefs.set": {
      return { ...doc, prefs: { ...doc.prefs, dailyEnabled: cmd.dailyEnabled === true } };
    }

    default: {
      throw new DomainError("Unknown command.");
    }
  }
}

/**
 * Coerces whatever was stored into a valid document. Never trusts shape, so a
 * hand-edited or older document can't crash rendering.
 */
export function normalizeDoc(raw: unknown): UserDoc {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const prefsSrc = (src.prefs && typeof src.prefs === "object" ? src.prefs : {}) as Record<
    string,
    unknown
  >;

  const tasks: Task[] = [];
  const seenTasks = new Set<string>();
  if (Array.isArray(src.tasks)) {
    for (const t of src.tasks) {
      if (!t || typeof t !== "object") continue;
      const r = t as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.title !== "string" || seenTasks.has(r.id)) continue;
      seenTasks.add(r.id);
      const task: Task = {
        id: r.id,
        parentId: typeof r.parentId === "string" ? r.parentId : null,
        title: r.title,
        notes: typeof r.notes === "string" ? r.notes : "",
        done: r.done === true,
        order: typeof r.order === "number" ? r.order : tasks.length,
        createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
        completedAt: typeof r.completedAt === "number" ? r.completedAt : null,
      };
      if (r.ordered === true) task.ordered = true;
      tasks.push(task);
    }
  }

  for (const t of tasks) {
    if (t.parentId !== null && !seenTasks.has(t.parentId)) t.parentId = null;
  }

  const activities: Activity[] = [];
  const seenActs = new Set<string>();
  if (Array.isArray(src.activities)) {
    for (const a of src.activities) {
      if (!a || typeof a !== "object") continue;
      const r = a as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.title !== "string" || seenActs.has(r.id)) continue;
      seenActs.add(r.id);
      const act: Activity = {
        id: r.id,
        title: r.title,
        order: typeof r.order === "number" ? r.order : activities.length,
      };
      if (Array.isArray(r.days)) {
        const days = [...new Set(r.days)]
          .filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
          .sort((a, b) => a - b);
        if (days.length > 0 && days.length < 7) act.days = days;
      }
      activities.push(act);
    }
  }

  const log: UserDoc["log"] = {};
  if (src.log && typeof src.log === "object") {
    for (const [date, ids] of Object.entries(src.log as Record<string, unknown>)) {
      if (!isDateKey(date) || !Array.isArray(ids)) continue;
      const valid = ids.filter((id): id is string => typeof id === "string" && seenActs.has(id));
      if (valid.length > 0) log[date] = [...new Set(valid)];
    }
  }

  return {
    v: 1,
    prefs: { dailyEnabled: prefsSrc.dailyEnabled !== false },
    tasks,
    activities,
    log,
  };
}
