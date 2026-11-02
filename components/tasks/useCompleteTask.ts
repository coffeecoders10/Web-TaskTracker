"use client";

import { useCallback } from "react";
import { useActions } from "@/components/store/AppProvider";
import { useToast } from "@/components/ui/Toaster";

function clip(text: string, max = 36): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Completes or reopens a leaf task; completion always offers a quick undo. */
export function useCompleteTask() {
  const { dispatch } = useActions();
  const toast = useToast();

  return useCallback(
    (task: { id: string; title: string }, done: boolean) => {
      if (!dispatch({ type: "task.setDone", id: task.id, done })) return;
      if (done) {
        toast.show(`Done: ${clip(task.title)}`, {
          action: {
            label: "Undo",
            onClick: () => dispatch({ type: "task.setDone", id: task.id, done: false }),
          },
        });
      }
    },
    [dispatch, toast],
  );
}
