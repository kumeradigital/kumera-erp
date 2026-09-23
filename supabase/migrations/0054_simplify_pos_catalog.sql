do $$
declare
  v_business constant uuid := '83ca329e-f6de-4d00-9156-8197b485a5e4';
  v_dulces_category uuid;
  v_galletas_category uuid;
  v_packaged_bread_category uuid;
  v_tartaletas_category uuid;
  v_otros_category uuid;
  v_dulce_family uuid;
  v_galletas_family uuid;
  v_tartaleta_family uuid;
begin
  insert into public.product_categories (business_id, name, position, active)
  values
    (v_business, 'Dulces', 10, true),
    (v_business, 'Galletas', 20, true),
    (v_business, 'Pan envasado', 30, true)
  on conflict (business_id, name) do update
    set active = true,
        position = excluded.position;

  select id into v_dulces_category
  from public.product_categories
  where business_id = v_business and name = 'Dulces';

  select id into v_galletas_category
  from public.product_categories
  where business_id = v_business and name = 'Galletas';

  select id into v_packaged_bread_category
  from public.product_categories
  where business_id = v_business and name = 'Pan envasado';

  select id into v_tartaletas_category
  from public.product_categories
  where business_id = v_business and name = 'Tartaletas y Pies';

  select id into v_otros_category
  from public.product_categories
  where business_id = v_business and name = 'Otros';

  insert into public.products (
    business_id, category_id, name, description, price, sale_unit,
    active, position, is_sales_family
  )
  values (
    v_business, v_dulces_category, 'Dulce',
    'Botón simplificado para dulces de precio estándar.',
    1500, 'unit', true, 0, true
  )
  on conflict (business_id, name) do update
    set category_id = excluded.category_id,
        description = excluded.description,
        price = excluded.price,
        sale_unit = excluded.sale_unit,
        active = true,
        deleted_at = null,
        is_sales_family = true,
        family_product_id = null,
        updated_at = now()
  returning id into v_dulce_family;

  insert into public.products (
    business_id, category_id, name, description, price, sale_unit,
    active, position, is_sales_family
  )
  values (
    v_business, v_galletas_category, 'Galletas',
    'Botón simplificado para galletas vendidas por peso.',
    14000, 'kg', true, 0, true
  )
  on conflict (business_id, name) do update
    set category_id = excluded.category_id,
        description = excluded.description,
        price = excluded.price,
        sale_unit = excluded.sale_unit,
        active = true,
        deleted_at = null,
        is_sales_family = true,
        family_product_id = null,
        updated_at = now()
  returning id into v_galletas_family;

  insert into public.products (
    business_id, category_id, name, description, price, sale_unit,
    active, position, is_sales_family
  )
  values (
    v_business, v_tartaletas_category, 'Tartaleta',
    'Botón simplificado para tartaletas y pies individuales.',
    2500, 'unit', true, 0, true
  )
  on conflict (business_id, name) do update
    set category_id = excluded.category_id,
        description = excluded.description,
        price = excluded.price,
        sale_unit = excluded.sale_unit,
        active = true,
        deleted_at = null,
        is_sales_family = true,
        family_product_id = null,
        updated_at = now()
  returning id into v_tartaleta_family;

  update public.products
  set family_product_id = v_dulce_family,
      category_id = v_dulces_category,
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and active
    and not is_sales_family
    and sale_unit = 'unit'
    and price = 1500
    and name in (
      'Berlin', 'Cruzada', 'Delicias', 'Donas', 'Mendozino',
      'Pañuelo', 'Princesa', 'Profiterol', 'Queue', 'Rosita Arandano'
    );

  update public.products
  set family_product_id = v_galletas_family,
      category_id = v_galletas_category,
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and active
    and not is_sales_family
    and sale_unit = 'kg'
    and price = 14000
    and name in ('Galleta Mantequilla', 'Galletas finas');

  update public.products
  set family_product_id = v_tartaleta_family,
      category_id = v_tartaletas_category,
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and active
    and not is_sales_family
    and sale_unit = 'unit'
    and price = 2500
    and name in ('Pie de Limon Individual');

  update public.products
  set category_id = v_packaged_bread_category,
      family_product_id = null,
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and name in ('Pan Integral', 'Pan Frica', 'Pan Hot Dog', 'Pan Completo');

  update public.products
  set name = 'Pan Completo',
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and name = 'Pan Hot Dog'
    and not exists (
      select 1
      from public.products existing
      where existing.business_id = v_business
        and existing.name = 'Pan Completo'
        and existing.id <> products.id
    );

  update public.products
  set category_id = v_otros_category,
      family_product_id = null,
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and name in ('Cocada', 'Trenza', 'Brazo Reina');
end
$$;
