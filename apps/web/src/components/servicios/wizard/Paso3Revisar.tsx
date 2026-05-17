/**
 * Paso3Revisar.tsx
 * ==================
 * Paso 3 del wizard v2: preview en vivo del anuncio + 3 confirmaciones
 * legales obligatorias.
 *
 * El preview refleja título, presupuesto formateado, categoría, descripción
 * y zonas. Si `urgente=true`, el cover pasa de azul a gradiente ámbar y el
 * badge dice "⚡ Urgente · Solicito" (o "Ofrezco" según `modo`).
 *
 * Ubicación: apps/web/src/components/servicios/wizard/Paso3Revisar.tsx
 */

import { Info } from 'lucide-react';
import type { WizardServiciosDraft } from '../../../hooks/useWizardServicios';
import { labelCategoria } from '../../../utils/servicios';
import { WizardSeccionCard } from './WizardSeccionCard';

interface Paso3Props {
    draft: WizardServiciosDraft;
    actualizar: (
        cambio:
            | Partial<WizardServiciosDraft>
            | ((d: WizardServiciosDraft) => Partial<WizardServiciosDraft>),
    ) => void;
}

const CONFIRMACIONES: {
    id: keyof WizardServiciosDraft['confirmaciones'];
    titulo: string;
    descripcion: string;
}[] = [
    {
        id: 'legal',
        titulo: 'Es legal',
        descripcion: 'No infringe leyes, ni es discriminatorio, sexual o de armas.',
    },
    {
        id: 'verdadera',
        titulo: 'Es información verdadera',
        descripcion: 'Precio, fotos y datos reflejan lo real.',
    },
    {
        id: 'coordinacion',
        titulo: 'Coordino con la otra parte',
        descripcion:
            'AnunciaYA solo conecta. El pago y la entrega se acuerdan entre las personas.',
    },
];

