import { test } from "node:test";
import assert from "node:assert/strict";
import { demoData, defaultSettings } from "../src/lib/demo";
import {
  changeCartVariant,
  money,
  orderMessage,
  priceOf,
  readCart,
  resolveCart,
  whatsappUrl,
} from "../src/lib/shop";
import { productSchema, settingsSchema } from "../src/lib/schemas";
test("cart parsing rejects corrupted, negative, fractional and oversized entries", () => {
  assert.deepEqual(readCart("bad json"), []);
  assert.deepEqual(readCart("{}"), []);
  assert.deepEqual(
    readCart(
      JSON.stringify([
        { productId: "a", variantId: "b", quantity: -1 },
        { productId: "a", variantId: "b", quantity: 1.5 },
        { productId: "a", variantId: "b", quantity: 2 },
      ]),
    ),
    [{ productId: "a", variantId: "b", quantity: 2 }],
  );
});
test("stock clamps quantity and removes unavailable, inactive and missing products", () => {
  const p = demoData.products[0];
  const cart = [
    { productId: p.id, variantId: p.variants[0].id, quantity: 999 },
  ];
  assert.equal(resolveCart(cart, [p])[0].quantity, 5);
  assert.deepEqual(resolveCart(cart, [{ ...p, active: false }]), []);
  assert.deepEqual(
    resolveCart(cart, [
      { ...p, variants: p.variants.map((v) => ({ ...v, stock: 0 })) },
    ]),
    [],
  );
  assert.deepEqual(resolveCart(cart, []), []);
});
test("multi-product WhatsApp order includes variations, promotional total and encoded message", () => {
  const products = demoData.products;
  const cart = [products[0], products[2]].map((p) => ({
    productId: p.id,
    variantId: p.variants[0].id,
    quantity: 2,
  }));
  const message = orderMessage(resolveCart(cart, products));
  assert.ok(message.includes(products[0].name));
  assert.ok(message.includes(products[2].name));
  assert.ok(message.includes("Tamanho: P"));
  assert.ok(
    message.includes(money(2 * (priceOf(products[0]) + priceOf(products[2])))),
  );
  const url = whatsappUrl("+55 (16) 99999-0000", message)!;
  assert.equal(new URL(url).searchParams.get("text"), message);
  assert.equal(whatsappUrl("", message), null);
  assert.equal(whatsappUrl("123", message), null);
});
const input = {
  ...demoData.products[0],
  id: undefined,
  category_id: "12345678-1234-4234-8234-123456789abc",
  brand_id: null,
  variants: demoData.products[0].variants.map((v) => ({ ...v, id: undefined })),
};
test("product validation rejects false discounts, duplicate options, negative stock and unsafe images", () => {
  assert.equal(productSchema.safeParse(input).success, true);
  assert.equal(
    productSchema.safeParse({ ...input, sale_price: 999 }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({ ...input, images: ["javascript:alert(1)"] })
      .success,
    false,
  );
  assert.equal(
    productSchema.safeParse({
      ...input,
      variants: [input.variants[0], input.variants[0]],
    }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({
      ...input,
      variants: [{ ...input.variants[0], stock: -2 }],
    }).success,
    false,
  );
});
test("store settings allow unconfigured contact, reject unsafe links and invalid phone", () => {
  assert.equal(settingsSchema.safeParse(defaultSettings).success, true);
  assert.equal(
    settingsSchema.safeParse({
      ...defaultSettings,
      social_url: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({ ...defaultSettings, whatsapp: "123" }).success,
    false,
  );
});

test("changing cart variations merges duplicate selections and limits stock", () => {
  const p = demoData.products[0];
  const [a, b] = p.variants;
  const cart = [
    { productId: p.id, variantId: a.id, quantity: 4 },
    { productId: p.id, variantId: b.id, quantity: 3 },
  ];
  assert.deepEqual(changeCartVariant(cart, p, a.id, b.id), [
    { productId: p.id, variantId: b.id, quantity: 5 },
  ]);
  assert.deepEqual(changeCartVariant(cart, p, a.id, "missing"), cart);
});
