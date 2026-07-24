/**
 * ComposerMarketplace.tsx
 * ===========================================
 * Composer de MarketPlace — estilo Instagram/Facebook, calcado de
 * `ComposerPublicacionNegocio.tsx`: header X/título/Publicar, identidad
 * grande, textarea sin bordes, fotos con hover-zoom + `ModalImagenes` +
 * Trash2, y un solo chip bar anclado abajo con revelado progresivo (en vez
 * del formulario con labels/errores permanentes y grid de 2 columnas que
 * tenía antes). Se renderiza dentro de `ComposerSection.tsx`, que en móvil
 * lo monta fullscreen (sin modal) y en desktop en un `ModalAdaptativo` de
 * tamaño fijo.
 *
 *   - SIN toggle Ofrezco/Solicito — todo es "vender/buscar un artículo"
 *     (toggle Vendo/Busco propio).
 *   - Categoría obligatoria, Precio (vendo) o Presupuesto (busco), fotos
 *     obligatorias en vendo (mínimo 1), Condición/Ofertas/Unidad solo en
 *     vendo, Zona en ambos modos.
 *   - 4 confirmaciones legales compactadas en 1 checkbox de footer.
 *   - Tonos teal (identidad de MarketPlace) — NO se copia el azul de
 *     Negocios, solo la estructura/interacción.
 *
 * Validación: sin texto rojo permanente bajo cada campo — al intentar
 * publicar con datos inválidos, toast (`notificar.error`) + se abre el
 * panel del campo faltante si aplica (mismo criterio que Negocios).
 *
 * Cierre con cambios sin guardar: modal "¿Quieres terminar la publicación
 * más tarde?" (Guardar borrador / Descartar / Seguir editando), igual que
 * Negocios — usa `estaIntacto` de `useComposerMarketplace`.
 *
 * Moderación en 2 niveles (sin cambios): hint inline + modal
 * `ModalSugerenciaModeracion` post-publish.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerMarketplace.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavegarASeccion } from '@/hooks/useNavegarASeccion';
import {
    Camera,
    Check,
    ChevronDown,
    Copy,
    DollarSign,
    Image as ImageIcon,
    Loader2,
    MapPin,
    MoreHorizontal,
    Package,
    Search,
    Tag,
    Tags,
    Trash2,
    X,
} from 'lucide-react';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { CustomSelect } from '../../ui/CustomSelect';
import { ModalSugerenciaModeracion } from '../ModalSugerenciaModeracion';
import {
    useComposerMarketplace,
    TITULO_MIN,
    TITULO_MAX,
    type ComposerMarketplaceDraft,
    type ErroresComposerMP,
} from '../../../hooks/useComposerMarketplace';
import {
    useFotosUploaderMarketplace,
    MAX_FOTOS_COMPOSER_MP,
} from '../../../hooks/useFotosUploaderMarketplace';
import {
    useArticuloMarketplace,
    useCrearArticulo,
    useActualizarArticulo,
    useCategoriasMarketplace,
    useEliminarFotoMarketplaceHuerfana,
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

/** Identificador del panel actualmente abierto. `null` = ninguno. */
type SeccionAbierta =
    | 'categoria'
    | 'precio'
    | 'condicion'
    | 'ofertas'
    | 'unidad'
    | 'zona'
    | null;

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
    /** Registra el handler de "intentar cerrar" en el padre (back nativo /
     *  click-fuera). Devuelve `true` si de verdad se cerró, `false` si se
     *  quedó abierto (mostró el modal de confirmación). */
    registrarIntentarCerrar?: (fn: () => boolean) => void;
    /** El padre lo llama para re-armar su guard del back nativo cuando el
     *  modal de confirmación se cierra sin salir. */
    onReforzarGuardia?: () => void;
}

