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
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    Ban,
    BadgeCheck,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flag,
    Loader2,
    MapPin,
    MoreVertical,
    Pencil,
    ShieldCheck,
    Ticket,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { Icon, ICONOS, type IconProps } from '@/config/iconos';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
import { useIniciarChatDinamica } from '../../../hooks/useIniciarChatDinamica';
import {
    useDinamica,
    useBoletosDinamica,
    useReservarBoleto,
    useAgregarParticipanteManual,
    useConfirmarPagoBoleto,
    usePosponerDinamica,
    useCancelarDinamica,
} from '../../../hooks/queries/useDinamicas';
import { GaleriaArticulo } from '../../../components/marketplace/GaleriaArticulo';
import { DropdownCompartir } from '../../../components/compartir/DropdownCompartir';
import Tooltip from '../../../components/ui/Tooltip';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { ModalImagenes } from '../../../components/ui/ModalImagenes';
import { notificar } from '../../../utils/notificaciones';
import { formatearUltimaConexion } from '../../../utils/marketplace';
import type { BoletoDinamica, DinamicaDetallePublico } from '../../../types/dinamicas';

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
    const restante = new Date(fechaLimite).getTime() - Date.now();
    if (restante <= 0) return 'Inscripción cerrada';
    const dias = Math.floor(restante / (24 * 60 * 60 * 1000));
    if (dias >= 1) return `Cierra en ${dias} día${dias === 1 ? '' : 's'}`;
    const horas = Math.floor(restante / (60 * 60 * 1000));
    if (horas >= 1) return `Cierra en ${horas}h`;
    const min = Math.floor(restante / (60 * 1000));
    return `Cierra en ${min}min`;
}

