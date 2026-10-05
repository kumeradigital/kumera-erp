drop index if exists public.financial_cutoffs_business_date_idx;

create index if not exists financial_cutoffs_business_time_idx
  on public.financial_cutoffs (business_id, cutoff_at desc);

-- Primer uso del nuevo flujo: saldos reales informados después del cierre
-- conciliado del 04-10-2026. Los registros anteriores se conservan.
insert into public.financial_cutoffs(
  business_id, cutoff_at, cutoff_date, opening_bank_amount,
  opening_cash_amount, pending_receivables, note, created_by
)
select b.id, now(), (now() at time zone b.timezone)::date,
  403749, 134850, 0,
  'Conciliación real posterior al cierre del 04-10-2026. Banco/Mercado Pago $403.749 y efectivo total $134.850. Se conservan las diferencias anteriores para auditoría.',
  admin.user_id
from public.businesses b
join lateral (
  select ba.user_id
  from public.business_admins ba
  where ba.business_id = b.id and ba.active
  order by ba.created_at
  limit 1
) admin on true
where b.name = 'Kumera Panadería';
