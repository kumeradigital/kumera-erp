# Plan maestro de rentabilidad real

## Objetivo

Convertir el ERP en una herramienta capaz de responder, con datos trazables:

1. Cuanto gana realmente el negocio.
2. Cuanto aporta cada producto y si su precio es suficiente.
3. Cuanto efectivo existe y por que difiere de la utilidad.
4. Cuanto se puede retirar sin comprometer arriendo, remuneraciones, impuestos, compras ni capital de trabajo.
5. Cuanto debe vender el local para sostener su estructura actual y una estructura que no dependa completamente del dueño.

## Forma de trabajo

- Resolveremos un punto por vez.
- Cada punto comienza con preguntas concretas y termina con una conclusion escrita.
- Una casilla se marca solamente cuando los datos y el calculo quedan verificados.
- No modificaremos formulas productivas ni saldos historicos antes de terminar su auditoria.
- Separaremos siempre rentabilidad, flujo de caja y dinero disponible para retiro.
- Los meses extraordinarios, feriados y eventos se identificaran y no distorsionaran la proyeccion normal.

## Protocolo obligatorio para ingresos y gastos desde octubre

### Regla principal

Todo movimiento de dinero se registra una sola vez, el mismo dia en que ocurre, indicando desde donde salio o a donde entro. El comprobante puede agregarse despues, pero el movimiento no debe esperar.

### Al registrar una salida

Siempre se deben completar estos datos:

1. Fecha real del pago.
2. Monto total efectivamente pagado.
3. Medio y cuenta de origen: Mercado Pago/banco, caja, efectivo fuera de caja u otra cuenta.
4. Tipo de movimiento: compra de insumos, gasto operativo, costo fijo, remuneracion, impuesto, retiro del dueño, deuda o transferencia interna.
5. Descripcion concreta y proveedor o beneficiario.
6. Comprobante, cuando exista.
7. Indicar si corresponde al mes actual, a un mes anterior o a un pago anticipado.

### Reglas para no duplicar ni distorsionar

- Una transferencia entre cuentas propias no es ingreso ni gasto: solo mueve dinero.
- Un retiro desde caja hacia la billetera o banco del negocio no es gasto mientras siga siendo dinero del negocio.
- Un retiro personal del dueño si se registra como retiro del dueño y no como gasto operativo.
- Una compra de insumos se registra como compra, aunque se pague con efectivo retirado previamente de caja.
- Una cuota de credito se registra completa en flujo de caja, pero para rentabilidad se separa en capital, intereses, comisiones y gastos asociados.
- Las remuneraciones, cotizaciones e impuestos se registran por separado.
- Las remuneraciones se muestran en flujo de caja cuando se pagan, pero en rentabilidad se asignan al mes efectivamente trabajado. Su vencimiento habitual es el dia 5 del mes siguiente.
- No se vuelve a registrar un gasto solamente porque aparezca despues en la cartola bancaria.
- Una correccion nunca debe borrar el movimiento original: debe dejar trazabilidad de quien corrigio, cuando y por que.

### Rutina diaria

- Durante el dia: registrar cada gasto o retiro al momento de pagarlo.
- Al cierre: comparar los gastos del dia con comprobantes, caja y movimientos de Mercado Pago.
- Si falta informacion: dejar el movimiento como pendiente de clasificar, pero con monto, fecha y cuenta de origen registrados.

### Rutina semanal del dueño

- Revisar una vez por semana los movimientos bancarios contra el ERP.
- Resolver pendientes de clasificacion y comprobantes faltantes.
- Confirmar que las transferencias internas y retiros no fueron tratados como gastos duplicados.
- Revisar obligaciones proximas y reservar el dinero correspondiente.

## Estados

- `[ ]` Pendiente.
- `[~]` En curso.
- `[x]` Completado y verificado.
- `[!]` Bloqueado o requiere validacion externa.

## Plan

### 1. Establecer el corte financiero inicial de octubre

**Estado:** `[x] Completado con saldo inicial reconstruido y aceptado`

Objetivo: definir un punto de partida real para banco, Mercado Pago, efectivo, cuentas por cobrar, deudas e inventario.

- [x] Elegir fecha y hora exactas del corte: 2026-10-01 00:00, hora de Chile.
- [x] Registrar control actual: 2026-10-03 09:27, antes de ventas del dia. Banco/Mercado Pago $431.971; caja $9.840; efectivo fuera de caja $59.000; total $500.811.
- [x] Registrar cobros pendientes de recibir: $0 al 2026-10-03 09:27.
- [x] Registrar obligaciones pendientes conocidas: arriendo $675.000, provision de electricidad $250.000 e impuestos por determinar.
- [x] Separar movimientos conocidos ocurridos despues del corte y reconstruir los saldos iniciales provisionales.
- [x] Registrar en el ERP los movimientos verificados del 1 de octubre sin duplicarlos.
- [x] Trasladar la valorizacion del inventario inicial a la auditoria de materias primas, para no mezclar existencias con la cuadratura de dinero.
- [x] Conciliar el total inicial y documentar el supuesto aceptado.

