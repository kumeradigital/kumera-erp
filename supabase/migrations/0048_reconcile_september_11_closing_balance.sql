update public.operational_transactions
set financial_status = 'historical_verified',
    updated_at = now()
where id in (
  '84bd0755-0483-4dd2-9d1f-ba510ea56b9a',
  'a9f6014f-d41e-47cd-b1bd-8af6705f3440'
);

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
  timestamptz '2026-09-11 23:05:00+00',
  date '2026-09-11',
  821955,
  211000,
  0,
  'Corte real al cierre del 11-09-2026. Incluye los retiros registrados de $25.000 en efectivo y $20.000 desde banco. Sin pagos ni abonos pendientes informados.',
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
