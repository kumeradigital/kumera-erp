update public.ingredients
set inventory_unit = 'unit'
where inventory_quantity is not null;

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

    if v_quantity is not null and (v_quantity < 0 or v_quantity <> trunc(v_quantity)) then
      raise exception 'La cantidad debe ser un número entero igual o mayor que cero';
    end if;

    if not exists (
      select 1
      from public.ingredients
      where id = (v_item->>'ingredient_id')::uuid
        and business_id = v_business
        and deleted_at is null
    ) then
      raise exception 'Materia prima no disponible';
    end if;

    update public.ingredients
    set inventory_quantity = v_quantity,
        inventory_unit = case when v_quantity is null then null else 'unit' end,
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
