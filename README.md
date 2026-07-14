# ERP KUMERA

MVP para registrar capital, gastos, activos y depósitos durante la apertura de un pequeño negocio de alimentos.

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación está conectada al proyecto Supabase de desarrollo. La portada requiere sesión y obtiene negocios, categorías, movimientos y comprobantes usando RLS. El modo `localStorage` permanece solo como fallback cuando el componente se utiliza explícitamente sin conexión.

## Conectar Supabase

1. Crear un proyecto Supabase y copiar `.env.example` a `.env.local`.
2. Completar URL, clave pública, URL de PostgreSQL y clave de servicio.
3. Ejecutar las migraciones de `supabase/migrations`.
4. Crear un bucket privado llamado `receipts` con límite de tamaño y MIME para PDF e imágenes.
5. Crear el primer usuario superadministrador desde Supabase Auth y marcar su perfil como `is_superadmin = true`.

La página `/login` implementa acceso por email y contraseña. Antes de producción debe activarse la protección de rutas una vez que el proyecto Supabase esté conectado.

## Comandos

- `npm run dev`: servidor local.
- `npm run build`: build de producción.
- `npm run lint`: análisis estático.
- `npm test`: pruebas de cálculos.
- `npm run db:generate`: genera migraciones desde Drizzle.

## Arquitectura

- Next.js, React y TypeScript.
- PostgreSQL, Auth y Storage de Supabase.
- Drizzle ORM y migraciones SQL.
- Vitest para reglas financieras.

Los montos se guardan como enteros en CLP. Los registros financieros se anulan; nunca se eliminan físicamente.
