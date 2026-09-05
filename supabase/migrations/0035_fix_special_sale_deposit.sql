create or replace function public.register_special_sale(
  p_session uuid,
  p_scheduled_for date,
  p_customer_name text,
  p_note text,
  p_items jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_sale uuid;
  v_total bigint := 0;
  v_net bigint;
  v_item jsonb;
  v_product record;
  v_availability public.cash_session_product_availability%rowtype;
  v_quantity numeric(12,3);
  v_unit_price bigint;
  v_line_total bigint;
  v_is_today boolean;
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open';
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if p_scheduled_for is null then raise exception 'Indica la fecha de entrega'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta especial está vacía';
  end if;

  v_is_today := p_scheduled_for = (now() at time zone 'America/Santiago')::date;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::bigint;
    if v_quantity <= 0 or v_unit_price <= 0 then
      raise exception 'Producto o precio inválido';
    end if;
    select id, name, price, sale_unit, track_daily_availability into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and business_id = v_business and active and deleted_at is null;
    if v_product.id is null then raise exception 'Producto no disponible'; end if;
    if v_product.sale_unit = 'unit' and v_quantity <> trunc(v_quantity) then
      raise exception 'La cantidad por unidad debe ser entera';
    end if;
    if v_is_today and v_product.track_daily_availability then
      select * into v_availability
      from public.cash_session_product_availability
      where cash_session_id = p_session and product_id = v_product.id
      for update;
      if v_availability.id is null or v_availability.available_quantity < v_quantity then
        raise exception 'No hay suficiente disponibilidad de %', v_product.name;
      end if;
    end if;
    v_total := v_total + round(v_unit_price * v_quantity);
  end loop;

  v_net := round(v_total / 1.19);
  insert into public.sales(
    business_id, cash_session_id, payment_method, subtotal, tax_amount,
    total, created_by, sale_kind, scheduled_for, customer_name, sale_note,
    expected_deposit_amount
  ) values (
    v_business, p_session, 'unclassified', v_net, v_total-v_net,
    v_total, auth.uid(), 'special_order', p_scheduled_for,
    nullif(trim(p_customer_name), ''), nullif(trim(p_note), ''), v_total
  ) returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::bigint;
    select id, name, price, sale_unit, track_daily_availability into v_product
    from public.products where id = (v_item->>'product_id')::uuid;
    v_line_total := round(v_unit_price * v_quantity);
    insert into public.sale_items(
      sale_id, product_id, product_name, quantity, sale_unit, unit_price, line_total
    ) values (
      v_sale, v_product.id, v_product.name, v_quantity, v_product.sale_unit,
      v_unit_price, v_line_total
    );
    if v_is_today and v_product.track_daily_availability then
      update public.cash_session_product_availability
      set available_quantity = available_quantity - v_quantity::integer,
          sold_quantity = sold_quantity + v_quantity::integer,
          updated_at = now()
      where cash_session_id = p_session and product_id = v_product.id;
      insert into public.product_availability_movements(
        business_id, cash_session_id, product_id, sale_id, movement_type,
        quantity_change, reason, created_by
      ) values (
        v_business, p_session, v_product.id, v_sale, 'sale',
        -v_quantity::integer, 'Venta especial con entrega hoy', auth.uid()
      );
    end if;
  end loop;
  return v_sale;
end
$$;

revoke all on function public.register_special_sale(uuid, date, text, text, jsonb)
  from public, anon;
grant execute on function public.register_special_sale(uuid, date, text, text, jsonb)
  to authenticated;
