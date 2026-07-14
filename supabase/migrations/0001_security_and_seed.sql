-- Authorization helpers deliberately run as definer to avoid recursive RLS checks.
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_superadmin and active from profiles where id = auth.uid()), false) $$;

create or replace function public.administers(target_business uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from business_admins where business_id = target_business and user_id = auth.uid() and active) $$;

alter table businesses enable row level security;
alter table profiles enable row level security;
alter table business_admins enable row level security;
alter table opening_ledgers enable row level security;
alter table categories enable row level security;
alter table opening_entries enable row level security;
alter table attachments enable row level security;
alter table entry_change_log enable row level security;
alter table role_change_log enable row level security;

create policy "business access" on businesses for select using (administers(id) or is_superadmin());
create policy "profile self or superadmin" on profiles for select using (id = auth.uid() or is_superadmin());
create policy "superadmin manages profiles" on profiles for update using (is_superadmin()) with check (is_superadmin());
create policy "membership access" on business_admins for select using (user_id = auth.uid() or is_superadmin());
create policy "superadmin manages memberships" on business_admins for all using (is_superadmin()) with check (is_superadmin());
create policy "ledger access" on opening_ledgers for all using (administers(business_id)) with check (administers(business_id));
create policy "category access" on categories for all using (administers(business_id)) with check (administers(business_id));
create policy "entry access" on opening_entries for all using (administers(business_id)) with check (administers(business_id));
create policy "attachment access" on attachments for all using (administers(business_id)) with check (administers(business_id));
create policy "entry audit read" on entry_change_log for select using (administers(business_id));
create policy "entry audit insert" on entry_change_log for insert with check (administers(business_id) and actor_id = auth.uid());
create policy "role audit access" on role_change_log for select using (is_superadmin());
create policy "role audit insert" on role_change_log for insert with check (is_superadmin() and actor_id = auth.uid());

-- Private receipts bucket. Upload paths must start with the business UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts','receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
create policy "receipt select" on storage.objects for select using (bucket_id='receipts' and administers(((storage.foldername(name))[1])::uuid));
create policy "receipt insert" on storage.objects for insert with check (bucket_id='receipts' and administers(((storage.foldername(name))[1])::uuid));
create policy "receipt delete" on storage.objects for delete using (bucket_id='receipts' and administers(((storage.foldername(name))[1])::uuid));
