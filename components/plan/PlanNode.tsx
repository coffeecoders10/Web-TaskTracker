"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRef } from "react";
import { useDoc } from "@/components/store/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { isComplete } from "@/lib/domain/tree";
import ui from "@/components/ui/ui.module.css";
import { AddRow } from "./AddRow";
import styles from "./plan.module.css";

export type PlanHandlers = {
  isOpen: (id: string, depth: number) => boolean;
  toggle: (id: string, depth: number) => void;
  startAdd: (parentId: string | null) => void;
  edit: (id: string) => void;
  move: (id: string) => void;
  remove: (id: string) => void;
  shift: (id: string, delta: -1 | 1) => void;
  setOrdered: (id: string, ordered: boolean) => void;
  indent: (id: string) => void;
  outdent: (id: string) => void;
};

type Props = {
  taskId: string;
  depth: number;
  handlers: PlanHandlers;
  addingTo: string | null | undefined;
  onAdd: (parentId: string | null, title: string) => void;
  onCloseAdd: () => void;
};

export function PlanNode({
  taskId,
  depth,
  handlers,
  addingTo,
  onAdd,
  onCloseAdd,
}: Props) {
  const { index } = useDoc();
  // Actions that move focus elsewhere (an input, a dialog) must not have it pulled
  // back to the menu trigger when the menu closes.
  const handoff = useRef(false);
  const task = index.byId.get(taskId);
  if (!task) return null;

  const kids = index.children.get(taskId) ?? [];
  const isParent = kids.length > 0;
  const open = isParent && handlers.isOpen(taskId, depth);
  const stats = index.stats.get(taskId);
  const allDone = isParent ? isComplete(index, taskId) : task.done;
  const siblings = index.children.get(task.parentId) ?? [];
  const at = siblings.findIndex((s) => s.id === taskId);
  const adding = addingTo === taskId;

  const hand = (fn: () => void) => {
    handoff.current = true;
    fn();
  };

  const onMain = () => (isParent ? handlers.toggle(taskId, depth) : handlers.edit(taskId));

  return (
    <li className={styles.node}>
      <div className={styles.nodeRow} data-top={depth === 0 || undefined}>
        <button
          type="button"
          className={styles.main}
          onClick={onMain}
          aria-expanded={isParent ? open : undefined}
          aria-label={
            isParent ? `${open ? "Collapse" : "Expand"} ${task.title}` : `Edit ${task.title}`
          }
        >
          <span className={styles.chevron} data-open={open || undefined} data-empty={!isParent || undefined}>
            <Icon name="chevron" size={16} />
          </span>
          <span className={styles.name} data-done={allDone || undefined}>
            {task.title}
          </span>
        </button>

        {isParent && task.ordered ? (
          <span
            className={styles.orderMark}
            title="Subtasks must be done in order"
            aria-label="Subtasks must be done in order"
          >
            <Icon name="list" size={16} />
          </span>
        ) : null}

        {isParent && stats ? (
          <span className={styles.stat} aria-label={`${stats.done} of ${stats.total} done`}>
            <span className="nums">{stats.done}</span>/<span className="nums">{stats.total}</span>
          </span>
        ) : null}

        <button
          type="button"
          className={`${ui.iconBtn} ${styles.quickAdd}`}
          aria-label={`Add subtask to ${task.title}`}
          onClick={() => handlers.startAdd(taskId)}
        >
          <Icon name="plus" size={18} />
        </button>

        <Menu.Root>
          <Menu.Trigger className={ui.iconBtn} aria-label={`Options for ${task.title}`}>
            <Icon name="more" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              className={`${ui.menu} ${ui.menuScroll}`}
              align="end"
              sideOffset={4}
              collisionPadding={12}
              onCloseAutoFocus={(e) => {
                if (handoff.current) {
                  e.preventDefault();
                  handoff.current = false;
                }
              }}
            >
              <Menu.Item className={ui.menuItem} onSelect={() => hand(() => handlers.startAdd(taskId))}>
                <Icon name="plus" size={18} /> Add subtask
              </Menu.Item>
              <Menu.Item className={ui.menuItem} onSelect={() => hand(() => handlers.edit(taskId))}>
                <Icon name="edit" size={18} /> Edit
              </Menu.Item>
              {isParent ? (
                <Menu.Item className={ui.menuItem} asChild>
                  <Link href={`/plan/${taskId}`}>
                    <Icon name="folder" size={18} /> Open branch
                  </Link>
                </Menu.Item>
              ) : null}
              {isParent ? (
                <Menu.Item
                  className={ui.menuItem}
                  onSelect={() => handlers.setOrdered(taskId, !task.ordered)}
                >
                  <Icon name="list" size={18} />{" "}
                  {task.ordered ? "Make subtasks unordered" : "Make subtasks ordered"}
                </Menu.Item>
              ) : null}
              <Menu.Separator className={ui.menuSep} />
              <Menu.Item
                className={ui.menuItem}
                disabled={at <= 0}
                onSelect={() => handlers.shift(taskId, -1)}
              >
                <Icon name="up" size={18} /> Move up
              </Menu.Item>
              <Menu.Item
                className={ui.menuItem}
                disabled={at < 0 || at >= siblings.length - 1}
                onSelect={() => handlers.shift(taskId, 1)}
              >
                <Icon name="down" size={18} /> Move down
              </Menu.Item>
              <Menu.Item
                className={ui.menuItem}
                disabled={at <= 0}
                onSelect={() => handlers.indent(taskId)}
              >
                <Icon name="move" size={18} /> Make subtask of one above
              </Menu.Item>
              <Menu.Item
                className={ui.menuItem}
                disabled={task.parentId === null}
                onSelect={() => handlers.outdent(taskId)}
              >
                <Icon name="move" size={18} style={{ transform: "scaleX(-1)" }} /> Move out one level
              </Menu.Item>
              <Menu.Item className={ui.menuItem} onSelect={() => hand(() => handlers.move(taskId))}>
                <Icon name="folder" size={18} /> Move to…
              </Menu.Item>
              <Menu.Separator className={ui.menuSep} />
              <Menu.Item
                className={`${ui.menuItem} ${ui.menuItemDanger}`}
                onSelect={() => hand(() => handlers.remove(taskId))}
              >
                <Icon name="trash" size={18} /> Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {depth === 0 && isParent && stats ? (
        <div className={styles.nodeProgress}>
          <Progress done={stats.done} total={stats.total} />
        </div>
      ) : null}

      {open || adding ? (
        <ul className={styles.children} data-deep={depth >= 4 || undefined}>
          {open
            ? kids.map((k) => (
                <PlanNode
                  key={k.id}
                  taskId={k.id}
                  depth={depth + 1}
                  handlers={handlers}
                  addingTo={addingTo}
                  onAdd={onAdd}
                  onCloseAdd={onCloseAdd}
                />
              ))
            : null}
          {adding ? (
            <li>
              <AddRow
                label="Add subtask"
                onAdd={(title) => onAdd(taskId, title)}
                onClose={onCloseAdd}
              />
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
