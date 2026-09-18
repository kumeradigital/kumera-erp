update public.cash_session_reconciliations
set actual_debit_sales = 417975,
    actual_credit_sales = 76824,
    actual_debit_transactions = 41,
    actual_credit_transactions = 12,
    commission_net_amount = 6503,
    commission_tax_amount = 1236,
    reason = 'Totales corregidos después del cierre: débito 41 movimientos por $417.975 y crédito 12 movimientos por $76.824. Efectivo original conservado.',
    updated_at = now()
where cash_session_id = '7fdb6d89-1757-416b-839f-dcfadc2e8321';
