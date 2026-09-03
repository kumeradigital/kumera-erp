alter table public.products
  add column pedidosya_price bigint check (pedidosya_price is null or pedidosya_price > 0);

create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id),
  platform text not null check (platform in ('pedidos_ya')),
  external_order_number text,
  gross_amount bigint not null check (gross_amount > 0),
  estimated_net_amount bigint not null check (
    estimated_net_amount >= 0 and estimated_net_amount <= gross_amount
  ),
  estimated_commission_amount bigint generated always as
    (gross_amount - estimated_net_amount) stored,
  status text not null default 'completed' check (status in ('completed', 'voided')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text
);

create unique index delivery_orders_platform_reference_idx
  on public.delivery_orders (business_id, platform, external_order_number)
  where external_order_number is not null and status = 'completed';
create index delivery_orders_business_created_idx
  on public.delivery_orders (business_id, created_at desc);
create index delivery_orders_session_idx
  on public.delivery_orders (cash_session_id, created_at desc);

create table public.delivery_order_items (
  id uuid primary key default gen_random_uuid(),
  delivery_order_id uuid not null references public.delivery_orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  category_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  sale_unit text not null check (sale_unit in ('unit', 'kg')),
  unit_price bigint not null check (unit_price > 0),
  line_total bigint not null check (line_total > 0)
);

create index delivery_order_items_order_idx
  on public.delivery_order_items (delivery_order_id);

alter table public.delivery_orders enable row level security;
alter table public.delivery_order_items enable row level security;

create policy "delivery orders access"
  on public.delivery_orders for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id) and created_by = auth.uid());

