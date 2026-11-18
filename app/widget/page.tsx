import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { WidgetView } from "@/components/widget/WidgetView";
import { dateKeyInZone } from "@/lib/domain/dates";
import { loadDocFresh, requireSession } from "@/lib/dal";

export const metadata: Metadata = { title: "Widget" };

/**
 * Display-only view of today's list, meant to be hosted in a small widget window.
 * It sits outside the (app) shell: no navigation, no store, no interaction.
 */
export default function WidgetPage() {
  return (
    <Suspense fallback={<main style={{ height: "100dvh" }} aria-busy="true" />}>
      <WidgetData />
    </Suspense>
  );
}

async function WidgetData() {
  const session = await requireSession();
  const [doc, jar] = await Promise.all([loadDocFresh(session.userId), cookies()]);
  const today = dateKeyInZone(jar.get("tz")?.value);

  return (
    <WidgetView
      username={session.username}
      today={today}
      tasks={doc.tasks.map((t) => ({ id: t.id, title: t.title, done: t.done }))}
      daily={
        doc.prefs.dailyEnabled
          ? [...doc.activities]
              .sort((a, b) => a.order - b.order)
              .map((a) => ({ id: a.id, title: a.title, days: a.days ?? null }))
          : []
      }
      doneToday={doc.log[today] ?? []}
    />
  );
}
