/**
 * notificacionesCoyo.service.ts
 * ==============================
 * Notifica a los DUEÑOS/AUTORES de los items que aparecen en los resultados
 * de Coyo. Cada vecino que tenga negocios/ofertas/artículos/servicios
 * recomendados por Coyo recibe una notificación que dice "Coyo te recomendó".
 *
 * Reglas por tipo de item:
 *
 * - NEGOCIO (sucursal):
 *     → Gerente de la sucursal específica que apareció.
 *     → Si la sucursal NO tiene gerente, fallback al dueño del negocio.
 *     → NUNCA al dueño cuando hay gerente (decisión de producto: el dueño
 *       no necesita saber en qué búsquedas aparecen sus sucursales, esa
 *       responsabilidad es del gerente local).
 *     → Modo: 'comercial'.
 *     → Si aparecen varias sucursales del mismo negocio, se notifica al
 *       gerente de cada una (cada uno solo recibe la de SU sucursal).
 *
 * - OFERTA:
 *     → Misma lógica que Negocio (gerente con fallback dueño).
 *     → Modo: 'comercial'.
 *
 * - MARKETPLACE:
 *     → Usuario que publicó el artículo (Marketplace es solo personal).
 *     → Modo: 'personal'.
 *
 * - SERVICIO:
 *     → `servicio-persona` / `solicito`: usuario que publicó (personal).
 *     → `vacante-empresa`: tiene sucursalId → gerente con fallback dueño.
 *     → Modo: depende del tipo.
 *
 * Reglas globales:
 * - Auto-notificación bloqueada: si el dueño/usuario destinatario es el
 *   MISMO que el autor de la pregunta, NO se envía notificación.
 * - Fire-and-forget: el helper nunca lanza ni bloquea el flujo del
 *   orquestador. Errores individuales se loguean pero no propagan.
 *
 * UBICACIÓN: apps/api/src/services/coyo/notificacionesCoyo.service.ts
 */

import { db } from '../../db/index.js';
import {
    negocioSucursales,
    negocios,
    usuarios,
    articulosMarketplace,
    serviciosPublicaciones,
    ofertas,
} from '../../db/schemas/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { crearNotificacion } from '../notificaciones.service.js';
import type { ResultadoBusquedaUnificada } from './buscadorUnificado.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface InfoAutorPregunta {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
}

export interface PayloadNotificacionesCoyo {
    preguntaId: string;
    textoPregunta: string;
    autor: InfoAutorPregunta;
}

// =============================================================================
// HELPER DE COPY PARA LA NOTIFICACIÓN
// =============================================================================

/**
 * Construye el mensaje cálido de la notificación. El título es fijo
 * ("Coyo te recomendó"); el mensaje preview la pregunta.
 *
 * Personal y comercial usan el mismo título — el frontend distingue por
 * `modo` para renderizado visual.
 */
function construirTituloYMensaje(textoPregunta: string): {
    titulo: string;
    mensaje: string;
} {
    const preview =
        textoPregunta.length > 80
            ? `${textoPregunta.slice(0, 80)}…`
            : textoPregunta;
    return {
        titulo: 'Coyo te recomendó',
        mensaje: `Apareciste en: "${preview}"`,
    };
}

/**
 * Datos del autor de la pregunta para inyectar en la notificación como
 * `actorNombre` + `actorImagenUrl` (el "vecino que preguntó").
 */
function construirActor(autor: InfoAutorPregunta): {
    actorNombre: string | undefined;
    actorImagenUrl: string | undefined;
} {
    const nombre = `${autor.nombre} ${autor.apellidos}`.trim();
    return {
        actorNombre: nombre.length > 0 ? nombre : undefined,
        actorImagenUrl: autor.avatarUrl ?? undefined,
    };
}

// =============================================================================
// RESOLVER DESTINATARIO PARA SUCURSAL (gerente con fallback dueño)
// =============================================================================

/**
 * Devuelve el `usuarioId` que debe recibir la notificación para un
 * `sucursalId` dado:
 *  - Si la sucursal tiene gerente asignado → gerente.id.
 *  - Si NO tiene gerente → dueño del negocio.
 *  - Si por alguna razón no encuentra dueño tampoco → null (no notificar).
 *
 * Devuelve también `negocioId` para enriquecer la notificación.
 */
