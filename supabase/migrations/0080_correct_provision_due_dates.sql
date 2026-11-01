-- Arriendo y electricidad corresponden económicamente al mes provisionado,
-- pero se pagan el día 5 del mes siguiente.
update public.expense_provisions
set due_date = (economic_month + interval '1 month 4 days')::date,
    updated_at = now()
where economic_month >= date '2026-11-01'
  and status in ('estimated', 'partial')
  and (
    lower(category) like '%arriendo%'
    or lower(name) like '%arriendo%'
    or lower(name) like '%electric%'
    or lower(name) like '%luz%'
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
      when lower(fc.category) like '%remuner%' then (p_month + interval '1 month 4 days')::date
      when lower(fc.category) like '%cotiza%' then (p_month + interval '1 month 9 days')::date
      when lower(fc.category) like '%arriendo%'
        or lower(fc.name) like '%arriendo%'
        or lower(fc.name) like '%electric%'
        or lower(fc.name) like '%luz%'
        then (p_month + interval '1 month 4 days')::date
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

grant execute on function public.ensure_monthly_expense_provisions(uuid, date, uuid) to authenticated;
