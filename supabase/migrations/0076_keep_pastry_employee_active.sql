-- La relación laboral de la pastelera continúa indefinidamente. Octubre conserva
-- su proporcional excepcional por inasistencias únicamente en la provisión.
update public.fixed_costs
set active = true,
    ends_on = null,
    notes = 'Sueldo líquido mensual vigente de $620.000. Octubre tuvo un proporcional excepcional de 21/30 días; desde noviembre se provisiona el mes completo.',
    updated_at = now()
where lower(name) like '%pastelera%';

-- Desde noviembre se provisionan las cotizaciones mensuales de ambos cargos:
-- pastelera $178.230 + maestro panadero $272.035 = $450.265.
update public.fixed_costs
set name = 'Cotizaciones personal producción',
    amount = 450265,
    active = true,
    ends_on = null,
    notes = 'Estimación mensual conjunta: pastelera $178.230 y maestro panadero $272.035. Conciliar con la planilla real de Previred.',
    updated_at = now()
where name = 'Cotizaciones maestro panadero'
  and starts_on = date '2026-11-01';

