import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCommand, normalizeDoc, type Command } from "./commands";
import { dateKeyInZone, shiftDateKey } from "./dates";
import { pickRandom } from "./random";
import {
  ancestorsOf,
  incompleteLeaves,
  indexTasks,
  isComplete,
  orderedLeaves,
  overallProgress,
} from "./tree";
import { DomainError, EMPTY_DOC, type UserDoc } from "./types";

const NOW = Date.UTC(2026, 10, 2, 12, 0, 0);

function run(doc: UserDoc, ...cmds: Command[]): UserDoc {
  return cmds.reduce((d, c) => applyCommand(d, c, NOW), doc);
}

function add(doc: UserDoc, id: string, parentId: string | null, title = id): UserDoc {
  return run(doc, { type: "task.add", id: `id-${id}`.padEnd(8, "_"), parentId: parentId && `id-${parentId}`.padEnd(8, "_"), title });
}

const id = (name: string) => `id-${name}`.padEnd(8, "_");

/**
 * Build a Website
 *   Design (wire, palette)
 *   Develop (setup, auth, dash (layout, apis))
 *   Deploy (host)
 */
function website(): UserDoc {
  let d = EMPTY_DOC;
  d = add(d, "site", null, "Build a Website");
  d = add(d, "design", "site");
  d = add(d, "wire", "design");
  d = add(d, "palette", "design");
  d = add(d, "develop", "site");
  d = add(d, "setup", "develop");
  d = add(d, "auth", "develop");
  d = add(d, "dash", "develop");
  d = add(d, "layout", "dash");
  d = add(d, "apis", "dash");
  d = add(d, "deploy", "site");
  d = add(d, "host", "deploy");
  return d;
}

const done = (d: UserDoc, name: string, value = true) =>
  run(d, { type: "task.setDone", id: id(name), done: value });

describe("hierarchy & progress", () => {
  it("only leaves are actionable and counted", () => {
    const idx = indexTasks(website().tasks);
    const leaves = orderedLeaves(idx).map((t) => t.id);
    assert.deepEqual(leaves, ["wire", "palette", "setup", "auth", "layout", "apis", "host"].map(id));
    assert.deepEqual(overallProgress(idx), { done: 0, total: 7 });
  });

  it("derives parent completion through every ancestor and undoes it", () => {
    let d = website();
    for (const n of ["layout", "apis"]) d = done(d, n);
    let idx = indexTasks(d.tasks);
    assert.equal(isComplete(idx, id("dash")), true);
    assert.equal(isComplete(idx, id("develop")), false);

    for (const n of ["setup", "auth"]) d = done(d, n);
    idx = indexTasks(d.tasks);
    assert.equal(isComplete(idx, id("develop")), true);
    assert.equal(isComplete(idx, id("site")), false);

    d = done(d, "apis", false);
    idx = indexTasks(d.tasks);
    assert.equal(isComplete(idx, id("dash")), false);
    assert.equal(isComplete(idx, id("develop")), false);
    assert.deepEqual(idx.stats.get(id("site")), { done: 3, total: 7 });
  });

  it("adding an incomplete subtask reopens a completed branch", () => {
    let d = website();
    for (const n of ["wire", "palette"]) d = done(d, n);
    assert.equal(isComplete(indexTasks(d.tasks), id("design")), true);
    d = add(d, "homepage", "design");
    assert.equal(isComplete(indexTasks(d.tasks), id("design")), false);
  });

  it("a completed leaf that gains a child stops counting as done", () => {
    let d = add(EMPTY_DOC, "solo", null);
    d = done(d, "solo");
    assert.deepEqual(overallProgress(indexTasks(d.tasks)), { done: 1, total: 1 });
    d = add(d, "step", "solo");
    const idx = indexTasks(d.tasks);
    assert.deepEqual(overallProgress(idx), { done: 0, total: 1 });
    assert.equal(idx.byId.get(id("solo"))!.done, false);
  });

  it("refuses to complete a parent directly", () => {
    assert.throws(() => done(website(), "develop"), DomainError);
  });

  it("works at arbitrary depth without recursion limits", () => {
    let d = add(EMPTY_DOC, "n0", null);
    for (let i = 1; i <= 3000; i++) d = add(d, `n${i}`, `n${i - 1}`);
    d = done(d, "n3000");
    const idx = indexTasks(d.tasks);
    assert.equal(isComplete(idx, id("n0")), true);
    assert.equal(ancestorsOf(idx, id("n3000")).length, 3000);
  });
});

describe("moves", () => {
  it("rejects moving a task into itself or its descendants", () => {
    const d = website();
    assert.throws(
      () => run(d, { type: "task.move", id: id("develop"), parentId: id("develop"), index: 0 }),
      DomainError,
    );
    assert.throws(
      () => run(d, { type: "task.move", id: id("develop"), parentId: id("layout"), index: 0 }),
      DomainError,
    );
  });

  it("re-parents, keeps sibling orders dense, and recalculates progress", () => {
    let d = website();
    d = done(d, "wire");
    d = run(d, { type: "task.move", id: id("wire"), parentId: id("deploy"), index: 0 });
    const idx = indexTasks(d.tasks);
    assert.deepEqual(idx.children.get(id("design"))!.map((t) => t.id), [id("palette")]);
    assert.deepEqual(idx.children.get(id("design"))!.map((t) => t.order), [0]);
    assert.deepEqual(idx.children.get(id("deploy"))!.map((t) => t.id), [id("wire"), id("host")]);
    assert.deepEqual(idx.children.get(id("deploy"))!.map((t) => t.order), [0, 1]);
    assert.deepEqual(idx.stats.get(id("deploy")), { done: 1, total: 2 });
    assert.deepEqual(idx.stats.get(id("design")), { done: 0, total: 1 });
  });

  it("moving under a completed leaf turns it into an open container", () => {
    let d = add(add(EMPTY_DOC, "a", null), "b", null);
    d = done(d, "a");
    d = run(d, { type: "task.move", id: id("b"), parentId: id("a"), index: 0 });
    const idx = indexTasks(d.tasks);
    assert.equal(isComplete(idx, id("a")), false);
    assert.deepEqual(overallProgress(idx), { done: 0, total: 1 });
  });

  it("reorders within the same parent", () => {
    let d = website();
    d = run(d, { type: "task.move", id: id("deploy"), parentId: id("site"), index: 0 });
    const idx = indexTasks(d.tasks);
    assert.deepEqual(
      idx.children.get(id("site"))!.map((t) => t.id),
      [id("deploy"), id("design"), id("develop")],
    );
  });

  it("deleting a subtree removes it from progress", () => {
    let d = website();
    d = run(d, { type: "task.delete", id: id("develop") });
    const idx = indexTasks(d.tasks);
    assert.equal(idx.byId.has(id("layout")), false);
    assert.deepEqual(overallProgress(idx), { done: 0, total: 3 });
  });
});

