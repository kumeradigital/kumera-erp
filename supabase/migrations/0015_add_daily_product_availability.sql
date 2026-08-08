alter table public.products
  add column track_daily_availability boolean not null default false;

create type public.availability_movement_type as enum (
  'production',
  'waste',
  'consumption',
  'correction',
  'sale'
);

create table public.cash_session_product_availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  opening_quantity integer not null default 0 check (opening_quantity >= 0),
  available_quantity integer not null default 0 check (available_quantity >= 0),
  produced_quantity integer not null default 0 check (produced_quantity >= 0),
  sold_quantity integer not null default 0 check (sold_quantity >= 0),
  adjusted_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cash_session_id, product_id)
);

create index cash_session_product_availability_session_idx
  on public.cash_session_product_availability (cash_session_id, product_id);

create table public.product_availability_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  sale_id uuid references public.sales(id),
  movement_type public.availability_movement_type not null,
  quantity_change integer not null check (quantity_change <> 0),
  reason text check (reason is null or char_length(trim(reason)) between 1 and 200),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index product_availability_movements_session_idx
  on public.product_availability_movements (cash_session_id, created_at desc);

alter table public.cash_session_product_availability enable row level security;
alter table public.product_availability_movements enable row level security;

create policy "daily availability access"
  on public.cash_session_product_availability for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

create policy "availability movement access"
  on public.product_availability_movements for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

