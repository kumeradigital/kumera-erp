# Supabase — Manual operativo de ERP KUMERA

**Estado del documento:** vigente  
**Versión del esquema:** `2026-07-14.4`  
**Última migración incluida:** `supabase/migrations/0004_seed_kumera_initial_business.sql`

Esta carpeta es la referencia humana para conectar y mantener Supabase. La fuente técnica de verdad continúa siendo:

1. `src/server/db/schema.ts`, para tablas y tipos administrados con Drizzle.
2. `supabase/migrations/`, para el historial inmutable aplicado a cada ambiente.
3. `documentacion/supabase/esquema-actual.sql`, como copia consolidada para crear un proyecto vacío desde el SQL Editor.

## ¿Quieres conectar el proyecto ahora?

Sigue [GUIA-CONEXION-PASO-A-PASO.md](./GUIA-CONEXION-PASO-A-PASO.md). Esa guía indica exactamente dónde hacer clic, qué SQL ejecutar, dónde encontrar las credenciales y qué contenido debe llevar `.env.local`.

## Qué está pendiente

- [x] Crear un proyecto de Supabase para desarrollo.
- [x] Guardar URL y publishable key en `.env.local`.
- [x] Ejecutar `esquema-actual.sql`.
- [x] Crear el primer usuario desde Authentication > Users.
- [x] Crear su perfil y marcar `is_superadmin = true`.
- [x] Crear el negocio KUMERA, su libro, categorías y relación de administrador.
- [x] Conectar movimientos, categorías y dashboard a Supabase mediante Server Actions.
- [x] Implementar carga real al bucket privado `receipts`.
- [x] Activar protección de rutas y renovación de sesión.
- [ ] Activar protección contra contraseñas filtradas en la configuración de Supabase Auth.
- [ ] Implementar pantalla del superadministrador para asignar o quitar administradores.
- [x] Implementar escritura de `entry_change_log` para mutaciones financieras.
- [ ] Implementar `role_change_log` junto con la pantalla de superadministración.
- [ ] Crear proyecto Supabase separado para producción y aplicar las mismas migraciones.
- [ ] Configurar backups y una copia independiente de los objetos del bucket `receipts`.

## Instalación inicial paso a paso

### 1. Crear el proyecto

En Supabase crea un proyecto en la región disponible más cercana a Chile. Usa una contraseña de base de datos única y guárdala en un gestor de secretos.

### 2. Configurar variables locales

Copia `.env.example` como `.env.local` y completa:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
```

La service role nunca debe utilizarse en componentes cliente ni publicarse en Git.

### 3. Crear el esquema

Para un proyecto completamente vacío, abre SQL Editor, copia todo `esquema-actual.sql` y ejecútalo una vez. El script crea:

- nueve tablas de negocio;
- enumeraciones de movimientos, IVA y estados;
- relaciones e índices;
- Row Level Security;
- funciones de autorización;
- bucket privado `receipts` y sus políticas.

Para una base ya existente, **no vuelvas a ejecutar el consolidado**. Ejecuta únicamente las migraciones nuevas de `supabase/migrations/`, en orden numérico.

### 4. Crear el superadministrador

1. Crea el usuario en Authentication > Users.
2. Copia su UUID.
3. Ejecuta, reemplazando los valores:

```sql
insert into public.profiles (id, email, display_name, is_superadmin)
values ('UUID_AUTH', 'correo@ejemplo.cl', 'Nombre', true);
```

### 5. Crear KUMERA y asignar su administrador

Usa el bloque transaccional de `datos-iniciales-ejemplo.sql`. Antes de ejecutarlo reemplaza `UUID_AUTH` por el UUID del usuario. El archivo carga el capital inicial, arriendo y garantía del caso conocido.

### 6. Verificar seguridad

- Con el administrador autenticado, debe poder leer y modificar solo su negocio.
- Un usuario sin `business_admins.active = true` no debe ver movimientos.
- El superadministrador puede administrar roles, pero la interfaz financiera no debe usar sus privilegios.
- Un comprobante debe almacenarse bajo `BUSINESS_UUID/...` dentro de `receipts`.

## Cómo actualizar la base de datos

Cada cambio seguirá siempre este flujo:

1. Modificar `src/server/db/schema.ts`.
2. Ejecutar `npm run db:generate`.
3. Revisar el SQL nuevo generado en `supabase/migrations/`; nunca editar una migración ya aplicada.
4. Añadir manualmente funciones, políticas RLS, triggers o datos controlados que Drizzle no genere.
5. Probar primero en el proyecto de desarrollo.
6. Añadir el cambio equivalente al final de `esquema-actual.sql`, para que siga representando una instalación desde cero.
7. Actualizar arriba la versión y la “última migración incluida”.
8. Añadir una entrada a `HISTORIAL.md` con fecha, migración, motivo y pasos manuales.
9. Aplicar la migración en producción y verificarla.

### Convención de versiones

Usaremos `AAAA-MM-DD.N`, por ejemplo `2026-07-14.1`. El número final aumenta si existe más de una actualización en el día.

### Regla de oro

Las migraciones aplicadas son inmutables. Una corrección se hace con una migración nueva. El SQL consolidado puede actualizarse porque es una ayuda para instalaciones nuevas, pero nunca sustituye el historial de migraciones de una base existente.

## Consultas de verificación

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select id, name, public, file_size_limit
from storage.buckets
where id = 'receipts';

select b.name, p.email, ba.active
from public.business_admins ba
join public.businesses b on b.id = ba.business_id
join public.profiles p on p.id = ba.user_id;
```
