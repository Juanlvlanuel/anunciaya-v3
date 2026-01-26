/**
 * ============================================================================
 * COMPONENTE: DropdownCompartir
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/compartir/DropdownCompartir.tsx
 * 
 * PROPÓSITO:
 * Dropdown reutilizable para compartir cualquier entidad de la app
 * (negocios, productos, ofertas, etc.) en redes sociales o copiar enlace.
 * 
 * USO:
 *   <DropdownCompartir
 *       url="/p/negocio/abc123"
 *       texto="¡Mira este negocio!"
 *       titulo="Mi Negocio"
 *   />
 * 
 * CREADO: Fase 5.3.1 - Sistema Universal de Compartir
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Link2 } from 'lucide-react';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface DropdownCompartirProps {
    /** URL completa a compartir (ej: "https://anunciaya.com/p/negocio/abc123") */
    url: string;

    /** Texto del mensaje para compartir */
    texto: string;

    /** Título para Web Share API (opcional) */
    titulo?: string;

    /** Variante del botón trigger */
    variante?: 'hero' | 'card' | 'simple' | 'glass';

    /** Clase adicional para el botón trigger */
    className?: string;
}

interface DropdownPosition {
    top: number;
    right: number;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function DropdownCompartir({
    url,
    texto,
    variante = 'hero',
    className = '',
}: DropdownCompartirProps) {
    // Estados
    const [abierto, setAbierto] = useState(false);
    const [posicion, setPosicion] = useState<DropdownPosition>({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    // -------------------------------------------------------------------------
    // Cerrar con Escape
    // -------------------------------------------------------------------------
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAbierto(false);
        };

        if (abierto) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => window.removeEventListener('keydown', handleEsc);
    }, [abierto]);

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!abierto && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const isMobile = window.innerWidth < 1024; // lg breakpoint
            
            setPosicion({
                top: rect.bottom + 8,
                // En móvil, mover 20px más a la izquierda
                right: window.innerWidth - rect.right + (isMobile ? 20 : 0),
            });
        }

        setAbierto(!abierto);
    };

    const cerrar = () => setAbierto(false);

    const compartirWhatsApp = () => {
        const mensaje = `${texto}\n\n${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
        cerrar();
    };

    const compartirFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        cerrar();
    };

    const compartirTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`, '_blank');
        cerrar();
    };

    const copiarEnlace = async () => {
        try {
            await navigator.clipboard.writeText(url);
            notificar.exito('¡Enlace copiado!');
        } catch {
            notificar.error('No se pudo copiar el enlace');
        }
        cerrar();
    };

    // -------------------------------------------------------------------------
    // Estilos según variante
    // -------------------------------------------------------------------------
    const estilosBoton = {
        hero: `p-2 2xl:p-2.5 rounded-lg border-2 backdrop-blur-sm transition-all ${abierto
            ? 'bg-blue-50 border-blue-500 text-blue-600'
            : 'bg-white/90 border-white text-slate-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600'
            }`,
        card: `p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors`,
        simple: `p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors`,
        glass: `w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white hover:border-gray-400 transition-all duration-200`,
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <div className={`relative ${className}`}>
            {/* Botón Trigger */}
            <button
                ref={buttonRef}
                onClick={toggleDropdown}
                className={`cursor-pointer ${estilosBoton[variante]} group`}
            >
                <Share2 className="w-4 h-4 lg:w-5 lg:h-5 text-slate-700 group-hover:text-gray-500 transition-colors" />
            </button>

            {/* Tooltip (solo cuando está cerrado y variante hero) */}
            {!abierto && variante === 'hero' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Compartir
                </div>
            )}

            {/* Dropdown */}
            {abierto && createPortal(
                <>
                    {/* Overlay para cerrar */}
                    <div
                        className="fixed inset-0 z-9998"
                        onClick={cerrar}
                    />

                    {/* Menú */}
                    <div
                        className="fixed w-36 lg:w-40 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border-2 border-blue-500 py-1 lg:py-1.5 z-9999"
                        style={{ top: posicion.top, right: posicion.right }}
                    >
                        {/* WhatsApp */}
                        <button
                            onClick={compartirWhatsApp}
                            className="w-full flex items-center gap-1.5 lg:gap-2.5 px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-[#25D366]/10 transition-colors cursor-pointer group"
                        >
                            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-[#25D366] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5" fill="white" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </div>
                            <span className="text-xs lg:text-sm text-slate-700 group-hover:text-[#25D366] transition-colors">WhatsApp</span>
                        </button>

                        {/* Facebook */}
                        <button
                            onClick={compartirFacebook}
                            className="w-full flex items-center gap-1.5 lg:gap-2.5 px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-[#1877f2]/10 transition-colors cursor-pointer group"
                        >
                            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-[#1877f2] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5" fill="white" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </div>
                            <span className="text-xs lg:text-sm text-slate-700 group-hover:text-[#1877f2] transition-colors">Facebook</span>
                        </button>

                        {/* Twitter/X */}
                        <button
                            onClick={compartirTwitter}
                            className="w-full flex items-center gap-1.5 lg:gap-2.5 px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-slate-100 transition-colors cursor-pointer group"
                        >
                            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5" fill="white" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </div>
                            <span className="text-xs lg:text-sm text-slate-700 group-hover:text-black transition-colors">X</span>
                        </button>

                        <div className="my-0.5 lg:my-1 h-px bg-slate-200/70 mx-1.5 lg:mx-2" />

                        {/* Copiar enlace */}
                        <button
                            onClick={copiarEnlace}
                            className="w-full flex items-center gap-1.5 lg:gap-2.5 px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-blue-50 transition-colors cursor-pointer group"
                        >
                            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all shrink-0">
                                <Link2 className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-xs lg:text-sm text-slate-700 group-hover:text-blue-600 transition-colors">Copiar link</span>
                        </button>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default DropdownCompartir;