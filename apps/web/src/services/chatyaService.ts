/**
 * ============================================================================
 * CHATYA SERVICE - Llamadas API (Cliente)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/services/chatyaService.ts
 *
 * PROPÓSITO:
 * 28 funciones HTTP alineadas 1:1 con los 28 endpoints del backend.
 * Cubre todos los sprints del módulo ChatYA:
 *   - Conversaciones: listar, obtener, crear, fijar, archivar, silenciar, eliminar, leer
 *   - Mensajes: listar, enviar, editar, eliminar, reenviar
 *   - Contactos: listar, agregar, eliminar
 *   - Bloqueo: listar, bloquear, desbloquear
 *   - Reacciones: toggle, obtener
 *   - Mensajes fijados: listar, fijar, desfijar
 *   - Búsqueda: full-text dentro de conversación
 *   - Badge: total no leídos
 *   - Búsqueda personas y negocios: para iniciar chat nuevo (Sprint 5)
 *
 * AUTENTICACIÓN:
 *   - Todas las rutas requieren usuario autenticado
 *   - El token se agrega automáticamente por el interceptor de Axios
 *
 * MODO:
 *   - El modo (personal/comercial) se obtiene del token en el backend
 *   - Algunas rutas permiten override vía query param (?modo=personal)
 *
 * ⚡ sucursalId NO se pasa manualmente en modo comercial.
 *    El interceptor Axios lo agrega automáticamente.
 */

import { get, post, patch, del } from './api';
import type {
  Conversacion,
  Mensaje,
  ListaPaginada,
  CrearConversacionInput,
  EnviarMensajeInput,
  EditarMensajeInput,
  ReenviarMensajeInput,
  ModoChatYA,
  Contacto,
  AgregarContactoInput,
  UsuarioBloqueado,
  BloquearUsuarioInput,
  ReaccionAgrupada,
  MensajeFijado,
  PersonaBusqueda,
  NegocioBusqueda,
} from '../types/chatya';

// =============================================================================
// CONVERSACIONES (Endpoints 1-8)
// =============================================================================

/**
 * 1. Lista de conversaciones paginadas.
 * GET /api/chatya/conversaciones?modo=personal&limit=20&offset=0
 *
 * Retorna conversaciones donde el usuario es participante,
 * ordenadas por más reciente, excluyendo las eliminadas.
 * Incluye datos del otro participante (nombre, avatar, negocio).
 *
 * @param modo - Modo de las conversaciones a listar
 * @param limit - Máximo de resultados (default 20, máx 50)
 * @param offset - Desplazamiento para paginación
 */
export async function getConversaciones(
  modo: ModoChatYA = 'personal',
  limit = 20,
  offset = 0,
  archivadas = false
) {
  const params = new URLSearchParams();
  params.append('modo', modo);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (archivadas) params.append('archivadas', 'true');

  return get<ListaPaginada<Conversacion>>(`/chatya/conversaciones?${params}`);
}

/**
 * 2. Detalle de una conversación específica.
 * GET /api/chatya/conversaciones/:id
 *
 * Incluye verificación de acceso (solo participantes).
 *
 * @param id - UUID de la conversación
 */
export async function getConversacion(id: string) {
  return get<Conversacion>(`/chatya/conversaciones/${id}`);
}

/**
 * 3. Crear o recuperar una conversación existente.
 * POST /api/chatya/conversaciones
 *
 * Si ya existe una conversación entre ambos participantes en el mismo modo,
 * la retorna sin crear duplicada. Verifica bloqueo bidireccional.
 * El participante1 (emisor) se toma automáticamente del token.
 *
 * @param datos - Datos del participante2 y contexto de origen
 */
export async function crearConversacion(datos: CrearConversacionInput) {
  return post<Conversacion>('/chatya/conversaciones', datos);
}

/**
 * 4. Toggle fijar/desfijar conversación.
 * PATCH /api/chatya/conversaciones/:id/fijar
 *
 * Las conversaciones fijadas aparecen siempre arriba en la lista.
 * El toggle es individual por participante (el otro no se ve afectado).
 *
 * @param id - UUID de la conversación
 */
export async function toggleFijarConversacion(id: string) {
  return patch<{ fijada: boolean }>(`/chatya/conversaciones/${id}/fijar`);
}

/**
 * 5. Toggle archivar/desarchivar conversación.
 * PATCH /api/chatya/conversaciones/:id/archivar
 *
 * Las conversaciones archivadas se ocultan de la lista principal.
 * Accesibles desde la sección "Archivados".
 *
 * @param id - UUID de la conversación
 */
export async function toggleArchivarConversacion(id: string) {
  return patch<{ archivada: boolean }>(`/chatya/conversaciones/${id}/archivar`);
}

