"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MousePointerClick, RotateCw, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  AttachmentKind,
  PaymentStatus,
  Profile,
  Surface,
  ToothCondition,
  ToothRecord,
  VisitType,
} from "@/lib/types/database";
import {
  ALL_CONDITIONS,
  ALL_SURFACES,
  CONDITION_COLORS,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  ROOT_CONDITIONS,
  WHOLE_TOOTH_CONDITIONS,
  centerSurface,
} from "@/lib/constants/teeth";
import { cn, calcTotal, formatMoney, resolveDiscountPercent } from "@/lib/utils";
import { useToothState } from "@/hooks/useToothState";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { buildChartState } from "@/components/odontogram/state";
import { ToothStage } from "@/components/odontogram/ToothStage";
import type { ToothPart } from "@/components/odontogram/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { BackLink } from "@/components/ui/BackLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { WIDE_QUERY, useMediaQuery } from "@/components/ui/useMediaQuery";
import { ChevronLeftIcon, XIcon } from "@/components/icons";

interface VisitItem {
  key: number;
  tooth_fdi: number;
  surfaces: Surface[];
  condition: ToothCondition;
  procedure: string;
  price: number;
  note: string;
  /** Added by "остальные — здоровы": rendered as one aggregated row. */
  bulk?: boolean;
}

const ALL_PERMANENT = [...PERMANENT_UPPER, ...PERMANENT_LOWER];

const STEPS = ["teeth", "details", "payment"] as const;

interface PendingFile {
  file: File;
  kind: AttachmentKind;
}

let itemKey = 0;

/**
 * Форма приёма. На телефоне — лента карточек по шагам «Зубы / Приём / Оплата» с
 * итогом над таб-баром. На широком экране (xl) шаг «Зубы» раскладывается в две
 * колонки: слева схема и записи, справа закреплённая колонка с типом приёма и
 * редактором записи — редактор не уезжает под сгиб, а курсор после выбора зуба
 * сразу в поле процедуры, запись добавляется по Enter.
 */
