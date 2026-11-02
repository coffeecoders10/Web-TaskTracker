import type { Task } from "./types";

export type TaskStats = { done: number; total: number };

export type TaskIndex = {
  byId: Map<string, Task>;
  /** Children of each parent id (`null` key = top level), sorted by `order`. */
  children: Map<string | null, Task[]>;
  /** Leaf-count progress for every task. A leaf counts as 1 (done or not). */
  stats: Map<string, TaskStats>;
};

/**
 * Builds lookups and per-task progress in one pass. Iterative (no recursion), so
 * arbitrarily deep hierarchies can't overflow the call stack, and tolerant of
 * corrupt data: orphans and cycles are simply unreachable from the roots.
 */
export function indexTasks(tasks: readonly Task[]): TaskIndex {
  const byId = new Map<string, Task>();
  for (const t of tasks) byId.set(t.id, t);

  const children = new Map<string | null, Task[]>();
  for (const t of tasks) {
    const key = t.parentId !== null && byId.has(t.parentId) ? t.parentId : null;
    const list = children.get(key);
    if (list) list.push(t);
    else children.set(key, [t]);
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order);

  const stats = new Map<string, TaskStats>();
  // Pre-order walk from the roots, then fold stats bottom-up in reverse.
  const order: Task[] = [];
  const stack: Task[] = [...(children.get(null) ?? [])];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const t = stack.pop()!;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    order.push(t);
    const kids = children.get(t.id);
    if (kids) for (const k of kids) stack.push(k);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const t = order[i];
    const kids = children.get(t.id);
    if (!kids || kids.length === 0) {
      stats.set(t.id, { done: t.done ? 1 : 0, total: 1 });
      continue;
    }
    let done = 0;
    let total = 0;
    for (const k of kids) {
      const s = stats.get(k.id);
      if (s) {
        done += s.done;
        total += s.total;
      }
    }
    stats.set(t.id, { done, total });
  }

  return { byId, children, stats };
}

export function isLeaf(index: TaskIndex, id: string): boolean {
  return (index.children.get(id)?.length ?? 0) === 0;
}

/** A task is complete when every descendant leaf is complete (a leaf: itself). */
export function isComplete(index: TaskIndex, id: string): boolean {
  const s = index.stats.get(id);
  return !!s && s.total > 0 && s.done === s.total;
}

/** Ids of `id` and everything beneath it. */
export function subtreeIds(index: TaskIndex, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    out.push(cur);
    for (const k of index.children.get(cur) ?? []) stack.push(k.id);
  }
  return out;
}

/** Titles of ancestors, outermost first (excludes the task itself). */
export function ancestorsOf(index: TaskIndex, id: string): Task[] {
  const out: Task[] = [];
  const seen = new Set<string>([id]);
  let cur = index.byId.get(id);
  while (cur && cur.parentId !== null) {
    const parent = index.byId.get(cur.parentId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    out.push(parent);
    cur = parent;
  }
  return out.reverse();
}

/** Leaf tasks in hierarchy order (depth-first, siblings by `order`). */
export function orderedLeaves(index: TaskIndex): Task[] {
  const out: Task[] = [];
  const stack: Task[] = [...(index.children.get(null) ?? [])].reverse();
  const seen = new Set<string>();
  while (stack.length > 0) {
    const t = stack.pop()!;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const kids = index.children.get(t.id);
    if (!kids || kids.length === 0) out.push(t);
    else for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return out;
}

export function incompleteLeaves(index: TaskIndex): Task[] {
  return orderedLeaves(index).filter((t) => !t.done);
}

export function overallProgress(index: TaskIndex): TaskStats {
  let done = 0;
  let total = 0;
  for (const root of index.children.get(null) ?? []) {
    const s = index.stats.get(root.id);
    if (s) {
      done += s.done;
      total += s.total;
    }
  }
  return { done, total };
}
