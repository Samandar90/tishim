"use client";

import { forwardRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";

/**
 * Поле пароля с кнопкой «показать»: на телефоне опечатка в скрытом пароле — самая
 * частая причина «неверная почта или пароль». Кнопка — вне порядка табуляции, чтобы
 * Tab с пароля вёл сразу к кнопке формы.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<typeof Input>, "type">>(
  ({ className, ...props }, ref) => {
    const t = useTranslations("auth");
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-ink"
        >
          {visible ? (
            <EyeOff className="size-4" strokeWidth={1.75} />
          ) : (
            <Eye className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
