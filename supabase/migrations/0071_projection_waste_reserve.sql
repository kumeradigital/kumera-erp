alter table public.cost_settings
  add column if not exists operational_waste_percentage numeric(6,3) not null default 2
  check (operational_waste_percentage >= 0 and operational_waste_percentage <= 20);

comment on column public.cost_settings.operational_waste_percentage is
  'Reserva estimada sobre venta bruta para merma operativa no registrada. No reemplaza rendimientos ni mermas específicas de recetas.';
