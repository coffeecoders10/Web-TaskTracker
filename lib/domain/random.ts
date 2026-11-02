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

/** Deterministic 32-bit hash of `seed` + `text` (FNV-1a), for stable pseudo-random ranking. */
function hash(seed: number, text: string): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Picks `count` items in a seeded pseudo-random order. Each item ranks on its own
 * id, so removing one from `items` only promotes the next; the rest stay put.
 */
export function pickStable<T extends { id: string }>(
  items: readonly T[],
  count: number,
  seed: number,
): T[] {
  return items
    .map((item) => ({ item, rank: hash(seed, item.id) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count)
    .map((x) => x.item);
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
