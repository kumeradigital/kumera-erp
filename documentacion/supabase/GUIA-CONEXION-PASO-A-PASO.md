# Conectar ERP KUMERA con Supabase — paso a paso

Esta es la guía corta que debes seguir. No necesitas crear las tablas manualmente una por una.

## 1. Crear el proyecto en Supabase

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard).
2. Presiona **New project**.
3. Selecciona o crea una organización.
4. Usa un nombre como `erp-kumera-desarrollo`.
5. Genera una contraseña segura para PostgreSQL y guárdala; se necesita más adelante.
6. Selecciona la región disponible más cercana a Chile.
7. Presiona **Create new project** y espera a que termine.

Primero crea desarrollo. Producción debe ser otro proyecto separado cuando la aplicación esté lista.

## 2. Ejecutar el SQL de ERP KUMERA

1. Dentro del proyecto, abre **SQL Editor** en el menú izquierdo.
2. Presiona **New query**.
3. Abre en tu computador [esquema-actual.sql](./esquema-actual.sql).
4. Copia todo su contenido y pégalo en el editor.
5. Presiona **Run** una sola vez.
6. Confirma en **Table Editor** que existan las tablas `businesses`, `profiles`, `business_admins`, `opening_ledgers`, `categories` y `opening_entries`.
7. En **Storage**, confirma que exista el bucket privado `receipts`.

Este archivo ya incluye tablas, relaciones, validaciones, RLS y Storage.

## 3. Obtener las credenciales públicas

1. Dentro del proyecto presiona **Connect** en la parte superior.
2. Busca la sección para conectar una aplicación o las API keys.
3. Copia **Project URL**.
4. Copia **Publishable key**, que comienza normalmente con `sb_publishable_`.

La publishable key puede usarse en el navegador porque la información queda protegida por RLS. No confundas esta clave con la secret/service role.

## 4. Obtener la conexión PostgreSQL

1. Presiona nuevamente **Connect**.
2. Abre **Connection string**.
3. Selecciona **Transaction pooler**, apropiado para un despliegue serverless como Vercel.
4. Copia la URI, que normalmente utiliza el puerto `6543`.
5. Sustituye `[YOUR-PASSWORD]` por la contraseña de base creada en el paso 1.

No publiques esta URI. Contiene la contraseña de PostgreSQL.

## 5. Obtener la clave secreta de servidor

1. Abre **Project Settings**.
2. Entra a **API Keys**.
3. Copia la **Secret key** o, en proyectos antiguos, `service_role`.
4. Utilízala únicamente como `SUPABASE_SERVICE_ROLE_KEY` en el servidor.

Esta clave ignora RLS. Nunca debe tener prefijo `NEXT_PUBLIC_`, aparecer en el frontend ni subirse a GitHub.

## 6. Crear `.env.local`

En la raíz del proyecto, junto a `package.json`, crea un archivo llamado `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REEMPLAZAR
DATABASE_URL=postgresql://postgres.TU-REF:TU-PASSWORD@TU-POOLER:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=sb_secret_REEMPLAZAR
```

No edites `.env.example` con claves reales: ese archivo solo es la plantilla pública.

## 7. Crear el primer usuario

1. En Supabase abre **Authentication**.
2. Entra a **Users**.
3. Presiona **Add user** y luego **Create new user**.
4. Ingresa tu correo y una contraseña segura.
5. Activa la confirmación automática solo si Supabase ofrece esa opción al crear el usuario.
6. Copia el UUID del usuario creado.

## 8. Cargar el negocio y los datos iniciales

1. Abre [datos-iniciales-ejemplo.sql](./datos-iniciales-ejemplo.sql).
2. Reemplaza el texto `UUID_AUTH` por el UUID copiado en el paso anterior, manteniendo las comillas.
3. Copia el SQL completo.
4. En Supabase abre **SQL Editor > New query**.
5. Pega y ejecuta el contenido una vez.

Esto crea:

- el perfil superadministrador;
- el negocio Kumera Panadería;
- su relación de administrador;
- el libro de apertura;
- capital inicial de `$5.123.000`;
- arriendo de `$675.000`;
- garantía de `$675.000`.

## 9. Probar la conexión

Desde la raíz del proyecto ejecuta:

```bash
npm run dev
```

Luego:

1. Abre `http://localhost:3000/login`.
2. Inicia sesión con el usuario del paso 7.
3. Si las variables están presentes, la portada queda protegida y un visitante sin sesión vuelve a `/login`.
4. Si aparece “Faltan las variables públicas de Supabase”, revisa los nombres de `.env.local` y reinicia `npm run dev`.

## 10. Situación actual de la aplicación

### Archivos de conexión que ya existen

- `.env.example`: plantilla de variables.
- `src/server/supabase/client.ts`: cliente para componentes del navegador.
- `src/server/supabase/server.ts`: cliente Supabase para servidor y cookies.
- `src/server/supabase/proxy.ts`: renovación de sesión y redirecciones.
- `src/proxy.ts`: protección de rutas de Next.js.
- `src/server/db/client.ts`: conexión Drizzle/PostgreSQL.
- `src/server/db/schema.ts`: definición tipada de las tablas.
- `src/app/login/page.tsx`: formulario de inicio de sesión.
- `supabase/migrations/`: historial incremental de la base.

### Archivos o integración que todavía falta desarrollar

- Repositorio/servicio de movimientos que consulte `opening_entries`.
- Server Actions para crear, editar, duplicar y anular movimientos.
- Servicio de categorías conectado a `categories`.
- Servicio de dashboard con agregaciones PostgreSQL.
- Servicio de archivos para subir y firmar descargas de `receipts`.
- Server Actions del superadministrador.
- Pantalla de administración de usuarios y negocios.
- Auditoría automática en `entry_change_log` y `role_change_log`.

Hasta que esos servicios se implementen, la pantalla principal continúa leyendo y escribiendo su demostración en `localStorage`. Autenticación y protección de rutas sí quedan preparadas al agregar `.env.local`.

## 11. Antes de conectar Vercel

En Vercel agrega las mismas cuatro variables en **Project Settings > Environment Variables**. Usa credenciales del proyecto Supabase correspondiente a cada ambiente y nunca compartas producción con desarrollo.

## Si algo falla

- **El SQL dice que el tipo o tabla ya existe:** probablemente ejecutaste el consolidado antes. No lo repitas; revisa `HISTORIAL.md` y aplica solo migraciones pendientes.
- **Password authentication failed:** revisa la contraseña incluida en `DATABASE_URL`.
- **No puedes conectar por IPv6:** usa el Shared Pooler desde **Connect**, no la conexión directa.
- **La app entra pero no ve datos:** comprueba que `business_admins.user_id` sea el UUID exacto de `auth.users` y que `active` sea `true`.
- **Storage devuelve acceso denegado:** la ruta del objeto debe comenzar por el UUID del negocio, por ejemplo `BUSINESS_UUID/comprobantes/archivo.pdf`.
