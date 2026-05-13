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
 * Auto-save: cada vez que cambia el estado, se guarda en localStorage
 * bajo `wizard_marketplace_${usuarioId}_${articuloId ?? 'nuevo'}`. Si el
 * usuario cierra el navegador o hace logout y vuelve a loguearse, se
 * recupera el borrador exactamente como lo dejó (incluidas las fotos
 * subidas a R2).
 *
 * Privacidad cross-usuario: el `usuarioId` en el storageKey garantiza
 * que cuando otra persona se loguea en el mismo dispositivo, el wizard
 * construye una key distinta y nunca lee el borrador ajeno — el feed
 * arranca limpio para el otro usuario. NO se hace cleanup al logout
 * porque el autor debe poder recuperar su trabajo cuando vuelva.
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
    Plus,
    Lightbulb,
    Star,
    Trash2,
    ArrowRight,
    Check,
} from 'lucide-react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import {
    useArticuloMarketplace,
    useCrearArticulo,
    useActualizarArticulo,
    useSubirFotoMarketplace,
    type CrearArticuloPayload,
    type RespuestaModeracion,
} from '../../../hooks/queries/useMarketplace';
import { CardArticuloFeed } from '../../../components/marketplace/CardArticuloFeed';
import { ModalSugerenciaModeracion } from '../../../components/marketplace/ModalSugerenciaModeracion';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { ModalImagenes } from '../../../components/ui/ModalImagenes';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import { detectarPalabraProhibida } from '../../../utils/moderacionMarketplace';
import { api } from '../../../services/api';
import type {
    ArticuloFeedInfinito,
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

// Tips contextuales por paso — se muestran como card al final de la columna
// izquierda. Reemplazan la card de tips genéricos que vivía en el panel sticky
// derecho y llenan el vacío vertical que dejaba la `CardArticuloFeed` alta.
const TIPS_POR_PASO: Record<1 | 2 | 3, { titulo: string; tips: string[]; cierre?: string }> = {
    1: {
        titulo: 'Tips para fotos y título',
        tips: [
            'Buena luz natural y fondo limpio venden 3 veces más.',
            'La primera foto es la portada — escoge la que mejor muestre el artículo.',
            'Título claro: marca, modelo y estado en pocas palabras.',
            'Sé específico: "Bicicleta Rinos vintage restaurada" mejor que "Bici".',
        ],
    },
    2: {
        titulo: 'Tips para precio y descripción',
        tips: [
            'Revisa anuncios similares para fijar un precio competitivo.',
            'Sé honesto con la condición — los compradores valoran la transparencia.',
            'Describe medidas, fallas y accesorios incluidos.',
            'Mientras más detalles, menos preguntas innecesarias por chat.',
        ],
    },
    3: {
        titulo: 'Tips de seguridad al vender',
        tips: [
            'Tu ubicación NO se muestra exacta — solo un círculo de 500m.',
            'Reúnete en lugares públicos y de día para entregar el artículo.',
            'Cobra antes de entregar o usa pago contra entrega.',
            'Revisa el resumen — una vez publicado, todos podrán verlo.',
        ],
    },
};

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

    // BottomNav auto-hide tracker (móvil) — los FABs flotantes bajan a
    // `bottom-4` cuando el BottomNav se oculta al hacer scroll, y vuelven
    // a `bottom-20` cuando reaparece. Mismo patrón que el FAB "Publicar"
    // del feed (PaginaMarketplace).
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });

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

    // URLs de fotos subidas a R2 durante ESTA sesión del wizard. Vive en el
    // padre (no en Paso1) porque `handleDescartarYSalir` necesita iterarlas
    // para limpiar R2 en MODO EDICIÓN — en ese modo `datos.fotos` mezcla
    // fotos preexistentes del artículo (NO borrables) con las nuevas
    // (borrables), y este set las distingue. En MODO CREAR no se consulta:
    // todas las fotos del state son efímeras y se borran iterando `datos.fotos`.
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set<string>());

    // Contador de fotos en upload simultáneo (batch del Paso 1). Vive aquí
    // (no en Paso1) por dos razones:
    //  1. Paso1 puede desmontarse mientras el batch sigue corriendo (si el
    //     usuario hace "Continuar" entre pasos); si `setPendientes` viviera
    //     en Paso1 daría warning de React "update on unmounted component".
    //  2. `handleContinuar` y el botón "Publicar" deben bloquearse hasta
    //     que termine el batch — si no, las fotos del batch se subirían a
    //     R2 sin asociarse al artículo creado (quedan huérfanas).
    const [pendientesUpload, setPendientesUpload] = useState(0);
    const subiendoBatch = pendientesUpload > 0;
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
    // Modo crear: lee localStorage. Modo editar: precarga del backend.
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
            // Modo crear: intentar leer localStorage
            try {
                const raw = localStorage.getItem(storageKey);
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
                localStorage.setItem(storageKey, JSON.stringify(datos));
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
        !subiendoBatch &&
        ((pasoActual === 1 && Object.keys(erroresPaso1).length === 0) ||
            (pasoActual === 2 && Object.keys(erroresPaso2).length === 0) ||
            (pasoActual === 3 && Object.keys(erroresPaso3).length === 0));

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const tieneCambios =
        datos.fotos.length > 0 ||
        datos.titulo.trim().length > 0 ||
        datos.descripcion.trim().length > 0 ||
        datos.precio.length > 0 ||
        // Si hay un batch de fotos subiéndose pero aún no aterrizaron en
        // `datos.fotos`, también contamos como "hay cambios" — para que el
        // beforeunload warning evite que el usuario cierre la pestaña y
        // pierda las URLs en vuelo (que quedarían huérfanas en R2).
        subiendoBatch;

    // ─── Warning del navegador al cerrar pestaña con cambios sin guardar ───
    // Si el usuario cierra la pestaña, refresca o navega fuera con el botón
    // del navegador (NO con `navigate()` interno) mientras tiene fotos
    // subidas o texto escrito, el navegador muestra su diálogo nativo
    // "¿Salir? Tus cambios no se guardaron".
    //
    // No borra fotos automáticamente — sería peligroso si el usuario cierra
    // por error. El reconcile global de R2 limpiará las que queden
    // huérfanas eventualmente. Los flujos internos del wizard
    // (handleDescartarYSalir, handleGuardarBorradorYSalir) usan `navigate()`
    // que NO dispara `beforeunload`, así que no hay conflicto.
    useEffect(() => {
        if (!tieneCambios || guardando) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Chrome / Edge requieren setear `returnValue`. El texto se
            // ignora desde 2016 — el navegador muestra su mensaje genérico.
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [tieneCambios, guardando]);

    const handleAtras = () => {
        // Guard defensivo: si por race condition el handler se dispara
        // entre el momento en que el batch arrancó y el render que
        // deshabilita el botón, abortar. El usuario debe esperar a que
        // las fotos terminen de subirse antes de poder salir.
        if (subiendoBatch) {
            notificar.advertencia('Espera a que terminen de subirse las fotos');
            return;
        }
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
        // El auto-save ya guardó el state en localStorage (debounced 500ms),
        // pero forzamos un save inmediato por si el usuario sale antes.
        try {
            localStorage.setItem(storageKey, JSON.stringify(datos));
        } catch {
            /* QuotaExceeded — fallback al cron del browser */
        }
        setModalSalirAbierto(false);
        navigate('/marketplace');
    };

    const handleDescartarYSalir = () => {
        // Borrar fotos huérfanas de R2 según el modo:
        //
        // - MODO CREAR: todas las fotos del state son efímeras (el artículo
        //   no existe en BD). Se borran todas iterando `datos.fotos` — esto
        //   cubre tanto las subidas en esta sesión como las hidratadas
        //   desde un borrador en localStorage.
        //
        // - MODO EDICIÓN: el state mezcla fotos preexistentes del artículo
        //   guardado (NO deben tocarse — el endpoint del backend las
        //   conserva con reference count) con las nuevas subidas en esta
        //   sesión (sí deben borrarse porque nunca llegarán al backend).
        //   El set `urlsSubidasEnSesion` distingue ambas.
        //
        // Defensa en profundidad: el endpoint `DELETE /api/r2/imagen` hace
        // reference count contra IMAGE_REGISTRY, así que incluso si por
        // bug pasamos una URL en uso, NO se borraría.
        const urlsABorrar = esModoEdicion
            ? Array.from(urlsSubidasEnSesion.current)
            : datos.fotos;
        urlsABorrar.forEach((url) => {
            api.delete('/r2/imagen', { data: { url } }).catch(() => undefined);
        });
        urlsSubidasEnSesion.current.clear();
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
            localStorage.removeItem(storageKey);
        } catch {
            /* noop */
        }
    };

    // ─── Vista previa en vivo (desktop) ───────────────────────────────────────
    // El preview usa `CardArticuloFeed` (la card real del feed estilo Facebook)
    // para que el usuario vea EXACTAMENTE como se verá su publicación una vez
    // publicada. Por eso se construye un `ArticuloFeedInfinito` completo con
    // el vendedor (= usuario actual) y `topPreguntas: []` (artículo nuevo).
    //
    // Las interacciones (heart, hacer pregunta) se bloquean con
    // `pointer-events: none` en el wrapper — es solo preview, las acciones
    // no aplican porque el artículo aún no existe en BD.
    const articuloPreview: ArticuloFeedInfinito = useMemo(() => {
        const usuario = useAuthStore.getState().usuario;
        return {
            id: articuloId ?? 'preview',
            usuarioId: usuario?.id ?? '',
            titulo: datos.titulo || 'Título del artículo',
            descripcion: datos.descripcion || 'Descripción de tu artículo…',
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
            // Datos específicos de `ArticuloFeedInfinito` ─────────────────────
            vendedor: {
                id: usuario?.id ?? '',
                nombre: usuario?.nombre ?? 'Tú',
                apellidos: usuario?.apellidos ?? '',
                avatarUrl: usuario?.avatarUrl ?? null,
            },
            topPreguntas: [],
            guardado: false,
        };
    }, [datos, articuloId]);

    // ─── Render ───────────────────────────────────────────────────────────────

    if (esModoEdicion && articuloQuery.isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    return (
        <div data-testid="pagina-publicar-articulo" className="min-h-full bg-transparent pb-40 lg:pb-12">
            {/* ════════════════════════════════════════════════════════════════
                HEADER DARK STICKY — Identidad teal del MarketPlace.
                Mismo patrón que PaginaMarketplace (P1), PaginaArticuloMarketplace
                (P2) y PaginaPerfilVendedor (P3): fondo negro + glow teal
                radial + grid pattern. El icono Plus en gradient teal refuerza
                la continuidad con el FAB "+" del feed (entras al wizard desde
                ese botón y ves el mismo + arriba).
                La barra de progreso va INTEGRADA al final del header negro
                (sobre fondo dark) en lugar de en una banda blanca aparte.
            ════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-30">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil teal arriba-derecha */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.07) 0%, transparent 50%)',
                            }}
                        />
                        {/* Grid pattern sutil */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        {/* Contenido del header */}
                        <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5">
                            {/* Bloque izquierdo: ← + icono teal + "Nueva publicación" | Paso N de 3 */}
                            <div className="flex min-w-0 items-center gap-1.5">
                                <button
                                    data-testid="btn-atras-wizard"
                                    onClick={handleAtras}
                                    aria-label="Volver"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                                >
                                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                    }}
                                >
                                    <Plus
                                        className="h-[18px] w-[18px] text-black"
                                        strokeWidth={2.75}
                                    />
                                </div>
                                <span className="ml-1.5 shrink-0 text-xl font-extrabold tracking-tight text-white lg:text-2xl">
                                    {esModoEdicion ? (
                                        <>Editar <span className="text-teal-400">Publicación</span></>
                                    ) : (
                                        <>Nueva <span className="text-teal-400">Publicación</span></>
                                    )}
                                </span>

                                {/* Separador vertical — solo aparece cuando hay
                                    espacio suficiente para no cortar el título. */}
                                <span
                                    aria-hidden
                                    className="ml-2 hidden h-7 w-[1.5px] shrink-0 rounded-full bg-white/50 lg:block"
                                />

                                {/* Subtítulo "Paso N de 3" — visible solo en lg+,
                                    en móvil esa info ya la transmite la barra
                                    de progreso debajo. */}
                                <span className="ml-1 hidden min-w-0 shrink-0 text-sm font-semibold text-white/85 lg:inline lg:text-base">
                                    Paso {pasoActual} de 3
                                </span>
                            </div>

                            {/* Bloque derecho —
                                · Móvil: chip "Paso N/3" (el footer fijo del
                                  bottom aloja los botones de navegación).
                                · Desktop: botones de navegación inline
                                  (Anterior/Salir + Continuar/Publicar) — en
                                  desktop hay espacio de sobra y se ven mejor
                                  arriba que en una barra fija inferior. */}
                            <div className="flex shrink-0 items-center gap-1 lg:hidden">
                                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/80">
                                    Paso {pasoActual}/3
                                </span>
                            </div>
                            <div className="hidden shrink-0 items-center gap-2 lg:flex">
                                <button
                                    data-testid="btn-paso-anterior-header"
                                    onClick={handleAtras}
                                    disabled={guardando || subiendoBatch}
                                    title={
                                        subiendoBatch
                                            ? 'Espera a que terminen de subirse las fotos'
                                            : undefined
                                    }
                                    className="cursor-pointer rounded-lg border-2 border-white/25 bg-transparent px-4 py-1.5 text-sm font-bold text-white/85 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {pasoActual === 1 ? 'Salir' : 'Anterior'}
                                </button>
                                <button
                                    data-testid="btn-paso-continuar-header"
                                    onClick={handleContinuar}
                                    disabled={!puedeAvanzar || guardando}
                                    title={
                                        subiendoBatch
                                            ? 'Espera a que terminen de subirse las fotos'
                                            : undefined
                                    }
                                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-br from-teal-500 to-teal-700 px-5 py-1.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                                >
                                    {(guardando || subiendoBatch) && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {subiendoBatch
                                        ? 'Subiendo fotos…'
                                        : pasoActual < 3
                                            ? 'Continuar'
                                            : esModoEdicion
                                                ? 'Guardar cambios'
                                                : 'Publicar ahora'}
                                </button>
                            </div>
                        </div>

                        {/* Barra de progreso integrada — sobre fondo negro,
                            con segmentos teal-400 (más brillante para
                            destacar sobre el dark) y track white/20. */}
                        <div className="relative z-10 flex gap-1 px-3 pb-3 lg:pb-4">
                            {[1, 2, 3].map((p) => (
                                <div
                                    key={p}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                                        p <= pasoActual ? 'bg-teal-400' : 'bg-white/15'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO — wrapper único max-w-7xl, mismo ancho que el header.
                Grid desktop 3fr/2fr (no 60%/40%) para que el gap no produzca
                overflow horizontal — patrón establecido en P2 Detalle.
            ════════════════════════════════════════════════════════════════ */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-8 2xl:px-8">
                <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                    {/* ─── COLUMNA IZQUIERDA (full width en móvil) ───────── */}
                    <div className="space-y-5 py-4 lg:space-y-6 lg:py-0">
                        {pasoActual === 1 && (
                            <Paso1
                                datos={datos}
                                setDatos={setDatos}
                                errores={erroresPaso1}
                                esModoEdicion={esModoEdicion}
                                urlsSubidasEnSesion={urlsSubidasEnSesion}
                                setPendientesUpload={setPendientesUpload}
                                pendientesUpload={pendientesUpload}
                            />
                        )}
                        {pasoActual === 2 && (
                            <Paso2
                                datos={datos}
                                setDatos={setDatos}
                                errores={erroresPaso2}
                                esModoEdicion={esModoEdicion}
                                urlsSubidasEnSesion={urlsSubidasEnSesion}
                                setPendientesUpload={setPendientesUpload}
                            />
                        )}
                        {pasoActual === 3 && (
                            <Paso3
                                datos={datos}
                                setDatos={setDatos}
                                errores={erroresPaso3}
                                esModoEdicion={esModoEdicion}
                                urlsSubidasEnSesion={urlsSubidasEnSesion}
                                setPendientesUpload={setPendientesUpload}
                            />
                        )}
                    </div>

                    {/* ─── COLUMNA DERECHA — solo desktop, sticky.
                        Card "Vista previa" con la CardArticulo adentro +
                        card de tips, ambas con el patrón rounded-xl border-2
                        slate-300 bg-white shadow-md de P2. ──────────────── */}
                    <div className="hidden lg:block">
                        <div
                            className="sticky top-28 space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ maxHeight: 'calc(100vh - 8rem)' }}
                        >
                            {/* Vista previa — usa la MISMA CardArticuloFeed del
                                feed real para que el vendedor vea con fidelidad
                                cómo lucirá su publicación. La card ya trae sus
                                propios bordes en lg+ (rounded-xl border-2
                                slate-300), por eso el wrapper exterior NO lleva
                                border ni shadow (evita doble caja). El label
                                "Vista previa" va arriba como rotulado discreto.
                                `pointer-events: none` bloquea interacciones
                                (heart, preguntas) porque el artículo aún no
                                existe en BD.
                                Los tips se movieron a la columna izquierda
                                (dentro de cada paso) para llenar el vacío de
                                altura: la card del feed es alta y la columna
                                izquierda solía verse vacía abajo. ────────── */}
                            <div className="space-y-2">
                                {/* Card del preview va PRIMERO para que su
                                    borde superior se alinee con el primer
                                    bloque de la columna izquierda (Fotos).
                                    El label rotulado va debajo como pie de
                                    foto, sin desalinear la cuadrícula. */}
                                <div
                                    aria-hidden
                                    className="select-none"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {/* `claseAspectoGaleria` hace la galería
                                        más alta en el preview para que el
                                        sidebar de thumbnails muestre más
                                        miniaturas sin scroll. El feed real
                                        sigue usando el default 4:3 / 2:1. */}
                                    <CardArticuloFeed
                                        articulo={articuloPreview}
                                        claseAspectoGaleria="aspect-[4/3] lg:aspect-square"
                                    />
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                                    <h2 className="text-base font-bold text-slate-700">
                                        Vista previa
                                    </h2>
                                    <span className="text-sm font-medium text-slate-500">
                                        — así se verá en el feed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                FABs FLOTANTES — solo móvil. En desktop los botones viven
                en el bloque derecho del header dark.
                · FAB izquierdo (Salir/Anterior): circular pequeño, fondo
                  blanco con borde, esquina inferior izquierda.
                · FAB derecho (Continuar/Publicar): pill con texto + icono,
                  gradient teal, esquina inferior derecha — visualmente
                  prominente como acción principal.
                Ambos posicionados a `bottom-20` para flotar sobre el
                BottomNav (h-16) con respiro de 16px. En el último paso,
                el FAB derecho se ensancha con un icono `Check` para
                comunicar "publicar/guardar".
            ════════════════════════════════════════════════════════════════ */}
            <button
                type="button"
                data-testid="btn-paso-anterior"
                onClick={handleAtras}
                disabled={guardando || subiendoBatch}
                aria-label={pasoActual === 1 ? 'Salir' : 'Anterior'}
                title={
                    subiendoBatch
                        ? 'Espera a que terminen de subirse las fotos'
                        : pasoActual === 1
                            ? 'Salir'
                            : 'Anterior'
                }
                style={{
                    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.18)',
                    transition:
                        'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                }}
                className={`fixed left-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-700 shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden ${
                    bottomNavVisible ? 'bottom-20' : 'bottom-4'
                }`}
            >
                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
            </button>
            <button
                type="button"
                data-testid="btn-paso-continuar"
                onClick={handleContinuar}
                disabled={!puedeAvanzar || guardando}
                title={
                    subiendoBatch
                        ? 'Espera a que terminen de subirse las fotos'
                        : undefined
                }
                style={{
                    boxShadow: '0 6px 24px rgba(13, 148, 136, 0.45)',
                    transition:
                        'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                }}
                className={`fixed right-4 z-30 flex h-14 cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-teal-500 to-teal-700 px-6 text-sm font-bold text-white shadow-lg hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 lg:hidden ${
                    bottomNavVisible ? 'bottom-20' : 'bottom-4'
                }`}
            >
                {guardando || subiendoBatch ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                ) : pasoActual === 3 ? (
                    <Check className="h-5 w-5" strokeWidth={2.75} />
                ) : null}
                <span>
                    {subiendoBatch
                        ? 'Subiendo fotos…'
                        : pasoActual < 3
                            ? 'Continuar'
                            : esModoEdicion
                                ? 'Guardar cambios'
                                : 'Publicar ahora'}
                </span>
                {pasoActual < 3 && !guardando && !subiendoBatch && (
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                )}
            </button>

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

            {/* ─── Modal de rechazo duro (palabra prohibida) — patrón TC-6A
                con header gradiente rose (acción negativa), mismo modelo que
                "Salir sin publicar" pero con tonos rojos en lugar de teal. ── */}
            <ModalAdaptativo
                abierto={!!moderacionRechazo}
                onCerrar={() => {
                    setModeracionRechazo(null);
                    setPasoActual(1);
                }}
                ancho="md"
                mostrarHeader={false}
                paddingContenido="none"
                sinScrollInterno
                headerOscuro
                className="lg:max-w-sm 2xl:max-w-md"
            >
                {moderacionRechazo && (
                    <div data-testid="modal-rechazo-moderacion">
                        {/* Header gradiente rose */}
                        <div
                            className="relative overflow-hidden px-4 pt-6 pb-3 lg:px-3 lg:py-3 2xl:px-4 2xl:py-4 lg:rounded-t-2xl"
                            style={{
                                background:
                                    'linear-gradient(135deg, #be123c 0%, #881337 100%)',
                                boxShadow: '0 4px 16px rgba(190, 18, 60, 0.35)',
                            }}
                        >
                            <div className="relative flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <AlertCircle className="h-4 w-4 text-white" strokeWidth={2.25} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base font-bold text-white leading-tight 2xl:text-lg">
                                        No podemos publicar este contenido
                                    </h2>
                                    <p className="mt-0.5 text-sm font-medium text-white/80">
                                        Necesitamos que ajustes tu publicación
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Cuerpo */}
                        <div className="px-4 py-4 lg:px-3 lg:py-3 2xl:px-4 2xl:py-4">
                            <p className="text-center text-sm font-medium leading-relaxed text-slate-700 lg:text-sm 2xl:text-base">
                                {moderacionRechazo.mensaje}
                            </p>

                            {moderacionRechazo.palabraDetectada && (
                                <div className="mt-3 rounded-lg border-2 border-rose-200 bg-rose-50 px-3 py-2">
                                    <p className="text-xs font-medium text-rose-900">
                                        Palabra detectada:{' '}
                                        <span className="font-mono font-bold">
                                            {moderacionRechazo.palabraDetectada}
                                        </span>
                                    </p>
                                </div>
                            )}

                            <button
                                data-testid="btn-cerrar-rechazo"
                                onClick={() => {
                                    setModeracionRechazo(null);
                                    setPasoActual(1);
                                }}
                                className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-all duration-150 active:scale-[0.98] lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5"
                                style={{
                                    background: 'linear-gradient(to right, #0d9488, #115e59)',
                                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                                }}
                            >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Editar mi publicación
                            </button>
                        </div>
                    </div>
                )}
            </ModalAdaptativo>
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
    /**
     * Si el wizard está en modo edición (URL trae `:articuloId`). Necesario
     * para el cleanup de R2: en modo crear, todas las fotos del state son
     * efímeras y se borran de R2 al quitarlas; en modo edición, las fotos
     * preexistentes pertenecen al artículo guardado y NO deben tocarse — el
     * backend hace el diff al guardar.
     */
    esModoEdicion: boolean;
    /**
     * Set compartido con el padre que rastrea las URLs subidas a R2 durante
     * ESTA sesión del wizard. El padre lo usa en `handleDescartarYSalir`
     * para limpiar R2 en modo edición. Vive en el padre porque persiste
     * cuando el usuario navega entre pasos (Paso1/Paso2/Paso3 se desmontan
     * pero el padre no).
     */
    urlsSubidasEnSesion: React.MutableRefObject<Set<string>>;
    /**
     * Setter del contador de uploads pendientes. Solo Paso1 lo modifica,
     * pero vive en el padre para que (a) el botón "Continuar" se bloquee
     * cuando hay batch en curso y (b) React no advierta de setState en
     * componente desmontado si Paso1 desaparece mientras el batch corre.
     */
    setPendientesUpload: React.Dispatch<React.SetStateAction<number>>;
}

/** Props extra que solo recibe Paso1 (lectura del contador de uploads). */
interface Paso1Props extends PasoProps {
    pendientesUpload: number;
}

// ─── PASO 1 — Fotos + Título ───────────────────────────────────────────────

function Paso1({
    datos,
    setDatos,
    errores,
    esModoEdicion,
    urlsSubidasEnSesion,
    pendientesUpload,
    setPendientesUpload,
}: Paso1Props) {
    const upload = useSubirFotoMarketplace();

    // Estado del ModalImagenes (lightbox al hacer click en una foto del grid).
    // null = cerrado. número = índice de la foto a mostrar como inicial.
    const [modalImagenIdx, setModalImagenIdx] = useState<number | null>(null);
    // El set `urlsSubidasEnSesion` viene del padre — persiste entre pasos
    // (Paso1 se desmonta cuando el usuario va al paso 2, pero el ref vive
    // arriba). Solo se consulta en MODO EDICIÓN para diferenciar fotos
    // nuevas (borrables) de las preexistentes del artículo guardado.
    // En MODO CREAR todas las fotos del state son efímeras: el botón X
    // y el descartar borran TODO, incluyendo las hidratadas desde un
    // borrador en localStorage.

    // El contador `pendientesUpload` también vive en el padre: así (1) el
    // botón "Continuar" del footer se bloquea cuando hay batch en curso,
    // y (2) si Paso1 se desmonta mientras un batch sigue corriendo, el
    // setter sigue siendo válido (el padre no se desmontó), evitando el
    // warning de React "update on unmounted component".
    const subiendoBatch = pendientesUpload > 0;

    const handleAgregarFotos = async (files: File[]) => {
        if (files.length === 0) return;

        const espacioRestante = MAX_FOTOS - datos.fotos.length;
        if (espacioRestante <= 0) {
            notificar.advertencia(`Ya tienes el máximo de ${MAX_FOTOS} fotos`);
            return;
        }

        // Si seleccionaron más fotos que el espacio disponible, tomar las
        // primeras y avisar.
        const filesAProcesar = files.slice(0, espacioRestante);
        if (files.length > espacioRestante) {
            notificar.advertencia(
                `Solo se pueden agregar ${espacioRestante} foto${espacioRestante === 1 ? '' : 's'} más (máx. ${MAX_FOTOS})`
            );
        }

        setPendientesUpload((p) => p + filesAProcesar.length);

        // Subir en paralelo — el hook maneja optimización a WebP + presigned
        // URL + PUT a R2 por archivo. Promise.all permite que todas corran
        // concurrentemente; el navegador limita conexiones HTTP de todas
        // formas (~6 por dominio), así que no satura el backend.
        const resultados = await Promise.all(
            filesAProcesar.map((file) => upload.subir(file).catch(() => null))
        );

        setPendientesUpload((p) => Math.max(0, p - filesAProcesar.length));

        const urlsExitosas = resultados.filter((url): url is string => !!url);
        const fallidas = filesAProcesar.length - urlsExitosas.length;

        if (urlsExitosas.length > 0) {
            urlsExitosas.forEach((url) => urlsSubidasEnSesion.current.add(url));
            setDatos((d) => ({ ...d, fotos: [...d.fotos, ...urlsExitosas] }));
        }

        // Feedback al usuario según el resultado.
        if (fallidas > 0 && urlsExitosas.length === 0) {
            notificar.error('No se pudo subir ninguna foto. Intenta de nuevo.');
        } else if (fallidas > 0) {
            notificar.advertencia(
                `Se subieron ${urlsExitosas.length} foto${urlsExitosas.length === 1 ? '' : 's'}, ${fallidas} fallaron`
            );
        } else if (urlsExitosas.length > 1) {
            notificar.exito(`${urlsExitosas.length} fotos agregadas`);
        }
    };

    const handleQuitarFoto = (idx: number) => {
        const urlAQuitar = datos.fotos[idx];
        if (urlAQuitar) {
            // Decidir si borrar de R2:
            // - Modo CREAR: borrar SIEMPRE. Todas las fotos del state son
            //   efímeras (el artículo no existe en BD) — incluso las que
            //   vienen de un borrador hidratado deben borrarse al quitarlas.
            // - Modo EDICIÓN: borrar SOLO las subidas en esta sesión. Las
            //   preexistentes del artículo guardado las maneja el backend
            //   con `eliminarFotoMarketplaceSiHuerfana` al hacer submit
            //   (diff de fotos viejas vs nuevas en `actualizarArticulo`).
            const subidaEnSesion = urlsSubidasEnSesion.current.has(urlAQuitar);
            const debeBorrarse = !esModoEdicion || subidaEnSesion;

            if (debeBorrarse) {
                if (subidaEnSesion) urlsSubidasEnSesion.current.delete(urlAQuitar);
                // Fire-and-forget — el endpoint del backend valida con
                // reference count contra IMAGE_REGISTRY (defensa en
                // profundidad: si por bug la URL sigue en uso, no se borra).
                api.delete('/r2/imagen', { data: { url: urlAQuitar } }).catch(() => {
                    // Silencioso: el reconcile periódico la limpiará si falló.
                });
            }
        }
        setDatos((d) => {
            const fotos = d.fotos.filter((_, i) => i !== idx);
            // Si quitamos la portada, la primera del array queda como portada
            // por default. Si quitamos una anterior a la portada, ajustamos
            // el índice para que apunte a la misma foto.
            const fotoPortadaIndex =
                idx === d.fotoPortadaIndex
                    ? 0
                    : idx < d.fotoPortadaIndex
                        ? d.fotoPortadaIndex - 1
                        : d.fotoPortadaIndex;
            return { ...d, fotos, fotoPortadaIndex };
        });
    };

    // Cambia la portada al índice indicado. No reordena el array —
    // simplemente apunta `fotoPortadaIndex` a la foto seleccionada. Así el
    // usuario puede subir 8 fotos en cualquier orden y luego decidir cuál es
    // la portada sin re-arrastrar nada.
    const handleHacerPortada = (idx: number) => {
        if (idx === datos.fotoPortadaIndex) return;
        setDatos((d) => ({ ...d, fotoPortadaIndex: idx }));
        notificar.exito('Portada actualizada');
    };

    const espacioRestante = MAX_FOTOS - datos.fotos.length;

    const puedeAgregarMas = espacioRestante > 0 && !subiendoBatch;

    return (
        <div className="space-y-4 lg:space-y-5">
            {/* Card: Título — arriba, ocupando el ancho completo del paso. */}
            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                <label className="block text-base font-bold text-slate-900 lg:text-lg">
                    Título de tu publicación
                </label>
                <p className="mt-0.5 text-sm font-medium text-slate-600">
                    Marca, modelo y estado en pocas palabras.
                </p>
                <input
                    data-testid="input-titulo"
                    type="text"
                    value={datos.titulo}
                    onChange={(e) =>
                        setDatos((d) => ({ ...d, titulo: e.target.value.slice(0, TITULO_MAX) }))
                    }
                    placeholder="Bicicleta vintage Rinos restaurada"
                    className="mt-2 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                />
                <div className="mt-1.5 flex justify-between text-sm font-medium text-slate-500">
                    <span className={errores.titulo ? 'text-rose-600' : ''}>
                        {errores.titulo ?? `Mínimo ${TITULO_MIN} caracteres`}
                    </span>
                    <span>
                        {datos.titulo.length}/{TITULO_MAX}
                    </span>
                </div>
            </div>

            {/* Card: Fotos — header simple del wizard + grid con patrón
                visual heredado de BS Mi Perfil (Galería de Fotos): cada
                slot trae hover-zoom de la imagen y bottom bar con gradient
                oscuro que aloja los botones Star (hacer portada) y Trash2
                (eliminar). Click en la imagen abre `ModalImagenes` para
                verla a tamaño completo. */}
            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-slate-900 lg:text-lg">
                                Fotos
                            </h2>
                        <p className="mt-0.5 text-sm font-medium text-slate-600">
                            Sube hasta {MAX_FOTOS} fotos al mismo tiempo. Toca{' '}
                            <Star
                                className="inline h-3.5 w-3.5 text-amber-500"
                                strokeWidth={2.5}
                                fill="currentColor"
                            />{' '}
                            en cualquier foto para marcarla como portada.
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {datos.fotos.length}/{MAX_FOTOS}
                    </span>
                </div>
                {errores.fotos && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errores.fotos}
                    </p>
                )}

                {/* Estado vacío — invita a agregar fotos con un slot
                    grande clickeable. Aparece cuando no hay fotos subidas
                    y no hay batch en curso. */}
                {datos.fotos.length === 0 && !subiendoBatch ? (
                    <label
                        data-testid="slot-agregar-foto"
                        className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-teal-400 hover:bg-teal-50"
                    >
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                if (files.length > 0) {
                                    void handleAgregarFotos(files);
                                }
                                e.target.value = '';
                            }}
                        />
                        <ImagePlus
                            className="h-10 w-10 text-slate-400"
                            strokeWidth={1.5}
                        />
                        <p className="mt-2 text-sm font-bold text-slate-700">
                            Agrega tus primeras fotos
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                            Hasta {MAX_FOTOS} al mismo tiempo · JPG / PNG / WebP
                        </p>
                    </label>
                ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-4">
                        {datos.fotos.map((url, idx) => {
                            const esPortada = idx === datos.fotoPortadaIndex;
                            return (
                                <div
                                    key={url}
                                    data-testid={`slot-foto-${idx}`}
                                    className={`group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all ${
                                        esPortada
                                            ? 'border-teal-500 ring-2 ring-teal-300'
                                            : 'border-slate-300'
                                    }`}
                                    onClick={() => setModalImagenIdx(idx)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Ver foto ${idx + 1} en tamaño completo`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setModalImagenIdx(idx);
                                        }
                                    }}
                                >
                                    <img
                                        src={url}
                                        alt={`Foto ${idx + 1}`}
                                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                                    />

                                    {/* Badge PORTADA — esquina superior izq. */}
                                    {esPortada && (
                                        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                                            <Star
                                                className="h-2.5 w-2.5"
                                                strokeWidth={3}
                                                fill="currentColor"
                                            />
                                            Portada
                                        </span>
                                    )}

                                    {/* Bottom bar con gradient oscuro y botones
                                        de acción (patrón heredado de BS Mi
                                        Perfil). Los clicks en estos botones
                                        NO deben propagar al wrapper que abre
                                        el ModalImagenes — por eso usamos
                                        `stopPropagation`. */}
                                    <div
                                        className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2 py-2"
                                        style={{
                                            background:
                                                'linear-gradient(to top, rgba(0,0,0,0.82), transparent)',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Hacer portada — solo si NO es la actual */}
                                        {!esPortada ? (
                                            <button
                                                type="button"
                                                data-testid={`btn-hacer-portada-${idx}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleHacerPortada(idx);
                                                }}
                                                aria-label="Marcar como portada"
                                                title="Marcar como portada"
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-amber-500 active:scale-95"
                                            >
                                                <Star
                                                    className="h-4 w-4"
                                                    strokeWidth={2.5}
                                                />
                                            </button>
                                        ) : (
                                            <span />
                                        )}

                                        {/* Eliminar foto */}
                                        <button
                                            type="button"
                                            data-testid={`btn-quitar-foto-${idx}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuitarFoto(idx);
                                            }}
                                            aria-label="Quitar foto"
                                            title="Quitar foto"
                                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-red-600 active:scale-95"
                                        >
                                            <Trash2
                                                className="h-4 w-4"
                                                strokeWidth={2.25}
                                            />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Placeholders fantasma — estilo BS Mi Perfil:
                            fondo slate-800 + blur + spinner. Uno por cada
                            foto pendiente del batch en curso. */}
                        {subiendoBatch &&
                            Array.from({ length: pendientesUpload }).map((_, i) => (
                                <div
                                    key={`pending-${i}`}
                                    className="relative aspect-square overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-800 shadow-sm"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                        <Loader2
                                            className="h-8 w-8 animate-spin text-white drop-shadow-lg"
                                            strokeWidth={2}
                                        />
                                    </div>
                                </div>
                            ))}

                        {/* Slot "Agregar más" — siempre disponible mientras
                            queda espacio y no haya batch en curso. Comparte
                            estética de slot dashed para indicar que es una
                            acción de agregar, no una foto subida. */}
                        {puedeAgregarMas && (
                            <label
                                data-testid="slot-agregar-foto"
                                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600"
                            >
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files ?? []);
                                        if (files.length > 0) {
                                            void handleAgregarFotos(files);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                                <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                                <span className="mt-1 text-xs font-medium">
                                    Agregar más
                                </span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            {/* Tips contextuales del paso */}
            <TipsPaso paso={1} />

            {/* Lightbox — se abre al hacer click en una foto del grid.
                Usa portal a document.body. */}
            <ModalImagenes
                images={datos.fotos}
                initialIndex={modalImagenIdx ?? 0}
                isOpen={modalImagenIdx !== null}
                onClose={() => setModalImagenIdx(null)}
            />
        </div>
    );
}

// ─── PASO 2 — Precio + Detalles ────────────────────────────────────────────

function Paso2({ datos, setDatos, errores }: PasoProps) {
    return (
        <div className="space-y-4 lg:space-y-5">
            {/* Card: Precio */}
            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                <label className="block text-base font-bold text-slate-900 lg:text-lg">
                    Precio
                </label>
                <p className="mt-0.5 text-sm font-medium text-slate-600">
                    Compara con anuncios similares para fijar uno competitivo.
                </p>
                <div className="mt-2 flex items-center rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 focus-within:border-teal-500">
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
                    <p className="mt-1.5 text-xs font-medium text-rose-600">{errores.precio}</p>
                )}
            </div>

            {/* Card: Condición + Acepta ofertas */}
            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                <label className="block text-base font-bold text-slate-900 lg:text-lg">
                    Condición
                </label>
                <p className="mt-0.5 text-sm font-medium text-slate-600">
                    Sé honesto: los compradores valoran la transparencia.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {CONDICIONES.map((c) => (
                        <button
                            key={c.valor}
                            data-testid={`chip-condicion-${c.valor}`}
                            onClick={() => setDatos((d) => ({ ...d, condicion: c.valor }))}
                            aria-pressed={datos.condicion === c.valor}
                            className={`cursor-pointer rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
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
                    <p className="mt-1.5 text-xs font-medium text-rose-600">{errores.condicion}</p>
                )}

                {/* Toggle Acepta ofertas — separado con border-t */}
                <div className="mt-3 flex items-center justify-between border-t-2 border-slate-200 pt-3">
                    <div className="min-w-0 flex-1 pr-3">
                        <div className="text-sm font-bold text-slate-900">¿Acepta ofertas?</div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                            El comprador podrá negociar por chat.
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
            </div>

            {/* Card: Descripción */}
            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                <label className="block text-base font-bold text-slate-900 lg:text-lg">
                    Descripción
                </label>
                <p className="mt-0.5 text-sm font-medium text-slate-600">
                    Detalles que ayuden al comprador: medidas, fallas, accesorios incluidos.
                </p>
                <textarea
                    data-testid="input-descripcion"
                    value={datos.descripcion}
                    onChange={(e) =>
                        setDatos((d) => ({
                            ...d,
                            descripcion: e.target.value.slice(0, DESCRIPCION_MAX),
                        }))
                    }
                    rows={5}
                    placeholder="Bicicleta restaurada con piezas originales Shimano…"
                    className="mt-2 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                />
                <div className="mt-1.5 flex justify-between text-sm font-medium text-slate-500">
                    <span className={errores.descripcion ? 'text-rose-600' : ''}>
                        {errores.descripcion ?? `Mínimo ${DESCRIPCION_MIN} caracteres`}
                    </span>
                    <span>
                        {datos.descripcion.length}/{DESCRIPCION_MAX}
                    </span>
                </div>
            </div>

            {/* Tips contextuales del paso */}
            <TipsPaso paso={2} />
        </div>
    );
}

// ─── PASO 3 — Ubicación + Confirmación ────────────────────────────────────

function Paso3({ datos, setDatos, errores, esModoEdicion }: PasoProps) {
    const tieneUbicacion = datos.latitud != null && datos.longitud != null;

    return (
        <div className="space-y-4 lg:space-y-5">
            {/* Card: Zona aproximada (mapa). */}
            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                <h2 className="text-base font-bold text-slate-900 lg:text-lg">
                    Zona aproximada
                </h2>
                <p className="mt-0.5 text-sm font-medium text-slate-600">
                    Mostraremos un círculo de 500m, no tu dirección exacta.
                </p>
                {!tieneUbicacion ? (
                    <div className="mt-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 lg:p-4">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                            <div>
                                <strong className="font-bold">Necesitamos tu ubicación</strong>
                                <p className="mt-0.5 text-sm font-medium">
                                    Activa el GPS de tu dispositivo o selecciona tu ciudad
                                    desde el navegador superior para continuar.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // `relative z-0 isolate` crea un stacking context propio
                    // para que los z-index internos de Leaflet (capas tile,
                    // overlay, popup ~400+) no escapen y se monten encima del
                    // header sticky del wizard, el BottomNav u otros elementos
                    // fijos. Mismo patrón aplicado en `MapaUbicacion.tsx` de
                    // P2 Detalle del Artículo.
                    <div className="relative z-0 mt-3 overflow-hidden rounded-xl border-2 border-slate-200 isolate">
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
                            className="h-48 w-full lg:h-72"
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
                    <p className="mt-2 text-sm font-bold text-slate-700">
                        📍 {datos.zonaAproximada}
                    </p>
                )}
                {errores.ubicacion && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">{errores.ubicacion}</p>
                )}
            </div>

            {/* Card: Resumen — vista rápida antes de publicar */}
                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                    <h2 className="mb-2 text-base font-bold text-slate-900 lg:text-lg">
                        Resumen
                    </h2>
                    <div className="flex gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 p-2.5 lg:p-3">
                        {datos.fotos[0] ? (
                            <img
                                src={datos.fotos[0]}
                                alt="Portada"
                                className="h-20 w-20 shrink-0 rounded-lg border-2 border-white object-cover shadow-sm lg:h-20 lg:w-20"
                            />
                        ) : (
                            <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-white bg-slate-200 lg:h-20 lg:w-20" />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-900 lg:text-base">
                                {datos.titulo || 'Sin título'}
                            </div>
                            <div className="mt-0.5 text-lg font-extrabold text-teal-700 lg:text-xl">
                                ${parseInt(datos.precio || '0', 10).toLocaleString('es-MX')}
                                <span className="ml-1 text-xs font-bold text-slate-500">MXN</span>
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-slate-500">
                                {datos.aceptaOfertas ? 'Acepta ofertas · ' : ''}
                                {CONDICIONES.find((c) => c.valor === datos.condicion)?.etiqueta ?? ''}
                            </div>
                        </div>
                    </div>
                </div>

            {/* Card: Checklist (solo modo crear) */}
            {!esModoEdicion && (
                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                    <h3 className="text-base font-bold text-slate-900 lg:text-lg">
                        Antes de publicar
                    </h3>
                    <p className="mt-0.5 text-sm font-medium text-slate-600">
                        Confirma estos 3 puntos para activar el botón "Publicar".
                    </p>
                    <div className="mt-3 space-y-2">
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
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                                    datos.checklist[item.key]
                                        ? 'border-teal-300 bg-teal-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
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
                                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                            </label>
                        ))}
                    </div>
                    {errores.checklist && (
                        <p className="mt-1.5 text-xs font-medium text-rose-600">{errores.checklist}</p>
                    )}
                </div>
            )}

            {/* Tips contextuales del paso */}
            <TipsPaso paso={3} />
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTE — TipsPaso
// =============================================================================

/**
 * Card de tips contextuales que aparece al final de cada paso del wizard.
 * Reemplaza la card de tips genéricos que vivía en el panel sticky derecho.
 * Sirve para llenar el vacío vertical de la columna izquierda (la card del
 * feed en el panel derecho es alta y la izquierda solía quedar corta).
 *
 * Mismo patrón visual que las cards del paso: mx-3 lg:mx-0 rounded-xl border-2
 * border-slate-300 shadow-md. Icono Lightbulb amber + bullets teal.
 */
function TipsPaso({ paso }: { paso: 1 | 2 | 3 }) {
    const { titulo, tips, cierre } = TIPS_POR_PASO[paso];
    return (
        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
            <div className="flex items-center gap-2">
                <Lightbulb
                    className="h-4 w-4 shrink-0 text-amber-500"
                    strokeWidth={2.5}
                />
                <h2 className="text-base font-bold text-slate-900 lg:text-lg">
                    {titulo}
                </h2>
            </div>
            <ul className="mt-2 space-y-1 text-sm font-medium leading-relaxed text-slate-700 lg:space-y-1.5">
                {tips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2">
                        <span className="shrink-0 text-teal-600">•</span>
                        <span>{tip}</span>
                    </li>
                ))}
            </ul>
            {cierre && (
                <p className="mt-3 border-t-2 border-slate-200 pt-2.5 text-sm font-medium leading-relaxed text-slate-500">
                    {cierre}
                </p>
            )}
        </div>
    );
}

export default PaginaPublicarArticulo;
