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

    return (
        <>
            <ServiciosHeader
                variante="pagina"
                onBack={handleVolver}
                slotDerecho={<PillTipoHeader tipo={publicacion.tipo} />}
                subtituloMobile={
                    <SubtituloMobileHeader publicacion={publicacion} />
                }
            />
            <div className="min-h-full bg-transparent pb-32">
                <div className="lg:mx-auto lg:max-w-3xl lg:px-6 2xl:px-8 lg:py-6">
                    <div className="px-4 lg:px-0 space-y-3 lg:space-y-4">
                        {/* Galería — edge-to-edge en mobile, card en desktop */}
                        <div className="-mx-4 lg:mx-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-md lg:border lg:border-slate-200">
                            <GaleriaServicio publicacion={publicacion} />
                        </div>

                        {isPausada && <BannerPausada />}

                        {/* Card 1: cabecera (tipo + título + precio + oferente) */}
                        <SeccionCard>
                            <TipoChip
                                tipo={publicacion.tipo}
                                verificada={isVacante}
                            />

                            <h1 className="mt-2 text-[22px] lg:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
                                {publicacion.titulo}
                            </h1>

                            {isSolicito && publicacion.presupuesto ? (
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-amber-700">
                                        Presupuesto
                                    </span>
                                    <span className="text-[20px] font-extrabold text-slate-900">
                                        {formatearPresupuesto(
                                            publicacion.presupuesto,
                                        )}
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                                    <span className="text-[20px] font-extrabold text-sky-700">
                                        {formatearPrecioServicio(publicacion.precio)}
                                    </span>
                                    <span className="text-[12px] font-semibold text-slate-500">
                                        · {modalidadLabel(publicacion.modalidad)} ·{' '}
                                        {publicacion.ciudad.split(',')[0]}
                                    </span>
                                </div>
                            )}

                            <OferenteCard
                                publicacion={publicacion}
                                onClick={() =>
                                    navigate(
                                        `/servicios/usuario/${publicacion.oferente.id}`,
                                    )
                                }
                            />
                        </SeccionCard>

                        {/* Card descripción */}
                        <SeccionCard>
                            <Seccion titulo="Descripción">
                                <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
                                    {publicacion.descripcion}
                                </p>
                            </Seccion>
                        </SeccionCard>

                        {isServicio && publicacion.skills.length > 0 && (
                            <SeccionCard>
                                <Seccion titulo="Especialidades">
                                    <PillList items={publicacion.skills} />
                                </Seccion>
                            </SeccionCard>
                        )}

                        {isVacante && publicacion.requisitos.length > 0 && (
                            <SeccionCard>
                                <Seccion titulo="Requisitos">
                                    <ul className="space-y-1.5">
                                        {publicacion.requisitos.map((r) => (
                                            <li
                                                key={r}
                                                className="flex items-start gap-2 text-[13px] text-slate-700 font-medium"
                                            >
                                                <Check
                                                    className="w-[14px] h-[14px] text-sky-600 mt-0.5 shrink-0"
                                                    strokeWidth={2.5}
                                                />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </Seccion>
                            </SeccionCard>
                        )}

                        {isVacante && publicacion.beneficios.length > 0 && (
                            <SeccionCard>
                                <Seccion titulo="Beneficios">
                                    <ul className="space-y-1.5">
                                        {publicacion.beneficios.map((b) => (
                                            <li
                                                key={b}
                                                className="flex items-start gap-2 text-[13px] text-slate-700 font-medium"
                                            >
                                                <Check
                                                    className="w-[14px] h-[14px] text-emerald-600 mt-0.5 shrink-0"
                                                    strokeWidth={2.5}
                                                />
                                                {b}
                                            </li>
                                        ))}
                                    </ul>
                                </Seccion>
                            </SeccionCard>
                        )}

                        <SeccionCard>
                            <Seccion titulo="Modalidad y ubicación">
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    <ChipInfo
                                        icono={
                                            <MapPin
                                                className="w-[11px] h-[11px]"
                                                strokeWidth={1.75}
                                            />
                                        }
                                    >
                                        {modalidadLabel(publicacion.modalidad)}
                                    </ChipInfo>
                                    {publicacion.horario && (
                                        <ChipInfo
                                            icono={
                                                <Clock
                                                    className="w-[11px] h-[11px]"
                                                    strokeWidth={1.75}
                                                />
                                            }
                                        >
                                            {publicacion.horario}
                                        </ChipInfo>
                                    )}
                                    {publicacion.zonasAproximadas.length > 0 && (
                                        <ChipInfo>
                                            {publicacion.zonasAproximadas.join(' · ')}
                                        </ChipInfo>
                                    )}
                                </div>
                                <MapaUbicacion
                                    lat={publicacion.ubicacionAproximada.lat}
                                    lng={publicacion.ubicacionAproximada.lng}
                                    zonaAproximada={
                                        publicacion.zonasAproximadas.length > 0
                                            ? publicacion.zonasAproximadas.join(
                                                  ' · ',
                                              )
                                            : publicacion.ciudad
                                    }
                                />
                            </Seccion>
                        </SeccionCard>

                        <SeccionCard>
                            <SeccionPreguntasServicio publicacion={publicacion} />
                        </SeccionCard>

                        {/* Card "Dejar reseña" — visible solo si el usuario
                            actual NO es el dueño. El backend devuelve 409 si
                            ya reseñó, así que no necesitamos chequear acá.
                            Sprint 7.6+: el trigger ideal es desde ChatYA al
                            cerrar conversación, este botón es el fallback. */}
                        {usuarioActualId &&
                            usuarioActualId !== publicacion.oferente.id && (
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
                                            <p className="text-[13px] text-slate-600 font-medium mt-0.5 leading-snug">
                                                Deja una reseña para que otros
                                                vecinos sepan cómo te atendieron.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            data-testid="btn-dejar-resena"
                                            onClick={() =>
                                                setModalResenaAbierto(true)
                                            }
                                            className="shrink-0 px-4 py-2 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-bold text-[13px] shadow-cta-sky lg:cursor-pointer active:scale-[0.98]"
                                        >
                                            Dejar reseña
                                        </button>
                                    </div>
                                </SeccionCard>
                            )}

                        {/* Barra de contacto inline desktop como último card. */}
                        <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-3">
                            <BarraContactoServicio
                                publicacion={publicacion}
                                variante="desktop"
                            />
                        </div>
                    </div>
                </div>

                {/* Barra de contacto fija inferior en móvil */}
                <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 lg:hidden">
                    {isPausada ? (
                        <div className="px-3 py-3">
                            <button
                                disabled
                                className="w-full py-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-[14px] cursor-not-allowed"
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
    verificada,
}: {
    tipo: PublicacionDetalle['tipo'];
    verificada?: boolean;
}) {
    if (tipo === 'vacante-empresa') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold">
                <Briefcase className="w-2.5 h-2.5" strokeWidth={2.5} />
                Vacante {verificada ? '— Empresa verificada' : ''}
            </span>
        );
    }
    if (tipo === 'solicito') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                Solicito
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold">
            <Wrench className="w-2.5 h-2.5" strokeWidth={2.5} />
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
                'bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 lg:px-6 lg:py-5 ' +
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
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
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
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold"
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
            {icono}
            {children}
        </span>
    );
}

function BannerPausada() {
    return (
        <div className="mt-3 mx-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertCircle
                className="w-4 h-4 text-amber-700 mt-0.5 shrink-0"
                strokeWidth={2}
            />
            <div>
                <div className="text-[13px] font-bold text-amber-900">
                    Publicación pausada
                </div>
                <div className="text-[12px] text-amber-800 leading-snug">
                    No puedes contactar mientras esté pausada. Te avisaremos si
                    vuelve a estar activa.
                </div>
            </div>
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
    const nombre = obtenerNombreCorto(
        publicacion.oferente.nombre,
        publicacion.oferente.apellidos,
    );
    return (
        <>
            {tipoLabel} · <span className="font-bold text-white">{nombre}</span>
        </>
    );
}

export default PaginaServicio;
