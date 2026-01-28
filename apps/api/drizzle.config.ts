import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

// Función para obtener la URL correcta según el ambiente
function getDatabaseUrl(): string {
  const environment = process.env.DB_ENVIRONMENT || 'local';
  
  if (environment === 'production') {
    return process.env.DATABASE_URL_PRODUCTION!;
  }
  
  return process.env.DATABASE_URL!;
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schemas/schema.ts',
  out: './src/db/schemas',
  casing: 'snake_case',  // ✨ Conversión automática camelCase → snake_case
  extensionsFilters: ['postgis'],
  dbCredentials: {
    url: getDatabaseUrl(),  // ✨ Ahora respeta DB_ENVIRONMENT
  },
});