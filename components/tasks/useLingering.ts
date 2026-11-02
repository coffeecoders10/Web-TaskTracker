"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps just-completed rows in a "To do" list for a moment so the check can be
 * seen (and undone) before the row slides away.
 */
export function useLingering(delayMs = 1100) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());

  const hold = useCallback(
    (id: string) => {
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      setIds((prev) => new Set(prev).add(id));
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, delayMs),
      );
    },
    [delayMs],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) window.clearTimeout(t);
      map.clear();
    };
  }, []);

  return { lingering: ids, hold };
}
