/**
 * PaginaServicioPublico.tsx
 * ==========================
 * Versión PÚBLICA del detalle de una publicación de Servicios, accesible
 * sin iniciar sesión. Sirve para los enlaces compartidos en redes sociales.
 *
 * Ruta: `/p/servicio/:publicacionId`
 *
 * Layout: réplica 1:1 del patrón de `PaginaArticuloMarketplacePublico`
 * (HeaderPublico arriba + 2-col 3fr/2fr en desktop + FooterPublico abajo),
 * adaptado a Servicios:
 *   - Color teal → sky (identidad de Servicios).
 *   - Eyebrow "MarketPlace" → "Servicios".
 *   - Galería con `GaleriaServicio` (no `GaleriaArticulo` — Servicios
 *     puede no tener fotos y muestra portada de la sucursal cuando es
 *     vacante de empresa).
 *   - Bloque info con título + precio formateado por tipo (Sueldo a tratar
 *     para vacantes sin tope) + modalidad + tipo de empleo (vacantes).
 *   - Card del oferente (persona o negocio) con avatar + nombre + ciudad
 *     y label "Sobre el oferente / negocio / solicitante" según el tipo.
 *   - Características: tipo de publicación, modalidad, categoría, zona.
 *   - SIN botón WhatsApp (privacidad — evita scrapers de teléfonos).
 *   - SIN botón guardar/heart (requiere login).
 *   - SIN sección Q&A (preguntar requiere login).
 *   - Botón único "Enviar mensaje al oferente" → `ModalAuthRequerido`.
 *   - OG tags vía `useOpenGraph` para previews en WhatsApp/FB/Twitter.
 *   - CTA "Únete gratis a AnunciaYA" sky con icono Wrench.
 *
 * Estados especiales:
 *   - publicación no existe / soft-deleted → 404 amigable.
 *   - `pausada` → mensaje "Esta publicación está pausada por el autor".
 *
 * Doc maestro: docs/arquitectura/Servicios.md
 *
 * Ubicación: apps/web/src/pages/public/PaginaServicioPublico.tsx
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    PauseCircle,
    AlertCircle,
    MessageSquare,
    ShieldCheck,
    UserCheck,
    Flag,
    Wrench,
    ArrowRight,
    Check,
    Briefcase,
    Store,
    BadgeCheck,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

import { useAuthStore } from '../../stores/useAuthStore';
import { usePublicacionServicio } from '../../hooks/queries/useServicios';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { GaleriaServicio } from '../../components/servicios/GaleriaServicio';
import { MapaUbicacion } from '../../components/marketplace/MapaUbicacion';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { Spinner } from '../../components/ui/Spinner';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    formatearTiempoRelativo,
    modalidadLabel,
    obtenerFotoPortada,
    etiquetaTipoEmpleo,
} from '../../utils/servicios';
import type { PublicacionDetalle } from '../../types/servicios';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaServicioPublico() {
    const { publicacionId } = useParams<{ publicacionId: string }>();
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const { data: publicacion, isLoading, isError } =
        usePublicacionServicio(publicacionId);

    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);

    // ─── OG tags ──────────────────────────────────────────────────────────────
    const esVacante = publicacion?.tipo === 'vacante-empresa';
    const fotoPortadaUrl = publicacion
        ? obtenerFotoPortada(publicacion.fotos, publicacion.fotoPortadaIndex) ??
          (esVacante ? publicacion.sucursalPortada ?? undefined : undefined)
        : undefined;
    const urlActual =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/servicio/${publicacionId}`
            : `/p/servicio/${publicacionId}`;

    useOpenGraph({
        title: publicacion
            ? `${publicacion.titulo} · AnunciaYA Servicios`
            : 'Servicios de AnunciaYA',
        description: publicacion
            ? (publicacion.descripcion ?? '').slice(0, 155) ||
              'Publicación de servicios en AnunciaYA.'
            : 'Servicios e intangibles entre vecinos.',
        image: fotoPortadaUrl,
        url: urlActual,
        type: 'product',
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !publicacion) {
        return <Estado404Publico onVolver={() => navigate('/')} />;
    }

    if (publicacion.estado === 'eliminada') {
        return <Estado404Publico onVolver={() => navigate('/')} />;
    }

    const estadoNoActivo: 'pausada' | null =
        publicacion.estado === 'pausada' ? 'pausada' : null;
    const noActiva = estadoNoActivo !== null;

    const handleEnviarMensaje = () => {
        if (!usuario) {
            setModalAuthAbierto(true);
            return;
        }
        navigate(`/servicios/${publicacionId}`);
    };

    return (
        <div
            data-testid="pagina-servicio-publico"
            className="bg-app-degradado flex h-screen flex-col"
        >
            <HeaderPublico />

            <main
                className={`flex-1 overflow-y-auto ${
                    !noActiva ? 'pb-20 lg:pb-0' : ''
                }`}
            >
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="pb-5 lg:pb-8 lg:pt-2">
                        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                            {/* ─── COLUMNA IZQUIERDA ─────────────────── */}
                            <div className="space-y-5 lg:mt-8 lg:space-y-6">
                                {/* Galería (solo si hay fotos o portada de sucursal).
                                    Wrapping: edge-to-edge en móvil; card bordeada
                                    con `rounded-2xl + shadow-md + border-2 slate-300`
                                    en desktop — mismo patrón que el detalle privado. */}
                                {fotoPortadaUrl && (
                                    <div className="relative -mx-4 lg:mx-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-md lg:border-2 lg:border-slate-300">
                                        <GaleriaServicio publicacion={publicacion} />
                                        {estadoNoActivo && (
                                            <OverlayEstadoNoActiva estado={estadoNoActivo} />
                                        )}
                                    </div>
                                )}

                                {/* Bloque info — SOLO móvil. En desktop va en col-derecha */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:hidden">
                                    <BloqueInfo publicacion={publicacion} />
                                </div>

                                {/* Descripción */}
                                {publicacion.descripcion && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                                        <h2 className="mb-2 text-base font-bold text-slate-900">
                                            Descripción
                                        </h2>
                                        <p
                                            data-testid="descripcion"
                                            className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700"
                                        >
                                            {publicacion.descripcion}
                                        </p>
                                    </div>
                                )}

                                {/* Requisitos + Beneficios — SOLO vacantes con
                                    contenido. Grid 2 columnas en desktop, 1 en
                                    móvil. Mismo patrón visual que el detalle
                                    privado (uppercase label slate + check teal
                                    para requisitos / emerald para beneficios). */}
                                {esVacante &&
                                    ((publicacion.requisitos?.length ?? 0) > 0 ||
                                        (publicacion.beneficios?.length ?? 0) > 0) && (
                                    <div className="mx-3 grid grid-cols-1 gap-3 lg:mx-0 lg:grid-cols-2 lg:gap-4">
                                        {(publicacion.requisitos?.length ?? 0) > 0 && (
                                            <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                                <div className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                                                    Requisitos
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {publicacion.requisitos?.map((r) => (
                                                        <li
                                                            key={r}
                                                            className="flex items-start gap-2 text-sm font-medium text-slate-700"
                                                        >
                                                            <Check
                                                                className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
                                                                strokeWidth={2.5}
                                                            />
                                                            {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {(publicacion.beneficios?.length ?? 0) > 0 && (
                                            <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                                <div className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                                                    Beneficios
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {publicacion.beneficios?.map((b) => (
                                                        <li
                                                            key={b}
                                                            className="flex items-start gap-2 text-sm font-medium text-slate-700"
                                                        >
                                                            <Check
                                                                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                                                                strokeWidth={2.5}
                                                            />
                                                            {b}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Características — SOLO móvil */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                    <h2 className="mb-3 text-base font-bold text-slate-900">
                                        Características
                                    </h2>
                                    <CaracteristicasTabla publicacion={publicacion} />
                                </div>

                                {/* Card oferente — SOLO móvil */}
                                <div className="px-3 lg:hidden">
                                    <CardOferentePublico
                                        publicacion={publicacion}
                                        onContactar={!noActiva ? handleEnviarMensaje : undefined}
                                    />
                                </div>

                                {/* Mapa (cuando hay ubicación aproximada) */}
                                {publicacion.ubicacionAproximada && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                                        <h2 className="mb-2 text-base font-bold text-slate-900">
                                            Ubicación aproximada
                                        </h2>
                                        <MapaUbicacion
                                            lat={publicacion.ubicacionAproximada.lat}
                                            lng={publicacion.ubicacionAproximada.lng}
                                            zonaAproximada={publicacion.zonasAproximadas?.[0] ?? null}
                                        />
                                    </div>
                                )}

                                {noActiva && estadoNoActivo && (
                                    <div className="mx-3 lg:hidden">
                                        <MensajeEstadoNoActiva estado={estadoNoActivo} />
                                    </div>
                                )}
                            </div>

                            {/* ─── COLUMNA DERECHA — solo desktop ─────
                                Con galería: `lg:-mt-12` (sube el panel para
                                alinearlo con la galería de la col izquierda).
                                Sin galería (solicitudes/servicios sin foto):
                                `lg:mt-12` (positivo) para que el panel arranque
                                a la altura de "Descripción" y no quede pegado
                                al header. */}
                            <div className={`hidden lg:flex lg:flex-col ${
                                fotoPortadaUrl ? 'lg:-mt-12' : 'lg:mt-8'
                            }`}>
                                <div className="sticky top-10 flex flex-col gap-2">
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <BloqueInfo publicacion={publicacion} compacto />

                                        {/* CTA "Contactar negocio" — SOLO vacantes.
                                            Para servicios/solicitudes el botón vive
                                            dentro de la card del oferente (abajo).
                                            Si está pausada, mostrar el mensaje de
                                            estado sin importar el tipo. */}
                                        {(esVacante || estadoNoActivo) && (
                                            <div className="mt-3 space-y-1.5 border-t-2 border-slate-200 pt-3">
                                                {!estadoNoActivo ? (
                                                    <BotonContactoPublico onClick={handleEnviarMensaje} tipo={publicacion.tipo} />
                                                ) : (
                                                    <MensajeEstadoNoActiva estado={estadoNoActivo} />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <CardOferentePublico
                                        publicacion={publicacion}
                                        compacto
                                        onContactar={!noActiva ? handleEnviarMensaje : undefined}
                                    />

                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <h2 className="mb-1.5 text-base font-bold text-slate-900">
                                            Características
                                        </h2>
                                        <CaracteristicasTabla publicacion={publicacion} compacto />
                                    </div>

                                    <CardContratoSeguro />
                                </div>
                            </div>
                        </div>

                        {/* CTA personalizado de marca */}
                        <div className="mx-3 mt-12 overflow-hidden rounded-2xl border-2 border-sky-200 bg-linear-to-br from-sky-50 via-white to-blue-50 p-5 shadow-md lg:mx-0 lg:p-7">
                            <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
                                <div
                                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:h-20 lg:w-20"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #38bdf8, #0369a1)',
                                    }}
                                >
                                    <Wrench
                                        className="h-8 w-8 text-white lg:h-10 lg:w-10"
                                        strokeWidth={2.5}
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                                        {publicacion.ciudad
                                            ? `Más servicios cerca de ${publicacion.ciudad}`
                                            : 'Encuentra el servicio que necesitas'}
                                    </h2>
                                    <p className="mt-1.5 text-sm font-medium text-slate-600">
                                        <span className="font-bold text-slate-900">
                                            Únete gratis a AnunciaYA.
                                        </span>{' '}
                                        Ofrece tus servicios o encuentra profesionales y empleos
                                        cerca de ti.
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                                        {['Hiperlocal', 'Sin comisiones', 'Sin spam'].map(
                                            (etiqueta) => (
                                                <span
                                                    key={etiqueta}
                                                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                                                >
                                                    <Check
                                                        className="h-3 w-3 text-sky-600"
                                                        strokeWidth={3}
                                                    />
                                                    {etiqueta}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <button
                                    data-testid="cta-conocer-anunciaya"
                                    onClick={() => navigate('/registro')}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] lg:cursor-pointer lg:hover:bg-sky-700"
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

            {!noActiva && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 lg:hidden">
                    <BotonContactoPublico onClick={handleEnviarMensaje} tipo={publicacion.tipo} />
                </div>
            )}

            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                contexto={{
                    tipo:
                        publicacion.tipo === 'vacante-empresa'
                            ? 'vacante'
                            : publicacion.tipo === 'solicito'
                              ? 'solicitud'
                              : 'servicio',
                    titulo: publicacion.titulo,
                }}
                urlRetorno={`/servicios/${publicacionId}`}
            />
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface BloqueInfoProps {
    publicacion: PublicacionDetalle;
    /** Si true, reduce paddings y tamaños para caber en el panel sticky. */
    compacto?: boolean;
}

function BloqueInfo({ publicacion, compacto = false }: BloqueInfoProps) {
    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esOfrece = publicacion.modo === 'ofrezco';

    // Precio según tipo/modo (misma lógica que CardServicio):
    //   - Vacante / Ofrezco → `publicacion.precio` formateado.
    //   - Solicito → `presupuesto` si existe, sino "A tratar".
    const precioMostrar = (esVacante || esOfrece)
        ? formatearPrecioServicio(publicacion.precio, { esVacante })
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A tratar';

    const labelTipo = esVacante
        ? 'VACANTE'
        : esOfrece
          ? 'SERVICIO'
          : 'SOLICITUD';

    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            {/* Eyebrow Servicios · Ciudad */}
            <p
                className={`flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-wide ${
                    compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'
                }`}
            >
                <span className="text-sky-700">Servicios · {labelTipo}</span>
                {publicacion.ciudad && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                strokeWidth={2.5}
                            />
                            {publicacion.ciudad}
                        </span>
                    </>
                )}
            </p>

            {/* Título */}
            <h1
                data-testid="titulo"
                className={
                    compacto
                        ? 'text-sm font-bold leading-tight text-slate-900 2xl:text-base'
                        : 'text-xl font-bold leading-tight text-slate-900 lg:text-2xl 2xl:text-3xl'
                }
            >
                {publicacion.titulo}
            </h1>

            {/* Precio / Sueldo / Presupuesto */}
            <div
                data-testid="precio"
                className={
                    compacto
                        ? 'text-xl font-extrabold leading-none tracking-tight text-sky-700 2xl:text-2xl'
                        : 'text-3xl font-extrabold leading-none tracking-tight text-sky-700 lg:text-4xl'
                }
            >
                {precioMostrar}
            </div>

            {/* Chips: modalidad + tipo empleo (vacantes) */}
            <div className="flex flex-wrap items-center gap-1.5">
                {publicacion.modalidad && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-100 px-2.5 py-1 text-sm font-semibold text-sky-700">
                        {modalidadLabel(publicacion.modalidad)}
                    </span>
                )}
                {esVacante && publicacion.tipoEmpleo && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-sm font-semibold text-blue-700">
                        {etiquetaTipoEmpleo(publicacion.tipoEmpleo)}
                    </span>
                )}
                {publicacion.urgente && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700">
                        Urgente
                    </span>
                )}
            </div>

            {/* KPIs de tiempo + vistas omitidos en la pública para mantener
                el bloque info enfocado en lo accionable (título, sueldo,
                modalidad). Quien entra desde un link compartido no necesita
                ver "hace 5d · 8 vistas" — esos datos son para el dueño. */}
        </div>
    );
}

interface CardOferentePublicoProps {
    publicacion: PublicacionDetalle;
    /** Padding reducido para caber en el panel sticky desktop. */
    compacto?: boolean;
    /** Handler del botón "Contactar oferente/solicitante" que se renderiza
     *  debajo del nombre cuando NO es vacante. Si se omite, el botón no
     *  aparece (caller decide dónde colocarlo). En vacantes el contacto
     *  vive arriba (WhatsApp del negocio) y abajo (Contactar negocio en
     *  la card principal), no aquí. */
    onContactar?: () => void;
}

/**
 * Card mínima del oferente — sin botones de contacto (eso vive en
 * el CTA "Enviar mensaje" del bloque info). Solo identidad: avatar +
 * nombre + label "Sobre el oferente/negocio/solicitante" según tipo.
 */
/**
 * Icono SVG de WhatsApp (mismo marcador de marca que usa BarraContacto).
 * Inline para evitar dependencia de lucide/icon set externo.
 */
function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg
            className={`${className ?? 'h-5 w-5'} text-white`}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

function CardOferentePublico({
    publicacion,
    compacto = false,
    onContactar,
}: CardOferentePublicoProps) {
    const { oferente, tipo, titulo } = publicacion;
    const esVacante = tipo === 'vacante-empresa';

    const labelTitulo = esVacante
        ? 'Sobre el negocio'
        : tipo === 'solicito'
          ? 'Sobre el solicitante'
          : 'Sobre el oferente';

    const nombre = esVacante
        ? oferente.negocioNombre ?? `${oferente.nombre} ${oferente.apellidos}`.trim()
        : `${oferente.nombre} ${oferente.apellidos}`.trim();

    // Sufijo de sucursal — solo se muestra cuando el negocio tiene >1
    // sucursal (sino "Matriz"/"Norte" es ruido cuando solo hay una). Para
    // la principal usamos "Matriz" en lugar del nombre propio (que sería
    // redundante con el nombre del negocio arriba).
    const sufijoSucursal = esVacante && (oferente.totalSucursales ?? 0) > 1
        ? oferente.sucursalEsPrincipal
            ? 'Matriz'
            : oferente.sucursalNombre
        : null;

    // Avatar para el card "Sobre el negocio/oferente":
    //   - Vacante: LOGO del negocio (identidad de marca). Fallback a foto
    //     de perfil de sucursal si el negocio aún no tiene logo, y por
    //     último al avatar del usuario dueño.
    //   - Servicio/Solicitud personal: avatar del usuario.
    const avatarUrl = esVacante
        ? oferente.negocioLogo ?? oferente.sucursalFotoPerfil ?? oferente.avatarUrl
        : oferente.avatarUrl;

    return (
        <div
            className={`rounded-xl border-2 border-slate-300 bg-white shadow-md ${
                compacto ? 'p-4' : 'p-3 lg:p-4'
            }`}
        >
            {/* Título uniforme `text-base` en ambos modos (compacto y no
                compacto) para hacer match con los otros títulos del panel
                — "Descripción", "Características", "Contratación segura". */}
            <h2 className="mb-3 text-base font-bold text-slate-900">
                {labelTitulo}
            </h2>
            <div className="flex items-center gap-3">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={nombre}
                        className="h-12 w-12 shrink-0 rounded-full border-2 border-slate-200 object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-slate-200 bg-slate-100">
                        {esVacante ? (
                            <Store className="h-5 w-5 text-slate-500" strokeWidth={2} />
                        ) : (
                            <UserCheck className="h-5 w-5 text-slate-500" strokeWidth={2} />
                        )}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    {/* Nombre + BadgeCheck invertido cuando es vacante
                        (negocios son entidades verificadas en la plataforma).
                        Patrón visual idéntico al del detalle privado. */}
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-900 lg:text-base">
                        <span className="truncate">{nombre}</span>
                        {esVacante && (
                            <BadgeCheck
                                className="h-5 w-5 shrink-0 fill-blue-500 text-white"
                                strokeWidth={2.5}
                                aria-label="Empresa verificada"
                            />
                        )}
                    </div>
                    {/* Sucursal (solo vacantes con >1 sucursal). Línea
                        bajo el nombre — formato "Matriz" si principal o
                        nombre de la sucursal específica. */}
                    {sufijoSucursal && (
                        <div className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                            {sufijoSucursal}
                        </div>
                    )}
                    {oferente.ciudad && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                            <MapPin
                                className="h-3 w-3 shrink-0 text-slate-500"
                                strokeWidth={2.5}
                            />
                            {oferente.ciudad}
                        </div>
                    )}
                </div>
            </div>

            {/* Botón WhatsApp del negocio — solo vacantes con número
                registrado. Es el único canal de contacto público sin
                requerir login (ChatYA sí lo requiere). Mensaje precargado
                hace referencia al título de la vacante. */}
            {esVacante && oferente.sucursalWhatsapp && (
                <a
                    href={`https://wa.me/${oferente.sucursalWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                        `Hola, vi su vacante "${titulo}" en AnunciaYA. Me interesa.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="btn-whatsapp-negocio-publico"
                    aria-label="Contactar al negocio por WhatsApp"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] lg:cursor-pointer"
                >
                    <WhatsAppIcon className="h-5 w-5" />
                    WhatsApp
                </a>
            )}

            {/* Botón "Contactar oferente/solicitante" — SOLO para servicios
                personales y solicitudes (no vacantes — en vacantes el CTA
                vive en la card principal con "Contactar negocio"). Aquí va
                anclado al perfil porque servicios/solicitudes no tienen
                WhatsApp público, así que este es el único canal disponible. */}
            {!esVacante && onContactar && (
                <BotonContactoPublico
                    onClick={onContactar}
                    tipo={tipo}
                    className="mt-3"
                />
            )}
        </div>
    );
}

function CaracteristicasTabla({
    publicacion,
    compacto = false,
}: {
    publicacion: PublicacionDetalle;
    compacto?: boolean;
}) {
    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esOfrece = publicacion.modo === 'ofrezco';

    const tipoLabel = esVacante
        ? 'Vacante de empresa'
        : esOfrece
          ? 'Servicio personal'
          : 'Solicitud';

    const filas: Array<{ label: string; valor: React.ReactNode }> = [
        { label: 'Tipo', valor: tipoLabel },
        ...(publicacion.modalidad
            ? [{ label: 'Modalidad', valor: modalidadLabel(publicacion.modalidad) }]
            : []),
        ...(esVacante && publicacion.tipoEmpleo
            ? [{ label: 'Tipo de empleo', valor: etiquetaTipoEmpleo(publicacion.tipoEmpleo) }]
            : []),
        ...(publicacion.categoria
            ? [{ label: 'Categoría', valor: publicacion.categoria }]
            : []),
        ...(publicacion.ciudad
            ? [{ label: 'Ciudad', valor: publicacion.ciudad }]
            : []),
        ...(publicacion.zonasAproximadas && publicacion.zonasAproximadas.length > 0
            ? [{ label: 'Zonas', valor: publicacion.zonasAproximadas.join(', ') }]
            : []),
        {
            label: 'Publicado',
            valor: formatearTiempoRelativo(publicacion.createdAt),
        },
    ];
    const filaPadding = compacto ? 'py-1' : 'py-2';
    return (
        <dl className="divide-y divide-slate-200">
            {filas.map((fila) => (
                <div
                    key={fila.label}
                    className={`flex items-baseline justify-between gap-3 text-sm ${filaPadding}`}
                >
                    <dt className="font-semibold text-slate-600">{fila.label}</dt>
                    <dd className="text-right font-medium text-slate-900">{fila.valor}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Card de tips de seguridad para contratación de servicios (análoga a
 * "Compra segura" en MarketPlace). Genérica — refuerza confianza con
 * lineamientos básicos para vacantes y servicios.
 */
function CardContratoSeguro({ className = '' }: { className?: string }) {
    const tips: Array<{
        icono: React.ComponentType<{ className?: string; strokeWidth?: number }>;
        texto: string;
    }> = [
        { icono: UserCheck, texto: 'Verifica el perfil del oferente antes de contratar' },
        { icono: Briefcase, texto: 'Acuerda términos por escrito (precio, alcance, tiempos)' },
        { icono: ShieldCheck, texto: 'Solicita identificación si vas a recibirlo en casa' },
        { icono: Flag, texto: 'Reporta cualquier comportamiento sospechoso' },
    ];
    return (
        <div
            className={`rounded-xl border-2 border-sky-200 bg-sky-50 p-4 shadow-md ${className}`}
        >
            <div className="mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sky-700" strokeWidth={2.5} />
                <h2 className="text-base font-bold text-sky-900">
                    Contratación segura
                </h2>
            </div>
            <ul className="space-y-1.5">
                {tips.map(({ icono: Icono, texto }) => (
                    <li
                        key={texto}
                        className="flex items-start gap-1.5 text-sm font-medium leading-snug text-sky-900"
                    >
                        <Icono
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700"
                            strokeWidth={2.5}
                        />
                        <span>{texto}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface BotonContactoProps {
    onClick: () => void;
    tipo: PublicacionDetalle['tipo'];
    /** Clases extra del wrapper (ej. `mt-3` cuando va dentro de la card
     *  del oferente). Se concatena al final del className base. */
    className?: string;
}

function BotonContactoPublico({ onClick, tipo, className = '' }: BotonContactoProps) {
    // Texto dinámico según tipo de publicación. Diferencia el destino del
    // chat (negocio / oferente / solicitante) y a la vez se aparta
    // visualmente del botón WhatsApp del negocio (que ya vive en la card
    // del oferente arriba) para que ambos canales convivan sin redundar.
    const label =
        tipo === 'vacante-empresa'
            ? 'Contactar negocio'
            : tipo === 'solicito'
              ? 'Contactar solicitante'
              : 'Contactar oferente';
    return (
        <button
            data-testid="btn-enviar-mensaje-publico-servicio"
            onClick={onClick}
            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] lg:cursor-pointer ${className}`}
        >
            <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
            {label}
        </button>
    );
}

function OverlayEstadoNoActiva({ estado }: { estado: 'pausada' }) {
    return (
        <div
            data-testid={`overlay-publico-${estado}`}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-700/85 lg:rounded-xl"
        >
            <div className="flex flex-col items-center gap-2 text-white">
                <PauseCircle className="h-12 w-12" strokeWidth={1.5} />
                <span className="text-2xl font-extrabold tracking-wider">
                    PAUSADO
                </span>
            </div>
        </div>
    );
}

function MensajeEstadoNoActiva({ estado }: { estado: 'pausada' }) {
    return (
        <div
            data-testid={`mensaje-estado-${estado}`}
            className="rounded-xl border-2 border-slate-300 bg-white p-4 text-sm shadow-md"
        >
            <strong className="block font-semibold text-slate-900">
                Esta publicación está pausada por el autor
            </strong>
            <p className="mt-0.5 text-slate-600">
                El autor la pausó temporalmente. Vuelve más tarde o explora otras
                publicaciones de Servicios.
            </p>
        </div>
    );
}

function Estado404Publico({ onVolver }: { onVolver: () => void }) {
    return (
        <div className="bg-app-degradado flex min-h-screen items-center justify-center px-6">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <AlertCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">
                    Publicación no encontrada
                </h2>
                <p className="mb-5 text-sm text-slate-600">
                    Esta publicación no existe o ya fue eliminada.
                </p>
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

export default PaginaServicioPublico;
