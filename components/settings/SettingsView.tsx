"use client";

import * as Switch from "@radix-ui/react-switch";
import { logout } from "@/actions/auth";
import { PageHeader } from "@/components/shell/PageHeader";
import { useActions, useDoc } from "@/components/store/AppProvider";
import ui from "@/components/ui/ui.module.css";
import styles from "./settings.module.css";

export function SettingsView() {
  const { doc, user } = useDoc();
  const { dispatch } = useActions();

  return (
    <>
      <PageHeader title="Settings" />

      <section className={styles.section} aria-labelledby="features-h">
        <h2 id="features-h" className={styles.heading}>
          Features
        </h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <label htmlFor="daily-switch" className={styles.rowTitle}>
              Daily tracker
            </label>
            <p className={styles.rowHelp}>
              Show daily activities on Today. Turning it off hides it everywhere and keeps your
              activities and history.
            </p>
          </div>
          <Switch.Root
            id="daily-switch"
            className={ui.switch}
            checked={doc.prefs.dailyEnabled}
            onCheckedChange={(dailyEnabled) => dispatch({ type: "prefs.set", dailyEnabled })}
          >
            <Switch.Thumb className={ui.switchThumb} />
          </Switch.Root>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="account-h">
        <h2 id="account-h" className={styles.heading}>
          Account
        </h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>{user.name}</p>
            <p className={styles.rowHelp}>@{user.username}</p>
          </div>
          <form action={logout}>
            <button type="submit" className={`${ui.btn} ${ui.btnQuiet}`}>
              Sign out
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