**Criterio de termino:** todos los saldos del corte se pueden comprobar con dinero real, cartolas o conteo fisico.

### 2. Auditar las ventas que alimentan el ERP

**Estado:** `[~] En curso`

- [x] Confirmar que cada jornada usa el cierre conciliado como venta oficial para el analisis operacional.
- [x] Auditar los cierres del 1 al 3 de octubre contra el detalle registrado en caja.
- [x] Confirmar que la venta conciliada sin detalle no se considera de costo cero: recibe el margen promedio observado de los productos costeados.
- [ ] Validar que la mezcla de productos costeados sea representativa antes de confiar en ese margen estimado.
- [x] Definir control diario de calidad: verde bajo 2%, amarillo entre 2% y 5%, rojo sobre 5% de diferencia sin desglose.
- [x] Mantener Pan como familia promedio y exigir selección individual dentro de la familia Dulces.
- [ ] Comparar septiembre con TUU, Mercado Pago y registros de caja.
- [ ] Identificar jornadas corregidas, incompletas o duplicadas.
- [ ] Separar efectivo, transferencia, debito, credito, delivery y ventas especiales.
- [ ] Incorporar un dato separado de efectivo boleteado para control tributario, sin sumarlo nuevamente a la venta operacional.
- [ ] Marcar Fiestas Patrias y otros dias extraordinarios.
- [ ] Definir el conjunto de dias normales para proyecciones.

**Criterio de termino:** la venta mensual y diaria se explica por medios de pago y no contiene duplicaciones conocidas.

### 3. Auditar materias primas y precios de compra

**Estado:** `[ ] Pendiente`

- [ ] Revisar nombre, formato comprado, cantidad util y unidad base.
- [ ] Verificar precio bruto, IVA recuperable y costo neto aplicable.
- [ ] Revisar rendimiento y perdida de cada materia prima.
- [ ] Detectar precios antiguos, faltantes o ingresados con unidad equivocada.
- [ ] Definir politica de precio vigente y conservar historial por fecha.

**Criterio de termino:** cada ingrediente relevante tiene precio, formato, rendimiento y fecha verificables.

### 4. Auditar recetas, rendimientos y familias

**Estado:** `[ ] Pendiente`

- [ ] Revisar receta y rendimiento real por lote.
- [ ] Verificar porcion o peso efectivamente vendido.
- [ ] Incorporar envases y consumibles directos.
- [ ] Revisar merma realista por producto.
- [ ] Revisar familias y ponderacion por mezcla real de produccion o venta.
- [ ] Resolver productos activos sin receta o con receta incompleta.

**Criterio de termino:** los productos que representan al menos 95% de las ventas tienen costo completo y trazable.

### 5. Calcular margen y precio de cada producto

**Estado:** `[ ] Pendiente`

- [ ] Calcular precio bruto y venta neta de IVA.
- [ ] Calcular ingredientes, envase, merma y comision real.
- [ ] Calcular contribucion en pesos y porcentaje.
- [ ] Definir margen minimo y objetivo.
- [ ] Detectar productos bajo precio, sensibles o no rentables.
- [ ] Proponer precios nuevos y medir su efecto.

**Criterio de termino:** cada producto oficial tiene diagnostico de precio y margen.

### 6. Reconstruir los costos fijos mensuales

**Estado:** `[ ] Pendiente`

- [ ] Arriendo y gastos del inmueble.
- [ ] Remuneraciones, cotizaciones y costo empresa completo.
- [ ] Electricidad, agua, gas, internet y servicios.
- [ ] Contabilidad, recursos humanos, plagas, permisos y seguros.
- [ ] Mantenciones y gastos periodicos prorrateados.
- [ ] Separar intereses de creditos y pago de capital.
- [ ] Crear vista actual y vista con reemplazo del trabajo del dueño.

**Criterio de termino:** el costo fijo mensual se puede explicar linea por linea, sin duplicaciones.

### 7. Cerrar septiembre como mes historico extraordinario

**Estado:** `[ ] Pendiente`

- [ ] Ventas netas verificadas.
- [ ] Costo teorico de productos vendidos.
- [ ] Margen de contribucion.
- [ ] Costos fijos devengados.
- [ ] Resultado operacional.
- [ ] Compras, inversiones y movimientos de caja separados del resultado.
- [ ] Explicar la diferencia entre utilidad y variacion de efectivo.

**Criterio de termino:** septiembre tiene un estado de resultados y un puente de caja separados y conciliados.

### 8. Construir una proyeccion normalizada

