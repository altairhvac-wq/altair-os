import { notFound } from "next/navigation";
import { TechnicianDashboardView } from "@/shared/components/technician/TechnicianDashboardView";

/**
 * Development-only mock technician dashboard. Not available in production.
 */
export default function TechDemoPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <TechnicianDashboardView />;
}
