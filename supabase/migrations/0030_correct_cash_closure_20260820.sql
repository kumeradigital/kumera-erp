-- Corrige la conciliación de la jornada del 20-08-2026 con los comprobantes
-- reales de TUU y el efectivo físico contado al cierre.
update public.cash_session_reconciliations
set
  actual_cash_sales = 28680,
  actual_debit_sales = 184793,
  actual_credit_sales = 5600,
  actual_transfer_sales = 0,
  commission_net_amount = 2837,
  commission_tax_amount = 539,
  reason = 'Cierre corregido con efectivo contado, retiros registrados y comprobante TUU',
  updated_at = now()
where cash_session_id = 'a8cbabbd-c645-4e02-9577-2fce9fb4ab5f';
