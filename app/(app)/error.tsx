"use client";

import ui from "@/components/ui/ui.module.css";

export default function AppError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className={ui.empty}>
        <p className={ui.emptyTitle}>Couldn&apos;t load your tasks.</p>
        <p className={ui.emptyText}>
          The server didn&apos;t respond. Your data is safe; check your connection and try again.
        </p>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => retry()}>
          Try again
        </button>
      </div>
    </main>
  );
}