**Estado:** `[ ] Pendiente`

- [ ] Excluir feriados y eventos del escenario normal.
- [ ] Calcular medianas por dia de la semana.
- [ ] Crear escenarios conservador, base y alto.
- [ ] Calcular punto de equilibrio mensual y diario.
- [ ] Simular estructura actual y negocio autonomo.
- [ ] Medir capacidad para sostener al personal.

**Criterio de termino:** la proyeccion declara periodo, cobertura, supuestos y nivel de confianza.

### 9. Separar resultado, caja y retiro seguro en el ERP

**Estado:** `[ ] Pendiente`

- [ ] Resultado operacional estimado.
- [ ] Resultado mensual cerrado.
- [ ] Flujo de caja y conciliacion bancaria.
- [ ] Obligaciones y reservas.
- [ ] Capital de trabajo minimo.
- [ ] Retiro seguro, sin confundirlo con utilidad.
- [ ] Alertas de datos incompletos y cobertura.

**Criterio de termino:** ninguna pantalla presenta una proyeccion como dinero disponible sin descontar reservas y obligaciones.

### 10. Implementar, probar y establecer el cierre mensual

**Estado:** `[ ] Pendiente`

- [ ] Congelar precios, recetas y costos utilizados en cada cierre.
- [ ] Evitar que cambios futuros reescriban resultados historicos.
- [ ] Crear pruebas de ventas, costos, margenes y cierres.
- [ ] Comparar manualmente un conjunto representativo de productos.
- [ ] Validar octubre contra cartolas, inventario y pagos reales.
- [ ] Crear lista de verificacion para el cierre de cada mes.

**Criterio de termino:** el resultado puede reproducirse y explicarse desde los documentos de origen.

## Decisiones y hallazgos confirmados

- Septiembre de 2026 se tratara como un mes extraordinario por Fiestas Patrias.
- El resultado proyectado actual no representa dinero disponible para retiro.
- La rentabilidad y el flujo de caja deben mantenerse como calculos separados.
- Antes de cambiar el motor de calculo se conservaran los datos historicos y se auditara su origen.
- El cierre conciliado sera la fuente de venta operacional: debito, credito y transferencias segun la maquina, y efectivo real derivado del conteo fisico.
- El efectivo boleteado por la maquina es un dato tributario distinto. No reemplaza al efectivo real ni se suma como una venta adicional.

## Registro de avance

