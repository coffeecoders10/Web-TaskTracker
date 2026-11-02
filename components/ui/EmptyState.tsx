import Link from "next/link";
import styles from "./ui.module.css";

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {text ? <p className={styles.emptyText}>{text}</p> : null}
      {action ? (
        <Link href={action.href} className={styles.btn}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
