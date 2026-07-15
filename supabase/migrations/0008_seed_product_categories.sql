insert into public.product_categories (business_id, name, position)
select b.id, c.name, c.position
from public.businesses b
cross join (values
  ('Bollería', 10),
  ('Empanadas', 20),
  ('Pan', 30),
  ('Pan envasado', 40),
  ('Bebidas', 50),
  ('Otros', 60)
) as c(name, position)
on conflict (business_id, name) do update
set position = excluded.position;
