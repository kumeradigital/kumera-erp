alter table public.cash_sessions
  add column reconciled_at timestamptz,
  add column reconciled_by uuid references public.profiles(id);

alter table public.cash_sessions
  add constraint cash_session_reconciliation_check check (
    (reconciled_at is null and reconciled_by is null)
    or
    (auto_closed and status = 'closed' and counted_cash is not null
      and reconciled_at is not null and reconciled_by is not null)
  );
