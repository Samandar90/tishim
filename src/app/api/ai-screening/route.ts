import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rateLimit";
import type { AiScreeningResult, UrgencyLevel } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 3;

// Каждый вызов — платный запрос к модели с фотографиями, а зарегистрироваться может
// кто угодно: без лимита скрипт в цикле сжигает бюджет API. Два уровня:
// частота — в памяти процесса, ловит и неудачные вызовы, которые следа в базе не
// оставляют; сутки — по сохранённым проверкам в базе, переживает перезапуск.
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 10 * 60 * 1000;
const DAILY_LIMIT = 10;
const takeBurstSlot = createRateLimiter({ limit: BURST_LIMIT, windowMs: BURST_WINDOW_MS });
const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

const SCREENING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "urgency", "recommendations", "disclaimer_required"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["zone", "observation", "confidence"],
        properties: {
          zone: { type: "string" },
          observation: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    recommendations: { type: "array", items: { type: "string" } },
    disclaimer_required: { type: "boolean" },
  },
} as const;

function systemPrompt(locale: string): string {
  const lang = locale === "uz" ? "Uzbek (Latin script)" : "Russian";
  return `You are a dental photo pre-assessment assistant for the Tishim app.
You receive 1-3 photos of a person's teeth and produce a cautious, preliminary visual assessment.

Strict rules:
- You are NOT a doctor and this is NOT a diagnosis. Never state or imply a diagnosis.
- NEVER use the words "диагноз", "заболевание", "diagnoz", "kasallik" or their equivalents in any language. Describe only what is visually observable ("potemneniye", "nalyot" etc. are fine as observations).
- Write all "zone", "observation" and "recommendations" text in ${lang}.
- "zone": which area of the mouth the observation relates to (e.g. "верхние резцы", "нижний левый моляр").
- "observation": neutral visual description of what is seen. No disease names as assertions - phrase as "визуально похоже на...", "возможный признак...".
- "confidence": your confidence in the observation, 0..1.
- "urgency": "high" only for visible acute problems (deep destruction, swelling, trauma); "medium" for issues worth addressing soon; "low" for cosmetic/minor findings or healthy-looking teeth.
- "recommendations": 2-4 short practical steps, always including seeing a dentist.
- "disclaimer_required": always true.
- If the photos do not show teeth clearly, return an empty findings array, urgency "low", and a recommendation to retake photos.`;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  // Проверка — функция пациента; врачу и админу тратить на неё бюджет незачем
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "patient") {
    return NextResponse.json({ error: "patients_only" }, { status: 403 });
  }

  const burst = takeBurstSlot(user.id);
  if (!burst.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(burst.retryAfterMs / 1000)) } }
    );
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: usedToday, error: countError } = await supabase
    .from("ai_screenings")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", user.id)
    .gte("created_at", dayAgo);
  // не смогли посчитать — отказываем: лимит, который молча пропускает при сбое, не лимит
  if (countError || (usedToday ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  let body: { paths?: string[]; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const paths = (body.paths ?? []).filter((p) => typeof p === "string").slice(0, MAX_IMAGES);
  if (paths.length === 0) {
    return NextResponse.json({ error: "no_images" }, { status: 400 });
  }
  // Only the patient's own folder — belt and suspenders on top of storage RLS
  if (paths.some((p) => !p.startsWith(`${user.id}/`) || p.includes(".."))) {
    return NextResponse.json({ error: "forbidden_path" }, { status: 403 });
  }

  const locale = body.locale === "uz" ? "uz" : "ru";

  // Download images from the private bucket under the user's own RLS session
  const images: Array<{ data: string; mediaType: AllowedMedia }> = [];
  for (const path of paths) {
    const { data: blob, error } = await supabase.storage.from("ai-images").download(path);
    if (error || !blob) {
      return NextResponse.json({ error: "image_not_found" }, { status: 404 });
    }
    const mediaType = (blob.type || "image/jpeg") as AllowedMedia;
    if (!ALLOWED_MEDIA.includes(mediaType)) {
      return NextResponse.json({ error: "unsupported_image_type" }, { status: 400 });
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    images.push({ data: buffer.toString("base64"), mediaType });
  }

  const anthropic = new Anthropic();

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      // Safety classifiers can decline; the default server-side fallback
      // re-runs the request on the recommended substitute model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt(locale),
      output_config: {
        format: {
          type: "json_schema",
          schema: SCREENING_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.mediaType,
                data: img.data,
              },
            })),
            {
              type: "text",
              text: "Please assess these dental photos and return the structured result.",
            },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("ai-screening: anthropic request failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json({ error: "ai_declined" }, { status: 502 });
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.Beta.BetaTextBlock => b.type === "text"
  );
  if (!textBlock) {
    return NextResponse.json({ error: "ai_empty" }, { status: 502 });
  }

  let result: AiScreeningResult;
  try {
    const parsed = JSON.parse(textBlock.text) as AiScreeningResult;
    const urgency: UrgencyLevel = ["low", "medium", "high"].includes(parsed.urgency)
      ? parsed.urgency
      : "low";
    result = {
      findings: (parsed.findings ?? []).slice(0, 12).map((f) => ({
        zone: String(f.zone ?? ""),
        observation: String(f.observation ?? ""),
        confidence: Math.min(Math.max(Number(f.confidence) || 0, 0), 1),
      })),
      urgency,
      recommendations: (parsed.recommendations ?? []).slice(0, 6).map(String),
      disclaimer_required: true,
    };
  } catch {
    return NextResponse.json({ error: "ai_invalid_json" }, { status: 502 });
  }

  const { data: saved, error: saveError } = await supabase
    .from("ai_screenings")
    .insert({
      patient_id: user.id,
      image_urls: paths,
      result,
      urgency: result.urgency,
    })
    .select("id, created_at")
    .single();

  if (saveError) {
    console.error("ai-screening: failed to persist result", saveError);
  }

  return NextResponse.json({ result, id: saved?.id ?? null });
}
