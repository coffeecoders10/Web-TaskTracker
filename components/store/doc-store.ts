import { applyCommands, refreshDoc } from "@/actions/data";
import { applyCommand, pruneExpired, type Command } from "@/lib/domain/commands";
import { indexTasks, type TaskIndex } from "@/lib/domain/tree";
import { DomainError, type UserDoc } from "@/lib/domain/types";

export type Snapshot = {
  /** Server-confirmed document with not-yet-confirmed commands applied on top. */
  doc: UserDoc;
  index: TaskIndex;
  saving: boolean;
};

type Hooks = {
  onError: (message: string) => void;
  onSignedOut: () => void;
};

/**
 * Optimistic document store. Commands apply instantly to the view; a single
 * in-flight request at a time sends them (batched, in order) to the server, which
 * applies the same commands to the stored document. On success the server's
 * document becomes the new baseline; on failure the commands are dropped, which
 * reverts the view, and the user is told.
 */
export class DocStore {
  private confirmed: UserDoc;
  private pending: Command[] = [];
  private listeners = new Set<() => void>();
  private snap: Snapshot;
  private flushing = false;
  private lastSync = Date.now();

  constructor(
    initial: UserDoc,
    private hooks: Hooks,
  ) {
    this.confirmed = initial;
    this.snap = this.build();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snap;

  setHooks(hooks: Hooks) {
    this.hooks = hooks;
  }

  /** Returns false if the command is invalid and was not queued. */
  dispatch(cmd: Command): boolean {
    try {
      applyCommand(this.snap.doc, cmd, Date.now());
    } catch (err) {
      if (err instanceof DomainError) {
        this.hooks.onError(err.message);
        return false;
      }
      throw err;
    }
    this.pending.push(cmd);
    this.publish();
    void this.flush();
    return true;
  }

  /** Pulls in changes made on other devices, unless local edits are in flight. */
  async resync(minAgeMs = 0) {
    if (this.pending.length > 0 || this.flushing) return;
    if (Date.now() - this.lastSync < minAgeMs) return;
    const res = await refreshDoc();
    if (this.pending.length > 0 || this.flushing) return; // local edits won the race
    this.lastSync = Date.now();
    if (res.ok) {
      this.confirmed = res.doc;
      this.publish();
    } else if (res.unauthorized) {
      this.hooks.onSignedOut();
    }
  }

  private build(): Snapshot {
    let doc = this.confirmed;
    const now = Date.now();
    for (const cmd of this.pending) {
      try {
        doc = applyCommand(doc, cmd, now);
      } catch {
        // Became invalid after a rebase; the server will report it too.
      }
    }
    doc = pruneExpired(doc, now);
    return { doc, index: indexTasks(doc.tasks), saving: this.pending.length > 0 };
  }

  private publish() {
    this.snap = this.build();
    for (const l of this.listeners) l();
  }

  private async flush() {
    if (this.flushing) return;
    this.flushing = true;
    let lostResponse = false;
    try {
      while (this.pending.length > 0) {
        const batch = this.pending.slice();
        const res = await applyCommands(batch);
        this.pending.splice(0, batch.length);
        if (!res.ok) {
          if (res.unauthorized) this.hooks.onSignedOut();
          else this.hooks.onError(`${res.error} Your last change wasn't saved.`);
          this.publish();
          continue;
        }
        this.confirmed = res.doc;
        this.lastSync = Date.now();
        const rejected = res.results.find((r) => !r.ok);
        if (rejected && !rejected.ok) this.hooks.onError(rejected.error);
        this.publish();
      }
    } catch {
      // Network failure inside the action call itself.
      this.pending = [];
      lostResponse = true;
      this.hooks.onError("Couldn't reach the server. Your last change wasn't saved.");
      this.publish();
    } finally {
      this.flushing = false;
    }
    // The request may have landed even though the response didn't; re-read the truth.
    if (lostResponse) void this.resync();
  }
}
