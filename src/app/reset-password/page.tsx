import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";

// The reset link signs the user in via /auth/callback, so a valid session is required here.
export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <Suspense>
      <AuthForm mode="reset" />
    </Suspense>
  );
}
