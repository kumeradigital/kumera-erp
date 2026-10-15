-- Octubre ya quedó reconocido en su provisión por $396.796. La fila planificada
-- excepcional no debe seguir apareciendo como activa junto a la recurrente.
delete from public.fixed_costs
where lower(name) = 'cotizaciones'
  and starts_on < date '2026-11-01';

-- Normaliza cualquier variante que haya quedado del registro futuro.
update public.fixed_costs
set name = 'Cotizaciones personal producción',
    category = 'Cotizaciones previsionales',
    amount = 450265,
    active = true,
    starts_on = date '2026-11-01',
    ends_on = null,
    notes = 'Estimación mensual conjunta: pastelera $178.230 y maestro panadero $272.035. Conciliar con la planilla real de Previred.',
    updated_at = now()
where lower(name) in (
  'cotizaciones maestro panadero',
  'cotizaciones personal producción'
);