export function PaginaDinamica() {
    const { dinamicaId } = useParams<{ dinamicaId: string }>();
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/marketplace?dinamicas=1');
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChat = useIniciarChatDirectoPersona();
    const iniciarChatDinamica = useIniciarChatDinamica();

    const { data: dinamica, isLoading, isError } = useDinamica(dinamicaId ?? null);
    const { data: boletos = [] } = useBoletosDinamica(dinamicaId ?? null);

    const reservarBoleto = useReservarBoleto();
    const agregarManual = useAgregarParticipanteManual();
    const confirmarPago = useConfirmarPagoBoleto();
    const posponer = usePosponerDinamica();
    const cancelar = useCancelarDinamica();

    const [boletoSeleccionado, setBoletoSeleccionado] = useState<number | null>(null);
    const [modalManualAbierto, setModalManualAbierto] = useState(false);
    const [modalPosponerAbierto, setModalPosponerAbierto] = useState(false);
    const [formManual, setFormManual] = useState({ numeroBoleto: '', nombreManual: '', telefonoManual: '' });
    const [nuevaFecha, setNuevaFecha] = useState('');
    const boletosScrollRef = useRef<HTMLDivElement>(null);

    const esOrganizador = !!usuarioActual && !!dinamica && usuarioActual.id === dinamica.organizadorUsuarioId;

    const mapaBoletos = useMemo(() => {
        const mapa = new Map<number, BoletoDinamica>();
        for (const b of boletos) mapa.set(b.numeroBoleto, b);
        return mapa;
    }, [boletos]);

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
        if (usuarioActual?.id === dinamica.organizador.id) return;
        iniciarChatDinamica(dinamica);
    }

    function desplazarBoletos(direccion: 1 | -1) {
        const el = boletosScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: 'smooth' });
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

    async function enviarParticipanteManual() {
        if (!dinamicaId) return;
        const numero = Number(formManual.numeroBoleto);
        if (!numero || !formManual.nombreManual.trim() || !formManual.telefonoManual.trim()) {
            notificar.error('Completa número de boleto, nombre y teléfono.');
            return;
        }
        const r = await agregarManual.mutateAsync({
            dinamicaId,
            numeroBoleto: numero,
            nombreManual: formManual.nombreManual.trim(),
            telefonoManual: formManual.telefonoManual.trim(),
        });
        if (r.success) {
            notificar.exito('Participante agregado.');
            setModalManualAbierto(false);
            setFormManual({ numeroBoleto: '', nombreManual: '', telefonoManual: '' });
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

    async function enviarPosponer() {
        if (!dinamicaId || !nuevaFecha) return;
        const r = await posponer.mutateAsync({ dinamicaId, nuevaFechaLimiteInscripcion: new Date(nuevaFecha).toISOString() });
        if (r.success) {
            notificar.exito('Dinámica pospuesta.');
            setModalPosponerAbierto(false);
        } else {
            notificar.error(r.message);
        }
    }

    async function enviarCancelar() {
        if (!dinamicaId) return;
        if (!window.confirm('¿Cancelar esta Dinámica? Esta acción no se puede deshacer.')) return;
        const r = await cancelar.mutateAsync(dinamicaId);
        if (r.success) notificar.exito('Dinámica cancelada.');
        else notificar.error(r.message);
    }

    // Placeholder mientras se diseña la página pública compartible (pendiente
    // aparte) — apunta a la ficha privada por ahora, no a un link público.
    const linkCompartido =
        typeof window !== 'undefined'
            ? `${window.location.origin}/marketplace/dinamica/${dinamica.id}`
            : `/marketplace/dinamica/${dinamica.id}`;

    function handleGuardar() {
        notificar.info('Guardar Dinámicas estará disponible pronto.');
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
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

                            <Tooltip text="Guardar Dinámica" position="bottom" className="hidden lg:block">
                                <button
                                    data-testid="btn-guardar-dinamica"
                                    onClick={handleGuardar}
                                    aria-label="Guardar Dinámica"
                                    className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-white/40 bg-transparent overflow-visible transition-transform duration-200 lg:cursor-pointer lg:hover:scale-110 lg:hover:border-white/70 active:opacity-70"
                                >
                                    <Bookmark className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.9)' }} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO — mismo ancho que PaginaArticuloMarketplace.
            ════════════════════════════════════════════════════════════════ */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-8 2xl:max-w-[920px] 2xl:px-4">
                {/* ─── HERO: Galería (izq) + Info/organizador/acciones (der) ─── */}
                <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                    <div className="relative min-w-0">
                        <GaleriaArticulo fotos={dinamica.fotosPremio} titulo={dinamica.titulo} ajusteImagen="cover" />

                        {/* Bloque info — SOLO en móvil. En desktop va en col-derecha. */}
                        <div className="relative mx-3 mt-5 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:hidden">
                            {esOrganizador && (
                                <MenuAccionesOrganizadorDinamica
                                    dinamica={dinamica}
                                    aceptaParticipantes={aceptaParticipantes}
                                    onEditarBorrador={() => navigate(`/marketplace?dinamicas=1&editarDinamica=${dinamica.id}`, { replace: true })}
                                    onAgregarManual={() => setModalManualAbierto(true)}
                                    onPosponer={() => setModalPosponerAbierto(true)}
                                    onCancelar={enviarCancelar}
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
                                        onAgregarManual={() => setModalManualAbierto(true)}
                                        onPosponer={() => setModalPosponerAbierto(true)}
                                        onCancelar={enviarCancelar}
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
                    {/* Descripción */}
                    {dinamica.descripcion && (
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:mx-0 lg:p-4">
                            <h2 className="mb-2 text-base font-bold text-slate-900">Descripción</h2>
                            <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
                                {dinamica.descripcion}
                            </p>
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

                            <div className="relative">
                                {/* grid-flow-col + grid-rows fijo a 5: los boletos llenan
                                    5 filas y luego arrancan una columna nueva a la
                                    derecha — crece horizontal (scroll con flechas), nunca
                                    vertical. */}
                                <div
                                    ref={boletosScrollRef}
                                    className="grid grid-flow-col grid-rows-[repeat(5,3.5rem)] auto-cols-[3.5rem] gap-2 overflow-x-auto scroll-smooth px-10 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                >
                                    {Array.from({ length: dinamica.numeroTotalBoletos }, (_, i) => i + 1).map((numero) => {
                                        const boleto = mapaBoletos.get(numero);
                                        const estado = boleto?.estado ?? 'disponible';
                                        return (
                                            <button
                                                key={numero}
                                                data-testid={`boleto-${numero}`}
                                                disabled={estado !== 'disponible'}
                                                onClick={() => setBoletoSeleccionado(numero)}
                                                className={`flex h-14 w-14 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                                                    estado === 'pagado'
                                                        ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                                        : estado === 'reservado'
                                                          ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                                                          : 'bg-slate-200 text-slate-700 lg:cursor-pointer lg:hover:bg-amber-500 lg:hover:text-white'
                                                }`}
                                            >
                                                {numero}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Flechas — recorren el carrusel de boletos en vez de que
                                    la lista crezca hacia abajo. */}
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

                    {/* Lista de participantes */}
                    {boletos.length > 0 && (
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] lg:mx-0 lg:p-4">
                            <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-slate-900">
                                <Users className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                Participantes
                            </h2>
                            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                                {boletos
                                    .filter((b) => b.estado === 'pagado' || b.estado === 'reservado')
                                    .map((b) => (
                                        <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                            <span className="w-8 shrink-0 text-xs font-bold text-slate-600">#{b.numeroBoleto}</span>
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                                                {b.usuario ? `${b.usuario.nombre} ${b.usuario.apellidos}` : `${b.nombreManual} · Sin cuenta AY`}
                                            </span>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                    b.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}
                                            >
                                                {b.estado === 'pagado' ? 'Pagado' : 'Reservado'}
                                            </span>
                                            {b.usuario && usuarioActual?.id !== b.usuario.id && (
                                                <button
                                                    onClick={() => abrirChatCon(b.usuario!)}
                                                    className="shrink-0 rounded-full border-2 border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-700 lg:cursor-pointer lg:hover:bg-amber-100"
                                                >
                                                    Contactar
                                                </button>
                                            )}
                                            {esOrganizador && b.estado === 'reservado' && (
                                                <button
                                                    onClick={() => confirmarPagoDe(b.id)}
                                                    className="shrink-0 rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white lg:cursor-pointer lg:hover:bg-amber-700"
                                                >
                                                    Confirmar pago
                                                </button>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: reservar boleto */}
            <ModalAdaptativo
                abierto={boletoSeleccionado !== null}
                onCerrar={() => setBoletoSeleccionado(null)}
                titulo="Reservar boleto"
                ancho="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-700">
                        Vas a reservar el boleto <strong className="font-bold text-slate-900">#{boletoSeleccionado}</strong>
                        {dinamica.precioBoleto && <> por <strong className="font-bold text-slate-900">${Number(dinamica.precioBoleto).toLocaleString('es-MX')}</strong></>}.
                        El pago se coordina directamente con el organizador por ChatYA — la app no cobra ni entrega nada.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setBoletoSeleccionado(null)}
                            className="flex-1 rounded-full border-2 border-slate-300 py-2 text-sm font-bold text-slate-700 lg:cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmarReserva}
                            disabled={reservarBoleto.isPending}
                            className="flex-1 rounded-full bg-amber-600 py-2 text-sm font-bold text-white lg:hover:bg-amber-700 disabled:opacity-60 lg:cursor-pointer"
                        >
                            {reservarBoleto.isPending ? 'Reservando...' : 'Confirmar reserva'}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* Modal: agregar participante manual */}
            <ModalAdaptativo
                abierto={modalManualAbierto}
                onCerrar={() => setModalManualAbierto(false)}
                titulo="Agregar participante sin cuenta AY"
                ancho="sm"
            >
                <div className="space-y-3">
                    <input
                        type="number"
                        placeholder="Número de boleto"
                        value={formManual.numeroBoleto}
                        onChange={(e) => setFormManual((f) => ({ ...f, numeroBoleto: e.target.value }))}
                        className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    />
                    <input
                        type="text"
                        placeholder="Nombre"
                        value={formManual.nombreManual}
                        onChange={(e) => setFormManual((f) => ({ ...f, nombreManual: e.target.value }))}
                        className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    />
                    <input
                        type="tel"
                        placeholder="Teléfono"
                        value={formManual.telefonoManual}
                        onChange={(e) => setFormManual((f) => ({ ...f, telefonoManual: e.target.value }))}
                        className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    />
                    <button
                        onClick={enviarParticipanteManual}
                        disabled={agregarManual.isPending}
                        className="w-full rounded-full bg-amber-600 py-2 text-sm font-bold text-white lg:hover:bg-amber-700 disabled:opacity-60 lg:cursor-pointer"
                    >
                        {agregarManual.isPending ? 'Agregando...' : 'Agregar participante'}
                    </button>
                </div>
            </ModalAdaptativo>

            {/* Modal: posponer */}
            <ModalAdaptativo
                abierto={modalPosponerAbierto}
                onCerrar={() => setModalPosponerAbierto(false)}
                titulo="Posponer Dinámica"
                ancho="sm"
            >
                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Elige la nueva fecha y hora límite de inscripción.</p>
                    <input
                        type="datetime-local"
                        value={nuevaFecha}
                        onChange={(e) => setNuevaFecha(e.target.value)}
                        className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                    />
                    <button
                        onClick={enviarPosponer}
                        disabled={posponer.isPending || !nuevaFecha}
                        className="w-full rounded-full bg-amber-600 py-2 text-sm font-bold text-white lg:hover:bg-amber-700 disabled:opacity-60 lg:cursor-pointer"
                    >
                        {posponer.isPending ? 'Posponiendo...' : 'Confirmar nueva fecha'}
                    </button>
                </div>
            </ModalAdaptativo>
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

            {/* Etiquetas densas tipo tag (rounded-md, no pill-full) — mismo
                patrón que `CuerpoPublicacionServicio.tsx` (modalidad/categoría/
                urgente), evita el "panel de stats de videojuego" (Regla 13). */}
            <div className="flex flex-wrap items-center gap-1.5">
                {dinamica.tipoPremio && (
                    <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-sm font-medium text-slate-700">
                        {ETIQUETA_TIPO_PREMIO[dinamica.tipoPremio]}
                    </span>
                )}
                {dinamica.metodoSorteo && (
                    <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-sm font-medium text-slate-700">
                        {ETIQUETA_METODO[dinamica.metodoSorteo]}
                    </span>
                )}
                {cuentaRegresiva && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-800">
                        <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {cuentaRegresiva}
                    </span>
                )}
            </div>
        </div>
    );
}

interface MenuAccionesOrganizadorProps {
    dinamica: DinamicaDetallePublico;
    aceptaParticipantes: boolean;
    onEditarBorrador: () => void;
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
 */
function MenuAccionesOrganizadorDinamica({
    dinamica,
    aceptaParticipantes,
    onEditarBorrador,
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

export default PaginaDinamica;
