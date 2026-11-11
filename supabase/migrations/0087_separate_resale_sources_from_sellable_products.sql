alter table public.ingredients
  add column if not exists source_type text not null default 'raw';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ingredients_source_type_check'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_source_type_check
      check (source_type in ('raw', 'supply', 'resale')) not valid;
  end if;
end $$;

update public.ingredients
set source_type = 'supply'
where source_type = 'raw'
  and (
    category = 'Empaques'
    or name ~* '(envase|vaso|tapa|bolsa|servilleta|sachet|bombilla)'
  );

alter table public.ingredients validate constraint ingredients_source_type_check;

alter table public.products
  add column if not exists resale_source_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_resale_source_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_resale_source_id_fkey
      foreign key (resale_source_id) references public.ingredients(id) not valid;
  end if;
end $$;

alter table public.products validate constraint products_resale_source_id_fkey;

create index if not exists products_resale_source_idx
  on public.products (business_id, resale_source_id)
  where resale_source_id is not null;

do $$
declare
  product_row record;
  source_id uuid;
  source_name text;
  creator_id uuid;
  gross_value bigint;
  net_value bigint;
  tax_value bigint;
  tax_rate_value numeric;
begin
  for product_row in
    select id, business_id, name, resale_purchase_gross_amount,
           resale_units_per_purchase, coalesce(resale_tax_rate, 19) as resale_tax_rate
    from public.products
    where product_type = 'resale'
      and resale_source_id is null
      and deleted_at is null
  loop
    select id into source_id
    from public.ingredients
    where business_id = product_row.business_id
      and lower(name) = lower(product_row.name)
      and source_type = 'resale'
      and deleted_at is null
    limit 1;

    if source_id is null then
      source_name := product_row.name;
      if exists (
        select 1 from public.ingredients
        where business_id = product_row.business_id
          and lower(name) = lower(source_name)
          and deleted_at is null
      ) then
        source_name := product_row.name || ' · compra para reventa';
      end if;
      if exists (
        select 1 from public.ingredients
        where business_id = product_row.business_id
          and lower(name) = lower(source_name)
          and deleted_at is null
      ) then
        source_name := product_row.name || ' · reventa ' || left(product_row.id::text, 8);
      end if;

      insert into public.ingredients (
        business_id, name, category, base_unit, notes, source_type
      ) values (
        product_row.business_id, source_name, 'Reventa', 'unit',
        'Fuente de compra creada desde el costeo histórico del producto.', 'resale'
      ) returning id into source_id;
    end if;

    gross_value := product_row.resale_purchase_gross_amount;
    tax_rate_value := product_row.resale_tax_rate;
    if gross_value is not null
       and gross_value > 0
       and product_row.resale_units_per_purchase is not null
       and product_row.resale_units_per_purchase > 0
       and not exists (
         select 1 from public.ingredient_prices where ingredient_id = source_id
       ) then
      select user_id into creator_id
      from public.business_admins
      where business_id = product_row.business_id and active = true
      order by created_at
      limit 1;

      if creator_id is not null then
        net_value := round(gross_value / (1 + tax_rate_value / 100));
        tax_value := gross_value - net_value;
        insert into public.ingredient_prices (
          business_id, ingredient_id, purchase_quantity, purchase_unit,
          base_quantity, gross_amount, net_amount, tax_amount, tax_rate,
          purchase_date, confirmed, created_by
        ) values (
          product_row.business_id, source_id,
          product_row.resale_units_per_purchase, 'unit',
          product_row.resale_units_per_purchase, gross_value, net_value,
          tax_value, tax_rate_value, current_date, true, creator_id
        );
      end if;
    end if;

    update public.products
    set resale_source_id = source_id
    where id = product_row.id and business_id = product_row.business_id;
  end loop;
end $$;

comment on column public.ingredients.source_type is
  'raw: materia prima; supply: envase u otro insumo; resale: compra lista para revender.';
comment on column public.products.resale_source_id is
  'Fuente de compra independiente usada para costear un producto vendible de reventa.';
