/** Uniform random integer in [0, n) using rejection sampling (no modulo bias). */
export function randomInt(n: number): number {
  if (n <= 1) return 0;
  const max = 0x1_0000_0000;
  const limit = max - (max % n);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

/**
 * Picks one item with equal probability. When there's more than one candidate,
 * the item whose id equals `avoidId` is excluded so a re-roll always changes.
 */
export function pickRandom<T extends { id: string }>(
  items: readonly T[],
  avoidId?: string | null,
): T | null {
  if (items.length === 0) return null;
  const pool =
    items.length > 1 && avoidId ? items.filter((i) => i.id !== avoidId) : items;
  return pool[randomInt(pool.length)] ?? null;
}
