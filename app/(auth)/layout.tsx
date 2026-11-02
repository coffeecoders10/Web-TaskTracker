import type { ReactNode } from "react";
import { AuthHero } from "@/components/auth/AuthHero";
import styles from "@/components/auth/auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.shell}>
      <AuthHero />
      <div className={styles.panel}>{children}</div>
    </main>
  );
}
