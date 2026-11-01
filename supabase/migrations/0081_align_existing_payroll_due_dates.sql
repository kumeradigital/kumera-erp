-- Las remuneraciones y cotizaciones pertenecen al mes económico indicado,
-- pero salen de caja los días 5 y 10 del mes siguiente, respectivamente.
update public.expense_provisions
set due_date = (economic_month + interval '1 month 4 days')::date,
    updated_at = now()
where economic_month >= date '2026-11-01'
  and status in ('estimated', 'partial')
  and lower(category) like '%remuner%';

update public.expense_provisions
set due_date = (economic_month + interval '1 month 9 days')::date,
    updated_at = now()
where economic_month >= date '2026-11-01'
  and status in ('estimated', 'partial')
  and (
    lower(category) like '%cotiza%'
    or lower(name) like '%cotiza%'
    or lower(name) like '%previsional%'
  );
