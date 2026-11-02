"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import styles from "./ui.module.css";

/** Destructive confirmation. Cancel is focused first so Enter can't delete by accident. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content className={styles.dialog}>
          <AlertDialog.Title className={styles.dialogTitle}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={styles.dialogBody}>{body}</AlertDialog.Description>
          <div className={styles.dialogActions} style={{ marginTop: 0 }}>
            <AlertDialog.Cancel className={`${styles.btn} ${styles.btnQuiet}`}>
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
