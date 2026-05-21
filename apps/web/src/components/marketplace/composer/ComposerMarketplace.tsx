/**
 * ComposerMarketplace.tsx (variante INLINE)
 * ===========================================
 * Composer de MarketPlace — vive INLINE en el feed (no es overlay/modal).
 * Réplica 1:1 del `ComposerServicios` con el shape específico de MP:
 *
 *   - SIN toggle Ofrezco/Solicito (todo es "vender un artículo").
 *   - Campo Precio (entero positivo) como obligatorio junto al título.
 *   - Detalles row: Condición, Acepta ofertas, Unidad de venta, Zona.
 *   - Zona OBLIGATORIA (a diferencia de Servicios donde zonas es lista).
 *   - Fotos OBLIGATORIAS mínimo 1.
 *   - 4 confirmaciones legales (compactadas a 1 checkbox en UI).
 *   - Tonos teal en lugar de sky (identidad de MarketPlace).
 *
 * Estados:
 *   - Colapsado → componente `<ComposerColapsado>` MP (pill).
 *   - Expandido → ESTE componente.
 *   - El orquestador `<ComposerSection>` MP decide cuál renderizar.
 *
 * Moderación en 2 niveles:
 *   - Inline hint debajo de la descripción mientras escribe (debounce 600ms)
 *     sugiriendo ir a Servicios o al Home (Pregúntale a Peñasco).
 *   - Modal `ModalSugerenciaModeracion` post-publicación si el backend
 *     devuelve `success: false` con `severidad: 'sugerencia'`. Permite
 *     reintentar con `confirmadoPorUsuario: true`. Rechazo duro (422)
 *     muestra toast con el mensaje del backend.
 *
 * Edición: el componente recibe `modo='editar'` y `articuloId`, carga el
 * artículo desde `useArticuloMarketplace` y lo hidrata al draft una sola vez.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerMarketplace.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    MapPin,
    MoreHorizontal,
    Package,
    Plus,
    Send,
    Tags,
    X,
} from 'lucide-react';
import { ModalBottom } from '../../ui/ModalBottom';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { ModalSugerenciaModeracion } from '../ModalSugerenciaModeracion';
import {
    useComposerMarketplace,
    parseEnteroPositivo,
    type ComposerMarketplaceDraft,
} from '../../../hooks/useComposerMarketplace';
import {
    useFotosUploaderMarketplace,
    MAX_FOTOS_COMPOSER_MP,
} from '../../../hooks/useFotosUploaderMarketplace';
import {
    useArticuloMarketplace,
    useCrearArticulo,
    useActualizarArticulo,
    type CrearArticuloPayload,
    type RespuestaModeracion,
} from '../../../hooks/queries/useMarketplace';
import {
    construirPayloadCrearMP,
    construirPayloadEditarMP,
} from '../../../utils/composerMarketplacePayload';
import { ComposerHintModeracion } from './ComposerHintModeracion';
import { notificar } from '../../../utils/notificaciones';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { Spinner } from '../../ui/Spinner';
import useBreakpoint from '../../../hooks/useBreakpoint';
import type {
    ArticuloMarketplaceDetalle,
    CondicionArticulo,
} from '../../../types/marketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

const CONDICIONES: { id: CondicionArticulo; label: string }[] = [
    { id: 'nuevo', label: 'Nuevo' },
    { id: 'seminuevo', label: 'Seminuevo' },
    { id: 'usado', label: 'Usado' },
    { id: 'para_reparar', label: 'Para reparar' },
];

/** Identificador del acordeón actualmente abierto. `null` = ninguno. */
type SeccionAbierta = 'condicion' | 'ofertas' | 'unidad' | 'zona' | null;

// =============================================================================
// COMPONENTE
// =============================================================================

interface ComposerMarketplaceProps {
    /** Modo de operación. En 'editar' se hidrata desde el artículo. */
    modo: 'crear' | 'editar';
    /** Sólo aplica si modo='editar'. */
    articuloId: string | null;
    /** Colapsar el composer (vuelve a la pill). */
    onColapsar: () => void;
}

