import { z } from "zod";
const image = z
  .string()
  .refine(
    (v) => v.startsWith("/images/") || /^https:\/\/[^\s]+$/.test(v),
    "Use uma URL HTTPS ou imagem local.",
  );
export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  size: z.string().trim().min(1).max(30),
  color: z.string().trim().min(1).max(50),
  stock: z.number().int().min(0).max(1000000),
  sku: z.string().trim().min(1).max(100),
});
export const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(150),
    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use letras minúsculas, números e hífens.",
      ),
    description: z.string().trim().min(10).max(5000),
    price: z.number().positive().max(1000000),
    sale_price: z.number().positive().nullable(),
    category_id: z.string().uuid(),
    brand_id: z.string().uuid().nullable(),
    images: z.array(image).min(1, "Adicione uma imagem.").max(12),
    variants: z.array(variantSchema).min(1, "Adicione uma variação.").max(100),
    active: z.boolean(),
    is_new: z.boolean(),
    bestseller: z.boolean(),
  })
  .refine((p) => p.sale_price === null || p.sale_price < p.price, {
    message: "A promoção deve ser menor que o preço original.",
    path: ["sale_price"],
  })
  .refine(
    (p) =>
      new Set(
        p.variants.map(
          (v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`,
        ),
      ).size === p.variants.length,
    { message: "Não repita combinações de tamanho e cor.", path: ["variants"] },
  );
export type ProductInput = z.infer<typeof productSchema>;
const https = z
  .string()
  .refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), "Use uma URL HTTPS.");
export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slogan: z.string().max(120),
  whatsapp: z
    .string()
    .refine(
      (v) =>
        !v ||
        (/^\+?[0-9\s()-]{10,25}$/.test(v) &&
          /^\d{10,15}$/.test(v.replace(/\D/g, ""))),
      "Informe código do país, DDD e número.",
    ),
  instagram: z.string().regex(/^@?[a-zA-Z0-9._]{1,30}$/),
  hero_title: z.string().min(2).max(100),
  hero_text: z.string().max(400),
  hero_image: image,
  logo: z.union([z.literal(""), image]),
  delivery: z.string().max(1000),
  about: z.string().max(2000),
  location: z.string().max(150),
  social_url: https,
});
