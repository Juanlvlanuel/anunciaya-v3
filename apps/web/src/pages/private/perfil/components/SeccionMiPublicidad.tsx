/**
 * SeccionMiPublicidad.tsx
 * ========================
 * Vista "Publicidad" del tab "Membresía y Pagos" (Mi Perfil, Modo Personal). Espeja el layout
 * de la vista Membresía: 2 columnas de misma altura.
 *   - Izquierda (informativa): botón "Anunciar más" + las campañas del usuario (espacio, ciudades,
 *     vigencia, estado, renovar). SIN los pagos (esos viven en la columna derecha).
 *   - Derecha: "Historial de pagos" con TODOS los pagos de todas las campañas (inicial + renovaciones),
 *     scroll interno. Cada pago abre un modal con su detalle (creatividad, datos y recibo PDF).
 *
 * Aplica tanto a usuarios SIN negocio (solo anunciantes) como a comerciantes que además compraron
 * publicidad (ahí se muestra bajo la sub-navegación Membresía/Publicidad).
 *
 * Ubicación: apps/web/src/pages/private/perfil/components/SeccionMiPublicidad.tsx
 */

import { useMemo, useState } from 'react';
import { ChevronRight, ExternalLink, FileText, MapPin, Megaphone, Plus, RotateCw } from 'lucide-react';
import { ModalAdaptativo } from '@/components/ui/ModalAdaptativo';
import { useNavegarASeccion } from '@/hooks/useNavegarASeccion';
import type { PublicidadCompra, ReciboPublicidad } from '@/services/membresiaService';

