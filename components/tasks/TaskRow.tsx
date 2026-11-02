"use client";

import { memo } from "react";
import { Check } from "@/components/ui/Check";
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
  onToggle,
}: {
  id: string;
  title: string;
  trail?: string;
  done: boolean;
  leaving?: boolean;
  onToggle: (id: string, done: boolean) => void;
}) {
  return (
    <li className={styles.item} data-leaving={leaving && done ? "" : undefined}>
      <div className={styles.itemInner}>
        <div className={styles.row}>
          <Check
            checked={done}
            onChange={(next) => onToggle(id, next)}
            label={done ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
          />
          <div className={styles.text}>
            <span className={styles.title} data-done={done || undefined}>
              {title}
            </span>
            {trail ? <span className={styles.trail}>{trail}</span> : null}
          </div>
        </div>
      </div>
    </li>
  );
});
