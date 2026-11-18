"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { localDateKey, weekdayOf } from "@/lib/domain/dates";
import styles from "./widget.module.css";

type Item = { id: string; title: string; done: boolean };

type Props = {
  username: string;
  today: string;
  tasks: Item[];
  daily: { id: string; title: string; days: number[] | null }[];
  doneToday: string[];
};

function readPicks(key: string, day: string): string[] {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? "null") as { day?: unknown; ids?: unknown } | null;
    if (p && p.day === day && Array.isArray(p.ids)) {
      return p.ids.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // Unreadable storage: show an empty list.
  }
  return [];
}

export function WidgetView({ username, today: serverToday, tasks, daily, doneToday }: Props) {
  const router = useRouter();
  const [today, setToday] = useState(serverToday);
  const [pickIds, setPickIds] = useState<string[]>([]);
  const picksKey = `today-picks:${username}`;

  // Same picks the app keeps in localStorage; re-read on change and on a slow tick.
  useEffect(() => {
    const sync = () => {
      const day = localDateKey();
      setToday(day);
      setPickIds(readPicks(picksKey, day));
    };
    sync();
    const refresh = () => {
      sync();
      router.refresh();
    };
    const timer = window.setInterval(refresh, 60_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [picksKey, router]);

  // Open items first so the cut-off hides finished work, not what's left to do.
  const items = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const done = new Set(doneToday);
    const dow = weekdayOf(today);
    const all: Item[] = [
      ...pickIds.flatMap((id) => {
        const t = byId.get(id);
        return t ? [t] : [];
      }),
      ...daily
        .filter((a) => !a.days || a.days.includes(dow))
        .map((a) => ({ id: `d:${a.id}`, title: a.title, done: done.has(a.id) })),
    ];
    return [...all.filter((i) => !i.done), ...all.filter((i) => i.done)];
  }, [tasks, daily, doneToday, pickIds, today]);

  // Show as many rows as fit the window: measure one row, divide the free height.
  const listRef = useRef<HTMLUListElement>(null);
  const [fit, setFit] = useState(items.length);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const row = list.firstElementChild as HTMLElement | null;
      if (!row) return;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const space = list.clientHeight;
      const per = row.offsetHeight + gap;
      setFit(Math.max(1, Math.floor((space + gap) / per)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [items.length]);

  const hidden = Math.max(0, items.length - fit);
  // Reserve the last slot for the "+N more" line so it never overflows.
  const shown = hidden > 0 ? items.slice(0, Math.max(1, fit - 1)) : items;
  const more = items.length - shown.length;

  return (
    <main className={styles.widget} aria-label="Today's tasks">
      {items.length === 0 ? (
        <p className={styles.empty}>Nothing planned for today</p>
      ) : (
        <>
          <ul ref={listRef} className={styles.list}>
            {shown.map((i) => (
              <li key={i.id} className={styles.item} data-done={i.done || undefined}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.title}>{i.title}</span>
              </li>
            ))}
            {more > 0 ? <li className={styles.more}>+{more} more</li> : null}
          </ul>
        </>
      )}
    </main>
  );
}
