import type { ReactNode } from "react";
import { AuthHero } from "@/components/auth/AuthHero";
import { BuiltBy } from "@/components/ui/BuiltBy";
import styles from "@/components/auth/auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.shell}>
      <AuthHero />
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          {children}
          <BuiltBy className={styles.credit} />
        </div>
      </div>
    </main>
  );
}
