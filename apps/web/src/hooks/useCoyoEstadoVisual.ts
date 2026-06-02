/**
 * useCoyoEstadoVisual.ts — calcula el estado visual de Coyo (Home)
 * =================================================================
 *
 * Mapea el estado de la app del Home a uno de los 5 estados visuales que
 * Coyo (componente Rive) entiende:
 *
 *   - `saludo`       → al cargar el Home (one-shot, dura ~2s).
 *   - `atento`       → usuario escribiendo en el input de pregunta.
 *   - `pensando`     → hay alguna pregunta del usuario en pendiente/procesando,
 *                       o crear.isPending (acaba de presionar "Preguntar").
 *   - `respondiendo` → una pregunta del usuario acaba de pasar a `listo`
 *                       (Coyo "habla" mientras el texto se renderiza).
 *   - `idle`         → estado por defecto: Coyo respira/parpadea sin hacer
 *                       nada más.
 *
 * Decisión: "pregunta del usuario" = pregunta con `autorId === usuario.id`.
 * Si el feed trae preguntas de otros vecinos, no afectan a Coyo (el Coyo
 * del hero es del usuario actual, no un termómetro global del feed).
 *
 * Ubicación: apps/web/src/hooks/useCoyoEstadoVisual.ts
 */

import { useEffect, useRef, useState } from 'react';
import type { EstadoCoyoVisual } from '../components/CoyoAnimado';
import type { PreguntaComunidad } from '../types/preguntasComunidad';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Duración del estado "saludo" al cargar el Home. Debe ser ≥ la duración
 *  de la animación de saludo en el .riv (~1.5s) más un pequeño margen. */
const SALUDO_DURACION_MS = 2500;

/** Cuánto dura el estado "respondiendo" después de que llega una respuesta.
 *  Tiempo aproximado en que Coyo "habla". Después del input apagado, Rive
 *  todavía espera el Exit Time del ciclo (~1s), así que la duración total
 *  visible es esta constante + ~1s. */
const RESPONDIENDO_DURACION_MS = 2500;

/** Retardo antes de bajar a `idle`. Si en este lapso aparece otro estado
 *  activo, el idle transitorio no se renderiza — elimina los micro-flashes
 *  de idle entre estados (pensando↔respondiendo, gap post-crear). El costo
 *  es ~este tiempo extra para volver a respirar al borrar el texto. */
const IDLE_DELAY_MS = 250;

// =============================================================================
// HOOK
// =============================================================================

interface UseCoyoEstadoVisualParams {
    /** ID del usuario actual. Si es undefined, no se calculan estados que
     *  dependan del autor de la pregunta. */
    usuarioId: string | undefined;
    /** Texto actual del input de pregunta. Si tiene contenido → atento. */
    textoInput: string;
    /** Si la mutación de crear pregunta está en vuelo → pensando. */
    crearPendiente: boolean;
    /** Feed de preguntas (incluye las del usuario y otros vecinos). */
    preguntas: PreguntaComunidad[] | undefined;
}

/**
 * Devuelve el estado visual actual de Coyo. Se recalcula cada vez que
 * cambia alguno de los parámetros.
 *
 * Internamente:
 *   - Dispara `saludo` 1 vez al montar (con `useRef` para no repetir).
 *   - Dispara `respondiendo` cuando detecta que una pregunta del usuario
 *     pasó de procesando → listo (la guarda en un Set para no repetir).
 *   - El resto se calcula de los parámetros directos.
 */
