/**
 * PaginaPublicarArticulo.tsx
 * ===========================
 * Wizard de 3 pasos para publicar (modo crear) o editar (modo editar) un
 * artículo de MarketPlace.
 *
 * Detección de modo: si la URL trae `:articuloId` → modo editar.
 *
 * Pasos:
 *  1. Fotos (1-8) + Título (10-80 chars).
 *  2. Precio + Condición + Acepta ofertas + Descripción (50-1000 chars).
 *  3. Mapa con círculo 500m + Resumen + Checklist (solo modo crear).
 *
 * Auto-save: cada vez que cambia el estado, se guarda en sessionStorage
 * bajo `wizard_marketplace_${articuloId ?? 'nuevo'}`. Si el usuario recarga
 * la página, se recupera lo último.
 *
 * Vista previa en vivo: solo en `lg:`+ aparece a la derecha una instancia
 * de `<CardArticulo>` actualizada con los datos del wizard.
 *
 * Moderación (Capa 1):
 *  - Si el backend devuelve 422 con categoría prohibida → modal de rechazo
 *    (no permite continuar, hay que cambiar el texto).
 *  - Si devuelve 200 con sugerencia (servicio/búsqueda) → modal de
 *    sugerencia con dos botones (Editar / Continuar de todos modos).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P4)
 * Sprint:      docs/prompts Marketplace/Sprint-4-Wizard-Publicar.md
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    X,
    ImagePlus,
    AlertCircle,
    Loader2,
    BookmarkPlus,
    XCircle,
    Pencil,
    DoorOpen,
    FileQuestion,
} from 'lucide-react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import {
    useArticuloMarketplace,
    useCrearArticulo,
    useActualizarArticulo,
    useSubirFotoMarketplace,
    type CrearArticuloPayload,
    type RespuestaModeracion,
} from '../../../hooks/queries/useMarketplace';
import { CardArticulo } from '../../../components/marketplace/CardArticulo';
import { ModalSugerenciaModeracion } from '../../../components/marketplace/ModalSugerenciaModeracion';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import { detectarPalabraProhibida } from '../../../utils/moderacionMarketplace';
import { api } from '../../../services/api';
import type {
    ArticuloFeed,
    CondicionArticulo,
    EstadoArticulo,
} from '../../../types/marketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_FOTOS = 8;
const TITULO_MIN = 10;
const TITULO_MAX = 80;
const DESCRIPCION_MIN = 50;
const DESCRIPCION_MAX = 1000;
const PRECIO_MAX = 999_999;
const PRECIO_ADVERTENCIA = 10;
const STORAGE_PREFIX_WIZARD = 'wizard_marketplace_';

const CONDICIONES: { valor: CondicionArticulo; etiqueta: string }[] = [
    { valor: 'nuevo', etiqueta: 'Nuevo' },
    { valor: 'seminuevo', etiqueta: 'Seminuevo' },
    { valor: 'usado', etiqueta: 'Usado' },
    { valor: 'para_reparar', etiqueta: 'Para reparar' },
];

// =============================================================================
// TIPOS
// =============================================================================

interface DatosWizard {
    fotos: string[];
    fotoPortadaIndex: number;
    titulo: string;
    precio: string; // string para input controlado, se castea a number al enviar
    condicion: CondicionArticulo | null;
    aceptaOfertas: boolean;
    descripcion: string;
    latitud: number | null;
    longitud: number | null;
    ciudad: string;
    zonaAproximada: string;
    checklist: { prohibidos: boolean; fotosReales: boolean; treintaDias: boolean };
}

const DATOS_INICIALES: DatosWizard = {
    fotos: [],
    fotoPortadaIndex: 0,
    titulo: '',
    precio: '',
    condicion: null,
    aceptaOfertas: true,
    descripcion: '',
    latitud: null,
    longitud: null,
    ciudad: '',
    zonaAproximada: '',
    checklist: { prohibidos: false, fotosReales: false, treintaDias: false },
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaPublicarArticulo() {
    const { articuloId } = useParams<{ articuloId?: string }>();
    const esModoEdicion = !!articuloId;
    const navigate = useNavigate();

    // Stores
    const ciudadGps = useGpsStore((s) => s.ciudad);
    const latGps = useGpsStore((s) => s.latitud);
    const lngGps = useGpsStore((s) => s.longitud);
    const usuarioId = useAuthStore((s) => s.usuario?.id ?? null);

    // Storage key del borrador — incluye usuarioId para que cada cuenta tenga
    // su propio borrador en el mismo navegador. Si no hay usuario (ruta sin
    // auth, raro), cae a 'anon' como salvaguarda. Cambiar de cuenta NO debe
    // mostrar el borrador del usuario anterior.
    const storageKey = `${STORAGE_PREFIX_WIZARD}${usuarioId ?? 'anon'}_${articuloId ?? 'nuevo'}`;

    // Estado
    const [pasoActual, setPasoActual] = useState<1 | 2 | 3>(1);
    const [datos, setDatos] = useState<DatosWizard>(DATOS_INICIALES);
    const [hidratado, setHidratado] = useState(false);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [confirmacionPrecioBajo, setConfirmacionPrecioBajo] = useState(false);
    const [modalSalirAbierto, setModalSalirAbierto] = useState(false);
    const [moderacionSugerencia, setModeracionSugerencia] = useState<{
        categoria: 'servicio' | 'busqueda';
        mensaje: string;
    } | null>(null);
    const [moderacionRechazo, setModeracionRechazo] = useState<{
        categoria: string;
        mensaje: string;
        palabraDetectada?: string;
    } | null>(null);

    // ─── Hidratación inicial ──────────────────────────────────────────────────
    // Modo crear: lee sessionStorage. Modo editar: precarga del backend.
    const articuloQuery = useArticuloMarketplace(articuloId);

    useEffect(() => {
        if (hidratado) return;

        if (esModoEdicion) {
            // Esperar a que cargue la query
            if (articuloQuery.isLoading) return;
            if (articuloQuery.data) {
                const a = articuloQuery.data;
                setDatos({
                    fotos: a.fotos,
                    fotoPortadaIndex: a.fotoPortadaIndex,
                    titulo: a.titulo,
                    precio: String(Math.round(parseFloat(a.precio))),
                    condicion: a.condicion,
                    aceptaOfertas: a.aceptaOfertas,
                    descripcion: a.descripcion,
                    latitud: a.ubicacionAproximada.lat,
                    longitud: a.ubicacionAproximada.lng,
                    ciudad: a.ciudad,
                    zonaAproximada: a.zonaAproximada,
                    // Checklist se omite en edición (no se vuelve a mostrar)
                    checklist: { prohibidos: true, fotosReales: true, treintaDias: true },
                });
                setHidratado(true);
            }
        } else {
            // Modo crear: intentar leer sessionStorage
            try {
                const raw = sessionStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw) as DatosWizard;
                    setDatos((prev) => ({ ...prev, ...parsed }));
                }
            } catch {
                // Ignora corrupción
            }
            // Defaults para ubicación: GPS si está disponible, ciudad activa si no.
            setDatos((prev) => {
                if (prev.latitud != null && prev.longitud != null) return prev;
                if (latGps != null && lngGps != null) {
                    return {
                        ...prev,
                        latitud: latGps,
                        longitud: lngGps,
                        ciudad: prev.ciudad || ciudadGps?.nombre || '',
                        zonaAproximada: prev.zonaAproximada || ciudadGps?.nombre || '',
                    };
                }
                if (ciudadGps?.coordenadas) {
                    return {
                        ...prev,
                        latitud: ciudadGps.coordenadas.lat,
                        longitud: ciudadGps.coordenadas.lng,
                        ciudad: prev.ciudad || ciudadGps.nombre,
                        zonaAproximada: prev.zonaAproximada || ciudadGps.nombre,
                    };
                }
                return prev;
            });
            setHidratado(true);
        }
    }, [esModoEdicion, articuloQuery.isLoading, articuloQuery.data, articuloId, hidratado, latGps, lngGps, ciudadGps]);

    // ─── Auto-save (debounced) ────────────────────────────────────────────────
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!hidratado) return;
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(datos));
            } catch {
                /* ignora QuotaExceeded */
            }
        }, 500);
        return () => {
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        };
    }, [datos, hidratado, articuloId]);

    // ─── Mutations ────────────────────────────────────────────────────────────
    const crearMutation = useCrearArticulo();
    const actualizarMutation = useActualizarArticulo();
    const guardando = crearMutation.isPending || actualizarMutation.isPending;

    // ─── Validación por paso ──────────────────────────────────────────────────
    const erroresPaso1 = useMemo(() => {
        const e: Record<string, string> = {};
        if (datos.fotos.length === 0) e.fotos = 'Debes incluir al menos 1 foto';
        if (datos.titulo.length < TITULO_MIN)
            e.titulo = `Mínimo ${TITULO_MIN} caracteres`;
        else if (datos.titulo.length > TITULO_MAX)
            e.titulo = `Máximo ${TITULO_MAX} caracteres`;
        else {
            const prohibido = detectarPalabraProhibida(datos.titulo);
            if (prohibido) e.titulo = prohibido.mensaje;
        }
        return e;
    }, [datos.fotos.length, datos.titulo]);

    const erroresPaso2 = useMemo(() => {
        const e: Record<string, string> = {};
        const precio = parseInt(datos.precio, 10);
        if (!datos.precio || isNaN(precio) || precio <= 0)
            e.precio = 'El precio debe ser mayor a cero';
        else if (precio > PRECIO_MAX) e.precio = `Máximo $${PRECIO_MAX.toLocaleString('es-MX')}`;
        if (!datos.condicion) e.condicion = 'Selecciona la condición';
        if (datos.descripcion.length < DESCRIPCION_MIN)
            e.descripcion = `Mínimo ${DESCRIPCION_MIN} caracteres`;
        else if (datos.descripcion.length > DESCRIPCION_MAX)
            e.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres`;
        else {
            const prohibido = detectarPalabraProhibida(datos.descripcion);
            if (prohibido) e.descripcion = prohibido.mensaje;
        }
        return e;
    }, [datos.precio, datos.condicion, datos.descripcion]);

    const erroresPaso3 = useMemo(() => {
        const e: Record<string, string> = {};
        if (datos.latitud == null || datos.longitud == null)
            e.ubicacion =
                'Necesitamos tu ubicación. Activa el GPS o selecciona tu ciudad desde el navegador superior.';
        if (!esModoEdicion) {
            const todoMarcado =
                datos.checklist.prohibidos &&
                datos.checklist.fotosReales &&
                datos.checklist.treintaDias;
            if (!todoMarcado) e.checklist = 'Marca las 3 confirmaciones para publicar';
        }
        return e;
    }, [datos.latitud, datos.longitud, datos.checklist, esModoEdicion]);

    const puedeAvanzar =
        (pasoActual === 1 && Object.keys(erroresPaso1).length === 0) ||
        (pasoActual === 2 && Object.keys(erroresPaso2).length === 0) ||
        (pasoActual === 3 && Object.keys(erroresPaso3).length === 0);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const tieneCambios =
        datos.fotos.length > 0 ||
        datos.titulo.trim().length > 0 ||
        datos.descripcion.trim().length > 0 ||
        datos.precio.length > 0;

    const handleAtras = () => {
        if (pasoActual === 1) {
            // Si no escribió nada, salir directo sin preguntar.
            if (!tieneCambios) {
                navigate('/marketplace');
                return;
            }
            setModalSalirAbierto(true);
            return;
        }
        setPasoActual((p) => (p - 1) as 1 | 2 | 3);
    };

    const handleGuardarBorradorYSalir = () => {
        // El auto-save ya guardó el state en sessionStorage (debounced 500ms),
        // pero forzamos un save inmediato por si el usuario sale antes.
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(datos));
        } catch {
            /* QuotaExceeded — fallback al cron del browser */
        }
        setModalSalirAbierto(false);
        navigate('/marketplace');
    };

    const handleDescartarYSalir = () => {
        // Borrar fotos subidas en esta sesión que aún no son parte de un artículo.
        // Las fotos preexistentes (modo edición) NO se tocan — el reference
        // count del backend las preserva.
        if (!esModoEdicion) {
            datos.fotos.forEach((url) => {
                api.delete('/r2/imagen', { data: { url } }).catch(() => undefined);
            });
        }
        limpiarStorage();
        setModalSalirAbierto(false);
        navigate('/marketplace');
    };

    const handleContinuar = () => {
        const er =
            pasoActual === 1
                ? erroresPaso1
                : pasoActual === 2
                    ? erroresPaso2
                    : erroresPaso3;
        setErrores(er);
        if (Object.keys(er).length > 0) return;

        // Advertencia precio bajo (solo al avanzar del paso 2)
        if (pasoActual === 2 && !confirmacionPrecioBajo) {
            const precio = parseInt(datos.precio, 10);
            if (precio < PRECIO_ADVERTENCIA) {
                if (
                    !window.confirm(
                        `Este precio ($${precio}) parece muy bajo. ¿Es correcto?`
                    )
                ) {
                    return;
                }
                setConfirmacionPrecioBajo(true);
            }
        }

        if (pasoActual < 3) {
            setPasoActual((p) => (p + 1) as 1 | 2 | 3);
            setErrores({});
            return;
        }

        // Paso 3 → enviar
        enviar(false);
    };

    const enviar = async (confirmadoPorUsuario: boolean) => {
        const payload: CrearArticuloPayload = {
            titulo: datos.titulo,
            descripcion: datos.descripcion,
            precio: parseInt(datos.precio, 10),
            condicion: datos.condicion as CondicionArticulo,
            aceptaOfertas: datos.aceptaOfertas,
            fotos: datos.fotos,
            fotoPortadaIndex: datos.fotoPortadaIndex,
            latitud: datos.latitud as number,
            longitud: datos.longitud as number,
            ciudad: datos.ciudad,
            zonaAproximada: datos.zonaAproximada,
            confirmadoPorUsuario,
        };

        try {
            if (esModoEdicion && articuloId) {
                const resp = await actualizarMutation.mutateAsync({ articuloId, payload });
                if (manejarRespuestaModeracion(resp)) return;
                notificar.exito('Cambios guardados');
                limpiarStorage();
                navigate(`/marketplace/articulo/${articuloId}`);
            } else {
                const resp = await crearMutation.mutateAsync(payload);
                if (manejarRespuestaModeracion(resp)) return;
                if (resp.success && 'data' in resp && resp.data?.id) {
                    notificar.exito('Tu artículo está publicado');
                    limpiarStorage();
                    navigate(`/marketplace/articulo/${resp.data.id}`);
                }
            }
        } catch (e) {
            // Errores HTTP no-2xx (incluye 422 de rechazo duro)
            const status = (e as { response?: { status?: number; data?: RespuestaModeracion } } | null)
                ?.response?.status;
            const data = (e as { response?: { data?: RespuestaModeracion } } | null)?.response?.data;
            if (status === 422 && data?.moderacion) {
                setModeracionRechazo({
                    categoria: data.moderacion.categoria,
                    mensaje: data.moderacion.mensaje,
                    palabraDetectada: data.moderacion.palabraDetectada,
                });
                return;
            }
            notificar.error('No pudimos publicar el artículo. Intenta de nuevo.');
        }
    };

    /**
     * Si la respuesta del backend es una sugerencia suave, abre el modal y
     * devuelve true (caller debe abortar). Si es éxito o nada que manejar,
     * devuelve false.
     */
    const manejarRespuestaModeracion = (resp: { success: boolean } | RespuestaModeracion): boolean => {
        if (!resp.success && 'moderacion' in resp && resp.moderacion.severidad === 'sugerencia') {
            setModeracionSugerencia({
                categoria: resp.moderacion.categoria as 'servicio' | 'busqueda',
                mensaje: resp.moderacion.mensaje,
            });
            return true;
        }
        return false;
    };

    const handleContinuarConSugerencia = () => {
        setModeracionSugerencia(null);
        enviar(true);
    };

    const handleEditarTrasSugerencia = () => {
        setModeracionSugerencia(null);
        // Llevar al paso del título/descripción para que el usuario edite.
        setPasoActual(1);
    };

    const limpiarStorage = () => {
        try {
            sessionStorage.removeItem(storageKey);
        } catch {
            /* noop */
        }
    };

    // ─── Vista previa en vivo (desktop) ───────────────────────────────────────
    const articuloPreview: ArticuloFeed = useMemo(
        () => ({
            id: articuloId ?? 'preview',
            usuarioId: useAuthStore.getState().usuario?.id ?? '',
            titulo: datos.titulo || 'Título del artículo',
            descripcion: datos.descripcion || '',
            precio: datos.precio ? `${parseInt(datos.precio, 10) || 0}.00` : '0.00',
            condicion: (datos.condicion ?? 'usado') as CondicionArticulo,
            aceptaOfertas: datos.aceptaOfertas,
            fotos: datos.fotos.length > 0 ? datos.fotos : [],
            fotoPortadaIndex: datos.fotoPortadaIndex,
            ubicacionAproximada: {
                lat: datos.latitud ?? 0,
                lng: datos.longitud ?? 0,
            },
            ciudad: datos.ciudad,
            zonaAproximada: datos.zonaAproximada,
            estado: 'activa' as EstadoArticulo,
            totalVistas: 0,
            totalMensajes: 0,
            totalGuardados: 0,
            expiraAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            vendidaAt: null,
            distanciaMetros: null,
        }),
        [datos, articuloId]
    );

    // ─── Render ───────────────────────────────────────────────────────────────

    if (esModoEdicion && articuloQuery.isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    return (
        <div data-testid="pagina-publicar-articulo" className="min-h-full bg-transparent pb-24">
            {/* ─── Header con back + progreso ──────────────────────── */}
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <button
                            data-testid="btn-atras-wizard"
                            onClick={handleAtras}
                            aria-label="Volver"
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <div className="flex-1 text-center">
                            <div className="text-sm font-semibold text-slate-900">
                                {esModoEdicion ? 'Editar publicación' : 'Nueva publicación'}
                            </div>
                            <div className="text-xs text-slate-500">
                                Paso {pasoActual} de 3
                            </div>
                        </div>
                        <div className="w-10" />
                    </div>
                    {/* Barra de progreso */}
                    <div className="flex gap-1 px-3 pb-2">
                        {[1, 2, 3].map((p) => (
                            <div
                                key={p}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    p <= pasoActual ? 'bg-teal-500' : 'bg-slate-200'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Contenido (con vista previa en lg+) ──────────────── */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6 2xl:px-8">
                <div className="lg:grid lg:grid-cols-[60%_40%] lg:gap-8">
                    <div className="px-3 py-4 lg:px-0 lg:py-0">
                        {pasoActual === 1 && (
                            <Paso1
                                datos={datos}
                                setDatos={setDatos}
                                errores={erroresPaso1}
                            />
                        )}
                        {pasoActual === 2 && (
                            <Paso2
                                datos={datos}
                                setDatos={setDatos}
                                errores={erroresPaso2}
                            />
                        )}
                        {pasoActual === 3 && (
                            <Paso3
                                datos={datos}
                                setDatos={setDatos}
                                errores={erroresPaso3}
                                esModoEdicion={esModoEdicion}
                            />
                        )}
                    </div>

                    {/* Vista previa en vivo (solo desktop) */}
                    <div className="hidden lg:block">
                        <div className="sticky top-32">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Vista previa
                            </p>
                            <div className="max-w-xs">
                                <CardArticulo articulo={articuloPreview} />
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-slate-500">
                                Tip: Las publicaciones con buenas fotos y precio competitivo
                                se venden en promedio 3 días más rápido.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Footer fijo con botones de navegación ───────────── */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="flex gap-2 px-3 py-3 lg:max-w-3xl">
                        <button
                            data-testid="btn-paso-anterior"
                            onClick={handleAtras}
                            disabled={guardando}
                            className="cursor-pointer rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {pasoActual === 1 ? 'Salir' : 'Anterior'}
                        </button>
                        <button
                            data-testid="btn-paso-continuar"
                            onClick={handleContinuar}
                            disabled={!puedeAvanzar || guardando}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                        >
                            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                            {pasoActual < 3
                                ? 'Continuar'
                                : esModoEdicion
                                    ? 'Guardar cambios'
                                    : 'Publicar ahora'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Modal de sugerencia (servicio/búsqueda) ─────────── */}
            <ModalSugerenciaModeracion
                abierto={!!moderacionSugerencia}
                categoria={moderacionSugerencia?.categoria ?? 'servicio'}
                mensaje={moderacionSugerencia?.mensaje ?? ''}
                onEditar={handleEditarTrasSugerencia}
                onContinuar={handleContinuarConSugerencia}
                cargandoContinuar={guardando}
            />

            {/* ─── Modal "Salir sin publicar" — patrón TC-6A (modal de detalle
                con header gradiente) + TC-1E (botones de formulario BS).
                Tokens aplicados: pt-6 pb-3 lg:py-3 px-4, iconos 14-16px,
                botones rounded-xl py-2.5 lg:py-1.5, submit dark gradient. ── */}
            <ModalAdaptativo
                abierto={modalSalirAbierto}
                onCerrar={() => setModalSalirAbierto(false)}
                ancho="md"
                mostrarHeader={false}
                paddingContenido="none"
                sinScrollInterno
                headerOscuro
                className="lg:max-w-sm 2xl:max-w-md"
            >
                <div data-testid="modal-salir-wizard">
                    {/* Header gradiente teal — padding según TC-6A */}
                    <div
                        className="relative overflow-hidden px-4 pt-6 pb-3 lg:px-3 lg:py-3 2xl:px-4 2xl:py-4 lg:rounded-t-2xl"
                        style={{
                            background:
                                'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
                            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.35)',
                        }}
                    >
                        <div className="relative flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                <DoorOpen className="h-4 w-4 text-white" strokeWidth={2.25} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-bold text-white leading-tight 2xl:text-lg">
                                    ¿Salir sin publicar?
                                </h2>
                                <p className="mt-0.5 text-sm font-medium text-white/80">
                                    Tu publicación aún no se ha enviado
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cuerpo */}
                    <div className="px-4 py-4 lg:px-3 lg:py-3 2xl:px-4 2xl:py-4">
                        <p className="text-center text-base font-medium text-slate-700 leading-snug lg:text-sm 2xl:text-base">
                            ¿Qué quieres hacer
                            <br />
                            con lo que escribiste hasta ahora?
                        </p>

                        {/* Separador visual entre la pregunta y los CTAs */}
                        <div className="my-4 flex items-center justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 ring-2 ring-teal-100">
                                <FileQuestion
                                    className="h-8 w-8 text-teal-600"
                                    strokeWidth={2}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                data-testid="btn-cancelar-salir"
                                onClick={() => setModalSalirAbierto(false)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-300 bg-transparent px-3 py-2.5 text-sm font-bold text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:border-slate-400 cursor-pointer lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5"
                            >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Seguir
                            </button>

                            <button
                                data-testid="btn-descartar-borrador"
                                onClick={handleDescartarYSalir}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-rose-300 bg-transparent px-3 py-2.5 text-sm font-bold text-rose-600 transition-all duration-150 hover:bg-rose-50 hover:border-rose-400 active:bg-rose-100 cursor-pointer lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5"
                            >
                                <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Descartar
                            </button>

                            <button
                                data-testid="btn-guardar-borrador"
                                onClick={handleGuardarBorradorYSalir}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-all duration-150 hover:from-slate-800 hover:to-slate-900 active:scale-[0.98] cursor-pointer lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5"
                                style={{
                                    background: 'linear-gradient(to right, #334155, #1e293b)',
                                    boxShadow: '0 4px 12px rgba(30, 41, 59, 0.3)',
                                }}
                            >
                                <BookmarkPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Guardar
                            </button>
                        </div>

                        <p className="mt-3 text-center text-sm font-medium text-slate-500">
                            El borrador queda asociado a tu cuenta en este navegador.
                        </p>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* ─── Modal de rechazo duro (palabra prohibida) ───────── */}
            {moderacionRechazo && (
                <div
                    data-testid="modal-rechazo-moderacion"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                                <AlertCircle
                                    className="h-7 w-7 text-rose-600"
                                    strokeWidth={2}
                                />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                No podemos publicar este contenido
                            </h2>
                            <p className="text-sm leading-relaxed text-slate-600">
                                {moderacionRechazo.mensaje}
                            </p>
                            {moderacionRechazo.palabraDetectada && (
                                <p className="text-xs text-slate-500">
                                    Palabra detectada:{' '}
                                    <span className="font-mono font-semibold">
                                        {moderacionRechazo.palabraDetectada}
                                    </span>
                                </p>
                            )}
                        </div>
                        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                            <button
                                data-testid="btn-cerrar-rechazo"
                                onClick={() => {
                                    setModeracionRechazo(null);
                                    setPasoActual(1);
                                }}
                                className="w-full cursor-pointer rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:scale-[1.01] transition-transform"
                            >
                                Editar mi publicación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// PASOS — sub-componentes
// =============================================================================

interface PasoProps {
    datos: DatosWizard;
    setDatos: React.Dispatch<React.SetStateAction<DatosWizard>>;
    errores: Record<string, string>;
}

// ─── PASO 1 — Fotos + Título ───────────────────────────────────────────────

function Paso1({ datos, setDatos, errores }: PasoProps) {
    const upload = useSubirFotoMarketplace();
    // URLs subidas EN esta sesión del wizard (NO las preexistentes que vienen
    // del artículo en modo edición). Solo estas se pueden borrar de R2 al
    // quitar — las preexistentes pertenecen a un artículo guardado y se
    // manejan al guardar (con reference count del backend).
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set<string>());

    const handleAgregarFoto = async (file: File) => {
        if (datos.fotos.length >= MAX_FOTOS) {
            notificar.advertencia(`Máximo ${MAX_FOTOS} fotos`);
            return;
        }
        const url = await upload.subir(file);
        if (!url) {
            notificar.error(upload.error ?? 'No se pudo subir la foto');
            return;
        }
        urlsSubidasEnSesion.current.add(url);
        setDatos((d) => ({ ...d, fotos: [...d.fotos, url] }));
    };

    const handleQuitarFoto = (idx: number) => {
        // Si la URL fue subida en esta sesión (no es preexistente de un
        // artículo guardado), borrarla de R2 fire-and-forget. Si falla, el
        // Recolector de Basura del backend la limpiará después.
        const urlAQuitar = datos.fotos[idx];
        if (urlAQuitar && urlsSubidasEnSesion.current.has(urlAQuitar)) {
            urlsSubidasEnSesion.current.delete(urlAQuitar);
            api.delete('/r2/imagen', { data: { url: urlAQuitar } }).catch(() => {
                // Silencioso: el reconcile periódico la limpiará si falló.
            });
        }
        setDatos((d) => {
            const fotos = d.fotos.filter((_, i) => i !== idx);
            const fotoPortadaIndex =
                idx === d.fotoPortadaIndex
                    ? 0
                    : idx < d.fotoPortadaIndex
                        ? d.fotoPortadaIndex - 1
                        : d.fotoPortadaIndex;
            return { ...d, fotos, fotoPortadaIndex };
        });
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-bold text-slate-900">Fotos · hasta {MAX_FOTOS}</h2>
                <p className="mt-0.5 text-sm text-slate-600">
                    La primera foto será la portada. Buena luz natural y fondo limpio venden más.
                </p>
                {errores.fotos && (
                    <p className="mt-1 text-xs text-rose-600">{errores.fotos}</p>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-4">
                    {datos.fotos.map((url, idx) => (
                        <div
                            key={url}
                            data-testid={`slot-foto-${idx}`}
                            className="relative aspect-square overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-100"
                        >
                            <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                            {idx === 0 && (
                                <span className="absolute left-1.5 top-1.5 rounded bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                    Portada
                                </span>
                            )}
                            <button
                                data-testid={`btn-quitar-foto-${idx}`}
                                onClick={() => handleQuitarFoto(idx)}
                                aria-label="Quitar foto"
                                className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-rose-500"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                        </div>
                    ))}
                    {datos.fotos.length < MAX_FOTOS && (
                        <label
                            data-testid="slot-agregar-foto"
                            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:border-teal-400 hover:text-teal-600"
                        >
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={upload.isUploading}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAgregarFoto(file);
                                    e.target.value = '';
                                }}
                            />
                            {upload.isUploading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                                    <span className="mt-1 text-xs">Agregar</span>
                                </>
                            )}
                        </label>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-900">
                    Título de tu publicación
                </label>
                <input
                    data-testid="input-titulo"
                    type="text"
                    value={datos.titulo}
                    onChange={(e) =>
                        setDatos((d) => ({ ...d, titulo: e.target.value.slice(0, TITULO_MAX) }))
                    }
                    placeholder="Bicicleta vintage Rinos restaurada"
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span className={errores.titulo ? 'text-rose-600' : ''}>
                        {errores.titulo ?? `Mínimo ${TITULO_MIN} caracteres`}
                    </span>
                    <span>
                        {datos.titulo.length}/{TITULO_MAX}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── PASO 2 — Precio + Detalles ────────────────────────────────────────────

function Paso2({ datos, setDatos, errores }: PasoProps) {
    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-semibold text-slate-900">Precio</label>
                <div className="mt-1 flex items-center rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 focus-within:border-teal-500">
                    <span className="text-2xl font-bold text-slate-400">$</span>
                    <input
                        data-testid="input-precio"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={PRECIO_MAX}
                        value={datos.precio}
                        onChange={(e) =>
                            setDatos((d) => ({
                                ...d,
                                precio: e.target.value.replace(/[^\d]/g, '').slice(0, 6),
                            }))
                        }
                        placeholder="2800"
                        className="ml-2 flex-1 bg-transparent text-2xl font-bold text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-sm font-semibold text-slate-500">MXN</span>
                </div>
                {errores.precio && (
                    <p className="mt-1 text-xs text-rose-600">{errores.precio}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-900">Condición</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {CONDICIONES.map((c) => (
                        <button
                            key={c.valor}
                            data-testid={`chip-condicion-${c.valor}`}
                            onClick={() => setDatos((d) => ({ ...d, condicion: c.valor }))}
                            aria-pressed={datos.condicion === c.valor}
                            className={`cursor-pointer rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                                datos.condicion === c.valor
                                    ? 'border-teal-500 bg-teal-50 text-teal-900'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {c.etiqueta}
                        </button>
                    ))}
                </div>
                {errores.condicion && (
                    <p className="mt-1 text-xs text-rose-600">{errores.condicion}</p>
                )}
            </div>

            <div className="flex items-center justify-between rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5">
                <div>
                    <div className="text-sm font-semibold text-slate-900">Acepta ofertas</div>
                    <div className="text-xs text-slate-500">
                        El comprador podrá negociar el precio por chat.
                    </div>
                </div>
                <button
                    data-testid="toggle-acepta-ofertas"
                    onClick={() =>
                        setDatos((d) => ({ ...d, aceptaOfertas: !d.aceptaOfertas }))
                    }
                    role="switch"
                    aria-checked={datos.aceptaOfertas}
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                        datos.aceptaOfertas ? 'bg-teal-500' : 'bg-slate-300'
                    }`}
                >
                    <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            datos.aceptaOfertas ? 'left-5' : 'left-0.5'
                        }`}
                    />
                </button>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-900">Descripción</label>
                <textarea
                    data-testid="input-descripcion"
                    value={datos.descripcion}
                    onChange={(e) =>
                        setDatos((d) => ({
                            ...d,
                            descripcion: e.target.value.slice(0, DESCRIPCION_MAX),
                        }))
                    }
                    rows={6}
                    placeholder="Bicicleta restaurada con piezas originales Shimano…"
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span className={errores.descripcion ? 'text-rose-600' : ''}>
                        {errores.descripcion ?? `Mínimo ${DESCRIPCION_MIN} caracteres`}
                    </span>
                    <span>
                        {datos.descripcion.length}/{DESCRIPCION_MAX}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── PASO 3 — Ubicación + Confirmación ────────────────────────────────────

