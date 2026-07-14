# Historial del esquema Supabase

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
