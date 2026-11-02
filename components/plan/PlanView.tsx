"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useActions, useDoc } from "@/components/store/AppProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { newId } from "@/lib/domain/commands";
import { ancestorsOf, subtreeIds } from "@/lib/domain/tree";
import { AddRow } from "./AddRow";
import { EditTaskDialog, MoveTaskDialog } from "./PlanDialogs";
import { PlanNode, type PlanHandlers } from "./PlanNode";
import styles from "./plan.module.css";

const DEFAULT_OPEN_DEPTH = 2;

export function PlanView({ rootId }: { rootId: string | null }) {
  const { index } = useDoc();
  const { dispatch } = useActions();

  // Explicit open/closed choices; anything not chosen falls back to a depth default.
  const [openMap, setOpenMap] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const [addingTo, setAddingTo] = useState<string | null | undefined>(undefined);
  const [editId, setEditId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const root = rootId ? index.byId.get(rootId) : null;
  const siblings = index.children.get(rootId) ?? [];

  const isOpen = useCallback(
    (id: string, depth: number) => openMap.get(id) ?? depth < DEFAULT_OPEN_DEPTH,
    [openMap],
  );

  const setOpen = useCallback((id: string, open: boolean) => {
    setOpenMap((prev) => new Map(prev).set(id, open));
  }, []);

  const handlers = useMemo<PlanHandlers>(
    () => ({
      isOpen,
      toggle: (id, depth) => setOpen(id, !isOpen(id, depth)),
      startAdd: (parentId) => {
        if (parentId) setOpen(parentId, true);
        setAddingTo(parentId);
      },
      edit: setEditId,
      move: setMoveId,
      remove: setDeleteId,
      shift: (id, delta) => {
        const t = index.byId.get(id);
        if (!t) return;
        const list = index.children.get(t.parentId) ?? [];
        const at = list.findIndex((s) => s.id === id);
        dispatch({ type: "task.move", id, parentId: t.parentId, index: at + delta });
      },
      indent: (id) => {
        const t = index.byId.get(id);
        if (!t) return;
        const list = index.children.get(t.parentId) ?? [];
        const prev = list[list.findIndex((s) => s.id === id) - 1];
        if (!prev) return;
        setOpen(prev.id, true);
        dispatch({
          type: "task.move",
          id,
          parentId: prev.id,
          index: index.children.get(prev.id)?.length ?? 0,
        });
      },
      outdent: (id) => {
        const t = index.byId.get(id);
        const parent = t?.parentId ? index.byId.get(t.parentId) : undefined;
        if (!t || !parent) return;
        const list = index.children.get(parent.parentId) ?? [];
        const parentAt = list.findIndex((s) => s.id === parent.id);
        dispatch({ type: "task.move", id, parentId: parent.parentId, index: parentAt + 1 });
      },
    }),
    [isOpen, setOpen, index, dispatch],
  );

  const addTask = useCallback(
    (parentId: string | null, title: string) => {
      dispatch({ type: "task.add", id: newId(), parentId, title });
    },
    [dispatch],
  );

  const editing = editId ? index.byId.get(editId) : undefined;
  const moving = moveId ? index.byId.get(moveId) : undefined;
  const deleting = deleteId ? index.byId.get(deleteId) : undefined;
  const deleteCount = deleting ? subtreeIds(index, deleting.id).length - 1 : 0;

  if (rootId && !root) {
    return (
      <>
        <PageHeader title="Plan" />
        <EmptyState
          title="That task is gone."
          text="It may have been deleted or moved."
          action={{ href: "/plan", label: "Back to plan" }}
        />
      </>
    );
  }

  const trail = root ? ancestorsOf(index, root.id) : [];
  const stats = root ? index.stats.get(root.id) : undefined;

  return (
    <>
      {root ? (
        <nav className={styles.crumbs} aria-label="Branch">
          <Link href="/plan">Plan</Link>
          {trail.map((t) => (
            <span key={t.id} className={styles.crumb}>
              <Icon name="chevron" size={14} />
              <Link href={`/plan/${t.id}`}>{t.title}</Link>
            </span>
          ))}
        </nav>
      ) : null}

      <PageHeader
        title={root ? root.title : "Plan"}
        lead={
          root
            ? undefined
            : "Your whole hierarchy. Split goals into steps, as deep as you need."
        }
        actions={
          <button
            type="button"
            className={styles.addTop}
            onClick={() => handlers.startAdd(rootId)}
          >
            <Icon name="plus" size={18} />
            {root ? "Add subtask" : "Add task"}
          </button>
        }
      />

      {root && stats && stats.total > 0 ? (
        <div className={styles.branchProgress}>
          <Progress done={stats.done} total={stats.total} />
          <p>
            <span className="nums">{stats.done}</span> of <span className="nums">{stats.total}</span>{" "}
            done
          </p>
        </div>
      ) : null}

      {siblings.length === 0 && addingTo !== rootId ? (
        <EmptyState
          title={root ? "No subtasks yet." : "Start with a goal."}
          text={
            root
              ? "Add the steps it takes to finish this."
              : "Add a task, then break it into smaller steps. Only the smallest steps become things to do."
          }
        />
      ) : (
        <ul className={styles.tree} aria-label={root ? root.title : "Tasks"}>
          {siblings.map((t) => (
            <PlanNode
              key={t.id}
              taskId={t.id}
              depth={0}
              handlers={handlers}
              addingTo={addingTo}
              onAdd={addTask}
              onCloseAdd={() => setAddingTo(undefined)}
            />
          ))}
        </ul>
      )}

      {addingTo === rootId ? (
        <AddRow
          label={root ? "Add subtask" : "Add task"}
          onAdd={(title) => addTask(rootId, title)}
          onClose={() => setAddingTo(undefined)}
        />
      ) : null}

      {editing ? (
        <EditTaskDialog
          key={editing.id}
          task={editing}
          onClose={() => setEditId(null)}
          onSave={(title, notes) => {
            dispatch({ type: "task.update", id: editing.id, title, notes });
            setEditId(null);
          }}
        />
      ) : null}

      {moving ? (
        <MoveTaskDialog
          key={moving.id}
          task={moving}
          index={index}
          onClose={() => setMoveId(null)}
          onMove={(parentId) => {
            if (parentId) setOpen(parentId, true);
            dispatch({
              type: "task.move",
              id: moving.id,
              parentId,
              index: index.children.get(parentId)?.length ?? 0,
            });
            setMoveId(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={deleting ? `Delete "${deleting.title}"?` : "Delete task?"}
        body={
          deleteCount > 0
            ? `This also deletes its ${deleteCount} ${deleteCount === 1 ? "subtask" : "subtasks"}. This can't be undone.`
            : "This can't be undone."
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) dispatch({ type: "task.delete", id: deleting.id });
          setDeleteId(null);
        }}
      />
    </>
  );
}
