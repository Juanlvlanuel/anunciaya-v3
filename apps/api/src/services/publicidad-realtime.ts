/**
 * publicidad-realtime.ts
 * ======================
 * Un solo punto para avisar a la app (columna derecha) que la publicidad VIGENTE de alguna ciudad
 * cambió, para que refresque al instante SIN recargar. Se apoya en el broadcast global de Socket.io
 * que ya existe (`emitirEvento`): el evento es poco frecuente (alta/baja/edición/vencimiento de
 * anuncios y marcado de fundadores), así que cada cliente simplemente invalida su propia query de
 * publicidad (filtrada por su ciudad). No lleva ciudad en el payload a propósito: calcularla en cada
 * punto costaría queries extra sin beneficio real dado lo raro del evento.
 *
 * Lo consumen: usePublicidad.ts → escucharEvento('publicidad:cambio') → invalida ['publicidad'].
 *
 * Ubicación: apps/api/src/services/publicidad-realtime.ts
 */

import { emitirEvento } from '../socket.js';

/** Nombre único del evento (evita strings mágicos repetidos en los services). */
export const EVENTO_PUBLICIDAD_CAMBIO = 'publicidad:cambio';

/**
 * Notifica a todos los clientes conectados que la publicidad cambió. `motivo` es solo informativo
 * (para logs/depuración del lado cliente); la reacción es siempre la misma: invalidar y refetchear.
 */
export function notificarCambioPublicidad(motivo?: string): void {
  emitirEvento(EVENTO_PUBLICIDAD_CAMBIO, { motivo: motivo ?? null });
}
