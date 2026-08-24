alter table public.cash_session_withdrawals
  add column category text not null default 'Otros',
  add column is_business_expense boolean not null default true;

create table public.cash_session_product_carryover (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null check (char_length(trim(product_name)) between 1 and 100),
  quantity numeric(12,3) not null check (quantity > 0),
  sale_unit text not null check (sale_unit in ('unit', 'kg')),
  note text check (note is null or char_length(trim(note)) between 1 and 300),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index cash_session_product_carryover_session_idx
  on public.cash_session_product_carryover (cash_session_id, created_at);

alter table public.cash_session_product_carryover enable row level security;

create policy "cash session carryover access"
  on public.cash_session_product_carryover for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id) and created_by = auth.uid());

grant select, insert, update, delete on public.cash_session_product_carryover to authenticated;
grant select, insert, update on public.cash_session_withdrawals to authenticated;
