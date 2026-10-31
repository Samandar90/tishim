import { AuthScreen } from "@/components/auth/AuthScreen";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

/** ?error=link ставит /api/auth/confirm, когда ссылка из письма не прошла проверку. */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthScreen>
      <ForgotPasswordForm linkFailed={error === "link"} />
    </AuthScreen>
  );
}
