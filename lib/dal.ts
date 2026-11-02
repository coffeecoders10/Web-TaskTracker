import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createUserDoc, isEmptyRowError, readUserDoc, writeUserDoc } from "./backbone";
import { applyCommand, normalizeDoc, type Command } from "./domain/commands";
import { DomainError, EMPTY_DOC, type UserDoc } from "./domain/types";
import { getSession, type Session } from "./session";

/**
 * Data access layer. Every read/write goes through here with a user id taken from
 * the verified session cookie, so a user can only ever touch their own document.
 */

/** Verified session or redirect to /login. Use in Server Components. */
export const requireSession = cache(async (): Promise<Session> => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reads the row, healing one that exists but has no document yet. */
async function readExisting(userId: string): Promise<unknown | null> {
  try {
    return await readUserDoc(userId);
  } catch (err) {
    if (!isEmptyRowError(err)) throw err;
    // Another request may be mid-way through creating this row; give it a moment.
    await sleep(400);
    try {
      return await readUserDoc(userId);
    } catch (again) {
      if (!isEmptyRowError(again)) throw again;
      await writeUserDoc(userId, EMPTY_DOC); // nothing to lose: the row has no document
      return EMPTY_DOC;
    }
  }
}

/** Unserialised get-or-create. Only call from inside `serialized`. */
async function readOrCreate(userId: string): Promise<UserDoc> {
  const raw = await readExisting(userId);
  if (raw !== null) return normalizeDoc(raw);
  try {
    await createUserDoc(userId, EMPTY_DOC);
    return EMPTY_DOC;
  } catch (err) {
    // Another instance may have created the row between our read and create.
    const again = await readExisting(userId).catch(() => null);
    if (again !== null) return normalizeDoc(again);
    throw err;
  }
}

// The API has no locking (last write wins), so work for one user is serialised
// here. This also stops two concurrent first loads from racing create against read.
const queues = new Map<string, Promise<unknown>>();

function serialized<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(userId) ?? Promise.resolve();
  const run = prev.then(task, task);
  const tail = run.catch(() => undefined);
  queues.set(userId, tail);
  void tail.then(() => {
    if (queues.get(userId) === tail) queues.delete(userId);
  });
  return run;
}

export const loadDoc = cache((userId: string) => serialized(userId, () => readOrCreate(userId)));

/** Fresh read that bypasses the per-request cache (used by client re-syncs). */
export function loadDocFresh(userId: string): Promise<UserDoc> {
  return serialized(userId, () => readOrCreate(userId));
}

export type CommandResult = { ok: true } | { ok: false; error: string };

export function runCommands(
  userId: string,
  commands: readonly Command[],
): Promise<{ doc: UserDoc; results: CommandResult[] }> {
  return serialized(userId, async () => {
    let doc = await readOrCreate(userId);
    const original = doc;
    const results: CommandResult[] = [];
    const now = Date.now();

    for (const cmd of commands) {
      try {
        doc = applyCommand(doc, cmd, now);
        results.push({ ok: true });
      } catch (err) {
        if (!(err instanceof DomainError)) throw err;
        results.push({ ok: false, error: err.message });
      }
    }

    if (doc !== original) await writeUserDoc(userId, doc);
    return { doc, results };
  });
}
