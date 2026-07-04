import { Router } from 'express';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import {
  getCentroAyuda,
  getTutorialPublico,
  postVistaTutorial,
  postFeedbackTutorial,
} from '../controllers/ayuda.controller.js';

const router: Router = Router();

// Landing pública de un tutorial (sin login) — alimenta /p/tutorial/:slug + OG.
router.get('/publico/:slug', verificarTokenOpcional, getTutorialPublico);

// Centro de Ayuda (contenido por app/audiencia). Auth OPCIONAL: no expone datos
// del usuario (solo tutoriales filtrados por query params), y así también carga
// desde ScanYA, que usa su propio token (sy_access_token, distinto al de AY).
// La "privacidad" se mantiene a nivel de UI: se accede sólo desde dentro de la app.
router.get('/', verificarTokenOpcional, getCentroAyuda);

// Métricas de un tutorial — contadores agregados (sin identidad de usuario;
// el anti-doble-voto/vista se maneja en el cliente con localStorage).
router.post('/:articuloId/vista', verificarTokenOpcional, postVistaTutorial);
router.post('/:articuloId/feedback', verificarTokenOpcional, postFeedbackTutorial);

export default router;
