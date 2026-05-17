/**
 * VacanteDetalleInline.tsx
 * ==========================
 * Vista de detalle de una vacante, montada en línea dentro de PaginaVacantes
 * (no es una ruta separada). Recibe la vacante seleccionada y un callback
 * `onVolver` para regresar a la lista.
 *
 * Layout: card principal + sidebar derecho (oculto en mobile) con métricas
 * y acciones rápidas. NO contiene lista de candidatos — AnunciaYA solo conecta;
 * las conversaciones viven en ChatYA.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/VacanteDetalleInline.tsx
 */

import {
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Calendar,
    Eye,
    MessageCircle,
    Bookmark,
    MapPin,
    Pencil,
    PauseCircle,
    PlayCircle,
    XCircle,
    Trash2,
} from 'lucide-react';
import {
    estadoUiVacante,
    formatearDiasSemana,
    formatearPrecioVacante,
} from './helpers';
import { PillTipoEmpleo, PillModalidad, PillEstadoVacante } from './VacanteAtoms';
import type { Vacante } from '../../../../../types/servicios';

interface VacanteDetalleInlineProps {
    vacante: Vacante;
    onVolver: () => void;
    onEditar: () => void;
    onPausar: () => void;
    onReactivar: () => void;
    onCerrar: () => void;
    onEliminar: () => void;
    onIrAConversaciones: () => void;
    onVerEnFeedPublico: () => void;
}

