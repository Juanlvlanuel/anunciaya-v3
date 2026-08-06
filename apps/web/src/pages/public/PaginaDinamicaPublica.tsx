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

import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flag,
    MapPin,
    ShieldCheck,
    Ticket,
    UserCheck,
    Users,
} from 'lucide-react';

import { useDinamica, useBoletosDinamica } from '../../hooks/queries/useDinamicas';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { GaleriaArticulo } from '../../components/marketplace/GaleriaArticulo';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { Spinner } from '../../components/ui/Spinner';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { formatearUltimaConexion } from '../../utils/marketplace';
import type { DinamicaDetallePublico } from '../../types/dinamicas';

const GRADIENTE_DINAMICAS = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
const ETIQUETA_TIPO_PREMIO: Record<string, string> = { fisico: 'Premio físico', efectivo: 'Premio en efectivo' };
const ETIQUETA_METODO: Record<string, string> = { tombola: 'Tómbola clásica', carta_unica: 'Lotería — carta única', tabla_completa: 'Lotería — tabla completa' };
const ETIQUETA_INSIGNIA: Record<string, string> = { nuevo: 'Organizador nuevo', activo: 'Organizador activo', confiable: 'Organizador confiable' };

function formatearCuentaRegresiva(fechaLimite: string | null): string | null {
    if (!fechaLimite) return null;
    const restante = new Date(fechaLimite).getTime() - Date.now();
    if (restante <= 0) return 'Inscripción cerrada';
    const dias = Math.floor(restante / (24 * 60 * 60 * 1000));
    if (dias >= 1) return `Cierra en ${dias}d`;
    const horas = Math.floor(restante / (60 * 60 * 1000));
    if (horas >= 1) return `Cierra en ${horas}h`;
    const min = Math.floor(restante / (60 * 1000));
    return `Cierra en ${min}min`;
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
    const { data: dinamica, isLoading, isError } = useDinamica(dinamicaId ?? null);
    const { data: boletos = [] } = useBoletosDinamica(dinamicaId ?? null);
    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
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

    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const aceptaParticipantes = dinamica.estado === 'activa' || dinamica.estado === 'pospuesta';
    const mapaBoletos = new Map(boletos.map((b) => [b.numeroBoleto, b]));

    function desplazarBoletos(direccion: 1 | -1) {
        const el = boletosScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: 'smooth' });
    }

    return (
        // Mismo patrón de scroll que el resto de páginas públicas — el
        // CSS global aplica `overflow:hidden` en `body` desde lg+, así que
        // el scroll real vive dentro de `<main className="overflow-y-auto">`.
        <div data-testid="pagina-dinamica-publica" className="bg-app-degradado flex h-screen flex-col">
            <HeaderPublico />

            <main className="flex-1 overflow-y-auto">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="pb-5 lg:pb-8 lg:pt-2">
                        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                            {/* ─── COLUMNA IZQUIERDA (full width móvil) ─────── */}
                            <div className="min-w-0 space-y-5 lg:mt-8 lg:space-y-6">
                                <GaleriaArticulo fotos={dinamica.fotosPremio} titulo={dinamica.titulo} ajusteImagen="cover" />

                                {/* Bloque info — SOLO móvil. En desktop va en col-derecha */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                    <BloqueInfoPublico dinamica={dinamica} cuentaRegresiva={cuentaRegresiva} />
                                </div>

                                {/* Organizador — SOLO móvil. En desktop va en col-derecha */}
                                <div className="mx-3 lg:hidden">
                                    <CardOrganizadorPublico dinamica={dinamica} onContactar={requerirAuth} />
                                </div>

                                {/* Descripción */}
                                {dinamica.descripcion && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
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
                                        <div className="relative">
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

                                {/* Participantes — lista pública, Contactar pide login */}
                                {boletos.length > 0 && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
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
                                                            {b.usuario ? `${b.usuario.nombre} ${b.usuario.apellidos}` : `${b.nombreManual} · Sin cuenta AnunciaYA`}
                                                        </span>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                                b.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                        >
                                                            {b.estado === 'pagado' ? 'Pagado' : 'Reservado'}
                                                        </span>
                                                        {b.usuario && (
                                                            <button
                                                                onClick={requerirAuth}
                                                                className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 lg:cursor-pointer lg:hover:bg-slate-300"
                                                            >
                                                                Contactar
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ─── COLUMNA DERECHA — solo desktop ─────── */}
                            <div className="hidden min-w-0 lg:-mt-12 lg:flex lg:flex-col">
                                <div className="sticky top-10 flex flex-col gap-2">
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <BloqueInfoPublico dinamica={dinamica} cuentaRegresiva={cuentaRegresiva} />
                                    </div>
                                    <CardOrganizadorPublico dinamica={dinamica} onContactar={requerirAuth} />
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
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

interface BloqueInfoPublicoProps {
    dinamica: DinamicaDetallePublico;
    cuentaRegresiva: string | null;
}

/** Calca `BloqueInfoDinamica` de la ficha privada — título + precio del
 *  boleto + tags densos de datos clave. */
function BloqueInfoPublico({ dinamica, cuentaRegresiva }: BloqueInfoPublicoProps) {
    return (
        <div className="space-y-2.5">
            <h1 className="text-xl font-extrabold leading-snug text-slate-900 lg:text-lg">{dinamica.titulo}</h1>

            {dinamica.precioBoleto && (
                <p className="text-2xl font-extrabold leading-tight text-amber-700 lg:text-xl">
                    ${Number(dinamica.precioBoleto).toLocaleString('es-MX')}
                    <span className="ml-1.5 text-sm font-bold text-amber-700/80">por boleto</span>
                </p>
            )}

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
    const conexionLabel = formatearUltimaConexion(dinamica.organizador.ultimaConexion ?? null);

    return (
        <div className="flex w-full flex-col gap-2 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-md">
            <div className="flex items-center gap-2">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200">
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
                {conexionLabel && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                        {conexionLabel}
                    </div>
                )}
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
        </div>
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
