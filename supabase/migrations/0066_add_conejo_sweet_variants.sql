do $$
declare
  target_business_id uuid;
  sweets_category_id uuid;
  sweets_family_id uuid;
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
    and sell_members_individually = true
    and name = 'Dulces'
  limit 1;

  if target_business_id is null or sweets_family_id is null then
    raise exception 'No se encontró el grupo de caja Dulces';
  end if;

  insert into public.products (
    business_id,
    category_id,
    name,
    price,
    sale_unit,
    active,
    family_product_id,
    is_sales_family,
    track_daily_availability
  )
  select
    target_business_id,
    sweets_category_id,
    desired.name,
    1500,
    'unit'::public.sale_unit,
    true,
    sweets_family_id,
    false,
    false
  from (values
    ('Conejo - Manjar'),
    ('Conejo - Pastelera')
  ) as desired(name)
  where not exists (
    select 1
    from public.products existing
    where existing.business_id = target_business_id
      and lower(existing.name) = lower(desired.name)
      and existing.deleted_at is null
  );
end $$;
