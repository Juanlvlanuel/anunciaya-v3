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
import { useNavegarASeccion } from '@/hooks/useNavegarASeccion';
import {
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    Loader2,
    MapPin,
    MoreHorizontal,
    Package,
    Plus,
    Search,
    Send,
    Tag,
    Tags,
    X,
} from 'lucide-react';
import { ModalBottom } from '../../ui/ModalBottom';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { CustomSelect } from '../../ui/CustomSelect';
import { ModalSugerenciaModeracion } from '../ModalSugerenciaModeracion';
import {
    useComposerMarketplace,
    type ComposerMarketplaceDraft,
} from '../../../hooks/useComposerMarketplace';
import {
    useFotosUploaderMarketplace,
    MAX_FOTOS_COMPOSER_MP,
    type FotoPreviewLocalMP,
} from '../../../hooks/useFotosUploaderMarketplace';
import {
    useArticuloMarketplace,
    useCrearArticulo,
    useActualizarArticulo,
    useCategoriasMarketplace,
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
    CategoriaMarketplace,
    CondicionArticulo,
    ModoArticulo,
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
    /** Preselecciona Vendo/Busco al abrir en creación (desde el FAB según el
     *  tab activo del feed). null = usa el modo del borrador. */
    intencionInicial?: 'vendo' | 'busco' | null;
    /** Colapsar el composer (vuelve a la pill). */
    onColapsar: () => void;
}