/**
 * 6. Toggle silenciar/desilenciar conversación.
 * PATCH /api/chatya/conversaciones/:id/silenciar
 *
 * Silenciar impide el sonido de notificación para esa conversación.
 * Los mensajes siguen llegando normalmente.
 *
 * @param id - UUID de la conversación
 */
export async function toggleSilenciarConversacion(id: string) {
  return patch<{ silenciada: boolean }>(`/chatya/conversaciones/${id}/silenciar`);
}

/**
 * 7. Marcar mensajes como leídos (palomitas azules).
 * PATCH /api/chatya/conversaciones/:id/leer
 *
 * Marca TODOS los mensajes no leídos del otro participante como leídos.
 * Resetea el contador de no leídos. Emite chatya:leido vía Socket.io
 * para que el emisor original vea las palomitas azules en tiempo real.
 *
 * @param id - UUID de la conversación
 */
export async function marcarComoLeido(id: string) {
  return patch<void>(`/chatya/conversaciones/${id}/leer`);
}

/**
 * 8. Eliminar conversación (soft delete).
 * DELETE /api/chatya/conversaciones/:id
 *
 * Soft delete individual: el otro participante aún puede ver el chat.
 * Si AMBOS participantes eliminan → hard delete + limpieza de archivos R2.
 *
 * @param id - UUID de la conversación
 */
export async function eliminarConversacion(id: string) {
  return del<void>(`/chatya/conversaciones/${id}`);
}

// =============================================================================
// MENSAJES (Endpoints 9-13)
// =============================================================================

/**
 * 9. Lista de mensajes paginados de una conversación.
 * GET /api/chatya/conversaciones/:id/mensajes?limit=30&offset=0
 *
 * Retorna mensajes ordenados por fecha descendente (más recientes primero).
 * Excluye mensajes eliminados. Incluye datos de respuesta si aplica.
 *
 * @param conversacionId - UUID de la conversación
 * @param limit - Máximo de resultados (default 30, máx 50)
 * @param offset - Desplazamiento para scroll infinito
 */
export async function getMensajes(
  conversacionId: string,
  limit = 30,
  offset = 0
) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  return get<ListaPaginada<Mensaje>>(
    `/chatya/conversaciones/${conversacionId}/mensajes?${params}`
  );
}

/**
 * 10. Enviar un mensaje.
 * POST /api/chatya/conversaciones/:id/mensajes
 *
 * El backend:
 *   - Guarda el mensaje en BD
 *   - Actualiza el preview de la conversación
 *   - Incrementa el contador de no leídos del receptor
 *   - Emite chatya:mensaje-nuevo vía Socket.io a ambos participantes
 *   - Restaura la conversación si estaba eliminada por el emisor
 *
 * @param conversacionId - UUID de la conversación
 * @param datos - Contenido, tipo, y opcionalmente respuestaAId
 */
export async function enviarMensaje(
  conversacionId: string,
  datos: EnviarMensajeInput
) {
  return post<Mensaje>(`/chatya/conversaciones/${conversacionId}/mensajes`, datos);
}

/**
 * 11. Editar un mensaje propio.
 * PATCH /api/chatya/mensajes/:id
 *
 * Solo se pueden editar mensajes de tipo texto propios.
 * Sin límite de tiempo para editar.
 * El backend marca editado=true y emite chatya:mensaje-editado.
 *
 * @param mensajeId - UUID del mensaje
 * @param datos - Nuevo contenido
 */
export async function editarMensaje(mensajeId: string, datos: EditarMensajeInput) {
  return patch<Mensaje>(`/chatya/mensajes/${mensajeId}`, datos);
}

/**
 * 12. Eliminar un mensaje propio (soft delete).
 * DELETE /api/chatya/mensajes/:id
 *
 * El mensaje se elimina para AMBOS participantes.
 * Aparece como "Se eliminó este mensaje" en el chat.
 * Emite chatya:mensaje-eliminado vía Socket.io.
 *
 * @param mensajeId - UUID del mensaje
 */
export async function eliminarMensaje(mensajeId: string) {
  return del<void>(`/chatya/mensajes/${mensajeId}`);
}

/**
 * 13. Reenviar un mensaje a otro usuario.
 * POST /api/chatya/mensajes/:id/reenviar
 *
 * Hace dos cosas en una operación:
 *   1. Buscar/crear conversación con el destinatario
 *   2. Crear mensaje nuevo con reenviadoDeId apuntando al original
 *
 * @param mensajeId - UUID del mensaje original a reenviar
 * @param datos - Datos del destinatario
 */
export async function reenviarMensaje(
  mensajeId: string,
  datos: ReenviarMensajeInput
) {
  return post<Mensaje>(`/chatya/mensajes/${mensajeId}/reenviar`, datos);
}

