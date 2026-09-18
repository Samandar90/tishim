"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Clinic } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";

const PHOTO_BUCKET = "avatars";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface DentistProfileInitial {
  specialization: string | null;
  license_number: string | null;
  clinic_id: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
}

/**
 * Профиль врача: онбординг после регистрации и последующее редактирование.
 * Пока специализация не заполнена, карточка раскрыта — без неё врача не
 * покажешь пациентам. Дальше сворачивается, чтобы не занимать список приёмов.
 */
export function DentistProfileSetup({
  dentistId,
  userId,
  clinics,
  initial,
}: {
  dentistId: string;
  userId: string;
  clinics: Pick<Clinic, "id" | "name">[];
  initial: DentistProfileInitial;
}) {
  const t = useTranslations("dentist.profileSetup");
  const router = useRouter();
  const needsSetup = !initial.specialization;

  const [open, setOpen] = useState(needsSetup);
  const [specialization, setSpecialization] = useState(initial.specialization ?? "");
  const [license, setLicense] = useState(initial.license_number ?? "");
  const [clinicId, setClinicId] = useState(initial.clinic_id ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [experience, setExperience] = useState(
    initial.experience_years === null ? "" : String(initial.experience_years)
  );
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Сбрасываем сразу: иначе повторный выбор того же файла не даст change
    e.target.value = "";
    if (!file) return;

    setPhotoError(null);
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError(t("photoBadType"));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(t("photoTooBig"));
      return;
    }

    setUploading(true);
    const supabase = createClient();
    // Папка = id пользователя: политика бакета пускает владельца только в свою
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type });

    setUploading(false);
    if (uploadError) {
      console.error("dentist photo upload failed", uploadError);
      setPhotoError(t("photoError"));
      return;
    }

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const years = experience.trim() === "" ? null : Number(experience);

    const supabase = createClient();
    const { error } = await supabase
      .from("dentists")
      .update({
        specialization: specialization.trim() || null,
        license_number: license.trim() || null,
        clinic_id: clinicId || null,
        bio: bio.trim() || null,
        experience_years: years,
        photo_url: photoUrl,
      })
      .eq("id", dentistId);

    setLoading(false);
    if (error) {
      console.error("dentist profile save failed", error);
      setError(t("saveError"));
      return;
    }
    setSaved(true);
    if (!needsSetup) setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Card className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl ?? "/doctor-placeholder.svg"}
          alt=""
          className="size-11 shrink-0 rounded-full object-cover ring-1 ring-line"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">{t("editTitle")}</p>
          {/* до двух строк: в одну на телефоне от подсказки оставалось «Фото, стаж и о…» */}
          <p className="line-clamp-2 text-small text-muted">{t("editHint")}</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-small text-success">
            <Check className="size-4" strokeWidth={1.75} />
            {t("saved")}
          </span>
        )}
        {/* на телефоне — одна иконка: подпись отнимала у подсказки половину строки */}
        <Button variant="secondary" onClick={() => setOpen(true)} aria-label={t("edit")}>
          <Pencil className="size-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">{t("edit")}</span>
        </Button>
      </Card>
    );
  }

  return (
    <Card className={needsSetup ? "border-primary-200 ring-1 ring-primary-100" : undefined}>
      <CardTitle>{needsSetup ? t("title") : t("editTitle")}</CardTitle>
      <p className="-mt-2 mb-4 text-small text-muted">{t("subtitle")}</p>

      {/* С lg короткие поля парами, фото, «О себе» и кнопки — во всю ширину: в одну
          колонку форма из шести полей не помещалась в экран ноутбука */}
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2 lg:gap-x-6">
        <Field label={t("photo")} hint={t("photoHint")} error={photoError} className="lg:col-span-2">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl ?? "/doctor-placeholder.svg"}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover ring-1 ring-line"
            />
            <label className="inline-flex min-h-touch cursor-pointer items-center rounded-xl border border-line px-3.5 text-body font-medium text-ink hover:bg-surface">
              {uploading ? t("photoUploading") : t("photoButton")}
              <input
                type="file"
                className="sr-only"
                accept={PHOTO_TYPES.join(",")}
                disabled={uploading}
                onChange={onPickPhoto}
              />
            </label>
          </div>
        </Field>

        <Field label={t("specialization")} htmlFor="specialization">
          <Input
            id="specialization"
            required
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder={t("specializationPlaceholder")}
          />
        </Field>

        <Field label={t("experience")} htmlFor="experience" hint={t("experienceHint")}>
          <Input
            id="experience"
            type="number"
            inputMode="numeric"
            min={0}
            max={80}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </Field>

        <Field label={t("bio")} htmlFor="bio" hint={t("bioHint")} className="lg:col-span-2">
          <Textarea
            id="bio"
            maxLength={600}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
          />
        </Field>

        <Field label={t("license")} htmlFor="license">
          <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} />
        </Field>

        <Field label={t("clinic")} htmlFor="clinic">
          <Select id="clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
            <option value="">{t("noClinic")}</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger lg:col-span-2">{error}</p>
        )}

        <div className="flex items-center gap-3 lg:col-span-2">
          <Button type="submit" loading={loading} disabled={uploading}>
            {t("save")}
          </Button>
          {!needsSetup && (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
