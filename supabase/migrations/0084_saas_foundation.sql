-- SaaS foundation for ERP KUMERA.
-- This migration is deliberately additive and idempotent. It never deletes,
-- renames or replaces operational data. The existing business_admins model
-- remains supported while the application migrates to memberships.

create table if not exists public.saas_modules (
  key text primary key check (key in ('core','costing','inventory','finance','pos','sales','production','payroll')),
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.saas_plans (
  key text primary key,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_plan_modules (
  plan_key text not null references public.saas_plans(key),
  module_key text not null references public.saas_modules(key),
  created_at timestamptz not null default now(),
  primary key (plan_key, module_key)
);

create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  plan_key text not null references public.saas_plans(key),
  status text not null default 'provisioned'
    check (status in ('provisioned','trial','active','suspended','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create table if not exists public.business_module_overrides (
  business_id uuid not null references public.businesses(id),
  module_key text not null references public.saas_modules(key),
  enabled boolean not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, module_key)
);

create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null,
  address text,
  commune text,
  city text,
  timezone text not null default 'America/Santiago',
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);
create unique index if not exists one_primary_location_per_business
  on public.business_locations (business_id) where is_primary;

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  user_id uuid not null references public.profiles(id),
  role text not null default 'viewer'
    check (role in ('owner','admin','cashier','viewer')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.membership_location_access (
  membership_id uuid not null references public.business_memberships(id),
  location_id uuid not null references public.business_locations(id),
  created_at timestamptz not null default now(),
  primary key (membership_id, location_id)
);

create table if not exists public.business_onboarding (
  business_id uuid primary key references public.businesses(id),
  version integer not null default 1,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','minimum_complete','complete')),
  current_step text not null default 'password',
  completed_steps text[] not null default '{}',
  business_model text[] not null default '{}',
  sales_channels text[] not null default '{}',
  payment_methods text[] not null default '{}',
  minimum_completed_at timestamptz,
  completed_at timestamptz,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.saas_modules (key, name, position) values
  ('core','Nucleo',0), ('costing','Costeo',10),
  ('inventory','Inventario',20), ('finance','Finanzas',30),
  ('pos','Caja',40), ('sales','Ventas',50),
  ('production','Produccion',60), ('payroll','Personas',70)
on conflict (key) do update set name=excluded.name, position=excluded.position;

insert into public.saas_plans (key,name,description) values
  ('costs','Kumera Costos','Costeo para productos elaborados y de reventa'),
  ('management','Kumera Gestion','Costeo, inventario y finanzas'),
  ('operations','Kumera Operacion','Gestion, caja, ventas y produccion')
on conflict (key) do update set name=excluded.name, description=excluded.description;

insert into public.saas_plan_modules (plan_key,module_key) values
  ('costs','core'),('costs','costing'),
  ('management','core'),('management','costing'),('management','inventory'),('management','finance'),
  ('operations','core'),('operations','costing'),('operations','inventory'),('operations','finance'),
  ('operations','pos'),('operations','sales'),('operations','production')
on conflict do nothing;

-- Preserve every existing administrator as an owner. No existing row changes.
insert into public.business_memberships (business_id,user_id,role,active,invited_by)
select ba.business_id, ba.user_id, 'owner', ba.active, ba.assigned_by
from public.business_admins ba
on conflict (business_id,user_id) do nothing;

-- Every existing business receives one primary location without changing its id.
insert into public.business_locations
  (business_id,name,address,commune,city,timezone,is_primary)
select b.id, 'Local principal', b.address, b.commune, b.city, b.timezone, true
from public.businesses b
where not exists (
  select 1 from public.business_locations bl
  where bl.business_id=b.id and bl.is_primary
)
on conflict do nothing;

-- Existing businesses retain the complete ERP. New beta businesses are
-- provisioned explicitly by the superadmin console with the contracted plan.
insert into public.business_subscriptions (business_id,plan_key,status,notes)
select b.id, 'operations', 'active', 'Migracion segura: capacidades existentes preservadas'
from public.businesses b
on conflict (business_id) do nothing;

insert into public.business_module_overrides (business_id,module_key,enabled,reason)
select b.id, 'payroll', true, 'Migracion segura: modulo existente preservado'
from public.businesses b
on conflict (business_id,module_key) do nothing;

-- Existing businesses bypass first-run onboarding, preventing disruption.
insert into public.business_onboarding
  (business_id,status,current_step,completed_steps,business_model,minimum_completed_at,completed_at)
select b.id, 'complete', 'complete',
  array['password','business','location','operations','channels','first_product'],
  array['resale','manufactured'], now(), now()
from public.businesses b
on conflict (business_id) do nothing;

-- Product classification is nullable during the compatibility period. Existing
-- recipe-linked products are manufactured; the rest are left unclassified for review.
alter table public.products add column if not exists product_type text;
alter table public.products add column if not exists resale_purchase_quantity numeric(14,4);
alter table public.products add column if not exists resale_purchase_unit text;
alter table public.products add column if not exists resale_purchase_gross_amount bigint;
alter table public.products add column if not exists resale_units_per_purchase numeric(14,4);
alter table public.products add column if not exists resale_waste_percentage numeric(7,4) default 0;
alter table public.products add column if not exists resale_tax_rate numeric(7,4) default 19;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='products_product_type_check'
      and conrelid='public.products'::regclass
  ) then
    alter table public.products add constraint products_product_type_check
      check (product_type is null or product_type in ('resale','manufactured','mixed')) not valid;
  end if;
end $$;

update public.products p set product_type='manufactured'
where product_type is null and exists (
  select 1 from public.recipes r where r.id=p.cost_recipe_id and r.deleted_at is null
);

-- Location columns are nullable by design until every workflow is location-aware.
do $$
declare target_table text;
begin
  foreach target_table in array array[
    'cash_sessions','sales','cash_session_product_availability',
    'cash_session_product_waste','cash_session_product_carryover',
    'cash_session_production_batches','delivery_orders','inventory_supplies'
  ] loop
    if to_regclass('public.' || target_table) is not null then
      execute format('alter table public.%I add column if not exists location_id uuid references public.business_locations(id)',target_table);
      execute format(
        'update public.%I as target set location_id=loc.id from public.business_locations loc where target.location_id is null and loc.business_id=target.business_id and loc.is_primary',
        target_table
      );
    end if;
  end loop;
end $$;

create or replace function private.is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.business_memberships
    where business_id=target_business and user_id=(select auth.uid()) and active
  ) or private.administers(target_business)
$$;

create or replace function private.has_business_role(target_business uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path=public as $$
  select private.is_superadmin() or exists(
    select 1 from public.business_memberships
    where business_id=target_business and user_id=(select auth.uid())
      and active and role=any(allowed_roles)
  )
$$;

create or replace function private.has_module(target_business uuid, target_module text)
returns boolean language sql stable security definer set search_path=public as $$
  select private.is_superadmin() or (
    private.is_business_member(target_business)
    and coalesce(
      (select enabled from public.business_module_overrides
       where business_id=target_business and module_key=target_module),
      exists(
        select 1 from public.business_subscriptions s
        join public.saas_plan_modules pm on pm.plan_key=s.plan_key
        where s.business_id=target_business
          and s.status in ('provisioned','trial','active')
          and pm.module_key=target_module
      )
    )
  )
$$;

revoke all on function private.is_business_member(uuid) from public,anon;
revoke all on function private.has_business_role(uuid,text[]) from public,anon;
revoke all on function private.has_module(uuid,text) from public,anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid,text[]) to authenticated;
grant execute on function private.has_module(uuid,text) to authenticated;

alter table public.saas_modules enable row level security;
alter table public.saas_plans enable row level security;
alter table public.saas_plan_modules enable row level security;
alter table public.business_subscriptions enable row level security;
alter table public.business_module_overrides enable row level security;
alter table public.business_locations enable row level security;
alter table public.business_memberships enable row level security;
alter table public.membership_location_access enable row level security;
alter table public.business_onboarding enable row level security;

drop policy if exists "authenticated reads modules" on public.saas_modules;
create policy "authenticated reads modules" on public.saas_modules for select to authenticated using (true);
drop policy if exists "authenticated reads plans" on public.saas_plans;
create policy "authenticated reads plans" on public.saas_plans for select to authenticated using (true);
drop policy if exists "authenticated reads plan modules" on public.saas_plan_modules;
create policy "authenticated reads plan modules" on public.saas_plan_modules for select to authenticated using (true);

drop policy if exists "member reads subscription" on public.business_subscriptions;
create policy "member reads subscription" on public.business_subscriptions for select to authenticated
  using (private.is_business_member(business_id));
drop policy if exists "superadmin manages subscriptions" on public.business_subscriptions;
create policy "superadmin manages subscriptions" on public.business_subscriptions for all to authenticated
  using (private.is_superadmin()) with check (private.is_superadmin());

drop policy if exists "member reads module overrides" on public.business_module_overrides;
create policy "member reads module overrides" on public.business_module_overrides for select to authenticated
  using (private.is_business_member(business_id));
drop policy if exists "superadmin manages module overrides" on public.business_module_overrides;
create policy "superadmin manages module overrides" on public.business_module_overrides for all to authenticated
  using (private.is_superadmin()) with check (private.is_superadmin());

drop policy if exists "member accesses locations" on public.business_locations;
create policy "member accesses locations" on public.business_locations for select to authenticated
  using (private.is_business_member(business_id));
drop policy if exists "admins manage locations" on public.business_locations;
create policy "admins manage locations" on public.business_locations for all to authenticated
  using (private.has_business_role(business_id,array['owner','admin']))
  with check (private.has_business_role(business_id,array['owner','admin']));

drop policy if exists "member reads memberships" on public.business_memberships;
create policy "member reads memberships" on public.business_memberships for select to authenticated
  using (private.is_business_member(business_id));
drop policy if exists "admins manage memberships" on public.business_memberships;
create policy "admins manage memberships" on public.business_memberships for all to authenticated
  using (private.has_business_role(business_id,array['owner','admin']) or private.is_superadmin())
  with check (private.has_business_role(business_id,array['owner','admin']) or private.is_superadmin());

drop policy if exists "membership location access" on public.membership_location_access;
create policy "membership location access" on public.membership_location_access for select to authenticated
  using (exists(select 1 from public.business_memberships bm where bm.id=membership_id and private.is_business_member(bm.business_id)));

drop policy if exists "member reads onboarding" on public.business_onboarding;
create policy "member reads onboarding" on public.business_onboarding for select to authenticated
  using (private.is_business_member(business_id));
drop policy if exists "admins manage onboarding" on public.business_onboarding;
create policy "admins manage onboarding" on public.business_onboarding for all to authenticated
  using (private.has_business_role(business_id,array['owner','admin']))
  with check (private.has_business_role(business_id,array['owner','admin']));

grant select on public.saas_modules,public.saas_plans,public.saas_plan_modules to authenticated;
grant select on public.business_subscriptions,public.business_module_overrides to authenticated;
grant select,insert,update on public.business_locations,public.business_memberships,public.business_onboarding to authenticated;
grant select on public.membership_location_access to authenticated;
grant select,insert,update,delete on public.business_subscriptions,public.business_module_overrides to authenticated;

-- Restrictive entitlement policies complement (and do not replace) the legacy
-- tenant policies. Existing businesses have every module, so their access is unchanged.
do $$
declare item record;
begin
  for item in select * from (values
    ('ingredients','costing'),('ingredient_prices','costing'),('recipes','costing'),
    ('recipe_items','costing'),('cost_settings','costing'),('fixed_costs','costing'),
    ('sales_scenarios','costing'),('sales_scenario_items','costing'),
    ('inventory_supplies','inventory'),('inventory_providers','inventory'),
    ('operational_transactions','finance'),('financial_obligations','finance'),
    ('expense_provisions','finance'),('financial_cutoffs','finance'),
    ('cash_sessions','pos'),('cash_session_withdrawals','pos'),
    ('cash_session_product_availability','production'),('cash_session_product_waste','production'),
    ('cash_session_product_carryover','production'),('cash_session_production_batches','production'),
    ('delivery_orders','production'),('employees','payroll'),('payroll_slips','payroll')
  ) as rules(table_name,module_key)
  loop
    if to_regclass('public.' || item.table_name) is not null then
      execute format('drop policy if exists %I on public.%I', 'module entitlement ' || item.module_key, item.table_name);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using (private.has_module(business_id,%L)) with check (private.has_module(business_id,%L))',
        'module entitlement ' || item.module_key, item.table_name, item.module_key, item.module_key
      );
    end if;
  end loop;