export function ComposerMarketplace({
    modo,
    articuloId,
    intencionInicial = null,
    onColapsar,
}: ComposerMarketplaceProps) {
    const navigate = useNavigate();
    const navegar = useNavegarASeccion();
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
        mensajeBoton,
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

    // ─── Categorías (selector obligatorio) ───────────────────────────
    const { data: categorias = [] } = useCategoriasMarketplace();

    // Cambio de modo (Vendo/Busco) — cierra el acordeón de detalles al cambiar.
    const cambiarModo = (m: ModoArticulo) => {
        actualizar({ modo: m });
        setSeccionAbierta(null);
    };

    // Preselección de intención (Vendo/Busco) al abrir en creación desde el FAB
    // según el tab activo del feed. Se aplica una sola vez por montaje; en
    // edición no aplica (el modo se hidrata del artículo).
    const intencionAplicadaRef = useRef(false);
    useEffect(() => {
        if (esEdicion || !intencionInicial || intencionAplicadaRef.current) return;
        intencionAplicadaRef.current = true;
        actualizar({ modo: intencionInicial });
    }, [esEdicion, intencionInicial, actualizar]);

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
                                    : draft.modo === 'busco'
                                        ? 'Buscar un artículo'
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
                    {/* Toggle Vendo / Busco — en el header SOLO en desktop; en
                        móvil va arriba del body (abajo) para no apretar el título. */}
                    {!esEdicion && (
                        <div className="hidden lg:block shrink-0">
                            <ToggleVendoBusco modo={draft.modo} onCambio={cambiarModo} />
                        </div>
                    )}
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
                        {/* Toggle Vendo / Busco — SOLO móvil (en desktop vive en
                            el header). Evita apretar el título en pantallas chicas. */}
                        {!esEdicion && (
                            <div className="lg:hidden mb-3">
                                <ToggleVendoBusco modo={draft.modo} onCambio={cambiarModo} />
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
                                    error={errores.fotos}
                                    obligatorias={draft.modo === 'vendo'}
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
                                    placeholder={
                                        draft.modo === 'busco'
                                            ? 'Ej: Busco cama matrimonial en buen estado'
                                            : 'Ej: Bicicleta de montaña rodada 26'
                                    }
                                    onCambio={(v) =>
                                        actualizar({ titulo: v.slice(0, 80) })
                                    }
                                    error={errores.titulo}
                                />

                                {/* Categoría (obligatoria, ambos modos) */}
                                <CampoCategoria
                                    categorias={categorias}
                                    valor={draft.categoriaId}
                                    onCambio={(id) =>
                                        actualizar({ categoriaId: id })
                                    }
                                    error={errores.categoria}
                                />

                                {/* Precio (vendo) o Presupuesto + urgente (busco) */}
                                {draft.modo === 'vendo' ? (
                                    <CampoPrecio
                                        valor={draft.precio}
                                        onCambio={(v) =>
                                            actualizar({
                                                precio: v.replace(/[^\d]/g, ''),
                                            })
                                        }
                                        error={errores.precio}
                                    />
                                ) : (
                                    <CampoPresupuesto
                                        min={draft.presupuestoMin}
                                        max={draft.presupuestoMax}
                                        urgente={draft.urgente}
                                        onCambioMin={(v) =>
                                            actualizar({
                                                presupuestoMin: v.replace(/[^\d]/g, ''),
                                            })
                                        }
                                        onCambioMax={(v) =>
                                            actualizar({
                                                presupuestoMax: v.replace(/[^\d]/g, ''),
                                            })
                                        }
                                        onCambioUrgente={(v) =>
                                            actualizar({ urgente: v })
                                        }
                                        error={errores.presupuesto}
                                    />
                                )}

                                {/* Descripción */}
                                <CampoDescripcion
                                    valor={draft.descripcion}
                                    placeholder={
                                        draft.modo === 'busco'
                                            ? 'Cuenta qué buscas: características, para qué lo necesitas, condición aceptable…'
                                            : 'Cuenta los detalles del artículo: marca, antigüedad, motivo de venta…'
                                    }
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
                                    modo={draft.modo}
                                    onIrServicios={() => {
                                        onColapsar();
                                        navegar('/servicios?crear=ofrezco');
                                    }}
                                    onCambiarABusco={() => {
                                        actualizar({ modo: 'busco' });
                                        setSeccionAbierta(null);
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
                        <div className="mt-4 pt-3 border-t-2 border-slate-200">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4">
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
                                        modo={draft.modo}
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
                                        // Clickeable aunque falte algo: al pulsar,
                                        // `publicar()` abre el campo faltante y
                                        // mostramos qué falta abajo. Solo se
                                        // bloquea mientras se está enviando.
                                        onClick={() => publicar(false)}
                                        disabled={enviando}
                                        className={
                                            'inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-bold text-[15px] lg:cursor-pointer ' +
                                            (valido && !enviando
                                                ? 'bg-linear-to-b from-teal-500 to-teal-700 text-white shadow-sm hover:brightness-110'
                                                : 'bg-slate-200 text-slate-500')
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
                            {/* Feedback de qué falta cuando el botón está "apagado". */}
                            {!valido && !enviando && mensajeBoton && (
                                <p
                                    data-testid="composer-mp-falta"
                                    className="mt-2 text-[13px] font-semibold text-amber-700 lg:text-right"
                                >
                                    Falta: {mensajeBoton}
                                </p>
                            )}
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

function ToggleVendoBusco({
    modo,
    onCambio,
}: {
    modo: ModoArticulo;
    onCambio: (m: ModoArticulo) => void;
}) {
    return (
        <div className="inline-flex items-center gap-1.5">
            {(
                [
                    { id: 'vendo' as const, label: 'Vendo', Icono: Tag },
                    { id: 'busco' as const, label: 'Busco', Icono: Search },
                ] as const
            ).map(({ id, label, Icono }) => {
                const activo = modo === id;
                const esBusco = id === 'busco';
                return (
                    <button
                        key={id}
                        type="button"
                        data-testid={`composer-mp-modo-${id}`}
                        onClick={() => onCambio(id)}
                        className={
                            'inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                            (activo
                                ? esBusco
                                    ? 'bg-amber-50 border-2 border-amber-400 text-amber-800'
                                    : 'bg-teal-50 border-2 border-teal-400 text-teal-800'
                                : 'border-2 border-transparent text-slate-500 hover:text-slate-800')
                        }
                    >
                        <Icono
                            className={
                                'w-4 h-4 ' +
                                (activo
                                    ? esBusco
                                        ? 'text-amber-600'
                                        : 'text-teal-600'
                                    : 'text-slate-400')
                            }
                            strokeWidth={2.25}
                        />
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function CampoCategoria({
    categorias,
    valor,
    onCambio,
    error,
}: {
    categorias: CategoriaMarketplace[];
    valor: number | null;
    onCambio: (id: number) => void;
    error?: string;
}) {
    return (
        <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Categoría
            </label>
            <CustomSelect<string>
                testId="composer-mp-categoria"
                placeholder="Elige una categoría…"
                value={valor !== null ? String(valor) : null}
                options={categorias.map((c) => ({
                    value: String(c.id),
                    label: c.nombre,
                }))}
                onChange={(v) => onCambio(Number(v))}
                claseControl="px-3 py-2"
            />
            {error && (
                <p className="mt-1 text-[13px] text-red-600 font-semibold">
                    {error}
                </p>
            )}
        </div>
    );
}

function CampoTitulo({
    valor,
    autoFocus,
    placeholder,
    onCambio,
    error,
}: {
    valor: string;
    autoFocus: boolean;
    placeholder?: string;
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
                placeholder={placeholder ?? 'Ej: Bicicleta de montaña rodada 26'}
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

function CampoPresupuesto({
    min,
    max,
    urgente,
    onCambioMin,
    onCambioMax,
    onCambioUrgente,
    error,
}: {
    min: string;
    max: string;
    urgente: boolean;
    onCambioMin: (v: string) => void;
    onCambioMax: (v: string) => void;
    onCambioUrgente: (v: boolean) => void;
    error?: string;
}) {
    return (
        <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Presupuesto (MXN) · opcional
            </label>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
                        $
                    </span>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        data-testid="composer-mp-presupuesto-min"
                        value={min}
                        onChange={(e) => onCambioMin(e.target.value)}
                        placeholder="Mín"
                        className="w-full rounded-xl border-2 border-slate-300 bg-white pl-8 pr-3 py-2 text-[16px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-teal-500 tabular-nums"
                    />
                </div>
                <span aria-hidden className="text-slate-400 font-bold">
                    –
                </span>
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
                        $
                    </span>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        data-testid="composer-mp-presupuesto-max"
                        value={max}
                        onChange={(e) => onCambioMax(e.target.value)}
                        placeholder="Máx"
                        className="w-full rounded-xl border-2 border-slate-300 bg-white pl-8 pr-3 py-2 text-[16px] text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold outline-none focus:border-teal-500 tabular-nums"
                    />
                </div>
            </div>
            <label className="mt-2 inline-flex items-center gap-2 lg:cursor-pointer">
                <input
                    type="checkbox"
                    data-testid="composer-mp-urgente"
                    checked={urgente}
                    onChange={(e) => onCambioUrgente(e.target.checked)}
                    className="sr-only"
                />
                <span
                    aria-hidden
                    className={
                        'w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ' +
                        (urgente
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300')
                    }
                >
                    {urgente && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="text-[14px] font-medium text-slate-700">
                    Marcar como urgente
                </span>
            </label>
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
    placeholder,
    onCambio,
    error,
}: {
    valor: string;
    placeholder?: string;
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
                placeholder={
                    placeholder ??
                    'Cuenta los detalles del artículo: marca, antigüedad, motivo de venta…'
                }
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
    // En modo 'busco' solo aplica la Zona (dónde buscas). Condición, Ofertas
    // y Unidad son propios de una venta.
    const iconosVenta: IconoConfig[] =
        draft.modo === 'busco'
            ? []
            : [
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
              ];
    const iconos: IconoConfig[] = [
        ...iconosVenta,
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
    previews,
    onEliminar,
    onAbrirGaleria,
    onAbrirCamara,
    subiendo,
    error,
    obligatorias,
}: {
    fotos: string[];
    /** Fotos en curso de subida — se renderizan al final del carrusel
     *  con overlay de spinner y sin botón X (no eliminables). */
    previews: FotoPreviewLocalMP[];
    onEliminar: (idx: number) => void;
    onAbrirGaleria: () => void;
    onAbrirCamara: () => void;
    subiendo: boolean;
    error?: string;
    /** En modo 'busco' las fotos son opcionales; en 'vendo' obligatorias. */
    obligatorias: boolean;
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

    // Sprint 9.3 (UI optimista): el carrusel renderiza `fotos` (URLs R2
    // confirmadas) seguidas de `previews` (blob: URLs en curso de subida).
    const items: Array<{ url: string; subiendo: boolean }> = [
        ...fotos.map((url) => ({ url, subiendo: false })),
        ...previews.map((p) => ({ url: p.url, subiendo: true })),
    ];
    const totalItems = items.length;
    const lleno = totalItems >= MAX_FOTOS_COMPOSER_MP;
    const abrirMenu = () => {
        if (lleno) return;
        if (esEscritorio) {
            onAbrirGaleria();
            return;
        }
        setMenuAbierto((o) => !o);
    };

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
                    <span
                        className={
                            'inline-flex items-center h-6 px-2 rounded-full text-[12px] font-semibold ' +
                            (obligatorias
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-500')
                        }
                    >
                        {obligatorias ? 'obligatoria' : 'opcional'}
                    </span>
                </div>
                <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
                    {totalItems}/{MAX_FOTOS_COMPOSER_MP}
                </span>
            </div>

            <div className="group relative aspect-[3/1] lg:aspect-square w-full rounded-xl overflow-hidden">
                {totalItems === 0 ? (
                    <button
                        type="button"
                        data-testid="composer-mp-zona-fotos-vacia"
                        onClick={abrirMenu}
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

                        {indiceActual === 0 && !actualEsSubiendo && (
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
                                aria-label="Agregar otra foto"
                                title="Agregar otra foto"
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-black/80 lg:cursor-pointer transition-opacity"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Botón "X" eliminar foto actual — NO se muestra
                            sobre previews (no son eliminables hasta que
                            terminen su upload). */}
                        {!actualEsSubiendo && (
                            <button
                                type="button"
                                aria-label="Eliminar foto"
                                data-testid={`composer-mp-foto-eliminar-${indiceActual}`}
                                onClick={() => onEliminar(indiceActual)}
                                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center hover:bg-red-500/90 lg:cursor-pointer"
                            >
                                <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        )}

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
                                    disabled={indiceActual === totalItems - 1}
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

            {/* Lightbox — solo expone fotos confirmadas (URLs R2
                persistentes). Las previews en curso no son expandibles. */}
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
    modo,
}: {
    aceptado: boolean;
    onCambio: (v: boolean) => void;
    error?: string;
    omitirEnEdicion: boolean;
    modo: ModoArticulo;
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
            {verDetalles &&
                (modo === 'busco' ? (
                    <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                        <li>
                            Mi búsqueda es <strong>lícita</strong>: no pido nada
                            ilegal, robado ni restringido.
                        </li>
                        <li>
                            Es una <strong>búsqueda real</strong>.
                        </li>
                        <li>
                            Coordinaré la compra en un{' '}
                            <strong>lugar seguro</strong>.
                        </li>
                    </ul>
                ) : (
                    <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                        <li>
                            El artículo es <strong>lícito</strong>: no infringe
                            leyes, ni es producto robado, ilegal o restringido.
                        </li>
                        <li>
                            Lo tengo <strong>en mi poder</strong> y disponible
                            para entregar.
                        </li>
                        <li>
                            La información es <strong>honesta</strong>: fotos,
                            precio y descripción reflejan la realidad.
                        </li>
                        <li>
                            Acepto coordinar entregas <strong>seguras</strong> en
                            lugares públicos.
                        </li>
                    </ul>
                ))}
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
    // El backend devuelve el precio como numeric ("25.00"). Redondeamos el valor
    // decimal — NO usar parseEnteroPositivo, que elimina el punto y convertiría
    // "25.00" en 2500.
    const precioNum =
        a.precio !== null && a.precio !== '' ? Math.round(Number(a.precio)) : null;
    return {
        modo: a.modo,
        categoriaId: a.categoriaId,
        titulo: a.titulo,
        descripcion: a.descripcion,
        precio: precioNum !== null ? String(precioNum) : '',
        presupuestoMin: a.presupuesto ? String(a.presupuesto.min) : '',
        presupuestoMax: a.presupuesto ? String(a.presupuesto.max) : '',
        urgente: a.urgente,
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
