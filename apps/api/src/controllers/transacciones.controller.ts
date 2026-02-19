/**
 * transacciones.controller.ts
 * ============================
 * Controllers para el módulo de Transacciones (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/controllers/transacciones.controller.ts
 * 
 * ENDPOINTS - TAB VENTAS:
 * GET    /api/transacciones/historial              - Historial de transacciones de puntos
 * GET    /api/transacciones/kpis                   - KPIs para página Transacciones BS
 * GET    /api/transacciones/exportar               - Exportar CSV de transacciones
 * POST   /api/transacciones/:id/revocar            - Revocar transacción (con motivo obligatorio)
 * 
 * ENDPOINTS - TAB CANJES:
 * GET    /api/transacciones/canjes                 - Historial de canjes (vouchers)
 * GET    /api/transacciones/canjes/kpis            - KPIs para Tab Canjes
 * 
 * NOTA: Consume funciones de puntos.service.ts y transacciones.service.ts
 */

import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import {
  obtenerHistorialTransacciones,
  revocarTransaccion,
  obtenerOperadoresTransacciones,
} from '../services/puntos.service.js';
import {
  obtenerKPIsTransacciones,
  obtenerKPIsCanjes,
  obtenerHistorialCanjes,
} from '../services/transacciones.service.js';
import type { PeriodoEstadisticas } from '../types/puntos.types.js';

// =============================================================================
// HELPERS PARA OBTENER DATOS DEL CONTEXTO
// =============================================================================

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
  const querySucursal = req.query.sucursalId as string;
  if (querySucursal) {
    return querySucursal;
  }

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
  return usuario?.sucursalAsignada === null || usuario?.sucursalAsignada === undefined;
}

/**
 * Verifica si el usuario es gerente
 * REGLA: Si sucursalAsignada tiene valor → es gerente
 */
function esGerente(req: Request): boolean {
  const usuario = req.usuario;
  return !!usuario?.sucursalAsignada;
}

// Periodos válidos para validación
const PERIODOS_VALIDOS: PeriodoEstadisticas[] = ['hoy', 'semana', 'mes', '3meses', 'anio', 'todo'];

// =============================================================================
// 1. OBTENER HISTORIAL DE TRANSACCIONES
// =============================================================================

/**
 * GET /api/transacciones/historial?periodo=semana&limit=50&offset=0
 * Obtiene historial de transacciones de puntos con filtros
 * Acceso: Dueños y Gerentes (gerentes ven solo su sucursal)
 */
export async function obtenerHistorialController(
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

    // Obtener sucursal del contexto
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

    // Obtener parámetros de paginación
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Obtener periodo del query param
    const periodo = (req.query.periodo as PeriodoEstadisticas) || 'todo';

    // Obtener búsqueda del query param
    const busqueda = (req.query.busqueda as string)?.trim() || undefined;

    // Obtener filtro de operador
    const operadorId = (req.query.operadorId as string)?.trim() || undefined;

    // Obtener filtro de estado
    const estado = (req.query.estado as string)?.trim() || undefined;

    // Validar periodo
    if (!PERIODOS_VALIDOS.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${PERIODOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    // Validar límites
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100',
      });
      return;
    }

    const resultado = await obtenerHistorialTransacciones(
      negocioId,
      sucursalId,
      periodo,
      limit,
      offset,
      busqueda,
      operadorId,
      estado
    );

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerHistorialController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
    });
  }
}

// =============================================================================
// 2. REVOCAR TRANSACCIÓN (con motivo obligatorio)
// =============================================================================

/**
 * POST /api/transacciones/:id/revocar
 * Body: { motivo: string }
 * Revoca una transacción de puntos con motivo obligatorio
 * Acceso: Dueños (cualquier transacción) y Gerentes (solo de su sucursal)
 */
export async function revocarTransaccionController(
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

    // Verificar que sea DUEÑO o GERENTE (NO empleados)
    if (!esDueno(req) && !esGerente(req)) {
      res.status(403).json({
        success: false,
        message: 'Solo dueños y gerentes pueden revocar transacciones',
      });
      return;
    }

    const transaccionId = req.params.id;

    if (!transaccionId) {
      res.status(400).json({
        success: false,
        message: 'ID de transacción requerido',
      });
      return;
    }

    // Validar motivo obligatorio
    const { motivo } = req.body || {};

    if (!motivo || typeof motivo !== 'string' || motivo.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'El motivo de revocación es obligatorio',
      });
      return;
    }

    // Obtener sucursalId para gerentes (validación de permisos)
    let sucursalId: string | undefined;
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

    // UUID del usuario que revoca
    const revocadoPor = req.usuario?.usuarioId;

    const resultado = await revocarTransaccion(
      transaccionId,
      negocioId,
      sucursalId,
      motivo.trim(),
      revocadoPor
    );

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en revocarTransaccionController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al revocar transacción',
    });
  }
}

