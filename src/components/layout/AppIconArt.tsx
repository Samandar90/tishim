import { TOOTH_PATH } from "@/components/icons";

/**
 * Рисунок иконки приложения для Satori (next/og): только inline-стили,
 * Tailwind-классы здесь не работают. Знак тот же, что в <Logo/>: бирюзовый
 * квадрат и белый контур зуба.
 *
 * `maskable` — вариант под маску Android: заливка во весь холст без скруглений
 * (систему скругляет сама), зуб меньше, чтобы попасть в безопасную зону 80%.
 */
export function AppIconArt({ size, maskable }: { size: number; maskable?: boolean }) {
  const toothSize = Math.round(size * (maskable ? 0.46 : 0.56));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0891b2",
        borderRadius: maskable ? 0 : Math.round(size * 0.24),
      }}
    >
      <svg
        width={toothSize}
        height={toothSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={TOOTH_PATH} />
      </svg>
    </div>
  );
}
