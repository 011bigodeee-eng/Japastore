import { ProductPage } from "@/components/store";
import { loadCatalog } from "@/lib/catalog";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const data = await loadCatalog();
    const p = data.products.find((p) => p.slug === slug && p.active);
    return {
      title: p?.name ?? "Produto não encontrado",
      description: p?.description,
      openGraph: p
        ? {
            title: p.name,
            description: p.description,
            images: p.images[0] ? [p.images[0]] : [],
          }
        : undefined,
    };
  } catch {
    return { title: "Produto" };
  }
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductPage key={slug} slug={slug} />;
}
