create index opening_ledgers_closed_by_idx
  on public.opening_ledgers (closed_by)
  where closed_by is not null;

create index operational_transactions_created_by_idx
  on public.operational_transactions (created_by);

create index operational_transactions_ingredient_idx
  on public.operational_transactions (ingredient_id)
  where ingredient_id is not null;
