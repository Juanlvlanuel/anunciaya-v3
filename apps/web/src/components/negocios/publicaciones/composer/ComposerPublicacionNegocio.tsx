/**
 * ComposerPublicacionNegocio.tsx
 * =================================
 * Formulario del composer de publicaciones de Negocio — estilo
 * Instagram/Facebook "Nueva publicación": header X / título / Publicar,
 * fila de identidad (logo + nombre), textarea grande sin borde, y chips de
 * "Galería" / "Precio" (con revelado progresivo) anclados abajo. Sin modo,
 * sin categoría estructurada — "todo tipo, libre" (texto + fotos sin límite
 * de producto + precio opcional).
 *
 * Al intentar cerrar con cambios sin guardar, muestra un modal de
 * confirmación ("¿Quieres terminar la publicación más tarde?") con 3
 * opciones — mismo patrón que Facebook. El borrador YA se autoguarda en
 * localStorage en cada cambio (`useComposerNegocioPublicacion`); "Guardar
 * como borrador" simplemente cierra sin descartarlo. "Descartar" es lo único
 * que limpia el draft + las fotos huérfanas de la sesión.
 *
 * `registrarIntentarCerrar` expone el intercept de cierre al padre
 * (`ComposerSection`) para que el botón atrás nativo (móvil) y el click-fuera
 * / Escape del modal (escritorio) pasen por la misma confirmación que la X.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/composer/ComposerPublicacionNegocio.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, Image as ImageIcon, Tag, Copy, Trash2, Check } from 'lucide-react';
import { Store } from 'lucide-react';
import { ModalAdaptativo } from '../../../ui/ModalAdaptativo';
import { ModalImagenes } from '../../../ui/ModalImagenes';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useNegocioPerfil } from '../../../../hooks/queries/useNegocios';
import {
    useComposerNegocioPublicacion,
    parsePrecioOpcional,
} from '../../../../hooks/useComposerNegocioPublicacion';
import { useFotosUploaderNegocioPublicacion } from '../../../../hooks/useFotosUploaderNegocioPublicacion';
import {
    usePublicacionNegocio,
    useCrearPublicacionNegocio,
    useActualizarPublicacionNegocio,
    useEliminarFotoNegocioPublicacionHuerfana,
} from '../../../../hooks/queries/useNegocioPublicaciones';
import { notificar } from '../../../../utils/notificaciones';

interface ComposerPublicacionNegocioProps {
    modo: 'crear' | 'editar';
    publicacionId: string | null;
    onColapsar: () => void;
    /** Registra el handler de "intentar cerrar" en el padre (back nativo /
     *  click-fuera). Devuelve `true` si de verdad se cerró, `false` si se
     *  quedó abierto (mostró el modal de confirmación) — el padre usa ese
     *  valor para re-armar su propio guard del history. */
    registrarIntentarCerrar?: (fn: () => boolean) => void;
    /** El padre lo llama para re-armar su guard del back nativo cuando el
     *  modal de confirmación se cierra sin salir (p. ej. "Seguir editando",
     *  o el usuario le da back al modal en vez de tocar un botón). */
    onReforzarGuardia?: () => void;
}

