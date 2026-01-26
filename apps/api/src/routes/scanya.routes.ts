/**
 * scanya.routes.ts
 * =================
 * Rutas de ScanYA (autenticación, turnos, puntos, etc.)
 * 
 * Ubicación: apps/api/src/routes/scanya.routes.ts
 */

import { Router } from 'express';
import {
  loginDuenoController,
  loginEmpleadoController,
  refreshScanYAController,
  yoScanYAController,
  logoutScanYAController,
  abrirTurnoController,
  obtenerTurnoActualController,
  cerrarTurnoController,
  identificarClienteController,
  validarCuponController,
  otorgarPuntosController,
  historialController,
  validarVoucherController,
  vouchersPendientesController,
  obtenerVouchersController,
  buscarClienteConVouchersController,
  crearRecordatorioController,
  obtenerRecordatoriosController,
  descartarRecordatorioController,
  obtenerConfigScanYAController,
  actualizarConfigScanYAController,
  uploadTicketController,
  contadoresController,
} from '../controllers/scanya.controller.js';
import { verificarTokenScanYA } from '../middleware/scanyaAuth.middleware.js';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// =============================================================================

// POST /api/scanya/login-dueno - Login del dueño del negocio
router.post('/login-dueno', loginDuenoController);

// POST /api/scanya/login-empleado - Login de empleado (Nick + PIN)
router.post('/login-empleado', loginEmpleadoController);

// POST /api/scanya/refresh - Renovar tokens de ScanYA
router.post('/refresh', refreshScanYAController);

// =============================================================================
// RUTAS PROTEGIDAS (requieren token de ScanYA)
// =============================================================================

// GET /api/scanya/yo - Obtener usuario actual
router.get('/yo', verificarTokenScanYA, yoScanYAController);

// POST /api/scanya/logout - Cerrar sesión
router.post('/logout', verificarTokenScanYA, logoutScanYAController);

// =============================================================================
// RUTAS DE TURNOS (Fase 4) ✅ IMPLEMENTADO
// =============================================================================

// POST /api/scanya/turno/abrir - Abrir un nuevo turno
router.post('/turno/abrir', verificarTokenScanYA, abrirTurnoController);

// GET /api/scanya/turno/actual - Obtener turno activo
router.get('/turno/actual', verificarTokenScanYA, obtenerTurnoActualController);

// POST /api/scanya/turno/cerrar - Cerrar turno activo
router.post('/turno/cerrar', verificarTokenScanYA, cerrarTurnoController);

// =============================================================================
// RUTAS DE PUNTOS (Fase 5) ✅ IMPLEMENTADO
// =============================================================================

// POST /api/scanya/identificar-cliente - Buscar cliente por teléfono
router.post('/identificar-cliente', verificarTokenScanYA, identificarClienteController);

// POST /api/scanya/validar-cupon - Verificar cupón antes de aplicar
router.post('/validar-cupon', verificarTokenScanYA, validarCuponController);

// POST /api/scanya/otorgar-puntos - Registrar venta y dar puntos
router.post('/otorgar-puntos', verificarTokenScanYA, otorgarPuntosController);

// GET /api/scanya/historial - Ver transacciones del turno actual
router.get('/historial', verificarTokenScanYA, historialController);

// POST /api/scanya/validar-voucher - Validar voucher de recompensa
router.post('/validar-voucher', verificarTokenScanYA, validarVoucherController);

// GET /api/scanya/vouchers-pendientes - Listar vouchers pendientes
router.get('/vouchers-pendientes', verificarTokenScanYA, vouchersPendientesController);

// GET /api/scanya/vouchers - Obtener vouchers con filtros (gestión completa)
router.get('/vouchers', verificarTokenScanYA, obtenerVouchersController);

// POST /api/scanya/buscar-cliente-vouchers - Buscar cliente con sus vouchers (para canje)
router.post('/buscar-cliente-vouchers', verificarTokenScanYA, buscarClienteConVouchersController);

// =============================================================================
// RUTAS DE RECORDATORIOS (Fase 6) ✅ IMPLEMENTADO
// =============================================================================

// POST /api/scanya/recordatorio - Crear recordatorio de venta offline
router.post('/recordatorio', verificarTokenScanYA, crearRecordatorioController);

// GET /api/scanya/recordatorios - Listar recordatorios pendientes
router.get('/recordatorios', verificarTokenScanYA, obtenerRecordatoriosController);

// PUT /api/scanya/recordatorio/:id/descartar - Marcar como descartado
router.put('/recordatorio/:id/descartar', verificarTokenScanYA, descartarRecordatorioController);

// =============================================================================
// RUTAS DE CONFIGURACIÓN (Fase 7) ✅ IMPLEMENTADO
// =============================================================================

// GET /api/scanya/configuracion - Obtener configuración de ScanYA
router.get('/configuracion', verificarTokenScanYA, obtenerConfigScanYAController);

// PUT /api/scanya/configuracion - Actualizar configuración de ScanYA (solo dueño)
router.put('/configuracion', verificarTokenScanYA, actualizarConfigScanYAController);

// =============================================================================
// RUTAS DE R2 / UPLOAD (Fase 9) ✅ NUEVO
// =============================================================================

// POST /api/scanya/upload-ticket - Generar URL pre-firmada para subir foto
router.post('/upload-ticket', verificarTokenScanYA, uploadTicketController);

// =============================================================================
// RUTAS DE CONTADORES (Fase 9) ✅ NUEVO
// =============================================================================

// GET /api/scanya/contadores - Obtener contadores para dashboard
router.get('/contadores', verificarTokenScanYA, contadoresController);


export default router;