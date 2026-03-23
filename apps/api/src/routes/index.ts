/**
 * routes/index.ts
 * ===============
 * Router principal que agrupa todas las rutas de la API.
 * 
 * ¿Qué cambió?
 * - Se agregaron rutas de categorías: /api/categorias
 * - Se agregaron rutas de onboarding: /api/onboarding
 * - Se agregaron rutas de cloudinary: /api/cloudinary
 * - Se agregaron rutas de negocios: /api/negocios
 * - Se agregaron rutas de votos: /api/votos ← NUEVO (Fase 5.3)
 * - Se agregaron rutas de guardados: /api/guardados ← NUEVO (Fase 5.6)
 * - Se agregaron rutas de métricas: /api/metricas ← NUEVO (Fase 5.3)
 * 
 * Ubicación: apps/api/src/routes/index.ts
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import pagoRoutes from './pago.routes';
import categoriasRoutes from './categorias.routes';
import onboardingRoutes from './onboarding.routes';
import cloudinaryRoutes from './cloudinary.routes';
import r2Routes from './r2.routes';
import negociosRoutes from './negocios.routes';
import resenasRoutes from './resenas.routes';
import articulosRoutes from './articulos.routes';
import ofertasRoutes from './ofertas.routes';
import dashboardRoutes from './dashboard.routes';
import votosRoutes from './votos.routes';
import metricasRoutes from './metricas.routes';
import guardadosRoutes from './guardados.routes';
import scanyaRoutes from './scanya.routes';
import puntosRoutes from './puntos.routes';
import transaccionesRoutes from './transacciones.routes';
import clientesRoutes from './clientes.routes';
import cardyaRoutes from './cardya.routes';
import notificacionesRoutes from './notificaciones.routes';
import chatyaRoutes from './chatya.routes';

const router: Router = Router();

// Ruta de salud
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: '🚀 AnunciaYA API v3.0.0 funcionando',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de pagos
router.use('/pagos', pagoRoutes);

// Rutas de categorías
router.use('/categorias', categoriasRoutes);

// Rutas de onboarding
router.use('/onboarding', onboardingRoutes);

// Rutas de cloudinary
router.use('/cloudinary', cloudinaryRoutes);

// Rutas de R2 (limpieza de imágenes huérfanas)
router.use('/r2', r2Routes);

// Rutas de negocios
router.use('/negocios', negociosRoutes);

// Rutas de reseñas
router.use('/resenas', resenasRoutes);

// Rutas de artículos (catálogo)
router.use('/articulos', articulosRoutes);

// Rutas de ofertas
router.use('/ofertas', ofertasRoutes);

// Rutas de votos (likes y guardados)
router.use('/votos', votosRoutes);

// Rutas de seguidos (negocios - usa votos con tipo follow)
router.use('/seguidos', votosRoutes);

// Rutas de guardados (ofertas, rifas, empleos)
router.use('/guardados', guardadosRoutes);

// Rutas de Business Studio - Dashboard
router.use('/business/dashboard', dashboardRoutes);

// Rutas de métricas (views, shares, clicks, messages)
router.use('/metricas', metricasRoutes);

// Rutas de ScanYA (PWA de puntos de lealtad)
router.use('/scanya', scanyaRoutes);

// Rutas de configuración de puntos (Business Studio)
router.use('/puntos', puntosRoutes);

// Rutas de transacciones de puntos (Business Studio)
router.use('/transacciones', transaccionesRoutes);

// Rutas de clientes con puntos (Business Studio)
router.use('/clientes', clientesRoutes);

// Rutas de CardYA (Sistema de lealtad - Cliente)
router.use('/cardya', cardyaRoutes);

// Rutas de Notificaciones (tiempo real)
router.use('/notificaciones', notificacionesRoutes);

// Rutas de ChatYA (Chat 1:1)
router.use('/chatya', chatyaRoutes);

// Aquí se agregarán más rutas:
// router.use('/marketplace', marketplaceRoutes);

export default router;