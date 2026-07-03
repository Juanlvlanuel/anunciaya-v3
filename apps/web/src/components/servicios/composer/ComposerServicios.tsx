/**
 * ComposerServicios.tsx (variante INLINE)
 * =========================================
 * Composer de Servicios — vive INLINE en el feed (no es overlay/modal).
 * Inspirado en el composer de Facebook: una caja blanca con textarea
 * grande, fila de íconos "Agregar a tu publicación" y acordeones
 * individuales por cada campo secundario.
 *
 * Estados:
 *   - Colapsado → componente `<ComposerColapsado>` (pill).
 *   - Expandido → ESTE componente.
 *   - El orquestador `<ComposerSection>` decide cuál renderizar.
 *
 * UX clave:
 *   - Textarea de título con `autoFocus` al abrirse.
 *   - Toggle Ofrezco/Solicito visible arriba.
 *   - Fila de 6 íconos abre acordeones individuales (solo uno abierto a
 *     la vez). El ícono cámara NO abre acordeón: dispara file picker.
 *   - Cada ícono muestra un dot verde si el campo ya tiene contenido.
 *   - Strip de thumbnails si hay fotos.
 *   - Hint inline anti-venta debajo de la descripción.
 *   - Checkbox legal compactado + botón Publicar al final.
 *
 * Edición: el componente recibe `modo='editar'` y `publicacionId`,
 * carga la publicación y la hidrata al draft una vez. El toggle
 * Ofrezco/Solicito se oculta.
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerServicios.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Hand,
    Image as ImageIcon,
    Loader2,
    MapPin,
    Plus,
    Search,
    Send,
    Tags,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { ModalBottom } from '../../ui/ModalBottom';
import { ModalImagenes } from '../../ui/ModalImagenes';
import {
    useComposerServicios,
    parseEntero,
    type ComposerServiciosDraft,
} from '../../../hooks/useComposerServicios';
import {
    useFotosUploaderServicios,
    MAX_FOTOS_COMPOSER,
    type FotoPreviewLocal,
} from '../../../hooks/useFotosUploaderServicios';
import {
    useCrearPublicacionServicio,
    useEditarPublicacionServicio,
    usePublicacionServicio,
} from '../../../hooks/queries/useServicios';
import {
    construirPayloadCrear,
    construirPayloadEditar,
} from '../../../utils/composerServiciosPayload';
import { ChipInputList } from './ChipInputList';
import { ComposerHintModeracion } from './ComposerHintModeracion';
import { notificar } from '../../../utils/notificaciones';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { Spinner } from '../../ui/Spinner';
import useBreakpoint from '../../../hooks/useBreakpoint';
import type {
    CategoriaClasificado,
    ModalidadServicio,
    ModoServicio,
    PrecioServicio,
    PublicacionDetalle,
} from '../../../types/servicios';

// =============================================================================
// CONSTANTES
// =============================================================================

const CATEGORIAS: { id: CategoriaClasificado; label: string }[] = [
    { id: 'hogar', label: 'Hogar' },
    { id: 'cuidados', label: 'Cuidados' },
    { id: 'eventos', label: 'Eventos' },
    { id: 'belleza-bienestar', label: 'Belleza' },
    { id: 'empleo', label: 'Empleo' },
    { id: 'otros', label: 'Otros' },
];

const MODALIDADES: { id: ModalidadServicio; label: string }[] = [
    { id: 'presencial', label: 'Presencial' },
    { id: 'remoto', label: 'Remoto' },
    { id: 'hibrido', label: 'Híbrido' },
];

/** Identificador del acordeón actualmente abierto. `null` = ninguno. */
type SeccionAbierta =
    | 'categoria'
    | 'modalidad'
    | 'tarifa'
    | 'zonas'
    | 'urgente'
    | null;

// =============================================================================
// COMPONENTE
// =============================================================================

interface ComposerServiciosProps {
    /** Modo de operación. En 'editar' se hidrata desde la publicación. */
    modo: 'crear' | 'editar';
    /** Sólo aplica si modo='editar'. */
    publicacionId: string | null;
    /** Modo Ofrezco/Solicito inicial en creación. */
    modoInicial: ModoServicio | null;
    /** Colapsar el composer (vuelve a la pill). */
    onColapsar: () => void;
}

