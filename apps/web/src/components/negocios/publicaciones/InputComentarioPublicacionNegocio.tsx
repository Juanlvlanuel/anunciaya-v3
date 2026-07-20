/**
 * InputComentarioPublicacionNegocio.tsx
 * =========================================
 * Solo el INPUT para comentar una publicación de negocio (sin lista) —
 * estilo Facebook, sin avatar, "Comentar como {nombre}". Separado de
 * `ListaComentariosPublicacionNegocio.tsx` para poder fijarlo aparte del
 * layout (ej. sticky al fondo de un modal mientras la lista scrollea con
 * el resto del cuerpo).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/InputComentarioPublicacionNegocio.tsx
 */

import { useCallback, useState } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { notificar } from '../../../utils/notificaciones';
import { useCrearComentarioNegocio } from '../../../hooks/queries/useNegocioPublicaciones';

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

interface InputComentarioPublicacionNegocioProps {
    publicacionId: string;
    className?: string;
}

export function InputComentarioPublicacionNegocio({
    publicacionId,
    className = '',
}: InputComentarioPublicacionNegocioProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const crearComentario = useCrearComentarioNegocio();
    const [textoComentario, setTextoComentario] = useState('');
    const [errorComentario, setErrorComentario] = useState<string | null>(null);

    const handleEnviarComentario = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const limpio = textoComentario.trim();
            if (!usuario) {
                notificar.info('Inicia sesión para comentar');
                return;
            }
            if (limpio.length < TEXTO_MIN) {
                setErrorComentario(`Escribe al menos ${TEXTO_MIN} caracteres`);
                return;
            }
            setErrorComentario(null);
            try {
                await crearComentario.mutateAsync({ publicacionId, texto: limpio });
                setTextoComentario('');
            } catch (err) {
                const errTyped = err as { response?: { status?: number; data?: { message?: string } } };
                const status = errTyped?.response?.status;
                const mensaje = errTyped?.response?.data?.message;
                if (status === 422) setErrorComentario(mensaje ?? 'Contenido no permitido');
                else setErrorComentario(mensaje ?? 'No se pudo publicar el comentario');
            }
        },
        [textoComentario, usuario, crearComentario, publicacionId]
    );

    if (!usuario) {
        return (
            <p className={`text-sm text-slate-600 text-center ${className}`}>
                Inicia sesión para comentar.
            </p>
        );
    }

    return (
        <div className={className}>
            <form onSubmit={handleEnviarComentario}>
                <div className="flex items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                    <input
                        type="text"
                        data-testid="input-comentario-negocio-facebook"
                        value={textoComentario}
                        onChange={(e) => {
                            setTextoComentario(e.target.value);
                            if (errorComentario) setErrorComentario(null);
                        }}
                        placeholder={`Comentar como ${usuario.nombre ?? 'tú'}…`}
                        maxLength={TEXTO_MAX}
                        disabled={crearComentario.isPending}
                        className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        data-testid="enviar-comentario-negocio-facebook"
                        disabled={crearComentario.isPending || textoComentario.trim().length < TEXTO_MIN}
                        aria-label="Publicar comentario"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                            textoComentario.trim().length >= TEXTO_MIN && !crearComentario.isPending
                                ? 'bg-blue-600 text-white shadow-sm lg:hover:bg-blue-700'
                                : 'bg-transparent text-slate-400'
                        }`}
                    >
                        {crearComentario.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        ) : (
                            <Send className="h-4 w-4" strokeWidth={2.5} />
                        )}
                    </button>
                </div>
                {errorComentario && (
                    <div className="mt-1 flex items-center gap-1 px-3 text-sm text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {errorComentario}
                    </div>
                )}
            </form>
        </div>
    );
}

export default InputComentarioPublicacionNegocio;
