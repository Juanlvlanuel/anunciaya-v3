/**
 * WizardServiciosLayout.tsx
 * ==========================
 * Estructura interna del wizard SIN header — el `ServiciosHeader` global
 * lo maneja el padre. Aquí vive:
 *   - Barra de progreso de 3 segmentos
 *   - Slot del contenido del paso activo
 *   - Nav inferior con botón principal (Siguiente / Publicar) + nextHelp
 *
 * Fondo `bg-transparent` heredando el gradiente azul del MainLayout.
 *
 * Ubicación: apps/web/src/components/servicios/wizard/WizardServiciosLayout.tsx
 */

import type { ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { TOTAL_PASOS, type PasoWizard } from '../../../hooks/useWizardServicios';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';

interface WizardServiciosLayoutProps {
    paso: PasoWizard;
    pasoValido: boolean;
    enviando?: boolean;
    /** Mensaje contextual de qué falta para avanzar. Visible solo en mobile
     *  (en desktop el botón vive arriba en el header y nextHelp se muestra
     *  al lado del botón allí). */
    nextHelp?: string | null;
    children: ReactNode;
    onSiguiente: () => void;
    /** Volver al paso anterior (visible en mobile desde paso 2 en adelante). */
    onAtras?: () => void;
}

export function WizardServiciosLayout({
    paso,
    pasoValido,
    enviando = false,
    nextHelp,
    children,
    onSiguiente,
    onAtras,
}: WizardServiciosLayoutProps) {
    const esUltimo = paso === TOTAL_PASOS;
    const puedeAtras = paso > 1 && !!onAtras;
    // El BottomNav global usa el mismo hook con direction='down' — al ocultarse
    // este nav sube; al volver el BottomNav, este baja para no taparlo.
    const { shouldShow: bottomNavVisible } = useHideOnScroll({
        direction: 'down',
    });

    return (
        <div className="min-h-full bg-transparent pb-44 lg:pb-12">
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                {/* ───── Contenido del paso (transparente, cada bloque
                    aplica su propio WizardSeccionCard) ───── */}
                <div className="px-3 lg:px-0 pt-3 lg:pt-8 pb-4 lg:pb-6">
                    {children}
                </div>

                {/* ───── Banner contextual de qué falta (DESKTOP) ─────
                    Se muestra cuando el botón Siguiente está deshabilitado
                    porque el paso aún no está válido. En mobile vive en el
                    nav flotante inferior. */}
                {nextHelp && !enviando && (
                    <div className="hidden lg:flex items-start gap-2.5 mx-0 mb-4 px-4 py-3 rounded-xl bg-amber-50 border-[1.5px] border-amber-200">
                        <AlertCircle
                            className="w-4 h-4 text-amber-700 mt-0.5 shrink-0"
                            strokeWidth={2}
                        />
                        <span className="text-[13px] text-amber-900 font-semibold leading-snug">
                            {nextHelp}
                        </span>
                    </div>
                )}
            </div>

            {/* ───── Nav inferior flotante — SOLO MOBILE ─────
                Barra flotante con padding lateral (no full-width). Su `bottom`
                se anima entre dos posiciones según si el BottomNav global
                está visible (75px) u oculto (12px). Z-index 35 < 40 del
                BottomNav para que no lo tape. */}
            <nav
                data-testid="wizard-nav-mobile"
                className="fixed left-3 right-3 z-[35] lg:hidden rounded-2xl bg-white/95 backdrop-blur border-[1.5px] border-slate-300"
                style={{
                    bottom: bottomNavVisible ? '75px' : '12px',
                    transition:
                        'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow:
                        '0 10px 28px -8px rgba(15,23,42,0.25), 0 2px 6px rgba(15,23,42,0.08)',
                }}
            >
                <div className="flex flex-col gap-1.5 px-3 py-2.5">
                    {nextHelp && (
                        <span className="text-[13px] text-slate-600 font-medium text-center leading-snug">
                            {nextHelp}
                        </span>
                    )}
                    <div className="flex items-center gap-2.5">
                        {puedeAtras && (
                            <button
                                type="button"
                                data-testid="wizard-btn-atras-mobile"
                                onClick={onAtras}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-[1.5px] border-slate-300 text-slate-700 font-bold text-[15px] hover:bg-slate-100 shrink-0 active:scale-[0.97]"
                            >
                                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                                Atrás
                            </button>
                        )}
                        <button
                            type="button"
                            data-testid="wizard-btn-siguiente"
                            disabled={!pasoValido || enviando}
                            onClick={onSiguiente}
                            className={
                                'flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-[15px] active:scale-[0.98] ' +
                                (pasoValido && !enviando
                                    ? 'bg-linear-to-b from-sky-500 to-sky-700 text-white shadow-cta-sky'
                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70')
                            }
                        >
                            {enviando
                                ? 'Publicando...'
                                : esUltimo
                                  ? 'Publicar'
                                  : 'Siguiente'}
                            {!enviando &&
                                (esUltimo ? (
                                    <Sparkles
                                        className="w-4 h-4"
                                        strokeWidth={2}
                                    />
                                ) : (
                                    <ArrowRight
                                        className="w-4 h-4"
                                        strokeWidth={2.5}
                                    />
                                ))}
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default WizardServiciosLayout;
