/**
 * puntos.controller.ts
 * =====================
 * Controllers para endpoints de Configuración de Puntos, Recompensas y Estadísticas
 * 
 * Ubicación: apps/api/src/controllers/puntos.controller.ts
 * 
 * ENDPOINTS:
 * GET    /api/puntos/configuracion           - Obtener configuración
 * PUT    /api/puntos/configuracion           - Actualizar configuración
 * GET    /api/puntos/recompensas             - Listar recompensas
 * GET    /api/puntos/recompensas/:id         - Obtener recompensa por ID
 * POST   /api/puntos/recompensas             - Crear recompensa
 * PUT    /api/puntos/recompensas/:id         - Actualizar recompensa
 * DELETE /api/puntos/recompensas/:id         - Eliminar recompensa
 * GET    /api/puntos/estadisticas            - Obtener KPIs
 * 
 * NOTA: Historial y Revocar → transacciones.controller.ts
 *       Top Clientes → clientes.controller.ts
 */

import { Request, Response } from 'express';
import {
  obtenerConfigPuntos,
  actualizarConfigPuntos,
  obtenerRecompensas,
  obtenerRecompensaPorId,
  crearRecompensa,
  actualizarRecompensa,
  eliminarRecompensa,
  obtenerEstadisticasPuntos,
} from '../services/puntos.service.js';
import {
  actualizarConfigPuntosSchema,
  crearRecompensaSchema,
  actualizarRecompensaSchema,
  formatearErroresZod,
} from '../validations/puntos.schema.js';
import type { PeriodoEstadisticas } from '../types/puntos.types.js';
import { ZodError } from 'zod';

// =============================================================================
// EXTENSIÓN DE TIPOS EXPRESS
// =============================================================================

// TokenDecodificado ya está definido en jwt.ts e incluido en req.usuario por auth.middleware
// No necesitamos redefinirlo aquí

// =============================================================================
// HELPERS PARA OBTENER DATOS DEL CONTEXTO
// =============================================================================

/**
 * Obtiene el negocioId del usuario autenticado
 * Asume que req.user tiene los datos del usuario
 */
/**
 * Obtiene el negocioId del request
 * IMPORTANTE: Requiere middleware verificarNegocio ejecutado antes
 */
function obtenerNegocioId(req: Request): string | null {
  return req.negocioId || null;
}

/**
 * Obtiene el sucursalId del contexto
 * - Query param ?sucursalId=xxx (enviado automáticamente por interceptor Axios)
 * - req.usuario.sucursalAsignada (gerente tiene asignación fija en el token)
 */
function obtenerSucursalId(req: Request): string | undefined {
  // Query param sucursalId (dueño selecciona sucursal con SelectorSucursalesInline)
  const querySucursal = req.query.sucursalId as string;
  if (querySucursal) {
    return querySucursal;
  }

  // Usuario gerente tiene sucursal asignada (del token)
  if (req.usuario?.sucursalAsignada) {
    return req.usuario.sucursalAsignada;
  }

  return undefined;
}

/**
 * Verifica si el usuario es dueño del negocio
 * REGLA: Si sucursalAsignada es null → es dueño
 */
function esDueno(req: Request): boolean {
  const usuario = req.usuario;
  // Dueños tienen sucursalAsignada = null
  return usuario?.sucursalAsignada === null || usuario?.sucursalAsignada === undefined;
}

/**
 * Verifica si el usuario es gerente
 * REGLA: Si sucursalAsignada tiene valor → es gerente
 */
function esGerente(req: Request): boolean {
  const usuario = req.usuario;
  // Gerentes tienen sucursalAsignada con UUID
  return !!usuario?.sucursalAsignada;
}

// =============================================================================
// 1. OBTENER CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * GET /api/puntos/configuracion
 * Obtiene la configuración de puntos del negocio
 * Acceso: Dueños y Gerentes (ambos pueden ver)
 */
export async function obtenerConfigPuntosController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Verificar autenticación
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado o sin negocio asociado',
      });
      return;
    }

    // Obtener configuración
    const resultado = await obtenerConfigPuntos(negocioId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerConfigPuntosController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de puntos',
    });
  }
}

// =============================================================================
// 2. ACTUALIZAR CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * PUT /api/puntos/configuracion
 * Actualiza la configuración de puntos del negocio
 * Acceso: SOLO DUEÑOS (gerentes solo pueden ver)
 */
export async function actualizarConfigPuntosController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Verificar autenticación
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Verificar que sea DUEÑO (gerentes NO pueden editar)
    if (!esDueno(req)) {
      res.status(403).json({
        success: false,
        message: 'Solo el dueño puede modificar la configuración de puntos',
      });
      return;
    }

    // Validar datos con Zod
    try {
      const datosValidados = actualizarConfigPuntosSchema.parse(req.body);

      // Actualizar configuración
      const resultado = await actualizarConfigPuntos(negocioId, datosValidados);

      res.status(resultado.code || 200).json(resultado);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errores: formatearErroresZod(error),
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error en actualizarConfigPuntosController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración de puntos',
    });
  }
}

