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
 * Layout desktop: 1 columna acotada con `max-w-[920px]` + sticky CTA en lateral
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
    BadgeCheck,
    Briefcase,
    Check,
    ChevronRight,
    Clock,
    MapPin,
    Navigation,
    Star,
    Wrench,
    Zap,
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { ICONOS } from '../../../config/iconos';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useNavegarASeccion } from '../../../hooks/useNavegarASeccion';
import { useGuardados } from '../../../hooks/useGuardados';
import {
    usePublicacionServicio,
    useRegistrarVistaServicio,
} from '../../../hooks/queries/useServicios';
import {
    etiquetaTipoEmpleo,
    formatearHorarioLegible,
    formatearPrecioServicio,
    formatearPresupuesto,
    formatearUltimaConexion,
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
    const navegarASeccion = useNavegarASeccion();
    const handleVolver = useVolverAtras('/servicios');
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);

    const { data: publicacion, isPending, isError } = usePublicacionServicio(id);
    const registrarVista = useRegistrarVistaServicio();
    const vistaYaRegistrada = useRef(false);
    const [modalResenaAbierto, setModalResenaAbierto] = useState(false);

    // Botón guardar de la galería del detalle. El backend devuelve
    // `publicacion.guardado` con el estado real del usuario actual
    // (Sprint 9.3 — antes arrancaba siempre en false). El hook
    // re-sincroniza cuando llega la data (efecto sobre initialGuardado)
    // y el invalidateQueries mantiene en sync el listado de Mis
    // Guardados (tab Servicios) y este botón.
    const {
        guardado,
        loading: cargandoGuardar,
        toggleGuardado,
    } = useGuardados({
        entityType: 'servicio',
        entityId: id ?? '',
        initialGuardado: publicacion?.guardado ?? false,
    });

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
                    <div className="lg:mx-auto lg:max-w-[920px] lg:px-4">
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
                                onClick={handleVolver}
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

    // Sprint 9.3 (iteración): la galería se OCULTA cuando no aporta
    // contenido visual. Vacantes-empresa siempre muestran el hero (logo
    // + identidad de marca, con fallback a gradient sky). Servicios
    // personales / solicitudes sin fotos antes mostraban un placeholder
    // "SIN FOTO" enorme que solo consumía espacio — ahora omitimos el
    // wrapper entero y movemos el botón guardar al header del primer
    // SeccionCard (al lado del badge de tipo) para que siga accesible.
    const tieneGaleria = isVacante || (publicacion.fotos?.length ?? 0) > 0;
    const puedeGuardar = usuarioActualId !== publicacion.oferente.id;

    /** Click en "Ver negocio" / "Ver perfil" — destino según tipo:
     *  - vacante-empresa con sucursalId → /negocios/{sucursalId} (perfil real
     *    del negocio en la sección Negocios — usa `navegarASeccion` porque
     *    es un salto entre top-levels).
     *  - resto → /servicios/usuario/{oferenteId} (perfil del prestador como
     *    persona dentro de Servicios — push normal, subruta del mismo padre). */
    const irAPerfilDelOferente = () => {
        if (isVacante && publicacion.sucursalId) {
            navegarASeccion(`/negocios/${publicacion.sucursalId}`);
            return;
        }
        navigate(`/servicios/usuario/${publicacion.oferente.id}`);
    };

    // ─── Contenido de cabecera (tipo + título + precio mobile) ────────
    // Sprint 9.3 (iteración): cuando NO hay galería, el bookmark sale a
    // la fila del TipoChip (sin glass blur — fondo blanco normal con
    // borde slate). Cuando sí hay galería, el bookmark vive en la
    // galería con su estilo glass (renderizado más abajo).
    const cabeceraTituloPrecio = (
        <SeccionCard>
            <div className="flex items-start justify-between gap-3">
                <TipoChip tipo={publicacion.tipo} verificada={isVacante} />
                {!tieneGaleria && puedeGuardar && (
                    <button
                        type="button"
                        data-testid="btn-guardar-servicio"
                        onClick={toggleGuardado}
                        disabled={cargandoGuardar}
                        aria-label={
                            guardado
                                ? 'Quitar de guardados'
                                : 'Guardar publicación'
                        }
                        aria-pressed={guardado}
                        className={
                            'shrink-0 h-9 w-9 grid place-items-center rounded-full bg-white shadow-sm lg:cursor-pointer hover:bg-slate-50 disabled:opacity-60 transition-colors ' +
                            (guardado
                                ? 'border-2 border-amber-500'
                                : 'border-2 border-slate-300')
                        }
                    >
                        <Icon
                            icon={ICONOS.guardar}
                            className="w-4.5 h-4.5"
                            style={{ color: guardado ? '#f59e0b' : '#94a3b8' }}
                        />
                    </button>
                )}
            </div>

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
                            {formatearPrecioServicio(publicacion.precio, {
                                esVacante: isVacante,
                            })}
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
                    onClick={irAPerfilDelOferente}
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

    // Sprint 9.3 (iteración): el título y el mensaje debajo del mapa
    // varían por tipo. Vacantes-empresa muestran "Ubicación del
    // negocio" + pin exacto + pill "Cómo llegar". Servicios personales
    // y solicitudes muestran "Ubicación aproximada" + círculo de
    // privacidad + mensaje genérico (la dinámica no siempre es punto
    // de encuentro como en MP, puede ser que el prestador vaya al
    // cliente o al revés, por eso usamos un copy más neutro que el
    // de MP).
    const esExacto = isVacante && Boolean(publicacion.ubicacionExacta);
    const tituloMapa = isVacante
        ? 'Ubicación del negocio'
        : 'Ubicación aproximada';
    const mensajePrivacidadMapa = isVacante
        ? undefined
        : 'Por privacidad mostramos solo la zona aproximada.\nCoordina los detalles por chat.';
    const urlComoLlegar = esExacto && publicacion.ubicacionExacta
        ? `https://www.google.com/maps/dir/?api=1&destination=${publicacion.ubicacionExacta.lat},${publicacion.ubicacionExacta.lng}`
        : null;

    const cardModalidadUbicacion = (
        <SeccionCard>
            <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-600">
                    {tituloMapa}
                </div>
                {urlComoLlegar && (
                    <a
                        href={urlComoLlegar}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="btn-como-llegar"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 px-3 py-1.5 text-xs font-bold text-white shadow-cta-sky lg:cursor-pointer active:scale-[0.98]"
                    >
                        <Navigation className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Cómo llegar
                    </a>
                )}
            </div>

            {/* Sprint 9.3 (iteración): el nombre de la ciudad NO se
                pasa al MapaUbicacion porque ya vive en el SidebarContacto
                de la derecha — mostrarlo aquí abajo del mapa era duplicado.
                Para servicios/solicitudes sí mostramos `zonasAproximadas`
                si las hay (ej. "Las Conchas") porque agregan info que la
                ciudad sola no da. Si no hay zonas, no mostramos nada. */}
            {esExacto && publicacion.ubicacionExacta ? (
                <MapaUbicacion
                    lat={publicacion.ubicacionExacta.lat}
                    lng={publicacion.ubicacionExacta.lng}
                    exacto
                />
            ) : (
                <MapaUbicacion
                    lat={publicacion.ubicacionAproximada.lat}
                    lng={publicacion.ubicacionAproximada.lng}
                    zonaAproximada={
                        publicacion.zonasAproximadas.length > 0
                            ? publicacion.zonasAproximadas.join(' · ')
                            : undefined
                    }
                    mensajePrivacidad={mensajePrivacidadMapa}
                />
            )}
        </SeccionCard>
    );

    const cardPreguntas = (
        <SeccionCard>
            <SeccionPreguntasServicio publicacion={publicacion} />
        </SeccionCard>
    );

    // Sprint 9.3 (iteración): NO mostrar el CTA "Deja una reseña" en
    // vacantes. Sprint 9.3 (iteración): tampoco se muestra en
    // SOLICITUDES — el solicitante pide ayuda, no presta servicio, así
    // que no tiene sentido calificarlo. Las reseñas solo aplican al
    // PRESTADOR del servicio (tipo='servicio-persona').
    //
    // Vacantes: las reseñas del negocio viven en su perfil de la sección
    // Negocios, no aquí.
    // Solicito: el reseñado sería quien resuelve la necesidad, pero ese
    // intercambio sucede 1:1 por chat — el modelo de reseñas pública del
    // solicitante no aporta nada útil.
    const cardDejarResena = usuarioActualId
        && usuarioActualId !== publicacion.oferente.id
        && isServicio && (
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
                <div className="lg:mx-auto lg:max-w-[920px] lg:px-4 lg:py-6">
                    <div className="px-4 lg:px-0 space-y-3 lg:space-y-4">
                        {/* Hero ancho completo — edge-to-edge mobile, card en desktop.
                            Sprint 9.3 (iteración): el wrapper SOLO se
                            renderiza si hay galería (vacantes-empresa
                            siempre, o servicio-persona/solicito con
                            fotos). Si no hay fotos en un servicio
                            personal o solicitud, se omite el wrapper
                            entero y el bookmark vive en el header de
                            la cabecera (al lado del badge de tipo). */}
                        {tieneGaleria && (
                            <div className="relative -mx-4 lg:mx-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-md lg:border lg:border-slate-300">
                                <GaleriaServicio publicacion={publicacion} />

                                {/* Botón guardar sobre galería — mismo
                                    patrón visual que las cards de Mis
                                    Guardados: círculo blanco con border-2
                                    amber e icono ICONOS.guardar (Iconify
                                    ph:archive-box-fill) en amber-500.
                                    Cuando NO está guardado, el border y
                                    el icono caen a slate para indicar
                                    estado vacío. NO se muestra al dueño
                                    porque no tendría sentido guardar tu
                                    propia publicación. */}
                                {puedeGuardar && (
                                    <button
                                        type="button"
                                        data-testid="btn-guardar-servicio"
                                        onClick={toggleGuardado}
                                        disabled={cargandoGuardar}
                                        aria-label={
                                            guardado
                                                ? 'Quitar de guardados'
                                                : 'Guardar publicación'
                                        }
                                        aria-pressed={guardado}
                                        className={
                                            'absolute top-3 right-3 z-10 w-[38px] h-[38px] grid place-items-center rounded-full bg-white shadow-md lg:cursor-pointer hover:scale-110 disabled:opacity-60 transition-transform duration-200 ' +
                                            (guardado
                                                ? 'border-2 border-amber-500'
                                                : 'border-2 border-slate-300')
                                        }
                                    >
                                        <Icon
                                            icon={ICONOS.guardar}
                                            className="w-5 h-5"
                                            style={{ color: guardado ? '#f59e0b' : '#94a3b8' }}
                                        />
                                    </button>
                                )}
                            </div>
                        )}

                        {isPausada && <BannerPausada />}

                        {/* ─── LAYOUT 2-COL EN DESKTOP ───
                            Sprint 9.3 (iteración): proporciones ajustadas
                            de 2:1 (66/33) → 3:2 (60/40) para dar más
                            ancho al sidebar derecho — la card de PAGO +
                            datos + ChatYA/WhatsApp necesitaba más aire
                            con la nueva tipografía. La izquierda se
                            reduce un poco (sigue cómoda para descripción
                            y mapa). */}
                        <div className="lg:grid lg:grid-cols-5 lg:gap-4 2xl:gap-6 lg:items-start space-y-3 lg:space-y-0">
                            {/* COL IZQUIERDA — contenido principal (3/5 = 60%) */}
                            <div className="space-y-3 lg:space-y-4 lg:col-span-3 min-w-0">
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

                            {/* COL DERECHA — sidebar sticky (2/5 = 40%, solo desktop) */}
                            <aside className="hidden lg:block lg:col-span-2 space-y-4 lg:sticky lg:top-24">
                                <SidebarContacto
                                    publicacion={publicacion}
                                    isPausada={isPausada}
                                    isSolicito={isSolicito}
                                />
                                <SidebarSobreNegocio
                                    publicacion={publicacion}
                                    onVerNegocio={irAPerfilDelOferente}
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
    // `esVacante` se deriva dentro del componente — no se pasa como prop
    // para no cambiar la firma. Es necesario para que el helper devuelva
    // "Sueldo a tratar" (vacante) vs "A tratar" (servicio) cuando el
    // precio es 'a-convenir'.
    const esVacante = publicacion.tipo === 'vacante-empresa';
    const hayBadges = (esVacante && publicacion.tipoEmpleo) || Boolean(publicacion.modalidad);

    // Sprint 9.3 (iteración): determinamos si el visitante es el dueño
    // de la publicación para NO renderizar la sección "Contactos" en
    // ese caso. La `BarraContactoServicio` también retorna null cuando
    // es dueño, pero sin esta verificación el título "Contactos" se
    // quedaba colgado sin botones debajo — UX rota.
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);
    const esDuenio = usuarioActualId === publicacion.oferente.id;
    const mostrarContactos = !esDuenio;

    return (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-5 space-y-3.5">
            {/* Precio destacado — Sprint 9.3 (iteración): tamaño bajado de
                22/26px a 18/20px porque "Sueldo a tratar" es texto largo
                y se veía sobredimensionado. Para precios numéricos (ej
                "$15,000") el tamaño actual sigue siendo claramente
                jerárquico vs el título "Pago" (11/14px). */}
            {isSolicito && publicacion.presupuesto ? (
                <div>
                    <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                        Presupuesto
                    </div>
                    <div className="text-lg 2xl:text-xl font-extrabold text-slate-900 leading-tight">
                        {formatearPresupuesto(publicacion.presupuesto)}
                    </div>
                </div>
            ) : (
                <div>
                    <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Pago
                    </div>
                    <div className="text-lg 2xl:text-xl font-extrabold text-sky-700 leading-tight">
                        {formatearPrecioServicio(publicacion.precio, {
                            esVacante,
                        })}
                    </div>
                </div>
            )}

            {/* Badges Tiempo Completo + Presencial — debajo del precio.
                Sprint 9.3 (iteración): se movieron desde el card del mapa
                al sidebar porque son metadatos rápidos del puesto, mucho
                más útiles al lado del CTA de contacto que dentro del mapa. */}
            {hayBadges && (
                <div className="flex flex-wrap gap-1.5">
                    {esVacante && publicacion.tipoEmpleo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                            <Briefcase className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {etiquetaTipoEmpleo(publicacion.tipoEmpleo)}
                        </span>
                    )}
                    {publicacion.modalidad && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {modalidadLabel(publicacion.modalidad)}
                        </span>
                    )}
                </div>
            )}

            {/* Ciudad + horario — debajo de los badges, separados por línea. */}
            <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-200">
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

            {/* Contactos — título + barra inline (ChatYA + WhatsApp).
                Solo se renderiza si el visitante NO es el dueño de la
                publicación (en ese caso la barra retornaría null y
                quedaría un título colgado sin botones). */}
            {mostrarContactos && (
                <div className="pt-3 border-t border-slate-200">
                    <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Contactos
                    </div>
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
            )}
        </div>
    );
}

