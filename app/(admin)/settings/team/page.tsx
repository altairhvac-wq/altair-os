import { redirect } from "next/navigation";

/**
 * Legacy /settings/team route — the Users tab is canonical at
 * /settings/users (ALTAIR_ARCHITECTURE.md naming law). Distinct from the
 * main-nav Team hub (/team), which is the technician roster.
 */
export default function TeamSettingsRedirect() {
  redirect("/settings/users");
}
