/**
 * admin/seguridad.service.ts
 * ===========================
 * 2FA del Panel Admin (solo SuperAdmin). SEPARADO del 2FA general de la app:
 * usa las columnas `panel_2fa_*` y nunca afecta el login de AnunciaYA.
 *
 * Reusa el patrón ya probado de la app: otplib (TOTP) + qrcode. Sin códigos de
 * respaldo (salida de emergencia = apagar panel_2fa_habilitado en BD a mano).
 *
 * Ubicación: apps/api/src/services/admin/seguridad.service.ts
 */

import { eq } from 'drizzle-orm';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../../db/index.js';
import { usuarios } from '../../db/schemas/schema.js';
import { generarTokens, type PayloadToken } from '../../utils/jwt.js';
import { guardarSesion } from '../../utils/tokenStore.js';
import { resolverNegocioUsuarioId, resolverRegionEquipo } from '../auth.service.js';

interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code: number;
}

/**
 * Emite un par de tokens CON la marca `panel2fa: true` (lo que el gate del Panel
 * exige) y guarda la sesión en Redis. Reusado por activar (recién prendido) y
 * verificar (entrada).
 */
async function emitirTokensConMarca(
  u: typeof usuarios.$inferSelect,
  ip?: string | null,
  userAgent?: string | null,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload: PayloadToken = {
    usuarioId: u.id,
    correo: u.correo,
    perfil: u.perfil,
    membresia: u.membresia,
    modoActivo: u.modoActivo || 'personal',
    sucursalAsignada: u.sucursalAsignada || null,
    negocioUsuarioId: await resolverNegocioUsuarioId(u.negocioId, u.sucursalAsignada),
    rolEquipo: u.rolEquipo || null,
    regionId: await resolverRegionEquipo(u),
    panel2fa: true, // ← marca que el gate del Panel exige
  };
  const tokens = generarTokens(payload);
  await guardarSesion(u.id, tokens.refreshToken, ip ?? null, userAgent ?? null);
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

/** Estado actual del 2FA del Panel para el usuario. */
export async function estado2faPanel(
  usuarioId: string,
): Promise<RespuestaServicio<{ habilitado: boolean }>> {
  const [u] = await db
    .select({ panel2faHabilitado: usuarios.panel2faHabilitado })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);
  if (!u) return { success: false, message: 'Usuario no encontrado', code: 404 };
  return { success: true, message: 'OK', data: { habilitado: u.panel2faHabilitado }, code: 200 };
}

/** Genera un secreto TOTP nuevo + QR (aún NO prende el 2FA; se confirma al activar). */
export async function generar2faPanel(
  usuarioId: string,
): Promise<RespuestaServicio<{ qrCode: string; secreto: string }>> {
  const [u] = await db
    .select({ correo: usuarios.correo, panel2faHabilitado: usuarios.panel2faHabilitado })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!u) return { success: false, message: 'Usuario no encontrado', code: 404 };
  if (u.panel2faHabilitado) {
    return { success: false, message: 'El 2FA del Panel ya está activado', code: 400 };
  }

  const secreto = authenticator.generateSecret();

  await db
    .update(usuarios)
    .set({ panel2faSecreto: secreto, updatedAt: new Date().toISOString() })
    .where(eq(usuarios.id, usuarioId));

  const otpauthUrl = authenticator.keyuri(u.correo, 'AnunciaYA Panel', secreto);
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  return {
    success: true,
    message: 'Escanea el código con Google Authenticator',
    data: { qrCode, secreto },
    code: 200,
  };
}

/**
 * Confirma el primer código, PRENDE el 2FA del Panel y emite tokens YA marcados
 * (para que el superadmin siga navegando sin re-loguear).
 */
export async function activar2faPanel(
  usuarioId: string,
  codigo: string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<RespuestaServicio<{ accessToken: string; refreshToken: string }>> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);

  if (!u) return { success: false, message: 'Usuario no encontrado', code: 404 };
  if (u.panel2faHabilitado) {
    return { success: false, message: 'El 2FA del Panel ya está activado', code: 400 };
  }
  if (!u.panel2faSecreto) {
    return { success: false, message: 'Primero genera el código QR', code: 400 };
  }

  const valido = authenticator.verify({ token: codigo, secret: u.panel2faSecreto });
  if (!valido) {
    return { success: false, message: 'Código incorrecto. Revisa tu app de autenticación.', code: 400 };
  }

  await db
    .update(usuarios)
    .set({ panel2faHabilitado: true, updatedAt: new Date().toISOString() })
    .where(eq(usuarios.id, usuarioId));

  const tokens = await emitirTokensConMarca({ ...u, panel2faHabilitado: true }, ip, userAgent);

  return {
    success: true,
    message: 'Verificación en dos pasos activada',
    data: tokens,
    code: 200,
  };
}

/**
 * Apaga el 2FA del Panel y borra el secreto. (El gate ya garantiza que solo quien
 * pasó el 2FA puede llegar aquí.)
 */
export async function desactivar2faPanel(usuarioId: string): Promise<RespuestaServicio> {
  await db
    .update(usuarios)
    .set({ panel2faHabilitado: false, panel2faSecreto: null, updatedAt: new Date().toISOString() })
    .where(eq(usuarios.id, usuarioId));
  return { success: true, message: 'Verificación en dos pasos desactivada', code: 200 };
}

/**
 * Verifica el TOTP EN LA PUERTA y, si es válido, emite tokens NUEVOS con la marca
 * `panel2fa: true`. Guarda la sesión en Redis.
 */
export async function verificar2faPanel(
  usuarioId: string,
  codigo: string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<RespuestaServicio<{ accessToken: string; refreshToken: string }>> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);

  if (!u) return { success: false, message: 'Usuario no encontrado', code: 404 };
  if (!u.panel2faHabilitado || !u.panel2faSecreto) {
    return { success: false, message: 'El 2FA del Panel no está activo', code: 400 };
  }

  const valido = authenticator.verify({ token: codigo, secret: u.panel2faSecreto });
  if (!valido) {
    return { success: false, message: 'Código incorrecto', code: 400 };
  }

  const tokens = await emitirTokensConMarca(u, ip, userAgent);

  return { success: true, message: 'Verificación correcta', data: tokens, code: 200 };
}
