/**
 * setup.ts
 * =========
 * Script de setup para tests E2E de Playwright.
 * Crea usuarios de prueba en la BD local antes de correr los tests.
 *
 * EJECUTAR: npx tsx e2e/setup.ts (desde apps/web)
 * O automáticamente como globalSetup en playwright.config.ts
 *
 * UBICACIÓN: apps/web/e2e/setup.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env del backend
config({ path: resolve(__dirname, '../../api/.env') });

async function setup() {
  const jwt = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET no encontrado. Verifica apps/api/.env');
  }

  const API_URL = 'http://localhost:4000/api';

  const USUARIO_1_ID = 'a0000000-0000-4000-a000-000000000001';
  const USUARIO_2_ID = 'a0000000-0000-4000-a000-000000000002';

  // Generar token admin para verificar/crear usuarios
  const token = jwt.default.sign(
    { usuarioId: USUARIO_1_ID, correo: 'test1@anunciaya.com', perfil: 'personal', membresia: 0, modoActivo: 'personal' },
    secret,
    { expiresIn: '1h' }
  );

  // Verificar si la API está corriendo
  try {
    await fetch(`${API_URL}/auth/verificar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    console.error('❌ La API no está corriendo en localhost:4000. Ejecuta: cd apps/api && npm run dev');
    process.exit(1);
  }

  // Intentar crear conversación para verificar que los usuarios existen
  const resp = await fetch(`${API_URL}/chatya/conversaciones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      participante2Id: USUARIO_2_ID,
      participante2Modo: 'personal',
      contextoTipo: 'directo',
    }),
  });

  const data = await resp.json();

  if (data.success) {
    console.log('✅ Setup completo — usuarios y conversación de prueba listos');
  } else {
    console.error('❌ Error en setup:', data.message);
    console.error('   Ejecuta primero: cd apps/api && npm test');
    console.error('   (Esto crea los usuarios de prueba en la BD)');
    process.exit(1);
  }
}

setup();
