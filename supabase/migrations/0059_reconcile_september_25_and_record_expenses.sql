-- El saldo informado a las 09:47 ya incluye cinco ventas de la caja abierta
-- por $22.152. Como el efectivo de caja sigue igual a su apertura, se considera
-- que esas ventas ingresaron por Mercado Pago. Se reconstruye el banco previo a
-- la jornada descontando el abono neto estimado como débito: $21.838.
insert into public.financial_cutoffs (
  business_id,
  cutoff_at,
  cutoff_date,
  opening_bank_amount,
  opening_cash_amount,
  pending_receivables,
  note,
  created_by
)
select
  ba.business_id,
  timestamptz '2026-09-25 10:54:10.177053+00',
  date '2026-09-25',
  679475,
  99620,
  0,
  'Corte real del 25-09-2026. Saldo observado a las 09:47: banco $701.313, efectivo en billetera $83.000 y efectivo en caja $16.620. La caja abrió con $16.620 y ya tenía 5 ventas registradas por $22.152; se reconstruye el banco anterior a la jornada descontando $21.838 netos, estimados con comisión de débito Mercado Pago. Los gastos del 24-09 quedan históricos porque ya están contenidos en estos saldos.',
  ba.user_id
from public.business_admins ba
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
on conflict (business_id, cutoff_date) do update set
  cutoff_at = excluded.cutoff_at,
  opening_bank_amount = excluded.opening_bank_amount,
  opening_cash_amount = excluded.opening_cash_amount,
  pending_receivables = excluded.pending_receivables,
  note = excluded.note;

with expense_rows(type, description, category, payment_method, gross_amount, tax_rate, note) as (
  values
    ('fixed_cost'::public.operation_type, 'Control de plagas mensual', 'Mantención y reparaciones', 'debit'::public.payment_method, 59500::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('purchase'::public.operation_type, 'Compra de insumos: marraqueta', 'Materias primas', 'debit'::public.payment_method, 35200::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('purchase'::public.operation_type, 'Compra de insumos Central Mayorista', 'Materias primas', 'debit'::public.payment_method, 76675::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('expense'::public.operation_type, 'Elementos de decoración para la tienda', 'Equipamiento', 'debit'::public.payment_method, 55800::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('expense'::public.operation_type, 'Estacionamiento', 'Estacionamiento y transporte', 'debit'::public.payment_method, 1250::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('expense'::public.operation_type, 'Bencina', 'Combustible', 'cash'::public.payment_method, 10000::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('owner_withdrawal'::public.operation_type, 'Retiro de dueño', 'Retiros personales', 'debit'::public.payment_method, 17070::bigint, 0::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('purchase'::public.operation_type, 'Compra de envases', 'Envases y embalajes', 'debit'::public.payment_method, 13202::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('expense'::public.operation_type, 'Estacionamiento', 'Estacionamiento y transporte', 'debit'::public.payment_method, 698::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.'),
    ('expense'::public.operation_type, 'Basureros y táperes', 'Utensilios menores', 'debit'::public.payment_method, 70830::bigint, 19::numeric, 'Pagado el 24-09-2026; informado en el corte del 25-09.')
)
insert into public.operational_transactions (
  business_id,
  transaction_date,
  type,
  description,
  category,
  payment_method,
  gross_amount,
  net_amount,
  tax_amount,
  tax_rate,
  note,
  created_by,
  financial_status
)
select
  ba.business_id,
  date '2026-09-24',
  e.type,
  e.description,
  e.category,
  e.payment_method,
  e.gross_amount,
  case when e.tax_rate = 0 then e.gross_amount else round(e.gross_amount / 1.19) end,
  e.gross_amount - case when e.tax_rate = 0 then e.gross_amount else round(e.gross_amount / 1.19) end,
  e.tax_rate,
  e.note,
  ba.user_id,
  'historical_verified'
from public.business_admins ba
cross join expense_rows e
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
  and not exists (
    select 1
    from public.operational_transactions ot
    where ot.business_id = ba.business_id
      and ot.transaction_date = date '2026-09-24'
      and lower(trim(ot.description)) = lower(trim(e.description))
      and ot.gross_amount = e.gross_amount
      and ot.payment_method = e.payment_method
  );
