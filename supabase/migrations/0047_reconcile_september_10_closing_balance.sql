update public.operational_transactions
set financial_status = 'historical_verified',
    updated_at = now()
where id in (
  'ea196fcf-b401-4bfa-8a99-a5fde7b9d530',
  'ece2fd75-e95d-45ff-8ca8-ab3ec77571ca',
  'da53a148-c3cb-47f3-a02d-cf0a1fc60b91',
  '2a72ea28-ca20-4151-acaa-70fedc51da78'
);

update public.financial_obligations
set status = 'paid',
    updated_at = now(),
    note = 'Pagada y registrada por $255.057 antes del corte conciliado del 10-09-2026.'
where name = 'Electricidad'
  and due_date = date '2026-09-10'
  and status = 'pending';

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
  timestamptz '2026-09-11 02:50:00+00',
  date '2026-09-10',
  533383,
  96000,
  0,
  'Corte real al cierre del 10-09-2026. Incluye electricidad pagada por $255.057 y compras registradas por $65.448, $8.982 y $36.000. Sin pagos ni abonos pendientes informados.',
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
