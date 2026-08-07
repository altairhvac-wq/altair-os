import { redirect } from "next/navigation";

/** Integrations merged into Company's Connections section (settings IA v2). */
export default function IntegrationsSettingsRedirect() {
  redirect("/settings/company#connections");
}
