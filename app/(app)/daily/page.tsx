import { redirect } from "next/navigation";

// Daily now lives under Plan; keep old links working.
export default function DailyPage() {
  redirect("/plan?tab=daily");
}
