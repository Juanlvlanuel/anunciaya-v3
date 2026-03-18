/**
 * r2Service.ts
 * ============
 * Servicio para operaciones sobre Cloudflare R2 desde el frontend.
 *
 * UBICACIÓN: apps/web/src/services/r2Service.ts
 */

import { api } from './api';

/**
 * Elimina una imagen huérfana de R2.
 * Llamar cuando el usuario cancela un formulario o hace reset()
 * después de haber subido una imagen que no llegó a guardarse en BD.
 */
export async function eliminarImagenHuerfana(url: string): Promise<void> {
    await api.delete('/r2/imagen', { data: { url } });
}
