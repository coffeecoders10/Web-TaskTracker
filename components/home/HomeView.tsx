"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { TaskRow } from "@/components/tasks/TaskRow";
import { useCompleteTask } from "@/components/tasks/useCompleteTask";
import { Check } from "@/components/ui/Check";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { formatLongDate } from "@/lib/domain/dates";
import { ancestorsOf, incompleteLeaves, overallProgress } from "@/lib/domain/tree";
import ui from "@/components/ui/ui.module.css";
import rows from "@/components/tasks/tasks.module.css";
import styles from "./home.module.css";

const UP_NEXT = 5;

export function HomeView() {
  const { doc, index, today, focusId } = useDoc();
  const { dispatch, openPicker, setFocus } = useActions();
  const complete = useCompleteTask();

  const { weekday, rest } = formatLongDate(today);
  const progress = overallProgress(index);
  const open = incompleteLeaves(index);
  const focus = focusId ? index.byId.get(focusId) : undefined;
  const upNext = open.filter((t) => t.id !== focusId).slice(0, UP_NEXT);

  const showDaily = doc.prefs.dailyEnabled;
  const doneToday = new Set(doc.log[today] ?? []);
  const activities = [...doc.activities].sort((a, b) => a.order - b.order);
  const dailyDone = activities.filter((a) => doneToday.has(a.id)).length;

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
        <h1 className={styles.weekday}>{weekday}</h1>
        <p className={styles.date}>{rest}</p>
        {progress.total > 0 ? (
          <div className={styles.overall}>
            <Progress done={progress.done} total={progress.total} />
            <p className={styles.overallText}>
              <span className="nums">{progress.done}</span> of{" "}
              <span className="nums">{progress.total}</span> tasks done
            </p>
          </div>
        ) : null}
      </header>

      {focus && !focus.done ? (
        <section className={styles.section} aria-labelledby="focus-h">
          <h2 id="focus-h" className={styles.sectionTitle}>
            Working on
          </h2>
          <ul className={rows.list}>
            <TaskRow
              id={focus.id}
              title={focus.title}
              trail={trailOf(focus.id)}
              done={false}
              onToggle={toggleTask}
            />
          </ul>
          <button type="button" className={styles.textBtn} onClick={() => setFocus(null)}>
            Stop focusing
          </button>
        </section>
      ) : null}

      {showDaily ? (
        <section className={styles.section} aria-labelledby="daily-h">
          <div className={styles.sectionHead}>
            <h2 id="daily-h" className={styles.sectionTitle}>
              Daily
            </h2>
            {activities.length > 0 ? (
              <span className={styles.sectionMeta}>
                <span className="nums">{dailyDone}</span> of{" "}
                <span className="nums">{activities.length}</span>
              </span>
            ) : null}
          </div>
          {activities.length > 0 ? (
            <ul className={rows.list}>
              {activities.map((a) => {
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
            <p className={styles.hint}>
              Small things you want to do every day.{" "}
              <Link href="/daily" className={styles.link}>
                Add your first
              </Link>
            </p>
          )}
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="next-h">
        <div className={styles.sectionHead}>
          <h2 id="next-h" className={styles.sectionTitle}>
            Up next
          </h2>
          {open.length > 0 ? (
            <button type="button" className={`${ui.btn} ${styles.pickBtn}`} onClick={openPicker}>
              <Icon name="shuffle" size={18} />
              Pick for me
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
        ) : (
          <>
            <ul className={rows.list}>
              {upNext.map((t) => (
                <TaskRow
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  trail={trailOf(t.id)}
                  done={t.done}
                  onToggle={toggleTask}
                />
              ))}
            </ul>
            {open.length > upNext.length + (focus ? 1 : 0) ? (
              <Link href="/tasks" className={styles.more}>
                All <span className="nums">{open.length}</span> open tasks
                <Icon name="chevron" size={16} />
              </Link>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
