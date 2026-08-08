/**
 * ComposerDinamicas.tsx
 * =======================
 * Formulario de creación/edición de una Dinámica — estructura calcada 1:1 de
 * `ComposerMarketplace.tsx` (header, identidad, título/descripción con scroll
 * unificado, fotos en grid, chip bar con iconos + revelado progresivo,
 * checklist legal de footer), con identidad visual PROPIA: gradiente ámbar
 * (mismo tono que CardYA) en vez del teal de MarketPlace, para que Dinámicas
 * se sienta como su propia sub-sección aunque viva dentro de MarketPlace.
 *
 * Diferencia funcional con MP: hay DOS acciones de submit, no una —
 * "Guardar" (crea/edita en estado 'borrador', sin checklist legal) y
 * "Publicar" (exige los campos completos + las 3 confirmaciones, pasa a
 * estado 'activa'). Refleja que Dinámicas sí tiene un estado borrador
 * persistido en servidor (MarketPlace no lo tiene — crear ahí es publicar).
 *
 * Sin moderación de "sugerencia suave": el filtro reducido de Dinámicas
 * (`dinamicas/filtros.ts`) solo tiene categorías de rechazo duro, así que el
 * submit solo maneja 3 caminos: éxito / rechazo duro (422) / error HTTP.
 *
 * Ubicación: apps/web/src/components/dinamicas/composer/ComposerDinamicas.tsx
 */

import { useEffect, useRef, useState } from 'react';
import {
    X,
    Loader2,
    Image as ImageIcon,
    Camera,
    Video,
    Info,
    Trash2,
    Play,
    Check,
    ChevronDown,
    Gift,
    Dices,
    Hash,
    Ticket,
    CalendarClock,
    Scale,
    Copy,
    Trophy,
} from 'lucide-react';
import {
    useComposerDinamicas,
    type ComposerDinamicasDraft,
    type CampoErrorComposerDinamica,
    TITULO_MIN,
    TITULO_MAX,
    DESC_MIN,
    DESC_MAX,
    parseEnteroPositivo,
} from '../../../hooks/useComposerDinamicas';
import { useFotosUploaderDinamicas, MAX_FOTOS_COMPOSER_DINAMICA } from '../../../hooks/useFotosUploaderDinamicas';
import { DatePicker } from '../../ui/DatePicker';
import { CustomSelect } from '../../ui/CustomSelect';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import {
    useCrearDinamica,
    useEditarBorradorDinamica,
    usePublicarDinamica,
    useDinamica,
} from '../../../hooks/queries/useDinamicas';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { notificar } from '../../../utils/notificaciones';
import type { CrearDinamicaPayload, MetodoSorteo, TipoPremio, ReglaDesempate, Dinamica } from '../../../types/dinamicas';

const CONFIRMACIONES_VERSION = 'v1-2026-08-03';

// Gradiente de marca propio de Dinámicas — ámbar, mismo tono que CardYA
// (apps/web/src/pages/private/cardya/PaginaCardYA.tsx), distinto del teal de
// MarketPlace.
const GRADIENTE_DINAMICAS = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

// `DatePicker` y `CustomSelect` (components/ui) se comparten con Ofertas/Mi
// Perfil/Reportes/Business Studio — no se tocan los archivos compartidos. En
// vez de eso, se reskin SOLO aquí vía selector de hijo directo + `!`
// (important) sobre su botón disparador, que trae sus propios colores/radio
// fijos (`rounded-lg`, `border-slate-300`). El menú desplegable de ambos se
// renderiza en un portal aparte (`document.body`), así que este selector
// nunca lo alcanza ni lo desestiliza — solo afecta el botón visible antes de
// abrir. El override de borde es incondicional a propósito: ninguno de los
// dos componentes aplica un borde MÁS ancho al abrir (solo cambia el color/
// ring), así que forzar aquí solo el color es seguro en cualquier estado.
const ESTILO_TRIGGER_AMBER =
    '[&>button]:!h-auto [&>button]:!rounded-full [&>button]:!border-2 [&>button]:!border-amber-400 [&>button]:!py-2 [&>button]:!px-4 [&>button]:!text-[15px] [&>button:hover]:!border-amber-500';

