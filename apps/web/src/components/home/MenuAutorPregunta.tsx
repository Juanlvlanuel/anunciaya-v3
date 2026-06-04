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
 * que MisPublicaciones). La edición NO usa modal: se dispara `onEditar` y la
 * card (`CardPreguntaEditorial`) muestra un editor inline.
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
import {
    useCerrarMiPregunta,
    useMarcarResuelta,
    useBorrarMiPregunta,
    useEliminarPermanenteMiPregunta,
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
    /** Activa la edición inline de la pregunta (reemplaza el modal de editar). */
    onEditar: () => void;
}

type Accion = 'cerrar' | 'resolver' | 'borrar' | 'eliminar-permanente';

export function MenuAutorPregunta({ pregunta, onEditar }: MenuAutorPreguntaProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [accionPendiente, setAccionPendiente] = useState<Accion | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const cerrarMut = useCerrarMiPregunta();
    const resolverMut = useMarcarResuelta();
    const borrarMut = useBorrarMiPregunta();
    const eliminarPermanenteMut = useEliminarPermanenteMiPregunta();

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
    // Borrado permanente: solo en las YA eliminadas (segundo paso de papelera).
    const puedeEliminarPermanente = yaOculta;

    // Si NO hay ninguna acción disponible, no renderizamos el trigger
    // (típicamente ocurre cuando la pregunta ya está 'oculta'). El padre
    // se vería extraño con un botón inerte.
    const hayAcciones = puedeEditar || puedeResolver || puedeCerrar || puedeBorrar || puedeEliminarPermanente;
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

    const confirmarEliminarPermanente = () => {
        eliminarPermanenteMut.mutate(pregunta.id, {
            onSuccess: () => {
                notificar.exito('Pregunta borrada permanentemente');
                cerrarAccion();
            },
            onError: (err) => {
                const mensaje =
                    err instanceof Error ? err.message : 'No se pudo borrar permanentemente';
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
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-600 hover:bg-slate-200 hover:text-slate-700 lg:cursor-pointer"
                >
                    <MoreVertical className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
                </button>

                {menuAbierto && (
                    <div
                        ref={menuRef}
                        className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
                        onClick={(e) => e.stopPropagation()}
                        role="menu"
                    >
                        {puedeEditar && (
                            <BotonMenu
                                testId={`pregunta-menu-editar-${pregunta.id}`}
                                icono={Pencil}
                                onClick={() => {
                                    setMenuAbierto(false);
                                    onEditar();
                                }}
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
                                    <div className="my-1 border-t border-slate-300" />
                                )}
                                <BotonMenu
                                    testId={`pregunta-menu-borrar-${pregunta.id}`}
                                    icono={Trash2}
                                    iconColor="text-red-600"
                                    textColor="text-red-600"
                                    hoverClass="hover:bg-red-100"
                                    onClick={() => abrirAccion('borrar')}
                                >
                                    Eliminar
                                </BotonMenu>
                            </>
                        )}
                        {puedeEliminarPermanente && (
                            <BotonMenu
                                testId={`pregunta-menu-eliminar-permanente-${pregunta.id}`}
                                icono={Trash2}
                                iconColor="text-red-600"
                                textColor="text-red-600"
                                hoverClass="hover:bg-red-100"
                                onClick={() => abrirAccion('eliminar-permanente')}
                            >
                                Borrar para siempre
                            </BotonMenu>
                        )}
                    </div>
                )}
            </div>

            {/* Confirmación: cerrar */}
            <ModalConfirmacion
                abierto={accionPendiente === 'cerrar'}
                onCerrar={cerrarAccion}
                Icono={XCircle}
                color="amber"
                titulo="¿Cerrar pregunta?"
                texto="Saldrá del feed y no recibirá más respuestas. Las que ya tienes se conservan."
                textoBoton="Sí, cerrar"
                textoCargando="Cerrando…"
                onConfirmar={confirmarCerrar}
                cargando={cerrarMut.isPending}
                testIdCancelar={`pregunta-cerrar-cancelar-${pregunta.id}`}
                testIdConfirmar={`pregunta-cerrar-confirmar-${pregunta.id}`}
            />

            {/* Confirmación: marcar resuelta */}
            <ModalConfirmacion
                abierto={accionPendiente === 'resolver'}
                onCerrar={cerrarAccion}
                Icono={CheckCircle2}
                color="emerald"
                titulo="¿Marcar como resuelta?"
                texto="Seguirá visible en el feed, pero con la etiqueta «Resuelta»."
                textoBoton="Sí, resuelta"
                textoCargando="Guardando…"
                onConfirmar={confirmarResolver}
                cargando={resolverMut.isPending}
                testIdCancelar={`pregunta-resolver-cancelar-${pregunta.id}`}
                testIdConfirmar={`pregunta-resolver-confirmar-${pregunta.id}`}
            />

            {/* Confirmación: eliminar (destructivo) */}
            <ModalConfirmacion
                abierto={accionPendiente === 'borrar'}
                onCerrar={cerrarAccion}
                Icono={Trash2}
                color="red"
                titulo="¿Eliminar pregunta?"
                texto="Se borrará del feed junto con sus respuestas. No se puede deshacer."
                textoBoton="Sí, eliminar"
                textoCargando="Eliminando…"
                onConfirmar={confirmarBorrar}
                cargando={borrarMut.isPending}
                testIdCancelar={`pregunta-borrar-cancelar-${pregunta.id}`}
                testIdConfirmar={`pregunta-borrar-confirmar-${pregunta.id}`}
            />

            {/* Confirmación: borrado permanente (destructivo IRREVERSIBLE) */}
            <ModalConfirmacion
                abierto={accionPendiente === 'eliminar-permanente'}
                onCerrar={cerrarAccion}
                Icono={Trash2}
                color="red"
                titulo="¿Borrar para siempre?"
                texto="La pregunta y sus respuestas se eliminarán definitivamente de la base de datos. Esta acción NO se puede deshacer."
                textoBoton="Sí, borrar para siempre"
                textoCargando="Borrando…"
                onConfirmar={confirmarEliminarPermanente}
                cargando={eliminarPermanenteMut.isPending}
                testIdCancelar={`pregunta-eliminar-permanente-cancelar-${pregunta.id}`}
                testIdConfirmar={`pregunta-eliminar-permanente-confirmar-${pregunta.id}`}
            />
        </>
    );
}

// =============================================================================
// MODAL DE CONFIRMACIÓN (cerrar / resolver / eliminar) — diseño compacto
// =============================================================================

const COLOR_CONFIRMACION = {
    amber: { iconoBg: 'bg-amber-100', iconoText: 'text-amber-600', boton: 'bg-amber-600 hover:bg-amber-700' },
    emerald: { iconoBg: 'bg-emerald-100', iconoText: 'text-emerald-600', boton: 'bg-emerald-600 hover:bg-emerald-700' },
    red: { iconoBg: 'bg-red-100', iconoText: 'text-red-600', boton: 'bg-red-600 hover:bg-red-700' },
} as const;

interface ModalConfirmacionProps {
    abierto: boolean;
    onCerrar: () => void;
    Icono: LucideIcon;
    color: keyof typeof COLOR_CONFIRMACION;
    titulo: string;
    texto: string;
    textoBoton: string;
    textoCargando: string;
    onConfirmar: () => void;
    cargando: boolean;
    testIdCancelar: string;
    testIdConfirmar: string;
}

function ModalConfirmacion({
    abierto,
    onCerrar,
    Icono,
    color,
    titulo,
    texto,
    textoBoton,
    textoCargando,
    onConfirmar,
    cargando,
    testIdCancelar,
    testIdConfirmar,
}: ModalConfirmacionProps) {
    const c = COLOR_CONFIRMACION[color];
    return (
        <ModalAdaptativo abierto={abierto} onCerrar={onCerrar} mostrarHeader={false} paddingContenido="none" ancho="sm">
            <div className="p-5 lg:p-6">
                <div className="flex items-start gap-3">
                    <span className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${c.iconoBg}`}>
                        <Icono className={`w-5 h-5 ${c.iconoText}`} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base lg:text-lg font-bold text-slate-900">{titulo}</h3>
                        <p className="mt-1 text-sm lg:text-base font-medium text-slate-600 leading-relaxed">{texto}</p>
                    </div>
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCerrar}
                        disabled={cargando}
                        data-testid={testIdCancelar}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300 lg:cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={cargando}
                        data-testid={testIdConfirmar}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-md lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${c.boton}`}
                    >
                        {cargando ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                {textoCargando}
                            </>
                        ) : (
                            textoBoton
                        )}
                    </button>
                </div>
            </div>
        </ModalAdaptativo>
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
    hoverClass = 'hover:bg-slate-200',
    onClick,
    children,
}: BotonMenuProps) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            role="menuitem"
            className={`flex w-full lg:cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-semibold ${textColor} ${hoverClass}`}
        >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={2.5} />
            {children}
        </button>
    );
}

export default MenuAutorPregunta;
