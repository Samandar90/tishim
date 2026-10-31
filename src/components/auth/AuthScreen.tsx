import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";

/** Каркас экранов входа: логотип и одна карточка по центру — у входа, восстановления и нового пароля он один. */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md p-6 md:p-7">{children}</Card>
    </div>
  );
}
