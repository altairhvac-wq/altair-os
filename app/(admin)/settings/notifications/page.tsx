import { redirect } from "next/navigation";

/**
 * Retired settings tab (settings IA v2): this page previewed the in-app
 * notification inbox, which duplicates the header bell — the bell IS the
 * notifications UI. No configurable notification settings exist yet; when
 * real per-user notification preferences land, they get a section on the
 * Company page (or their own tab if they outgrow it).
 */
export default function NotificationsSettingsRedirect() {
  redirect("/settings");
}
