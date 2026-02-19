/**
 * scanya.service.ts
 * ==================
 * Lógica de negocio para ScanYA.
 * 
 * Ubicación: apps/api/src/services/scanya.service.ts
 */

import bcrypt from 'bcrypt';
import { eq, and, isNull, desc, sql, gte, or, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    usuarios,
    negocios,
    empleados,
    negocioSucursales,
    scanyaTurnos,
    puntosBilletera,
    puntosConfiguracion,
    puntosTransacciones,
    cupones,
    cuponUsos,
    vouchersCanje,
    recompensas,
    scanyaRecordatorios,
    scanyaConfiguracion,
} from '../db/schemas/schema.js';
import {
    generarTokensScanYA,
    type PayloadTokenScanYA,
    type PermisosScanYA,
    verificarRefreshTokenScanYA
} from '../utils/jwtScanYA.js';
import type {
    LoginDuenoInput,
    LoginEmpleadoInput,
    IdentificarClienteInput,
    ValidarCuponInput,
    OtorgarPuntosInput,
    ValidarVoucherInput,
    CrearRecordatorioInput,
    ActualizarConfigScanYAInput,
    ObtenerVouchersInput,
} from '../validations/scanya.schema.js';
import {
    obtenerSucursalesNegocio,
    listarOperadoresNegocio
} from './negocios.service.js';
import { verificarExpiraciones, expirarVouchersVencidos } from './puntos.service.js';
import { crearNotificacion } from './notificaciones.service.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

interface RespuestaServicio<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    code?: number;
}

interface DatosLoginScanYA {
    tipo: 'dueno' | 'gerente' | 'empleado';
    usuarioId: string;
    negocioId: string;
    sucursalId: string;
    nombreNegocio: string;
    logoNegocio: string | null;
    nombreSucursal: string | null;
    nombreUsuario: string;
    permisos: PermisosScanYA;
    puedeElegirSucursal: boolean;
    puedeConfigurarNegocio: boolean;
    accessToken: string;
    refreshToken: string;
}

// =============================================================================
// FUNCIÓN 1: LOGIN DUEÃ‘O
// =============================================================================

/**
 * Autentica al dueño del negocio usando las credenciales de AnunciaYA.
 * 
 * @param datos - Correo y contraseña
 * @param sucursalId - ID de sucursal (opcional, usa principal si no se envÃ­a)
 * @returns Tokens de ScanYA y datos del usuario
 */
