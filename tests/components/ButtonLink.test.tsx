import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

describe("ButtonLink", () => {
  it("это одна ссылка, без кнопки внутри", () => {
    render(<ButtonLink href="/login">Войти</ButtonLink>);

    const link = screen.getByRole("link", { name: "Войти" });
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("выглядит как Button с теми же пропсами", () => {
    render(
      <>
        <Button variant="secondary" size="lg" block className="sm:w-auto">
          кнопка
        </Button>
        <ButtonLink href="/" variant="secondary" size="lg" block className="sm:w-auto">
          ссылка
        </ButtonLink>
      </>
    );

    expect(screen.getByRole("link").className).toBe(screen.getByRole("button").className);
  });

  it("якорь внутри страницы остаётся якорем", () => {
    render(<ButtonLink href="#request-form">Записаться</ButtonLink>);

    expect(screen.getByRole("link")).toHaveAttribute("href", "#request-form");
  });
});
