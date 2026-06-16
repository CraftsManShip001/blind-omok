import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Derive the real origin from the incoming request so the sitemap URL is always
// correct in production (independent of build-time env vars).
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await baseUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/room/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
