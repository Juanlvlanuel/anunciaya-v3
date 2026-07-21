/**
 * InputComentarioServicio.tsx
 * ==============================
 * Solo el INPUT para comentar una publicación de Servicios (sin lista) —
 * estilo Facebook, sin avatar, "Comentar como {nombre}". Separado de
 * `ListaComentariosServicio.tsx` para poder fijarlo aparte del layout (ej.
 * sticky al fondo de un modal mientras la lista scrollea con el resto del
 * cuerpo). Mismo patrón que `InputComentarioMarketplace.tsx`.
 *
 * Ubicación: apps/web/src/components/servicios/InputComentarioServicio.tsx
 */

import { useCallback, useState } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { useCrearComentarioServicio } from '../../hooks/queries/useServicios';

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

interface InputComentarioServicioProps {
    publicacionId: string;
    className?: string;
}

export function InputComentarioServicio({
    publicacionId,
    className = '',
}: InputComentarioServicioProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const modoActivo = usuario?.modoActivo ?? 'personal';
    const enModoComercial = modoActivo === 'comercial';
    const puedeComentar = !!usuario && !enModoComercial;

    const crearComentario = useCrearComentarioServicio();
    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleEnviar = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const limpio = texto.trim();
            if (!usuario) {
                notificar.info('Inicia sesión para comentar');
                return;
            }
            if (limpio.length < TEXTO_MIN) {
                setError(`Escribe al menos ${TEXTO_MIN} caracteres`);
                return;
            }
            setError(null);
            try {
                await crearComentario.mutateAsync({ publicacionId, texto: limpio });
                setTexto('');
            } catch (err) {
                const errTyped = err as { response?: { status?: number; data?: { message?: string } } };
                const mensaje = errTyped?.response?.data?.message;
                setError(mensaje ?? 'No se pudo publicar el comentario');
            }
        },
        [texto, usuario, crearComentario, publicacionId]
    );

    if (!puedeComentar) {
        return (
            <p className={`text-sm text-slate-600 text-center ${className}`}>
                {enModoComercial
                    ? 'Cambia a modo Personal para comentar en Servicios.'
                    : 'Inicia sesión para comentar.'}
            </p>
        );
    }

    return (
        <div className={className}>
            <form onSubmit={handleEnviar}>
                <div className="flex items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/20">
                    <input
                        type="text"
                        data-testid="input-comentario-servicio-facebook"
                        value={texto}
                        onChange={(e) => {
                            setTexto(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder={`Comentar como ${usuario?.nombre ?? 'tú'}…`}
                        maxLength={TEXTO_MAX}
                        disabled={crearComentario.isPending}
                        className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        data-testid="enviar-comentario-servicio-facebook"
                        disabled={crearComentario.isPending || texto.trim().length < TEXTO_MIN}
                        aria-label="Publicar comentario"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                            texto.trim().length >= TEXTO_MIN && !crearComentario.isPending
                                ? 'bg-sky-600 text-white shadow-sm lg:hover:bg-sky-700'
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
                {error && (
                    <div className="mt-1 flex items-center gap-1 px-3 text-sm text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {error}
                    </div>
                )}
            </form>
        </div>
    );
}

export default InputComentarioServicio;
