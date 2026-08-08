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
 *   GET    /salon-fama                            (rifas cerradas + ganadores de la ciudad — "Cuadro de Honor")
 *   GET    /organizador/:usuarioId
 *   GET    /:id
 *   GET    /:id/boletos
 *   GET    /:id/sala                             (carga inicial de la sala — mensajes/ganadores/estado)
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
 *   PUT    /:id/boletos/:boletoId               (solo el organizador, solo boletos manuales — corrige nombre/teléfono)
 *   POST   /:id/boletos/:boletoId/reasignar      (solo el organizador, solo boletos CON cuenta AY — reasigna el número)
 *   POST   /:id/boletos/:boletoId/liberar        (solo el organizador — borra el boleto, vuelve a disponible)
 *   POST   /:id/boletos/:boletoId/confirmar-pago (solo el organizador — validado en el service)
 *   POST   /:id/sala/activar                     (solo el organizador — agenda la sala en vivo)
 *
 * Sala en vivo (Fase 4.1) — unirse, chat y moderación son eventos de
 * Socket.io (`dinamica:sala:*` en `socket.ts`), no rutas HTTP.
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
    getSalonFamaDinamicas,
    getDinamicasDeOrganizador,
    getDinamica,
    getBoletosDinamica,
    postReservarBoleto,
    postAgregarParticipanteManual,
    putEditarParticipanteManual,
    postReasignarBoleto,
    postLiberarBoleto,
    postConfirmarPagoBoleto,
    postUploadImagen,
    deleteFotoDinamicaHuerfana,
} from '../controllers/dinamicas.controller.js';
import { postActivarSala, getEstadoSala } from '../controllers/dinamicas-sala.controller.js';
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
router.put('/:id/boletos/:boletoId', verificarToken, requiereModoPersonal, putEditarParticipanteManual);
router.post('/:id/boletos/:boletoId/reasignar', verificarToken, requiereModoPersonal, postReasignarBoleto);
router.post('/:id/boletos/:boletoId/liberar', verificarToken, requiereModoPersonal, postLiberarBoleto);
router.post('/:id/boletos/:boletoId/confirmar-pago', verificarToken, requiereModoPersonal, postConfirmarPagoBoleto);
router.post('/:id/sala/activar', verificarToken, requiereModoPersonal, postActivarSala);

// ─── Público ─────────────────────────────────────────────────────────────
router.get('/', verificarTokenOpcional, getFeedDinamicas);
router.get('/salon-fama', verificarTokenOpcional, getSalonFamaDinamicas);
router.get('/organizador/:usuarioId', verificarTokenOpcional, getDinamicasDeOrganizador);
router.get('/:id', verificarTokenOpcional, getDinamica);
router.get('/:id/boletos', verificarTokenOpcional, getBoletosDinamica);
router.get('/:id/sala', verificarTokenOpcional, getEstadoSala);

export default router;
