import type { Metadata } from "next";
import localFont from "next/font/local";
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
});
const space = localFont({
  src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space",
  display: "swap",
});
import { loadCatalog } from "@/lib/catalog";
import { StoreProvider } from "@/components/store";
import "./globals.css";
const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: "JAPA STORE — Estilo que transforma",
    template: "%s | JAPA STORE",
  },
  description:
    "Moda masculina e streetwear em São Carlos — SP. Expresse sua identidade com a JAPA STORE.",
  openGraph: {
    title: "JAPA STORE — Estilo que transforma",
    description:
      "Seu estilo. Sua identidade. Explore nosso catálogo de streetwear.",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialData = await loadCatalog().catch(() => undefined);
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${space.variable}`}>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        <StoreProvider initialData={initialData}>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
