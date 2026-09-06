alter table public.ingredients
  add column inventory_quantity numeric(14,3)
    check (inventory_quantity is null or inventory_quantity >= 0),
  add column inventory_unit text
    check (inventory_unit is null or inventory_unit in ('g', 'kg', 'ml', 'l', 'unit')),
  add column inventory_updated_at timestamptz;

create or replace function public.update_ingredient_inventory(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_item jsonb;
  v_quantity numeric(14,3);
  v_unit text;
  v_base_unit text;
begin
  select business_id into v_business
  from public.business_admins
  where user_id = auth.uid() and active
  limit 1;

  if v_business is null or not private.administers(v_business) then
    raise exception 'Sin autorización';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Listado de inventario inválido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := nullif(v_item->>'quantity', '')::numeric;
    v_unit := nullif(v_item->>'unit', '');

    if v_quantity is not null and v_quantity < 0 then
      raise exception 'El stock no puede ser negativo';
    end if;

    select base_unit into v_base_unit
    from public.ingredients
    where id = (v_item->>'ingredient_id')::uuid
      and business_id = v_business
      and deleted_at is null;

    if v_base_unit is null then
      raise exception 'Materia prima no disponible';
    end if;
    if v_quantity is not null and (
      (v_base_unit = 'g' and v_unit not in ('g', 'kg')) or
      (v_base_unit = 'ml' and v_unit not in ('ml', 'l')) or
      (v_base_unit = 'unit' and v_unit <> 'unit')
    ) then
      raise exception 'Unidad de inventario incompatible';
    end if;

    update public.ingredients
    set inventory_quantity = v_quantity,
        inventory_unit = case when v_quantity is null then null else v_unit end,
        inventory_updated_at = now(),
        updated_at = now()
    where id = (v_item->>'ingredient_id')::uuid
      and business_id = v_business
      and deleted_at is null;
  end loop;
end
$$;

revoke all on function public.update_ingredient_inventory(jsonb) from public, anon;
grant execute on function public.update_ingredient_inventory(jsonb) to authenticated;