// ─── Fecha + hora límite: DatePicker para la fecha + CustomSelect (ambos ya
// existen en components/ui) para la hora, con una lista propia de opciones
// en incrementos de 30 min — no hay un "selector de hora" con horas
// predefinidas ya armado en el repo (el único "TimePicker" es un reloj
// táctil local de horarios de negocio, con otra firma/propósito), pero el
// MECANISMO del dropdown (CustomSelect) sí se reusa igual que en MP. ──
function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** Hoy en formato YYYY-MM-DD (local) — límite mínimo seleccionable. */
function hoyISO(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}-${pad2(hoy.getDate())}`;
}

/** Combina fecha (YYYY-MM-DD) + hora (HH:mm), ambas en hora LOCAL, a un ISO
 *  string en UTC (mismo formato que espera el backend). */
function combinarFechaHora(fecha: string, hora: string): string {
    if (!fecha) return '';
    return new Date(`${fecha}T${hora || '18:00'}:00`).toISOString();
}

/** Descompone un ISO string (UTC) a sus partes de fecha/hora LOCALES para
 *  mostrarlas en el DatePicker + el CustomSelect de hora. */
function descomponerFechaHora(iso: string): { fecha: string; hora: string } {
    if (!iso) return { fecha: '', hora: '18:00' };
    const d = new Date(iso);
    return {
        fecha: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
        hora: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    };
}

const OPCIONES_HORA: { valor: string; etiqueta: string }[] = Array.from({ length: 48 }, (_, i) => {
    const horas24 = Math.floor(i / 2);
    const minutos = i % 2 === 0 ? '00' : '30';
    const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
    const sufijo = horas24 < 12 ? 'a.m.' : 'p.m.';
    return { valor: `${pad2(horas24)}:${minutos}`, etiqueta: `${horas12}:${minutos} ${sufijo}` };
});

interface ComposerDinamicasProps {
    modo: 'crear' | 'editar';
    dinamicaId: string | null;
    onColapsar: () => void;
    registrarIntentarCerrar: (fn: () => boolean) => void;
    onReforzarGuardia: () => void;
}

function dinamicaAlDraft(d: Dinamica): Partial<ComposerDinamicasDraft> {
    return {
        titulo: d.titulo,
        descripcion: d.descripcion ?? '',
        fotosPremio: d.fotosPremio,
        tipoPremio: d.tipoPremio,
        metodoSorteo: d.metodoSorteo,
        numeroTotalBoletos: d.numeroTotalBoletos !== null ? String(d.numeroTotalBoletos) : '',
        numeroBoletoInicial: String(d.numeroBoletoInicial),
        precioBoleto: d.precioBoleto ?? '',
        fechaLimiteInscripcion: d.fechaLimiteInscripcion ?? '',
        reglaDesempate: d.reglaDesempate,
        numeroLugaresGanadores: String(d.numeroLugaresGanadores),
        numeroIntentosSorteo: d.numeroIntentosSorteo !== null ? String(d.numeroIntentosSorteo) : '',
    };
}

type Seccion = 'tipoPremio' | 'metodoSorteo' | 'boletos' | 'fecha' | 'reglaDesempate' | null;

export function ComposerDinamicas({
    modo,
    dinamicaId,
    onColapsar,
    registrarIntentarCerrar,
    onReforzarGuardia,
}: ComposerDinamicasProps) {
    const esEdicion = modo === 'editar' && !!dinamicaId;
    const usuario = useAuthStore((s) => s.usuario);
    const nombreUsuario = usuario?.nombre ?? '';
    const avatarUsuario = usuario?.avatarUrl ?? null;
    const ciudadGps = useGpsStore((s) => s.ciudad?.nombre ?? null);

    const storageNamespace = esEdicion ? `edit-${dinamicaId}` : undefined;
    const {
        draft,
        actualizar,
        setConfirmacionesUnificadas,
        sembrarUbicacion,
        limpiar,
        hidratarDesdeDinamica,
        errores,
        valido,
        mensajeBoton,
        validoGuardar,
        mensajeBotonGuardar,
        confirmacionesCompletas,
        estaIntacto,
    } = useComposerDinamicas({ storageNamespace });

    // Siembra automática de ciudad (GPS) — no cuenta como "cambio del usuario".
    useEffect(() => {
        if (!draft.ciudad && ciudadGps) sembrarUbicacion(ciudadGps);
    }, [draft.ciudad, ciudadGps, sembrarUbicacion]);

    // Hidratación en edición (una sola vez cuando carga la Dinámica).
    const dinamicaQuery = useDinamica(esEdicion ? dinamicaId : null);
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (!esEdicion) return;
        if (!dinamicaQuery.data || hidratadoRef.current) return;
        hidratadoRef.current = true;
        hidratarDesdeDinamica(dinamicaAlDraft(dinamicaQuery.data));
    }, [esEdicion, dinamicaQuery.data, hidratarDesdeDinamica]);

    // Id real de la Dinámica una vez que ya se guardó como borrador en esta
    // sesión (modo 'crear' empieza sin id — el primer "Guardar"/"Publicar"
    // la crea; los siguientes ya editan esa misma fila).
    const [dinamicaIdActual, setDinamicaIdActual] = useState<string | null>(dinamicaId);

    // Fecha y hora límite como estado LOCAL independiente (no derivado de
    // `draft.fechaLimiteInscripcion` en cada render) — con derivado puro,
    // elegir la hora ANTES que la fecha se perdía en silencio: `combinarFechaHora`
    // no puede formar un ISO sin fecha, así que devolvía '' y en el siguiente
    // render la hora "elegida" volvía a mostrarse como el default (18:00) sin
    // aviso de error. Con estado propio, cada pieza se recuerda aunque la otra
    // todavía esté vacía, sin importar el orden en que el usuario las llene.
    const [fechaSel, setFechaSel] = useState('');
    const [horaSel, setHoraSel] = useState('18:00');
    const fechaHidratadaRef = useRef(false);
    useEffect(() => {
        if (fechaHidratadaRef.current || !draft.fechaLimiteInscripcion) return;
        fechaHidratadaRef.current = true;
        const { fecha, hora } = descomponerFechaHora(draft.fechaLimiteInscripcion);
        setFechaSel(fecha);
        setHoraSel(hora);
    }, [draft.fechaLimiteInscripcion]);

    function actualizarFecha(nuevaFecha: string) {
        setFechaSel(nuevaFecha);
        actualizar({ fechaLimiteInscripcion: combinarFechaHora(nuevaFecha, horaSel) });
    }
    function actualizarHora(nuevaHora: string) {
        setHoraSel(nuevaHora);
        actualizar({ fechaLimiteInscripcion: combinarFechaHora(fechaSel, nuevaHora) });
    }

    // Auto-crece la descripción con su `scrollHeight` (nunca genera su propio
    // scroll interno) — el único scroll de la zona título-hacia-abajo es el
    // del contenedor que envuelve descripción+fotos+panel. Mismo mecanismo
    // que `ComposerMarketplace.tsx`; sin esto el textarea se queda a altura
    // fija y el texto que no cabe queda invisible en vez de hacer crecer el
    // scroll de afuera.
    const descripcionRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        const el = descripcionRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [draft.descripcion]);

    const urlsSubidasEnSesion = useRef<Set<string>>(new Set());
    const fotosUploader = useFotosUploaderDinamicas({
        fotos: draft.fotosPremio,
        onCambioFotos: (fotos) => actualizar({ fotosPremio: fotos }),
        urlsSubidasEnSesion,
    });

    const crearMutation = useCrearDinamica();
    const editarMutation = useEditarBorradorDinamica();
    const publicarMutation = usePublicarDinamica();
    const enviando = crearMutation.isPending || editarMutation.isPending || publicarMutation.isPending;

    const [seccionAbierta, setSeccionAbierta] = useState<Seccion>(null);
    // Al abrir un panel, el card queda al fondo del contenido scrollable
    // (después de descripción/fotos, que es donde se renderiza) — sin esto,
    // con descripción larga o varias fotos el usuario tendría que scrollear
    // a mano para verlo. Mismo mecanismo que ComposerMarketplace.tsx.
    const scrollContenidoRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!seccionAbierta) return;
        const el = scrollContenidoRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [seccionAbierta]);
    const [confirmandoCierre, setConfirmandoCierre] = useState(false);
    // Los chips/mensajes de error solo se pintan en rojo DESPUÉS del primer
    // intento de Guardar/Publicar — mostrarlos desde que el formulario está
    // vacío se ve como si el usuario ya hubiera hecho algo mal sin haber
    // tocado nada.
    const [intentoEnvio, setIntentoEnvio] = useState(false);

    // ─── Popup "Tomar foto" / "Grabar video" sobre el chip Cámara (solo
    // móvil, mismo patrón que ComposerMarketplace) ──────────────────────
    const [menuCamaraAbierto, setMenuCamaraAbierto] = useState(false);
    const menuCamaraRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!menuCamaraAbierto) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-menu-toggle-camara-dinamicas]')) return;
            if (menuCamaraRef.current && !menuCamaraRef.current.contains(target)) {
                setMenuCamaraAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuCamaraAbierto]);

    // ─── Cierre con confirmación si hay cambios sin guardar ────────────
    // Una sola función para las 2 rutas de cierre (botón X y back nativo /
    // click fuera del modal, este último manejado por el padre vía
    // `registrarIntentarCerrar`) — evita 2 copias de la misma lógica.
    function intentarCerrar(): boolean {
        if (estaIntacto) {
            onColapsar();
            return true;
        }
        setConfirmandoCierre(true);
        onReforzarGuardia();
        return false;
    }

    useEffect(() => {
        registrarIntentarCerrar(intentarCerrar);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estaIntacto, onColapsar, onReforzarGuardia, registrarIntentarCerrar]);

    /** Manda `undefined` (no se incluye en el body) para lo que el usuario
     *  todavía no llenó — así el backend lo deja en NULL en vez de guardar
     *  un valor "vacío" engañoso (ej. `numeroTotalBoletos: 0`, que se vería
     *  como "0 boletos" en vez de "sin llenar todavía"). Necesario ahora que
     *  "Guardar" no exige el formulario completo. */
    function construirPayload(): CrearDinamicaPayload {
        return {
            titulo: draft.titulo.trim(),
            ciudad: draft.ciudad ?? '',
            descripcion: draft.descripcion.trim() || undefined,
            fotosPremio: draft.fotosPremio.length > 0 ? draft.fotosPremio : undefined,
            tipoPremio: draft.tipoPremio ?? undefined,
            metodoSorteo: draft.metodoSorteo ?? undefined,
            numeroTotalBoletos: draft.numeroTotalBoletos ? Number(draft.numeroTotalBoletos) : undefined,
            numeroBoletoInicial: draft.numeroBoletoInicial ? Number(draft.numeroBoletoInicial) : undefined,
            precioBoleto: draft.precioBoleto ? Number(draft.precioBoleto) : undefined,
            fechaLimiteInscripcion: draft.fechaLimiteInscripcion || undefined,
            reglaDesempate: draft.reglaDesempate ?? undefined,
            numeroLugaresGanadores: draft.numeroLugaresGanadores ? Number(draft.numeroLugaresGanadores) : undefined,
            numeroIntentosSorteo: draft.numeroIntentosSorteo ? Number(draft.numeroIntentosSorteo) : undefined,
        };
    }

    function manejarErrorHttp(e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        const data = (e as { response?: { data?: { moderacion?: { mensaje: string } } } })?.response?.data;
        if (status === 422 && data?.moderacion) {
            notificar.error(data.moderacion.mensaje);
            return;
        }
        notificar.error('No pudimos conectar con el servidor. Intenta de nuevo.');
    }

    function abrirPrimerError(erroresActuales: Partial<Record<CampoErrorComposerDinamica, string>>) {
        const mapa: [CampoErrorComposerDinamica, Seccion][] = [
            ['tipoPremio', 'tipoPremio'],
            ['metodoSorteo', 'metodoSorteo'],
            ['numeroTotalBoletos', 'boletos'],
            ['numeroBoletoInicial', 'boletos'],
            ['precioBoleto', 'boletos'],
            ['fechaLimiteInscripcion', 'fecha'],
        ];
        for (const [clave, seccion] of mapa) {
            if (erroresActuales[clave]) {
                setSeccionAbierta(seccion);
                return;
            }
        }
    }

    /** Crea (primera vez) o actualiza (ya existe) — sin confirmaciones. */
    async function guardarComoBorrador(): Promise<string | null> {
        if (dinamicaIdActual) {
            const res = await editarMutation.mutateAsync({ dinamicaId: dinamicaIdActual, payload: construirPayload() });
            if (!res.success) {
                notificar.error('mensaje' in res ? res.message : 'No pudimos guardar los cambios.');
                return null;
            }
            return dinamicaIdActual;
        }
        const res = await crearMutation.mutateAsync(construirPayload());
        if (!res.success) {
            notificar.error(res.message);
            return null;
        }
        setDinamicaIdActual(res.data.id);
        return res.data.id;
    }

    /** `cerrarAlTerminar=false` (botón "Guardar" del header): guarda y se
     *  queda editando, sin perder lo que ya llevaba escrito. `true` (opción
     *  "Guardar como borrador" del modal de salir): guarda Y cierra —
     *  ahí sí tiene sentido limpiar el draft local. */
    async function guardarBorrador(cerrarAlTerminar: boolean) {
        if (!validoGuardar || enviando) {
            if (!enviando && mensajeBotonGuardar) {
                notificar.error(mensajeBotonGuardar);
            }
            return;
        }
        try {
            const id = await guardarComoBorrador();
            if (!id) return;
            notificar.exito('Borrador guardado.');
            if (cerrarAlTerminar) {
                urlsSubidasEnSesion.current.clear();
                limpiar();
                onColapsar();
            }
        } catch (e) {
            manejarErrorHttp(e);
        }
    }

    async function publicar() {
        if (!valido || enviando) {
            if (!enviando && mensajeBoton) {
                setIntentoEnvio(true);
                notificar.error(mensajeBoton);
                abrirPrimerError(errores);
            }
            return;
        }
        if (!confirmacionesCompletas) {
            notificar.error('Acepta las 3 confirmaciones antes de publicar.');
            return;
        }
        try {
            const id = await guardarComoBorrador();
            if (!id) return;

            const resPub = await publicarMutation.mutateAsync({
                dinamicaId: id,
                payload: {
                    confirmaciones: {
                        premioReal: true,
                        pagoFueraApp: true,
                        resultadoHonesto: true,
                        version: CONFIRMACIONES_VERSION,
                    },
                },
            });
            if (!resPub.success) {
                notificar.error('mensaje' in resPub ? resPub.message : 'No pudimos publicar la Dinámica.');
                return;
            }
            notificar.exito('¡Dinámica publicada!');
            urlsSubidasEnSesion.current.clear();
            limpiar();
            onColapsar();
        } catch (e) {
            manejarErrorHttp(e);
        }
    }

    const listo = valido && confirmacionesCompletas && !enviando;

    return (
        <div data-testid="composer-dinamicas-expandido" className="flex flex-1 min-h-0 flex-col bg-white">
            {/* ── Header: X | título centrado | Guardar + Publicar — acento
                ámbar de marca (Dinámicas, distinto del teal de MarketPlace). ── */}
            <div
                className="shrink-0 flex items-center justify-between px-3 py-3 lg:px-4"
                style={{ background: GRADIENTE_DINAMICAS }}
            >
                <button
                    type="button"
                    aria-label="Cerrar"
                    data-testid="composer-dinamicas-cerrar"
                    onClick={() => intentarCerrar()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white cursor-pointer hover:bg-white/15"
                >
                    <X className="h-6 w-6" strokeWidth={2.5} />
                </button>
                <h2 className="truncate text-[17px] font-extrabold text-white tracking-tight">
                    {esEdicion ? 'Editar Dinámica' : 'Nueva Dinámica'}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        data-testid="composer-dinamicas-guardar-borrador"
                        onClick={() => guardarBorrador(false)}
                        disabled={enviando}
                        className="rounded-full bg-white/15 px-3.5 py-1.5 text-[14px] font-bold text-white cursor-pointer hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        data-testid="composer-dinamicas-publicar"
                        onClick={publicar}
                        disabled={enviando}
                        className={`rounded-full px-4 py-1.5 text-[15px] font-bold cursor-pointer disabled:cursor-not-allowed ${
                            listo ? 'bg-white text-amber-700 shadow-sm hover:bg-amber-50' : 'bg-white/20 text-white/60'
                        }`}
                    >
                        Publicar
                    </button>
                </div>
            </div>

            {/* Confirmación de cierre con cambios sin guardar — mismo patrón de
                action-sheet que `ComposerMarketplace.tsx` (3 filas con ícono
                circular), no un cuadro de 2 botones. "Guardar como borrador"
                reusa la misma función que el botón "Guardar" del header. */}
            <ModalAdaptativo
                abierto={confirmandoCierre}
                onCerrar={() => setConfirmandoCierre(false)}
                mostrarHeader={false}
                ancho="sm"
                alturaMaxima="sm"
                paddingContenido="none"
                zIndice="z-90"
                discriminador="_composerDinamicasConfirmarSalir"
            >
                <div className="py-2">
                    <p className="px-4 pb-3 pt-4 text-[16px] font-bold text-slate-900">
                        ¿Quieres terminar la Dinámica más tarde?
                    </p>
                    <button
                        type="button"
                        data-testid="composer-dinamicas-guardar-borrador-salir"
                        onClick={() => {
                            setConfirmandoCierre(false);
                            guardarBorrador(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-slate-100"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <Copy className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900">Guardar como borrador</span>
                    </button>
                    <button
                        type="button"
                        data-testid="composer-dinamicas-confirmar-descartar"
                        onClick={() => {
                            setConfirmandoCierre(false);
                            urlsSubidasEnSesion.current.clear();
                            limpiar();
                            onColapsar();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-slate-100"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <Trash2 className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900">Descartar Dinámica</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmandoCierre(false)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-slate-100"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-5 w-5" strokeWidth={2.5} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900">Seguir editando</span>
                    </button>
                </div>
            </ModalAdaptativo>

            {/* ── Identidad: avatar + nombre + ciudad (mismos tamaños que MP). ── */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
                {avatarUsuario ? (
                    <img src={avatarUsuario} alt="" className="h-16 w-16 rounded-full object-cover shrink-0" />
                ) : (
                    <div
                        aria-hidden
                        className="h-16 w-16 rounded-full bg-amber-600 grid place-items-center text-white font-bold text-xl shrink-0"
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
                    {draft.ciudad && (
                        <span className="block text-sm font-semibold text-slate-500 truncate">{draft.ciudad}</span>
                    )}
                </div>
            </div>

            {/* Título fijo (no scrollea) + zona con UN solo scroll unificado
                para descripción + fotos + panel de detalle abierto — mismo
                patrón que ComposerMarketplace.tsx. */}
            <div className="flex-1 min-h-0 flex flex-col px-4">
                <input
                    type="text"
                    data-testid="composer-dinamicas-titulo"
                    value={draft.titulo}
                    onChange={(e) => actualizar({ titulo: e.target.value.slice(0, TITULO_MAX) })}
                    placeholder="Ej: Rifa de una pantalla de 55 pulgadas"
                    className="w-full shrink-0 border-0 bg-transparent py-2 text-xl text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-bold outline-none"
                />
                <p className={`shrink-0 text-xs font-semibold ${intentoEnvio && errores.titulo ? 'text-red-600' : 'text-slate-400'}`}>
                    {draft.titulo.trim().length}/{TITULO_MAX} · mínimo {TITULO_MIN} caracteres
                </p>

                <div ref={scrollContenidoRef} className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain pb-3 scroll-discreto">
                    <textarea
                        ref={descripcionRef}
                        data-testid="composer-dinamicas-descripcion"
                        value={draft.descripcion}
                        onChange={(e) => actualizar({ descripcion: e.target.value.slice(0, DESC_MAX) })}
                        placeholder="Describe el premio, cómo se juega y cómo se paga el boleto..."
                        rows={1}
                        className="w-full grow shrink-0 min-h-24 resize-none overflow-hidden border-0 bg-transparent py-2 text-[15px] text-slate-900 placeholder:text-slate-500 placeholder:font-normal font-medium outline-none"
                    />
                    <p className={`shrink-0 text-xs font-semibold ${intentoEnvio && errores.descripcion ? 'text-red-600' : 'text-slate-400'}`}>
                        {draft.descripcion.trim().length}/{DESC_MAX} · mínimo {DESC_MIN} caracteres
                    </p>

                    {/* Fotos/video de evidencia — grid 3 cols móvil / 5 cols desktop,
                        idéntico a MP. Se agregan SOLO desde los chips Cámara/Galería
                        de la barra de abajo — no hay caja de subida aparte. */}
                    {(draft.fotosPremio.length > 0 || fotosUploader.previews.length > 0) && (
                        <div className="mt-3 grid grid-cols-3 lg:grid-cols-5 gap-2">
                            {draft.fotosPremio.map((foto, i) => (
                                <div key={foto.url} className="relative aspect-square rounded-xl overflow-hidden group">
                                    {i === 0 && (
                                        <span
                                            aria-hidden
                                            className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-amber-600/90 text-white text-[11px] font-semibold shadow pointer-events-none"
                                        >
                                            Portada
                                        </span>
                                    )}
                                    {foto.tipo === 'video' ? (
                                        <video src={foto.url} muted playsInline className="h-full w-full object-cover" />
                                    ) : (
                                        <img
                                            src={foto.url}
                                            alt=""
                                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                                        />
                                    )}
                                    {foto.tipo === 'video' && (
                                        <Play
                                            className="pointer-events-none absolute inset-0 m-auto h-8 w-8 text-white drop-shadow-md"
                                            fill="white"
                                        />
                                    )}
                                    <div
                                        className="absolute bottom-0 inset-x-0 flex items-center justify-end py-1.5 px-1.5"
                                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}
                                    >
                                        <button
                                            type="button"
                                            data-testid={`composer-dinamicas-quitar-foto-${i}`}
                                            onClick={() => fotosUploader.eliminar(i)}
                                            aria-label="Quitar foto"
                                            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {fotosUploader.previews.map((p) => (
                                <div key={p.tempId} className="relative aspect-square rounded-xl overflow-hidden">
                                    {p.tipo === 'video' ? (
                                        <video src={p.url} muted playsInline className="h-full w-full object-cover opacity-60" />
                                    ) : (
                                        <img src={p.url} alt="" className="h-full w-full object-cover opacity-60" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {intentoEnvio && errores.fotosPremio && (
                        <p className="mt-1.5 text-xs font-semibold text-red-600">{errores.fotosPremio}</p>
                    )}

                    <input {...fotosUploader.inputGaleriaProps} />
                    <input {...fotosUploader.inputCamaraProps} />
                    <input {...fotosUploader.inputCamaraVideoProps} />

                    {/* Paneles de detalle (revelado progresivo, siempre inline) */}
                    {seccionAbierta === 'tipoPremio' && (
                        <div className="mt-3">
                            <PanelWrapper titulo="Tipo de premio">
                                <div className="flex items-center gap-2">
                                    {(['fisico', 'efectivo'] as TipoPremio[]).map((v) => {
                                        const activa = draft.tipoPremio === v;
                                        return (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => actualizar({ tipoPremio: v })}
                                                className={
                                                    'flex w-40 shrink-0 items-center justify-center gap-2 py-2 rounded-full text-[14px] font-semibold cursor-pointer ' +
                                                    (activa
                                                        ? 'bg-amber-600 text-white border-2 border-amber-700'
                                                        : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-amber-500 hover:text-amber-700')
                                                }
                                            >
                                                {activa && <Check className="w-4 h-4" strokeWidth={3} />}
                                                {v === 'fisico' ? 'Físico' : 'Efectivo'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </PanelWrapper>
                        </div>
                    )}

                    {seccionAbierta === 'metodoSorteo' && (
                        <div className="mt-3">
                            <PanelWrapper titulo="Método de sorteo">
                                <div className="flex flex-wrap gap-1.5">
                                    {(
                                        [
                                            ['tombola', 'Tómbola clásica animada'],
                                            ['carta_unica', 'Lotería — carta única'],
                                            ['tabla_completa', 'Lotería — tabla completa'],
                                        ] as [MetodoSorteo, string][]
                                    ).map(([v, label]) => {
                                        const activa = draft.metodoSorteo === v;
                                        return (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() =>
                                                    actualizar({
                                                        metodoSorteo: v,
                                                        reglaDesempate: v === 'tabla_completa' ? draft.reglaDesempate : null,
                                                    })
                                                }
                                                className={
                                                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold cursor-pointer ' +
                                                    (activa
                                                        ? 'bg-amber-600 text-white border-2 border-amber-700'
                                                        : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-amber-500 hover:text-amber-700')
                                                }
                                            >
                                                {activa && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </PanelWrapper>
                        </div>
                    )}

                    {seccionAbierta === 'boletos' && (
                        <div className="mt-3">
                            <PanelWrapper titulo="Boletos">
                                {/* Los 3 en la misma línea siempre — en móvil se reparten el
                                    ancho a partes iguales (`flex-1`) para no desbordar el
                                    composer; en `lg:` recuperan su ancho fijo original. */}
                                <div className="flex items-center gap-1.5 lg:gap-2">
                                    <div className="relative min-w-0 flex-1 lg:w-44 lg:flex-none lg:shrink-0">
                                        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 lg:left-3.5" strokeWidth={2} />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            data-testid="composer-dinamicas-numero-boleto-inicial"
                                            value={draft.numeroBoletoInicial}
                                            onChange={(e) => actualizar({ numeroBoletoInicial: e.target.value.replace(/[^\d]/g, '') })}
                                            placeholder="Empieza en"
                                            className="w-full rounded-full border-2 border-amber-400 bg-white py-2 pl-7 pr-2 text-[13px] font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400 lg:pl-9 lg:pr-3 lg:text-[15px]"
                                        />
                                    </div>
                                    <div className="relative min-w-0 flex-1 lg:w-44 lg:flex-none lg:shrink-0">
                                        <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 lg:left-3.5" strokeWidth={2} />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            data-testid="composer-dinamicas-numero-boletos"
                                            value={draft.numeroTotalBoletos}
                                            onChange={(e) => actualizar({ numeroTotalBoletos: e.target.value.replace(/[^\d]/g, '') })}
                                            placeholder="Total"
                                            className="w-full rounded-full border-2 border-amber-400 bg-white py-2 pl-7 pr-2 text-[13px] font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400 lg:pl-9 lg:pr-3 lg:text-[15px]"
                                        />
                                    </div>
                                    <div className="relative min-w-0 flex-1 lg:w-40 lg:flex-none lg:shrink-0">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-500 lg:left-3.5 lg:text-[15px]">$</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            data-testid="composer-dinamicas-precio-boleto"
                                            value={draft.precioBoleto}
                                            onChange={(e) => actualizar({ precioBoleto: e.target.value.replace(/[^\d.]/g, '') })}
                                            placeholder="Precio"
                                            className="w-full rounded-full border-2 border-amber-400 bg-white py-2 pl-6 pr-2 text-[13px] font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400 lg:pl-8 lg:pr-3 lg:text-[15px]"
                                        />
                                    </div>
                                </div>
                                {/* El número final se calcula solo — inicio + total - 1 —
                                    no se pide, solo se muestra como confirmación. */}
                                {parseEnteroPositivo(draft.numeroBoletoInicial) !== null &&
                                    parseEnteroPositivo(draft.numeroTotalBoletos) !== null && (
                                        <p className="mt-2 text-[13px] font-semibold text-amber-800">
                                            Boletos del #{draft.numeroBoletoInicial} al #
                                            {Number(draft.numeroBoletoInicial) + Number(draft.numeroTotalBoletos) - 1}
                                        </p>
                                    )}
                                {intentoEnvio && errores.numeroBoletoInicial && (
                                    <p className="mt-2 text-[12px] font-semibold text-red-600">{errores.numeroBoletoInicial}</p>
                                )}
                                {intentoEnvio && errores.precioBoleto && (
                                    <p className="mt-2 text-[12px] font-semibold text-red-600">{errores.precioBoleto}</p>
                                )}

                                {/* Sorteo: lugares premiados (K) + a qué intento sale el
                                    ganador (N), en cascada — el intento N es el 1er lugar
                                    (premio grande, se revela al final), N-1 el 2do, etc. */}
                                <div className="mt-4 border-t border-slate-200 pt-3">
                                    <p className="mb-2 text-[13px] font-bold text-amber-800">Sorteo</p>
                                    <div className="flex items-center gap-1.5 lg:gap-2">
                                        <div className="relative min-w-0 flex-1 lg:w-44 lg:flex-none lg:shrink-0">
                                            <Trophy className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 lg:left-3.5" strokeWidth={2} />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                data-testid="composer-dinamicas-numero-lugares-ganadores"
                                                value={draft.numeroLugaresGanadores}
                                                onChange={(e) => actualizar({ numeroLugaresGanadores: e.target.value.replace(/[^\d]/g, '') })}
                                                placeholder="Lugares premiados"
                                                className="w-full rounded-full border-2 border-amber-400 bg-white py-2 pl-7 pr-2 text-[13px] font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400 lg:pl-9 lg:pr-3 lg:text-[15px]"
                                            />
                                        </div>
                                        <div className="relative min-w-0 flex-1 lg:w-44 lg:flex-none lg:shrink-0">
                                            <Dices className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 lg:left-3.5" strokeWidth={2} />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                data-testid="composer-dinamicas-numero-intentos-sorteo"
                                                value={draft.numeroIntentosSorteo}
                                                onChange={(e) => actualizar({ numeroIntentosSorteo: e.target.value.replace(/[^\d]/g, '') })}
                                                placeholder="Sale en el intento #"
                                                className="w-full rounded-full border-2 border-amber-400 bg-white py-2 pl-7 pr-2 text-[13px] font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400 lg:pl-9 lg:pr-3 lg:text-[15px]"
                                            />
                                        </div>
                                    </div>
                                    {intentoEnvio && errores.numeroLugaresGanadores && (
                                        <p className="mt-2 text-[12px] font-semibold text-red-600">{errores.numeroLugaresGanadores}</p>
                                    )}
                                    {intentoEnvio && errores.numeroIntentosSorteo && (
                                        <p className="mt-2 text-[12px] font-semibold text-red-600">{errores.numeroIntentosSorteo}</p>
                                    )}
                                </div>
                            </PanelWrapper>
                        </div>
                    )}

                    {seccionAbierta === 'fecha' && (
                        <div className="mt-3">
                            <PanelWrapper titulo="Fecha y Hora de la Rifa">
                                <div className="flex items-center gap-2">
                                    <div className="w-44 shrink-0">
                                        <DatePicker
                                            value={fechaSel}
                                            onChange={actualizarFecha}
                                            placeholder="Fecha"
                                            minDate={hoyISO()}
                                            error={intentoEnvio && !!errores.fechaLimiteInscripcion}
                                            className={ESTILO_TRIGGER_AMBER}
                                        />
                                    </div>
                                    <div className="w-40 shrink-0">
                                        <CustomSelect
                                            testId="composer-dinamicas-hora-limite"
                                            value={horaSel}
                                            onChange={actualizarHora}
                                            options={OPCIONES_HORA.map((h) => ({ value: h.valor, label: h.etiqueta }))}
                                            claseControl="px-3 py-2"
                                            claseActivo="border-amber-500 ring-2 ring-amber-300"
                                            className={ESTILO_TRIGGER_AMBER}
                                            portal
                                        />
                                    </div>
                                </div>
                            </PanelWrapper>
                        </div>
                    )}

                    {seccionAbierta === 'reglaDesempate' && draft.metodoSorteo === 'tabla_completa' && (
                        <div className="mt-3">
                            <PanelWrapper titulo="Regla de desempate">
                                <div className="flex flex-wrap gap-1.5">
                                    {(
                                        [
                                            ['sorteo_instantaneo', 'Sorteo instantáneo'],
                                            ['repartir_premio', 'Repartir el premio'],
                                            ['ronda_extra', 'Ronda extra'],
                                            ['orden_inscripcion', 'Orden de inscripción'],
                                        ] as [ReglaDesempate, string][]
                                    ).map(([v, label]) => {
                                        const activa = draft.reglaDesempate === v;
                                        return (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => actualizar({ reglaDesempate: v })}
                                                className={
                                                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold cursor-pointer ' +
                                                    (activa
                                                        ? 'bg-amber-600 text-white border-2 border-amber-700'
                                                        : 'bg-white border-2 border-slate-300 text-slate-800 hover:border-amber-500 hover:text-amber-700')
                                                }
                                            >
                                                {activa && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </PanelWrapper>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Chip bar anclada: Cámara (solo móvil) + Galería + Tipo de
                premio + Método de sorteo + Boletos + Fecha límite + Desempate
                (condicional). ── */}
            <div className="relative shrink-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t-2 border-slate-200">
                <div className="flex items-center gap-2 lg:gap-1.5 overflow-x-auto lg:flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <button
                        type="button"
                        data-testid="composer-dinamicas-chip-camara"
                        data-menu-toggle-camara-dinamicas
                        onClick={() => setMenuCamaraAbierto((v) => !v)}
                        aria-expanded={menuCamaraAbierto}
                        className="lg:hidden flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 cursor-pointer"
                    >
                        <Camera className="h-4 w-4" strokeWidth={2} />
                        Cámara
                    </button>

                    <button
                        type="button"
                        data-testid="composer-dinamicas-chip-galeria"
                        onClick={fotosUploader.abrirGaleria}
                        className="flex shrink-0 items-center gap-2 lg:gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 lg:px-3 lg:py-1.5 text-sm lg:text-[13px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                        <ImageIcon className="h-4 w-4" strokeWidth={2} />
                        Galería
                        {draft.fotosPremio.length > 0 && (
                            <span className="tabular-nums text-slate-500">
                                ({draft.fotosPremio.length}/{MAX_FOTOS_COMPOSER_DINAMICA})
                            </span>
                        )}
                    </button>

                    <ChipDetalle
                        id="tipoPremio"
                        Icono={Gift}
                        label="Tipo de premio"
                        activo={!!draft.tipoPremio}
                        error={intentoEnvio && !!errores.tipoPremio}
                        abierto={seccionAbierta === 'tipoPremio'}
                        onClick={() => setSeccionAbierta((s) => (s === 'tipoPremio' ? null : 'tipoPremio'))}
                    />
                    <ChipDetalle
                        id="metodoSorteo"
                        Icono={Dices}
                        label="Método de sorteo"
                        activo={!!draft.metodoSorteo}
                        error={intentoEnvio && !!errores.metodoSorteo}
                        abierto={seccionAbierta === 'metodoSorteo'}
                        onClick={() => setSeccionAbierta((s) => (s === 'metodoSorteo' ? null : 'metodoSorteo'))}
                    />
                    <ChipDetalle
                        id="boletos"
                        Icono={Ticket}
                        label="Boletos"
                        activo={!!draft.numeroTotalBoletos && !!draft.precioBoleto}
                        error={
                            intentoEnvio &&
                            (!!errores.numeroTotalBoletos ||
                                !!errores.precioBoleto ||
                                !!errores.numeroLugaresGanadores ||
                                !!errores.numeroIntentosSorteo)
                        }
                        abierto={seccionAbierta === 'boletos'}
                        onClick={() => setSeccionAbierta((s) => (s === 'boletos' ? null : 'boletos'))}
                    />
                    <ChipDetalle
                        id="fecha"
                        Icono={CalendarClock}
                        label="Fecha y Hora"
                        activo={!!draft.fechaLimiteInscripcion}
                        error={intentoEnvio && !!errores.fechaLimiteInscripcion}
                        abierto={seccionAbierta === 'fecha'}
                        onClick={() => setSeccionAbierta((s) => (s === 'fecha' ? null : 'fecha'))}
                    />
                    {/* Condicionado a metodoSorteo === 'tabla_completa' — mismo mecanismo
                        que el chip "Urgente" de Servicios (draft.modo === 'solicito'). */}
                    {draft.metodoSorteo === 'tabla_completa' && (
                        <ChipDetalle
                            id="reglaDesempate"
                            Icono={Scale}
                            label="Desempate"
                            activo={!!draft.reglaDesempate}
                            error={false}
                            abierto={seccionAbierta === 'reglaDesempate'}
                            onClick={() => setSeccionAbierta((s) => (s === 'reglaDesempate' ? null : 'reglaDesempate'))}
                        />
                    )}
                </div>

                {menuCamaraAbierto && (
                    <div
                        ref={menuCamaraRef}
                        className="absolute bottom-full left-4 z-20 mb-2 w-60 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl lg:hidden"
                        role="menu"
                    >
                        <div className="flex items-start gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                            <Info className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
                            <p className="text-xs font-semibold leading-snug text-slate-600">Videos: máx. 60 segundos y 50 MB</p>
                        </div>
                        <button
                            type="button"
                            data-testid="composer-dinamicas-camara-foto"
                            onClick={() => {
                                setMenuCamaraAbierto(false);
                                fotosUploader.abrirCamara();
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                        >
                            <Camera className="h-4 w-4 shrink-0" strokeWidth={2} />
                            Tomar foto
                        </button>
                        <button
                            type="button"
                            data-testid="composer-dinamicas-camara-video"
                            onClick={() => {
                                setMenuCamaraAbierto(false);
                                fotosUploader.abrirCamaraVideo();
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                        >
                            <Video className="h-4 w-4 shrink-0" strokeWidth={2} />
                            Grabar video
                        </button>
                    </div>
                )}
            </div>

            {/* ── Checklist legal (footer) — se exige al PUBLICAR, no al
                guardar borrador. ── */}
            <div className="shrink-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t-2 border-slate-200">
                <CheckboxLegal aceptado={confirmacionesCompletas} onCambio={setConfirmacionesUnificadas} />
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES LOCALES
// =============================================================================

interface ChipDetalleProps {
    id: string;
    Icono: typeof Gift;
    label: string;
    activo: boolean;
    error: boolean;
    abierto: boolean;
    onClick: () => void;
}

function ChipDetalle({ id, Icono, label, activo, error, abierto, onClick }: ChipDetalleProps) {
    return (
        <button
            type="button"
            data-testid={`composer-dinamicas-chip-${id}`}
            onClick={onClick}
            aria-pressed={abierto}
            className={
                'relative flex shrink-0 items-center gap-2 lg:gap-1.5 rounded-full border-2 px-3.5 py-2 lg:px-3 lg:py-1.5 text-sm lg:text-[13px] font-semibold cursor-pointer ' +
                (error
                    ? 'bg-rose-50 border-rose-400 text-rose-700'
                    : abierto
                    ? 'bg-amber-100 border-amber-500 text-amber-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')
            }
        >
            <Icono className="h-4 w-4" strokeWidth={2} />
            {label}
            {activo && !error && (
                <span aria-hidden className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            )}
        </button>
    );
}

function PanelWrapper({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div data-testid={`composer-dinamicas-panel-${titulo.toLowerCase()}`} className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-3">
            <div className="flex items-center gap-2 mb-2.5">
                <ChevronDown className="w-4 h-4 text-amber-700" strokeWidth={2.25} />
                <span className="text-[14px] font-bold text-amber-800">{titulo}</span>
            </div>
            {children}
        </div>
    );
}

function CheckboxLegal({ aceptado, onCambio }: { aceptado: boolean; onCambio: (v: boolean) => void }) {
    const [verDetalles, setVerDetalles] = useState(false);
    return (
        <div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    data-testid="composer-dinamicas-checklist"
                    checked={aceptado}
                    onChange={(e) => onCambio(e.target.checked)}
                    className="sr-only"
                />
                <span
                    aria-hidden
                    className={
                        'w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ' +
                        (aceptado ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-300')
                    }
                >
                    {aceptado && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="text-[14px] font-medium text-slate-700">Acepto las reglas de Dinámicas</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        setVerDetalles((v) => !v);
                    }}
                    className="inline-flex items-center gap-0.5 text-[14px] text-amber-700 font-semibold cursor-pointer hover:text-amber-800"
                >
                    {verDetalles ? 'ocultar' : 'ver detalles'}
                    <ChevronDown className={'w-4 h-4 transition-transform ' + (verDetalles ? 'rotate-180' : '')} strokeWidth={2.25} />
                </button>
            </label>
            {verDetalles && (
                <ul className="mt-2 ml-7 pl-4 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-outside">
                    <li>El premio es <strong>real</strong> y me comprometo a entregarlo si esta Dinámica resulta ganadora.</li>
                    <li>El cobro de boletos y la entrega del premio ocurren <strong>fuera de AnunciaYA</strong> — la plataforma no participa en el dinero ni es responsable de ellos.</li>
                    <li>Me comprometo a <strong>respetar el resultado</strong> del sorteo tal como lo determina el sistema, sin manipularlo.</li>
                </ul>
            )}
        </div>
    );
}

export default ComposerDinamicas;
