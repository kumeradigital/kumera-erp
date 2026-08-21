-- Corrige la conciliación del 19-08-2026 usando el efectivo físico,
-- los retiros registrados y el comprobante real de TUU.
update public.cash_session_reconciliations
set
  actual_cash_sales = 50927,
  actual_debit_sales = 162553,
  actual_credit_sales = 41862,
  actual_transfer_sales = 0,
  actual_debit_transactions = 35,
  actual_credit_transactions = 10,
  commission_net_amount = 3046,
  commission_tax_amount = 579,
  reason = 'Cierre corregido con efectivo contado, retiros registrados y comprobante TUU',
  updated_at = now()
where cash_session_id = '472ea491-3c0b-4022-ad11-d20e4286fe94';
