alter table public.products
add column if not exists sell_members_individually boolean not null default false;

update public.products
set
  name = 'Dulces',
  sell_members_individually = true,
  description = 'Selecciona el dulce vendido para conservar su costo, margen y demanda individual.'
where is_sales_family = true
  and lower(name) = 'dulce';
