update public.financial_cutoffs
set cutoff_at = timestamptz '2026-09-13 12:40:00+00',
    cutoff_date = date '2026-09-13',
    note = 'Corte real inicial del 13-09-2026 a las 08:40 America/Santiago, antes de abrir la caja. Banco $1.021.564, efectivo total $156.500 y sin pagos ni abonos pendientes informados.'
where cutoff_date = date '2026-09-12'
  and opening_bank_amount = 1021564
  and opening_cash_amount = 156500;
