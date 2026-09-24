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
  timestamptz '2026-09-24 11:20:00+00',
  date '2026-09-24',
  789380,
  100700,
  0,
  'Corte real del 24-09-2026 a las 08:20 America/Santiago. Banco $789.380 y efectivo total $100.700. El efectivo ya incluye los $15.730 de apertura de la caja activa; no se suma nuevamente. Sin pagos ni abonos pendientes informados.',
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
