/**
 * reportes.controller.ts
 * =======================
 * Controllers para el módulo de Reportes en Business Studio.
 *
 * ENDPOINTS:
 * GET /api/business/reportes?tab=ventas&periodo=mes     - Obtener datos del reporte
 * GET /api/business/reportes/exportar?tab=ventas&periodo=mes - Exportar reporte a XLSX
 *
 * Ubicación: apps/api/src/controllers/reportes.controller.ts
 */

import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import {
  obtenerReporteVentas,
  obtenerReporteClientes,
  obtenerReporteEmpleados,
  obtenerReportePromociones,
  obtenerReporteResenas,
  obtenerClientesInactivos,
} from '../services/reportes.service.js';
import type { PeriodoEstadisticas, RespuestaServicio } from '../types/puntos.types.js';

// =============================================================================
// HELPERS
// =============================================================================

function obtenerNegocioId(req: Request): string | null {
  return req.negocioId || null;
}

function obtenerSucursalId(req: Request): string | undefined {
  const querySucursal = req.query.sucursalId as string;
  if (querySucursal) return querySucursal;
  if (req.usuario?.sucursalAsignada) return req.usuario.sucursalAsignada;
  return undefined;
}

type TabReporte = 'ventas' | 'clientes' | 'empleados' | 'promociones' | 'resenas';

const TABS_VALIDOS: TabReporte[] = ['ventas', 'clientes', 'empleados', 'promociones', 'resenas'];

// =============================================================================
// GET /api/business/reportes?tab=ventas&periodo=mes
// =============================================================================

export async function obtenerReporteController(req: Request, res: Response): Promise<void> {
  const negocioId = obtenerNegocioId(req);
  if (!negocioId) {
    res.status(401).json({ success: false, message: 'No autenticado' });
    return;
  }

  const tab = (req.query.tab as string) || 'ventas';
  if (!TABS_VALIDOS.includes(tab as TabReporte)) {
    res.status(400).json({ success: false, message: `Tab inválido. Opciones: ${TABS_VALIDOS.join(', ')}` });
    return;
  }

  const sucursalId = obtenerSucursalId(req);
  const periodo = (req.query.periodo as PeriodoEstadisticas) || 'mes';
  const fechaInicio = req.query.fechaInicio as string | undefined;
  const fechaFin = req.query.fechaFin as string | undefined;

  let resultado: RespuestaServicio<unknown>;

  switch (tab) {
    case 'ventas':
      resultado = await obtenerReporteVentas(negocioId, sucursalId, periodo, fechaInicio, fechaFin);
      break;
    case 'clientes':
      resultado = await obtenerReporteClientes(negocioId, sucursalId, periodo, fechaInicio, fechaFin);
      break;
    case 'empleados':
      resultado = await obtenerReporteEmpleados(negocioId, sucursalId, periodo, fechaInicio, fechaFin);
      break;
    case 'promociones':
      resultado = await obtenerReportePromociones(negocioId, sucursalId, periodo, fechaInicio, fechaFin);
      break;
    case 'resenas':
      resultado = await obtenerReporteResenas(negocioId, sucursalId, periodo, fechaInicio, fechaFin);
      break;
    default:
      res.status(400).json({ success: false, message: 'Tab no reconocido' });
      return;
  }

  res.status(resultado.success ? 200 : 500).json(resultado);
}

// =============================================================================
// GET /api/business/reportes/exportar?tab=ventas&periodo=mes
// =============================================================================

