import type { CatalogData, Product } from "./types";
import { supabase } from "./supabase";
import { defaultSettings, demoData } from "./demo";
export async function loadCatalog(): Promise<CatalogData> {
  if (!supabase) return demoData;
  const [p, c, b, s] = await Promise.all([
    supabase
      .from("products")
      .select("*,variants:product_variants(*),photos:product_images(*)")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("store_settings").select("data").eq("id", 1).single(),
  ]);
  for (const result of [p, c, b, s])
    if (result.error)
      throw new Error(
        "Não foi possível carregar a loja. Tente novamente em instantes.",
      );
  return {
    demo: false,
    products: (p.data ?? []).map(
      (row) =>
        ({
          ...row,
          price: Number(row.price),
          sale_price: row.sale_price === null ? null : Number(row.sale_price),
          images: [...(row.photos ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((x) => x.url),
        }) as Product,
    ),
    categories: c.data ?? [],
    brands: b.data ?? [],
    settings: { ...defaultSettings, ...s.data?.data },
  };
}
