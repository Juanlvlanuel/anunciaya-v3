/**
 * ModalResponder.tsx
 * ====================
 * Modal para que el dueño/gerente responda una reseña de cliente.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/opiniones/ModalResponder.tsx
 *
 * FEATURES:
 * - Header dark con gradiente ámbar + burbujas decorativas
 * - Muestra reseña original (read-only)
 * - 3 templates de respuesta rápida
 * - Textarea con contador de caracteres (500 max)
 * - Botones Cancelar / Enviar respuesta
 * - Usa ModalAdaptativo (ModalBottom en móvil, Modal centrado en desktop)
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Star } from 'lucide-react';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { Spinner } from '../../../../components/ui/Spinner';
import type { ResenaBS } from '../../../../types/resenas';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalResponderProps {
    abierto: boolean;
    onCerrar: () => void;
    resena: ResenaBS | null;
    onEnviar: (resenaId: string, texto: string) => Promise<boolean>;
    respondiendo?: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_CARACTERES = 500;

const TEMPLATES = [
    {
        label: 'Agradecimiento',
        texto: '¡Muchas gracias por tu reseña! Nos alegra saber que tuviste una buena experiencia. ¡Te esperamos pronto!',
    },
    {
        label: 'Disculpa',
        texto: 'Lamentamos mucho que tu experiencia no haya sido la mejor. Nos gustaría conocer más detalles para mejorar. ¿Podrías contactarnos?',
    },
    {
        label: 'Invitación',
        texto: '¡Gracias por compartir tu opinión! Esperamos verte pronto de nuevo. ¡Tenemos nuevas sorpresas para ti!',
    },
];

// =============================================================================
// HELPERS
// =============================================================================

function formatearFecha(fecha: string | null): string {
    if (!fecha) return '';
    const ahora = new Date();
    const fechaResena = new Date(fecha);
    const diffDias = Math.floor((ahora.getTime() - fechaResena.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias}d`;
    return fechaResena.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalResponder({
    abierto,
    onCerrar,
    resena,
    onEnviar,
    respondiendo = false,
}: ModalResponderProps) {
    const [texto, setTexto] = useState('');
    const esEdicion = !!resena?.respuesta;

    // Reset al abrir — si es edición, pre-llenar con texto existente
    useEffect(() => {
        if (abierto && resena) {
            setTexto(resena.respuesta?.texto || '');
        }
    }, [abierto, resena]);

    // Handler enviar
    const handleEnviar = async () => {
        if (!resena || !texto.trim() || respondiendo) return;

        const exito = await onEnviar(resena.id, texto.trim());
        if (exito) {
            onCerrar();
        }
    };

    if (!resena) return null;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="md"
            headerOscuro
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            className="max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
        >
            <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">
                {/* ── Header dark ámbar ── */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #1e293b, #1e3a5f)',
                        boxShadow: '0 4px 16px rgba(30,58,95,0.4)',
                    }}
                >
                    {/* Círculos decorativos */}
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        {/* Avatar */}
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0 overflow-hidden">
                            {resena.autor.avatarUrl ? (
                                <img src={resena.autor.avatarUrl} alt={resena.autor.nombre} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-base font-bold text-white">{obtenerIniciales(resena.autor.nombre)}</span>
                            )}
                        </div>

                        {/* Nombre + estrellas */}
                        <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                                    {resena.autor.nombre}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${
                                                resena.rating && s <= resena.rating
                                                    ? 'text-amber-300 fill-amber-300'
                                                    : 'text-white/20'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">
                                    {formatearFecha(resena.createdAt)}
                                </span>
                            </div>
                        </div>

                        {/* Badge estado */}
                        <div className="shrink-0">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 lg:px-2 lg:py-0.5 2xl:px-2.5 2xl:py-1 rounded-full bg-white/15 border border-white/20 text-white text-sm lg:text-[11px] 2xl:text-sm font-semibold">
                                <MessageSquare className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                                {esEdicion ? 'Editar' : 'Responder'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Contenido scrolleable ── */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">
                    <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">
                        {/* ─── Reseña original (read-only) ─── */}
                        {resena.texto && (
                            <div className="bg-slate-100 rounded-lg lg:rounded-md 2xl:rounded-lg p-3 lg:p-2.5 2xl:p-3 border-2 border-slate-300">
                                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 italic leading-relaxed">
                                    "{resena.texto}"
                                </p>
                            </div>
                        )}

                        {/* ─── Templates rápidos ─── */}
                        <div>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold uppercase tracking-wide mb-1.5 lg:mb-1 2xl:mb-1.5">
                                Respuestas rápidas:
                            </p>
                            <div className="flex gap-1.5 lg:gap-1 2xl:gap-1.5 flex-wrap">
                                {TEMPLATES.map((t) => (
                                    <button
                                        key={t.label}
                                        type="button"
                                        onClick={() => setTexto(t.texto)}
                                        disabled={respondiendo}
                                        className="px-2.5 py-1 lg:px-2 lg:py-0.5 2xl:px-2.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-medium bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ─── Textarea ─── */}
                        <div>
                            <textarea
                                id="respuesta-opinion"
                                name="respuestaOpinion"
                                value={texto}
                                onChange={(e) => setTexto(e.target.value.slice(0, MAX_CARACTERES))}
                                placeholder="Escribe tu respuesta..."
                                rows={4}
                                disabled={respondiendo}
                                className="w-full px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 border-2 border-slate-300 rounded-lg lg:rounded-md 2xl:rounded-lg text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50"
                            />
                            <div className="flex justify-end mt-1">
                                <span className={`text-sm lg:text-[11px] 2xl:text-sm font-medium ${texto.length >= MAX_CARACTERES ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                                    {texto.length}/{MAX_CARACTERES}
                                </span>
                            </div>
                        </div>

                        {/* ─── Botones ─── */}
                        <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onCerrar}
                                disabled={respondiendo}
                                className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleEnviar}
                                disabled={!texto.trim() || respondiendo || (esEdicion && texto.trim() === resena?.respuesta?.texto)}
                                className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]"
                            >
                                {respondiendo
                                    ? <Spinner tamanio="sm" color="white" />
                                    : <Send className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                                }
                                <span>{esEdicion ? 'Actualizar respuesta' : 'Enviar respuesta'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalAdaptativo>
    );
}

export default ModalResponder;
