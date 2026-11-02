import styles from "./ui.module.css";

/** Hairline progress. Always paired with a text count, never the only signal. */
export function Progress({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      <div className={styles.progressFill} style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}
