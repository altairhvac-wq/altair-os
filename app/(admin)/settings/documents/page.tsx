import { redirect } from "next/navigation";

/** Documents merged into Company (settings IA v2) — one defaults card. */
export default function DocumentsSettingsRedirect() {
  redirect("/settings/company#documents");
}
