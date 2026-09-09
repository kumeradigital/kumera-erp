update public.operational_transactions
set financial_status = 'historical_verified',
    updated_at = now()
where transaction_date = date '2026-09-09'
  and financial_status = 'verified';

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
  192232,
  47040,
  0,
  'Corte conciliado al cierre del 09-09-2026. El saldo bancario incluye el abono Transbank ya realizado y todos los egresos informados hasta esta fecha.',
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
