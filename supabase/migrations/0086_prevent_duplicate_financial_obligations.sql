-- Cierra duplicados exactos que quedaron abiertos por lecturas concurrentes.
-- Conserva primero el compromiso ya pagado; si ninguno fue pagado, conserva
-- el registro más antiguo.
with ranked as (
  select
    id,
    row_number() over (
      partition by business_id, name, due_date
      order by
        case status when 'paid' then 0 when 'pending' then 1 else 2 end,
        created_at,
        id
    ) as position
  from public.financial_obligations
  where status <> 'cancelled'
)
update public.financial_obligations obligation
set status = 'cancelled', updated_at = now()
from ranked
where obligation.id = ranked.id
  and ranked.position > 1;

create unique index if not exists financial_obligations_unique_schedule_idx
  on public.financial_obligations (business_id, name, due_date)
  where status <> 'cancelled';

comment on index public.financial_obligations_unique_schedule_idx is
  'Evita compromisos duplicados con el mismo nombre y vencimiento, incluso ante solicitudes concurrentes.';
