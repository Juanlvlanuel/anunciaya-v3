import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schemas/*',
  out: './src/db/schemas',
  casing: 'snake_case',  // ✨ NUEVO: Conversión automática camelCase → snake_case
  dbCredentials: {
    host: 'localhost', 
    port: 5432,
    database: 'anunciaya',
    user: 'postgres',
    password: 'postgres',
    ssl: false,
  },
});