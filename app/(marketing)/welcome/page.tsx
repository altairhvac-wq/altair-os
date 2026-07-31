import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/auth";
import { MissionControlHomepage } from "@/shared/components/homepage/MissionControlHomepage";

export const metadata: Metadata = {
  title: "Altair OS · The Operating System for Field Service Businesses",
  description:
    "Connect leads, customers, jobs, dispatch, technicians, estimates, invoices, payments, and reporting in one field service operating system.",
};

/**
 * Internal route rendered for logged-out visitors at `/` via middleware rewrite.
 * Authenticated users are sent to the dashboard.
 */
export default async function WelcomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return <MissionControlHomepage />;
}
