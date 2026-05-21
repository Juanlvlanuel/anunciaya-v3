/**
 * ComposerHintModeracion.tsx
 * ============================
 * Hint inline que aparece bajo el textarea cuando el texto del composer
 * contiene palabras típicas de venta de objetos ("vendo", "remato",
 * etc.). Sugiere amablemente ir a MarketPlace en lugar de Servicios.
 *
 * Detección con debounce 600ms — no spamea mientras escribe.
 *
 * Reemplaza al `ModalSugerenciaSeccion` que aparecía POST-publicar (mal
 * UX porque el usuario ya invirtió esfuerzo). El hint interviene cuando
 * aún se puede redirigir sin pérdida.
 *
 * El usuario decide:
 *   - Ignorar: sigue escribiendo, publica normal en Servicios.
 *   - Aceptar: cerramos el composer y navegamos a /marketplace/publicar.
 *
 * Si el backend igual devuelve 409 (red de seguridad), el composer lo
 * trata como advertencia genérica (no como bloqueo).
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerHintModeracion.tsx
 */

import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { pareceVenta } from '../../../utils/deteccionVenta';

interface ComposerHintModeracionProps {
    /** Concatenación de título + descripción del draft actual. */
    texto: string;
    onIrMarketplace: () => void;
}

export function ComposerHintModeracion({
    texto,
    onIrMarketplace,
}: ComposerHintModeracionProps) {
    const [debounced, setDebounced] = useState(texto);
    const [descartado, setDescartado] = useState(false);

    // Debounce 600ms para no detonar el hint en cada tecla.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(texto), 600);
        return () => clearTimeout(t);
    }, [texto]);

    // Si el usuario edita el texto después de descartar el hint, le damos
    // otra oportunidad: reseteamos el "descartado" cuando cambia la
    // detección. Sin esto, descartar una vez silencia el hint para
    // siempre dentro de la misma sesión del composer.
    const detectado = pareceVenta(debounced);
    useEffect(() => {
        if (!detectado) setDescartado(false);
    }, [detectado]);

    if (!detectado || descartado) return null;

    return (
        <div
            data-testid="composer-hint-moderacion"
            className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5"
        >
            <div className="shrink-0 mt-0.5 text-amber-700">💡</div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-amber-900 leading-snug">
                    Si estás vendiendo un objeto, te va mejor en{' '}
                    <span className="font-bold">MarketPlace</span> — ahí lo
                    encuentran quienes buscan comprar.
                </p>
                <button
                    type="button"
                    data-testid="composer-hint-ir-mp"
                    onClick={onIrMarketplace}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-600 text-white text-[12px] font-bold lg:cursor-pointer hover:bg-amber-700"
                >
                    <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Llévame a MarketPlace
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
