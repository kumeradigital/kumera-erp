alter table public.financial_obligations
  alter column amount drop not null;

alter table public.financial_obligations
  drop constraint if exists financial_obligations_amount_check;

alter table public.financial_obligations
  add constraint financial_obligations_amount_check
  check (amount is null or amount > 0);

alter table public.financial_obligations
  add column if not exists carry_amount boolean not null default false;

comment on column public.financial_obligations.amount is
  'Monto esperado. NULL significa que el compromiso está pendiente de cálculo.';

comment on column public.financial_obligations.carry_amount is
  'Para obligaciones mensuales, replica el último monto pagado al crear el mes siguiente.';

update public.financial_obligations
set recurrence = 'monthly', carry_amount = true
where status = 'pending'
  and lower(name) like '%arriendo%';

update public.financial_obligations
set recurrence = 'monthly', carry_amount = false
where status = 'pending'
  and lower(name) like '%electricidad%';