export function ComposerPublicacionNegocio({
    modo,
    publicacionId,
    onColapsar,
    registrarIntentarCerrar,
    onReforzarGuardia,
}: ComposerPublicacionNegocioProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const sucursalId = usuario?.sucursalActiva || usuario?.sucursalAsignada || undefined;
    const { data: sucursal } = useNegocioPerfil(sucursalId);

    const esEdicion = modo === 'editar';
    const { draft, actualizar, limpiar, hidratarDesdePublicacion, errores, mensajeBoton, estaIntacto } =
        useComposerNegocioPublicacion({
            storageNamespace: esEdicion && publicacionId ? `edit-${publicacionId}` : 'v1',
        });

    // Edición: hidratar el draft UNA SOLA VEZ cuando la publicación carga.
    const publicacionQuery = usePublicacionNegocio(esEdicion ? publicacionId ?? undefined : undefined);
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (esEdicion && publicacionQuery.data && !hidratadoRef.current) {
            hidratadoRef.current = true;
            hidratarDesdePublicacion({
                texto: publicacionQuery.data.texto,
                precio: publicacionQuery.data.precio ?? '',
                fotos: publicacionQuery.data.fotos,
                fotoPortadaIndex: publicacionQuery.data.fotoPortadaIndex,
            });
        }
    }, [esEdicion, publicacionQuery.data, hidratarDesdePublicacion]);
    const cargandoEdicion = esEdicion && publicacionQuery.isPending && !publicacionQuery.data;

    // Fotos subidas en esta sesión — si el usuario descarta, se limpian de R2.
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set());
    const fotosUploader = useFotosUploaderNegocioPublicacion({
        fotos: draft.fotos,
        onCambioFotos: (fotos) => actualizar({ fotos }),
        urlsSubidasEnSesion,
    });

    const crearMutation = useCrearPublicacionNegocio();
    const actualizarMutation = useActualizarPublicacionNegocio();
    const [enviando, setEnviando] = useState(false);

    // Precio — revelado progresivo (chip "Precio" lo abre, como Instagram/Ubicación).
    const [precioAbierto, setPrecioAbierto] = useState(false);
    const mostrarPrecio = precioAbierto || draft.precio.trim() !== '';

    // ─── Ver foto completa (mismo ModalImagenes de la Galería de Mi Perfil) ─
    const [indiceImagenAbierta, setIndiceImagenAbierta] = useState<number | null>(null);

    // ─── Confirmación al cerrar con cambios sin guardar ────────────────────
    const [confirmarSalirAbierto, setConfirmarSalirAbierto] = useState(false);
    const eliminarFotoHuerfanaMutation = useEliminarFotoNegocioPublicacionHuerfana();

    /** Limpia de R2 las fotos subidas en ESTA sesión (nunca publicadas). */
    function limpiarFotosHuerfanasDeSesion() {
        const urlsHuerfanas = Array.from(urlsSubidasEnSesion.current);
        if (urlsHuerfanas.length === 0) return;
        urlsHuerfanas.forEach((url) => eliminarFotoHuerfanaMutation.mutate(url));
        urlsSubidasEnSesion.current.clear();
    }

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

    // "Guardar como borrador" — el draft ya vive en localStorage (autoguardado
    // en cada cambio); las fotos se conservan. Solo cerramos.
    function handleGuardarBorrador() {
        setConfirmarSalirAbierto(false);
        onColapsar();
    }

    // "Descartar publicación" — única opción que de verdad borra el draft y
    // limpia las fotos huérfanas de la sesión.
    function handleDescartarPublicacion() {
        setConfirmarSalirAbierto(false);
        limpiarFotosHuerfanasDeSesion();
        limpiar();
        onColapsar();
    }

    // Se queda en el composer — re-arma el guard del padre porque el back
    // nativo que abrió este modal ya consumió la entrada del history del
    // composer (si no la re-armamos, el SIGUIENTE back saldría sin avisar).
    function handleSeguirEditando() {
        setConfirmarSalirAbierto(false);
        onReforzarGuardia?.();
    }

    function manejarErrorHttp(e: unknown) {
        const err = e as { response?: { status?: number; data?: { message?: string; errores?: string[] } } };
        const data = err?.response?.data;
        if (err?.response?.status === 422 && data?.message) {
            notificar.error(data.message);
            return;
        }
        const msg = data?.errores && data.errores.length > 0 ? data.errores.join(' · ') : data?.message;
        notificar.error(msg ?? 'No pudimos conectar con el servidor. Intenta de nuevo.');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mensajeBoton) {
            notificar.error(mensajeBoton);
            return;
        }
        setEnviando(true);
        try {
            const payload = {
                texto: draft.texto.trim(),
                precio: draft.precio.trim() ? parsePrecioOpcional(draft.precio) : null,
                fotos: draft.fotos,
                fotoPortadaIndex: draft.fotoPortadaIndex,
            };

            if (esEdicion && publicacionId) {
                const res = await actualizarMutation.mutateAsync({ publicacionId, payload });
                if (!res.success) {
                    notificar.error(res.message ?? 'No pudimos guardar los cambios.');
                    return;
                }
                notificar.exito('Cambios guardados.');
            } else {
                const res = await crearMutation.mutateAsync(payload);
                if (!res.success) {
                    notificar.error(res.message ?? 'No pudimos crear la publicación.');
                    return;
                }
                notificar.exito('¡Publicado!');
            }
            urlsSubidasEnSesion.current.clear();
            limpiar();
            onColapsar();
        } catch (err) {
            manejarErrorHttp(err);
        } finally {
            setEnviando(false);
        }
    }

    const botonPublicarDeshabilitado = enviando || !!mensajeBoton;

    return (
        <div data-testid="composer-negocio-expandido" className="flex flex-1 min-h-0 flex-col bg-white">
            {/* ── Header: X | título centrado | Publicar — acento azul de
                marca (Negocios), en vez de texto plano sobre blanco. ── */}
            <div
                className="shrink-0 flex items-center justify-between px-3 py-3 lg:px-4"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
            >
                <button
                    type="button"
                    aria-label="Cerrar"
                    data-testid="composer-negocio-cerrar"
                    onClick={handleIntentarCerrar}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white lg:cursor-pointer lg:hover:bg-white/15"
                >
                    <X className="h-6 w-6" strokeWidth={2.5} />
                </button>
                <h2 className="text-[17px] font-extrabold text-white tracking-tight">
                    {esEdicion ? 'Editar publicación' : 'Nueva publicación'}
                </h2>
                <button
                    type="submit"
                    form="form-composer-negocio"
                    disabled={botonPublicarDeshabilitado}
                    data-testid="composer-negocio-btn-publicar"
                    className={`rounded-full px-4 py-1.5 text-[15px] font-bold disabled:cursor-not-allowed lg:cursor-pointer ${
                        botonPublicarDeshabilitado
                            ? 'bg-white/20 text-white/60'
                            : 'bg-white text-blue-700 shadow-sm lg:hover:bg-blue-50'
                    }`}
                >
                    {enviando ? 'Publicando…' : esEdicion ? 'Guardar' : 'Publicar'}
                </button>
            </div>

            {/* ── Identidad: logo + nombre del negocio — mucho más grandes. ── */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
                {sucursal?.fotoPerfil ? (
                    <img
                        src={sucursal.fotoPerfil}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div
                        aria-hidden
                        className="h-16 w-16 rounded-full bg-blue-600 grid place-items-center text-white shrink-0"
                    >
                        <Store className="h-7 w-7" strokeWidth={2} />
                    </div>
                )}
                {sucursal?.sucursalNombre && (
                    <span className="text-[22px] font-extrabold text-slate-900 leading-tight truncate">
                        {sucursal.sucursalNombre}
                    </span>
                )}
            </div>

            {cargandoEdicion ? (
                <div className="flex flex-1 items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : (
                <form
                    id="form-composer-negocio"
                    onSubmit={handleSubmit}
                    className="flex flex-1 min-h-0 flex-col"
                >
                    {/* Zona scrollable: texto + fotos (el precio ahora vive
                        dentro del chip, en la fila anclada abajo). */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3">
                        <textarea
                            data-testid="composer-negocio-texto"
                            value={draft.texto}
                            onChange={(e) => actualizar({ texto: e.target.value.slice(0, 2000) })}
                            placeholder="¿Qué quieres compartir?"
                            rows={5}
                            className="w-full resize-none border-0 bg-transparent py-2 text-xl text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-medium outline-none"
                        />

                        {/* Fotos — grid de 3 por fila, sin límite de producto. */}
                        {(draft.fotos.length > 0 || fotosUploader.previews.length > 0) && (
                            <div className="mt-3 grid grid-cols-3 lg:grid-cols-5 gap-2">
                                {draft.fotos.map((url, i) => (
                                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden group">
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
                    </div>

                    {/* ── Chips anclados abajo: Galería + Precio (equivalente
                        nuestro a la fila Música/Etiquetar/Ubicación de
                        Instagram — solo con funciones que sí tenemos). El
                        chip "Precio" se expande EN SU LUGAR a un input,
                        con su "X" de limpiar por dentro. ── */}
                    <div className="shrink-0 px-4 py-3 border-t-2 border-slate-200">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                data-testid="composer-negocio-chip-galeria"
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
                                    <span className="tabular-nums text-slate-500">({draft.fotos.length})</span>
                                )}
                            </button>

                            {mostrarPrecio ? (
                                <div className="relative w-full max-w-[170px]">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[15px]">
                                        $
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        autoFocus={precioAbierto}
                                        data-testid="composer-negocio-precio"
                                        value={draft.precio}
                                        onChange={(e) => actualizar({ precio: e.target.value.replace(/[^\d.]/g, '') })}
                                        placeholder="Precio"
                                        className="w-full rounded-full border-2 border-blue-500 bg-white pl-8 pr-9 py-2 text-[15px] text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-semibold outline-none tabular-nums"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Quitar precio"
                                        onClick={() => {
                                            setPrecioAbierto(false);
                                            actualizar({ precio: '' });
                                        }}
                                        className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 lg:cursor-pointer lg:hover:bg-slate-200 lg:hover:text-slate-700"
                                    >
                                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    data-testid="composer-negocio-chip-precio"
                                    onClick={() => setPrecioAbierto(true)}
                                    className="flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 lg:cursor-pointer lg:hover:bg-slate-100"
                                >
                                    <Tag className="h-4 w-4" strokeWidth={2} />
                                    Precio
                                </button>
                            )}
                        </div>
                        {errores.precio && (
                            <p className="mt-1.5 text-[13px] text-red-600 font-semibold">{errores.precio}</p>
                        )}
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
                        data-testid="composer-negocio-guardar-borrador"
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
                        data-testid="composer-negocio-descartar"
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
                        data-testid="composer-negocio-seguir-editando"
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

export default ComposerPublicacionNegocio;
