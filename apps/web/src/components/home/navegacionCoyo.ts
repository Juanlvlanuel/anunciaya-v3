/**
 * navegacionCoyo.ts — Helpers compartidos del Home / Coyo.
 * =========================================================
 * Funciones puras reutilizadas por los componentes del Home (CardItemCoyo,
 * CardPreguntaEditorial) y por la página orquestadora (PaginaInicio). Antes
 * vivían inline en PaginaInicio.tsx; se extrajeron aquí al rediseñar el Home
 * a 2 columnas para no duplicarlas entre componentes.
 *
 * Ubicación: apps/web/src/components/home/navegacionCoyo.ts
 */

import type { ItemCoyo } from '../../types/preguntasComunidad';

/**
 * Ruta del DETALLE de un item recomendado por Coyo (click en una tarjeta).
 *   - negocio     → /negocios/:sucursalId          (item.id = sucursalId)
 *   - oferta      → /ofertas?oferta=:ofertaId       (deep link; la sección abre el modal)
 *   - marketplace → /marketplace/articulo/:articuloId
 *   - servicio    → /servicios/:publicacionId
 *
 * ⚠️ El tipo `oferta` NO usa esta ruta desde el carrusel de Coyo: CardItemCoyo
 * la abre como modal SOBRE el Home (evento `coyo:abrir-oferta` → ModalOfertaCoyo)
 * para que el back regrese a /inicio en vez de dejar al usuario en la lista de
 * /ofertas. Este case se conserva para deep-links / compartir de ofertas.
 */
export function rutaDetalleItemCoyo(item: ItemCoyo): string {
    switch (item.tipo) {
        case 'negocio':
            return `/negocios/${item.id}`;
        case 'oferta':
            return `/ofertas?oferta=${item.id}`;
        case 'marketplace':
            return `/marketplace/articulo/${item.id}`;
        case 'servicio':
            return `/servicios/${item.id}`;
    }
}

/**
 * Heurística para distinguir el sub-tipo de `no_aplica`:
 *   - `vaga`     → Coyo sugiere reformular (texto generado por Gemini con
 *                  instrucciones tipo "prueba", "sé más específico", etc.).
 *   - `no_local` → la pregunta no es búsqueda local; Coyo redirige (texto fijo).
 *
 * El backend guarda ambos como `estado_coyo='no_aplica'` — solo cambia el
 * texto. Si en el futuro se vuelve frágil, se persiste un `subtipoCoyo` en BD.
 */
export function detectarSubtipoNoAplica(texto: string): 'vaga' | 'no_local' {
    const normalizado = texto.toLowerCase();
    const patronesVaga = [
        'prueba',
        'intenta',
        'trata de',
        'reformul',
        'más específic',
        'mas especific',
        'por ejemplo',
        'mejor pregunta',
    ];
    const esVaga = patronesVaga.some((p) => normalizado.includes(p));
    return esVaga ? 'vaga' : 'no_local';
}

/** Iniciales de un usuario para el avatar fallback. */
export function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre || '').trim().charAt(0).toUpperCase();
    const b = (apellidos || '').trim().charAt(0).toUpperCase();
    return a + b || '?';
}

/** Aplana los 4 grupos de resultados de Coyo en una sola lista (máx 3 por
 *  grupo), para el carrusel único del feed editorial. Mantiene el orden
 *  Negocios → Ofertas → MarketPlace → Servicios. */
export function itemsPlanosCoyo(
    resultados: { negocios: { items: ItemCoyo[] }; ofertas: { items: ItemCoyo[] }; marketplace: { items: ItemCoyo[] }; servicios: { items: ItemCoyo[] } } | null,
): ItemCoyo[] {
    if (!resultados) return [];
    return [
        resultados.negocios,
        resultados.ofertas,
        resultados.marketplace,
        resultados.servicios,
    ].flatMap((g) => (g?.items ?? []).slice(0, 3));
}