interface Paso3Props extends PasoProps {
    esModoEdicion: boolean;
}

function Paso3({ datos, setDatos, errores, esModoEdicion }: Paso3Props) {
    const tieneUbicacion = datos.latitud != null && datos.longitud != null;

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-bold text-slate-900">Zona aproximada</h2>
                <p className="mt-0.5 text-sm text-slate-600">
                    Mostraremos un círculo de 500m, no tu dirección exacta.
                </p>
                {!tieneUbicacion ? (
                    <div className="mt-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                            <div>
                                <strong className="font-semibold">Necesitamos tu ubicación</strong>
                                <p className="mt-0.5">
                                    Activa el GPS de tu dispositivo o selecciona tu ciudad
                                    desde el navegador superior para continuar.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 overflow-hidden rounded-xl border-2 border-slate-200">
                        <MapContainer
                            center={[datos.latitud as number, datos.longitud as number]}
                            zoom={15}
                            scrollWheelZoom={false}
                            dragging={false}
                            touchZoom={false}
                            doubleClickZoom={false}
                            keyboard={false}
                            zoomControl={false}
                            attributionControl={false}
                            className="h-56 w-full"
                            style={{ pointerEvents: 'none' }}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Circle
                                center={[datos.latitud as number, datos.longitud as number]}
                                radius={500}
                                pathOptions={{
                                    color: '#0d9488',
                                    weight: 2,
                                    fillColor: '#14b8a6',
                                    fillOpacity: 0.15,
                                }}
                            />
                        </MapContainer>
                    </div>
                )}
                {datos.zonaAproximada && tieneUbicacion && (
                    <p className="mt-2 text-sm font-medium text-slate-700">
                        📍 {datos.zonaAproximada}
                    </p>
                )}
                {errores.ubicacion && (
                    <p className="mt-1 text-xs text-rose-600">{errores.ubicacion}</p>
                )}
            </div>

            {/* Resumen */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Resumen
                </p>
                <div className="flex gap-3">
                    {datos.fotos[0] ? (
                        <img
                            src={datos.fotos[0]}
                            alt="Portada"
                            className="h-20 w-20 shrink-0 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-100" />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                            {datos.titulo || 'Sin título'}
                        </div>
                        <div className="text-base font-bold text-slate-900">
                            ${parseInt(datos.precio || '0', 10).toLocaleString('es-MX')}
                        </div>
                        <div className="text-xs text-slate-500">
                            {datos.aceptaOfertas ? 'Acepta ofertas · ' : ''}
                            {CONDICIONES.find((c) => c.valor === datos.condicion)?.etiqueta ?? ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Checklist (solo modo crear) */}
            {!esModoEdicion && (
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Antes de publicar</h3>
                    <div className="mt-2 space-y-2">
                        {[
                            { key: 'prohibidos' as const, label: 'No vendo artículos prohibidos por las reglas' },
                            { key: 'fotosReales' as const, label: 'Las fotos son del artículo real, sin retoque' },
                            {
                                key: 'treintaDias' as const,
                                label: 'Acepto que mi publicación se mostrará 30 días',
                            },
                        ].map((item) => (
                            <label
                                key={item.key}
                                data-testid={`checkbox-${item.key}`}
                                className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={datos.checklist[item.key]}
                                    onChange={(e) =>
                                        setDatos((d) => ({
                                            ...d,
                                            checklist: {
                                                ...d.checklist,
                                                [item.key]: e.target.checked,
                                            },
                                        }))
                                    }
                                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-teal-500"
                                />
                                <span className="text-sm text-slate-700">{item.label}</span>
                            </label>
                        ))}
                    </div>
                    {errores.checklist && (
                        <p className="mt-1 text-xs text-rose-600">{errores.checklist}</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PaginaPublicarArticulo;
