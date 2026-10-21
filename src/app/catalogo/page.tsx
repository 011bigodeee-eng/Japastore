import { Catalog } from "@/components/store";
export const metadata = { title: "Catálogo" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const get = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  return (
    <Catalog
      key={`${get("q")}-${get("categoria")}-${get("colecao")}`}
      query={get("q")}
      category={get("categoria")}
      collection={get("colecao")}
    />
  );
}
