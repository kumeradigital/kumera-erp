-- Evaluate request-scoped identity helpers once per statement and avoid
-- overlapping permissive policies. Qualify outer-row references explicitly so
-- PostgreSQL cannot resolve them to the inner relation by accident.

alter policy "membership access"
  on public.business_admins
  using (
    user_id = (select auth.uid())
    or (select private.is_superadmin())
  );

drop policy if exists "superadmin manages memberships"
  on public.business_admins;

create policy "superadmin inserts memberships"
  on public.business_admins for insert to authenticated
  with check ((select private.is_superadmin()));

create policy "superadmin updates memberships"
  on public.business_admins for update to authenticated
  using ((select private.is_superadmin()))
  with check ((select private.is_superadmin()));

create policy "superadmin deletes memberships"
  on public.business_admins for delete to authenticated
  using ((select private.is_superadmin()));

alter policy "cash withdrawal insert"
  on public.cash_session_withdrawals
  with check (
    private.administers(business_id)
    and created_by = (select auth.uid())
    and exists (
      select 1
      from public.cash_sessions session
      where session.id = cash_session_withdrawals.cash_session_id
        and session.business_id = cash_session_withdrawals.business_id
        and session.status = 'open'
    )
  );

alter policy "production batch insert"
  on public.cash_session_production_batches
  with check (
    private.administers(business_id)
    and created_by = (select auth.uid())
    and exists (
      select 1
      from public.cash_sessions session
      where session.id = cash_session_production_batches.cash_session_id
        and session.business_id = cash_session_production_batches.business_id
        and session.status = 'open'
    )
    and exists (
      select 1
      from public.products component
      where component.id = cash_session_production_batches.component_product_id
        and component.business_id = cash_session_production_batches.business_id
        and component.family_product_id = cash_session_production_batches.family_product_id
    )
  );

alter policy "production batch update"
  on public.cash_session_production_batches
  using (
    private.administers(business_id)
    and exists (
      select 1
      from public.cash_sessions session
      where session.id = cash_session_production_batches.cash_session_id
        and session.business_id = cash_session_production_batches.business_id
        and session.status = 'open'
    )
  )
  with check (
    private.administers(business_id)
    and updated_by = (select auth.uid())
    and exists (
      select 1
      from public.cash_sessions session
      where session.id = cash_session_production_batches.cash_session_id
        and session.business_id = cash_session_production_batches.business_id
        and session.status = 'open'
    )
    and exists (
      select 1
      from public.products component
      where component.id = cash_session_production_batches.component_product_id
        and component.business_id = cash_session_production_batches.business_id
        and component.family_product_id = cash_session_production_batches.family_product_id
    )
  );

alter policy "cash session carryover access"
  on public.cash_session_product_carryover
  using (private.administers(business_id))
  with check (
    private.administers(business_id)
    and created_by = (select auth.uid())
  );

alter policy "delivery orders access"
  on public.delivery_orders
  using (private.administers(business_id))
  with check (
    private.administers(business_id)
    and created_by = (select auth.uid())
  );
