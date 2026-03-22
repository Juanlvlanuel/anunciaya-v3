/**
 * helpers.ts
 * ===========
 * Helpers compartidos para tests E2E de la API.
 * Genera tokens JWT, hace requests HTTP, y limpia datos de prueba.
 *
 * UBICACIÓN: apps/api/src/__tests__/helpers.ts
 */

import { config } from 'dotenv';
config(); // Cargar .env antes de cualquier import

import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { usuarios } from '../db/schemas/schema.js';
import { eq, sql } from 'drizzle-orm';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const API_PORT = process.env.API_PORT || '4000';
export const BASE_URL = `http://localhost:${API_PORT}/api`;

// =============================================================================
// GENERACIÓN DE TOKENS
// =============================================================================

interface PayloadTest {
  usuarioId: string;
  correo: string;
  perfil: string;
  membresia: number;
  modoActivo: string;
  sucursalAsignada?: string | null;
}

/**
 * Genera un access token JWT válido para testing.
 * Usa el mismo JWT_SECRET del .env.
 */
export function generarTokenTest(payload: PayloadTest): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no encontrado en .env');

  return jwt.sign(payload, secret, { expiresIn: '1h' }) as string;
}

// =============================================================================
// USUARIOS DE PRUEBA
// =============================================================================

/** IDs fijos para los usuarios de prueba (se crean si no existen) */
export const USUARIO_1_ID = 'a0000000-0000-4000-a000-000000000001';
export const USUARIO_2_ID = 'a0000000-0000-4000-a000-000000000002';

export const TOKEN_USUARIO_1 = () => generarTokenTest({
  usuarioId: USUARIO_1_ID,
  correo: 'test1@anunciaya.com',
  perfil: 'personal',
  membresia: 0,
  modoActivo: 'personal',
});

export const TOKEN_USUARIO_2 = () => generarTokenTest({
  usuarioId: USUARIO_2_ID,
  correo: 'test2@anunciaya.com',
  perfil: 'personal',
  membresia: 0,
  modoActivo: 'personal',
});

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

/**
 * Crea los usuarios de prueba en la BD si no existen.
 */
export async function crearUsuariosPrueba(): Promise<void> {
  const existentes = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`id IN (${USUARIO_1_ID}, ${USUARIO_2_ID})`);

  const idsExistentes = existentes.map((u) => u.id);

  if (!idsExistentes.includes(USUARIO_1_ID)) {
    await db.insert(usuarios).values({
      id: USUARIO_1_ID,
      nombre: 'Test Usuario 1',
      apellidos: 'E2E',
      correo: 'test1@anunciaya.com',
      perfil: 'personal',
    });
  }

  if (!idsExistentes.includes(USUARIO_2_ID)) {
    await db.insert(usuarios).values({
      id: USUARIO_2_ID,
      nombre: 'Test Usuario 2',
      apellidos: 'E2E',
      correo: 'test2@anunciaya.com',
      perfil: 'personal',
    });
  }
}

/**
 * Limpia todos los datos de prueba creados durante los tests.
 * Elimina usuarios de prueba (CASCADE borra conversaciones, mensajes, etc.)
 */
export async function limpiarDatosPrueba(): Promise<void> {
  await db.delete(usuarios).where(eq(usuarios.id, USUARIO_1_ID));
  await db.delete(usuarios).where(eq(usuarios.id, USUARIO_2_ID));
}

// =============================================================================
// HTTP HELPERS
// =============================================================================

interface RequestOpciones {
  method?: string;
  body?: Record<string, unknown>;
  token?: string;
}

/**
 * Helper para hacer requests HTTP a la API.
 */
export async function request(ruta: string, opciones: RequestOpciones = {}): Promise<{
  status: number;
  data: Record<string, unknown>;
}> {
  const { method = 'GET', body, token } = opciones;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const respuesta = await fetch(`${BASE_URL}${ruta}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await respuesta.json();

  return { status: respuesta.status, data };
}
