create table public.cash_session_withdrawals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  amount bigint not null check (amount > 0),
  reason text not null check (char_length(trim(reason)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index cash_session_withdrawals_session_idx
  on public.cash_session_withdrawals (cash_session_id, created_at desc);

alter table public.cash_session_withdrawals enable row level security;

create policy "cash withdrawal select"
  on public.cash_session_withdrawals for select to authenticated
  using (private.administers(business_id));

create policy "cash withdrawal insert"
  on public.cash_session_withdrawals for insert to authenticated
  with check (
    private.administers(business_id)
    and created_by = auth.uid()
    and exists (
      select 1 from public.cash_sessions session
      where session.id = cash_session_id
        and session.business_id = business_id
        and session.status = 'open'
    )
  );

grant select, insert on public.cash_session_withdrawals to authenticated;
