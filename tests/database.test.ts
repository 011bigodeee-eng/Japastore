import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration, atomic writes and RLS isolate visitors, members and admins", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public,storage to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    const migration = await readFile(
      new URL("../supabase/migrations/001_store.sql", import.meta.url),
      "utf8",
    );
    // PGlite includes gen_random_uuid natively; hosted Supabase supplies pgcrypto.
    await db.exec(
      migration.replace("create extension if not exists pgcrypto;", ""),
    );
    const admin = "11111111-1111-4111-8111-111111111111",
      member = "22222222-2222-4222-8222-222222222222",
      cat = "33333333-3333-4333-8333-333333333333";
    await db.exec(
      `insert into auth.users values('${admin}'),('${member}');insert into public.admin_users values('${admin}');insert into public.categories(id,name,slug) values('${cat}','Camisetas','camisetas');`,
    );
    await db.exec(`set role anon`);
    assert.deepEqual(
      (await db.query("select public.is_admin() as value")).rows,
      [{ value: false }],
    );
    await assert.rejects(
      db.query(
        `insert into public.categories(name,slug) values('Hack','hack')`,
      ),
    );
    await assert.rejects(db.query(`select * from public.admin_users`));
    await assert.rejects(
      db.query(
        `insert into storage.objects(bucket_id,name) values('catalog','hack.jpg')`,
      ),
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${member}'`,
    );
    await assert.rejects(
      db.query(`insert into public.admin_users values('${member}')`),
    );
    await assert.rejects(
      db.query("select public.save_product($1::jsonb)", [JSON.stringify({})]),
    );
    await db.exec(`set request.jwt.claim.sub='${admin}'`);
    const payload = {
      name: "Camiseta real",
      slug: "camiseta-real",
      description: "Descrição de teste",
      price: 100,
      sale_price: 80,
      category_id: cat,
      brand_id: null,
      active: true,
      is_new: true,
      bestseller: false,
      images: ["https://example.com/foto.webp"],
      variants: [{ size: "M", color: "Preto", stock: 2, sku: "REAL-M" }],
    };
    const saved = await db.query<{ id: string }>(
      "select public.save_product($1::jsonb) as id",
      [JSON.stringify(payload)],
    );
    const id = saved.rows[0].id;
    const v = await db.query<{ id: string }>(
      "select id from public.product_variants where product_id=$1",
      [id],
    );
    await db.query("select public.save_product($1::jsonb)", [
      JSON.stringify({
        ...payload,
        id,
        name: "Nome editado",
        variants: [{ ...payload.variants[0], id: v.rows[0].id, stock: 3 }],
      }),
    ]);
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select id from public.product_variants where product_id=$1",
          [id],
        )
      ).rows[0].id,
      v.rows[0].id,
    );
    await assert.rejects(
      db.query("select public.save_product($1::jsonb)", [
        JSON.stringify({
          ...payload,
          id,
          name: "Não deve salvar",
          variants: [{ ...payload.variants[0], stock: -1 }],
        }),
      ]),
    );
    assert.equal(
      (
        await db.query<{ name: string }>(
          "select name from public.products where id=$1",
          [id],
        )
      ).rows[0].name,
      "Nome editado",
    );
    await db.query(
      `insert into storage.objects(bucket_id,name) values('catalog','real.jpg')`,
    );
    await db.exec(`reset role;set role anon;set request.jwt.claim.sub=''`);
    assert.equal(
      (await db.query("select * from public.products")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.product_variants")).rows.length,
      1,
    );
    await db.exec(
      `reset role;update public.categories set active=false where id='${cat}';set role anon`,
    );
    assert.equal(
      (await db.query("select * from public.products")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.product_variants")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.product_images")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
