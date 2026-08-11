/**
 * PaginaDinamica.tsx
 * ====================
 * Ficha de detalle de una Dinámica — ruta propia `/marketplace/dinamica/:id`,
 * calcada de la estructura de `PaginaArticuloMarketplace.tsx` (header dark
 * sticky ancho completo + hero de 2 columnas galería/info + resto del
 * contenido a ancho completo) pero con identidad ámbar.
 *
 * Incluye: galería de fotos del premio (reusa `GaleriaArticulo`), descripción,
 * organizador+insignia (con botón "Contactar" vía `useIniciarChatDirectoPersona`,
 * disponible para cualquiera que la vea, no solo el organizador), carrusel
 * horizontal de boletos numerado clickeable, lista pública de participantes
 * (con "Contactar" por fila), modal para reservar boleto, y —solo para el
 * organizador— agregar participante manual y posponer/cancelar la Dinámica.
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaDinamica.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    Ban,
    BadgeCheck,
    Calendar,
    CalendarClock,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    FileText,
    Flag,
    Gift,
    Loader2,
    MapPin,
    MoreVertical,
    Pencil,
    Repeat,
    RotateCcw,
    Search,
    ShieldCheck,
    Shuffle,
    Ticket,
    UserCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { Icon, ICONOS, type IconProps } from '@/config/iconos';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useBackNativo } from '../../../hooks/useBackNativo';
import { usePortalTarget } from '../../../hooks/usePortalTarget';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
import { useIniciarChatDinamica } from '../../../hooks/useIniciarChatDinamica';
import { useGuardados } from '../../../hooks/useGuardados';
import {
    useDinamica,
    useBoletosDinamica,
    useReservarBoleto,
    useAgregarParticipanteManual,
    useEditarParticipanteManual,
    useReasignarBoleto,
    useLiberarBoleto,
    useConfirmarPagoBoleto,
    usePosponerDinamica,
    useCancelarDinamica,
    useEditarBorradorDinamica,
} from '../../../hooks/queries/useDinamicas';
import { GaleriaArticulo } from '../../../components/marketplace/GaleriaArticulo';
import { DropdownCompartir } from '../../../components/compartir/DropdownCompartir';
import Tooltip from '../../../components/ui/Tooltip';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { ModalImagenes } from '../../../components/ui/ModalImagenes';
import {
    HeaderAccionGradiente,
    ResumenAccionModal,
    AvisoContextualModal,
    BotonesAccionModal,
} from '../../../components/ui/ModalAccionGradiente';
import {
    ModalAgregarParticipanteDinamica,
    ModalPosponerDinamica,
    ModalCancelarDinamica,
    ModalEditarDinamica,
    ModalLiberarBoleto,
    ModalEditarParticipante,
    ModalReasignarBoleto,
} from '../../../components/dinamicas/ModalesAccionDinamica';
import { BotonSalaEnVivo } from '../../../components/dinamicas/sala/BotonSalaEnVivo';
import { notificar } from '../../../utils/notificaciones';
import { formatearUltimaConexion } from '../../../utils/marketplace';
import type { BoletoDinamica, DinamicaDetallePublico, OrganizadorDinamica } from '../../../types/dinamicas';
import { obtenerCartaPorBoleto } from '../../../data/cartasLoteria';
import { obtenerTablaPorBoleto } from '../../../data/tablasLoteria';

// Wrapper local: icono migrado a Iconify manteniendo el nombre familiar.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;

const GRADIENTE_DINAMICAS = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
const SOMBRA_CARD = '0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)';

const ETIQUETA_TIPO_PREMIO: Record<string, string> = { fisico: 'Premio físico', efectivo: 'Premio en efectivo' };
const ETIQUETA_METODO: Record<string, string> = {
    tombola: 'Tómbola clásica',
    carta_unica: 'Lotería — carta única',
    tabla_completa: 'Lotería — tabla completa',
};
const ETIQUETA_INSIGNIA: Record<string, string> = { nuevo: 'Organizador nuevo', activo: 'Organizador activo', confiable: 'Organizador confiable' };

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

function formatearCuentaRegresiva(fechaLimite: string | null): string | null {
    if (!fechaLimite) return null;
    const fecha = new Date(fechaLimite);
    if (fecha.getTime() <= Date.now()) return 'Inscripción cerrada';
    const fechaTexto = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const horaTexto = fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Fecha: ${fechaTexto}, ${horaTexto}`;
}

export function PaginaDinamica() {
    const { dinamicaId } = useParams<{ dinamicaId: string }>();
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/marketplace?dinamicas=1');
    const cuerpoRef = useScrollAppShell();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChat = useIniciarChatDirectoPersona();
    const iniciarChatDinamica = useIniciarChatDinamica();

    const { data: dinamica, isLoading, isError } = useDinamica(dinamicaId ?? null);
    const { data: boletos = [] } = useBoletosDinamica(dinamicaId ?? null);

    const reservarBoleto = useReservarBoleto();
    const agregarManual = useAgregarParticipanteManual();
    const editarParticipante = useEditarParticipanteManual();
    const reasignarBoleto = useReasignarBoleto();
    const liberarBoleto = useLiberarBoleto();
    const confirmarPago = useConfirmarPagoBoleto();
    const posponer = usePosponerDinamica();
    const cancelar = useCancelarDinamica();
    const editar = useEditarBorradorDinamica();
    // `entityId`/`initialGuardado` con fallback porque el hook debe llamarse
    // incondicionalmente ANTES de los early return de loading/error de abajo
    // (dinamica todavía puede ser undefined en ese punto).
    const { guardado, loading: guardandoPendiente, toggleGuardado } = useGuardados({
        entityType: 'dinamica',
        entityId: dinamica?.id ?? '',
        initialGuardado: dinamica?.guardado ?? false,
    });

    // Carrusel de boletos en móvil para carta_unica — Embla en vez de
    // CSS-only (`overflow-x-auto` + scroll-snap): el navegador arbitra
    // scroll-vs-drag en los primeros ~10-15px de cada touch y ahí el swipe
    // se siente "rígido"/no responde a la primera (ver el porqué completo
    // en `hooks/useCarruselRotativo.ts`). No se reusa ese hook porque está
    // pensado para autoplay — acá el carrusel no rota solo, solo se
    // desliza con el dedo. Mismos valores de `duration`/`dragThreshold`
    // que ya se probaron ahí.
    const { esMobile } = useBreakpoint();
    const numerosBoletosCartaUnica = useMemo(
        () => Array.from({ length: dinamica?.numeroTotalBoletos ?? 0 }, (_, i) => (dinamica?.numeroBoletoInicial ?? 1) + i),
        [dinamica?.numeroTotalBoletos, dinamica?.numeroBoletoInicial],
    );
    // Cada slide de Embla = 1 columna con 2 boletos apilados (arriba/abajo),
    // ya que Embla no tiene un modo "grid" nativo — se pre-agrupa en JS.
    const paresBoletosCartaUnica = useMemo(() => {
        const pares: number[][] = [];
        for (let i = 0; i < numerosBoletosCartaUnica.length; i += 2) pares.push(numerosBoletosCartaUnica.slice(i, i + 2));
        return pares;
    }, [numerosBoletosCartaUnica]);
    const emblaOptionsBoletos = useMemo(
        () => ({ align: 'start' as const, duration: 30, dragThreshold: 4, containScroll: 'trimSnaps' as const }),
        [],
    );
    const [emblaRefBoletos] = useEmblaCarousel(emblaOptionsBoletos);

    const [boletoSeleccionado, setBoletoSeleccionado] = useState<number | null>(null);
    const [modalManualAbierto, setModalManualAbierto] = useState(false);
    const [numeroBoletoParaAgregar, setNumeroBoletoParaAgregar] = useState<number | null>(null);
    const [modalPosponerAbierto, setModalPosponerAbierto] = useState(false);
    const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [modalParticipantesAbierto, setModalParticipantesAbierto] = useState(false);
    const [modalMisBoletosAbierto, setModalMisBoletosAbierto] = useState(false);
    const [boletoParaLiberar, setBoletoParaLiberar] = useState<BoletoDinamica | null>(null);
    const [boletoParaEditar, setBoletoParaEditar] = useState<BoletoDinamica | null>(null);
    const [boletoParaReasignar, setBoletoParaReasignar] = useState<BoletoDinamica | null>(null);
    const boletosScrollRef = useRef<HTMLDivElement>(null);

    const esOrganizador = !!usuarioActual && !!dinamica && usuarioActual.id === dinamica.organizadorUsuarioId;

    const mapaBoletos = useMemo(() => {
        const mapa = new Map<number, BoletoDinamica>();
        for (const b of boletos) mapa.set(b.numeroBoleto, b);
        return mapa;
    }, [boletos]);

    // Números ya tomados (reservados o pagados) — valida en vivo el campo
    // "Número de boleto" del modal Agregar Participante mientras se escribe.
    const numerosOcupados = useMemo(() => {
        const set = new Set<number>();
        for (const b of boletos) {
            if (b.estado === 'reservado' || b.estado === 'pagado') set.add(b.numeroBoleto);
        }
        return set;
    }, [boletos]);

    const participantesVisibles = useMemo(
        () => boletos.filter((b) => b.estado === 'pagado' || b.estado === 'reservado'),
        [boletos],
    );

    // Boletos del usuario actual (viendo como participante, no organizador —
    // el organizador nunca tiene un boleto propio, `reservarBoletoPublico`
    // lo bloquea con 403). Alimenta el botón "Mis boletos", a un lado de
    // "Participantes".
    const misBoletos = useMemo(
        () => (usuarioActual ? participantesVisibles.filter((b) => b.usuario?.id === usuarioActual.id) : []),
        [participantesVisibles, usuarioActual],
    );

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" strokeWidth={2.5} />
            </div>
        );
    }

    if (isError || !dinamica) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertCircle className="h-10 w-10 text-rose-400" strokeWidth={2} />
                <p className="text-base font-medium text-slate-600">No se pudo cargar esta Dinámica. Puede que ya no exista.</p>
                <button
                    onClick={handleVolver}
                    className="rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white lg:cursor-pointer lg:hover:bg-amber-700"
                >
                    Volver a Dinámicas
                </button>
            </div>
        );
    }

    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const aceptaParticipantes = dinamica.estado === 'activa' || dinamica.estado === 'pospuesta';
    const esCartaUnica = dinamica.metodoSorteo === 'carta_unica';
    const esTablaCompleta = dinamica.metodoSorteo === 'tabla_completa';

    function abrirChatCon(usuario: { id: string; nombre: string; apellidos: string; avatarUrl: string | null }) {
        if (usuarioActual?.id === usuario.id) return;
        iniciarChat({
            usuarioId: usuario.id,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            avatarUrl: usuario.avatarUrl,
        });
    }

    // Contactar al ORGANIZADOR (a diferencia de `abrirChatCon`, usado para
    // contactar a otros participantes) abre ChatYA con una card de contexto
    // pre-cargada (foto + título + precio por boleto) y un borrador de
    // mensaje, mismo comportamiento que "Contactar" en MarketPlace.
    function contactarOrganizador() {
        if (!dinamica || usuarioActual?.id === dinamica.organizador.id) return;
        iniciarChatDinamica(dinamica);
    }

    function desplazarBoletos(direccion: 1 | -1) {
        const el = boletosScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: 'smooth' });
    }

    // Organizador: click en un boleto disponible del grid abre "Agregar
    // Participante" ya con ese número — más rápido que abrirlo desde el
    // menú "⋯" y escribir el número a mano.
    function abrirAgregarManualConBoleto(numero: number) {
        setNumeroBoletoParaAgregar(numero);
        setModalManualAbierto(true);
    }

    async function confirmarReserva() {
        if (!dinamicaId || boletoSeleccionado === null) return;
        const r = await reservarBoleto.mutateAsync({ dinamicaId, numeroBoleto: boletoSeleccionado });
        if (r.success) {
            notificar.exito(`Reservaste el boleto #${boletoSeleccionado}. Coordina el pago por ChatYA.`);
            setBoletoSeleccionado(null);
        } else {
            notificar.error(r.message);
        }
    }

    async function enviarParticipanteManual(datos: {
        numeroBoleto: number;
        nombreManual: string;
        telefonoManual: string;
        estado: 'reservado' | 'pagado';
    }) {
        if (!dinamicaId) return;
        const r = await agregarManual.mutateAsync({ dinamicaId, ...datos });
        if (r.success) {
            notificar.exito('Participante agregado.');
            setModalManualAbierto(false);
            setNumeroBoletoParaAgregar(null);
        } else {
            notificar.error(r.message);
        }
    }

    async function confirmarPagoDe(boletoId: string) {
        if (!dinamicaId) return;
        const r = await confirmarPago.mutateAsync({ dinamicaId, boletoId });
        if (r.success) notificar.exito('Pago confirmado.');
        else notificar.error(r.message);
    }

    async function confirmarLiberarBoleto() {
        if (!dinamicaId || !boletoParaLiberar) return;
        const r = await liberarBoleto.mutateAsync({ dinamicaId, boletoId: boletoParaLiberar.id });
        if (r.success) {
            notificar.exito(`Boleto #${boletoParaLiberar.numeroBoleto} liberado.`);
            setBoletoParaLiberar(null);
        } else {
            notificar.error(r.message);
        }
    }

    async function confirmarEditarParticipante(datos: { numeroBoleto: number; nombreManual: string; telefonoManual: string }) {
        if (!dinamicaId || !boletoParaEditar) return;
        const r = await editarParticipante.mutateAsync({ dinamicaId, boletoId: boletoParaEditar.id, ...datos });
        if (r.success) {
            notificar.exito('Participante actualizado.');
            setBoletoParaEditar(null);
        } else {
            notificar.error(r.message);
        }
    }

    async function confirmarReasignarBoleto(numeroBoleto: number) {
        if (!dinamicaId || !boletoParaReasignar) return;
        const r = await reasignarBoleto.mutateAsync({ dinamicaId, boletoId: boletoParaReasignar.id, numeroBoleto });
        if (r.success) {
            notificar.exito(`Boleto reasignado a #${numeroBoleto}.`);
            setBoletoParaReasignar(null);
        } else {
            notificar.error(r.message);
        }
    }

    async function enviarPosponer(nuevaFechaLimiteInscripcionISO: string) {
        if (!dinamicaId) return;
        const r = await posponer.mutateAsync({ dinamicaId, nuevaFechaLimiteInscripcion: nuevaFechaLimiteInscripcionISO });
        if (r.success) {
            notificar.exito('Dinámica pospuesta.');
            setModalPosponerAbierto(false);
        } else {
            notificar.error(r.message);
        }
    }

    async function enviarCancelar() {
        if (!dinamicaId) return;
        const r = await cancelar.mutateAsync(dinamicaId);
        if (r.success) {
            notificar.exito('Dinámica cancelada.');
            setModalCancelarAbierto(false);
        } else {
            notificar.error(r.message);
        }
    }

    // Edición limitada (activa/pospuesta) — solo título, descripción y fotos
    // del premio; el backend rechaza cualquier otro campo con 409 (ver
    // `editarBorrador` en dinamicas.service.ts). "Editar borrador" (estado
    // 'borrador') sigue usando el composer completo, no este modal.
    async function enviarEditar(datos: { titulo: string; descripcion: string; fotosPremio: DinamicaDetallePublico['fotosPremio'] }) {
        if (!dinamicaId) return;
        const r = await editar.mutateAsync({ dinamicaId, payload: datos });
        if (r.success) {
            notificar.exito('Dinámica actualizada.');
            setModalEditarAbierto(false);
        } else {
            notificar.error(r.message);
        }
    }

    // Página pública compartible — /p/dinamica/:id (PaginaDinamicaPublica),
    // accesible sin login. Mismo patrón que /p/articulo-marketplace/:id.
    const linkCompartido =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/dinamica/${dinamica.id}`
            : `/p/dinamica/${dinamica.id}`;

    function handleGuardar() {
        toggleGuardado();
    }

    // Un solo botón-carta reusado por las 2 variantes de layout (móvil
    // Embla / desktop grid que envuelve) — evita duplicar el JSX.
    function renderBotonCarta(numero: number) {
        const boleto = mapaBoletos.get(numero);
        const estado = boleto?.estado ?? 'disponible';
        const carta = obtenerCartaPorBoleto(numero);
        const alSeleccionar = () => (esOrganizador ? abrirAgregarManualConBoleto(numero) : setBoletoSeleccionado(numero));
        const tituloBoton = esOrganizador && estado === 'disponible' ? 'Agregar participante en este boleto' : undefined;
        return (
            <button
                key={numero}
                data-testid={`boleto-${numero}`}
                disabled={estado !== 'disponible'}
                title={tituloBoton}
                onClick={alSeleccionar}
                className={`relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-2xl border-2 transition-colors ${
                    estado === 'pagado'
                        ? 'cursor-not-allowed border-emerald-400'
                        : estado === 'reservado'
                          ? 'cursor-not-allowed border-amber-400'
                          : esOrganizador
                            ? 'border-slate-300 lg:cursor-pointer lg:hover:border-blue-500'
                            : 'border-slate-300 lg:cursor-pointer lg:hover:border-amber-500'
                }`}
            >
                <img
                    src={carta.archivo}
                    alt={carta.nombre}
                    className={`h-full w-full object-cover ${estado !== 'disponible' ? 'opacity-60' : ''}`}
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-bold leading-tight text-white">{numero}</span>
                {estado === 'pagado' && (
                    <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </span>
                )}
                {estado === 'reservado' && <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-amber-500" />}
            </button>
        );
    }

    // Equivalente a `renderBotonCarta` para `tabla_completa` — en vez de 1
    // carta, cada boleto muestra su tabla completa (4×4) en miniatura, para
    // que el participante elija la que más le guste (las 150 tablas del
    // catálogo son públicas y navegables, ver `data/tablasLoteria.ts`).
    function renderBotonTabla(numero: number) {
        const boleto = mapaBoletos.get(numero);
        const estado = boleto?.estado ?? 'disponible';
        const tabla = obtenerTablaPorBoleto(numero);
        const alSeleccionar = () => (esOrganizador ? abrirAgregarManualConBoleto(numero) : setBoletoSeleccionado(numero));
        const tituloBoton = esOrganizador && estado === 'disponible' ? 'Agregar participante en este boleto' : undefined;
        return (
            <button
                key={numero}
                data-testid={`boleto-${numero}`}
                disabled={estado !== 'disponible'}
                title={tituloBoton}
                onClick={alSeleccionar}
                className={`relative w-full shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1.5 transition-colors ${
                    estado === 'pagado'
                        ? 'cursor-not-allowed border-emerald-400'
                        : estado === 'reservado'
                          ? 'cursor-not-allowed border-amber-400'
                          : esOrganizador
                            ? 'border-slate-300 lg:cursor-pointer lg:hover:border-blue-500'
                            : 'border-slate-300 lg:cursor-pointer lg:hover:border-amber-500'
                }`}
            >
                <div className={`grid grid-cols-4 gap-0.5 ${estado !== 'disponible' ? 'opacity-60' : ''}`}>
                    {tabla.cartas.map((carta) => (
                        <img key={carta.numero} src={carta.archivo} alt="" className="aspect-[2/3] w-full rounded-xs object-cover" />
                    ))}
                </div>
                <span className="mt-1 block text-center text-xs font-bold leading-tight text-slate-700">Tabla #{numero}</span>
                {estado === 'pagado' && (
                    <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </span>
                )}
                {estado === 'reservado' && <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-amber-500" />}
            </button>
        );
    }

    return (
        <div className="flex h-full flex-col bg-slate-50 lg:block lg:h-auto lg:min-h-full">
            {/* ════════════════════════════════════════════════════════════════
                HEADER DARK STICKY — mismo ancho/patrón que
                PaginaArticuloMarketplace (fondo negro + glow + grid pattern +
                línea de acento), aquí en ámbar (identidad de Dinámicas).
            ════════════════════════════════════════════════════════════════ */}
            <div className="shrink-0 z-30 lg:sticky lg:top-0 lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                <div
                    className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                    style={{ background: '#000000' }}
                >
                    {/* Glow ámbar arriba-derecha */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.10) 0%, transparent 55%)',
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
                    {/* Línea de acento superior (ámbar) */}
                    <div
                        className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
                        style={{ background: 'linear-gradient(90deg, transparent, #f59e0b 40%, #fbbf24 60%, transparent)' }}
                    />
                    {/* Línea de acento inferior (ámbar) */}
                    <div
                        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
                        style={{ background: 'linear-gradient(90deg, transparent, #f59e0b 40%, #fbbf24 60%, transparent)' }}
                    />

                    {/* Contenido del header */}
                    <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5 lg:px-4 lg:py-2.5">
                        {/* Bloque izquierdo: ← + icono ámbar + Detalle | título */}
                        <div className="flex min-w-0 items-center gap-1.5">
                            <button
                                data-testid="btn-volver-dinamica"
                                onClick={handleVolver}
                                aria-label="Volver"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: GRADIENTE_DINAMICAS }}
                            >
                                <Ticket className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
                            </div>
                            <span className="ml-1.5 shrink-0 text-2xl lg:text-xl font-extrabold tracking-tight text-white">
                                Detalle
                            </span>

                            {/* Separador vertical */}
                            <span
                                aria-hidden
                                className="ml-2 h-7 w-[1.5px] shrink-0 rounded-full bg-white/50"
                            />

                            {/* Título de la Dinámica (truncado) */}
                            <span className="ml-1 min-w-0 truncate text-sm font-semibold text-white/85 lg:text-base">
                                {dinamica.titulo}
                            </span>
                        </div>

                        {/* Bloque derecho: compartir + guardar. Tooltips solo
                            en desktop, mismo patrón que P2 de MarketPlace. */}
                        <div className="flex shrink-0 items-center gap-3">
                            <Tooltip text="Compartir Dinámica" position="bottom" className="hidden lg:block">
                                <DropdownCompartir
                                    url={linkCompartido}
                                    texto={`Mira "${dinamica.titulo}" en AnunciaYA`}
                                    titulo={dinamica.titulo}
                                    variante="dark"
                                />
                            </Tooltip>

                            <Tooltip text={guardado ? 'Quitar de guardados' : 'Guardar Dinámica'} position="bottom" className="hidden lg:block">
                                <button
                                    data-testid="btn-guardar-dinamica"
                                    onClick={handleGuardar}
                                    disabled={guardandoPendiente}
                                    aria-label={guardado ? 'Quitar de guardados' : 'Guardar Dinámica'}
                                    aria-pressed={guardado}
                                    className={`relative flex h-[38px] w-[38px] items-center justify-center rounded-full overflow-visible transition-transform duration-200 lg:cursor-pointer lg:hover:scale-110 active:opacity-70 disabled:opacity-50 ${
                                        guardado ? 'bg-white border-2 border-amber-500' : 'bg-transparent border-2 border-white/40 lg:hover:border-white/70'
                                    }`}
                                >
                                    {guardado && (
                                        <span
                                            aria-hidden
                                            className="pointer-events-none absolute -inset-1 rounded-full border-2 border-amber-500/40"
                                            style={{ animation: 'cardHeartRingPulse 2s ease-in-out infinite' }}
                                        />
                                    )}
                                    <Bookmark className="h-5 w-5" style={{ color: guardado ? '#f59e0b' : 'rgba(255,255,255,0.9)' }} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO — mismo ancho que PaginaArticuloMarketplace.
            ════════════════════════════════════════════════════════════════ */}
            <div
                ref={cuerpoRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24 lg:flex-none lg:overflow-visible lg:mx-auto lg:max-w-7xl lg:px-6 lg:pb-8 2xl:max-w-[920px] 2xl:px-4"
            >
                {/* Sala en vivo — único punto de entrada, pill sticky pegada
                    al header (mismo contenedor de scroll que él, por eso va
                    ANTES del `lg:pt-8` que empieza el hero — así no hereda
                    ese padding y queda a ras). SIN wrapper propio a
                    propósito: un `position:sticky` solo puede moverse dentro
                    de la caja de su padre inmediato — si lo envolvemos en un
                    `<div>` que solo mide lo que mide la pill, se queda sin
                    "cuarto" para despegarse y deja de sentirse sticky al
                    hacer scroll. Su padre real debe ser `cuerpoRef`
                    (alto = toda la página), no un wrapper angosto.
                    Visible en cuanto la Dinámica se publica — pero solo
                    para el organizador mientras la sala no esté programada
                    (nadie más tiene nada que ver ahí todavía). */}
                {dinamica.estado !== 'borrador' && dinamica.estado !== 'cancelada' && (esOrganizador || dinamica.salaProgramadaPara) && (
                    <BotonSalaEnVivo
                        estado={dinamica.estado}
                        salaProgramadaPara={dinamica.salaProgramadaPara}
                        onClick={() => navigate(`/marketplace/dinamica/${dinamica.id}/sala`)}
                        compensarHeaderDesktop
                    />
                )}

                {/* ─── HERO: Galería (izq) + Info/organizador/acciones (der) ─── */}
                <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8 lg:pt-8">
                    <div className="relative min-w-0">
                        <GaleriaArticulo fotos={dinamica.fotosPremio} titulo={dinamica.titulo} ajusteImagen="cover" />

                        {/* Bloque info — SOLO en móvil. En desktop va en col-derecha. */}
                        <div className="relative mx-3 mt-5 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:hidden">
                            {esOrganizador && (
                                <MenuAccionesOrganizadorDinamica
                                    dinamica={dinamica}
                                    aceptaParticipantes={aceptaParticipantes}
                                    onEditarBorrador={() => navigate(`/marketplace?dinamicas=1&editarDinamica=${dinamica.id}`, { replace: true })}
                                    onEditar={() => setModalEditarAbierto(true)}
                                    onAgregarManual={() => setModalManualAbierto(true)}
                                    onPosponer={() => setModalPosponerAbierto(true)}
                                    onCancelar={() => setModalCancelarAbierto(true)}
                                />
                            )}
                            <BloqueInfoDinamica dinamica={dinamica} cuentaRegresiva={cuentaRegresiva} conReservaKebab={esOrganizador} />
                        </div>

                        <div className="mx-3 mt-4 lg:hidden">
                            <CardOrganizadorDinamica dinamica={dinamica} usuarioActualId={usuarioActual?.id} onContactar={contactarOrganizador} />
                        </div>
                    </div>

                    {/* Columna derecha del hero — solo desktop. */}
                    <div className="hidden lg:block min-w-0">
                        <div className="space-y-3">
                            <div className="relative rounded-xl border-2 border-slate-300 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)]">
                                {esOrganizador && (
                                    <MenuAccionesOrganizadorDinamica
                                        dinamica={dinamica}
                                        aceptaParticipantes={aceptaParticipantes}
                                        onEditarBorrador={() => navigate(`/marketplace?dinamicas=1&editarDinamica=${dinamica.id}`, { replace: true })}
                                        onEditar={() => setModalEditarAbierto(true)}
                                        onAgregarManual={() => setModalManualAbierto(true)}
                                        onPosponer={() => setModalPosponerAbierto(true)}
                                        onCancelar={() => setModalCancelarAbierto(true)}
                                    />
                                )}
                                <BloqueInfoDinamica dinamica={dinamica} cuentaRegresiva={cuentaRegresiva} conReservaKebab={esOrganizador} />
                            </div>

                            <CardOrganizadorDinamica dinamica={dinamica} usuarioActualId={usuarioActual?.id} onContactar={contactarOrganizador} />

                            <CardComoFunciona />
                        </div>
                    </div>
                </div>

                {/* ─── RESTO DEL CONTENIDO — ancho completo ─── */}
                <div className="min-w-0 space-y-5 lg:space-y-6 mt-5 lg:mt-6">
                    {/* Descripción — la fecha límite va como columna a la
                        derecha del header, mismo patrón ícono+título que
                        "Descripción" pero alineada a la derecha. */}
                    {dinamica.descripcion && (
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:mx-0 lg:p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h2 className="mb-2 flex items-center gap-1.5 text-base font-bold text-slate-900">
                                        <FileText className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                        Descripción
                                    </h2>
                                    <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
                                        {dinamica.descripcion}
                                    </p>
                                </div>
                                {cuentaRegresiva && (
                                    <div className="shrink-0 text-right">
                                        <h2 className="mb-2 flex items-center justify-end gap-1.5 text-base font-bold text-slate-900">
                                            Fecha
                                            <Calendar className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                        </h2>
                                        <p className="whitespace-nowrap text-sm font-semibold text-amber-700">
                                            {cuentaRegresiva.replace(/^Fecha: /, '')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Trust box — SOLO en móvil (desktop ya la muestra en el hero). */}
                    <div className="mx-3 lg:hidden">
                        <CardComoFunciona />
                    </div>

                    {/* Carrusel horizontal de boletos */}
                    {aceptaParticipantes && dinamica.numeroTotalBoletos && (
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:mx-0 lg:p-4">
                            <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-slate-900">
                                <Ticket className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                Boletos
                                <span className="font-bold text-slate-600">
                                    ({dinamica.boletosPagados}/{dinamica.numeroTotalBoletos} vendidos)
                                </span>
                            </h2>

                            {esCartaUnica ? (
                                esMobile ? (
                                    /* Móvil — carrusel Embla (no CSS-only, ver el porqué en
                                       los hooks declarados arriba). Cada slide es una
                                       columna con 2 boletos apilados. */
                                    <div ref={emblaRefBoletos} className="touch-pan-y overflow-hidden">
                                        <div className="flex gap-2">
                                            {paresBoletosCartaUnica.map((par, i) => (
                                                <div key={i} className="flex shrink-0 grow-0 basis-[calc(50%-0.25rem)] flex-col gap-2">
                                                    {par.map((numero) => renderBotonCarta(numero))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Escritorio — grid de 5 columnas que ENVUELVE sin
                                       scroll (con solo 54 boletos fijos ya cabe completo). */
                                    <div className="grid grid-cols-5 gap-2">{numerosBoletosCartaUnica.map((numero) => renderBotonCarta(numero))}</div>
                                )
                            ) : esTablaCompleta ? (
                                esMobile ? (
                                    /* Móvil — mismo carrusel Embla, pero 1 tabla por slide (el
                                       4×4 de miniaturas necesita más ancho que una sola carta). */
                                    <div ref={emblaRefBoletos} className="touch-pan-y overflow-hidden">
                                        <div className="flex gap-2">
                                            {numerosBoletosCartaUnica.map((numero) => (
                                                <div key={numero} className="shrink-0 grow-0 basis-[92%]">
                                                    {renderBotonTabla(numero)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Escritorio — grid de 3 columnas (cada tarjeta es un
                                       4×4 de miniaturas, más ancha que una sola carta). */
                                    <div className="grid grid-cols-3 gap-2">{numerosBoletosCartaUnica.map((numero) => renderBotonTabla(numero))}</div>
                                )
                            ) : (
                                <div className="relative">
                                    {/* grid-flow-col + grid-rows fijo a 5: los boletos
                                        llenan 5 filas y luego arrancan una columna nueva a
                                        la derecha — crece horizontal (scroll con flechas),
                                        nunca vertical. */}
                                    <div
                                        ref={boletosScrollRef}
                                        className="grid touch-pan-x grid-flow-col grid-rows-[repeat(5,3.5rem)] auto-cols-[3.5rem] gap-2 overflow-x-auto scroll-smooth px-10 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    >
                                        {Array.from({ length: dinamica.numeroTotalBoletos }, (_, i) => dinamica.numeroBoletoInicial + i).map((numero) => {
                                            const boleto = mapaBoletos.get(numero);
                                            const estado = boleto?.estado ?? 'disponible';
                                            // El organizador no puede reservarse boletos de su
                                            // propia Dinámica (backend lo rechaza con 403) — en
                                            // vez de mostrarle el recuadro bloqueado, click sobre
                                            // uno disponible abre "Agregar Participante" con ese
                                            // boleto ya elegido (para registrar a alguien que le
                                            // pagó por fuera). Cualquier otra persona ve el flujo
                                            // normal de "Reservar boleto".
                                            return (
                                                <button
                                                    key={numero}
                                                    data-testid={`boleto-${numero}`}
                                                    disabled={estado !== 'disponible'}
                                                    title={esOrganizador && estado === 'disponible' ? 'Agregar participante en este boleto' : undefined}
                                                    onClick={() =>
                                                        esOrganizador
                                                            ? abrirAgregarManualConBoleto(numero)
                                                            : setBoletoSeleccionado(numero)
                                                    }
                                                    className={`flex h-14 w-14 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                                                        estado === 'pagado'
                                                            ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                                            : estado === 'reservado'
                                                              ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                                                              : esOrganizador
                                                                ? 'bg-slate-200 text-slate-700 lg:cursor-pointer lg:hover:bg-blue-600 lg:hover:text-white'
                                                                : 'bg-slate-200 text-slate-700 lg:cursor-pointer lg:hover:bg-amber-500 lg:hover:text-white'
                                                    }`}
                                                >
                                                    {numero}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Flechas — recorren el carrusel de boletos en vez de
                                        que la lista crezca hacia abajo. */}
                                    <button
                                        type="button"
                                        onClick={() => desplazarBoletos(-1)}
                                        aria-label="Boletos anteriores"
                                        className="absolute left-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-300 bg-white shadow-md lg:cursor-pointer lg:hover:bg-slate-200"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-slate-700" strokeWidth={2.5} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => desplazarBoletos(1)}
                                        aria-label="Boletos siguientes"
                                        className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-300 bg-white shadow-md lg:cursor-pointer lg:hover:bg-slate-200"
                                    >
                                        <ChevronRight className="h-5 w-5 text-slate-700" strokeWidth={2.5} />
                                    </button>
                                </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> Disponible
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-100" /> Reservado
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100" /> Pagado
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Participantes — sin preview inline. Toda la card es un
                        botón que abre `ModalListaParticipantes` con la lista
                        completa (fullscreen en móvil, modal centrado en
                        desktop); así la ficha no crece verticalmente sin
                        límite (hasta 200 boletos posibles). "Mis boletos" (a
                        un lado, solo si el usuario actual tiene boletos
                        propios) abre el mismo modal filtrado a los suyos. */}
                    {participantesVisibles.length > 0 && (
                        <div className="mx-3 flex gap-2.5 lg:mx-0">
                            <button
                                type="button"
                                data-testid="btn-abrir-participantes"
                                onClick={() => setModalParticipantesAbierto(true)}
                                className="flex flex-1 items-center justify-between rounded-xl border-2 border-slate-300 bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:cursor-pointer lg:p-4 lg:hover:border-amber-400"
                            >
                                <span className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                                    <Users className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                    Participantes
                                    <span className="text-sm font-semibold text-slate-500">({participantesVisibles.length})</span>
                                </span>
                                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2.5} />
                            </button>

                            {misBoletos.length > 0 && (
                                <button
                                    type="button"
                                    data-testid="btn-abrir-mis-boletos"
                                    onClick={() => setModalMisBoletosAbierto(true)}
                                    className="flex flex-1 items-center justify-between rounded-xl border-2 border-slate-300 bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:cursor-pointer lg:p-4 lg:hover:border-amber-400"
                                >
                                    <span className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                                        <Ticket className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                        Mis boletos
                                        <span className="text-sm font-semibold text-slate-500">({misBoletos.length})</span>
                                    </span>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: reservar boleto — mismo patrón de header degradado que
                los modales de acción de Dinámicas (Posponer/Cancelar/etc.),
                vía los subcomponentes compartidos de ModalAccionGradiente. */}
            <ModalAdaptativo
                abierto={boletoSeleccionado !== null}
                onCerrar={() => setBoletoSeleccionado(null)}
                ancho="sm"
                mostrarHeader={false}
                paddingContenido="none"
                sinScrollInterno
                alturaMaxima="xl"
                colorHandle="rgba(255,255,255,0.4)"
                headerOscuro
                className="max-w-xs lg:max-w-sm 2xl:max-w-md"
            >
                <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                    <HeaderAccionGradiente
                        icono={Ticket}
                        titulo="Reservar boleto"
                        subtitulo={`Boleto #${boletoSeleccionado}${dinamica.precioBoleto ? ` · $${Number(dinamica.precioBoleto).toLocaleString('es-MX')}` : ''}`}
                        gradiente={GRADIENTE_DINAMICAS}
                    />
                    <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                        <ResumenAccionModal icono={Ticket} texto={dinamica.titulo} />

                        <AvisoContextualModal tono="amber">
                            El pago se coordina directamente con el organizador por ChatYA — la app no cobra ni entrega nada.
                        </AvisoContextualModal>

                        <BotonesAccionModal
                            onCerrar={() => setBoletoSeleccionado(null)}
                            onConfirmar={confirmarReserva}
                            pendiente={reservarBoleto.isPending}
                            textoConfirmar="Confirmar reserva"
                            textoPendiente="Reservando…"
                            colorBase="#f59e0b"
                            colorOscuro="#d97706"
                        />
                    </div>
                </div>
            </ModalAdaptativo>

            <ModalAgregarParticipanteDinamica
                abierto={modalManualAbierto}
                dinamica={dinamica}
                pendiente={agregarManual.isPending}
                numeroBoletoInicial={numeroBoletoParaAgregar}
                numerosOcupados={numerosOcupados}
                onCerrar={() => {
                    setModalManualAbierto(false);
                    setNumeroBoletoParaAgregar(null);
                }}
                onConfirmar={enviarParticipanteManual}
            />

            <ModalPosponerDinamica
                abierto={modalPosponerAbierto}
                dinamica={dinamica}
                pendiente={posponer.isPending}
                onCerrar={() => setModalPosponerAbierto(false)}
                onConfirmar={enviarPosponer}
            />

            <ModalCancelarDinamica
                abierto={modalCancelarAbierto}
                dinamica={dinamica}
                pendiente={cancelar.isPending}
                onCerrar={() => setModalCancelarAbierto(false)}
                onConfirmar={enviarCancelar}
            />

            <ModalEditarDinamica
                abierto={modalEditarAbierto}
                dinamica={dinamica}
                pendiente={editar.isPending}
                onCerrar={() => setModalEditarAbierto(false)}
                onConfirmar={enviarEditar}
            />

            <ModalListaParticipantes
                abierto={modalParticipantesAbierto}
                onCerrar={() => setModalParticipantesAbierto(false)}
                participantes={participantesVisibles}
                esOrganizador={esOrganizador}
                usuarioActualId={usuarioActual?.id}
                onContactar={abrirChatCon}
                onConfirmarPago={confirmarPagoDe}
                onLiberar={setBoletoParaLiberar}
                onEditar={setBoletoParaEditar}
                onReasignar={setBoletoParaReasignar}
            />

            <ModalListaParticipantes
                abierto={modalMisBoletosAbierto}
                onCerrar={() => setModalMisBoletosAbierto(false)}
                participantes={misBoletos}
                esOrganizador={false}
                usuarioActualId={usuarioActual?.id}
                onContactar={abrirChatCon}
                onConfirmarPago={confirmarPagoDe}
                onLiberar={setBoletoParaLiberar}
                onEditar={setBoletoParaEditar}
                onReasignar={setBoletoParaReasignar}
                titulo="Mis boletos"
                subtitulo={`${misBoletos.length} tuyos en esta Dinámica`}
                compacto
            />

            <ModalLiberarBoleto
                abierto={boletoParaLiberar !== null}
                boleto={
                    boletoParaLiberar
                        ? {
                              numeroBoleto: boletoParaLiberar.numeroBoleto,
                              nombreMostrado: boletoParaLiberar.usuario
                                  ? `${boletoParaLiberar.usuario.nombre} ${boletoParaLiberar.usuario.apellidos}`
                                  : (boletoParaLiberar.nombreManual ?? 'Sin cuenta AnunciaYA'),
                          }
                        : null
                }
                pendiente={liberarBoleto.isPending}
                onCerrar={() => setBoletoParaLiberar(null)}
                onConfirmar={confirmarLiberarBoleto}
            />

            <ModalEditarParticipante
                abierto={boletoParaEditar !== null}
                boleto={
                    boletoParaEditar
                        ? {
                              numeroBoleto: boletoParaEditar.numeroBoleto,
                              nombreManual: boletoParaEditar.nombreManual ?? '',
                              telefonoManual: boletoParaEditar.telefonoManual ?? '',
                          }
                        : null
                }
                pendiente={editarParticipante.isPending}
                numerosOcupados={numerosOcupados}
                onCerrar={() => setBoletoParaEditar(null)}
                onConfirmar={confirmarEditarParticipante}
            />

            <ModalReasignarBoleto
                abierto={boletoParaReasignar !== null}
                boleto={
                    boletoParaReasignar?.usuario
                        ? {
                              numeroBoleto: boletoParaReasignar.numeroBoleto,
                              nombreMostrado: `${boletoParaReasignar.usuario.nombre} ${boletoParaReasignar.usuario.apellidos}`,
                          }
                        : null
                }
                pendiente={reasignarBoleto.isPending}
                numerosOcupados={numerosOcupados}
                onCerrar={() => setBoletoParaReasignar(null)}
                onConfirmar={confirmarReasignarBoleto}
            />
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

interface BloqueInfoDinamicaProps {
    dinamica: DinamicaDetallePublico;
    cuentaRegresiva: string | null;
    /** Reserva espacio a la derecha del título para que no quede debajo del
     *  kebab de acciones del organizador (que se posiciona `absolute` sobre
     *  esta misma card, ver `MenuAccionesOrganizadorDinamica`). */
    conReservaKebab?: boolean;
}

/** Título + precio del boleto + chips de datos clave — usado tanto en el
 *  bloque móvil bajo la galería como en la card sticky de escritorio. */
function BloqueInfoDinamica({ dinamica, cuentaRegresiva, conReservaKebab }: BloqueInfoDinamicaProps) {
    return (
        <div className="space-y-2.5">
            <h1 className={`text-xl font-extrabold leading-snug text-slate-900 lg:text-lg ${conReservaKebab ? 'pr-10' : ''}`}>
                {dinamica.titulo}
            </h1>

            {dinamica.precioBoleto && (
                <p className="text-2xl font-extrabold leading-tight text-amber-700 lg:text-xl">
                    ${Number(dinamica.precioBoleto).toLocaleString('es-MX')}
                    <span className="ml-1.5 text-sm font-bold text-amber-700/80">por boleto</span>
                </p>
            )}

            {/* Lista en filas separadas por línea divisoria — sin fondos
                apilados (Regla 13), jerarquía por peso e ícono, color
                neutro para los datos descriptivos y el único acento (ámbar)
                reservado para la fecha, que es el dato accionable. */}
            <div className="divide-y divide-slate-200 border-t border-b border-slate-200 text-sm font-medium text-slate-600">
                {dinamica.tipoPremio && (
                    <div className="flex items-center gap-1.5 py-2">
                        <Gift className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.5} />
                        {ETIQUETA_TIPO_PREMIO[dinamica.tipoPremio]}
                    </div>
                )}
                {dinamica.metodoSorteo && (
                    <div className="flex items-center gap-1.5 py-2">
                        <Shuffle className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.5} />
                        {ETIQUETA_METODO[dinamica.metodoSorteo]}
                    </div>
                )}
                {cuentaRegresiva && (
                    <div className="flex items-center gap-1.5 py-2 font-semibold text-amber-700">
                        <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                        {cuentaRegresiva}
                    </div>
                )}
            </div>
        </div>
    );
}

interface MenuAccionesOrganizadorProps {
    dinamica: DinamicaDetallePublico;
    aceptaParticipantes: boolean;
    onEditarBorrador: () => void;
    onEditar: () => void;
    onAgregarManual: () => void;
    onPosponer: () => void;
    onCancelar: () => void;
}

/**
 * Menú "⋯" con las acciones del organizador (editar borrador / agregar
 * participante manual / posponer / cancelar) — mismo patrón kebab que
 * `CardDinamicaMio.tsx` en "Mis Publicaciones", aquí anclado a la esquina
 * superior derecha de la card de info/precio. Solo se monta cuando
 * `esOrganizador` es `true` (ver usos), así que no hace su propio chequeo.
 *
 * "Editar borrador" (estado 'borrador') y "Editar" (activa/pospuesta) son
 * acciones DISTINTAS a propósito: la primera abre el composer completo
 * (`onEditarBorrador`, navega a `?editarDinamica=`), la segunda abre
 * `ModalEditarDinamica` inline (`onEditar`) y solo permite tocar título,
 * descripción y fotos — el backend bloquea el resto una vez publicada.
 */
function MenuAccionesOrganizadorDinamica({
    dinamica,
    aceptaParticipantes,
    onEditarBorrador,
    onEditar,
    onAgregarManual,
    onPosponer,
    onCancelar,
}: MenuAccionesOrganizadorProps) {
    const [abierto, setAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-menu-toggle-dinamica-detalle]')) return;
            if (menuRef.current && !menuRef.current.contains(target)) setAbierto(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [abierto]);

    if (dinamica.estado !== 'borrador' && !aceptaParticipantes) return null;

    const disparar = (fn: () => void) => {
        setAbierto(false);
        fn();
    };

    return (
        <div className="absolute right-3 top-3 z-10">
            <button
                type="button"
                data-menu-toggle-dinamica-detalle
                onClick={() => setAbierto((v) => !v)}
                aria-label="Acciones de la Dinámica"
                aria-expanded={abierto}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 lg:cursor-pointer lg:hover:bg-slate-200"
            >
                <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
            </button>

            {abierto && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-11 w-56 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
                    role="menu"
                >
                    {dinamica.estado === 'borrador' && (
                        <ItemMenuDinamica icono={Pencil} onClick={() => disparar(onEditarBorrador)}>
                            Editar borrador
                        </ItemMenuDinamica>
                    )}
                    {aceptaParticipantes && (
                        <>
                            <ItemMenuDinamica icono={Pencil} iconColor="text-amber-600" onClick={() => disparar(onEditar)}>
                                Editar
                            </ItemMenuDinamica>
                            <ItemMenuDinamica icono={UserPlus} iconColor="text-blue-600" onClick={() => disparar(onAgregarManual)}>
                                Agregar Participante
                            </ItemMenuDinamica>
                            <ItemMenuDinamica icono={CalendarClock} iconColor="text-amber-600" onClick={() => disparar(onPosponer)}>
                                Posponer
                            </ItemMenuDinamica>
                            <ItemMenuDinamica
                                icono={Ban}
                                iconColor="text-red-600"
                                textColor="text-red-600"
                                hoverClass="lg:hover:bg-red-100"
                                onClick={() => disparar(onCancelar)}
                            >
                                Cancelar Dinámica
                            </ItemMenuDinamica>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

interface ItemMenuDinamicaProps {
    icono: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    iconColor?: string;
    textColor?: string;
    hoverClass?: string;
    onClick: () => void;
    children: React.ReactNode;
}

function ItemMenuDinamica({
    icono: Icono,
    iconColor = 'text-slate-600',
    textColor = 'text-slate-700',
    hoverClass = 'lg:hover:bg-slate-100',
    onClick,
    children,
}: ItemMenuDinamicaProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            role="menuitem"
            className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold lg:cursor-pointer ${textColor} ${hoverClass}`}
        >
            <Icono className={`h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={2.5} />
            {children}
        </button>
    );
}

interface CardOrganizadorDinamicaProps {
    dinamica: DinamicaDetallePublico;
    usuarioActualId: string | undefined;
    onContactar: () => void;
}

/**
 * Card del organizador — calca el patrón `CardVendedor.tsx` (MarketPlace) /
 * `OferenteCard.tsx` (Servicios): avatar con ring, nombre en 2 líneas con
 * `BadgeCheck` invertido, actividad (dot + "Activo hace...") a la izquierda
 * y "Ver perfil →" a la derecha en el mismo renglón. Solo el link navega —
 * el resto de la card no es clickeable, mismo contrato que los otros 2.
 */
function CardOrganizadorDinamica({ dinamica, usuarioActualId, onContactar }: CardOrganizadorDinamicaProps) {
    const navigate = useNavigate();
    const irAlPerfil = () => navigate(`/marketplace/usuario/${dinamica.organizador.id}?tab=dinamicas`);
    const conexionLabel = formatearUltimaConexion(dinamica.organizador.ultimaConexion ?? null);
    const [avatarAbierto, setAvatarAbierto] = useState(false);

    return (
        <div className="flex w-full flex-col gap-2 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-md">
            {/* Línea 1: avatar + nombre + verification */}
            <div className="flex items-center gap-2">
                <div
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200 ${dinamica.organizador.avatarUrl ? 'cursor-pointer' : ''}`}
                    onClick={dinamica.organizador.avatarUrl ? () => setAvatarAbierto(true) : undefined}
                >
                    {dinamica.organizador.avatarUrl ? (
                        <img
                            src={dinamica.organizador.avatarUrl}
                            alt={`Avatar de ${dinamica.organizador.nombre}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div
                            className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                            style={{ background: GRADIENTE_DINAMICAS }}
                        >
                            {obtenerIniciales(dinamica.organizador.nombre, dinamica.organizador.apellidos)}
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight lg:text-base">
                        <span className="block truncate">{dinamica.organizador.nombre}</span>
                        <span className="flex items-center gap-1">
                            <span className="truncate">{dinamica.organizador.apellidos}</span>
                            <BadgeCheck
                                className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                                strokeWidth={2.5}
                                aria-label="Usuario verificado"
                            />
                        </span>
                    </h3>
                </div>
            </div>

            {/* Trust badge (insignia) + ícono ChatYA en el mismo renglón —
                único punto de contacto de la card, sin duplicar el botón
                "Contactar" que antes también vivía en el bloque de info de
                arriba. */}
            <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700 lg:text-xs 2xl:text-sm">
                    {ETIQUETA_INSIGNIA[dinamica.insigniaOrganizador.nivel]}
                </span>
                {usuarioActualId !== dinamica.organizador.id && (
                    <button
                        type="button"
                        onClick={onContactar}
                        aria-label="Contactar por ChatYA"
                        className="flex shrink-0 items-center justify-center lg:cursor-pointer lg:hover:opacity-80"
                    >
                        <img src="/ChatYA.webp" alt="" className="h-8 w-auto object-contain" />
                    </button>
                )}
            </div>

            {/* Fila: actividad (izquierda) + Ver perfil (derecha), mismo
                renglón. */}
            <div className="flex items-center gap-2">
                {conexionLabel && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                        {conexionLabel}
                    </div>
                )}
                <button
                    type="button"
                    onClick={irAlPerfil}
                    aria-label={`Ver perfil de ${dinamica.organizador.nombre} ${dinamica.organizador.apellidos}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-amber-700 lg:cursor-pointer lg:hover:text-amber-900 lg:hover:underline"
                >
                    Ver perfil
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {avatarAbierto && dinamica.organizador.avatarUrl && (
                <ModalImagenes
                    images={[dinamica.organizador.avatarUrl]}
                    initialIndex={0}
                    isOpen={avatarAbierto}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}
        </div>
    );
}

/** Trust box amber — equivalente a `CardCompraSegura` de MarketPlace, con
 *  puntos adaptados al contexto de una Dinámica. */
function CardComoFunciona() {
    const tips: Array<{ icono: React.ComponentType<{ className?: string; strokeWidth?: number }>; texto: string }> = [
        { icono: MapPin, texto: 'El pago del boleto se coordina directamente con el organizador, fuera de la app' },
        { icono: UserCheck, texto: 'La lista de participantes es pública — cualquiera puede verificarla' },
        { icono: ShieldCheck, texto: 'AnunciaYA no cobra ni entrega el premio, solo conecta organizador y participantes' },
        { icono: Flag, texto: 'Reporta cualquier comportamiento sospechoso' },
    ];
    return (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-md">
            <div className="mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-700" strokeWidth={2.5} />
                <h2 className="text-base font-bold text-amber-900">Cómo funciona</h2>
            </div>
            <ul className="space-y-1.5">
                {tips.map(({ icono: Icono, texto }) => (
                    <li key={texto} className="flex items-start gap-1.5 text-sm font-medium leading-snug text-amber-900">
                        <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" strokeWidth={2.5} />
                        <span>{texto}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// =============================================================================
// FilaParticipante — una fila de la lista, compartida entre el preview
// inline y `ModalListaParticipantes`.
// =============================================================================

interface FilaParticipanteProps {
    boleto: BoletoDinamica;
    esOrganizador: boolean;
    usuarioActualId: string | undefined;
    onContactar: (usuario: OrganizadorDinamica) => void;
    onConfirmarPago: (boletoId: string) => void;
    onEditar: (boleto: BoletoDinamica) => void;
    onReasignar: (boleto: BoletoDinamica) => void;
    onLiberar: (boleto: BoletoDinamica) => void;
    /** "Mis boletos" — normalmente 1-2 filas, un poco más de aire por fila
     *  se nota y no cuesta nada (a diferencia de "Participantes", donde
     *  puede haber hasta 200). */
    compacto?: boolean;
}

function FilaParticipante({
    boleto,
    esOrganizador,
    usuarioActualId,
    onContactar,
    onConfirmarPago,
    onEditar,
    onReasignar,
    onLiberar,
    compacto = false,
}: FilaParticipanteProps) {
    // Fila del propio usuario (viendo la lista como participante, no como
    // organizador) — se resalta en ámbar para que se ubique de un vistazo
    // entre el resto, en vez de tener que leer nombre por nombre.
    const esPropia = !!usuarioActualId && boleto.usuario?.id === usuarioActualId;

    return (
        <div className={`flex items-center gap-2 ${compacto ? 'px-4 py-3.5' : 'px-3 py-2.5'} ${esPropia ? 'bg-amber-50' : ''}`}>
            <span className={`w-8 shrink-0 text-xs font-bold ${esPropia ? 'text-amber-800' : 'text-slate-600'}`}>
                #{boleto.numeroBoleto}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className={`min-w-0 truncate text-sm font-medium ${esPropia ? 'text-amber-900' : 'text-slate-800'}`}>
                    {boleto.usuario ? (
                        `${boleto.usuario.nombre} ${boleto.usuario.apellidos}`
                    ) : (
                        <>
                            {boleto.nombreManual} <span className="text-blue-700">· Sin cuenta AnunciaYA</span>
                        </>
                    )}
                    {esPropia && <span className="ml-1 font-bold text-amber-700">(Tú)</span>}
                </span>
                {/* Solo el organizador puede contactar a un participante
                    desde aquí — la lista es pública para transparencia
                    (verificar quién participa), pero eso no autoriza a que
                    cualquier visitante le escriba directo a la gente. */}
                {esOrganizador && boleto.usuario && usuarioActualId !== boleto.usuario.id && (
                    <Tooltip text="Contactar por ChatYA" position="top">
                        <button
                            type="button"
                            onClick={() => onContactar(boleto.usuario!)}
                            aria-label="Contactar por ChatYA"
                            className="flex shrink-0 items-center justify-center rounded-full p-0.5 transition-transform duration-200 active:opacity-70 lg:cursor-pointer lg:hover:scale-110"
                        >
                            <img src="/ChatYA.webp" alt="" className="h-7 w-auto object-contain" />
                        </button>
                    </Tooltip>
                )}
            </div>
            {/* Para el organizador, cuando está "reservado" el botón
                "Confirmar pago" ya comunica el estado — mostrar también la
                badge "Reservado" ahí es redundante. Para cualquier otra
                persona (que no ve ese botón) la badge sigue siendo la única
                señal de estado, así que se queda. "Pagado" no tiene botón
                que la reemplace, así que se muestra siempre. */}
            {!(esOrganizador && boleto.estado === 'reservado') && (
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        boleto.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    {boleto.estado === 'pagado' ? 'Pagado' : 'Reservado'}
                </span>
            )}
            {/* "Editar" solo aplica a participantes "Sin cuenta AY" (el
                organizador los dio de alta a mano, puede corregir nombre y
                teléfono además del número); "Reasignar" es su equivalente
                para usuarios CON cuenta AY — solo cambia el número, nunca
                nombre/teléfono (son del usuario) y le avisa por
                notificación. "Liberar" aplica a cualquier boleto de la
                lista — deshacer un registro con o sin cuenta. */}
            {esOrganizador && !boleto.usuario && (
                <Tooltip text="Editar participante" position="top">
                    <button
                        type="button"
                        onClick={() => onEditar(boleto)}
                        aria-label="Editar participante"
                        className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-amber-600 lg:cursor-pointer lg:hover:bg-amber-100"
                    >
                        <Pencil className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </Tooltip>
            )}
            {esOrganizador && boleto.usuario && (
                <Tooltip text="Reasignar boleto" position="top">
                    <button
                        type="button"
                        onClick={() => onReasignar(boleto)}
                        aria-label="Reasignar boleto"
                        className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-blue-600 lg:cursor-pointer lg:hover:bg-blue-100"
                    >
                        <Repeat className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </Tooltip>
            )}
            {esOrganizador && (
                <Tooltip text="Liberar boleto" position="top">
                    <button
                        type="button"
                        onClick={() => onLiberar(boleto)}
                        aria-label="Liberar boleto"
                        className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-red-600 lg:cursor-pointer lg:hover:bg-red-100"
                    >
                        <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </Tooltip>
            )}
            {esOrganizador && boleto.estado === 'reservado' && (
                <Tooltip text="Confirmar pago" position="top">
                    <button
                        type="button"
                        onClick={() => onConfirmarPago(boleto.id)}
                        aria-label="Confirmar pago"
                        className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-emerald-600 lg:cursor-pointer lg:hover:bg-emerald-100"
                    >
                        <CircleCheck className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

// =============================================================================
// ModalListaParticipantes — lista completa de participantes. Móvil: página
// completa (mismo patrón que `ComposerSection.tsx` de MarketPlace/Servicios
// — sin overlay oscuro, cubre todo el viewport). Desktop: `ModalAdaptativo`
// centrado con scroll interno.
// =============================================================================

interface ModalListaParticipantesProps {
    abierto: boolean;
    onCerrar: () => void;
    participantes: BoletoDinamica[];
    esOrganizador: boolean;
    usuarioActualId: string | undefined;
    onContactar: (usuario: OrganizadorDinamica) => void;
    onConfirmarPago: (boletoId: string) => void;
    onEditar: (boleto: BoletoDinamica) => void;
    onReasignar: (boleto: BoletoDinamica) => void;
    onLiberar: (boleto: BoletoDinamica) => void;
    /** "Participantes" (default, lista completa) o "Mis boletos" (filtrada a
     *  los del usuario actual, abierta desde su propio botón). */
    titulo?: string;
    /** Texto bajo el título — default deriva de `titulo` + el conteo. */
    subtitulo?: string;
    /** "Mis boletos" — normalmente 1 o poquísimos boletos, un modal a pantalla
     *  completa/altura fija se ve vacío y exagerado. En `compacto` el modal
     *  se ajusta al contenido (sin el alto fijo `h-[80vh]`) y en móvil usa el
     *  mismo `ModalAdaptativo` centrado que desktop en vez de la página
     *  fullscreen — la lista de Participantes (potencialmente 200 filas)
     *  sigue usando el modo completo por default. */
    compacto?: boolean;
}

function ModalListaParticipantes({
    abierto,
    onCerrar,
    participantes,
    esOrganizador,
    usuarioActualId,
    onContactar,
    onConfirmarPago,
    onEditar,
    onReasignar,
    onLiberar,
    titulo = 'Participantes',
    subtitulo,
    compacto = false,
}: ModalListaParticipantesProps) {
    const { esMobile } = useBreakpoint();
    const portalTarget = usePortalTarget();
    const esContenido = portalTarget !== document.body;
    const [busqueda, setBusqueda] = useState('');

    // `compacto` (ej. "Mis boletos") nunca usa la página fullscreen de
    // móvil — siempre el `ModalAdaptativo` centrado, que ya maneja su
    // propio bloqueo de scroll y back nativo.
    const usaFullscreenMovil = esMobile && !compacto;
    const abiertoMovil = abierto && usaFullscreenMovil;
    useBackNativo({
        abierto: abiertoMovil,
        onCerrar,
        discriminador: '_dinamicaListaParticipantes',
    });

    // Limpiar la búsqueda cada vez que el modal se ABRE — no debe arrastrar
    // el filtro de la última vez que se usó.
    useEffect(() => {
        if (abierto) setBusqueda('');
    }, [abierto]);

    // Bloquear scroll del body mientras la página completa está abierta —
    // mismo mecanismo que `ComposerSection.tsx`.
    useEffect(() => {
        if (!abiertoMovil || esContenido) return;
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.bottom = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.bottom = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, [abiertoMovil, esContenido]);

    // Buscador — solo el organizador lo ve (necesita ubicar rápido a alguien
    // entre muchos boletos para gestionarlo); busca por número exacto/parcial
    // o por nombre (con o sin cuenta AY).
    const consulta = busqueda.trim().toLowerCase();
    const participantesFiltrados = useMemo(() => {
        if (!esOrganizador || !consulta) return participantes;
        return participantes.filter((b) => {
            const nombre = b.usuario ? `${b.usuario.nombre} ${b.usuario.apellidos}` : (b.nombreManual ?? '');
            return String(b.numeroBoleto).includes(consulta) || nombre.toLowerCase().includes(consulta);
        });
    }, [participantes, esOrganizador, consulta]);

    const lista = (
        <div className="min-h-0 flex-1 overflow-y-auto">
            {esOrganizador && (
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por número o nombre..."
                            className="w-full rounded-full border-2 border-slate-300 bg-slate-100 py-2 pl-9 pr-9 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-amber-500 focus:bg-white"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                aria-label="Limpiar búsqueda"
                                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 lg:cursor-pointer lg:hover:bg-slate-300 lg:hover:text-slate-700"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>
            )}
            {participantesFiltrados.length === 0 ? (
                <p className="p-6 text-center text-sm font-medium text-slate-500">Nadie coincide con "{busqueda}".</p>
            ) : (
                <div className={`divide-y divide-slate-200 ${compacto ? 'py-1' : ''}`}>
                    {participantesFiltrados.map((b) => (
                        <FilaParticipante
                            key={b.id}
                            boleto={b}
                            esOrganizador={esOrganizador}
                            usuarioActualId={usuarioActualId}
                            compacto={compacto}
                            onContactar={onContactar}
                            onConfirmarPago={onConfirmarPago}
                            onEditar={onEditar}
                            onReasignar={onReasignar}
                            onLiberar={onLiberar}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const header = (
        <div className="relative shrink-0">
            <HeaderAccionGradiente
                icono={Users}
                titulo={titulo}
                subtitulo={subtitulo ?? `${participantes.length} en esta Dinámica`}
                gradiente={GRADIENTE_DINAMICAS}
                compacto={compacto}
            />
            <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white lg:cursor-pointer lg:hover:bg-white/15"
            >
                <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
        </div>
    );

    if (usaFullscreenMovil) {
        if (!abierto) return null;
        return createPortal(
            <div
                data-testid="modal-lista-participantes-fullscreen"
                className={`${esContenido ? 'absolute' : 'fixed'} inset-0 z-52 flex flex-col bg-white`}
                style={esContenido ? undefined : { paddingTop: 'env(safe-area-inset-top)' }}
            >
                {header}
                {lista}
            </div>,
            portalTarget,
        );
    }

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="md"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            discriminador={compacto ? '_dinamicaMisBoletos' : '_dinamicaListaParticipantes'}
            className={compacto ? 'max-w-xs lg:max-w-sm 2xl:max-w-md' : 'h-[80vh] max-w-sm lg:max-w-lg 2xl:max-w-xl'}
        >
            {/* Modo completo ("Participantes"): `h-full` (no `max-h`) — el
                modal siempre ocupa el mismo alto fijo, tenga 1 participante
                o 200, en vez de encogerse al tamaño del contenido. Modo
                `compacto` ("Mis boletos"): se ajusta al contenido pero con
                un piso (`min-h`) para que no se vea aplastado con 1-2
                boletos, y un tope (`max-h-[60vh]`) + scroll propio por si
                acaso son varios. */}
            <div className={compacto ? 'flex max-h-[60vh] min-h-[260px] flex-col' : 'flex h-full flex-col'}>
                {header}
                {lista}
            </div>
        </ModalAdaptativo>
    );
}

export default PaginaDinamica;
