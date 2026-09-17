import { createClient } from "@/lib/supabase/server";

export interface AppSettings {
  initialMappingPrice: number | null;
  contactPhone: string | null;
}

/** Reads public app settings (price, contact phone). Works for anonymous visitors. */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("key, value");

  const map = new Map<string, unknown>((data ?? []).map((r) => [r.key, r.value]));
  const price = Number(map.get("initial_mapping_price"));
  const phone = map.get("contact_phone");

  return {
    initialMappingPrice: Number.isFinite(price) && price > 0 ? price : null,
    contactPhone: typeof phone === "string" && phone.trim() ? phone : null,
  };
}
