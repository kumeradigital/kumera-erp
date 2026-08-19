-- Abono real informado por TUU para las ventas con tarjeta del 18-08-2026:
-- ventas $219.722, comisión total $3.898 y abono $215.824.
-- La diferencia de $2 frente a la estimación global corresponde al redondeo
-- que TUU realiza sobre las transacciones individuales.

update public.cash_session_reconciliations
set commission_net_amount = 3276,
    commission_tax_amount = 622,
    updated_at = now()
where cash_session_id = (
  select id
  from public.cash_sessions
  where business_id = '83ca329e-f6de-4d00-9156-8197b485a5e4'
    and (opened_at at time zone 'America/Santiago')::date = date '2026-08-18'
  order by opened_at desc
  limit 1
);
