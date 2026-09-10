import { redirect } from "next/navigation";
import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";

/**
 * Chrome-less route group for full-viewport creative surfaces.
 *
 * ==================== WHY NOT (admin) ====================
 * Every `(admin)` route renders inside `AdminShell` — a 14.5rem sidebar, a
 * 3.75rem header, and a padded `<main>` that clips horizontal overflow. A
 * timeline is the one thing in this product that must scroll horizontally and
 * own the full height, so it cannot live under that layout. `(concept)` set the
 * precedent for this: same gates, no shell.
 *
 * ==================== THE GATES ARE THE SAME, MINUS THE SHELL QUERIES ====================
 * Login, active company, and the technician redirect are kept, because a
 * surface that skipped them would be a hole in exactly the places `(admin)`
 * closes. What is deliberately NOT repeated is the shell's three per-request
 * queries (notifications, unread count, live theme) — they exist to paint
 * chrome this group does not render.
 *
 * PERMISSION IS NOT ENFORCED HERE. It is per-page, like every other surface in
 * this repository: `/marketing` checks in its own page, and so does the editor.
 * A layout gate would be a second place the rule lives.
 */
export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (shouldUseTechnicianHome(companyContext)) {
    redirect("/technician");
  }

  return children;
}
