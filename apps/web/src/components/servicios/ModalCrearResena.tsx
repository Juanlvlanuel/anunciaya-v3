/**
 * ModalCrearResena.tsx
 * ======================
 * Modal para crear una reseña tras un servicio entregado. Rating 1-5
 * estrellas tap-to-select + textarea opcional 200 chars.
 *
 * Trigger: botón "Dejar reseña" en el detalle de una publicación (visible
 * solo si el usuario actual NO es el dueño y aún no reseñó). Sprint 7.6+
 * también se disparará automáticamente al cerrar conversación en ChatYA
 * con contexto `servicio_publicacion`.
 *
 * Ubicación: apps/web/src/components/servicios/ModalCrearResena.tsx
 */

import { Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCrearResenaServicio } from '../../hooks/queries/useServicios';
import { notificar } from '../../utils/notificaciones';

interface ModalCrearResenaProps {
    open: boolean;
    publicacionId: string;
    /** Nombre corto del prestador para mostrar en el header. */
    nombrePrestador: string;
    onClose: () => void;
    onExito?: () => void;
}

const MAX_TEXTO = 200;

export function ModalCrearResena({
    open,
    publicacionId,
    nombrePrestador,
    onClose,
    onExito,
}: ModalCrearResenaProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [texto, setTexto] = useState('');
    const crearMutation = useCrearResenaServicio();
    const enviando = crearMutation.isPending;

    // Reset al abrir/cerrar
    useEffect(() => {
        if (!open) {
            setRating(0);
            setHoverRating(0);
            setTexto('');
        }
    }, [open]);

    // Bloquear scroll del body cuando está abierto
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    async function enviar() {
        if (rating < 1 || rating > 5 || enviando) return;
        try {
            const res = await crearMutation.mutateAsync({
                publicacionId,
                rating,
                texto: texto.trim() ? texto.trim() : null,
            });
            if (res.success) {
                notificar.exito('¡Gracias por tu reseña!');
                onExito?.();
                onClose();
            } else {
                notificar.error(
                    res.errores?.join(' · ') ??
                        res.message ??
                        'No pudimos guardar tu reseña.',
                );
            }
        } catch {
            notificar.error('Error de red. Intenta de nuevo.');
        }
    }

    const ratingMostrado = hoverRating || rating;
    const labelRating = [
        '',
        'Mala',
        'Regular',
        'Buena',
        'Muy buena',
        'Excelente',
    ][ratingMostrado];

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-10000 flex items-center justify-center px-4"
            style={{
                background: 'rgba(15,23,42,0.42)',
                backdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border-[1.5px] border-slate-200 max-w-md w-full shadow-md"
                style={{
                    boxShadow: '0 28px 56px -20px rgba(15,23,42,0.32)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b-[1.5px] border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Dejar reseña
                        </h2>
                        <p className="text-[13px] text-slate-600 font-medium mt-0.5">
                            Para {nombrePrestador}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="w-9 h-9 rounded-lg grid place-items-center text-slate-600 hover:bg-slate-100 lg:cursor-pointer"
                    >
                        <X className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5 space-y-5">
                    {/* Estrellas */}
                    <div>
                        <span className="block text-[13px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                            ¿Cómo te atendieron?
                        </span>
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => {
                                const lleno = n <= ratingMostrado;
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        data-testid={`resena-estrella-${n}`}
                                        onClick={() => setRating(n)}
                                        onMouseEnter={() => setHoverRating(n)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="p-1 lg:cursor-pointer active:scale-95 transition-transform"
                                        aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
                                    >
                                        <Star
                                            className={
                                                'w-9 h-9 transition-colors ' +
                                                (lleno
                                                    ? 'text-amber-500 fill-amber-400'
                                                    : 'text-slate-300')
                                            }
                                            strokeWidth={1.5}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[14px] font-bold text-amber-700 mt-2 h-5">
                            {labelRating}
                        </p>
                    </div>

                    {/* Textarea */}
                    <div>
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Cuéntale a los vecinos{' '}
                            <span className="font-medium normal-case text-slate-500">
                                (opcional)
                            </span>
                        </label>
                        <textarea
                            data-testid="resena-texto"
                            value={texto}
                            onChange={(e) =>
                                setTexto(e.target.value.slice(0, MAX_TEXTO))
                            }
                            rows={3}
                            placeholder="Ej: Llegó puntual, el trabajo quedó bien y el precio fue justo."
                            className="w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-500 font-medium outline-none resize-none focus:border-sky-500"
                        />
                        <p className="mt-1 text-right text-[12px] text-slate-500 font-medium tabular-nums">
                            {texto.length}/{MAX_TEXTO}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2.5 px-5 pb-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border-[1.5px] border-slate-300 text-slate-700 font-semibold text-[14px] hover:bg-slate-100 lg:cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        data-testid="resena-enviar"
                        disabled={rating < 1 || enviando}
                        onClick={enviar}
                        className={
                            'flex-1 py-3 rounded-xl font-bold text-[14px] lg:cursor-pointer ' +
                            (rating >= 1 && !enviando
                                ? 'bg-linear-to-b from-sky-500 to-sky-700 text-white shadow-cta-sky'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70')
                        }
                    >
                        {enviando ? 'Enviando...' : 'Enviar reseña'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalCrearResena;
