"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useDoc } from "@/components/store/AppProvider";
import { formatLongDate } from "@/lib/domain/dates";
import { Icon } from "@/components/ui/Icon";
import { dailySummary, dailyWeeks, mainTaskSummary, type DayStat } from "@/lib/domain/stats";
import ui from "@/components/ui/ui.module.css";
import styles from "./progress.module.css";

const WEEKS = 12;
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function level(d: DayStat): string {
  if (d.future) return "future";
  if (d.due === 0) return "off";
  const r = d.done / d.due;
  if (r === 0) return "0";
  if (r < 0.5) return "1";
  if (r < 1) return "2";
  return "3";
}

function dayLabel(d: DayStat): string {
  const { weekday, rest } = formatLongDate(d.date);
  const what = d.due === 0 ? "nothing scheduled" : `${d.done} of ${d.due} done`;
  return `${weekday.slice(0, 3)} ${rest}: ${what}`;
}

export function ProgressView() {
  const { doc, index, today } = useDoc();

  const [historyOpen, setHistoryOpen] = useState(false);
  const main = useMemo(() => mainTaskSummary(index), [index]);

  const showDaily = doc.prefs.dailyEnabled;
  const days = useMemo(() => dailyWeeks(doc, today, WEEKS), [doc, today]);
  const daily = useMemo(() => dailySummary(days, today), [days, today]);

  return (
    <>
      <PageHeader title="Progress" lead="How far you've come." />

      <section className={styles.block} aria-labelledby="tasks-h">
        <h2 id="tasks-h" className={styles.heading}>
          Main tasks
        </h2>
        {main.completed.length + main.open === 0 ? (
          <p className={styles.empty}>Nothing planned yet. Finished main tasks will collect here.</p>
        ) : (
          <>
            <dl className={styles.stats}>
              <div>
                <dt>Completed</dt>
                <dd className="nums">{main.completed.length}</dd>
              </div>
              <div>
                <dt>Still open</dt>
                <dd className="nums">{main.open}</dd>
              </div>
            </dl>
            {main.completed.length > 0 ? (
              <button type="button" className={`${ui.btn} ${styles.historyBtn}`} onClick={() => setHistoryOpen(true)}>
                <Icon name="undo" size={18} />
                History
              </button>
            ) : null}
          </>
        )}
      </section>

      {showDaily ? (
        <section className={styles.block} aria-labelledby="daily-h">
          <h2 id="daily-h" className={styles.heading}>
            Daily goals
          </h2>
          {doc.activities.length === 0 ? (
            <p className={styles.empty}>Add daily activities in Plan to start tracking them.</p>
          ) : (
            <>
              <dl className={styles.stats}>
                <div>
                  <dt>Goals reached</dt>
                  <dd className="nums">{daily.goalDays}</dd>
                  <span className={styles.statNote}>
                    of <span className="nums">{daily.tracked}</span> days
                  </span>
                </div>
                <div>
                  <dt>Current streak</dt>
                  <dd className="nums">{daily.streak}</dd>
                  <span className={styles.statNote}>{daily.streak === 1 ? "day" : "days"}</span>
                </div>
              </dl>

              <h3 className={styles.sub}>
                Last {WEEKS} weeks <span className={styles.subMeta}>every activity done = full colour</span>
              </h3>
              <div className={styles.heat}>
                <div className={styles.heatLabels} aria-hidden="true">
                  {WEEKDAY_LABELS.map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                </div>
                <ul className={styles.heatGrid} aria-label="Daily goals by day">
                  {days.map((d) => (
                    <li
                      key={d.date}
                      className={styles.cell}
                      data-level={level(d)}
                      title={dayLabel(d)}
                      aria-label={d.future ? undefined : dayLabel(d)}
                      aria-hidden={d.future || undefined}
                    />
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      ) : null}

      <Dialog.Root open={historyOpen} onOpenChange={setHistoryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={ui.overlay} />
          <Dialog.Content className={ui.dialog} aria-describedby={undefined}>
            <Dialog.Title className={ui.dialogTitle}>Completed main tasks</Dialog.Title>
            <ul className={styles.history}>
              {main.completed.map((t) => (
                <li key={t.id} className={styles.historyItem}>
                  <span className={styles.historyTitle}>{t.title}</span>
                  <span className={styles.historyDate}>
                    {t.completedAt === null
                      ? ""
                      : new Date(t.completedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                  </span>
                </li>
              ))}
            </ul>
            <div className={ui.dialogActions}>
              <Dialog.Close className={`${ui.btn} ${ui.btnQuiet}`}>Close</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
