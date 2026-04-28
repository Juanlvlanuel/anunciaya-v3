/**
 * clientes.controller.ts
 * =========================
 * Controllers para el módulo de Clientes (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/controllers/clientes.controller.ts
 * 
 * ENDPOINTS:
 * GET    /api/clientes/top                     - Top clientes con puntos
 * GET    /api/clientes/kpis                    - KPIs para página Clientes BS
 * GET    /api/clientes                         - Lista de clientes con filtros
 * GET    /api/clientes/:id                     - Detalle completo de un cliente
 * GET    /api/clientes/:id/historial           - Historial de transacciones de un cliente
 * 
 * NOTA: Consume funciones de puntos.service.ts y clientes.service.ts
 */

import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import {
  obtenerTopClientes,
} from '../services/puntos.service.js';
import {
  obtenerKPIsClientes,
  obtenerClientes,
  obtenerDetalleCliente,
  obtenerHistorialCliente,
  obtenerClientesParaExportar,
} from '../services/clientes.service.js';

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
 * Verifica si el usuario es gerente
 * REGLA: Si sucursalAsignada tiene valor → es gerente
 */
function esGerente(req: Request): boolean {
  const usuario = req.usuario;
  return !!usuario?.sucursalAsignada;
}

// =============================================================================
// 1. OBTENER TOP CLIENTES CON PUNTOS
// =============================================================================

/**
 * GET /api/clientes/top?limit=10
 * Obtiene los clientes con más puntos disponibles
 * Acceso: Dueños y Gerentes (gerentes ven solo su sucursal)
 */
export async function obtenerTopClientesController(
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

    // Obtener límite del query param
    const limit = parseInt(req.query.limit as string) || 10;

    // Validar límite
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100',
      });
      return;
    }

    const resultado = await obtenerTopClientes(negocioId, sucursalId, limit);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerTopClientesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top clientes',
    });
  }
}

// =============================================================================
// 2. OBTENER KPIs CLIENTES (Página Clientes BS)
// =============================================================================

/**
 * GET /api/clientes/kpis
 * Obtiene 4 KPIs: total clientes, distribución nivel, nuevos mes, inactivos
 * Acceso: Dueños y Gerentes
 */
export async function obtenerKPIsClientesController(
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

    const resultado = await obtenerKPIsClientes(negocioId, sucursalId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerKPIsClientesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener KPIs de clientes',
    });
  }
}

// =============================================================================
// 3. OBTENER LISTA DE CLIENTES (Página Clientes BS)
// =============================================================================

/**
 * GET /api/clientes?busqueda=xxx&nivel=oro&limit=20&offset=0
 * Lista clientes con filtros y paginación
 * Acceso: Dueños y Gerentes
 */
export async function obtenerClientesController(
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

    // Parámetros de filtro
    const busqueda = req.query.busqueda as string | undefined;
    const nivel = req.query.nivel as 'bronce' | 'plata' | 'oro' | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Validar nivel
    if (nivel && !['bronce', 'plata', 'oro'].includes(nivel)) {
      res.status(400).json({
        success: false,
        message: 'Nivel inválido. Valores permitidos: bronce, plata, oro',
      });
      return;
    }

    const resultado = await obtenerClientes(negocioId, {
      sucursalId,
      busqueda,
      nivel,
      limit,
      offset,
    });

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerClientesController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
    });
  }
}

// =============================================================================
// 4. OBTENER DETALLE DE UN CLIENTE (Modal Clientes BS)
// =============================================================================

/**
 * GET /api/clientes/:id
 * Detalle completo: puntos, vouchers, estadísticas, datos personales
 * Acceso: Dueños y Gerentes
 */
export async function obtenerDetalleClienteController(
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

    const clienteId = req.params.id;

    if (!clienteId) {
      res.status(400).json({
        success: false,
        message: 'ID de cliente requerido',
      });
      return;
    }

    // sucursalId llega por el interceptor Axios (automático en modo comercial).
    // El service filtra visitas/gastado por sucursal si viene — alinea el modal
    // con la tabla de Clientes (ambas respetan la sucursal activa).
    const sucursalId = typeof req.query.sucursalId === 'string' ? req.query.sucursalId : undefined;

    const resultado = await obtenerDetalleCliente(negocioId, clienteId, sucursalId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerDetalleClienteController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del cliente',
    });
  }
}

// =============================================================================
// 5. OBTENER HISTORIAL DE UN CLIENTE (Modal Clientes BS)
// =============================================================================

/**
 * GET /api/clientes/:id/historial?limit=20&offset=0
 * Transacciones de un cliente específico
 * Acceso: Dueños y Gerentes
 */
