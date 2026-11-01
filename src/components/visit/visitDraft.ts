import type { PaymentStatus } from "@/lib/types/database";

/** Что из формы приёма переживает перезагрузку и уход с экрана (файлы — нет, их нельзя сохранить). */
export interface VisitDraft {
  items: Array<{
    tooth_fdi: number;
    surfaces: string[];
    condition: string;
    procedure: string;
    price: number;
    note: string;
    bulk?: boolean;
  }>;
  visitType: string;
  visitDate: string;
  nextVisitDate: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  recommendation: string;
  paymentStatus: PaymentStatus;
  discountMode: "percent" | "amount";
  discountValue: string;
  paidAmount: string;
  step: number;
}

export const draftKey = (patientId: string) => `tishim:visit-draft:${patientId}`;

/** Есть ли в черновике что-то, что жалко потерять. */
export function draftIsDirty(d: Pick<VisitDraft, "items" | "complaint" | "diagnosis" | "treatment" | "recommendation">) {
  return (
    d.items.length > 0 ||
    [d.complaint, d.diagnosis, d.treatment, d.recommendation].some((v) => v.trim() !== "")
  );
}

/**
 * Сколько получено по приёму: «оплачено» — весь итог, «не оплачено» — ноль,
 * «частично» — что ввёл врач. В базе это paid_amount, долг пациента — total − paid_amount.
 */
export function paidFor(status: PaymentStatus, total: number, input: string): number {
  if (status === "paid") return total;
  if (status === "unpaid") return 0;
  const n = Math.round(parseFloat(input) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type VisitProblem =
  | "needRecords"
  | "dateInvalid"
  | "nextDateInvalid"
  | "paidInvalid"
  | null;

/** Проверки перед сохранением, которых раньше не было: даты не проверялись, «частично» принимало любую сумму. */
export function validateVisit(input: {
  itemsCount: number;
  visitDate: string;
  nextVisitDate: string;
  today: string;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  total: number;
}): VisitProblem {
  if (input.itemsCount === 0) return "needRecords";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitDate) || input.visitDate > input.today) return "dateInvalid";
  if (input.nextVisitDate && input.nextVisitDate < input.visitDate) return "nextDateInvalid";
  if (
    input.paymentStatus === "partial" &&
    !(input.paidAmount > 0 && input.paidAmount < input.total)
  ) {
    return "paidInvalid";
  }
  return null;
}

/** На какой шаг вернуть врача, чтобы исправить ошибку. */
export function stepForProblem(problem: Exclude<VisitProblem, null>): number {
  if (problem === "needRecords") return 0;
  if (problem === "paidInvalid") return 2;
  return 1;
}
