import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../messages/ru.json";
import { Legend } from "@/components/odontogram/Legend";
import type { ChartState } from "@/components/odontogram/types";

function renderIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
      {ui}
    </NextIntlClientProvider>
  );
}

describe("Legend", () => {
  it("без карты показывает все состояния", () => {
    renderIntl(<Legend />);
    expect(screen.getByText(messages.odontogram.conditions.caries)).toBeInTheDocument();
  });

  it("с картой показывает только присутствующие состояния", () => {
    const chart: ChartState = {
      16: { surfaces: { O: { condition: "caries" } } },
    };
    renderIntl(<Legend chart={chart} />);
    expect(screen.getByText(messages.odontogram.conditions.caries)).toBeInTheDocument();
    expect(screen.queryByText(messages.odontogram.conditions.implant)).not.toBeInTheDocument();
  });
});
