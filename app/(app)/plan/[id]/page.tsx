import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanView } from "@/components/plan/PlanView";

export const metadata: Metadata = { title: "Plan" };

export default function BranchPage(props: PageProps<"/plan/[id]">) {
  return (
    <Suspense fallback={null}>
      <Branch params={props.params} />
    </Suspense>
  );
}

async function Branch({ params }: { params: PageProps<"/plan/[id]">["params"] }) {
  const { id } = await params;
  return <PlanView rootId={id} />;
}
