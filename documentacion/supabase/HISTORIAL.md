# Historial del esquema Supabase

## 2026-09-06.5 — Proveedores configurables y archivo de inventario

- Migración: `0041_manage_inventory_providers_and_archiving.sql`.
- Nueva tabla por negocio para crear proveedores personalizados.
- Se conservan y precargan los cinco proveedores originales.
- Los insumos manuales pueden archivarse y las materias primas pueden ocultarse solo del inventario, sin afectar recetas.
- La creación de insumos ya no recarga la página completa.
- La migración no modifica cantidades de stock existentes.
- Aplicado en producción: 2026-09-06.

## 2026-09-06.4 — Insumos manuales fuera de recetas

- Migración: `0040_add_manual_inventory_supplies.sql`.
- Nueva tabla `inventory_supplies` para aseo, embalaje, papelería, mantención y otros artículos.
- Los insumos manuales comparten proveedor, agrupación y controles de stock con las materias primas.
- Estos artículos no participan en recetas, costos de productos ni movimientos automáticos.
- La migración no altera materias primas ni cantidades de inventario existentes.
- Aplicado en producción: sí, mediante el SQL Editor de Supabase.

## 2026-09-06.3 — Inventario agrupado por proveedor

- Migración: `0039_add_inventory_supplier.sql`.
- Cada materia prima puede asociarse a Vanni, Mayorista Central, Distribuidora Ja, Marcelo o La Oferta.
- El inventario se visualiza agrupado por proveedor y ordenado alfabéticamente dentro de cada grupo.
- El stock se muestra separado de los controles y se ajusta con botones de suma y resta.
- La migración no modifica ninguna cantidad de stock ya registrada.
- Aplicado en producción: sí, mediante el SQL Editor de Supabase.

## 2026-09-06.2 — Inventario contado únicamente en unidades

- Migración: `0038_inventory_counts_as_units.sql`.
- Todas las materias primas se cuentan como unidades, bolsas o bultos completos.
- Se eliminan de la interfaz las alternativas de gramos, kilos, mililitros y litros.
- Las cantidades son manuales y enteras; siguen sin existir movimientos automáticos.
- Aplicado en producción: sí, mediante el SQL Editor de Supabase.

## 2026-09-06.1 — Inventario manual de materias primas

- Migración: `0037_add_manual_ingredient_inventory.sql`.
- El inventario reutiliza el listado vigente de materias primas del motor de costos.
- Cada insumo conserva cantidad, unidad y fecha de la última actualización manual.
- No existen descuentos automáticos por ventas, recetas, producción o compras.
- Aplicado en producción: sí.

## 2026-09-05.3 — Disponibilidad exclusiva para ventas presenciales

- Migración: `0036_decouple_special_sales_from_daily_stock.sql`.
- Las ventas especiales y reservas no validan ni descuentan la disponibilidad diaria de empanadas.
- El contador de empanadas de caja queda reservado exclusivamente para ventas presenciales.
- Aplicado en producción: sí, mediante el SQL Editor de Supabase.

## 2026-09-05.2 — Corrección del abono esperado en ventas especiales

- Migración: `0035_fix_special_sale_deposit.sql`.
- Las reservas pagadas y completan el abono esperado obligatorio de la venta.
- Como el medio de pago se concilia al cierre, inicialmente el abono esperado corresponde al total acordado y no aplica una comisión inventada.
- Aplicado en producción: sí, mediante el SQL Editor de Supabase.

## 2026-09-05.1 — Reservas pagadas y ventas con precio acordado

- Migración: `0034_add_special_sales.sql`.
- La caja permite registrar ventas especiales con uno o varios productos, cantidad y precio negociado por unidad o kilogramo.
- Cada venta conserva cliente opcional, nota y fecha comprometida de entrega.
- El ingreso queda en la jornada en que se recibió el pago y se concilia junto con las demás ventas.
- Una entrega futura no descuenta la disponibilidad de empanadas de la jornada actual; una entrega para hoy sí lo hace.
- Los productos vendidos mantienen su detalle para costos, márgenes y reportes, usando el precio realmente acordado.
- Aplicado en producción: sí, mediante el SQL Editor de Supabase.

