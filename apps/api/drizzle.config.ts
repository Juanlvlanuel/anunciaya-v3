import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schemas/schema.ts',
  out: './src/db/schemas',
  casing: 'snake_case',  // ✨ NUEVO: Conversión automática camelCase → snake_case
  extensionsFilters: ['postgis'],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});