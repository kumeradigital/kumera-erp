create type public.sale_unit as enum ('unit', 'kg');

alter table public.products
  add column sale_unit public.sale_unit not null default 'unit';

alter table public.sale_items
  drop constraint sale_items_check,
  drop constraint sale_items_quantity_check,
  alter column quantity type numeric(12,3) using quantity::numeric,
  add column sale_unit public.sale_unit not null default 'unit',
  add constraint sale_items_quantity_check check (quantity > 0),
  add constraint sale_items_line_total_check check (line_total = round(quantity * unit_price));

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
    select id, name, price, sale_unit into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and business_id = v_business and active;
    if v_product.id is null then raise exception 'Producto no disponible'; end if;
    if v_product.sale_unit = 'unit' and v_qty <> trunc(v_qty) then
      raise exception 'La cantidad por unidad debe ser entera';
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
    select id, name, price, sale_unit into v_product
    from public.products where id=(v_item->>'product_id')::uuid;
    v_line_total := round(v_product.price * v_qty);
    insert into public.sale_items(
      sale_id, product_id, product_name, quantity, sale_unit, unit_price, line_total
    ) values (
      v_sale, v_product.id, v_product.name, v_qty, v_product.sale_unit,
      v_product.price, v_line_total
    );
  end loop;
  return v_sale;
end
$$;
