create type public.operation_type as enum (
  'purchase', 'fixed_cost', 'expense', 'other_income',
  'owner_contribution', 'owner_withdrawal'
);

alter table public.opening_ledgers
  add column status text not null default 'open' check (status in ('open', 'closed')),
  add column closed_at timestamptz,
  add column closed_by uuid references public.profiles(id),
  add column closing_note text,
  add column snapshot_initial_capital bigint,
  add column snapshot_other_income bigint,
  add column snapshot_expenses bigint,
  add column snapshot_assets bigint,
  add column snapshot_deposits bigint,
  add column snapshot_balance bigint,
  add column recoverable_investment bigint check (recoverable_investment is null or recoverable_investment >= 0);

create table public.operational_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  transaction_date date not null,
  type public.operation_type not null,
  description text not null check (char_length(trim(description)) between 1 and 160),
  category text not null default 'Otros',
  payment_method public.payment_method,
  gross_amount bigint not null check (gross_amount > 0),
  net_amount bigint not null check (net_amount > 0),
  tax_amount bigint not null check (tax_amount >= 0),
  tax_rate numeric(6,3) not null default 19,
  ingredient_id uuid references public.ingredients(id),
  purchase_quantity numeric(14,3),
  purchase_unit public.cost_unit,
  supplier text,
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (gross_amount = net_amount + tax_amount),
  check ((ingredient_id is null and purchase_quantity is null and purchase_unit is null)
    or (ingredient_id is not null and purchase_quantity > 0 and purchase_unit is not null))
);

create index operational_transactions_business_date_idx
  on public.operational_transactions (business_id, transaction_date desc);
alter table public.operational_transactions enable row level security;
create policy "operational transaction access"
  on public.operational_transactions for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

create or replace function private.prevent_closed_opening_changes()
returns trigger language plpgsql set search_path = public as $$
declare target_ledger uuid;
begin
  if tg_op = 'DELETE' then
    target_ledger := old.ledger_id;
  else
    target_ledger := new.ledger_id;
  end if;
  if exists (select 1 from public.opening_ledgers where id = target_ledger and status = 'closed') then
    raise exception 'La puesta en marcha está cerrada y es de sólo lectura';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger prevent_closed_opening_changes
before insert or update or delete on public.opening_entries
for each row execute function private.prevent_closed_opening_changes();

create or replace function public.close_opening_ledger(
  p_ledger uuid, p_recoverable bigint, p_note text
) returns void language plpgsql security invoker set search_path = public as $$
declare v_business uuid; v_capital bigint; v_income bigint; v_expenses bigint;
  v_assets bigint; v_deposits bigint; v_balance bigint;
begin
  select business_id into v_business from public.opening_ledgers
  where id=p_ledger and status='open' for update;
  if v_business is null then raise exception 'La puesta en marcha ya está cerrada o no existe'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if p_recoverable < 0 then raise exception 'Inversión recuperable inválida'; end if;
  select
    coalesce(sum(total_amount) filter(where type='initial_capital'),0),
    coalesce(sum(total_amount) filter(where type in ('income','refund')),0),
    coalesce(sum(total_amount) filter(where type='expense'),0),
    coalesce(sum(total_amount) filter(where type='asset'),0),
    coalesce(sum(total_amount) filter(where type='deposit'),0)
  into v_capital,v_income,v_expenses,v_assets,v_deposits
  from public.opening_entries where ledger_id=p_ledger and status='active';
  v_balance := v_capital+v_income-v_expenses-v_assets-v_deposits;
  update public.opening_ledgers set status='closed', closed_at=now(), closed_by=auth.uid(),
    closing_note=nullif(trim(p_note),''), snapshot_initial_capital=v_capital,
    snapshot_other_income=v_income, snapshot_expenses=v_expenses, snapshot_assets=v_assets,
    snapshot_deposits=v_deposits, snapshot_balance=v_balance,
    recoverable_investment=p_recoverable where id=p_ledger;
