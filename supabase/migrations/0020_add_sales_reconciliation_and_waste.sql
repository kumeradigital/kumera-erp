create table public.cash_session_reconciliations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null unique references public.cash_sessions(id) on delete cascade,
  actual_cash_sales bigint not null check (actual_cash_sales >= 0),
  actual_debit_sales bigint not null check (actual_debit_sales >= 0),
  actual_credit_sales bigint not null check (actual_credit_sales >= 0),
  actual_transfer_sales bigint not null check (actual_transfer_sales >= 0),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cash_session_product_waste (
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

create index cash_session_product_waste_session_idx
  on public.cash_session_product_waste (cash_session_id, created_at);

alter table public.cash_session_reconciliations enable row level security;
alter table public.cash_session_product_waste enable row level security;

create policy "cash reconciliation access"
  on public.cash_session_reconciliations for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

create policy "cash session waste access"
  on public.cash_session_product_waste for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

create or replace function public.close_cash_session_with_details(
  p_session uuid,
  p_counted_cash bigint,
  p_note text,
  p_actual_cash bigint,
  p_actual_debit bigint,
  p_actual_credit bigint,
  p_actual_transfer bigint,
  p_reason text,
  p_waste jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_item jsonb;
  v_product record;
  v_name text;
  v_unit text;
  v_quantity numeric(12,3);
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open'
  for update;
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if p_counted_cash < 0 or p_actual_cash < 0 or p_actual_debit < 0
     or p_actual_credit < 0 or p_actual_transfer < 0 then
    raise exception 'Los montos no pueden ser negativos';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Debes indicar el origen de los totales del cierre';
  end if;
  if jsonb_typeof(coalesce(p_waste, '[]'::jsonb)) <> 'array' then
    raise exception 'Detalle de merma inválido';
  end if;

  insert into public.cash_session_reconciliations(
    business_id, cash_session_id, actual_cash_sales, actual_debit_sales,
    actual_credit_sales, actual_transfer_sales, reason, created_by
  ) values (
    v_business, p_session, p_actual_cash, p_actual_debit,
    p_actual_credit, p_actual_transfer, trim(p_reason), auth.uid()
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_waste, '[]'::jsonb)) loop
    v_quantity := (v_item->>'quantity')::numeric;
    if v_quantity <= 0 then raise exception 'Cantidad de merma inválida'; end if;
    if nullif(v_item->>'product_id', '') is not null then
      select id, name, sale_unit into v_product
      from public.products
      where id = (v_item->>'product_id')::uuid and business_id = v_business;
      if v_product.id is null then raise exception 'Producto de merma inválido'; end if;
      v_name := v_product.name;
      v_unit := v_product.sale_unit;
    else
      v_name := trim(v_item->>'product_name');
      v_unit := v_item->>'sale_unit';
    end if;
    if nullif(v_name, '') is null or v_unit not in ('unit', 'kg') then
      raise exception 'Detalle de merma incompleto';
    end if;
    if v_unit = 'unit' and v_quantity <> trunc(v_quantity) then
      raise exception 'La merma por unidad debe ser entera';
    end if;
    insert into public.cash_session_product_waste(
      business_id, cash_session_id, product_id, product_name, quantity,
      sale_unit, note, created_by
    ) values (
      v_business, p_session, nullif(v_item->>'product_id', '')::uuid,
      v_name, v_quantity, v_unit, nullif(trim(v_item->>'note'), ''), auth.uid()
    );
  end loop;

  update public.cash_sessions set
    status = 'closed', counted_cash = p_counted_cash,
    closing_note = nullif(trim(p_note), ''), closed_by = auth.uid(),
    closed_at = now()
  where id = p_session;
end
$$;

revoke all on function public.close_cash_session_with_details(
  uuid, bigint, text, bigint, bigint, bigint, bigint, text, jsonb
) from public, anon;
grant execute on function public.close_cash_session_with_details(
  uuid, bigint, text, bigint, bigint, bigint, bigint, text, jsonb
) to authenticated;

-- El 16-08-2026 fue la primera jornada real de KUMERA. Elimina únicamente
-- jornadas de prueba anteriores, respetando dependencias sin tocar catálogos.
delete from public.sale_items where sale_id in (
  select s.id from public.sales s join public.cash_sessions cs on cs.id = s.cash_session_id
  where (cs.opened_at at time zone 'America/Santiago')::date < date '2026-08-16'
);
delete from public.cash_session_adjustments where cash_session_id in (
  select id from public.cash_sessions
  where (opened_at at time zone 'America/Santiago')::date < date '2026-08-16'
);
delete from public.sales where cash_session_id in (
  select id from public.cash_sessions
  where (opened_at at time zone 'America/Santiago')::date < date '2026-08-16'
);
delete from public.cash_sessions
where (opened_at at time zone 'America/Santiago')::date < date '2026-08-16';

-- Conciliación documentada del primer día real. El efectivo real vendido es
-- $38.400: el conteo físico de $49.400 incluye los $11.000 de apertura.
insert into public.cash_session_reconciliations(
  business_id, cash_session_id, actual_cash_sales, actual_debit_sales,
  actual_credit_sales, actual_transfer_sales, reason, created_by
)
select cs.business_id, cs.id, 38400, 122513, 31193, 31680,
       'Conciliación del primer día con efectivo físico y reportes de Transbank/transferencias',
       cs.opened_by
from public.cash_sessions cs
where (cs.opened_at at time zone 'America/Santiago')::date = date '2026-08-16'
order by cs.opened_at desc limit 1
on conflict (cash_session_id) do update set
  actual_cash_sales = excluded.actual_cash_sales,
  actual_debit_sales = excluded.actual_debit_sales,
  actual_credit_sales = excluded.actual_credit_sales,
  actual_transfer_sales = excluded.actual_transfer_sales,
  reason = excluded.reason,
  updated_at = now();

update public.cash_sessions set counted_cash = 49400
where id = (
  select id from public.cash_sessions
  where (opened_at at time zone 'America/Santiago')::date = date '2026-08-16'
  order by opened_at desc limit 1
);

insert into public.cash_session_product_waste(
  business_id, cash_session_id, product_name, quantity, sale_unit, note, created_by
)
select cs.business_id, cs.id, 'Pan fresco (sin desglose)', 8, 'kg',
       'Merma informada al cierre del primer día', cs.opened_by
from public.cash_sessions cs
where (cs.opened_at at time zone 'America/Santiago')::date = date '2026-08-16'
order by cs.opened_at desc limit 1;
