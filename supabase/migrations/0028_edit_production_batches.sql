alter table public.cash_session_production_batches
  add column updated_by uuid references public.profiles(id),
  add column updated_at timestamptz;

create policy "production batch update"
  on public.cash_session_production_batches for update to authenticated
  using (
    private.administers(business_id)
    and exists (
      select 1 from public.cash_sessions session
      where session.id = cash_session_id
        and session.business_id = business_id
        and session.status = 'open'
    )
  )
  with check (
    private.administers(business_id)
    and updated_by = auth.uid()
    and exists (
      select 1 from public.cash_sessions session
      where session.id = cash_session_id
        and session.business_id = business_id
        and session.status = 'open'
    )
    and exists (
      select 1 from public.products component
      where component.id = component_product_id
        and component.business_id = business_id
        and component.family_product_id = family_product_id
    )
  );

grant update on public.cash_session_production_batches to authenticated;
