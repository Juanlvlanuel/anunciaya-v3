/**
 * ============================================================================
 * COMPONENTE: ModalEscribirResena
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalEscribirResena.tsx
 *
 * DESCRIPCIÓN:
 * Modal para escribir reseñas de negocios con verificación de compra.
 * - Si NO tiene compra verificada: muestra mensaje informativo
 * - Si SÍ tiene compra verificada: muestra formulario de calificación
 *
 * PATRÓN ADAPTATIVO:
 * - Móvil: ModalBottom (slide desde abajo)
 * - Desktop: Modal centrado
 */

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalEscribirResenaProps {
    abierto: boolean;
    onCerrar: () => void;
    /** Si el usuario tiene una compra verificada con CardYA en este negocio */
    tieneCompraVerificada?: boolean;
    /** Callback al enviar la reseña exitosamente */
    onEnviar?: (rating: number, texto: string) => void;
}

// =============================================================================
// COMPONENTE: VistaCompraRequerida
// =============================================================================

interface VistaCompraRequeridaProps {
    onCerrar: () => void;
}

function VistaCompraRequerida({ onCerrar }: VistaCompraRequeridaProps) {
    return (
        <>
            {/* Ilustración y mensaje */}
            <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-amber-50 rounded-full flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-amber-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                    </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 mb-1">
                    ¡Compra verificada requerida!
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                    Para garantizar reseñas auténticas, necesitas haber realizado una compra
                    verificada mostrando tu{' '}
                    <span className="font-semibold text-amber-600">CardYA</span> en este negocio.
                </p>
            </div>

            {/* Pasos */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    ¿Cómo funciona?
                </p>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            1
                        </div>
                        <p className="text-sm text-slate-600">Visita el negocio y realiza tu compra</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            2
                        </div>
                        <p className="text-sm text-slate-600">
                            Muestra tu <span className="font-semibold text-amber-600">CardYA</span>{' '}
                            para que el negocio la escanee
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            3
                        </div>
                        <p className="text-sm text-slate-600">¡Listo! Podrás dejar tu reseña verificada</p>
                    </div>
                </div>
            </div>

            {/* Botón */}
            <button
                onClick={onCerrar}
                className="w-full py-3 bg-linear-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all cursor-pointer"
            >
                Entendido
            </button>
        </>
    );
}

// =============================================================================
// COMPONENTE: FormularioCalificacion
// =============================================================================

interface FormularioCalificacionProps {
    onCerrar: () => void;
    onEnviar?: (rating: number, texto: string) => void;
}

function FormularioCalificacion({ onCerrar, onEnviar }: FormularioCalificacionProps) {
    const [selectedRating, setSelectedRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);

    const handleEnviar = async () => {
        if (selectedRating === 0) return;

        setEnviando(true);
        try {
            await onEnviar?.(selectedRating, texto);
            onCerrar();
        } catch (error) {
            console.error('Error al enviar reseña:', error);
        } finally {
            setEnviando(false);
        }
    };

    const handleCancelar = () => {
        setSelectedRating(0);
        setHoverRating(0);
        setTexto('');
        onCerrar();
    };

    const etiquetasRating: Record<number, string> = {
        1: '😞 Muy malo',
        2: '😕 Malo',
        3: '😐 Regular',
        4: '😊 Bueno',
        5: '🤩 ¡Excelente!',
    };

    return (
        <>
            {/* Calificación con estrellas */}
            <div className="mb-5">
                <span className="block text-sm font-semibold text-slate-700 mb-3">
                    ¿Cómo calificarías tu experiencia?
                </span>
                <div
                    className="flex justify-center gap-2"
                    onMouseLeave={() => setHoverRating(0)}
                >
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            className="p-1 cursor-pointer hover:scale-110 transition-transform"
                            onMouseEnter={() => setHoverRating(star)}
                            onClick={() => setSelectedRating(star)}
                        >
                            <Star
                                className={`w-10 h-10 transition-colors ${
                                    star <= (hoverRating || selectedRating)
                                        ? 'text-amber-400 fill-current drop-shadow-sm'
                                        : 'text-slate-200'
                                }`}
                            />
                        </button>
                    ))}
                </div>
                {selectedRating > 0 && (
                    <p className="text-center text-sm text-amber-600 font-medium mt-2">
                        {etiquetasRating[selectedRating]}
                    </p>
                )}
            </div>

            {/* Textarea para la reseña */}
            <div className="mb-5">
                <label
                    htmlFor="textarea-resena"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                >
                    Cuéntanos tu experiencia
                </label>
                <textarea
                    id="textarea-resena"
                    name="textarea-resena"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none text-slate-700 placeholder:text-slate-400"
                    rows={4}
                    maxLength={500}
                    placeholder="¿Qué te gustó? ¿Qué podría mejorar? Tu opinión ayuda a otros usuarios..."
                />
                <p className="text-xs text-slate-400 text-right mt-1">
                    {texto.length}/500 caracteres
                </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
                <button
                    onClick={handleCancelar}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleEnviar}
                    disabled={selectedRating === 0 || enviando}
                    className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all cursor-pointer ${
                        selectedRating > 0 && !enviando
                            ? 'bg-linear-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {enviando ? 'Enviando...' : 'Publicar Reseña'}
                </button>
            </div>
        </>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalEscribirResena({
    abierto,
    onCerrar,
    tieneCompraVerificada = false,
    onEnviar,
}: ModalEscribirResenaProps) {
    const { esMobile } = useBreakpoint();

    // Contenido compartido
    const contenido = (
        <div className="p-4">
            {tieneCompraVerificada ? (
                <FormularioCalificacion onCerrar={onCerrar} onEnviar={onEnviar} />
            ) : (
                <VistaCompraRequerida onCerrar={onCerrar} />
            )}
        </div>
    );

    // =========================================================================
    // MÓVIL: ModalBottom
    // =========================================================================
    if (esMobile) {
        return (
            <ModalBottom
                abierto={abierto}
                onCerrar={onCerrar}
                titulo="Escribir Reseña"
                iconoTitulo={<Star className="w-5 h-5 text-white fill-current" />}
                mostrarHeader={false}
                sinScrollInterno={true}
                alturaMaxima={tieneCompraVerificada ? 'lg' : 'md'}
            >
                {/* Header personalizado con gradiente */}
                <div className="bg-linear-to-r from-amber-400 to-orange-500 px-4 py-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                            <Star className="w-5 h-5 fill-current" />
                            <span>Escribir Reseña</span>
                        </h3>
                        <button
                            onClick={onCerrar}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {contenido}
                </div>
            </ModalBottom>
        );
    }

    // =========================================================================
    // DESKTOP: Modal centrado
    // =========================================================================
    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            paddingContenido="none"
            mostrarHeader={false}
        >
            {/* Header con gradiente */}
            <div className="bg-linear-to-r from-amber-400 to-orange-500 px-4 py-3 lg:px-4 lg:py-2.5 2xl:px-6 2xl:py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base lg:text-sm 2xl:text-lg font-semibold text-white">
                        <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 fill-current" />
                        <span>Escribir Reseña</span>
                    </h3>
                    <button
                        onClick={onCerrar}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>
                </div>
            </div>

            {contenido}
        </Modal>
    );
}

export default ModalEscribirResena;