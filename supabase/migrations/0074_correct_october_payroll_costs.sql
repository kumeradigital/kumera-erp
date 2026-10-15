-- Ajusta octubre con la liquidación real de la pastelera y estima al maestro
-- usando la misma estructura previsional. Los montos se concilian después
-- contra la planilla efectiva de Previred.

-- La pastelera tuvo costo económico en octubre aunque su pago se complete
-- durante noviembre. Se mantiene vigente solamente para ese mes.
update public.fixed_costs
set amount = 620000,
    active = true,
    ends_on = date '2026-10-31',
    notes = 'Sueldo líquido mensual de referencia. En octubre se provisionan 21 de 30 días por 9 inasistencias; las cotizaciones se provisionan por separado.',
    updated_at = now()
where lower(name) like '%pastelera%';

-- Estimación de la salida por Previred correspondiente a octubre:
-- Pastelera (21/30 días): $124.761.
-- Maestro panadero:       $272.035.
-- Total:                  $396.796.
-- Incluye descuentos del trabajador y aportes del empleador. Para el maestro
-- se usa, por ahora, AFP PlanVital, Fonasa, $50.000 no imponibles y contrato a
-- plazo fijo, igual que la liquidación aportada como referencia.
update public.fixed_costs
set amount = 396796,
    active = true,
    ends_on = date '2026-10-31',
    notes = 'Estimación octubre: pastelera $124.761 (21/30 días) + maestro $272.035. Incluye descuentos previsionales y aportes patronales; conciliar con Previred.',
    updated_at = now()
where lower(name) like '%cotizacion%'
   or lower(name) like '%cotización%';

-- Desde noviembre queda solamente la estimación recurrente del maestro.
insert into public.fixed_costs (
  business_id, name, category, amount, period, starts_on, active,
  affects_profitability, notes
)
select ba.business_id,
  'Cotizaciones maestro panadero',
  'Cotizaciones previsionales',
  272035,
  'monthly',
  date '2026-11-01',
  true,
  true,
  'Estimación basada en líquido $920.000 y estructura de la liquidación de referencia: PlanVital, Fonasa, $50.000 no imponibles y contrato a plazo fijo. Ajustar al contar con su liquidación real.'
from public.business_admins ba
where ba.active
  and not exists (
    select 1 from public.fixed_costs fc
    where fc.business_id = ba.business_id
      and fc.name = 'Cotizaciones maestro panadero'
      and fc.starts_on = date '2026-11-01'
  );

update public.expense_provisions
set expected_amount = 396796,
    note = 'Estimación respaldada por liquidación: pastelera $124.761 por 21/30 días y maestro $272.035. Incluye descuentos del trabajador y aportes del empleador; conciliar con Previred.',
    updated_at = now()
where economic_month = date '2026-10-01'
  and lower(name) like '%cotizaciones%';

-- Si ya existe el compromiso de pago, lo alinea con la provisión económica.
update public.financial_obligations
set amount = 396796,
    note = 'Estimación de cotizaciones de octubre: pastelera $124.761 y maestro $272.035. Confirmar y reemplazar con la planilla real de Previred.',
    updated_at = now()
where status = 'pending'
  and due_date between date '2026-11-01' and date '2026-11-30'
  and (
    lower(name) like '%cotizacion%'
    or lower(name) like '%cotización%'
    or lower(name) like '%imposicion%'
    or lower(name) like '%imposición%'
  );

