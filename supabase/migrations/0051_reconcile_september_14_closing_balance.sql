update public.operational_transactions
set financial_status = 'historical_verified',
    updated_at = now()
where id in (
  '1460df1e-9ca5-48ba-bb46-315dc0898643',
  '5bea4914-2a95-4ed5-af2e-17b09c753766',
  'e6a16c4e-d769-4c8d-b802-a0b6651a7d19',
  '74a66822-cf02-4b0f-aa3c-623f17ef8475',
  '2e6ca176-894b-4cc1-9dfe-ca239903532f',
  '18f0b9a1-a976-4f97-9955-395de52ccea2',
  '5381587d-2002-4f8b-979e-bf97e368b111'
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
  timestamptz '2026-09-14 19:17:00+00',
  date '2026-09-14',
  333943,
  0,
  0,
  'Corte real del 14-09-2026 con el local cerrado. Banco $333.943 y efectivo $0. El cierre del 13-09 aportó $388.605 netos de comisión. Se detectó una diferencia no documentada de $86.132 respecto de los movimientos registrados; se absorben siete operaciones ya pagadas por $1.142.594 para evitar duplicarlas.',
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
