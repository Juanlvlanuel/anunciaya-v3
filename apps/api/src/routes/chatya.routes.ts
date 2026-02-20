/**
 * chatya.routes.ts
 * =================
 * Rutas para el módulo de ChatYA (Chat 1:1).
 *
 * UBICACIÓN: apps/api/src/routes/chatya.routes.ts
 *
 * RUTAS - CONVERSACIONES:
 * GET    /api/chatya/conversaciones                     - Lista de chats (paginado, filtrado por modo)
 * GET    /api/chatya/conversaciones/:id                 - Detalle de una conversación
 * POST   /api/chatya/conversaciones                     - Crear/obtener conversación
 * PATCH  /api/chatya/conversaciones/:id/fijar           - Fijar/desfijar
 * PATCH  /api/chatya/conversaciones/:id/archivar        - Archivar/desarchivar
 * PATCH  /api/chatya/conversaciones/:id/silenciar       - Silenciar/desilenciar
 * DELETE /api/chatya/conversaciones/:id                 - Eliminar (soft delete)
 *
 * RUTAS - MENSAJES:
 * GET    /api/chatya/conversaciones/:id/mensajes        - Mensajes paginados
 * POST   /api/chatya/conversaciones/:id/mensajes        - Enviar mensaje (texto)
 * PATCH  /api/chatya/mensajes/:id                       - Editar mensaje propio
 * DELETE /api/chatya/mensajes/:id                       - Eliminar mensaje propio
 * POST   /api/chatya/mensajes/:id/reenviar              - Reenviar mensaje
 *
 * RUTAS - LECTURA:
 * PATCH  /api/chatya/conversaciones/:id/leer            - Marcar como leídos
 *
 * RUTAS - BÚSQUEDA PERSONAS/NEGOCIOS:
 * GET    /api/chatya/buscar-personas                     - Buscar usuarios por nombre/alias
 * GET    /api/chatya/buscar-negocios                     - Buscar negocios por nombre/categoría/descripción
 */

import { Router, type Router as RouterType } from 'express';
import {
  listarConversacionesController,
  obtenerConversacionController,
  crearConversacionController,
  fijarConversacionController,
  archivarConversacionController,
  silenciarConversacionController,
  eliminarConversacionController,
  listarMensajesController,
  enviarMensajeController,
  editarMensajeController,
  eliminarMensajeController,
  reenviarMensajeController,
  marcarLeidosController,
  listarContactosController,
  agregarContactoController,
  eliminarContactoController,
  listarBloqueadosController,
  bloquearUsuarioController,
  desbloquearUsuarioController,
  toggleReaccionController,
  obtenerReaccionesController,
  fijarMensajeController,
  desfijarMensajeController,
  listarFijadosController,
  buscarMensajesController,
  contarNoLeidosController,
  buscarPersonasController,
  buscarNegociosController,
  misNotasController,
} from '../controllers/chatya.controller.js';
import { verificarToken } from '../middleware/auth.js';

// =============================================================================
// CREAR ROUTER
// =============================================================================

const router: RouterType = Router();

// =============================================================================
// MIDDLEWARE: Todas las rutas requieren autenticación
// =============================================================================
router.use(verificarToken);

// =============================================================================
// CONVERSACIONES
// =============================================================================

// =============================================================================
// MIS NOTAS
// =============================================================================

/** GET /api/chatya/mis-notas — Obtener/crear conversación consigo mismo */
router.get('/mis-notas', misNotasController);

/** GET /api/chatya/conversaciones?modo=personal&limit=20&offset=0 */
router.get('/conversaciones', listarConversacionesController);

/** GET /api/chatya/conversaciones/:id */
router.get('/conversaciones/:id', obtenerConversacionController);

/** POST /api/chatya/conversaciones */
router.post('/conversaciones', crearConversacionController);

/** PATCH /api/chatya/conversaciones/:id/fijar */
router.patch('/conversaciones/:id/fijar', fijarConversacionController);

