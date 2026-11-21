-- =====================================================================
-- BizLens core schema (milestone 1)
-- Businesses, members, products, stock movements, sales, stock receipts,
-- expenses and a double-entry ledger. Run once in the Supabase SQL Editor.
-- =====================================================================

-- ---------- 1. Tables ------------------------------------------------

create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  currency    text not null default 'ZMW',
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);

create table public.business_users (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.accounts (
  business_id uuid not null references public.businesses (id) on delete cascade,
  code        text not null,
  name        text not null,
  type        text not null check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  primary key (business_id, code)
);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  sku           text,
  unit          text not null default 'each',
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  -- The two columns below are maintained ONLY by the posting functions.
  qty_on_hand   numeric(14,3) not null default 0 check (qty_on_hand >= 0),
  avg_cost      numeric(14,4) not null default 0 check (avg_cost >= 0),
  created_at    timestamptz not null default now(),
  unique (business_id, name)
);

create table public.inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  product_id    uuid not null references public.products (id),
  movement_type text not null check (movement_type in ('opening', 'receipt', 'sale', 'adjustment')),
  quantity      numeric(14,3) not null check (quantity <> 0),   -- + in, - out
  unit_cost     numeric(14,4) not null,
  source_table  text not null,
  source_id     uuid not null,
  created_by    uuid not null default auth.uid(),
  created_at    timestamptz not null default now()
);

create table public.sales (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  sale_date         date not null default current_date,
  customer_name     text,
  payment_method    text not null check (payment_method in ('cash', 'mobile_money', 'bank', 'credit')),
  total             numeric(14,2) not null,
  cost_of_sales     numeric(14,2) not null,
  client_request_id uuid not null,
  created_by        uuid not null default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (business_id, client_request_id)          -- stops double submissions
);

create table public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity   numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost  numeric(14,4) not null,
  line_total numeric(14,2) not null
);

create table public.purchases (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  receipt_date      date not null default current_date,
  supplier_name     text,
  reference         text,
  payment_method    text not null check (payment_method in ('cash', 'mobile_money', 'bank', 'credit')),
  total             numeric(14,2) not null,
  client_request_id uuid not null,
  created_by        uuid not null default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (business_id, client_request_id)
);

create table public.purchase_items (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id  uuid not null references public.products (id),
  quantity    numeric(14,3) not null check (quantity > 0),
  unit_cost   numeric(14,4) not null check (unit_cost >= 0),
  line_total  numeric(14,2) not null
);

create table public.expenses (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  expense_date      date not null default current_date,
  category          text not null,
  description       text,
  amount            numeric(14,2) not null check (amount > 0),
  payment_method    text not null check (payment_method in ('cash', 'mobile_money', 'bank', 'credit')),
  client_request_id uuid not null,
  created_by        uuid not null default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (business_id, client_request_id)
);

create table public.journal_entries (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  entry_date   date not null,
  source_table text not null,
  source_id    uuid not null,
  memo         text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now()
);

create table public.journal_lines (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.journal_entries (id) on delete cascade,
  business_id  uuid not null,
  account_code text not null,
  debit        numeric(14,2) not null default 0 check (debit >= 0),
  credit       numeric(14,2) not null default 0 check (credit >= 0),
  check (debit = 0 or credit = 0),
  foreign key (business_id, account_code) references public.accounts (business_id, code)
);

create index on public.products (business_id);
create index on public.inventory_movements (product_id);
create index on public.sales (business_id, sale_date);
create index on public.journal_lines (business_id, account_code);

-- ---------- 2. Helper functions (private schema) ---------------------

create schema if not exists private;

create or replace function private.is_member(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_users
    where business_id = p_business_id and user_id = auth.uid()
  );
$$;

