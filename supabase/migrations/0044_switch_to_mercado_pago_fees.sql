-- Mercado Pago Point Smart: tasas especiales vigentes desde las jornadas
-- posteriores al cierre del 09-09-2026. Los cierres anteriores conservan
-- la comisión que ya quedó guardada en cash_session_reconciliations.
update public.cost_settings
set card_fee_model = 'percentage',
    card_fee_percentage = 1.19,
    card_fee_fixed_amount = 0,
    card_fee_vat_rate = 19,
    card_settlement_days = 0,
    debit_fee_percentage = 1.19,
    credit_fee_percentage = 1.99,
    updated_at = now();

-- El cierre ya informa débito y crédito por separado. Este trigger calcula
-- la comisión propia de cada medio antes de guardar la conciliación.
create or replace function public.calculate_reconciliation_card_fees()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debit_percentage numeric := 0;
  v_credit_percentage numeric := 0;
  v_vat_rate numeric := 0;
begin
  select debit_fee_percentage, credit_fee_percentage, card_fee_vat_rate
  into v_debit_percentage, v_credit_percentage, v_vat_rate
  from public.cost_settings
  where business_id = new.business_id;

  new.commission_net_amount := round(
    new.actual_debit_sales * v_debit_percentage / 100.0 +
    new.actual_credit_sales * v_credit_percentage / 100.0
  );
  new.commission_tax_amount := round(
    new.commission_net_amount * v_vat_rate / 100.0
  );
  return new;
end
$$;

drop trigger if exists calculate_reconciliation_card_fees
on public.cash_session_reconciliations;

create trigger calculate_reconciliation_card_fees
before insert on public.cash_session_reconciliations
for each row execute function public.calculate_reconciliation_card_fees();
