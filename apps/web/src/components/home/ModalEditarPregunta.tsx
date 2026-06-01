/**
 * ModalEditarPregunta.tsx
 * =========================
 * Modal para editar el texto de UNA pregunta del Home.
 *
 * Reglas de producto:
 *   - Solo permitido si la pregunta NO tiene respuestas activas. El padre
 *     (MenuAutorPregunta) ya filtra "Editar" del menú si `totalRespuestas>0`,
 *     pero el backend también lo valida y devuelve 409. Este modal asume
 *     que la regla se cumple al abrir.
 *   - El backend re-dispara Coyo con el texto nuevo (resetea estadoCoyo a
 *     'pendiente'), así que al cerrar el modal Coyo vuelve a "pensar" en
 *     la card. No hace falta nada extra en el frontend para eso.
 *
 * Ubicación: apps/web/src/components/home/ModalEditarPregunta.tsx
 */

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useEditarMiPregunta } from '../../hooks/queries/usePreguntasComunidad';
import { notificar } from '../../utils/notificaciones';

const TEXTO_MAX_PREGUNTA = 500;

interface ModalEditarPreguntaProps {
    abierto: boolean;
    onCerrar: () => void;
    preguntaId: string;
    textoInicial: string;
}

export function ModalEditarPregunta({
    abierto,
    onCerrar,
    preguntaId,
    textoInicial,
}: ModalEditarPreguntaProps) {
    const [texto, setTexto] = useState(textoInicial);
    const editar = useEditarMiPregunta();

    // Si el padre cambia `textoInicial` (poco probable porque el modal se
    // abre con un único preguntaId, pero defensivo), resincronizamos.
    // También al re-abrir el modal con un valor diferente.
    useEffect(() => {
        if (abierto) {
            setTexto(textoInicial);
        }
    }, [abierto, textoInicial]);

    const textoTrimmed = texto.trim();
    const hubocambios = textoTrimmed !== textoInicial.trim();
    const puedeGuardar =
        textoTrimmed.length > 0 && hubocambios && !editar.isPending;

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!puedeGuardar) return;
        editar.mutate(
            { preguntaId, textoNuevo: textoTrimmed },
            {
                onSuccess: () => {
                    notificar.exito('Pregunta actualizada — Coyo está re-procesando');
                    onCerrar();
                },
                onError: (err) => {
                    const mensaje =
                        err instanceof Error ? err.message : 'No se pudo editar la pregunta';
                    notificar.error(mensaje);
                },
            },
        );
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            titulo={
                <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" strokeWidth={2.5} />
                    <span>Editar pregunta</span>
                </div>
            }
            ancho="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4 p-4 lg:p-5">
                <p className="text-sm lg:text-base text-slate-600">
                    Puedes mejorar tu pregunta mientras nadie haya respondido. Si la
                    cambias mucho, Coyo la va a re-procesar con el texto nuevo.
                </p>

                <div className="space-y-1.5">
                    <label
                        htmlFor={`editar-pregunta-${preguntaId}`}
                        className="text-xs lg:text-sm font-bold text-slate-700"
                    >
                        Tu pregunta
                    </label>
                    <textarea
                        id={`editar-pregunta-${preguntaId}`}
                        value={texto}
                        onChange={(e) =>
                            setTexto(e.target.value.slice(0, TEXTO_MAX_PREGUNTA))
                        }
                        rows={4}
                        maxLength={TEXTO_MAX_PREGUNTA}
                        disabled={editar.isPending}
                        autoFocus
                        data-testid={`modal-editar-pregunta-input-${preguntaId}`}
                        className="w-full resize-none bg-slate-100 rounded-lg px-3 py-2.5 text-sm lg:text-base font-medium text-slate-800 placeholder:text-slate-500 border-2 border-slate-200 focus:border-blue-400 focus:bg-white outline-none transition-colors disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between text-[11px] lg:text-xs text-slate-500">
                        <span>
                            {hubocambios
                                ? 'Hay cambios sin guardar'
                                : 'Aún no hay cambios'}
                        </span>
                        <span>
                            {textoTrimmed.length}/{TEXTO_MAX_PREGUNTA}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onCerrar}
                        disabled={editar.isPending}
                        data-testid={`modal-editar-pregunta-cancelar-${preguntaId}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 lg:cursor-pointer disabled:opacity-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!puedeGuardar}
                        data-testid={`modal-editar-pregunta-guardar-${preguntaId}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {editar.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                Guardando…
                            </>
                        ) : (
                            'Guardar cambios'
                        )}
                    </button>
                </div>
            </form>
        </ModalAdaptativo>
    );
}

export default ModalEditarPregunta;
