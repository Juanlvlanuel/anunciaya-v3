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
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrapper local: ícono migrado a Iconify manteniendo el nombre familiar.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;

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
    /** Modo edición: datos de la reseña a editar */
    resenaEditar?: {
        id: string;
        rating: number | null;
        texto: string | null;
    } | null;
    /** Callback al editar exitosamente */
    onEditar?: (resenaId: string, rating: number, texto: string) => void;
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
            {/* Mensaje */}
            <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto mb-3 bg-amber-100 rounded-full flex items-center justify-center">
                    <Star className="w-8 h-8 text-amber-500" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">
                    Compra verificada requerida
                </h4>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    Solo usuarios con compras registradas en<br />
                    <span className="font-bold text-amber-600">CardYA</span> pueden opinar.
                </p>
            </div>

            {/* Pasos compactos */}
            <div className="bg-slate-200 rounded-xl p-4 mb-5 space-y-2.5">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <p className="text-sm text-slate-700 font-medium">Compra en el negocio</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <p className="text-sm text-slate-700 font-medium">Identifícate con tu cuenta CardYA</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <p className="text-sm text-slate-700 font-medium">¡Listo! Ya puedes dejar tu reseña</p>
                </div>
            </div>

            {/* Botón */}
            <button
                onClick={onCerrar}
                className="w-full py-3 text-white font-semibold rounded-xl cursor-pointer active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
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
    /** Modo edición */
    resenaEditar?: {
        id: string;
        rating: number | null;
        texto: string | null;
    } | null;
    onEditar?: (resenaId: string, rating: number, texto: string) => void;
}

function FormularioCalificacion({ onCerrar, onEnviar, resenaEditar, onEditar }: FormularioCalificacionProps) {
    const esEdicion = !!resenaEditar;
    const [selectedRating, setSelectedRating] = useState(resenaEditar?.rating || 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [texto, setTexto] = useState(resenaEditar?.texto || '');
    const [enviando, setEnviando] = useState(false);

    const handleEnviar = async () => {
        if (selectedRating === 0) return;

        setEnviando(true);
        try {
            if (esEdicion && resenaEditar) {
                await onEditar?.(resenaEditar.id, selectedRating, texto);
            } else {
                await onEnviar?.(selectedRating, texto);
            }
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
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none text-base font-medium text-slate-800 placeholder:text-slate-500"
                    rows={4}
                    maxLength={500}
                    placeholder="¿Qué te gustó? ¿Qué podría mejorar? Tu opinión ayuda a otros usuarios..."
                />
                <p className="text-sm text-slate-600 font-medium text-right mt-1">
                    {texto.length}/500 caracteres
                </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
                <button
                    onClick={handleCancelar}
                    className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-600 font-semibold rounded-xl cursor-pointer"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleEnviar}
                    disabled={selectedRating === 0 || enviando}
                    className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all active:scale-95 ${
                        selectedRating > 0 && !enviando
                            ? 'text-white cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    style={selectedRating > 0 && !enviando ? { background: 'linear-gradient(135deg, #1e293b, #0f172a)' } : undefined}
                >
                    {enviando ? 'Enviando...' : esEdicion ? 'Guardar Cambios' : 'Publicar Reseña'}
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
    resenaEditar,
    onEditar,
}: ModalEscribirResenaProps) {
    const { esMobile } = useBreakpoint();
    const esEdicion = !!resenaEditar;

    // En modo edición, siempre mostrar el formulario (ya tiene compra verificada)
    const mostrarFormulario = esEdicion || tieneCompraVerificada;

    // Contenido compartido
    const contenido = (
        <div className="p-4">
            {mostrarFormulario ? (
                <FormularioCalificacion
                    onCerrar={onCerrar}
                    onEnviar={onEnviar}
                    resenaEditar={resenaEditar}
                    onEditar={onEditar}
                />
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
                titulo={esEdicion ? "Editar Reseña" : "Escribir Reseña"}
                iconoTitulo={<Star className="w-5 h-5 text-white fill-current" />}
                mostrarHeader={false}
                headerOscuro
                sinScrollInterno={true}
                alturaMaxima={tieneCompraVerificada ? 'lg' : 'md'}
            >
                {/* Header con gradiente amber */}
                <div
                    className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
                    style={{ background: '#e8910a' }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                <Star className="w-4.5 h-4.5 text-white fill-current" />
                            </div>
                            <h3 className="text-white font-bold text-lg">{esEdicion ? "Editar Reseña" : "Escribir Reseña"}</h3>
                        </div>
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
            {/* Header con gradiente amber */}
            <div
                className="relative px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 overflow-hidden rounded-t-2xl"
                style={{ background: '#e8910a' }}
            >
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2 2xl:gap-3">
                        <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white fill-current" />
                        </div>
                        <h3 className="text-white font-bold text-base 2xl:text-lg">{esEdicion ? "Editar Reseña" : "Escribir Reseña"}</h3>
                    </div>
                </div>
            </div>

            {contenido}
        </Modal>
    );
}

export default ModalEscribirResena;