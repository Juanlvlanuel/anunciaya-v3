/**
 * PaginaDinamicaPublica.tsx
 * ==========================
 * Versión PÚBLICA del detalle de una Dinámica, accesible sin iniciar sesión.
 * Sirve para los enlaces compartidos en redes sociales/WhatsApp (botón
 * "Compartir" de `PaginaDinamica.tsx`).
 *
 * Ruta: `/p/dinamica/:dinamicaId`
 *
 * Mismo criterio que `PaginaArticuloMarketplacePublico.tsx` (su par de
 * MarketPlace, plantilla de este archivo):
 *  - Comparte estructura visual con la versión privada (`PaginaDinamica`) —
 *    hero 2-col galería/info, organizador, boletos, participantes,
 *    "Cómo funciona" — pero con el chrome de auth intercambiado:
 *  - `HeaderPublico` arriba (marca AnunciaYA + CTA "Registrarse") en lugar
 *    del header dark ámbar del módulo. `FooterPublico` al final.
 *  - SIN menú de acciones del organizador (posponer/cancelar/agregar
 *    manual) — son 100% privadas, y aquí nunca hay `usuarioActual`.
 *  - Reservar un boleto y "Contactar" (organizador o participante) abren
 *    `ModalAuthRequerido` en vez de la acción real — igual que el botón
 *    "Enviar mensaje al vendedor" del público de MarketPlace.
 *  - OG tags vía `useOpenGraph` para previews en WhatsApp/FB/Twitter.
 *  - CTA "Únete gratis a AnunciaYA" entre el contenido y `FooterPublico`.
 *
 * Ubicación: apps/web/src/pages/public/PaginaDinamicaPublica.tsx
 */

import { useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Flag,
    Gift,
    MapPin,
    ShieldCheck,
    Shuffle,
    Ticket,
    UserCheck,
    Users,
    X,
} from 'lucide-react';

import { useDinamica, useBoletosDinamica } from '../../hooks/queries/useDinamicas';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAuthStore } from '../../stores/useAuthStore';
import { GaleriaArticulo } from '../../components/marketplace/GaleriaArticulo';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { ModalAdaptativo } from '../../components/ui/ModalAdaptativo';
import { ModalImagenes } from '../../components/ui/ModalImagenes';
import { HeaderAccionGradiente } from '../../components/ui/ModalAccionGradiente';
import { BotonSalaEnVivo } from '../../components/dinamicas/sala/BotonSalaEnVivo';
import Tooltip from '../../components/ui/Tooltip';
import { Spinner } from '../../components/ui/Spinner';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { BoletoDinamica, DinamicaDetallePublico } from '../../types/dinamicas';
import { obtenerCartaPorBoleto } from '../../data/cartasLoteria';
import { obtenerTablaPorBoleto } from '../../data/tablasLoteria';

const GRADIENTE_DINAMICAS = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
const ETIQUETA_TIPO_PREMIO: Record<string, string> = { fisico: 'Premio físico', efectivo: 'Premio en efectivo' };
const ETIQUETA_METODO: Record<string, string> = { tombola: 'Tómbola clásica', carta_unica: 'Lotería — carta única', tabla_completa: 'Lotería — tabla completa' };
const ETIQUETA_INSIGNIA: Record<string, string> = { nuevo: 'Organizador nuevo', activo: 'Organizador activo', confiable: 'Organizador confiable' };

/** Fecha exacta (no cuenta regresiva relativa) — mismo criterio que la
 *  ficha privada (`PaginaDinamica.tsx`), ago-2026. */