// =============================================================================
// SIDEBAR DESKTOP — Card "Sobre el oferente / negocio"
// =============================================================================
// Sprint 9.3 (iteración): renderiza inline sin el wrapper de OferenteCard
// — antes la card interna tenía su propio borde+sombra y se veía como
// "card dentro de card". Ahora los datos del negocio (avatar + nombre +
// sucursal arriba, botón "Ver negocio" abajo, badge de actividad al
// final) viven directamente dentro del wrapper "SOBRE EL NEGOCIO".
function SidebarSobreNegocio({
    publicacion,
    onVerNegocio,
}: {
    publicacion: PublicacionDetalle;
    onVerNegocio: () => void;
}) {
    const { oferente, tipo } = publicacion;
    const esEmpresa = tipo === 'vacante-empresa';
    // Sprint 9.3: título según tipo de publicación. "Oferente" implica
    // ofrecer, así que NO aplica a solicitudes (donde el usuario PIDE
    // ayuda, no la ofrece). Las solicitudes usan "Solicitante".
    const titulo =
        tipo === 'vacante-empresa' ? 'Sobre el negocio'
        : tipo === 'solicito' ? 'Sobre el solicitante'
        : 'Sobre el oferente';

    // Identidad mostrada — empresa: nombre del negocio + sufijo de sucursal
    // (Matriz / nombre de la sucursal cuando hay más de una). Persona:
    // nombre + apellidos del usuario.
    const nombrePrincipal = esEmpresa
        ? oferente.negocioNombre
            ?? `${oferente.nombre} ${oferente.apellidos}`.trim()
        : `${oferente.nombre} ${oferente.apellidos}`.trim();

    const sufijoSucursal = esEmpresa && (oferente.totalSucursales ?? 0) > 1
        ? oferente.sucursalEsPrincipal
            ? 'Matriz'
            : oferente.sucursalNombre
        : null;

    const avatarUrl = esEmpresa
        ? oferente.negocioLogo
            ?? oferente.sucursalFotoPerfil
            ?? oferente.avatarUrl
        : oferente.avatarUrl;

    const iniciales = esEmpresa
        ? iniciasDeNombre(nombrePrincipal)
        : iniciasDePersona(oferente.nombre, oferente.apellidos);

    const conexionLabel = formatearUltimaConexion(oferente.ultimaConexion);
    const respondeRapido =
        oferente.tiempoRespuestaMinutos !== null
        && oferente.tiempoRespuestaMinutos !== undefined
        && oferente.tiempoRespuestaMinutos < 60;
    const ctaLabel = esEmpresa ? 'Ver negocio' : 'Ver perfil';
    // Subtítulo solo para empresas con sucursal extra (Matriz / nombre
    // de la sucursal). Personas no muestran ciudad.
    const subtitulo = esEmpresa ? sufijoSucursal : null;

    return (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-5 space-y-2.5">
            <div className="text-sm lg:text-[11px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-600">
                {titulo}
            </div>

            {/* Línea 1: avatar + identidad. Igualado al patrón nuevo de
                `CardVendedor.tsx` del MP (Sprint 9.3 iter):
                  - Avatar h-12 (antes h-11)
                  - Nombre dividido en 2 líneas para PERSONAS (nombres
                    arriba, apellidos + BadgeCheck invertido abajo)
                  - Para EMPRESAS: nombre en 1 línea con BadgeCheck
                    inline al final
                  - BadgeCheck h-6 invertido (fondo azul + palomita
                    blanca, estilo Twitter/X)
                  - Subtítulo: sucursal o ciudad */}
            <div className="flex items-center gap-2.5">
                {esEmpresa ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white shadow-md ring-2 ring-sky-100">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={nombrePrincipal}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center text-base font-extrabold text-sky-700">
                                {iniciales}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={nombrePrincipal}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div
                                className="flex h-full w-full items-center justify-center text-base font-bold text-white"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                                }}
                            >
                                {iniciales}
                            </div>
                        )}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    {esEmpresa ? (
                        <h3 className="flex items-center gap-1 text-sm font-bold text-slate-900 leading-tight lg:text-base">
                            <span className="truncate">{nombrePrincipal}</span>
                            <BadgeCheck
                                className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                                strokeWidth={2.5}
                                aria-label="Empresa verificada"
                            />
                        </h3>
                    ) : (
                        <h3 className="text-sm font-bold text-slate-900 leading-tight lg:text-base">
                            <span className="block">{oferente.nombre}</span>
                            <span className="flex items-center gap-1">
                                {oferente.apellidos}
                                <BadgeCheck
                                    className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                                    strokeWidth={2.5}
                                    aria-label="Usuario verificado"
                                />
                            </span>
                        </h3>
                    )}
                    {subtitulo && (
                        <div className="mt-0.5 truncate text-sm font-medium text-slate-600">
                            {subtitulo}
                        </div>
                    )}
                </div>
            </div>

            {/* Trust badge "Suele responder rápido" — pill emerald. */}
            {respondeRapido && (
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                        <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Suele responder rápido
                    </span>
                </div>
            )}

            {/* Fila inferior: actividad (izquierda) + Ver perfil/negocio
                (derecha alineado por `ml-auto`). Mismo patrón que el
                CardVendedor del MP. */}
            <div className="flex items-center gap-2">
                {conexionLabel && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <span
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full bg-slate-400"
                        />
                        {conexionLabel}
                    </div>
                )}
                <button
                    type="button"
                    data-testid="btn-ver-negocio-sidebar"
                    onClick={onVerNegocio}
                    aria-label={`${ctaLabel} de ${nombrePrincipal}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-sky-700 lg:cursor-pointer lg:hover:text-sky-900 lg:hover:underline"
                >
                    {ctaLabel}
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

// Helpers locales para iniciales del avatar — copia de OferenteCard
// para que el sidebar sea autónomo (sin importar el componente entero
// solo por estas 2 funciones).
function iniciasDePersona(nombre: string, apellidos: string): string {
    const a = (nombre ?? '').trim().charAt(0).toUpperCase();
    const b = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${a}${b}` || '··';
}

function iniciasDeNombre(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    const a = partes[0]?.charAt(0).toUpperCase() ?? '';
    const b = partes[1]?.charAt(0).toUpperCase() ?? '';
    return `${a}${b}` || '··';
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
