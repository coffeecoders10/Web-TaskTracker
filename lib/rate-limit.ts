import "server-only";

/**
 * Backbone's auth endpoints have no rate limiting (see sop-user-auth.md), so failed
 * sign-ins are throttled here. In-memory and per server instance: it slows down
 * online guessing against one account, it isn't a distributed limiter.
 */

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 6;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length > 0) failures.set(key, list);
  else failures.delete(key);
  return list;
}

/** Seconds until another attempt is allowed, or 0. */
export function loginRetryAfter(key: string): number {
  const now = Date.now();
  const list = recent(key, now);
  if (list.length < MAX_FAILURES) return 0;
  return Math.ceil((list[0] + WINDOW_MS - now) / 1000);
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const list = recent(key, now);
  list.push(now);
  failures.set(key, list);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