function formatearCuentaRegresiva(fechaLimite: string | null): string | null {
    if (!fechaLimite) return null;
    const fecha = new Date(fechaLimite);
    if (fecha.getTime() <= Date.now()) return 'Inscripción cerrada';
    const fechaTexto = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const horaTexto = fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Fecha: ${fechaTexto}, ${horaTexto}`;
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre ?? '').trim().charAt(0).toUpperCase();
    const b = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${a}${b}` || '?';
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaDinamicaPublica() {
    const { dinamicaId } = useParams<{ dinamicaId: string }>();
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const { data: dinamica, isLoading, isError } = useDinamica(dinamicaId ?? null);
    const { data: boletos = [] } = useBoletosDinamica(dinamicaId ?? null);
    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
    const [modalParticipantesAbierto, setModalParticipantesAbierto] = useState(false);
    const boletosScrollRef = useRef<HTMLDivElement>(null);

    const fotoPortada = dinamica?.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica?.fotosPremio[0];
    const fotoPortadaUrl = fotoPortada ? (fotoPortada.tipo === 'video' ? fotoPortada.posterUrl ?? undefined : fotoPortada.url) : undefined;
    const urlActual =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/dinamica/${dinamicaId}`
            : `/p/dinamica/${dinamicaId}`;

    useOpenGraph({
        title: dinamica ? `Rifa: ${dinamica.titulo}` : 'Dinámicas de AnunciaYA',
        description: dinamica?.descripcion?.slice(0, 155) ?? 'Rifas y concursos entre vecinos — organiza o participa gratis.',
        image: fotoPortadaUrl,
        url: urlActual,
        type: 'product',
    });

    const requerirAuth = () => setModalAuthAbierto(true);

    // Carrusel de boletos en móvil para carta_unica — mismo Embla que
    // PaginaDinamica.tsx (ver ese archivo para el porqué completo de por
    // qué no es CSS-only).
    const { esMobile } = useBreakpoint();
    const numerosBoletosCartaUnica = useMemo(
        () => Array.from({ length: dinamica?.numeroTotalBoletos ?? 0 }, (_, i) => (dinamica?.numeroBoletoInicial ?? 1) + i),
        [dinamica?.numeroTotalBoletos, dinamica?.numeroBoletoInicial],
    );
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

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !dinamica) {
        return <Estado404Publico onVolver={() => navigate('/')} />;
    }

    const esOrganizador = !!usuarioActual && usuarioActual.id === dinamica.organizadorUsuarioId;
    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const aceptaParticipantes = dinamica.estado === 'activa' || dinamica.estado === 'pospuesta';
    const esCartaUnica = dinamica.metodoSorteo === 'carta_unica';
    const esTablaCompleta = dinamica.metodoSorteo === 'tabla_completa';
    const mapaBoletos = new Map(boletos.map((b) => [b.numeroBoleto, b]));
    const participantesVisibles = boletos.filter((b) => b.estado === 'pagado' || b.estado === 'reservado');

    function desplazarBoletos(direccion: 1 | -1) {
        const el = boletosScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: 'smooth' });
    }

    // Un solo botón-carta reusado por las 2 variantes de layout (móvil
    // Embla / desktop grid que envuelve) — evita duplicar el JSX.
    function renderBotonCarta(numero: number) {
        const boleto = mapaBoletos.get(numero);
        const estado = boleto?.estado ?? 'disponible';
        const carta = obtenerCartaPorBoleto(numero);
        return (
            <button
                key={numero}
                data-testid={`boleto-publico-${numero}`}
                disabled={estado !== 'disponible'}
                onClick={estado === 'disponible' ? requerirAuth : undefined}
                className={`relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-2xl border-2 transition-colors ${
                    estado === 'pagado'
                        ? 'cursor-not-allowed border-emerald-400'
                        : estado === 'reservado'
                          ? 'cursor-not-allowed border-amber-400'
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

    // Equivalente a `renderBotonCarta` para `tabla_completa` — cada boleto
    // muestra su tabla completa (4×4) en miniatura, para que el visitante
    // elija la que más le guste (las 150 tablas del catálogo son públicas
    // y navegables, ver `data/tablasLoteria.ts`).
    function renderBotonTabla(numero: number) {
        const boleto = mapaBoletos.get(numero);
        const estado = boleto?.estado ?? 'disponible';
        const tabla = obtenerTablaPorBoleto(numero);
        return (
            <button
                key={numero}
                data-testid={`boleto-publico-${numero}`}
                disabled={estado !== 'disponible'}
                onClick={estado === 'disponible' ? requerirAuth : undefined}
                className={`relative w-full shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1.5 transition-colors ${
                    estado === 'pagado'
                        ? 'cursor-not-allowed border-emerald-400'
                        : estado === 'reservado'
                          ? 'cursor-not-allowed border-amber-400'
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
        // Mismo patrón de scroll que el resto de páginas públicas — el
        // CSS global aplica `overflow:hidden` en `body` desde lg+, así que
        // el scroll real vive dentro de `<main className="overflow-y-auto">`.
        <div data-testid="pagina-dinamica-publica" className="bg-app-degradado flex h-screen flex-col">
            <HeaderPublico />

            <main className="flex-1 overflow-y-auto overscroll-contain">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    {/* Sala en vivo — único punto de entrada, pill sticky
                        justo debajo del header público. SIN wrapper propio
                        (mismo motivo que en la ficha privada): su padre debe
                        ser este `<div>` alto (todo el contenido de la
                        página), no una caja angosta del tamaño de la pill —
                        si no, se queda sin espacio para despegarse al
                        hacer scroll. Solo visible para el organizador
                        mientras la sala no esté programada (para cualquier
                        otro visitante no hay nada que ver ahí todavía). */}
                    {dinamica.estado !== 'borrador' && dinamica.estado !== 'cancelada' && (esOrganizador || dinamica.salaProgramadaPara) && (
                        <BotonSalaEnVivo
                            estado={dinamica.estado}
                            salaProgramadaPara={dinamica.salaProgramadaPara}
                            onClick={() => navigate(`/p/dinamica/${dinamica.id}/sala`)}
                        />
                    )}
                    <div className="pb-5 lg:pb-8 lg:pt-2">
                        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                            {/* ─── COLUMNA IZQUIERDA (full width móvil) ─────── */}
                            <div className="min-w-0 space-y-5 lg:mt-8 lg:space-y-6">
                                <GaleriaArticulo fotos={dinamica.fotosPremio} titulo={dinamica.titulo} ajusteImagen="cover" aspectMovil="aspect-[4/3]" />

                                {/* Bloque info — SOLO móvil. En desktop va en col-derecha */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                    <BloqueInfoPublico dinamica={dinamica} cuentaRegresiva={cuentaRegresiva} />
                                </div>

                                {/* Organizador — SOLO móvil. En desktop va en col-derecha */}
                                <div className="mx-3 lg:hidden">
                                    <CardOrganizadorPublico dinamica={dinamica} onContactar={requerirAuth} />
                                </div>

                                {/* Descripción — SOLO móvil. En desktop va en col-derecha,
                                    abajo del card del organizador. */}
                                {dinamica.descripcion && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:hidden">
                                        <h2 className="mb-2 text-base font-bold text-slate-900">Descripción</h2>
                                        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
                                            {dinamica.descripcion}
                                        </p>
                                    </div>
                                )}

                                {/* Boletos — solo lectura, cualquier click pide login */}
                                {aceptaParticipantes && !!dinamica.numeroTotalBoletos && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                                        <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-slate-900">
                                            <Ticket className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                            Boletos ({dinamica.boletosPagados}/{dinamica.numeroTotalBoletos} vendidos)
                                        </h2>
                                        {esCartaUnica ? (
                                            esMobile ? (
                                                /* Móvil — carrusel Embla (ver PaginaDinamica.tsx
                                                   para el porqué). Cada slide es una columna con
                                                   2 boletos apilados. */
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
                                                /* Escritorio — grid de 5 columnas que ENVUELVE
                                                   sin scroll. */
                                                <div className="grid grid-cols-5 gap-2">{numerosBoletosCartaUnica.map((numero) => renderBotonCarta(numero))}</div>
                                            )
                                        ) : esTablaCompleta ? (
                                            esMobile ? (
                                                /* Móvil — mismo carrusel Embla, 1 tabla por slide
                                                   (el 4×4 de miniaturas necesita más ancho). */
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
                                                /* Escritorio — grid de 3 columnas (cada tarjeta es
                                                   un 4×4 de miniaturas). */
                                                <div className="grid grid-cols-3 gap-2">{numerosBoletosCartaUnica.map((numero) => renderBotonTabla(numero))}</div>
                                            )
                                        ) : (
                                        <div className="relative">
                                            <div
                                                ref={boletosScrollRef}
                                                className="grid touch-pan-x grid-flow-col grid-rows-[repeat(5,3.5rem)] auto-cols-[3.5rem] gap-2 overflow-x-auto scroll-smooth px-10 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                            >
                                                {Array.from({ length: dinamica.numeroTotalBoletos }, (_, i) => dinamica.numeroBoletoInicial + i).map((numero) => {
                                                    const boleto = mapaBoletos.get(numero);
                                                    const estado = boleto?.estado ?? 'disponible';
                                                    return (
                                                        <button
                                                            key={numero}
                                                            data-testid={`boleto-publico-${numero}`}
                                                            disabled={estado !== 'disponible'}
                                                            onClick={estado === 'disponible' ? requerirAuth : undefined}
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
                                            <button
                                                type="button"
                                                onClick={() => desplazarBoletos(-1)}
                                                aria-label="Boletos anteriores"
                                                className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-600 shadow-md lg:cursor-pointer lg:hover:bg-slate-100"
                                            >
                                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => desplazarBoletos(1)}
                                                aria-label="Siguientes boletos"
                                                className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-600 shadow-md lg:cursor-pointer lg:hover:bg-slate-100"
                                            >
                                                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        )}
                                        <div className="mt-2 flex gap-4 text-sm font-medium text-slate-600">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-slate-200" /> Disponible
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-amber-100" /> Reservado
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-emerald-100" /> Pagado
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Participantes — sin preview inline (mismo patrón que la
                                    ficha privada, ago-2026): botón que abre la lista
                                    completa en un modal, así la página no crece sin
                                    límite. "Contactar" pide login. */}
                                {participantesVisibles.length > 0 && (
                                    <button
                                        type="button"
                                        data-testid="btn-abrir-participantes-publico"
                                        onClick={() => setModalParticipantesAbierto(true)}
                                        className="mx-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-xl border-2 border-slate-300 bg-white p-3 text-left shadow-md lg:mx-0 lg:w-full lg:cursor-pointer lg:p-4 lg:hover:border-amber-400"
                                    >
                                        <span className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                                            <Users className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                                            Participantes
                                            <span className="text-sm font-semibold text-slate-500">({participantesVisibles.length})</span>
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>

                            {/* ─── COLUMNA DERECHA — solo desktop ─────── */}
                            <div className="hidden min-w-0 lg:-mt-12 lg:flex lg:flex-col">
                                <div className="sticky top-10 flex flex-col gap-2">
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <BloqueInfoPublico dinamica={dinamica} cuentaRegresiva={cuentaRegresiva} compacto />
                                    </div>
                                    <CardOrganizadorPublico dinamica={dinamica} onContactar={requerirAuth} />

                                    {/* Descripción — SOLO desktop, abajo del card del
                                        organizador (en móvil ya vive ahí en el flujo). */}
                                    {dinamica.descripcion && (
                                        <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                            <h2 className="mb-2 text-base font-bold text-slate-900">Descripción</h2>
                                            <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
                                                {dinamica.descripcion}
                                            </p>
                                        </div>
                                    )}

                                    <CardComoFunciona />
                                </div>
                            </div>
                        </div>

                        {/* CTA de marca — mismo patrón que MarketPlace público,
                            tema ámbar/Dinámicas. */}
                        <div className="mx-3 mt-12 overflow-hidden rounded-2xl border-2 border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5 shadow-md lg:mx-0 lg:p-7">
                            <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
                                <div
                                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:h-20 lg:w-20"
                                    style={{ background: GRADIENTE_DINAMICAS }}
                                >
                                    <Ticket className="h-8 w-8 text-white lg:h-10 lg:w-10" strokeWidth={2.5} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                                        Organiza o participa en Dinámicas
                                    </h2>
                                    <p className="mt-1.5 text-sm font-medium text-slate-600">
                                        <span className="font-bold text-slate-900">Únete gratis a AnunciaYA.</span>{' '}
                                        Reserva tu boleto en esta rifa o crea la tuya — el pago y la entrega del premio
                                        se coordinan siempre fuera de la app.
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                                        {['Hiperlocal', 'Sin comisiones', 'Sin spam'].map((etiqueta) => (
                                            <span
                                                key={etiqueta}
                                                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                                            >
                                                <Check className="h-3 w-3 text-amber-600" strokeWidth={3} />
                                                {etiqueta}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    data-testid="cta-conocer-anunciaya"
                                    onClick={() => navigate('/registro')}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] lg:cursor-pointer lg:hover:bg-amber-700"
                                >
                                    Únete gratis
                                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <FooterPublico />
            </main>

            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                contexto={{ tipo: 'dinamica', titulo: dinamica.titulo }}
                urlRetorno={`/marketplace/dinamica/${dinamicaId}`}
            />

            <ModalListaParticipantesPublico
                abierto={modalParticipantesAbierto}
                onCerrar={() => setModalParticipantesAbierto(false)}
                participantes={participantesVisibles}
                onContactar={requerirAuth}
            />
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

interface BloqueInfoPublicoProps {
    dinamica: DinamicaDetallePublico;
    cuentaRegresiva: string | null;
    /** Reduce paddings y tamaños para caber en el panel sticky desktop —
     *  mismo patrón que `BloqueInfo` (MP) y `BloqueInfoArticulo` (Producto). */
    compacto?: boolean;
}

/** Calca `BloqueInfoDinamica` de la ficha privada — título + precio del
 *  boleto + tags densos de datos clave. Tamaños unificados con Producto/
 *  MarketPlace: título negro, precio del boleto grande en color temático. */
function BloqueInfoPublico({ dinamica, cuentaRegresiva, compacto = false }: BloqueInfoPublicoProps) {
    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            {/* Eyebrow Dinámicas · Ciudad — mismo patrón que MarketPlace/
                Ofertas/Producto (label del módulo + ícono de ubicación). */}
            <p
                className={`flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-wide ${
                    compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'
                }`}
            >
                <span className="text-amber-700">Dinámicas</span>
                {dinamica.ciudadNombre && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.5} />
                            {dinamica.ciudadNombre}
                        </span>
                    </>
                )}
            </p>

            {/* Título — negro, mismo tamaño que Producto/MarketPlace/Ofertas */}
            <h1
                className={
                    compacto
                        ? 'text-sm font-bold leading-tight text-slate-900 2xl:text-base'
                        : 'text-xl font-bold leading-tight text-slate-900 lg:text-2xl 2xl:text-3xl'
                }
            >
                {dinamica.titulo}
            </h1>

            {/* Precio del boleto — equivalente del "precio" de Producto/MP:
                mismo tamaño grande, color temático amber de Dinámicas. */}
            {dinamica.precioBoleto && (
                <div
                    className={
                        compacto
                            ? 'text-2xl font-extrabold leading-none tracking-tight text-amber-700 2xl:text-3xl'
                            : 'text-4xl font-extrabold leading-none tracking-tight text-amber-700 lg:text-5xl'
                    }
                >
                    ${Number(dinamica.precioBoleto).toLocaleString('es-MX')}
                    <span
                        className={
                            compacto
                                ? 'ml-1.5 text-lg font-semibold text-amber-700/80 2xl:text-xl'
                                : 'ml-2 text-2xl font-semibold text-amber-700/80 lg:text-3xl'
                        }
                    >
                        por boleto
                    </span>
                </div>
            )}

            {/* Lista en filas separadas por línea divisoria — mismo patrón que
                `BloqueInfoDinamica` de la ficha privada (ago-2026): sin
                fondos apilados, ícono neutro para los datos descriptivos y
                el único acento (ámbar) reservado para la fecha. */}
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

interface CardOrganizadorPublicoProps {
    dinamica: DinamicaDetallePublico;
    onContactar: () => void;
}

/** Calca `CardOrganizadorDinamica` de la ficha privada (mismo patrón que
 *  `CardVendedor`/`OferenteCard`) — sin "Ver perfil" con lógica de auth
 *  propia: la ruta ya está protegida por `ModoPersonalEstrictoGuard`, así
 *  que navegar ahí sin sesión redirige solo. "Contactar" sí pide login
 *  explícito antes de intentar abrir ChatYA. */
function CardOrganizadorPublico({ dinamica, onContactar }: CardOrganizadorPublicoProps) {
    const navigate = useNavigate();
    // "Publicado hace X" — más confiable que "Activa hace X" (última
    // conexión), que suele venir null/desactualizada en datos de prueba.
    // Mismo criterio unificado en `CardVendedor` (MP) y
    // `CardOferentePublico` (Servicios).
    const actividadLabel = `Publicado ${formatearTiempoRelativo(dinamica.createdAt)}`;
    const [avatarAbierto, setAvatarAbierto] = useState(false);

    return (
        <div className="flex w-full flex-col gap-2 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
            <div className="flex items-center gap-2">
                <div
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200 lg:h-16 lg:w-16 ${dinamica.organizador.avatarUrl ? 'cursor-pointer' : ''}`}
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
                            <BadgeCheck className="h-6 w-6 shrink-0 fill-blue-500 text-white" strokeWidth={2.5} aria-label="Usuario verificado" />
                        </span>
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700 lg:text-xs 2xl:text-sm">
                    {ETIQUETA_INSIGNIA[dinamica.insigniaOrganizador.nivel]}
                </span>
                <button
                    type="button"
                    onClick={onContactar}
                    aria-label="Contactar por ChatYA"
                    className="flex shrink-0 items-center justify-center lg:cursor-pointer lg:hover:opacity-80"
                >
                    <img src="/ChatYA.webp" alt="" className="h-8 w-auto object-contain" />
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    {actividadLabel}
                </div>
                <button
                    type="button"
                    onClick={() => navigate(`/marketplace/usuario/${dinamica.organizador.id}?tab=dinamicas`)}
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

// =============================================================================
// PARTICIPANTES — botón + modal (mismo patrón que la ficha privada, sin
// acciones de organizador ni resaltado de "fila propia" — aquí nunca hay
// sesión). "Contactar" siempre pide login.
// =============================================================================

interface FilaParticipantePublicoProps {
    boleto: BoletoDinamica;
    onContactar: () => void;
}

function FilaParticipantePublico({ boleto, onContactar }: FilaParticipantePublicoProps) {
    return (
        <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="w-8 shrink-0 text-xs font-bold text-slate-600">#{boleto.numeroBoleto}</span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                    {boleto.usuario ? (
                        `${boleto.usuario.nombre} ${boleto.usuario.apellidos}`
                    ) : (
                        <>
                            {boleto.nombreManual} <span className="text-blue-700">· Sin cuenta AnunciaYA</span>
                        </>
                    )}
                </span>
                {boleto.usuario && (
                    <Tooltip text="Contactar por ChatYA" position="top">
                        <button
                            type="button"
                            onClick={onContactar}
                            aria-label="Contactar por ChatYA"
                            className="flex shrink-0 items-center justify-center rounded-full p-0.5 transition-transform duration-200 active:opacity-70 lg:cursor-pointer lg:hover:scale-110"
                        >
                            <img src="/ChatYA.webp" alt="" className="h-7 w-auto object-contain" />
                        </button>
                    </Tooltip>
                )}
            </div>
            <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    boleto.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
            >
                {boleto.estado === 'pagado' ? 'Pagado' : 'Reservado'}
            </span>
        </div>
    );
}

interface ModalListaParticipantesPublicoProps {
    abierto: boolean;
    onCerrar: () => void;
    participantes: BoletoDinamica[];
    onContactar: () => void;
}

function ModalListaParticipantesPublico({ abierto, onCerrar, participantes, onContactar }: ModalListaParticipantesPublicoProps) {
    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="md"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            discriminador="_dinamicaListaParticipantesPublico"
            className="h-[80vh] max-w-sm lg:max-w-lg 2xl:max-w-xl"
        >
            <div className="flex h-full flex-col">
                <div className="relative shrink-0">
                    <HeaderAccionGradiente
                        icono={Users}
                        titulo="Participantes"
                        subtitulo={`${participantes.length} en esta Dinámica`}
                        gradiente={GRADIENTE_DINAMICAS}
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
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="divide-y divide-slate-200">
                        {participantes.map((b) => (
                            <FilaParticipantePublico key={b.id} boleto={b} onContactar={onContactar} />
                        ))}
                    </div>
                </div>
            </div>
        </ModalAdaptativo>
    );
}

/** Calca `CardComoFunciona` de la ficha privada — trust box amber. */
function CardComoFunciona() {
    const tips: Array<{ icono: React.ComponentType<{ className?: string; strokeWidth?: number }>; texto: string }> = [
        { icono: MapPin, texto: 'El pago del boleto se coordina directamente con el organizador, fuera de la app' },
        { icono: UserCheck, texto: 'La lista de participantes es pública — cualquiera puede verificarla' },
        { icono: ShieldCheck, texto: 'AnunciaYA no cobra ni entrega el premio, solo conecta organizador y participantes' },
        { icono: Flag, texto: 'Reporta cualquier comportamiento sospechoso' },
    ];
    return (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-100 p-4 shadow-md">
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

interface Estado404Props {
    onVolver: () => void;
}

function Estado404Publico({ onVolver }: Estado404Props) {
    return (
        <div className="bg-app-degradado flex min-h-screen items-center justify-center px-6">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <AlertCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Dinámica no encontrada</h2>
                <p className="mb-5 text-sm text-slate-600">Esta Dinámica no existe o ya fue eliminada.</p>
                <button
                    onClick={onVolver}
                    className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md lg:cursor-pointer"
                >
                    Conocer AnunciaYA
                </button>
            </div>
        </div>
    );
}

export default PaginaDinamicaPublica;
