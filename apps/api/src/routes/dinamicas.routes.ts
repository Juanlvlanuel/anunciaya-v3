/**
 * ============================================================================
 * DINÁMICAS ROUTES — Fase 1 (ciclo de vida, sin UI)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/routes/dinamicas.routes.ts
 *
 * Rutas más específicas (/mias) van ANTES de las paramétricas (/:id), mismo
 * criterio que marketplace.routes.ts.
 *
 * Endpoints expuestos en esta fase:
 *
 *   PÚBLICO (verificarTokenOpcional)
 *   GET    /:id
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
 *
 * NO en esta fase: reservar boleto (endpoint público + disparo de ChatYA) es
 * Fase 3; el motor de sorteo (elegir ganador) es Fase 4.
 */

import { Router } from 'express';
import {
    postCrearDinamica,
    putEditarBorrador,
    postPublicarDinamica,
    postPosponerDinamica,
    postCancelarDinamica,
    getMisDinamicas,
    getDinamica,
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

// ─── Público ─────────────────────────────────────────────────────────────
router.get('/:id', verificarTokenOpcional, getDinamica);

export default router;