export function Paso3Revisar({ draft, actualizar }: Paso3Props) {
    function toggle(id: keyof WizardServiciosDraft['confirmaciones']) {
        actualizar((d) => ({
            confirmaciones: {
                ...d.confirmaciones,
                [id]: !d.confirmaciones[id],
            },
        }));
    }

    return (
        <div className="space-y-3 lg:space-y-4 max-w-3xl mx-auto">
            {/* ── Vista previa ─────────────────────────────────────────── */}
            <WizardSeccionCard>
                <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-2 lg:mb-3">
                    Vista previa
                </span>
                <PreviewCard draft={draft} />
                <div className="mt-2 lg:mt-2.5 flex items-center gap-1.5 text-[12px] lg:text-[13px] 2xl:text-sm text-slate-600 font-medium">
                    <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-500 shrink-0" strokeWidth={1.8} />
                    Así se verá en el feed.
                </div>
            </WizardSeccionCard>

            {/* ── Confirmaciones ───────────────────────────────────────── */}
            <WizardSeccionCard>
                <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-2 lg:mb-3">
                    Antes de publicar, confirma
                </span>
                <div className="grid gap-2 lg:gap-2.5">
                    {CONFIRMACIONES.map((c) => {
                        const activa = draft.confirmaciones[c.id];
                        return (
                            <label
                                key={c.id}
                                className={
                                    'flex items-start gap-2.5 lg:gap-3 rounded-[12px] lg:rounded-[14px] p-3 lg:p-4 lg:cursor-pointer transition-shadow ' +
                                    (activa
                                        ? 'border-[1.5px] border-sky-500 bg-sky-50 ring-4 ring-sky-100'
                                        : 'border-[1.5px] border-slate-300 bg-white hover:border-sky-400 hover:shadow-sm')
                                }
                            >
                                <input
                                    type="checkbox"
                                    data-testid={`wizard-confirm-${c.id}`}
                                    checked={activa}
                                    onChange={() => toggle(c.id)}
                                    className="mt-0.5 w-5 h-5 rounded border-[1.5px] border-slate-400 lg:cursor-pointer accent-sky-500 shrink-0"
                                />
                                <div className="min-w-0">
                                    <div
                                        className={
                                            'text-[15px] lg:text-[15px] 2xl:text-base font-bold leading-tight ' +
                                            (activa
                                                ? 'text-sky-900'
                                                : 'text-slate-900')
                                        }
                                    >
                                        {c.titulo}
                                    </div>
                                    <p
                                        className={
                                            'mt-0.5 text-[13px] lg:text-[13px] 2xl:text-sm font-medium leading-snug ' +
                                            (activa
                                                ? 'text-sky-800'
                                                : 'text-slate-600')
                                        }
                                    >
                                        {c.descripcion}
                                    </p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </WizardSeccionCard>

            <div className="text-[12px] lg:text-[13px] 2xl:text-sm text-slate-600 font-medium leading-snug lg:leading-relaxed px-3 lg:px-1">
                Tu anuncio queda activo <b>30 días</b>. Si no hay interacción se
                pausa solo y puedes reactivarlo desde <b>"Mis publicaciones"</b>.
            </div>
        </div>
    );
}

// =============================================================================
// PreviewCard — mini-card que refleja el anuncio en vivo
// =============================================================================

function PreviewCard({ draft }: { draft: WizardServiciosDraft }) {
    const esSolicito = draft.modo === 'solicito';
    const min = Number(draft.budgetMin) || 0;
    const max = Number(draft.budgetMax) || 0;
    const precioText =
        !min && !max
            ? 'A convenir'
            : min && !max
              ? `Desde $${min.toLocaleString('es-MX')}`
              : !min && max
                ? `Hasta $${max.toLocaleString('es-MX')}`
                : `$${min.toLocaleString('es-MX')}–$${max.toLocaleString('es-MX')}`;

    const fotoPortada = draft.fotos[draft.fotoPortadaIndex] ?? draft.fotos[0];
    const badgeLabel = esSolicito
        ? draft.urgente
            ? '⚡ Urgente · Solicito'
            : 'Solicito'
        : draft.urgente
          ? '⚡ Urgente · Servicio'
          : 'Servicio personal';

    return (
        <div className="rounded-2xl border-[1.5px] border-slate-300 bg-white overflow-hidden shadow-md">
            {/* Cover — gradiente azul, o ámbar si urgente */}
            <div
                className="relative h-12 lg:h-24"
                style={{
                    background: draft.urgente
                        ? 'linear-gradient(135deg, #f59e0b, #ea580c)'
                        : 'linear-gradient(135deg, #4ba5f5, #1577d3)',
                }}
            >
                {fotoPortada && (
                    <img
                        src={fotoPortada}
                        alt={draft.titulo || 'Foto'}
                        className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-luminosity"
                        loading="lazy"
                    />
                )}
                <span
                    className={
                        'absolute top-2 lg:top-3 left-2 lg:left-3 inline-flex items-center px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full text-[11px] font-bold ' +
                        (draft.urgente
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-white/95 text-slate-900')
                    }
                >
                    {badgeLabel}
                </span>
            </div>

            <div className="p-3 lg:p-5">
                <h3 className="text-base lg:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {draft.titulo || (
                        <span className="text-slate-400 italic font-medium text-[15px]">
                            Tu título aparecerá aquí
                        </span>
                    )}
                </h3>

                <div className="mt-1.5 lg:mt-2 flex items-baseline gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-600">
                        Presupuesto
                    </span>
                    <span className="text-base lg:text-xl font-extrabold text-slate-900 tabular-nums">
                        {precioText}
                    </span>
                </div>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {draft.categoria && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold border-[1.5px] border-blue-200">
                            {labelCategoria(draft.categoria)}
                        </span>
                    )}
                    {/* Zonas inline (mobile compacto) */}
                    {draft.zonasAproximadas.length === 0 ? (
                        <span className="text-[12px] lg:text-[12px] font-medium text-slate-500 italic">
                            Sin zonas
                        </span>
                    ) : (
                        <>
                            {draft.zonasAproximadas.slice(0, 3).map((z) => (
                                <span
                                    key={z}
                                    className="text-[12px] lg:text-[12px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded"
                                >
                                    {z}
                                </span>
                            ))}
                            {draft.zonasAproximadas.length > 3 && (
                                <span className="text-[12px] font-medium text-slate-500">
                                    +{draft.zonasAproximadas.length - 3}
                                </span>
                            )}
                        </>
                    )}
                </div>

                <p className="mt-2 lg:mt-3 text-[13px] lg:text-[13px] 2xl:text-sm text-slate-700 leading-snug lg:leading-relaxed font-medium line-clamp-2 lg:line-clamp-3">
                    {draft.descripcion || 'Tu descripción aparecerá aquí.'}
                </p>
            </div>
        </div>
    );
}

export default Paso3Revisar;
