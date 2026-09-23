do $$
declare
  v_business constant uuid := '83ca329e-f6de-4d00-9156-8197b485a5e4';
  v_small_sweets_category uuid;
  v_cakes_category uuid;
  v_others_category uuid;
begin
  insert into public.product_categories (business_id, name, position, active)
  values
    (v_business, 'Dulces Pequeños', 40, true),
    (v_business, 'Tortas/Trozos', 50, true)
  on conflict (business_id, name) do update
    set active = true,
        position = excluded.position;

  select id into v_small_sweets_category
  from public.product_categories
  where business_id = v_business and name = 'Dulces Pequeños';

  select id into v_cakes_category
  from public.product_categories
  where business_id = v_business and name = 'Tortas/Trozos';

  select id into v_others_category
  from public.product_categories
  where business_id = v_business and name = 'Otros';

  update public.products
  set category_id = v_small_sweets_category,
      family_product_id = null,
      active = true,
      deleted_at = null,
      updated_at = now()
  where business_id = v_business
    and name in ('Cocada', 'Cocada bañada Chocolate', 'Empolvados');

  update public.products
  set category_id = v_cakes_category,
      family_product_id = null,
      active = true,
      deleted_at = null,
      updated_at = now()
  where business_id = v_business
    and name in ('Brazo Reina', 'Trozo brazo reina', 'Manzana K', 'Strudel Manzana');

  update public.products
  set name = 'Strudel Manzana',
      updated_at = now()
  where business_id = v_business
    and name = 'Manzana K'
    and not exists (
      select 1
      from public.products existing
      where existing.business_id = v_business
        and existing.name = 'Strudel Manzana'
        and existing.id <> products.id
    );

  update public.products
  set category_id = v_others_category,
      price = 10990,
      family_product_id = null,
      active = true,
      deleted_at = null,
      updated_at = now()
  where business_id = v_business
    and name = 'mermelada de higo';

  update public.products
  set active = false,
      updated_at = now()
  where business_id = v_business
    and deleted_at is null
    and category_id = v_others_category
    and name <> 'mermelada de higo';
end
$$;