export function ComposerMarketplace({
    modo,
    articuloId,
    intencionInicial = null,
    onColapsar,
    registrarIntentarCerrar,
    onReforzarGuardia,
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
        estaIntacto,
        sembrarUbicacion,
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
            sembrarUbicacion({ latitud: lat, longitud: lng, ciudad: ciudadGps });
        }
    }, [draft.latitud, draft.longitud, lat, lng, ciudadGps, sembrarUbicacion]);

    // ─── Hidratación una sola vez en edición ─────────────────────────
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (!esEdicion) return;
        if (!articulo || hidratadoRef.current) return;
        hidratadoRef.current = true;
        hidratarDesdeArticulo(articuloAlDraft(articulo));
    }, [esEdicion, articulo, hidratarDesdeArticulo]);

    // ─── Panel único abierto (revelado progresivo, siempre inline) ──
    const [seccionAbierta, setSeccionAbierta] = useState<SeccionAbierta>(null);
    function alternar(s: SeccionAbierta) {
        setSeccionAbierta((prev) => (prev === s ? null : s));
    }

    // Al abrir un panel, el card queda al fondo del contenido scrollable
    // (después del título/descripción/fotos) — sin esto, con varias fotos
    // ya publicadas el usuario tiene que scrollear a mano para verlo.
    const scrollContenidoRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!seccionAbierta) return;
        const el = scrollContenidoRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [seccionAbierta]);

    // ─── Ver foto completa (ModalImagenes) ──
    const [indiceImagenAbierta, setIndiceImagenAbierta] = useState<number | null>(null);

    // ─── Uploader de fotos ───────────────────────────────────────────
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set(draft.fotos));
    const fotosUploader = useFotosUploaderMarketplace({
        fotos: draft.fotos,
        onCambioFotos: (fotos) => actualizar({ fotos }),
        urlsSubidasEnSesion,
    });

    /** Limpia de R2 las fotos subidas en ESTA sesión que nunca se
     *  publicaron (evita huérfanas), y las quita de `draft.fotos`. */
    const eliminarFotoHuerfanaMutation = useEliminarFotoMarketplaceHuerfana();
    function limpiarFotosHuerfanasDeSesion() {
        const urlsHuerfanas = Array.from(urlsSubidasEnSesion.current);
        if (urlsHuerfanas.length === 0) return;
        urlsHuerfanas.forEach((url) => eliminarFotoHuerfanaMutation.mutate(url));
        urlsSubidasEnSesion.current.clear();
        actualizar((d) => ({
            fotos: d.fotos.filter((f) => !urlsHuerfanas.includes(f)),
        }));
    }

    /** Cierre directo (sin pasar por el modal de confirmación) — usado
     *  desde el hint de moderación, que ya es una decisión explícita de
     *  irse a otra sección. */
    function cerrarSinConfirmar() {
        limpiarFotosHuerfanasDeSesion();
        onColapsar();
    }

    // ─── Confirmación al cerrar con cambios sin guardar ────────────────
    const [confirmarSalirAbierto, setConfirmarSalirAbierto] = useState(false);

    const handleIntentarCerrar = useCallback((): boolean => {
        if (estaIntacto) {
            onColapsar();
            return true;
        }
        setConfirmarSalirAbierto(true);
        return false;
    }, [estaIntacto, onColapsar]);

    useEffect(() => {
        registrarIntentarCerrar?.(handleIntentarCerrar);
    }, [registrarIntentarCerrar, handleIntentarCerrar]);

    function handleGuardarBorrador() {
        setConfirmarSalirAbierto(false);
        onColapsar();
    }
    function handleDescartarPublicacion() {
        setConfirmarSalirAbierto(false);
        limpiarFotosHuerfanasDeSesion();
        limpiar();
        onColapsar();
    }
    function handleSeguirEditando() {
        setConfirmarSalirAbierto(false);
        onReforzarGuardia?.();
    }

    // ─── Moderación post-publish (sugerencia suave) ──────────────────
    const [sugerencia, setSugerencia] = useState<{
        categoria: 'servicio' | 'busqueda';
        mensaje: string;
    } | null>(null);

    // ─── Categorías (selector obligatorio) ───────────────────────────
    const { data: categorias = [] } = useCategoriasMarketplace();

    // Cambio de modo (Vendo/Busco) — cierra el panel de detalles al cambiar.
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
            // Toast + abre el panel del primer campo faltante (si aplica).
            if (!enviando && mensajeBoton) {
                notificar.error(mensajeBoton);
                const seccionConError = primerSeccionConError(errores);
                if (seccionConError) setSeccionAbierta(seccionConError);
            }
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
        <div data-testid="composer-mp-expandido" className="flex flex-1 min-h-0 flex-col bg-white">
            {/* ── Header: X | título centrado | Publicar — acento teal de
                marca (MarketPlace). ── */}
            <div
                className="shrink-0 flex items-center justify-between px-3 py-3 lg:px-4"
                style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)' }}
            >
                <button
                    type="button"
                    aria-label="Cerrar"
                    data-testid="composer-mp-cerrar"
                    onClick={handleIntentarCerrar}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white lg:cursor-pointer lg:hover:bg-white/15"
                >
                    <X className="h-6 w-6" strokeWidth={2.5} />
                </button>
                <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-[17px] font-extrabold text-white tracking-tight">
                        {esEdicion ? (
                            'Editar publicación'
                        ) : (
                            <>
                                {/* Móvil: título corto (el ícono ya distingue el modo).
                                    Desktop: título completo. */}
                                <span className="lg:hidden">
                                    {draft.modo === 'busco' ? 'Buscar' : 'Vender'}
                                </span>
                                <span className="hidden lg:inline">
                                    {draft.modo === 'busco' ? 'Buscar un artículo' : 'Vender un artículo'}
                                </span>
                            </>
                        )}
                    </h2>
                    {!esEdicion && (
                        <ToggleVendoBuscoIconos modo={draft.modo} onCambio={cambiarModo} />
                    )}
                </div>
                <button
                    type="submit"
                    form="form-composer-mp"
                    disabled={enviando}
                    data-testid="composer-mp-btn-publicar"
                    className={`rounded-full px-4 py-1.5 text-[15px] font-bold disabled:cursor-not-allowed lg:cursor-pointer ${
                        valido && !enviando
                            ? 'bg-white text-teal-700 shadow-sm lg:hover:bg-teal-50'
                            : 'bg-white/20 text-white/60'
                    }`}
                >
                    {enviando
                        ? esEdicion ? 'Guardando…' : 'Publicando…'
                        : esEdicion ? 'Guardar' : 'Publicar'}
                </button>
            </div>

            {/* ── Identidad: avatar + nombre + ciudad. ── */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
                {avatarUsuario ? (
                    <img
                        src={avatarUsuario}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div
                        aria-hidden
                        className="h-16 w-16 rounded-full bg-teal-600 grid place-items-center text-white font-bold text-xl shrink-0"
                    >
                        {(nombreUsuario[0] ?? 'A').toUpperCase()}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    {nombreUsuario && (
                        <span className="block text-[22px] font-extrabold text-slate-900 leading-tight truncate">
                            {nombreUsuario}
                        </span>
                    )}
                    {ciudadGps && (
                        <span className="block text-sm font-semibold text-slate-500 truncate">
                            {ciudadGps}
                        </span>
                    )}
                </div>
            </div>

            {cargandoEdicion ? (
                <div className="flex flex-1 items-center justify-center py-16">
                    <Spinner tamanio="lg" />
                </div>
            ) : (
                <form
                    id="form-composer-mp"
                    onSubmit={(e) => {
                        e.preventDefault();
                        publicar(false);
                    }}
                    className="flex flex-1 min-h-0 flex-col"
                >
                    {/* Zona scrollable: título, descripción, fotos, panel abierto.
                        `scroll-discreto` = misma canaleta+barra de scroll que
                        el carrusel "Recién publicado" del feed en PC. */}
                    <div ref={scrollContenidoRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-3 scroll-discreto">
                        <input
                            type="text"
                            data-testid="composer-mp-titulo"
                            value={draft.titulo}
                            onChange={(e) => actualizar({ titulo: e.target.value.slice(0, 80) })}
                            placeholder={
                                draft.modo === 'busco'
                                    ? 'Ej: Busco cama matrimonial en buen estado'
                                    : 'Ej: Bicicleta de montaña rodada 26'
                            }
                            className="w-full border-0 bg-transparent py-2 text-xl text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-bold outline-none"
                        />
                        {/* Hint del mínimo de caracteres — antes solo se
                            enteraba al chocar con el toast de error al
                            guardar. */}
                        <p
                            className={`text-xs font-semibold ${
                                errores.titulo ? 'text-red-600' : 'text-slate-400'
                            }`}
                        >
                            {draft.titulo.trim().length}/{TITULO_MAX} · mínimo {TITULO_MIN} caracteres
                        </p>

                        <textarea
                            data-testid="composer-mp-descripcion"
                            value={draft.descripcion}
                            onChange={(e) => actualizar({ descripcion: e.target.value.slice(0, 1000) })}
                            placeholder={
                                draft.modo === 'busco'
                                    ? 'Cuenta qué buscas: características, para qué lo necesitas, condición aceptable…'
                                    : 'Cuenta los detalles del artículo: marca, antigüedad, motivo de venta…'
                            }
                            rows={4}
                            className="w-full resize-none border-0 bg-transparent py-2 text-[15px] text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-medium outline-none"
                        />

                        <ComposerHintModeracion
                            texto={`${draft.titulo} ${draft.descripcion}`}
                            modo={draft.modo}
                            onIrServicios={() => {
                                cerrarSinConfirmar();
                                navegar('/servicios?crear=ofrezco');
                            }}
                            onCambiarABusco={() => {
                                actualizar({ modo: 'busco' });
                                setSeccionAbierta(null);
                            }}
                        />

                        {/* Fotos — grid 3 cols móvil / 5 cols desktop, hover-zoom
                            + click abre ModalImagenes + Trash2 en barra inferior
                            (mismo patrón que ComposerPublicacionNegocio). */}
                        {(draft.fotos.length > 0 || fotosUploader.previews.length > 0) && (
                            <div className="mt-3 grid grid-cols-3 lg:grid-cols-5 gap-2">
                                {draft.fotos.map((url, i) => (
                                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden group">
                                        {i === 0 && (
                                            <span
                                                aria-hidden
                                                className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-teal-600/90 text-white text-[11px] font-semibold shadow pointer-events-none"
                                            >
                                                Portada
                                            </span>
                                        )}
                                        <img
                                            src={url}
                                            alt=""
                                            onClick={() => setIndiceImagenAbierta(i)}
                                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110 lg:cursor-pointer"
                                        />
                                        <div
                                            className="absolute bottom-0 inset-x-0 flex items-center justify-end py-1.5 px-1.5"
                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); fotosUploader.eliminar(i); }}
                                                aria-label="Quitar foto"
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 lg:cursor-pointer active:scale-95 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {fotosUploader.previews.map((p) => (
                                    <div key={p.tempId} className="relative aspect-square rounded-xl overflow-hidden">
                                        <img src={p.url} alt="" className="h-full w-full object-cover opacity-60" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input {...fotosUploader.inputGaleriaProps} />
                        <input {...fotosUploader.inputCamaraProps} />

                        {/* Panel expandido inline (revelado progresivo) */}
                        {seccionAbierta === 'categoria' && (
                            <div className="mt-3">
                                <PanelCategoria
                                    categorias={categorias}
                                    valor={draft.categoriaId}
                                    onCambio={(id) => actualizar({ categoriaId: id })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'precio' && (
                            <div className="mt-3">
                                {draft.modo === 'vendo' ? (
                                    <PanelPrecio
                                        valor={draft.precio}
                                        onCambio={(v) => actualizar({ precio: v.replace(/[^\d]/g, '') })}
                                    />
                                ) : (
                                    <PanelPresupuesto
                                        min={draft.presupuestoMin}
                                        max={draft.presupuestoMax}
                                        urgente={draft.urgente}
                                        onCambioMin={(v) => actualizar({ presupuestoMin: v.replace(/[^\d]/g, '') })}
                                        onCambioMax={(v) => actualizar({ presupuestoMax: v.replace(/[^\d]/g, '') })}
                                        onCambioUrgente={(v) => actualizar({ urgente: v })}
                                    />
                                )}
                            </div>
                        )}
                        {seccionAbierta === 'condicion' && (
                            <div className="mt-3">
                                <PanelCondicion
                                    valor={draft.condicion}
                                    onCambio={(c) => actualizar({ condicion: c })}
                                    onQuitar={() => actualizar({ condicion: null })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'ofertas' && (
                            <div className="mt-3">
                                <PanelOfertas
                                    valor={draft.aceptaOfertas}
                                    onCambio={(v) => actualizar({ aceptaOfertas: v })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'unidad' && (
                            <div className="mt-3">
                                <PanelUnidad
                                    valor={draft.unidadVenta}
                                    onCambio={(v) => actualizar({ unidadVenta: v.slice(0, 30) })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'zona' && (
                            <div className="mt-3">
                                <PanelZona
                                    valor={draft.zonaAproximada}
                                    onCambio={(v) => actualizar({ zonaAproximada: v.slice(0, 150) })}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Chip bar anclada: Galería + Categoría + Precio/Presupuesto
                        + (Condición/Ofertas/Unidad solo en vendo) + Zona. ── */}
                    <div className="shrink-0 px-4 py-3 border-t-2 border-slate-200">
                        <div className="flex items-center gap-2 lg:gap-1.5 overflow-x-auto lg:flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <button
                                type="button"
                                data-testid="composer-mp-chip-galeria"
                                onClick={fotosUploader.abrirGaleria}
                                className="flex shrink-0 items-center gap-2 lg:gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 lg:px-3 lg:py-1.5 text-sm lg:text-[13px] font-semibold text-slate-700 lg:cursor-pointer lg:hover:bg-slate-100"
                            >
                                {draft.fotos.length === 0 ? (
                                    <Camera className="h-4 w-4" strokeWidth={2} />
                                ) : (
                                    <ImageIcon className="h-4 w-4" strokeWidth={2} />
                                )}
                                Galería
                                {draft.fotos.length > 0 && (
                                    <span className="tabular-nums text-slate-500">
                                        ({draft.fotos.length}/{MAX_FOTOS_COMPOSER_MP})
                                    </span>
                                )}
                            </button>

                            <ChipDetalle
                                id="categoria"
                                Icono={Tag}
                                label="Categoría"
                                activo={draft.categoriaId !== null}
                                abierto={seccionAbierta === 'categoria'}
                                onClick={() => alternar('categoria')}
                            />
                            <ChipDetalle
                                id="precio"
                                Icono={DollarSign}
                                label={draft.modo === 'vendo' ? 'Precio' : 'Presupuesto'}
                                activo={
                                    draft.modo === 'vendo'
                                        ? draft.precio.trim() !== ''
                                        : draft.presupuestoMin.trim() !== '' || draft.presupuestoMax.trim() !== ''
                                }
                                abierto={seccionAbierta === 'precio'}
                                onClick={() => alternar('precio')}
                            />
                            {draft.modo === 'vendo' && (
                                <>
                                    <ChipDetalle
                                        id="condicion"
                                        Icono={Tags}
                                        label="Condición"
                                        activo={draft.condicion !== null}
                                        abierto={seccionAbierta === 'condicion'}
                                        onClick={() => alternar('condicion')}
                                    />
                                    <ChipDetalle
                                        id="ofertas"
                                        Icono={MoreHorizontal}
                                        label="Ofertas"
                                        activo={draft.aceptaOfertas !== null}
                                        abierto={seccionAbierta === 'ofertas'}
                                        onClick={() => alternar('ofertas')}
                                    />
                                    <ChipDetalle
                                        id="unidad"
                                        Icono={Package}
                                        label="Unidad"
                                        activo={draft.unidadVenta.trim().length > 0}
                                        abierto={seccionAbierta === 'unidad'}
                                        onClick={() => alternar('unidad')}
                                    />
                                </>
                            )}
                            <ChipDetalle
                                id="zona"
                                Icono={MapPin}
                                label="Zona"
                                activo={draft.zonaAproximada.trim().length > 0}
                                abierto={seccionAbierta === 'zona'}
                                onClick={() => alternar('zona')}
                            />
                        </div>
                    </div>

                    {/* ── Reglas legales (footer) ── */}
                    <div className="shrink-0 px-4 py-3 border-t-2 border-slate-200">
                        <CheckboxLegal
                            aceptado={
                                draft.confirmaciones.licito &&
                                draft.confirmaciones.enPoder &&
                                draft.confirmaciones.honesto &&
                                draft.confirmaciones.seguro
                            }
                            onCambio={setConfirmacionesUnificadas}
                            omitirEnEdicion={esEdicion}
                            modo={draft.modo}
                        />
                    </div>
                </form>
            )}

            {/* ── Ver foto completa ── */}
            <ModalImagenes
                images={draft.fotos}
                initialIndex={indiceImagenAbierta ?? 0}
                isOpen={indiceImagenAbierta !== null}
                onClose={() => setIndiceImagenAbierta(null)}
            />

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

            {/* ── Confirmación al cerrar con cambios sin guardar ── */}
            <ModalAdaptativo
                abierto={confirmarSalirAbierto}
                onCerrar={handleSeguirEditando}
                mostrarHeader={false}
                ancho="sm"
                alturaMaxima="sm"
                paddingContenido="none"
                zIndice="z-90"
            >
                <div className="py-2">
                    <p className="px-4 pb-3 pt-4 text-[16px] font-bold text-slate-900">
                        ¿Quieres terminar la publicación más tarde?
                    </p>
                    <button
                        type="button"
                        data-testid="composer-mp-guardar-borrador"
                        onClick={handleGuardarBorrador}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left lg:cursor-pointer lg:hover:bg-slate-100"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                            <Copy className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900">Guardar como borrador</span>
                    </button>
                    <button
                        type="button"
                        data-testid="composer-mp-descartar"
                        onClick={handleDescartarPublicacion}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left lg:cursor-pointer lg:hover:bg-slate-100"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                            <Trash2 className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900">Descartar publicación</span>
                    </button>
                    <button
                        type="button"
                        data-testid="composer-mp-seguir-editando"
                        onClick={handleSeguirEditando}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left lg:cursor-pointer lg:hover:bg-slate-100"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                            <Check className="h-5 w-5" strokeWidth={2.5} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900">Seguir editando</span>
                    </button>
                </div>
            </ModalAdaptativo>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

/** Toggle Vendo/Busco solo-ícono, para vivir junto al título en el header
 *  oscuro (gradiente teal) sin competir por espacio con el nombre/ciudad. */
function ToggleVendoBuscoIconos({
    modo,
    onCambio,
}: {
    modo: ModoArticulo;
    onCambio: (m: ModoArticulo) => void;
}) {
    return (
        <div className="inline-flex items-center gap-1 shrink-0">
            {(
                [
                    { id: 'vendo' as const, label: 'Vendo', Icono: Tag },
                    { id: 'busco' as const, label: 'Busco', Icono: Search },
                ] as const
            ).map(({ id, label, Icono }) => {
                const activo = modo === id;
                return (
                    <button
                        key={id}
                        type="button"
                        aria-label={label}
                        aria-pressed={activo}
                        data-testid={`composer-mp-modo-${id}`}
                        onClick={() => onCambio(id)}
                        className={
                            'flex h-9 w-9 items-center justify-center rounded-full lg:cursor-pointer ' +
                            (activo
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'bg-white/15 text-white/70 hover:bg-white/25 hover:text-white')
                        }
                    >
                        <Icono className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                );
            })}
        </div>
    );
}

interface ChipDetalleProps {
    id: string;
    Icono: typeof Tag;
    label: string;
    activo: boolean;
    abierto: boolean;
    onClick: () => void;
}

function ChipDetalle({ id, Icono, label, activo, abierto, onClick }: ChipDetalleProps) {
    return (
        <button
            type="button"
            data-testid={`composer-mp-chip-${id}`}
            onClick={onClick}
            aria-pressed={abierto}
            className={
                'relative flex shrink-0 items-center gap-2 lg:gap-1.5 rounded-full border-2 px-3.5 py-2 lg:px-3 lg:py-1.5 text-sm lg:text-[13px] font-semibold lg:cursor-pointer ' +
                (abierto
                    ? 'bg-teal-100 border-teal-500 text-teal-800'
                    : 'bg-white border-slate-300 text-slate-700 lg:hover:bg-slate-100')
            }
        >
            <Icono className="h-4 w-4" strokeWidth={2} />
            {label}
            {activo && (
                <span
                    aria-hidden
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
                />
            )}
        </button>
    );
}

// =============================================================================
// PANELES (revelado progresivo, siempre inline)
// =============================================================================

function PanelWrapper({
    titulo,
    children,
}: {
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div
            data-testid={`composer-mp-panel-${titulo.toLowerCase()}`}
            className="rounded-xl border-2 border-teal-300 bg-teal-50/40 p-3"
        >
            <div className="flex items-center gap-2 mb-2.5">
                <ChevronDown className="w-4 h-4 text-teal-700" strokeWidth={2.25} />
                <span className="text-[14px] font-bold text-teal-800">{titulo}</span>
            </div>
            {children}
        </div>
    );
}

function PanelCategoria({
    categorias,
    valor,
    onCambio,
}: {
    categorias: CategoriaMarketplace[];
    valor: number | null;
    onCambio: (id: number) => void;
}) {
    // Sin `onClear`: a diferencia de Servicios, Categoría es OBLIGATORIA
    // para publicar en MP (useComposerMarketplace valida "Elige una
    // categoría." si queda null) — no tiene sentido ofrecer vaciarla.
    return (
        <PanelWrapper titulo="Categoría">
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
                portal
            />
        </PanelWrapper>
    );
}

function PanelPrecio({
    valor,
    onCambio,
}: {
    valor: string;
    onCambio: (v: string) => void;
}) {
    return (
        <PanelWrapper titulo="Precio (MXN)">
            <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
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
                    className="w-full rounded-full border-2 border-teal-400 bg-white pl-8 pr-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 font-semibold outline-none tabular-nums"
                />
            </div>
        </PanelWrapper>
    );
}

function PanelPresupuesto({
    min,
    max,
    urgente,
    onCambioMin,
    onCambioMax,
    onCambioUrgente,
}: {
    min: string;
    max: string;
    urgente: boolean;
    onCambioMin: (v: string) => void;
    onCambioMax: (v: string) => void;
    onCambioUrgente: (v: boolean) => void;
}) {
    return (
        <PanelWrapper titulo="Presupuesto (MXN)">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
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
                        className="w-full rounded-full border-2 border-teal-400 bg-white pl-8 pr-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 font-semibold outline-none tabular-nums"
                    />
                </div>
                <span aria-hidden className="text-slate-400 font-bold">–</span>
                <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
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
                        className="w-full rounded-full border-2 border-teal-400 bg-white pl-8 pr-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 font-semibold outline-none tabular-nums"
                    />
                </div>
            </div>
            <label className="mt-2.5 inline-flex items-center gap-2 lg:cursor-pointer">
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
        </PanelWrapper>
    );
}

function PanelCondicion({
    valor,
    onCambio,
    onQuitar,
}: {
    valor: CondicionArticulo | null;
    onCambio: (c: CondicionArticulo) => void;
    /** Condición es 100% opcional (el propio panel ya lo dice) — un
     *  segundo click en la pastilla activa la regresa a `null` en vez de
     *  quedar pegada para siempre. */
    onQuitar: () => void;
}) {
    return (
        <PanelWrapper titulo="Condición">
            <div className="flex flex-wrap gap-1.5">
                {CONDICIONES.map((c) => {
                    const activa = valor === c.id;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            data-testid={`composer-mp-cond-${c.id}`}
                            onClick={() => (activa ? onQuitar() : onCambio(c.id))}
                            className={
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-teal-600 text-white border-2 border-teal-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-teal-500 hover:text-teal-700')
                            }
                        >
                            {activa && <Check className="w-4 h-4" strokeWidth={3} />}
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
    const opciones: { id: 'si' | 'no'; label: string; valor: boolean }[] = [
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
                            key={o.id}
                            type="button"
                            data-testid={`composer-mp-ofertas-${o.id}`}
                            onClick={() => onCambio(activa ? null : o.valor)}
                            className={
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-teal-600 text-white border-2 border-teal-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-teal-500 hover:text-teal-700')
                            }
                        >
                            {activa && <Check className="w-4 h-4" strokeWidth={3} />}
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
}: {
    valor: string;
    onCambio: (v: string) => void;
}) {
    const sugerencias = ['c/u', 'por kg', 'por docena', 'por litro', 'por metro'];
    return (
        <PanelWrapper titulo="Unidad de venta">
            <input
                type="text"
                data-testid="composer-mp-unidad"
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                placeholder="Ej: c/u, por kg, por docena…"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 font-semibold outline-none focus:border-teal-500"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
                {sugerencias.map((s) => {
                    const activa = valor.trim() === s;
                    return (
                        <button
                            key={s}
                            type="button"
                            data-testid={`composer-mp-unidad-sug-${s}`}
                            onClick={() => onCambio(activa ? '' : s)}
                            className={
                                'px-3 py-1 rounded-full text-[13px] font-semibold lg:cursor-pointer ' +
                                (activa
                                    ? 'bg-teal-600 text-white border-2 border-teal-700'
                                    : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700')
                            }
                        >
                            {s}
                        </button>
                    );
                })}
            </div>
            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                Opcional. Cuando existe, el card muestra "$15 c/u" en lugar de solo "$15".
            </p>
        </PanelWrapper>
    );
}

function PanelZona({
    valor,
    onCambio,
}: {
    valor: string;
    onCambio: (v: string) => void;
}) {
    return (
        <PanelWrapper titulo="Zona aproximada">
            <input
                type="text"
                data-testid="composer-mp-zona"
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                placeholder="Ej: Centro, Las Conchas, Cholla Bay…"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 font-semibold outline-none focus:border-teal-500"
            />
            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                Opcional. Ayuda al comprador a ubicar dónde recoger.
            </p>
        </PanelWrapper>
    );
}

function CheckboxLegal({
    aceptado,
    onCambio,
    omitirEnEdicion,
    modo,
}: {
    aceptado: boolean;
    onCambio: (v: boolean) => void;
    omitirEnEdicion: boolean;
    modo: ModoArticulo;
}) {
    const [verDetalles, setVerDetalles] = useState(false);
    if (omitirEnEdicion) {
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
                        className={'w-4 h-4 transition-transform ' + (verDetalles ? 'rotate-180' : '')}
                        strokeWidth={2.25}
                    />
                </button>
            </label>
            {verDetalles && (
                modo === 'busco' ? (
                    <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                        <li>Mi búsqueda es <strong>lícita</strong>: no pido nada ilegal, robado ni restringido.</li>
                        <li>Es una <strong>búsqueda real</strong>.</li>
                        <li>Coordinaré la compra en un <strong>lugar seguro</strong>.</li>
                    </ul>
                ) : (
                    <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                        <li>El artículo es <strong>lícito</strong>: no infringe leyes, ni es producto robado, ilegal o restringido.</li>
                        <li>Lo tengo <strong>en mi poder</strong> y disponible para entregar.</li>
                        <li>La información es <strong>honesta</strong>: fotos, precio y descripción reflejan la realidad.</li>
                        <li>Acepto coordinar entregas <strong>seguras</strong> en lugares públicos.</li>
                    </ul>
                )
            )}
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Mapeo error → panel a abrir. */
function primerSeccionConError(e: ErroresComposerMP): SeccionAbierta {
    if (e.categoria) return 'categoria';
    if (e.precio || e.presupuesto) return 'precio';
    if (e.condicion) return 'condicion';
    if (e.unidadVenta) return 'unidad';
    if (e.zonaAproximada) return 'zona';
    return null;
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
