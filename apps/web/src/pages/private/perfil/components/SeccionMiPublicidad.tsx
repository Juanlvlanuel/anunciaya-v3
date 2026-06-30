/**
 * SeccionMiPublicidad.tsx
 * ========================
 * Vista "Tu publicidad" del tab "Membresía y Pagos" (Mi Perfil, Modo Personal). Lista las
 * campañas de publicidad del usuario (las que compró en la columna derecha de la app): el
 * espacio (Grande/Chico), las ciudades, la vigencia, el importe y el recibo. Aplica tanto a
 * usuarios SIN negocio (solo anunciantes) como a comerciantes que además compraron publicidad.
 *
 * El recibo (`reciboUrl`) es un PDF público en R2, así que se abre directo (sin endpoint).
 *
 * Ubicación: apps/web/src/pages/private/perfil/components/SeccionMiPublicidad.tsx
 */

import { ExternalLink, FileText, MapPin, Megaphone, Plus, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PublicidadCompra } from '@/services/membresiaService';

/** Dark Gradient de Marca (TC-7) — botón de acción primaria. */
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

export default function SeccionMiPublicidad({ publicidad }: { publicidad: PublicidadCompra[] }) {
    const navigate = useNavigate();

    return (
        <div data-testid="seccion-mi-publicidad">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Megaphone className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600 shrink-0" strokeWidth={2} />
                    <h2 className="text-sm font-bold text-slate-800">Tu publicidad</h2>
                </div>
                <button
                    data-testid="btn-anunciar-mas"
                    onClick={() => navigate('/anunciate')}
                    style={{ background: GRADIENTE_MARCA }}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer text-white shadow-md"
                >
                    <Plus className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
                    Anunciar más
                </button>
            </div>

            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
                {publicidad.map((p) => {
                    const est = estadoInfo(p);
                    return (
                        <div
                            key={p.id}
                            data-testid={`pub-${p.id}`}
                            className="rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden"
                        >
                            <div className="flex items-start justify-between gap-3 p-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800">Espacio {tamanos(p.carruseles)}</p>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                                        <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" strokeWidth={2} />
                                        <span className="truncate">{ciudadesTexto(p.ciudades)}</span>
                                    </p>
                                </div>
                                <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold ${est.clase}`}>
                                    {est.texto}
                                </span>
                            </div>

                            <div className="px-4 py-2.5 border-t border-slate-200 divide-y divide-slate-200">
                                <Dato label="Vigencia" valor={vigenciaTexto(p)} />
                                <Dato label="Importe" valor={p.origen === 'cortesia' ? 'Cortesía' : formatearMonto(p.monto)} />
                            </div>

                            {(p.reciboUrl || p.estado !== 'cancelada') && (
                                <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-3">
                                    {p.reciboUrl ? (
                                        <a
                                            href={p.reciboUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-testid={`pub-recibo-${p.id}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 lg:hover:text-blue-800 cursor-pointer"
                                        >
                                            <FileText className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                                            Ver recibo
                                            <ExternalLink className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />
                                        </a>
                                    ) : (
                                        <span />
                                    )}
                                    {p.estado !== 'cancelada' && (
                                        <button
                                            onClick={() => navigate('/anunciate', { state: { renovarId: p.id } })}
                                            data-testid={`pub-renovar-${p.id}`}
                                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 cursor-pointer lg:hover:bg-slate-200"
                                        >
                                            <RotateCw className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
                                            Renovar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
