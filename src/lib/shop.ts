import type { CartItem, Product } from "./types";
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const priceOf = (p: Product) => p.sale_price ?? p.price;
export function resolveCart(items: CartItem[], products: Product[]) {
  return items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId && p.active);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    return product && variant && variant.stock > 0
      ? [
          {
            ...item,
            quantity: Math.max(1, Math.min(item.quantity, variant.stock)),
            product,
            variant,
          },
        ]
      : [];
  });
}
export function whatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return /^\d{10,15}$/.test(digits)
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : null;
}
export function orderMessage(items: ReturnType<typeof resolveCart>) {
  return (
    "Olá, JAPA STORE! Gostaria de realizar um pedido:\n\n" +
    items
      .map(
        ({ product, variant, quantity }) =>
          `Produto: ${product.name}\nTamanho: ${variant.size}\nCor: ${variant.color}\nQuantidade: ${quantity}\nValor: ${money(priceOf(product) * quantity)}`,
      )
      .join("\n\n") +
    `\n\nTotal do pedido: ${money(items.reduce((sum, i) => sum + priceOf(i.product) * i.quantity, 0))}\n\nGostaria de confirmar a disponibilidade e combinar a entrega.`
  );
}
export function readCart(raw: string | null): CartItem[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (v): v is CartItem =>
              !!v &&
              typeof v.productId === "string" &&
              typeof v.variantId === "string" &&
              Number.isSafeInteger(v.quantity) &&
              v.quantity > 0,
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}

export function changeCartVariant(
  items: CartItem[],
  product: Product,
  from: string,
  to: string,
): CartItem[] {
  if (from === to) return items;
  const source = items.find(
    (i) => i.productId === product.id && i.variantId === from,
  );
  const target = product.variants.find((v) => v.id === to && v.stock > 0);
  if (!source || !target) return items;
  const existing = items.find(
    (i) => i.productId === product.id && i.variantId === to,
  );
  const quantity = Math.min(
    target.stock,
    source.quantity + (existing?.quantity ?? 0),
  );
  return [
    ...items.filter(
      (i) =>
        !(
          i.productId === product.id &&
          (i.variantId === from || i.variantId === to)
        ),
    ),
    { productId: product.id, variantId: to, quantity },
  ];
}
