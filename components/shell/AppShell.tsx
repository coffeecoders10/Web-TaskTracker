"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import { useDoc } from "@/components/store/AppProvider";
import { BrandArt } from "@/components/ui/BrandArt";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./shell.module.css";

type NavItem = { href: string; label: string; icon: IconName };

const ITEMS: (NavItem & { tabbar?: false })[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/tasks", label: "Tasks", icon: "list" },
  { href: "/plan", label: "Plan", icon: "tree" },
  { href: "/progress", label: "Progress", icon: "chart" },
  // Reachable from the top bar on mobile, so it doesn't take a tab.
  { href: "/settings", label: "Settings", icon: "gear", tabbar: false },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, saving } = useDoc();

  const tabs = ITEMS.filter((i) => i.tabbar !== false);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <BrandArt className={styles.backdrop} />

      <aside className={styles.sidebar}>
        <Link href="/" className={styles.wordmark}>
          Onward
        </Link>
        <nav aria-label="Primary" className={styles.sideNav}>
          {ITEMS.map((item) => (
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
      </aside>

      <header className={styles.topbar}>
        <Link href="/" className={styles.topBrand}>
          Onward
        </Link>
        <p className={styles.topStatus} role="status">
          {saving ? "Saving…" : " "}
        </p>
        <p className={styles.topUser}>{user.name}</p>
        <Link
          href="/settings"
          className={styles.topBtn}
          aria-label="Settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
        >
          <Icon name="gear" size={20} />
        </Link>
        <form action={logout}>
          <button type="submit" className={styles.topBtn} aria-label="Sign out">
            <Icon name="logout" size={20} />
          </button>
        </form>
      </header>

      <main id="main" className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>

      <nav aria-label="Primary" className={styles.tabbar}>
        {tabs.map((item) => (
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
