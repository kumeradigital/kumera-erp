-- Electricidad se estima con un promedio, pero el documento real reemplaza
-- la estimacion: no es una deuda por la diferencia entre ambos importes.
alter table public.expense_provisions
  drop constraint if exists expense_provisions_tracking_mode_check;

alter table public.expense_provisions
  add constraint expense_provisions_tracking_mode_check
  check (tracking_mode in ('fixed_target', 'accumulating_actual', 'actual_bill'));

update public.expense_provisions ep
set tracking_mode = 'actual_bill',
    expected_amount = coalesce((
      select sum(ot.gross_amount)::bigint
      from public.operational_transactions ot
      where ot.provision_id = ep.id
        and ot.financial_status in ('verified', 'historical_verified')
    ), ep.expected_amount),
    status = case
      when exists (
        select 1
        from public.operational_transactions ot
        where ot.provision_id = ep.id
          and ot.financial_status in ('verified', 'historical_verified')
      ) then 'reconciled'
      else ep.status
    end,
    updated_at = now()
where lower(ep.name) like '%electric%'
   or lower(ep.name) like '%luz%';
