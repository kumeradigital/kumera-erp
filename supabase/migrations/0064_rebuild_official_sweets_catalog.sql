do $$
declare
  target_business_id uuid;
  sweets_category_id uuid;
  sweets_family_id uuid;
  pastry_category_id uuid;
  old_tart_category_id uuid;
begin
  select business_id, id
  into target_business_id, sweets_category_id
  from public.product_categories
  where name = 'Dulces'
  order by created_at
  limit 1;

  select id into sweets_family_id
  from public.products
  where business_id = target_business_id
    and is_sales_family = true
    and lower(name) = 'dulces'
  limit 1;

  if target_business_id is null or sweets_family_id is null then
    raise exception 'No se encontró la familia Dulces';
  end if;

  update public.products
  set name = 'Empolvado (histórico)', updated_at = now()
  where business_id = target_business_id
    and name = 'Empolvado'
    and deleted_at is not null;

  update public.products
  set
    category_id = sweets_category_id,
    family_product_id = sweets_family_id,
    active = true,
    deleted_at = null,
    price = case
      when name in ('Empolvados', 'Empolvado') then 1000
      when name in ('Cocada', 'Mantecado') then 500
      else 1500
    end,
    name = case name
      when 'Berlin' then 'Berlín - Crema pastelera'
      when 'Delicias' then 'Delicia'
      when 'Eclair' then 'Eclair - Crema pastelera'
      when 'Profiterol' then 'Profiterol - Crema pastelera'
      when 'Pañuelo' then 'Pañuelo - Crema chantilly'
      when 'Princesa' then 'Princesa - Manjar'
      when 'Donas' then 'Dona - Manjar'
      when 'Empolvados' then 'Empolvado'
      else name
    end,
    updated_at = now()
  where business_id = target_business_id
    and name in (
      'Berlin', 'Delicias', 'Eclair', 'Profiterol', 'Cruzada', 'Pañuelo',
      'Mendozino', 'Princesa', 'Donas', 'Empolvados', 'Empolvado',
      'Mantecado', 'Cocada'
    );

  insert into public.products (
    business_id, category_id, name, price, sale_unit, active,
    family_product_id, is_sales_family, track_daily_availability
  )
  select
    target_business_id, sweets_category_id, desired.name, desired.price,
    'unit'::public.sale_unit, true, sweets_family_id, false, false
  from (values
    ('Berlín - Manjar', 1500::bigint),
    ('Eclair - Crema chantilly', 1500::bigint),
    ('Profiterol - Crema chantilly', 1500::bigint),
    ('Pañuelo - Crema pastelera', 1500::bigint),
    ('Princesa - Pastelera', 1500::bigint),
    ('Cachito', 1500::bigint),
    ('Dona - Pastelera', 1500::bigint),
    ('Mantecado', 500::bigint)
  ) as desired(name, price)
  where not exists (
    select 1 from public.products existing
    where existing.business_id = target_business_id
      and lower(existing.name) = lower(desired.name)
      and existing.deleted_at is null
  );

  update public.products
  set active = false, deleted_at = coalesce(deleted_at, now()), updated_at = now()
  where business_id = target_business_id
    and family_product_id = sweets_family_id
    and name not in (
      'Berlín - Crema pastelera', 'Berlín - Manjar', 'Delicia',
      'Eclair - Crema pastelera', 'Eclair - Crema chantilly',
      'Profiterol - Crema pastelera', 'Profiterol - Crema chantilly',
      'Cruzada', 'Pañuelo - Crema chantilly', 'Pañuelo - Crema pastelera',
      'Mendozino', 'Princesa - Manjar', 'Princesa - Pastelera', 'Cachito',
      'Dona - Manjar', 'Dona - Pastelera', 'Empolvado', 'Mantecado', 'Cocada'
    );

  select id into pastry_category_id
  from public.product_categories
  where business_id = target_business_id and name = 'Tortas/Trozos'
  limit 1;

  if pastry_category_id is null then
    insert into public.product_categories (business_id, name)
    values (target_business_id, 'Tortas/Tartaletas')
    returning id into pastry_category_id;
  else
    update public.product_categories
    set name = 'Tortas/Tartaletas'
    where id = pastry_category_id;
  end if;

  select id into old_tart_category_id
  from public.product_categories
  where business_id = target_business_id and name = 'Tartaletas y Pies'
  limit 1;

  update public.products
  set category_id = pastry_category_id, updated_at = now()
  where business_id = target_business_id
    and category_id = old_tart_category_id;

  update public.products
  set
    name = 'Pie de Limón', price = 2500, active = true, deleted_at = null,
    family_product_id = null, category_id = pastry_category_id, updated_at = now()
  where business_id = target_business_id
    and name = 'Pie de Limon Individual';

  update public.products
  set
    name = 'Tartaleta de Frutilla', price = 2500, active = true,
    deleted_at = null, family_product_id = null,
    category_id = pastry_category_id, updated_at = now()
  where business_id = target_business_id
    and name = 'Tartaleta Fruta';

  update public.products
  set
    price = 2500, active = true, deleted_at = null,
    family_product_id = null, category_id = pastry_category_id, updated_at = now()
  where business_id = target_business_id
    and name = 'Tartaleta de Durazno';

  update public.products
  set name = 'Brazo de Reina', price = 6600, updated_at = now()
  where business_id = target_business_id and name = 'Brazo Reina';

  insert into public.products (
    business_id, category_id, name, price, sale_unit, active,
    is_sales_family, track_daily_availability
  )
  select
    target_business_id, pastry_category_id, desired.name, desired.price,
    'unit'::public.sale_unit, true, false, false
  from (values
    ('Tartaleta de Piña', 2500::bigint),
    ('Tartaleta de Kiwi', 2500::bigint)
  ) as desired(name, price)
  where not exists (
    select 1 from public.products existing
    where existing.business_id = target_business_id
      and lower(existing.name) = lower(desired.name)
      and existing.deleted_at is null
  );

  update public.products
  set active = false, deleted_at = coalesce(deleted_at, now()), updated_at = now()
  where business_id = target_business_id
    and is_sales_family = true
    and name = 'Tartaleta';

  if old_tart_category_id is not null then
    delete from public.product_categories where id = old_tart_category_id;
  end if;

  delete from public.product_categories
  where business_id = target_business_id
    and name = 'Dulces Pequeños'
    and not exists (
      select 1 from public.products
      where category_id = public.product_categories.id
    );
end $$;