/** PATCH /api/chatya/conversaciones/:id/archivar */
router.patch('/conversaciones/:id/archivar', archivarConversacionController);

/** PATCH /api/chatya/conversaciones/:id/silenciar */
router.patch('/conversaciones/:id/silenciar', silenciarConversacionController);

/** PATCH /api/chatya/conversaciones/:id/leer */
router.patch('/conversaciones/:id/leer', marcarLeidosController);

/** DELETE /api/chatya/conversaciones/:id */
router.delete('/conversaciones/:id', eliminarConversacionController);

// =============================================================================
// MENSAJES
// =============================================================================

/** GET /api/chatya/conversaciones/:id/mensajes?limit=30&offset=0 */
router.get('/conversaciones/:id/mensajes', listarMensajesController);

/** POST /api/chatya/conversaciones/:id/mensajes */
router.post('/conversaciones/:id/mensajes', enviarMensajeController);

/** PATCH /api/chatya/mensajes/:id */
router.patch('/mensajes/:id', editarMensajeController);

/** DELETE /api/chatya/mensajes/:id */
router.delete('/mensajes/:id', eliminarMensajeController);

/** POST /api/chatya/mensajes/:id/reenviar */
router.post('/mensajes/:id/reenviar', reenviarMensajeController);

// =============================================================================
// CONTACTOS
// =============================================================================

/** GET /api/chatya/contactos?tipo=personal */
router.get('/contactos', listarContactosController);

/** POST /api/chatya/contactos */
router.post('/contactos', agregarContactoController);

/** DELETE /api/chatya/contactos/:id */
router.delete('/contactos/:id', eliminarContactoController);

// =============================================================================
// BLOQUEADOS
// =============================================================================

/** GET /api/chatya/bloqueados */
router.get('/bloqueados', listarBloqueadosController);

/** POST /api/chatya/bloqueados */
router.post('/bloqueados', bloquearUsuarioController);

/** DELETE /api/chatya/bloqueados/:id (id = uuid del usuario bloqueado) */
router.delete('/bloqueados/:id', desbloquearUsuarioController);

// =============================================================================
// REACCIONES
// =============================================================================

/** POST /api/chatya/mensajes/:id/reaccion (toggle: agrega o quita) */
router.post('/mensajes/:id/reaccion', toggleReaccionController);

/** GET /api/chatya/mensajes/:id/reacciones */
router.get('/mensajes/:id/reacciones', obtenerReaccionesController);

// =============================================================================
// MENSAJES FIJADOS
// =============================================================================

/** GET /api/chatya/conversaciones/:id/fijados */
router.get('/conversaciones/:id/fijados', listarFijadosController);

/** POST /api/chatya/conversaciones/:id/fijados — Body: { mensajeId } */
router.post('/conversaciones/:id/fijados', fijarMensajeController);

/** DELETE /api/chatya/conversaciones/:convId/fijados/:msgId */
router.delete('/conversaciones/:convId/fijados/:msgId', desfijarMensajeController);

// =============================================================================
// BÚSQUEDA
// =============================================================================

/** GET /api/chatya/conversaciones/:id/buscar?texto=hola&limit=20&offset=0 */
router.get('/conversaciones/:id/buscar', buscarMensajesController);

// =============================================================================
// BADGE: TOTAL NO LEÍDOS
// =============================================================================

/** GET /api/chatya/no-leidos?modo=personal */
router.get('/no-leidos', contarNoLeidosController);

// =============================================================================
// BÚSQUEDA DE PERSONAS Y NEGOCIOS (Sprint 5)
// =============================================================================

/** GET /api/chatya/buscar-personas?q=texto&limit=10 */
router.get('/buscar-personas', buscarPersonasController);

/** GET /api/chatya/buscar-negocios?q=texto&ciudad=Ciudad de México&lat=19.43&lng=-99.13&limit=10 */
router.get('/buscar-negocios', buscarNegociosController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;