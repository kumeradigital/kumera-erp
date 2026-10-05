do $$
declare
  v_session public.cash_sessions%rowtype;
  v_fee_percentage numeric := 0;
  v_fee_fixed bigint := 0;
  v_fee_vat_rate numeric := 0;
  v_fee_net bigint := 0;
  v_fee_tax bigint := 0;
begin
  select cs.* into v_session
  from public.cash_sessions cs
  join public.businesses b on b.id = cs.business_id
  where (cs.opened_at at time zone b.timezone)::date = date '2026-10-04'
    and cs.auto_closed = true
  order by cs.opened_at desc
  limit 1;

  if v_session.id is null then
    raise exception 'No se encontró el cierre automático del 04-10-2026';
  end if;

  if exists (
    select 1 from public.cash_session_reconciliations
    where cash_session_id = v_session.id
  ) then
    raise exception 'La jornada del 04-10-2026 ya está conciliada';
  end if;

  select card_fee_percentage, card_fee_fixed_amount, card_fee_vat_rate
  into v_fee_percentage, v_fee_fixed, v_fee_vat_rate
  from public.cost_settings
  where business_id = v_session.business_id;

  v_fee_net := round(355049 * v_fee_percentage / 100.0 + 74 * v_fee_fixed);
  v_fee_tax := round(v_fee_net * v_fee_vat_rate / 100.0);

  insert into public.cash_session_reconciliations(
    business_id, cash_session_id,
    actual_cash_sales, actual_debit_sales, actual_credit_sales,
    actual_transfer_sales,
    actual_cash_transactions, actual_debit_transactions,
    actual_credit_transactions, actual_transfer_transactions,
    commission_net_amount, commission_tax_amount, reason, created_by
  ) values (
    v_session.business_id, v_session.id,
    40980, 262933, 92116, 0,
    3, 54, 20, 0,
    v_fee_net, v_fee_tax,
    'Corrección completa del cierre automático. Totales de tarjetas y efectivo boleteado según resumen Mercado Pago Point; efectivo real según conteo final informado.',
    v_session.opened_by
  );

  update public.cash_sessions
  set counted_cash = 59850,
      documented_cash_sales = 2678,
      documented_cash_transactions = 3,
      closing_note = 'Cierre automático completado con conteo real y resumen Mercado Pago Point.',
      reconciled_at = now(),
      reconciled_by = v_session.opened_by
  where id = v_session.id;
end
$$;
