"use server";

import { BackboneError } from "@/lib/backbone";
import type { Command } from "@/lib/domain/commands";
import type { UserDoc } from "@/lib/domain/types";
import { loadDocFresh, runCommands, type CommandResult } from "@/lib/dal";
import { getSession } from "@/lib/session";

export type SyncResult =
  | { ok: true; doc: UserDoc; results: CommandResult[] }
  | { ok: false; error: string; unauthorized?: boolean };

const MAX_BATCH = 50;

function failure(err: unknown): SyncResult {
  if (err instanceof BackboneError) return { ok: false, error: err.message };
  return { ok: false, error: "Something went wrong. Try again." };
}

/**
 * Applies a batch of commands to the signed-in user's document. The user is taken
 * from the session cookie; nothing in the arguments can select another user's data.
 */
export async function applyCommands(commands: Command[]): Promise<SyncResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session has ended.", unauthorized: true };

  if (
    !Array.isArray(commands) ||
    commands.length > MAX_BATCH ||
    !commands.every((c) => c && typeof c === "object" && typeof c.type === "string")
  ) {
    return { ok: false, error: "Invalid request." };
  }

  try {
    const { doc, results } = await runCommands(session.userId, commands);
    return { ok: true, doc, results };
  } catch (err) {
    return failure(err);
  }
}

/** Re-reads the signed-in user's document (used to pick up changes from other devices). */
export async function refreshDoc(): Promise<SyncResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session has ended.", unauthorized: true };
  try {
    return { ok: true, doc: await loadDocFresh(session.userId), results: [] };
  } catch (err) {
    return failure(err);
  }
}
