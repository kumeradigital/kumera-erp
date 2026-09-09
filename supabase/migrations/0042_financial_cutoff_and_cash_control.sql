alter table public.operational_transactions
  add column financial_status text not null default 'verified'
  check (financial_status in ('pending', 'verified', 'historical', 'historical_verified'));

alter table public.fixed_costs
  add column affects_profitability boolean not null default true;

create table public.financial_cutoffs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  cutoff_at timestamptz not null,
  cutoff_date date not null,
  opening_bank_amount bigint not null check (opening_bank_amount >= 0),
  opening_cash_amount bigint not null check (opening_cash_amount >= 0),
  pending_receivables bigint not null default 0 check (pending_receivables >= 0),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index financial_cutoffs_business_date_idx
  on public.financial_cutoffs (business_id, cutoff_date);

alter table public.financial_cutoffs enable row level security;
create policy "financial cutoff access"
  on public.financial_cutoffs for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

create table public.financial_obligations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  amount bigint not null check (amount > 0),
  due_date date not null,
  kind text not null check (kind in ('payable', 'loan_payment')),
  recurrence text check (recurrence is null or recurrence in ('monthly')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_obligations_business_due_idx
  on public.financial_obligations (business_id, status, due_date);

alter table public.financial_obligations enable row level security;
create policy "financial obligation access"
  on public.financial_obligations for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

update public.operational_transactions
set financial_status = 'historical'
where transaction_date <= date '2026-09-08';

update public.operational_transactions
set financial_status = 'historical_verified'
where transaction_date = date '2026-09-05'
  and gross_amount = 675000
  and lower(description) like '%arriendo%';

update public.fixed_costs
set amount = 238000,
    affects_profitability = false,
    updated_at = now()
where category = 'Financiamiento'
  and (lower(name) like '%cuota%'
    or lower(name) like '%crédito%'
    or lower(name) like '%credito%');

insert into public.financial_cutoffs (
  business_id, cutoff_at, cutoff_date, opening_bank_amount, opening_cash_amount,
  pending_receivables, note, created_by
)
select ba.business_id,
  timestamp '2026-09-09 00:00:00' at time zone 'America/Santiago',
  date '2026-09-08', 388232, 47040, 0,
  'Primer corte financiero conciliado. El saldo bancario se reconstruyó antes del pago de impuestos del 09-09.',
  ba.user_id
from public.business_admins ba
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
on conflict (business_id, cutoff_date) do update set
  opening_bank_amount = excluded.opening_bank_amount,
  opening_cash_amount = excluded.opening_cash_amount,
  pending_receivables = excluded.pending_receivables,
  note = excluded.note;

insert into public.operational_transactions (
  business_id, transaction_date, type, description, category, payment_method,
  gross_amount, net_amount, tax_amount, tax_rate, supplier, note, created_by,
  financial_status
)
select ba.business_id, date '2026-09-09', 'expense', 'Pago de impuestos',
  'Gastos administrativos', 'transfer', 26000, 26000, 0, 0, null,
  'Movimiento verificado posterior al corte financiero.', ba.user_id, 'verified'
from public.business_admins ba
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
  and not exists (
    select 1 from public.operational_transactions ot
    where ot.business_id = ba.business_id
      and ot.transaction_date = date '2026-09-09'
      and ot.gross_amount = 26000
      and lower(ot.description) like '%impuesto%'
  );

insert into public.financial_obligations (
  business_id, name, amount, due_date, kind, recurrence, note, created_by
)
select ba.business_id, 'Electricidad', 255000, date '2026-09-10', 'payable', null,
  'Registrar como pagada solamente cuando el dinero salga realmente.', ba.user_id
from public.business_admins ba
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
  and not exists (
    select 1 from public.financial_obligations fo
    where fo.business_id = ba.business_id and fo.name = 'Electricidad'
      and fo.due_date = date '2026-09-10'
  );

insert into public.financial_obligations (
  business_id, name, amount, due_date, kind, recurrence, note, created_by
)
select ba.business_id, 'Cuota de crédito', 238000, date '2026-10-01',
  'loan_payment', 'monthly',
  'Compromiso de caja. Sólo el interés debe considerarse gasto de rentabilidad.', ba.user_id
from public.business_admins ba
where ba.active
  and ba.user_id = '13cd8c0d-5c1d-4819-bf08-ff34b9123747'
  and not exists (
    select 1 from public.financial_obligations fo
    where fo.business_id = ba.business_id and fo.name = 'Cuota de crédito'
  );

grant select, insert, update on public.financial_cutoffs to authenticated;
grant select, insert, update on public.financial_obligations to authenticated;
