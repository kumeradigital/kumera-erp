alter table public.products
  alter column target_margin_percentage set default 80;

update public.products
set target_margin_percentage = 80,
    updated_at = now()
where target_margin_percentage is distinct from 80;
