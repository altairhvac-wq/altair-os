import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/auth";
import { ResetPasswordForm } from "@/shared/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=auth_callback");
  }

  return <ResetPasswordForm />;
}
