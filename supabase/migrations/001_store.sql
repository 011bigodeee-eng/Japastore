-- Execute no projeto Supabase antes de configurar as variáveis do site.
create extension if not exists pgcrypto;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create policy "Own admin membership" on public.admin_users for select to authenticated using (user_id=auth.uid());
create table public.categories(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 100),slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),image text not null default '/images/camiseta.svg',active boolean not null default true);
create table public.brands(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 100));
create table public.products(id uuid primary key default gen_random_uuid(),slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),name text not null check(length(name) between 2 and 150),description text not null,price numeric(12,2) not null check(price>0),sale_price numeric(12,2) check(sale_price>0 and sale_price<price),category_id uuid not null references public.categories(id),brand_id uuid references public.brands(id),active boolean not null default true,is_new boolean not null default false,bestseller boolean not null default false,created_at timestamptz not null default now());
create table public.product_variants(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,size text not null check(length(size) between 1 and 30),color text not null check(length(color) between 1 and 50),stock integer not null default 0 check(stock between 0 and 1000000),sku text not null unique check(length(sku) between 1 and 100),unique(product_id,size,color));
create table public.product_images(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,url text not null check(url ~ '^https://' or url ~ '^/images/'),position integer not null default 0);
create table public.store_settings(id integer primary key default 1 check(id=1),data jsonb not null default '{}'::jsonb);
insert into public.store_settings(id,data) values(1,'{}');
create index products_category_idx on public.products(category_id);
create index products_brand_idx on public.products(brand_id);
create index products_active_created_idx on public.products(active,created_at desc);
create index products_price_idx on public.products(price);
create index variants_product_idx on public.product_variants(product_id);
create index images_product_idx on public.product_images(product_id);
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.store_settings enable row level security;
create policy "Read active categories" on public.categories for select to anon,authenticated using(active or public.is_admin());
create policy "Read brands" on public.brands for select to anon,authenticated using(true);
create policy "Read active products" on public.products for select to anon,authenticated using(public.is_admin() or (active and exists(select 1 from public.categories where id=category_id and active)));
create policy "Read visible variants" on public.product_variants for select to anon,authenticated using(exists(select 1 from public.products where id=product_id));
create policy "Read visible images" on public.product_images for select to anon,authenticated using(exists(select 1 from public.products where id=product_id));
create policy "Read store settings" on public.store_settings for select to anon,authenticated using(true);
create policy "Admin categories" on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin brands" on public.brands for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin products" on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin variants" on public.product_variants for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin images" on public.product_images for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin settings" on public.store_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.categories,public.brands,public.products,public.product_variants,public.product_images,public.store_settings to anon;
grant select on public.admin_users to authenticated;
grant select,insert,update,delete on public.categories,public.brands,public.products,public.product_variants,public.product_images,public.store_settings to authenticated;
-- Produto, imagens e estoque são salvos em uma única transação.
create or replace function public.save_product(payload jsonb) returns uuid language plpgsql security invoker set search_path=public as $$
declare pid uuid; v jsonb;
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if jsonb_array_length(payload->'variants')<1 or jsonb_array_length(payload->'images')<1 then raise exception 'Images and variants required'; end if;
 pid=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 insert into public.products(id,name,slug,description,price,sale_price,category_id,brand_id,active,is_new,bestseller)
 values(pid,payload->>'name',payload->>'slug',payload->>'description',(payload->>'price')::numeric,(payload->>'sale_price')::numeric,(payload->>'category_id')::uuid,(payload->>'brand_id')::uuid,(payload->>'active')::boolean,(payload->>'is_new')::boolean,(payload->>'bestseller')::boolean)
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,price=excluded.price,sale_price=excluded.sale_price,category_id=excluded.category_id,brand_id=excluded.brand_id,active=excluded.active,is_new=excluded.is_new,bestseller=excluded.bestseller;
 delete from public.product_variants where product_id=pid and id not in(select (entry->>'id')::uuid from jsonb_array_elements(payload->'variants') entry where entry->>'id' is not null);
 for v in select * from jsonb_array_elements(payload->'variants') loop
  if v->>'id' is not null and exists(select 1 from public.product_variants where id=(v->>'id')::uuid and product_id<>pid) then raise exception 'Variant belongs to another product'; end if;
  insert into public.product_variants(id,product_id,size,color,stock,sku) values(coalesce((v->>'id')::uuid,gen_random_uuid()),pid,v->>'size',v->>'color',(v->>'stock')::integer,v->>'sku') on conflict(id) do update set size=excluded.size,color=excluded.color,stock=excluded.stock,sku=excluded.sku;
 end loop;
 delete from public.product_images where product_id=pid;
 insert into public.product_images(product_id,url,position) select pid,value,ordinality-1 from jsonb_array_elements_text(payload->'images') with ordinality;
 return pid;
end $$;
revoke all on function public.save_product(jsonb) from public;
grant execute on function public.save_product(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog','catalog',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy "Read catalog images" on storage.objects for select to anon,authenticated using(bucket_id='catalog');
create policy "Admin upload" on storage.objects for insert to authenticated with check(bucket_id='catalog' and public.is_admin());
create policy "Admin update images" on storage.objects for update to authenticated using(bucket_id='catalog' and public.is_admin()) with check(bucket_id='catalog' and public.is_admin());
create policy "Admin delete images" on storage.objects for delete to authenticated using(bucket_id='catalog' and public.is_admin());
