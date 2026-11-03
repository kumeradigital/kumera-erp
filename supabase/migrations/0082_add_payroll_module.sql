create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  rut text not null,
  job_title text not null,
  afp_name text not null,
  afp_rate numeric(6,4) not null,
  health_system text not null default 'FONASA',
  health_rate numeric(6,4) not null default 0.07,
  base_salary bigint not null,
  meal_allowance bigint not null default 0,
  transport_allowance bigint not null default 0,
  contract_start date not null,
  contract_end date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, rut)
);

create table if not exists public.payroll_slips (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  period date not null,
  worked_days integer not null default 30 check (worked_days between 0 and 30),
  contractual_days integer not null default 30 check (contractual_days > 0),
  base_earned bigint not null,
  gratification bigint not null,
  other_taxable_earnings bigint not null default 0,
  meal_allowance bigint not null default 0,
  transport_allowance bigint not null default 0,
  other_non_taxable_earnings bigint not null default 0,
  afp_deduction bigint not null,
  health_deduction bigint not null,
  unemployment_deduction bigint not null default 0,
  income_tax bigint not null default 0,
  advances bigint not null default 0,
  other_deductions bigint not null default 0,
  net_pay bigint not null,
  payment_status text not null default 'draft' check (payment_status in ('draft','paid')),
  paid_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, employee_id, period)
);

alter table public.employees enable row level security;
alter table public.payroll_slips enable row level security;

create policy "business admins manage employees"
on public.employees for all
using (exists (
  select 1 from public.business_admins ba
  where ba.business_id = employees.business_id
    and ba.user_id = auth.uid() and ba.active
))
with check (exists (
  select 1 from public.business_admins ba
  where ba.business_id = employees.business_id
    and ba.user_id = auth.uid() and ba.active
));

create policy "business admins manage payroll slips"
on public.payroll_slips for all
using (exists (
  select 1 from public.business_admins ba
  where ba.business_id = payroll_slips.business_id
    and ba.user_id = auth.uid() and ba.active
))
with check (exists (
  select 1 from public.business_admins ba
  where ba.business_id = payroll_slips.business_id
    and ba.user_id = auth.uid() and ba.active
));

insert into public.employees (
  business_id, full_name, rut, job_title, afp_name, afp_rate,
  health_system, health_rate, base_salary, meal_allowance,
  transport_allowance, contract_start, contract_end
)
select b.id, v.full_name, v.rut, v.job_title, v.afp_name, v.afp_rate,
  'FONASA', 0.07, v.base_salary, 20000, 30000,
  date '2026-10-01', date '2027-01-01'
from public.businesses b
cross join (values
  ('Héctor Lorenzo Cerda Lumán', '9.617.854-9', 'Maestro Panadero', 'Capital', 0.1144::numeric, 853359::bigint),
  ('Javiera del Pilar Maureira Bravo', '19.483.888-3', 'Pastelera', 'PlanVital', 0.1116::numeric, 557185::bigint)
) as v(full_name, rut, job_title, afp_name, afp_rate, base_salary)
where b.rut in ('78.460.151-K', '78460151-K')
on conflict (business_id, rut) do update set
  full_name = excluded.full_name,
  job_title = excluded.job_title,
  afp_name = excluded.afp_name,
  afp_rate = excluded.afp_rate,
  health_system = excluded.health_system,
  health_rate = excluded.health_rate,
  base_salary = excluded.base_salary,
  meal_allowance = excluded.meal_allowance,
  transport_allowance = excluded.transport_allowance,
  contract_start = excluded.contract_start,
  contract_end = excluded.contract_end,
  updated_at = now();

-- Octubre se precarga de acuerdo con el historial financiero existente:
-- Héctor mes completo; Javiera 21/30 días y anticipo de $83.000.
insert into public.payroll_slips (
  business_id, employee_id, period, worked_days, contractual_days,
  base_earned, gratification, meal_allowance, transport_allowance,
  afp_deduction, health_deduction, income_tax, advances, net_pay,
  payment_status, paid_on, notes
)
select e.business_id, e.id, date '2026-10-01',
  case when e.rut = '19.483.888-3' then 21 else 30 end, 30,
  case when e.rut = '19.483.888-3' then 390030 else 853359 end,
  case when e.rut = '19.483.888-3' then 97508 else 213340 end,
  case when e.rut = '19.483.888-3' then 14000 else 20000 end,
  case when e.rut = '19.483.888-3' then 21000 else 30000 end,
  case when e.rut = '19.483.888-3' then 54409 else 122030 end,
  case when e.rut = '19.483.888-3' then 34128 else 74669 end,
  0,
  case when e.rut = '19.483.888-3' then 83000 else 0 end,
  case when e.rut = '19.483.888-3' then 351001 else 920000 end,
  'paid', date '2026-11-01',
  case when e.rut = '19.483.888-3'
    then 'Octubre: 21 días devengados y anticipo previo de $83.000, según historial financiero del ERP.'
    else 'Octubre: mes completo. Líquido objetivo pagado $920.000.' end
from public.employees e
join public.businesses b on b.id = e.business_id
where b.rut in ('78.460.151-K', '78460151-K')
  and e.rut in ('9.617.854-9', '19.483.888-3')
on conflict (business_id, employee_id, period) do nothing;
