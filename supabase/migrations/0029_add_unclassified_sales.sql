-- El medio de pago se concilia al cierre con los totales reales de TUU,
-- transferencias y efectivo contado. Durante la venta sólo se registra el total.
alter type public.payment_method add value if not exists 'unclassified';