create or replace function public.open_cash_session_with_availability(
  p_opening_cash bigint,
  p_note text,
  p_quantities jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_session uuid;
  v_product record;
  v_quantity integer;
begin
  select business_id into v_business
  from public.business_admins
  where user_id = auth.uid() and active
  limit 1;

  if v_business is null or not private.administers(v_business) then
    raise exception 'Sin autorización';
  end if;
  if p_opening_cash < 0 then raise exception 'Monto inicial inválido'; end if;
  if jsonb_typeof(coalesce(p_quantities, '[]'::jsonb)) <> 'array' then
    raise exception 'Disponibilidad inicial inválida';
  end if;

  insert into public.cash_sessions(
    business_id, opened_by, opening_cash, opening_note
  ) values (
    v_business, auth.uid(), p_opening_cash, nullif(trim(p_note), '')
  ) returning id into v_session;

  for v_product in
    select id
    from public.products
    where business_id = v_business
      and active
      and deleted_at is null
      and sale_unit = 'unit'
      and track_daily_availability
  loop
    select coalesce((item->>'quantity')::integer, 0)
      into v_quantity
    from jsonb_array_elements(coalesce(p_quantities, '[]'::jsonb)) item
    where item->>'product_id' = v_product.id::text
    limit 1;
    v_quantity := coalesce(v_quantity, 0);
    if v_quantity < 0 then raise exception 'Cantidad inicial inválida'; end if;

    insert into public.cash_session_product_availability(
      business_id, cash_session_id, product_id,
      opening_quantity, available_quantity
    ) values (
      v_business, v_session, v_product.id, v_quantity, v_quantity
    );

    if v_quantity > 0 then
      insert into public.product_availability_movements(
        business_id, cash_session_id, product_id, movement_type,
        quantity_change, reason, created_by
      ) values (
        v_business, v_session, v_product.id, 'production',
        v_quantity, 'Disponibilidad al abrir la caja', auth.uid()
      );
    end if;
  end loop;

  return v_session;
end
$$;

revoke all on function public.open_cash_session_with_availability(bigint, text, jsonb)
  from public, anon;
grant execute on function public.open_cash_session_with_availability(bigint, text, jsonb)
  to authenticated;

create or replace function public.adjust_product_availability(
  p_session uuid,
  p_product uuid,
  p_kind public.availability_movement_type,
  p_delta integer,
  p_reason text
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_row public.cash_session_product_availability%rowtype;
  v_next integer;
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open';
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if p_kind not in ('production', 'waste', 'consumption', 'correction') then
    raise exception 'Tipo de ajuste inválido';
  end if;
  if p_delta = 0 then raise exception 'La cantidad no puede ser cero'; end if;
  if p_kind = 'production' and p_delta < 0 then
    raise exception 'La nueva producción debe sumar disponibilidad';
  end if;
  if p_kind in ('waste', 'consumption') and p_delta > 0 then
    raise exception 'La merma o consumo debe restar disponibilidad';
  end if;
  if p_kind <> 'production' and nullif(trim(p_reason), '') is null then
    raise exception 'Debes indicar un motivo';
  end if;

  select * into v_row
  from public.cash_session_product_availability
  where cash_session_id = p_session and product_id = p_product
  for update;
  if v_row.id is null then
    raise exception 'Este producto no tiene control de disponibilidad en la jornada';
  end if;

  v_next := v_row.available_quantity + p_delta;
  if v_next < 0 then raise exception 'No hay suficiente disponibilidad'; end if;

  update public.cash_session_product_availability
  set available_quantity = v_next,
      produced_quantity = produced_quantity +
        case when p_kind = 'production' then p_delta else 0 end,
      adjusted_quantity = adjusted_quantity +
        case when p_kind <> 'production' then p_delta else 0 end,
      updated_at = now()
  where id = v_row.id;

  insert into public.product_availability_movements(
    business_id, cash_session_id, product_id, movement_type,
    quantity_change, reason, created_by
  ) values (
    v_business, p_session, p_product, p_kind, p_delta,
    coalesce(nullif(trim(p_reason), ''), 'Nueva producción'), auth.uid()
  );

  return v_next;
end
$$;

revoke all on function public.adjust_product_availability(
  uuid, uuid, public.availability_movement_type, integer, text
) from public, anon;
grant execute on function public.adjust_product_availability(
  uuid, uuid, public.availability_movement_type, integer, text
) to authenticated;

create or replace function public.register_sale(
  p_session uuid,
  p_payment public.payment_method,
  p_cash_received bigint,
  p_items jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_sale uuid;
  v_total bigint;
  v_net bigint;
  v_item jsonb;
  v_product record;
  v_availability public.cash_session_product_availability%rowtype;
  v_qty numeric(12,3);
  v_line_total bigint;
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open';
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'La venta está vacía'; end if;

  v_total := 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    select id, name, price, sale_unit, track_daily_availability into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and business_id = v_business and active and deleted_at is null;
    if v_product.id is null then raise exception 'Producto no disponible'; end if;
    if v_product.sale_unit = 'unit' and v_qty <> trunc(v_qty) then
      raise exception 'La cantidad por unidad debe ser entera';
    end if;
    if v_product.track_daily_availability then
      select * into v_availability
      from public.cash_session_product_availability
      where cash_session_id = p_session and product_id = v_product.id
      for update;
      if v_availability.id is null then
        raise exception '% no tiene disponibilidad inicializada', v_product.name;
      end if;
      if v_availability.available_quantity < v_qty then
        raise exception 'Solo quedan % unidades de %',
          v_availability.available_quantity, v_product.name;
      end if;
    end if;
    v_line_total := round(v_product.price * v_qty);
    v_total := v_total + v_line_total;
  end loop;

  if p_payment = 'cash' and coalesce(p_cash_received, 0) < v_total then
    raise exception 'Efectivo insuficiente';
  end if;
  v_net := round(v_total / 1.19);
  insert into public.sales(
    business_id, cash_session_id, payment_method, subtotal, tax_amount,
    total, cash_received, change_amount, created_by
  ) values (
    v_business, p_session, p_payment, v_net, v_total-v_net, v_total,
    case when p_payment='cash' then p_cash_received end,
    case when p_payment='cash' then p_cash_received-v_total end,
    auth.uid()
  ) returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    select id, name, price, sale_unit, track_daily_availability into v_product
    from public.products where id=(v_item->>'product_id')::uuid;
    v_line_total := round(v_product.price * v_qty);
    insert into public.sale_items(
      sale_id, product_id, product_name, quantity, sale_unit, unit_price, line_total
    ) values (
      v_sale, v_product.id, v_product.name, v_qty, v_product.sale_unit,
      v_product.price, v_line_total
    );
    if v_product.track_daily_availability then
      update public.cash_session_product_availability
      set available_quantity = available_quantity - v_qty::integer,
          sold_quantity = sold_quantity + v_qty::integer,
          updated_at = now()
      where cash_session_id = p_session and product_id = v_product.id;
      insert into public.product_availability_movements(
        business_id, cash_session_id, product_id, sale_id, movement_type,
        quantity_change, reason, created_by
      ) values (
        v_business, p_session, v_product.id, v_sale, 'sale',
        -v_qty::integer, 'Venta registrada', auth.uid()
      );
    end if;
  end loop;
  return v_sale;
end
$$;

revoke all on function public.register_sale(uuid, public.payment_method, bigint, jsonb)
  from public, anon;
grant execute on function public.register_sale(uuid, public.payment_method, bigint, jsonb)
  to authenticated;
