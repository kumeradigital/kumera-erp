# Módulo de costos, precios y rentabilidad

## Objetivo

Calcular automáticamente el costo y margen de los productos de ERP KUMERA a
partir de materias primas, precios, recetas y costos reales de operación.

El módulo no controla inventario, existencias ni producción. Registrar un precio
de compra no aumenta stock: solamente actualiza la referencia económica usada
por las recetas.

## Flujo de información

```text
Precio de compra
  → costo por gramo, mililitro o unidad
  → costo de receta y subrecetas
  → costo físico del producto
  → merma y comisión esperada
  → costo variable
  → margen de contribución
  → precio sugerido
  → punto de equilibrio y proyección
```

## Reglas principales

- Los productos nunca reciben un costo manual.
- El precio vigente de una materia prima corresponde a su registro confirmado
  más reciente.
- Las compras pueden expresarse en kg, g, l, ml o unidades.
- Las recetas pueden rendir unidades/porciones o kilogramos.
- Una receta puede contener materias primas y otras recetas.
- El rendimiento declarado debe corresponder al producto final aprovechable.
- La merma comercial se configura por producto y no sustituye al rendimiento de
  la receta.
- El margen de contribución no contiene costos fijos.
- Los costos fijos se usan para calcular resultado operacional y equilibrio.
- Las comisiones se estiman usando la mezcla esperada de medios de pago.

## Fórmulas

```text
Costo base ingrediente = costo neto / cantidad base

Costo receta = suma de ingredientes y subrecetas

Costo por rendimiento = costo receta / rendimiento final

Ingreso neto = precio bruto / (1 + tasa IVA)

Costo variable = costo físico + merma + comisión esperada

Margen de contribución = ingreso neto - costo variable

Resultado escenario = contribución mensual - costos fijos mensuales
```

## Caso de aceptación inicial

El motor tiene una prueba automatizada que reproduce aproximadamente el estudio
de la empanada de pino:

- costo físico: $958;
- costo variable: $1.059;
- margen de contribución: $1.630;
- margen sobre ingreso neto: 60,6 %.

## Orden de carga recomendado

1. Configurar IVA, días de operación, mezcla de pagos y comisiones.
2. Registrar materias primas y su primer precio.
3. Crear subrecetas, por ejemplo Masa y Pino.
4. Crear la receta final del producto.
5. Vincular la receta con el producto de caja.
6. Configurar merma y margen objetivo.
7. Registrar costos fijos.
8. Crear escenarios de venta diaria.