export function useCoyoEstadoVisual({
    usuarioId,
    textoInput,
    crearPendiente,
    preguntas,
}: UseCoyoEstadoVisualParams): EstadoCoyoVisual {
    // ──────────────────────────────────────────────────────────────────
    // SALUDO — al montar el Home, durante SALUDO_DURACION_MS.
    //
    // No usamos un `useRef` con flag "ya disparado" porque React StrictMode
    // ejecuta los efectos 2 veces en dev: la primera ejecución cancela el
    // timer en el cleanup, y la segunda quedaría bloqueada por el flag.
    // Resultado: el saludo no se apagaría nunca y Coyo se quedaría con la
    // mano alzada. Mejor dejar que el efecto se ejecute las veces que sea
    // necesario — setTimeout siempre cierra correctamente con el último
    // cleanup, sin efectos secundarios.
    // ──────────────────────────────────────────────────────────────────
    const [mostrandoSaludo, setMostrandoSaludo] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMostrandoSaludo(false);
        }, SALUDO_DURACION_MS);
        return () => clearTimeout(timer);
    }, []);

    // ──────────────────────────────────────────────────────────────────
    // RESPONDIENDO — detectar transición de pregunta del usuario:
    // procesando → listo. Cuando detecta una nueva, activa respondiendo
    // por RESPONDIENDO_DURACION_MS.
    //
    // Usamos un Set con los IDs de preguntas listas YA conocidas. Al
    // primer render del feed, llenamos el Set con lo que venga (para no
    // disparar respondiendo por preguntas viejas del usuario que ya
    // estaban listas antes de cargar la página).
    // ──────────────────────────────────────────────────────────────────
    const [mostrandoRespondiendo, setMostrandoRespondiendo] = useState(false);
    const preguntasListasConocidasRef = useRef<Set<string>>(new Set());
    const feedInicializadoRef = useRef(false);

    useEffect(() => {
        if (!preguntas || !usuarioId) return;

        // Primer fetch del feed: sembrar el Set con las preguntas del
        // usuario que YA están listas. No disparamos respondiendo por
        // ellas — son históricas.
        if (!feedInicializadoRef.current) {
            for (const p of preguntas) {
                if (p.autorId === usuarioId && p.estadoCoyo === 'listo') {
                    preguntasListasConocidasRef.current.add(p.id);
                }
            }
            feedInicializadoRef.current = true;
            return;
        }

        // Fetches posteriores: detectar preguntas del usuario que pasaron
        // a listo recién (no estaban en el Set).
        const nuevasListas = preguntas.filter(
            (p) =>
                p.autorId === usuarioId
                && p.estadoCoyo === 'listo'
                && !preguntasListasConocidasRef.current.has(p.id)
        );

        if (nuevasListas.length === 0) return;

        for (const p of nuevasListas) {
            preguntasListasConocidasRef.current.add(p.id);
        }

        setMostrandoRespondiendo(true);
        const timer = setTimeout(() => {
            setMostrandoRespondiendo(false);
        }, RESPONDIENDO_DURACION_MS);
        return () => clearTimeout(timer);
    }, [preguntas, usuarioId]);

    // ──────────────────────────────────────────────────────────────────
    // PENSANDO FORZADO POST-CREAR — cubre el hueco de red entre que se
    // publica la pregunta (el POST termina, onSuccess limpia el input y
    // `crearPendiente` vuelve a false) y que el refetch del feed la trae
    // como 'pendiente'. Sin esto, Coyo cae a `idle` durante ese viaje de
    // red (cientos de ms) y se ve atento→idle→pensando. El suavizado de
    // idle (250ms) no alcanza a tapar el roundtrip; esta señal sí.
    // ──────────────────────────────────────────────────────────────────
    const [pensandoForzado, setPensandoForzado] = useState(false);
    const crearPendienteAnteriorRef = useRef(false);

    // Se enciende al arrancar una creación (crearPendiente false→true).
    useEffect(() => {
        if (crearPendiente && !crearPendienteAnteriorRef.current) {
            setPensandoForzado(true);
        }
        crearPendienteAnteriorRef.current = crearPendiente;
    }, [crearPendiente]);

    // ──────────────────────────────────────────────────────────────────
    // CÁLCULO DEL ESTADO DESEADO — prioridad de mayor a menor.
    //
    // Orden: saludo > respondiendo > pensando > atento > idle.
    // (saludo gana porque es el "primer impacto" del Home y dura poco.)
    // ──────────────────────────────────────────────────────────────────

    // ¿Hay una pregunta del usuario procesándose en el feed?
    const hayPreguntaProcesandoEnFeed =
        !!preguntas
        && !!usuarioId
        && preguntas.some(
            (p) =>
                p.autorId === usuarioId
                && (p.estadoCoyo === 'pendiente' || p.estadoCoyo === 'procesando')
        );

    // Apaga el pensando forzado cuando la pregunta ya aparece en el feed
    // (el flujo normal toma el relevo) o tras un timeout de seguridad
    // (por si la creación falló y la pregunta nunca llega al feed).
    useEffect(() => {
        if (!pensandoForzado) return;
        if (hayPreguntaProcesandoEnFeed) {
            setPensandoForzado(false);
            return;
        }
        const timer = setTimeout(() => setPensandoForzado(false), 8000);
        return () => clearTimeout(timer);
    }, [pensandoForzado, hayPreguntaProcesandoEnFeed]);

    // Pensando: mutación en vuelo, hueco post-crear, o pregunta del
    // usuario aún procesándose en el feed.
    const hayPensando =
        crearPendiente || pensandoForzado || hayPreguntaProcesandoEnFeed;

    let estadoDeseado: EstadoCoyoVisual;
    if (mostrandoSaludo) {
        estadoDeseado = 'saludo';
    } else if (mostrandoRespondiendo) {
        estadoDeseado = 'respondiendo';
    } else if (hayPensando) {
        estadoDeseado = 'pensando';
    } else if (textoInput.trim().length > 0) {
        // Atento: mientras haya texto en el input, Coyo ladea la cabeza
        // (no solo mientras teclea — la condición es "hay texto", así que
        // se mantiene atento aunque el usuario deje de escribir un momento).
        estadoDeseado = 'atento';
    } else {
        estadoDeseado = 'idle';
    }

    // ──────────────────────────────────────────────────────────────────
    // SUAVIZADO DE LA CAÍDA A IDLE — evita el parpadeo entre estados.
    //
    // Los estados activos (saludo/respondiendo/pensando/atento) se aplican
    // de inmediato. La bajada a `idle` se retrasa IDLE_DELAY_MS: si en ese
    // lapso aparece otro estado activo, el idle transitorio NUNCA se
    // renderiza. Esto mata los micro-flashes de idle que se colaban entre
    // pensando↔respondiendo (respondiendo se enciende un render tarde) y en
    // el gap post-crear (refetch del feed).
    // ──────────────────────────────────────────────────────────────────
    const [estadoVisible, setEstadoVisible] = useState<EstadoCoyoVisual>('saludo');

    useEffect(() => {
        if (estadoDeseado !== 'idle') {
            setEstadoVisible(estadoDeseado);
            return;
        }
        const timer = setTimeout(() => setEstadoVisible('idle'), IDLE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [estadoDeseado]);

    return estadoVisible;
}
