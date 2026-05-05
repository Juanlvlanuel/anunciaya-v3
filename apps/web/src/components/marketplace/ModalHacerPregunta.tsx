/**
 * ModalHacerPregunta.tsx
 * =======================
 * Modal para que el comprador haga una pregunta pública sobre el artículo.
 *
 * Sprint 9.2 — doc: docs/reportes/Sprint-9.2-Plan-Implementacion.md
 *
 * Ubicación: apps/web/src/components/marketplace/ModalHacerPregunta.tsx
 */

import { useState } from 'react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useCrearPregunta } from '../../hooks/queries/useMarketplace';
import { notificar } from '../../utils/notificaciones';

interface ModalHacerPreguntaProps {
    abierto: boolean;
    articuloId: string;
    onCerrar: () => void;
}

export function ModalHacerPregunta({ abierto, articuloId, onCerrar }: ModalHacerPreguntaProps) {
    const [texto, setTexto] = useState('');
    const [errorModeracion, setErrorModeracion] = useState<string | null>(null);
    const crearMutation = useCrearPregunta();

    const handleCerrar = () => {
        setTexto('');
        setErrorModeracion(null);
        onCerrar();
    };

    const handleEnviar = async () => {
        setErrorModeracion(null);
        try {
            await crearMutation.mutateAsync({ articuloId, pregunta: texto.trim() });
            notificar.exito('Tu pregunta fue enviada. El vendedor responderá pronto.');
            handleCerrar();
        } catch (e) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            const mensaje =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            if (status === 409) {
                notificar.info('Ya tienes una pregunta en esta publicación');
                handleCerrar();
            } else if (status === 422) {
                setErrorModeracion(mensaje ?? 'Tu pregunta contiene contenido no permitido');
            } else if (status === 403) {
                notificar.info('No puedes preguntar sobre tu propio artículo');
                handleCerrar();
            } else {
                notificar.error('No se pudo enviar la pregunta. Intenta de nuevo.');
            }
        }
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={handleCerrar}
            titulo="Hacer una pregunta"
            ancho="md"
        >
            <div data-testid="modal-hacer-pregunta" className="space-y-4">
                <p className="text-xs text-slate-500">
                    Tu pregunta será visible para todos. Si es algo personal, mejor envía un mensaje al vendedor.
                </p>

                <div className="space-y-1">
                    <textarea
                        data-testid="textarea-pregunta"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder="Escribe tu pregunta..."
                        maxLength={200}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <div className="flex items-center justify-between">
                        {errorModeracion ? (
                            <p className="text-xs text-rose-600">{errorModeracion}</p>
                        ) : (
                            <span />
                        )}
                        <span className="text-xs text-slate-400">{texto.length}/200</span>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleCerrar}
                        className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        data-testid="btn-enviar-pregunta"
                        onClick={handleEnviar}
                        disabled={texto.trim().length < 10 || crearMutation.isPending}
                        className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                    >
                        {crearMutation.isPending ? 'Enviando…' : 'Enviar pregunta'}
                    </button>
                </div>
            </div>
        </ModalAdaptativo>
    );
}
