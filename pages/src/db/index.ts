import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// postgres.js instead of node-postgres: turbopack mangles `pg`'s external
// module name so it cannot resolve at runtime (ERR_MODULE_NOT_FOUND on
// every DB route). postgres.js is pure JS and bundles cleanly.
const globalForDb = globalThis as typeof globalThis & {
  __puffbasePostgresClient?: postgres.Sql;
};

export const sql =
  globalForDb.__puffbasePostgresClient ?? postgres(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__puffbasePostgresClient = sql;
}

export const db = drizzle(sql);
