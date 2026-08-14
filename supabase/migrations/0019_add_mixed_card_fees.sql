alter table public.cost_settings
  add column card_fee_model text not null default 'none'
    check (card_fee_model in ('none', 'percentage', 'mixed')),
  add column card_fee_percentage numeric(7,4) not null default 0
    check (card_fee_percentage >= 0),
  add column card_fee_fixed_amount bigint not null default 0
    check (card_fee_fixed_amount >= 0),
  add column card_fee_vat_rate numeric(6,3) not null default 19
    check (card_fee_vat_rate >= 0 and card_fee_vat_rate <= 100),
  add column card_settlement_days integer not null default 1
    check (card_settlement_days between 0 and 30),
  add column expected_ticket_amount bigint not null default 6000
    check (expected_ticket_amount > 0);

-- Configuración comercial vigente de KUMERA: modelo mixto, abono en un día.
update public.cost_settings
set card_fee_model = 'mixed',
    card_fee_percentage = 0.79,
    card_fee_fixed_amount = 65,
    card_fee_vat_rate = 19,
    card_settlement_days = 1,
    updated_at = now();

alter table public.sales
  add column commission_model text not null default 'none'
    check (commission_model in ('none', 'percentage', 'mixed')),
  add column commission_percentage numeric(7,4) not null default 0
    check (commission_percentage >= 0),
  add column commission_fixed_amount bigint not null default 0
    check (commission_fixed_amount >= 0),
  add column commission_net_amount bigint not null default 0
    check (commission_net_amount >= 0),
  add column commission_tax_rate numeric(6,3) not null default 0
    check (commission_tax_rate >= 0 and commission_tax_rate <= 100),
  add column commission_tax_amount bigint not null default 0
    check (commission_tax_amount >= 0),
  add column expected_deposit_amount bigint,
  add column settlement_days integer not null default 0
    check (settlement_days between 0 and 30);

update public.sales set expected_deposit_amount = total;
alter table public.sales
  alter column expected_deposit_amount set not null,
  add check (expected_deposit_amount = total - commission_net_amount - commission_tax_amount),
  add check (expected_deposit_amount >= 0);

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
  v_fee_model text := 'none';
  v_fee_percentage numeric := 0;
  v_fee_fixed bigint := 0;
  v_fee_vat_rate numeric := 0;
  v_settlement_days integer := 0;
  v_fee_net bigint := 0;
  v_fee_tax bigint := 0;
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

  if p_payment in ('debit', 'credit') then
    select card_fee_model, card_fee_percentage, card_fee_fixed_amount,
           card_fee_vat_rate, card_settlement_days
    into v_fee_model, v_fee_percentage, v_fee_fixed, v_fee_vat_rate,
         v_settlement_days
    from public.cost_settings where business_id = v_business;
    if v_fee_model = 'percentage' then
      v_fee_net := round(v_total * v_fee_percentage / 100.0);
    elsif v_fee_model = 'mixed' then
      v_fee_net := round(v_total * v_fee_percentage / 100.0 + v_fee_fixed);
    end if;
    v_fee_tax := round(v_fee_net * v_fee_vat_rate / 100.0);
    if v_fee_net + v_fee_tax >= v_total then
      raise exception 'La comisión configurada supera el total de la venta';
    end if;
  end if;

  insert into public.sales(
    business_id, cash_session_id, payment_method, subtotal, tax_amount,
    total, cash_received, change_amount, created_by,
    commission_model, commission_percentage, commission_fixed_amount,
    commission_net_amount, commission_tax_rate, commission_tax_amount,
    expected_deposit_amount, settlement_days
  ) values (
    v_business, p_session, p_payment, v_net, v_total-v_net, v_total,
    case when p_payment='cash' then p_cash_received end,
    case when p_payment='cash' then p_cash_received-v_total end,
    auth.uid(), v_fee_model, v_fee_percentage, v_fee_fixed, v_fee_net,
    v_fee_vat_rate, v_fee_tax, v_total-v_fee_net-v_fee_tax,
    v_settlement_days
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