// =============================================================================
// 3. OBTENER RECOMPENSAS
// =============================================================================

/**
 * GET /api/puntos/recompensas?soloActivas=true
 * Lista todas las recompensas del negocio
 * Acceso: Dueños y Gerentes
 */
export async function obtenerRecompensasController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Query param opcional
    const soloActivas = req.query.soloActivas === 'true';

    const resultado = await obtenerRecompensas(negocioId, soloActivas);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerRecompensasController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recompensas',
    });
  }
}

// =============================================================================
// 4. OBTENER RECOMPENSA POR ID
// =============================================================================

/**
 * GET /api/puntos/recompensas/:id
 * Obtiene una recompensa específica
 * Acceso: Dueños y Gerentes
 */
export async function obtenerRecompensaPorIdController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de recompensa requerido',
      });
      return;
    }

    const resultado = await obtenerRecompensaPorId(id, negocioId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerRecompensaPorIdController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recompensa',
    });
  }
}

// =============================================================================
// 5. CREAR RECOMPENSA
// =============================================================================

/**
 * POST /api/puntos/recompensas
 * Crea una nueva recompensa
 * Acceso: SOLO DUEÑOS (recompensas son globales del negocio)
 */
export async function crearRecompensaController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Verificar que sea DUEÑO
    if (!esDueno(req)) {
      res.status(403).json({
        success: false,
        message: 'Solo el dueño puede crear recompensas',
      });
      return;
    }

    // Validar datos con Zod
    try {
      const datosValidados = crearRecompensaSchema.parse(req.body);

      const resultado = await crearRecompensa(datosValidados, negocioId);

      res.status(resultado.code || 201).json(resultado);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errores: formatearErroresZod(error),
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error en crearRecompensaController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear recompensa',
    });
  }
}

// =============================================================================
// 6. ACTUALIZAR RECOMPENSA
// =============================================================================

/**
 * PUT /api/puntos/recompensas/:id
 * Actualiza una recompensa existente
 * Acceso: SOLO DUEÑOS
 */
export async function actualizarRecompensaController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Verificar que sea DUEÑO
    if (!esDueno(req)) {
      res.status(403).json({
        success: false,
        message: 'Solo el dueño puede modificar recompensas',
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de recompensa requerido',
      });
      return;
    }

    // Validar datos con Zod
    try {
      const datosValidados = actualizarRecompensaSchema.parse(req.body);

      const resultado = await actualizarRecompensa(id, datosValidados, negocioId);

      res.status(resultado.code || 200).json(resultado);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errores: formatearErroresZod(error),
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error en actualizarRecompensaController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar recompensa',
    });
  }
}

// =============================================================================
// 7. ELIMINAR RECOMPENSA
// =============================================================================

/**
 * DELETE /api/puntos/recompensas/:id
 * Elimina (soft delete) una recompensa
 * Acceso: SOLO DUEÑOS
 */
export async function eliminarRecompensaController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Verificar que sea DUEÑO
    if (!esDueno(req)) {
      res.status(403).json({
        success: false,
        message: 'Solo el dueño puede eliminar recompensas',
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de recompensa requerido',
      });
      return;
    }

    const resultado = await eliminarRecompensa(id, negocioId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en eliminarRecompensaController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar recompensa',
    });
  }
}

// =============================================================================
// 8. OBTENER ESTADÍSTICAS
// =============================================================================

/**
 * GET /api/puntos/estadisticas?periodo=semana
 * Obtiene KPIs de puntos con filtros
 * Acceso: Dueños y Gerentes (gerentes ven solo su sucursal)
 */
export async function obtenerEstadisticasController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    
    if (!negocioId) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // Obtener sucursal del contexto (header o gerente)
    let sucursalId = obtenerSucursalId(req);

    // GERENTES: Forzar filtro por su sucursal asignada (NO pueden ver otras)
    if (esGerente(req)) {
      sucursalId = req.usuario?.sucursalAsignada || undefined;
      if (!sucursalId) {
        res.status(403).json({
          success: false,
          message: 'Gerente debe tener sucursal asignada',
        });
        return;
      }
    }

    // Obtener periodo del query param
    const periodo = (req.query.periodo as PeriodoEstadisticas) || 'todo';

    // Validar periodo
    const periodosValidos: PeriodoEstadisticas[] = ['hoy', 'semana', 'mes', '3meses', 'anio', 'todo'];
    if (!periodosValidos.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${periodosValidos.join(', ')}`,
      });
      return;
    }

    const resultado = await obtenerEstadisticasPuntos(
      negocioId,
      sucursalId,
      periodo
    );

    res.status(resultado.code || 200).json({
      ...resultado,
      periodo, // Incluir periodo en respuesta
    });
  } catch (error) {
    console.error('Error en obtenerEstadisticasController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
    });
  }
}