## 2026-08-13.1 — Comisión mixta automática en ventas con tarjeta

- Migración: `0019_add_mixed_card_fees.sql`.
- Configuración vigente: 0,79% + $65 netos por venta con débito o crédito, más 19% de IVA.
- El efectivo y las transferencias no generan comisión.
- Cada venta conserva la tarifa, comisión neta, IVA, abono esperado y plazo utilizados.
- El resumen de ventas muestra comisiones y cobro neto esperado.
- Rentabilidad distribuye el cargo fijo usando el ticket promedio esperado, evitando cargar $65 a cada producto.
- Aplicado en desarrollo: sí, mediante Supabase MCP (versión remota `20260814002835`).
- Aplicado en producción: el mismo proyecto conectado a Vercel.

## 2026-08-12.2 — Cierre de puesta en marcha y operación diaria

- Migraciones: `0017_close_startup_and_add_operations.sql`, `0018_index_operational_foreign_keys.sql`.
- El libro de puesta en marcha puede cerrarse y conserva una fotografía inmutable de sus totales.
- El cierre fija la inversión recuperable y deja el libro en modo histórico de sólo lectura.
- Nueva tabla aislada por RLS para compras, costos fijos, gastos, ingresos y movimientos del propietario.
- Las compras pueden actualizar atómicamente el precio de una materia prima sin implementar inventario.
- La recuperación se calcula con ventas y flujo operacional posteriores al cierre.
- Aplicado en desarrollo: sí, mediante Supabase MCP (`0017`: `20260812141445`; `0018`: `20260812141757`).
- Aplicado en producción: el mismo proyecto conectado a Vercel.

## 2026-08-12.1 — Clasificación y eliminación de recetas

- Migración: `0016_classify_and_delete_recipes.sql`.
- Las preparaciones se clasifican como `subrecipe` o `final`.
- Sólo las recetas finales pueden vincularse a productos.
- Las subrecetas pueden reutilizarse como componentes de recetas finales.
- Una receta puede eliminarse y se desvincula de los productos asociados.
- La eliminación se bloquea si la preparación todavía forma parte de otra receta.
- Aplicado en desarrollo: sí, mediante Supabase MCP (versión remota `20260812131412`).

## 2026-08-07.2 — Disponibilidad operativa por jornada

- Migración: `0015_add_daily_product_availability.sql`.
- Los productos por unidad pueden activar control de disponibilidad diaria.
- La apertura de caja registra unidades listas para vender por producto.
- Cada venta valida y descuenta disponibilidad dentro de la misma transacción.
- Se registran nueva producción, merma, consumo interno y correcciones con motivo.
- La disponibilidad pertenece a la jornada y no se arrastra al día siguiente.
- Las tablas nuevas tienen aislamiento RLS por negocio.
- Aplicado en desarrollo: sí, mediante Supabase MCP (versión remota `20260808012417`).

## 2026-08-07.1 — Motor de costos, recetas y proyecciones

- Migración: `0014_add_costing_engine.sql`.
- Materias primas sin inventario, con historial de precios y unidades normalizadas.
- Recetas y subrecetas con rendimiento por unidad o kilogramo.
- Vinculación de recetas con productos de caja, merma y margen objetivo.
- Parámetros de IVA, mezcla de pagos y comisiones.
- Costos fijos prorrateables y escenarios de venta por mezcla de productos.
- Todas las entidades nuevas tienen aislamiento RLS por negocio.
- Aplicado en desarrollo: sí, mediante Supabase MCP (versión remota `20260808003559`).

## 2026-07-15.3 — Historial independiente de cierres

- Migraciones: `0012_add_cash_closure_history.sql`, `0013_secure_cash_correction_function.sql`.
- Nueva ruta administrativa `/cierres`, separada del resumen de ventas.
- Muestra apertura, cierre, efectivo esperado, contado y diferencia por jornada.
- Permite completar o corregir cierres con motivo obligatorio.
- Cada ajuste conserva valor anterior, nuevo valor, responsable y fecha.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-15.2 — Regularización de cierres automáticos

