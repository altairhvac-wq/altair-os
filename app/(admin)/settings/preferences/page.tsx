import { redirect } from "next/navigation";

/** Preferences merged into Company (settings IA v2) — it was one timezone field. */
export default function PreferencesSettingsRedirect() {
  redirect("/settings/company#preferences");
}