export function VacanteDetalleInline({
    vacante,
    onVolver,
    onEditar,
    onPausar,
    onReactivar,
    onCerrar,
    onEliminar,
    onIrAConversaciones,
    onVerEnFeedPublico,
}: VacanteDetalleInlineProps) {
    const estadoUi = estadoUiVacante(vacante.estado, vacante.expiraAt);
    const diasStr = formatearDiasSemana(vacante.diasSemana);

    const esCerrada = vacante.estado === 'cerrada';
    const fechaCierre = esCerrada ? new Date(vacante.updatedAt) : null;

    return (
        <div data-testid="vacante-detalle-inline">
            {/* Volver + breadcrumb */}
            <div className="flex items-center gap-2.5 mb-4">
                <button
                    type="button"
                    onClick={onVolver}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-50 transition-colors"
                    data-testid="btn-volver-lista"
                >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                    Volver
                </button>
                <span className="text-sm text-slate-500 font-medium hidden lg:inline-flex items-center">
                    Vacantes
                    <ChevronRight className="w-3 h-3 inline mx-1" strokeWidth={2} />
                    <span className="truncate max-w-[280px]">{vacante.titulo}</span>
                </span>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px]">
                {/* Card principal */}
                <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <header className="px-5 py-5 lg:px-6 border-b border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>
                                {vacante.sucursalNombre ?? 'Sin sucursal'} · Puerto Peñasco
                            </span>
                        </div>
                        <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 mb-2.5">
                            {vacante.titulo}
                        </h2>
                        <div className="flex flex-wrap gap-2 items-center">
                            <PillEstadoVacante estado={estadoUi} />
                            {vacante.tipoEmpleo && (
                                <PillTipoEmpleo tipoEmpleo={vacante.tipoEmpleo} />
                            )}
                            <PillModalidad modalidad={vacante.modalidad} />
                            <span className="text-sm lg:text-base font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                {formatearPrecioVacante(
                                    vacante.precio,
                                    vacante.tipoEmpleo,
                                )}
                            </span>
                        </div>
                        {esCerrada && fechaCierre && (
                            <p className="text-[12.5px] text-slate-500 mt-2 font-medium">
                                Cerrada el {fechaCierre.toLocaleDateString('es-MX')}
                            </p>
                        )}
                    </header>

                    {/* Descripción */}
                    <Seccion titulo="Descripción">
                        <p className="text-sm lg:text-base text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                            {vacante.descripcion}
                        </p>
                    </Seccion>

                    {/* Requisitos */}
                    {vacante.requisitos.length > 0 && (
                        <Seccion titulo="Requisitos">
                            <ChecklistVerde items={vacante.requisitos} />
                        </Seccion>
                    )}

                    {/* Beneficios */}
                    {vacante.beneficios.length > 0 && (
                        <Seccion titulo="Beneficios">
                            <ChecklistVerde items={vacante.beneficios} />
                        </Seccion>
                    )}

                    {/* Horario y días */}
                    {(vacante.horario || diasStr) && (
                        <Seccion titulo="Horario y días">
                            <div className="flex gap-6 flex-wrap text-sm lg:text-base text-slate-700">
                                {vacante.horario && (
                                    <div className="inline-flex items-center gap-2">
                                        <Clock
                                            className="w-4 h-4 text-slate-500"
                                            strokeWidth={1.75}
                                        />
                                        <b className="text-slate-900">
                                            {vacante.horario}
                                        </b>
                                    </div>
                                )}
                                {diasStr && (
                                    <div className="inline-flex items-center gap-2">
                                        <Calendar
                                            className="w-4 h-4 text-slate-500"
                                            strokeWidth={1.75}
                                        />
                                        <b className="text-slate-900">{diasStr}</b>
                                    </div>
                                )}
                            </div>
                        </Seccion>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 items-center px-5 lg:px-6 py-4 border-t border-slate-200">
                        {esCerrada ? (
                            <button
                                type="button"
                                onClick={onEliminar}
                                className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm lg:cursor-pointer hover:bg-rose-100 transition-colors"
                                data-testid="btn-detalle-eliminar"
                            >
                                <Trash2 className="w-[15px] h-[15px]" strokeWidth={1.75} />
                                Eliminar definitivamente
                            </button>
                        ) : (
                            <>
                                <BotonGhost
                                    icono={<Pencil className="w-[15px] h-[15px]" strokeWidth={1.75} />}
                                    onClick={onEditar}
                                    testId="btn-detalle-editar"
                                >
                                    Editar
                                </BotonGhost>
                                {vacante.estado === 'pausada' ? (
                                    <BotonGhost
                                        icono={
                                            <PlayCircle
                                                className="w-[15px] h-[15px]"
                                                strokeWidth={1.75}
                                            />
                                        }
                                        onClick={onReactivar}
                                        testId="btn-detalle-reactivar"
                                    >
                                        Reactivar
                                    </BotonGhost>
                                ) : (
                                    <BotonGhost
                                        icono={
                                            <PauseCircle
                                                className="w-[15px] h-[15px]"
                                                strokeWidth={1.75}
                                            />
                                        }
                                        onClick={onPausar}
                                        testId="btn-detalle-pausar"
                                    >
                                        Pausar
                                    </BotonGhost>
                                )}
                                <button
                                    type="button"
                                    onClick={onCerrar}
                                    className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm lg:cursor-pointer hover:bg-rose-100 transition-colors"
                                    data-testid="btn-detalle-cerrar"
                                >
                                    <XCircle
                                        className="w-[15px] h-[15px]"
                                        strokeWidth={1.75}
                                    />
                                    Cerrar vacante
                                </button>
                            </>
                        )}
                    </div>
                </article>

                {/* Sidebar (oculto en mobile) */}
                <aside className="space-y-3 hidden lg:block">
                    <SideCard titulo="Actividad">
                        <ActividadItem
                            icono={
                                <Eye
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            num={vacante.totalVistas}
                            label="Vistas totales"
                        />
                        <ActividadItem
                            icono={
                                <MessageCircle
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            num={vacante.totalMensajes}
                            label="Conversaciones iniciadas"
                            sub="Candidatos que te escribieron"
                        />
                        <ActividadItem
                            icono={
                                <Bookmark
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            num={vacante.totalGuardados}
                            label="Guardados"
                        />
                    </SideCard>

                    <SideCard titulo="Acciones rápidas">
                        <AccionRapida
                            icono={
                                <MessageCircle
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            titulo="Ver mis conversaciones"
                            sub="Abre ChatYA con candidatos de esta vacante"
                            onClick={onIrAConversaciones}
                            testId="quick-ver-conversaciones"
                        />
                        <AccionRapida
                            icono={
                                <Eye
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            titulo="Ver en feed público"
                            sub="Cómo se ve tu vacante en Servicios"
                            onClick={onVerEnFeedPublico}
                            testId="quick-ver-feed-publico"
                        />
                    </SideCard>
                </aside>
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function Seccion({
    titulo,
    children,
}: {
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <section className="px-5 lg:px-6 py-5 border-t border-slate-200">
            <h3 className="text-[12px] font-semibold tracking-wider uppercase text-slate-600 mb-2.5">
                {titulo}
            </h3>
            {children}
        </section>
    );
}

function ChecklistVerde({ items }: { items: string[] }) {
    return (
        <ul className="grid gap-2">
            {items.map((item, idx) => (
                <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700 font-medium"
                >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function BotonGhost({
    icono,
    onClick,
    testId,
    children,
}: {
    icono: React.ReactNode;
    onClick: () => void;
    testId?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-50 transition-colors"
            data-testid={testId}
        >
            {icono}
            {children}
        </button>
    );
}

function SideCard({
    titulo,
    children,
}: {
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <header className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-[12px] font-semibold tracking-wider uppercase text-slate-600">
                    {titulo}
                </h3>
            </header>
            <div>{children}</div>
        </div>
    );
}

function ActividadItem({
    icono,
    num,
    label,
    sub,
}: {
    icono: React.ReactNode;
    num: number;
    label: string;
    sub?: string;
}) {
    return (
        <div className="flex items-center gap-3.5 px-5 py-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 grid place-items-center shrink-0">
                {icono}
            </div>
            <div className="min-w-0">
                <div className="text-xl lg:text-lg 2xl:text-xl font-bold leading-none tabular-nums tracking-tight text-slate-800">
                    {num}
                </div>
                <div className="text-sm text-slate-500 mt-0.5 font-medium">
                    {label}
                    {sub && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            {sub}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AccionRapida({
    icono,
    titulo,
    sub,
    onClick,
    testId,
}: {
    icono: React.ReactNode;
    titulo: string;
    sub: string;
    onClick: () => void;
    testId?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-3 px-5 py-4 border-t border-slate-200 first:border-t-0 text-left lg:cursor-pointer hover:bg-slate-50 transition-colors"
            data-testid={testId}
        >
            <span className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0">
                {icono}
            </span>
            <span className="flex-1 min-w-0">
                <strong className="block text-sm font-bold text-slate-900">
                    {titulo}
                </strong>
                <span className="block text-[12.5px] text-slate-500 mt-0.5 font-medium">
                    {sub}
                </span>
            </span>
            <ChevronRight
                className="w-4 h-4 text-slate-400 shrink-0"
                strokeWidth={1.75}
            />
        </button>
    );
}

