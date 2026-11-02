import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ShellSkeleton } from "@/components/shell/ShellSkeleton";
import { AppProvider } from "@/components/store/AppProvider";
import { Toaster } from "@/components/ui/Toaster";
import { dateKeyInZone } from "@/lib/domain/dates";
import { loadDoc, requireSession } from "@/lib/dal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Toaster>
      <Suspense fallback={<ShellSkeleton />}>
        <Authed>{children}</Authed>
      </Suspense>
    </Toaster>
  );
}

/**
 * Everything that needs the signed-in user lives behind this boundary: the session
 * is verified, the user's single document is loaded once, and from then on the
 * client store owns it. Client navigations between pages never refetch.
 */
async function Authed({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const [doc, jar] = await Promise.all([loadDoc(session.userId), cookies()]);

  return (
    <AppProvider
      initialDoc={doc}
      initialToday={dateKeyInZone(jar.get("tz")?.value)}
      user={{ name: session.name, username: session.username }}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
