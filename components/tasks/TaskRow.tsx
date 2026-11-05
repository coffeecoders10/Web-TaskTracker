"use client";

import { memo } from "react";
import { Check } from "@/components/ui/Check";
import { Icon } from "@/components/ui/Icon";
import styles from "./tasks.module.css";

/**
 * One actionable row. `leaving` is set while a just-completed row waits to slide
 * out of a "To do" list; clearing it (undo) cancels the exit.
 */
export const TaskRow = memo(function TaskRow({
  id,
  title,
  trail,
  done,
  leaving,
  locked,
  onToggle,
  onRemove,
}: {
  id: string;
  title: string;
  trail?: string;
  done: boolean;
  leaving?: boolean;
  /** A grouped parent row: complete because its subtasks are, so it can't be toggled itself. */
  locked?: boolean;
  onToggle: (id: string, done: boolean) => void;
  /** Adds a trailing remove button (used by the Today panel). */
  onRemove?: (id: string) => void;
}) {
  return (
    <li className={styles.item} data-leaving={leaving && done ? "" : undefined}>
      <div className={styles.itemInner}>
        <div className={styles.row}>
          <Check
            checked={done}
            disabled={locked}
            onChange={(next) => onToggle(id, next)}
            label={
              locked
                ? `"${title}" is done because all its subtasks are`
                : done
                  ? `Mark "${title}" as not done`
                  : `Mark "${title}" as done`
            }
          />
          <div className={styles.text}>
            <span className={styles.title} data-done={done || undefined}>
              {title}
            </span>
            {trail ? <span className={styles.trail}>{trail}</span> : null}
          </div>
          {onRemove ? (
            <button
              type="button"
              className={styles.rowBtn}
              aria-label={`Remove "${title}" from today`}
              onClick={() => onRemove(id)}
            >
              <Icon name="close" size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
});
