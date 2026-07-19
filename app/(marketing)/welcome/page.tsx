import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/auth";
import { MissionControlHomepage } from "@/shared/components/homepage/MissionControlHomepage";

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