end $$;
revoke all on function public.close_opening_ledger(uuid,bigint,text) from public,anon;
grant execute on function public.close_opening_ledger(uuid,bigint,text) to authenticated;

create or replace function public.record_operational_transaction(
  p_date date,
  p_type public.operation_type,
  p_description text,
  p_category text,
  p_payment_method public.payment_method,
  p_gross_amount bigint,
  p_tax_rate numeric,
  p_ingredient_id uuid default null,
  p_purchase_quantity numeric default null,
  p_purchase_unit public.cost_unit default null,
  p_supplier text default null,
  p_note text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_business uuid;
  v_base_unit public.cost_unit;
  v_base_quantity numeric;
  v_net bigint;
  v_transaction uuid;
begin
  select business_id into v_business
  from public.business_admins
  where user_id = auth.uid() and active = true
  limit 1;
  if v_business is null then raise exception 'Sin negocio administrado'; end if;
  if p_gross_amount <= 0 then raise exception 'Monto inválido'; end if;
  if trim(coalesce(p_description, '')) = '' then raise exception 'Descripción obligatoria'; end if;
  if p_tax_rate not in (0, 19) then raise exception 'Tasa de IVA inválida'; end if;

  v_net := case when p_tax_rate = 0 then p_gross_amount
    else round(p_gross_amount / (1 + p_tax_rate / 100.0)) end;

  if p_ingredient_id is not null then
    if p_type <> 'purchase' then raise exception 'Sólo una compra puede actualizar una materia prima'; end if;
    if p_purchase_quantity is null or p_purchase_quantity <= 0 or p_purchase_unit is null then
      raise exception 'Cantidad y unidad de compra obligatorias';
    end if;
    select base_unit into v_base_unit from public.ingredients
    where id = p_ingredient_id and business_id = v_business and deleted_at is null;
    if v_base_unit is null then raise exception 'Materia prima no válida'; end if;
    v_base_quantity := case
      when v_base_unit = 'g' and p_purchase_unit = 'kg' then p_purchase_quantity * 1000
      when v_base_unit = 'ml' and p_purchase_unit = 'l' then p_purchase_quantity * 1000
      when v_base_unit = p_purchase_unit then p_purchase_quantity
      else null end;
    if v_base_quantity is null then raise exception 'Unidad incompatible con la materia prima'; end if;
  end if;

  insert into public.operational_transactions (
    business_id, transaction_date, type, description, category, payment_method,
    gross_amount, net_amount, tax_amount, tax_rate, ingredient_id,
    purchase_quantity, purchase_unit, supplier, note, created_by
  ) values (
    v_business, p_date, p_type, trim(p_description), coalesce(nullif(trim(p_category), ''), 'Otros'),
    p_payment_method, p_gross_amount, v_net, p_gross_amount-v_net, p_tax_rate,
    p_ingredient_id, p_purchase_quantity, p_purchase_unit, nullif(trim(p_supplier), ''),
    nullif(trim(p_note), ''), auth.uid()
  ) returning id into v_transaction;

  if p_ingredient_id is not null then
    insert into public.ingredient_prices (
      business_id, ingredient_id, purchase_quantity, purchase_unit, base_quantity,
      gross_amount, net_amount, tax_amount, tax_rate, supplier, purchase_date, created_by
    ) values (
      v_business, p_ingredient_id, p_purchase_quantity, p_purchase_unit, v_base_quantity,
      p_gross_amount, v_net, p_gross_amount-v_net, p_tax_rate,
      nullif(trim(p_supplier), ''), p_date, auth.uid()
    );
  end if;
  return v_transaction;
end $$;
revoke all on function public.record_operational_transaction(date,public.operation_type,text,text,public.payment_method,bigint,numeric,uuid,numeric,public.cost_unit,text,text) from public,anon;
grant execute on function public.record_operational_transaction(date,public.operation_type,text,text,public.payment_method,bigint,numeric,uuid,numeric,public.cost_unit,text,text) to authenticated;
