alter table public.cash_sessions
  drop constraint cash_session_reconciliation_check;

alter table public.cash_sessions
  add constraint cash_session_reconciliation_check check (
    (reconciled_at is null and reconciled_by is null)
    or
    (status = 'closed' and counted_cash is not null
      and reconciled_at is not null and reconciled_by is not null)
  );

create table public.cash_session_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  cash_session_id uuid not null references public.cash_sessions(id),
  previous_counted_cash bigint,
  new_counted_cash bigint not null check (new_counted_cash >= 0),
  reason text not null check (char_length(trim(reason)) between 3 and 300),
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index cash_session_adjustments_session_idx
  on public.cash_session_adjustments (cash_session_id, created_at desc);

alter table public.cash_session_adjustments enable row level security;
create policy "cash adjustment access"
  on public.cash_session_adjustments for select to authenticated
  using (private.administers(business_id));

create or replace function public.correct_cash_session(
  p_session uuid,
  p_counted_cash bigint,
  p_reason text
) returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  target public.cash_sessions%rowtype;
begin
  if p_counted_cash < 0 then raise exception 'Efectivo contado inválido'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Debes indicar el motivo de la corrección';
  end if;

  select * into target from public.cash_sessions
  where id = p_session and status = 'closed'
  for update;
  if target.id is null then raise exception 'Cierre no encontrado'; end if;
  if not private.administers(target.business_id) then raise exception 'Sin autorización'; end if;

  insert into public.cash_session_adjustments(
    business_id, cash_session_id, previous_counted_cash,
    new_counted_cash, reason, actor_id
  ) values (
    target.business_id, target.id, target.counted_cash,
    p_counted_cash, trim(p_reason), auth.uid()
  );

  update public.cash_sessions
  set counted_cash = p_counted_cash,
      closing_note = trim(p_reason),
      reconciled_at = now(),
      reconciled_by = auth.uid()
  where id = target.id;
end;
$$;

revoke all on function public.correct_cash_session(uuid, bigint, text)
  from public, anon;
grant execute on function public.correct_cash_session(uuid, bigint, text)
  to authenticated;
