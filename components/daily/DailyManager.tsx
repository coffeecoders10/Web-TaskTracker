"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { useRef, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { newId } from "@/lib/domain/commands";
import { LIMITS, type Activity } from "@/lib/domain/types";
import ui from "@/components/ui/ui.module.css";
import styles from "./daily.module.css";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEK = [
  { value: 1, short: "M", label: "Monday" },
  { value: 2, short: "T", label: "Tuesday" },
  { value: 3, short: "W", label: "Wednesday" },
  { value: 4, short: "T", label: "Thursday" },
  { value: 5, short: "F", label: "Friday" },
  { value: 6, short: "S", label: "Saturday" },
  { value: 0, short: "S", label: "Sunday" },
];

function describeDays(days: readonly number[] | undefined): string {
  if (!days) return "Every day";
  const names = WEEK.filter((d) => days.includes(d.value)).map((d) => d.label.slice(0, 3));
  return names.join(" · ");
}

export function DailyManager({ tabs }: { tabs?: ReactNode }) {
  const { doc } = useDoc();
  const { dispatch } = useActions();
  const [draft, setDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [daysId, setDaysId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  const activities = [...doc.activities].sort((a, b) => a.order - b.order);
  const deleting = activities.find((a) => a.id === deleteId);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    if (dispatch({ type: "activity.add", id: newId(), title })) setDraft("");
    addRef.current?.focus();
  };

  return (
    <>
      <PageHeader
        title="Plan"
        lead="Small things you want to do on repeat. Each day starts fresh; past days are kept."
      />

      {tabs}

      <form
        className={styles.add}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          ref={addRef}
          className={ui.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an activity, e.g. Read"
          aria-label="New daily activity"
          maxLength={LIMITS.title}
          enterKeyHint="done"
          autoComplete="off"
        />
        <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!draft.trim()}>
          Add
        </button>
      </form>

      {activities.length === 0 ? (
        <EmptyState
          title="No activities yet."
          text="Try reading, a walk, or writing a few lines. They'll appear on Today each morning."
        />
      ) : (
        <ul className={styles.list}>
          {activities.map((a, i) => (
            <li key={a.id} className={styles.item}>
              {renamingId === a.id ? (
                <RenameRow
                  activity={a}
                  onDone={(title) => {
                    if (title !== null && title !== a.title) {
                      dispatch({ type: "activity.rename", id: a.id, title });
                    }
                    setRenamingId(null);
                  }}
                />
              ) : (
                <>
                  <div className={styles.name}>
                    <span>{a.title}</span>
                    <span className={styles.days}>{describeDays(a.days)}</span>
                    {daysId === a.id ? (
                      <div className={styles.dayPicker} role="group" aria-label={`Repeat days for ${a.title}`}>
                        {WEEK.map((d) => {
                          const on = !a.days || a.days.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              className={styles.dayChip}
                              aria-pressed={on}
                              aria-label={d.label}
                              onClick={() => {
                                const current = a.days ?? ALL_DAYS;
                                const next = on
                                  ? current.filter((x) => x !== d.value)
                                  : [...current, d.value];
                                if (next.length === 0) return; // keep at least one day
                                dispatch({ type: "activity.setDays", id: a.id, days: next });
                              }}
                            >
                              {d.short}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <Menu.Root>
                    <Menu.Trigger className={ui.iconBtn} aria-label={`Options for ${a.title}`}>
                      <Icon name="more" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Content className={ui.menu} align="end" sideOffset={4} collisionPadding={12}>
                        <Menu.Item className={ui.menuItem} onSelect={() => setRenamingId(a.id)}>
                          <Icon name="edit" size={18} /> Rename
                        </Menu.Item>
                        <Menu.Item
                          className={ui.menuItem}
                          onSelect={() => setDaysId(daysId === a.id ? null : a.id)}
                        >
                          <Icon name="repeat" size={18} /> {daysId === a.id ? "Done with days" : "Repeat on days"}
                        </Menu.Item>
                        <Menu.Item
                          className={ui.menuItem}
                          disabled={i === 0}
                          onSelect={() => dispatch({ type: "activity.move", id: a.id, index: i - 1 })}
                        >
                          <Icon name="up" size={18} /> Move up
                        </Menu.Item>
                        <Menu.Item
                          className={ui.menuItem}
                          disabled={i === activities.length - 1}
                          onSelect={() => dispatch({ type: "activity.move", id: a.id, index: i + 1 })}
                        >
                          <Icon name="down" size={18} /> Move down
                        </Menu.Item>
                        <Menu.Separator className={ui.menuSep} />
                        <Menu.Item
                          className={`${ui.menuItem} ${ui.menuItemDanger}`}
                          onSelect={() => setDeleteId(a.id)}
                        >
                          <Icon name="trash" size={18} /> Delete
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Portal>
                  </Menu.Root>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={deleting ? `Delete "${deleting.title}"?` : "Delete activity?"}
        body="It disappears from Today, and its past check-ins are removed. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) dispatch({ type: "activity.delete", id: deleting.id });
          setDeleteId(null);
        }}
      />
    </>
  );
}

function RenameRow({
  activity,
  onDone,
}: {
  activity: Activity;
  /** `null` means cancelled. */
  onDone: (title: string | null) => void;
}) {
  const [value, setValue] = useState(activity.title);
  const finished = useRef(false);

  const finish = (title: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(title);
  };

  return (
    <form
      className={styles.rename}
      onSubmit={(e) => {
        e.preventDefault();
        finish(value.trim() || null);
      }}
    >
      <input
        autoFocus
        className={ui.input}
        value={value}
        maxLength={LIMITS.title}
        aria-label={`Rename ${activity.title}`}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Escape") finish(null);
        }}
        onBlur={() => finish(value.trim() || null)}
      />
    </form>
  );
}