export async function exportarReporteController(req: Request, res: Response): Promise<void> {
  const negocioId = obtenerNegocioId(req);
  if (!negocioId) {
    res.status(401).json({ success: false, message: 'No autenticado' });
    return;
  }

  const tab = (req.query.tab as string) || 'ventas';
  if (!TABS_VALIDOS.includes(tab as TabReporte)) {
    res.status(400).json({ success: false, message: `Tab inválido` });
    return;
  }

  const sucursalId = obtenerSucursalId(req);
  const periodo = (req.query.periodo as PeriodoEstadisticas) || 'mes';
  const fechaInicioExp = req.query.fechaInicio as string | undefined;
  const fechaFinExp = req.query.fechaFin as string | undefined;

  // Obtener datos del reporte
  let resultado: RespuestaServicio<unknown>;
  switch (tab) {
    case 'ventas':
      resultado = await obtenerReporteVentas(negocioId, sucursalId, periodo, fechaInicioExp, fechaFinExp);
      break;
    case 'clientes':
      resultado = await obtenerReporteClientes(negocioId, sucursalId, periodo, fechaInicioExp, fechaFinExp);
      break;
    case 'empleados':
      resultado = await obtenerReporteEmpleados(negocioId, sucursalId, periodo, fechaInicioExp, fechaFinExp);
      break;
    case 'promociones':
      resultado = await obtenerReportePromociones(negocioId, sucursalId, periodo, fechaInicioExp, fechaFinExp);
      break;
    case 'resenas':
      resultado = await obtenerReporteResenas(negocioId, sucursalId, periodo, fechaInicioExp, fechaFinExp);
      break;
    default:
      res.status(400).json({ success: false, message: 'Tab no reconocido' });
      return;
  }

  if (!resultado.success || !resultado.data) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AnunciaYA';
    workbook.created = new Date();

    const nombreTab = tab.charAt(0).toUpperCase() + tab.slice(1);
    const sheet = workbook.addWorksheet(`Reporte ${nombreTab}`, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Estilos de header
    const estiloHeader = (cell: ExcelJS.Cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF6366F1' } } };
    };

    // Generar contenido según tab
    generarContenidoExcel(sheet, tab as TabReporte, resultado.data as unknown as Record<string, unknown>, estiloHeader);

    const nombreArchivo = `reporte_${tab}_${periodo}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportando reporte:', error);
    res.status(500).json({ success: false, message: 'Error generando archivo Excel' });
  }
}

// =============================================================================
// GET /api/business/reportes/clientes-inactivos?tipo=riesgo|inactivos
// =============================================================================

export async function obtenerClientesInactivosController(req: Request, res: Response): Promise<void> {
  const negocioId = obtenerNegocioId(req);
  if (!negocioId) {
    res.status(401).json({ success: false, message: 'No autenticado' });
    return;
  }

  const tipo = req.query.tipo as string;
  if (tipo !== 'riesgo' && tipo !== 'inactivos') {
    res.status(400).json({ success: false, message: 'Tipo inválido. Opciones: riesgo, inactivos' });
    return;
  }

  const resultado = await obtenerClientesInactivos(negocioId, tipo);
  res.status(resultado.success ? 200 : 500).json(resultado);
}

// =============================================================================
// HELPER: Generar contenido Excel según tab
// =============================================================================

function generarContenidoExcel(
  sheet: ExcelJS.Worksheet,
  tab: TabReporte,
  data: Record<string, unknown>,
  estiloHeader: (cell: ExcelJS.Cell) => void
): void {
  switch (tab) {
    case 'ventas':
      generarExcelVentas(sheet, data, estiloHeader);
      break;
    case 'clientes':
      generarExcelClientes(sheet, data, estiloHeader);
      break;
    case 'empleados':
      generarExcelEmpleados(sheet, data, estiloHeader);
      break;
    case 'promociones':
      generarExcelPromociones(sheet, data, estiloHeader);
      break;
    case 'resenas':
      generarExcelResenas(sheet, data, estiloHeader);
      break;
  }
}

function agregarHeaders(sheet: ExcelJS.Worksheet, headers: string[], estiloHeader: (cell: ExcelJS.Cell) => void) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 32;
  headers.forEach((texto, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = texto;
    estiloHeader(cell);
  });
}

// ── Ventas ──────────────────────────────────────────────────────────────────

function generarExcelVentas(sheet: ExcelJS.Worksheet, data: Record<string, unknown>, estiloHeader: (cell: ExcelJS.Cell) => void) {
  const ventas = data as { horariosPico: { hora: number; totalVentas: number; cantidad: number }[]; ventasPorDia: { nombre: string; totalVentas: number; cantidad: number }[]; metodosPago: { efectivo: number; tarjeta: number; transferencia: number; sinEspecificar: number } };

  sheet.columns = [
    { key: 'seccion', width: 20 },
    { key: 'detalle', width: 25 },
    { key: 'ventas', width: 18 },
    { key: 'cantidad', width: 14 },
  ];

  agregarHeaders(sheet, ['Sección', 'Detalle', 'Ventas ($)', 'Cantidad'], estiloHeader);

  // Horarios pico
  for (const h of ventas.horariosPico) {
    sheet.addRow({ seccion: 'Horario Pico', detalle: `${h.hora}:00 hrs`, ventas: h.totalVentas, cantidad: h.cantidad });
  }
  // Ventas por día
  for (const d of ventas.ventasPorDia) {
    sheet.addRow({ seccion: 'Día de Semana', detalle: d.nombre, ventas: d.totalVentas, cantidad: d.cantidad });
  }
  // Métodos de pago
  sheet.addRow({ seccion: 'Método Pago', detalle: 'Efectivo', ventas: ventas.metodosPago.efectivo, cantidad: '' });
  sheet.addRow({ seccion: 'Método Pago', detalle: 'Tarjeta', ventas: ventas.metodosPago.tarjeta, cantidad: '' });
  sheet.addRow({ seccion: 'Método Pago', detalle: 'Transferencia', ventas: ventas.metodosPago.transferencia, cantidad: '' });
  if (ventas.metodosPago.sinEspecificar > 0) {
    sheet.addRow({ seccion: 'Método Pago', detalle: 'Sin especificar', ventas: ventas.metodosPago.sinEspecificar, cantidad: '' });
  }

  sheet.getColumn('ventas').numFmt = '$#,##0.00';
}

// ── Clientes ────────────────────────────────────────────────────────────────

function generarExcelClientes(sheet: ExcelJS.Worksheet, data: Record<string, unknown>, estiloHeader: (cell: ExcelJS.Cell) => void) {
  const clientes = data as { topPorGasto: { nombre: string; apellidos: string; valor: number }[]; topPorFrecuencia: { nombre: string; apellidos: string; valor: number }[] };

  sheet.columns = [
    { key: 'seccion', width: 22 },
    { key: 'cliente', width: 35 },
    { key: 'valor', width: 18 },
  ];

  agregarHeaders(sheet, ['Sección', 'Cliente', 'Valor'], estiloHeader);

  for (const c of clientes.topPorGasto) {
    sheet.addRow({ seccion: 'Top por Gasto', cliente: `${c.nombre} ${c.apellidos}`, valor: c.valor });
  }
  for (const c of clientes.topPorFrecuencia) {
    sheet.addRow({ seccion: 'Top por Frecuencia', cliente: `${c.nombre} ${c.apellidos}`, valor: c.valor });
  }
}

// ── Empleados ───────────────────────────────────────────────────────────────

function generarExcelEmpleados(sheet: ExcelJS.Worksheet, data: Record<string, unknown>, estiloHeader: (cell: ExcelJS.Cell) => void) {
  const reporteEmpleados = data as { empleados: { nombre: string; totalTransacciones: number; montoTotal: number; ticketPromedio: number; alertas: number }[] };

  sheet.columns = [
    { key: 'nombre', width: 25 },
    { key: 'transacciones', width: 16 },
    { key: 'montoTotal', width: 18 },
    { key: 'ticketPromedio', width: 18 },
    { key: 'alertas', width: 12 },
  ];

  agregarHeaders(sheet, ['Empleado', 'Transacciones', 'Monto Total', 'Ticket Prom.', 'Alertas'], estiloHeader);

  for (const e of reporteEmpleados.empleados) {
    sheet.addRow({
      nombre: e.nombre,
      transacciones: e.totalTransacciones,
      montoTotal: e.montoTotal,
      ticketPromedio: e.ticketPromedio,
      alertas: e.alertas,
    });
  }

  sheet.getColumn('montoTotal').numFmt = '$#,##0.00';
  sheet.getColumn('ticketPromedio').numFmt = '$#,##0.00';
}

// ── Promociones ─────────────────────────────────────────────────────────────

function generarExcelPromociones(sheet: ExcelJS.Worksheet, data: Record<string, unknown>, estiloHeader: (cell: ExcelJS.Cell) => void) {
  const promo = data as {
    funnelOfertas: { activas: number; vistas: number; clicks: number; shares: number; canjes: number; expiradas: number };
    funnelCupones: { emitidos: number; canjeados: number; expirados: number; activos: number };
    funnelVouchers: { generados: number; canjeados: number; expirados: number; pendientes: number };
  };

  sheet.columns = [
    { key: 'seccion', width: 22 },
    { key: 'metrica', width: 22 },
    { key: 'valor', width: 14 },
  ];

  agregarHeaders(sheet, ['Sección', 'Métrica', 'Valor'], estiloHeader);

  sheet.addRow({ seccion: 'Ofertas', metrica: 'Activas', valor: promo.funnelOfertas.activas });
  sheet.addRow({ seccion: 'Ofertas', metrica: 'Vistas', valor: promo.funnelOfertas.vistas });
  sheet.addRow({ seccion: 'Ofertas', metrica: 'Clicks', valor: promo.funnelOfertas.clicks });
  sheet.addRow({ seccion: 'Ofertas', metrica: 'Shares', valor: promo.funnelOfertas.shares });
  sheet.addRow({ seccion: 'Ofertas', metrica: 'Canjes', valor: promo.funnelOfertas.canjes });
  sheet.addRow({ seccion: 'Ofertas', metrica: 'Expiradas', valor: promo.funnelOfertas.expiradas });

  sheet.addRow({ seccion: 'Cupones', metrica: 'Emitidos', valor: promo.funnelCupones.emitidos });
  sheet.addRow({ seccion: 'Cupones', metrica: 'Canjeados', valor: promo.funnelCupones.canjeados });
  sheet.addRow({ seccion: 'Cupones', metrica: 'Expirados', valor: promo.funnelCupones.expirados });
  sheet.addRow({ seccion: 'Cupones', metrica: 'Activos', valor: promo.funnelCupones.activos });

  sheet.addRow({ seccion: 'Vouchers', metrica: 'Generados', valor: promo.funnelVouchers.generados });
  sheet.addRow({ seccion: 'Vouchers', metrica: 'Canjeados', valor: promo.funnelVouchers.canjeados });
  sheet.addRow({ seccion: 'Vouchers', metrica: 'Expirados', valor: promo.funnelVouchers.expirados });
  sheet.addRow({ seccion: 'Vouchers', metrica: 'Pendientes', valor: promo.funnelVouchers.pendientes });
}

// ── Reseñas ─────────────────────────────────────────────────────────────────

function generarExcelResenas(sheet: ExcelJS.Worksheet, data: Record<string, unknown>, estiloHeader: (cell: ExcelJS.Cell) => void) {
  const resenas = data as { distribucionEstrellas: { rating: number; cantidad: number; porcentaje: number }[]; totalResenas: number; tasaRespuesta: number; sinResponder: number; tiempoPromedioRespuestaDias: number };

  sheet.columns = [
    { key: 'metrica', width: 30 },
    { key: 'valor', width: 18 },
  ];

  agregarHeaders(sheet, ['Métrica', 'Valor'], estiloHeader);

  sheet.addRow({ metrica: 'Total Reseñas', valor: resenas.totalResenas });
  sheet.addRow({ metrica: 'Sin Responder', valor: resenas.sinResponder });
  sheet.addRow({ metrica: 'Tasa de Respuesta', valor: `${resenas.tasaRespuesta}%` });
  sheet.addRow({ metrica: 'Tiempo Prom. Respuesta (días)', valor: resenas.tiempoPromedioRespuestaDias });

  sheet.addRow({ metrica: '', valor: '' });
  sheet.addRow({ metrica: 'Distribución de Estrellas', valor: '' });

  for (const d of resenas.distribucionEstrellas) {
    sheet.addRow({ metrica: `${'★'.repeat(d.rating)}${'☆'.repeat(5 - d.rating)} (${d.rating})`, valor: `${d.cantidad} (${d.porcentaje}%)` });
  }
}