create or replace function private.require_member(p_business_id uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_member(p_business_id) then
    raise exception 'Not allowed: you are not a member of this business';
  end if;
end;
$$;

-- Which ledger account receives/pays the money for each payment method.
create or replace function private.money_account(p_method text, p_is_sale boolean)
returns text
language sql immutable
as $$
  select case p_method
    when 'cash'         then '1000'
    when 'mobile_money' then '1010'
    when 'bank'         then '1020'
    when 'credit'       then case when p_is_sale then '1100' else '2000' end
  end;
$$;

-- Posts a balanced journal. p_lines = [{"account":"1000","debit":10,"credit":0}, ...]
create or replace function private.post_journal(
  p_business_id uuid, p_date date, p_source_table text, p_source_id uuid,
  p_memo text, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_entry uuid;
  v_dr numeric; v_cr numeric;
begin
  select coalesce(sum((l->>'debit')::numeric), 0), coalesce(sum((l->>'credit')::numeric), 0)
    into v_dr, v_cr
  from jsonb_array_elements(p_lines) l;

  if v_dr <> v_cr or v_dr = 0 then
    raise exception 'Journal does not balance (Dr %, Cr %)', v_dr, v_cr;
  end if;

  insert into public.journal_entries (business_id, entry_date, source_table, source_id, memo)
  values (p_business_id, p_date, p_source_table, p_source_id, p_memo)
  returning id into v_entry;

  insert into public.journal_lines (entry_id, business_id, account_code, debit, credit)
  select v_entry, p_business_id, l->>'account',
         coalesce((l->>'debit')::numeric, 0), coalesce((l->>'credit')::numeric, 0)
  from jsonb_array_elements(p_lines) l
  where coalesce((l->>'debit')::numeric, 0) <> 0 or coalesce((l->>'credit')::numeric, 0) <> 0;

  return v_entry;
end;
$$;

-- ---------- 3. Public functions the app calls (via supabase.rpc) -----

create or replace function public.create_business(p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;

  insert into public.businesses (name, created_by) values (trim(p_name), auth.uid())
  returning id into v_id;

  insert into public.business_users (business_id, user_id, role) values (v_id, auth.uid(), 'owner');

  insert into public.accounts (business_id, code, name, type) values
    (v_id, '1000', 'Cash on hand',          'asset'),
    (v_id, '1010', 'Mobile money',          'asset'),
    (v_id, '1020', 'Bank',                  'asset'),
    (v_id, '1100', 'Accounts receivable',   'asset'),
    (v_id, '1200', 'Inventory',             'asset'),
    (v_id, '2000', 'Accounts payable',      'liability'),
    (v_id, '3000', 'Owner capital',         'equity'),
    (v_id, '4000', 'Sales',                 'income'),
    (v_id, '5000', 'Cost of sales',         'expense'),
    (v_id, '6000', 'Rent',                  'expense'),
    (v_id, '6010', 'Utilities',             'expense'),
    (v_id, '6020', 'Transport',             'expense'),
    (v_id, '6030', 'Wages',                 'expense'),
    (v_id, '6040', 'Marketing',             'expense'),
    (v_id, '6090', 'Other expenses',        'expense');

  return v_id;
end;
$$;

-- Adds a product. Opening stock is posted as Dr Inventory / Cr Owner capital.
create or replace function public.add_product(
  p_business_id uuid, p_name text, p_sku text, p_unit text,
  p_selling_price numeric, p_reorder_level numeric,
  p_opening_qty numeric, p_opening_cost numeric)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  perform private.require_member(p_business_id);
  if coalesce(p_opening_qty, 0) < 0 or coalesce(p_opening_cost, 0) < 0 then
    raise exception 'Opening quantity and cost cannot be negative';
  end if;

  insert into public.products (business_id, name, sku, unit, selling_price, reorder_level)
  values (p_business_id, trim(p_name), nullif(trim(p_sku), ''), coalesce(nullif(trim(p_unit), ''), 'each'),
          coalesce(p_selling_price, 0), coalesce(p_reorder_level, 0))
  returning id into v_id;

  if coalesce(p_opening_qty, 0) > 0 then
    update public.products set qty_on_hand = p_opening_qty, avg_cost = coalesce(p_opening_cost, 0)
    where id = v_id;

    insert into public.inventory_movements (business_id, product_id, movement_type, quantity, unit_cost, source_table, source_id)
    values (p_business_id, v_id, 'opening', p_opening_qty, coalesce(p_opening_cost, 0), 'products', v_id);

    if round(p_opening_qty * coalesce(p_opening_cost, 0), 2) > 0 then
      perform private.post_journal(p_business_id, current_date, 'products', v_id, 'Opening stock: ' || p_name,
        jsonb_build_array(
          jsonb_build_object('account', '1200', 'debit',  round(p_opening_qty * p_opening_cost, 2)),
          jsonb_build_object('account', '3000', 'credit', round(p_opening_qty * p_opening_cost, 2))));
    end if;
  end if;

  return v_id;
end;
$$;

-- Receive stock from a supplier. Updates weighted-average cost.
-- p_items = [{"product_id":"...","quantity":10,"unit_cost":45}, ...]
create or replace function public.receive_stock(
  p_business_id uuid, p_receipt_date date, p_supplier_name text, p_reference text,
  p_payment_method text, p_items jsonb, p_request_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid; v_total numeric := 0; v_item jsonb; v_prod public.products%rowtype;
  v_qty numeric; v_cost numeric;
begin
  perform private.require_member(p_business_id);

  select id into v_id from public.purchases where business_id = p_business_id and client_request_id = p_request_id;
  if v_id is not null then return v_id; end if;   -- already saved (double click)

  if jsonb_array_length(coalesce(p_items, '[]')) = 0 then raise exception 'Add at least one item'; end if;

  insert into public.purchases (business_id, receipt_date, supplier_name, reference, payment_method, total, client_request_id)
  values (p_business_id, coalesce(p_receipt_date, current_date), nullif(trim(p_supplier_name), ''),
          nullif(trim(p_reference), ''), p_payment_method, 0, p_request_id)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty  := (v_item->>'quantity')::numeric;
    v_cost := (v_item->>'unit_cost')::numeric;
    if v_qty is null or v_qty <= 0 or v_cost is null or v_cost < 0 then
      raise exception 'Each line needs a quantity above 0 and a cost of 0 or more';
    end if;

    select * into v_prod from public.products
    where id = (v_item->>'product_id')::uuid and business_id = p_business_id
    for update;
    if not found then raise exception 'Product not found in this business'; end if;

    update public.products set
      avg_cost    = round((qty_on_hand * avg_cost + v_qty * v_cost) / (qty_on_hand + v_qty), 4),
      qty_on_hand = qty_on_hand + v_qty
    where id = v_prod.id;

    insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost, line_total)
    values (v_id, v_prod.id, v_qty, v_cost, round(v_qty * v_cost, 2));

    insert into public.inventory_movements (business_id, product_id, movement_type, quantity, unit_cost, source_table, source_id)
    values (p_business_id, v_prod.id, 'receipt', v_qty, v_cost, 'purchases', v_id);

    v_total := v_total + round(v_qty * v_cost, 2);
  end loop;

  update public.purchases set total = v_total where id = v_id;

  perform private.post_journal(p_business_id, coalesce(p_receipt_date, current_date), 'purchases', v_id,
    'Stock received' || coalesce(' from ' || nullif(trim(p_supplier_name), ''), ''),
    jsonb_build_array(
      jsonb_build_object('account', '1200', 'debit', v_total),
      jsonb_build_object('account', private.money_account(p_payment_method, false), 'credit', v_total)));

  return v_id;
end;
$$;

-- Record a sale. Blocks negative stock, posts sales and cost of sales.
-- p_items = [{"product_id":"...","quantity":5,"unit_price":60}, ...]
create or replace function public.record_sale(
  p_business_id uuid, p_sale_date date, p_customer_name text,
  p_payment_method text, p_items jsonb, p_request_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid; v_total numeric := 0; v_cogs numeric := 0; v_item jsonb;
  v_prod public.products%rowtype; v_qty numeric; v_price numeric;
begin
  perform private.require_member(p_business_id);

  select id into v_id from public.sales where business_id = p_business_id and client_request_id = p_request_id;
  if v_id is not null then return v_id; end if;

  if jsonb_array_length(coalesce(p_items, '[]')) = 0 then raise exception 'Add at least one item'; end if;
  if p_payment_method = 'credit' and nullif(trim(p_customer_name), '') is null then
    raise exception 'A credit sale needs a customer name';
  end if;

  insert into public.sales (business_id, sale_date, customer_name, payment_method, total, cost_of_sales, client_request_id)
  values (p_business_id, coalesce(p_sale_date, current_date), nullif(trim(p_customer_name), ''),
          p_payment_method, 0, 0, p_request_id)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty   := (v_item->>'quantity')::numeric;
    v_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty <= 0 or v_price is null or v_price < 0 then
      raise exception 'Each line needs a quantity above 0 and a price of 0 or more';
    end if;

    select * into v_prod from public.products
    where id = (v_item->>'product_id')::uuid and business_id = p_business_id
    for update;
    if not found then raise exception 'Product not found in this business'; end if;
    if v_prod.qty_on_hand < v_qty then
      raise exception 'Not enough stock for %: you have %, tried to sell %', v_prod.name, v_prod.qty_on_hand, v_qty;
    end if;

    update public.products set qty_on_hand = qty_on_hand - v_qty where id = v_prod.id;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, line_total)
    values (v_id, v_prod.id, v_qty, v_price, v_prod.avg_cost, round(v_qty * v_price, 2));

    insert into public.inventory_movements (business_id, product_id, movement_type, quantity, unit_cost, source_table, source_id)
    values (p_business_id, v_prod.id, 'sale', -v_qty, v_prod.avg_cost, 'sales', v_id);

    v_total := v_total + round(v_qty * v_price, 2);
    v_cogs  := v_cogs  + round(v_qty * v_prod.avg_cost, 2);
  end loop;

  update public.sales set total = v_total, cost_of_sales = v_cogs where id = v_id;

  perform private.post_journal(p_business_id, coalesce(p_sale_date, current_date), 'sales', v_id,
    'Sale' || coalesce(' to ' || nullif(trim(p_customer_name), ''), ''),
    jsonb_build_array(
      jsonb_build_object('account', private.money_account(p_payment_method, true), 'debit', v_total),
      jsonb_build_object('account', '4000', 'credit', v_total),
      jsonb_build_object('account', '5000', 'debit',  v_cogs),
      jsonb_build_object('account', '1200', 'credit', v_cogs)));

  return v_id;
end;
$$;

create or replace function public.record_expense(
  p_business_id uuid, p_expense_date date, p_category text, p_description text,
  p_amount numeric, p_payment_method text, p_request_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_account text;
begin
  perform private.require_member(p_business_id);

  select id into v_id from public.expenses where business_id = p_business_id and client_request_id = p_request_id;
  if v_id is not null then return v_id; end if;

  v_account := case p_category
    when 'Rent' then '6000' when 'Utilities' then '6010' when 'Transport' then '6020'
    when 'Wages' then '6030' when 'Marketing' then '6040' else '6090' end;

  insert into public.expenses (business_id, expense_date, category, description, amount, payment_method, client_request_id)
  values (p_business_id, coalesce(p_expense_date, current_date), p_category, nullif(trim(p_description), ''),
          round(p_amount, 2), p_payment_method, p_request_id)
  returning id into v_id;

  perform private.post_journal(p_business_id, coalesce(p_expense_date, current_date), 'expenses', v_id,
    p_category || coalesce(': ' || nullif(trim(p_description), ''), ''),
    jsonb_build_array(
      jsonb_build_object('account', v_account, 'debit', round(p_amount, 2)),
      jsonb_build_object('account', private.money_account(p_payment_method, false), 'credit', round(p_amount, 2))));

  return v_id;
end;
$$;

-- Dashboard figures, calculated from the ledger (not from screen formulas).
create or replace function public.dashboard_summary(p_business_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform private.require_member(p_business_id);

  with period as (
    select l.account_code, sum(l.debit) dr, sum(l.credit) cr
    from public.journal_lines l join public.journal_entries e on e.id = l.entry_id
    where l.business_id = p_business_id and e.entry_date between p_from and p_to
    group by l.account_code
  ), to_date as (
    select l.account_code, sum(l.debit - l.credit) bal
    from public.journal_lines l join public.journal_entries e on e.id = l.entry_id
    where l.business_id = p_business_id and e.entry_date <= p_to
    group by l.account_code
  )
  select jsonb_build_object(
    'sales',          coalesce((select cr - dr from period where account_code = '4000'), 0),
    'cost_of_sales',  coalesce((select dr - cr from period where account_code = '5000'), 0),
    'expenses',       coalesce((select sum(dr - cr) from period where account_code like '6%'), 0),
    'cash',           coalesce((select sum(bal) from to_date where account_code in ('1000','1010','1020')), 0),
    'receivables',    coalesce((select bal from to_date where account_code = '1100'), 0),
    'payables',       coalesce((select -bal from to_date where account_code = '2000'), 0),
    'inventory_value',coalesce((select bal from to_date where account_code = '1200'), 0),
    'low_stock',      (select count(*) from public.products
                       where business_id = p_business_id and qty_on_hand <= reorder_level)
  ) into v;

  return v;
end;
$$;

-- ---------- 4. Security: Row Level Security --------------------------

alter table public.businesses          enable row level security;
alter table public.business_users      enable row level security;
alter table public.accounts            enable row level security;
alter table public.products            enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sales               enable row level security;
alter table public.sale_items          enable row level security;
alter table public.purchases           enable row level security;
alter table public.purchase_items      enable row level security;
alter table public.expenses            enable row level security;
alter table public.journal_entries     enable row level security;
alter table public.journal_lines       enable row level security;

-- Members can READ their own business data. All WRITES go through the
-- functions above, so there are deliberately no insert/update/delete policies.
create policy "members read business" on public.businesses
  for select to authenticated using (private.is_member(id));
create policy "members read membership" on public.business_users
  for select to authenticated using (user_id = auth.uid() or private.is_member(business_id));
create policy "members read accounts" on public.accounts
  for select to authenticated using (private.is_member(business_id));
create policy "members read products" on public.products
  for select to authenticated using (private.is_member(business_id));
create policy "members read movements" on public.inventory_movements
  for select to authenticated using (private.is_member(business_id));
create policy "members read sales" on public.sales
  for select to authenticated using (private.is_member(business_id));
create policy "members read sale items" on public.sale_items
  for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and private.is_member(s.business_id)));
create policy "members read purchases" on public.purchases
  for select to authenticated using (private.is_member(business_id));
create policy "members read purchase items" on public.purchase_items
  for select to authenticated using (exists (select 1 from public.purchases p where p.id = purchase_id and private.is_member(p.business_id)));
create policy "members read expenses" on public.expenses
  for select to authenticated using (private.is_member(business_id));
create policy "members read journals" on public.journal_entries
  for select to authenticated using (private.is_member(business_id));
create policy "members read journal lines" on public.journal_lines
  for select to authenticated using (private.is_member(business_id));

-- Lock down the private helpers and expose only the app functions.
-- (RLS policies run as the signed-in user, so they need is_member.)
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_business(text) to authenticated;
grant execute on function public.add_product(uuid, text, text, text, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.receive_stock(uuid, date, text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.record_sale(uuid, date, text, text, jsonb, uuid) to authenticated;
grant execute on function public.record_expense(uuid, date, text, text, numeric, text, uuid) to authenticated;
grant execute on function public.dashboard_summary(uuid, date, date) to authenticated;
