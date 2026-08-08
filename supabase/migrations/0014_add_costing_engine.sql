create type public.cost_unit as enum ('g', 'kg', 'ml', 'l', 'unit');
create type public.recipe_yield_unit as enum ('unit', 'kg');
create type public.fixed_cost_period as enum ('daily', 'monthly', 'quarterly', 'semiannual', 'annual');

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 1 and 100),
  category text not null default 'Otros',
  base_unit public.cost_unit not null check (base_unit in ('g', 'ml', 'unit')),
  notes text check (notes is null or char_length(notes) <= 500),
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index ingredients_business_name_idx
  on public.ingredients (business_id, lower(name)) where deleted_at is null;

create table public.ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  ingredient_id uuid not null references public.ingredients(id),
  purchase_quantity numeric(14,3) not null check (purchase_quantity > 0),
  purchase_unit public.cost_unit not null,
  base_quantity numeric(16,3) not null check (base_quantity > 0),
  gross_amount bigint not null check (gross_amount > 0),
  net_amount bigint not null check (net_amount > 0),
  tax_amount bigint not null check (tax_amount >= 0),
  tax_rate numeric(6,3) not null default 19 check (tax_rate >= 0 and tax_rate <= 100),
  supplier text check (supplier is null or char_length(supplier) <= 120),
  purchase_date date not null,
  confirmed boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (gross_amount = net_amount + tax_amount)
);
create index ingredient_prices_latest_idx
  on public.ingredient_prices (ingredient_id, purchase_date desc, created_at desc);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  yield_quantity numeric(14,3) not null check (yield_quantity > 0),
  yield_unit public.recipe_yield_unit not null,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index recipes_business_name_idx
  on public.recipes (business_id, lower(name)) where deleted_at is null;

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id),
  subrecipe_id uuid references public.recipes(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit public.cost_unit not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check ((ingredient_id is not null)::integer + (subrecipe_id is not null)::integer = 1),
  check (recipe_id is distinct from subrecipe_id)
);
create index recipe_items_recipe_idx on public.recipe_items (recipe_id, position);

alter table public.products
  add column cost_recipe_id uuid references public.recipes(id),
  add column waste_percentage numeric(6,3) not null default 0
    check (waste_percentage >= 0 and waste_percentage < 100),
  add column target_margin_percentage numeric(6,3) not null default 60
    check (target_margin_percentage >= 0 and target_margin_percentage < 95);

create table public.cost_settings (
  business_id uuid primary key references public.businesses(id),
  vat_rate numeric(6,3) not null default 19 check (vat_rate >= 0 and vat_rate <= 100),
  operating_days_month integer not null default 26 check (operating_days_month between 1 and 31),
  expected_cash_percentage numeric(6,3) not null default 20,
  expected_debit_percentage numeric(6,3) not null default 60,
  expected_credit_percentage numeric(6,3) not null default 15,
  expected_transfer_percentage numeric(6,3) not null default 5,
  debit_fee_percentage numeric(7,4) not null default 2.0825,
  credit_fee_percentage numeric(7,4) not null default 2.3500,
  target_monthly_profit bigint not null default 0,
  updated_at timestamptz not null default now(),
  check (expected_cash_percentage + expected_debit_percentage +
         expected_credit_percentage + expected_transfer_percentage = 100),
  check (least(expected_cash_percentage, expected_debit_percentage,
               expected_credit_percentage, expected_transfer_percentage) >= 0),
  check (debit_fee_percentage >= 0 and credit_fee_percentage >= 0)
);

insert into public.cost_settings (business_id)
select id from public.businesses
on conflict (business_id) do nothing;

create or replace function private.create_business_cost_settings()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.cost_settings (business_id) values (new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

create trigger create_business_cost_settings
after insert on public.businesses
for each row execute function private.create_business_cost_settings();

create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null default 'Otros',
  amount bigint not null check (amount > 0),
  period public.fixed_cost_period not null default 'monthly',
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index fixed_costs_business_active_idx on public.fixed_costs (business_id, active);

create table public.sales_scenarios (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 1 and 100),
  operating_days integer not null default 26 check (operating_days between 1 and 31),
  target_profit bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.sales_scenario_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  scenario_id uuid not null references public.sales_scenarios(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity_per_day numeric(14,3) not null check (quantity_per_day >= 0),
  unique (scenario_id, product_id)
);

alter table public.ingredients enable row level security;
alter table public.ingredient_prices enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.cost_settings enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.sales_scenarios enable row level security;
alter table public.sales_scenario_items enable row level security;

create policy "ingredient access" on public.ingredients for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "ingredient price access" on public.ingredient_prices for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "recipe access" on public.recipes for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "recipe item access" on public.recipe_items for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "cost settings access" on public.cost_settings for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "fixed cost access" on public.fixed_costs for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "sales scenario access" on public.sales_scenarios for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
create policy "sales scenario item access" on public.sales_scenario_items for all to authenticated
  using (private.administers(business_id)) with check (private.administers(business_id));
