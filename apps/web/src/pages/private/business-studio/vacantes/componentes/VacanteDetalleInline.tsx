/**
 * VacanteDetalleInline.tsx
 * ==========================
 * Vista de detalle de una vacante, montada en línea dentro de PaginaVacantes
 * (no es una ruta separada). Recibe la vacante seleccionada y un callback
 * `onVolver` para regresar a la lista (el botón vive en el header de la página).
 *
 * Layout: card principal + sidebar derecho (oculto en mobile) con métricas
 * y acciones rápidas. NO contiene lista de candidatos — AnunciaYA solo conecta;
 * las conversaciones viven en ChatYA.
 *
 * Tokens: border-2 border-slate-300, rounded-xl, shadow-md (cards BS),
 * tamaños responsive, sin transition-colors, sin pastel -50/-200.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/VacanteDetalleInline.tsx
 */

import {
    ArrowLeft,
    Briefcase,
    Check,
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
    expandirHorarioEstructurado,
    formatearDiasSemana,
    formatearPrecioVacante,
} from './helpers';
import {
    PillTipoEmpleo,
    PillModalidad,
    PillEstadoVacante,
    PillSueldoATratar,
} from './VacanteAtoms';
import type { Vacante } from '../../../../../types/servicios';

const MESES_LARGOS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearFechaLarga(fecha: Date): string {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = MESES_LARGOS[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

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
        <div data-testid="vacante-detalle-inline" className="lg:mt-7 2xl:mt-14">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px]">
                {/* Card principal */}
                <article className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-md">
                    {/* Header del card — avatar Briefcase con gradient (igual al header de PC).
                        En mobile incluye botón Volver porque el header de la página está oculto. */}
                    <header className="px-5 lg:px-6 py-5 border-b border-slate-300">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={onVolver}
                                className="lg:hidden w-10 h-10 rounded-lg bg-white border-2 border-slate-300 text-slate-700 grid place-items-center shrink-0 hover:bg-slate-100 hover:border-slate-400"
                                data-testid="btn-volver-mobile"
                                aria-label="Volver a la lista"
                            >
                                <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                            </button>
                            <div
                                className="lg:hidden w-14 h-14 rounded-lg grid place-items-center shrink-0"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #0ea5e9, #2563eb, #1d4ed8)',
                                    boxShadow: '0 6px 20px rgba(14,165,233,0.4)',
                                }}
                            >
                                <Briefcase
                                    className="w-6 h-6 text-white"
                                    strokeWidth={1.75}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mb-1 font-medium">
                                    <MapPin
                                        className="w-3.5 h-3.5 text-slate-500 shrink-0"
                                        strokeWidth={1.75}
                                    />
                                    <span className="truncate">
                                        {vacante.sucursalNombre ?? 'Sin sucursal'}
                                        {vacante.ciudad ? ` · ${vacante.ciudad}` : ''}
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
                                    {/* Sprint 9.3: cuando es 'a-convenir' lo
                                        mostramos como `PillSueldoATratar`
                                        (mismo `CLASES_PILL_BASE` que los
                                        demás pills de esta fila). Cuando
                                        hay monto real, sigue como texto
                                        bold tabular. */}
                                    {vacante.precio.kind === 'a-convenir' ? (
                                        <PillSueldoATratar />
                                    ) : (
                                        <span className="text-sm lg:text-base font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                            {formatearPrecioVacante(
                                                vacante.precio,
                                                vacante.tipoEmpleo,
                                            )}
                                        </span>
                                    )}
                                </div>
                                {esCerrada && fechaCierre && (
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-2 font-medium">
                                        Cerrada el {formatearFechaLarga(fechaCierre)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Descripción */}
                    <Seccion titulo="Descripción">
                        <p className="text-sm lg:text-base text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                            {vacante.descripcion}
                        </p>
                    </Seccion>

                    {/* Requisitos + Beneficios (2 columnas en desktop, apilados en mobile) */}
                    {(vacante.requisitos.length > 0 || vacante.beneficios.length > 0) && (
                        <section className="px-5 lg:px-6 py-5 border-t border-slate-300">
                            <div
                                className={
                                    vacante.requisitos.length > 0 &&
                                    vacante.beneficios.length > 0
                                        ? 'grid gap-5 lg:gap-0 lg:grid-cols-2'
                                        : ''
                                }
                            >
                                {vacante.requisitos.length > 0 && (
                                    <div
                                        className={
                                            vacante.beneficios.length > 0 ? 'lg:pr-6' : ''
                                        }
                                    >
                                        <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-bold tracking-[0.12em] uppercase text-slate-600 mb-2.5">
                                            Requisitos
                                        </h3>
                                        <ChecklistVerde items={vacante.requisitos} />
                                    </div>
                                )}
                                {vacante.beneficios.length > 0 && (
                                    <div
                                        className={
                                            vacante.requisitos.length > 0
                                                ? 'lg:pl-6 lg:border-l lg:border-slate-300'
                                                : ''
                                        }
                                    >
                                        <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-bold tracking-[0.12em] uppercase text-slate-600 mb-2.5">
                                            Beneficios
                                        </h3>
                                        <ChecklistVerde items={vacante.beneficios} />
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Horario y días */}
                    {(vacante.horario || diasStr) && (
                        <Seccion titulo="Horario y días">
                            <HorarioDisplay
                                horario={vacante.horario}
                                diasStr={diasStr}
                            />
                        </Seccion>
                    )}

                    {/* Acciones — flex-1 en mobile garantiza que los 3 botones quepan
                        en cualquier ancho; lg:flex-none restaura el ancho natural */}
                    <div className="flex gap-2 items-stretch px-5 lg:px-6 py-4 border-t border-slate-300">
                        {esCerrada ? (
                            <button
                                type="button"
                                onClick={onEliminar}
                                className="flex-1 lg:flex-none lg:ml-auto inline-flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg bg-white border-2 border-rose-300 text-rose-700 font-semibold text-sm lg:cursor-pointer hover:bg-rose-100 hover:border-rose-400"
                                data-testid="btn-detalle-eliminar"
                            >
                                <Trash2 className="w-[15px] h-[15px] shrink-0" strokeWidth={1.75} />
                                <span>
                                    Eliminar
                                    <span className="hidden lg:inline"> definitivamente</span>
                                </span>
                            </button>
                        ) : (
                            <>
                                <BotonGhost
                                    icono={<Pencil className="w-[15px] h-[15px] shrink-0" strokeWidth={1.75} />}
                                    onClick={onEditar}
                                    testId="btn-detalle-editar"
                                    className="flex-1 lg:flex-none"
                                >
                                    Editar
                                </BotonGhost>
                                {vacante.estado === 'pausada' ? (
                                    <BotonGhost
                                        icono={
                                            <PlayCircle
                                                className="w-[15px] h-[15px] shrink-0"
                                                strokeWidth={1.75}
                                            />
                                        }
                                        onClick={onReactivar}
                                        testId="btn-detalle-reactivar"
                                        className="flex-1 lg:flex-none"
                                    >
                                        Reactivar
                                    </BotonGhost>
                                ) : (
                                    <BotonGhost
                                        icono={
                                            <PauseCircle
                                                className="w-[15px] h-[15px] shrink-0"
                                                strokeWidth={1.75}
                                            />
                                        }
                                        onClick={onPausar}
                                        testId="btn-detalle-pausar"
                                        className="flex-1 lg:flex-none"
                                    >
                                        Pausar
                                    </BotonGhost>
                                )}
                                <button
                                    type="button"
                                    onClick={onCerrar}
                                    className="flex-1 lg:flex-none lg:ml-auto inline-flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg bg-white border-2 border-rose-300 text-rose-700 font-semibold text-sm lg:cursor-pointer hover:bg-rose-100 hover:border-rose-400"
                                    data-testid="btn-detalle-cerrar"
                                >
                                    <XCircle
                                        className="w-[15px] h-[15px] shrink-0"
                                        strokeWidth={1.75}
                                    />
                                    <span>
                                        Cerrar
                                        <span className="hidden lg:inline"> vacante</span>
                                    </span>
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
                            label="Vistas"
                            colorIcono="bg-slate-200 text-slate-600"
                        />
                        <ActividadItem
                            icono={
                                <MessageCircle
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            num={vacante.totalMensajes}
                            label="Mensajes"
                            colorIcono="bg-blue-100 text-blue-600"
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
                            colorIcono="bg-amber-100 text-amber-600"
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
                            titulo="Ver chats"
                            sub="Solo los de esta vacante"
                            onClick={onIrAConversaciones}
                            testId="quick-ver-conversaciones"
                            colorIcono="bg-blue-100 text-blue-600"
                        />
                        <AccionRapida
                            icono={
                                <Eye
                                    className="w-[18px] h-[18px]"
                                    strokeWidth={1.75}
                                />
                            }
                            titulo="Ver publicación"
                            sub="en la sección de Servicios"
                            onClick={onVerEnFeedPublico}
                            testId="quick-ver-feed-publico"
                            colorIcono="bg-slate-200 text-slate-600"
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
        <section className="px-5 lg:px-6 py-5 border-t border-slate-300">
            <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-bold tracking-[0.12em] uppercase text-slate-600 mb-2.5">
                {titulo}
            </h3>
            {children}
        </section>
    );
}

function HorarioDisplay({
    horario,
    diasStr,
}: {
    horario: string | null;
    diasStr: string | null;
}) {
    // Formato estructurado del wizard → 1 línea por bloque con días largos
    const bloques = horario ? expandirHorarioEstructurado(horario) : null;

    if (bloques) {
        return (
            <div className="space-y-1.5">
                {bloques.map((b, i) => (
                    <div
                        key={i}
                        className="inline-flex items-center gap-2 text-sm lg:text-base text-slate-900 font-bold mr-4"
                    >
                        <Clock
                            className="w-4 h-4 text-slate-500 shrink-0"
                            strokeWidth={1.75}
                        />
                        <span>{b}</span>
                    </div>
                ))}
            </div>
        );
    }

    // Fallback legacy: horario en texto libre + días por separado
    return (
        <div className="flex gap-6 flex-wrap text-sm lg:text-base text-slate-700">
            {horario && (
                <div className="inline-flex items-center gap-2">
                    <Clock
                        className="w-4 h-4 text-slate-500 shrink-0"
                        strokeWidth={1.75}
                    />
                    <b className="text-slate-900">{horario}</b>
                </div>
            )}
            {diasStr && (
                <div className="inline-flex items-center gap-2">
                    <Calendar
                        className="w-4 h-4 text-slate-500 shrink-0"
                        strokeWidth={1.75}
                    />
                    <b className="text-slate-900">{diasStr}</b>
                </div>
            )}
        </div>
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
    className = '',
}: {
    icono: React.ReactNode;
    onClick: () => void;
    testId?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg bg-white border-2 border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-100 hover:border-slate-400 ${className}`}
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
        <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-md">
            <header className="px-5 py-4 border-b border-slate-300">
                <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-bold tracking-[0.12em] uppercase text-slate-600">
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
    colorIcono = 'bg-slate-200 text-slate-700',
}: {
    icono: React.ReactNode;
    num: number;
    label: string;
    sub?: string;
    colorIcono?: string;
}) {
    return (
        <div className="flex items-center gap-3.5 px-5 py-3">
            <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${colorIcono}`}>
                {icono}
            </div>
            <div className="min-w-0">
                <div className="text-xl lg:text-lg 2xl:text-xl font-bold leading-none tabular-nums tracking-tight text-slate-800">
                    {num}
                </div>
                <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-700 mt-0.5 font-semibold">
                    {label}
                    {sub && (
                        <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-0.5 font-medium">
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
    colorIcono = 'bg-slate-200 text-slate-700',
}: {
    icono: React.ReactNode;
    titulo: string;
    sub: string;
    onClick: () => void;
    testId?: string;
    colorIcono?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-3 px-5 py-4 border-t border-slate-300 first:border-t-0 text-left lg:cursor-pointer hover:bg-slate-100"
            data-testid={testId}
        >
            <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${colorIcono}`}>
                {icono}
            </span>
            <span className="flex-1 min-w-0">
                <strong className="block text-sm font-bold text-slate-900">
                    {titulo}
                </strong>
                <span className="block text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-0.5 font-medium">
                    {sub}
                </span>
            </span>
            <ChevronRight
                className="w-4 h-4 text-slate-500 shrink-0"
                strokeWidth={1.75}
            />
        </button>
    );
}
