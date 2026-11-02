"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useDoc } from "@/components/store/AppProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./shell.module.css";

type NavItem = { href: string; label: string; icon: IconName };

const ITEMS: (NavItem & { daily?: boolean })[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/tasks", label: "Tasks", icon: "list" },
  { href: "/plan", label: "Plan", icon: "tree" },
  { href: "/daily", label: "Daily", icon: "repeat", daily: true },
  { href: "/settings", label: "Settings", icon: "gear" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { doc, user, saving } = useDoc();

  // The Daily tracker disappears from navigation entirely when switched off.
  const items = ITEMS.filter((i) => !i.daily || doc.prefs.dailyEnabled);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <Link href="/" className={styles.wordmark}>
          Onward
        </Link>
        <nav aria-label="Primary" className={styles.sideNav}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.sideLink}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <p className={styles.sideUser}>{user.name}</p>
          <p className={styles.sideStatus} role="status">
            {saving ? "Saving…" : " "}
          </p>
        </div>
      </aside>

      <main id="main" className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>

      <nav aria-label="Primary" className={styles.tabbar}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.tab}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
