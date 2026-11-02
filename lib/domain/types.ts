/**
 * The whole per-user document stored in Backbone's `db_query_dynamic` table
 * (one row per user, keyed by the authenticated `user_id`).
 *
 * Tasks are an adjacency list (`parentId`) so nesting depth is unbounded.
 * Only leaf tasks carry meaningful `done`; a parent's completion is always
 * derived from its descendants and never stored.
 */
export type Task = {
  id: string;
  parentId: string | null;
  title: string;
  notes: string;
  /** Meaningful for leaf tasks only. Forced to false when a task gains children. */
  done: boolean;
  /** Sort key among siblings (dense, 0..n-1 after every mutation). */
  order: number;
  createdAt: number;
  completedAt: number | null;
};

export type Activity = {
  id: string;
  title: string;
  order: number;
};

export type Prefs = {
  dailyEnabled: boolean;
};

export type UserDoc = {
  v: 1;
  prefs: Prefs;
  tasks: Task[];
  activities: Activity[];
  /** `YYYY-MM-DD` (user's local calendar day) -> ids of activities done that day. */
  log: Record<string, string[]>;
};

export const EMPTY_DOC: UserDoc = {
  v: 1,
  prefs: { dailyEnabled: true },
  tasks: [],
  activities: [],
  log: {},
};

export const LIMITS = {
  title: 200,
  notes: 2000,
  tasks: 5000,
  activities: 100,
} as const;

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