export function ComposerServicios({
    modo,
    publicacionId,
    modoInicial,
    onColapsar,
}: ComposerServiciosProps) {
    const navigate = useNavigate();
    const esEdicion = modo === 'editar' && !!publicacionId;

    // ─── Datos de usuario para el header (avatar/nombre) ──────────────
    const usuario = useAuthStore((s) => s.usuario);
    const nombreUsuario = usuario?.nombre ?? '';
    const avatarUsuario = usuario?.avatarUrl ?? null;

    // ─── Carga publicación en edición ────────────────────────────────
    const publicacionQuery = usePublicacionServicio(
        esEdicion ? publicacionId : undefined,
    );
    const publicacion = publicacionQuery.data ?? null;

    // ─── Hook del draft ──────────────────────────────────────────────
    const storageNamespace = esEdicion ? `edit-${publicacionId}` : undefined;
    const {
        draft,
        actualizar,
        setConfirmacionesUnificadas,
        limpiar,
        hidratarDesdePublicacion,
        errores,
        valido,
        mensajeBoton,
    } = useComposerServicios({
        modoInicial: esEdicion ? null : modoInicial,
        storageNamespace,
    });

    // ─── GPS auto-siembra ────────────────────────────────────────────
    const ciudadGps = useGpsStore((s) => s.ciudad?.nombre ?? null);
    const lat = useGpsStore((s) => s.latitud);
    const lng = useGpsStore((s) => s.longitud);
    useEffect(() => {
        if (
            draft.latitud === null &&
            draft.longitud === null &&
            lat !== null &&
            lng !== null
        ) {
            actualizar({ latitud: lat, longitud: lng, ciudad: ciudadGps });
        }
    }, [draft.latitud, draft.longitud, lat, lng, ciudadGps, actualizar]);

    // ─── Hidratación una sola vez en edición ─────────────────────────
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (!esEdicion) return;
        if (!publicacion || hidratadoRef.current) return;
        hidratadoRef.current = true;
        hidratarDesdePublicacion(publicacionAlDraft(publicacion));
    }, [esEdicion, publicacion, hidratarDesdePublicacion]);

    // ─── Acordeón único (un campo abierto a la vez) ─────────────────
    // En PC se renderiza inline bajo la fila de íconos. En móvil se abre
    // un <ModalBottom> con el panel adentro (variante B del handoff).
    const { esEscritorio } = useBreakpoint();
    const [seccionAbierta, setSeccionAbierta] = useState<SeccionAbierta>(null);
    function alternar(s: SeccionAbierta) {
        setSeccionAbierta((prev) => (prev === s ? null : s));
    }

    // ─── Uploader de fotos ───────────────────────────────────────────
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set(draft.fotos));
    const fotosUploader = useFotosUploaderServicios({
        fotos: draft.fotos,
        onCambioFotos: (fotos) => actualizar({ fotos }),
        urlsSubidasEnSesion,
    });

    // ─── Mutations ───────────────────────────────────────────────────
    const crearMutation = useCrearPublicacionServicio();
    const editarMutation = useEditarPublicacionServicio();
    const enviando = crearMutation.isPending || editarMutation.isPending;

    async function publicar() {
        if (!valido || enviando) {
            // Si el error está en un campo escondido en acordeón, ábrelo.
            const seccionConError = primerSeccionConError(errores);
            if (seccionConError) setSeccionAbierta(seccionConError);
            return;
        }

        if (esEdicion && publicacionId) {
            try {
                const res = await editarMutation.mutateAsync({
                    publicacionId,
                    payload: construirPayloadEditar(draft),
                });
                if (res.success) {
                    notificar.exito('Cambios guardados.');
                    urlsSubidasEnSesion.current.clear();
                    limpiar();
                    onColapsar();
                    return;
                }
                const msg =
                    (res.errores && res.errores.length > 0
                        ? res.errores.join(' · ')
                        : res.message) ??
                    'No pudimos guardar los cambios.';
                notificar.error(msg);
            } catch {
                notificar.error(
                    'No pudimos conectar con el servidor. Intenta de nuevo.',
                );
            }
            return;
        }

        try {
            const res = await crearMutation.mutateAsync(
                construirPayloadCrear(draft),
            );
            if (res.success && res.data?.id) {
                notificar.exito('¡Publicado!');
                urlsSubidasEnSesion.current.clear();
                limpiar();
                onColapsar();
                return;
            }
            const msg =
                (res.errores && res.errores.length > 0
                    ? res.errores.join(' · ')
                    : res.message) ??
                'No pudimos crear la publicación.';
            notificar.error(msg);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response
                ?.status;
            const data = (
                err as {
                    response?: {
                        data?: { message?: string; sugerencia?: string };
                    };
                }
            )?.response?.data;
            if (status === 409 && data?.sugerencia) {
                notificar.advertencia(
                    'Esto parece encajar mejor en otra sección. Revisa tu texto.',
                );
                return;
            }
            notificar.error(
                data?.message ??
                    'No pudimos conectar con el servidor. Intenta de nuevo.',
            );
        }
    }

    // ─── Render ──────────────────────────────────────────────────────

    // En edición, si la publicación está cargando, mostrar spinner inline.
    const cargandoEdicion =
        esEdicion && publicacionQuery.isPending && !publicacion;

    return (
        <div
            data-testid="composer-expandido"
            className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden"
        >
            {/* ── Header ──────────────────────────────────────────────
                Avatar + título a la izquierda. En PC el toggle
                Ofrezco/Solicito vive aquí mismo (al lado del título).
                En móvil el toggle se renderiza en el body. X a la derecha. */}
            <div className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-4 border-b-2 border-slate-300">
                <div className="flex items-center gap-3 min-w-0">
                    {avatarUsuario ? (
                        <img
                            src={avatarUsuario}
                            alt=""
                            className="h-11 w-11 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <div
                            aria-hidden
                            className="h-11 w-11 rounded-full bg-sky-600 grid place-items-center text-white font-bold text-base shrink-0"
                        >
                            {(nombreUsuario[0] ?? 'A').toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="text-[17px] font-bold text-slate-900 truncate leading-tight">
                            {esEdicion ? 'Editar publicación' : 'Crear publicación'}
                        </div>
                        {!esEdicion && (nombreUsuario || ciudadGps) && (
                            <div className="flex items-center gap-2 mt-1 text-[13px] lg:text-[14px] font-semibold text-slate-600 min-w-0">
                                {nombreUsuario && (
                                    <span className="truncate">
                                        {nombreUsuario}
                                    </span>
                                )}
                                {nombreUsuario && ciudadGps && (
                                    <span
                                        aria-hidden
                                        className="h-4 w-px bg-slate-300 shrink-0"
                                    />
                                )}
                                {ciudadGps && (
                                    <span className="truncate text-slate-500">
                                        {ciudadGps}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1" />
                {/* Toggle Ofrezco/Solicito — visible solo en PC, empujado a la
                    derecha (mismo layout que Vendo/Busco de MarketPlace). */}
                {!esEdicion && (
                    <div className="hidden lg:block">
                        <TogglePill
                            modo={draft.modo}
                            onCambio={(m) => actualizar({ modo: m })}
                            error={errores.modo}
                        />
                    </div>
                )}
                <button
                    type="button"
                    aria-label="Cerrar composer"
                    data-testid="composer-cerrar"
                    onClick={onColapsar}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 text-slate-500 hover:border-red-400 hover:bg-red-100 hover:text-red-600 lg:cursor-pointer"
                >
                    <X className="h-5 w-5" strokeWidth={2.25} />
                </button>
            </div>

            {cargandoEdicion ? (
                <div className="flex items-center justify-center py-16">
                    <Spinner tamanio="lg" />
                </div>
            ) : (
                <div className="px-3 lg:px-5 py-3 lg:py-5">
                    {/* Toggle Ofrezco/Solicito — solo móvil, antes de
                        todo (en PC vive en el header arriba). */}
                    {!esEdicion && (
                        <div className="lg:hidden mb-3">
                            <TogglePill
                                modo={draft.modo}
                                onCambio={(m) => actualizar({ modo: m })}
                                error={errores.modo}
                            />
                        </div>
                    )}

                    {/* Layout PC: 2 columnas (Fotos a la izquierda + Campos
                        a la derecha). Móvil: stack vertical normal. */}
                    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-5">
                        {/* ── Columna izquierda: ZonaFotos ─────────── */}
                        <div className="mb-3 lg:mb-0">
                            <ZonaFotos
                                fotos={draft.fotos}
                                previews={fotosUploader.previews}
                                onEliminar={fotosUploader.eliminar}
                                onAbrirGaleria={fotosUploader.abrirGaleria}
                                onAbrirCamara={fotosUploader.abrirCamara}
                                subiendo={fotosUploader.subiendo}
                            />
                            <input {...fotosUploader.inputGaleriaProps} />
                            <input {...fotosUploader.inputCamaraProps} />
                        </div>

                        {/* ── Columna derecha: campos y detalles ───── */}
                        <div className="space-y-3 min-w-0">
                            {/* Título (autoFocus en creación) */}
                            <CampoTitulo
                                valor={draft.titulo}
                                modo={draft.modo}
                                autoFocus={!esEdicion}
                                onCambio={(v) =>
                                    actualizar({ titulo: v.slice(0, 80) })
                                }
                                error={errores.titulo}
                            />

                            {/* Descripción */}
                            <CampoDescripcion
                                valor={draft.descripcion}
                                modo={draft.modo}
                                onCambio={(v) =>
                                    actualizar({
                                        descripcion: v.slice(0, 500),
                                    })
                                }
                                error={errores.descripcion}
                            />

                            {/* Hint moderación inline */}
                            <ComposerHintModeracion
                                texto={`${draft.titulo} ${draft.descripcion}`}
                                onIrMarketplace={() => {
                                    onColapsar();
                                    // Composer inline MP: expandimos vía
                                    // query param (réplica del flujo de
                                    // Servicios). Reemplaza al wizard
                                    // antiguo /marketplace/publicar.
                                    navigate('/marketplace?crear=1');
                                }}
                            />
                        </div>
                    </div>

                    {/* ── Detalles (full width debajo del grid) + acordeón ── */}
                    <div className="mt-3 space-y-3">
                        <FilaIconos
                            modo={draft.modo}
                            draft={draft}
                            seccionAbierta={seccionAbierta}
                            onAlternar={alternar}
                        />

                    {/* ── Acordeón abierto (solo en PC; en móvil ver
                        el <ModalBottom> al final del JSX). ─────── */}
                    {esEscritorio && seccionAbierta === 'categoria' && (
                        <PanelCategoria
                            valor={draft.categoria}
                            onCambio={(c) => actualizar({ categoria: c })}
                            error={errores.categoria}
                        />
                    )}
                    {esEscritorio && seccionAbierta === 'modalidad' && (
                        <PanelModalidad
                            valor={draft.modalidad}
                            onCambio={(m) => actualizar({ modalidad: m })}
                            error={errores.modalidad}
                        />
                    )}
                    {esEscritorio && seccionAbierta === 'tarifa' && (
                        <PanelTarifa
                            modo={draft.modo}
                            valorMin={draft.budgetMin}
                            valorMax={draft.budgetMax}
                            onCambioMin={(v) => actualizar({ budgetMin: v })}
                            onCambioMax={(v) => actualizar({ budgetMax: v })}
                            error={errores.presupuesto}
                        />
                    )}
                    {esEscritorio && seccionAbierta === 'zonas' && (
                        <PanelZonas
                            modo={draft.modo}
                            items={draft.zonasAproximadas}
                            onCambio={(z) =>
                                actualizar({ zonasAproximadas: z })
                            }
                            error={errores.zonas}
                        />
                    )}
                    {esEscritorio &&
                        seccionAbierta === 'urgente' &&
                        draft.modo === 'solicito' && (
                            <PanelUrgente
                                valor={draft.urgente}
                                onCambio={(u) => actualizar({ urgente: u })}
                            />
                        )}

                    {/* ── ModalBottom para móvil — variante B del handoff:
                        cada chip de detalle abre un sheet inferior con el
                        panel adentro + footer "Listo". Reutiliza el
                        <ModalBottom> existente del proyecto. ───────── */}
                    {!esEscritorio && seccionAbierta !== null && (
                        <ModalBottom
                            abierto={true}
                            onCerrar={() => setSeccionAbierta(null)}
                            titulo={tituloPorSeccion(seccionAbierta, draft.modo)}
                            alturaMaxima="sm"
                        >
                            <div className="px-4 pb-4 space-y-3">
                                {seccionAbierta === 'categoria' && (
                                    <PanelCategoria
                                        valor={draft.categoria}
                                        onCambio={(c) =>
                                            actualizar({ categoria: c })
                                        }
                                        error={errores.categoria}
                                    />
                                )}
                                {seccionAbierta === 'modalidad' && (
                                    <PanelModalidad
                                        valor={draft.modalidad}
                                        onCambio={(m) =>
                                            actualizar({ modalidad: m })
                                        }
                                        error={errores.modalidad}
                                    />
                                )}
                                {seccionAbierta === 'tarifa' && (
                                    <PanelTarifa
                                        modo={draft.modo}
                                        valorMin={draft.budgetMin}
                                        valorMax={draft.budgetMax}
                                        onCambioMin={(v) =>
                                            actualizar({ budgetMin: v })
                                        }
                                        onCambioMax={(v) =>
                                            actualizar({ budgetMax: v })
                                        }
                                        error={errores.presupuesto}
                                    />
                                )}
                                {seccionAbierta === 'zonas' && (
                                    <PanelZonas
                                        modo={draft.modo}
                                        items={draft.zonasAproximadas}
                                        onCambio={(z) =>
                                            actualizar({ zonasAproximadas: z })
                                        }
                                        error={errores.zonas}
                                    />
                                )}
                                {seccionAbierta === 'urgente' &&
                                    draft.modo === 'solicito' && (
                                        <PanelUrgente
                                            valor={draft.urgente}
                                            onCambio={(u) =>
                                                actualizar({ urgente: u })
                                            }
                                        />
                                    )}
                                <button
                                    type="button"
                                    onClick={() => setSeccionAbierta(null)}
                                    className="w-full py-2.5 rounded-xl bg-linear-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-cta-sky"
                                >
                                    Listo
                                </button>
                            </div>
                        </ModalBottom>
                    )}

                    {/* ── Error de ubicación (no tiene panel propio) ─ */}
                    {errores.ubicacion && (
                        <p
                            data-testid="composer-error-ubicacion"
                            className="text-[13px] text-red-600 font-semibold"
                        >
                            {errores.ubicacion}
                        </p>
                    )}
                    </div>

                    {/* ── Reglas legales + acciones (Cancelar / Publicar)
                        en una sola fila horizontal en PC, stack en móvil.
                        Los errores de cada campo ya se muestran inline
                        bajo su input/panel — no duplicamos aquí. */}
                    <div className="mt-4 flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4 pt-3 border-t-2 border-slate-200">
                        <div className="flex-1 min-w-0">
                            <CheckboxLegal
                                aceptado={draft.confirmaciones.legal}
                                onCambio={setConfirmacionesUnificadas}
                                error={errores.confirmaciones}
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                data-testid="composer-btn-cancelar"
                                onClick={onColapsar}
                                disabled={enviando}
                                className="px-5 h-12 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-semibold text-[15px] hover:bg-slate-100 hover:border-slate-400 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                data-testid="composer-btn-publicar"
                                onClick={publicar}
                                disabled={!valido || enviando}
                                className={
                                    'inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-bold text-[15px] lg:cursor-pointer ' +
                                    (valido && !enviando
                                        ? 'bg-linear-to-b from-sky-500 to-sky-700 text-white shadow-cta-sky hover:brightness-110'
                                        : 'bg-slate-200 text-slate-500 cursor-not-allowed')
                                }
                            >
                                <Send className="w-4 h-4" strokeWidth={2.25} />
                                {enviando
                                    ? esEdicion
                                        ? 'Guardando…'
                                        : 'Publicando…'
                                    : esEdicion
                                      ? 'Guardar cambios'
                                      : 'Publicar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function TogglePill({
    modo,
    onCambio,
    error,
}: {
    modo: ModoServicio | null;
    onCambio: (m: ModoServicio) => void;
    error?: string;
}) {
    // Versión discreta — sin contenedor de fondo gris. Dos botones planos
    // pequeños, el activo con borde sky claro + ícono colored. El inactivo
    // queda como texto neutro.
    return (
        <div>
            <div className="inline-flex items-center gap-1.5">
                {(
                    [
                        { id: 'ofrezco' as const, label: 'Ofrezco', Icono: Hand },
                        {
                            id: 'solicito' as const,
                            label: 'Solicito',
                            Icono: Search,
                        },
                    ] as const
                ).map(({ id, label, Icono }) => {
                    const activo = modo === id;
                    const esSolicito = id === 'solicito';
                    return (
                        <button
                            key={id}
                            type="button"
                            data-testid={`composer-toggle-${id}`}
                            onClick={() => onCambio(id)}
                            className={
                                'inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activo
                                    ? esSolicito
                                        ? 'bg-amber-50 border-2 border-amber-400 text-amber-800'
                                        : 'bg-sky-50 border-2 border-sky-400 text-sky-800'
                                    : 'border-2 border-transparent text-slate-500 hover:text-slate-800')
                            }
                        >
                            <Icono
                                className={
                                    'w-4 h-4 ' +
                                    (activo
                                        ? esSolicito
                                            ? 'text-amber-600'
                                            : 'text-sky-600'
                                        : 'text-slate-400')
                                }
                                strokeWidth={2.25}
                            />
                            {label}
                        </button>
                    );
                })}
            </div>
            {error && (
                <p className="mt-1.5 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}
        </div>
    );
}

function CampoTitulo({
    valor,
    modo,
    autoFocus,
    onCambio,
    error,
}: {
    valor: string;
    modo: ModoServicio | null;
    autoFocus: boolean;
    onCambio: (v: string) => void;
    error?: string;
}) {
    const placeholder =
        modo === 'solicito'
            ? 'Busco fotógrafo para boda…'
            : modo === 'ofrezco'
              ? 'Plomero a domicilio en Centro…'
              : '¿Qué ofreces o necesitas?';
    return (
        <div>
            <input
                type="text"
                data-testid="composer-titulo"
                value={valor}
                autoFocus={autoFocus}
                onChange={(e) => onCambio(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-[16px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-sky-500"
            />
            {error && (
                <p className="mt-1 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}
        </div>
    );
}

function CampoDescripcion({
    valor,
    modo,
    onCambio,
    error,
}: {
    valor: string;
    modo: ModoServicio | null;
    onCambio: (v: string) => void;
    error?: string;
}) {
    const placeholder =
        modo === 'solicito'
            ? 'Describe qué necesitas, cuándo y cualquier dato útil.'
            : modo === 'ofrezco'
              ? 'Cuenta qué ofreces, tu experiencia y cómo te coordinas.'
              : 'Da los detalles importantes.';
    return (
        <div>
            <textarea
                data-testid="composer-descripcion"
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                rows={3}
                placeholder={placeholder}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-medium outline-none resize-none focus:border-sky-500"
            />
            <div className="mt-1 flex items-center justify-between text-[12px]">
                <span className="text-slate-500 font-medium">
                    {error ?? (valor.length > 0 ? '' : 'Opcional · máximo 500 caracteres.')}
                </span>
                <span className="text-slate-400 font-medium tabular-nums">
                    {valor.length}/500
                </span>
            </div>
        </div>
    );
}

interface IconoConfig {
    id: Exclude<SeccionAbierta, null>;
    Icono: typeof Camera;
    label: string;
    /** Color del dot que indica "ya hay contenido" */
    activo: boolean;
}

function FilaIconos({
    modo,
    draft,
    seccionAbierta,
    onAlternar,
}: {
    modo: ModoServicio | null;
    draft: ComposerServiciosDraft;
    seccionAbierta: SeccionAbierta;
    onAlternar: (s: SeccionAbierta) => void;
}) {
    const tarifaActiva =
        parseEntero(draft.budgetMin) !== null ||
        parseEntero(draft.budgetMax) !== null;
    const categoriaActiva = !!draft.categoria;
    const modalidadActiva = !!draft.modalidad;
    const zonasActivas = draft.zonasAproximadas.length > 0;

    const iconos: IconoConfig[] = [
        {
            id: 'categoria',
            Icono: Tags,
            label: 'Categoría',
            activo: categoriaActiva,
        },
        {
            id: 'modalidad',
            Icono: Wrench,
            label: 'Modalidad',
            activo: modalidadActiva,
        },
        {
            id: 'tarifa',
            Icono: DollarSign,
            label: modo === 'ofrezco' ? 'Tarifa' : 'Presupuesto',
            activo: tarifaActiva,
        },
        { id: 'zonas', Icono: MapPin, label: 'Zonas', activo: zonasActivas },
    ];
    if (modo === 'solicito') {
        iconos.push({
            id: 'urgente',
            Icono: Zap,
            label: 'Urgente',
            activo: draft.urgente,
        });
    }

    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[13px] font-semibold text-slate-700">
                    Detalles
                </span>
                <span className="text-[12px] text-slate-500 font-semibold tabular-nums">
                    {iconos.filter((i) => i.activo).length}/{iconos.length}
                </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {iconos.map((it) => {
                    const abierto = seccionAbierta === it.id;
                    return (
                        <button
                            key={it.id}
                            type="button"
                            data-testid={`composer-icono-${it.id}`}
                            onClick={() =>
                                onAlternar(
                                    it.id as Exclude<SeccionAbierta, null>,
                                )
                            }
                            aria-pressed={abierto}
                            aria-label={it.label}
                            className={
                                'group relative flex items-center gap-2 px-3 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer shrink-0 ' +
                                (abierto
                                    ? 'bg-sky-100 border-2 border-sky-500 text-sky-800'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:text-sky-700 hover:border-sky-500')
                            }
                        >
                            <span className="inline-flex items-center gap-2 transition-transform duration-150 group-hover:scale-110">
                                <it.Icono
                                    className="w-5 h-5"
                                    strokeWidth={2}
                                />
                                <span>{it.label}</span>
                            </span>
                            {it.activo && (
                                <span
                                    aria-hidden
                                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// ZONA DE FOTOS — placeholder grande con menú popup propio
// =============================================================================

function ZonaFotos({
    fotos,
    previews,
    onEliminar,
    onAbrirGaleria,
    onAbrirCamara,
    subiendo,
}: {
    fotos: string[];
    /** Fotos en curso de subida — se renderizan al final del carrusel
     *  con overlay de spinner y sin botón X (no son eliminables hasta
     *  que termine su upload). */
    previews: FotoPreviewLocal[];
    onEliminar: (idx: number) => void;
    onAbrirGaleria: () => void;
    onAbrirCamara: () => void;
    subiendo: boolean;
}) {
    // En PC no hay cámara nativa útil — el click va directo al selector
    // de archivos (galería). En móvil mostramos el popup con 2 opciones
    // (Tomar foto / Subir de galería) porque `capture="environment"`
    // abre la cámara trasera nativa.
    const { esEscritorio } = useBreakpoint();
    const [menuAbierto, setMenuAbierto] = useState(false);
    useEffect(() => {
        if (!menuAbierto) return;
        const cerrar = () => setMenuAbierto(false);
        const t = setTimeout(() => {
            document.addEventListener('mousedown', cerrar);
            document.addEventListener('touchstart', cerrar);
        }, 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', cerrar);
            document.removeEventListener('touchstart', cerrar);
        };
    }, [menuAbierto]);

    // Sprint 9.3 (UI optimista): el carrusel renderiza `fotos` (URLs R2
    // confirmadas) seguidas de `previews` (blob: URLs en curso de subida).
    // Las previews se distinguen visualmente con un overlay de spinner
    // y no exponen botón X (no son eliminables hasta confirmarse).
    const items: Array<{ url: string; subiendo: boolean }> = [
        ...fotos.map((url) => ({ url, subiendo: false })),
        ...previews.map((p) => ({ url: p.url, subiendo: true })),
    ];
    const totalItems = items.length;
    const lleno = totalItems >= MAX_FOTOS_COMPOSER;
    const abrirMenu = () => {
        if (lleno) return;
        if (esEscritorio) {
            // PC: sin menú — abrir picker de archivos directamente.
            onAbrirGaleria();
            return;
        }
        setMenuAbierto((o) => !o);
    };

    // Carrusel: índice de la foto visible. Se clampa cuando cambian las fotos
    // (ej. al eliminar la última, retrocedemos al penúltimo).
    const [indiceActual, setIndiceActual] = useState(0);
    useEffect(() => {
        if (totalItems === 0) {
            setIndiceActual(0);
            return;
        }
        if (indiceActual >= totalItems) {
            setIndiceActual(totalItems - 1);
        }
    }, [totalItems, indiceActual]);

    const prev = () => setIndiceActual((i) => Math.max(0, i - 1));
    const next = () =>
        setIndiceActual((i) => Math.min(totalItems - 1, i + 1));
    const itemActual = items[indiceActual] ?? null;
    const urlActual = itemActual?.url ?? null;
    const actualEsSubiendo = itemActual?.subiendo ?? false;

    // Modal lightbox: click en la imagen expande a fullscreen con ModalImagenes
    // existente (heredamos el back nativo, swipe, etc.).
    const [lightboxAbierto, setLightboxAbierto] = useState(false);

    return (
        <div
            className="relative"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-slate-700">
                        Fotos
                    </span>
                    <span className="inline-flex items-center h-6 px-2 rounded-full bg-sky-100 text-sky-700 text-[12px] font-semibold">
                        opcional
                    </span>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
                    {totalItems}/{MAX_FOTOS_COMPOSER}
                </span>
            </div>

            {/* Recuadro principal — móvil ratio 3:1 (compacto, no se
                traga altura), PC cuadrado 1:1. Sin items: placeholder
                clickeable. Con items: carrusel + controles overlay. */}
            <div className="group relative aspect-[3/1] lg:aspect-square w-full rounded-xl overflow-hidden">
                {totalItems === 0 ? (
                    <button
                        type="button"
                        data-testid="composer-zona-fotos-vacia"
                        onClick={abrirMenu}
                        className="absolute inset-0 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-row lg:flex-col items-center justify-center gap-2.5 lg:gap-1.5 text-slate-600 hover:bg-sky-50 hover:border-sky-400 hover:text-sky-700 lg:cursor-pointer disabled:opacity-50 px-3 lg:px-0"
                    >
                        <Camera
                            className="w-6 h-6 lg:w-8 lg:h-8"
                            strokeWidth={1.75}
                        />
                        <div className="flex flex-col items-start lg:items-center">
                            <span className="text-[14px] lg:text-[15px] font-semibold leading-tight">
                                Agregar fotos
                            </span>
                            <span className="text-[12px] text-slate-500 leading-tight">
                                Galería o cámara
                            </span>
                        </div>
                    </button>
                ) : (
                    <>
                        {/* Foto actual — click expande con ModalImagenes.
                            Previews (subiendo=true) NO abren lightbox
                            porque aún no son URLs persistentes. */}
                        {urlActual && (
                            <button
                                type="button"
                                aria-label={
                                    actualEsSubiendo
                                        ? 'Subiendo foto'
                                        : 'Ver foto en grande'
                                }
                                onClick={() => {
                                    if (!actualEsSubiendo) setLightboxAbierto(true);
                                }}
                                disabled={actualEsSubiendo}
                                className={
                                    'absolute inset-0 w-full h-full ' +
                                    (actualEsSubiendo ? '' : 'lg:cursor-zoom-in')
                                }
                            >
                                <img
                                    key={urlActual}
                                    src={urlActual}
                                    alt={`Foto ${indiceActual + 1} de ${totalItems}`}
                                    className={
                                        'w-full h-full object-cover bg-slate-100 ' +
                                        (actualEsSubiendo ? 'opacity-70' : '')
                                    }
                                    loading="lazy"
                                />
                            </button>
                        )}

                        {/* Overlay de "subiendo" — spinner centrado sobre
                            la imagen optimista. Se quita cuando la foto
                            real (URL R2) toma su lugar. */}
                        {actualEsSubiendo && (
                            <div
                                aria-hidden
                                className="absolute inset-0 grid place-items-center pointer-events-none"
                            >
                                <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 text-white text-[12px] font-semibold backdrop-blur-sm">
                                    <Loader2
                                        className="w-5 h-5 animate-spin"
                                        strokeWidth={2.5}
                                    />
                                    <span>Subiendo…</span>
                                </div>
                            </div>
                        )}

                        {/* Badge Portada — solo en la primera foto y si
                            no es una preview (las previews no son la
                            portada definitiva). */}
                        {indiceActual === 0 && !actualEsSubiendo && (
                            <span
                                aria-hidden
                                className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-sky-600/90 text-white text-[11px] font-semibold shadow pointer-events-none"
                            >
                                Portada
                            </span>
                        )}

                        {/* Botón "+" agregar más fotos — solo en hover y si no está lleno */}
                        {!lleno && (
                            <button
                                type="button"
                                data-testid="composer-zona-fotos-agregar"
                                onClick={abrirMenu}
                                aria-label="Agregar otra foto"
                                title="Agregar otra foto"
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 lg:cursor-pointer transition-opacity"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Botón "X" eliminar foto actual — NO se muestra
                            sobre previews (no son eliminables hasta que
                            terminen su upload; si falla el upload el
                            preview se quita solo). */}
                        {!actualEsSubiendo && (
                            <button
                                type="button"
                                aria-label="Eliminar foto"
                                data-testid={`composer-foto-eliminar-${indiceActual}`}
                                onClick={() => onEliminar(indiceActual)}
                                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center hover:bg-red-500/90 lg:cursor-pointer"
                            >
                                <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Flechas izq/der — sólo en hover y sólo si hay 2+ items
                            (cuenta tanto fotos confirmadas como previews
                            en curso de subida). */}
                        {totalItems > 1 && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Foto anterior"
                                    onClick={prev}
                                    disabled={indiceActual === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 lg:cursor-pointer disabled:opacity-0 transition-opacity"
                                >
                                    <ChevronLeft
                                        className="w-5 h-5"
                                        strokeWidth={2.5}
                                    />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Foto siguiente"
                                    onClick={next}
                                    disabled={
                                        indiceActual === totalItems - 1
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 lg:cursor-pointer disabled:opacity-0 transition-opacity"
                                >
                                    <ChevronRight
                                        className="w-5 h-5"
                                        strokeWidth={2.5}
                                    />
                                </button>

                                {/* Dots de paginación */}
                                <div
                                    aria-hidden
                                    className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40"
                                >
                                    {items.map((_, i) => (
                                        <span
                                            key={i}
                                            className={
                                                'w-1.5 h-1.5 rounded-full ' +
                                                (i === indiceActual
                                                    ? 'bg-white'
                                                    : 'bg-white/50')
                                            }
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {menuAbierto && (
                <div
                    role="menu"
                    data-testid="composer-menu-foto"
                    className="absolute top-full left-0 mt-2 z-20 w-52 rounded-xl border-2 border-slate-300 bg-white shadow-lg overflow-hidden"
                >
                    <button
                        type="button"
                        data-testid="composer-menu-foto-camara"
                        onClick={() => {
                            setMenuAbierto(false);
                            onAbrirCamara();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-[14px] font-semibold text-slate-800 hover:bg-sky-50 hover:text-sky-700 lg:cursor-pointer"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <Camera className="h-5 w-5" strokeWidth={2} />
                        </span>
                        Tomar foto
                    </button>
                    <div className="h-px bg-slate-200 mx-2" />
                    <button
                        type="button"
                        data-testid="composer-menu-foto-galeria"
                        onClick={() => {
                            setMenuAbierto(false);
                            onAbrirGaleria();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-[14px] font-semibold text-slate-800 hover:bg-sky-50 hover:text-sky-700 lg:cursor-pointer"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <ImageIcon className="h-5 w-5" strokeWidth={2} />
                        </span>
                        Subir de galería
                    </button>
                </div>
            )}

            {/* ── Lightbox: expandir foto a fullscreen al click ──
                Solo expone fotos confirmadas (URLs R2 persistentes).
                Las previews en curso no son expandibles. */}
            <ModalImagenes
                images={fotos}
                initialIndex={Math.min(indiceActual, Math.max(0, fotos.length - 1))}
                isOpen={lightboxAbierto && fotos.length > 0}
                onClose={() => setLightboxAbierto(false)}
            />
        </div>
    );
}

// =============================================================================
// PANELES (acordeones individuales)
// =============================================================================

function PanelWrapper({
    titulo,
    children,
    error,
}: {
    titulo: string;
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div
            data-testid={`composer-panel-${titulo.toLowerCase()}`}
            className="rounded-xl border-2 border-sky-300 bg-sky-50/40 p-3"
        >
            <div className="flex items-center gap-2 mb-2.5">
                <ChevronDown className="w-4 h-4 text-sky-700" strokeWidth={2.25} />
                <span className="text-[14px] font-bold text-sky-800">
                    {titulo}
                </span>
            </div>
            {children}
            {error && (
                <p className="mt-2 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}
        </div>
    );
}

function PanelCategoria({
    valor,
    onCambio,
    error,
}: {
    valor: CategoriaClasificado | null;
    onCambio: (c: CategoriaClasificado) => void;
    error?: string;
}) {
    return (
        <PanelWrapper titulo="Categoría" error={error}>
            <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS.map((c) => {
                    const activa = valor === c.id;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            data-testid={`composer-cat-${c.id}`}
                            onClick={() => onCambio(c.id)}
                            className={
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-sky-600 text-white border-2 border-sky-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-sky-500 hover:text-sky-700')
                            }
                        >
                            {activa && (
                                <Check className="w-4 h-4" strokeWidth={3} />
                            )}
                            {c.label}
                        </button>
                    );
                })}
            </div>
        </PanelWrapper>
    );
}

function PanelModalidad({
    valor,
    onCambio,
    error,
}: {
    valor: ModalidadServicio | null;
    onCambio: (m: ModalidadServicio) => void;
    error?: string;
}) {
    return (
        <PanelWrapper titulo="Modalidad" error={error}>
            <div className="flex flex-wrap gap-1.5">
                {MODALIDADES.map((m) => {
                    const activa = valor === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            data-testid={`composer-modalidad-${m.id}`}
                            onClick={() => onCambio(m.id)}
                            className={
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-sky-600 text-white border-2 border-sky-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-sky-500 hover:text-sky-700')
                            }
                        >
                            {activa && (
                                <Check className="w-4 h-4" strokeWidth={3} />
                            )}
                            {m.label}
                        </button>
                    );
                })}
            </div>
        </PanelWrapper>
    );
}

function PanelTarifa({
    modo,
    valorMin,
    valorMax,
    onCambioMin,
    onCambioMax,
    error,
}: {
    modo: ModoServicio | null;
    valorMin: string;
    valorMax: string;
    onCambioMin: (v: string) => void;
    onCambioMax: (v: string) => void;
    error?: string;
}) {
    const titulo = modo === 'ofrezco' ? 'Tarifa (MXN)' : 'Presupuesto (MXN)';
    return (
        <PanelWrapper titulo={titulo} error={error}>
            <div className="grid grid-cols-2 gap-2">
                <InputMonto
                    label="Mínimo"
                    value={valorMin}
                    onChange={(v) => onCambioMin(v.replace(/[^\d]/g, ''))}
                    testid="composer-presupuesto-min"
                />
                <InputMonto
                    label="Máximo"
                    value={valorMax}
                    onChange={(v) => onCambioMax(v.replace(/[^\d]/g, ''))}
                    testid="composer-presupuesto-max"
                />
            </div>
            <p className="mt-2 text-[13px] text-slate-600 font-medium">
                Vacío = a convenir.
            </p>
        </PanelWrapper>
    );
}

function InputMonto({
    label,
    value,
    onChange,
    testid,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    testid: string;
}) {
    return (
        <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[13px]">
                    $
                </span>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    data-testid={testid}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border-2 border-slate-300 bg-white pl-7 pr-2 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-sky-500 tabular-nums"
                />
            </div>
        </div>
    );
}

function PanelZonas({
    modo,
    items,
    onCambio,
    error,
}: {
    modo: ModoServicio | null;
    items: string[];
    onCambio: (z: string[]) => void;
    error?: string;
}) {
    const label =
        modo === 'ofrezco' ? 'Zonas que cubres' : 'Zonas donde lo necesitas';
    return (
        <PanelWrapper titulo={label} error={error}>
            <ChipInputList
                label=""
                helper="Mínimo 1, máximo 10."
                placeholder="Ej: Centro, Las Conchas"
                items={items}
                max={10}
                onChange={onCambio}
                testid="composer-zonas"
            />
        </PanelWrapper>
    );
}

function PanelUrgente({
    valor,
    onCambio,
}: {
    valor: boolean;
    onCambio: (u: boolean) => void;
}) {
    return (
        <PanelWrapper titulo="Urgente">
            <label
                className={
                    'flex items-start gap-2.5 rounded-lg p-3 lg:cursor-pointer ' +
                    (valor
                        ? 'bg-amber-50 border-2 border-amber-400'
                        : 'bg-white border-2 border-slate-300 hover:border-amber-400')
                }
            >
                <input
                    type="checkbox"
                    data-testid="composer-urgente"
                    checked={valor}
                    onChange={(e) => onCambio(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-slate-400 lg:cursor-pointer accent-amber-500"
                />
                <div>
                    <div className="text-[14px] font-bold text-slate-900">
                        Marcar como urgente
                    </div>
                    <p className="text-[13px] text-slate-600 font-medium mt-0.5">
                        Lo necesitas hoy o mañana. Sube al top del feed.
                    </p>
                </div>
            </label>
        </PanelWrapper>
    );
}

function CheckboxLegal({
    aceptado,
    onCambio,
    error,
}: {
    aceptado: boolean;
    onCambio: (v: boolean) => void;
    error?: string;
}) {
    const [verDetalles, setVerDetalles] = useState(false);
    return (
        <div>
            <label className="inline-flex items-center gap-2 lg:cursor-pointer">
                <input
                    type="checkbox"
                    data-testid="composer-legal"
                    checked={aceptado}
                    onChange={(e) => onCambio(e.target.checked)}
                    className="sr-only"
                />
                <span
                    aria-hidden
                    className={
                        'w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ' +
                        (aceptado
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'bg-white border-slate-300')
                    }
                >
                    {aceptado && (
                        <Check className="w-3 h-3" strokeWidth={3} />
                    )}
                </span>
                <span className="text-[14px] font-medium text-slate-700">
                    Acepto las reglas de publicación de AnunciaYA
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        setVerDetalles((v) => !v);
                    }}
                    className="inline-flex items-center gap-0.5 text-[14px] text-sky-700 font-semibold lg:cursor-pointer hover:text-sky-800"
                >
                    {verDetalles ? 'ocultar' : 'ver detalles'}
                    <ChevronDown
                        className={
                            'w-4 h-4 transition-transform ' +
                            (verDetalles ? 'rotate-180' : '')
                        }
                        strokeWidth={2.25}
                    />
                </button>
            </label>
            {verDetalles && (
                <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                    <li>
                        Es legal: no infringe leyes, ni es discriminatorio,
                        sexual o de armas.
                    </li>
                    <li>
                        Es información verdadera: precio, fotos y datos reflejan
                        lo real.
                    </li>
                    <li>
                        AnunciaYA solo conecta. El pago y la entrega se acuerdan
                        entre las personas.
                    </li>
                </ul>
            )}
            {error && (
                <p className="mt-1 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Mapeo error → sección de acordeón a abrir. Devuelve null si el
 *  error está fuera del acordeón (modo, título, descripción, legal). */
function primerSeccionConError(e: {
    categoria?: string;
    modalidad?: string;
    presupuesto?: string;
    zonas?: string;
}): SeccionAbierta {
    if (e.categoria) return 'categoria';
    if (e.modalidad) return 'modalidad';
    if (e.presupuesto) return 'tarifa';
    if (e.zonas) return 'zonas';
    return null;
}

/** Título del ModalBottom móvil según la sección abierta. */
function tituloPorSeccion(
    s: SeccionAbierta,
    modo: ModoServicio | null,
): string {
    switch (s) {
        case 'categoria':
            return 'Categoría';
        case 'modalidad':
            return 'Modalidad';
        case 'tarifa':
            return modo === 'ofrezco' ? 'Tarifa' : 'Presupuesto';
        case 'zonas':
            return 'Zonas';
        case 'urgente':
            return 'Urgencia';
        default:
            return '';
    }
}

function publicacionAlDraft(
    p: PublicacionDetalle,
): Partial<ComposerServiciosDraft> {
    let budgetMin = '';
    let budgetMax = '';

    if (p.modo === 'solicito' && p.presupuesto) {
        budgetMin = String(p.presupuesto.min);
        budgetMax = String(p.presupuesto.max);
    } else if (p.modo === 'ofrezco' && p.precio) {
        const pr: PrecioServicio = p.precio;
        if (pr.kind === 'fijo' || pr.kind === 'hora' || pr.kind === 'mensual') {
            budgetMin = String(pr.monto);
            budgetMax = String(pr.monto);
        } else if (pr.kind === 'rango') {
            budgetMin = String(pr.min);
            budgetMax = String(pr.max);
        }
    }

    return {
        modo: p.modo,
        categoria: p.categoria,
        titulo: p.titulo,
        descripcion: p.descripcion,
        urgente: p.urgente,
        fotos: p.fotos,
        fotoPortadaIndex: p.fotoPortadaIndex,
        modalidad: p.modalidad,
        budgetMin,
        budgetMax,
        zonasAproximadas: p.zonasAproximadas,
        latitud: p.ubicacionAproximada.lat,
        longitud: p.ubicacionAproximada.lng,
        ciudad: p.ciudad,
        confirmaciones: {
            legal: true,
            verdadera: true,
            coordinacion: true,
        },
    };
}

export default ComposerServicios;