| Fecha      | Punto                          | Decision o resultado                                                                                                                                                                                                                                                                                                                                       | Estado                                |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 2026-10-03 | Plan maestro                   | Se crea el plan y se inicia el corte financiero de octubre.                                                                                                                                                                                                                                                                                                | En curso                              |
| 2026-10-03 | 1. Corte financiero            | Se reconstruira el inicio del 1 de octubre para conservar dentro del periodo las ventas de los dias 1 y 2.                                                                                                                                                                                                                                                 | Confirmado                            |
| 2026-10-03 | 1. Control actual              | Banco y Mercado Pago $431.971; efectivo en caja $9.840; efectivo fuera de caja $59.000; otras cuentas $0; abonos pendientes $0. Total observado $500.811. Falta fijar hora y reconstruir movimientos desde el corte.                                                                                                                                       | En curso                              |
| 2026-10-03 | 1. Movimientos informados      | Entre el 1 de octubre y el 3 de octubre a las 09:27 se informan $1.370.000 en pagos de remuneraciones y $150.123 en compras y otros pagos. Falta confirmar medio de pago y fechas individuales.                                                                                                                                                            | En curso                              |
| 2026-10-03 | 1. Medios de pago              | Remuneraciones $1.370.000 pagadas por transferencia desde Mercado Pago. Compras y otros pagos por debito desde Mercado Pago, excepto huevos $27.000 pagados en efectivo. Se agrega cuota de credito ya pagada por transferencia $294.000. Salidas bancarias conocidas $1.787.123 y salida de efectivo $27.000.                                             | Confirmado                            |
| 2026-10-03 | 6. Personal                    | En octubre no se pagaran cotizaciones; comenzaran a pagarse desde noviembre. Para flujo de octubre se consideran $0, pero la proyeccion sostenible debera incluir el costo empresa futuro.                                                                                                                                                                 | Confirmado                            |
| 2026-10-03 | 1. Cierres 1 y 2 de octubre    | Cierre 01-10: efectivo $35.700, debito $305.472, credito $69.143; venta total $410.315; comisiones e impuesto $5.963. Cierre 02-10: efectivo $35.140, debito $265.294, credito $40.626; venta total $341.060; comisiones e impuesto $4.718.                                                                                                                | Verificado en BD                      |
| 2026-10-03 | 1. Reconstruccion provisional  | Ingreso bancario neto de comisiones 01-02 oct: $669.854. Venta real en efectivo: $70.840. Incluida la cuota de credito de $294.000, el corte reconstruido al 01-10 00:00 es banco/Mercado Pago $1.549.240 y efectivo total $25.000.                                                                                                                        | Provisional; falta contrastar cartola |
| 2026-10-03 | 2. Efectivo tributario         | El 02-10 la maquina informa efectivo boleteado $10.630, mientras el cierre conciliado registra venta real en efectivo $35.140. Diferencia no boleteada: $24.510. Ambos datos deben guardarse por separado.                                                                                                                                                 | Confirmado                            |
| 2026-10-03 | 1. Obligaciones pendientes     | Arriendo $675.000; electricidad provisionada en $250.000 segun el mes anterior; impuestos por calcular. Compromisos conocidos $925.000 mas impuestos.                                                                                                                                                                                                      | Confirmado                            |
| 2026-10-03 | 1/6. Credito                   | Cuota mensual habitual $260.000; primer pago realizado en octubre $294.000 por costos iniciales y estampillas, pagado desde Mercado Pago. Para rentabilidad se debera separar capital, intereses, comisiones y estampillas.                                                                                                                                | Confirmado                            |
| 2026-10-03 | 1/6. Arriendo                  | El arriendo de $675.000 pendiente corresponde a octubre. Se paga por adelantado dentro de los primeros cinco dias del mismo mes, por lo que es obligacion de caja y costo fijo de octubre.                                                                                                                                                                 | Confirmado                            |
| 2026-10-03 | 1. Registro de movimientos     | Se registran 13 movimientos del 01-10 por $1.814.123: $1.787.123 desde Mercado Pago y $27.000 en efectivo. Incluye remuneraciones, compras, agua y primera cuota del credito. Las compras quedan sin credito IVA hasta contar con respaldo.                                                                                                                | Completado                            |
| 2026-10-03 | 1. Cuota pagada                | La obligacion de credito del 01-10 se actualiza al monto real de $294.000 y queda marcada como pagada.                                                                                                                                                                                                                                                     | Completado                            |
| 2026-10-03 | 1. Corte oficial               | Se fija el corte al 01-10 00:00 con banco/Mercado Pago $1.549.240, efectivo total $25.000 y abonos pendientes $0. El saldo reconstruido se acepta como supuesto confirmado sin exigir cartola historica.                                                                                                                                                   | Completado                            |
| 2026-10-03 | 1. Saldos esperados            | Despues de los cierres del 1 y 2, los movimientos registrados y la compra del 3 por $12.810, el ERP calcula banco $419.161 y efectivo total $68.840. Compromisos pendientes: $925.000; impuestos aun no incluidos.                                                                                                                                         | Verificado                            |
| 2026-10-03 | 1. Retiros de caja             | Se corrige el calculo para que mover efectivo desde la caja a otra tenencia del negocio no reduzca el efectivo total. El gasto o retiro personal se descuenta al registrarse como movimiento financiero.                                                                                                                                                   | Corregido                             |
| 2026-10-03 | 1/6. Periodo de remuneraciones | Los sueldos pagados el 01-10 corresponden al trabajo de septiembre. En caja son egresos de octubre; en rentabilidad pertenecen a septiembre. Los sueldos liquidos mensuales confirmados son panadero $920.000, pastelera $620.000 y cajera $500.000. Se crean compromisos por octubre con vencimiento 05-11 por $2.040.000, mas imposiciones por calcular. | Confirmado                            |
| 2026-10-03 | 6. Cambio sueldo panadero      | El sueldo liquido del panadero en septiembre fue $870.000: quincena $430.000 y saldo $440.000 pagado el 01-10. El nuevo sueldo de $920.000 rige desde octubre y su primer pago vence el 05-11.                                                                                                                                                             | Confirmado                            |
| 2026-10-03 | 2. Ventas octubre              | Cierres 01-03 oct: venta conciliada $1.142.666 versus detalle de productos registrado $1.048.068. Los cierres recuperan $94.598 sin detalle, equivalente a 8,28% de la venta oficial. El ingreso esta protegido, pero esa fraccion necesita una regla de costeo para no sesgar el margen.                                                                  | En auditoria                          |
| 2026-10-03 | 2. Regla actual de estimacion  | La proyeccion no asigna costo cero a los $94.598 sin desglose. Calcula el margen observado en ventas con receta y lo extrapola a toda la venta conciliada. La regla evita inflar directamente la utilidad, pero requiere validar cobertura y representatividad de la mezcla costeada.                                                                      | Confirmado con reserva                |
| 2026-10-03 | 2/4. Registro por producto     | Pan se mantiene como venta promedio por kg debido a la mezcla real en una misma bolsa. Dulces deja de admitir venta generica: la familia abre un selector y cada unidad se registra bajo el dulce escogido.                                                                                                                                                | Aprobado                              |
