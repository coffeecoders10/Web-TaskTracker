"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { subtreeIds, type TaskIndex } from "@/lib/domain/tree";
import type { Task } from "@/lib/domain/types";
import { LIMITS } from "@/lib/domain/types";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import styles from "./plan.module.css";

export function EditTaskDialog({
  task,
  onSave,
  onClose,
}: {
  task: Task;
  onSave: (title: string, notes: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const valid = title.trim().length > 0;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={ui.overlay} />
        <Dialog.Content className={ui.dialog} aria-describedby={undefined}>
          <Dialog.Title className={ui.dialogTitle}>Edit task</Dialog.Title>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) onSave(title.trim(), notes.trim());
            }}
          >
            <div className={ui.field}>
              <label className={ui.label} htmlFor="edit-title">
                Name
              </label>
              <input
                id="edit-title"
                className={ui.input}
                value={title}
                maxLength={LIMITS.title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="edit-notes">
                Notes
              </label>
              <textarea
                id="edit-notes"
                className={ui.input}
                value={notes}
                maxLength={LIMITS.notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering"
              />
            </div>
            <div className={ui.dialogActions}>
              <button type="button" className={`${ui.btn} ${ui.btnQuiet}`} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!valid}>
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MoveTaskDialog({
  task,
  index,
  onMove,
  onClose,
}: {
  task: Task;
  index: TaskIndex;
  onMove: (parentId: string | null) => void;
  onClose: () => void;
}) {
  // Every task except the moved one and everything beneath it (that would form a loop).
  const options = useMemo(() => {
    const blocked = new Set(subtreeIds(index, task.id));
    const out: { id: string; title: string; depth: number }[] = [];
    const stack: { id: string; depth: number }[] = [...(index.children.get(null) ?? [])]
      .reverse()
      .map((t) => ({ id: t.id, depth: 0 }));
    while (stack.length > 0) {
      const { id, depth } = stack.pop()!;
      if (blocked.has(id)) continue;
      const t = index.byId.get(id)!;
      out.push({ id, title: t.title, depth });
      const kids = index.children.get(id) ?? [];
      for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i].id, depth: depth + 1 });
    }
    return out;
  }, [index, task.id]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={ui.overlay} />
        <Dialog.Content className={ui.dialog} aria-describedby={undefined}>
          <Dialog.Title className={ui.dialogTitle}>Move “{task.title}”</Dialog.Title>
          <p className={ui.dialogBody} style={{ marginBottom: "var(--s-3)" }}>
            Choose where it should go.
          </p>
          <ul className={styles.moveList}>
            <li>
              <button
                type="button"
                className={styles.moveOption}
                disabled={task.parentId === null}
                onClick={() => onMove(null)}
              >
                <Icon name="list" size={18} />
                <span>Top level</span>
              </button>
            </li>
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={styles.moveOption}
                  style={{ paddingLeft: `calc(var(--s-3) + ${Math.min(o.depth, 6)} * 16px)` }}
                  disabled={o.id === task.parentId}
                  onClick={() => onMove(o.id)}
                >
                  <Icon name="folder" size={18} />
                  <span>{o.title}</span>
                  {o.id === task.parentId ? <em>current</em> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className={ui.dialogActions}>
            <button type="button" className={`${ui.btn} ${ui.btnQuiet}`} onClick={onClose}>
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
