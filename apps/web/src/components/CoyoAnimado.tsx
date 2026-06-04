/**
 * CoyoAnimado.tsx — componente que renderiza a Coyo animado con Rive
 * ===================================================================
 *
 * Reemplaza la imagen estática `Coyo.png` por la mascota animada con state
 * machine (idle + saludo + atento + pensando + respondiendo). La animación
 * vive en `apps/web/public/coyo.riv` (exportado del editor de Rive).
 *
 * Flujo de estados (visual de Coyo):
 *   - `idle`         → respira, parpadea, cola sutil (Layer 1, siempre activa)
 *   - `saludo`       → brazo se mueve al cargar el Home (one-shot, trigger)
 *   - `atento`       → cabeza ladea cuando el usuario escribe (loop)
 *   - `pensando`     → mano en barbilla mientras Gemini procesa (loop)
 *   - `respondiendo` → bocas alternan simulando hablar (loop)
 *
 * Los 3 últimos son booleans en la state machine y se controlan desde el
 * estado de React (ver `useCoyoEstadoVisual`). `saludo` es un trigger
 * (se dispara una sola vez).
 *
 * Mitigación del "bug de boca": al desactivar `respondiendo`, el ciclo puede
 * cortar en un frame donde `boca-cerrada` no esté visible. Para evitarlo,
 * ESPERAMOS a que termine el ciclo natural antes de desactivar el input
 * (~250ms). Si igual queda mal, el cambio a idle/atento/pensando con sus
 * propios keyframes de boca lo restablece.
 *
 * Ubicación: apps/web/src/components/CoyoAnimado.tsx
 */

import { memo, useEffect, useMemo, useRef } from 'react';
import {
    useRive,
    useStateMachineInput,
    Layout,
    Fit,
    Alignment,
    EventType,
} from '@rive-app/react-canvas';

// =============================================================================
// CONSTANTES
// =============================================================================

const RIVE_SRC = '/coyo.riv';
const STATE_MACHINE_NAME = 'State Machine 1';

// Nombres de los inputs (deben coincidir EXACTOS con los del archivo .riv).
const INPUT_SALUDO = 'saludo'; // trigger
const INPUT_ATENTO = 'atento'; // boolean
const INPUT_PENSANDO = 'pensando'; // boolean
const INPUT_RESPONDIENDO = 'respondiendo'; // boolean

/**
 * Estados visuales que el componente reconoce. Cualquier otro valor cae a
 * `idle` (estado base de Coyo: respira, parpadea, mueve la cola sutilmente).
 */
export type EstadoCoyoVisual =
    | 'idle'
    | 'saludo'
    | 'atento'
    | 'pensando'
    | 'respondiendo';

// =============================================================================
// PROPS
// =============================================================================

/**
 * Alineamiento del artboard dentro del contenedor. El hero usa
 * `bottomRight` para que la mano alzada del saludo no se recorte por arriba.
 * Las versiones mini (en las cards) usan `center` para que Coyo quede al
 * centro óptico del contenedor cuadrado.
 */
export type CoyoAlign = 'bottomRight' | 'center';

interface CoyoAnimadoProps {
    /** Estado visual deseado (lo calcula `useCoyoEstadoVisual` o el padre). */
    estado: EstadoCoyoVisual;
    /**
     * Texto alternativo para accesibilidad. El canvas de Rive no tiene
     * semántica nativa; lo wrappeamos con un `aria-label`.
     */
    alt?: string;
    /**
     * Clases Tailwind para el contenedor. Útil para tamaños (`h-40 lg:h-56`).
     * El canvas hereda el tamaño del contenedor.
     */
    className?: string;
    /**
     * Estilos inline adicionales para el contenedor. Útil para filtros
     * (`drop-shadow`) que no se expresan bien en Tailwind sin tema custom.
     */
    style?: React.CSSProperties;
    /**
     * Alineamiento del artboard. Default `bottomRight` (compatible con el
     * uso histórico del hero). Las cards usan `center`.
     */
    align?: CoyoAlign;
}

// =============================================================================
// COMPONENTE
// =============================================================================

/**
 * Renderiza a Coyo animado y conecta el `estado` con los inputs de Rive.
 *
 * Si el archivo `.riv` no carga (404, red, etc.), Rive muestra un canvas
 * vacío — no rompe la página. El padre puede mostrar el PNG como fallback
 * si quiere blindarse más, pero el caso normal es que `/coyo.riv` exista.
 */