// =============================================================================
// CONTACTOS (Endpoints 14-16)
// =============================================================================

/**
 * 14. Lista de contactos del usuario.
 * GET /api/chatya/contactos?tipo=personal
 *
 * Retorna contactos con datos básicos (nombre, avatar, negocio si aplica).
 * Separados por tipo: personales vs comerciales.
 *
 * @param tipo - Tipo de contactos a listar
 */
export async function getContactos(tipo: 'personal' | 'comercial' = 'personal') {
  return get<Contacto[]>(`/chatya/contactos?tipo=${tipo}`);
}

/**
 * 15. Agregar un contacto.
 * POST /api/chatya/contactos
 *
 * Valida que no sea auto-contacto ni duplicado.
 *
 * @param datos - Datos del contacto a agregar
 */
export async function agregarContacto(datos: AgregarContactoInput) {
  return post<Contacto>('/chatya/contactos', datos);
}

/**
 * 16. Eliminar un contacto.
 * DELETE /api/chatya/contactos/:id
 *
 * Solo el dueño del contacto puede eliminarlo.
 *
 * @param id - UUID del registro de contacto
 */
export async function eliminarContacto(id: string) {
  return del<void>(`/chatya/contactos/${id}`);
}

/**
 * PATCH /api/chatya/contactos/:id/alias
 * Edita el alias personalizado de un contacto. Pasar alias: null para eliminarlo.
 */
export async function editarAliasContacto(id: string, alias: string | null) {
  return patch<void>(`/chatya/contactos/${id}/alias`, { alias });
}

// =============================================================================
// BLOQUEO (Endpoints 17-19)
// =============================================================================

/**
 * 17. Lista de usuarios bloqueados.
 * GET /api/chatya/bloqueados
 *
 * Retorna usuarios bloqueados con datos básicos.
 */
export async function getBloqueados() {
  return get<UsuarioBloqueado[]>('/chatya/bloqueados');
}

/**
 * 18. Bloquear un usuario.
 * POST /api/chatya/bloqueados
 *
 * Bloqueo bidireccional: ni tú ni el bloqueado pueden enviarse mensajes.
 * Valida auto-bloqueo y duplicados.
 *
 * @param datos - ID del usuario a bloquear y motivo opcional
 */
export async function bloquearUsuario(datos: BloquearUsuarioInput) {
  return post<UsuarioBloqueado>('/chatya/bloqueados', datos);
}

/**
 * 19. Desbloquear un usuario.
 * DELETE /api/chatya/bloqueados/:id
 *
 * El :id es el UUID del usuario bloqueado (no del registro).
 *
 * @param bloqueadoId - UUID del usuario a desbloquear
 */
export async function desbloquearUsuario(bloqueadoId: string) {
  return del<void>(`/chatya/bloqueados/${bloqueadoId}`);
}

// =============================================================================
// REACCIONES (Endpoints 20-21)
// =============================================================================

/**
 * 20. Toggle reacción (agregar o quitar).
 * POST /api/chatya/mensajes/:id/reaccion
 *
 * Si el usuario ya reaccionó con ese emoji → se quita.
 * Si no → se agrega.
 * Emite chatya:reaccion vía Socket.io.
 *
 * @param mensajeId - UUID del mensaje
 * @param emoji - Emoji de la reacción
 */
export async function toggleReaccion(mensajeId: string, emoji: string) {
  return post<{ accion: 'agregada' | 'removida' }>(
    `/chatya/mensajes/${mensajeId}/reaccion`,
    { emoji }
  );
}

/**
 * 21. Obtener reacciones agrupadas por emoji.
 * GET /api/chatya/mensajes/:id/reacciones
 *
 * Retorna cada emoji con cantidad y lista de usuarios que reaccionaron.
 *
 * @param mensajeId - UUID del mensaje
 */
export async function getReacciones(mensajeId: string) {
  return get<ReaccionAgrupada[]>(`/chatya/mensajes/${mensajeId}/reacciones`);
}

// =============================================================================
// MENSAJES FIJADOS (Endpoints 22-24)
// =============================================================================

/**
 * 22. Lista de mensajes fijados en una conversación.
 * GET /api/chatya/conversaciones/:id/fijados
 *
 * Retorna mensajes fijados con contenido del mensaje original.
 *
 * @param conversacionId - UUID de la conversación
 */
export async function getMensajesFijados(conversacionId: string) {
  return get<MensajeFijado[]>(`/chatya/conversaciones/${conversacionId}/fijados`);
}

/**
 * 23. Fijar un mensaje.
 * POST /api/chatya/conversaciones/:id/fijados
 *
 * Verifica acceso y que el mensaje pertenezca a la conversación.
 * Emite chatya:mensaje-fijado vía Socket.io.
 *
 * @param conversacionId - UUID de la conversación
 * @param mensajeId - UUID del mensaje a fijar
 */
