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
    // CÁLCULO DEL ESTADO FINAL — prioridad de mayor a menor.
    //
    // Orden: saludo > respondiendo > pensando > atento > idle.
    // (saludo gana porque es el "primer impacto" del Home y dura poco.)
    // ──────────────────────────────────────────────────────────────────

    if (mostrandoSaludo) return 'saludo';

    if (mostrandoRespondiendo) return 'respondiendo';

    // Pensando: si la mutación de crear está en vuelo, o hay alguna
    // pregunta del usuario que aún está procesando.
    const hayPensando =
        crearPendiente
        || (!!preguntas
            && !!usuarioId
            && preguntas.some(
                (p) =>
                    p.autorId === usuarioId
                    && (p.estadoCoyo === 'pendiente' || p.estadoCoyo === 'procesando')
            ));
    if (hayPensando) return 'pensando';

    // NOTA: el estado `atento` se eliminó del flujo. La transición
    // atento→pensando al presionar Enter era tan rápida (<200ms) que el
    // ojo no la percibía y daba sensación de "brinco". Manteniendo solo
    // saludo/pensando/respondiendo/idle, el flujo se siente más fluido.
    // Si en el futuro se quiere recuperar atento con una animación más
    // visible, agregar el return 'atento' aquí.
    void textoInput;

    return 'idle';
}
