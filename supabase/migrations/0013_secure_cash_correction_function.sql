create or replace function public.correct_cash_session(
  p_session uuid,
  p_counted_cash bigint,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target public.cash_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Sesión no válida'; end if;
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
