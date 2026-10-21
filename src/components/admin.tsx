"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, LogOut, Plus, Trash2, X, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadCatalog } from "@/lib/catalog";
import {
  productSchema,
  settingsSchema,
  type ProductInput,
} from "@/lib/schemas";
import { money } from "@/lib/shop";
import type { CatalogData, Product, Settings, Category } from "@/lib/types";
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function readable(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e?.code === "23505")
    return "Nome, URL, SKU ou variação duplicados. Revise os campos.";
  if (e?.code === "23503")
    return "Este registro está ligado a produtos. Altere os produtos antes de excluir.";
  if (e?.code === "42501")
    return "Acesso negado. Verifique a permissão administrativa.";
  return e?.message || "Não foi possível salvar. Tente novamente.";
}
async function uploadFiles(files: FileList | null): Promise<string[]> {
  if (!supabase || !files) return [];
  const urls: string[] = [];
  for (const file of Array.from(files)) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Envie apenas JPG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024)
      throw Error("Cada foto deve ter no máximo 5 MB.");
    const ext = file.type.split("/")[1];
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("catalog")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
    if (error) throw error;
    urls.push(
      supabase.storage.from("catalog").getPublicUrl(path).data.publicUrl,
    );
  }
  return urls;
}
export default function Admin() {
  const [auth, setAuth] = useState<"loading" | "login" | "denied" | "admin">(
      "loading",
    ),
    [data, setData] = useState<CatalogData | null>(null),
    [tab, setTab] = useState("Resumo"),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [editing, setEditing] = useState<Product | null | undefined>(undefined);
  async function refresh() {
    setData(await loadCatalog());
  }
  useEffect(() => {
    if (!supabase) {
      setAuth("login");
      return;
    }
    let live = true;
    async function check() {
      const client = supabase!;
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!live) return;
      if (!session) {
        setAuth("login");
        setData(null);
        return;
      }
      const result = await client.rpc("is_admin");
      if (!live) return;
      if (result.error) {
        setFailure(
          "Não foi possível verificar a permissão. Confira a conexão e a migration.",
        );
        setAuth("denied");
        return;
      }
      if (result.data === true) {
        try {
          const catalog = await loadCatalog();
          if (live) {
            setData(catalog);
            setAuth("admin");
          }
        } catch (e) {
          if (live) {
            setFailure(readable(e));
            setAuth("denied");
          }
        }
      } else {
        setFailure("Sua conta não possui permissão administrativa.");
        setAuth("denied");
      }
    }
    check();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (live) check();
      }, 0);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  async function logout() {
    await supabase?.auth.signOut();
    setAuth("login");
    setData(null);
  }
  async function changed() {
    await refresh();
    setMessage("Alterações salvas.");
    setFailure("");
  }
  return (
    <main className="admin-layout">
      <header className="admin-header">
        <Link href="/" className="wordmark">
          JAPA STORE<span>ADMIN</span>
        </Link>
        <Link href="/" className="text-link">
          VER LOJA <ArrowUpRight size={16} />
        </Link>
        {auth !== "login" && auth !== "loading" && (
          <button className="button outline-button" onClick={logout}>
            <LogOut size={15} /> Sair
          </button>
        )}
      </header>
      {auth === "loading" ? (
        <div className="loading" role="status">
          Verificando acesso seguro…
        </div>
      ) : auth === "login" ? (
        <Login />
      ) : auth === "denied" ? (
        <div className="admin-login">
          <h1>Acesso administrativo</h1>
          <p role="alert">{failure}</p>
          <p>
            O responsável pelo Supabase precisa autorizar sua conta em
            admin_users.
          </p>
          <button className="button" onClick={logout}>
            Entrar com outra conta
          </button>
        </div>
      ) : (
        data && (
          <div className="admin-content">
            <span className="eyebrow">SEU CATÁLOGO. DO SEU JEITO.</span>
            <h1>Olá, JAPA STORE.</h1>
            <p className="helper">
              Gerencie suas peças, coleções e a identidade da loja.
            </p>
            <div className="admin-tabs">
              {["Resumo", "Produtos", "Categorias", "Marcas", "Loja"].map(
                (t) => (
                  <button
                    key={t}
                    aria-pressed={t === tab}
                    onClick={() => {
                      setTab(t);
                      setEditing(undefined);
                      setMessage("");
                      setFailure("");
                    }}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
            {(message || failure) && (
              <p
                className="notice admin-notice"
                role={failure ? "alert" : "status"}
              >
                {failure || message}
                <button
                  className="icon-btn"
                  aria-label="Dispensar mensagem"
                  onClick={() => {
                    setMessage("");
                    setFailure("");
                  }}
                >
                  <X size={15} />
                </button>
              </p>
            )}
            {tab === "Resumo" && (
              <>
                <div className="admin-grid">
                  {[
                    ["Produtos", data.products.length],
                    [
                      "Disponíveis",
                      data.products.filter(
                        (p) => p.active && p.variants.some((v) => v.stock > 0),
                      ).length,
                    ],
                    [
                      "Sem estoque",
                      data.products.filter(
                        (p) => !p.variants.some((v) => v.stock > 0),
                      ).length,
                    ],
                    [
                      "Em promoção",
                      data.products.filter((p) => p.sale_price !== null).length,
                    ],
                    ["Categorias", data.categories.length],
                  ].map(([label, n]) => (
                    <div className="stat" key={label}>
                      {label}
                      <strong>{n}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-panel">
                  <h2>Da sua loja para o mundo.</h2>
                  <p className="helper">
                    1. Cadastre categorias e marcas.
                    <br />
                    2. Adicione produtos com fotos, tamanhos, cores e estoque.
                    <br />
                    3. Configure o WhatsApp com código do país e DDD em Loja.
                    <br />
                    4. Abra a vitrine e confira os detalhes antes de divulgar.
                  </p>
                  <p className="notice">
                    Os pedidos são combinados pelo WhatsApp. O carrinho não
                    reserva nem desconta estoque automaticamente; atualize as
                    quantidades após confirmar cada venda.
                  </p>
                  <button
                    className="button"
                    onClick={() => {
                      setTab("Produtos");
                      setEditing(null);
                    }}
                  >
                    CADASTRAR PRIMEIRA PEÇA <Plus size={16} />
                  </button>
                </div>
              </>
            )}
            {tab === "Produtos" &&
              (editing !== undefined ? (
                <ProductEditor
                  data={data}
                  product={editing}
                  onCancel={() => setEditing(undefined)}
                  onSaved={async () => {
                    await changed();
                    setEditing(undefined);
                  }}
                  onError={setFailure}
                />
              ) : (
                <Products
                  data={data}
                  edit={setEditing}
                  onChanged={changed}
                  onError={setFailure}
                />
              ))}
            {tab === "Categorias" && (
              <Categories
                data={data}
                onChanged={changed}
                onError={setFailure}
              />
            )}
            {tab === "Marcas" && (
              <Brands data={data} onChanged={changed} onError={setFailure} />
            )}
            {tab === "Loja" && (
              <SettingsEditor
                settings={data.settings}
                onChanged={changed}
                onError={setFailure}
              />
            )}
          </div>
        )
      )}
    </main>
  );
}
function Login() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ email: string; password: string }>();
  const [error, setError] = useState("");
  async function login(values: { email: string; password: string }) {
    setError("");
    const result = await supabase!.auth.signInWithPassword(values);
    if (result.error)
      setError("Não foi possível entrar. Verifique seu e-mail e senha.");
  }
  return (
    <section className="admin-login">
      <span className="eyebrow">ÁREA RESTRITA</span>
      <h1>Seu próximo capítulo.</h1>
      {!supabase ? (
        <>
          <p>Você está visualizando uma prévia da loja.</p>
          <p className="notice">
            A administração ficará disponível quando a loja for ativada. Por
            enquanto, explore o catálogo e confira o visual.
          </p>
          <Link className="button" href="/">
            Voltar à vitrine demonstrativa
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(login)}>
          <p>Entre com sua conta autorizada para cuidar da loja.</p>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              {...register("email")}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              {...register("password")}
            />
          </label>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "ENTRAR COM SEGURANÇA"}{" "}
            <ArrowUpRight size={16} />
          </button>
          <p className="helper">
            Para recuperar o acesso, solicite um e-mail de redefinição ao
            responsável pelo projeto Supabase.
          </p>
        </form>
      )}
    </section>
  );
}
function Products({
  data,
  edit,
  onChanged,
  onError,
}: {
  data: CatalogData;
  edit: (p: Product | null) => void;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [q, setQ] = useState(""),
    [busy, setBusy] = useState(false);
  async function remove(p: Product) {
    if (
      !confirm(
        `Excluir “${p.name}” e suas variações? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase!.from("products").delete().eq("id", p.id);
    if (error) onError(readable(error));
    else
      try {
        await onChanged();
      } catch (e) {
        onError(readable(e));
      }
    setBusy(false);
  }
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>Suas peças</h2>
        <button className="button" onClick={() => edit(null)}>
          NOVO PRODUTO <Plus size={16} />
        </button>
      </div>
      <input
        aria-label="Pesquisar produtos no painel"
        placeholder="Buscar nome ou SKU"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {data.products
        .filter((p) =>
          `${p.name} ${p.variants.map((v) => v.sku).join(" ")}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .map((p) => (
          <div className="admin-row" key={p.id}>
            <Image
              src={p.images[0] || "/images/camiseta.svg"}
              width={48}
              height={58}
              alt={p.name}
              unoptimized
            />
            <div className="row-name">
              <strong>{p.name}</strong>
              <p className="helper">
                {p.active ? "Ativo" : "Inativo"} ·{" "}
                {p.variants.reduce((s, v) => s + v.stock, 0)} unidades ·{" "}
                {money(p.sale_price ?? p.price)}
              </p>
            </div>
            <button disabled={busy} onClick={() => edit(p)}>
              Editar
            </button>
            <button
              disabled={busy}
              onClick={() => remove(p)}
              aria-label={`Excluir ${p.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      {!data.products.length && (
        <p className="empty">
          Seu catálogo está pronto para receber a primeira peça.
        </p>
      )}
    </section>
  );
}
function ProductEditor({
  data,
  product,
  onCancel,
  onSaved,
  onError,
}: {
  data: CatalogData;
  product: Product | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const initial: ProductInput = product
    ? { ...product, variants: product.variants.map((v) => ({ ...v })) }
    : {
        name: "",
        slug: "",
        description: "",
        price: 0,
        sale_price: null,
        category_id: data.categories[0]?.id ?? "",
        brand_id: null,
        images: [],
        variants: [{ size: "M", color: "Preto", stock: 0, sku: "" }],
        active: true,
        is_new: false,
        bestseller: false,
      };
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initial,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });
  const images = useWatch({ control, name: "images" }),
    [uploading, setUploading] = useState(false),
    [url, setUrl] = useState("");
  async function upload(files: FileList | null) {
    setUploading(true);
    try {
      const added = await uploadFiles(files);
      setValue("images", [...images, ...added].slice(0, 12), {
        shouldValidate: true,
      });
    } catch (e) {
      onError(readable(e));
    }
    setUploading(false);
  }
  async function save(value: ProductInput) {
    const { error } = await supabase!.rpc("save_product", { payload: value });
    if (error) {
      onError(readable(error));
      return;
    }
    try {
      await onSaved();
    } catch (e) {
      onError(readable(e));
    }
  }
  const err = (name: keyof ProductInput) =>
    errors[name] && (
      <span className="field-error" role="alert">
        {(errors[name]?.message as string) || "Revise este campo."}
      </span>
    );
  return (
    <section className="admin-panel">
      <h2>{product ? "Editar peça" : "Uma nova peça. Uma nova história."}</h2>
      {!data.categories.length && (
        <p className="notice">
          Cadastre ao menos uma categoria antes do produto.
        </p>
      )}
      <form onSubmit={handleSubmit(save)} className="admin-form">
        <div className="form-grid">
          <label>
            Nome
            <input
              {...register("name")}
              onBlur={(e) => {
                if (!product && !getValues("slug"))
                  setValue("slug", slugify(e.target.value));
              }}
            />
            {err("name")}
          </label>
          <label>
            URL amigável
            <input {...register("slug")} />
            {err("slug")}
          </label>
          <label>
            Preço (R$)
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register("price", { valueAsNumber: true })}
            />
            {err("price")}
          </label>
          <label>
            Preço promocional (opcional)
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register("sale_price", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            />
            {err("sale_price")}
          </label>
          <label>
            Categoria
            <select {...register("category_id")}>
              <option value="">Selecione</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? " (inativa)" : ""}
                </option>
              ))}
            </select>
            {err("category_id")}
          </label>
          <label>
            Marca
            <select
              {...register("brand_id", {
                setValueAs: (v) => (v === "" ? null : v),
              })}
            >
              <option value="">Sem marca</option>
              {data.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {err("brand_id")}
          </label>
          <label className="form-wide">
            Descrição
            <textarea {...register("description")} />
            {err("description")}
          </label>
        </div>
        <div className="option-row">
          <label className="checkbox">
            <input type="checkbox" {...register("active")} /> Ativo
          </label>
          <label className="checkbox">
            <input type="checkbox" {...register("is_new")} /> Lançamento
          </label>
          <label className="checkbox">
            <input type="checkbox" {...register("bestseller")} /> Destaque /
            mais vendido (seleção manual)
          </label>
        </div>
        <fieldset>
          <legend>
            Fotos <span>Até 12 · JPG, PNG, WebP · 5 MB cada</span>
          </legend>
          <label className="upload-label">
            <Upload size={18} />{" "}
            {uploading
              ? "Enviando imagens…"
              : "Enviar fotos da câmera ou galeria"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              onChange={(e) => upload(e.target.files)}
            />
          </label>
          <div className="image-list">
            {images.map((src, i) => (
              <div key={src + i}>
                <Image
                  src={src}
                  alt={`Foto ${i + 1}`}
                  width={90}
                  height={110}
                  unoptimized
                />
                <button
                  type="button"
                  aria-label={`Remover foto ${i + 1}`}
                  onClick={() =>
                    setValue(
                      "images",
                      images.filter((_, j) => i !== j),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="admin-actions">
            <input
              type="url"
              aria-label="URL HTTPS de uma imagem"
              placeholder="Ou cole a URL HTTPS de uma imagem"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              type="button"
              className="button outline-button"
              disabled={images.length >= 12}
              onClick={() => {
                if (/^https:\/\//.test(url)) {
                  setValue("images", [...images, url], {
                    shouldValidate: true,
                  });
                  setUrl("");
                } else onError("Use uma URL de imagem HTTPS.");
              }}
            >
              Adicionar URL
            </button>
          </div>
          {err("images")}
          <p className="helper">
            A primeira imagem será a capa. Remover uma foto da peça não apaga
            seu arquivo do Storage; arquivos sem uso podem ser removidos pelo
            responsável no Supabase.
          </p>
        </fieldset>
        <fieldset>
          <legend>Variações e estoque</legend>
          {fields.map((field, i) => (
            <div key={field.id} className="variant-row">
              <label>
                Tamanho
                <input {...register(`variants.${i}.size`)} />
              </label>
              <label>
                Cor
                <input {...register(`variants.${i}.color`)} />
              </label>
              <label>
                Estoque
                <input
                  type="number"
                  min="0"
                  {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                />
              </label>
              <label>
                SKU
                <input {...register(`variants.${i}.sku`)} />
              </label>
              <button
                type="button"
                aria-label={`Excluir variação ${i + 1}`}
                disabled={fields.length === 1}
                onClick={() => remove(i)}
              >
                <X size={15} />
              </button>
              {errors.variants?.[i] && (
                <p className="field-error">
                  Revise tamanho, cor, estoque e SKU desta variação.
                </p>
              )}
            </div>
          ))}
          {errors.variants && (
            <p className="field-error" role="alert">
              {errors.variants.message ||
                errors.variants.root?.message ||
                "Revise as variações."}
            </p>
          )}
          <button
            type="button"
            className="button outline-button"
            onClick={() => append({ size: "", color: "", stock: 0, sku: "" })}
          >
            ADICIONAR VARIAÇÃO <Plus size={15} />
          </button>
        </fieldset>
        <div className="admin-actions">
          <button
            className="button"
            disabled={isSubmitting || uploading || !data.categories.length}
          >
            {isSubmitting ? "Salvando…" : "SALVAR PRODUTO"}
          </button>
          <button
            type="button"
            className="button outline-button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
function Categories({
  data,
  onChanged,
  onError,
}: {
  data: CatalogData;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const empty = {
    name: "",
    slug: "",
    image: "/images/camiseta.svg",
    active: true,
  };
  const [item, setItem] = useState<Omit<Category, "id"> & { id?: string }>(
      empty,
    ),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug)) {
      onError(
        "URL da categoria inválida. Use letras minúsculas, números e hífens.",
      );
      return;
    }
    if (!item.image.startsWith("/images/") && !/^https:\/\//.test(item.image)) {
      onError("A imagem precisa ser uma URL HTTPS.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase!.from("categories").upsert(item);
      if (error) throw error;
      await onChanged();
      setItem(empty);
    } catch (e) {
      onError(readable(e));
    }
    setBusy(false);
  }
  async function remove(c: Category) {
    if (!confirm(`Excluir categoria “${c.name}”?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase!
        .from("categories")
        .delete()
        .eq("id", c.id);
      if (error) throw error;
      await onChanged();
    } catch (e) {
      onError(readable(e));
    }
    setBusy(false);
  }
  return (
    <section className="admin-panel">
      <h2>Categorias</h2>
      <form className="admin-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Nome
            <input
              required
              maxLength={100}
              value={item.name}
              onChange={(e) =>
                setItem({
                  ...item,
                  name: e.target.value,
                  slug: item.id ? item.slug : slugify(e.target.value),
                })
              }
            />
          </label>
          <label>
            URL amigável
            <input
              required
              value={item.slug}
              onChange={(e) => setItem({ ...item, slug: e.target.value })}
            />
          </label>
          <label>
            Imagem (URL)
            <input
              required
              value={item.image}
              onChange={(e) => setItem({ ...item, image: e.target.value })}
            />
          </label>
          <label>
            Enviar imagem
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                setBusy(true);
                try {
                  const urls = await uploadFiles(e.target.files);
                  if (urls[0]) setItem((old) => ({ ...old, image: urls[0] }));
                } catch (err) {
                  onError(readable(err));
                }
                setBusy(false);
              }}
            />
          </label>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={item.active}
            onChange={(e) => setItem({ ...item, active: e.target.checked })}
          />{" "}
          Categoria ativa
        </label>
        <p className="helper">
          Desativar uma categoria também oculta seus produtos da vitrine.
        </p>
        <div className="admin-actions">
          <button className="button" disabled={busy}>
            {item.id ? "Salvar categoria" : "Adicionar categoria"}
          </button>
          {item.id && (
            <button
              type="button"
              className="button outline-button"
              onClick={() => setItem(empty)}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>
      {data.categories.map((c) => (
        <div className="admin-row" key={c.id}>
          <span className="row-name">
            {c.name} · {c.active ? "Ativa" : "Inativa"}
          </span>
          <button disabled={busy} onClick={() => setItem(c)}>
            Editar
          </button>
          <button
            disabled={busy}
            onClick={() => remove(c)}
            aria-label={`Excluir categoria ${c.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </section>
  );
}
function Brands({
  data,
  onChanged,
  onError,
}: {
  data: CatalogData;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [name, setName] = useState(""),
    [id, setId] = useState<string | undefined>(),
    [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase!
        .from("brands")
        .upsert({ ...(id ? { id } : {}), name: name.trim() });
      if (error) throw error;
      await onChanged();
      setName("");
      setId(undefined);
    } catch (e) {
      onError(readable(e));
    }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta marca?")) return;
    setBusy(true);
    try {
      const { error } = await supabase!.from("brands").delete().eq("id", id);
      if (error) throw error;
      await onChanged();
    } catch (e) {
      onError(readable(e));
    }
    setBusy(false);
  }
  return (
    <section className="admin-panel">
      <h2>Marcas</h2>
      <form onSubmit={save}>
        <label>
          Nome da marca
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="admin-actions">
          <button className="button" disabled={busy}>
            {id ? "Salvar marca" : "Adicionar marca"}
          </button>
          {id && (
            <button
              className="button outline-button"
              type="button"
              onClick={() => {
                setId(undefined);
                setName("");
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
      {data.brands.map((b) => (
        <div className="admin-row" key={b.id}>
          <span className="row-name">{b.name}</span>
          <button
            disabled={busy}
            onClick={() => {
              setName(b.name);
              setId(b.id);
            }}
          >
            Editar
          </button>
          <button
            disabled={busy}
            aria-label={`Excluir marca ${b.name}`}
            onClick={() => remove(b.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </section>
  );
}
function SettingsEditor({
  settings,
  onChanged,
  onError,
}: {
  settings: Settings;
  onChanged: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });
  const [uploading, setUploading] = useState(false);
  async function save(values: Settings) {
    try {
      const { error } = await supabase!
        .from("store_settings")
        .update({ data: values })
        .eq("id", 1);
      if (error) throw error;
      await onChanged();
    } catch (e) {
      onError(readable(e));
    }
  }
  return (
    <section className="admin-panel">
      <h2>A identidade da sua loja</h2>
      <form className="admin-form" onSubmit={handleSubmit(save)}>
        <div className="form-grid">
          {(
            [
              ["name", "Nome da loja"],
              ["slogan", "Slogan"],
              ["whatsapp", "WhatsApp (país + DDD + número)"],
              ["instagram", "Instagram (usuário)"],
              ["location", "Localização"],
              ["social_url", "Outra rede social (URL HTTPS)"],
              ["logo", "URL do logo (opcional)"],
              ["hero_image", "URL da imagem principal"],
            ] as [keyof Settings, string][]
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input {...register(key)} />
              {errors[key] && (
                <span className="field-error" role="alert">
                  {errors[key]?.message}
                </span>
              )}
            </label>
          ))}
          {(["logo", "hero_image"] as const).map((key) => (
            <label key={`upload-${key}`}>
              Enviar {key === "logo" ? "logo" : "imagem principal"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={async (e) => {
                  setUploading(true);
                  try {
                    const urls = await uploadFiles(e.target.files);
                    if (urls[0])
                      setValue(key, urls[0], { shouldValidate: true });
                  } catch (err) {
                    onError(readable(err));
                  }
                  setUploading(false);
                }}
              />
            </label>
          ))}
          {(
            [
              [
                "hero_title",
                "Título principal (quebre a linha para a segunda parte)",
              ],
              ["hero_text", "Texto principal"],
              ["about", "Sobre a loja"],
              ["delivery", "Informações de entrega"],
            ] as [keyof Settings, string][]
          ).map(([key, label]) => (
            <label key={key} className="form-wide">
              {label}
              <textarea {...register(key)} />
              {errors[key] && (
                <span className="field-error" role="alert">
                  {errors[key]?.message}
                </span>
              )}
            </label>
          ))}
        </div>
        <p className="notice">
          Não inclua segredos nestes campos: as configurações da loja são
          públicas. O número de WhatsApp é exibido apenas após seu cadastro; use
          o código do país, por exemplo o formato 55 + DDD + número.
        </p>
        <button className="button" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Salvando…" : "SALVAR CONFIGURAÇÕES"}
        </button>
      </form>
    </section>
  );
}
