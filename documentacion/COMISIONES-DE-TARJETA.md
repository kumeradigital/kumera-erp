# Comisiones de tarjeta en ERP KUMERA

## Configuración vigente

- Modelo: mixto.
- Comisión neta: 0,79% del total de la transacción más $65.
- IVA sobre la comisión: 19%.
- Plazo esperado de abono: 1 día.
- Aplica a débito y crédito.
- Efectivo y transferencia: sin comisión.

## Registro de una venta

Al confirmar una venta, el servidor calcula y conserva:

```text
Comisión neta = redondear(total × 0,79% + $65)
IVA comisión = redondear(comisión neta × 19%)
Abono esperado = total − comisión neta − IVA comisión
```

La tarifa queda guardada en la venta. Un cambio contractual futuro no modifica las ventas históricas.

## Rentabilidad por producto

El cargo fijo de $65 pertenece a la transacción completa, que puede contener varios productos. Para no asignar $65 a cada unidad, el motor convierte el modelo mixto en una tasa equivalente usando el ticket promedio esperado y la mezcla estimada de medios de pago.

La comisión usada para calcular margen excluye su IVA cuando éste es recuperable como crédito fiscal. El dashboard de caja muestra también el IVA y el abono efectivo esperado.

## Conciliación futura

La liquidación real del operador puede incluir redondeos, devoluciones u otros cargos. Una futura conciliación deberá comparar la comisión estimada acumulada con la factura o liquidación real y registrar solamente la diferencia, sin duplicar el gasto.