// =============================================================================
// 3. OBTENER KPIs TRANSACCIONES (Tab Ventas)
// =============================================================================

/**
 * GET /api/transacciones/kpis?periodo=semana
 * Obtiene 4 KPIs: total ventas, # transacciones, ticket promedio, revocadas
 * Acceso: Dueños y Gerentes
 */
export async function obtenerKPIsTransaccionesController(
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

    // Obtener sucursal del contexto
    let sucursalId = obtenerSucursalId(req);

    // GERENTES: Forzar filtro por su sucursal asignada
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
    if (!PERIODOS_VALIDOS.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${PERIODOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    const resultado = await obtenerKPIsTransacciones(negocioId, sucursalId, periodo);
    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerKPIsTransaccionesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener KPIs',
    });
  }
}

// =============================================================================
// 4. EXPORTAR TRANSACCIONES A EXCEL
// =============================================================================

/**
 * GET /api/transacciones/exportar?periodo=mes
 * Descarga archivo Excel con todas las transacciones del periodo
 * Acceso: Dueños y Gerentes
 */
export async function exportarTransaccionesController(
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

    let sucursalId = obtenerSucursalId(req);

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

    const periodo = (req.query.periodo as PeriodoEstadisticas) || 'todo';

    if (!PERIODOS_VALIDOS.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${PERIODOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    // Leer filtros activos del query string
    const busqueda = req.query.busqueda as string | undefined;
    const operadorId = req.query.operadorId as string | undefined;
    const estado = req.query.estado as string | undefined;

    // Obtener TODAS las transacciones del periodo con filtros activos
    const resultado = await obtenerHistorialTransacciones(
      negocioId,
      sucursalId,
      periodo,
      10000, // Máximo razonable para exportación
      0,
      busqueda,
      operadorId,
      estado
    );

    if (!resultado.success || !resultado.data) {
      res.status(resultado.code || 500).json(resultado);
      return;
    }

    // ─── Generar Excel con ExcelJS ───
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AnunciaYA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Transacciones', {
      views: [{ state: 'frozen', ySplit: 1 }], // Header fijo al hacer scroll
    });

    // Columnas (solo definir anchos, headers se agregan manualmente)
    const COLUMNAS = [
      { key: 'cliente',       width: 34 },
      { key: 'telefono',      width: 20 },
      { key: 'concepto',      width: 24 },
      { key: 'monto',         width: 14 },
      { key: 'puntos',        width: 10 },
      { key: 'multiplicador', width: 14 },
      { key: 'estado',        width: 12 },
      { key: 'atendio',       width: 26 },
      { key: 'sucursal',      width: 18 },
      { key: 'fecha',         width: 22 },
    ];

    const HEADERS = ['Cliente', 'Teléfono', 'Concepto', 'Monto', 'Puntos', 'Multiplicador', 'Estado', 'Atendió', 'Sucursal', 'Fecha'];
    const TOTAL_COLS = COLUMNAS.length; // 10

    // Asignar anchos a columnas
    COLUMNAS.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width;
      sheet.getColumn(i + 1).key = col.key;
    });

    // ─── FILA 1: Header ───
    const headerRow = sheet.getRow(1);
    headerRow.height = 32;
    HEADERS.forEach((texto, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = texto;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF6366F1' } },
      };
    });

    // ─── FILAS DE DATOS ───
    resultado.data.historial.forEach((t, index) => {
      const fecha = t.createdAt
        ? new Date(t.createdAt).toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
          })
        : '';

      const esRevocada = t.estado === 'cancelado';
      const esPar = index % 2 === 0;

      const row = sheet.addRow({
        cliente: t.clienteNombre || '',
        telefono: t.clienteTelefono || '',
        concepto: t.concepto || '',
        monto: Number(t.montoCompra),
        puntos: t.puntosOtorgados,
        multiplicador: Number(t.multiplicadorAplicado),
        estado: t.estado === 'confirmado' ? '✓ Válida' : t.estado === 'cancelado' ? '✗ Revocada' : t.estado,
        atendio: t.empleadoNombre || '',
        sucursal: t.sucursalNombre || '',
        fecha,
      });

      row.height = 26;

      // Estilos por celda (solo las columnas con datos)
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cell = row.getCell(c);

        // Font base
        cell.font = { size: 11, name: 'Calibri', color: { argb: 'FF334155' } }; // slate-700

        // Fondo alterno
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: esPar ? 'FFFFFFFF' : 'FFF1F5F9' }, // blanco / slate-100
        };

        // Alineación general
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        // Borde inferior sutil
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, // slate-300
        };
      }

      // ─── Estilos especiales por columna ───

      // Cliente: bold, más oscuro
      const cCliente = row.getCell('cliente');
      cCliente.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF0F172A' } }; // slate-900

      // Monto: bold, verde
      const cMonto = row.getCell('monto');
      cMonto.font = {
        bold: true, size: 11, name: 'Calibri',
        color: { argb: esRevocada ? 'FF94A3B8' : 'FF059669' }, // slate-400 o emerald-600
      };

      // Puntos: bold, amber
      const cPuntos = row.getCell('puntos');
      cPuntos.font = {
        bold: true, size: 11, name: 'Calibri',
        color: { argb: esRevocada ? 'FF94A3B8' : 'FFD97706' }, // slate-400 o amber-600
      };

      // Estado: bold con color
      const cEstado = row.getCell('estado');
      const estadoTexto = cEstado.value?.toString() || '';
      if (estadoTexto.includes('Revocada')) {
        cEstado.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFDC2626' } };
        cEstado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }; // red-50
      } else if (estadoTexto.includes('Válida')) {
        cEstado.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF16A34A' } };
        cEstado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // green-50
      }

      // Fecha: color más suave
      const cFecha = row.getCell('fecha');
      cFecha.font = { size: 10, name: 'Calibri', color: { argb: 'FF64748B' } }; // slate-500

      // Si revocada: toda la fila más tenue
      if (esRevocada) {
        for (let c = 1; c <= TOTAL_COLS; c++) {
          const cell = row.getCell(c);
          if (c !== 7) { // No sobreescribir estado
            cell.font = { ...cell.font, color: { argb: 'FF94A3B8' } }; // slate-400
          }
        }
      }
    });

    // Formatos numéricos
    sheet.getColumn('telefono').numFmt = '@';
    sheet.getColumn('monto').numFmt = '$#,##0.00';
    sheet.getColumn('puntos').numFmt = '#,##0';
    sheet.getColumn('multiplicador').numFmt = '0.0';

    // Enviar como archivo descargable
    const nombreArchivo = `transacciones_${periodo}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error en exportarTransaccionesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar transacciones',
    });
  }
}

// =============================================================================
// 5. OBTENER OPERADORES (dropdown filtro)
// =============================================================================

/**
 * GET /api/transacciones/operadores
 * Obtiene lista de operadores que han registrado ventas.
 * Para el dropdown de filtro en Transacciones BS.
 */
export async function obtenerOperadoresController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    let sucursalId = obtenerSucursalId(req);
    if (esGerente(req)) {
      sucursalId = req.usuario?.sucursalAsignada || undefined;
    }

    const resultado = await obtenerOperadoresTransacciones(negocioId, sucursalId);
    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerOperadoresController:', error);
    res.status(500).json({ success: false, message: 'Error al obtener operadores' });
  }
}

// =============================================================================
// TAB CANJES - KPIs
// =============================================================================

/**
 * GET /api/transacciones/canjes/kpis?periodo=semana
 * Obtiene 4 KPIs: pendientes, usados, vencidos, total canjes
 * Acceso: Dueños y Gerentes
 */
export async function obtenerKPIsCanjesController(
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

    // Obtener sucursal del contexto
    let sucursalId = obtenerSucursalId(req);

    // GERENTES: Forzar filtro por su sucursal asignada
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
    if (!PERIODOS_VALIDOS.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${PERIODOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    const resultado = await obtenerKPIsCanjes(negocioId, sucursalId, periodo);
    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerKPIsCanjesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener KPIs de canjes',
    });
  }
}

// =============================================================================
// TAB CANJES - HISTORIAL
// =============================================================================

/**
 * GET /api/transacciones/canjes?periodo=semana&limit=20&offset=0&estado=pendiente
 * Obtiene historial de canjes (vouchers) con filtros
 * Acceso: Dueños y Gerentes (gerentes ven solo su sucursal para usados/vencidos)
 */
export async function obtenerHistorialCanjesController(
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

    // Obtener sucursal del contexto
    let sucursalId = obtenerSucursalId(req);

    // GERENTES: Forzar filtro por su sucursal asignada
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

    // Obtener parámetros de paginación
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Obtener periodo del query param
    const periodo = (req.query.periodo as PeriodoEstadisticas) || 'todo';

    // Obtener filtro de estado
    const estado = (req.query.estado as string)?.trim() || undefined;

    // Obtener búsqueda del query param
    const busqueda = (req.query.busqueda as string)?.trim() || undefined;

    // Validar periodo
    if (!PERIODOS_VALIDOS.includes(periodo)) {
      res.status(400).json({
        success: false,
        message: `Periodo inválido. Valores permitidos: ${PERIODOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    // Validar límites
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100',
      });
      return;
    }

    const resultado = await obtenerHistorialCanjes(
      negocioId,
      sucursalId,
      periodo,
      limit,
      offset,
      estado,
      busqueda
    );

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerHistorialCanjesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de canjes',
    });
  }
}