/**
 * MenuAutorPregunta.tsx
 * ======================
 * Menú dropdown con las acciones del autor sobre SU propia pregunta del Home.
 *
 * Acciones (con reglas de visibilidad):
 *   - Editar             → solo si estadoPregunta='activa' Y totalRespuestas===0
 *   - Marcar resuelta    → solo si estadoPregunta='activa' Y resueltaAt===null
 *   - Cerrar pregunta    → solo si estadoPregunta='activa'
 *   - Borrar pregunta    → siempre (excepto si ya está 'oculta')
 *
 * Cada acción destructiva pide confirmación con ModalAdaptativo (mismo patrón
 * que MisPublicaciones). El modal de edición es un componente aparte
 * (`ModalEditarPregunta`).
 *
 * Cierre del dropdown:
 *   - Click fuera (mousedown listener con guard para ignorar el botón trigger).
 *   - Después de cualquier acción (cerrar/borrar/resolver/abrir-modal).
 *
 * Padre típico: `CardPregunta` en `PaginaInicio.tsx`. El padre decide cuándo
 * renderizar este menú (típicamente solo si `usuarioId === pregunta.autorId`).
 *
 * Ubicación: apps/web/src/components/home/MenuAutorPregunta.tsx
 */

import {
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import {
    MoreVertical,
    Pencil,
    CheckCircle2,
    XCircle,
    Trash2,
    Loader2,
    type LucideIcon,
} from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { ModalEditarPregunta } from './ModalEditarPregunta';
import {
    useCerrarMiPregunta,
    useMarcarResuelta,
    useBorrarMiPregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { notificar } from '../../utils/notificaciones';
import type {
    PreguntaComunidad,
    EstadoPregunta,
} from '../../types/preguntasComunidad';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface MenuAutorPreguntaProps {
    pregunta: PreguntaComunidad;
}

type Accion = 'cerrar' | 'resolver' | 'borrar' | 'editar';

export function MenuAutorPregunta({ pregunta }: MenuAutorPreguntaProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [accionPendiente, setAccionPendiente] = useState<Accion | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const cerrarMut = useCerrarMiPregunta();
    const resolverMut = useMarcarResuelta();
    const borrarMut = useBorrarMiPregunta();

    // Cerrar el dropdown al click afuera (mismo patrón que CardArticuloMio).
    // El `data-menu-toggle-pregunta` identifica el botón de ESTA pregunta sin
    // colisionar con otras del feed.
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest(`[data-menu-toggle-pregunta="${pregunta.id}"]`)) return;
            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto, pregunta.id]);

    // Reglas de visibilidad (mismo set que el backend valida).
    const estaActiva = pregunta.estadoPregunta === 'activa';
    const yaResuelta = pregunta.resueltaAt !== null;
    const sinRespuestas = pregunta.totalRespuestas === 0;
    const yaOculta: boolean = pregunta.estadoPregunta === ('oculta' as EstadoPregunta);

    const puedeEditar = estaActiva && sinRespuestas;
    const puedeResolver = estaActiva && !yaResuelta;
    const puedeCerrar = estaActiva;
    const puedeBorrar = !yaOculta;

    // Si NO hay ninguna acción disponible, no renderizamos el trigger
    // (típicamente ocurre cuando la pregunta ya está 'oculta'). El padre
    // se vería extraño con un botón inerte.
    const hayAcciones = puedeEditar || puedeResolver || puedeCerrar || puedeBorrar;
    if (!hayAcciones) return null;

    const handleToggleMenu = (e: ReactMouseEvent) => {
        e.stopPropagation();
        setMenuAbierto((v) => !v);
    };

    const abrirAccion = (accion: Accion) => {
        setMenuAbierto(false);
        setAccionPendiente(accion);
    };

    const cerrarAccion = () => setAccionPendiente(null);

    // Handlers de confirmación
    const confirmarCerrar = () => {
        cerrarMut.mutate(pregunta.id, {
            onSuccess: () => {
                notificar.exito('Pregunta cerrada — ya no recibirá más respuestas');
                cerrarAccion();
            },
            onError: (err) => {
                const mensaje =
                    err instanceof Error ? err.message : 'No se pudo cerrar la pregunta';
                notificar.error(mensaje);
            },
        });
    };

    const confirmarResolver = () => {
        resolverMut.mutate(pregunta.id, {
            onSuccess: () => {
                notificar.exito('Pregunta marcada como resuelta');
                cerrarAccion();
            },
            onError: (err) => {
                const mensaje =
                    err instanceof Error ? err.message : 'No se pudo marcar como resuelta';
                notificar.error(mensaje);
            },
        });
    };

    const confirmarBorrar = () => {
        borrarMut.mutate(pregunta.id, {
            onSuccess: () => {
                notificar.exito('Pregunta eliminada');
                cerrarAccion();
            },
            onError: (err) => {
                const mensaje =
                    err instanceof Error ? err.message : 'No se pudo eliminar la pregunta';
                notificar.error(mensaje);
            },
        });
    };

    return (
        <>
            <div className="relative inline-block">
                <button
                    type="button"
                    onClick={handleToggleMenu}
                    aria-haspopup="menu"
                    aria-expanded={menuAbierto}
                    aria-label="Acciones de la pregunta"
                    data-testid={`pregunta-menu-${pregunta.id}`}
                    data-menu-toggle-pregunta={pregunta.id}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:cursor-pointer transition-colors"
                >
                    <MoreVertical className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
                </button>

                {menuAbierto && (
                    <div
                        ref={menuRef}
                        className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
                        onClick={(e) => e.stopPropagation()}
                        role="menu"
                    >
                        {puedeEditar && (
                            <BotonMenu
                                testId={`pregunta-menu-editar-${pregunta.id}`}
                                icono={Pencil}
                                onClick={() => abrirAccion('editar')}
                            >
                                Editar
                            </BotonMenu>
                        )}
                        {puedeResolver && (
                            <BotonMenu
                                testId={`pregunta-menu-resolver-${pregunta.id}`}
                                icono={CheckCircle2}
                                iconColor="text-emerald-600"
                                onClick={() => abrirAccion('resolver')}
                            >
                                Marcar como resuelta
                            </BotonMenu>
                        )}
                        {puedeCerrar && (
                            <BotonMenu
                                testId={`pregunta-menu-cerrar-${pregunta.id}`}
                                icono={XCircle}
                                iconColor="text-amber-600"
                                onClick={() => abrirAccion('cerrar')}
                            >
                                Cerrar pregunta
                            </BotonMenu>
                        )}
                        {puedeBorrar && (
                            <>
                                {(puedeEditar || puedeResolver || puedeCerrar) && (
                                    <div className="my-1 border-t border-slate-200" />
                                )}
                                <BotonMenu
                                    testId={`pregunta-menu-borrar-${pregunta.id}`}
                                    icono={Trash2}
                                    iconColor="text-red-600"
                                    textColor="text-red-600"
                                    hoverClass="hover:bg-red-50"
                                    onClick={() => abrirAccion('borrar')}
                                >
                                    Eliminar
                                </BotonMenu>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modal: editar texto ─────────────────────────────────────── */}
            <ModalEditarPregunta
                abierto={accionPendiente === 'editar'}
                onCerrar={cerrarAccion}
                preguntaId={pregunta.id}
                textoInicial={pregunta.texto}
            />

            {/* ── Modal: confirmar cerrar ─────────────────────────────────── */}
            <ModalAdaptativo
                abierto={accionPendiente === 'cerrar'}
                onCerrar={cerrarAccion}
                titulo={
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" strokeWidth={2.5} />
                        <span>Cerrar pregunta</span>
                    </div>
                }
                ancho="sm"
            >
                <div className="space-y-4 p-4 lg:p-5">
                    <p className="text-sm lg:text-base text-slate-700">
                        Tu pregunta saldrá del feed y ya no podrá recibir más respuestas.
                        Las respuestas que ya te dejaron se conservan.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={cerrarAccion}
                            disabled={cerrarMut.isPending}
                            data-testid={`pregunta-cerrar-cancelar-${pregunta.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 lg:cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmarCerrar}
                            disabled={cerrarMut.isPending}
                            data-testid={`pregunta-cerrar-confirmar-${pregunta.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-amber-700 lg:cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            {cerrarMut.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                    Cerrando…
                                </>
                            ) : (
                                'Sí, cerrar pregunta'
                            )}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* ── Modal: confirmar marcar resuelta ────────────────────────── */}
            <ModalAdaptativo
                abierto={accionPendiente === 'resolver'}
                onCerrar={cerrarAccion}
                titulo={
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" strokeWidth={2.5} />
                        <span>Marcar como resuelta</span>
                    </div>
                }
                ancho="sm"
            >
                <div className="space-y-4 p-4 lg:p-5">
                    <p className="text-sm lg:text-base text-slate-700">
                        Tu pregunta seguirá visible y puede recibir más respuestas, pero
                        aparecerá con una etiqueta de "Resuelta" para que tus vecinos
                        sepan que ya encontraste lo que buscabas.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={cerrarAccion}
                            disabled={resolverMut.isPending}
                            data-testid={`pregunta-resolver-cancelar-${pregunta.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 lg:cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmarResolver}
                            disabled={resolverMut.isPending}
                            data-testid={`pregunta-resolver-confirmar-${pregunta.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 lg:cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            {resolverMut.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                    Guardando…
                                </>
                            ) : (
                                'Sí, ya la resolví'
                            )}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* ── Modal: confirmar borrar (destructivo) ───────────────────── */}
            <ModalAdaptativo
                abierto={accionPendiente === 'borrar'}
                onCerrar={cerrarAccion}
                titulo={
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" strokeWidth={2.5} />
                        <span>Eliminar pregunta</span>
                    </div>
                }
                ancho="sm"
            >
                <div className="space-y-4 p-4 lg:p-5">
                    <p className="text-sm lg:text-base text-slate-700">
                        Tu pregunta y todas sus respuestas desaparecerán del feed. Esta
                        acción no se puede deshacer.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={cerrarAccion}
                            disabled={borrarMut.isPending}
                            data-testid={`pregunta-borrar-cancelar-${pregunta.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 lg:cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmarBorrar}
                            disabled={borrarMut.isPending}
                            data-testid={`pregunta-borrar-confirmar-${pregunta.id}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 lg:cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            {borrarMut.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                    Eliminando…
                                </>
                            ) : (
                                'Sí, eliminar'
                            )}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>
        </>
    );
}

// =============================================================================
// BOTÓN DEL MENÚ (helper local — mismo patrón que CardArticuloMio)
// =============================================================================

interface BotonMenuProps {
    testId: string;
    icono: LucideIcon;
    iconColor?: string;
    textColor?: string;
    hoverClass?: string;
    onClick: () => void;
    children: React.ReactNode;
}

function BotonMenu({
    testId,
    icono: Icon,
    iconColor = 'text-slate-600',
    textColor = 'text-slate-700',
    hoverClass = 'hover:bg-slate-100',
    onClick,
    children,
}: BotonMenuProps) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            role="menuitem"
            className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-colors ${textColor} ${hoverClass}`}
        >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={2.5} />
            {children}
        </button>
    );
}

export default MenuAutorPregunta;
