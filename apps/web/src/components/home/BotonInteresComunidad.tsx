/**
 * BotonInteresComunidad.tsx
 * ==========================
 * Botón toggle "Yo también quiero saber" — usado en las cards del feed del
 * Home. Permite a un vecino marcar/quitar su interés en una pregunta que
 * NO es suya. Idempotente y con optimistic update en el hook (`useMarcarInteres`
 * / `useQuitarInteres`).
 *
 * UX:
 *   - Estado base   → icono Sparkles + "Yo también quiero saber" (slate-500).
 *   - Estado activo → icono pintado + "Te avisaremos" (azul) con el contador.
 *   - Click cuando NO está activo → marca (optimistic) + llama API.
 *   - Click cuando SÍ está activo → quita (optimistic) + llama API.
 *
 * Reglas de visibilidad:
 *   - NO se muestra si el usuario actual es el autor de la pregunta (no
 *     tiene sentido auto-marcarse interés).
 *   - NO se muestra si la pregunta no está 'activa' (cerrada/oculta no
 *     reciben actividad).
 *
 * Ubicación: apps/web/src/components/home/BotonInteresComunidad.tsx
 */

import { Sparkles, Loader2 } from 'lucide-react';
import {
    useMarcarInteres,
    useQuitarInteres,
} from '../../hooks/queries/usePreguntasComunidad';
import { notificar } from '../../utils/notificaciones';

interface BotonInteresComunidadProps {
    preguntaId: string;
    yoTambienInteresado: boolean;
    totalInteresados: number;
    /** Si `false`, el botón queda deshabilitado (ej. pregunta cerrada). */
    deshabilitado?: boolean;
}

export function BotonInteresComunidad({
    preguntaId,
    yoTambienInteresado,
    totalInteresados,
    deshabilitado = false,
}: BotonInteresComunidadProps) {
    const marcar = useMarcarInteres();
    const quitar = useQuitarInteres();

    const isLoading = marcar.isPending || quitar.isPending;
    const activo = yoTambienInteresado;

    const handleClick = () => {
        if (isLoading || deshabilitado) return;
        const onError = (err: unknown) => {
            const mensaje =
                err instanceof Error ? err.message : 'No se pudo actualizar el interés';
            notificar.error(mensaje);
        };
        if (activo) {
            quitar.mutate(preguntaId, { onError });
        } else {
            marcar.mutate(preguntaId, { onError });
        }
    };

    // Texto del botón según estado. En móvil se usa una versión corta
    // ("Me interesa") y en laptop/desktop la larga ("Yo también quiero saber").
    const sufijo = totalInteresados > 0 ? ` · ${totalInteresados}` : '';
    const textoActivo = activo && totalInteresados > 1 ? `Te avisaremos · ${totalInteresados}` : 'Te avisaremos';
    const textoLargo = `Yo también quiero saber${sufijo}`;
    const textoCorto = `Me interesa${sufijo}`;

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isLoading || deshabilitado}
            data-testid={`pregunta-interes-${preguntaId}`}
            aria-pressed={activo}
            aria-label={
                activo
                    ? 'Quitar mi interés en esta pregunta'
                    : 'Marcar que yo también quiero saber'
            }
            className={[
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-full',
                'text-sm lg:text-xs 2xl:text-sm font-semibold',
                'lg:cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
                activo
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
            ].join(' ')}
        >
            {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
                <Sparkles
                    className={`w-3.5 h-3.5 shrink-0 ${activo ? 'text-blue-600' : 'text-slate-600'}`}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    fill={activo ? 'currentColor' : 'none'}
                />
            )}
            {activo ? (
                <span>{textoActivo}</span>
            ) : (
                <>
                    <span className="lg:hidden">{textoCorto}</span>
                    <span className="hidden lg:inline">{textoLargo}</span>
                </>
            )}
        </button>
    );
}

export default BotonInteresComunidad;
