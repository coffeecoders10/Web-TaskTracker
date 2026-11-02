"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { ancestorsOf, orderedLeaves, type TaskIndex } from "@/lib/domain/tree";
import type { Task } from "@/lib/domain/types";
import ui from "@/components/ui/ui.module.css";
import { TaskRow } from "./TaskRow";
import { useCompleteTask } from "./useCompleteTask";
import { useLingering } from "./useLingering";
import styles from "./tasks.module.css";

type View = "todo" | "done";

type Group = {
  key: string;
  title: string;
  /** Progress of the whole top-level task, not just the rows shown. */
  done: number;
  total: number;
  tasks: { task: Task; trail: string }[];
};

const STANDALONE = "standalone";

function groupLeaves(index: TaskIndex, leaves: Task[]): Group[] {
  const groups = new Map<string, Group>();
  for (const leaf of leaves) {
    const trail = ancestorsOf(index, leaf.id);
    const root = trail[0];
    const key = root ? root.id : STANDALONE;
    let g = groups.get(key);
    if (!g) {
      const stats = root ? index.stats.get(root.id) : undefined;
      g = {
        key,
        title: root ? root.title : "Single tasks",
        done: stats?.done ?? 0,
        total: stats?.total ?? 0,
        tasks: [],
      };
      groups.set(key, g);
    }
    g.tasks.push({ task: leaf, trail: trail.slice(1).map((t) => t.title).join(" › ") });
  }
  // Standalone tasks last; projects keep hierarchy order.
  return [...groups.values()].sort(
    (a, b) => Number(a.key === STANDALONE) - Number(b.key === STANDALONE),
  );
}

export function TasksView() {
  const { index } = useDoc();
  const { openPicker } = useActions();
  const complete = useCompleteTask();
  const { lingering, hold } = useLingering();
  const [view, setView] = useState<View>("todo");

  const leaves = useMemo(() => orderedLeaves(index), [index]);
  const openCount = leaves.filter((t) => !t.done).length;
  const doneCount = leaves.length - openCount;

  const visible = useMemo(
    () =>
      leaves.filter((t) =>
        view === "todo" ? !t.done || lingering.has(t.id) : t.done,
      ),
    [leaves, view, lingering],
  );
  const groups = useMemo(() => groupLeaves(index, visible), [index, visible]);

  const toggle = useCallback(
    (id: string, done: boolean) => {
      const t = index.byId.get(id);
      if (!t) return;
      if (done && view === "todo") hold(id);
      complete(t, done);
    },
    [index, view, hold, complete],
  );

  return (
    <>
      <PageHeader
        title="Tasks"
        lead="Everything you can do right now."
        actions={
          openCount > 0 ? (
            <button type="button" className={ui.btn} onClick={openPicker}>
              <Icon name="shuffle" size={18} />
              Pick for me
            </button>
          ) : null
        }
      />

      {leaves.length > 0 ? (
        <div className={styles.tabs} role="tablist" aria-label="Task status">
          <button
            type="button"
            role="tab"
            id="tab-todo"
            aria-selected={view === "todo"}
            aria-controls="tasks-panel"
            className={styles.tab}
            onClick={() => setView("todo")}
          >
            To do <span className="nums">{openCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-done"
            aria-selected={view === "done"}
            aria-controls="tasks-panel"
            className={styles.tab}
            onClick={() => setView("done")}
          >
            Done <span className="nums">{doneCount}</span>
          </button>
        </div>
      ) : null}

      <div
        id="tasks-panel"
        role="tabpanel"
        aria-labelledby={view === "todo" ? "tab-todo" : "tab-done"}
        style={{ marginTop: "var(--s-6)" }}
      >
        {leaves.length === 0 ? (
          <EmptyState
            title="No tasks yet."
            text="Plan a goal and split it into steps. The steps you can act on appear here."
            action={{ href: "/plan", label: "Plan a task" }}
          />
        ) : groups.length === 0 ? (
          view === "todo" ? (
            <EmptyState
              title="All clear."
              text="Everything is done. Add something new from Plan."
              action={{ href: "/plan", label: "Plan more" }}
            />
          ) : (
            <EmptyState title="Nothing finished yet." text="Completed tasks collect here." />
          )
        ) : (
          groups.map((g) => (
            <section key={g.key} className={styles.group} aria-label={g.title}>
              <div className={styles.groupHead}>
                <div className={styles.groupTitleRow}>
                  <h2 className={styles.groupTitle}>{g.title}</h2>
                  {g.key !== STANDALONE ? (
                    <span className={styles.count}>
                      <span className="nums">{g.done}</span>/<span className="nums">{g.total}</span>
                    </span>
                  ) : null}
                </div>
                {g.key !== STANDALONE ? <Progress done={g.done} total={g.total} /> : null}
              </div>
              <ul className={styles.list}>
                {g.tasks.map(({ task, trail }) => (
                  <TaskRow
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    trail={trail}
                    done={task.done}
                    leaving={view === "todo"}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
