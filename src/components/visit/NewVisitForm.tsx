"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type {
  AttachmentKind,
  PaymentStatus,
  Profile,
  Surface,
  ToothCondition,
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
import type { ToothPart } from "@/components/odontogram/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

interface PendingFile {
  file: File;
  kind: AttachmentKind;
}

let itemKey = 0;

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
  const locale = useLocale();
  const router = useRouter();

  const { chart, loading: chartLoading } = useToothState(patient.id);
  const [leaving, setLeaving] = useState(false);

  // --- record being composed ---
  const [editFdi, setEditFdi] = useState<number | null>(null);
  const [editParts, setEditParts] = useState<ToothPart[]>([]);
  const [condition, setCondition] = useState<ToothCondition>("caries");
  const [procedure, setProcedure] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

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

  async function save() {
    if (items.length === 0) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/dentist/patient/${patient.id}`}
          onClick={(e) => {
            // не терять накопленные записи приёма по случайному тапу «назад»
            if (items.length > 0) {
              e.preventDefault();
              setLeaving(true);
            }
          }}
          className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{patient.full_name}</p>
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

      {/* --- visit type --- */}
      <Card>
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
                disabled={chartLoading || knownTeeth.size >= ALL_PERMANENT.length}
              >
                {t("markRestHealthy")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm text-slate-500">{t("hint")}</p>
        {/* До загрузки истории карта показала бы все зубы здоровыми — врач мог бы
            начать отмечать поверхности поверх ещё не пришедшего состояния. */}
        {chartLoading ? (
          <ChartSkeleton />
        ) : (
          <Odontogram chart={chart} onSurfaceClick={onSurfaceClick} selection={selection} />
        )}
      </Card>

      {/* --- record editor --- */}
      {editFdi !== null && (
        <Card className="border-primary-200 ring-1 ring-primary-100">
          <div className="mb-3 flex items-center justify-between">
            <CardTitle className="mb-0">
              {t("tooth")} {editFdi}
            </CardTitle>
            <button
              type="button"
              onClick={() => {
                setEditFdi(null);
                setEditParts([]);
              }}
              className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="space-y-3">
            {!isWhole && !isRoot && (
              <div>
                <Label>{t("selectedParts")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[centerSurface(editFdi), ...ALL_SURFACES.filter((s) => s !== "O" && s !== "I"), "root" as const].map(
                    (p) => (
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
                    )
                  )}
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="procedure">{t("procedure")}</Label>
                <Input
                  id="procedure"
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  placeholder={t("procedurePlaceholder")}
                />
              </div>
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
            </div>

            <div>
              <Label htmlFor="note">{t("note")}</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <Button type="button" onClick={addItem} className="w-full sm:w-auto">
              {t("addRecord")}
            </Button>
          </div>
        </Card>
      )}

      {/* --- accumulated records --- */}
      <Card>
        <CardTitle>{t("records")}</CardTitle>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noRecords")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.filter((i) => i.bulk).length > 0 && (
              <li className="flex items-center gap-3 py-2.5">
                <span
                  className="inline-block size-4 shrink-0 rounded-md border border-slate-300"
                  style={{ backgroundColor: CONDITION_COLORS.healthy }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {t("healthyBulk", { count: items.filter((i) => i.bulk).length })}
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
                  aria-label={t("healthyBulk", { count: items.filter((i) => i.bulk).length })}
                >
                  <XIcon className="size-4" />
                </button>
              </li>
            )}
            {items.filter((i) => !i.bulk).map((item) => (
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

        {/* --- суммы и скидка --- */}
        <div className="mt-4 space-y-3 border-t border-line pt-4">
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
      </Card>

      {/* --- visit details --- */}
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
        <div>
          <Label htmlFor="complaint">{t("complaint")}</Label>
          <Textarea
            id="complaint"
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="diagnosis">{t("diagnosis")}</Label>
          <Textarea
            id="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="treatment">{t("treatment")}</Label>
          <Textarea
            id="treatment"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="recommendation">{t("recommendation")}</Label>
          <Textarea
            id="recommendation"
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
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
                      className="text-slate-400 hover:text-red-600"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger">{error}</p>
      )}

      {/* Закреплённая снизу панель: врач всегда видит итог и может сохранить,
          не прокручивая длинную форму обратно вниз. */}
      <div className="sticky bottom-16 z-30 -mx-4 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:-mx-6 md:rounded-b-2xl md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-small text-muted">{t("total")}</p>
            <p className="truncate text-h3 tabular-nums text-primary-700">
              {formatMoney(total, locale)}
            </p>
          </div>
          <Button size="lg" onClick={save} loading={saving} className="shrink-0">
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
