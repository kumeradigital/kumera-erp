create or replace function public.reconcile_closed_cash_session(
  p_session uuid,
  p_counted_cash bigint,
  p_actual_debit bigint,
  p_actual_credit bigint,
  p_actual_transfer bigint,
  p_debit_transactions integer,
  p_credit_transactions integer,
  p_transfer_transactions integer,
  p_documented_cash bigint,
  p_documented_cash_transactions integer,
  p_reason text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_withdrawals bigint := 0;
  v_actual_cash bigint := 0;
  v_percentage numeric := 0;
  v_fixed bigint := 0;
  v_vat_rate numeric := 0;
  v_fee_net bigint := 0;
  v_fee_tax bigint := 0;
begin
  select * into v_session
  from public.cash_sessions
  where id = p_session and status = 'closed'
  for update;

  if v_session.id is null then raise exception 'No se encontró el cierre'; end if;
  if not private.administers(v_session.business_id) then
    raise exception 'Sin autorización';
  end if;
  if p_counted_cash < 0 or p_actual_debit < 0 or p_actual_credit < 0
     or p_actual_transfer < 0 or p_documented_cash < 0 then
    raise exception 'Los montos no pueden ser negativos';
  end if;
  if p_debit_transactions < 0 or p_credit_transactions < 0
     or p_transfer_transactions < 0 or p_documented_cash_transactions < 0 then
    raise exception 'Los movimientos no pueden ser negativos';
  end if;
  if (p_actual_debit > 0 and p_debit_transactions = 0)
     or (p_actual_credit > 0 and p_credit_transactions = 0)
     or (p_actual_transfer > 0 and p_transfer_transactions = 0)
     or (p_documented_cash > 0 and p_documented_cash_transactions = 0) then
    raise exception 'Indica los movimientos de cada medio con ventas';
  end if;
  if nullif(trim(p_reason), '') is null
     or char_length(trim(p_reason)) < 3 then
    raise exception 'Indica el origen de los totales';
  end if;

  select coalesce(sum(amount), 0) into v_withdrawals
  from public.cash_session_withdrawals
  where cash_session_id = p_session;
  v_actual_cash := p_counted_cash - v_session.opening_cash + v_withdrawals;
  if v_actual_cash < 0 then
    raise exception 'El efectivo contado no permite calcular ventas positivas';
  end if;

  select card_fee_percentage, card_fee_fixed_amount, card_fee_vat_rate
  into v_percentage, v_fixed, v_vat_rate
  from public.cost_settings
  where business_id = v_session.business_id;
  v_fee_net := round(
    (p_actual_debit + p_actual_credit) * v_percentage / 100.0
    + (p_debit_transactions + p_credit_transactions) * v_fixed
  );
  v_fee_tax := round(v_fee_net * v_vat_rate / 100.0);

  insert into public.cash_session_reconciliations(
    business_id, cash_session_id, actual_cash_sales, actual_debit_sales,
    actual_credit_sales, actual_transfer_sales, actual_cash_transactions,
    actual_debit_transactions, actual_credit_transactions,
    actual_transfer_transactions, commission_net_amount,
    commission_tax_amount, reason, created_by
  ) values (
    v_session.business_id, p_session, v_actual_cash, p_actual_debit,
    p_actual_credit, p_actual_transfer, p_documented_cash_transactions,
    p_debit_transactions, p_credit_transactions, p_transfer_transactions,
    v_fee_net, v_fee_tax, trim(p_reason), auth.uid()
  )
  on conflict (cash_session_id) do update set
    actual_cash_sales = excluded.actual_cash_sales,
    actual_debit_sales = excluded.actual_debit_sales,
    actual_credit_sales = excluded.actual_credit_sales,
    actual_transfer_sales = excluded.actual_transfer_sales,
    actual_cash_transactions = excluded.actual_cash_transactions,
    actual_debit_transactions = excluded.actual_debit_transactions,
    actual_credit_transactions = excluded.actual_credit_transactions,
    actual_transfer_transactions = excluded.actual_transfer_transactions,
    commission_net_amount = excluded.commission_net_amount,
    commission_tax_amount = excluded.commission_tax_amount,
    reason = excluded.reason,
    updated_at = now();

  update public.cash_sessions
  set counted_cash = p_counted_cash,
      documented_cash_sales = p_documented_cash,
      documented_cash_transactions = p_documented_cash_transactions,
      reconciled_at = now(),
      reconciled_by = auth.uid(),
      closing_note = case when auto_closed
        then 'Cierre automático completado con conciliación manual.'
        else closing_note
      end
  where id = p_session;
end
$$;

revoke all on function public.reconcile_closed_cash_session(
  uuid, bigint, bigint, bigint, bigint, integer, integer, integer,
  bigint, integer, text
) from public, anon;
grant execute on function public.reconcile_closed_cash_session(
  uuid, bigint, bigint, bigint, bigint, integer, integer, integer,
  bigint, integer, text
) to authenticated;
