import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";

/**
 * Ссылка «назад» в заголовке страницы. Внутри одна иконка, поэтому имя для
 * скринридера — обязательный проп: без него ссылка читается как пустая.
 */
export function BackLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-ink"
    >
      <ChevronLeftIcon className="size-5" />
    </Link>
  );
}
