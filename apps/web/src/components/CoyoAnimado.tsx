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

import { memo, useEffect, useMemo } from 'react';
import {
    useRive,
    useStateMachineInput,
    Layout,
    Fit,
    Alignment,
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
        if (!rive || !inputSaludo || !inputAtento || !inputPensando || !inputRespondiendo) {
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

        // Activar el nuevo estado.
        switch (estado) {
            case 'saludo':
                // Trigger: dispara una vez, la state machine vuelve sola.
                inputSaludo.fire();
                break;
            case 'atento':
                inputAtento.value = true;
                break;
            case 'pensando':
                inputPensando.value = true;
                break;
            case 'respondiendo':
                inputRespondiendo.value = true;
                break;
            // 'idle' → todos los booleans en false, queda solo Layer 1.
        }
    }, [estado, rive, inputSaludo, inputAtento, inputPensando, inputRespondiendo]);

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
