-- ERP KUMERA | Esquema consolidado 2026-07-14.4
-- Para un proyecto Supabase VACÍO. En bases existentes use las migraciones incrementales.
begin;

create type public.entry_status as enum ('active','void');
create type public.entry_type as enum ('initial_capital','income','expense','asset','deposit','refund');
create type public.tax_mode as enum ('included','added','exempt');

create table public.businesses (
  id uuid primary key default gen_random_uuid(), name text not null, rut text,
  currency text not null default 'CLP', timezone text not null default 'America/Santiago',
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id), email text not null, display_name text,
  is_superadmin boolean not null default false, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.business_admins (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  user_id uuid not null references public.profiles(id), assigned_by uuid references public.profiles(id),
  active boolean not null default true, created_at timestamptz not null default now(),
  constraint one_active_membership unique (business_id,user_id)
);
create table public.opening_ledgers (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  name text not null default 'Apertura', created_at timestamptz not null default now()
);
create unique index opening_ledger_business_idx on public.opening_ledgers(business_id);
create table public.categories (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  name text not null, position integer not null default 0, active boolean not null default true,
  constraint unique_business_category unique (business_id,name)
);
create table public.opening_entries (
  id uuid primary key default gen_random_uuid(), ledger_id uuid not null references public.opening_ledgers(id),
  business_id uuid not null references public.businesses(id), entry_date date not null,
  description text not null check (char_length(trim(description)) between 1 and 160),
  category_id uuid references public.categories(id), type public.entry_type not null default 'expense',
  tax_mode public.tax_mode not null default 'included', tax_rate integer not null default 19 check (tax_rate between 0 and 100),
  net_amount bigint not null check (net_amount >= 0), tax_amount bigint not null check (tax_amount >= 0),
  total_amount bigint not null check (total_amount > 0 and net_amount + tax_amount = total_amount),
  note text check (note is null or char_length(note) <= 500), estimated boolean not null default false,
  status public.entry_status not null default 'active', void_reason text,
  created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index opening_entries_business_date_idx on public.opening_entries(business_id,entry_date desc);
create index opening_entries_ledger_idx on public.opening_entries(ledger_id);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  entry_id uuid not null references public.opening_entries(id), storage_path text not null unique,
  file_name text not null, mime_type text not null, size bigint not null check (size > 0),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.entry_change_log (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  entry_id uuid not null references public.opening_entries(id), actor_id uuid not null references public.profiles(id),
  before jsonb, after jsonb, action text not null, created_at timestamptz not null default now()
);
create table public.role_change_log (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  target_user_id uuid not null references public.profiles(id), actor_id uuid not null references public.profiles(id),
  action text not null, created_at timestamptz not null default now()
);

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path=public
as $$ select coalesce((select is_superadmin and active from profiles where id=auth.uid()),false) $$;
create or replace function public.administers(target_business uuid) returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from business_admins where business_id=target_business and user_id=auth.uid() and active) $$;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_admins enable row level security;
alter table public.opening_ledgers enable row level security;
alter table public.categories enable row level security;
alter table public.opening_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.entry_change_log enable row level security;
alter table public.role_change_log enable row level security;

create policy "business access" on public.businesses for select using (administers(id) or is_superadmin());
create policy "profile self or superadmin" on public.profiles for select using (id=auth.uid() or is_superadmin());
create policy "superadmin manages profiles" on public.profiles for update using (is_superadmin()) with check (is_superadmin());
create policy "membership access" on public.business_admins for select using (user_id=auth.uid() or is_superadmin());
create policy "superadmin manages memberships" on public.business_admins for all using (is_superadmin()) with check (is_superadmin());
create policy "ledger access" on public.opening_ledgers for all using (administers(business_id)) with check (administers(business_id));
create policy "category access" on public.categories for all using (administers(business_id)) with check (administers(business_id));
create policy "entry access" on public.opening_entries for all using (administers(business_id)) with check (administers(business_id));
create policy "attachment access" on public.attachments for all using (administers(business_id)) with check (administers(business_id));
create policy "entry audit read" on public.entry_change_log for select using (administers(business_id));
create policy "entry audit insert" on public.entry_change_log for insert with check (administers(business_id) and actor_id=auth.uid());
create policy "role audit access" on public.role_change_log for select using (is_superadmin());
create policy "role audit insert" on public.role_change_log for insert with check (is_superadmin() and actor_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('receipts','receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy "receipt select" on storage.objects for select using (bucket_id='receipts' and administers(((storage.foldername(name))[1])::uuid));
create policy "receipt insert" on storage.objects for insert with check (bucket_id='receipts' and administers(((storage.foldername(name))[1])::uuid));
create policy "receipt delete" on storage.objects for delete using (bucket_id='receipts' and administers(((storage.foldername(name))[1])::uuid));

-- Helpers privados: evitan exponer funciones security-definer mediante la Data API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_superadmin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce((select is_superadmin and active from public.profiles where id=(select auth.uid())),false) $$;
create or replace function private.administers(target_business uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.business_admins where business_id=target_business and user_id=(select auth.uid()) and active) $$;
revoke all on function public.is_superadmin() from public,anon,authenticated;
revoke all on function public.administers(uuid) from public,anon,authenticated;
grant execute on function private.is_superadmin() to authenticated;
grant execute on function private.administers(uuid) to authenticated;
alter policy "business access" on public.businesses using (private.administers(id) or private.is_superadmin());
alter policy "profile self or superadmin" on public.profiles using (id=(select auth.uid()) or private.is_superadmin());
alter policy "superadmin manages profiles" on public.profiles using (private.is_superadmin()) with check (private.is_superadmin());
alter policy "membership access" on public.business_admins using (user_id=(select auth.uid()) or private.is_superadmin());
alter policy "superadmin manages memberships" on public.business_admins using (private.is_superadmin()) with check (private.is_superadmin());
alter policy "ledger access" on public.opening_ledgers using (private.administers(business_id)) with check (private.administers(business_id));
alter policy "category access" on public.categories using (private.administers(business_id)) with check (private.administers(business_id));
alter policy "entry access" on public.opening_entries using (private.administers(business_id)) with check (private.administers(business_id));
alter policy "attachment access" on public.attachments using (private.administers(business_id)) with check (private.administers(business_id));
drop policy "receipt select" on storage.objects; drop policy "receipt insert" on storage.objects; drop policy "receipt delete" on storage.objects;
create policy "receipt select" on storage.objects for select to authenticated using (bucket_id='receipts' and private.administers(((storage.foldername(name))[1])::uuid));
create policy "receipt insert" on storage.objects for insert to authenticated with check (bucket_id='receipts' and private.administers(((storage.foldername(name))[1])::uuid));
create policy "receipt delete" on storage.objects for delete to authenticated using (bucket_id='receipts' and private.administers(((storage.foldername(name))[1])::uuid));
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,email,display_name) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1))) on conflict(id) do nothing; return new; end; $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

commit;
