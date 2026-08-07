/**
 * ModalAccionGradiente.tsx
 * =========================
 * Subcomponentes compartidos para modales de acción/confirmación con header
 * de gradiente color-coded — mismo patrón visual que `ModalConfirmarCanje.tsx`
 * (CardYA): header con icono en círculo + título/subtítulo, card de resumen
 * del recurso, aviso contextual con icono, y footer de 2 botones (outline +
 * gradiente).
 *
 * Extraído en agosto 2026 de `components/dinamicas/ModalesAccionDinamica.tsx`
 * (donde nació) para unificar los modales de confirmación de MarketPlace
 * (`components/marketplace/ModalesAccionArticulo.tsx`) y Servicios
 * (`components/servicios/ModalesAccionServicio.tsx`), que antes usaban un
 * `ModalAdaptativo` genérico (MarketPlace) o `notificar.confirmar()`
 * (Servicios) sin este estilo.
 *
 * Convención de color por ACCIÓN (no por módulo) — mismo color = misma
 * semántica en toda la app:
 *   - azul    → agregar / informativo
 *   - amber   → pausar / posponer / modificar con cautela
 *   - rojo    → eliminar / cancelar (destructivo)
 *   - verde   → confirmar positivo (ej. marcar vendido)
 *
 * Ubicación: apps/web/src/components/ui/ModalAccionGradiente.tsx
 */

import { AlertTriangle, ArrowRight, Loader2, type LucideIcon } from 'lucide-react';

export const GRADIENTES_ACCION = {
    azul: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    amber: 'linear-gradient(135deg, #f59e0b, #d97706)',
    rojo: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    verde: 'linear-gradient(135deg, #059669, #047857)',
} as const;

// =============================================================================
// HEADER
// =============================================================================

interface HeaderAccionGradienteProps {
    icono: LucideIcon;
    titulo: string;
    subtitulo: string;
    gradiente: string;
}

export function HeaderAccionGradiente({ icono: Icono, titulo, subtitulo, gradiente }: HeaderAccionGradienteProps) {
    return (
        <div
            className="relative shrink-0 overflow-hidden px-5 pb-4 pt-8 lg:rounded-t-2xl lg:px-4 lg:py-4 2xl:rounded-t-2xl 2xl:px-5 2xl:py-5"
            style={{ background: gradiente }}
        >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/15 lg:h-9 lg:w-9 2xl:h-11 2xl:w-11">
                    <Icono className="h-5 w-5 text-white lg:h-4 lg:w-4 2xl:h-5 2xl:w-5" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-white lg:text-lg 2xl:text-xl">{titulo}</h2>
                    <p className="truncate text-sm font-bold tracking-wide text-white/70 lg:text-[11px] 2xl:text-sm">
                        {subtitulo}
                    </p>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// RESUMEN DEL RECURSO (chip gris con icono + texto truncado)
// =============================================================================

interface ResumenAccionModalProps {
    icono: LucideIcon;
    texto: string;
}

export function ResumenAccionModal({ icono: Icono, texto }: ResumenAccionModalProps) {
    return (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5">
            <Icono className="h-4 w-4 shrink-0 text-slate-600" strokeWidth={2.5} />
            <span className="truncate text-sm font-bold text-slate-800">{texto}</span>
        </div>
    );
}

// =============================================================================
// AVISO CONTEXTUAL
// =============================================================================

interface AvisoContextualModalProps {
    icono?: LucideIcon;
    tono: 'azul' | 'amber' | 'rojo' | 'verde';
    children: React.ReactNode;
}

const TONOS_AVISO: Record<AvisoContextualModalProps['tono'], { bg: string; border: string; texto: string; icono: string }> = {
    azul: { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#bfdbfe', texto: '#1e40af', icono: '#2563eb' },
    amber: { bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fde68a', texto: '#92400e', icono: '#d97706' },
    rojo: { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '#fecaca', texto: '#991b1b', icono: '#dc2626' },
    verde: { bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '#a7f3d0', texto: '#065f46', icono: '#059669' },
};

export function AvisoContextualModal({ icono: Icono = AlertTriangle, tono, children }: AvisoContextualModalProps) {
    const t = TONOS_AVISO[tono];
    return (
        <div
            className="mt-4 flex items-start gap-2 rounded-lg p-3 lg:mt-3 lg:p-2.5 2xl:mt-4 2xl:p-3"
            style={{ background: t.bg, border: `2px solid ${t.border}` }}
        >
            <Icono className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: t.icono }} />
            <p className="text-sm font-semibold leading-relaxed lg:text-[12px] 2xl:text-sm" style={{ color: t.texto }}>
                {children}
            </p>
        </div>
    );
}

// =============================================================================
// BOTONES (outline + gradiente)
// =============================================================================

interface BotonesAccionModalProps {
    onCerrar: () => void;
    onConfirmar: () => void;
    pendiente: boolean;
    deshabilitado?: boolean;
    textoCerrar?: string;
    textoConfirmar: string;
    textoPendiente: string;
    colorBase: string;
    colorOscuro: string;
}

export function BotonesAccionModal({
    onCerrar,
    onConfirmar,
    pendiente,
    deshabilitado,
    textoCerrar = 'Cancelar',
    textoConfirmar,
    textoPendiente,
    colorBase,
    colorOscuro,
}: BotonesAccionModalProps) {
    return (
        <div className="mt-5 flex gap-3 lg:mt-4 lg:gap-2.5 2xl:mt-5 2xl:gap-3">
            <button
                type="button"
                onClick={onCerrar}
                disabled={pendiente}
                className="flex-1 rounded-xl border-2 border-slate-300 py-2.5 text-sm font-bold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:cursor-pointer lg:rounded-lg lg:py-2 lg:hover:bg-slate-200 2xl:rounded-xl 2xl:py-2.5"
            >
                {textoCerrar}
            </button>
            <button
                type="button"
                onClick={onConfirmar}
                disabled={pendiente || deshabilitado}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-lg lg:py-2 2xl:rounded-xl 2xl:py-2.5"
                style={{
                    background: pendiente
                        ? 'linear-gradient(135deg, #64748b, #475569)'
                        : `linear-gradient(135deg, ${colorBase}, ${colorOscuro})`,
                    boxShadow: pendiente ? 'none' : `0 4px 12px ${colorBase}4D`,
                }}
            >
                {pendiente ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {textoPendiente}
                    </>
                ) : (
                    <>
                        {textoConfirmar}
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </>
                )}
            </button>
        </div>
    );
}
