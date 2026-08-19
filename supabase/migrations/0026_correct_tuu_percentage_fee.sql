-- TUU confirmó que KUMERA está usando la modalidad porcentual de 1,49%
-- neto, no la modalidad mixta de 0,79% + $65 configurada inicialmente.

update public.cost_settings
set card_fee_model = 'percentage',
    card_fee_percentage = 1.49,
    card_fee_fixed_amount = 0,
    card_fee_vat_rate = 19,
    card_settlement_days = 1,
    updated_at = now()
where business_id = '83ca329e-f6de-4d00-9156-8197b485a5e4';

-- Corrige las estimaciones históricas guardadas por venta. Los montos vendidos
-- no se modifican; sólo la instantánea de comisión y el abono esperado.
with corrected as (
  select id,
         round(total * 1.49 / 100.0)::bigint as fee_net
  from public.sales
  where business_id = '83ca329e-f6de-4d00-9156-8197b485a5e4'
    and payment_method in ('debit', 'credit')
)
update public.sales as sale
set commission_model = 'percentage',
    commission_percentage = 1.49,
    commission_fixed_amount = 0,
    commission_net_amount = corrected.fee_net,
    commission_tax_rate = 19,
    commission_tax_amount = round(corrected.fee_net * 19 / 100.0),
    expected_deposit_amount =
      sale.total
      - corrected.fee_net
      - round(corrected.fee_net * 19 / 100.0),
    settlement_days = 1
from corrected
where sale.id = corrected.id;

-- Las conciliaciones representan totales externos por jornada. Se recalculan
-- sobre el total real declarado en cada cierre usando la modalidad porcentual.
with corrected as (
  select id,
         round(
           (actual_debit_sales + actual_credit_sales) * 1.49 / 100.0
         )::bigint as fee_net
  from public.cash_session_reconciliations
  where business_id = '83ca329e-f6de-4d00-9156-8197b485a5e4'
)
update public.cash_session_reconciliations as reconciliation
set commission_net_amount = corrected.fee_net,
    commission_tax_amount = round(corrected.fee_net * 19 / 100.0),
    updated_at = now()
from corrected
where reconciliation.id = corrected.id;

-- El abono del 16 de agosto fue confirmado directamente en el detalle de TUU.
update public.cash_session_reconciliations
set commission_net_amount = 2290,
    commission_tax_amount = 438,
    updated_at = now()
where cash_session_id = (
  select id
  from public.cash_sessions
  where business_id = '83ca329e-f6de-4d00-9156-8197b485a5e4'
    and (opened_at at time zone 'America/Santiago')::date = date '2026-08-16'
  order by opened_at desc
  limit 1
);
