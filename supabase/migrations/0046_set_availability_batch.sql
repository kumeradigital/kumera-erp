create or replace function public.set_product_availability_batch(
  p_session uuid,
  p_quantities jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
  v_item jsonb;
  v_product uuid;
  v_target integer;
  v_current integer;
  v_delta integer;
  v_result jsonb := '{}'::jsonb;
begin
  select business_id into v_business
  from public.cash_sessions
  where id = p_session and status = 'open';

  if v_business is null then raise exception 'No hay una caja abierta'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;
  if jsonb_typeof(p_quantities) <> 'array' or jsonb_array_length(p_quantities) = 0 then
    raise exception 'Cantidades de empanadas inválidas';
  end if;

  for v_item in select * from jsonb_array_elements(p_quantities) loop
    v_product := (v_item->>'product_id')::uuid;
    v_target := (v_item->>'quantity')::integer;

    if v_target < 0 or v_target > 1000 then
      raise exception 'Cantidad inválida';
    end if;

    select available_quantity into v_current
    from public.cash_session_product_availability
    where business_id = v_business
      and cash_session_id = p_session
      and product_id = v_product
    for update;

    if v_current is null then
      raise exception 'Este producto no tiene control de disponibilidad en la jornada';
    end if;

    v_delta := v_target - v_current;
    if v_delta <> 0 then
      update public.cash_session_product_availability
      set available_quantity = v_target,
          produced_quantity = produced_quantity + greatest(v_delta, 0),
          adjusted_quantity = adjusted_quantity + least(v_delta, 0),
          updated_at = now()
      where business_id = v_business
        and cash_session_id = p_session
        and product_id = v_product;

      insert into public.product_availability_movements(
        business_id, cash_session_id, product_id, movement_type,
        quantity_change, reason, created_by
      ) values (
        v_business, p_session, v_product,
        (case when v_delta > 0 then 'production' else 'correction' end)::public.availability_movement_type,
        v_delta,
        case when v_delta > 0
          then 'Producción guardada desde caja'
          else 'Corrección guardada desde caja'
        end,
        auth.uid()
      );
    end if;

    v_result := v_result || jsonb_build_object(v_product::text, v_target);
  end loop;

  return v_result;
end
$$;

revoke all on function public.set_product_availability_batch(uuid, jsonb)
  from public, anon;
grant execute on function public.set_product_availability_batch(uuid, jsonb)
  to authenticated;
