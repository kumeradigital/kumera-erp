-- Ejecutar en modo lectura ANTES y DESPUES de 0084. Guardar ambos resultados.
-- No modifica datos. Las tablas opcionales se consultan mediante JSON para que
-- el reporte siga siendo util a medida que crece el esquema.
select b.id as business_id, b.name, b.rut,
  (select count(*) from public.products x where x.business_id=b.id) products,
  (select count(*) from public.ingredients x where x.business_id=b.id) ingredients,
  (select count(*) from public.recipes x where x.business_id=b.id) recipes,
  (select count(*) from public.cash_sessions x where x.business_id=b.id) cash_sessions,
  (select count(*) from public.sales x where x.business_id=b.id) sales,
  (select coalesce(sum(x.total),0) from public.sales x where x.business_id=b.id and x.status='completed') completed_sales_total,
  (select count(*) from public.operational_transactions x where x.business_id=b.id) operational_transactions,
  (select count(*) from public.employees x where x.business_id=b.id) employees,
  (select count(*) from public.payroll_slips x where x.business_id=b.id) payroll_slips
from public.businesses b
order by b.created_at, b.id;

-- La consulta siguiente se ejecuta DESPUES de 0084 para verificar el backfill.
select b.id as business_id,
  count(distinct ba.user_id) legacy_admins,
  count(distinct bm.user_id) memberships,
  count(distinct bl.id) locations
from public.businesses b
left join public.business_admins ba on ba.business_id=b.id and ba.active
left join public.business_memberships bm on bm.business_id=b.id and bm.active
left join public.business_locations bl on bl.business_id=b.id and bl.active
group by b.id order by b.id;
