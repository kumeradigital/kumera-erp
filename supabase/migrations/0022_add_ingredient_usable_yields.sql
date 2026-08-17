alter table public.ingredients
  add column usable_yield_percentage numeric(6,3) not null default 100
    check (usable_yield_percentage > 0 and usable_yield_percentage <= 100),
  add column yield_loss_type text not null default 'none'
    check (yield_loss_type in ('none', 'cleaning', 'cooking', 'bone_skin', 'combined')),
  add column yield_status text not null default 'confirmed'
    check (yield_status in ('estimated', 'confirmed'));

update public.ingredients
set usable_yield_percentage = 65,
    yield_loss_type = 'cooking',
    yield_status = 'estimated',
    updated_at = now()
where lower(name) like '%tapapecho%';

update public.ingredients
set usable_yield_percentage = 60,
    yield_loss_type = 'combined',
    yield_status = 'estimated',
    updated_at = now()
where lower(name) like '%huachalomo%';

update public.ingredients
set usable_yield_percentage = 55,
    yield_loss_type = 'bone_skin',
    yield_status = 'estimated',
    updated_at = now()
where lower(name) like '%pechuga%' and lower(name) like '%pollo%';
