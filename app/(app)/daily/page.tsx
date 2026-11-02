import type { Metadata } from "next";
import { DailyManager } from "@/components/daily/DailyManager";

export const metadata: Metadata = { title: "Daily" };

export default function DailyPage() {
  return <DailyManager />;
}