- Migración: `0011_add_cash_close_reconciliation.sql`.
- Un cierre automático puede recibir posteriormente el efectivo real contado.
- La regularización conserva el cierre original y registra fecha, usuario y nota.
- Una jornada regularizada no se reabre ni modifica sus ventas.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-15.1 — Cierre automático de caja

- Migración: `0010_add_automatic_cash_close.sql`.
- Hora inicial de cierre automático: 22:00 según la zona horaria del negocio.
- Supabase revisa jornadas abiertas cada cinco minutos mediante `pg_cron`.
- El cierre queda identificado como automático y no inventa un efectivo contado.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-14.8 — Edición y eliminación segura de productos

- Migración: `0009_add_product_soft_delete.sql`.
- Los productos pueden editarse, ocultarse temporalmente o eliminarse del catálogo.
- La eliminación conserva las ventas históricas y bloquea nuevas ventas del producto.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-14.7 — Productos por unidad y por peso

- Migraciones: `0007_add_weighted_products.sql`, `0008_seed_product_categories.sql`.
- Los productos pueden venderse por unidad o por kilogramo.
- Para productos por peso, la cantidad histórica se almacena en kilogramos con tres decimales.
- El precio y total de cada línea se calculan en el servidor.
- Categorías establecidas: Bollería, Empanadas, Pan, Pan envasado, Bebidas y Otros.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-14.6 — Ventas y caja

- Migraciones: `0005_add_simple_pos_module.sql`, `0006_add_atomic_sale_function.sql`.
- Catálogo de productos con imágenes privadas y categorías.
- Jornadas de caja con apertura y cierre.
- Ventas y detalle histórico por producto y medio de pago.
- Función transaccional para registrar ventas con precios calculados en servidor.
- Sin inventario, descuentos, pagos mixtos, impresión ni integración tributaria.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-14.4 — Datos iniciales KUMERA

- Migración: `0004_seed_kumera_initial_business.sql`.
- Usuario administrador y superadministrador asignado.
- Negocio, libro, 12 categorías y tres movimientos iniciales cargados.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-14.3 — Seguridad de helpers y perfiles

- Migración: `0003_secure_helpers_and_profile_trigger.sql`.
- Helpers `security definer` movidos al esquema privado.
- Políticas RLS actualizadas y optimizadas.
- Creación automática de perfiles al crear usuarios Auth.
- Aplicado en desarrollo: sí, mediante Supabase MCP.

## 2026-07-14.2 — Integridad e índices

- Migración: `0002_data_integrity.sql`.
- Se impiden membresías, categorías y rutas de archivo duplicadas.
- Se validan montos positivos, suma neto + IVA, tasa tributaria y longitudes.
- Se agregan índices para consultas del libro por negocio, fecha y libro.
- Pasos manuales: ninguno en una base sin datos inconsistentes.

## 2026-07-14.1 — Esquema inicial del MVP

- Migraciones: `0000_eager_spiral.sql`, `0001_security_and_seed.sql`.
- Se agregaron negocios, perfiles, administrador por negocio, libro de apertura, categorías, movimientos, adjuntos y auditoría.
- Se agregaron tipos para movimiento, tratamiento de IVA y estado.
- Se habilitó RLS en las nueve tablas.
- Se agregaron funciones `is_superadmin()` y `administers(uuid)`.
- Se creó el bucket privado `receipts` con PDF e imágenes y límite de 10 MB.
- Se creó `esquema-actual.sql` como instalación consolidada.
- Pendiente de aplicación: proyecto Supabase todavía no conectado.

## Plantilla para la siguiente actualización

```markdown
## AAAA-MM-DD.N — Título

- Migración: `NNNN_nombre.sql`.
- Motivo:
- Tablas/columnas afectadas:
- Políticas o funciones afectadas:
- Pasos manuales:
- Aplicado en desarrollo: sí/no.
- Aplicado en producción: sí/no.
```