describe("random picker", () => {
  it("only ever yields incomplete leaves", () => {
    let d = website();
    d = done(d, "wire");
    d = done(d, "host");
    const pool = incompleteLeaves(indexTasks(d.tasks));
    assert.equal(pool.length, 5);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(pickRandom(pool)!.id);
    assert.deepEqual([...seen].sort(), ["apis", "auth", "layout", "palette", "setup"].map(id).sort());
  });

  it("avoids repeating the current pick unless it is the only one", () => {
    const two = [{ id: "a" }, { id: "b" }];
    for (let i = 0; i < 100; i++) assert.equal(pickRandom(two, "a")!.id, "b");
    assert.equal(pickRandom([{ id: "a" }], "a")!.id, "a");
    assert.equal(pickRandom([], null), null);
  });

  it("is roughly uniform", () => {
    const pool = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const counts = new Map<string, number>();
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const k = pickRandom(pool)!.id;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const c of counts.values()) assert.ok(Math.abs(c / N - 0.25) < 0.02);
  });
});

describe("daily activities", () => {
  const act = id("read");
  const base = () => run(EMPTY_DOC, { type: "activity.add", id: act, title: "Read" });
  const today = "2026-11-02";

  it("tracks completion per calendar day independently", () => {
    let d = base();
    d = run(d, { type: "activity.setDone", id: act, date: today, done: true });
    assert.deepEqual(d.log[today], [act]);
    assert.equal(d.log[shiftDateKey(today, 1)], undefined);
    d = run(d, { type: "activity.setDone", id: act, date: today, done: false });
    assert.equal(d.log[today], undefined);
  });

  it("keeps history when the tracker is disabled and re-enabled", () => {
    let d = run(base(), { type: "activity.setDone", id: act, date: today, done: true });
    d = run(d, { type: "prefs.set", dailyEnabled: false });
    d = run(d, { type: "prefs.set", dailyEnabled: true });
    assert.deepEqual(d.log[today], [act]);
    assert.equal(d.activities.length, 1);
  });

  it("rejects bad or far-away dates", () => {
    const d = base();
    assert.throws(() => run(d, { type: "activity.setDone", id: act, date: "nope", done: true }), DomainError);
    assert.throws(
      () => run(d, { type: "activity.setDone", id: act, date: "2020-01-01", done: true }),
      DomainError,
    );
  });

  it("deleting an activity clears its check-ins", () => {
    let d = run(base(), { type: "activity.setDone", id: act, date: today, done: true });
    d = run(d, { type: "activity.delete", id: act });
    assert.deepEqual(d.log, {});
  });

  it("derives the local day from a timezone", () => {
    const instant = new Date(Date.UTC(2026, 10, 2, 23, 30));
    assert.equal(dateKeyInZone("UTC", instant), "2026-11-02");
    assert.equal(dateKeyInZone("Asia/Kolkata", instant), "2026-11-03");
    assert.equal(dateKeyInZone("America/Los_Angeles", instant), "2026-11-02");
    assert.equal(dateKeyInZone("Not/AZone", instant), "2026-11-02");
  });
});

describe("validation & normalisation", () => {
  it("trims names and rejects empty or oversized ones", () => {
    const d = add(EMPTY_DOC, "x", null, "  Hello   world  ");
    assert.equal(d.tasks[0].title, "Hello world");
    assert.throws(() => add(EMPTY_DOC, "y", null, "   "), DomainError);
    assert.throws(() => add(EMPTY_DOC, "z", null, "a".repeat(201)), DomainError);
  });

  it("rejects duplicate ids and unknown parents", () => {
    const d = add(EMPTY_DOC, "x", null);
    assert.throws(() => add(d, "x", null), DomainError);
    assert.throws(() => add(d, "y", "ghost"), DomainError);
  });

  it("repairs malformed stored documents", () => {
    const doc = normalizeDoc({
      tasks: [
        { id: "a", title: "A", parentId: "missing" },
        { id: "a", title: "dup" },
        { nope: true },
      ],
      activities: [{ id: "r", title: "Read" }],
      log: { "2026-11-02": ["r", "ghost"], bad: ["r"] },
      prefs: {},
    });
    assert.equal(doc.tasks.length, 1);
    assert.equal(doc.tasks[0].parentId, null);
    assert.deepEqual(doc.log, { "2026-11-02": ["r"] });
    assert.equal(doc.prefs.dailyEnabled, true);
    assert.deepEqual(normalizeDoc("garbage").tasks, []);
  });
});
