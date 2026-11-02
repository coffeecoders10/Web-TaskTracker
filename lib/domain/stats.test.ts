import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indexTasks } from "./tree";
import { dailySummary, dailyWeeks, mainTaskSummary } from "./stats";
import { EMPTY_DOC, type UserDoc } from "./types";

// 2026-11-04 is a Wednesday.
const TODAY = "2026-11-04";

function docWith(log: UserDoc["log"], days?: number[]): UserDoc {
  return {
    ...EMPTY_DOC,
    activities: [{ id: "read", title: "Read", order: 0, ...(days ? { days } : {}) }],
    log,
  };
}

describe("daily stats", () => {
  it("lays out whole Monday-first weeks ending with the current one", () => {
    const days = dailyWeeks(docWith({}), TODAY, 2);
    assert.equal(days.length, 14);
    assert.equal(days[0].date, "2026-10-26");
    assert.equal(days.find((d) => d.date === TODAY)?.future, false);
    assert.equal(days.find((d) => d.date === "2026-11-05")?.future, true);
  });

  it("counts reached days and a streak that tolerates an unfinished today", () => {
    const log = { "2026-11-02": ["read"], "2026-11-03": ["read"] };
    const days = dailyWeeks(docWith(log), TODAY, 1);
    const s = dailySummary(days, TODAY);
    assert.equal(s.goalDays, 2);
    assert.equal(s.streak, 2);
  });

  it("breaks the streak on a missed past day and skips unscheduled days", () => {
    // Only scheduled Mon (1) and Wed (3): Tue is skipped, Mon missed.
    const days = dailyWeeks(docWith({ "2026-10-28": ["read"], "2026-11-04": ["read"] }, [1, 3]), TODAY, 1);
    const s = dailySummary(days, TODAY);
    assert.equal(s.streak, 1);
    assert.equal(s.goalDays, 1);
    assert.equal(s.tracked, 2);
  });
});

describe("main task summary", () => {
  const task = (id: string, parentId: string | null, done: boolean, completedAt: number | null) => ({
    id,
    parentId,
    title: id,
    notes: "",
    done,
    order: 0,
    createdAt: 0,
    completedAt,
  });

  it("counts only top-level tasks, finished once every step is", () => {
    const index = indexTasks([
      task("site", null, false, null),
      task("design", "site", true, 100),
      task("build", "site", true, 300),
      task("taxes", null, false, null),
      task("call", "taxes", true, 50),
      task("taxes2", "taxes", false, null),
      task("laundry", null, true, 200),
    ]);
    const { completed, open } = mainTaskSummary(index);
    assert.deepEqual(completed.map((c) => c.id), ["site", "laundry"]);
    assert.equal(completed[0].completedAt, 300);
    assert.equal(open, 1);
  });
});
