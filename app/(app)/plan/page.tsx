import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanScreen } from "@/components/plan/PlanScreen";
import { PlanView } from "@/components/plan/PlanView";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  // The tab lives in the URL, which only the client reads; show the task plan until it resolves.
  return (
    <Suspense fallback={<PlanView rootId={null} />}>
      <PlanScreen />
    </Suspense>
  );
}
