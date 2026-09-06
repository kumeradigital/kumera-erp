create table public.inventory_supplies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  category text not null check (category in ('Aseo', 'Embalaje', 'Papelería', 'Mantención', 'Otros')),
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  inventory_supplier text check (
    inventory_supplier is null or
    inventory_supplier in (
      'Vanni',
      'Mayorista Central',
      'Distribuidora Ja',
      'Marcelo',
      'La Oferta'
    )
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index inventory_supplies_business_name_active_idx
  on public.inventory_supplies (business_id, lower(trim(name)))
  where archived_at is null;

create index inventory_supplies_business_supplier_idx
  on public.inventory_supplies (business_id, inventory_supplier, name)
  where archived_at is null;

alter table public.inventory_supplies enable row level security;

create policy "inventory supply access"
  on public.inventory_supplies
  for all
  to authenticated
  using (private.administers(business_id))
  with check (private.administers(business_id));

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
  v_supplier text;
  v_item_type text;
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
    v_supplier := nullif(v_item->>'supplier', '');
    v_item_type := coalesce(nullif(v_item->>'item_type', ''), 'ingredient');

    if v_quantity is not null and (v_quantity < 0 or v_quantity <> trunc(v_quantity)) then
      raise exception 'La cantidad debe ser un número entero igual o mayor que cero';
    end if;

    if v_supplier is not null and v_supplier not in (
      'Vanni', 'Mayorista Central', 'Distribuidora Ja', 'Marcelo', 'La Oferta'
    ) then
      raise exception 'Proveedor no válido';
    end if;

    if v_item_type = 'ingredient' then
      update public.ingredients
      set inventory_quantity = v_quantity,
          inventory_unit = case when v_quantity is null then null else 'unit' end,
          inventory_supplier = v_supplier,
          inventory_updated_at = now(),
          updated_at = now()
      where id = (v_item->>'ingredient_id')::uuid
        and business_id = v_business
        and deleted_at is null;
    elsif v_item_type = 'supply' then
      update public.inventory_supplies
      set inventory_quantity = coalesce(v_quantity, 0)::integer,
          inventory_supplier = v_supplier,
          updated_at = now()
      where id = (v_item->>'ingredient_id')::uuid
        and business_id = v_business
        and archived_at is null;
    else
      raise exception 'Tipo de artículo no válido';
    end if;

    if not found then
      raise exception 'Artículo de inventario no disponible';
    end if;
  end loop;
end
$$;

revoke all on function public.update_ingredient_inventory(jsonb) from public, anon;
grant execute on function public.update_ingredient_inventory(jsonb) to authenticated;
