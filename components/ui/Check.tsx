import { Icon } from "./Icon";
import styles from "./ui.module.css";

/** Round completion toggle. The whole 44px target is the button. */
export function Check({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.check}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.checkMark}>
        <Icon name="check" size={14} strokeWidth={2.4} className={styles.checkIcon} />
      </span>
    </button>
  );
}
