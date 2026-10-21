import Link from "next/link";
export default function NotFound() {
  return (
    <main className="section empty">
      <span className="eyebrow">404 / FORA DA COLEÇÃO</span>
      <h1>Um novo caminho.</h1>
      <Link className="button" href="/catalogo">
        Explorar catálogo
      </Link>
    </main>
  );
}