async function resolverDestinatarioSucursal(
    sucursalId: string,
): Promise<{ usuarioId: string; negocioId: string } | null> {
    // Cargar sucursal + dueño del negocio en una sola query
    const [datos] = await db
        .select({
            sucursalId: negocioSucursales.id,
            negocioId: negocioSucursales.negocioId,
            duenoId: negocios.usuarioId,
        })
        .from(negocioSucursales)
        .innerJoin(negocios, eq(negocios.id, negocioSucursales.negocioId))
        .where(eq(negocioSucursales.id, sucursalId))
        .limit(1);

    if (!datos) return null;

    // Buscar gerente de la sucursal específica
    const [gerente] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.sucursalAsignada, sucursalId))
        .limit(1);

    if (gerente) {
        return { usuarioId: gerente.id, negocioId: datos.negocioId };
    }

    // Fallback al dueño
    return { usuarioId: datos.duenoId, negocioId: datos.negocioId };
}

// =============================================================================
// NOTIFICAR POR TIPO DE ITEM
// =============================================================================

async function notificarItemNegocio(
    sucursalId: string,
    payload: PayloadNotificacionesCoyo,
): Promise<void> {
    try {
        const destinatario = await resolverDestinatarioSucursal(sucursalId);
        if (!destinatario) return;
        if (destinatario.usuarioId === payload.autor.id) return; // auto-notif

        const { titulo, mensaje } = construirTituloYMensaje(payload.textoPregunta);
        const actor = construirActor(payload.autor);

        await crearNotificacion({
            usuarioId: destinatario.usuarioId,
            modo: 'comercial',
            tipo: 'coyo_recomendacion',
            titulo,
            mensaje,
            negocioId: destinatario.negocioId,
            sucursalId,
            referenciaTipo: 'pregunta_comunidad',
            referenciaId: payload.preguntaId,
            actorImagenUrl: actor.actorImagenUrl,
            actorNombre: actor.actorNombre,
        });
    } catch (error) {
        console.warn(
            'notificarItemNegocio: error notificando sucursal',
            sucursalId,
            error,
        );
    }
}

async function notificarItemOferta(
    ofertaId: string,
    payload: PayloadNotificacionesCoyo,
): Promise<void> {
    try {
        // Cargar la oferta para obtener su sucursal
        const [oferta] = await db
            .select({
                id: ofertas.id,
                sucursalId: ofertas.sucursalId,
            })
            .from(ofertas)
            .where(eq(ofertas.id, ofertaId))
            .limit(1);

        if (!oferta?.sucursalId) return;

        const destinatario = await resolverDestinatarioSucursal(oferta.sucursalId);
        if (!destinatario) return;
        if (destinatario.usuarioId === payload.autor.id) return; // auto-notif

        const { titulo, mensaje } = construirTituloYMensaje(payload.textoPregunta);
        const actor = construirActor(payload.autor);

        await crearNotificacion({
            usuarioId: destinatario.usuarioId,
            modo: 'comercial',
            tipo: 'coyo_recomendacion',
            titulo,
            mensaje,
            negocioId: destinatario.negocioId,
            sucursalId: oferta.sucursalId,
            referenciaTipo: 'pregunta_comunidad',
            referenciaId: payload.preguntaId,
            actorImagenUrl: actor.actorImagenUrl,
            actorNombre: actor.actorNombre,
        });
    } catch (error) {
        console.warn(
            'notificarItemOferta: error notificando oferta',
            ofertaId,
            error,
        );
    }
}

async function notificarItemMarketplace(
    articuloId: string,
    payload: PayloadNotificacionesCoyo,
): Promise<void> {
    try {
        const [articulo] = await db
            .select({
                id: articulosMarketplace.id,
                usuarioId: articulosMarketplace.usuarioId,
            })
            .from(articulosMarketplace)
            .where(eq(articulosMarketplace.id, articuloId))
            .limit(1);

        if (!articulo) return;
        if (articulo.usuarioId === payload.autor.id) return; // auto-notif

        const { titulo, mensaje } = construirTituloYMensaje(payload.textoPregunta);
        const actor = construirActor(payload.autor);

        await crearNotificacion({
            usuarioId: articulo.usuarioId,
            modo: 'personal',
            tipo: 'coyo_recomendacion',
            titulo,
            mensaje,
            referenciaTipo: 'pregunta_comunidad',
            referenciaId: payload.preguntaId,
            actorImagenUrl: actor.actorImagenUrl,
            actorNombre: actor.actorNombre,
        });
    } catch (error) {
        console.warn(
            'notificarItemMarketplace: error notificando artículo',
            articuloId,
            error,
        );
    }
}

