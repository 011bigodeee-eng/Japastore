export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  active: boolean;
};
export type Brand = { id: string; name: string };
export type Variant = {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category_id: string;
  brand_id: string | null;
  images: string[];
  variants: Variant[];
  active: boolean;
  is_new: boolean;
  bestseller: boolean;
  created_at: string;
};
export type Settings = {
  name: string;
  slogan: string;
  whatsapp: string;
  instagram: string;
  hero_title: string;
  hero_text: string;
  hero_image: string;
  logo: string;
  delivery: string;
  about: string;
  location: string;
  social_url: string;
};
export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
};
export type CatalogData = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  settings: Settings;
  demo: boolean;
};
