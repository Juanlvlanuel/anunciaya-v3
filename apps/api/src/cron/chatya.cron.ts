/**
 * chatya.cron.ts
 * ===============
 * Cron job para limpieza de conversaciones inactivas (TTL 6 meses).
 * Se ejecuta diariamente a las 3:00 AM.
 *
 * UBICACIÓN: apps/api/src/cron/chatya.cron.ts
 *
 * QUÉ HACE:
 * 1. Busca conversaciones donde updated_at < hace 6 meses
 * 2. Elimina mensajes asociados (CASCADE lo hace automático)
 * 3. Hard delete de la conversación
 * 4. TODO Sprint 6: Limpiar archivos R2 asociados
 *
 * CÓMO SE ACTIVA:
 * Se importa y ejecuta desde app.ts o index.ts del backend.
 */

import { db } from '../db/index.js';
import { chatConversaciones, chatMensajes } from '../db/schemas/schema.js';
import { sql, lt, eq, and } from 'drizzle-orm';

// =============================================================================
// FUNCIÓN PRINCIPAL DE LIMPIEZA
// =============================================================================

async function limpiarConversacionesInactivas(): Promise<void> {
  const inicio = Date.now();

  try {
    // Fecha límite: 6 meses atrás
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 6);
    const fechaLimiteStr = fechaLimite.toISOString();

    // Buscar conversaciones inactivas
    const inactivas = await db
      .select({
        id: chatConversaciones.id,
        updatedAt: chatConversaciones.updatedAt,
      })
      .from(chatConversaciones)
      .where(lt(chatConversaciones.updatedAt, fechaLimiteStr));

    if (inactivas.length === 0) {
      console.log(`[ChatYA Cron] Sin conversaciones inactivas. (${Date.now() - inicio}ms)`);
      return;
    }

    console.log(`[ChatYA Cron] Encontradas ${inactivas.length} conversaciones inactivas (>6 meses)`);

    let eliminadas = 0;

    for (const conv of inactivas) {
      try {
        // TODO Sprint 6: Antes de eliminar, limpiar archivos R2
        // const mensajesConArchivos = await db.select(...)
        //   .from(chatMensajes)
        //   .where(and(
        //     eq(chatMensajes.conversacionId, conv.id),
        //     sql`tipo IN ('imagen', 'audio', 'documento')`
        //   ));
        // for (const msg of mensajesConArchivos) { await eliminarDeR2(msg.contenido); }

        // Hard delete (los mensajes se eliminan por CASCADE)
        await db
          .delete(chatConversaciones)
          .where(eq(chatConversaciones.id, conv.id));

        eliminadas++;
      } catch (err) {
        console.error(`[ChatYA Cron] Error eliminando conversación ${conv.id}:`, err);
      }
    }

    const duracion = Date.now() - inicio;
    console.log(`[ChatYA Cron] Limpieza completada: ${eliminadas}/${inactivas.length} eliminadas (${duracion}ms)`);

  } catch (error) {
    console.error('[ChatYA Cron] Error en limpieza:', error);
  }
}

// =============================================================================
// INICIALIZAR CRON (llamar desde app.ts o index.ts)
// =============================================================================

/**
 * Programa la limpieza diaria a las 3:00 AM.
 * Usa setInterval con cálculo de milisegundos hasta las 3 AM.
 */
export function inicializarCronChatYA(): void {
  // Calcular milisegundos hasta las próximas 3:00 AM
  function msHasta3AM(): number {
    const ahora = new Date();
    const proxima3AM = new Date(ahora);
    proxima3AM.setHours(3, 0, 0, 0);

    // Si ya pasaron las 3 AM hoy, programar para mañana
    if (ahora >= proxima3AM) {
      proxima3AM.setDate(proxima3AM.getDate() + 1);
    }

    return proxima3AM.getTime() - ahora.getTime();
  }

  // Primera ejecución: esperar hasta las 3 AM
  const msEspera = msHasta3AM();
  const horasEspera = (msEspera / (1000 * 60 * 60)).toFixed(1);
  console.log(`[ChatYA Cron] Próxima limpieza en ${horasEspera} horas (3:00 AM)`);

  setTimeout(() => {
    // Ejecutar la primera vez
    limpiarConversacionesInactivas();

    // Después, repetir cada 24 horas
    setInterval(limpiarConversacionesInactivas, 24 * 60 * 60 * 1000);
  }, msEspera);
}