import styles from "./shell.module.css";

/** Static frame shown while the signed-in shell and the user's data stream in. */
export function ShellSkeleton() {
  return (
    <div className={styles.shell} aria-busy="true">
      <aside className={styles.sidebar}>
        <span className={styles.wordmark}>Onward</span>
      </aside>
      <main className={styles.main}>
        <div className={styles.content} role="status" aria-label="Loading">
          <div className={styles.skelLine} style={{ width: "46%", height: 44, marginBottom: 12 }} />
          <div className={styles.skelLine} style={{ width: "28%", marginBottom: 56 }} />
          {[72, 58, 66, 50, 62].map((w, i) => (
            <div
              key={i}
              className={styles.skelLine}
              style={{ width: `${w}%`, height: 16, marginBottom: 36 }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
