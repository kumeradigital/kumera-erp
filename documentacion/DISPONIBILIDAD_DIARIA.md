# Disponibilidad diaria en caja

Esta función informa cuántas unidades frescas quedan disponibles durante una jornada. No es inventario contable, no controla materias primas y no arrastra cantidades de un día a otro.

## Configuración

En `Productos`, edita cada empanada o producto vendido por unidad y activa **Controlar disponibilidad diaria**. Los productos vendidos por kilogramo quedan fuera de este control.

## Apertura

Al abrir la caja se solicita:

1. efectivo inicial;
2. unidades listas para vender de cada producto controlado.

El valor puede ser cero. Cada jornada comienza con un conteo independiente.

## Durante la venta

- La tarjeta del producto muestra las unidades disponibles.
- En amarillo se indican cinco o menos unidades.
- Al llegar a cero el producto aparece agotado y no puede agregarse al carro.
- El carro tampoco puede superar la disponibilidad actual.
- Supabase vuelve a validar la cantidad al cobrar y descuenta la venta de forma atómica.

## Movimientos manuales

Desde el botón **Disponibilidad** de la caja se puede registrar:

- nueva producción, que suma unidades;
- merma o producto dañado, que resta unidades;
- consumo interno, que resta unidades;
- correcciones de conteo, que pueden sumar o restar.

Cada movimiento conserva producto, cantidad, motivo, responsable y hora. Ningún ajuste puede dejar una cantidad negativa.

## Cierre

Antes de confirmar el cierre se muestra la disponibilidad final teórica. El cierre no convierte el remanente en inventario ni lo copia a la siguiente jornada.

La relación de control es:

```text
Disponibilidad final =
  cantidad inicial
  + nueva producción
  - ventas
  + ajustes netos
```
