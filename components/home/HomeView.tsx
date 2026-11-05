"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { TaskRow } from "@/components/tasks/TaskRow";
import { useCompleteTask } from "@/components/tasks/useCompleteTask";
import { Check } from "@/components/ui/Check";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { formatLongDate, weekdayOf } from "@/lib/domain/dates";
import { pickStable } from "@/lib/domain/random";
import { ancestorsOf, availableLeaves } from "@/lib/domain/tree";
import ui from "@/components/ui/ui.module.css";
import rows from "@/components/tasks/tasks.module.css";
import styles from "./home.module.css";

const UP_NEXT = 3;

/**
 * Seed for the Up next shuffle. Fixed on the server (so hydration matches), then
 * random per page load on the client; stable across re-renders so rows don't jump.
 */
let clientSeed: number | null = null;
const noopSubscribe = () => () => {};
const getClientSeed = () => (clientSeed ??= Math.floor(Math.random() * 0x1_0000_0000));
const getServerSeed = () => 0;

export function HomeView() {
  const { doc, index, today, todayIds } = useDoc();
  const { dispatch, openPicker, addToday, removeToday } = useActions();
  const complete = useCompleteTask();
  const [shuffles, setShuffles] = useState(0);
  const [seen, setSeen] = useState<readonly string[]>([]);
  const seed = useSyncExternalStore(noopSubscribe, getClientSeed, getServerSeed);

  const { weekday, rest } = formatLongDate(today);
  const open = availableLeaves(index);

  const picked = useMemo(() => new Set(todayIds), [todayIds]);
  const todayTasks = todayIds.flatMap((id) => {
    const t = index.byId.get(id);
    return t ? [t] : [];
  });

  const available = open.filter((t) => !picked.has(t.id));
  // A re-roll prefers tasks that weren't just on screen, topping up from those if short.
  const rollSeed = seed ^ Math.imul(shuffles, 0x9e3779b1);
  const fresh = available.filter((t) => !seen.includes(t.id));
  const stale = available.filter((t) => seen.includes(t.id));
  const upNext = [
    ...pickStable(fresh, UP_NEXT, rollSeed),
    ...pickStable(stale, UP_NEXT, rollSeed),
  ].slice(0, UP_NEXT);

  const showDaily = doc.prefs.dailyEnabled;
  const doneToday = new Set(doc.log[today] ?? []);
  const activities = [...doc.activities].sort((a, b) => a.order - b.order);
  const dayOfWeek = weekdayOf(today);
  const dueToday = activities.filter((a) => !a.days || a.days.includes(dayOfWeek));

  // One bar for everything on today's plate: picked tasks plus the daily items due today.
  const todayTotal = todayTasks.length + (showDaily ? dueToday.length : 0);
  const todayDoneCount =
    todayTasks.filter((t) => t.done).length +
    (showDaily ? dueToday.filter((a) => doneToday.has(a.id)).length : 0);

  const toggleTask = useCallback(
    (id: string, done: boolean) => {
      const t = index.byId.get(id);
      if (t) complete(t, done);
    },
    [index, complete],
  );

  const trailOf = (id: string) =>
    ancestorsOf(index, id)
      .map((t) => t.title)
      .join(" › ");

  return (
    <div className={styles.home}>
      <header className={styles.head}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.weekday}>{weekday}</h1>
            <p className={styles.date}>{rest}</p>
          </div>
          {open.length > 0 ? (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${styles.cta}`} onClick={openPicker}>
              <Icon name="shuffle" size={18} />
              Pick a task
            </button>
          ) : null}
        </div>
        {todayTotal > 0 ? (
          <div className={styles.overall}>
            <Progress done={todayDoneCount} total={todayTotal} />
            <p className={styles.overallText}>
              <span className="nums">{todayDoneCount}</span> of{" "}
              <span className="nums">{todayTotal}</span> done today
            </p>
          </div>
        ) : null}
      </header>

      {todayTasks.length > 0 || showDaily ? (
        <section className={`${styles.section} ${styles.todaySection}`} aria-labelledby="today-h">
          <div className={styles.sectionHead}>
            <h2 id="today-h" className={styles.sectionTitle}>
              Today
            </h2>
          </div>
          {todayTasks.length > 0 ? (
            <ul className={rows.list}>
              {todayTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  trail={trailOf(t.id)}
                  done={t.done}
                  onToggle={toggleTask}
                  onRemove={removeToday}
                />
              ))}
            </ul>
          ) : null}

          {showDaily && activities.length > 0 ? (
            <>
              {todayTasks.length > 0 ? <h3 className={styles.subTitle}>Daily</h3> : null}
              {dueToday.length > 0 ? (
                <ul className={rows.list}>
                  {dueToday.map((a) => {
                    const done = doneToday.has(a.id);
                    return (
                      <li key={a.id} className={rows.item}>
                        <div className={rows.itemInner}>
                          <div className={rows.row}>
                            <Check
                              checked={done}
                              label={done ? `Mark "${a.title}" as not done` : `Mark "${a.title}" as done`}
                              onChange={(next) =>
                                dispatch({ type: "activity.setDone", id: a.id, date: today, done: next })
                              }
                            />
                            <div className={rows.text}>
                              <span className={rows.title} data-done={done || undefined}>
                                {a.title}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.hint}>Nothing daily is scheduled for today.</p>
              )}
            </>
          ) : null}

          {showDaily && activities.length === 0 && todayTasks.length === 0 ? (
            <p className={styles.hint}>
              Small things you want to do every day.{" "}
              <Link href="/plan?tab=daily" className={styles.link}>
                Add your first
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={`${styles.section} ${styles.nextSection}`} aria-labelledby="next-h">
        <div className={`${styles.sectionHead} ${styles.sectionHeadStart}`}>
          <h2 id="next-h" className={styles.sectionTitle}>
            Up next
          </h2>
          {available.length > UP_NEXT ? (
            <button
              type="button"
              className={styles.reroll}
              onClick={() => {
                setSeen(upNext.map((t) => t.id));
                setShuffles((n) => n + 1);
              }}
              aria-label="Show three different tasks"
              title="Show different tasks"
            >
              <Icon name="refresh" size={16} />
            </button>
          ) : null}
        </div>

        {index.byId.size === 0 ? (
          <EmptyState
            title="Nothing planned yet."
            text="Break something big into small steps and they'll show up here."
            action={{ href: "/plan", label: "Plan a task" }}
          />
        ) : open.length === 0 ? (
          <EmptyState
            title="All clear."
            text="Every task is done. Enjoy the quiet, or add what's next."
            action={{ href: "/plan", label: "Plan more" }}
          />
        ) : available.length === 0 ? (
          <p className={styles.hint}>Everything left is already on your list for today.</p>
        ) : (
          <>
            <ul className={rows.list}>
              {upNext.map((t) => (
                <li key={t.id} className={rows.item}>
                  <div className={rows.itemInner}>
                    <div className={rows.row}>
                      <div className={rows.text}>
                        <span className={rows.title}>{t.title}</span>
                        <span className={rows.trail}>{trailOf(t.id)}</span>
                      </div>
                      <button
                        type="button"
                        className={rows.pick}
                        aria-label={`Add "${t.title}" to today`}
                        onClick={() => addToday(t.id)}
                      >
                        <Icon name="bookmark" size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/tasks" className={styles.more}>
              All open tasks
              <Icon name="chevron" size={16} />
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
