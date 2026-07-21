/**
 * ComposerServicios.tsx
 * =========================================
 * Composer de Servicios — estilo Instagram/Facebook, calcado de
 * `ComposerPublicacionNegocio.tsx` y `ComposerMarketplace.tsx` (mismo
 * rediseño aplicado en las 3 secciones): header X/título/Publicar,
 * identidad grande, textarea sin bordes, fotos con hover-zoom +
 * `ModalImagenes` + Trash2, y un solo chip bar anclado abajo con revelado
 * progresivo — en vez del formulario con labels/errores permanentes y grid
 * de 2 columnas que tenía antes.
 *
 *   - Toggle Ofrezco/Solicito solo-ícono junto al título (se oculta en
 *     edición). Título corto en móvil ("Ofrecer"/"Solicitar"), completo
 *     en desktop.
 *   - Categoría, Modalidad, Tarifa/Presupuesto, Zonas opcionales; Urgente
 *     solo visible en modo Solicito.
 *   - 3 confirmaciones legales compactadas en 1 checkbox de footer.
 *   - Tonos sky/cyan (identidad de Servicios) — se copia la estructura de
 *     Negocios/MarketPlace, no su paleta.
 *
 * Validación: sin texto rojo permanente bajo cada campo — al intentar
 * publicar con datos inválidos, toast (`notificar.error`) + se abre el
 * panel del campo faltante si aplica.
 *
 * Cierre con cambios sin guardar: modal "¿Quieres terminar la publicación
 * más tarde?" (Guardar borrador / Descartar / Seguir editando) — usa
 * `estaIntacto` de `useComposerServicios`.
 *
 * Edición: el componente recibe `modo='editar'` y `publicacionId`, carga
 * la publicación y la hidrata al draft una sola vez. El toggle
 * Ofrezco/Solicito se oculta.
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerServicios.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavegarASeccion } from '@/hooks/useNavegarASeccion';
import {
    Camera,
    Check,
    ChevronDown,
    Copy,
    DollarSign,
    Hand,
    Image as ImageIcon,
    Loader2,
    MapPin,
    Search,
    Tags,
    Trash2,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { ModalImagenes } from '../../ui/ModalImagenes';
import {
    useComposerServicios,
    parseEntero,
    type ComposerServiciosDraft,
    type ErroresComposer,
} from '../../../hooks/useComposerServicios';
import {
    useFotosUploaderServicios,
    MAX_FOTOS_COMPOSER,
} from '../../../hooks/useFotosUploaderServicios';
import {
    useCrearPublicacionServicio,
    useEditarPublicacionServicio,
    usePublicacionServicio,
    useEliminarFotoServicioHuerfana,
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

/** Identificador del panel actualmente abierto. `null` = ninguno. */
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
    /** Registra el handler de "intentar cerrar" en el padre (back nativo /
     *  click-fuera). Devuelve `true` si de verdad se cerró, `false` si se
     *  quedó abierto (mostró el modal de confirmación). */
    registrarIntentarCerrar?: (fn: () => boolean) => void;
    /** El padre lo llama para re-armar su guard del back nativo cuando el
     *  modal de confirmación se cierra sin salir. */
    onReforzarGuardia?: () => void;
}

