alter table public.operational_transactions
  add column if not exists economic_month date,
  add column if not exists provision_id uuid;

update public.operational_transactions
set economic_month = date_trunc('month', transaction_date)::date
where economic_month is null;

alter table public.operational_transactions
  alter column economic_month set not null,
  alter column economic_month set default date_trunc('month', current_date)::date;

create table public.expense_provisions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  fixed_cost_id uuid references public.fixed_costs(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  category text not null default 'Otros',
  economic_month date not null,
  expected_amount bigint not null check (expected_amount >= 0),
  due_date date,
  affects_profitability boolean not null default true,
  status text not null default 'estimated'
    check (status in ('estimated', 'partial', 'reconciled', 'cancelled')),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (economic_month = date_trunc('month', economic_month)::date)
);

create index expense_provisions_business_month_idx
  on public.expense_provisions (business_id, economic_month desc, status);

alter table public.expense_provisions enable row level security;
create policy "expense provision access"
  on public.expense_provisions for all to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id) and created_by = auth.uid());

alter table public.operational_transactions
  add constraint operational_transactions_provision_id_fkey
  foreign key (provision_id) references public.expense_provisions(id) on delete set null;

create index operational_transactions_provision_idx
  on public.operational_transactions (provision_id)
  where provision_id is not null;

grant select, insert, update on public.expense_provisions to authenticated;

comment on column public.operational_transactions.economic_month is
  'Mes económico al que pertenece el gasto, independiente de la fecha en que se pagó.';
comment on column public.operational_transactions.provision_id is
  'Provisión mensual que este pago concilia total o parcialmente.';
comment on table public.expense_provisions is
  'Gastos económicos del mes estimados o devengados, conciliables con pagos reales.';

-- Correcciones conocidas del modelo planificado.
update public.fixed_costs
set amount = 500000, updated_at = now()
where lower(name) like '%ana maria%' or lower(name) like '%cajera%';

update public.fixed_costs
set amount = 238000, affects_profitability = false, updated_at = now()
where category = 'Financiamiento'
  or lower(name) like '%cuota%credito%'
  or lower(name) like '%cuota%crédito%';

update public.financial_obligations
set amount = 611000,
    due_date = date '2026-10-20',
    note = 'Obligación tributaria real de septiembre corregida en el SII. Afecta la liquidez de octubre, no la rentabilidad operacional de octubre.',
    updated_at = now()
where status = 'pending'
  and lower(name) like '%iva%septiembre%';

update public.financial_obligations
set amount = 351000,
    note = 'Saldo provisional de remuneración de octubre: base $620.000 menos 9 días de inasistencia estimados en $186.000 y menos anticipo pagado de $83.000. Confirmar con liquidación de remuneraciones.',
    updated_at = now()
where status = 'pending'
  and lower(name) like '%pastelera%octubre%';

-- Provisiones de octubre: representan el costo económico, aunque se paguen en noviembre.
insert into public.expense_provisions (
  business_id, name, category, economic_month, expected_amount, due_date,
  affects_profitability, note, created_by
)
select ba.business_id, seed.name, seed.category, date '2026-10-01',
  seed.amount, seed.due_date, true, seed.note, ba.user_id
from public.business_admins ba
cross join (values
  ('Remuneración cajera octubre', 'Remuneraciones', 500000::bigint, date '2026-11-05', 'Se paga en noviembre, pero corresponde económicamente a octubre.'),
  ('Remuneración panadero octubre', 'Remuneraciones', 920000::bigint, date '2026-11-05', 'Se paga en noviembre, pero corresponde económicamente a octubre.'),
  ('Remuneración pastelera octubre', 'Remuneraciones', 434000::bigint, date '2026-11-05', 'Estimación provisional: sueldo base $620.000 menos 9 días de inasistencia. El anticipo de $83.000 reduce el saldo por pagar, no este costo económico.'),
  ('Arriendo octubre', 'Arriendo', 675000::bigint, date '2026-10-03', 'Costo económico y pago de octubre.'),
  ('Electricidad octubre', 'Servicios básicos', 225400::bigint, date '2026-10-07', 'Monto real de octubre; reemplaza la estimación del gasto planificado.'),
  ('Gas octubre', 'Servicios básicos', 276000::bigint, date '2026-10-31', 'Provisión estimada. Los pagos reales del mes se acumulan hasta conciliarla.'),
  ('Cotizaciones previsionales octubre', 'Cotizaciones previsionales', 120000::bigint, date '2026-11-10', 'Estimación del costo económico de octubre; se ajusta al conocer la planilla real.'),
  ('Control de plagas octubre', 'Mantención y reparaciones', 59500::bigint, date '2026-10-31', 'Costo recurrente planificado para octubre.'),
  ('ChatGPT octubre', 'Gastos administrativos', 19990::bigint, date '2026-10-31', 'Suscripción administrativa correspondiente a octubre.')
) as seed(name, category, amount, due_date, note)
where ba.active
  and not exists (
    select 1 from public.expense_provisions ep
    where ep.business_id = ba.business_id
      and ep.economic_month = date '2026-10-01'
      and ep.name = seed.name
  );

-- Vincula pagos reales conocidos a su provisión; permite pagos parciales.
update public.operational_transactions ot
set economic_month = date '2026-10-01',
    provision_id = ep.id,
    updated_at = now()
from public.expense_provisions ep
where ot.business_id = ep.business_id
  and ep.economic_month = date '2026-10-01'
  and (
    (ep.name = 'Remuneración pastelera octubre' and ot.gross_amount = 83000 and lower(ot.description) like '%pastelera%')
    or (ep.name = 'Arriendo octubre' and ot.gross_amount = 675000 and lower(ot.description) like '%arriendo%')
    or (ep.name = 'Electricidad octubre' and ot.gross_amount = 225400 and lower(ot.description) like '%electric%')
    or (ep.name = 'Gas octubre' and ot.gross_amount = 69230 and lower(ot.description) like '%gas%')
  );

-- Los sueldos pagados el 1 de octubre corresponden económicamente a septiembre.
update public.operational_transactions
set economic_month = date '2026-09-01', updated_at = now()
where transaction_date = date '2026-10-01'
  and category = 'Remuneraciones'
  and gross_amount in (500000, 440000, 420000);

-- Todos los retiros de caja existentes fueron confirmados como compras del negocio.
update public.cash_session_withdrawals
set is_business_expense = true
where is_business_expense is distinct from true;
