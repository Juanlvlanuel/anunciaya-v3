/**
 * auth.service.ts
 * ================
 * Lógica de negocio para autenticación (registro, verificación, etc.)
 * 
 * ¿Qué hace este archivo?
 * - Contiene las funciones que hacen el "trabajo real"
 * - Interactúa con la base de datos (PostgreSQL)
 * - Hashea contraseñas, genera códigos, envía emails
 * 
 * Ubicación: apps/api/src/services/auth.service.ts
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { redis } from '../db/redis.js';
import { usuarios, usuarioCodigosRespaldo, negocios } from '../db/schemas/schema.js';
import { obtenerDatosNegocio, DatosNegocio } from './negocios.service.js';
import {
  enviarCodigoVerificacion,
  reenviarCodigoVerificacion,
  enviarCodigoRecuperacion,
} from '../utils/email.js';
import { generarTokens, type PayloadToken, verificarRefreshToken } from '../utils/jwt.js';
import type {
  RegistroInput,
  VerificarEmailInput,
  ReenviarVerificacionInput,
  LoginInput,
  RefreshInput,
  OlvideContrasenaInput,
  RestablecerContrasenaInput,
  CambiarContrasenaInput,
  GoogleAuthInput,
  Activar2faInput,
  Verificar2faInput,
  Desactivar2faInput,
} from '../validations/auth.schema.js';
import {
  guardarSesion,
  verificarSesion,
  eliminarSesionPorToken,
  eliminarTodasLasSesiones,
  obtenerSesionesActivas,
  guardarCodigoRecuperacion,
  verificarCodigoRecuperacion,
  eliminarCodigoRecuperacion,
  // Nuevas funciones para registro pendiente
  guardarRegistroPendiente,
  verificarCodigoRegistro,
  eliminarRegistroPendiente,
  actualizarCodigoRegistro,
  obtenerRegistroPendiente,
} from '../utils/tokenStore.js';

// =============================================================================
// CONSTANTES
// =============================================================================

// Número de "rondas" para bcrypt (más alto = más seguro pero más lento)
const SALT_ROUNDS = 12;

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

/**
 * Respuesta estándar de los servicios
 */
interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: number; // Código HTTP sugerido
  correoRegistrado?: boolean;
  esOAuth?: boolean;
}

/**
 * Datos del usuario para respuestas (sin contraseña)
 */
interface UsuarioPublico {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  perfil: string;
  membresia: number;
  correoVerificado: boolean;
  modoActivo: string;
  tieneModoComercial: boolean;
  negocioId: string | null;
  sucursalActiva: string | null;
  sucursalAsignada: string | null;
  onboardingCompletado: boolean;
  // Datos del negocio (modo comercial)
  nombreNegocio: string | null;
  correoNegocio: string | null;
  logoNegocio: string | null;
  fotoPerfilNegocio: string | null;
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Genera un código numérico aleatorio de 6 dígitos
 * Usa crypto para mayor seguridad (mejor que Math.random)
 * 
 * @returns Código de 6 dígitos como string (ej: "847293")
 */
function generarCodigoVerificacion(): string {
  // Genera número entre 100000 y 999999
  const codigo = crypto.randomInt(100000, 999999);
  return codigo.toString();
}

/**
 * Convierte un usuario de la BD a formato público (sin datos sensibles)
 * 
 * @param usuario - Usuario de la BD
 * @param onboardingCompletado - Si completó el onboarding
 * @param datosNegocio - Datos del negocio (logo, nombre, etc.)
 * @param sucursalActivaCalculada - ID de sucursal activa calculada:
 *   - Gerentes: sucursalAsignada
 *   - Dueños en modo comercial: sucursalPrincipalId
 *   - Modo personal: null
 */
function usuarioAPublico(
  usuario: typeof usuarios.$inferSelect,
  onboardingCompletado?: boolean,
  datosNegocio?: DatosNegocio,
  sucursalActivaCalculada?: string | null
): UsuarioPublico {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    perfil: usuario.perfil,
    membresia: usuario.membresia,
    modoActivo: usuario.modoActivo || 'personal',
    correoVerificado: usuario.correoVerificado ?? false,
    tieneModoComercial: usuario.tieneModoComercial ?? false,
    negocioId: usuario.negocioId ?? null,
    sucursalActiva: sucursalActivaCalculada ?? null,
    sucursalAsignada: usuario.sucursalAsignada ?? null,
    onboardingCompletado: onboardingCompletado ?? false,
    // Datos del negocio
    nombreNegocio: datosNegocio?.nombre ?? null,
    correoNegocio: datosNegocio?.correo ?? null,
    logoNegocio: datosNegocio?.logo ?? null,
    fotoPerfilNegocio: datosNegocio?.fotoPerfil ?? null,
  };
}

// =============================================================================
// FUNCIÓN 1: REGISTRAR USUARIO (soporta normal y Google OAuth)
// =============================================================================

/**
 * Registra un nuevo usuario en el sistema
 * 
 * FLUJO NORMAL (con contraseña):
 * 1. Verifica que el correo no exista en PostgreSQL
 * 2. Hashea la contraseña
 * 3. Genera código de verificación
 * 4. Guarda en REDIS (temporal, 15 min)
 * 5. Envía email con código
 * 
 * FLUJO GOOGLE (con googleIdToken):
 * 1. Verifica el token con Google
 * 2. Verifica que el correo no exista en PostgreSQL
 * 3. Crea usuario directamente en BD (ya verificado por Google)
 * 
 * @param datos - Datos del formulario de registro (ya validados)
 * @returns Confirmación o error
 */
export async function registrarUsuario(
  datos: RegistroInput
): Promise<RespuestaServicio<{ correo: string } | { usuario: UsuarioPublico; accessToken: string; refreshToken: string }>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Verificar que el correo no exista en PostgreSQL
    // -------------------------------------------------------------------------
    const usuarioExistente = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.correo, datos.correo))
      .limit(1);

    if (usuarioExistente.length > 0) {
      return {
        success: false,
        message: 'Ya existe una cuenta con este correo electrónico',
        code: 409, // Conflict
      };
    }

    // =========================================================================
    // FLUJO GOOGLE: Si viene googleIdToken
    // =========================================================================
    if (datos.googleIdToken) {
      // -----------------------------------------------------------------------
      // Verificar el token con Google
      // -----------------------------------------------------------------------
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: datos.googleIdToken,
          audience: env.GOOGLE_CLIENT_ID,
        });
      } catch (error) {
        console.error('Error verificando token de Google en registro:', error);
        return {
          success: false,
          message: 'Token de Google inválido o expirado',
          code: 401,
        };
      }

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return {
          success: false,
          message: 'No se pudo obtener información de Google',
          code: 400,
        };
      }

      // Verificar que el email del token coincida con el enviado
      if (payload.email.toLowerCase() !== datos.correo.toLowerCase()) {
        return {
          success: false,
          message: 'El correo no coincide con la cuenta de Google',
          code: 400,
        };
      }

      // -----------------------------------------------------------------------
      // Crear usuario directamente en PostgreSQL
      // -----------------------------------------------------------------------
      const [nuevoUsuario] = await db
        .insert(usuarios)
        .values({
          nombre: datos.nombre,
          apellidos: datos.apellidos,
          correo: datos.correo.toLowerCase(),
          contrasenaHash: null, // Sin contraseña (usa Google)
          telefono: datos.telefono || null,
          autenticadoPorGoogle: true,
          correoVerificado: true, // Google ya verificó el email
          correoVerificadoAt: new Date().toISOString(),
          perfil: datos.perfil,
          membresia: 1,
          estado: 'activo',
          avatarUrl: datos.avatar || null,
        })
        .returning();

      // -----------------------------------------------------------------------
      // Generar tokens JWT
      // -----------------------------------------------------------------------
      const payloadToken: PayloadToken = {
        usuarioId: nuevoUsuario.id,
        correo: nuevoUsuario.correo,
        perfil: nuevoUsuario.perfil,
        membresia: nuevoUsuario.membresia,
        modoActivo: nuevoUsuario.modoActivo || 'personal',
        sucursalAsignada: nuevoUsuario.sucursalAsignada || null,
      };

      const tokens = generarTokens(payloadToken);

      // Guardar sesión en Redis
      await guardarSesion(nuevoUsuario.id, tokens.refreshToken, null, null);

      return {
        success: true,
        message: 'Cuenta creada exitosamente con Google',
        data: {
          usuario: usuarioAPublico(nuevoUsuario, false),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        code: 201,
      };
    }

    // =========================================================================
    // FLUJO NORMAL: Con contraseña (código existente)
    // =========================================================================

    // -------------------------------------------------------------------------
    // Paso 2: Hashear la contraseña
    // -------------------------------------------------------------------------
    const contrasenaHasheada = await bcrypt.hash(datos.contrasena!, SALT_ROUNDS);

    // -------------------------------------------------------------------------
    // Paso 3: Generar código de verificación
    // -------------------------------------------------------------------------
    const codigoVerificacion = generarCodigoVerificacion();

    // -------------------------------------------------------------------------
    // Paso 4: Guardar en REDIS (temporal, 15 minutos)
    // -------------------------------------------------------------------------
    const guardado = await guardarRegistroPendiente({
      nombre: datos.nombre,
      apellidos: datos.apellidos,
      correo: datos.correo,
      contrasenaHash: contrasenaHasheada,
      telefono: datos.telefono ?? null,
      perfil: datos.perfil,
      codigo: codigoVerificacion,
      membresia: 1,
      // ========== NUEVO CAMPO ==========
      nombreNegocio: datos.nombreNegocio ?? null,
    });

    if (!guardado) {
      return {
        success: false,
        message: 'Error al procesar el registro. Intenta de nuevo.',
        code: 500,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 5: Enviar email con código
    // -------------------------------------------------------------------------
    const resultadoEmail = await enviarCodigoVerificacion(
      datos.correo,
      datos.nombre,
      codigoVerificacion
    );

    if (!resultadoEmail.success) {
      console.warn('Registro guardado pero falló envío de email:', datos.correo);
    }

    // -------------------------------------------------------------------------
    // Paso 6: Retornar confirmación
    // -------------------------------------------------------------------------
    return {
      success: true,
      message: 'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
      data: { correo: datos.correo },
      code: 201,
    };

  } catch (error) {
    console.error('Error en registrarUsuario:', error);
    return {
      success: false,
      message: 'Error interno al procesar el registro',
      code: 500,
    };
  }
}


