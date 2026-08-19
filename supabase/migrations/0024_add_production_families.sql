alter table public.products
  add column is_sales_family boolean not null default false,
  add column family_product_id uuid references public.products(id) on delete set null,
  add constraint product_family_not_self check (family_product_id is distinct from id);

create index products_family_product_idx
  on public.products (family_product_id) where family_product_id is not null;

create table public.cash_session_production_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  family_product_id uuid not null references public.products(id),
  component_product_id uuid not null references public.products(id),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index production_batches_session_idx
  on public.cash_session_production_batches (cash_session_id, created_at desc);

alter table public.cash_session_production_batches enable row level security;

create policy "production batch select"
  on public.cash_session_production_batches for select to authenticated
  using (private.administers(business_id));

create policy "production batch insert"
  on public.cash_session_production_batches for insert to authenticated
  with check (
    private.administers(business_id)
    and created_by = auth.uid()
    and exists (
      select 1 from public.cash_sessions session
      where session.id = cash_session_id
        and session.business_id = business_id
        and session.status = 'open'
    )
    and exists (
      select 1 from public.products component
      where component.id = component_product_id
        and component.business_id = business_id
        and component.family_product_id = family_product_id
    )
  );

grant select, insert on public.cash_session_production_batches to authenticated;
