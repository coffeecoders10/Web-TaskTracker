"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import styles from "./plan.module.css";

/**
 * Inline add field. Enter adds and stays open for rapid entry; Escape or the close
 * button dismisses it. It deliberately doesn't close on blur: unmounting between a
 * pointer-down and pointer-up shifts the layout and swallows the click.
 */
export function AddRow({
  label,
  onAdd,
  onClose,
}: {
  label: string;
  onAdd: (title: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue("");
  };

  return (
    <form
      className={styles.addRow}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        autoFocus
        className={styles.addInput}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`${label}…`}
        aria-label={label}
        maxLength={200}
        enterKeyHint="done"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <button type="submit" className={styles.addSubmit} disabled={!value.trim()}>
        Add
      </button>
      <button type="button" className={ui.iconBtn} onClick={onClose} aria-label="Cancel">
        <Icon name="close" size={18} />
      </button>
    </form>
  );
}
