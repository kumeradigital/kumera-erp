create extension if not exists pg_cron with schema pg_catalog;

alter table public.businesses
  add column automatic_cash_close_time time not null default '22:00';

alter table public.cash_sessions
  add column auto_closed boolean not null default false;

create or replace function private.auto_close_cash_sessions()
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  affected integer;
begin
  update public.cash_sessions cs
  set status = 'closed',
      closed_at = now(),
      auto_closed = true,
      closing_note = coalesce(cs.closing_note, 'Cierre automático por horario del negocio')
  from public.businesses b
  where b.id = cs.business_id
    and b.active
    and cs.status = 'open'
    and (
      (cs.opened_at at time zone b.timezone)::date <
        (now() at time zone b.timezone)::date
      or (
        (cs.opened_at at time zone b.timezone)::date <=
          (now() at time zone b.timezone)::date
        and (now() at time zone b.timezone)::time >=
          b.automatic_cash_close_time
      )
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function private.auto_close_cash_sessions() from public, anon, authenticated;

select cron.schedule(
  'kumera-auto-close-cash-sessions',
  '*/5 * * * *',
  'select private.auto_close_cash_sessions();'
);
