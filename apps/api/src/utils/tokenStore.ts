/**
 * tokenStore.ts
 * ==============
 * Manejo de refresh tokens en Redis con soporte para múltiples sesiones.
 * 
 * Estructura en Redis:
 * - session:{usuarioId}:{sessionId} → JSON con datos de la sesión
 * - user_sessions:{usuarioId} → SET con todos los sessionIds del usuario
 * 
 * Ubicación: apps/api/src/utils/tokenStore.ts
 */

import crypto from 'crypto';
import { redis } from '../db/redis.js';

// =============================================================================
// CONSTANTES
// =============================================================================

// Prefijos para las claves en Redis
const PREFIX_SESSION = 'session';
const PREFIX_USER_SESSIONS = 'user_sessions';

// TTL del refresh token (7 días en segundos)
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 604800 segundos

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Datos de una sesión guardada en Redis
 */
export interface DatosSesion {
  sessionId: string;
  usuarioId: string;
  refreshToken: string;
  ip: string | null;
  dispositivo: string | null;
  creadoEn: string;
}

/**
 * Información de sesión para mostrar al usuario (sin el token)
 */
export interface SesionPublica {
  sessionId: string;
  ip: string | null;
  dispositivo: string | null;
  creadoEn: string;
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Genera un ID único para la sesión
 */
function generarSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Construye la clave de Redis para una sesión específica
 */
function claveSession(usuarioId: string, sessionId: string): string {
  return `${PREFIX_SESSION}:${usuarioId}:${sessionId}`;
}

/**
 * Construye la clave de Redis para el SET de sesiones del usuario
 */
function claveUserSessions(usuarioId: string): string {
  return `${PREFIX_USER_SESSIONS}:${usuarioId}`;
}

/**
 * Extrae información del User-Agent para mostrar dispositivo legible
 */
function parsearDispositivo(userAgent: string | undefined | null): string | null {
  if (!userAgent) return null;

  // Simplificar el user agent para mostrar algo legible
  if (userAgent.includes('Mobile')) return 'Móvil';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Postman')) return 'Postman';

  return userAgent.substring(0, 50); // Primeros 50 caracteres
}

// =============================================================================
// FUNCIÓN 1: GUARDAR SESIÓN
// =============================================================================

/**
 * Guarda un nuevo refresh token (crea una nueva sesión)
 * 
 * @param usuarioId - ID del usuario
 * @param refreshToken - El refresh token generado
 * @param ip - IP del cliente (opcional)
 * @param userAgent - User-Agent del cliente (opcional)
 * @returns sessionId de la nueva sesión
 */
export async function guardarSesion(
  usuarioId: string,
  refreshToken: string,
  ip?: string | null,
  userAgent?: string | null
): Promise<string> {
  const sessionId = generarSessionId();

  const datosSesion: DatosSesion = {
    sessionId,
    usuarioId,
    refreshToken,
    ip: ip || null,
    dispositivo: parsearDispositivo(userAgent),
    creadoEn: new Date().toISOString(),
  };

  // Guardar la sesión con TTL
  await redis.setex(
    claveSession(usuarioId, sessionId),
    REFRESH_TOKEN_TTL,
    JSON.stringify(datosSesion)
  );

  // Agregar sessionId al SET del usuario
  await redis.sadd(claveUserSessions(usuarioId), sessionId);

  // Poner TTL al SET también (se renueva cada vez que se agrega)
  await redis.expire(claveUserSessions(usuarioId), REFRESH_TOKEN_TTL);

  return sessionId;
}

// =============================================================================
// FUNCIÓN 2: VERIFICAR SESIÓN
// =============================================================================

/**
 * Verifica que un refresh token sea válido y esté en Redis
 * 
 * @param usuarioId - ID del usuario
 * @param refreshToken - El refresh token a verificar
 * @returns Los datos de la sesión si es válido, null si no
 */
export async function verificarSesion(
  usuarioId: string,
  refreshToken: string
): Promise<DatosSesion | null> {
  // Obtener todos los sessionIds del usuario
  const sessionIds = await redis.smembers(claveUserSessions(usuarioId));

  // Buscar en cada sesión si el token coincide
  for (const sessionId of sessionIds) {
    const datosRaw = await redis.get(claveSession(usuarioId, sessionId));

    if (datosRaw) {
      const datos: DatosSesion = JSON.parse(datosRaw);

      if (datos.refreshToken === refreshToken) {
        return datos;
      }
    }
  }

  return null;
}

// =============================================================================
// FUNCIÓN 3: ELIMINAR SESIÓN (LOGOUT)
// =============================================================================

/**
 * Elimina una sesión específica (logout de un dispositivo)
 * 
 * @param usuarioId - ID del usuario
 * @param sessionId - ID de la sesión a eliminar
 * @returns true si se eliminó, false si no existía
 */
export async function eliminarSesion(
  usuarioId: string,
  sessionId: string
): Promise<boolean> {
  // Eliminar la sesión
  const eliminado = await redis.del(claveSession(usuarioId, sessionId));

  // Remover del SET del usuario
  await redis.srem(claveUserSessions(usuarioId), sessionId);

  return eliminado > 0;
}

// =============================================================================
// FUNCIÓN 4: ELIMINAR SESIÓN POR TOKEN
// =============================================================================

/**
 * Elimina la sesión que tiene un refresh token específico
 * 
 * @param usuarioId - ID del usuario
 * @param refreshToken - El refresh token de la sesión a eliminar
 * @returns true si se eliminó, false si no existía
 */
export async function eliminarSesionPorToken(
  usuarioId: string,
  refreshToken: string
): Promise<boolean> {
  const sesion = await verificarSesion(usuarioId, refreshToken);

  if (sesion) {
    return eliminarSesion(usuarioId, sesion.sessionId);
  }

  return false;
}

// =============================================================================
// FUNCIÓN 5: ELIMINAR TODAS LAS SESIONES
// =============================================================================

/**
 * Elimina todas las sesiones de un usuario (logout de todos los dispositivos)
 * 
 * @param usuarioId - ID del usuario
 * @returns Número de sesiones eliminadas
 */
export async function eliminarTodasLasSesiones(
  usuarioId: string
): Promise<number> {
  // Obtener todos los sessionIds
  const sessionIds = await redis.smembers(claveUserSessions(usuarioId));

  if (sessionIds.length === 0) return 0;

  // Eliminar cada sesión
  const claves = sessionIds.map(id => claveSession(usuarioId, id));
  await redis.del(...claves);

  // Eliminar el SET
  await redis.del(claveUserSessions(usuarioId));

  return sessionIds.length;
}

// =============================================================================
// FUNCIÓN 6: OBTENER SESIONES ACTIVAS
// =============================================================================

/**
 * Obtiene todas las sesiones activas de un usuario
 * 
 * @param usuarioId - ID del usuario
 * @returns Lista de sesiones (sin el token por seguridad)
 */
export async function obtenerSesionesActivas(
  usuarioId: string
): Promise<SesionPublica[]> {
  const sessionIds = await redis.smembers(claveUserSessions(usuarioId));
  const sesiones: SesionPublica[] = [];

  for (const sessionId of sessionIds) {
    const datosRaw = await redis.get(claveSession(usuarioId, sessionId));

    if (datosRaw) {
      const datos: DatosSesion = JSON.parse(datosRaw);

      // No incluir el refreshToken por seguridad
      sesiones.push({
        sessionId: datos.sessionId,
        ip: datos.ip,
        dispositivo: datos.dispositivo,
        creadoEn: datos.creadoEn,
      });
    } else {
      // Limpiar sessionId huérfano del SET
      await redis.srem(claveUserSessions(usuarioId), sessionId);
    }
  }

  // Ordenar por fecha de creación (más reciente primero)
  sesiones.sort((a, b) =>
    new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
  );

  return sesiones;
}

// =============================================================================
// FUNCIÓN 7: CONTAR SESIONES ACTIVAS
// =============================================================================

/**
 * Cuenta cuántas sesiones activas tiene un usuario
 * 
 * @param usuarioId - ID del usuario
 * @returns Número de sesiones activas
 */
export async function contarSesionesActivas(
  usuarioId: string
): Promise<number> {
  return redis.scard(claveUserSessions(usuarioId));
}

// =============================================================================
// RECUPERACIÓN DE CONTRASEÑA - CÓDIGOS TEMPORALES EN REDIS
// =============================================================================
// Estas funciones manejan los códigos de 6 dígitos para recuperar contraseña.
// Se guardan en Redis con TTL de 15 minutos y máximo 5 intentos.

// Prefijo para las claves de recuperación
const PREFIX_RECOVERY = 'recovery';

// TTL del código de recuperación (15 minutos en segundos)
const RECOVERY_CODE_TTL = 15 * 60; // 900 segundos

// Máximo de intentos antes de invalidar el código
const MAX_INTENTOS_RECUPERACION = 5;

/**
 * Datos del código de recuperación guardado en Redis
 */
export interface DatosRecuperacion {
  codigo: string;
  intentos: number;
  creadoEn: string;
}

/**
 * Construye la clave de Redis para recuperación de contraseña
 * Ejemplo: "recovery:juan@ejemplo.com"
 */
function claveRecuperacion(correo: string): string {
  return `${PREFIX_RECOVERY}:${correo.toLowerCase()}`;
}

// =============================================================================
// FUNCIÓN: GUARDAR CÓDIGO DE RECUPERACIÓN
// =============================================================================

/**
 * Guarda un código de recuperación de contraseña en Redis
 * 
 * ¿Qué hace?
 * - Crea una entrada en Redis con el código y TTL de 15 minutos
 * - Si ya existía un código anterior, lo reemplaza (nuevo código)
 * - Reinicia el contador de intentos a 0
 * 
 * @param correo - Email del usuario (se convierte a minúsculas)
 * @param codigo - Código de 6 dígitos generado
 * @returns true si se guardó correctamente
 * 
 * @example
 * await guardarCodigoRecuperacion('juan@ejemplo.com', '847293');
 */
export async function guardarCodigoRecuperacion(
  correo: string,
  codigo: string
): Promise<boolean> {
  try {
    const datosRecuperacion: DatosRecuperacion = {
      codigo,
      intentos: 0,
      creadoEn: new Date().toISOString(),
    };

    // Guardar con TTL de 15 minutos
    await redis.setex(
      claveRecuperacion(correo),
      RECOVERY_CODE_TTL,
      JSON.stringify(datosRecuperacion)
    );

    return true;
  } catch (error) {
    console.error('Error al guardar código de recuperación:', error);
    return false;
  }
}

// =============================================================================
// FUNCIÓN: VERIFICAR CÓDIGO DE RECUPERACIÓN
// =============================================================================

/**
 * Resultado de la verificación del código
 */
export interface ResultadoVerificacionCodigo {
  valido: boolean;
  error?: string;
  intentosRestantes?: number;
}

/**
 * Verifica si el código de recuperación es correcto
 * 
 * ¿Qué hace?
 * - Busca el código en Redis
 * - Compara con el código proporcionado
 * - Controla intentos fallidos (máximo 5)
 * - Si supera 5 intentos, elimina el código (debe solicitar uno nuevo)
 * 
 * @param correo - Email del usuario
 * @param codigo - Código de 6 dígitos a verificar
 * @returns Objeto con resultado de la verificación
 * 
 * @example
 * const resultado = await verificarCodigoRecuperacion('juan@ejemplo.com', '847293');
 * if (resultado.valido) {
 *   // Código correcto, proceder a cambiar contraseña
 * }
 */
export async function verificarCodigoRecuperacion(
  correo: string,
  codigo: string
): Promise<ResultadoVerificacionCodigo> {
  try {
    const clave = claveRecuperacion(correo);
    const datosRaw = await redis.get(clave);

    // -------------------------------------------------------------------------
    // Caso 1: No existe código (expiró o nunca se solicitó)
    // -------------------------------------------------------------------------
    if (!datosRaw) {
      return {
        valido: false,
        error: 'No hay solicitud de recuperación activa. Solicita un nuevo código.',
      };
    }

    const datos: DatosRecuperacion = JSON.parse(datosRaw);

    // -------------------------------------------------------------------------
    // Caso 2: Código correcto
    // -------------------------------------------------------------------------
    if (datos.codigo === codigo) {
      return {
        valido: true,
      };
    }

    // -------------------------------------------------------------------------
    // Caso 3: Código incorrecto - incrementar intentos
    // -------------------------------------------------------------------------
    datos.intentos += 1;
    const intentosRestantes = MAX_INTENTOS_RECUPERACION - datos.intentos;

    // Si superó el máximo, eliminar código (debe solicitar uno nuevo)
    if (datos.intentos >= MAX_INTENTOS_RECUPERACION) {
      await redis.del(clave);
      return {
        valido: false,
        error: 'Demasiados intentos fallidos. Solicita un nuevo código.',
        intentosRestantes: 0,
      };
    }

    // Actualizar intentos en Redis (mantener el TTL restante)
    const ttlRestante = await redis.ttl(clave);
    if (ttlRestante > 0) {
      await redis.setex(clave, ttlRestante, JSON.stringify(datos));
    }

    return {
      valido: false,
      error: `Código incorrecto. Te quedan ${intentosRestantes} intento(s).`,
      intentosRestantes,
    };

  } catch (error) {
    console.error('Error al verificar código de recuperación:', error);
    return {
      valido: false,
      error: 'Error al verificar el código. Intenta de nuevo.',
    };
  }
}

// =============================================================================
// FUNCIÓN: ELIMINAR CÓDIGO DE RECUPERACIÓN
// =============================================================================

/**
 * Elimina el código de recuperación de Redis
 * 
 * ¿Cuándo se usa?
 * - Después de que el usuario cambia su contraseña exitosamente
 * - Para invalidar el código y que no pueda usarse de nuevo
 * 
 * @param correo - Email del usuario
 * @returns true si se eliminó (o no existía)
 * 
 * @example
 * // Después de cambiar la contraseña:
 * await eliminarCodigoRecuperacion('juan@ejemplo.com');
 */
export async function eliminarCodigoRecuperacion(
  correo: string
): Promise<boolean> {
  try {
    await redis.del(claveRecuperacion(correo));
    return true;
  } catch (error) {
    console.error('Error al eliminar código de recuperación:', error);
    return false;
  }
}

// =============================================================================
// REGISTRO PENDIENTE - VERIFICACIÓN ANTES DE CREAR CUENTA
// =============================================================================
// Estas funciones manejan el registro temporal en Redis.
// El usuario se guarda aquí hasta que verifica su correo.
// Solo después de verificar se crea la cuenta en PostgreSQL.

// Prefijo para las claves de registro pendiente
const PREFIX_REGISTRO = 'registro_pendiente';

// TTL del registro pendiente (15 minutos en segundos)
const REGISTRO_PENDIENTE_TTL = 15 * 60; // 900 segundos

// Máximo de intentos antes de invalidar el registro
const MAX_INTENTOS_REGISTRO = 5;

/**
 * Datos del registro pendiente guardado en Redis
 */
export interface DatosRegistroPendiente {
  nombre: string;
  apellidos: string;
  correo: string;
  contrasenaHash: string;  // Ya hasheada con bcrypt
  telefono: string | null;
  perfil: 'personal' | 'comercial';
  membresia: number;
  codigo: string;           // 6 dígitos
  intentos: number;         // Intentos fallidos de verificación
  creadoEn: string;         // ISO timestamp
  // ========== NUEVO CAMPO ==========
  nombreNegocio: string | null;  // Solo para perfil comercial
}

/**
 * Resultado de la verificación del código de registro
 */
export interface ResultadoVerificacionRegistro {
  valido: boolean;
  data?: DatosRegistroPendiente;
  error?: string;
  intentosRestantes?: number;
}

/**
 * Construye la clave de Redis para registro pendiente
 * Ejemplo: "registro_pendiente:juan@ejemplo.com"
 */
function claveRegistroPendiente(correo: string): string {
  return `${PREFIX_REGISTRO}:${correo.toLowerCase()}`;
}

// =============================================================================
// FUNCIÓN: GUARDAR REGISTRO PENDIENTE
// =============================================================================

/**
 * Guarda los datos de registro en Redis (temporal, 15 min)
 * 
 * ¿Qué hace?
 * - Crea una entrada en Redis con los datos del registro
 * - Si ya existía un registro con ese correo, lo sobrescribe
 * - El TTL es de 15 minutos (auto-elimina si no verifica)
 * 
 * @param datos - Datos del usuario (nombre, correo, contraseña hasheada, etc.)
 * @returns true si se guardó correctamente
 * 
 * @example
 * await guardarRegistroPendiente({
 *   nombre: 'Juan',
 *   apellidos: 'Pérez',
 *   correo: 'juan@ejemplo.com',
 *   contrasenaHash: '$2b$12$...',
 *   telefono: null,
 *   perfil: 'personal',
 *   codigo: '847293',
 * });
 */
export async function guardarRegistroPendiente(
  datos: Omit<DatosRegistroPendiente, 'intentos' | 'creadoEn'>
): Promise<boolean> {
  try {
    const datosCompletos: DatosRegistroPendiente = {
      ...datos,
      intentos: 0,
      creadoEn: new Date().toISOString(),
    };

    // Guardar con TTL de 15 minutos
    await redis.setex(
      claveRegistroPendiente(datos.correo),
      REGISTRO_PENDIENTE_TTL,
      JSON.stringify(datosCompletos)
    );

    return true;
  } catch (error) {
    console.error('Error al guardar registro pendiente:', error);
    return false;
  }
}

// =============================================================================
// FUNCIÓN: OBTENER REGISTRO PENDIENTE
// =============================================================================

/**
 * Obtiene los datos de un registro pendiente
 * 
 * ¿Qué hace?
 * - Busca en Redis por correo
 * - Retorna los datos si existe
 * - Retorna null si no existe o expiró
 * 
 * @param correo - Email del usuario (se convierte a minúsculas)
 * @returns Datos del registro o null
 * 
 * @example
 * const registro = await obtenerRegistroPendiente('juan@ejemplo.com');
 * if (registro) {
 *   console.log('Registro encontrado:', registro.nombre);
 * }
 */
export async function obtenerRegistroPendiente(
  correo: string
): Promise<DatosRegistroPendiente | null> {
  try {
    const datosRaw = await redis.get(claveRegistroPendiente(correo));

    if (!datosRaw) {
      return null;
    }

    return JSON.parse(datosRaw) as DatosRegistroPendiente;
  } catch (error) {
    console.error('Error al obtener registro pendiente:', error);
    return null;
  }
}

// =============================================================================
// FUNCIÓN: VERIFICAR CÓDIGO DE REGISTRO
// =============================================================================

/**
 * Verifica si el código de registro es correcto
 * 
 * ¿Qué hace?
 * - Busca el registro en Redis
 * - Compara el código proporcionado
 * - Si es correcto: retorna los datos para crear la cuenta
 * - Si es incorrecto: incrementa intentos (máx 5)
 * - Si supera 5 intentos: elimina el registro
 * 
 * @param correo - Email del usuario
 * @param codigo - Código de 6 dígitos a verificar
 * @returns Resultado con datos si es válido, o error si no
 * 
 * @example
 * const resultado = await verificarCodigoRegistro('juan@ejemplo.com', '847293');
 * if (resultado.valido && resultado.data) {
 *   // Crear cuenta en PostgreSQL con resultado.data
 * }
 */
export async function verificarCodigoRegistro(
  correo: string,
  codigo: string
): Promise<ResultadoVerificacionRegistro> {
  try {
    const clave = claveRegistroPendiente(correo);
    const datosRaw = await redis.get(clave);

    // -------------------------------------------------------------------------
    // Caso 1: No existe registro (expiró o nunca se registró)
    // -------------------------------------------------------------------------
    if (!datosRaw) {
      return {
        valido: false,
        error: 'No hay registro pendiente. Por favor, regístrate de nuevo.',
      };
    }

    const datos: DatosRegistroPendiente = JSON.parse(datosRaw);

    // -------------------------------------------------------------------------
    // Caso 2: Código correcto
    // -------------------------------------------------------------------------
    if (datos.codigo === codigo) {
      return {
        valido: true,
        data: datos,
      };
    }

    // -------------------------------------------------------------------------
    // Caso 3: Código incorrecto - incrementar intentos
    // -------------------------------------------------------------------------
    datos.intentos += 1;
    const intentosRestantes = MAX_INTENTOS_REGISTRO - datos.intentos;

    // Si superó el máximo, eliminar registro (debe registrarse de nuevo)
    if (datos.intentos >= MAX_INTENTOS_REGISTRO) {
      await redis.del(clave);
      return {
        valido: false,
        error: 'Demasiados intentos fallidos. Por favor, regístrate de nuevo.',
        intentosRestantes: 0,
      };
    }

    // Actualizar intentos en Redis (mantener el TTL restante)
    const ttlRestante = await redis.ttl(clave);
    if (ttlRestante > 0) {
      await redis.setex(clave, ttlRestante, JSON.stringify(datos));
    }

    return {
      valido: false,
      error: `Código incorrecto. Te quedan ${intentosRestantes} intento(s).`,
      intentosRestantes,
    };

  } catch (error) {
    console.error('Error al verificar código de registro:', error);
    return {
      valido: false,
      error: 'Error al verificar el código. Intenta de nuevo.',
    };
  }
}

// =============================================================================
// FUNCIÓN: ELIMINAR REGISTRO PENDIENTE
// =============================================================================

/**
 * Elimina el registro pendiente de Redis
 * 
 * ¿Cuándo se usa?
 * - Después de crear la cuenta en PostgreSQL exitosamente
 * - Para limpiar Redis después de verificar el correo
 * 
 * @param correo - Email del usuario
 * @returns true si se eliminó (o no existía)
 * 
 * @example
 * // Después de crear la cuenta en PostgreSQL:
 * await eliminarRegistroPendiente('juan@ejemplo.com');
 */
export async function eliminarRegistroPendiente(
  correo: string
): Promise<boolean> {
  try {
    await redis.del(claveRegistroPendiente(correo));
    return true;
  } catch (error) {
    console.error('Error al eliminar registro pendiente:', error);
    return false;
  }
}

// =============================================================================
// FUNCIÓN: ACTUALIZAR CÓDIGO DE REGISTRO (REENVÍO)
// =============================================================================

/**
 * Actualiza el código de verificación de un registro pendiente
 * 
 * ¿Qué hace?
 * - Busca el registro existente
 * - Actualiza el código con uno nuevo
 * - Reinicia el contador de intentos a 0
 * - Reinicia el TTL a 15 minutos
 * 
 * @param correo - Email del usuario
 * @param nuevoCodigo - Nuevo código de 6 dígitos
 * @returns true si se actualizó, false si no existía registro
 * 
 * @example
 * const actualizado = await actualizarCodigoRegistro('juan@ejemplo.com', '123456');
 * if (!actualizado) {
 *   // No hay registro pendiente, el usuario debe registrarse de nuevo
 * }
 */
export async function actualizarCodigoRegistro(
  correo: string,
  nuevoCodigo: string
): Promise<boolean> {
  try {
    const clave = claveRegistroPendiente(correo);
    const datosRaw = await redis.get(clave);

    // Si no existe registro, retornar false
    if (!datosRaw) {
      return false;
    }

    const datos: DatosRegistroPendiente = JSON.parse(datosRaw);

    // Actualizar código y reiniciar intentos
    datos.codigo = nuevoCodigo;
    datos.intentos = 0;

    // Guardar con TTL renovado (15 minutos desde ahora)
    await redis.setex(
      clave,
      REGISTRO_PENDIENTE_TTL,
      JSON.stringify(datos)
    );

    return true;
  } catch (error) {
    console.error('Error al actualizar código de registro:', error);
    return false;
  }
}