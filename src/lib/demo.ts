import type { CatalogData, Product, Settings } from "./types";
export const defaultSettings: Settings = {
  name: "JAPA STORE",
  slogan: "ESTILO QUE TRANSFORMA",
  whatsapp: "",
  instagram: "__japastore",
  hero_title: "SEU ESTILO.\nSUA IDENTIDADE.",
  hero_text:
    "Encontre as peças que combinam com sua personalidade. Vista atitude, autenticidade e estilo.",
  hero_image: "/images/hero.svg",
  logo: "",
  delivery: "Consulte as condições de entrega e retirada com a loja.",
  about:
    "Na JAPA STORE, acreditamos que o estilo é uma forma de expressão. Nossa missão é conectar você às peças que representam sua personalidade.",
  location: "São Carlos — SP",
  social_url: "",
};
const names = [
  "Camisetas",
  "Bermudas e shorts",
  "Calças",
  "Moletons",
  "Tênis",
  "Conjuntos",
  "Acessórios",
];
const slugs = [
  "camisetas",
  "bermudas",
  "calcas",
  "moletons",
  "tenis",
  "conjuntos",
  "acessorios",
];
const images = [
  "camiseta",
  "bermuda",
  "calca",
  "moletom",
  "tenis",
  "moletom",
  "bone",
];
export const demoData: CatalogData = {
  demo: true,
  settings: defaultSettings,
  brands: [{ id: "demo-brand", name: "Marca demonstrativa" }],
  categories: names.map((name, i) => ({
    id: slugs[i],
    name,
    slug: slugs[i],
    image: `/images/${images[i]}.svg`,
    active: true,
  })),
  products: [
    ["Camiseta Essential", "camisetas", "camiseta", 89.9],
    ["Moletom Culture", "moletons", "moletom", 219.9],
    ["Bermuda Urban", "bermudas", "bermuda", 129.9],
    ["Tênis Low Street", "tenis", "tenis", 289.9],
    ["Calça Straight", "calcas", "calca", 189.9],
    ["Boné Signature", "acessorios", "bone", 79.9],
    ["Camiseta Oversized", "camisetas", "camiseta", 109.9],
    ["Conjunto Daily", "conjuntos", "moletom", 299.9],
  ].map(([name, cat, img, price], i): Product => ({
    id: `demo-${i}`,
    slug: `${img}-${i}`,
    name: String(name),
    description:
      "Peça ilustrativa para explorar o catálogo. Fotos, composição, preços e disponibilidade reais serão cadastrados pela JAPA STORE.",
    price: Number(price),
    sale_price: i === 2 ? 99.9 : null,
    category_id: String(cat),
    brand_id: "demo-brand",
    images: [`/images/${img}.svg`],
    variants: ["P", "M", "G", "GG"].map((size, j) => ({
      id: `demo-${i}-${j}`,
      size,
      color: "Preto",
      stock: 5,
      sku: `DEMO-${i}-${size}`,
    })),
    active: true,
    is_new: i < 3,
    bestseller: i === 0 || i === 3,
    created_at: new Date(Date.UTC(2026, 0, 8 - i)).toISOString(),
  })),
};
