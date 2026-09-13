update public.operational_transactions
set financial_status = 'historical_verified',
    updated_at = now()
where id in (
  '3fc41fe9-a7a1-47ab-8d59-849733a6c2a9',
  '695f7987-c90b-4d4a-a4a9-37a3deecf603',
  'd0554cb8-548b-4380-aff7-713f0fbcb6cc',
  '30f4f269-67f8-4dd0-b806-818b3d04cfe9'
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
  timestamptz '2026-09-12 20:50:00+00',
  date '2026-09-12',
  1021564,
  156500,
  0,
  'Corte real al cierre del 12-09-2026. Incluye las compras Manteca/Manjar por $80.341, bolsas Vanni por $41.416, Marraqueta por $54.000 y el retiro Pedido Paola por $50.000. Sin pagos ni abonos pendientes informados.',
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
