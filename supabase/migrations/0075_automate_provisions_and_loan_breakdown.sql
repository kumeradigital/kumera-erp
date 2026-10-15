alter table public.financial_obligations
  add column if not exists principal_amount bigint not null default 0 check (principal_amount >= 0),
  add column if not exists interest_amount bigint not null default 0 check (interest_amount >= 0),
  add column if not exists charges_amount bigint not null default 0 check (charges_amount >= 0);

alter table public.operational_transactions
  add column if not exists financial_obligation_id uuid references public.financial_obligations(id) on delete set null,
  add column if not exists principal_amount bigint not null default 0 check (principal_amount >= 0),
  add column if not exists interest_amount bigint not null default 0 check (interest_amount >= 0),
  add column if not exists charges_amount bigint not null default 0 check (charges_amount >= 0),
  add column if not exists profitability_amount bigint;

update public.operational_transactions
set profitability_amount = case when affects_profitability then gross_amount else 0 end
where profitability_amount is null;

alter table public.operational_transactions
  alter column profitability_amount set not null,
  alter column profitability_amount set default 0;

create index if not exists operational_transactions_obligation_idx
  on public.operational_transactions (financial_obligation_id)
  where financial_obligation_id is not null;

comment on column public.operational_transactions.profitability_amount is
  'Parte del pago que afecta el resultado. En créditos corresponde sólo a intereses y cargos.';

-- Enlaza las provisiones creadas antes de esta automatización con su gasto
-- planificado para que el primer ciclo automático no las duplique.
update public.expense_provisions ep
set fixed_cost_id = fc.id, updated_at = now()
from public.fixed_costs fc
where ep.business_id = fc.business_id
  and ep.fixed_cost_id is null
  and ep.economic_month = date '2026-10-01'
  and (
    (lower(ep.name) like '%pastelera%' and lower(fc.name) like '%pastelera%')
    or (lower(ep.name) like '%panadero%' and lower(fc.name) like '%panadero%')
    or (lower(ep.name) like '%cajera%' and (lower(fc.name) like '%cajera%' or lower(fc.name) like '%ana maria%'))
    or (lower(ep.name) like '%arriendo%' and lower(fc.name) like '%arriendo%')
    or (lower(ep.name) like '%electric%' and lower(fc.name) like '%electric%')
    or (lower(ep.name) ~ '(^| )gas($| )' and lower(fc.name) ~ '(^| )gas($| )')
    or (lower(ep.name) like '%cotiza%' and lower(fc.name) like '%cotiza%')
    or (lower(ep.name) like '%plaga%' and lower(fc.name) like '%plaga%')
    or (lower(ep.name) like '%chatgpt%' and (lower(fc.name) like '%chatgpt%' or lower(fc.name) like '%chatgtp%'))
  );

create or replace function public.ensure_monthly_expense_provisions(
  p_business_id uuid,
  p_month date,
  p_created_by uuid
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if p_month <> date_trunc('month', p_month)::date then
    raise exception 'El mes debe ser su primer día';
  end if;

  insert into public.expense_provisions (
    business_id, fixed_cost_id, name, category, economic_month,
    expected_amount, due_date, affects_profitability, note, created_by
  )
  select
    fc.business_id,
    fc.id,
    fc.name || ' ' || trim(to_char(p_month, 'TMMonth')),
    fc.category,
    p_month,
    case
      when lower(fc.name) ~ '(^| )gas($| )' or lower(fc.name) like '%electric%'
        then coalesce((
          select round(avg(month_total))::bigint
          from (
            select sum(ot.gross_amount)::numeric as month_total
            from public.operational_transactions ot
            where ot.business_id = fc.business_id
              and ot.financial_status in ('verified', 'historical_verified')
              and ot.economic_month < p_month
              and ot.economic_month >= (p_month - interval '3 months')::date
              and (
                (lower(fc.name) ~ '(^| )gas($| )' and lower(ot.description) ~ '(^| )gas($| )')
                or (lower(fc.name) like '%electric%' and (lower(ot.description) like '%electric%' or lower(ot.description) like '%luz%'))
              )
            group by ot.economic_month
          ) recent_months
        ), fc.amount)
      when fc.period = 'daily' then fc.amount * 26
      when fc.period = 'quarterly' then round(fc.amount / 3.0)::bigint
      when fc.period = 'semiannual' then round(fc.amount / 6.0)::bigint
      when fc.period = 'annual' then round(fc.amount / 12.0)::bigint
      else fc.amount
    end,
    case
      when lower(fc.category) like '%remuner%' then (p_month + interval '1 month' + interval '4 days')::date
      when lower(fc.category) like '%cotiza%' then (p_month + interval '1 month' + interval '9 days')::date
      when lower(fc.category) like '%arriendo%' then (p_month + interval '2 days')::date
      else (p_month + interval '1 month - 1 day')::date
    end,
    fc.affects_profitability,
    case
      when lower(fc.name) ~ '(^| )gas($| )' or lower(fc.name) like '%electric%'
        then 'Generada automáticamente con el promedio de hasta tres meses verificados; conciliar con el pago real.'
      else 'Generada automáticamente desde Gastos planificados; conciliar con el pago real.'
    end,
    p_created_by
  from public.fixed_costs fc
  where fc.business_id = p_business_id
    and fc.active
    and fc.affects_profitability
    and fc.starts_on <= (p_month + interval '1 month - 1 day')::date
    and (fc.ends_on is null or fc.ends_on >= p_month)
    and not exists (
      select 1 from public.expense_provisions ep
      where ep.business_id = fc.business_id
        and ep.economic_month = p_month
        and (ep.fixed_cost_id = fc.id or lower(ep.name) = lower(fc.name || ' ' || trim(to_char(p_month, 'TMMonth'))))
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.ensure_monthly_expense_provisions(uuid, date, uuid) to authenticated;

-- La liquidación entregada confirma definitivamente el costo líquido de octubre.
update public.expense_provisions
set expected_amount = 434000,
    note = 'Liquidación confirmada: líquido mensual $620.000, proporcional definitivo de 21/30 días por 9 inasistencias. El anticipo de $83.000 reduce el saldo por pagar, no este costo.',
    updated_at = now()
where economic_month = date '2026-10-01'
  and lower(name) like '%pastelera%';

update public.financial_obligations
set amount = 351000,
    note = 'Saldo definitivo: remuneración líquida de octubre $434.000 menos anticipo pagado de $83.000.',
    updated_at = now()
where status = 'pending' and lower(name) like '%pastelera%octubre%';

-- Confirmación del dueño: estos movimientos son personales y nunca afectan rentabilidad.
update public.operational_transactions
set affects_profitability = false, profitability_amount = 0, updated_at = now()
where type = 'owner_withdrawal';

