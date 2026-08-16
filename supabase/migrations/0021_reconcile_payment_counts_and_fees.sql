alter table public.cash_session_reconciliations
  add column actual_cash_transactions integer not null default 0 check (actual_cash_transactions >= 0),
  add column actual_debit_transactions integer not null default 0 check (actual_debit_transactions >= 0),
  add column actual_credit_transactions integer not null default 0 check (actual_credit_transactions >= 0),
  add column actual_transfer_transactions integer not null default 0 check (actual_transfer_transactions >= 0),
  add column commission_net_amount bigint not null default 0 check (commission_net_amount >= 0),
  add column commission_tax_amount bigint not null default 0 check (commission_tax_amount >= 0);

update public.cash_session_reconciliations
set actual_cash_transactions = 6,
    actual_debit_transactions = 22,
    actual_credit_transactions = 7,
    actual_transfer_transactions = 2,
    commission_net_amount = 3099,
    commission_tax_amount = 589,
    updated_at = now()
where cash_session_id = (
  select id from public.cash_sessions
  where (opened_at at time zone 'America/Santiago')::date = date '2026-08-16'
  order by opened_at desc limit 1
);

drop function if exists public.close_cash_session_with_details(
  uuid, bigint, text, bigint, bigint, bigint, bigint, text, jsonb
);

create function public.close_cash_session_with_details(
  p_session uuid, p_counted_cash bigint, p_note text,
  p_actual_cash bigint, p_actual_debit bigint, p_actual_credit bigint,
  p_actual_transfer bigint, p_cash_transactions integer,
  p_debit_transactions integer, p_credit_transactions integer,
  p_transfer_transactions integer, p_reason text, p_waste jsonb
) returns void
language plpgsql security invoker set search_path = public
as $$
declare
  v_business uuid; v_item jsonb; v_product record; v_name text; v_unit text;
  v_quantity numeric(12,3); v_percentage numeric := 0; v_fixed bigint := 0;
  v_vat_rate numeric := 0; v_fee_net bigint := 0; v_fee_tax bigint := 0;
begin
  select business_id into v_business from public.cash_sessions
  where id = p_session and status = 'open' for update;
  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if p_counted_cash < 0 or p_actual_cash < 0 or p_actual_debit < 0
     or p_actual_credit < 0 or p_actual_transfer < 0 then
    raise exception 'Los montos no pueden ser negativos';
  end if;
  if p_cash_transactions < 0 or p_debit_transactions < 0
     or p_credit_transactions < 0 or p_transfer_transactions < 0 then
    raise exception 'Las transacciones no pueden ser negativas';
  end if;
  if (p_actual_cash > 0 and p_cash_transactions = 0)
     or (p_actual_debit > 0 and p_debit_transactions = 0)
     or (p_actual_credit > 0 and p_credit_transactions = 0)
     or (p_actual_transfer > 0 and p_transfer_transactions = 0) then
    raise exception 'Indica las transacciones de cada medio con ventas';
  end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Indica el origen de los totales'; end if;
  if jsonb_typeof(coalesce(p_waste, '[]'::jsonb)) <> 'array' then raise exception 'Merma inválida'; end if;

  select card_fee_percentage, card_fee_fixed_amount, card_fee_vat_rate
  into v_percentage, v_fixed, v_vat_rate from public.cost_settings
  where business_id = v_business;
  v_fee_net := round((p_actual_debit + p_actual_credit) * v_percentage / 100.0
    + (p_debit_transactions + p_credit_transactions) * v_fixed);
  v_fee_tax := round(v_fee_net * v_vat_rate / 100.0);

  insert into public.cash_session_reconciliations(
    business_id, cash_session_id, actual_cash_sales, actual_debit_sales,
    actual_credit_sales, actual_transfer_sales, actual_cash_transactions,
    actual_debit_transactions, actual_credit_transactions,
    actual_transfer_transactions, commission_net_amount,
    commission_tax_amount, reason, created_by
  ) values (
    v_business, p_session, p_actual_cash, p_actual_debit, p_actual_credit,
    p_actual_transfer, p_cash_transactions, p_debit_transactions,
    p_credit_transactions, p_transfer_transactions, v_fee_net, v_fee_tax,
    trim(p_reason), auth.uid()
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_waste, '[]'::jsonb)) loop
    v_quantity := (v_item->>'quantity')::numeric;
    if v_quantity <= 0 then raise exception 'Cantidad de merma inválida'; end if;
    if nullif(v_item->>'product_id', '') is not null then
      select id, name, sale_unit into v_product from public.products
      where id = (v_item->>'product_id')::uuid and business_id = v_business;
      if v_product.id is null then raise exception 'Producto de merma inválido'; end if;
      v_name := v_product.name; v_unit := v_product.sale_unit;
    else
      v_name := trim(v_item->>'product_name'); v_unit := v_item->>'sale_unit';
    end if;
    if nullif(v_name, '') is null or v_unit not in ('unit', 'kg') then raise exception 'Merma incompleta'; end if;
    if v_unit = 'unit' and v_quantity <> trunc(v_quantity) then raise exception 'La merma por unidad debe ser entera'; end if;
    insert into public.cash_session_product_waste(
      business_id, cash_session_id, product_id, product_name, quantity,
      sale_unit, note, created_by
    ) values (
      v_business, p_session, nullif(v_item->>'product_id', '')::uuid,
      v_name, v_quantity, v_unit, nullif(trim(v_item->>'note'), ''), auth.uid()
    );
  end loop;

  update public.cash_sessions set status = 'closed', counted_cash = p_counted_cash,
    closing_note = nullif(trim(p_note), ''), closed_by = auth.uid(), closed_at = now()
  where id = p_session;
end
$$;

revoke all on function public.close_cash_session_with_details(
  uuid, bigint, text, bigint, bigint, bigint, bigint,
  integer, integer, integer, integer, text, jsonb
) from public, anon;
grant execute on function public.close_cash_session_with_details(
  uuid, bigint, text, bigint, bigint, bigint, bigint,
  integer, integer, integer, integer, text, jsonb
) to authenticated;