end $$;

drop policy if exists "product module entitlement" on public.products;
create policy "product module entitlement" on public.products as restrictive for all to authenticated
  using (private.has_module(business_id,'costing') or private.has_module(business_id,'pos'))
  with check (private.has_module(business_id,'costing') or private.has_module(business_id,'pos'));
drop policy if exists "category module entitlement" on public.product_categories;
create policy "category module entitlement" on public.product_categories as restrictive for all to authenticated
  using (private.has_module(business_id,'costing') or private.has_module(business_id,'pos'))
  with check (private.has_module(business_id,'costing') or private.has_module(business_id,'pos'));
drop policy if exists "sales module entitlement" on public.sales;
create policy "sales module entitlement" on public.sales as restrictive for all to authenticated
  using (private.has_module(business_id,'sales') or private.has_module(business_id,'pos'))
  with check (private.has_module(business_id,'sales') or private.has_module(business_id,'pos'));

create or replace function public.provision_beta_business(
  p_user_id uuid, p_email text, p_display_name text,
  p_business_name text, p_legal_name text, p_rut text, p_plan_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_business uuid; v_actor uuid := auth.uid();
begin
  if not private.is_superadmin() then raise exception 'Sin autorizacion'; end if;
  if p_plan_key not in ('costs','management','operations') then raise exception 'Plan invalido'; end if;
  insert into public.profiles(id,email,display_name,active)
    values(p_user_id,lower(trim(p_email)),trim(p_display_name),true)
    on conflict(id) do update set display_name=excluded.display_name,active=true;
  insert into public.businesses(name,legal_name,rut,currency,timezone)
    values(trim(p_business_name),nullif(trim(p_legal_name),''),nullif(upper(trim(p_rut)),''),'CLP','America/Santiago')
    returning id into v_business;
  insert into public.business_admins(business_id,user_id,assigned_by)
    values(v_business,p_user_id,v_actor);
  insert into public.business_memberships(business_id,user_id,role,must_change_password,invited_by)
    values(v_business,p_user_id,'owner',true,v_actor);
  insert into public.business_locations(business_id,name,timezone,is_primary)
    values(v_business,'Local principal','America/Santiago',true);
  insert into public.business_subscriptions(business_id,plan_key,status,notes)
    values(v_business,p_plan_key,'trial','Beta administrada por Kumera');
  insert into public.business_onboarding(business_id,status,current_step,updated_by)
    values(v_business,'not_started','password',p_user_id);
  return v_business;
end $$;
revoke all on function public.provision_beta_business(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.provision_beta_business(uuid,text,text,text,text,text,text) to authenticated;

comment on table public.business_locations is 'Locales del negocio. La migracion crea uno sin alterar la identidad de la empresa.';
comment on table public.business_onboarding is 'Progreso versionado y reanudable de configuracion inicial.';
comment on column public.products.product_type is 'resale, manufactured o mixed; nullable durante migracion segura.';
