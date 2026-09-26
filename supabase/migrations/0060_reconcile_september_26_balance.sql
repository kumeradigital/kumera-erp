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
  timestamptz '2026-09-26 23:16:19.210879+00',
  date '2026-09-26',
  831501,
  150000,
  0,
  'Cuadratura real informada el 26-09-2026: banco $831.501 y efectivo total $150.000. No había caja abierta al momento del corte; los movimientos posteriores se contabilizan desde este punto.',
  ba.user_id
from public.business_admins ba
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
on conflict (business_id, cutoff_date) do update set
  cutoff_at = excluded.cutoff_at,
  opening_bank_amount = excluded.opening_bank_amount,
  opening_cash_amount = excluded.opening_cash_amount,
  pending_receivables = excluded.pending_receivables,
  note = excluded.note,
  created_by = excluded.created_by;
