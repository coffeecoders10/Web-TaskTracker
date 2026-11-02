"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { useCompleteTask } from "@/components/tasks/useCompleteTask";
import { ancestorsOf, incompleteLeaves } from "@/lib/domain/tree";
import { pickRandom } from "@/lib/domain/random";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import styles from "./home.module.css";

export function RandomPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={ui.overlay} />
        {/* Mounted only while open, so every opening rolls a fresh pick. */}
        <Dialog.Content className={`${ui.dialog} ${styles.picker}`} aria-describedby={undefined}>
          <PickerBody close={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PickerBody({ close }: { close: () => void }) {
  const { index } = useDoc();
  const { setFocus } = useActions();
  const complete = useCompleteTask();

  const candidates = incompleteLeaves(index);
  const [pickedId, setPickedId] = useState<string | null>(() => pickRandom(candidates)?.id ?? null);
  const [rolls, setRolls] = useState(0);

  const task = pickedId ? index.byId.get(pickedId) : undefined;
  const live = task && !task.done ? task : null;

  const reroll = () => {
    setPickedId(pickRandom(candidates, pickedId)?.id ?? null);
    setRolls((n) => n + 1);
  };

  if (!live) {
    const none = candidates.length === 0;
    return (
      <>
        <Dialog.Title className={styles.pickerEmptyTitle}>
          {none ? "Nothing left to do." : "Ready when you are."}
        </Dialog.Title>
        <p className={ui.dialogBody} style={{ marginBottom: 0 }}>
          {none
            ? "Every task is done. Add something new when you're ready."
            : "Pick a task to focus on."}
        </p>
        <div className={ui.dialogActions}>
          <button type="button" className={`${ui.btn} ${ui.btnQuiet}`} onClick={close}>
            Close
          </button>
          {none ? (
            <Link href="/plan" className={`${ui.btn} ${ui.btnPrimary}`} onClick={close}>
              Plan tasks
            </Link>
          ) : (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={reroll}>
              Pick one
            </button>
          )}
        </div>
      </>
    );
  }

  const trail = ancestorsOf(index, live.id);
  const onlyOne = candidates.length === 1;

  return (
    <>
      <Dialog.Title className={styles.pickerLabel}>Your next task</Dialog.Title>
      <div key={rolls} className={styles.pickerResult}>
        <p className={styles.pickerTask}>{live.title}</p>
        {trail.length > 0 ? (
          <p className={styles.pickerTrail}>{trail.map((t) => t.title).join(" › ")}</p>
        ) : null}
        {live.notes ? <p className={styles.pickerNotes}>{live.notes}</p> : null}
      </div>

      <div className={styles.pickerActions}>
        <button
          type="button"
          className={`${ui.btn} ${ui.btnPrimary}`}
          onClick={() => {
            complete(live, true);
            close();
          }}
        >
          <Icon name="check" size={18} /> Mark done
        </button>
        <button
          type="button"
          className={ui.btn}
          onClick={() => {
            setFocus(live.id);
            close();
          }}
        >
          Work on this
        </button>
        <button type="button" className={ui.btn} onClick={reroll} disabled={onlyOne}>
          <Icon name="shuffle" size={18} /> Another
        </button>
      </div>
      <p className={styles.pickerCount}>
        <span className="nums">{candidates.length}</span>{" "}
        {candidates.length === 1 ? "task left to choose from" : "tasks to choose from"}
      </p>
    </>
  );
}
