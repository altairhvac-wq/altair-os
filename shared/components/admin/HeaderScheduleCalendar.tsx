import Link from "next/link";
import { CalendarDays } from "lucide-react";

type HeaderScheduleCalendarProps = {
  tone?: "light" | "dark";
  triggerClassName?: string;
};

export function HeaderScheduleCalendar({
  tone = "light",
  triggerClassName,
}: HeaderScheduleCalendarProps) {
  return (
    <Link
      href="/schedule"
      className={`rounded-lg p-2 transition-colors ${
        triggerClassName ??
        (tone === "dark"
          ? "text-slate-400 hover:bg-white/10 hover:text-slate-200"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")
      }`}
      aria-label="Schedule"
    >
      <CalendarDays className="h-5 w-5" />
    </Link>
  );
}
