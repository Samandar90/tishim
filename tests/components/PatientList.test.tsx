import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../messages/ru.json";
import { PatientList, type PatientRow } from "@/components/dentist/PatientList";

const t = messages.dentist;

const PATIENTS: PatientRow[] = [
  {
    accessId: "a1",
    patientId: "p1",
    fullName: "Малика Азимова",
    phone: "+998 90 123 45 67",
    birthDate: "1992-04-15",
    grantedAt: null,
  },
  {
    accessId: "a2",
    patientId: "p2",
    fullName: "Жасур Тошматов",
    phone: null,
    birthDate: null,
    grantedAt: null,
  },
];

function renderList(patients: PatientRow[]) {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
      <PatientList patients={patients} />
    </NextIntlClientProvider>
  );
}

function search(value: string) {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
}

describe("PatientList", () => {
  it("каждый пациент — ссылка на его карту", () => {
    renderList(PATIENTS);

    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dentist/patient/p1",
      "/dentist/patient/p2",
    ]);
    expect(links[0]).toHaveTextContent("Малика Азимова");
    expect(links[0]).toHaveTextContent("15.04.1992");
  });

  it("ищет по имени и по телефону без учёта регистра", () => {
    renderList(PATIENTS);

    search("  жасур ");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveTextContent("Жасур Тошматов");

    search("123 45");
    expect(screen.getByRole("link")).toHaveTextContent("Малика Азимова");
  });

  it("поиск без совпадений — своё пустое состояние, а не «пациентов пока нет»", () => {
    renderList(PATIENTS);

    search("эюя");

    expect(screen.getByText(t.searchEmpty)).toBeInTheDocument();
    expect(screen.getByText(/«эюя»/)).toBeInTheDocument();
    expect(screen.queryByText(t.empty)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("«Сбросить поиск» возвращает весь список", () => {
    renderList(PATIENTS);

    search("эюя");
    fireEvent.click(screen.getByRole("button", { name: t.searchReset }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("без пациентов — подсказка про код доступа и никакого поля поиска", () => {
    renderList([]);

    expect(screen.getByText(t.empty)).toBeInTheDocument();
    expect(screen.getByText(t.emptyHint)).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