export async function obtenerHistorialClienteController(
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

    const clienteId = req.params.id;

    if (!clienteId) {
      res.status(400).json({
        success: false,
        message: 'ID de cliente requerido',
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // sucursalId viene del interceptor Axios (dueños) o del token (gerentes)
    let sucursalId = obtenerSucursalId(req);
    if (esGerente(req)) {
      sucursalId = req.usuario?.sucursalAsignada || undefined;
    }

    const resultado = await obtenerHistorialCliente(negocioId, clienteId, limit, offset, sucursalId);

    res.status(resultado.code || 200).json(resultado);
  } catch (error) {
    console.error('Error en obtenerHistorialClienteController:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial del cliente',
    });
  }
}

// =============================================================================
// 6. EXPORTAR CLIENTES A EXCEL
// =============================================================================

/**
 * GET /api/clientes/exportar?busqueda=xxx&nivel=oro
 * Genera y descarga un archivo Excel con los clientes filtrados.
 * Acceso: Dueños y Gerentes
 */
export async function exportarClientesController(
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
      if (!sucursalId) {
        res.status(403).json({ success: false, message: 'Gerente debe tener sucursal asignada' });
        return;
      }
    }

    const busqueda = req.query.busqueda as string | undefined;
    const nivel = req.query.nivel as 'bronce' | 'plata' | 'oro' | undefined;

    if (nivel && !['bronce', 'plata', 'oro'].includes(nivel)) {
      res.status(400).json({ success: false, message: 'Nivel inválido. Valores permitidos: bronce, plata, oro' });
      return;
    }

    const resultado = await obtenerClientesParaExportar(negocioId, { sucursalId, busqueda, nivel });

    if (!resultado.success || !resultado.data) {
      res.status(resultado.code || 500).json(resultado);
      return;
    }

    // ─── Generar Excel con ExcelJS ───
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AnunciaYA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Clientes', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const COLUMNAS = [
      { key: 'cliente',           width: 34 },
      { key: 'telefono',          width: 18 },
      { key: 'correo',            width: 30 },
      { key: 'nivel',             width: 12 },
      { key: 'puntosDisponibles', width: 16 },
      { key: 'puntosAcumulados',  width: 18 },
      { key: 'puntosCanjeados',   width: 17 },
      { key: 'totalGastado',      width: 16 },
      { key: 'visitas',           width: 10 },
      { key: 'ultimaActividad',   width: 22 },
    ];

    const HEADERS = [
      'Cliente', 'Teléfono', 'Correo', 'Nivel',
      'Puntos Disp.', 'Pts. Acumulados', 'Pts. Canjeados',
      'Total Gastado', 'Visitas', 'Últ. Actividad',
    ];
    const TOTAL_COLS = COLUMNAS.length;

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
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF6366F1' } } };
    });

    // ─── FILAS DE DATOS ───
    resultado.data.forEach((c, index) => {
      const fechaActividad = c.ultimaActividad
        ? new Date(c.ultimaActividad).toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
          })
        : '';

      const nivelTexto =
        c.nivelActual === 'oro' ? '★ Oro' :
        c.nivelActual === 'plata' ? '◆ Plata' : '● Bronce';

      const esPar = index % 2 === 0;

      const row = sheet.addRow({
        cliente: c.nombre,
        telefono: c.telefono || '',
        correo: c.correo || '',
        nivel: nivelTexto,
        puntosDisponibles: c.puntosDisponibles,
        puntosAcumulados: c.puntosAcumuladosTotal,
        puntosCanjeados: c.puntosCanjeadosTotal,
        totalGastado: c.totalGastado,
        visitas: c.totalVisitas,
        ultimaActividad: fechaActividad,
      });

      row.height = 26;

      for (let col = 1; col <= TOTAL_COLS; col++) {
        const cell = row.getCell(col);
        cell.font = { size: 11, name: 'Calibri', color: { argb: 'FF334155' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: esPar ? 'FFFFFFFF' : 'FFF1F5F9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      }

      // ─── Estilos especiales por columna ───

      // Cliente: bold, slate-900
      const cCliente = row.getCell('cliente');
      cCliente.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF0F172A' } };

      // Correo: slate-600
      const cCorreo = row.getCell('correo');
      cCorreo.font = { size: 11, name: 'Calibri', color: { argb: 'FF475569' } };

      // Nivel: bold + fill + color por nivel
      const cNivel = row.getCell('nivel');
      if (c.nivelActual === 'oro') {
        cNivel.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFD97706' } };
        cNivel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
      } else if (c.nivelActual === 'plata') {
        cNivel.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF64748B' } };
        cNivel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      } else {
        cNivel.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF92400E' } };
        cNivel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      }

      // Puntos disponibles: bold, amber-600
      const cPtosDisp = row.getCell('puntosDisponibles');
      cPtosDisp.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFD97706' } };

      // Puntos acumulados: bold, amber-800
      const cPtosAcum = row.getCell('puntosAcumulados');
      cPtosAcum.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF92400E' } };

      // Puntos canjeados: bold, violet-600
      const cPtosCanj = row.getCell('puntosCanjeados');
      cPtosCanj.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF7C3AED' } };

      // Total gastado: bold, emerald-600
      const cGastado = row.getCell('totalGastado');
      cGastado.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF059669' } };

      // Última actividad: size 10, slate-500
      const cActividad = row.getCell('ultimaActividad');
      cActividad.font = { size: 10, name: 'Calibri', color: { argb: 'FF64748B' } };
    });

    // Formatos numéricos
    sheet.getColumn('telefono').numFmt = '@';
    sheet.getColumn('puntosDisponibles').numFmt = '#,##0';
    sheet.getColumn('puntosAcumulados').numFmt = '#,##0';
    sheet.getColumn('puntosCanjeados').numFmt = '#,##0';
    sheet.getColumn('visitas').numFmt = '#,##0';
    sheet.getColumn('totalGastado').numFmt = '$#,##0.00';

    const nombreArchivo = `clientes_${nivel || 'todos'}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error en exportarClientesController:', error);
    res.status(500).json({ success: false, message: 'Error al exportar clientes' });
  }
}