alter table public.recipes
  add column recipe_kind text not null default 'subrecipe'
  check (recipe_kind in ('subrecipe', 'final'));

create or replace function public.delete_recipe(p_recipe uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business uuid;
begin
  select business_id into v_business
  from public.recipes
  where id = p_recipe and deleted_at is null;

  if v_business is null then raise exception 'La receta no existe'; end if;
  if not private.administers(v_business) then raise exception 'Sin autorización'; end if;

  if exists (
    select 1 from public.recipe_items
    where subrecipe_id = p_recipe
  ) then
    raise exception 'No puedes eliminarla porque se usa dentro de otra receta. Quítala primero de esa receta.';
  end if;

  update public.products
  set cost_recipe_id = null, updated_at = now()
  where business_id = v_business and cost_recipe_id = p_recipe;

  update public.recipes
  set active = false, deleted_at = now(), updated_at = now()
  where id = p_recipe and business_id = v_business;
end
$$;

revoke all on function public.delete_recipe(uuid) from public, anon;
grant execute on function public.delete_recipe(uuid) to authenticated;
