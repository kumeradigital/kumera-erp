alter table public.operational_transactions
  add column if not exists affects_profitability boolean not null default true;

comment on column public.operational_transactions.affects_profitability is
  'False para movimientos que afectan caja pero no el resultado operacional, como capital de créditos o impuestos de períodos anteriores.';

update public.operational_transactions
set affects_profitability = false,
    updated_at = now()
where lower(description) like '%cuota%crédito%'
   or lower(description) like '%cuota%credito%'
   or lower(description) like '%pago de impuestos%';

