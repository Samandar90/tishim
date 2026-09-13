import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

/**
 * Экраны входа и регистрации: переключатель языка обязателен — сюда попадают
 * и после выхода, и по прямой ссылке, а локаль хранится только в cookie.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10">
        <LocaleSwitcher />
      </div>
      {children}
    </div>
  );
}
