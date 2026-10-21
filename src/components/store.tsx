"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  ShoppingBag,
  Menu,
  X,
  Minus,
  Plus,
  Instagram,
  Check,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { loadCatalog } from "@/lib/catalog";
import { demoData } from "@/lib/demo";
import {
  changeCartVariant,
  money,
  orderMessage,
  priceOf,
  readCart,
  resolveCart,
  whatsappUrl,
} from "@/lib/shop";
import type { CartItem, CatalogData, Product } from "@/lib/types";
const Context = createContext<ReturnType<typeof useStoreState> | null>(null);
function useStoreState(initialData?: CatalogData) {
  const [data, setData] = useState<CatalogData>(initialData ?? demoData),
    [loading, setLoading] = useState(!initialData),
    [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]),
    [cartOpen, setCartOpen] = useState(false),
    [toast, setToast] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    loadCatalog()
      .then((data) =>
        setData({
          ...data,
          products: data.products.filter(
            (p) =>
              p.active &&
              data.categories.some((c) => c.id === p.category_id && c.active),
          ),
        }),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    try {
      setCart(readCart(localStorage.getItem("japa-cart")));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("japa-cart", JSON.stringify(cart));
      } catch {}
  }, [cart, ready]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  function add(product: Product, variantId: string, quantity: number) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant || variant.stock < quantity || quantity < 1) return;
    setCart((old) => {
      const found = old.find(
        (i) => i.productId === product.id && i.variantId === variantId,
      );
      return found
        ? old.map((i) =>
            i === found
              ? {
                  ...i,
                  quantity: Math.min(i.quantity + quantity, variant.stock),
                }
              : i,
          )
        : [...old, { productId: product.id, variantId, quantity }];
    });
    setToast("Peça adicionada à sua seleção.");
  }
  return {
    data,
    loading,
    error,
    cart,
    setCart,
    cartOpen,
    setCartOpen,
    toast,
    add,
  };
}
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("StoreProvider necessário");
  return ctx;
}
export function StoreProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: CatalogData;
}) {
  const state = useStoreState(initialData);
  return (
    <Context.Provider value={state}>
      {children}
      <AnimatePresence>
        {state.toast && (
          <motion.div
            role="status"
            className="toast"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check size={17} />
            {state.toast}
          </motion.div>
        )}
      </AnimatePresence>
    </Context.Provider>
  );
}
function Dialog({
  children,
  label,
  onClose,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const active = document.activeElement as HTMLElement;
    el?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = overflow;
      active?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <button
          className="close icon-btn"
          aria-label="Fechar"
          onClick={onClose}
        >
          <X />
        </button>
        {children}
      </div>
    </dialog>
  );
}
export function StoreShell({ children }: { children: ReactNode }) {
  const { data, cart, cartOpen, setCartOpen, error, loading } = useStore();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [intro, setIntro] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    try {
      if (!reduced && !sessionStorage.getItem("japa-intro")) {
        setIntro(true);
        sessionStorage.setItem("japa-intro", "1");
        const t = setTimeout(() => setIntro(false), 2000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [reduced]);
  const whatsapp = whatsappUrl(
    data.settings.whatsapp,
    "Olá, JAPA STORE! Gostaria de saber mais sobre o catálogo.",
  );
  return (
    <>
      <div className="topline">
        <span>{data.settings.slogan}</span>
        <span>
          {data.settings.location} <span className="tiny-square" />
        </span>
      </div>
      <header className="header">
        <Link
          href="/"
          className="wordmark"
          aria-label={`${data.settings.name} — início`}
        >
          {data.settings.logo ? (
            <Image
              unoptimized
              src={data.settings.logo}
              width={130}
              height={40}
              alt={data.settings.name}
            />
          ) : (
            <>
              {data.settings.name}
              <span>®</span>
            </>
          )}
        </Link>
        <nav className="desktop-nav" aria-label="Principal">
          <Link href="/">Início</Link>
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/catalogo?colecao=lancamentos">
            Lançamentos <span className="dot" />
          </Link>
          <Link href="/catalogo?colecao=promocoes">Promoções</Link>
          <Link href="/#sobre">Sobre nós</Link>
        </nav>
        <div className="header-actions">
          <button
            className="icon-btn"
            aria-label="Pesquisar"
            onClick={() => setSearch(true)}
          >
            <Search size={20} />
          </button>
          <button
            className="bag icon-btn"
            aria-label={`Abrir carrinho, ${cart.reduce((s, i) => s + i.quantity, 0)} itens`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={20} />
            <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </button>
          <button
            className="icon-btn mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
        </div>
      </header>
      {error ? (
        <main className="error-state">
          <h1>Uma pausa na conexão.</h1>
          <p role="alert">{error}</p>
          <button className="button" onClick={() => location.reload()}>
            Tentar novamente
          </button>
        </main>
      ) : loading ? (
        <main className="loading" role="status">
          Preparando sua próxima escolha<span>JAPA STORE</span>
        </main>
      ) : (
        <>
          {data.demo && (
            <div className="demo-notice">
              VITRINE DEMONSTRATIVA — ilustrações, preços e estoque de exemplo.
              Pedidos indisponíveis.
            </div>
          )}
          {children}
        </>
      )}
      <footer id="contato">
        <div className="footer-top">
          <div>
            <span className="eyebrow">O PRÓXIMO PASSO É SEU.</span>
            <h2>
              VISTA SUA
              <br />
              IDENTIDADE.
            </h2>
            <Link className="button white" href="/catalogo">
              ENCONTRE SEU ESTILO <ArrowUpRight size={18} />
            </Link>
          </div>
          <div>
            <h3>VAMOS CONVERSAR</h3>
            <a
              href={`https://instagram.com/${data.settings.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              Instagram <ArrowUpRight size={16} />
            </a>
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noreferrer">
                WhatsApp <ArrowUpRight size={16} />
              </a>
            ) : (
              <p>WhatsApp em configuração</p>
            )}
            <p>{data.settings.location}</p>
            <p>{data.settings.delivery}</p>
            {data.settings.social_url && (
              <a
                href={data.settings.social_url}
                target="_blank"
                rel="noreferrer"
              >
                Outras redes <ArrowUpRight size={16} />
              </a>
            )}
          </div>
          <div>
            <h3>EXPLORE</h3>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/catalogo?colecao=lancamentos">Lançamentos</Link>
            <Link href="/catalogo?colecao=promocoes">Promoções</Link>
            {!data.demo && <Link href="/admin">Área administrativa</Link>}
          </div>
        </div>
        <div className="footer-logo">
          {data.settings.name}
          <span>®</span>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {data.settings.name}. Todos os direitos
            reservados.
          </span>
          <span>FEITO PARA SER VOCÊ. ↗</span>
        </div>
      </footer>
      {whatsapp && !data.demo && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="contact-float"
          aria-label="Conversar pelo WhatsApp"
        >
          Vamos conversar <ArrowUpRight size={18} />
        </a>
      )}
      {cartOpen && <Cart />}
      {menu && (
        <Dialog
          label="Menu principal"
          onClose={() => setMenu(false)}
          className="menu-dialog"
        >
          <span className="eyebrow">EXPLORE JAPA STORE</span>
          {[
            ["Início", "/"],
            ["Catálogo", "/catalogo"],
            ["Lançamentos", "/catalogo?colecao=lancamentos"],
            ["Promoções", "/catalogo?colecao=promocoes"],
            ["Sobre nós", "/#sobre"],
            ["Contato", "/#contato"],
          ].map(([title, url], i) => (
            <Link key={url} href={url} onClick={() => setMenu(false)}>
              <small>0{i + 1}</small>
              {title}
              <ArrowUpRight />
            </Link>
          ))}
        </Dialog>
      )}
      {search && (
        <Dialog label="Pesquisar produtos" onClose={() => setSearch(false)}>
          <h2>Encontre seu estilo.</h2>
          <form action="/catalogo" className="search-form">
            <label htmlFor="search">Busque por peça ou categoria</label>
            <div>
              <input
                autoFocus
                id="search"
                name="q"
                placeholder="O que você procura?"
              />
              <button className="button" type="submit">
                <Search size={20} /> Buscar
              </button>
            </div>
          </form>
        </Dialog>
      )}
      <AnimatePresence>
        {intro && (
          <motion.div
            className="intro"
            initial={{ opacity: 1 }}
            exit={{ y: "-100%", transition: { duration: 0.5 } }}
          >
            <button onClick={() => setIntro(false)}>
              PULAR <X size={14} />
            </button>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <strong>
                JAPA STORE<sup>®</sup>
              </strong>
              <p>ESTILO QUE TRANSFORMA</p>
            </motion.div>
            <span className="intro-line" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
    >
      <Link href={`/produto/${product.slug}`} className="product-image">
        <Image
          src={product.images[0] || "/images/camiseta.svg"}
          alt={product.name}
          fill
          sizes="(max-width:600px) 50vw, (max-width:1000px) 33vw, 25vw"
          unoptimized={!product.images[0]?.startsWith("/")}
        />
        <div className="product-badges">
          {product.is_new && <span>NOVO</span>}
          {product.sale_price !== null && (
            <span className="sale">
              −{Math.round((1 - product.sale_price / product.price) * 100)}%
            </span>
          )}
        </div>
        <span className="product-view">
          ESCOLHER TAMANHO <ArrowUpRight size={16} />
        </span>
        <span className="product-plus">
          <Plus size={19} />
        </span>
      </Link>
      <div className="product-meta">
        <Link href={`/produto/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <span>
          {product.sale_price !== null && <del>{money(product.price)}</del>}{" "}
          {money(priceOf(product))}
        </span>
      </div>
      <p className="product-size">
        {product.variants.some((v) => v.stock > 0)
          ? [
              ...new Set(
                product.variants.filter((v) => v.stock > 0).map((v) => v.size),
              ),
            ].join(" / ")
          : "Sem estoque"}
      </p>
    </motion.article>
  );
}
export function Home() {
  const { data } = useStore();
  return (
    <StoreShell>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> STREETWEAR. ATITUDE. IDENTIDADE.
            </div>
            <h1>
              {data.settings.hero_title.split("\n").map((line, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 * i }}
                  className={i === 1 ? "outline" : ""}
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            <p>{data.settings.hero_text}</p>
            <div className="hero-buttons">
              <Link className="button white" href="/catalogo">
                EXPLORAR COLEÇÃO <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/catalogo?colecao=lancamentos">
                VER LANÇAMENTOS <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-bottom">
              <span>INDEPENDENTE POR NATUREZA.</span>
              <span>ROLE PARA DESCOBRIR ↓</span>
            </div>
          </div>
          <div className="hero-art">
            <Image
              priority
              src={data.settings.hero_image || "/images/hero.svg"}
              alt={
                data.demo
                  ? "Composição ilustrativa de moletom Japa Store"
                  : "Coleção Japa Store"
              }
              fill
              sizes="(max-width:800px) 100vw, 50vw"
              unoptimized={!data.settings.hero_image.startsWith("/")}
            />
            <span className="hero-label">
              JAPA CULTURE
              <br />
              <strong>WEAR YOURSELF.</strong>
            </span>
            <span className="vertical-label">
              ESTILO NÃO SE SEGUE. SE CRIA.
            </span>
          </div>
          <div className="hero-index">
            01 <span>/ INDEPENDENT STYLE</span> <ArrowUpRight size={18} />
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          EXPRESSE SUA ESSÊNCIA <span>✦</span> VISTA SUA ATITUDE <span>✦</span>{" "}
          JAPA STORE <span>✦</span> EXPRESSE SUA ESSÊNCIA <span>✦</span> VISTA
          SUA ATITUDE <span>✦</span>
        </div>
        <section className="section categories-section">
          <SectionHeading
            eyebrow="01 / SEU UNIVERSO"
            title="Qual é a sua vibe?"
            href="/catalogo"
            link="TODAS AS CATEGORIAS"
          />
          <div className="category-grid">
            {data.categories
              .filter((c) => c.active)
              .map((c, i) => (
                <Link
                  className="category"
                  key={c.id}
                  href={`/catalogo?categoria=${c.id}`}
                >
                  <div>
                    <Image
                      src={c.image || "/images/camiseta.svg"}
                      alt={c.name}
                      fill
                      sizes="(max-width:600px) 45vw, 20vw"
                      unoptimized={!c.image.startsWith("/")}
                    />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>
                    {c.name}
                    <ArrowUpRight size={17} />
                  </h3>
                </Link>
              ))}
            <Link
              className="category category-new"
              href="/catalogo?colecao=lancamentos"
            >
              <div>
                <span>DROP</span>
                <strong>
                  O NOVO
                  <br />É AGORA.
                </strong>
                <ArrowUpRight size={42} />
              </div>
              <h3>
                Lançamentos <ArrowUpRight size={17} />
              </h3>
            </Link>
          </div>
        </section>
        <section className="section new-section" id="lancamentos">
          <SectionHeading
            eyebrow="02 / FRESH ON THE STREETS"
            title="Acabaram de chegar."
            href="/catalogo?colecao=lancamentos"
            link="VER TODOS OS LANÇAMENTOS"
          />
          <div className="product-grid">
            {data.products
              .filter((p) => p.active && p.is_new)
              .slice(0, 4)
              .map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
          </div>
          {!data.products.some((p) => p.active && p.is_new) && (
            <p className="empty">Os próximos lançamentos aparecem aqui.</p>
          )}
        </section>
        <section className="manifesto" id="sobre">
          <div className="manifesto-mark">
            J<span>®</span>
          </div>
          <div>
            <span className="eyebrow">NÃO É SÓ ROUPA. É EXPRESSÃO.</span>
            <h2>
              SEJA VOCÊ.
              <br />
              SEM PEDIR
              <br />
              <span>PERMISSÃO.</span>
            </h2>
            <p>{data.settings.about}</p>
            <span className="text-link">
              {data.settings.location.toUpperCase()} <ArrowUpRight size={20} />
            </span>
          </div>
        </section>
        <section className="section">
          <SectionHeading
            eyebrow="03 / A SELEÇÃO DA LOJA"
            title="No radar."
            href="/catalogo?colecao=destaques"
            link="EXPLORAR DESTAQUES"
          />
          <p className="section-subtitle">
            Peças selecionadas pela JAPA STORE.
          </p>
          <div className="product-grid">
            {data.products
              .filter((p) => p.active && p.bestseller)
              .slice(0, 4)
              .map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
          </div>
        </section>
        <section className="section promotions">
          <SectionHeading
            eyebrow="04 / BOAS ESCOLHAS"
            title="Estilo por menos."
            href="/catalogo?colecao=promocoes"
            link="VER PROMOÇÕES"
          />
          <div className="product-grid">
            {data.products
              .filter((p) => p.active && p.sale_price !== null)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
          {!data.products.some((p) => p.active && p.sale_price !== null) && (
            <p className="empty">Novas oportunidades em breve.</p>
          )}
        </section>
        <section className="instagram-section">
          <span className="eyebrow">DO FEED PARA A SUA VIDA</span>
          <h2>
            A CULTURA
            <br />
            CONTINUA <span>NO FEED.</span>
          </h2>
          <a
            className="button"
            href={`https://instagram.com/${data.settings.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <Instagram size={18} /> @{data.settings.instagram.replace(/^@/, "")}{" "}
            <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
    </StoreShell>
  );
}
function SectionHeading({
  eyebrow,
  title,
  href,
  link,
}: {
  eyebrow: string;
  title: string;
  href: string;
  link: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <Link href={href} className="text-link">
        {link}
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
export function Catalog({
  query = "",
  category = "",
  collection = "",
}: {
  query?: string;
  category?: string;
  collection?: string;
}) {
  const { data } = useStore();
  const [q, setQ] = useState(query),
    [cat, setCat] = useState(category),
    [brand, setBrand] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [stock, setStock] = useState(false),
    [sort, setSort] = useState("new"),
    [filters, setFilters] = useState(false);
  const products = data.products.filter((p) => p.active);
  const filtered = products
    .filter(
      (p) =>
        (!cat || p.category_id === cat) &&
        (!brand || p.brand_id === brand) &&
        (!size ||
          p.variants.some(
            (v) =>
              v.size === size &&
              (!color || v.color === color) &&
              (!stock || v.stock > 0),
          )) &&
        (!color ||
          p.variants.some(
            (v) =>
              v.color === color &&
              (!size || v.size === size) &&
              (!stock || v.stock > 0),
          )) &&
        (!stock || p.variants.some((v) => v.stock > 0)) &&
        (!min || priceOf(p) >= Number(min)) &&
        (!max || priceOf(p) <= Number(max)) &&
        `${p.name} ${data.categories.find((c) => c.id === p.category_id)?.name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(q.toLocaleLowerCase("pt-BR")) &&
        (collection !== "lancamentos" || p.is_new) &&
        (collection !== "promocoes" || p.sale_price !== null) &&
        (collection !== "destaques" || p.bestseller),
    )
    .sort((a, b) =>
      sort === "asc"
        ? priceOf(a) - priceOf(b)
        : sort === "desc"
          ? priceOf(b) - priceOf(a)
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : b.created_at.localeCompare(a.created_at),
    );
  function reset() {
    setQ("");
    setCat("");
    setBrand("");
    setSize("");
    setColor("");
    setMin("");
    setMax("");
    setStock(false);
  }
  const fields = (
    <>
      <label>
        Categoria
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas</option>
          {data.categories
            .filter((c) => c.active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Marca
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Todas</option>
          {data.brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tamanho
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">Todos</option>
          {[
            ...new Set(products.flatMap((p) => p.variants.map((v) => v.size))),
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Cor
        <select value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">Todas</option>
          {[
            ...new Set(products.flatMap((p) => p.variants.map((v) => v.color))),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="price-filter">
        <label>
          Preço mínimo
          <input
            type="number"
            min="0"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="R$ 0"
          />
        </label>
        <label>
          Preço máximo
          <input
            type="number"
            min="0"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Sem limite"
          />
        </label>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={stock}
          onChange={(e) => setStock(e.target.checked)}
        />{" "}
        Somente disponíveis
      </label>
      <button className="text-link" onClick={reset}>
        Limpar filtros <X size={15} />
      </button>
    </>
  );
  return (
    <StoreShell>
      <main className="section catalog-page">
        <div className="breadcrumb">
          <Link href="/">Início</Link> / Catálogo
        </div>
        <span className="eyebrow">ENCONTRE O QUE É SUA CARA.</span>
        <h1>
          {collection === "lancamentos"
            ? "Novos capítulos."
            : collection === "promocoes"
              ? "Estilo por menos."
              : collection === "destaques"
                ? "A seleção da loja."
                : "Seu próximo estilo."}
        </h1>
        <div className="catalog-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="Pesquisar por nome ou categoria"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busque sua próxima peça"
            />
          </div>
          <button
            className="filter-toggle button outline-button"
            onClick={() => setFilters(true)}
          >
            <SlidersHorizontal size={17} /> Filtros
          </button>
          <label className="sort-label">
            Ordenar
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">Novidades</option>
              <option value="asc">Menor preço</option>
              <option value="desc">Maior preço</option>
              <option value="name">Nome</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        <div className="catalog-layout">
          <aside className="filter-sidebar">
            <h2>
              Filtrar <SlidersHorizontal size={16} />
            </h2>
            {fields}
          </aside>
          <div>
            <p className="result-count" role="status">
              {filtered.length} peças encontradas
              {data.demo ? " · demonstração" : ""}
            </p>
            <div className="product-grid catalog-grid">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="empty">
                <h2>Nenhuma peça por aqui.</h2>
                <p>Experimente outra busca ou remova os filtros.</p>
                <button className="button" onClick={reset}>
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
        {filters && (
          <Dialog
            label="Filtros do catálogo"
            onClose={() => setFilters(false)}
            className="filter-dialog"
          >
            <h2>Seu estilo, seu filtro.</h2>
            <div className="filter-fields">{fields}</div>
            <button className="button" onClick={() => setFilters(false)}>
              Ver {filtered.length} peças <ArrowRight size={18} />
            </button>
          </Dialog>
        )}
      </main>
    </StoreShell>
  );
}
export function ProductPage({ slug }: { slug: string }) {
  const { data, add, setCartOpen } = useStore();
  const p = data.products.find((p) => p.slug === slug && p.active);
  const [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [quantity, setQuantity] = useState(1),
    [image, setImage] = useState(0),
    [zoom, setZoom] = useState(false),
    [feedback, setFeedback] = useState("");
  const startX = useRef(0);
  if (!p)
    return (
      <StoreShell>
        <main className="section empty">
          <h1>Peça não encontrada.</h1>
          <Link className="button" href="/catalogo">
            Voltar ao catálogo
          </Link>
        </main>
      </StoreShell>
    );
  const variant = p.variants.find((v) => v.size === size && v.color === color);
  const valid = !!variant && variant.stock >= quantity;
  const photo = p.images[image] || "/images/camiseta.svg";
  const url =
    valid && !data.demo
      ? whatsappUrl(
          data.settings.whatsapp,
          orderMessage(
            resolveCart(
              [{ productId: p.id, variantId: variant.id, quantity }],
              data.products,
            ),
          ),
        )
      : null;
  function addItem() {
    if (!p || !variant || !valid) {
      setFeedback("Selecione tamanho e cor disponíveis.");
      return;
    }
    add(p, variant.id, quantity);
    setFeedback("Adicionado. Sua seleção está no carrinho.");
  }
  return (
    <StoreShell>
      <main className="section product-page">
        <div className="breadcrumb">
          <Link href="/">Início</Link> / <Link href="/catalogo">Catálogo</Link>{" "}
          / {p.name}
        </div>
        <div className="product-layout">
          <div>
            <button
              className="detail-image"
              aria-label="Ampliar imagem"
              onClick={() => setZoom(true)}
              onTouchStart={(e) => {
                startX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const delta = e.changedTouches[0].clientX - startX.current;
                if (Math.abs(delta) > 40)
                  setImage(
                    (i) =>
                      (i + (delta < 0 ? 1 : -1) + p.images.length) %
                      Math.max(1, p.images.length),
                  );
              }}
            >
              <Image
                src={photo}
                alt={p.name}
                fill
                priority
                sizes="(max-width:800px) 100vw, 50vw"
                unoptimized={!photo.startsWith("/")}
              />
              <span>
                TOQUE PARA AMPLIAR <Plus size={16} />
              </span>
            </button>
            <div className="thumbnails">
              {p.images.map((src, i) => (
                <button
                  key={src + i}
                  aria-label={`Imagem ${i + 1}`}
                  aria-pressed={i === image}
                  onClick={() => setImage(i)}
                >
                  <Image
                    src={src}
                    alt={`${p.name}, vista ${i + 1}`}
                    width={75}
                    height={85}
                    unoptimized={!src.startsWith("/")}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="product-info">
            <span className="eyebrow">
              {data.categories.find((c) => c.id === p.category_id)?.name} /{" "}
              {data.brands.find((b) => b.id === p.brand_id)?.name}
            </span>
            <h1>{p.name}</h1>
            <p className="detail-price">
              {p.sale_price !== null && <del>{money(p.price)}</del>}{" "}
              {money(priceOf(p))}
            </p>
            <p>{p.description}</p>
            <fieldset>
              <legend>
                Tamanho <span>{size || "Selecione"}</span>
              </legend>
              <div className="option-row">
                {[...new Set(p.variants.map((v) => v.size))].map((s) => (
                  <button
                    key={s}
                    disabled={
                      !p.variants.some((v) => v.size === s && v.stock > 0)
                    }
                    aria-pressed={s === size}
                    onClick={() => {
                      setSize(s);
                      if (
                        !p.variants.some(
                          (v) =>
                            v.size === s && v.color === color && v.stock > 0,
                        )
                      )
                        setColor("");
                      setQuantity(1);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>
                Cor <span>{color || "Selecione"}</span>
              </legend>
              <div className="option-row">
                {[...new Set(p.variants.map((v) => v.color))].map((c) => (
                  <button
                    key={c}
                    disabled={
                      !p.variants.some(
                        (v) =>
                          v.color === c &&
                          v.stock > 0 &&
                          (!size || v.size === size),
                      )
                    }
                    aria-pressed={c === color}
                    onClick={() => {
                      setColor(c);
                      setQuantity(1);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="purchase-row">
              <div className="quantity">
                <button
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                >
                  <Minus size={15} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  aria-label="Aumentar quantidade"
                  disabled={!variant || quantity >= variant.stock}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={15} />
                </button>
              </div>
              <button className="button" disabled={!valid} onClick={addItem}>
                ADICIONAR AO CARRINHO <ShoppingBag size={17} />
              </button>
            </div>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="button outline-button"
              >
                COMPRAR PELO WHATSAPP <ArrowUpRight size={18} />
              </a>
            ) : (
              <p className="helper">
                {data.demo
                  ? "Produto demonstrativo: compras indisponíveis."
                  : !data.settings.whatsapp
                    ? "WhatsApp da loja ainda não configurado."
                    : "Selecione tamanho e cor para comprar pelo WhatsApp."}
              </p>
            )}
            <p role="status" className="helper">
              {feedback}{" "}
              {feedback && (
                <button onClick={() => setCartOpen(true)} className="text-link">
                  Ver carrinho <ArrowRight size={14} />
                </button>
              )}
            </p>
            <details>
              <summary>
                Disponibilidade e entrega <Plus size={15} />
              </summary>
              <p>
                {variant
                  ? `${variant.stock} unidades nesta variação. SKU: ${variant.sku}`
                  : "Selecione uma variação para consultar o estoque."}
              </p>
              <p>{data.settings.delivery}</p>
              <p>
                A disponibilidade é confirmada pela loja no WhatsApp. Adicionar
                ao carrinho não reserva estoque.
              </p>
            </details>
          </div>
        </div>
        <section className="related">
          <SectionHeading
            eyebrow="COMBINA COM VOCÊ"
            title="Continue explorando."
            href="/catalogo"
            link="VER CATÁLOGO"
          />
          <div className="product-grid">
            {data.products
              .filter(
                (item) =>
                  item.active &&
                  item.id !== p.id &&
                  item.category_id === p.category_id,
              )
              .slice(0, 4)
              .map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
          </div>
        </section>
        {zoom && (
          <Dialog
            label={`Imagem ampliada de ${p.name}`}
            onClose={() => setZoom(false)}
            className="zoom-dialog"
          >
            <Image
              src={photo}
              alt={p.name}
              width={1000}
              height={1200}
              unoptimized={!photo.startsWith("/")}
            />
            <div className="zoom-nav">
              <button
                className="button"
                onClick={() =>
                  setImage(
                    (i) =>
                      (i - 1 + Math.max(1, p.images.length)) %
                      Math.max(1, p.images.length),
                  )
                }
              >
                Anterior
              </button>
              <span>
                {image + 1} / {Math.max(1, p.images.length)}
              </span>
              <button
                className="button"
                onClick={() =>
                  setImage((i) => (i + 1) % Math.max(1, p.images.length))
                }
              >
                Próxima
              </button>
            </div>
          </Dialog>
        )}
      </main>
    </StoreShell>
  );
}
function Cart() {
  const { data, cart, setCart, setCartOpen } = useStore();
  const items = resolveCart(cart, data.products);
  const total = items.reduce((s, i) => s + priceOf(i.product) * i.quantity, 0);
  const url =
    !data.demo && items.length
      ? whatsappUrl(data.settings.whatsapp, orderMessage(items))
      : null;
  return (
    <Dialog
      label="Seu carrinho"
      className="cart-dialog"
      onClose={() => setCartOpen(false)}
    >
      <span className="eyebrow">BOAS ESCOLHAS.</span>
      <h2>
        Sua seleção <span>({items.length})</span>
      </h2>
      {cart.length !== items.length && (
        <p className="helper">
          Peças indisponíveis foram desconsideradas. Quantidades ajustadas ao
          estoque atual.
        </p>
      )}
      {items.length === 0 ? (
        <div className="empty">
          <ShoppingBag size={42} />
          <h3>Seu estilo começa com uma escolha.</h3>
          <Link
            className="button"
            href="/catalogo"
            onClick={() => setCartOpen(false)}
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((i) => (
              <article key={i.variantId} className="cart-item">
                <Image
                  src={i.product.images[0] || "/images/camiseta.svg"}
                  alt={i.product.name}
                  width={88}
                  height={106}
                  unoptimized={!i.product.images[0]?.startsWith("/")}
                />
                <div>
                  <Link
                    href={`/produto/${i.product.slug}`}
                    onClick={() => setCartOpen(false)}
                  >
                    {i.product.name}
                  </Link>
                  <label className="cart-variant">
                    Variação
                    <select
                      aria-label={`Variação de ${i.product.name}`}
                      value={i.variantId}
                      onChange={(e) =>
                        setCart((old) =>
                          changeCartVariant(
                            old,
                            i.product,
                            i.variantId,
                            e.target.value,
                          ),
                        )
                      }
                    >
                      {i.product.variants
                        .filter((v) => v.stock > 0)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.size} / {v.color}
                          </option>
                        ))}
                    </select>
                  </label>
                  <strong>{money(priceOf(i.product))}</strong>
                  <div className="cart-controls">
                    <label>
                      Qtd.
                      <input
                        type="number"
                        aria-label={`Quantidade de ${i.product.name}`}
                        min="1"
                        max={i.variant.stock}
                        value={i.quantity}
                        onChange={(e) => {
                          const n = Math.min(
                            i.variant.stock,
                            Math.max(
                              1,
                              Math.trunc(Number(e.target.value)) || 1,
                            ),
                          );
                          setCart((old) =>
                            old.map((x) =>
                              x.variantId === i.variantId
                                ? { ...x, quantity: n }
                                : x,
                            ),
                          );
                        }}
                      />
                    </label>
                    <button
                      onClick={() =>
                        setCart((old) =>
                          old.filter((x) => x.variantId !== i.variantId),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="cart-total">
            <span>Subtotal / Total</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="helper">
            Entrega a combinar. Pedido e estoque serão confirmados no WhatsApp.
          </p>
          {url ? (
            <a className="button" href={url} target="_blank" rel="noreferrer">
              FINALIZAR PELO WHATSAPP <ArrowUpRight size={18} />
            </a>
          ) : (
            <p className="checkout-disabled">
              {data.demo
                ? "Vitrine demonstrativa. Finalização indisponível."
                : "A loja ainda precisa configurar o WhatsApp."}
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}
