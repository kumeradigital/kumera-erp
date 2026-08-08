# Historial del esquema Supabase

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
