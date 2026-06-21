/**
 * routes/admin/index.ts
 * ======================
 * Agregador de todas las rutas del Panel Admin.
 *
 * Aplica el gate `requierePanel(['superadmin'])` de forma global a todo
 * `/api/admin/*`. Es un gate DUAL durante la transición: acepta el header
 * x-admin-secret (legacy, p.ej. reconcile R2) O un JWT con rol_equipo de equipo
 * revalidado en BD. Reemplaza a requireAdminSecret sin tocar sub-routers ni
 * controllers. El x-admin-secret se retirará cuando todo migre al rol.
 *
 * Cuando se agregue una sección nueva (negocios, usuarios, reportes-globales,
 * suscripciones, etc.), se importa su router acá y se registra con su prefijo.
 *
 * Ubicación: apps/api/src/routes/admin/index.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import mantenimientoRoutes from './mantenimiento.routes.js';
import sesionRoutes from './sesion.routes.js';
import seguridadRoutes from './seguridad.routes.js';
import resumenRoutes from './resumen.routes.js';
import metricasRoutes from './metricas.routes.js';
import negociosRoutes from './negocios.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import suscripcionesRoutes from './suscripciones.routes.js';
import equipoRoutes from './equipo.routes.js';
import vendedoresRoutes from './vendedores.routes.js';
import recibosRoutes from './recibos.routes.js';
import auditoriaRoutes from './auditoria.routes.js';
import regionesRoutes from './regiones.routes.js';
import configuracionRoutes from './configuracion.routes.js';
import ciudadesRoutes from './ciudades.routes.js';

const router: Router = Router();

// ─── Identidad del Panel (los 3 roles) ──────────────────────────────────────────
// Se monta ANTES del gate global de superadmin: GET /api/admin/yo debe responder a
// superadmin/gerente/vendedor (cada uno trae su propio requierePanel en sesion.routes).
router.use('/', sesionRoutes);

// ─── 2FA del Panel (solo superadmin) ─────────────────────────────────────────────
// También ANTES del gate global: /2fa/verificar debe poder otorgar la marca sin
// quedar bloqueado por el propio candado (cada ruta trae su requierePanel propio).
router.use('/', seguridadRoutes);

// ─── Resumen / inicio (los 3 roles, alcance por rol) ─────────────────────────────
// ANTES del gate global de superadmin: el tablero de inicio lo ven los 3 roles (cada
// uno lo suyo). Cada ruta trae su propio requierePanel con los roles permitidos.
router.use('/resumen', resumenRoutes);

// ─── Métricas (los 3 roles, alcance por rol) ─────────────────────────────────────
// ANTES del gate global de superadmin: la vista de análisis la usan también gerente y vendedor
// (cada uno lo suyo). Cada ruta trae su propio requierePanel con los roles permitidos.
router.use('/metricas', metricasRoutes);

// ─── Negocios (los 3 roles, alcance por rol) ─────────────────────────────────────
// ANTES del gate global de superadmin: la sección la usan también gerente y
// vendedor; cada ruta trae su propio requierePanel con los roles permitidos.
router.use('/negocios', negociosRoutes);

// ─── Usuarios (superadmin + gerente para lectura/soporte) ────────────────────────
// ANTES del gate global de superadmin: la sección la usa también el gerente
// (soporte/rescates). La moderación (suspender/reactivar) será solo superadmin (Fase 2);
// cada ruta trae su propio requierePanel con los roles permitidos.
router.use('/usuarios', usuariosRoutes);

// ─── Suscripciones (superadmin + gerente · bitácora financiera) ──────────────────
// ANTES del gate global de superadmin: la bitácora financiera la consulta también el
// gerente (acotado a su región en el service). Cada ruta trae su propio requierePanel.
router.use('/suscripciones', suscripcionesRoutes);

// ─── Equipo y accesos (superadmin + gerente · alcance por rol) ───────────────────
// ANTES del gate global de superadmin: la sección la usa también el gerente (ve solo sus
// vendedores, alcance en el service). El vendedor no entra. Cada ruta trae su propio requierePanel.
router.use('/equipo', equipoRoutes);

// ─── Vendedores y comisiones (superadmin + gerente + vendedor · alcance por rol) ──
// ANTES del gate global de superadmin: la sección la usan los 3 roles (el vendedor solo ve su
// propia cartera; el gerente su equipo). Cada ruta trae su propio requierePanel con los roles.
router.use('/vendedores', vendedoresRoutes);

// ─── Recibos (superadmin + gerente + vendedor · alcance por rol) ─────────────────
// ANTES del gate global de superadmin: los 3 roles consultan recibos (el vendedor solo los de sus
// negocios; el gerente los de su región). Cada ruta trae su propio requierePanel.
router.use('/recibos', recibosRoutes);

// ─── Auditoría (superadmin + gerente · alcance por rol) ──────────────────────────
// ANTES del gate global de superadmin: la bitácora la consulta también el gerente (ve solo
// las acciones de su equipo, alcance en el service). El vendedor no entra. Cada ruta trae su
// propio requierePanel.
router.use('/auditoria', auditoriaRoutes);

// Gate común de toda la sección admin.
// Dual durante la transición: acepta x-admin-secret (legacy, p.ej. reconcile R2)
// O un JWT con rol_equipo='superadmin' (revalidado en BD). Reemplaza a
// requireAdminSecret sin romper Mantenimiento.
router.use(requierePanel(['superadmin']));

// ─── Sub-secciones ────────────────────────────────────────────────────────────
router.use('/mantenimiento', mantenimientoRoutes);

// Regiones para el filtro global del Panel (solo superadmin, ya cubierto por el gate).
router.use('/regiones', regionesRoutes);

// Configuración: valores dinámicos del negocio (solo superadmin, ya cubierto por el gate).
router.use('/configuracion', configuracionRoutes);

// Ciudades: catálogo de ciudades + regiones (solo superadmin, ya cubierto por el gate).
router.use('/ciudades', ciudadesRoutes);

// A futuro, agregar aquí:
// router.use('/reportes-globales', reportesGlobalesRoutes);

export default router;
