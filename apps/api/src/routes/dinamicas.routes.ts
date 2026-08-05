/**
 * ============================================================================
 * DINÁMICAS ROUTES — Fase 1 (ciclo de vida) + Fase 3 (participación)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/routes/dinamicas.routes.ts
 *
 * Rutas más específicas (/mias, POST '/') van ANTES de las paramétricas
 * (/:id, /:id/boletos/...), mismo criterio que marketplace.routes.ts.
 *
 * Endpoints expuestos:
 *
 *   PÚBLICO (verificarTokenOpcional)
 *   GET    /
 *   GET    /:id
 *   GET    /:id/boletos
 *
 *   PRIVADOS (verificarToken + requiereModoPersonal — Dinámicas es 100% P2P personal)
 *   GET    /mias
 *   POST   /
 *   PUT    /:id
 *   POST   /upload-imagen
 *   DELETE /foto-huerfana
 *   POST   /:id/publicar
 *   POST   /:id/posponer
 *   POST   /:id/cancelar
 *   POST   /:id/boletos/reservar
 *   POST   /:id/boletos/manual                 (solo el organizador — validado en el service)
 *   POST   /:id/boletos/:boletoId/confirmar-pago (solo el organizador — validado en el service)
 *
 * NO en esta fase: el motor de sorteo (elegir ganador, semilla, hash) es Fase 4.
 */

import { Router } from 'express';
import {
    postCrearDinamica,
    putEditarBorrador,
    postPublicarDinamica,
    postPosponerDinamica,
    postCancelarDinamica,
    getMisDinamicas,
    getFeedDinamicas,
    getDinamica,
    getBoletosDinamica,
    postReservarBoleto,
    postAgregarParticipanteManual,
    postConfirmarPagoBoleto,
    postUploadImagen,
    deleteFotoDinamicaHuerfana,
} from '../controllers/dinamicas.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { requiereModoPersonal } from '../middleware/validarModo.js';

const router: Router = Router();

// ─── Privados ────────────────────────────────────────────────────────────
router.get('/mias', verificarToken, requiereModoPersonal, getMisDinamicas);
router.post('/', verificarToken, requiereModoPersonal, postCrearDinamica);
router.put('/:id', verificarToken, requiereModoPersonal, putEditarBorrador);
router.post('/upload-imagen', verificarToken, requiereModoPersonal, postUploadImagen);
router.delete('/foto-huerfana', verificarToken, requiereModoPersonal, deleteFotoDinamicaHuerfana);
router.post('/:id/publicar', verificarToken, requiereModoPersonal, postPublicarDinamica);
router.post('/:id/posponer', verificarToken, requiereModoPersonal, postPosponerDinamica);
router.post('/:id/cancelar', verificarToken, requiereModoPersonal, postCancelarDinamica);
router.post('/:id/boletos/reservar', verificarToken, requiereModoPersonal, postReservarBoleto);
router.post('/:id/boletos/manual', verificarToken, requiereModoPersonal, postAgregarParticipanteManual);
router.post('/:id/boletos/:boletoId/confirmar-pago', verificarToken, requiereModoPersonal, postConfirmarPagoBoleto);

// ─── Público ─────────────────────────────────────────────────────────────
router.get('/', verificarTokenOpcional, getFeedDinamicas);
router.get('/:id', verificarTokenOpcional, getDinamica);
router.get('/:id/boletos', verificarTokenOpcional, getBoletosDinamica);

export default router;
