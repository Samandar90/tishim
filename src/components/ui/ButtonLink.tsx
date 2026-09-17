import type { ComponentProps } from "react";
import Link from "next/link";
import { buttonClasses, type ButtonStyleProps } from "./Button";

/**
 * Ссылка с видом кнопки — для переходов. <Link><Button/></Link> давал <a><button>:
 * интерактивный элемент внутри интерактивного невалиден, Tab останавливался на паре
 * дважды, а скринридер читал её как два разных элемента.
 */
export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: ButtonStyleProps & Omit<ComponentProps<typeof Link>, "className">) {
  return <Link className={buttonClasses({ variant, size, block, className })} {...props} />;
}
