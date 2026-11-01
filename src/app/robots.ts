import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Кабинеты и песочница поисковикам не нужны; раньше /robots.txt и вовсе уходил 307 на /login. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/visits", "/access", "/ai-check", "/dentist", "/admin", "/dev", "/api"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