function CoyoAnimadoBase({
    estado,
    alt = 'Coyo, asistente de AnunciaYA',
    className,
    style,
    align = 'bottomRight',
}: CoyoAnimadoProps) {
    // `Fit.Contain` + alineamiento configurable. El hero usa `BottomRight`
    // para que la mano alzada del saludo no se recorte por arriba. Las
    // cards mini usan `Center` para que Coyo quede al centro óptico del
    // contenedor cuadrado. Memoizamos el Layout para evitar reInit del
    // runtime en cada render (Rive lo recalcula si la referencia cambia).
    const layout = useMemo(
        () =>
            new Layout({
                fit: Fit.Contain,
                alignment: align === 'center' ? Alignment.Center : Alignment.BottomRight,
            }),
        [align],
    );

    const { rive, RiveComponent } = useRive({
        src: RIVE_SRC,
        stateMachines: STATE_MACHINE_NAME,
        autoplay: true,
        layout,
        // El SVG ya tiene fondo transparente — no le ponemos color de fondo.
    });

    const inputSaludo = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_SALUDO);
    const inputAtento = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_ATENTO);
    const inputPensando = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_PENSANDO);
    const inputRespondiendo = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_RESPONDIENDO);

    useEffect(() => {
        // Si Rive aún no cargó (primer render), no intentamos tocar inputs.
        if (!rive || !inputAtento || !inputPensando || !inputRespondiendo) {
            return;
        }

        // El bug de "Coyo se queda sin boca al salir de respondiendo" se
        // resuelve en el `.riv` con `Exit Time = 1.0` en la transición
        // respondiendo→neutro (Rive completa el ciclo antes de transicionar
        // y siempre acaba en boca-cerrada=100 por Hold).

        // Reset de los 3 booleans antes de activar el nuevo. Garantiza
        // exclusividad — nunca habrá 2 estados activos al mismo tiempo.
        inputAtento.value = false;
        inputPensando.value = false;
        inputRespondiendo.value = false;

        // Activar el nuevo estado. El saludo (trigger) lo maneja su propio
        // efecto de abajo, no este switch.
        switch (estado) {
            case 'atento':
                inputAtento.value = true;
                break;
            case 'pensando':
                inputPensando.value = true;
                break;
            case 'respondiendo':
                inputRespondiendo.value = true;
                break;
            // 'saludo' / 'idle' → todos los booleans en false, queda Layer 1.
        }
    }, [estado, rive, inputAtento, inputPensando, inputRespondiendo]);

    // SALUDO — trigger one-shot al cargar el Home. Timing delicado: al cargar
    // el .riv los inputs (`useStateMachineInput`) se resuelven en renders
    // sucesivos, así que este efecto re-ejecuta varias veces. Dos trampas:
    //   (a) disparar en cada corrida → Coyo se queda "pegado" con la mano alzada
    //       (re-fires que reinician la animación).
    //   (b) disparar con un setTimeout + cleanup → cada re-ejecución cancela el
    //       timer antes de que dispare → el brazo NUNCA se mueve.
    // Solución: marcar el guard en la PRIMERA corrida válida y disparar UNA vez
    // tras un retardo, SIN cleanup que lo cancele. El retardo da tiempo a que la
    // state machine procese su primer frame (si no, el trigger se pierde). El
    // `fire()` usa el input MÁS RECIENTE (ref) para sobrevivir a StrictMode /
    // recargas internas de Rive.
    // Refs frescas para leerlas dentro del listener de Rive sin re-suscribir.
    const inputSaludoRef = useRef(inputSaludo);
    inputSaludoRef.current = inputSaludo;
    const estadoRef = useRef(estado);
    estadoRef.current = estado;
    const saludoYaDisparadoRef = useRef(false);

    // SALUDO — trigger one-shot al cargar el Home. La transición neutro→saludo
    // de la state machine SOLO ocurre si el trigger se dispara cuando la SM ya
    // está en su estado neutro (Layer 2 vacío). Dispararlo a ciegas por tiempo
    // lo pierde (la SM aún no llegó a neutro) y Coyo no mueve el brazo. Por eso
    // escuchamos `StateChange` y disparamos `fire()` en cuanto la SM reporta
    // neutro, UNA sola vez (el guard evita que se quede "pegado" con re-fires).
    useEffect(() => {
        if (!rive) return;
        const onState = (event: { data?: unknown }) => {
            const estados = event.data;
            const enNeutro = Array.isArray(estados) && estados.some((s) => s === '');
            if (
                enNeutro
                && !saludoYaDisparadoRef.current
                && estadoRef.current === 'saludo'
                && inputSaludoRef.current
            ) {
                inputSaludoRef.current.fire();
                saludoYaDisparadoRef.current = true;
            }
        };
        rive.on(EventType.StateChange, onState);
        return () => rive.off(EventType.StateChange, onState);
    }, [rive]);

    return (
        <div
            className={className}
            role="img"
            aria-label={alt}
            style={{ background: 'transparent', ...style }}
        >
            <RiveComponent
                className="w-full h-full"
                style={{ background: 'transparent' }}
            />
        </div>
    );
}

// Memoizado: Coyo (Rive) vive junto al input controlado del Home. Sin memo,
// cada tecla re-renderizaría el runtime de Rive. Con props estables (estado,
// className, style, align), memo lo evita salvo cuando el estado cambia.
export const CoyoAnimado = memo(CoyoAnimadoBase);
export default CoyoAnimado;