async function notificarItemServicio(
    publicacionId: string,
    payload: PayloadNotificacionesCoyo,
): Promise<void> {
    try {
        const [publicacion] = await db
            .select({
                id: serviciosPublicaciones.id,
                usuarioId: serviciosPublicaciones.usuarioId,
                tipo: serviciosPublicaciones.tipo,
                sucursalId: serviciosPublicaciones.sucursalId,
            })
            .from(serviciosPublicaciones)
            .where(eq(serviciosPublicaciones.id, publicacionId))
            .limit(1);

        if (!publicacion) return;

        const { titulo, mensaje } = construirTituloYMensaje(payload.textoPregunta);
        const actor = construirActor(payload.autor);

        // `vacante-empresa` siempre tiene sucursalId → modo comercial con
        // gerente/dueño. Los otros tipos (servicio-persona, solicito) son
        // personales → notificar al usuarioId que publicó.
        if (publicacion.tipo === 'vacante-empresa' && publicacion.sucursalId) {
            const destinatario = await resolverDestinatarioSucursal(
                publicacion.sucursalId,
            );
            if (!destinatario) return;
            if (destinatario.usuarioId === payload.autor.id) return;

            await crearNotificacion({
                usuarioId: destinatario.usuarioId,
                modo: 'comercial',
                tipo: 'coyo_recomendacion',
                titulo,
                mensaje,
                negocioId: destinatario.negocioId,
                sucursalId: publicacion.sucursalId,
                referenciaTipo: 'pregunta_comunidad',
                referenciaId: payload.preguntaId,
                actorImagenUrl: actor.actorImagenUrl,
                actorNombre: actor.actorNombre,
            });
            return;
        }

        // servicio-persona / solicito → personal
        if (publicacion.usuarioId === payload.autor.id) return; // auto-notif
        await crearNotificacion({
            usuarioId: publicacion.usuarioId,
            modo: 'personal',
            tipo: 'coyo_recomendacion',
            titulo,
            mensaje,
            referenciaTipo: 'pregunta_comunidad',
            referenciaId: payload.preguntaId,
            actorImagenUrl: actor.actorImagenUrl,
            actorNombre: actor.actorNombre,
        });
    } catch (error) {
        console.warn(
            'notificarItemServicio: error notificando publicación',
            publicacionId,
            error,
        );
    }
}

// =============================================================================
// API PÚBLICA — orquestador llama esto después de marcar `listo`
// =============================================================================

/**
 * Itera los resultados finales (post filtros CASO B / A v2) y notifica a
 * los dueños correspondientes. Llamadas en paralelo con Promise.allSettled
 * para que un fallo individual no afecte al resto.
 *
 * NUNCA lanza. Si todo falla, simplemente no se envían notificaciones —
 * el flujo del orquestador continúa normalmente.
 */
export async function notificarItemsRecomendados(
    payload: PayloadNotificacionesCoyo,
    resultados: ResultadoBusquedaUnificada['resultados'],
): Promise<void> {
    try {
        await Promise.allSettled([
            ...resultados.negocios.items.map((item) =>
                notificarItemNegocio(item.id, payload),
            ),
            ...resultados.ofertas.items.map((item) =>
                notificarItemOferta(item.id, payload),
            ),
            ...resultados.marketplace.items.map((item) =>
                notificarItemMarketplace(item.id, payload),
            ),
            ...resultados.servicios.items.map((item) =>
                notificarItemServicio(item.id, payload),
            ),
        ]);
    } catch (error) {
        // No debería pasar (las funciones internas ya tienen try/catch)
        // pero por defensa.
        console.warn('notificarItemsRecomendados: error inesperado', error);
    }
}

// `isNull` se importa para futuras extensiones (filtrar gerentes sin
// sucursal, etc.) — silenciar warning del lint.
void isNull;