export async function loginDueno(
    datos: LoginDuenoInput
): Promise<RespuestaServicio<DatosLoginScanYA>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar usuario por correo
        // -------------------------------------------------------------------------
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

        // -------------------------------------------------------------------------
        // Paso 2: Verificar que tenga modo comercial activo (dueño o gerente)
        // -------------------------------------------------------------------------
        if (!usuario.tieneModoComercial) {
            return {
                success: false,
                message: 'No tienes acceso comercial en AnunciaYA',
                code: 403,
            };
        }

        // Determinar rol: dueño o gerente
        const esDueno = !!usuario.negocioId && !usuario.sucursalAsignada;
        const esGerente = !!usuario.negocioId && !!usuario.sucursalAsignada;

        if (!esDueno && !esGerente) {
            return {
                success: false,
                message: 'No tienes un negocio o sucursal asignada',
                code: 403,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 3: Verificar que el correo estÃ© verificado
        // -------------------------------------------------------------------------
        if (!usuario.correoVerificado) {
            return {
                success: false,
                message: 'Debes verificar tu correo en AnunciaYA antes de usar ScanYA',
                code: 403,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Verificar que no estÃ© bloqueado
        // -------------------------------------------------------------------------
        if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
            return {
                success: false,
                message: 'Cuenta bloqueada temporalmente. Intenta más tarde.',
                code: 423,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 5: Verificar contraseña
        // -------------------------------------------------------------------------
        if (!usuario.contrasenaHash) {
            return {
                success: false,
                message: 'Esta cuenta usa inicio de sesión con Google. Configura una contraseña en AnunciaYA.',
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

            if (nuevosIntentos >= 5) {
                actualizacion.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
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
        // Paso 6 y 7: Obtener negocio y sucursal según el rol
        // -------------------------------------------------------------------------
        let negocioId: string;
        let sucursalId: string;
        let negocio: { id: string; nombre: string; logoUrl: string | null; onboardingCompletado: boolean };
        let sucursal: { id: string; nombre: string };
        const rol: 'dueno' | 'gerente' = esDueno ? 'dueno' : 'gerente';

        if (esDueno) {
            // ----- FLUJO DUEÃ‘O -----
            // Obtener datos del negocio
            const [negocioEncontrado] = await db
                .select({
                    id: negocios.id,
                    nombre: negocios.nombre,
                    logoUrl: negocios.logoUrl,
                    onboardingCompletado: negocios.onboardingCompletado,
                    participaPuntos: negocios.participaPuntos,
                })
                .from(negocios)
                .where(eq(negocios.id, usuario.negocioId!))
                .limit(1);

            if (!negocioEncontrado) {
                return {
                    success: false,
                    message: 'Negocio no encontrado',
                    code: 404,
                };
            }

            if (!negocioEncontrado.onboardingCompletado) {
                return {
                    success: false,
                    message: 'Debes completar el registro de tu negocio en AnunciaYA antes de usar ScanYA',
                    code: 403,
                };
            }

            // Verificar que el negocio tenga CardYA activo
            if (!negocioEncontrado.participaPuntos) {
                return {
                    success: false,
                    message: 'El sistema de puntos (CardYA) no está activo para este negocio. Actívalo en Business Studio → Mi Perfil.',
                    code: 403,
                };
            }

            negocio = negocioEncontrado;
            negocioId = negocio.id;

            // Determinar sucursal (puede elegir cualquiera)
            if (datos.sucursalId) {
                // Verificar que la sucursal pertenezca al negocio
                const [sucursalEncontrada] = await db
                    .select({ id: negocioSucursales.id, nombre: negocioSucursales.nombre })
                    .from(negocioSucursales)
                    .where(
                        and(
                            eq(negocioSucursales.id, datos.sucursalId),
                            eq(negocioSucursales.negocioId, negocioId)
                        )
                    )
                    .limit(1);

                if (!sucursalEncontrada) {
                    return {
                        success: false,
                        message: 'Sucursal no encontrada o no pertenece al negocio',
                        code: 404,
                    };
                }
                sucursal = sucursalEncontrada;
                sucursalId = sucursal.id;
            } else {
                // Usar sucursal principal
                const [sucursalPrincipal] = await db
                    .select({ id: negocioSucursales.id, nombre: negocioSucursales.nombre })
                    .from(negocioSucursales)
                    .where(
                        and(
                            eq(negocioSucursales.negocioId, negocioId),
                            eq(negocioSucursales.esPrincipal, true)
                        )
                    )
                    .limit(1);

                if (!sucursalPrincipal) {
                    return {
                        success: false,
                        message: 'El negocio no tiene una sucursal configurada',
                        code: 400,
                    };
                }
                sucursal = sucursalPrincipal;
                sucursalId = sucursal.id;
            }

        } else {
            // ----- FLUJO GERENTE -----
            // El gerente solo puede usar su sucursal asignada
            if (datos.sucursalId && datos.sucursalId !== usuario.sucursalAsignada) {
                return {
                    success: false,
                    message: 'Solo puedes acceder a tu sucursal asignada',
                    code: 403,
                };
            }

            // Obtener datos de la sucursal asignada
            const [sucursalAsignada] = await db
                .select({
                    id: negocioSucursales.id,
                    nombre: negocioSucursales.nombre,
                    negocioId: negocioSucursales.negocioId,
                })
                .from(negocioSucursales)
                .where(eq(negocioSucursales.id, usuario.sucursalAsignada!))
                .limit(1);

            if (!sucursalAsignada) {
                return {
                    success: false,
                    message: 'Tu sucursal asignada no existe',
                    code: 404,
                };
            }

            sucursal = { id: sucursalAsignada.id, nombre: sucursalAsignada.nombre };
            sucursalId = sucursal.id;

            // Obtener datos del negocio desde la sucursal
            const [negocioEncontrado] = await db
                .select({
                    id: negocios.id,
                    nombre: negocios.nombre,
                    logoUrl: negocios.logoUrl,
                    onboardingCompletado: negocios.onboardingCompletado,
                })
                .from(negocios)
                .where(eq(negocios.id, sucursalAsignada.negocioId))
                .limit(1);

            if (!negocioEncontrado) {
                return {
                    success: false,
                    message: 'Negocio no encontrado',
                    code: 404,
                };
            }

            if (!negocioEncontrado.onboardingCompletado) {
                return {
                    success: false,
                    message: 'El negocio aún no ha completado su registro',
                    code: 403,
                };
            }

            negocio = negocioEncontrado;
            negocioId = negocio.id;
        }

        // -------------------------------------------------------------------------
        // Paso 7.5: Contar total de sucursales del negocio
        // -------------------------------------------------------------------------
        const [{ totalSucursales }] = await db
            .select({ totalSucursales: sql<number>`count(*)::int` })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.negocioId, negocioId));

        // -------------------------------------------------------------------------
        // Paso 8: Generar tokens de ScanYA
        // -------------------------------------------------------------------------
        const permisos: PermisosScanYA = {
            registrarVentas: true,
            procesarCanjes: true,
            verHistorial: true,
            responderChat: true,
            responderResenas: true,
        };

        // Permisos administrativos según rol
        const puedeElegirSucursal = rol === 'dueno';
        const puedeConfigurarNegocio = rol === 'dueno';

        const payload: PayloadTokenScanYA = {
            tipo: rol,
            negocioId,
            sucursalId,
            nombreNegocio: negocio.nombre,
            usuarioId: usuario.id,
            correo: usuario.correo,
            nombreUsuario: `${usuario.nombre} ${usuario.apellidos}`.trim(),
            permisos,
            puedeElegirSucursal,
            puedeConfigurarNegocio,
        };

        const tokens = generarTokensScanYA(payload);

        // -------------------------------------------------------------------------
        // Paso 9: Retornar respuesta exitosa
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: 'Inicio de sesión exitoso',
            data: {
                tipo: rol,
                usuarioId: usuario.id,
                negocioId,
                sucursalId,
                nombreNegocio: negocio.nombre,
                logoNegocio: negocio.logoUrl ?? null,
                nombreSucursal: totalSucursales > 1 ? sucursal.nombre : null,
                nombreUsuario: `${usuario.nombre} ${usuario.apellidos}`.trim(),
                permisos,
                puedeElegirSucursal,
                puedeConfigurarNegocio,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en loginDueno:', error);
        return {
            success: false,
            message: 'Error interno al iniciar sesión',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 2: LOGIN EMPLEADO
// =============================================================================

/**
 * Autentica a un empleado usando Nick + PIN.
 * 
 * @param datos - Nick y PIN del empleado
 * @returns Tokens de ScanYA y datos del empleado
 */
export async function loginEmpleado(
    datos: LoginEmpleadoInput
): Promise<RespuestaServicio<DatosLoginScanYA>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar empleado por nick
        // -------------------------------------------------------------------------
        const [empleado] = await db
            .select({
                id: empleados.id,
                usuarioId: empleados.usuarioId,
                nombre: empleados.nombre,
                nick: empleados.nick,
                pinAcceso: empleados.pinAcceso,
                activo: empleados.activo,
                sucursalId: empleados.sucursalId,
                // Permisos
                puedeRegistrarVentas: empleados.puedeRegistrarVentas,
                puedeProcesarCanjes: empleados.puedeProcesarCanjes,
                puedeVerHistorial: empleados.puedeVerHistorial,
                puedeResponderChat: empleados.puedeResponderChat,
                puedeResponderResenas: empleados.puedeResponderResenas,
            })
            .from(empleados)
            .where(eq(empleados.nick, datos.nick))
            .limit(1);

        if (!empleado) {
            return {
                success: false,
                message: 'Nick o PIN incorrectos',
                code: 401,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Verificar que el empleado estÃ© activo
        // -------------------------------------------------------------------------
        if (!empleado.activo) {
            return {
                success: false,
                message: 'Esta cuenta de empleado está desactivada',
                code: 403,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 3: Verificar que tenga PIN configurado
        // -------------------------------------------------------------------------
        if (!empleado.pinAcceso) {
            return {
                success: false,
                message: 'No tienes PIN configurado. Contacta al dueño del negocio.',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Verificar PIN (comparación directa, no hash)
        // -------------------------------------------------------------------------
        if (empleado.pinAcceso !== datos.pin) {
            return {
                success: false,
                message: 'Nick o PIN incorrectos',
                code: 401,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 5: Verificar que tenga sucursal asignada
        // -------------------------------------------------------------------------
        if (!empleado.sucursalId) {
            return {
                success: false,
                message: 'No tienes una sucursal asignada. Contacta al dueño del negocio.',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 6: Obtener datos de la sucursal y negocio
        // -------------------------------------------------------------------------
        const [sucursal] = await db
            .select({
                id: negocioSucursales.id,
                nombre: negocioSucursales.nombre,
                negocioId: negocioSucursales.negocioId,
            })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, empleado.sucursalId))
            .limit(1);

        if (!sucursal) {
            return {
                success: false,
                message: 'Sucursal no encontrada',
                code: 404,
            };
        }

        const [negocio] = await db
            .select({
                id: negocios.id,
                nombre: negocios.nombre,
                logoUrl: negocios.logoUrl,
                participaPuntos: negocios.participaPuntos,
            })
            .from(negocios)
            .where(eq(negocios.id, sucursal.negocioId))
            .limit(1);

        if (!negocio) {
            return {
                success: false,
                message: 'Negocio no encontrado',
                code: 404,
            };
        }

        // Verificar que el negocio tenga CardYA activo
        if (!negocio.participaPuntos) {
            return {
                success: false,
                message: 'El sistema de puntos (CardYA) no está activo para este negocio',
                code: 403,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 7.5: Contar total de sucursales del negocio
        // -------------------------------------------------------------------------
        const [{ totalSucursales }] = await db
            .select({ totalSucursales: sql<number>`count(*)::int` })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.negocioId, negocio.id));

        // -------------------------------------------------------------------------
        // Paso 7: Construir permisos
        // -------------------------------------------------------------------------
        const permisos: PermisosScanYA = {
            registrarVentas: empleado.puedeRegistrarVentas ?? true,
            procesarCanjes: empleado.puedeProcesarCanjes ?? true,
            verHistorial: empleado.puedeVerHistorial ?? true,
            responderChat: empleado.puedeResponderChat ?? true,
            responderResenas: empleado.puedeResponderResenas ?? true,
        };

        // -------------------------------------------------------------------------
        // Paso 8: Generar tokens de ScanYA
        // -------------------------------------------------------------------------
        const payload: PayloadTokenScanYA = {
            tipo: 'empleado',
            negocioId: negocio.id,
            sucursalId: sucursal.id,
            nombreNegocio: negocio.nombre,
            empleadoId: empleado.id,
            nick: empleado.nick ?? undefined,
            nombreEmpleado: empleado.nombre,
            permisos,
            puedeElegirSucursal: false,
            puedeConfigurarNegocio: false,
        };

        const tokens = generarTokensScanYA(payload);

        // -------------------------------------------------------------------------
        // Paso 9: Retornar respuesta exitosa
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: 'Inicio de sesión exitoso',
            data: {
                tipo: 'empleado',
                usuarioId: empleado.id,
                negocioId: negocio.id,
                sucursalId: sucursal.id,
                nombreNegocio: negocio.nombre,
                logoNegocio: negocio.logoUrl ?? null,
                nombreSucursal: totalSucursales > 1 ? sucursal.nombre : null,
                nombreUsuario: empleado.nombre,
                permisos,
                puedeElegirSucursal: false,
                puedeConfigurarNegocio: false,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en loginEmpleado:', error);
        return {
            success: false,
            message: 'Error interno al iniciar sesión',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 3: REFRESH TOKEN SCANYA
// =============================================================================

/**
 * Renueva los tokens de ScanYA usando el refresh token.
 * 
 * @param refreshToken - Refresh token actual
 * @returns Nuevos tokens
 */
export async function refrescarTokenScanYA(
    refreshToken: string
): Promise<RespuestaServicio<{ accessToken: string; refreshToken: string }>> {
    try {
        // Verificar el refresh token
        const resultado = verificarRefreshTokenScanYA(refreshToken);

        if (!resultado.valido || !resultado.payload) {
            return {
                success: false,
                message: resultado.error || 'Refresh token inválido',
                code: 401,
            };
        }

        const payload = resultado.payload;

        // Verificar que el negocio aún exista
        const [negocio] = await db
            .select({ id: negocios.id, nombre: negocios.nombre })
            .from(negocios)
            .where(eq(negocios.id, payload.negocioId))
            .limit(1);

        if (!negocio) {
            return {
                success: false,
                message: 'Negocio no encontrado',
                code: 404,
            };
        }

        // Si es empleado, verificar que aún estÃ© activo
        if (payload.tipo === 'empleado' && payload.empleadoId) {
            const [empleado] = await db
                .select({ activo: empleados.activo })
                .from(empleados)
                .where(eq(empleados.id, payload.empleadoId))
                .limit(1);

            if (!empleado || !empleado.activo) {
                return {
                    success: false,
                    message: 'Cuenta de empleado desactivada',
                    code: 403,
                };
            }
        }

        // Si es dueño, verificar que aún tenga modo comercial
        if (payload.tipo === 'dueno' && payload.usuarioId) {
            const [usuario] = await db
                .select({ tieneModoComercial: usuarios.tieneModoComercial })
                .from(usuarios)
                .where(eq(usuarios.id, payload.usuarioId))
                .limit(1);

            if (!usuario || !usuario.tieneModoComercial) {
                return {
                    success: false,
                    message: 'Ya no tienes acceso comercial',
                    code: 403,
                };
            }
        }

        // Generar nuevos tokens con el mismo payload (sin los campos de JWT)
        const nuevoPayload: PayloadTokenScanYA = {
            tipo: payload.tipo,
            negocioId: payload.negocioId,
            sucursalId: payload.sucursalId,
            nombreNegocio: payload.nombreNegocio,
            usuarioId: payload.usuarioId,
            correo: payload.correo,
            nombreUsuario: payload.nombreUsuario,
            empleadoId: payload.empleadoId,
            nick: payload.nick,
            nombreEmpleado: payload.nombreEmpleado,
            permisos: payload.permisos,
            puedeElegirSucursal: payload.puedeElegirSucursal,
            puedeConfigurarNegocio: payload.puedeConfigurarNegocio,
        };

        const nuevosTokens = generarTokensScanYA(nuevoPayload);

        return {
            success: true,
            message: 'Tokens renovados',
            data: nuevosTokens,
            code: 200,
        };

    } catch (error) {
        console.error('Error en refrescarTokenScanYA:', error);
        return {
            success: false,
            message: 'Error interno al renovar tokens',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 4: OBTENER USUARIO ACTUAL
// =============================================================================

/**
 * Obtiene los datos del usuario actual de ScanYA.
 * 
 * @param payload - Payload del token decodificado
 * @returns Datos del usuario
 */
export async function obtenerUsuarioScanYA(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    tipo: 'dueno' | 'gerente' | 'empleado';
    negocioId: string;
    sucursalId: string;
    nombreNegocio: string;
    nombreUsuario: string;
    permisos: PermisosScanYA;
    puedeElegirSucursal: boolean;
    puedeConfigurarNegocio: boolean;
}>> {
    // Determinar nombre según el tipo
    let nombreUsuario: string;
    if (payload.tipo === 'empleado') {
        nombreUsuario = payload.nombreEmpleado || 'Empleado';
    } else {
        nombreUsuario = payload.nombreUsuario || (payload.tipo === 'dueno' ? 'Dueño' : 'Gerente');
    }

    return {
        success: true,
        message: 'Usuario obtenido',
        data: {
            tipo: payload.tipo,
            negocioId: payload.negocioId,
            sucursalId: payload.sucursalId,
            nombreNegocio: payload.nombreNegocio,
            nombreUsuario,
            permisos: payload.permisos,
            puedeElegirSucursal: payload.puedeElegirSucursal,
            puedeConfigurarNegocio: payload.puedeConfigurarNegocio,
        },
        code: 200,
    };
}

// =============================================================================
// FUNCIÓN 5: ABRIR TURNO
// =============================================================================

/**
 * Abre un nuevo turno para el usuario actual.
 * Solo puede haber un turno abierto por operador (empleado o usuario).
 * 
 * - Empleados: usan empleadoId
 * - Dueños/Gerentes: usan usuarioId
 * 
 * @param payload - Datos del usuario autenticado
 * @returns Datos del turno creado
 */
export async function abrirTurno(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    turnoId: string;
    horaInicio: string;
    mensaje: string;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Determinar si es empleado o dueño/gerente
        // -------------------------------------------------------------------------
        const esEmpleado = payload.tipo === 'empleado' && !!payload.empleadoId;
        const empleadoId = esEmpleado ? payload.empleadoId : null;
        const usuarioId = !esEmpleado ? payload.usuarioId : null;

        if (!empleadoId && !usuarioId) {
            return {
                success: false,
                message: 'No se pudo identificar al operador',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Verificar si ya tiene un turno abierto
        // -------------------------------------------------------------------------
        const condicionOperador = empleadoId
            ? eq(scanyaTurnos.empleadoId, empleadoId)
            : eq(scanyaTurnos.usuarioId, usuarioId!);

        const [turnoExistente] = await db
            .select({ id: scanyaTurnos.id })
            .from(scanyaTurnos)
            .where(
                and(
                    eq(scanyaTurnos.negocioId, payload.negocioId),
                    eq(scanyaTurnos.sucursalId, payload.sucursalId),
                    condicionOperador,
                    isNull(scanyaTurnos.horaFin)
                )
            )
            .limit(1);

        if (turnoExistente) {
            return {
                success: false,
                message: 'Ya tienes un turno abierto. Ciérralo antes de abrir uno nuevo.',
                code: 409,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 3: Crear el nuevo turno
        // -------------------------------------------------------------------------
        const [nuevoTurno] = await db
            .insert(scanyaTurnos)
            .values({
                negocioId: payload.negocioId,
                sucursalId: payload.sucursalId,
                empleadoId: empleadoId,
                usuarioId: usuarioId,
                puntosOtorgados: 0,
                transacciones: 0,
            })
            .returning({ id: scanyaTurnos.id, horaInicio: scanyaTurnos.horaInicio });

        // -------------------------------------------------------------------------
        // Paso 4: Retornar respuesta exitosa
        // -------------------------------------------------------------------------
        const horaInicioStr = nuevoTurno.horaInicio || new Date().toISOString();
        const horaFormateada = new Date(horaInicioStr).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            success: true,
            message: 'Turno abierto correctamente',
            data: {
                turnoId: nuevoTurno.id,
                horaInicio: horaInicioStr,
                mensaje: `Turno iniciado a las ${horaFormateada}`,
            },
            code: 201,
        };

    } catch (error) {
        console.error('Error en abrirTurno:', error);
        return {
            success: false,
            message: 'Error interno al abrir turno',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 6: OBTENER TURNO ACTUAL
// =============================================================================

/**
 * Obtiene el turno activo del usuario actual.
 * 
 * @param payload - Datos del usuario autenticado
 * @returns Datos del turno activo o null si no hay
 */
export async function obtenerTurnoActual(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    turno: {
        id: string;
        horaInicio: string;
        puntosOtorgados: number;
        transacciones: number;
        duracionMinutos: number;
    } | null;
}>> {
    try {
        // Determinar si es empleado o dueño/gerente
        const esEmpleado = payload.tipo === 'empleado' && !!payload.empleadoId;
        const empleadoId = esEmpleado ? payload.empleadoId : null;
        const usuarioId = !esEmpleado ? payload.usuarioId : null;

        if (!empleadoId && !usuarioId) {
            return {
                success: true,
                message: 'No hay turno activo',
                data: { turno: null },
                code: 200,
            };
        }

        // Condición según tipo de operador
        const condicionOperador = empleadoId
            ? eq(scanyaTurnos.empleadoId, empleadoId)
            : eq(scanyaTurnos.usuarioId, usuarioId!);

        // Buscar turno abierto
        const [turnoActivo] = await db
            .select({
                id: scanyaTurnos.id,
                horaInicio: scanyaTurnos.horaInicio,
                puntosOtorgados: scanyaTurnos.puntosOtorgados,
                transacciones: scanyaTurnos.transacciones,
            })
            .from(scanyaTurnos)
            .where(
                and(
                    eq(scanyaTurnos.negocioId, payload.negocioId),
                    eq(scanyaTurnos.sucursalId, payload.sucursalId),
                    condicionOperador,
                    isNull(scanyaTurnos.horaFin)
                )
            )
            .limit(1);

        if (!turnoActivo || !turnoActivo.horaInicio) {
            return {
                success: true,
                message: 'No hay turno activo',
                data: { turno: null },
                code: 200,
            };
        }

        // Calcular duración en minutos
        const ahora = new Date();
        const inicio = new Date(turnoActivo.horaInicio);
        const duracionMinutos = Math.floor((ahora.getTime() - inicio.getTime()) / 60000);

        return {
            success: true,
            message: 'Turno activo encontrado',
            data: {
                turno: {
                    id: turnoActivo.id,
                    horaInicio: turnoActivo.horaInicio,
                    puntosOtorgados: turnoActivo.puntosOtorgados ?? 0,
                    transacciones: turnoActivo.transacciones ?? 0,
                    duracionMinutos,
                },
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerTurnoActual:', error);
        return {
            success: false,
            message: 'Error interno al obtener turno',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 7: CERRAR TURNO
// =============================================================================

/**
 * Cierra el turno activo del usuario actual.
 * 
 * @param payload - Datos del usuario autenticado
 * @param turnoId - ID del turno a cerrar
 * @param notasCierre - Notas opcionales al cerrar
 * @returns Resumen del turno cerrado
 */
export async function cerrarTurno(
    payload: PayloadTokenScanYA,
    turnoId: string,
    notasCierre?: string
): Promise<RespuestaServicio<{
    resumen: {
        turnoId: string;
        horaInicio: string;
        horaFin: string;
        duracionMinutos: number;
        puntosOtorgados: number;
        transacciones: number;
    };
}>> {
    try {
        // Determinar si es empleado o dueño/gerente
        const esEmpleado = payload.tipo === 'empleado' && !!payload.empleadoId;
        const empleadoId = esEmpleado ? payload.empleadoId : null;
        const usuarioId = !esEmpleado ? payload.usuarioId : null;

        // -------------------------------------------------------------------------
        // Paso 1: Buscar el turno y verificar que pertenezca al usuario
        // -------------------------------------------------------------------------
        const [turno] = await db
            .select({
                id: scanyaTurnos.id,
                horaInicio: scanyaTurnos.horaInicio,
                horaFin: scanyaTurnos.horaFin,
                puntosOtorgados: scanyaTurnos.puntosOtorgados,
                transacciones: scanyaTurnos.transacciones,
                empleadoId: scanyaTurnos.empleadoId,
                usuarioId: scanyaTurnos.usuarioId,
            })
            .from(scanyaTurnos)
            .where(
                and(
                    eq(scanyaTurnos.id, turnoId),
                    eq(scanyaTurnos.negocioId, payload.negocioId),
                    eq(scanyaTurnos.sucursalId, payload.sucursalId)
                )
            )
            .limit(1);

        if (!turno) {
            return {
                success: false,
                message: 'Turno no encontrado',
                code: 404,
            };
        }

        // Verificar que el turno pertenezca al usuario actual
        const esDelUsuario = empleadoId
            ? turno.empleadoId === empleadoId
            : turno.usuarioId === usuarioId;

        // Dueños pueden cerrar turnos de cualquiera
        const puedeCerrarlo = esDelUsuario || payload.puedeConfigurarNegocio;

        if (!puedeCerrarlo) {
            return {
                success: false,
                message: 'No tienes permiso para cerrar este turno',
                code: 403,
            };
        }

        // Verificar que el turno estÃ© abierto
        if (turno.horaFin) {
            return {
                success: false,
                message: 'Este turno ya está cerrado',
                code: 409,
            };
        }

        // Verificar que tenga hora de inicio
        if (!turno.horaInicio) {
            return {
                success: false,
                message: 'Turno inválido: no tiene hora de inicio',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Cerrar el turno
        // -------------------------------------------------------------------------
        const horaFin = new Date().toISOString();

        // Si alguien cierra el turno de otro, registrar quiÃ©n lo cerró
        const cerradoPor = !esDelUsuario ? (payload.usuarioId || null) : null;

        await db
            .update(scanyaTurnos)
            .set({
                horaFin: horaFin,
                cerradoPor: cerradoPor,
                notasCierre: notasCierre || null,
            })
            .where(eq(scanyaTurnos.id, turnoId));

        // -------------------------------------------------------------------------
        // Paso 3: Calcular resumen y retornar
        // -------------------------------------------------------------------------
        const inicio = new Date(turno.horaInicio);
        const fin = new Date(horaFin);
        const duracionMinutos = Math.floor((fin.getTime() - inicio.getTime()) / 60000);

        return {
            success: true,
            message: 'Turno cerrado correctamente',
            data: {
                resumen: {
                    turnoId: turno.id,
                    horaInicio: turno.horaInicio,
                    horaFin: horaFin,
                    duracionMinutos,
                    puntosOtorgados: turno.puntosOtorgados ?? 0,
                    transacciones: turno.transacciones ?? 0,
                },
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en cerrarTurno:', error);
        return {
            success: false,
            message: 'Error interno al cerrar turno',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 8: IDENTIFICAR CLIENTE (Fase 5)
// =============================================================================

/**
 * Busca un cliente por su número de telÃ©fono.
 * Retorna datos básicos del cliente + billetera en el negocio actual.
 * 
 * @param payload - Datos del usuario autenticado
 * @param datos - TelÃ©fono del cliente
 * @returns Datos del cliente o mensaje de no encontrado
 */
export async function identificarCliente(
    payload: PayloadTokenScanYA,
    datos: IdentificarClienteInput
): Promise<RespuestaServicio<{
    cliente: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
        telefono: string;
    };
    billetera: {
        puntosDisponibles: number;
        puntosAcumuladosTotal: number;
        nivelActual: string;
    } | null;
    esNuevoEnNegocio: boolean;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Normalizar teléfono y buscar usuario (soporta formato con y sin +52)
        // -------------------------------------------------------------------------
        const telefonoNormalizado = datos.telefono.replace(/^\+52/, '');

        const [cliente] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                avatarUrl: usuarios.avatarUrl,
                telefono: usuarios.telefono,
            })
            .from(usuarios)
            .where(
                or(
                    eq(usuarios.telefono, datos.telefono),              // Formato original
                    eq(usuarios.telefono, telefonoNormalizado),         // Sin +52
                    eq(usuarios.telefono, `+52${telefonoNormalizado}`)  // Con +52
                )
            )
            .limit(1);

        if (!cliente) {
            return {
                success: false,
                message: 'Cliente no registrado en AnunciaYA',
                code: 404,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Buscar billetera del cliente en este negocio
        // -------------------------------------------------------------------------
        const [billetera] = await db
            .select({
                puntosDisponibles: puntosBilletera.puntosDisponibles,
                puntosAcumuladosTotal: puntosBilletera.puntosAcumuladosTotal,
                nivelActual: puntosBilletera.nivelActual,
            })
            .from(puntosBilletera)
            .where(
                and(
                    eq(puntosBilletera.usuarioId, cliente.id),
                    eq(puntosBilletera.negocioId, payload.negocioId)
                )
            )
            .limit(1);

        // -------------------------------------------------------------------------
        // Paso 2b: Verificar expiraciones (puntos por inactividad + vouchers)
        // -------------------------------------------------------------------------
        if (billetera) {
            await verificarExpiraciones(cliente.id, payload.negocioId);

            // Re-consultar billetera después de posibles expiraciones
            const [billeteraActualizada] = await db
                .select({
                    puntosDisponibles: puntosBilletera.puntosDisponibles,
                    puntosAcumuladosTotal: puntosBilletera.puntosAcumuladosTotal,
                    nivelActual: puntosBilletera.nivelActual,
                })
                .from(puntosBilletera)
                .where(
                    and(
                        eq(puntosBilletera.usuarioId, cliente.id),
                        eq(puntosBilletera.negocioId, payload.negocioId)
                    )
                )
                .limit(1);

            if (billeteraActualizada) {
                Object.assign(billetera, billeteraActualizada);
            }
        }

        // -------------------------------------------------------------------------
        // Paso 3: Retornar datos
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: billetera ? 'Cliente encontrado' : 'Cliente encontrado (nuevo en este negocio)',
            data: {
                cliente: {
                    id: cliente.id,
                    nombre: cliente.nombre,
                    apellidos: cliente.apellidos || '',
                    avatarUrl: cliente.avatarUrl,
                    telefono: cliente.telefono || '',
                },
                billetera: billetera ? {
                    puntosDisponibles: billetera.puntosDisponibles,
                    puntosAcumuladosTotal: billetera.puntosAcumuladosTotal,
                    nivelActual: billetera.nivelActual || 'bronce',
                } : null,
                esNuevoEnNegocio: !billetera,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en identificarCliente:', error);
        return {
            success: false,
            message: 'Error interno al buscar cliente',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 9: VALIDAR CUPÓN (Fase 5)
// =============================================================================

/**
 * Valida un cupón antes de aplicarlo a una venta.
 * Verifica: existencia, estado, fechas, lÃ­mites, sucursal.
 * 
 * @param payload - Datos del usuario autenticado
 * @param datos - Código del cupón y clienteId
 * @returns Información del cupón si es válido
 */
export async function validarCupon(
    payload: PayloadTokenScanYA,
    datos: ValidarCuponInput
): Promise<RespuestaServicio<{
    cupon: {
        id: string;
        codigo: string;
        titulo: string;
        tipo: string;
        valor: number | null;
        compraMinima: number;
        descripcion: string | null;
    };
    descuentoInfo: string;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar cupón por código
        // -------------------------------------------------------------------------
        const [cupon] = await db
            .select({
                id: cupones.id,
                negocioId: cupones.negocioId,
                sucursalId: cupones.sucursalId,
                codigo: cupones.codigo,
                titulo: cupones.titulo,
                descripcion: cupones.descripcion,
                tipo: cupones.tipo,
                valor: cupones.valor,
                compraMinima: cupones.compraMinima,
                fechaInicio: cupones.fechaInicio,
                fechaExpiracion: cupones.fechaExpiracion,
                limiteUsosTotal: cupones.limiteUsosTotal,
                limiteUsosPorUsuario: cupones.limiteUsosPorUsuario,
                usosActuales: cupones.usosActuales,
                estado: cupones.estado,
            })
            .from(cupones)
            .where(eq(cupones.codigo, datos.codigo))
            .limit(1);

        if (!cupon) {
            return {
                success: false,
                message: 'Cupón no encontrado',
                code: 404,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Verificar que el cupón pertenezca a este negocio
        // -------------------------------------------------------------------------
        if (cupon.negocioId !== payload.negocioId) {
            return {
                success: false,
                message: 'Este cupón no es válido para este negocio',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 3: Verificar sucursal (null = todas las sucursales)
        // -------------------------------------------------------------------------
        if (cupon.sucursalId && cupon.sucursalId !== payload.sucursalId) {
            return {
                success: false,
                message: 'Este cupón no es válido para esta sucursal',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Verificar estado
        // -------------------------------------------------------------------------
        if (cupon.estado !== 'publicado') {
            return {
                success: false,
                message: 'Este cupón no está¡ activo',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 5: Verificar fechas
        // -------------------------------------------------------------------------
        const ahora = new Date();
        const fechaInicio = cupon.fechaInicio ? new Date(cupon.fechaInicio) : null;
        const fechaExpiracion = cupon.fechaExpiracion ? new Date(cupon.fechaExpiracion) : null;

        if (fechaInicio && ahora < fechaInicio) {
            return {
                success: false,
                message: 'Este cupón aún no está¡ vigente',
                code: 400,
            };
        }

        if (fechaExpiracion && ahora > fechaExpiracion) {
            return {
                success: false,
                message: 'Este cupón ha expirado',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 6: Verificar lÃ­mite de usos totales
        // -------------------------------------------------------------------------
        if (cupon.limiteUsosTotal !== null && (cupon.usosActuales ?? 0) >= cupon.limiteUsosTotal) {
            return {
                success: false,
                message: 'Este cupón ha alcanzado su límite de usos',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 7: Verificar lÃ­mite de usos por usuario
        // -------------------------------------------------------------------------
        if (cupon.limiteUsosPorUsuario !== null) {
            const [usosUsuario] = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(cuponUsos)
                .where(
                    and(
                        eq(cuponUsos.cuponId, cupon.id),
                        eq(cuponUsos.usuarioId, datos.clienteId),
                        eq(cuponUsos.estado, 'usado')
                    )
                );

            if (usosUsuario && usosUsuario.count >= cupon.limiteUsosPorUsuario) {
                return {
                    success: false,
                    message: 'Ya has usado este cupón el máximo de veces permitido',
                    code: 400,
                };
            }
        }

        // -------------------------------------------------------------------------
        // Paso 8: Construir mensaje de descuento
        // -------------------------------------------------------------------------
        let descuentoInfo = '';
        const valorNumerico = cupon.valor ? parseFloat(cupon.valor) : 0;

        switch (cupon.tipo) {
            case 'porcentaje':
                descuentoInfo = `${valorNumerico}% de descuento`;
                break;
            case 'monto_fijo':
                descuentoInfo = `$${valorNumerico} de descuento`;
                break;
            case '2x1':
                descuentoInfo = '2x1 (segundo artículo gratis)';
                break;
            case '3x2':
                descuentoInfo = '3x2 (tercer artículo gratis)';
                break;
            case 'envio_gratis':
                descuentoInfo = 'Envío gratis';
                break;
            default:
                descuentoInfo = cupon.descripcion || 'Descuento especial';
        }

        // -------------------------------------------------------------------------
        // Paso 9: Retornar cupón válido
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: 'Cupón válido',
            data: {
                cupon: {
                    id: cupon.id,
                    codigo: cupon.codigo,
                    titulo: cupon.titulo,
                    tipo: cupon.tipo,
                    valor: valorNumerico,
                    compraMinima: cupon.compraMinima ? parseFloat(cupon.compraMinima) : 0,
                    descripcion: cupon.descripcion,
                },
                descuentoInfo,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en validarCupon:', error);
        return {
            success: false,
            message: 'Error interno al validar cupón',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 10: OTORGAR PUNTOS (Fase 5)
// =============================================================================

/**
 * Registra una venta, aplica cupón opcional, calcula y otorga puntos al cliente.
 * Este es el endpoint principal de ScanYA.
 * 
 * @param payload - Datos del usuario autenticado
 * @param datos - Datos de la venta
 * @returns Resumen de la transacción
 */
export async function otorgarPuntos(
    payload: PayloadTokenScanYA,
    datos: OtorgarPuntosInput
): Promise<RespuestaServicio<{
    transaccion: {
        id: string;
        montoOriginal: number;
        descuentoAplicado: number;
        montoFinal: number;
        puntosOtorgados: number;
        multiplicadorAplicado: number;
    };
    cliente: {
        nombre: string;
        nuevosPuntosDisponibles: number;
        nuevoNivel: string;
        subioDeNivel: boolean;
    };
    cuponUsado: {
        codigo: string;
        descuento: number;
    } | null;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Verificar turno abierto
        // -------------------------------------------------------------------------
        const esEmpleado = payload.tipo === 'empleado' && !!payload.empleadoId;
        const empleadoId = esEmpleado ? payload.empleadoId : null;
        const usuarioIdOperador = !esEmpleado ? payload.usuarioId : null;

        const condicionOperador = empleadoId
            ? eq(scanyaTurnos.empleadoId, empleadoId)
            : eq(scanyaTurnos.usuarioId, usuarioIdOperador!);

        const [turnoActivo] = await db
            .select({ id: scanyaTurnos.id })
            .from(scanyaTurnos)
            .where(
                and(
                    eq(scanyaTurnos.negocioId, payload.negocioId),
                    eq(scanyaTurnos.sucursalId, payload.sucursalId),
                    condicionOperador,
                    isNull(scanyaTurnos.horaFin)
                )
            )
            .limit(1);

        if (!turnoActivo) {
            return {
                success: false,
                message: 'Abre un turno para procesar esta venta',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 1.5: Verificar que el negocio tenga CardYA activo
        // -------------------------------------------------------------------------
        const [negocioCheck] = await db
            .select({ participaPuntos: negocios.participaPuntos })
            .from(negocios)
            .where(eq(negocios.id, payload.negocioId))
            .limit(1);

        if (!negocioCheck?.participaPuntos) {
            return {
                success: false,
                message: 'El sistema de puntos (CardYA) no está activo para este negocio',
                code: 403,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Verificar que el cliente exista
        // -------------------------------------------------------------------------
        const [cliente] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
            })
            .from(usuarios)
            .where(eq(usuarios.id, datos.clienteId))
            .limit(1);

        if (!cliente) {
            return {
                success: false,
                message: 'Cliente no encontrado',
                code: 404,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 3: Obtener configuración de puntos del negocio
        // -------------------------------------------------------------------------
        const [config] = await db
            .select()
            .from(puntosConfiguracion)
            .where(eq(puntosConfiguracion.negocioId, payload.negocioId))
            .limit(1);

        if (!config || !config.activo) {
            return {
                success: false,
                message: 'El sistema de puntos no está configurado para este negocio',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Verificar mÃ­nimo de compra
        // -------------------------------------------------------------------------
        const minimoCompra = config.minimoCompra ? parseFloat(config.minimoCompra) : 0;
        if (datos.montoTotal < minimoCompra) {
            return {
                success: false,
                message: `El monto mínimo para otorgar puntos es $${minimoCompra}`,
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 5: Procesar cupón si viene
        // -------------------------------------------------------------------------
        let descuentoAplicado = 0;
        let cuponUsadoInfo: { codigo: string; descuento: number; usoId: number } | null = null;

        if (datos.cuponId) {
            const [cupon] = await db
                .select({
                    id: cupones.id,
                    codigo: cupones.codigo,
                    tipo: cupones.tipo,
                    valor: cupones.valor,
                    usosActuales: cupones.usosActuales,
                })
                .from(cupones)
                .where(eq(cupones.id, datos.cuponId))
                .limit(1);

            if (cupon) {
                const valorCupon = cupon.valor ? parseFloat(cupon.valor) : 0;

                // Calcular descuento según tipo
                switch (cupon.tipo) {
                    case 'porcentaje':
                        descuentoAplicado = (datos.montoTotal * valorCupon) / 100;
                        break;
                    case 'monto_fijo':
                        descuentoAplicado = Math.min(valorCupon, datos.montoTotal);
                        break;
                    // Para 2x1, 3x2 el descuento se calcula diferente (simplificado aquÃ­)
                    default:
                        descuentoAplicado = 0;
                }

                // Registrar uso del cupón
                const [cuponUsoCreado] = await db.insert(cuponUsos).values({
                    cuponId: cupon.id,
                    usuarioId: datos.clienteId,
                    estado: 'usado',
                    metodoCanje: 'qr_presencial',
                    montoCompra: datos.montoTotal.toString(),
                    descuentoAplicado: descuentoAplicado.toString(),
                    empleadoId: empleadoId,
                    sucursalId: payload.sucursalId,
                    usadoAt: new Date().toISOString(),
                }).returning({ id: cuponUsos.id });

                cuponUsadoInfo = {
                    codigo: cupon.codigo,
                    descuento: descuentoAplicado,
                    usoId: Number(cuponUsoCreado.id),
                };

                // Incrementar usos_actuales del cupón
                await db
                    .update(cupones)
                    .set({ usosActuales: (cupon.usosActuales ?? 0) + 1 })
                    .where(eq(cupones.id, cupon.id));
            }
        }

        // -------------------------------------------------------------------------
        // Paso 6: Calcular monto final
        // -------------------------------------------------------------------------
        const montoFinal = datos.montoTotal - descuentoAplicado;

        // -------------------------------------------------------------------------
        // Paso 7: Buscar o crear billetera del cliente
        // -------------------------------------------------------------------------
        let [billetera] = await db
            .select()
            .from(puntosBilletera)
            .where(
                and(
                    eq(puntosBilletera.usuarioId, datos.clienteId),
                    eq(puntosBilletera.negocioId, payload.negocioId)
                )
            )
            .limit(1);

        if (!billetera) {
            // Crear billetera nueva
            const [nuevaBilletera] = await db
                .insert(puntosBilletera)
                .values({
                    usuarioId: datos.clienteId,
                    negocioId: payload.negocioId,
                    puntosDisponibles: 0,
                    puntosAcumuladosTotal: 0,
                    puntosCanjeadosTotal: 0,
                    puntosExpiradosTotal: 0,
                    nivelActual: 'bronce',
                })
                .returning();

            billetera = nuevaBilletera;
        }

        // -------------------------------------------------------------------------
        // Paso 8: Obtener multiplicador según nivel
        // -------------------------------------------------------------------------
        const nivelActual = billetera.nivelActual || 'bronce';
        let multiplicador = 1.0;

        if (config.nivelesActivos) {
            switch (nivelActual) {
                case 'bronce':
                    multiplicador = config.nivelBronceMultiplicador
                        ? parseFloat(config.nivelBronceMultiplicador)
                        : 1.0;
                    break;
                case 'plata':
                    multiplicador = config.nivelPlataMultiplicador
                        ? parseFloat(config.nivelPlataMultiplicador)
                        : 1.2;
                    break;
                case 'oro':
                    multiplicador = config.nivelOroMultiplicador
                        ? parseFloat(config.nivelOroMultiplicador)
                        : 1.5;
                    break;
            }
        }

        // -------------------------------------------------------------------------
        // Paso 9: Calcular puntos
        // -------------------------------------------------------------------------
        const puntosPorPeso = config.puntosPorPeso ? parseFloat(config.puntosPorPeso) : 1.0;
        const puntosBase = montoFinal * puntosPorPeso;
        const puntosFinales = Math.floor(puntosBase * multiplicador);

        // -------------------------------------------------------------------------
        // Paso 10: Crear transacción de puntos
        // -------------------------------------------------------------------------
        const [transaccion] = await db
            .insert(puntosTransacciones)
            .values({
                billeteraId: billetera.id,
                negocioId: payload.negocioId,
                sucursalId: payload.sucursalId,
                empleadoId: empleadoId,
                clienteId: datos.clienteId,
                turnoId: turnoActivo.id,
                montoCompra: montoFinal.toString(),
                montoEfectivo: (datos.montoEfectivo || 0).toString(),
                montoTarjeta: (datos.montoTarjeta || 0).toString(),
                montoTransferencia: (datos.montoTransferencia || 0).toString(),
                puntosOtorgados: puntosFinales,
                multiplicadorAplicado: multiplicador.toString(),
                fotoTicketUrl: datos.fotoTicketUrl || null,
                numeroOrden: datos.numeroOrden || null,
                nota: datos.nota || null,
                concepto: datos.concepto || null,
                tipo: 'presencial',
                estado: 'confirmado',
                cuponUsoId: cuponUsadoInfo?.usoId || null,
            })
            .returning({ id: puntosTransacciones.id });

        // -------------------------------------------------------------------------
        // Paso 10.5: Marcar recordatorio como procesado (si existe)
        // -------------------------------------------------------------------------
        if (datos.recordatorioId) {
            await db
                .update(scanyaRecordatorios)
                .set({
                    estado: 'procesado',
                    transaccionId: transaccion.id,
                    procesadoAt: new Date().toISOString(),
                })
                .where(eq(scanyaRecordatorios.id, datos.recordatorioId));
        }

        // -------------------------------------------------------------------------
        // Paso 11: Actualizar billetera
        // -------------------------------------------------------------------------
        const nuevosPuntosDisponibles = billetera.puntosDisponibles + puntosFinales;
        const nuevosPuntosAcumulados = billetera.puntosAcumuladosTotal + puntosFinales;

        await db
            .update(puntosBilletera)
            .set({
                puntosDisponibles: nuevosPuntosDisponibles,
                puntosAcumuladosTotal: nuevosPuntosAcumulados,
                ultimaActividad: new Date().toISOString(),
            })
            .where(eq(puntosBilletera.id, billetera.id));

        // -------------------------------------------------------------------------
        // Paso 12: Verificar cambio de nivel
        // -------------------------------------------------------------------------
        let nuevoNivel = nivelActual;
        let subioDeNivel = false;

        if (config.nivelesActivos) {
            const nivelPlataMin = config.nivelPlataMin ?? 1000;
            const nivelOroMin = config.nivelOroMin ?? 5000;

            if (nivelActual === 'bronce' && nuevosPuntosAcumulados >= nivelPlataMin) {
                nuevoNivel = 'plata';
                subioDeNivel = true;
            } else if (nivelActual === 'plata' && nuevosPuntosAcumulados >= nivelOroMin) {
                nuevoNivel = 'oro';
                subioDeNivel = true;
            }

            if (subioDeNivel) {
                await db
                    .update(puntosBilletera)
                    .set({ nivelActual: nuevoNivel })
                    .where(eq(puntosBilletera.id, billetera.id));
            }
        }

        // -------------------------------------------------------------------------
        // Paso 13: Actualizar contadores del turno
        // -------------------------------------------------------------------------
        await db
            .update(scanyaTurnos)
            .set({
                puntosOtorgados: sql`${scanyaTurnos.puntosOtorgados} + ${puntosFinales}`,
                transacciones: sql`${scanyaTurnos.transacciones} + 1`,
            })
            .where(eq(scanyaTurnos.id, turnoActivo.id));

        // Paso 13.5: Eliminar recordatorio procesado
        if (datos.recordatorioId) {
            await db
                .delete(scanyaRecordatorios)
                .where(eq(scanyaRecordatorios.id, datos.recordatorioId));
        }

        // -------------------------------------------------------------------------
        // Paso 13.6: Notificar al cliente (puntos ganados)
        // -------------------------------------------------------------------------
        const [negocioInfo] = await db
            .select({ nombre: negocios.nombre })
            .from(negocios)
            .where(eq(negocios.id, payload.negocioId))
            .limit(1);

        crearNotificacion({
            usuarioId: datos.clienteId,
            modo: 'personal',
            tipo: 'puntos_ganados',
            titulo: `+${puntosFinales} puntos`,
            mensaje: `Compraste en ${negocioInfo?.nombre ?? 'un negocio'}`,
            negocioId: payload.negocioId,
            sucursalId: payload.sucursalId,
            referenciaId: transaccion.id,
            referenciaTipo: 'transaccion',
            icono: '🎯',
        }).catch((err) => console.error('Error notificación puntos:', err));

        // Notificar al dueño del negocio (nueva venta)
        const [negocioDueno] = await db
            .select({ usuarioId: negocios.usuarioId })
            .from(negocios)
            .where(eq(negocios.id, payload.negocioId))
            .limit(1);

        if (negocioDueno) {
            crearNotificacion({
                usuarioId: negocioDueno.usuarioId,
                modo: 'comercial',
                tipo: 'puntos_ganados',
                titulo: `Venta: $${montoFinal.toFixed(2)}`,
                mensaje: `${cliente.nombre} ${cliente.apellidos || ''} ganó ${puntosFinales} puntos`.trim(),
                negocioId: payload.negocioId,
                sucursalId: payload.sucursalId,
                referenciaId: transaccion.id,
                referenciaTipo: 'transaccion',
                icono: '🎯',
            }).catch((err) => console.error('Error notificación dueño:', err));
        }

        // -------------------------------------------------------------------------
        // Paso 14: Retornar resumen
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: subioDeNivel
                ? `¡${puntosFinales} puntos otorgados! El cliente subió a nivel ${nuevoNivel}`
                : `${puntosFinales} puntos otorgados`,
            data: {
                transaccion: {
                    id: transaccion.id,
                    montoOriginal: datos.montoTotal,
                    descuentoAplicado,
                    montoFinal,
                    puntosOtorgados: puntosFinales,
                    multiplicadorAplicado: multiplicador,
                },
                cliente: {
                    nombre: `${cliente.nombre} ${cliente.apellidos || ''}`.trim(),
                    nuevosPuntosDisponibles,
                    nuevoNivel,
                    subioDeNivel,
                },
                cuponUsado: cuponUsadoInfo,
            },
            code: 201,
        };

    } catch (error) {
        console.error('Error en otorgarPuntos:', error);
        return {
            success: false,
            message: 'Error interno al otorgar puntos',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 11: HISTORIAL DE TRANSACCIONES (Fase 12 - COMPLETA)
// =============================================================================

/**
 * Tipo de periodo para filtrar historial
 */
type PeriodoHistorial = 'hoy' | 'semana' | 'mes' | '3meses' | 'ano';

/**
 * Obtiene el historial de transacciones con filtros por rol y fecha.
 * 
 * Filtrado por rol:
 * - Dueño: Ve todo el negocio (todas las sucursales)
 * - Gerente: Solo su sucursal (todos los empleados)
 * - Empleado: Solo sus propias transacciones
 * 
 * @param payload - Datos del usuario autenticado
 * @param periodo - Filtro de tiempo (hoy, semana, mes, 3meses, ano)
 * @param pagina - Número de página
 * @param limite - Registros por página
 * @returns Lista de transacciones con datos completos
 */
export async function obtenerHistorial(
    payload: PayloadTokenScanYA,
    periodo: PeriodoHistorial = 'mes',
    pagina: number = 1,
    limite: number = 20,
    filtroSucursalId?: string,    // ← AGREGAR
    filtroEmpleadoId?: string     // ← AGREGAR
): Promise<RespuestaServicio<{
    transacciones: Array<{
        id: string;
        // Cliente
        clienteNombre: string;
        clienteTelefono: string | null;
        clienteAvatarUrl: string | null;
        clienteNivel: string;
        // Montos
        montoTotal: number;
        montoEfectivo: number;
        montoTarjeta: number;
        montoTransferencia: number;
        // Puntos
        puntosOtorgados: number;
        multiplicadorAplicado: number;
        // Quién registró
        registradoPor: string;
        registradoPorTipo: 'empleado' | 'dueno' | 'gerente';
        // Sucursal
        sucursalNombre: string;
        // Extras
        concepto: string | null;
        fotoTicketUrl: string | null;
        numeroOrden: string | null;
        // Cupón
        cuponCodigo: string | null;
        cuponDescuento: number | null;
        // Fecha
        createdAt: string;
    }>;
    total: number;
    pagina: number;
    totalPaginas: number;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Calcular fecha de inicio según periodo
        // -------------------------------------------------------------------------
        const ahora = new Date();
        let fechaInicio: Date;

        switch (periodo) {
            case 'hoy':
                fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
                break;
            case 'semana':
                fechaInicio = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'mes':
                fechaInicio = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3meses':
                fechaInicio = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'ano':
                fechaInicio = new Date(ahora.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                fechaInicio = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // -------------------------------------------------------------------------
        // Paso 2: Construir condiciones según rol
        // -------------------------------------------------------------------------
        const condicionesBase = [
            eq(puntosTransacciones.negocioId, payload.negocioId),
            gte(puntosTransacciones.createdAt, fechaInicio.toISOString()),
        ];

        // Filtrar según tipo de usuario
        if (payload.tipo === 'empleado' && payload.empleadoId) {
            // Empleado: solo sus transacciones (via turno)
            condicionesBase.push(
                sql`${puntosTransacciones.turnoId} IN (
                    SELECT id FROM scanya_turnos 
                    WHERE empleado_id = ${payload.empleadoId}::uuid
                )`
            );
        } else if (payload.tipo === 'gerente') {
            // Gerente: TODAS las transacciones de su sucursal
            condicionesBase.push(
                eq(puntosTransacciones.sucursalId, payload.sucursalId)
            );
        }
        // Dueño: ve todo el negocio (no se agrega filtro adicional)

        // -------------------------------------------------------------------------
        // Paso 2.5: Filtros opcionales (desde dropdowns)
        // -------------------------------------------------------------------------
        // Filtro por sucursal (solo si el usuario tiene permiso)
        if (filtroSucursalId) {
            if (payload.tipo === 'dueno') {
                // Dueño puede filtrar por cualquier sucursal de su negocio
                condicionesBase.push(eq(puntosTransacciones.sucursalId, filtroSucursalId));
            }
            // Gerente y empleado ya están filtrados por su sucursal
        }

        // Filtro por operador (empleado/gerente/dueño)
        if (filtroEmpleadoId) {
            if (payload.tipo === 'dueno' || payload.tipo === 'gerente') {
                // Primero verificar si es empleado o usuario (gerente/dueño)
                const [esEmpleado] = await db
                    .select({ id: empleados.id })
                    .from(empleados)
                    .where(eq(empleados.id, filtroEmpleadoId))
                    .limit(1);

                if (esEmpleado) {
                    // Es empleado - filtrar por turno.empleado_id
                    condicionesBase.push(
                        sql`${puntosTransacciones.turnoId} IN (
                            SELECT id FROM scanya_turnos 
                            WHERE empleado_id = ${filtroEmpleadoId}::uuid
                        )`
                    );
                } else {
                    // Es gerente/dueño - filtrar por turno.usuario_id
                    condicionesBase.push(
                        sql`${puntosTransacciones.turnoId} IN (
                            SELECT id FROM scanya_turnos 
                            WHERE usuario_id = ${filtroEmpleadoId}::uuid
                        )`
                    );
                }
            }
            // Empleado no puede filtrar por otro operador
        }

        // -------------------------------------------------------------------------
        // Paso 3: Contar total
        // -------------------------------------------------------------------------
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(puntosTransacciones)
            .where(and(...condicionesBase));

        const total = countResult?.count || 0;
        const totalPaginas = Math.ceil(total / limite);
        const offset = (pagina - 1) * limite;

        if (total === 0) {
            return {
                success: true,
                message: 'No hay transacciones en este periodo',
                data: {
                    transacciones: [],
                    total: 0,
                    pagina: 1,
                    totalPaginas: 0,
                },
                code: 200,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Alias para la tabla de usuarios (cliente vs operador)
        // -------------------------------------------------------------------------
        // Necesitamos hacer JOIN con usuarios dos veces:
        // 1. Para obtener datos del CLIENTE
        // 2. Para obtener nombre del OPERADOR (si es dueño/gerente)

        // -------------------------------------------------------------------------
        // Paso 5: Obtener transacciones con todos los datos
        // -------------------------------------------------------------------------
        const transaccionesRaw = await db
            .select({
                // Transacción
                id: puntosTransacciones.id,
                estado: puntosTransacciones.estado,
                montoCompra: puntosTransacciones.montoCompra,
                montoEfectivo: puntosTransacciones.montoEfectivo,
                montoTarjeta: puntosTransacciones.montoTarjeta,
                montoTransferencia: puntosTransacciones.montoTransferencia,
                puntosOtorgados: puntosTransacciones.puntosOtorgados,
                multiplicadorAplicado: puntosTransacciones.multiplicadorAplicado,
                fotoTicketUrl: puntosTransacciones.fotoTicketUrl,
                numeroOrden: puntosTransacciones.numeroOrden,
                empleadoId: puntosTransacciones.empleadoId,
                turnoId: puntosTransacciones.turnoId,
                createdAt: puntosTransacciones.createdAt,
                cuponUsoId: puntosTransacciones.cuponUsoId,
                concepto: puntosTransacciones.concepto,
                // Cliente
                clienteNombre: sql<string>`concat(${usuarios.nombre}, ' ', coalesce(${usuarios.apellidos}, ''))`,
                clienteTelefono: usuarios.telefono,
                clienteAvatarUrl: usuarios.avatarUrl,
                // Sucursal
                sucursalNombre: negocioSucursales.nombre,
                // Negocio
                negocioNombre: negocios.nombre,
                // Empleado (si existe)
                empleadoNombre: empleados.nombre,
                // Operador del turno
                operadorUsuarioId: scanyaTurnos.usuarioId,
                // Sucursal asignada del operador (si es gerente tendrá valor, si es dueño será null)
                operadorSucursalAsignada: sql<string>`operador.sucursal_asignada`,
                clienteId: sql<string>`${puntosTransacciones.clienteId}::text`,
            })
            .from(puntosTransacciones)
            .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id))
            .innerJoin(negocioSucursales, eq(puntosTransacciones.sucursalId, negocioSucursales.id))
            .innerJoin(negocios, eq(negocioSucursales.negocioId, negocios.id))  // ⬅️ AGREGAR ESTA LÍNEA
            .leftJoin(empleados, eq(puntosTransacciones.empleadoId, empleados.id))
            .leftJoin(scanyaTurnos, eq(puntosTransacciones.turnoId, scanyaTurnos.id))
            // JOIN adicional para obtener datos del operador (dueño/gerente)
            .leftJoin(
                sql`usuarios AS operador`,
                sql`operador.id = ${scanyaTurnos.usuarioId}`
            )
            .where(and(...condicionesBase))
            .orderBy(desc(puntosTransacciones.createdAt))
            .limit(limite)
            .offset(offset);

        // -------------------------------------------------------------------------
        // Paso 6: Obtener datos adicionales (billeteras y cupones)
        // -------------------------------------------------------------------------
        const cuponUsoIds = transaccionesRaw
            .filter(t => t.cuponUsoId !== null)
            .map(t => t.cuponUsoId as number);

        // Obtener niveles de clientes
        const billeterasMap = new Map<string, string>();
        if (transaccionesRaw.length > 0) {
            const billeteras = await db
                .select({
                    usuarioId: sql<string>`${puntosBilletera.usuarioId}::text`,
                    nivel: puntosBilletera.nivelActual,
                })
                .from(puntosBilletera)
                .where(eq(puntosBilletera.negocioId, payload.negocioId));

            billeteras.forEach(b => {
                if (b.usuarioId && b.nivel) {
                    billeterasMap.set(b.usuarioId, b.nivel);
                }
            });
        }

        // Obtener datos de cupones usados
        const cuponesMap = new Map<number, { codigo: string; descuento: number }>();
        if (cuponUsoIds.length > 0) {
            const cuponesUsados = await db
                .select({
                    usoId: cuponUsos.id,
                    codigo: cupones.codigo,
                    descuento: cuponUsos.descuentoAplicado,
                })
                .from(cuponUsos)
                .innerJoin(cupones, eq(cuponUsos.cuponId, cupones.id))
                .where(sql`${cuponUsos.id} IN (${sql.join(cuponUsoIds.map(id => sql`${id}`), sql`, `)})`);

            cuponesUsados.forEach(c => {
                cuponesMap.set(Number(c.usoId), {
                    codigo: c.codigo,
                    descuento: c.descuento ? parseFloat(c.descuento) : 0,
                });
            });
        }

        // -------------------------------------------------------------------------
        // Paso 7: Obtener nombres de operadores (dueños/gerentes)
        // -------------------------------------------------------------------------
        const operadorIdsUnicos = [
            ...new Set(
                transaccionesRaw
                    .filter(t => !t.empleadoId && t.operadorUsuarioId)
                    .map(t => t.operadorUsuarioId)
            ),
        ].filter(Boolean) as string[];

        const operadoresMap = new Map<string, string>();
        if (operadorIdsUnicos.length > 0) {
            const operadores = await db
                .select({
                    id: sql<string>`${usuarios.id}::text`,
                    nombre: sql<string>`concat(${usuarios.nombre}, ' ', coalesce(${usuarios.apellidos}, ''))`,
                })
                .from(usuarios)
                .where(sql`${usuarios.id} IN (${sql.join(operadorIdsUnicos.map(id => sql`${id}::uuid`), sql`, `)})`);

            operadores.forEach(op => {
                if (op.id && op.nombre) {
                    operadoresMap.set(op.id, op.nombre);
                }
            });
        }

        // -------------------------------------------------------------------------
        // Paso 8: Mapear resultados
        // -------------------------------------------------------------------------
        const transacciones = transaccionesRaw.map(t => {
            const cuponInfo = t.cuponUsoId ? cuponesMap.get(Number(t.cuponUsoId)) : null;

            // Determinar quién registró
            let registradoPor = 'Desconocido';
            let registradoPorTipo: 'empleado' | 'dueno' | 'gerente' = 'dueno';

            if (t.empleadoId && t.empleadoNombre) {
                // Empleado
                registradoPor = t.empleadoNombre;
                registradoPorTipo = 'empleado';
            } else if (t.operadorUsuarioId) {
                // Dueño o Gerente (si tiene sucursal_asignada es gerente)
                const nombreOperador = operadoresMap.get(t.operadorUsuarioId) || 'Desconocido';
                registradoPor = nombreOperador;
                registradoPorTipo = t.operadorSucursalAsignada ? 'gerente' : 'dueno';
            }

            return {
                id: t.id,
                estado: t.estado,
                // Cliente
                clienteNombre: t.clienteNombre,
                clienteTelefono: t.clienteTelefono,
                clienteAvatarUrl: t.clienteAvatarUrl || null,
                clienteNivel: billeterasMap.get(t.clienteId) || 'bronce',
                // Montos
                montoTotal: t.montoCompra ? parseFloat(t.montoCompra) : 0,
                montoEfectivo: t.montoEfectivo ? parseFloat(t.montoEfectivo) : 0,
                montoTarjeta: t.montoTarjeta ? parseFloat(t.montoTarjeta) : 0,
                montoTransferencia: t.montoTransferencia ? parseFloat(t.montoTransferencia) : 0,
                // Puntos
                puntosOtorgados: t.puntosOtorgados,
                multiplicadorAplicado: t.multiplicadorAplicado ? parseFloat(t.multiplicadorAplicado) : 1,
                // Quién registró
                registradoPor,
                registradoPorTipo,
                // Sucursal
                sucursalNombre: t.sucursalNombre,
                // Negocio
                negocioNombre: t.negocioNombre,
                // Extras
                concepto: t.concepto || null,
                fotoTicketUrl: t.fotoTicketUrl,
                numeroOrden: t.numeroOrden,
                // Cupón
                cuponCodigo: cuponInfo?.codigo || null,
                cuponDescuento: cuponInfo?.descuento || null,
                // Fecha
                createdAt: t.createdAt || '',
            };
        });

        return {
            success: true,
            message: 'Historial obtenido',
            data: {
                transacciones,
                total,
                pagina,
                totalPaginas,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerHistorial:', error);
        return {
            success: false,
            message: 'Error interno al obtener historial',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 12: VALIDAR VOUCHER (Fase 5 - MODIFICADO)
// =============================================================================

/**
 * Valida un voucher de recompensa para su entrega.
 * Soporta validación por QR o código manual.
 * 
 * NUEVO FLUJO:
 * - QR: voucherId + usuarioId (del token JWT temporal)
 * - Código: solo el código de 6 dígitos (cliente ya identificado previamente)
 * 
 * @param payload - Datos del usuario autenticado
 * @param datos - Datos del voucher (QR o código)
 * @returns Información del voucher y recompensa a entregar
 */
export async function validarVoucher(
    payload: PayloadTokenScanYA,
    datos: ValidarVoucherInput
): Promise<RespuestaServicio<{
    voucher: {
        id: string;
        codigo: string;
        puntosUsados: number;
        expiraAt: string;
    };
    recompensa: {
        id: string;
        nombre: string;
        descripcion: string | null;
        imagenUrl: string | null;
    };
    cliente: {
        id: string;
        nombre: string;
    };
}>> {
    try {
        let voucherId: string | undefined;
        let usuarioIdVoucher: string | undefined;

        // Paso 1: Determinar método de validación
        // -------------------------------------------------------------------------
        if (datos.codigo) {
            // Método manual: buscar por código (PRIORIDAD)
            const [voucherBuscado] = await db
                .select({
                    id: vouchersCanje.id,
                    usuarioId: vouchersCanje.usuarioId,
                    codigo: vouchersCanje.codigo,
                })
                .from(vouchersCanje)
                .where(eq(vouchersCanje.codigo, datos.codigo))
                .limit(1);

            if (!voucherBuscado) {
                return {
                    success: false,
                    message: 'Código de voucher incorrecto',
                    code: 400,
                };
            }

            // VALIDACIÓN: Verificar que el código coincida exactamente
            if (voucherBuscado.codigo !== datos.codigo) {
                return {
                    success: false,
                    message: 'Código de voucher incorrecto',
                    code: 400,
                };
            }

            voucherId = voucherBuscado.id;
            usuarioIdVoucher = voucherBuscado.usuarioId;
        } else if (datos.voucherId && datos.usuarioId) {
            // Método QR (solo si NO viene código)
            voucherId = datos.voucherId;
            usuarioIdVoucher = datos.usuarioId;
        } else {
            return {
                success: false,
                message: 'Datos de validación incompletos',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Buscar y validar voucher
        // -------------------------------------------------------------------------
        const [voucher] = await db
            .select({
                id: vouchersCanje.id,
                codigo: vouchersCanje.codigo,
                usuarioId: vouchersCanje.usuarioId,
                negocioId: vouchersCanje.negocioId,
                recompensaId: vouchersCanje.recompensaId,
                puntosUsados: vouchersCanje.puntosUsados,
                estado: vouchersCanje.estado,
                expiraAt: vouchersCanje.expiraAt,
            })
            .from(vouchersCanje)
            .where(eq(vouchersCanje.id, voucherId))
            .limit(1);

        if (!voucher) {
            return {
                success: false,
                message: 'Voucher no encontrado',
                code: 404,
            };
        }

        // Verificar que el voucher pertenezca al usuario
        if (voucher.usuarioId !== usuarioIdVoucher) {
            return {
                success: false,
                message: 'Este voucher no pertenece al usuario indicado',
                code: 403,
            };
        }

        // Verificar que sea de este negocio
        if (voucher.negocioId !== payload.negocioId) {
            return {
                success: false,
                message: 'Este voucher no es válido para este negocio',
                code: 400,
            };
        }

        // Verificar estado
        if (voucher.estado !== 'pendiente') {
            const mensajes: Record<string, string> = {
                usado: 'Este voucher ya fue usado',
                expirado: 'Este voucher ha expirado',
                cancelado: 'Este voucher fue cancelado',
            };
            return {
                success: false,
                message: mensajes[voucher.estado] || 'Voucher no válido',
                code: 400,
            };
        }

        // Verificar expiración
        if (voucher.expiraAt && new Date(voucher.expiraAt) < new Date()) {
            // Marcar como expirado
            await db
                .update(vouchersCanje)
                .set({ estado: 'expirado' })
                .where(eq(vouchersCanje.id, voucher.id));

            return {
                success: false,
                message: 'Este voucher ha expirado',
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 3: Obtener datos de la recompensa
        // -------------------------------------------------------------------------
        const [recompensa] = await db
            .select({
                id: recompensas.id,
                nombre: recompensas.nombre,
                descripcion: recompensas.descripcion,
                imagenUrl: recompensas.imagenUrl,
            })
            .from(recompensas)
            .where(eq(recompensas.id, voucher.recompensaId))
            .limit(1);

        if (!recompensa) {
            return {
                success: false,
                message: 'Recompensa no encontrada',
                code: 404,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Obtener datos del cliente
        // -------------------------------------------------------------------------
        const [cliente] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
            })
            .from(usuarios)
            .where(eq(usuarios.id, voucher.usuarioId))
            .limit(1);

        // -------------------------------------------------------------------------
        // Paso 5: Marcar voucher como usado
        // -------------------------------------------------------------------------

        // Guardar quién canjeó según su tipo
        const updateData: {
            estado: string;
            usadoAt: string;
            usadoPorEmpleadoId?: string | null;
            usadoPorUsuarioId?: string | null;
            sucursalId: string;
        } = {
            estado: 'usado',
            usadoAt: new Date().toISOString(),
            sucursalId: payload.sucursalId,
        };

        if (payload.tipo === 'empleado' && payload.empleadoId) {
            // Empleado: guardar en usadoPorEmpleadoId
            updateData.usadoPorEmpleadoId = payload.empleadoId;
        } else if ((payload.tipo === 'gerente' || payload.tipo === 'dueno') && payload.usuarioId) {
            // Gerente/Dueño: guardar en usadoPorUsuarioId
            updateData.usadoPorUsuarioId = payload.usuarioId;
        }

        await db
            .update(vouchersCanje)
            .set(updateData)
            .where(eq(vouchersCanje.id, voucher.id));

        // -------------------------------------------------------------------------
        // Paso 5.5: Notificar al cliente (voucher cobrado)
        // -------------------------------------------------------------------------
        crearNotificacion({
            usuarioId: voucher.usuarioId,
            modo: 'personal',
            tipo: 'voucher_cobrado',
            titulo: '¡Recompensa entregada!',
            mensaje: `Recibiste: ${recompensa.nombre}`,
            negocioId: voucher.negocioId,
            sucursalId: payload.sucursalId,
            referenciaId: voucher.id,
            referenciaTipo: 'voucher',
            icono: '🎟️',
        }).catch((err) => console.error('Error notificación voucher:', err));

        // Notificar al dueño (voucher entregado)
        const [negocioDueno] = await db
            .select({ usuarioId: negocios.usuarioId })
            .from(negocios)
            .where(eq(negocios.id, voucher.negocioId))
            .limit(1);

        if (negocioDueno) {
            crearNotificacion({
                usuarioId: negocioDueno.usuarioId,
                modo: 'comercial',
                tipo: 'voucher_cobrado',
                titulo: 'Voucher entregado',
                mensaje: `Se entregó: ${recompensa.nombre} a ${cliente?.nombre ?? 'un cliente'}`,
                negocioId: voucher.negocioId,
                sucursalId: payload.sucursalId,
                referenciaId: voucher.id,
                referenciaTipo: 'voucher',
                icono: '✅',
            }).catch((err) => console.error('Error notificación dueño voucher entregado:', err));
        }

        // -------------------------------------------------------------------------
        // Paso 6: Retornar información
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: 'Voucher validado correctamente. Entregar recompensa al cliente.',
            data: {
                voucher: {
                    id: voucher.id,
                    codigo: voucher.codigo,
                    puntosUsados: voucher.puntosUsados,
                    expiraAt: voucher.expiraAt,
                },
                recompensa: {
                    id: recompensa.id,
                    nombre: recompensa.nombre,
                    descripcion: recompensa.descripcion,
                    imagenUrl: recompensa.imagenUrl,
                },
                cliente: {
                    id: cliente?.id || voucher.usuarioId,
                    nombre: cliente ? `${cliente.nombre} ${cliente.apellidos || ''}`.trim() : 'Cliente',
                },
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en validarVoucher:', error);
        return {
            success: false,
            message: 'Error interno al validar voucher',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 13: VOUCHERS PENDIENTES (Fase 5 - MODIFICADO)
// =============================================================================

/**
 * Obtiene los vouchers pendientes de entrega del negocio.
 * Ordenados por fecha de expiración (próximos a vencer primero).
 * 
 * NOTA: NO devuelve el código del voucher por seguridad.
 * El código solo se conoce cuando el cliente lo presenta.
 * 
 * @param payload - Datos del usuario autenticado
 * @returns Lista de vouchers pendientes (sin códigos)
 */
export async function obtenerVouchersPendientes(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    vouchers: Array<{
        id: string;
        puntosUsados: number;
        expiraAt: string;
        recompensaNombre: string;
        recompensaDescripcion: string | null;
        clienteNombre: string;
        clienteTelefono: string;
        clienteAvatarUrl: string | null;
    }>;
    total: number;
}>> {
    try {
        // Expirar vouchers vencidos + auto-reembolso antes de listar
        await expirarVouchersVencidos(payload.negocioId);

        const vouchers = await db
            .select({
                id: vouchersCanje.id,
                puntosUsados: vouchersCanje.puntosUsados,
                expiraAt: vouchersCanje.expiraAt,
                recompensaNombre: recompensas.nombre,
                recompensaDescripcion: recompensas.descripcion,
                clienteNombre: sql<string>`concat(${usuarios.nombre}, ' ', coalesce(${usuarios.apellidos}, ''))`,
                clienteTelefono: usuarios.telefono,
                clienteAvatarUrl: usuarios.avatarUrl,
            })
            .from(vouchersCanje)
            .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
            .innerJoin(usuarios, eq(vouchersCanje.usuarioId, usuarios.id))
            .where(
                and(
                    eq(vouchersCanje.negocioId, payload.negocioId),
                    eq(vouchersCanje.estado, 'pendiente')
                )
            )
            .orderBy(vouchersCanje.expiraAt);

        return {
            success: true,
            message: `${vouchers.length} vouchers pendientes`,
            data: {
                vouchers: vouchers.map(v => ({
                    id: v.id,
                    puntosUsados: v.puntosUsados,
                    expiraAt: v.expiraAt,
                    recompensaNombre: v.recompensaNombre,
                    recompensaDescripcion: v.recompensaDescripcion,
                    clienteNombre: v.clienteNombre,
                    clienteTelefono: v.clienteTelefono || '',
                    clienteAvatarUrl: v.clienteAvatarUrl || null,
                })),
                total: vouchers.length,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerVouchersPendientes:', error);
        return {
            success: false,
            message: 'Error interno al obtener vouchers',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 13B: OBTENER VOUCHERS CON FILTROS (Nueva - Gestión Completa)
// =============================================================================

/**
 * Obtiene vouchers del negocio con filtros avanzados.
 * Permisos por rol:
 * - Dueño: Ve todos los vouchers de todas las sucursales
 * - Gerente: Ve todos los vouchers de su sucursal asignada
 * - Empleado: Solo ve vouchers pendientes de su sucursal asignada
 * 
 * @param payload - Datos del usuario autenticado
 * @param filtros - Filtros opcionales (estado, sucursalId, paginación)
 * @returns Lista de vouchers con paginación
 */
export async function obtenerVouchers(
    payload: PayloadTokenScanYA,
    filtros: ObtenerVouchersInput
): Promise<RespuestaServicio<{
    vouchers: Array<{
        id: string;
        usuarioId: string;
        usuarioNombre: string;
        usuarioTelefono: string;
        usuarioAvatarUrl: string | null;
        recompensaId: string;
        recompensaNombre: string;
        recompensaDescripcion: string | null;
        puntosUsados: number;
        estado: string;
        expiraAt: string;
        usadoAt: string | null;
        usadoPorEmpleadoNombre: string | null;
        sucursalNombre: string;
    }>;
    total: number;
    pagina: number;
    totalPaginas: number;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 0: Expirar vouchers vencidos + auto-reembolso de puntos
        // -------------------------------------------------------------------------
        await expirarVouchersVencidos(payload.negocioId);
        // -------------------------------------------------------------------------
        // Paso 1: Construir condiciones base según rol
        // -------------------------------------------------------------------------
        const condiciones = [eq(vouchersCanje.negocioId, payload.negocioId)];

        if (payload.tipo === 'empleado') {
            // Empleado: Solo su sucursal, solo pendientes
            condiciones.push(
                or(
                    eq(vouchersCanje.sucursalId, payload.sucursalId),
                    isNull(vouchersCanje.sucursalId)
                )!,
                eq(vouchersCanje.estado, 'pendiente')
            );
        } else if (payload.tipo === 'gerente') {
            // Gerente: Solo su sucursal, todos los estados
            condiciones.push(
                or(
                    eq(vouchersCanje.sucursalId, payload.sucursalId),
                    isNull(vouchersCanje.sucursalId)
                )!
            );
        }
        // Dueño: Ve todas las sucursales, todos los estados

        // -------------------------------------------------------------------------
        // Paso 2: Filtro opcional por sucursal (solo para dueño/gerente)
        // -------------------------------------------------------------------------
        if (filtros.sucursalId && payload.tipo !== 'empleado') {
            // Reemplazar la condición de sucursal si viene en filtros
            const indexSucursal = condiciones.findIndex(
                c => c.toString().includes('sucursal_id')
            );
            if (indexSucursal !== -1) {
                condiciones[indexSucursal] = eq(vouchersCanje.sucursalId, filtros.sucursalId);
            } else {
                condiciones.push(eq(vouchersCanje.sucursalId, filtros.sucursalId));
            }
        }

        // -------------------------------------------------------------------------
        // Paso 3: Filtro por estado (si no es 'todos')
        // -------------------------------------------------------------------------
        if (filtros.estado !== 'todos' && payload.tipo !== 'empleado') {
            condiciones.push(eq(vouchersCanje.estado, filtros.estado));
        }

        // -------------------------------------------------------------------------
        // Paso 3.5: Filtro por operador que canjeó (empleado o gerente/dueño)
        // -------------------------------------------------------------------------
        if (filtros.empleadoId && payload.tipo !== 'empleado') {
            // Buscar en ambas columnas (empleado o usuario)
            condiciones.push(
                or(
                    eq(vouchersCanje.usadoPorEmpleadoId, filtros.empleadoId),
                    eq(vouchersCanje.usadoPorUsuarioId, filtros.empleadoId)
                )!
            );
        }
        // -------------------------------------------------------------------------
        // Paso 4: Contar total de vouchers
        // -------------------------------------------------------------------------
        const [{ total }] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(vouchersCanje)
            .where(and(...condiciones));

        // -------------------------------------------------------------------------
        // Paso 5: Calcular paginación
        // -------------------------------------------------------------------------
        const offset = (filtros.pagina - 1) * filtros.limite;
        const totalPaginas = Math.ceil(total / filtros.limite);

        // -------------------------------------------------------------------------
        // Paso 6: Obtener vouchers con joins
        // -------------------------------------------------------------------------
        const vouchers = await db
            .select({
                id: vouchersCanje.id,
                usuarioId: vouchersCanje.usuarioId,
                usuarioNombre: sql<string>`concat(${usuarios.nombre}, ' ', coalesce(${usuarios.apellidos}, ''))`,
                usuarioTelefono: usuarios.telefono,
                usuarioAvatarUrl: usuarios.avatarUrl,
                recompensaId: vouchersCanje.recompensaId,
                recompensaNombre: recompensas.nombre,
                recompensaDescripcion: recompensas.descripcion,
                puntosUsados: vouchersCanje.puntosUsados,
                estado: vouchersCanje.estado,
                expiraAt: vouchersCanje.expiraAt,
                usadoAt: vouchersCanje.usadoAt,
                usadoPorEmpleadoId: vouchersCanje.usadoPorEmpleadoId,
                usadoPorUsuarioId: vouchersCanje.usadoPorUsuarioId,
                sucursalNombre: negocioSucursales.nombre,
            })
            .from(vouchersCanje)
            .innerJoin(usuarios, eq(vouchersCanje.usuarioId, usuarios.id))
            .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
            .leftJoin(negocioSucursales, eq(vouchersCanje.sucursalId, negocioSucursales.id))
            .where(and(...condiciones))
            .orderBy(desc(vouchersCanje.createdAt))
            .limit(filtros.limite)
            .offset(offset);

        // -------------------------------------------------------------------------
        // Paso 7: Obtener nombres de quien canjeó (empleado o gerente/dueño)
        // -------------------------------------------------------------------------
        const vouchersConEmpleado = await Promise.all(
            vouchers.map(async (v) => {
                let usadoPorEmpleadoNombre = null;

                if (v.usadoPorEmpleadoId) {
                    // Canjeado por empleado - buscar en tabla empleados
                    const [empleado] = await db
                        .select({ nick: empleados.nick })
                        .from(empleados)
                        .where(eq(empleados.id, v.usadoPorEmpleadoId))
                        .limit(1);

                    usadoPorEmpleadoNombre = empleado?.nick || null;
                } else if (v.usadoPorUsuarioId) {
                    // Canjeado por gerente/dueño - buscar en tabla usuarios
                    const [usuario] = await db
                        .select({ nombre: usuarios.nombre })
                        .from(usuarios)
                        .where(eq(usuarios.id, v.usadoPorUsuarioId))
                        .limit(1);

                    usadoPorEmpleadoNombre = usuario?.nombre || null;
                }

                return {
                    id: v.id,
                    usuarioId: v.usuarioId,
                    usuarioNombre: v.usuarioNombre,
                    usuarioTelefono: v.usuarioTelefono || '',
                    usuarioAvatarUrl: v.usuarioAvatarUrl || null,
                    recompensaId: v.recompensaId,
                    recompensaNombre: v.recompensaNombre,
                    recompensaDescripcion: v.recompensaDescripcion,
                    puntosUsados: v.puntosUsados,
                    estado: v.estado,
                    expiraAt: v.expiraAt,
                    usadoAt: v.usadoAt,
                    usadoPorEmpleadoNombre,
                    sucursalNombre: v.sucursalNombre || 'Sin asignar',

                };
            })
        );

        return {
            success: true,
            message: `${total} voucher${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`,
            data: {
                vouchers: vouchersConEmpleado,
                total,
                pagina: filtros.pagina,
                totalPaginas,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerVouchers:', error);
        return {
            success: false,
            message: 'Error interno al obtener vouchers',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 13C: BUSCAR CLIENTE CON VOUCHERS (Nuevo Flujo - Fase 5)
// =============================================================================

/**
 * Busca un cliente por teléfono y obtiene sus vouchers pendientes.
 * Paso 1 del flujo de canje: Identificar cliente → Ver sus vouchers.
 * 
 * Usa la misma lógica de normalización que identificarCliente.
 * 
 * Flujo:
 * 1. Empleado pide teléfono al cliente
 * 2. Sistema busca cliente y sus vouchers
 * 3. Empleado selecciona voucher a canjear
 * 4. Cliente presenta código/QR para validar
 * 
 * @param payload - Datos del usuario autenticado
 * @param telefono - Teléfono del cliente (formato: +52XXXXXXXXXX o XXXXXXXXXX)
 * @returns Cliente con su lista de vouchers pendientes
 */
export async function buscarClienteConVouchers(
    payload: PayloadTokenScanYA,
    telefono: string
): Promise<RespuestaServicio<{
    cliente: {
        id: string;
        nombre: string;
        telefono: string;
        avatarUrl: string | null;
        nivel: string;
        puntosDisponibles: number;
    };
    vouchers: Array<{
        id: string;
        recompensaId: string;
        recompensaNombre: string;
        recompensaDescripcion: string | null;
        puntosUsados: number;
        expiraAt: string;
    }>;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Normalizar teléfono y buscar usuario (igual que identificarCliente)
        // -------------------------------------------------------------------------
        const telefonoNormalizado = telefono.replace(/^\+52/, '');

        const [usuario] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                telefono: usuarios.telefono,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(usuarios)
            .where(
                or(
                    eq(usuarios.telefono, telefono),                    // Formato original
                    eq(usuarios.telefono, telefonoNormalizado),         // Sin +52
                    eq(usuarios.telefono, `+52${telefonoNormalizado}`)  // Con +52
                )
            )
            .limit(1);

        if (!usuario) {
            return {
                success: false,
                message: 'Este número no está registrado en AnunciaYA',
                code: 200,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Obtener billetera del cliente en este negocio
        // -------------------------------------------------------------------------
        const [billetera] = await db
            .select({
                id: puntosBilletera.id,
                puntosDisponibles: puntosBilletera.puntosDisponibles,
                nivelActual: puntosBilletera.nivelActual,
            })
            .from(puntosBilletera)
            .where(
                and(
                    eq(puntosBilletera.usuarioId, usuario.id),
                    eq(puntosBilletera.negocioId, payload.negocioId)
                )
            )
            .limit(1);

        if (!billetera) {
            return {
                success: false,
                message: 'El cliente aún no tiene puntos en este negocio',
                code: 200,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2b: Verificar expiraciones (puntos + vouchers vencidos)
        // -------------------------------------------------------------------------
        await verificarExpiraciones(usuario.id, payload.negocioId);

        // Re-consultar billetera después de posibles expiraciones
        const [billeteraActualizada] = await db
            .select({
                puntosDisponibles: puntosBilletera.puntosDisponibles,
                nivelActual: puntosBilletera.nivelActual,
            })
            .from(puntosBilletera)
            .where(
                and(
                    eq(puntosBilletera.usuarioId, usuario.id),
                    eq(puntosBilletera.negocioId, payload.negocioId)
                )
            )
            .limit(1);

        if (billeteraActualizada) {
            Object.assign(billetera, billeteraActualizada);
        }

        // -------------------------------------------------------------------------
        // Paso 3: Obtener vouchers pendientes del cliente
        // -------------------------------------------------------------------------
        const vouchersData = await db
            .select({
                id: vouchersCanje.id,
                recompensaId: vouchersCanje.recompensaId,
                recompensaNombre: recompensas.nombre,
                recompensaDescripcion: recompensas.descripcion,
                puntosUsados: vouchersCanje.puntosUsados,
                expiraAt: vouchersCanje.expiraAt,
            })
            .from(vouchersCanje)
            .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
            .where(
                and(
                    eq(vouchersCanje.usuarioId, usuario.id),
                    eq(vouchersCanje.negocioId, payload.negocioId),
                    eq(vouchersCanje.estado, 'pendiente')
                )
            )
            .orderBy(vouchersCanje.expiraAt);

        // -------------------------------------------------------------------------
        // Paso 4: Retornar datos
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: 'Cliente encontrado',
            data: {
                cliente: {
                    id: usuario.id,
                    nombre: `${usuario.nombre} ${usuario.apellidos || ''}`.trim(),
                    telefono: usuario.telefono || '',
                    avatarUrl: usuario.avatarUrl || null,
                    nivel: billetera.nivelActual || 'bronce',
                    puntosDisponibles: billetera.puntosDisponibles,
                },
                vouchers: vouchersData.map(v => ({
                    id: v.id,
                    recompensaId: v.recompensaId,
                    recompensaNombre: v.recompensaNombre,
                    recompensaDescripcion: v.recompensaDescripcion,
                    puntosUsados: v.puntosUsados,
                    expiraAt: v.expiraAt,
                })),
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en buscarClienteConVouchers:', error);
        return {
            success: false,
            message: 'Error interno al buscar cliente',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 14: CREAR RECORDATORIO (Fase 6)
// =============================================================================

/**
 * Crea un recordatorio de venta para procesar despuÃ©s.
 * Usado cuando no hay conexión o el cliente no tiene cuenta.
 * 
 * @param payload - Datos del usuario autenticado
 * @param datos - Datos del recordatorio
 * @returns Recordatorio creado
 */
export async function crearRecordatorio(
    payload: PayloadTokenScanYA,
    datos: CrearRecordatorioInput
): Promise<RespuestaServicio<{
    id: string;
    telefonoOAlias: string;
    monto: number;
    createdAt: string;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 2: Obtener empleadoId (si es empleado)
        // -------------------------------------------------------------------------
        let empleadoId: string | null = null;

        if (payload.tipo === 'empleado' && payload.empleadoId) {
            // EMPLEADO: Usar el empleadoId del payload
            empleadoId = payload.empleadoId;
        } else {
            // DUEÑO/GERENTE: empleadoId queda en null
            // Usaremos turnoId para identificar quién creó el recordatorio
            empleadoId = null;
        }

        // -------------------------------------------------------------------------
        // Paso 3: Crear el recordatorio
        // -------------------------------------------------------------------------
        const [recordatorio] = await db
            .insert(scanyaRecordatorios)
            .values({
                negocioId: payload.negocioId,
                sucursalId: payload.sucursalId,
                empleadoId: empleadoId,
                turnoId: null,
                telefonoOAlias: datos.telefonoOAlias,
                monto: datos.monto.toString(),
                montoEfectivo: datos.montoEfectivo.toString(),
                montoTarjeta: datos.montoTarjeta.toString(),
                montoTransferencia: datos.montoTransferencia.toString(),
                nota: datos.nota || null,
                concepto: datos.concepto || null,
                estado: 'pendiente',
            })
            .returning({
                id: scanyaRecordatorios.id,
                telefonoOAlias: scanyaRecordatorios.telefonoOAlias,
                monto: scanyaRecordatorios.monto,
                createdAt: scanyaRecordatorios.createdAt,
            });

        return {
            success: true,
            message: 'Recordatorio creado correctamente',
            data: {
                id: recordatorio.id,
                telefonoOAlias: recordatorio.telefonoOAlias || '',
                monto: parseFloat(recordatorio.monto),
                createdAt: recordatorio.createdAt || new Date().toISOString(),
            },
            code: 201,
        };

    } catch (error) {
        console.error('Error en crearRecordatorio:', error);
        return {
            success: false,
            message: 'Error interno al crear recordatorio',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 15: OBTENER RECORDATORIOS (Fase 6)
// =============================================================================

/**
 * Obtiene los recordatorios pendientes según el rol del usuario.
 * - Dueño: Todos los del negocio (todas las sucursales)
 * - Gerente: Solo los de su sucursal
 * - Empleado: Solo los suyos
 * 
 * @param payload - Datos del usuario autenticado
 * @returns Lista de recordatorios pendientes
 */
export async function obtenerRecordatorios(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    recordatorios: Array<{
        id: string;
        telefonoOAlias: string;
        monto: number;
        montoEfectivo: number;
        montoTarjeta: number;
        montoTransferencia: number;
        nota: string | null;
        createdAt: string;
        empleadoNombre?: string;
        sucursalNombre?: string;
    }>;
    total: number;
}>> {
    try {

        // -------------------------------------------------------------------------
        // Paso 1: Construir condiciones según el rol
        // -------------------------------------------------------------------------
        const condiciones = [
            eq(scanyaRecordatorios.estado, 'pendiente'),
        ];

        if (payload.tipo === 'dueno') {
            // Dueño ve todos los del negocio
            condiciones.push(eq(scanyaRecordatorios.negocioId, payload.negocioId));
        } else if (payload.tipo === 'gerente') {
            // Gerente: solo su sucursal Y solo recordatorios de empleados O turnos que él abrió
            condiciones.push(eq(scanyaRecordatorios.sucursalId, payload.sucursalId));

            // Subconsulta: IDs de turnos del gerente
            const turnosGerente = db
                .select({ id: scanyaTurnos.id })
                .from(scanyaTurnos)
                .where(eq(scanyaTurnos.usuarioId, payload.usuarioId!));

            // Filtrar: recordatorios de empleados O de turnos del gerente
            condiciones.push(
                or(
                    isNotNull(scanyaRecordatorios.empleadoId),
                    sql`${scanyaRecordatorios.turnoId} IN (${turnosGerente})`
                )!
            );
        }
        else {
            // Empleado ve solo los suyos
            if (!payload.empleadoId) {
                return {
                    success: false,
                    message: 'Empleado no identificado',
                    code: 400,
                };
            }
            condiciones.push(eq(scanyaRecordatorios.empleadoId, payload.empleadoId));
        }

        // -------------------------------------------------------------------------
        // Paso 2: Consultar recordatorios
        // -------------------------------------------------------------------------
        const recordatorios = await db
            .select({
                id: scanyaRecordatorios.id,
                telefonoOAlias: scanyaRecordatorios.telefonoOAlias,
                monto: scanyaRecordatorios.monto,
                montoEfectivo: scanyaRecordatorios.montoEfectivo,
                montoTarjeta: scanyaRecordatorios.montoTarjeta,
                montoTransferencia: scanyaRecordatorios.montoTransferencia,
                nota: scanyaRecordatorios.nota,
                createdAt: scanyaRecordatorios.createdAt,
                empleadoNombre: empleados.nombre,
                sucursalNombre: negocioSucursales.nombre,
            })
            .from(scanyaRecordatorios)
            .leftJoin(empleados, eq(scanyaRecordatorios.empleadoId, empleados.id))
            .leftJoin(negocioSucursales, eq(scanyaRecordatorios.sucursalId, negocioSucursales.id))
            .where(and(...condiciones))
            .orderBy(desc(scanyaRecordatorios.createdAt));

        return {
            success: true,
            message: `${recordatorios.length} recordatorios pendientes`,
            data: {
                recordatorios: recordatorios.map(r => ({
                    id: r.id,
                    telefonoOAlias: r.telefonoOAlias || '',
                    monto: parseFloat(r.monto),
                    montoEfectivo: parseFloat(r.montoEfectivo || '0'),
                    montoTarjeta: parseFloat(r.montoTarjeta || '0'),
                    montoTransferencia: parseFloat(r.montoTransferencia || '0'),
                    nota: r.nota,
                    createdAt: r.createdAt || '',
                    empleadoNombre: r.empleadoNombre || undefined,
                    sucursalNombre: r.sucursalNombre || undefined,
                })),
                total: recordatorios.length,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerRecordatorios:', error);
        return {
            success: false,
            message: 'Error interno al obtener recordatorios',
            code: 500,
        };
    }
}


// =============================================================================
// FUNCIÓN 17: DESCARTAR RECORDATORIO (Fase 6)
// =============================================================================

/**
 * Marca un recordatorio como descartado.
 * 
 * @param payload - Datos del usuario autenticado
 * @param recordatorioId - ID del recordatorio
 * @returns Confirmación de eliminación
 */
export async function descartarRecordatorio(
    payload: PayloadTokenScanYA,
    recordatorioId: string
): Promise<RespuestaServicio<{ id: string; estado: string }>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar el recordatorio
        // -------------------------------------------------------------------------
        const [recordatorio] = await db
            .select({
                id: scanyaRecordatorios.id,
                estado: scanyaRecordatorios.estado,
                negocioId: scanyaRecordatorios.negocioId,
                sucursalId: scanyaRecordatorios.sucursalId,
                empleadoId: scanyaRecordatorios.empleadoId,
                turnoId: scanyaRecordatorios.turnoId,
            })
            .from(scanyaRecordatorios)
            .where(eq(scanyaRecordatorios.id, recordatorioId))
            .limit(1);

        if (!recordatorio) {
            return {
                success: false,
                message: 'Recordatorio no encontrado',
                code: 404,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Verificar permisos (misma lógica que procesar)
        // -------------------------------------------------------------------------
        if (payload.tipo === 'empleado') {
            if (recordatorio.empleadoId !== payload.empleadoId) {
                return {
                    success: false,
                    message: 'No tienes permiso para descartar este recordatorio',
                    code: 403,
                };
            }
        } else if (payload.tipo === 'gerente') {
            // Verificar que sea de su sucursal
            if (recordatorio.sucursalId !== payload.sucursalId) {
                return {
                    success: false,
                    message: 'Este recordatorio no pertenece a tu sucursal',
                    code: 403,
                };
            }

            // Verificar que sea de un empleado O de un turno que él abrió
            if (recordatorio.empleadoId === null && recordatorio.turnoId) {
                // Es de dueño/gerente, verificar que sea de un turno suyo
                const [turno] = await db
                    .select({ usuarioId: scanyaTurnos.usuarioId })
                    .from(scanyaTurnos)
                    .where(eq(scanyaTurnos.id, recordatorio.turnoId))
                    .limit(1);

                if (!turno || turno.usuarioId !== payload.usuarioId) {
                    return {
                        success: false,
                        message: 'No tienes permiso para descartar este recordatorio',
                        code: 403,
                    };
                }
            }
        }
        else {
            if (recordatorio.negocioId !== payload.negocioId) {
                return {
                    success: false,
                    message: 'Este recordatorio no pertenece a tu negocio',
                    code: 403,
                };
            }
        }

        // -------------------------------------------------------------------------
        // Paso 3: Verificar estado
        // -------------------------------------------------------------------------
        if (recordatorio.estado !== 'pendiente') {
            return {
                success: false,
                message: `Este recordatorio ya fue ${recordatorio.estado}`,
                code: 400,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 4: Eliminar el recordatorio (no necesitamos guardarlo)
        // -------------------------------------------------------------------------
        await db
            .delete(scanyaRecordatorios)
            .where(eq(scanyaRecordatorios.id, recordatorioId));

        return {
            success: true,
            message: 'Recordatorio descartado',
            data: {
                id: recordatorioId,
                estado: 'eliminado',
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en descartarRecordatorio:', error);
        return {
            success: false,
            message: 'Error interno al descartar recordatorio',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 18: OBTENER CONFIGURACIÓN SCANYA (Fase 7)
// =============================================================================

/**
 * Obtiene la configuración de ScanYA del negocio.
 * 
 * @param payload - Datos del usuario autenticado
 * @returns Configuración de ScanYA
 */
export async function obtenerConfigScanYA(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    // Config ScanYA (operación PWA)
    fotoTicket: string;
    alertaMontoAlto: number | null;
    alertaTransaccionesHora: number | null;
    requiereNumeroOrden: boolean;
    // Config Puntos (cálculo de puntos)
    puntosPorPeso: number;
    minimoCompra: number;
    nivelesActivos: boolean;
    multiplicadores: {
        bronce: number;
        plata: number;
        oro: number;
    };
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar configuración de ScanYA
        // -------------------------------------------------------------------------
        const [configScanYA] = await db
            .select({
                fotoTicket: scanyaConfiguracion.fotoTicket,
                alertaMontoAlto: scanyaConfiguracion.alertaMontoAlto,
                alertaTransaccionesHora: scanyaConfiguracion.alertaTransaccionesHora,
                requiereNumeroOrden: scanyaConfiguracion.requiereNumeroOrden,
            })
            .from(scanyaConfiguracion)
            .where(eq(scanyaConfiguracion.negocioId, payload.negocioId))
            .limit(1);

        // -------------------------------------------------------------------------
        // Paso 2: Buscar configuración de Puntos
        // -------------------------------------------------------------------------
        const [configPuntos] = await db
            .select({
                puntosPorPeso: puntosConfiguracion.puntosPorPeso,
                minimoCompra: puntosConfiguracion.minimoCompra,
                nivelesActivos: puntosConfiguracion.nivelesActivos,
                nivelBronceMultiplicador: puntosConfiguracion.nivelBronceMultiplicador,
                nivelPlataMultiplicador: puntosConfiguracion.nivelPlataMultiplicador,
                nivelOroMultiplicador: puntosConfiguracion.nivelOroMultiplicador,
            })
            .from(puntosConfiguracion)
            .where(eq(puntosConfiguracion.negocioId, payload.negocioId))
            .limit(1);

        // -------------------------------------------------------------------------
        // Paso 3: Construir respuesta con valores por defecto si no existen
        // -------------------------------------------------------------------------
        return {
            success: true,
            message: configScanYA || configPuntos ? 'Configuración obtenida' : 'Configuración por defecto',
            data: {
                // Config ScanYA
                fotoTicket: configScanYA?.fotoTicket || 'opcional',
                alertaMontoAlto: configScanYA?.alertaMontoAlto ? parseFloat(configScanYA.alertaMontoAlto) : 5000,
                alertaTransaccionesHora: configScanYA?.alertaTransaccionesHora ?? 20,
                requiereNumeroOrden: configScanYA?.requiereNumeroOrden || false,
                // Config Puntos
                puntosPorPeso: configPuntos?.puntosPorPeso ? parseFloat(configPuntos.puntosPorPeso) : 0.1,
                minimoCompra: configPuntos?.minimoCompra ? parseFloat(configPuntos.minimoCompra) : 0,
                nivelesActivos: configPuntos?.nivelesActivos ?? true,
                multiplicadores: {
                    bronce: configPuntos?.nivelBronceMultiplicador ? parseFloat(configPuntos.nivelBronceMultiplicador) : 1.0,
                    plata: configPuntos?.nivelPlataMultiplicador ? parseFloat(configPuntos.nivelPlataMultiplicador) : 1.2,
                    oro: configPuntos?.nivelOroMultiplicador ? parseFloat(configPuntos.nivelOroMultiplicador) : 1.5,
                },
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerConfigScanYA:', error);
        return {
            success: false,
            message: 'Error interno al obtener configuración',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 19: ACTUALIZAR CONFIGURACIÓN SCANYA (Fase 7)
// =============================================================================

/**
 * Actualiza la configuración de ScanYA del negocio.
 * Solo el dueño puede modificar la configuración.
 * 
 * @param payload - Datos del usuario autenticado
 * @param datos - Datos a actualizar
 * @returns Configuración actualizada
 */
export async function actualizarConfigScanYA(
    payload: PayloadTokenScanYA,
    datos: ActualizarConfigScanYAInput
): Promise<RespuestaServicio<{
    fotoTicket: string;
    alertaMontoAlto: number | null;
    alertaTransaccionesHora: number | null;
    requiereNumeroOrden: boolean;
}>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Verificar que sea dueño
        // -------------------------------------------------------------------------
        if (payload.tipo !== 'dueno') {
            return {
                success: false,
                message: 'Solo el dueño puede modificar la configuración',
                code: 403,
            };
        }

        // -------------------------------------------------------------------------
        // Paso 2: Buscar configuración existente
        // -------------------------------------------------------------------------
        const [configExistente] = await db
            .select({ id: scanyaConfiguracion.id })
            .from(scanyaConfiguracion)
            .where(eq(scanyaConfiguracion.negocioId, payload.negocioId))
            .limit(1);

        // -------------------------------------------------------------------------
        // Paso 3: Preparar datos para actualizar
        // -------------------------------------------------------------------------
        const datosActualizar: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (datos.fotoTicket !== undefined) {
            datosActualizar.fotoTicket = datos.fotoTicket;
        }
        if (datos.alertaMontoAlto !== undefined) {
            datosActualizar.alertaMontoAlto = datos.alertaMontoAlto?.toString() || null;
        }
        if (datos.alertaTransaccionesHora !== undefined) {
            datosActualizar.alertaTransaccionesHora = datos.alertaTransaccionesHora;
        }
        if (datos.requiereNumeroOrden !== undefined) {
            datosActualizar.requiereNumeroOrden = datos.requiereNumeroOrden;
        }

        // -------------------------------------------------------------------------
        // Paso 4: Crear o actualizar
        // -------------------------------------------------------------------------
        let configFinal;

        if (configExistente) {
            // Actualizar existente
            [configFinal] = await db
                .update(scanyaConfiguracion)
                .set(datosActualizar)
                .where(eq(scanyaConfiguracion.negocioId, payload.negocioId))
                .returning({
                    fotoTicket: scanyaConfiguracion.fotoTicket,
                    alertaMontoAlto: scanyaConfiguracion.alertaMontoAlto,
                    alertaTransaccionesHora: scanyaConfiguracion.alertaTransaccionesHora,
                    requiereNumeroOrden: scanyaConfiguracion.requiereNumeroOrden,
                });
        } else {
            // Crear nueva
            [configFinal] = await db
                .insert(scanyaConfiguracion)
                .values({
                    negocioId: payload.negocioId,
                    fotoTicket: datos.fotoTicket || 'opcional',
                    alertaMontoAlto: datos.alertaMontoAlto?.toString() || '5000',
                    alertaTransaccionesHora: datos.alertaTransaccionesHora || 20,
                    requiereNumeroOrden: datos.requiereNumeroOrden || false,
                })
                .returning({
                    fotoTicket: scanyaConfiguracion.fotoTicket,
                    alertaMontoAlto: scanyaConfiguracion.alertaMontoAlto,
                    alertaTransaccionesHora: scanyaConfiguracion.alertaTransaccionesHora,
                    requiereNumeroOrden: scanyaConfiguracion.requiereNumeroOrden,
                });
        }

        return {
            success: true,
            message: 'Configuración actualizada',
            data: {
                fotoTicket: configFinal.fotoTicket || 'opcional',
                alertaMontoAlto: configFinal.alertaMontoAlto ? parseFloat(configFinal.alertaMontoAlto) : null,
                alertaTransaccionesHora: configFinal.alertaTransaccionesHora,
                requiereNumeroOrden: configFinal.requiereNumeroOrden || false,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en actualizarConfigScanYA:', error);
        return {
            success: false,
            message: 'Error interno al actualizar configuración',
            code: 500,
        };
    }
}


// =============================================================================
// FUNCIÓN 20: GENERAR PRESIGNED URL PARA TICKET (Fase 9)
// =============================================================================

import { generarPresignedUrl } from './r2.service.js';

/**
 * Genera una URL pre-firmada para subir foto de ticket a R2.
 * El frontend usará esta URL para subir directamente a Cloudflare R2.
 * 
 * @param payload - Datos del usuario autenticado
 * @param nombreArchivo - Nombre original del archivo
 * @param contentType - Tipo MIME (image/jpeg, image/png, image/webp)
 * @returns URL de subida + URL pública final
 */
export async function generarUrlUploadTicket(
    payload: PayloadTokenScanYA,
    nombreArchivo: string,
    contentType: string
): Promise<RespuestaServicio<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
}>> {
    try {
        // Validar que tenga turno activo (opcional, pero recomendado)
        // Por ahora lo dejamos sin validación de turno para flexibilidad

        // Generar presigned URL para la carpeta 'tickets'
        // Incluimos negocioId en la ruta para organizar por negocio
        const carpeta = `tickets/${payload.negocioId}`;

        const resultado = await generarPresignedUrl(
            carpeta,
            nombreArchivo,
            contentType,
            300 // 5 minutos de validez
        );

        if (!resultado.success || !resultado.data) {
            return {
                success: false,
                message: resultado.message,
                code: resultado.code,
            };
        }

        return {
            success: true,
            message: 'URL de subida generada',
            data: resultado.data,
            code: 200,
        };

    } catch (error) {
        console.error('Error en generarUrlUploadTicket:', error);
        return {
            success: false,
            message: 'Error interno al generar URL de subida',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 21: OBTENER CONTADORES PARA DASHBOARD (Fase 9)
// =============================================================================

/**
 * Obtiene contadores de mensajes, reseñas y recordatorios pendientes.
 * Usado en el dashboard de ScanYA para mostrar badges.
 * 
 * @param payload - Datos del usuario autenticado
 * @returns Contadores de cada tipo
 */
export async function obtenerContadores(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<{
    mensajesSinLeer: number;
    resenasPendientes: number;
    recordatoriosPendientes: number;
    vouchersPendientes: number;
}>> {
    try {
        // -------------------------------------------------------------------------
        // 1. Contar recordatorios pendientes
        // -------------------------------------------------------------------------
        let condicionRecordatorios;

        if (payload.tipo === 'dueno') {
            // Dueño ve todos los del negocio
            condicionRecordatorios = and(
                eq(scanyaRecordatorios.negocioId, payload.negocioId),
                eq(scanyaRecordatorios.estado, 'pendiente')
            );
        } else if (payload.tipo === 'gerente') {
            // Gerente: solo su sucursal Y solo recordatorios de empleados O turnos que él abrió
            const turnosGerente = db
                .select({ id: scanyaTurnos.id })
                .from(scanyaTurnos)
                .where(eq(scanyaTurnos.usuarioId, payload.usuarioId!));

            condicionRecordatorios = and(
                eq(scanyaRecordatorios.sucursalId, payload.sucursalId),
                eq(scanyaRecordatorios.estado, 'pendiente'),
                or(
                    isNotNull(scanyaRecordatorios.empleadoId),
                    sql`${scanyaRecordatorios.turnoId} IN (${turnosGerente})`
                )!
            );
        }
        else {
            // Empleado ve solo los suyos
            condicionRecordatorios = and(
                eq(scanyaRecordatorios.negocioId, payload.negocioId),
                eq(scanyaRecordatorios.empleadoId, payload.empleadoId!),
                eq(scanyaRecordatorios.estado, 'pendiente')
            );
        }

        const [recordatoriosCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(scanyaRecordatorios)
            .where(condicionRecordatorios);

        const recordatoriosPendientes = recordatoriosCount?.count || 0;

        // -------------------------------------------------------------------------
        // 2. Contar vouchers pendientes de entregar
        // -------------------------------------------------------------------------
        const [vouchersCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(vouchersCanje)
            .where(and(
                eq(vouchersCanje.negocioId, payload.negocioId),
                eq(vouchersCanje.estado, 'pendiente')
            ));

        const vouchersPendientes = vouchersCount?.count || 0;

        // -------------------------------------------------------------------------
        // 2. Contar reseñas pendientes de respuesta
        // -------------------------------------------------------------------------
        let resenasPendientes = 0;
        try {
            const { contarResenasPendientes } = await import('./resenas.service.js');

            // Gerente/Empleado: solo su sucursal | Dueño: todas
            const sucursalFiltro = (payload.tipo === 'gerente' || payload.tipo === 'empleado')
                ? payload.sucursalId
                : undefined;

            resenasPendientes = await contarResenasPendientes(payload.negocioId, sucursalFiltro);
        } catch (err) {
            console.error('Error contando reseñas pendientes:', err);
        }

        // -------------------------------------------------------------------------
        // 3. Contar mensajes sin leer (ChatYA)
        // -------------------------------------------------------------------------
        // TODO: Implementar cuando ChatYA estÃ© integrado
        // Por ahora retornamos 0
        const mensajesSinLeer = 0;

        // Nota: Cuando implementes ChatYA, necesitarás:
        // - Acceder a MongoDB para contar mensajes
        // - Filtrar por negocioId y estado 'no leÃ­do'
        // - Considerar permisos del empleado (puedeResponderChat)

        return {
            success: true,
            message: 'Contadores obtenidos',
            data: {
                mensajesSinLeer,
                resenasPendientes,
                recordatoriosPendientes,
                vouchersPendientes,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerContadores:', error);
        return {
            success: false,
            message: 'Error interno al obtener contadores',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 22: LISTAR SUCURSALES PARA FILTROS (Reutiliza negocios.service)
// =============================================================================

/**
 * Obtiene lista de sucursales del negocio para dropdowns de filtros.
 * Solo el dueño puede ver todas las sucursales.
 * Gerente y empleado solo ven su sucursal asignada.
 */
export async function obtenerSucursalesLista(
    payload: PayloadTokenScanYA
): Promise<RespuestaServicio<Array<{ id: string; nombre: string }>>> {
    try {
        // Obtener todas las sucursales del negocio
        const resultado = await obtenerSucursalesNegocio(payload.negocioId);

        if (!resultado.success || !resultado.data) {
            return {
                success: false,
                message: 'Error al obtener sucursales',
                code: 500,
            };
        }

        let sucursales = resultado.data.map((s) => ({
            id: s.id,
            nombre: s.nombre,
        }));

        // Empleado/Gerente: filtrar solo su sucursal
        if (payload.tipo === 'empleado' || payload.tipo === 'gerente') {
            sucursales = sucursales.filter((s) => s.id === payload.sucursalId);
        }

        return {
            success: true,
            message: `${sucursales.length} sucursal${sucursales.length !== 1 ? 'es' : ''} disponible${sucursales.length !== 1 ? 's' : ''}`,
            data: sucursales,
            code: 200,
        };
    } catch (error) {
        console.error('Error en obtenerSucursalesLista:', error);
        return {
            success: false,
            message: 'Error interno al obtener sucursales',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 23: LISTAR EMPLEADOS PARA FILTROS (Reutiliza negocios.service)
// =============================================================================

/**
 * Obtiene lista de operadores (empleados + gerentes + dueño) para dropdowns de filtros.
 * - Dueño: ve todos los operadores (opcionalmente filtrados por sucursal)
 * - Gerente: solo operadores de su sucursal
 * - Empleado: no ve este dropdown (retorna vacío)
 */
export async function obtenerOperadoresLista(
    payload: PayloadTokenScanYA,
    sucursalId?: string
): Promise<RespuestaServicio<Array<{
    id: string;
    nombre: string;
    tipo: 'empleado' | 'gerente' | 'dueno';
    sucursalId: string | null;
    sucursalNombre: string | null;
}>>> {
    try {
        // Empleado: no puede filtrar por operador
        if (payload.tipo === 'empleado') {
            return {
                success: true,
                message: 'Sin acceso a lista de operadores',
                data: [],
                code: 200,
            };
        }

        // Determinar sucursal a filtrar
        let filtroSucursal: string | undefined;

        if (payload.tipo === 'gerente') {
            // Gerente: forzar su sucursal
            filtroSucursal = payload.sucursalId;
        } else if (sucursalId) {
            // Dueño: usar sucursal del query param si viene
            filtroSucursal = sucursalId;
        }

        const resultado = await listarOperadoresNegocio(payload.negocioId, filtroSucursal);

        if (!resultado.success || !resultado.data) {
            return {
                success: false,
                message: 'Error al obtener operadores',
                code: 500,
            };
        }

        return {
            success: true,
            message: `${resultado.data.length} operadores encontrados`,
            data: resultado.data,
            code: 200,
        };
    } catch (error) {
        console.error('Error en obtenerOperadoresLista:', error);
        return {
            success: false,
            message: 'Error interno al obtener operadores',
            code: 500,
        };
    }
}