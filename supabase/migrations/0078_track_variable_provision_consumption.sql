alter table public.expense_provisions
  add column if not exists tracking_mode text not null default 'fixed_target'
    check (tracking_mode in ('fixed_target', 'accumulating_actual')),
  add column if not exists unit_label text;

alter table public.operational_transactions
  add column if not exists provision_units numeric(10, 2)
    check (provision_units is null or provision_units > 0);

-- Octubre contenía una provisión manual "Control de plagas" y otra automática
-- "Plagas" por el mismo costo. La manual no tiene pagos y además quedó
-- vinculada por error al gasto planificado Gas, por lo que se elimina sin
-- perder ningún movimiento real.
delete from public.expense_provisions duplicate
where lower(duplicate.name) like '%control de plagas%'
  and not exists (
    select 1
    from public.operational_transactions ot
    where ot.provision_id = duplicate.id
  )
  and exists (
    select 1
    from public.expense_provisions canonical
    where canonical.business_id = duplicate.business_id
      and canonical.economic_month = duplicate.economic_month
      and canonical.id <> duplicate.id
      and lower(canonical.name) like '%plaga%'
      and lower(canonical.name) not like '%control de plagas%'
  );

update public.expense_provisions
set tracking_mode = 'accumulating_actual',
    unit_label = 'cilindros',
    note = 'Presupuesto mensual estimado. Cada compra suma gasto y cilindros consumidos; no representa una deuda ni tiene saldo por pagar.',
    updated_at = now()
where lower(name) ~ '(^| )gas($| )';

update public.operational_transactions ot
set provision_units = 1,
    updated_at = now()
from public.expense_provisions ep
where ot.provision_id = ep.id
  and ep.tracking_mode = 'accumulating_actual'
  and ot.provision_units is null;

comment on column public.expense_provisions.tracking_mode is
  'fixed_target concilia una deuda; accumulating_actual acumula consumos contra un presupuesto sin generar saldo pendiente.';
comment on column public.expense_provisions.unit_label is
  'Unidad operativa opcional que se acumula con los pagos, por ejemplo cilindros.';
comment on column public.operational_transactions.provision_units is
  'Cantidad física asociada a un consumo acumulativo provisionado.';

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
    expected_amount, due_date, affects_profitability, note, created_by,
    tracking_mode, unit_label
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
      when lower(fc.name) ~ '(^| )gas($| )'
        then 'Presupuesto mensual estimado. Cada compra suma gasto y cilindros consumidos; no representa una deuda.'
      when lower(fc.name) like '%electric%'
        then 'Generada automáticamente con el promedio de hasta tres meses verificados; conciliar con el pago real.'
      else 'Generada automáticamente desde Gastos planificados; conciliar con el pago real.'
    end,
    p_created_by,
    case when lower(fc.name) ~ '(^| )gas($| )' then 'accumulating_actual' else 'fixed_target' end,
    case when lower(fc.name) ~ '(^| )gas($| )' then 'cilindros' else null end
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