export function ComposerMarketplace({
    modo,
    articuloId,
    onColapsar,
}: ComposerMarketplaceProps) {
    const navigate = useNavigate();
    const esEdicion = modo === 'editar' && !!articuloId;

    // ─── Datos de usuario para el header (avatar/nombre) ──────────────
    const usuario = useAuthStore((s) => s.usuario);
    const nombreUsuario = usuario?.nombre ?? '';
    const avatarUsuario = usuario?.avatarUrl ?? null;

    // ─── Carga artículo en edición ───────────────────────────────────
    const articuloQuery = useArticuloMarketplace(
        esEdicion ? articuloId : undefined,
    );
    const articulo = articuloQuery.data ?? null;

    // ─── Hook del draft ──────────────────────────────────────────────
    const storageNamespace = esEdicion ? `edit-${articuloId}` : undefined;
    const {
        draft,
        actualizar,
        setConfirmacionesUnificadas,
        limpiar,
        hidratarDesdeArticulo,
        errores,
        valido,
    } = useComposerMarketplace({ storageNamespace });

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
        if (!articulo || hidratadoRef.current) return;
        hidratadoRef.current = true;
        hidratarDesdeArticulo(articuloAlDraft(articulo));
    }, [esEdicion, articulo, hidratarDesdeArticulo]);

    // ─── Acordeón único (un campo abierto a la vez) ─────────────────
    const { esEscritorio } = useBreakpoint();
    const [seccionAbierta, setSeccionAbierta] = useState<SeccionAbierta>(null);
    function alternar(s: SeccionAbierta) {
        setSeccionAbierta((prev) => (prev === s ? null : s));
    }

    // ─── Uploader de fotos ───────────────────────────────────────────
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set(draft.fotos));
    const fotosUploader = useFotosUploaderMarketplace({
        fotos: draft.fotos,
        onCambioFotos: (fotos) => actualizar({ fotos }),
        urlsSubidasEnSesion,
    });

    // ─── Moderación post-publish (sugerencia suave) ──────────────────
    const [sugerencia, setSugerencia] = useState<{
        categoria: 'servicio' | 'busqueda';
        mensaje: string;
    } | null>(null);

    // ─── Mutations ───────────────────────────────────────────────────
    const crearMutation = useCrearArticulo();
    const actualizarMutation = useActualizarArticulo();
    const enviando = crearMutation.isPending || actualizarMutation.isPending;

    async function publicar(confirmadoPorUsuario = false) {
        if (!valido || enviando) {
            // Si el error está en un campo escondido en acordeón, ábrelo.
            const seccionConError = primerSeccionConError(errores);
            if (seccionConError) setSeccionAbierta(seccionConError);
            return;
        }

        if (esEdicion && articuloId) {
            try {
                const payload = construirPayloadEditarMP(draft);
                if (confirmadoPorUsuario) {
                    (payload as CrearArticuloPayload).confirmadoPorUsuario = true;
                }
                const res = await actualizarMutation.mutateAsync({
                    articuloId,
                    payload,
                });
                if (res.success) {
                    notificar.exito('Cambios guardados.');
                    urlsSubidasEnSesion.current.clear();
                    limpiar();
                    onColapsar();
                    return;
                }
                manejarRespuestaModeracion(res);
            } catch (e) {
                manejarErrorHttp(e);
            }
            return;
        }

        try {
            const payload = construirPayloadCrearMP(draft);
            if (confirmadoPorUsuario) {
                payload.confirmadoPorUsuario = true;
            }
            const res = await crearMutation.mutateAsync(payload);
            if (res.success && 'data' in res && res.data?.id) {
                notificar.exito('¡Publicado!');
                urlsSubidasEnSesion.current.clear();
                limpiar();
                onColapsar();
                navigate(`/marketplace/articulo/${res.data.id}`);
                return;
            }
            manejarRespuestaModeracion(res);
        } catch (e) {
            manejarErrorHttp(e);
        }
    }

    /** Si la respuesta es una sugerencia suave (200, `success: false`), abre
     *  el modal con las opciones Editar/Continuar. Si es success ya se manejó
     *  arriba. */
    function manejarRespuestaModeracion(
        res: { success: boolean } | RespuestaModeracion,
    ) {
        if (
            !res.success &&
            'moderacion' in res &&
            res.moderacion.severidad === 'sugerencia'
        ) {
            setSugerencia({
                categoria: res.moderacion.categoria as 'servicio' | 'busqueda',
                mensaje: res.moderacion.mensaje,
            });
        } else {
            notificar.error('No pudimos publicar tu artículo.');
        }
    }

    /** Rechazo duro (422) o error HTTP genérico. */
    function manejarErrorHttp(e: unknown) {
        const status = (e as { response?: { status?: number } })?.response
            ?.status;
        const data = (e as { response?: { data?: RespuestaModeracion } })
            ?.response?.data;
        if (status === 422 && data?.moderacion) {
            notificar.error(data.moderacion.mensaje);
            return;
        }
        notificar.error('No pudimos conectar con el servidor. Intenta de nuevo.');
    }

    // ─── Render ──────────────────────────────────────────────────────

    // En edición, si el artículo está cargando, mostrar spinner inline.
    const cargandoEdicion = esEdicion && articuloQuery.isPending && !articulo;

    return (
        <>
            <div
                data-testid="composer-mp-expandido"
                className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden"
            >
                {/* ── Header ──────────────────────────────────────────── */}
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
                                className="h-11 w-11 rounded-full bg-teal-600 grid place-items-center text-white font-bold text-base shrink-0"
                            >
                                {(nombreUsuario[0] ?? 'A').toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="text-[17px] font-bold text-slate-900 truncate leading-tight">
                                {esEdicion
                                    ? 'Editar publicación'
                                    : 'Vender un artículo'}
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
                    <button
                        type="button"
                        aria-label="Cerrar composer"
                        data-testid="composer-mp-cerrar"
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
                        {/* Layout PC: 2 columnas (Fotos a la izquierda + Campos
                            a la derecha). Móvil: stack vertical normal. */}
                        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-5">
                            {/* ── Columna izquierda: ZonaFotos ─────────── */}
                            <div className="mb-3 lg:mb-0">
                                <ZonaFotos
                                    fotos={draft.fotos}
                                    onEliminar={fotosUploader.eliminar}
                                    onAbrirGaleria={fotosUploader.abrirGaleria}
                                    onAbrirCamara={fotosUploader.abrirCamara}
                                    subiendo={fotosUploader.subiendo}
                                    error={errores.fotos}
                                />
                                <input {...fotosUploader.inputGaleriaProps} />
                                <input {...fotosUploader.inputCamaraProps} />
                            </div>

                            {/* ── Columna derecha: campos y detalles ──── */}
                            <div className="space-y-3 min-w-0">
                                {/* Título (autoFocus en creación) */}
                                <CampoTitulo
                                    valor={draft.titulo}
                                    autoFocus={!esEdicion}
                                    onCambio={(v) =>
                                        actualizar({ titulo: v.slice(0, 80) })
                                    }
                                    error={errores.titulo}
                                />

                                {/* Precio */}
                                <CampoPrecio
                                    valor={draft.precio}
                                    onCambio={(v) =>
                                        actualizar({
                                            precio: v.replace(/[^\d]/g, ''),
                                        })
                                    }
                                    error={errores.precio}
                                />

                                {/* Descripción */}
                                <CampoDescripcion
                                    valor={draft.descripcion}
                                    onCambio={(v) =>
                                        actualizar({
                                            descripcion: v.slice(0, 1000),
                                        })
                                    }
                                    error={errores.descripcion}
                                />

                                {/* Hint moderación inline */}
                                <ComposerHintModeracion
                                    texto={`${draft.titulo} ${draft.descripcion}`}
                                    onIrServicios={() => {
                                        onColapsar();
                                        navigate('/servicios?crear=ofrezco');
                                    }}
                                    onIrHome={() => {
                                        onColapsar();
                                        navigate('/inicio');
                                    }}
                                />
                            </div>
                        </div>

                        {/* ── Detalles (full width debajo del grid) + acordeón ── */}
                        <div className="mt-3 space-y-3">
                            <FilaIconos
                                draft={draft}
                                seccionAbierta={seccionAbierta}
                                onAlternar={alternar}
                            />

                            {esEscritorio && seccionAbierta === 'condicion' && (
                                <PanelCondicion
                                    valor={draft.condicion}
                                    onCambio={(c) =>
                                        actualizar({ condicion: c })
                                    }
                                    error={errores.condicion}
                                />
                            )}
                            {esEscritorio && seccionAbierta === 'ofertas' && (
                                <PanelOfertas
                                    valor={draft.aceptaOfertas}
                                    onCambio={(v) =>
                                        actualizar({ aceptaOfertas: v })
                                    }
                                />
                            )}
                            {esEscritorio && seccionAbierta === 'unidad' && (
                                <PanelUnidad
                                    valor={draft.unidadVenta}
                                    onCambio={(v) =>
                                        actualizar({ unidadVenta: v.slice(0, 30) })
                                    }
                                    error={errores.unidadVenta}
                                />
                            )}
                            {esEscritorio && seccionAbierta === 'zona' && (
                                <PanelZona
                                    valor={draft.zonaAproximada}
                                    onCambio={(v) =>
                                        actualizar({
                                            zonaAproximada: v.slice(0, 150),
                                        })
                                    }
                                    error={errores.zonaAproximada}
                                />
                            )}

                            {/* ── ModalBottom para móvil (variante B) ─── */}
                            {!esEscritorio && seccionAbierta !== null && (
                                <ModalBottom
                                    abierto={true}
                                    onCerrar={() => setSeccionAbierta(null)}
                                    titulo={tituloPorSeccion(seccionAbierta)}
                                    alturaMaxima="sm"
                                >
                                    <div className="px-4 pb-4 space-y-3">
                                        {seccionAbierta === 'condicion' && (
                                            <PanelCondicion
                                                valor={draft.condicion}
                                                onCambio={(c) =>
                                                    actualizar({ condicion: c })
                                                }
                                                error={errores.condicion}
                                            />
                                        )}
                                        {seccionAbierta === 'ofertas' && (
                                            <PanelOfertas
                                                valor={draft.aceptaOfertas}
                                                onCambio={(v) =>
                                                    actualizar({
                                                        aceptaOfertas: v,
                                                    })
                                                }
                                            />
                                        )}
                                        {seccionAbierta === 'unidad' && (
                                            <PanelUnidad
                                                valor={draft.unidadVenta}
                                                onCambio={(v) =>
                                                    actualizar({
                                                        unidadVenta: v.slice(
                                                            0,
                                                            30,
                                                        ),
                                                    })
                                                }
                                                error={errores.unidadVenta}
                                            />
                                        )}
                                        {seccionAbierta === 'zona' && (
                                            <PanelZona
                                                valor={draft.zonaAproximada}
                                                onCambio={(v) =>
                                                    actualizar({
                                                        zonaAproximada: v.slice(
                                                            0,
                                                            150,
                                                        ),
                                                    })
                                                }
                                                error={errores.zonaAproximada}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setSeccionAbierta(null)}
                                            className="w-full py-2.5 rounded-xl bg-linear-to-b from-teal-500 to-teal-700 text-white font-bold text-[14px] shadow-sm"
                                        >
                                            Listo
                                        </button>
                                    </div>
                                </ModalBottom>
                            )}

                            {/* ── Error de ubicación (no tiene panel propio) ─ */}
                            {errores.ubicacion && (
                                <p
                                    data-testid="composer-mp-error-ubicacion"
                                    className="text-[13px] text-red-600 font-semibold"
                                >
                                    {errores.ubicacion}
                                </p>
                            )}
                        </div>

                        {/* ── Reglas legales + acciones ────────────── */}
                        <div className="mt-4 flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4 pt-3 border-t-2 border-slate-200">
                            <div className="flex-1 min-w-0">
                                <CheckboxLegal
                                    aceptado={
                                        draft.confirmaciones.licito &&
                                        draft.confirmaciones.enPoder &&
                                        draft.confirmaciones.honesto &&
                                        draft.confirmaciones.seguro
                                    }
                                    onCambio={setConfirmacionesUnificadas}
                                    error={errores.confirmaciones}
                                    omitirEnEdicion={esEdicion}
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    data-testid="composer-mp-btn-cancelar"
                                    onClick={onColapsar}
                                    disabled={enviando}
                                    className="px-5 h-12 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-semibold text-[15px] hover:bg-slate-100 hover:border-slate-400 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    data-testid="composer-mp-btn-publicar"
                                    onClick={() => publicar(false)}
                                    disabled={!valido || enviando}
                                    className={
                                        'inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-bold text-[15px] lg:cursor-pointer ' +
                                        (valido && !enviando
                                            ? 'bg-linear-to-b from-teal-500 to-teal-700 text-white shadow-sm hover:brightness-110'
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

            {/* Modal sugerencia post-publish — categoría servicio o búsqueda. */}
            <ModalSugerenciaModeracion
                abierto={!!sugerencia}
                categoria={sugerencia?.categoria ?? 'servicio'}
                mensaje={sugerencia?.mensaje ?? ''}
                onEditar={() => setSugerencia(null)}
                onContinuar={() => {
                    setSugerencia(null);
                    publicar(true);
                }}
                cargandoContinuar={enviando}
            />
        </>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function CampoTitulo({
    valor,
    autoFocus,
    onCambio,
    error,
}: {
    valor: string;
    autoFocus: boolean;
    onCambio: (v: string) => void;
    error?: string;
}) {
    return (
        <div>
            <input
                type="text"
                data-testid="composer-mp-titulo"
                value={valor}
                autoFocus={autoFocus}
                onChange={(e) => onCambio(e.target.value)}
                placeholder="Ej: Bicicleta de montaña rodada 26"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-[16px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-teal-500"
            />
            {error && (
                <p className="mt-1 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}
        </div>
    );
}

function CampoPrecio({
    valor,
    onCambio,
    error,
}: {
    valor: string;
    onCambio: (v: string) => void;
    error?: string;
}) {
    return (
        <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Precio (MXN)
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
                    $
                </span>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    data-testid="composer-mp-precio"
                    value={valor}
                    onChange={(e) => onCambio(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white pl-8 pr-3 py-2 text-[16px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-teal-500 tabular-nums"
                />
            </div>
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
    onCambio,
    error,
}: {
    valor: string;
    onCambio: (v: string) => void;
    error?: string;
}) {
    return (
        <div>
            <textarea
                data-testid="composer-mp-descripcion"
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                rows={3}
                placeholder="Cuenta los detalles del artículo: marca, antigüedad, motivo de venta…"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-medium outline-none resize-none focus:border-teal-500"
            />
            <div className="mt-1 flex items-center justify-between text-[12px]">
                <span className="text-slate-500 font-medium">
                    {error ??
                        (valor.length > 0
                            ? ''
                            : 'Opcional · máximo 1000 caracteres.')}
                </span>
                <span className="text-slate-400 font-medium tabular-nums">
                    {valor.length}/1000
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
    draft,
    seccionAbierta,
    onAlternar,
}: {
    draft: ComposerMarketplaceDraft;
    seccionAbierta: SeccionAbierta;
    onAlternar: (s: SeccionAbierta) => void;
}) {
    const iconos: IconoConfig[] = [
        {
            id: 'condicion',
            Icono: Tags,
            label: 'Condición',
            activo: draft.condicion !== null,
        },
        {
            id: 'ofertas',
            Icono: MoreHorizontal,
            label: 'Ofertas',
            activo: draft.aceptaOfertas !== null,
        },
        {
            id: 'unidad',
            Icono: Package,
            label: 'Unidad',
            activo: draft.unidadVenta.trim().length > 0,
        },
        {
            id: 'zona',
            Icono: MapPin,
            label: 'Zona',
            activo: draft.zonaAproximada.trim().length > 0,
        },
    ];

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
                            data-testid={`composer-mp-icono-${it.id}`}
                            onClick={() => onAlternar(it.id)}
                            aria-pressed={abierto}
                            aria-label={it.label}
                            className={
                                'group relative flex items-center gap-2 px-3 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer shrink-0 ' +
                                (abierto
                                    ? 'bg-teal-100 border-2 border-teal-500 text-teal-800'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:text-teal-700 hover:border-teal-500')
                            }
                        >
                            <span className="inline-flex items-center gap-2 transition-transform duration-150 group-hover:scale-110">
                                <it.Icono className="w-5 h-5" strokeWidth={2} />
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
    onEliminar,
    onAbrirGaleria,
    onAbrirCamara,
    subiendo,
    error,
}: {
    fotos: string[];
    onEliminar: (idx: number) => void;
    onAbrirGaleria: () => void;
    onAbrirCamara: () => void;
    subiendo: boolean;
    error?: string;
}) {
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

    const lleno = fotos.length >= MAX_FOTOS_COMPOSER_MP;
    const abrirMenu = () => {
        if (subiendo || lleno) return;
        if (esEscritorio) {
            onAbrirGaleria();
            return;
        }
        setMenuAbierto((o) => !o);
    };

    const [indiceActual, setIndiceActual] = useState(0);
    useEffect(() => {
        if (fotos.length === 0) {
            setIndiceActual(0);
            return;
        }
        if (indiceActual >= fotos.length) {
            setIndiceActual(fotos.length - 1);
        }
    }, [fotos.length, indiceActual]);

    const prev = () => setIndiceActual((i) => Math.max(0, i - 1));
    const next = () =>
        setIndiceActual((i) => Math.min(fotos.length - 1, i + 1));
    const urlActual = fotos[indiceActual] ?? null;

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
                    <span className="inline-flex items-center h-6 px-2 rounded-full bg-rose-100 text-rose-700 text-[12px] font-semibold">
                        obligatoria
                    </span>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
                    {fotos.length}/{MAX_FOTOS_COMPOSER_MP}
                </span>
            </div>

            <div className="group relative aspect-[3/1] lg:aspect-square w-full rounded-xl overflow-hidden">
                {fotos.length === 0 ? (
                    <button
                        type="button"
                        data-testid="composer-mp-zona-fotos-vacia"
                        onClick={abrirMenu}
                        disabled={subiendo}
                        className={
                            'absolute inset-0 rounded-xl flex flex-row lg:flex-col items-center justify-center gap-2.5 lg:gap-1.5 text-slate-600 hover:bg-teal-50 hover:text-teal-700 lg:cursor-pointer disabled:opacity-50 px-3 lg:px-0 ' +
                            (error
                                ? 'bg-rose-50 border-2 border-dashed border-rose-400 hover:border-teal-500'
                                : 'bg-slate-50 border-2 border-dashed border-slate-300 hover:border-teal-500')
                        }
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
                        {urlActual && (
                            <button
                                type="button"
                                aria-label="Ver foto en grande"
                                onClick={() => setLightboxAbierto(true)}
                                className="absolute inset-0 w-full h-full lg:cursor-zoom-in"
                            >
                                <img
                                    key={urlActual}
                                    src={urlActual}
                                    alt={`Foto ${indiceActual + 1} de ${fotos.length}`}
                                    className="w-full h-full object-cover bg-slate-100"
                                    loading="lazy"
                                />
                            </button>
                        )}

                        {indiceActual === 0 && (
                            <span
                                aria-hidden
                                className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-teal-600/90 text-white text-[11px] font-semibold shadow pointer-events-none"
                            >
                                Portada
                            </span>
                        )}

                        {!lleno && (
                            <button
                                type="button"
                                data-testid="composer-mp-zona-fotos-agregar"
                                onClick={abrirMenu}
                                disabled={subiendo}
                                aria-label="Agregar otra foto"
                                title="Agregar otra foto"
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 lg:cursor-pointer disabled:opacity-0 transition-opacity"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        )}

                        <button
                            type="button"
                            aria-label="Eliminar foto"
                            data-testid={`composer-mp-foto-eliminar-${indiceActual}`}
                            onClick={() => onEliminar(indiceActual)}
                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center hover:bg-red-500/90 lg:cursor-pointer"
                        >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>

                        {fotos.length > 1 && (
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
                                    disabled={indiceActual === fotos.length - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 lg:cursor-pointer disabled:opacity-0 transition-opacity"
                                >
                                    <ChevronRight
                                        className="w-5 h-5"
                                        strokeWidth={2.5}
                                    />
                                </button>
                                <div
                                    aria-hidden
                                    className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40"
                                >
                                    {fotos.map((_, i) => (
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

            {error && (
                <p className="mt-1 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}

            {menuAbierto && (
                <div
                    role="menu"
                    data-testid="composer-mp-menu-foto"
                    className="absolute top-full left-0 mt-2 z-20 w-52 rounded-xl border-2 border-slate-300 bg-white shadow-lg overflow-hidden"
                >
                    <button
                        type="button"
                        data-testid="composer-mp-menu-foto-camara"
                        onClick={() => {
                            setMenuAbierto(false);
                            onAbrirCamara();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-[14px] font-semibold text-slate-800 hover:bg-teal-50 hover:text-teal-700 lg:cursor-pointer"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <Camera className="h-5 w-5" strokeWidth={2} />
                        </span>
                        Tomar foto
                    </button>
                    <div className="h-px bg-slate-200 mx-2" />
                    <button
                        type="button"
                        data-testid="composer-mp-menu-foto-galeria"
                        onClick={() => {
                            setMenuAbierto(false);
                            onAbrirGaleria();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-[14px] font-semibold text-slate-800 hover:bg-teal-50 hover:text-teal-700 lg:cursor-pointer"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <ImageIcon className="h-5 w-5" strokeWidth={2} />
                        </span>
                        Subir de galería
                    </button>
                </div>
            )}

            <ModalImagenes
                images={fotos}
                initialIndex={indiceActual}
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
            data-testid={`composer-mp-panel-${titulo.toLowerCase()}`}
            className="rounded-xl border-2 border-teal-300 bg-teal-50/40 p-3"
        >
            <div className="flex items-center gap-2 mb-2.5">
                <ChevronDown
                    className="w-4 h-4 text-teal-700"
                    strokeWidth={2.25}
                />
                <span className="text-[14px] font-bold text-teal-800">
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

function PanelCondicion({
    valor,
    onCambio,
    error,
}: {
    valor: CondicionArticulo | null;
    onCambio: (c: CondicionArticulo) => void;
    error?: string;
}) {
    return (
        <PanelWrapper titulo="Condición" error={error}>
            <div className="flex flex-wrap gap-1.5">
                {CONDICIONES.map((c) => {
                    const activa = valor === c.id;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            data-testid={`composer-mp-cond-${c.id}`}
                            onClick={() => onCambio(c.id)}
                            className={
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-teal-600 text-white border-2 border-teal-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-teal-500 hover:text-teal-700')
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
            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                Opcional. Déjalo en blanco si no aplica (ej: consumibles).
            </p>
        </PanelWrapper>
    );
}

function PanelOfertas({
    valor,
    onCambio,
}: {
    valor: boolean | null;
    onCambio: (v: boolean | null) => void;
}) {
    const opciones: { id: 'si' | 'no' | null; label: string; valor: boolean | null }[] = [
        { id: 'si', label: 'Sí, acepto ofertas', valor: true },
        { id: 'no', label: 'No, precio cerrado', valor: false },
    ];
    return (
        <PanelWrapper titulo="¿Aceptas ofertas?">
            <div className="flex flex-wrap gap-1.5">
                {opciones.map((o) => {
                    const activa = valor === o.valor;
                    return (
                        <button
                            key={o.id ?? 'null'}
                            type="button"
                            data-testid={`composer-mp-ofertas-${o.id}`}
                            onClick={() =>
                                onCambio(activa ? null : o.valor)
                            }
                            className={
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-teal-600 text-white border-2 border-teal-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-teal-500 hover:text-teal-700')
                            }
                        >
                            {activa && (
                                <Check className="w-4 h-4" strokeWidth={3} />
                            )}
                            {o.label}
                        </button>
                    );
                })}
            </div>
            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                Opcional. Si no eliges, no se muestra esta etiqueta.
            </p>
        </PanelWrapper>
    );
}

function PanelUnidad({
    valor,
    onCambio,
    error,
}: {
    valor: string;
    onCambio: (v: string) => void;
    error?: string;
}) {
    const sugerencias = ['c/u', 'por kg', 'por docena', 'por litro', 'por metro'];
    return (
        <PanelWrapper titulo="Unidad de venta" error={error}>
            <input
                type="text"
                data-testid="composer-mp-unidad"
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                placeholder="Ej: c/u, por kg, por docena…"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-teal-500"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
                {sugerencias.map((s) => (
                    <button
                        key={s}
                        type="button"
                        data-testid={`composer-mp-unidad-sug-${s}`}
                        onClick={() => onCambio(s)}
                        className="px-3 py-1 rounded-full bg-white border-2 border-slate-300 text-[13px] font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-700 lg:cursor-pointer"
                    >
                        {s}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                Opcional. Cuando existe, el card muestra "$15 c/u" en lugar de
                solo "$15".
            </p>
        </PanelWrapper>
    );
}

function PanelZona({
    valor,
    onCambio,
    error,
}: {
    valor: string;
    onCambio: (v: string) => void;
    error?: string;
}) {
    return (
        <PanelWrapper titulo="Zona aproximada" error={error}>
            <input
                type="text"
                data-testid="composer-mp-zona"
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                placeholder="Ej: Centro, Las Conchas, Cholla Bay…"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-teal-500"
            />
            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                Obligatorio. Ayuda al comprador a ubicar dónde recoger.
            </p>
        </PanelWrapper>
    );
}

function CheckboxLegal({
    aceptado,
    onCambio,
    error,
    omitirEnEdicion,
}: {
    aceptado: boolean;
    onCambio: (v: boolean) => void;
    error?: string;
    omitirEnEdicion: boolean;
}) {
    const [verDetalles, setVerDetalles] = useState(false);
    if (omitirEnEdicion) {
        // En edición no se vuelve a pedir el checklist (el original persiste
        // en BD). Mantenemos esta nota para que el footer no quede vacío.
        return (
            <p className="text-[13px] text-slate-500 font-medium">
                Las reglas que aceptaste al publicar siguen vigentes.
            </p>
        );
    }
    return (
        <div>
            <label className="inline-flex items-center gap-2 lg:cursor-pointer">
                <input
                    type="checkbox"
                    data-testid="composer-mp-legal"
                    checked={aceptado}
                    onChange={(e) => onCambio(e.target.checked)}
                    className="sr-only"
                />
                <span
                    aria-hidden
                    className={
                        'w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ' +
                        (aceptado
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-white border-slate-300')
                    }
                >
                    {aceptado && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="text-[14px] font-medium text-slate-700">
                    Acepto las reglas de publicación de MarketPlace
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        setVerDetalles((v) => !v);
                    }}
                    className="inline-flex items-center gap-0.5 text-[14px] text-teal-700 font-semibold lg:cursor-pointer hover:text-teal-800"
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
                        El artículo es <strong>lícito</strong>: no infringe leyes,
                        ni es producto robado, ilegal o restringido.
                    </li>
                    <li>
                        Lo tengo <strong>en mi poder</strong> y disponible para
                        entregar.
                    </li>
                    <li>
                        La información es <strong>honesta</strong>: fotos, precio
                        y descripción reflejan la realidad.
                    </li>
                    <li>
                        Acepto coordinar entregas <strong>seguras</strong> en
                        lugares públicos.
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

/** Mapeo error → sección de acordeón a abrir. */
function primerSeccionConError(e: {
    condicion?: string;
    unidadVenta?: string;
    zonaAproximada?: string;
}): SeccionAbierta {
    if (e.condicion) return 'condicion';
    if (e.unidadVenta) return 'unidad';
    if (e.zonaAproximada) return 'zona';
    return null;
}

function tituloPorSeccion(s: SeccionAbierta): string {
    switch (s) {
        case 'condicion':
            return 'Condición';
        case 'ofertas':
            return 'Aceptas ofertas';
        case 'unidad':
            return 'Unidad de venta';
        case 'zona':
            return 'Zona aproximada';
        default:
            return '';
    }
}

function articuloAlDraft(
    a: ArticuloMarketplaceDetalle,
): Partial<ComposerMarketplaceDraft> {
    const precioNum = parseEnteroPositivo(a.precio);
    return {
        titulo: a.titulo,
        descripcion: a.descripcion,
        precio: precioNum !== null ? String(precioNum) : '',
        fotos: a.fotos,
        fotoPortadaIndex: a.fotoPortadaIndex,
        condicion: a.condicion,
        aceptaOfertas: a.aceptaOfertas,
        unidadVenta: a.unidadVenta ?? '',
        latitud: a.ubicacionAproximada.lat,
        longitud: a.ubicacionAproximada.lng,
        ciudad: a.ciudad,
        zonaAproximada: a.zonaAproximada,
        // En edición el backend NO requiere confirmaciones — el valor original
        // persiste en BD. Marcamos todas en true en el draft para que el
        // botón Publicar no quede deshabilitado por validación local.
        confirmaciones: {
            licito: true,
            enPoder: true,
            honesto: true,
            seguro: true,
        },
    };
}

export default ComposerMarketplace;
