/**
 * PaginaServicio.tsx
 * ====================
 * Pantalla de detalle de una publicación de Servicios.
 *
 * Una sola pantalla con módulos condicionales según `publicacion.tipo`:
 *   - 'servicio-persona' → galería 4:3 + skills + sin requisitos
 *   - 'vacante-empresa'  → portada 16:9 con logo + sección "Requisitos"
 *   - 'solicito'         → sin galería destacada + bloque presupuesto
 *
 * Layout móvil:
 *   - Header con back + guardar + compartir absoluto sobre la galería
 *   - Galería (componente condicional)
 *   - Banner amber si pausada
 *   - Cuerpo: tipo + título + precio + oferente + descripción + skills/req +
 *     modalidad + mapa + Q&A
 *   - Barra fija inferior con ChatYA + WhatsApp
 *
 * Layout desktop: 1 columna acotada con `max-w-7xl` + sticky CTA en lateral
 * (simplificación: por ahora una sola columna fluida para todos los breakpoints
 * y la barra de contacto inline al final).
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7).
 *
 * Ubicación: apps/web/src/pages/private/servicios/PaginaServicio.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    Briefcase,
    Check,
    Clock,
    MapPin,
    ShieldCheck,
    Star,
    Wrench,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import {
    usePublicacionServicio,
    useRegistrarVistaServicio,
} from '../../../hooks/queries/useServicios';
import {
    etiquetaTipoEmpleo,
    formatearHorarioLegible,
    formatearPrecioServicio,
    formatearPresupuesto,
    modalidadLabel,
    obtenerNombreCorto,
} from '../../../utils/servicios';
import { GaleriaServicio } from '../../../components/servicios/GaleriaServicio';
import { OferenteCard } from '../../../components/servicios/OferenteCard';
import { MapaUbicacion } from '../../../components/marketplace/MapaUbicacion';
import { BarraContactoServicio } from '../../../components/servicios/BarraContactoServicio';
import { ModalCrearResena } from '../../../components/servicios/ModalCrearResena';
import { SeccionPreguntasServicio } from '../../../components/servicios/SeccionPreguntasServicio';
import { ServiciosHeader } from '../../../components/servicios/ServiciosHeader';
import { Spinner } from '../../../components/ui/Spinner';
import type { PublicacionDetalle } from '../../../types/servicios';

const VISTA_REGISTRADA_STORAGE_PREFIX = 'aya:servicios:vista:';

export function PaginaServicio() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/servicios');
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);

    const { data: publicacion, isPending, isError } = usePublicacionServicio(id);
    const registrarVista = useRegistrarVistaServicio();
    const vistaYaRegistrada = useRef(false);
    const [modalResenaAbierto, setModalResenaAbierto] = useState(false);

    // Registrar vista una vez por sesión (dedupe en sessionStorage para no
    // inflar el contador con reloads o navegación back/forward).
    useEffect(() => {
        if (!id || vistaYaRegistrada.current) return;
        const key = `${VISTA_REGISTRADA_STORAGE_PREFIX}${id}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
            vistaYaRegistrada.current = true;
            return;
        }
        registrarVista.mutate(id);
        vistaYaRegistrada.current = true;
        try {
            sessionStorage.setItem(key, '1');
        } catch {
            /* noop */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (isPending) {
        return (
            <>
                <ServiciosHeader variante="pagina" onBack={handleVolver} />
                <div className="min-h-full bg-transparent flex items-center justify-center py-20">
                    <Spinner tamanio="lg" />
                </div>
            </>
        );
    }

    if (isError || !publicacion) {
        return (
            <>
                <ServiciosHeader variante="pagina" onBack={handleVolver} />
                <div className="min-h-full bg-transparent">
                    <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                        <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mb-4">
                                <AlertCircle
                                    className="w-7 h-7 text-amber-600"
                                    strokeWidth={1.75}
                                />
                            </div>
                            <h2 className="text-[18px] font-extrabold text-slate-900">
                                No encontramos esta publicación
                            </h2>
                            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                                Pudo haberse eliminado o pausado. Revisa el feed
                                para ver otras publicaciones cercanas.
                            </p>
                            <button
                                onClick={() => navigate('/servicios')}
                                className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky lg:cursor-pointer"
                            >
                                Volver al feed
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const isPausada = publicacion.estado === 'pausada';
    const isServicio = publicacion.tipo === 'servicio-persona';
    const isVacante = publicacion.tipo === 'vacante-empresa';
    const isSolicito = publicacion.tipo === 'solicito';

    // ─── Contenido de cabecera (tipo + título + precio mobile) ────────
    const cabeceraTituloPrecio = (
        <SeccionCard>
            <TipoChip tipo={publicacion.tipo} verificada={isVacante} />

            {/* Título + tipo de empleo (solo vacantes) — los 2 datos más
                importantes en una sola línea, separados por divisor vertical.
                En móvil se apila si no cabe (flex-wrap). */}
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    {publicacion.titulo}
                </h1>
                {isVacante && publicacion.tipoEmpleo && (
                    <div className="flex items-center gap-3">
                        <span
                            className="inline-block h-6 w-px bg-slate-300"
                            aria-hidden="true"
                        />
                        <span className="text-base lg:text-base 2xl:text-lg font-semibold text-slate-700">
                            {etiquetaTipoEmpleo(publicacion.tipoEmpleo)}
                        </span>
                    </div>
                )}
            </div>

            {/* Precio: visible en móvil dentro de la cabecera. En desktop el
                precio se muestra en el sidebar derecho (sticky) para mantener
                la cabecera limpia. */}
            <div className="lg:hidden">
                {isSolicito && publicacion.presupuesto ? (
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-amber-700">
                            Presupuesto
                        </span>
                        <span className="text-[20px] font-extrabold text-slate-900">
                            {formatearPresupuesto(publicacion.presupuesto)}
                        </span>
                    </div>
                ) : (
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                        <span className="text-[20px] font-extrabold text-sky-700">
                            {formatearPrecioServicio(publicacion.precio)}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                            · {modalidadLabel(publicacion.modalidad)} ·{' '}
                            {publicacion.ciudad.split(',')[0]}
                        </span>
                    </div>
                )}
            </div>

            {/* OferenteCard solo en móvil — en desktop vive en el sidebar. */}
            <div className="lg:hidden">
                <OferenteCard
                    publicacion={publicacion}
                    onClick={() =>
                        navigate(
                            `/servicios/usuario/${publicacion.oferente.id}`,
                        )
                    }
                />
            </div>
        </SeccionCard>
    );

    const cardDescripcion = (
        <SeccionCard>
            <Seccion titulo="Descripción">
                <p className="text-sm lg:text-[13px] 2xl:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                    {publicacion.descripcion}
                </p>
            </Seccion>
        </SeccionCard>
    );

    const cardSkills = isServicio && publicacion.skills.length > 0 && (
        <SeccionCard>
            <Seccion titulo="Especialidades">
                <PillList items={publicacion.skills} />
            </Seccion>
        </SeccionCard>
    );

    const cardRequisitos = isVacante && publicacion.requisitos.length > 0 && (
        <SeccionCard>
            <Seccion titulo="Requisitos">
                <ul className="space-y-1.5">
                    {publicacion.requisitos.map((r) => (
                        <li
                            key={r}
                            className="flex items-start gap-2 text-sm lg:text-[13px] 2xl:text-sm text-slate-700 font-medium"
                        >
                            <Check
                                className="w-4 h-4 text-sky-600 mt-0.5 shrink-0"
                                strokeWidth={2.5}
                            />
                            {r}
                        </li>
                    ))}
                </ul>
            </Seccion>
        </SeccionCard>
    );

    const cardBeneficios = isVacante && publicacion.beneficios.length > 0 && (
        <SeccionCard>
            <Seccion titulo="Beneficios">
                <ul className="space-y-1.5">
                    {publicacion.beneficios.map((b) => (
                        <li
                            key={b}
                            className="flex items-start gap-2 text-sm lg:text-[13px] 2xl:text-sm text-slate-700 font-medium"
                        >
                            <Check
                                className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
                                strokeWidth={2.5}
                            />
                            {b}
                        </li>
                    ))}
                </ul>
            </Seccion>
        </SeccionCard>
    );

    const cardModalidadUbicacion = (
        <SeccionCard>
            <Seccion titulo="Modalidad y ubicación">
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {isVacante && publicacion.tipoEmpleo && (
                        <ChipInfo
                            icono={<Briefcase className="w-3.5 h-3.5" strokeWidth={2} />}
                        >
                            {etiquetaTipoEmpleo(publicacion.tipoEmpleo)}
                        </ChipInfo>
                    )}
                    <ChipInfo
                        icono={<MapPin className="w-3.5 h-3.5" strokeWidth={2} />}
                    >
                        {modalidadLabel(publicacion.modalidad)}
                    </ChipInfo>
                    {publicacion.zonasAproximadas.length > 0 && (
                        <ChipInfo>
                            {publicacion.zonasAproximadas.join(' · ')}
                        </ChipInfo>
                    )}
                </div>

                {/* Horario en líneas legibles (no como chip) — formato 12h con
                    rangos consecutivos y días cerrados. Día en bold, ":" como
                    separador con el horario en peso normal. */}
                {publicacion.horario && (() => {
                    const lineas = formatearHorarioLegible(publicacion.horario);
                    if (lineas.length === 0) return null;
                    return (
                        <div className="mb-3 flex items-start gap-2 text-sm lg:text-[13px] 2xl:text-sm text-slate-700">
                            <Clock
                                className="w-4 h-4 text-slate-500 shrink-0 mt-0.5"
                                strokeWidth={2}
                            />
                            <div className="flex flex-col gap-0.5">
                                {lineas.map((linea) => (
                                    <div key={`${linea.dias}-${linea.horario}`}>
                                        <span className="font-bold text-slate-900">
                                            {linea.dias}
                                        </span>
                                        {linea.horario && (
                                            <>
                                                {': '}
                                                <span className="font-medium">
                                                    {linea.horario}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <MapaUbicacion
                    lat={publicacion.ubicacionAproximada.lat}
                    lng={publicacion.ubicacionAproximada.lng}
                    zonaAproximada={
                        publicacion.zonasAproximadas.length > 0
                            ? publicacion.zonasAproximadas.join(' · ')
                            : publicacion.ciudad
                    }
                />
            </Seccion>
        </SeccionCard>
    );

    const cardPreguntas = (
        <SeccionCard>
            <SeccionPreguntasServicio publicacion={publicacion} />
        </SeccionCard>
    );

    const cardDejarResena = usuarioActualId
        && usuarioActualId !== publicacion.oferente.id && (
        <SeccionCard>
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-100 grid place-items-center">
                    <Star
                        className="w-5 h-5 text-amber-500 fill-amber-400"
                        strokeWidth={1.5}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-slate-900">
                        ¿Ya tomaste este servicio?
                    </div>
                    <p className="text-sm lg:text-[13px] 2xl:text-sm text-slate-600 font-medium mt-0.5 leading-snug">
                        Deja una reseña para que otros vecinos sepan cómo te atendieron.
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="btn-dejar-resena"
                    onClick={() => setModalResenaAbierto(true)}
                    className="shrink-0 px-4 py-2 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-bold text-sm shadow-cta-sky lg:cursor-pointer active:scale-[0.98]"
                >
                    Dejar reseña
                </button>
            </div>
        </SeccionCard>
    );

    return (
        <>
            <ServiciosHeader
                variante="pagina"
                onBack={handleVolver}
                subtituloMobile={
                    <SubtituloMobileHeader publicacion={publicacion} />
                }
            />
            <div className="min-h-full bg-transparent pb-32 lg:pb-8">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8 lg:py-6">
                    <div className="px-4 lg:px-0 space-y-3 lg:space-y-4">
                        {/* Hero ancho completo — edge-to-edge mobile, card en desktop */}
                        <div className="-mx-4 lg:mx-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-md lg:border lg:border-slate-300">
                            <GaleriaServicio publicacion={publicacion} />
                        </div>

                        {isPausada && <BannerPausada />}

                        {/* ─── LAYOUT 2-COL EN DESKTOP ─── */}
                        <div className="lg:grid lg:grid-cols-3 lg:gap-4 2xl:gap-6 lg:items-start space-y-3 lg:space-y-0">
                            {/* COL IZQUIERDA — contenido principal (2/3) */}
                            <div className="space-y-3 lg:space-y-4 lg:col-span-2 min-w-0">
                                {cabeceraTituloPrecio}
                                {cardDescripcion}
                                {cardSkills}
                                {/* Requisitos + Beneficios en 2-col en desktop
                                    cuando ambos existen; full-width si solo
                                    hay uno. */}
                                {cardRequisitos && cardBeneficios ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                                        {cardRequisitos}
                                        {cardBeneficios}
                                    </div>
                                ) : (
                                    cardRequisitos || cardBeneficios
                                )}
                                {cardModalidadUbicacion}
                                {cardPreguntas}
                                {cardDejarResena}
                            </div>

                            {/* COL DERECHA — sidebar sticky (1/3, solo desktop) */}
                            <aside className="hidden lg:block lg:col-span-1 space-y-4 lg:sticky lg:top-24">
                                <SidebarContacto
                                    publicacion={publicacion}
                                    isPausada={isPausada}
                                    isSolicito={isSolicito}
                                />
                                <SidebarSobreNegocio
                                    publicacion={publicacion}
                                    onVerNegocio={() =>
                                        navigate(
                                            `/servicios/usuario/${publicacion.oferente.id}`,
                                        )
                                    }
                                />
                            </aside>
                        </div>
                    </div>
                </div>

                {/* Barra de contacto fija inferior en móvil */}
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-300 lg:hidden">
                    {isPausada ? (
                        <div className="px-3 py-3">
                            <button
                                disabled
                                className="w-full py-3 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm cursor-not-allowed"
                            >
                                Contacto deshabilitado
                            </button>
                        </div>
                    ) : (
                        <BarraContactoServicio
                            publicacion={publicacion}
                            variante="mobile"
                        />
                    )}
                </div>
            </div>

            <ModalCrearResena
                open={modalResenaAbierto}
                publicacionId={publicacion.id}
                nombrePrestador={obtenerNombreCorto(
                    publicacion.oferente.nombre,
                    publicacion.oferente.apellidos,
                )}
                onClose={() => setModalResenaAbierto(false)}
            />
        </>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function TipoChip({
    tipo,
}: {
    tipo: PublicacionDetalle['tipo'];
    /** @deprecated El sello "Empresa verificada" ahora vive en el hero
     *  (GaleriaServicio). Se mantiene el prop para no romper callers. */
    verificada?: boolean;
}) {
    if (tipo === 'vacante-empresa') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-sm font-bold">
                <Briefcase className="w-3.5 h-3.5" strokeWidth={2.5} />
                Vacante
            </span>
        );
    }
    if (tipo === 'solicito') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-bold">
                Solicito
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-sm font-bold">
            <Wrench className="w-3.5 h-3.5" strokeWidth={2.5} />
            Servicio personal
        </span>
    );
}

/**
 * Contenedor de sección con fondo blanco, borde sutil y sombra ligera.
 * Cada bloque del detalle (descripción, especialidades, modalidad, Q&A)
 * vive en su propio SeccionCard para separarlos visualmente sobre el
 * gradiente azul del MainLayout.
 */
function SeccionCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={
                'bg-white rounded-2xl border border-slate-300 shadow-md px-4 py-4 lg:px-5 lg:py-4 ' +
                className
            }
        >
            {children}
        </div>
    );
}

function Seccion({
    titulo,
    children,
}: {
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {titulo}
            </div>
            {children}
        </div>
    );
}

function PillList({ items }: { items: string[] }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((t) => (
                <span
                    key={t}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold"
                >
                    {t}
                </span>
            ))}
        </div>
    );
}

function ChipInfo({
    icono,
    children,
}: {
    icono?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold">
            {icono}
            {children}
        </span>
    );
}

function BannerPausada() {
    return (
        <div className="mt-3 mx-4 lg:mx-0 px-3 py-2.5 rounded-xl bg-amber-100 border border-amber-300 flex items-start gap-2.5">
            <AlertCircle
                className="w-4 h-4 text-amber-700 mt-0.5 shrink-0"
                strokeWidth={2}
            />
            <div>
                <div className="text-sm font-bold text-amber-900">
                    Publicación pausada
                </div>
                <div className="text-sm font-medium text-amber-800 leading-snug">
                    No puedes contactar mientras esté pausada. Te avisaremos si
                    vuelve a estar activa.
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SIDEBAR DESKTOP — Card Contacto (precio + CTAs)
// =============================================================================
// Card sticky en el sidebar derecho con: chip de tipo, precio destacado,
// metadatos rápidos (modalidad, ciudad) y la barra de contacto inline. Solo
// se renderiza en desktop (lg+) — en móvil el equivalente vive en la barra
// fija inferior.
function SidebarContacto({
    publicacion,
    isPausada,
    isSolicito,
}: {
    publicacion: PublicacionDetalle;
    isPausada: boolean;
    isSolicito: boolean;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-5 space-y-3.5">
            {/* Precio destacado */}
            {isSolicito && publicacion.presupuesto ? (
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                        Presupuesto
                    </div>
                    <div className="text-[22px] 2xl:text-[26px] font-extrabold text-slate-900 leading-tight">
                        {formatearPresupuesto(publicacion.presupuesto)}
                    </div>
                </div>
            ) : (
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Pago
                    </div>
                    <div className="text-[22px] 2xl:text-[26px] font-extrabold text-sky-700 leading-tight">
                        {formatearPrecioServicio(publicacion.precio)}
                    </div>
                </div>
            )}

            {/* Metadatos rápidos — tipoEmpleo se omite aquí porque ya vive
                arriba junto al título. */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-2 text-[13px] 2xl:text-sm text-slate-700 font-medium">
                    <MapPin
                        className="w-3.5 h-3.5 text-slate-500 shrink-0"
                        strokeWidth={2}
                    />
                    {modalidadLabel(publicacion.modalidad)}
                </div>
                <div className="flex items-center gap-2 text-[13px] 2xl:text-sm text-slate-700 font-medium">
                    <MapPin
                        className="w-3.5 h-3.5 text-slate-500 shrink-0"
                        strokeWidth={2}
                    />
                    {publicacion.ciudad.split(',')[0]}
                </div>
                {publicacion.horario && (() => {
                    const lineas = formatearHorarioLegible(publicacion.horario);
                    if (lineas.length === 0) return null;
                    return (
                        <div className="flex items-start gap-2 text-[13px] 2xl:text-sm text-slate-700">
                            <Clock
                                className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5"
                                strokeWidth={2}
                            />
                            <div className="flex flex-col gap-0.5">
                                {lineas.map((linea) => (
                                    <div key={`${linea.dias}-${linea.horario}`}>
                                        <span className="font-bold text-slate-900">
                                            {linea.dias}
                                        </span>
                                        {linea.horario && (
                                            <>
                                                {': '}
                                                <span className="font-medium">
                                                    {linea.horario}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Barra de contacto inline (botones ChatYA + WhatsApp) */}
            <div className="pt-2 border-t border-slate-200">
                {isPausada ? (
                    <button
                        disabled
                        className="w-full py-3 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm cursor-not-allowed"
                    >
                        Contacto deshabilitado
                    </button>
                ) : (
                    <BarraContactoServicio
                        publicacion={publicacion}
                        variante="desktop"
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// SIDEBAR DESKTOP — Card "Sobre el oferente / negocio"
// =============================================================================
// Card identidad: para vacante-empresa muestra logo + nombre del negocio +
// sucursal (con divisor); para servicio-persona muestra avatar + nombre +
// ciudad. Click → navega al perfil del oferente.
function SidebarSobreNegocio({
    publicacion,
    onVerNegocio,
}: {
    publicacion: PublicacionDetalle;
    onVerNegocio: () => void;
}) {
    const { oferente, tipo } = publicacion;
    const esEmpresa = tipo === 'vacante-empresa';
    const titulo = esEmpresa ? 'Sobre el negocio' : 'Sobre el oferente';

    return (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-5 space-y-3">
            <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-600">
                {titulo}
            </div>
            <OferenteCard publicacion={publicacion} onClick={onVerNegocio} />
        </div>
    );
}

// =============================================================================
// PILL contextual para el slotDerecho del ServiciosHeader (desktop)
// =============================================================================
// Variante "dark" del TipoChip: el header tiene fondo negro, así que el pill
// usa colores translúcidos con ring sutil. Mantiene la misma semántica de
// color que TipoChip (sky para servicio/vacante, amber para solicito).
function PillTipoHeader({ tipo }: { tipo: PublicacionDetalle['tipo'] }) {
    if (tipo === 'vacante-empresa') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1.5 text-[12px] font-bold text-sky-300 ring-1 ring-sky-400/30">
                <Briefcase className="w-3.5 h-3.5" strokeWidth={2.5} />
                Vacante
            </span>
        );
    }
    if (tipo === 'solicito') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                Solicitud
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1.5 text-[12px] font-bold text-sky-300 ring-1 ring-sky-400/30">
            <Wrench className="w-3.5 h-3.5" strokeWidth={2.5} />
            Servicio personal
        </span>
    );
}

// =============================================================================
// Subtítulo contextual mobile del ServiciosHeader
// =============================================================================
// El header en mobile, variante 'pagina', renderiza este texto entre los
// gradientes decorativos. Patrón: "{tipo legible} · {nombre del oferente}".
function SubtituloMobileHeader({
    publicacion,
}: {
    publicacion: PublicacionDetalle;
}) {
    const tipoLabel =
        publicacion.tipo === 'vacante-empresa'
            ? 'Vacante'
            : publicacion.tipo === 'solicito'
              ? 'Solicitud'
              : 'Servicio personal';

    // Identidad mostrada — empresa: nombre del negocio (+ sufijo de sucursal
    // si tiene más de una); persona: nombre corto del usuario.
    const { oferente, tipo } = publicacion;
    const esEmpresa = tipo === 'vacante-empresa';
    const nombre = esEmpresa
        ? (oferente.negocioNombre ?? obtenerNombreCorto(oferente.nombre, oferente.apellidos))
        : obtenerNombreCorto(oferente.nombre, oferente.apellidos);
    const sufijoSucursal = esEmpresa && (oferente.totalSucursales ?? 0) > 1
        ? (oferente.sucursalEsPrincipal ? 'Matriz' : oferente.sucursalNombre)
        : null;

    return (
        <>
            {tipoLabel} ·{' '}
            <span className="font-bold text-white">{nombre}</span>
            {sufijoSucursal && (
                <>
                    <span className="inline-block mx-1.5 h-3 w-px bg-white/40 align-middle" />
                    <span className="font-medium text-white/80">{sufijoSucursal}</span>
                </>
            )}
        </>
    );
}

export default PaginaServicio;
