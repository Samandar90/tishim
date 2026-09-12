import { describe, expect, it } from "vitest";
import { quadrantKey, toothPositionKey } from "@/lib/constants/teeth";

describe("toothPositionKey", () => {
  it("постоянные: позиция в квадранте → анатомическое имя", () => {
    expect(toothPositionKey(11)).toBe("centralIncisor");
    expect(toothPositionKey(22)).toBe("lateralIncisor");
    expect(toothPositionKey(33)).toBe("canine");
    expect(toothPositionKey(44)).toBe("firstPremolar");
    expect(toothPositionKey(15)).toBe("secondPremolar");
    expect(toothPositionKey(26)).toBe("firstMolar");
    expect(toothPositionKey(37)).toBe("secondMolar");
    expect(toothPositionKey(48)).toBe("thirdMolar");
  });

  it("молочные: премоляров нет, 4 и 5 — моляры", () => {
    expect(toothPositionKey(51)).toBe("centralIncisor");
    expect(toothPositionKey(63)).toBe("canine");
    expect(toothPositionKey(74)).toBe("firstMolar");
    expect(toothPositionKey(85)).toBe("secondMolar");
  });
});

describe("quadrantKey", () => {
  it("сторона — с точки зрения пациента, как в FDI", () => {
    expect(quadrantKey(16)).toBe("upperRight");
    expect(quadrantKey(26)).toBe("upperLeft");
    expect(quadrantKey(36)).toBe("lowerLeft");
    expect(quadrantKey(46)).toBe("lowerRight");
  });

  it("молочные квадранты 5–8 ложатся на те же четыре стороны", () => {
    expect(quadrantKey(55)).toBe("upperRight");
    expect(quadrantKey(65)).toBe("upperLeft");
    expect(quadrantKey(75)).toBe("lowerLeft");
    expect(quadrantKey(85)).toBe("lowerRight");
  });
});
