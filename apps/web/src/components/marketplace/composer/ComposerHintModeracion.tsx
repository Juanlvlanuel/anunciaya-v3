/**
 * ComposerHintModeracion.tsx (MarketPlace)
 * ==========================================
 * Hint inline que aparece bajo la descripción del composer MP cuando el
 * texto contiene palabras típicas de un servicio ("ofrezco", "reparo",
 * "clases", etc.) o de una búsqueda ("busco", "necesito"). Sugiere
 * amablemente la sección correcta:
 *   - Detectado servicio  → ir a Servicios (`/servicios?crear=ofrezco`).
 *   - Detectado búsqueda → ir a Home (Pregúntale a Peñasco).
 *
 * Es la contraparte de `components/servicios/composer/ComposerHintModeracion.tsx`
 * que sugiere ir a MarketPlace cuando se detecta venta dentro de Servicios.
 *
 * Detección con debounce 600ms — no spamea mientras escribe.
 *
 * Reemplaza al `ModalSugerenciaModeracion` que aparecía POST-publicar (mal
 * UX porque el usuario ya invirtió esfuerzo). El hint interviene cuando
 * aún se puede redirigir sin pérdida.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerHintModeracion.tsx
 */

import { useEffect, useState } from 'react';
import { Wrench, Search, X } from 'lucide-react';
import {
    pareceServicio,
    pareceBusqueda,
} from '../../../utils/deteccionServicio';
import type { ModoArticulo } from '../../../types/marketplace';

interface ComposerHintModeracionProps {
    /** Concatenación de título + descripción del draft actual. */
    texto: string;
    /** Modo actual del composer. En 'busco' no se sugiere "búsqueda". */
    modo: ModoArticulo;
    onIrServicios: () => void;
    /** En modo 'vendo', si el texto parece búsqueda, ofrece cambiar a Busco. */
    onCambiarABusco: () => void;
}

type Sugerencia = 'servicio' | 'busqueda' | null;

export function ComposerHintModeracion({
    texto,
    modo,
    onIrServicios,
    onCambiarABusco,
}: ComposerHintModeracionProps) {
    const [debounced, setDebounced] = useState(texto);
    const [descartado, setDescartado] = useState(false);

    // Debounce 600ms para no detonar el hint en cada tecla.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(texto), 600);
        return () => clearTimeout(t);
    }, [texto]);

    // Prioridad: servicio > búsqueda. Un texto puede matchear ambos
    // (ej. "busco quien me ofrezca clases"); priorizamos la categoría
    // más útil para el usuario. En modo 'busco' NO se sugiere "búsqueda"
    // (publicar una demanda es justo lo que el usuario quiere).
    const sugerencia: Sugerencia = pareceServicio(debounced)
        ? 'servicio'
        : modo === 'vendo' && pareceBusqueda(debounced)
          ? 'busqueda'
          : null;

    // Si el usuario edita el texto después de descartar el hint, le damos
    // otra oportunidad: reseteamos el "descartado" cuando cambia la
    // detección.
    useEffect(() => {
        if (!sugerencia) setDescartado(false);
    }, [sugerencia]);

    if (!sugerencia || descartado) return null;

    const esServicio = sugerencia === 'servicio';
    const Icono = esServicio ? Wrench : Search;
    const mensaje = esServicio ? (
        <>
            Esto parece un servicio. Te va mejor en{' '}
            <span className="font-bold">Servicios</span> — ahí lo encuentran
            quienes buscan contratar.
        </>
    ) : (
        <>
            ¿Querías buscar en lugar de vender? Cambia al modo{' '}
            <span className="font-bold">Busco</span> y publícalo aquí mismo.
        </>
    );
    const labelBoton = esServicio ? 'Llévame a Servicios' : 'Cambiar a Busco';
    const onIr = esServicio ? onIrServicios : onCambiarABusco;

    return (
        <div
            data-testid="composer-mp-hint-moderacion"
            className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5"
        >
            <div className="shrink-0 mt-0.5 text-amber-700">💡</div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-amber-900 leading-snug">
                    {mensaje}
                </p>
                <button
                    type="button"
                    data-testid={
                        esServicio
                            ? 'composer-mp-hint-ir-servicios'
                            : 'composer-mp-hint-cambiar-busco'
                    }
                    onClick={onIr}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-600 text-white text-[12px] font-bold lg:cursor-pointer hover:bg-amber-700"
                >
                    <Icono className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {labelBoton}
                </button>
            </div>
            <button
                type="button"
                aria-label="Ignorar sugerencia"
                onClick={() => setDescartado(true)}
                className="shrink-0 -mt-0.5 -mr-0.5 w-6 h-6 grid place-items-center text-amber-700 hover:bg-amber-100 rounded-full lg:cursor-pointer"
            >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default ComposerHintModeracion;
