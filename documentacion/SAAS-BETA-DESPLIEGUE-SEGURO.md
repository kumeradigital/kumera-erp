# Despliegue seguro de la beta SaaS

La migración `0084_saas_foundation.sql` no debe ejecutarse directamente en el
proyecto productivo. La operación actual de Kumera es la fuente de verdad.

## 1. Respaldo y ensayo

1. Confirmar en Supabase que existe un respaldo reciente y que puede
   restaurarse. Guardar además una exportación de PostgreSQL y del bucket
   `receipts`.
2. Ejecutar la primera consulta de
   `documentacion/supabase/linea-base-integridad.sql` y conservar el resultado.
3. Restaurar el respaldo en un proyecto de ensayo separado.
4. Confirmar que la tabla de migraciones remota contiene `0000` a `0083`. No
   volver a ejecutar migraciones históricas.
5. Aplicar `0084` solamente en el proyecto restaurado.
6. Ejecutar ambas consultas de integridad. Los conteos y totales operacionales
   deben coincidir; sólo deben aparecer configuraciones SaaS, membresías y el
   local principal nuevos.

## 2. Validación funcional

- Iniciar sesión como Kumera y recorrer Caja, cierre, ventas, inventario,
  costeo, finanzas, empresa y remuneraciones.
- Confirmar que Kumera conserva el mismo `business_id`, tiene plan
  `operations`, adicional `payroll` y onboarding `complete`.
- Crear un cliente vacío desde `/admin/clientes` en el entorno de ensayo.
- Completar `/configuracion-inicial` y confirmar que el plan `costs` no puede
  consultar módulos no contratados.
- Mantener `KUMERA_SAAS_ENABLED=false` mientras se realizan estas pruebas.

## 3. Activación controlada

1. Aplicar primero la migración verificada y desplegar el código con
   `KUMERA_SAAS_ENABLED=false`.
2. Repetir la línea base y el recorrido de Kumera.
3. Configurar `SUPABASE_SERVICE_ROLE_KEY` sólo en el servidor de producción;
   nunca usar el prefijo `NEXT_PUBLIC_`.
4. Activar `KUMERA_SAAS_ENABLED=true` inicialmente en un despliegue de prueba.
5. Crear y validar el cliente beta. Recién entonces activar la bandera en el
   despliegue principal.

## Reversión

Desactivar `KUMERA_SAAS_ENABLED` restaura inmediatamente el comportamiento
anterior de la aplicación. No se deben revertir las tablas aditivas ni borrar
filas. Si los controles de integridad detectan una alteración operacional, se
detiene el despliegue y se restaura el respaldo verificado.