// =============================================================================
// CAMBIO 2: FUNCIÓN verificarEmail()
// =============================================================================
/**
 * Verifica el correo del usuario.
 * 
 * FLUJO PERSONAL:
 * 1. Verifica código
 * 2. CREA usuario en PostgreSQL
 * 3. Elimina de Redis
 * 4. Genera tokens JWT
 * 5. Devuelve usuario + tokens
 * 
 * FLUJO COMERCIAL:
 * 1. Verifica código
 * 2. Marca email como verificado en Redis
 * 3. NO crea usuario (se crea en webhook después del pago)
 * 4. NO elimina de Redis (el checkout necesita los datos)
 * 5. Devuelve confirmación SIN tokens
 * 
 * @param datos - Correo y código (ya validados)
 * @returns Usuario creado + tokens (personal) O confirmación (comercial)
 */
export async function verificarEmail(
  datos: VerificarEmailInput
): Promise<RespuestaServicio<{ usuario: UsuarioPublico; accessToken: string; refreshToken: string } | { correo: string }>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Verificar código en Redis
    // -------------------------------------------------------------------------
    const resultado = await verificarCodigoRegistro(datos.correo, datos.codigo);

    if (!resultado.valido || !resultado.data) {
      return {
        success: false,
        message: resultado.error ?? 'Código de verificación inválido',
        code: 400,
      };
    }

    const datosRegistro = resultado.data;

    // -------------------------------------------------------------------------
    // Paso 2: Verificar que el correo no se haya registrado mientras tanto
    // -------------------------------------------------------------------------
    const usuarioExistente = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.correo, datos.correo))
      .limit(1);

    if (usuarioExistente.length > 0) {
      // Limpiar Redis ya que el usuario ya existe
      await eliminarRegistroPendiente(datos.correo);
      return {
        success: false,
        message: 'Esta cuenta ya fue verificada. Puedes iniciar sesión.',
        code: 409,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: BIFURCACIÓN según tipo de cuenta
    // -------------------------------------------------------------------------

    // ═════════════════════════════════════════════════════════════════════════
    // CASO A: CUENTA COMERCIAL → Solo marcar como verificado, NO crear usuario
    // ═════════════════════════════════════════════════════════════════════════
    if (datosRegistro.perfil === 'comercial') {

      // Actualizar registro en Redis para marcar email como verificado
      // Los datos permanecen en Redis para que el checkout los use
      const datosActualizados = {
        ...datosRegistro,
        correoVerificado: true, // ← Marcar como verificado
      };

      // Guardar de nuevo en Redis (reinicia TTL a 15 min)
      await redis.setex(
        `temp:registro:${datos.correo}`,
        15 * 60, // 15 minutos
        JSON.stringify(datosActualizados)
      );

      // Devolver confirmación SIN tokens (aún no hay usuario en PostgreSQL)
      return {
        success: true,
        message: 'Email verificado. Continúa al pago para activar tu cuenta.',
        data: { correo: datos.correo },
        code: 200,
      };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CASO B: CUENTA PERSONAL → Crear usuario inmediatamente
    // ═════════════════════════════════════════════════════════════════════════

    const [nuevoUsuario] = await db
      .insert(usuarios)
      .values({
        nombre: datosRegistro.nombre,
        apellidos: datosRegistro.apellidos,
        correo: datosRegistro.correo,
        contrasenaHash: datosRegistro.contrasenaHash,
        telefono: datosRegistro.telefono,
        perfil: datosRegistro.perfil,
        membresia: 1, // Siempre 1 por defecto
        correoVerificado: true,
        correoVerificadoAt: new Date().toISOString(),
        estado: 'activo',
      })
      .returning();

    // Eliminar registro de Redis (ya no se necesita)
    await eliminarRegistroPendiente(datos.correo);

    // Generar tokens JWT
    const payloadToken: PayloadToken = {
      usuarioId: nuevoUsuario.id,
      correo: nuevoUsuario.correo,
      perfil: nuevoUsuario.perfil,
      membresia: nuevoUsuario.membresia,
      modoActivo: nuevoUsuario.modoActivo || 'personal',
      sucursalAsignada: nuevoUsuario.sucursalAsignada || null,
    };

    const tokens = generarTokens(payloadToken);

    // Guardar sesión en Redis
    await guardarSesion(nuevoUsuario.id, tokens.refreshToken, null, null);


    // Devolver usuario + tokens
    return {
      success: true,
      message: 'Correo verificado correctamente. ¡Bienvenido!',
      data: {
        usuario: usuarioAPublico(nuevoUsuario, false),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      code: 200,
    };

  } catch (error) {
    console.error('❌ Error en verificarEmail:', error);
    return {
      success: false,
      message: 'Error interno al verificar el correo',
      code: 500,
    };
  }
}


// =============================================================================
// CAMBIO 3: FUNCIÓN reenviarCodigo()
// =============================================================================
// UBICACIÓN: Líneas 327-406
// ACCIÓN: Reemplazar toda la función reenviarCodigo
// =============================================================================

/**
 * Genera un nuevo código y lo envía al correo
 * 
 * Pasos:
 * 1. Busca registro pendiente en Redis
 * 2. Si no existe, verifica si ya está en PostgreSQL (ya verificado)
 * 3. Genera nuevo código
 * 4. Actualiza en Redis (reinicia TTL a 15 min)
 * 5. Envía email
 * 
 * @param datos - Correo del usuario (ya validado)
 * @returns Confirmación o error
 */
export async function reenviarCodigo(
  datos: ReenviarVerificacionInput
): Promise<RespuestaServicio> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Buscar registro pendiente en Redis
    // -------------------------------------------------------------------------
    const registroPendiente = await obtenerRegistroPendiente(datos.correo);

    if (!registroPendiente) {
      // -----------------------------------------------------------------------
      // No hay registro en Redis. Verificar si ya existe en PostgreSQL
      // -----------------------------------------------------------------------
      const [usuarioExistente] = await db
        .select({
          id: usuarios.id,
          correoVerificado: usuarios.correoVerificado
        })
        .from(usuarios)
        .where(eq(usuarios.correo, datos.correo))
        .limit(1);

      if (usuarioExistente) {
        // Usuario existe en PostgreSQL
        if (usuarioExistente.correoVerificado) {
          return {
            success: false,
            message: 'Este correo ya fue verificado. Puedes iniciar sesión.',
            code: 400,
          };
        }
      }

      // No existe en Redis ni en PostgreSQL (o nunca se registró)
      // Por seguridad, no revelamos si el correo existe o no
      return {
        success: true,
        message: 'Si el correo tiene un registro pendiente, recibirás un nuevo código.',
        code: 200,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Generar nuevo código
    // -------------------------------------------------------------------------
    const nuevoCodigo = generarCodigoVerificacion();

    // -------------------------------------------------------------------------
    // Paso 3: Actualizar código en Redis (reinicia TTL e intentos)
    // -------------------------------------------------------------------------
    const actualizado = await actualizarCodigoRegistro(datos.correo, nuevoCodigo);

    if (!actualizado) {
      return {
        success: false,
        message: 'Error al generar nuevo código. Intenta de nuevo.',
        code: 500,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Enviar email con nuevo código
    // -------------------------------------------------------------------------
    const resultadoEmail = await reenviarCodigoVerificacion(
      datos.correo,
      registroPendiente.nombre,
      nuevoCodigo
    );

    if (!resultadoEmail.success) {
      return {
        success: false,
        message: 'No se pudo enviar el correo. Intenta de nuevo más tarde.',
        code: 500,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 5: Retornar confirmación
    // -------------------------------------------------------------------------
    return {
      success: true,
      message: 'Nuevo código enviado a tu correo electrónico.',
      code: 200,
    };

  } catch (error) {
    console.error('Error en reenviarCodigo:', error);
    return {
      success: false,
      message: 'Error interno al reenviar el código',
      code: 500,
    };
  }
}

/**
 * Inicia sesión y devuelve tokens
 */
export async function loginUsuario(
  datos: LoginInput,
  ip?: string | null,
  userAgent?: string | null
): Promise<RespuestaServicio<{ usuario: UsuarioPublico; accessToken: string; refreshToken: string; requiere2FA?: boolean; tokenTemporal?: string }>> {
  try {
    // Buscar usuario por correo
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, datos.correo))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Correo o contraseña incorrectos',
        code: 401,
      };
    }

    // Verificar que el correo esté verificado
    if (!usuario.correoVerificado) {
      return {
        success: false,
        message: 'Debes verificar tu correo antes de iniciar sesión',
        code: 403,
      };
    }

    // Verificar que no esté bloqueado
    if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
      return {
        success: false,
        message: 'Cuenta bloqueada temporalmente. Intenta más tarde.',
        code: 423,
      };
    }

    // Verificar contraseña
    if (!usuario.contrasenaHash) {
      return {
        success: false,
        message: 'Esta cuenta usa inicio de sesión con Google o Facebook',
        code: 400,
      };
    }

    const contrasenaValida = await bcrypt.compare(datos.contrasena, usuario.contrasenaHash);

    if (!contrasenaValida) {
      // Incrementar intentos fallidos
      const nuevosIntentos = (usuario.intentosFallidos ?? 0) + 1;
      const actualizacion: { intentosFallidos: number; bloqueadoHasta?: string } = {
        intentosFallidos: nuevosIntentos,
      };

      // Bloquear si supera 5 intentos
      if (nuevosIntentos >= 5) {
        actualizacion.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
      }

      await db.update(usuarios).set(actualizacion).where(eq(usuarios.id, usuario.id));

      return {
        success: false,
        message: 'Correo o contraseña incorrectos',
        code: 401,
      };
    }

    // Resetear intentos fallidos
    await db
      .update(usuarios)
      .set({ intentosFallidos: 0, bloqueadoHasta: null })
      .where(eq(usuarios.id, usuario.id));

    // -------------------------------------------------------------------------
    // Obtener datos del negocio (si tiene)
    // -------------------------------------------------------------------------
    let onboardingCompletado = false;
    let datosNegocio: DatosNegocio | undefined;

    if (usuario.negocioId) {
      const [negocio] = await db
        .select({ onboardingCompletado: negocios.onboardingCompletado })
        .from(negocios)
        .where(eq(negocios.id, usuario.negocioId))
        .limit(1);

      onboardingCompletado = negocio?.onboardingCompletado ?? false;

      // Obtener nombre, correo y logo del negocio
      datosNegocio = await obtenerDatosNegocio(usuario.negocioId);
    }

    // -------------------------------------------------------------------------
    // Verificar si tiene 2FA activado
    // -------------------------------------------------------------------------
    if (usuario.dobleFactorHabilitado && usuario.dobleFactorConfirmado) {
      // Generar token temporal para completar 2FA
      const tokenTemporal = crypto.randomUUID();

      // Guardar en Redis con TTL de 5 minutos
      await guardarTokenTemporal2FA(usuario.id, tokenTemporal);

      // Calcular sucursal activa (para cuando complete 2FA)
      let sucursalActivaCalculada: string | null = null;
      if (usuario.modoActivo === 'comercial' && usuario.negocioId) {
        if (usuario.sucursalAsignada) {
          sucursalActivaCalculada = usuario.sucursalAsignada;
        } else if (datosNegocio?.sucursalPrincipalId) {
          sucursalActivaCalculada = datosNegocio.sucursalPrincipalId;
        }
      }

      return {
        success: true,
        message: 'Requiere verificación de dos factores',
        data: {
          usuario: usuarioAPublico(usuario, onboardingCompletado, datosNegocio, sucursalActivaCalculada),
          accessToken: '',
          refreshToken: '',
          requiere2FA: true,
          tokenTemporal,
        },
        code: 200,
      };
    }

    // Generar tokens
    const payload: PayloadToken = {
      usuarioId: usuario.id,
      correo: usuario.correo,
      perfil: usuario.perfil,
      membresia: usuario.membresia,
      modoActivo: usuario.modoActivo || 'personal',
      sucursalAsignada: usuario.sucursalAsignada || null,
    };

    const tokens = generarTokens(payload);

    // Guardar sesión en Redis
    await guardarSesion(
      usuario.id,
      tokens.refreshToken,
      ip,
      userAgent
    );

    // =========================================================================
    // CALCULAR SUCURSAL ACTIVA
    // =========================================================================
    let sucursalActivaCalculada: string | null = null;

    if (usuario.modoActivo === 'comercial' && usuario.negocioId) {
      // CASO 1: Gerente con sucursal asignada → usar esa
      if (usuario.sucursalAsignada) {
        sucursalActivaCalculada = usuario.sucursalAsignada;
      }
      // CASO 2: Dueño sin sucursal asignada → usar la principal del negocio
      else if (datosNegocio?.sucursalPrincipalId) {
        sucursalActivaCalculada = datosNegocio.sucursalPrincipalId;
      }
    }
    // CASO 3: Modo personal → sucursalActiva queda null

    return {
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        usuario: usuarioAPublico(usuario, onboardingCompletado, datosNegocio, sucursalActivaCalculada),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      code: 200,
    };

  } catch (error) {
    console.error('Error en loginUsuario:', error);
    return {
      success: false,
      message: 'Error interno al iniciar sesión',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 5: REFRESCAR TOKEN (MODIFICADA - Rolling Refresh)
// =============================================================================

/**
 * Genera nuevos tokens (access + refresh) usando el refresh token actual
 * 
 * Implementa "Rolling Refresh Tokens":
 * - Cada vez que se usa el refresh token, se genera uno nuevo
 * - El token viejo se invalida inmediatamente
 * - El usuario mantiene su sesión activa mientras use la app
 * 
 * @param datos - Contiene el refreshToken actual
 * @param ip - IP del cliente (para actualizar en la sesión)
 * @param userAgent - User-Agent del cliente
 * @returns Nuevos accessToken y refreshToken
 */
export async function refrescarToken(
  datos: RefreshInput,
  ip?: string | null,
  userAgent?: string | null
): Promise<RespuestaServicio<{ accessToken: string; refreshToken: string }>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Verificar la firma JWT del refresh token
    // -------------------------------------------------------------------------
    const resultado = verificarRefreshToken(datos.refreshToken);

    if (!resultado.valido || !resultado.payload) {
      return {
        success: false,
        message: resultado.error || 'Refresh token inválido',
        code: 401,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Verificar que el token exista en Redis (sesión activa)
    // -------------------------------------------------------------------------
    const sesionActual = await verificarSesion(resultado.payload.usuarioId, datos.refreshToken);

    if (!sesionActual) {
      return {
        success: false,
        message: 'Sesión expirada o cerrada',
        code: 401,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Verificar que el usuario aún exista y esté activo
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, resultado.payload.usuarioId))
      .limit(1);

    if (!usuario || usuario.estado !== 'activo') {
      return {
        success: false,
        message: 'Usuario no encontrado o inactivo',
        code: 401,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Eliminar la sesión vieja de Redis
    // -------------------------------------------------------------------------
    await eliminarSesionPorToken(usuario.id, datos.refreshToken);

    // -------------------------------------------------------------------------
    // Paso 5: Generar AMBOS tokens nuevos
    // -------------------------------------------------------------------------
    const payload: PayloadToken = {
      usuarioId: usuario.id,
      correo: usuario.correo,
      perfil: usuario.perfil,
      membresia: usuario.membresia,
      modoActivo: usuario.modoActivo || 'personal',
      sucursalAsignada: usuario.sucursalAsignada || null,
    };

    const nuevosTokens = generarTokens(payload);

    // -------------------------------------------------------------------------
    // Paso 6: Guardar la nueva sesión en Redis (con TTL fresco de 7 días)
    // -------------------------------------------------------------------------
    await guardarSesion(
      usuario.id,
      nuevosTokens.refreshToken,
      ip || sesionActual.ip,           // Mantener IP anterior si no hay nueva
      userAgent || sesionActual.dispositivo  // Mantener dispositivo anterior
    );

    // -------------------------------------------------------------------------
    // Paso 7: Devolver AMBOS tokens
    // -------------------------------------------------------------------------
    return {
      success: true,
      message: 'Tokens renovados',
      data: {
        accessToken: nuevosTokens.accessToken,
        refreshToken: nuevosTokens.refreshToken,  // ← NUEVO: También devuelve refreshToken
      },
      code: 200,
    };

  } catch (error) {
    console.error('Error en refrescarToken:', error);
    return {
      success: false,
      message: 'Error interno al refrescar token',
      code: 500,
    };
  }
}


// =============================================================================
// FUNCIÓN 6: OBTENER USUARIO ACTUAL
// =============================================================================

/**
 * Obtiene los datos del usuario basado en su ID (del token)
 */
export async function obtenerUsuarioActual(
  usuarioId: string
): Promise<RespuestaServicio<UsuarioPublico>> {
  try {
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // ✅ Si tiene negocio, obtener onboardingCompletado Y datos del negocio
    let onboardingCompletado = false;
    let datosNegocio: DatosNegocio | undefined;

    if (usuario.negocioId) {
      const [negocio] = await db
        .select({
          onboardingCompletado: negocios.onboardingCompletado,
        })
        .from(negocios)
        .where(eq(negocios.id, usuario.negocioId))
        .limit(1);

      onboardingCompletado = negocio?.onboardingCompletado ?? false;

      // Obtener datos del negocio para el header
      datosNegocio = await obtenerDatosNegocio(usuario.negocioId);
    }

    // =========================================================================
    // CALCULAR SUCURSAL ACTIVA
    // =========================================================================
    let sucursalActivaCalculada: string | null = null;

    if (usuario.modoActivo === 'comercial' && usuario.negocioId) {
      // CASO 1: Gerente con sucursal asignada → usar esa
      if (usuario.sucursalAsignada) {
        sucursalActivaCalculada = usuario.sucursalAsignada;
      }
      // CASO 2: Dueño sin sucursal asignada → usar la principal del negocio
      else if (datosNegocio?.sucursalPrincipalId) {
        sucursalActivaCalculada = datosNegocio.sucursalPrincipalId;
      }
    }
    // CASO 3: Modo personal → sucursalActiva queda null

    return {
      success: true,
      message: 'Usuario obtenido',
      data: usuarioAPublico(usuario, onboardingCompletado, datosNegocio, sucursalActivaCalculada),
      code: 200,
    };

  } catch (error) {
    console.error('Error en obtenerUsuarioActual:', error);
    return {
      success: false,
      message: 'Error interno',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 7: CERRAR SESIÓN
// =============================================================================

/**
 * Cierra la sesión actual (elimina refresh token de Redis)
 */
export async function cerrarSesion(
  usuarioId: string,
  refreshToken: string
): Promise<RespuestaServicio> {
  try {
    const eliminado = await eliminarSesionPorToken(usuarioId, refreshToken);

    return {
      success: true,
      message: eliminado ? 'Sesión cerrada correctamente' : 'Sesión ya estaba cerrada',
      code: 200,
    };
  } catch (error) {
    console.error('Error en cerrarSesion:', error);
    return {
      success: false,
      message: 'Error interno al cerrar sesión',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 8: CERRAR TODAS LAS SESIONES
// =============================================================================

/**
 * Cierra todas las sesiones del usuario (logout de todos los dispositivos)
 */
export async function cerrarTodasSesiones(
  usuarioId: string
): Promise<RespuestaServicio<{ sesionesEliminadas: number }>> {
  try {
    const cantidad = await eliminarTodasLasSesiones(usuarioId);

    return {
      success: true,
      message: `${cantidad} sesión(es) cerrada(s)`,
      data: { sesionesEliminadas: cantidad },
      code: 200,
    };
  } catch (error) {
    console.error('Error en cerrarTodasSesiones:', error);
    return {
      success: false,
      message: 'Error interno al cerrar sesiones',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 9: OBTENER SESIONES ACTIVAS
// =============================================================================

/**
 * Obtiene la lista de sesiones activas del usuario
 */
export async function obtenerSesiones(
  usuarioId: string
): Promise<RespuestaServicio<{ sesiones: Awaited<ReturnType<typeof obtenerSesionesActivas>> }>> {
  try {
    const sesiones = await obtenerSesionesActivas(usuarioId);

    return {
      success: true,
      message: `${sesiones.length} sesión(es) activa(s)`,
      data: { sesiones },
      code: 200,
    };
  } catch (error) {
    console.error('Error en obtenerSesiones:', error);
    return {
      success: false,
      message: 'Error interno al obtener sesiones',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 10: SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// =============================================================================

/**
 * Genera un código de recuperación y lo envía por email
 * 
 * Pasos:
 * 1. Busca usuario por correo
 * 2. Si no existe, responde genéricamente (seguridad - no revelar si existe)
 * 3. Genera código de 6 dígitos
 * 4. Guarda código en Redis (TTL 15 min)
 * 5. Envía email con el código
 * 
 * @param datos - Correo del usuario (ya validado)
 * @returns Confirmación (siempre exitosa por seguridad)
 */
export async function solicitarRecuperacion(
  datos: OlvideContrasenaInput
): Promise<RespuestaServicio> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Buscar usuario por correo
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        estado: usuarios.estado,
        contrasenaHash: usuarios.contrasenaHash,
      })
      .from(usuarios)
      .where(eq(usuarios.correo, datos.correo))
      .limit(1);

    // -------------------------------------------------------------------------
    // Paso 2: Si no existe, responder genéricamente (seguridad)
    // -------------------------------------------------------------------------
    // Por seguridad, no revelamos si el correo existe o no
    if (!usuario) {
      return {
        success: true,
        message: 'Si el correo está registrado, recibirás un código de recuperación.',
        code: 200,
        correoRegistrado: false,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Verificar que la cuenta use contraseña (no OAuth)
    // -------------------------------------------------------------------------
    if (!usuario.contrasenaHash) {
      return {
        success: true,
        message: 'Esta cuenta fue creada con Google. Inicia sesión con el botón de Google.',
        code: 200,
        correoRegistrado: false,
        esOAuth: true,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Verificar que la cuenta esté activa
    // -------------------------------------------------------------------------
    if (usuario.estado !== 'activo') {
      return {
        success: true,
        message: 'Si el correo está registrado, recibirás un código de recuperación.',
        code: 200,
        correoRegistrado: false,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 5: Generar código de 6 dígitos
    // -------------------------------------------------------------------------
    const codigo = generarCodigoVerificacion();

    // -------------------------------------------------------------------------
    // Paso 6: Guardar código en Redis (TTL 15 minutos)
    // -------------------------------------------------------------------------
    const guardado = await guardarCodigoRecuperacion(datos.correo, codigo);

    if (!guardado) {
      return {
        success: false,
        message: 'Error al procesar la solicitud. Intenta de nuevo.',
        code: 500,
        correoRegistrado: false,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 7: Enviar email con código
    // -------------------------------------------------------------------------
    const resultadoEmail = await enviarCodigoRecuperacion(
      datos.correo,
      usuario.nombre,
      codigo
    );

    if (!resultadoEmail.success) {
      console.warn('Error al enviar email de recuperación:', datos.correo);
      // Aún así respondemos éxito para no revelar información
    }

    return {
      success: true,
      message: 'Si el correo está registrado, recibirás un código de recuperación.',
      code: 200,
      correoRegistrado: true,
    };

  } catch (error) {
    console.error('Error en solicitarRecuperacion:', error);
    return {
      success: false,
      message: 'Error interno al procesar la solicitud',
      code: 500,
      correoRegistrado: false,
    };
  }
}

// =============================================================================
// FUNCIÓN 11: RESTABLECER CONTRASEÑA
// =============================================================================

/**
 * Valida el código y establece la nueva contraseña
 * 
 * Pasos:
 * 1. Verificar código en Redis
 * 2. Buscar usuario por correo
 * 3. Hashear nueva contraseña
 * 4. Actualizar en PostgreSQL
 * 5. Eliminar código de Redis
 * 6. Cerrar TODAS las sesiones (seguridad)
 * 
 * @param datos - Correo, código y nueva contraseña (ya validados)
 * @returns Confirmación o error
 */
export async function restablecerContrasena(
  datos: RestablecerContrasenaInput
): Promise<RespuestaServicio> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Verificar código en Redis
    // -------------------------------------------------------------------------
    const verificacion = await verificarCodigoRecuperacion(datos.correo, datos.codigo);

    if (!verificacion.valido) {
      return {
        success: false,
        message: verificacion.error || 'Código inválido',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Buscar usuario por correo
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.correo, datos.correo))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'No se encontró la cuenta',
        code: 404,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Hashear nueva contraseña
    // -------------------------------------------------------------------------
    const nuevaContrasenaHash = await bcrypt.hash(datos.nuevaContrasena, SALT_ROUNDS);

    // -------------------------------------------------------------------------
    // Paso 4: Actualizar contraseña en PostgreSQL
    // -------------------------------------------------------------------------
    await db
      .update(usuarios)
      .set({
        contrasenaHash: nuevaContrasenaHash,
        intentosFallidos: 0,        // Resetear intentos
        bloqueadoHasta: null,       // Quitar bloqueo si había
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usuarios.id, usuario.id));

    // -------------------------------------------------------------------------
    // Paso 5: Eliminar código de Redis (ya no sirve)
    // -------------------------------------------------------------------------
    await eliminarCodigoRecuperacion(datos.correo);

    // -------------------------------------------------------------------------
    // Paso 6: Cerrar TODAS las sesiones por seguridad
    // -------------------------------------------------------------------------
    // Si alguien más tenía acceso, ya no podrá usarlo
    const sesionesEliminadas = await eliminarTodasLasSesiones(usuario.id);

    return {
      success: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      code: 200,
    };

  } catch (error) {
    console.error('Error en restablecerContrasena:', error);
    return {
      success: false,
      message: 'Error interno al restablecer la contraseña',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 12: CAMBIAR CONTRASEÑA (usuario logueado)
// =============================================================================

/**
 * Permite a un usuario autenticado cambiar su contraseña
 * 
 * Pasos:
 * 1. Buscar usuario por ID
 * 2. Verificar contraseña actual
 * 3. Hashear nueva contraseña
 * 4. Actualizar en PostgreSQL
 * 
 * @param usuarioId - ID del usuario (viene del token JWT)
 * @param datos - Contraseña actual y nueva (ya validados)
 * @returns Confirmación o error
 */
export async function cambiarContrasena(
  usuarioId: string,
  datos: CambiarContrasenaInput
): Promise<RespuestaServicio> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Buscar usuario por ID
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select({
        id: usuarios.id,
        contrasenaHash: usuarios.contrasenaHash,
      })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Verificar que tenga contraseña (no OAuth)
    // -------------------------------------------------------------------------
    if (!usuario.contrasenaHash) {
      return {
        success: false,
        message: 'Tu cuenta usa inicio de sesión con Google o Facebook. No puedes cambiar la contraseña.',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Verificar contraseña actual
    // -------------------------------------------------------------------------
    const contrasenaValida = await bcrypt.compare(
      datos.contrasenaActual,
      usuario.contrasenaHash
    );

    if (!contrasenaValida) {
      return {
        success: false,
        message: 'La contraseña actual es incorrecta',
        code: 401,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Hashear nueva contraseña
    // -------------------------------------------------------------------------
    const nuevaContrasenaHash = await bcrypt.hash(datos.nuevaContrasena, SALT_ROUNDS);

    // -------------------------------------------------------------------------
    // Paso 5: Actualizar contraseña en PostgreSQL
    // -------------------------------------------------------------------------
    await db
      .update(usuarios)
      .set({
        contrasenaHash: nuevaContrasenaHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usuarios.id, usuario.id));

    return {
      success: true,
      message: 'Contraseña actualizada correctamente',
      code: 200,
    };

  } catch (error) {
    console.error('Error en cambiarContrasena:', error);
    return {
      success: false,
      message: 'Error interno al cambiar la contraseña',
      code: 500,
    };
  }
}

/**
 * Datos de Google para usuario nuevo (cuando no existe en BD)
 */
interface DatosGoogleNuevo {
  email: string;
  nombre: string;
  apellidos: string;
  avatar: string | null;
}

/**
 * Respuesta cuando el usuario es nuevo (no existe en BD)
 */
interface RespuestaGoogleNuevo {
  usuarioNuevo: true;
  datosGoogle: DatosGoogleNuevo;
}

/**
 * Respuesta cuando el usuario existe (login exitoso)
 */
interface RespuestaGoogleLogin {
  usuarioNuevo?: false;
  usuario: UsuarioPublico;
  accessToken: string;
  refreshToken: string;
  requiere2FA?: boolean;
  tokenTemporal?: string;
}

// =============================================================================
// CONFIGURACIÓN GOOGLE OAUTH
// =============================================================================

// Cliente de Google OAuth (se inicializa una vez)
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// =============================================================================
// FUNCIÓN 13: LOGIN CON GOOGLE
// =============================================================================

/**
 * Autentica un usuario usando su cuenta de Google
 * 
 * Flujo:
 * 1. Verifica el ID token con Google
 * 2. Extrae datos del usuario (email, nombre)
 * 3. Si el usuario existe → login
 * 4. Si no existe → crear cuenta nueva (auto-verificada)
 * 5. Genera tokens JWT
 * 
 * @param datos - ID token de Google
 * @param ip - IP del cliente (para sesión)
 * @param userAgent - User-Agent (para sesión)
 */
export async function loginConGoogle(
  datos: GoogleAuthInput,
  ip?: string | null,
  userAgent?: string | null
): Promise<RespuestaServicio<RespuestaGoogleLogin | RespuestaGoogleNuevo>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Verificar el token con Google
    // -------------------------------------------------------------------------
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: datos.idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('Error verificando token de Google:', error);
      return {
        success: false,
        message: 'Token de Google inválido o expirado',
        code: 401,
      };
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return {
        success: false,
        message: 'No se pudo obtener información de Google',
        code: 400,
      };
    }

    const { email, given_name, family_name, picture } = payload;
    const correoNormalizado = email.toLowerCase();

    // -------------------------------------------------------------------------
    // Paso 2: Buscar si el usuario ya existe
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, correoNormalizado))
      .limit(1);

    // Obtener datos del negocio (si tiene)
    let onboardingCompletado = false;
    let datosNegocio: DatosNegocio | undefined;

    if (usuario && usuario.negocioId) {
      const [negocio] = await db
        .select({ onboardingCompletado: negocios.onboardingCompletado })
        .from(negocios)
        .where(eq(negocios.id, usuario.negocioId))
        .limit(1);

      onboardingCompletado = negocio?.onboardingCompletado ?? false;

      // Obtener nombre, correo y logo del negocio
      datosNegocio = await obtenerDatosNegocio(usuario.negocioId);
    }
    // -------------------------------------------------------------------------
    // Paso 3: Si no existe, crear cuenta nueva
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // Paso 3: Si NO existe → devolver datos para registro
    // -------------------------------------------------------------------------
    if (!usuario) {
      // NO creamos el usuario aquí
      // Devolvemos los datos de Google para que el frontend redirija a /registro
      return {
        success: true,
        message: 'Usuario nuevo - completar registro',
        data: {
          usuarioNuevo: true,
          datosGoogle: {
            email: correoNormalizado,
            nombre: given_name || '',
            apellidos: family_name || '',
            avatar: picture || null,
          },
        },
        code: 200,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Usuario existe → marcar que usa Google (si no estaba marcado)
    // -------------------------------------------------------------------------
    if (!usuario.autenticadoPorGoogle) {
      await db
        .update(usuarios)
        .set({
          autenticadoPorGoogle: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(usuarios.id, usuario.id));
    }

    // -------------------------------------------------------------------------
    // Paso 4: Verificar estado de la cuenta
    // -------------------------------------------------------------------------
    if (usuario.estado !== 'activo') {
      return {
        success: false,
        message: 'Tu cuenta está suspendida o inactiva',
        code: 403,
      };
    }

    // -------------------------------------------------------------------------
    // CALCULAR SUCURSAL ACTIVA (para Google login)
    // -------------------------------------------------------------------------
    let sucursalActivaCalculada: string | null = null;

    if (usuario.modoActivo === 'comercial' && usuario.negocioId) {
      if (usuario.sucursalAsignada) {
        sucursalActivaCalculada = usuario.sucursalAsignada;
      } else if (datosNegocio?.sucursalPrincipalId) {
        sucursalActivaCalculada = datosNegocio.sucursalPrincipalId;
      }
    }

    // -------------------------------------------------------------------------
    // Paso 5: Verificar si tiene 2FA activado
    // -------------------------------------------------------------------------
    if (usuario.dobleFactorHabilitado && usuario.dobleFactorConfirmado) {
      // Generar token temporal para completar 2FA
      const tokenTemporal = crypto.randomUUID();

      // Guardar en Redis con TTL de 5 minutos
      await guardarTokenTemporal2FA(usuario.id, tokenTemporal);

      return {
        success: true,
        message: 'Requiere verificación de dos factores',
        data: {
          usuarioNuevo: false,
          usuario: usuarioAPublico(usuario, onboardingCompletado, datosNegocio, sucursalActivaCalculada),
          accessToken: '',
          refreshToken: '',
          requiere2FA: true,
          tokenTemporal,
        },
        code: 200,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 6: Generar tokens JWT
    // -------------------------------------------------------------------------
    const payloadToken: PayloadToken = {
      usuarioId: usuario.id,
      correo: usuario.correo,
      perfil: usuario.perfil,
      membresia: usuario.membresia,
      modoActivo: usuario.modoActivo || 'personal',
      sucursalAsignada: usuario.sucursalAsignada || null,
    };

    const tokens = generarTokens(payloadToken);

    // Guardar sesión en Redis
    await guardarSesion(usuario.id, tokens.refreshToken, ip, userAgent);

    return {
      success: true,
      message: 'Inicio de sesión exitoso con Google',
      data: {
        usuarioNuevo: false,
        usuario: usuarioAPublico(usuario, onboardingCompletado, datosNegocio, sucursalActivaCalculada),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      code: 200,
    };

  } catch (error) {
    console.error('Error en loginConGoogle:', error);
    return {
      success: false,
      message: 'Error interno al iniciar sesión con Google',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIONES AUXILIARES PARA 2FA
// =============================================================================

const PREFIX_2FA_TEMP = '2fa_temp';
const TTL_2FA_TEMP = 5 * 60; // 5 minutos

/**
 * Guarda un token temporal para completar 2FA
 */
async function guardarTokenTemporal2FA(usuarioId: string, token: string): Promise<void> {
  const { redis } = await import('../db/redis.js');
  await redis.setex(`${PREFIX_2FA_TEMP}:${token}`, TTL_2FA_TEMP, usuarioId);
}

/**
 * Verifica y obtiene el usuarioId de un token temporal 2FA
 */
async function verificarTokenTemporal2FA(token: string): Promise<string | null> {
  const { redis } = await import('../db/redis.js');
  const usuarioId = await redis.get(`${PREFIX_2FA_TEMP}:${token}`);
  return usuarioId;
}

/**
 * Elimina el token temporal 2FA
 */
async function eliminarTokenTemporal2FA(token: string): Promise<void> {
  const { redis } = await import('../db/redis.js');
  await redis.del(`${PREFIX_2FA_TEMP}:${token}`);
}

// =============================================================================
// FUNCIÓN 14: GENERAR 2FA (secreto + QR)
// =============================================================================

/**
 * Genera un secreto TOTP y código QR para configurar 2FA
 * 
 * @param usuarioId - ID del usuario (del token JWT)
 * @returns Secreto y QR code en base64
 */
export async function generar2fa(
  usuarioId: string
): Promise<RespuestaServicio<{ qrCode: string; secreto: string }>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Buscar usuario
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select({
        id: usuarios.id,
        correo: usuarios.correo,
        dobleFactorHabilitado: usuarios.dobleFactorHabilitado,
        dobleFactorConfirmado: usuarios.dobleFactorConfirmado,
      })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Verificar si ya tiene 2FA activo
    // -------------------------------------------------------------------------
    if (usuario.dobleFactorHabilitado && usuario.dobleFactorConfirmado) {
      return {
        success: false,
        message: 'Ya tienes la autenticación de dos factores activada',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Generar secreto TOTP
    // -------------------------------------------------------------------------
    const secreto = authenticator.generateSecret();

    // -------------------------------------------------------------------------
    // Paso 4: Guardar secreto (no confirmado aún)
    // -------------------------------------------------------------------------
    await db
      .update(usuarios)
      .set({
        dobleFactorSecreto: secreto,
        dobleFactorHabilitado: true,
        dobleFactorConfirmado: false, // Se confirma cuando ingrese un código válido
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usuarios.id, usuario.id));

    // -------------------------------------------------------------------------
    // Paso 5: Generar QR code
    // -------------------------------------------------------------------------
    const otpauthUrl = authenticator.keyuri(
      usuario.correo,
      'AnunciaYA',
      secreto
    );

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return {
      success: true,
      message: 'Escanea el código QR con tu app de autenticación',
      data: {
        qrCode, // Base64 de la imagen QR
        secreto, // Para ingreso manual
      },
      code: 200,
    };

  } catch (error) {
    console.error('Error en generar2fa:', error);
    return {
      success: false,
      message: 'Error interno al generar 2FA',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 15: ACTIVAR 2FA
// =============================================================================

/**
 * Confirma y activa 2FA verificando un código TOTP
 * 
 * @param usuarioId - ID del usuario (del token JWT)
 * @param datos - Código TOTP de 6 dígitos
 * @returns Códigos de respaldo
 */
export async function activar2fa(
  usuarioId: string,
  datos: Activar2faInput
): Promise<RespuestaServicio<{ codigosRespaldo: string[] }>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Buscar usuario con su secreto
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select({
        id: usuarios.id,
        dobleFactorSecreto: usuarios.dobleFactorSecreto,
        dobleFactorHabilitado: usuarios.dobleFactorHabilitado,
        dobleFactorConfirmado: usuarios.dobleFactorConfirmado,
      })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Verificar que tenga secreto pendiente
    // -------------------------------------------------------------------------
    if (!usuario.dobleFactorSecreto) {
      return {
        success: false,
        message: 'Primero debes generar el código QR',
        code: 400,
      };
    }

    if (usuario.dobleFactorConfirmado) {
      return {
        success: false,
        message: 'La autenticación de dos factores ya está activada',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Verificar código TOTP
    // -------------------------------------------------------------------------
    const codigoValido = authenticator.verify({
      token: datos.codigo,
      secret: usuario.dobleFactorSecreto,
    });

    if (!codigoValido) {
      return {
        success: false,
        message: 'Código incorrecto. Verifica que tu app esté sincronizada.',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Generar códigos de respaldo
    // -------------------------------------------------------------------------
    const codigosRespaldo: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generar código de 8 caracteres alfanuméricos
      const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
      codigosRespaldo.push(codigo);
    }

    // -------------------------------------------------------------------------
    // Paso 5: Guardar códigos de respaldo hasheados en PostgreSQL
    // -------------------------------------------------------------------------
    // Primero eliminar códigos anteriores (si hubiera)
    await db
      .delete(usuarioCodigosRespaldo)
      .where(eq(usuarioCodigosRespaldo.usuarioId, usuario.id));

    // Hashear y guardar cada código
    for (const codigo of codigosRespaldo) {
      const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);
      await db
        .insert(usuarioCodigosRespaldo)
        .values({
          usuarioId: usuario.id,
          codigoHash,
        });
    }

    // -------------------------------------------------------------------------
    // Paso 6: Confirmar 2FA
    // -------------------------------------------------------------------------
    await db
      .update(usuarios)
      .set({
        dobleFactorConfirmado: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usuarios.id, usuario.id));

    return {
      success: true,
      message: 'Autenticación de dos factores activada. Guarda tus códigos de respaldo.',
      data: {
        codigosRespaldo,
      },
      code: 200,
    };

  } catch (error) {
    console.error('Error en activar2fa:', error);
    return {
      success: false,
      message: 'Error interno al activar 2FA',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 16: VERIFICAR 2FA (durante login)
// =============================================================================

/**
 * Verifica el código 2FA y completa el login
 * 
 * @param datos - Código TOTP y token temporal
 * @param ip - IP del cliente
 * @param userAgent - User-Agent del cliente
 */
export async function verificar2fa(
  datos: Verificar2faInput,
  ip?: string | null,
  userAgent?: string | null
): Promise<RespuestaServicio<{ usuario: UsuarioPublico; accessToken: string; refreshToken: string }>> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Verificar token temporal
    // -------------------------------------------------------------------------
    const usuarioId = await verificarTokenTemporal2FA(datos.tokenTemporal);

    if (!usuarioId) {
      return {
        success: false,
        message: 'Sesión expirada. Inicia sesión de nuevo.',
        code: 401,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Buscar usuario
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    // Obtener datos del negocio (si tiene)
    let onboardingCompletado = false;
    let datosNegocio: DatosNegocio | undefined;

    if (usuario && usuario.negocioId) {
      const [negocio] = await db
        .select({ onboardingCompletado: negocios.onboardingCompletado })
        .from(negocios)
        .where(eq(negocios.id, usuario.negocioId))
        .limit(1);

      onboardingCompletado = negocio?.onboardingCompletado ?? false;

      // Obtener nombre, correo y logo del negocio
      datosNegocio = await obtenerDatosNegocio(usuario.negocioId);
    }

    if (!usuario || !usuario.dobleFactorSecreto) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Verificar código TOTP
    // -------------------------------------------------------------------------
    let codigoValido = authenticator.verify({
      token: datos.codigo,
      secret: usuario.dobleFactorSecreto,
    });

    // -------------------------------------------------------------------------
    // Paso 3.1: Si TOTP falla, verificar contra códigos de respaldo
    // -------------------------------------------------------------------------
    if (!codigoValido) {
      // Buscar códigos de respaldo no usados
      const codigosRespaldo = await db
        .select()
        .from(usuarioCodigosRespaldo)
        .where(eq(usuarioCodigosRespaldo.usuarioId, usuarioId))
        .orderBy(usuarioCodigosRespaldo.id);

      // Verificar contra cada código de respaldo
      for (const codigoRespaldo of codigosRespaldo) {
        // Solo verificar si no ha sido usado
        if (!codigoRespaldo.usadoAt) {
          const coincide = await bcrypt.compare(datos.codigo, codigoRespaldo.codigoHash);
          if (coincide) {
            // Marcar código como usado
            await db
              .update(usuarioCodigosRespaldo)
              .set({ usadoAt: new Date().toISOString() })
              .where(eq(usuarioCodigosRespaldo.id, codigoRespaldo.id));

            codigoValido = true;
            break;
          }
        }
      }
    }

    if (!codigoValido) {
      return {
        success: false,
        message: 'Código incorrecto',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Eliminar token temporal
    // -------------------------------------------------------------------------
    await eliminarTokenTemporal2FA(datos.tokenTemporal);

    // -------------------------------------------------------------------------
    // Paso 5: Generar tokens JWT
    // -------------------------------------------------------------------------
    const payloadToken: PayloadToken = {
      usuarioId: usuario.id,
      correo: usuario.correo,
      perfil: usuario.perfil,
      membresia: usuario.membresia,
      modoActivo: usuario.modoActivo || 'personal',
      sucursalAsignada: usuario.sucursalAsignada || null,
    };

    const tokens = generarTokens(payloadToken);

    // Guardar sesión en Redis
    await guardarSesion(usuario.id, tokens.refreshToken, ip, userAgent);

    // -------------------------------------------------------------------------
    // CALCULAR SUCURSAL ACTIVA
    // -------------------------------------------------------------------------
    let sucursalActivaCalculada: string | null = null;

    if (usuario.modoActivo === 'comercial' && usuario.negocioId) {
      if (usuario.sucursalAsignada) {
        sucursalActivaCalculada = usuario.sucursalAsignada;
      } else if (datosNegocio?.sucursalPrincipalId) {
        sucursalActivaCalculada = datosNegocio.sucursalPrincipalId;
      }
    }

    return {
      success: true,
      message: 'Verificación exitosa',
      data: {
        usuario: usuarioAPublico(usuario, onboardingCompletado, datosNegocio, sucursalActivaCalculada),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      code: 200,
    };

  } catch (error) {
    console.error('Error en verificar2fa:', error);
    return {
      success: false,
      message: 'Error interno al verificar 2FA',
      code: 500,
    };
  }
}

// =============================================================================
// FUNCIÓN 17: DESACTIVAR 2FA
// =============================================================================

/**
 * Desactiva la autenticación de dos factores
 * 
 * @param usuarioId - ID del usuario (del token JWT)
 * @param datos - Código TOTP para confirmar
 */
export async function desactivar2fa(
  usuarioId: string,
  datos: Desactivar2faInput
): Promise<RespuestaServicio> {
  try {
    // -------------------------------------------------------------------------
    // Paso 1: Buscar usuario
    // -------------------------------------------------------------------------
    const [usuario] = await db
      .select({
        id: usuarios.id,
        dobleFactorSecreto: usuarios.dobleFactorSecreto,
        dobleFactorHabilitado: usuarios.dobleFactorHabilitado,
        dobleFactorConfirmado: usuarios.dobleFactorConfirmado,
      })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 2: Verificar que tenga 2FA activo
    // -------------------------------------------------------------------------
    if (!usuario.dobleFactorHabilitado || !usuario.dobleFactorConfirmado) {
      return {
        success: false,
        message: 'No tienes la autenticación de dos factores activada',
        code: 400,
      };
    }

    if (!usuario.dobleFactorSecreto) {
      return {
        success: false,
        message: 'Error de configuración de 2FA',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 3: Verificar código TOTP
    // -------------------------------------------------------------------------
    let codigoValido = authenticator.verify({
      token: datos.codigo,
      secret: usuario.dobleFactorSecreto,
    });

    // Si TOTP falla, verificar contra códigos de respaldo
    if (!codigoValido) {
      const codigosRespaldo = await db
        .select()
        .from(usuarioCodigosRespaldo)
        .where(eq(usuarioCodigosRespaldo.usuarioId, usuario.id));

      for (const codigoRespaldo of codigosRespaldo) {
        if (!codigoRespaldo.usadoAt) {
          const coincide = await bcrypt.compare(datos.codigo, codigoRespaldo.codigoHash);
          if (coincide) {
            codigoValido = true;
            break;
          }
        }
      }
    }

    if (!codigoValido) {
      return {
        success: false,
        message: 'Código incorrecto',
        code: 400,
      };
    }

    // -------------------------------------------------------------------------
    // Paso 4: Desactivar 2FA
    // -------------------------------------------------------------------------
    await db
      .update(usuarios)
      .set({
        dobleFactorSecreto: null,
        dobleFactorHabilitado: false,
        dobleFactorConfirmado: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usuarios.id, usuario.id));

    // Eliminar códigos de respaldo
    await db
      .delete(usuarioCodigosRespaldo)
      .where(eq(usuarioCodigosRespaldo.usuarioId, usuario.id));

    return {
      success: true,
      message: 'Autenticación de dos factores desactivada',
      code: 200,
    };

  } catch (error) {
    console.error('Error en desactivar2fa:', error);
    return {
      success: false,
      message: 'Error interno al desactivar 2FA',
      code: 500,
    };
  }
}

// =============================================================================
// 🆕 FASE 5.0 - SISTEMA DE MODOS
// =============================================================================

/**
 * Cambia el modo activo del usuario entre Personal y Comercial
 * 
 * @param usuarioId - ID del usuario autenticado
 * @param nuevoModo - Modo al que quiere cambiar ('personal' | 'comercial')
 * @returns Nuevos tokens con el modo actualizado
 */
export async function cambiarModo(
  usuarioId: string,
  nuevoModo: 'personal' | 'comercial'
): Promise<RespuestaServicio<{
  modoActivo: string;
  tieneModoComercial: boolean;
  negocioId: string | null;
  sucursalActiva: string | null;
  nombreNegocio: string | null;
  correoNegocio: string | null;
  logoNegocio: string | null;
  fotoPerfilNegocio: string | null;
  accessToken: string;
  refreshToken: string;
}>> {

  try {
    // Buscar usuario en PostgreSQL
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // Validar que el usuario esté activo
    if (usuario.estado !== 'activo') {
      return {
        success: false,
        message: 'La cuenta no está activa',
        code: 403,
      };
    }

    // Verificar si ya está en el modo solicitado
    if (usuario.modoActivo === nuevoModo) {
      const payloadToken: PayloadToken = {
        usuarioId: usuario.id,
        correo: usuario.correo,
        perfil: usuario.perfil,
        membresia: usuario.membresia,
        modoActivo: usuario.modoActivo,
        sucursalAsignada: usuario.sucursalAsignada || null,
      };

      const tokens = generarTokens(payloadToken);

      // Obtener datos del negocio (si tiene)
      const datosNegocio = await obtenerDatosNegocio(usuario.negocioId);

      // Calcular sucursalActiva
      let sucursalActivaCalculada: string | null = null;
      if (usuario.modoActivo === 'comercial' && usuario.negocioId) {
        sucursalActivaCalculada = usuario.sucursalAsignada || datosNegocio?.sucursalPrincipalId || null;
      }

      return {
        success: true,
        message: `Ya estás en modo ${nuevoModo}`,
        data: {
          modoActivo: usuario.modoActivo,
          tieneModoComercial: usuario.tieneModoComercial ?? false,
          negocioId: usuario.negocioId ?? null,
          sucursalActiva: sucursalActivaCalculada,
          nombreNegocio: datosNegocio?.nombre ?? null,
          correoNegocio: datosNegocio?.correo ?? null,
          logoNegocio: datosNegocio?.logo ?? null,
          fotoPerfilNegocio: datosNegocio?.fotoPerfil ?? null,
          ...tokens,
        },
        code: 200,
      };
    }

    // Validar que puede cambiar al modo solicitado
    if (nuevoModo === 'comercial' && !usuario.tieneModoComercial) {
      return {
        success: false,
        message: 'Necesitas una suscripción comercial activa para cambiar a modo comercial',
        code: 403,
      };
    }

    // Actualizar modo_activo en PostgreSQL
    const [usuarioActualizado] = await db
      .update(usuarios)
      .set({
        modoActivo: nuevoModo,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usuarios.id, usuarioId))
      .returning();

    // Generar nuevos tokens JWT con el modo actualizado
    const payloadToken: PayloadToken = {
      usuarioId: usuarioActualizado.id,
      correo: usuarioActualizado.correo,
      perfil: usuarioActualizado.perfil,
      membresia: usuarioActualizado.membresia,
      modoActivo: usuarioActualizado.modoActivo,
      sucursalAsignada: usuarioActualizado.sucursalAsignada || null,
    };

    const tokens = generarTokens(payloadToken);

    // Guardar nueva sesión en Redis
    await guardarSesion(usuarioActualizado.id, tokens.refreshToken, null, null);

    // Obtener datos del negocio (si tiene)
    const datosNegocio = await obtenerDatosNegocio(usuarioActualizado.negocioId);

    // Calcular sucursalActiva para el nuevo modo
    let sucursalActivaCalculada: string | null = null;
    if (nuevoModo === 'comercial' && usuarioActualizado.negocioId) {
      // Gerente → sucursalAsignada, Dueño → sucursalPrincipal
      sucursalActivaCalculada = usuarioActualizado.sucursalAsignada || datosNegocio?.sucursalPrincipalId || null;
    }

    return {
      success: true,
      message: `Cambiado a modo ${nuevoModo} exitosamente`,
      data: {
        modoActivo: usuarioActualizado.modoActivo,
        tieneModoComercial: usuarioActualizado.tieneModoComercial ?? false,
        negocioId: usuarioActualizado.negocioId ?? null,
        sucursalActiva: sucursalActivaCalculada,
        nombreNegocio: datosNegocio?.nombre ?? null,
        correoNegocio: datosNegocio?.correo ?? null,
        logoNegocio: datosNegocio?.logo ?? null,
        fotoPerfilNegocio: datosNegocio?.fotoPerfil ?? null,
        ...tokens,
      },
      code: 200,
    };

  } catch (error) {
    console.error('❌ Error en cambiarModo:', error);
    return {
      success: false,
      message: 'Error al cambiar modo de cuenta',
      code: 500,
    };
  }
}

/**
 * Obtiene información sobre el modo actual del usuario
 * 
 * @param usuarioId - ID del usuario autenticado
 * @returns Información del modo actual
 */
export async function obtenerInfoModo(
  usuarioId: string
): Promise<RespuestaServicio<{
  tieneModoComercial: boolean;
  modoActivo: string;
  negocioId: string | null;
  puedeAlternar: boolean;
}>> {
  try {
    // Buscar usuario en PostgreSQL
    const [usuario] = await db
      .select({
        id: usuarios.id,
        tieneModoComercial: usuarios.tieneModoComercial,
        modoActivo: usuarios.modoActivo,
        perfil: usuarios.perfil,
        negocioId: usuarios.negocioId,
      })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!usuario) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        code: 404,
      };
    }

    // Solo puede alternar si tiene acceso al modo comercial
    const puedeAlternar = usuario.tieneModoComercial ?? false;

    return {
      success: true,
      message: 'Información de modo obtenida correctamente',
      data: {
        tieneModoComercial: usuario.tieneModoComercial ?? false,
        modoActivo: usuario.modoActivo ?? 'personal',
        negocioId: usuario.negocioId ?? null,
        puedeAlternar,
      },
      code: 200,
    };

  } catch (error) {
    console.error('❌ Error en obtenerInfoModo:', error);
    return {
      success: false,
      message: 'Error al obtener información de modo',
      code: 500,
    };
  }
}