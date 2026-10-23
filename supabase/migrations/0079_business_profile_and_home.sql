alter table public.businesses
  add column if not exists legal_name text,
  add column if not exists business_activity text,
  add column if not exists address text,
  add column if not exists commune text,
  add column if not exists city text,
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists updated_at timestamptz not null default now();

update public.businesses
set legal_name = coalesce(legal_name, 'GOYA SPA'),
    business_activity = coalesce(
      business_activity,
      'Elaboración y venta de pan, bollería, dulces y empanadas.'
    ),
    address = coalesce(address, 'R RENARD 1525 AVDA OSSA 2'),
    commune = coalesce(commune, 'ÑUÑOA'),
    city = coalesce(city, 'Santiago'),
    updated_at = now()
where replace(replace(upper(coalesce(rut, '')), '.', ''), '-', '') = '78460151K';

drop policy if exists "business admin update" on public.businesses;
create policy "business admin update"
  on public.businesses for update to authenticated
  using (private.administers(id))
  with check (private.administers(id));

grant update (
  name, rut, legal_name, business_activity, address, commune, city,
  contact_email, phone, currency, timezone, updated_at
) on public.businesses to authenticated;

comment on column public.businesses.name is 'Nombre comercial visible en el ERP.';
comment on column public.businesses.legal_name is 'Razón social del contribuyente.';
comment on column public.businesses.business_activity is 'Giro o actividad comercial visible en documentos.';