create policy "delivery order items access"
  on public.delivery_order_items for all to authenticated
  using (
    exists (
      select 1 from public.delivery_orders orders
      where orders.id = delivery_order_id
        and private.administers(orders.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.delivery_orders orders
      where orders.id = delivery_order_id
        and private.administers(orders.business_id)
    )
  );

grant select, insert, update on public.delivery_orders to authenticated;
grant select, insert on public.delivery_order_items to authenticated;

-- Las empanadas actuales comienzan a utilizar el control diario ya existente.
update public.products products
set track_daily_availability = true,
    updated_at = now()
from public.product_categories categories
where categories.id = products.category_id
  and lower(categories.name) like '%empanada%'
  and products.sale_unit = 'unit'
  and not products.is_sales_family
  and products.deleted_at is null;

-- Si la migración se aplica durante una jornada, inicializa esas variedades en cero.
insert into public.cash_session_product_availability (
  business_id, cash_session_id, product_id, opening_quantity, available_quantity
)
select sessions.business_id, sessions.id, products.id, 0, 0
from public.cash_sessions sessions
join public.products products on products.business_id = sessions.business_id
join public.product_categories categories on categories.id = products.category_id
where sessions.status = 'open'
  and products.track_daily_availability
  and products.sale_unit = 'unit'
  and lower(categories.name) like '%empanada%'
  and products.deleted_at is null
on conflict (cash_session_id, product_id) do nothing;

create or replace function public.register_unit_production(
  p_session uuid,
  p_items jsonb,
  p_note text default ''
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_item jsonb;
  v_product record;
  v_quantity integer;
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open';
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'No hay producción para registrar';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity <= 0 then raise exception 'Cantidad producida inválida'; end if;
    select id, name, track_daily_availability into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and business_id = v_business
      and active and deleted_at is null
      and sale_unit = 'unit'
    for update;
    if v_product.id is null then raise exception 'Producto no disponible'; end if;

    if not v_product.track_daily_availability then
      update public.products
      set track_daily_availability = true, updated_at = now()
      where id = v_product.id;
    end if;

    insert into public.cash_session_product_availability (
      business_id, cash_session_id, product_id,
      opening_quantity, available_quantity, produced_quantity
    ) values (
      v_business, p_session, v_product.id, 0, v_quantity, v_quantity
    )
    on conflict (cash_session_id, product_id) do update
    set available_quantity = cash_session_product_availability.available_quantity + excluded.available_quantity,
        produced_quantity = cash_session_product_availability.produced_quantity + excluded.produced_quantity,
        updated_at = now();

    insert into public.product_availability_movements (
      business_id, cash_session_id, product_id, movement_type,
      quantity_change, reason, created_by
    ) values (
      v_business, p_session, v_product.id, 'production', v_quantity,
      coalesce(nullif(trim(p_note), ''), 'Producción de empanadas'), auth.uid()
    );
  end loop;
end
$$;

revoke all on function public.register_unit_production(uuid, jsonb, text)
  from public, anon;
grant execute on function public.register_unit_production(uuid, jsonb, text)
  to authenticated;

create or replace function public.register_delivery_order(
  p_session uuid,
  p_platform text,
  p_external_order_number text,
  p_estimated_net_amount bigint,
  p_items jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_order uuid;
  v_gross bigint := 0;
  v_item jsonb;
  v_product record;
  v_quantity numeric(12,3);
  v_unit_price bigint;
  v_line_total bigint;
  v_availability public.cash_session_product_availability%rowtype;
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open';
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if p_platform <> 'pedidos_ya' then raise exception 'Plataforma inválida'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'El pedido está vacío';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::bigint;
    if v_quantity <= 0 or v_unit_price <= 0 then raise exception 'Producto inválido'; end if;
    select products.id, products.name, products.sale_unit,
           products.track_daily_availability, categories.name as category_name
      into v_product
    from public.products products
    left join public.product_categories categories on categories.id = products.category_id
    where products.id = (v_item->>'product_id')::uuid
      and products.business_id = v_business
      and products.active and products.deleted_at is null;
    if v_product.id is null then raise exception 'Producto no disponible'; end if;
    if v_product.sale_unit = 'unit' and v_quantity <> trunc(v_quantity) then
      raise exception 'La cantidad por unidad debe ser entera';
    end if;
    if v_product.track_daily_availability then
      select * into v_availability
      from public.cash_session_product_availability
      where cash_session_id = p_session and product_id = v_product.id
      for update;
      if v_availability.id is null or v_availability.available_quantity < v_quantity then
        raise exception 'No hay suficiente disponibilidad de %', v_product.name;
      end if;
    end if;
    v_gross := v_gross + round(v_unit_price * v_quantity);
  end loop;

  if p_estimated_net_amount < 0 or p_estimated_net_amount > v_gross then
    raise exception 'El ingreso estimado no puede superar la venta';
  end if;

  insert into public.delivery_orders (
    business_id, cash_session_id, platform, external_order_number,
    gross_amount, estimated_net_amount, created_by
  ) values (
    v_business, p_session, p_platform,
    nullif(trim(p_external_order_number), ''), v_gross,
    p_estimated_net_amount, auth.uid()
  ) returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::bigint;
    select products.id, products.name, products.sale_unit,
           products.track_daily_availability, categories.name as category_name
      into v_product
    from public.products products
    left join public.product_categories categories on categories.id = products.category_id
    where products.id = (v_item->>'product_id')::uuid;
    v_line_total := round(v_unit_price * v_quantity);
    insert into public.delivery_order_items (
      delivery_order_id, product_id, product_name, category_name,
      quantity, sale_unit, unit_price, line_total
    ) values (
      v_order, v_product.id, v_product.name,
      coalesce(v_product.category_name, 'Sin categoría'), v_quantity,
      v_product.sale_unit, v_unit_price, v_line_total
    );
    if v_product.track_daily_availability then
      update public.cash_session_product_availability
      set available_quantity = available_quantity - v_quantity::integer,
          sold_quantity = sold_quantity + v_quantity::integer,
          updated_at = now()
      where cash_session_id = p_session and product_id = v_product.id;
      insert into public.product_availability_movements (
        business_id, cash_session_id, product_id, movement_type,
        quantity_change, reason, created_by
      ) values (
        v_business, p_session, v_product.id, 'sale', -v_quantity::integer,
        'Venta PedidosYa', auth.uid()
      );
    end if;
  end loop;
  return v_order;
end
$$;

revoke all on function public.register_delivery_order(uuid, text, text, bigint, jsonb)
  from public, anon;
grant execute on function public.register_delivery_order(uuid, text, text, bigint, jsonb)
  to authenticated;
