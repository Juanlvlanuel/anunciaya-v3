/**
 * asistente.service.ts — Orquesta un turno del Asistente Coyo (FAB global)
 * ==========================================================================
 * Decide qué hacer con lo que interpretó `interpretarPeticionAsistente`
 * (coyoIA.service.ts): ejecutar una capacidad del catálogo (navegar, armar
 * borrador de MarketPlace, buscar información) o devolver la pregunta de
 * aclaración de Coyo tal cual, para que el controller solo la reenvíe.
 *
 * `responderBusquedaAsistente` reusa las MISMAS piezas que el orquestador de
 * "Pregúntale a Peñasco" (`coyo/orquestador.ts`): interpretarPregunta →
 * buscarEnTodaLaApp → redactarRespuestaCoyo. No reusa el orquestador
 * completo porque ese está armado para el flujo asíncrono que escribe en
 * `preguntas_comunidad` y notifica — el FAB es una consulta síncrona que
 * nunca debe crear una pregunta pública.
 *
 * Ubicación: apps/api/src/services/asistente/asistente.service.ts
 */

import {
    interpretarPeticionAsistente,
    interpretarPregunta,
    redactarRespuestaCoyo,
    type TurnoChatAsistente,
    type ContextoAppAsistente,
} from '../coyo/coyoIA.service.js';
import { buscarEnTodaLaApp, type ResultadoBusquedaUnificada } from '../coyo/buscadorUnificado.js';
import { resolverDestino } from './capacidades.js';

// =============================================================================
// TIPOS
// =============================================================================

export type ResultadoAsistenteFrontend =
    | { tipo: 'pregunta'; texto: string }
    | { tipo: 'respuesta'; texto: string; resultados: ResultadoBusquedaUnificada['resultados'] | null }
    | { tipo: 'navegar'; ruta: string }
    | {
          tipo: 'prefill_marketplace';
          ruta: string;
          modo: 'vendo' | 'busco';
          descripcionArticulo: string;
          precio?: number;
      };

export interface DatosBusquedaAsistente {
    ciudad: string | null;
    lat?: number;
    lng?: number;
    usuarioId: string | null;
}

// =============================================================================
// TEXTOS FIJOS
// =============================================================================

const TEXTO_NO_DISPONIBLE =
    'Ahorita no puedo ayudarte con eso, ¿lo intentamos de nuevo en un momento?';
const TEXTO_SIN_CIUDAD =
    'Antes de buscar necesito saber tu ciudad — activa tu ubicación e intenta de nuevo.';
const TEXTO_NO_SE_HACER_AUN =
    'Todavía no sé hacer eso, pero pronto voy a poder ayudarte con más cosas por aquí.';
const TEXTO_REDIRECCION_NO_LOCAL =
    'Para eso no soy bueno, pero si buscas algo aquí en tu ciudad, dime y te ayudo a buscar.';
const TEXTO_DESTINO_DESCONOCIDO =
    'No encontré esa sección, ¿me dices con otras palabras a dónde quieres ir?';

// =============================================================================
// buscar_informacion — mismas piezas que "Pregúntale a Peñasco", sin BD
// =============================================================================

async function responderBusquedaAsistente(
    pregunta: string,
    datos: DatosBusquedaAsistente,
): Promise<ResultadoAsistenteFrontend> {
    if (!datos.ciudad) return { tipo: 'pregunta', texto: TEXTO_SIN_CIUDAD };

    const interpretacion = await interpretarPregunta(pregunta);
    if (!interpretacion.disponible) {
        return { tipo: 'pregunta', texto: TEXTO_NO_DISPONIBLE };
    }

    if (interpretacion.data.tipo === 'inapropiada' || interpretacion.data.tipo === 'no_local') {
        return { tipo: 'respuesta', texto: TEXTO_REDIRECCION_NO_LOCAL, resultados: null };
    }
    if (interpretacion.data.tipo === 'vaga') {
        return {
            tipo: 'respuesta',
            texto: interpretacion.data.mensajeReformular.trim() || TEXTO_REDIRECCION_NO_LOCAL,
            resultados: null,
        };
    }

    const resultadoBusqueda = await buscarEnTodaLaApp({
        q: interpretacion.data.terminos,
        ciudad: datos.ciudad,
        lat: datos.lat,
        lng: datos.lng,
        usuarioId: datos.usuarioId,
        intencion: interpretacion.data.intencion,
        esEmpleo: interpretacion.data.esEmpleo,
    });

    const redaccion = await redactarRespuestaCoyo(
        pregunta,
        resultadoBusqueda.resultados,
        interpretacion.data.intencion,
        interpretacion.data.esEmpleo,
    );
    const texto = redaccion.disponible ? redaccion.data : 'Mira lo que encontré:';

    return { tipo: 'respuesta', texto, resultados: resultadoBusqueda.resultados };
}

// =============================================================================
// FUNCIÓN PRINCIPAL — un turno completo del asistente
// =============================================================================

/**
 * Interpreta un turno del Asistente Coyo y devuelve lo que el frontend debe
 * hacer: mostrar una pregunta de aclaración, mostrar una respuesta de
 * búsqueda, navegar a una ruta, o abrir el composer de MarketPlace
 * prellenado. Nunca lanza — cualquier caso no disponible cae a un texto
 * cálido, igual que el resto de la cajita de Coyo.
 */
export async function ejecutarPeticionAsistente(
    turnoActual: { texto?: string; audioBase64?: string; audioMimeType?: string },
    historial: TurnoChatAsistente[],
    contextoApp: ContextoAppAsistente,
    datosBusqueda: DatosBusquedaAsistente,
): Promise<ResultadoAsistenteFrontend> {
    const interpretacion = await interpretarPeticionAsistente(turnoActual, historial, contextoApp);
    if (!interpretacion.disponible) {
        return { tipo: 'pregunta', texto: TEXTO_NO_DISPONIBLE };
    }

    const { data } = interpretacion;
    if (data.tipo === 'pregunta') {
        return { tipo: 'pregunta', texto: data.texto };
    }

    switch (data.capacidad) {
        case 'navegar_a_destino': {
            const destino = typeof data.parametros.destino === 'string' ? data.parametros.destino : '';
            const ruta = resolverDestino(destino);
            if (!ruta) return { tipo: 'pregunta', texto: TEXTO_DESTINO_DESCONOCIDO };
            return { tipo: 'navegar', ruta };
        }
        case 'crear_publicacion_marketplace': {
            const modo = data.parametros.modo === 'busco' ? 'busco' : 'vendo';
            const descripcionArticulo =
                typeof data.parametros.descripcionArticulo === 'string'
                    ? data.parametros.descripcionArticulo
                    : '';
            const precio =
                typeof data.parametros.precio === 'number' ? data.parametros.precio : undefined;
            return {
                tipo: 'prefill_marketplace',
                ruta: modo === 'busco' ? '/marketplace?crear=busco' : '/marketplace?crear=vendo',
                modo,
                descripcionArticulo,
                precio,
            };
        }
        case 'buscar_informacion': {
            const pregunta =
                typeof data.parametros.pregunta === 'string'
                    ? data.parametros.pregunta
                    : turnoActual.texto ?? '';
            return responderBusquedaAsistente(pregunta, datosBusqueda);
        }
        default:
            return { tipo: 'pregunta', texto: TEXTO_NO_SE_HACER_AUN };
    }
}
