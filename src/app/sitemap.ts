import type { MetadataRoute } from "next";
import { loadCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const data = await loadCatalog();
  return [
    { url: base },
    { url: `${base}/catalogo` },
    ...data.products
      .filter((p) => p.active && !data.demo)
      .map((p) => ({
        url: `${base}/produto/${p.slug}`,
        lastModified: new Date(p.created_at),
      })),
  ];
}
