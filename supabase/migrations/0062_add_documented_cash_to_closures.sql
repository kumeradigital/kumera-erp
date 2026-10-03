alter table public.cash_sessions
  add column if not exists documented_cash_sales bigint not null default 0
    check (documented_cash_sales >= 0),
  add column if not exists documented_cash_transactions integer not null default 0
    check (documented_cash_transactions >= 0);

comment on column public.cash_sessions.documented_cash_sales is
  'Efectivo incluido en boletas o documentos tributarios de la máquina. No se suma a la venta conciliada.';

comment on column public.cash_sessions.documented_cash_transactions is
  'Cantidad de operaciones en efectivo documentadas por la máquina.';