export function NewVisitForm({
  patient,
  dentistId,
  mappingPrice,
}: {
  patient: Profile;
  dentistId: string;
  mappingPrice: number | null;
}) {
  const t = useTranslations("newVisit");
  const tv = useTranslations("visits");
  const tc = useTranslations("odontogram.conditions");
  const tcommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const {
    chart,
    records,
    loading: chartLoading,
    error: chartError,
    refresh: refreshChart,
  } = useToothState(patient.id);
  const wide = useMediaQuery(WIDE_QUERY);
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState(0);

  // --- record being composed ---
  const [editFdi, setEditFdi] = useState<number | null>(null);
  const [editParts, setEditParts] = useState<ToothPart[]>([]);
  const [condition, setCondition] = useState<ToothCondition>("caries");
  const [procedure, setProcedure] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const procedureRef = useRef<HTMLInputElement>(null);

  // --- accumulated records ---
  const [items, setItems] = useState<VisitItem[]>([]);

  // --- visit fields ---
  const today = new Date().toISOString().slice(0, 10);
  const [visitType, setVisitType] = useState<VisitType>("treatment");
  const [visitDate, setVisitDate] = useState(today);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // На широком экране редактор стоит рядом со схемой: после выбора зуба курсор сразу
  // в «Процедуре», запись набирается с клавиатуры. Поле ставится в середину окна,
  // чтобы и превью зуба, и кнопка были на экране. На телефоне фокус поднял бы
  // клавиатуру поверх схемы, поэтому только там, где есть панель.
  useEffect(() => {
    const field = procedureRef.current;
    if (!wide || editFdi === null || !field) return;
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: "center" });
  }, [wide, editFdi]);

  const isMapping = visitType === "initial_mapping";
  // Первичная цифровизация — фиксированная услуга поверх записей по зубам
  const serviceFee = isMapping && mappingPrice ? mappingPrice : 0;

  const subtotal = useMemo(
    () => serviceFee + items.reduce((s, i) => s + i.price, 0),
    [items, serviceFee]
  );

  // Считаются и зубы из прошлых приёмов: цель разметки — карта без неизвестных
  // зубов, а уже известные «остальные — здоровы» трогать не должна.
  const knownTeeth = useMemo(() => {
    const known = new Set(ALL_PERMANENT.filter((fdi) => fdi in chart));
    for (const i of items) {
      if (ALL_PERMANENT.includes(i.tooth_fdi)) known.add(i.tooth_fdi);
    }
    return known;
  }, [items, chart]);

  function markRestHealthy() {
    // healthy без поверхностей встаёт в слот whole и затёр бы удалённый зуб,
    // имплант или коронку, записанные раньше
    const rest = ALL_PERMANENT.filter((fdi) => !knownTeeth.has(fdi));
    setItems((prev) => [
      ...prev,
      ...rest.map((fdi) => ({
        key: ++itemKey,
        tooth_fdi: fdi,
        surfaces: [] as Surface[],
        condition: "healthy" as ToothCondition,
        procedure: "",
        price: 0,
        note: "",
        bulk: true,
      })),
    ]);
  }

  const discountPercent = useMemo(
    () => resolveDiscountPercent(discountMode, discountValue, subtotal),
    [discountMode, discountValue, subtotal]
  );

  const total = useMemo(() => calcTotal(subtotal, discountPercent), [subtotal, discountPercent]);

  const isWhole = WHOLE_TOOTH_CONDITIONS.includes(condition);
  const isRoot = ROOT_CONDITIONS.includes(condition);

  // Превью зуба в редакторе: история, уже добавленные записи приёма и та, что сейчас
  // набирается, — через ту же свёртку, что построит карту пациента после сохранения.
  const previewState = useMemo(() => {
    if (editFdi === null) return undefined;
    const composed = {
      tooth_fdi: editFdi,
      surfaces: isWhole || isRoot ? [] : (editParts.filter((p) => p !== "root") as Surface[]),
      condition,
    };
    const now = new Date().toISOString();
    const drafts = [...items, composed]
      .filter((i) => i.tooth_fdi === editFdi)
      .map(
        (i, n): ToothRecord => ({
          id: `draft-${n}`,
          visit_id: "draft",
          patient_id: patient.id,
          tooth_fdi: i.tooth_fdi,
          surfaces: i.surfaces,
          condition: i.condition,
          procedure: null,
          note: null,
          price: 0,
          created_at: now,
          seq: n,
        })
      );
    const history = records.filter((r) => r.tooth_fdi === editFdi);
    return buildChartState([...history, ...drafts])[editFdi];
  }, [editFdi, editParts, condition, isWhole, isRoot, items, records, patient.id]);

  function onSurfaceClick(fdi: number, part: ToothPart) {
    if (editFdi !== fdi) {
      setEditFdi(fdi);
      setEditParts([part]);
      if (part === "root" && !isRoot && !isWhole) setCondition("root_canal");
      return;
    }
    setEditParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  function addItem() {
    if (editFdi === null) return;
    const surfaces: Surface[] =
      isWhole || isRoot
        ? []
        : (editParts.filter((p) => p !== "root") as Surface[]);

    setItems((prev) => [
      ...prev,
      {
        key: ++itemKey,
        tooth_fdi: editFdi,
        surfaces,
        condition,
        procedure: procedure.trim(),
        price: parseFloat(price) || 0,
        note: note.trim(),
      },
    ]);
    setEditFdi(null);
    setEditParts([]);
    setProcedure("");
    setPrice("");
    setNote("");
  }

  function closeEditor() {
    setEditFdi(null);
    setEditParts([]);
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  // selection shown on the odontogram: the tooth being edited + already added items
  const selection = useMemo(() => {
    const map: Partial<Record<number, ToothPart[]>> = {};
    for (const item of items) {
      const parts: ToothPart[] = ROOT_CONDITIONS.includes(item.condition)
        ? ["root"]
        : item.surfaces.length > 0
          ? [...item.surfaces]
          : [centerSurface(item.tooth_fdi)];
      map[item.tooth_fdi] = [...(map[item.tooth_fdi] ?? []), ...parts];
    }
    if (editFdi !== null) {
      map[editFdi] = [...(map[editFdi] ?? []), ...editParts];
    }
    return map;
  }, [items, editFdi, editParts]);

  function onFilesPicked(list: FileList | null) {
    if (!list) return;
    const picked: PendingFile[] = Array.from(list).map((file) => ({
      file,
      kind: file.type.startsWith("image/") ? "photo" : "document",
    }));
    setFiles((prev) => [...prev, ...picked].slice(0, 10));
  }

  function goTo(next: number) {
    setStep(next);
    setError(null);
    // новый шаг начинается сверху, а не с середины прокрученной карты
    window.scrollTo({ top: 0 });
  }

  async function save() {
    if (items.length === 0) {
      goTo(0);
      setError(t("needRecords"));
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    try {
      const { data: visit, error: visitError } = await supabase
        .from("visits")
        .insert({
          patient_id: patient.id,
          dentist_id: dentistId,
          visit_type: visitType,
          visit_date: visitDate,
          complaint: complaint.trim() || null,
          diagnosis: diagnosis.trim() || null,
          treatment: treatment.trim() || null,
          recommendation: recommendation.trim() || null,
          subtotal,
          discount_percent: discountPercent,
          total,
          payment_status: paymentStatus,
          next_visit_date: nextVisitDate || null,
        })
        .select("id")
        .single();
      if (visitError || !visit) throw visitError ?? new Error("visit insert failed");

      const { error: recordsError } = await supabase.from("tooth_records").insert(
        items.map((i) => ({
          visit_id: visit.id,
          patient_id: patient.id,
          tooth_fdi: i.tooth_fdi,
          surfaces: i.surfaces,
          condition: i.condition,
          procedure: i.procedure || null,
          note: i.note || null,
          price: i.price,
        }))
      );
      if (recordsError) throw recordsError;

      let failedUploads = 0;
      for (const { file, kind } of files) {
        const path = `${patient.id}/${visit.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(path, file);
        if (uploadError) {
          // потеря вложения не должна отменять уже сохранённый приём,
          // но врач обязан об этом узнать
          console.error("attachment upload failed", uploadError);
          failedUploads += 1;
          continue;
        }
        await supabase.from("attachments").insert({ visit_id: visit.id, file_url: path, kind });
      }

      const notice =
        failedUploads > 0 ? t("attachmentsFailed", { count: failedUploads }) : t("saved");
      // подтверждение показывает карта пациента — переживает переход между страницами
      sessionStorage.setItem("tishim:visit-saved", notice);
      router.push(`/dentist/patient/${patient.id}`);
      router.refresh();
    } catch (e) {
      console.error("save visit failed", e);
      setError(t("saveError"));
      setSaving(false);
    }
  }

  const partLabel = (p: ToothPart) => (p === "root" ? "R" : p);
  const lastStep = STEPS.length - 1;
  const bulkCount = items.filter((i) => i.bulk).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 md:gap-x-3">
        <BackLink
          href={`/dentist/patient/${patient.id}`}
          label={tcommon("back")}
          onClick={(e) => {
            // не терять накопленные записи приёма по случайному тапу «назад»
            if (items.length > 0) {
              e.preventDefault();
              setLeaving(true);
            }
          }}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-h3 text-ink md:text-h2">{t("title")}</h1>
          <p className="truncate text-small text-muted">{patient.full_name}</p>
        </div>

        {/* Шаги — вкладки, а не мастер: к любому можно вернуться, ничего не теряя.
            На телефоне — своей строкой во всю ширину, с md — справа от заголовка. */}
        <div className="flex w-full rounded-xl border border-line bg-card p-0.5 md:w-auto">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(i)}
              aria-current={step === i ? "step" : undefined}
              className={cn(
                "min-h-touch flex-1 rounded-lg px-2 text-small font-medium transition-colors md:flex-none md:px-5",
                step === i ? "bg-primary-600 text-white" : "text-muted hover:text-ink"
              )}
            >
              {t(`steps.${s}`)}
              {s === "teeth" && items.length > 0 && (
                <span className="ml-1.5 tabular-nums opacity-80">{items.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={leaving}
        title={t("leaveConfirmTitle")}
        description={t("leaveConfirmText", { count: items.length })}
        confirmLabel={t("leaveConfirm")}
        danger
        onConfirm={() => router.push(`/dentist/patient/${patient.id}`)}
        onCancel={() => setLeaving(false)}
      />

      {step === 0 && (
        /* Две колонки с xl. Ниже обёртки колонок распадаются (display: contents), и
           карточки выстраиваются в одну ленту в порядке order: тип приёма, схема,
           редактор, записи — без дублирования разметки под два макета. */
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
          <div className="contents xl:flex xl:min-w-0 xl:flex-1 xl:flex-col xl:gap-4">
            <Card className="order-2 xl:order-none">
              <p className="mb-3 text-small text-muted">{t("hint")}</p>
              {/* До загрузки истории карта показала бы все зубы здоровыми — врач мог бы
                  начать отмечать поверхности поверх ещё не пришедшего состояния. */}
              {chartError ? (
                <EmptyState
                  icon={TriangleAlert}
                  title={tcommon("error")}
                  action={
                    <Button variant="secondary" onClick={() => void refreshChart()}>
                      <RotateCw className="size-4" />
                      {tcommon("retry")}
                    </Button>
                  }
                />
              ) : chartLoading ? (
                <ChartSkeleton />
              ) : (
                <Odontogram
                  chart={chart}
                  onSurfaceClick={onSurfaceClick}
                  selection={selection}
                  fitWidth
                />
              )}
            </Card>

            <Card className="order-4 xl:order-none">
              <CardTitle>{t("records")}</CardTitle>
              {items.length === 0 ? (
                <p className="text-small text-muted">{t("noRecords")}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bulkCount > 0 && (
                    <li className="flex items-center gap-3 py-2.5">
                      <span
                        className="inline-block size-4 shrink-0 rounded-md border border-slate-300"
                        style={{ backgroundColor: CONDITION_COLORS.healthy }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {t("healthyBulk", { count: bulkCount })}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {items
                            .filter((i) => i.bulk)
                            .map((i) => i.tooth_fdi)
                            .join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((i) => !i.bulk))}
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={t("healthyBulk", { count: bulkCount })}
                      >
                        <XIcon className="size-4" />
                      </button>
                    </li>
                  )}
                  {items
                    .filter((i) => !i.bulk)
                    .map((item) => (
                      <li key={item.key} className="flex items-center gap-3 py-2.5">
                        <span
                          className="inline-block size-4 shrink-0 rounded-md border border-slate-300"
                          style={{ backgroundColor: CONDITION_COLORS[item.condition] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {t("tooth")} {item.tooth_fdi}
                            {item.surfaces.length > 0 && (
                              <span className="text-slate-500"> · {item.surfaces.join(", ")}</span>
                            )}{" "}
                            · {tc(item.condition)}
                          </p>
                          {item.procedure && (
                            <p className="truncate text-xs text-slate-500">{item.procedure}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-slate-700">
                          {formatMoney(item.price, locale)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={t("tooth") + " " + item.tooth_fdi}
                        >
                          <XIcon className="size-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Колонка не прилипает: редактор выше окна ноутбука, и прилипший столбец
              прятал бы кнопку до самого низа страницы */}
          <div className="contents xl:flex xl:w-80 xl:shrink-0 xl:flex-col xl:gap-4">
            <Card className="order-1 xl:order-none">
              <Label htmlFor="visitType">{t("visitType")}</Label>
              <Select
                id="visitType"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
              >
                {(["treatment", "initial_mapping", "checkup"] as const).map((vt) => (
                  <option key={vt} value={vt}>
                    {t(`types.${vt}`)}
                  </option>
                ))}
              </Select>

              {isMapping && (
                <div className="mt-3 space-y-2.5 rounded-xl bg-primary-50 p-3">
                  <p className="text-sm text-primary-800">{t("mappingHint")}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-primary-600 transition-all"
                      style={{ width: `${Math.round((knownTeeth.size / ALL_PERMANENT.length) * 100)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold tabular-nums text-primary-800">
                      {t("markedCount", { count: knownTeeth.size, total: ALL_PERMANENT.length })}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={markRestHealthy}
                      disabled={
                        chartLoading || chartError !== null || knownTeeth.size >= ALL_PERMANENT.length
                      }
                    >
                      {t("markRestHealthy")}
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {editFdi !== null ? (
              <Card className="order-3 border-primary-200 ring-1 ring-primary-100 xl:order-none">
                <div className="mb-3 flex items-center justify-between">
                  <CardTitle className="mb-0">
                    {t("tooth")} {editFdi}
                  </CardTitle>
                  <button
                    type="button"
                    onClick={closeEditor}
                    aria-label={tcommon("close")}
                    className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                  >
                    <XIcon className="size-5" />
                  </button>
                </div>

                {/* Enter в любом поле добавляет запись — с клавиатуры за десктопом
                    это быстрее, чем тянуться к кнопке */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addItem();
                  }}
                  className="space-y-3 sm:flex sm:items-start sm:gap-4 sm:space-y-0 xl:block xl:space-y-3"
                >
                  <ToothStage
                    fdi={editFdi}
                    state={previewState}
                    className="h-40 bg-slate-900 sm:w-40 sm:shrink-0 xl:w-full"
                  />

                  <div className="min-w-0 flex-1 space-y-3">
                    {!isWhole && !isRoot && (
                      <div>
                        <Label>{t("selectedParts")}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            centerSurface(editFdi),
                            ...ALL_SURFACES.filter((s) => s !== "O" && s !== "I"),
                            "root" as const,
                          ].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() =>
                                setEditParts((prev) =>
                                  prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                                )
                              }
                              className={cn(
                                "min-h-touch min-w-touch rounded-xl border px-3 text-sm font-medium transition-colors",
                                editParts.includes(p)
                                  ? "border-primary-600 bg-primary-50 text-primary-700"
                                  : "border-slate-200 bg-white text-slate-600"
                              )}
                            >
                              {partLabel(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="condition">{t("condition")}</Label>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block size-5 shrink-0 rounded-md border border-slate-300"
                          style={{ backgroundColor: CONDITION_COLORS[condition] }}
                        />
                        <Select
                          id="condition"
                          value={condition}
                          onChange={(e) => setCondition(e.target.value as ToothCondition)}
                        >
                          {ALL_CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {tc(c)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="procedure">{t("procedure")}</Label>
                      <Input
                        id="procedure"
                        ref={procedureRef}
                        value={procedure}
                        onChange={(e) => setProcedure(e.target.value)}
                        placeholder={t("procedurePlaceholder")}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="price">{t("price")}</Label>
                        <Input
                          id="price"
                          type="number"
                          min={0}
                          step="1000"
                          inputMode="numeric"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="note">{t("note")}</Label>
                        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
                      </div>
                    </div>

                    <Button type="submit" className="w-full sm:w-auto xl:w-full">
                      {t("addRecord")}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              /* Пустая панель только на широком экране: на телефоне редактор
                 появляется под схемой, и место под него держать незачем */
              <Card className="order-3 hidden flex-col items-center justify-center gap-3 py-12 text-center xl:order-none xl:flex">
                <MousePointerClick aria-hidden className="size-8 text-slate-400" strokeWidth={1.5} />
                <p className="text-body text-muted">{t("noRecords")}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <Card className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="visitDate">{t("visitDate")}</Label>
              <Input
                id="visitDate"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextVisitDate">{t("nextVisitDate")}</Label>
              <Input
                id="nextVisitDate"
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
              />
            </div>
          </div>
          {/* Текстовые поля парами с md: во всю ширину строка вырастала до 120+ знаков */}
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            <div>
              <Label htmlFor="complaint">{t("complaint")}</Label>
              <Textarea id="complaint" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="diagnosis">{t("diagnosis")}</Label>
              <Textarea id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="treatment">{t("treatment")}</Label>
              <Textarea id="treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="recommendation">{t("recommendation")}</Label>
              <Textarea
                id="recommendation"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="files">{tv("attachments")}</Label>
            <input
              id="files"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => onFilesPicked(e.target.files)}
              className="block w-full text-body text-muted file:mr-3 file:min-h-touch file:rounded-xl file:border-0 file:bg-primary-50 file:px-3.5 file:text-body file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-1.5 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                    <Select
                      className="w-full px-2 text-sm sm:w-32"
                      value={f.kind}
                      onChange={(e) =>
                        setFiles((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, kind: e.target.value as AttachmentKind } : x
                          )
                        )
                      }
                    >
                      {(["photo", "xray", "document"] as const).map((k) => (
                        <option key={k} value={k}>
                          {tv(`attachmentKinds.${k}`)}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={tcommon("delete")}
                      className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {step === 2 && (
        /* С md свод слева, статус оплаты справа: на всю ширину подпись и сумма
           разъезжались по краям почти на метр экрана */
        <Card className="md:grid md:grid-cols-2 md:gap-x-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-body">
              <span className="text-muted">{t("records")}</span>
              <span className="font-medium tabular-nums">{items.length}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex items-center justify-between text-body">
                <span className="text-muted">{t("mappingService")}</span>
                <span className="font-medium tabular-nums">{formatMoney(serviceFee, locale)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-body">
              <span className="text-muted">{t("subtotal")}</span>
              <span className="font-medium tabular-nums">{formatMoney(subtotal, locale)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 rounded-xl border border-line bg-card p-0.5">
                {(["percent", "amount"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDiscountMode(m)}
                    className={cn(
                      "min-h-touch rounded-lg px-3 text-small font-medium transition-colors sm:min-h-0 sm:py-1.5",
                      discountMode === m ? "bg-primary-600 text-white" : "text-muted hover:text-ink"
                    )}
                  >
                    {m === "percent" ? "%" : t("subtotal")}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                className="flex-1"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={t("discount")}
                aria-label={t("discount")}
              />
              <span className="shrink-0 text-small tabular-nums text-muted">
                −{Math.round(discountPercent * 10) / 10}%
              </span>
            </div>
          </div>
          <div className="mt-3 md:mt-0">
            <Label htmlFor="paymentStatus">{t("paymentStatus")}</Label>
            <Select
              id="paymentStatus"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            >
              {(["unpaid", "partial", "paid"] as const).map((s) => (
                <option key={s} value={s}>
                  {tv(`statuses.${s}`)}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {/* Закреплённая снизу панель: итог виден на любом шаге, а сохранение — на
          последнем, где врач заодно сверяет скидку и статус оплаты. На телефоне
          прижата к таб-бару во всю ширину, с md — плавающая карточка по ширине
          контента. Ошибка живёт тут же: она видна, где бы ни стояла прокрутка. */}
      <div className="sticky bottom-16 z-30 -mx-4 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:bottom-4 md:mx-0 md:rounded-2xl md:border md:px-5 md:shadow-modal">
        {error && (
          <p role="alert" className="mb-2 rounded-xl bg-red-50 px-3.5 py-2 text-small text-danger">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-small text-muted">{t("total")}</p>
            <p className="truncate text-h3 tabular-nums text-primary-700">
              {formatMoney(total, locale)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {step > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => goTo(step - 1)}
                aria-label={tcommon("back")}
              >
                <ChevronLeftIcon className="size-5" />
                <span className="hidden sm:inline">{tcommon("back")}</span>
              </Button>
            )}
            {step < lastStep ? (
              <Button size="lg" onClick={() => goTo(step + 1)}>
                {t("next")}
              </Button>
            ) : (
              <Button size="lg" onClick={save} loading={saving}>
                {t("save")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
