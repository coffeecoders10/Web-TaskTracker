"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { ancestorsOf, isComplete, orderedLeaves, type TaskIndex } from "@/lib/domain/tree";
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

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  const leaves = useMemo(() => orderedLeaves(index), [index]);
  const openCount = leaves.filter((t) => !t.done).length;
  const doneCount = leaves.length - openCount;

  // "To do" keeps finished steps (crossed out) until their whole main task is done;
  // a just-finished main task lingers briefly so it can still be undone.
  const visible = useMemo(() => {
    if (view === "done") return leaves.filter((t) => t.done);
    const rootOf = (id: string) => ancestorsOf(index, id)[0];
    const lingeringRoots = new Set<string>();
    for (const id of lingering) {
      const root = rootOf(id);
      if (root) lingeringRoots.add(root.id);
    }
    return leaves.filter((t) => {
      const root = rootOf(t.id);
      if (!root) return !t.done || lingering.has(t.id);
      return !isComplete(index, root.id) || lingeringRoots.has(root.id);
    });
  }, [index, leaves, view, lingering]);
  const groups = useMemo(() => groupLeaves(index, visible), [index, visible]);

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));

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
              Pick a task
            </button>
          ) : null
        }
      />

      {leaves.length > 0 ? (
        <div className={styles.tabsRow}>
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
          {groups.length > 1 ? (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleAll}
              aria-label={allCollapsed ? "Expand all tasks" : "Collapse all tasks"}
              title={allCollapsed ? "Expand all" : "Collapse all"}
            >
              <Icon name={allCollapsed ? "expand" : "collapse"} size={20} />
            </button>
          ) : null}
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
          groups.map((g) => {
            const isOpen = !collapsed.has(g.key);
            // Rows slide out only once their whole main task is finished.
            const leaving = view === "todo" && (g.key === STANDALONE || g.done === g.total);
            return (
              <section key={g.key} className={styles.group} aria-label={g.title}>
                <div className={styles.groupHead}>
                  <div className={styles.groupTitleRow}>
                    <h2 className={styles.groupTitle}>
                      <button
                        type="button"
                        className={styles.groupToggle}
                        aria-expanded={isOpen}
                        aria-controls={`group-${g.key}`}
                        onClick={() => toggleGroup(g.key)}
                      >
                        <Icon name="chevron" size={16} className={styles.chev} />
                        {g.title}
                      </button>
                    </h2>
                    {g.key !== STANDALONE ? (
                      <span className={styles.count}>
                        <span className="nums">{g.done}</span>/<span className="nums">{g.total}</span>
                      </span>
                    ) : null}
                  </div>
                  {g.key !== STANDALONE ? <Progress done={g.done} total={g.total} /> : null}
                </div>
                {isOpen ? (
                  <ul id={`group-${g.key}`} className={styles.list}>
                    {g.tasks.map(({ task, trail }) => (
                      <TaskRow
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        trail={trail}
                        done={task.done}
                        leaving={leaving}
                        onToggle={toggle}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
