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
  timestamp '2026-09-10 00:00:00' at time zone 'America/Santiago',
  date '2026-09-09',
  352305,
  92500,
  0,
  'Base real informada el 10-09-2026. Del saldo bancario informado de $358.058 se descontó la venta sin clasificar de hoy por $5.753, para que la jornada abierta del 10-09 se incorpore completa al cerrarse. Sin pagos ni abonos pendientes.',
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