export function ComposerServicios({
    modo,
    publicacionId,
    modoInicial,
    onColapsar,
    registrarIntentarCerrar,
    onReforzarGuardia,
}: ComposerServiciosProps) {
    const navegar = useNavegarASeccion();
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
        sembrarUbicacion,
        limpiar,
        hidratarDesdePublicacion,
        errores,
        valido,
        mensajeBoton,
        estaIntacto,
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
            sembrarUbicacion({ latitud: lat, longitud: lng, ciudad: ciudadGps });
        }
    }, [draft.latitud, draft.longitud, lat, lng, ciudadGps, sembrarUbicacion]);

    // ─── Hidratación una sola vez en edición ─────────────────────────
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (!esEdicion) return;
        if (!publicacion || hidratadoRef.current) return;
        hidratadoRef.current = true;
        hidratarDesdePublicacion(publicacionAlDraft(publicacion));
    }, [esEdicion, publicacion, hidratarDesdePublicacion]);

    // ─── Panel único abierto (revelado progresivo, siempre inline) ──
    const [seccionAbierta, setSeccionAbierta] = useState<SeccionAbierta>(null);
    function alternar(s: SeccionAbierta) {
        setSeccionAbierta((prev) => (prev === s ? null : s));
    }

    // ─── Ver foto completa (ModalImagenes) ──
    const [indiceImagenAbierta, setIndiceImagenAbierta] = useState<number | null>(null);

    // ─── Uploader de fotos ───────────────────────────────────────────
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set(draft.fotos));
    const fotosUploader = useFotosUploaderServicios({
        fotos: draft.fotos,
        onCambioFotos: (fotos) => actualizar({ fotos }),
        urlsSubidasEnSesion,
    });

    /** Limpia de R2 las fotos subidas en ESTA sesión que nunca se
     *  publicaron (evita huérfanas), y las quita de `draft.fotos`. */
    const eliminarFotoHuerfanaMutation = useEliminarFotoServicioHuerfana();
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

    // Cambio de modo (Ofrezco/Solicito) — cierra el panel al cambiar.
    const cambiarModo = (m: ModoServicio) => {
        actualizar({ modo: m });
        setSeccionAbierta(null);
    };

    // ─── Mutations ───────────────────────────────────────────────────
    const crearMutation = useCrearPublicacionServicio();
    const editarMutation = useEditarPublicacionServicio();
    const enviando = crearMutation.isPending || editarMutation.isPending;

    async function publicar() {
        if (!valido || enviando) {
            if (!enviando && mensajeBoton) {
                notificar.error(mensajeBoton);
                const seccionConError = primerSeccionConError(errores);
                if (seccionConError) setSeccionAbierta(seccionConError);
            }
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
        <div data-testid="composer-expandido" className="flex flex-1 min-h-0 flex-col bg-white">
            {/* ── Header: X | título centrado + toggle | Publicar — acento
                sky/cyan de marca (Servicios). ── */}
            <div
                className="shrink-0 flex items-center justify-between px-3 py-3 lg:px-4"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' }}
            >
                <button
                    type="button"
                    aria-label="Cerrar"
                    data-testid="composer-cerrar"
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
                                    {draft.modo === 'solicito' ? 'Solicitar' : draft.modo === 'ofrezco' ? 'Ofrecer' : 'Nueva'}
                                </span>
                                <span className="hidden lg:inline">
                                    {draft.modo === 'solicito'
                                        ? 'Solicitar un servicio'
                                        : draft.modo === 'ofrezco'
                                            ? 'Ofrecer un servicio'
                                            : 'Nueva publicación'}
                                </span>
                            </>
                        )}
                    </h2>
                    {!esEdicion && (
                        <ToggleOfrezcoSolicitoIconos modo={draft.modo} onCambio={cambiarModo} />
                    )}
                </div>
                <button
                    type="submit"
                    form="form-composer-servicios"
                    disabled={enviando}
                    data-testid="composer-btn-publicar"
                    className={`rounded-full px-4 py-1.5 text-[15px] font-bold disabled:cursor-not-allowed lg:cursor-pointer ${
                        valido && !enviando
                            ? 'bg-white text-sky-700 shadow-sm lg:hover:bg-sky-50'
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
                        className="h-16 w-16 rounded-full bg-sky-600 grid place-items-center text-white font-bold text-xl shrink-0"
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
                    id="form-composer-servicios"
                    onSubmit={(e) => {
                        e.preventDefault();
                        publicar();
                    }}
                    className="flex flex-1 min-h-0 flex-col"
                >
                    {/* Zona scrollable: título, descripción, fotos, panel abierto.
                        `scroll-discreto` = misma canaleta+barra de scroll que
                        el carrusel "Recién publicado" del feed en PC. */}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-3 scroll-discreto">
                        <input
                            type="text"
                            data-testid="composer-titulo"
                            value={draft.titulo}
                            onChange={(e) => actualizar({ titulo: e.target.value.slice(0, 80) })}
                            placeholder={
                                draft.modo === 'solicito'
                                    ? 'Busco fotógrafo para boda…'
                                    : 'Plomero a domicilio en Centro…'
                            }
                            className="w-full border-0 bg-transparent py-2 text-xl text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-bold outline-none"
                        />

                        <textarea
                            data-testid="composer-descripcion"
                            value={draft.descripcion}
                            onChange={(e) => actualizar({ descripcion: e.target.value.slice(0, 500) })}
                            placeholder={
                                draft.modo === 'solicito'
                                    ? 'Describe qué necesitas, cuándo y cualquier dato útil.'
                                    : 'Cuenta qué ofreces, tu experiencia y cómo te coordinas.'
                            }
                            rows={4}
                            className="w-full resize-none border-0 bg-transparent py-2 text-[15px] text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-medium outline-none"
                        />

                        <ComposerHintModeracion
                            texto={`${draft.titulo} ${draft.descripcion}`}
                            onIrMarketplace={() => {
                                cerrarSinConfirmar();
                                navegar('/marketplace?crear=1');
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
                                                className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-sky-600/90 text-white text-[11px] font-semibold shadow pointer-events-none"
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
                                    valor={draft.categoria}
                                    onCambio={(c) => actualizar({ categoria: c })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'modalidad' && (
                            <div className="mt-3">
                                <PanelModalidad
                                    valor={draft.modalidad}
                                    onCambio={(m) => actualizar({ modalidad: m })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'tarifa' && (
                            <div className="mt-3">
                                <PanelTarifa
                                    modo={draft.modo}
                                    valorMin={draft.budgetMin}
                                    valorMax={draft.budgetMax}
                                    onCambioMin={(v) => actualizar({ budgetMin: v })}
                                    onCambioMax={(v) => actualizar({ budgetMax: v })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'zonas' && (
                            <div className="mt-3">
                                <PanelZonas
                                    modo={draft.modo}
                                    items={draft.zonasAproximadas}
                                    onCambio={(z) => actualizar({ zonasAproximadas: z })}
                                />
                            </div>
                        )}
                        {seccionAbierta === 'urgente' && draft.modo === 'solicito' && (
                            <div className="mt-3">
                                <PanelUrgente
                                    valor={draft.urgente}
                                    onCambio={(u) => actualizar({ urgente: u })}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Chip bar anclada: Galería + Categoría + Modalidad +
                        Tarifa/Presupuesto + Zonas + (Urgente solo en solicito).
                        Carrusel deslizable en móvil, wrap en desktop. ── */}
                    <div className="shrink-0 px-4 py-3 border-t-2 border-slate-200">
                        <div className="flex items-center gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <button
                                type="button"
                                data-testid="composer-chip-galeria"
                                onClick={fotosUploader.abrirGaleria}
                                className="flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 lg:cursor-pointer lg:hover:bg-slate-100"
                            >
                                {draft.fotos.length === 0 ? (
                                    <Camera className="h-4 w-4" strokeWidth={2} />
                                ) : (
                                    <ImageIcon className="h-4 w-4" strokeWidth={2} />
                                )}
                                Galería
                                {draft.fotos.length > 0 && (
                                    <span className="tabular-nums text-slate-500">
                                        ({draft.fotos.length}/{MAX_FOTOS_COMPOSER})
                                    </span>
                                )}
                            </button>

                            <ChipDetalle
                                id="categoria"
                                Icono={Tags}
                                label="Categoría"
                                activo={draft.categoria !== null}
                                abierto={seccionAbierta === 'categoria'}
                                onClick={() => alternar('categoria')}
                            />
                            <ChipDetalle
                                id="modalidad"
                                Icono={Wrench}
                                label="Modalidad"
                                activo={draft.modalidad !== null}
                                abierto={seccionAbierta === 'modalidad'}
                                onClick={() => alternar('modalidad')}
                            />
                            <ChipDetalle
                                id="tarifa"
                                Icono={DollarSign}
                                label={draft.modo === 'ofrezco' ? 'Tarifa' : 'Presupuesto'}
                                activo={parseEntero(draft.budgetMin) !== null || parseEntero(draft.budgetMax) !== null}
                                abierto={seccionAbierta === 'tarifa'}
                                onClick={() => alternar('tarifa')}
                            />
                            <ChipDetalle
                                id="zonas"
                                Icono={MapPin}
                                label="Zonas"
                                activo={draft.zonasAproximadas.length > 0}
                                abierto={seccionAbierta === 'zonas'}
                                onClick={() => alternar('zonas')}
                            />
                            {draft.modo === 'solicito' && (
                                <ChipDetalle
                                    id="urgente"
                                    Icono={Zap}
                                    label="Urgente"
                                    activo={draft.urgente}
                                    abierto={seccionAbierta === 'urgente'}
                                    onClick={() => alternar('urgente')}
                                />
                            )}
                        </div>
                    </div>

                    {/* ── Reglas legales (footer) ── */}
                    <div className="shrink-0 px-4 py-3 border-t-2 border-slate-200">
                        <CheckboxLegal
                            aceptado={draft.confirmaciones.legal}
                            onCambio={setConfirmacionesUnificadas}
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
                        data-testid="composer-guardar-borrador"
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
                        data-testid="composer-descartar"
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
                        data-testid="composer-seguir-editando"
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

/** Toggle Ofrezco/Solicito solo-ícono, para vivir junto al título en el
 *  header oscuro (gradiente sky) sin competir por espacio con el nombre. */
function ToggleOfrezcoSolicitoIconos({
    modo,
    onCambio,
}: {
    modo: ModoServicio | null;
    onCambio: (m: ModoServicio) => void;
}) {
    return (
        <div className="inline-flex items-center gap-1 shrink-0">
            {(
                [
                    { id: 'ofrezco' as const, label: 'Ofrezco', Icono: Hand },
                    { id: 'solicito' as const, label: 'Solicito', Icono: Search },
                ] as const
            ).map(({ id, label, Icono }) => {
                const activo = modo === id;
                return (
                    <button
                        key={id}
                        type="button"
                        aria-label={label}
                        aria-pressed={activo}
                        data-testid={`composer-toggle-${id}`}
                        onClick={() => onCambio(id)}
                        className={
                            'flex h-9 w-9 items-center justify-center rounded-full lg:cursor-pointer ' +
                            (activo
                                ? 'bg-white text-sky-700 shadow-sm'
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
    Icono: typeof Tags;
    label: string;
    activo: boolean;
    abierto: boolean;
    onClick: () => void;
}

function ChipDetalle({ id, Icono, label, activo, abierto, onClick }: ChipDetalleProps) {
    return (
        <button
            type="button"
            data-testid={`composer-chip-${id}`}
            onClick={onClick}
            aria-pressed={abierto}
            className={
                'relative flex shrink-0 items-center gap-2 rounded-full border-2 px-3.5 py-2 text-sm font-semibold lg:cursor-pointer ' +
                (abierto
                    ? 'bg-sky-100 border-sky-500 text-sky-800'
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
            data-testid={`composer-panel-${titulo.toLowerCase()}`}
            className="rounded-xl border-2 border-sky-300 bg-sky-50/40 p-3"
        >
            <div className="flex items-center gap-2 mb-2.5">
                <ChevronDown className="w-4 h-4 text-sky-700" strokeWidth={2.25} />
                <span className="text-[14px] font-bold text-sky-800">{titulo}</span>
            </div>
            {children}
        </div>
    );
}

function PanelCategoria({
    valor,
    onCambio,
}: {
    valor: CategoriaClasificado | null;
    onCambio: (c: CategoriaClasificado) => void;
}) {
    return (
        <PanelWrapper titulo="Categoría">
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
                            {activa && <Check className="w-4 h-4" strokeWidth={3} />}
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
}: {
    valor: ModalidadServicio | null;
    onCambio: (m: ModalidadServicio) => void;
}) {
    return (
        <PanelWrapper titulo="Modalidad">
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
                            {activa && <Check className="w-4 h-4" strokeWidth={3} />}
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
}: {
    modo: ModoServicio | null;
    valorMin: string;
    valorMax: string;
    onCambioMin: (v: string) => void;
    onCambioMax: (v: string) => void;
}) {
    const titulo = modo === 'ofrezco' ? 'Tarifa (MXN)' : 'Presupuesto (MXN)';
    return (
        <PanelWrapper titulo={titulo}>
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
}: {
    modo: ModoServicio | null;
    items: string[];
    onCambio: (z: string[]) => void;
}) {
    const label = modo === 'ofrezco' ? 'Zonas que cubres' : 'Zonas donde lo necesitas';
    return (
        <PanelWrapper titulo={label}>
            <ChipInputList
                label=""
                helper="Máximo 10."
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
}: {
    aceptado: boolean;
    onCambio: (v: boolean) => void;
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
                    {aceptado && <Check className="w-3 h-3" strokeWidth={3} />}
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
                        className={'w-4 h-4 transition-transform ' + (verDetalles ? 'rotate-180' : '')}
                        strokeWidth={2.25}
                    />
                </button>
            </label>
            {verDetalles && (
                <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                    <li>Es legal: no infringe leyes, ni es discriminatorio, sexual o de armas.</li>
                    <li>Es información verdadera: precio, fotos y datos reflejan lo real.</li>
                    <li>AnunciaYA solo conecta. El pago y la entrega se acuerdan entre las personas.</li>
                </ul>
            )}
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Mapeo error → panel a abrir. */
function primerSeccionConError(e: ErroresComposer): SeccionAbierta {
    if (e.categoria) return 'categoria';
    if (e.modalidad) return 'modalidad';
    if (e.presupuesto) return 'tarifa';
    if (e.zonas) return 'zonas';
    return null;
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
