update public.operational_transactions
set financial_status = 'historical_verified',
    updated_at = now()
where id = '6c3c6cfa-fc6f-42fe-a829-fe3117c676a5';

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
  timestamptz '2026-09-23 11:15:00+00',
  date '2026-09-23',
  560573,
  58000,
  0,
  'Nuevo corte real del 23-09-2026. Banco $560.573 y efectivo total $58.000. No utiliza la apertura ni los movimientos de la caja abierta de esta jornada. Se absorbe la quincena de Javiera por $200.000 ya pagada.',
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
