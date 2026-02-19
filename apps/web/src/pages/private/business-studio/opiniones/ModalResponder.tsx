/**
 * ModalResponder.tsx
 * ====================
 * Modal para que el dueño/gerente responda una reseña de cliente.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/opiniones/ModalResponder.tsx
 *
 * FEATURES:
 * - Muestra reseña original (read-only)
 * - 3 templates de respuesta rápida
 * - Textarea con contador de caracteres (500 max)
 * - Botones Cancelar / Enviar respuesta
 * - Usa ModalAdaptativo (ModalBottom en móvil, Modal en desktop)
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Star, User } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { Boton } from '../../../../components/ui/Boton';
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
            titulo="Responder reseña"
            iconoTitulo={<MessageSquare className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-500" />}
            ancho="md"
            paddingContenido="sm"
        >
            <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">
                {/* ─── Reseña original (read-only) ─── */}
                <div className="bg-slate-50 rounded-lg lg:rounded-md 2xl:rounded-lg p-3 lg:p-2.5 2xl:p-3 border border-slate-200">
                    <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 mb-2 lg:mb-1.5 2xl:mb-2">
                        {/* Avatar */}
                        {resena.autor.avatarUrl ? (
                            <img
                                src={resena.autor.avatarUrl}
                                alt={resena.autor.nombre}
                                className="w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-500" />
                            </div>
                        )}
                        <div>
                            <span className="font-semibold text-sm lg:text-xs 2xl:text-sm text-slate-800">
                                {resena.autor.nombre}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 ${
                                                resena.rating && s <= resena.rating
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-slate-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-slate-400">
                                    {formatearFecha(resena.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {resena.texto && (
                        <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-600 italic leading-relaxed">
                            "{resena.texto}"
                        </p>
                    )}
                </div>

                {/* ─── Templates rápidos ─── */}
                <div>
                    <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5 lg:mb-1 2xl:mb-1.5">
                        Respuestas rápidas:
                    </p>
                    <div className="flex gap-1.5 lg:gap-1 2xl:gap-1.5 flex-wrap">
                        {TEMPLATES.map((t) => (
                            <button
                                key={t.label}
                                type="button"
                                onClick={() => setTexto(t.texto)}
                                disabled={respondiendo}
                                className="px-2.5 py-1 lg:px-2 lg:py-0.5 2xl:px-2.5 2xl:py-1 rounded-full text-[11px] lg:text-[10px] 2xl:text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Textarea ─── */}
                <div>
                    <textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value.slice(0, MAX_CARACTERES))}
                        placeholder="Escribe tu respuesta..."
                        rows={4}
                        disabled={respondiendo}
                        className="w-full px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 border-2 border-slate-300 rounded-lg lg:rounded-md 2xl:rounded-lg text-sm lg:text-xs 2xl:text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50"
                    />
                    <div className="flex justify-end mt-1">
                        <span className={`text-[11px] lg:text-[10px] 2xl:text-[11px] ${texto.length >= MAX_CARACTERES ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            {texto.length}/{MAX_CARACTERES}
                        </span>
                    </div>
                </div>

                {/* ─── Botones ─── */}
                <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 pt-1">
                    <Boton
                        variante="outline"
                        onClick={onCerrar}
                        disabled={respondiendo}
                        className="flex-1 lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer"
                    >
                        Cancelar
                    </Boton>
                    <Boton
                        variante="primario"
                        onClick={handleEnviar}
                        disabled={!texto.trim() || respondiendo || (esEdicion && texto.trim() === resena?.respuesta?.texto)}
                        cargando={respondiendo}
                        iconoIzquierda={<Send className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />}
                        className="flex-1 lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer"
                    >
                        {esEdicion ? 'Actualizar respuesta' : 'Enviar respuesta'}
                    </Boton>
                </div>
            </div>
        </ModalAdaptativo>
    );
}

export default ModalResponder;