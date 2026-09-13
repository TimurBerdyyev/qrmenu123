-- Выполните этот скрипт целиком в Supabase: Project -> SQL Editor -> New query -> Run.
-- Скрипт безопасно перезапускать повторно (например, если в первый раз что-то
-- пошло не так) — он не упадёт на "уже существует".

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==================== ORDERS ====================

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  table_number int,                -- null, если заказ "с собой"
  is_takeaway boolean not null default false,
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'completed')),
  total numeric(10, 2) not null default 0,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  quantity int not null default 1,
  notes text
);

create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_orders_created_at on orders(created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute procedure set_updated_at();

-- ==================== MENU ITEMS (с фото) ====================

create table if not exists menu_items (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  name text not null,
  price numeric(10, 2) not null,
  image_url text,
  sort_order int not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_category on menu_items(category, sort_order);

-- Наполняем начальным меню, только если таблица пустая (не дублирует при повторном запуске)
do $$
begin
  if not exists (select 1 from menu_items limit 1) then
    insert into menu_items (category, name, price, sort_order) values
      ('Кофе', 'Эспрессо', 120, 1),
      ('Кофе', 'Американо', 140, 2),
      ('Кофе', 'Капучино', 180, 3),
      ('Кофе', 'Латте', 190, 4),
      ('Напитки', 'Чай (чёрный / зелёный)', 100, 1),
      ('Напитки', 'Домашний лимонад', 150, 2),
      ('Напитки', 'Свежевыжатый сок', 200, 3),
      ('Завтраки', 'Омлет с сыром', 220, 1),
      ('Завтраки', 'Шакшука', 260, 2),
      ('Завтраки', 'Сырники со сметаной', 210, 3),
      ('Основные блюда', 'Паста с курицей', 320, 1),
      ('Основные блюда', 'Бургер с картофелем фри', 350, 2),
      ('Основные блюда', 'Салат Цезарь', 280, 3),
      ('Десерты', 'Чизкейк', 180, 1),
      ('Десерты', 'Круассан', 130, 2);
  end if;
end $$;

-- ==================== REALTIME ====================
-- Добавляем таблицы в публикацию только если их там ещё нет —
-- иначе команда падает с ошибкой и (в SQL Editor) откатывает ВЕСЬ скрипт,
-- включая уже созданные таблицы и политики ниже. Это была вероятная причина,
-- почему заказы не создавались и не долетали до монитора.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table order_items;
  end if;
end $$;

-- ==================== ROW LEVEL SECURITY ====================
-- MVP: анонимный ключ может читать и писать заказы/меню напрямую.
-- Годится для одного небольшого кафе. Позже можно добавить Supabase Auth
-- и ограничить update/delete только для персонала.

alter table orders enable row level security;
alter table order_items enable row level security;
alter table menu_items enable row level security;

drop policy if exists "orders_public_select" on orders;
create policy "orders_public_select" on orders for select using (true);
drop policy if exists "orders_public_insert" on orders;
create policy "orders_public_insert" on orders for insert with check (true);
drop policy if exists "orders_public_update" on orders;
create policy "orders_public_update" on orders for update using (true);

drop policy if exists "order_items_public_select" on order_items;
create policy "order_items_public_select" on order_items for select using (true);
drop policy if exists "order_items_public_insert" on order_items;
create policy "order_items_public_insert" on order_items for insert with check (true);

drop policy if exists "menu_items_public_select" on menu_items;
create policy "menu_items_public_select" on menu_items for select using (true);
drop policy if exists "menu_items_public_insert" on menu_items;
create policy "menu_items_public_insert" on menu_items for insert with check (true);
drop policy if exists "menu_items_public_update" on menu_items;
create policy "menu_items_public_update" on menu_items for update using (true);
drop policy if exists "menu_items_public_delete" on menu_items;
create policy "menu_items_public_delete" on menu_items for delete using (true);

-- Явные права на таблицы для ролей anon/authenticated.
-- Обычно Supabase выставляет их сама, но если в вашем проекте это не так —
-- именно отсутствие этих grant'ов выглядит как "ничего не происходит при заказе".
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on orders to anon, authenticated;
grant select, insert, update, delete on order_items to anon, authenticated;
grant select, insert, update, delete on menu_items to anon, authenticated;

-- ==================== STORAGE (фото блюд) ====================

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read" on storage.objects
  for select using (bucket_id = 'menu-images');

drop policy if exists "menu_images_public_upload" on storage.objects;
create policy "menu_images_public_upload" on storage.objects
  for insert with check (bucket_id = 'menu-images');

drop policy if exists "menu_images_public_delete" on storage.objects;
create policy "menu_images_public_delete" on storage.objects
  for delete using (bucket_id = 'menu-images');