/** Dark Gradient de Marca (TC-7) — botones de acción primaria. */
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatearFecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatearMonto(monto: string | null): string {
    if (monto === null) return '—';
    const n = Number(monto);
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

/** Carrusel → tamaño del espacio (terminología de la app). */
const LABEL_CARRUSEL: Record<string, string> = {
    patrocinadores: 'Grande',
    anuncios: 'Chico',
    fundadores: 'Fundador',
};

function tamanos(carruseles: string[]): string {
    const labels = carruseles.map((c) => LABEL_CARRUSEL[c] ?? c);
    return labels.length ? labels.join(' + ') : 'Publicidad';
}

/** Estado mostrado: una compra 'activa' con vigencia pasada se ve como "Vencida". */
function estadoInfo(p: PublicidadCompra): { texto: string; clase: string } {
    const vigente = p.expiraAt !== null && new Date(p.expiraAt).getTime() > Date.now();
    if (p.estado === 'activa') {
        return vigente
            ? { texto: 'Activa', clase: 'bg-emerald-100 text-emerald-700' }
            : { texto: 'Vencida', clase: 'bg-slate-200 text-slate-600' };
    }
    if (p.estado === 'pausada') return { texto: 'Pausada', clase: 'bg-amber-100 text-amber-700' };
    if (p.estado === 'cancelada') return { texto: 'Cancelada', clase: 'bg-red-100 text-red-700' };
    return { texto: 'Vencida', clase: 'bg-slate-200 text-slate-600' };
}

function vigenciaTexto(p: PublicidadCompra): string {
    if (!p.expiraAt) return '—';
    const vigente = new Date(p.expiraAt).getTime() > Date.now();
    return vigente ? `Hasta el ${formatearFecha(p.expiraAt)}` : `Venció el ${formatearFecha(p.expiraAt)}`;
}

function ciudadesTexto(ciudades: string[]): string {
    if (ciudades.length === 0) return 'Sin ciudades';
    if (ciudades.length <= 2) return ciudades.join(', ');
    return `${ciudades.slice(0, 2).join(', ')} y ${ciudades.length - 2} más`;
}

/** Fila "Etiqueta — valor" (mismo patrón que la tarjeta de membresía). */
function Dato({ label, valor }: { label: string; valor: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="text-sm font-bold text-slate-700">{label}</span>
            <span className="text-sm font-medium text-slate-800 text-right">{valor}</span>
        </div>
    );
}

/** Un pago aplanado (recibo de una campaña) para el historial de la derecha. */
interface PagoPub {
    key: string;
    campana: PublicidadCompra;
    recibo: ReciboPublicidad;
}

export default function SeccionMiPublicidad({ publicidad }: { publicidad: PublicidadCompra[] }) {
    const navegar = useNavegarASeccion();
    // Pago cuyo detalle se ve en modal (creatividad + datos + recibo).
    const [pagoDetalle, setPagoDetalle] = useState<PagoPub | null>(null);

    // Todos los pagos de todas las campañas, aplanados y ordenados por fecha desc.
    const pagos = useMemo<PagoPub[]>(() => {
        const arr: PagoPub[] = [];
        publicidad.forEach((p) => {
            p.recibos.forEach((r, i) => arr.push({ key: `${p.id}-${i}`, campana: p, recibo: r }));
        });
        return arr.sort((a, b) => new Date(b.recibo.fecha ?? 0).getTime() - new Date(a.recibo.fecha ?? 0).getTime());
    }, [publicidad]);

    return (
        <div data-testid="seccion-mi-publicidad" className="lg:grid lg:grid-cols-5 lg:gap-6 space-y-4 lg:space-y-0">
            {/* ── Izquierda: panel compacto de anuncios (filas densas, no cards grandes) ── */}
            <div className="lg:col-span-3">
                <div className="rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                        <Megaphone className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-500" strokeWidth={2} />
                        <p className="text-sm font-bold text-slate-800">Tus anuncios</p>
                        <button
                            data-testid="btn-anunciar-mas"
                            onClick={() => navegar('/anunciate')}
                            style={{ background: GRADIENTE_MARCA }}
                            className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer text-white shadow-sm"
                        >
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            Anunciar más
                        </button>
                    </div>
                    <ul className="divide-y divide-slate-200">
                        {publicidad.map((p) => {
                            const est = estadoInfo(p);
                            return (
                                <li key={p.id} data-testid={`pub-${p.id}`} className="flex items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-800 truncate">Espacio {tamanos(p.carruseles)}</p>
                                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold ${est.clase}`}>
                                                {est.texto}
                                            </span>
                                        </div>
                                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-0.5 flex items-center gap-1">
                                            <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" strokeWidth={2} />
                                            <span className="truncate">{ciudadesTexto(p.ciudades)} · {vigenciaTexto(p)}</span>
                                        </p>
                                    </div>
                                    {p.estado !== 'cancelada' && (
                                        <button
                                            onClick={() => navegar('/anunciate', { state: { renovarId: p.id } })}
                                            data-testid={`pub-renovar-${p.id}`}
                                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-700 cursor-pointer lg:hover:bg-slate-200"
                                        >
                                            <RotateCw className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
                                            Renovar
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* ── Derecha: historial de pagos (todos los pagos, cada uno abre modal de detalle) ── */}
            <div className="lg:col-span-2">
                <div className="rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden flex flex-col lg:h-full">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
                        <FileText className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-500" strokeWidth={2} />
                        <p className="text-sm font-bold text-slate-800">Historial de pagos</p>
                        {pagos.length > 0 && (
                            <span className="ml-auto text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
                                {pagos.length} {pagos.length === 1 ? 'pago' : 'pagos'}
                            </span>
                        )}
                    </div>

                    {pagos.length === 0 ? (
                        <div className="p-6 text-center text-sm font-medium text-slate-600">Aún no tienes pagos.</div>
                    ) : (
                        <ul className="flex-1 min-h-0 overflow-y-auto max-h-[26rem] lg:max-h-none divide-y divide-slate-200">
                            {pagos.map((pago) => {
                                const thumb = pago.recibo.imagenes[0];
                                return (
                                    <li key={pago.key}>
                                        <button
                                            data-testid={`pub-pago-${pago.key}`}
                                            onClick={() => setPagoDetalle(pago)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer lg:hover:bg-slate-200"
                                        >
                                            {thumb ? (
                                                <img src={thumb} alt="Anuncio" className="w-9 h-9 rounded-md object-cover border border-slate-300 shrink-0" />
                                            ) : (
                                                <span className="w-9 h-9 rounded-md bg-slate-200 border border-slate-300 shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800 truncate">
                                                    {pago.recibo.esRenovacion ? 'Renovación' : 'Pago inicial'}
                                                    <span className="font-medium text-slate-600"> · Espacio {tamanos(pago.campana.carruseles)}</span>
                                                </p>
                                                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-0.5">
                                                    {formatearFecha(pago.recibo.fecha)}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700 shrink-0">{formatearMonto(pago.recibo.monto)}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.5} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* ── Modal: detalle de un pago de publicidad ── */}
            <ModalAdaptativo
                abierto={pagoDetalle !== null}
                onCerrar={() => setPagoDetalle(null)}
                titulo="Detalle del pago"
                iconoTitulo={<FileText className="w-5 h-5 text-slate-600" strokeWidth={2} />}
                ancho="md"
            >
                {pagoDetalle && (
                    <div data-testid="pub-detalle-pago" className="space-y-4">
                        {pagoDetalle.recibo.imagenes.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2">
                                {pagoDetalle.recibo.imagenes.map((url, j) => (
                                    <img
                                        key={j}
                                        src={url}
                                        alt="Anuncio"
                                        className="max-h-56 w-full max-w-xs rounded-xl border border-slate-300 object-contain"
                                    />
                                ))}
                            </div>
                        )}

                        <div className="rounded-lg bg-slate-200 border border-slate-300 p-3 divide-y divide-slate-300">
                            <Dato label="Concepto" valor={pagoDetalle.recibo.esRenovacion ? 'Renovación' : 'Pago inicial'} />
                            <Dato label="Espacio" valor={`Espacio ${tamanos(pagoDetalle.campana.carruseles)}`} />
                            <Dato label="Ciudades" valor={ciudadesTexto(pagoDetalle.campana.ciudades)} />
                            {pagoDetalle.recibo.folio != null && <Dato label="Folio" valor={`#${pagoDetalle.recibo.folio}`} />}
                            <Dato label="Fecha" valor={formatearFecha(pagoDetalle.recibo.fecha)} />
                            <Dato label="Monto" valor={formatearMonto(pagoDetalle.recibo.monto)} />
                        </div>

                        {pagoDetalle.recibo.reciboUrl && (
                            <a
                                href={pagoDetalle.recibo.reciboUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid="pub-detalle-ver-recibo"
                                style={{ background: GRADIENTE_MARCA }}
                                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer text-white shadow-md"
                            >
                                <FileText className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                                Ver recibo (PDF)
                                <ExternalLink className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />
                            </a>
                        )}
                    </div>
                )}
            </ModalAdaptativo>
        </div>
    );
}
