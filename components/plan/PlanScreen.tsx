"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DailyManager } from "@/components/daily/DailyManager";
import { useDoc } from "@/components/store/AppProvider";
import { PlanView } from "./PlanView";
import styles from "./plan.module.css";

type PlanTab = "tasks" | "daily";

/** The Plan page: the task hierarchy, plus the Daily routine as a second tab. */
export function PlanScreen() {
  const { doc } = useDoc();
  const tab: PlanTab = useSearchParams().get("tab") === "daily" ? "daily" : "tasks";
  const dailyOn = doc.prefs.dailyEnabled;
  const active: PlanTab = dailyOn ? tab : "tasks";

  // With the daily tracker off there is nothing to switch to.
  const tabs = dailyOn ? (
    <nav className={styles.tabs} aria-label="Plan sections">
      <Link
        href="/plan"
        className={styles.tab}
        aria-current={active === "tasks" ? "page" : undefined}
        replace
      >
        Tasks
      </Link>
      <Link
        href="/plan?tab=daily"
        className={styles.tab}
        aria-current={active === "daily" ? "page" : undefined}
        replace
      >
        Daily
      </Link>
    </nav>
  ) : null;

  return active === "daily" ? (
    <DailyManager tabs={tabs} />
  ) : (
    <PlanView rootId={null} tabs={tabs} />
  );
}
