import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Conexión PostgreSQL solo para código de servidor. Nunca importar desde un Client Component. */
export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no está configurada");
  const client = postgres(connectionString, { prepare: false, max: 5 });
  database = drizzle(client, { schema });
  return database;
}