export async function fijarMensaje(conversacionId: string, mensajeId: string) {
  return post<MensajeFijado>(
    `/chatya/conversaciones/${conversacionId}/fijados`,
    { mensajeId }
  );
}

/**
 * 24. Desfijar un mensaje.
 * DELETE /api/chatya/conversaciones/:convId/fijados/:msgId
 *
 * Emite chatya:mensaje-desfijado vía Socket.io.
 *
 * @param conversacionId - UUID de la conversación
 * @param mensajeId - UUID del mensaje a desfijar
 */
export async function desfijarMensaje(conversacionId: string, mensajeId: string) {
  return del<void>(`/chatya/conversaciones/${conversacionId}/fijados/${mensajeId}`);
}

// =============================================================================
// BÚSQUEDA (Endpoint 25)
// =============================================================================

/**
 * 25. Búsqueda full-text dentro de una conversación.
 * GET /api/chatya/conversaciones/:id/buscar?texto=hola&limit=20&offset=0
 *
 * Usa to_tsvector('spanish') para búsqueda en español.
 * Solo busca en mensajes de tipo texto no eliminados.
 *
 * @param conversacionId - UUID de la conversación
 * @param texto - Texto a buscar
 * @param limit - Máximo de resultados
 * @param offset - Desplazamiento
 */
export async function buscarMensajes(
  conversacionId: string,
  texto: string,
  limit = 20,
  offset = 0
) {
  const params = new URLSearchParams();
  params.append('texto', texto);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  return get<ListaPaginada<Mensaje>>(
    `/chatya/conversaciones/${conversacionId}/buscar?${params}`
  );
}

// =============================================================================
// BADGE: TOTAL NO LEÍDOS (Endpoint 26)
// =============================================================================

/**
 * 26. Contar total de mensajes no leídos para el badge.
 * GET /api/chatya/no-leidos?modo=personal
 *
 * Suma no_leidos de todas las conversaciones activas del usuario
 * en el modo indicado. Se usa para el badge rojo en Navbar/MobileHeader.
 *
 * @param modo - Modo para filtrar conversaciones
 */
export async function getNoLeidos(modo: ModoChatYA = 'personal') {
  return get<{ total: number }>(`/chatya/no-leidos?modo=${modo}`);
}

// =============================================================================
// BÚSQUEDA DE PERSONAS Y NEGOCIOS (Endpoints 27-28)
// =============================================================================

/**
 * 27. Buscar personas por nombre, apellidos o alias.
 * GET /api/chatya/buscar-personas?q=texto&limit=10
 *
 * Excluye al usuario actual, bloqueados e inactivos.
 *
 * @param q - Texto de búsqueda (mínimo 2 caracteres)
 * @param limit - Máximo de resultados (default 10)
 */
export async function buscarPersonas(q: string, limit = 10) {
  const params = new URLSearchParams();
  params.append('q', q);
  params.append('limit', limit.toString());

  return get<PersonaBusqueda[]>(`/chatya/buscar-personas?${params}`);
}

/**
 * 28. Buscar negocios/sucursales por nombre, descripción, categoría o subcategoría.
 * GET /api/chatya/buscar-negocios?q=texto&ciudad=...&lat=...&lng=...&limit=10
 *
 * Filtra por ciudad. Calcula distancia con PostGIS si hay coordenadas.
 * Ordena por cercanía si hay GPS, sino alfabético.
 *
 * @param q - Texto de búsqueda (mínimo 2 caracteres)
 * @param ciudad - Ciudad para filtrar resultados
 * @param lat - Latitud del usuario (opcional, para calcular distancia)
 * @param lng - Longitud del usuario (opcional, para calcular distancia)
 * @param limit - Máximo de resultados (default 10)
 */
export async function buscarNegocios(
  q: string,
  ciudad: string,
  lat?: number | null,
  lng?: number | null,
  limit = 10
) {
  const params = new URLSearchParams();
  params.append('q', q);
  params.append('ciudad', ciudad);
  if (lat != null) params.append('lat', lat.toString());
  if (lng != null) params.append('lng', lng.toString());
  params.append('limit', limit.toString());

  return get<NegocioBusqueda[]>(`/chatya/buscar-negocios?${params}`);
}

// =============================================================================
// MIS NOTAS (Endpoint 29)
// =============================================================================

/**
 * 29. Obtener o crear la conversación "Mis Notas".
 * GET /api/chatya/mis-notas
 *
 * Auto-crea la conversación la primera vez que se llama.
 * Retorna la conversación donde p1 = p2 = usuario actual.
 */
export async function getMisNotas() {
  return get<Conversacion>('/chatya/mis-notas');
}