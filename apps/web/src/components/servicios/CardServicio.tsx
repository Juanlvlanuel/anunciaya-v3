/**
 * CardServicio.tsx
 * =================
 * Card UNIVERSAL del feed de Servicios. Renderiza con el mismo layout y
 * misma altura las 3 variantes (`servicio-persona`, `solicito`,
 * `vacante-empresa`) — Sprint 9.3.
 *
 * Patrón visual replicado de `CardHorizontal` (carrusel "Recién publicado")
 * para mantener coherencia entre ambas zonas del feed:
 *   - Foto aspect 4:3 con badge tipo (esq sup-izq) y badge distancia
 *     (esq inf-der sobre la foto, NO en el bloque info).
 *   - Bloque info: título 2 líneas (min-h) + precio (color por modo) +
 *     meta `modalidad/tipoEmpleo · tiempo`.
 *   - Hover "consumidor final" (§13 excepción): `-translate-y-0.5` en el
 *     card + `scale-105` en la foto.
 *
 * Antes había 2 componentes distintos (`CardServicio` y `CardVacante`)
 * con layouts radicalmente diferentes — el resultado eran cards con
 * alturas e imágenes desiguales en el grid "Cerca de ti".
 *
 * Sin avatar/nombre del oferente porque el feed no trae `oferente`
 * embebido (solo `usuarioId`). Esa info aparece en el detalle.
 *
 * Ubicación: apps/web/src/components/servicios/CardServicio.tsx
 */

import { Briefcase, MapPin, Search, Store, Wrench } from 'lucide-react';
import type {
    PublicacionServicio,
    TipoEmpleo,
} from '../../types/servicios';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    formatearTiempoRelativo,
    formatearDistancia,
    obtenerFotoPortada,
    modalidadLabel,
} from '../../utils/servicios';
import { useAuthStore } from '../../stores/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { useIniciarChatServicio } from '../../hooks/useIniciarChatServicio';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';
import type { PublicacionDetalle } from '../../types/servicios';

// Mapeo local — coincide con `etiquetaTipoEmpleo` de Vacantes BS.
const ETIQUETA_TIPO_EMPLEO: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'Tiempo completo',
    'medio-tiempo': 'Medio tiempo',
    'por-proyecto': 'Por proyecto',
    'eventual': 'Eventual',
};

interface CardServicioProps {
    publicacion: PublicacionServicio;
    /** Distancia en metros desde el GPS del usuario. */
    distanciaMetros?: number | null;
    onClick?: () => void;
    /** Sprint 9.3: cuando el card se usa en MisGuardados, la vista padre
     *  pone un `BookmarkGlass` overlay en top-LEFT y el badge tipo
     *  (VACANTE/SERVICIO/SOLICITUD) debe moverse a top-RIGHT para no
     *  chocar. Default `'left'` (feed normal — sin overlay externo). */
    posicionBadgeTipo?: 'left' | 'right';
    /** Sprint 9.3 (iteración): cuando `true`, el avatar+nombre del
     *  negocio (solo vacantes) se renderiza ARRIBA del título en el
     *  bloque blanco inferior, con tamaño tipo "card de Negocios"
     *  (avatar 42×42 + texto 16px bold). Cuando es `false` (default),
     *  va como overlay sobre la foto (inf-izq, tamaño compacto).
     *  Usado en MisGuardados para reducir saturación visual sobre la
     *  foto y dar protagonismo a la marca del negocio. */
    mostrarNegocioEnInfo?: boolean;
}

export function CardServicio({
    publicacion,
    distanciaMetros = null,
    onClick,
    posicionBadgeTipo = 'left',
    mostrarNegocioEnInfo = false,
}: CardServicioProps) {
    // ─── Datos derivados según tipo ─────────────────────────────────────
    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esOfrece = publicacion.modo === 'ofrezco';

    // Foto principal: para vacantes usamos `sucursalPortada` como
    // fallback cuando no hay foto propia (da contexto visual del local).
    // Para servicios-persona y solicitos-persona, solo el array `fotos`.
    const fotoUrl = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex,
    ) ?? (esVacante ? publicacion.sucursalPortada ?? null : null);

    // Logo del negocio — solo para vacantes con logo.
    const logoNegocio = esVacante ? publicacion.negocioLogo ?? null : null;

    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const distancia = formatearDistancia(distanciaMetros);

    // Meta secundaria: vacantes muestran tipo de empleo si existe;
    // resto muestra modalidad. Ambos como segundo elemento de la fila.
    const metaSecundaria = esVacante && publicacion.tipoEmpleo
        ? ETIQUETA_TIPO_EMPLEO[publicacion.tipoEmpleo]
        : modalidadLabel(publicacion.modalidad);

    // Precio según tipo/modo (misma lógica que CardHorizontal):
    //   - Vacante → `publicacion.precio` (rango salarial guardado por BS).
    //     `esVacante: true` hace que el helper devuelva "Sueldo a tratar"
    //     en vez de "A tratar" cuando el precio es 'a-convenir'.
    //   - Ofrezco → `publicacion.precio` formateado (helper genérico
    //     devuelve "A tratar" si es 'a-convenir').
    //   - Solicito persona → `presupuesto` si existe, sino "A tratar".
    const precioMostrar = (esVacante || esOfrece)
        ? formatearPrecioServicio(publicacion.precio, { esVacante })
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A tratar';

    // Color del precio: sky para vacante/ofrezco (oferta del oferente),
    // amber para solicito de persona (búsqueda).
    const tonoPrecio = (esVacante || esOfrece)
        ? 'text-sky-700'
        : 'text-amber-700';

    // Configuración del badge tipo (esquina sup-izq de la foto).
    // Misma anatomía que CardHorizontal — chip pequeño con uppercase.
    // Los labels son SUSTANTIVOS singulares que matchean los nombres
    // plurales de las tabs/secciones (Vacantes / Servicios / Solicitudes)
    // para que el usuario asocie el badge con el filtro al primer vistazo.
    // Convención cromática:
    //   - VACANTE  → sky-600     (azul: negocio formal / empleo)
    //   - SERVICIO → emerald-600 (verde: persona disponible / oferta)
    //   - SOLICITUD → amber-500  (ámbar: persona busca)
    // Los 3 colores se distinguen al primer vistazo y siguen el código
    // semántico de la app (azul = profesional, verde = positivo/ofrece,
    // ámbar = atención/busca).
    const badgeTipo = esVacante
        ? {
              label: 'VACANTE',
              Icono: Briefcase,
              clase: 'bg-sky-600 text-white',
          }
        : esOfrece
          ? {
                label: 'SERVICIO',
                Icono: Wrench,
                clase: 'bg-emerald-600 text-white',
            }
          : {
                label: 'SOLICITUD',
                Icono: Search,
                clase: 'bg-amber-500 text-white',
            };

    // Placeholder cuando no hay foto (gradient slate neutro consistente
    // con CardHorizontal y CardOfertaLista).
    const placeholder = esVacante
        ? { Icono: Briefcase }
        : esOfrece
          ? { Icono: Wrench }
          : { Icono: Search };

    // ─── Botón ChatYA (Sprint 9.3 — iteración 3) ───────────────────────
    // Visible en modo MisGuardados cuando el usuario actual NO es el
    // dueño de la publicación. El click hace fetch del DETALLE de la
    // publicación (cacheado por React Query) y delega al hook
    // `useIniciarChatServicio` que tiene toda la lógica de buscar
    // conversación existente, crear preview de card, etc. — misma
    // lógica que el botón ChatYA del detalle de la publicación
    // (BarraContactoServicio).
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);
    const qc = useQueryClient();
    const iniciarChatServicio = useIniciarChatServicio();
    const mostrarChatYA =
        mostrarNegocioEnInfo
        && !!publicacion.usuarioId
        && usuarioActualId !== publicacion.usuarioId;

    const handleChatYA = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!publicacion.usuarioId) return;
        try {
            // Fetch del detalle (usa cache de React Query si ya está,
            // sino pega al endpoint y guarda en cache). El detalle trae
            // `oferente` completo (nombre, apellidos, avatarUrl, datos
            // de sucursal cuando es vacante) — datos necesarios para
            // que el chat temporal muestre identidad correcta.
            const detalle = await qc.fetchQuery({
                queryKey: queryKeys.servicios.publicacion(publicacion.id),
                queryFn: async (): Promise<PublicacionDetalle | null> => {
                    const response = await api.get<{
                        success: boolean;
                        data: PublicacionDetalle;
                    }>(`/servicios/publicaciones/${publicacion.id}`);
                    return response.data.success ? response.data.data : null;
                },
                staleTime: 60 * 1000,
            });
            if (!detalle) {
                notificar.error('No se pudo cargar la publicación');
                return;
            }
            await iniciarChatServicio(detalle);
        } catch {
            notificar.error('No se pudo iniciar el chat');
        }
    };

    return (
        <article
            data-testid={`card-servicio-${publicacion.id}`}
            onClick={onClick}
            // Hover de "consumidor final" (§13 excepción): suave elevación
            // del card + scale en la imagen. Mismo patrón que CardHorizontal.
            // `h-full` Sprint 9.3 (iteración): el card se estira al alto
            // de la fila del grid (items-stretch default). Combinado con
            // `flex-col` interno y `mt-auto` en el footer, distribuye el
            // espacio sobrante AL FINAL del card (no entre título y meta)
            // cuando el título es corto.
            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition-all duration-200 lg:hover:-translate-y-0.5 lg:hover:border-sky-400 lg:hover:shadow-md"
        >
            {/* ── Foto (aspect 4:3 igual que CardHorizontal) ──────────── */}
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {fotoUrl ? (
                    <img
                        src={fotoUrl}
                        alt={publicacion.titulo}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center bg-linear-to-br from-slate-100 via-slate-200 to-slate-300">
                        {/* Icono según tipo para distinguir el placeholder
                            visualmente entre vacante/ofrezco/solicito sin
                            usar fondos pastel saturados (§13). */}
                        <placeholder.Icono
                            className="h-12 w-12 text-slate-400"
                            strokeWidth={1.5}
                        />
                    </div>
                )}

                {/* Badge tipo — esquina superior. Default top-LEFT; cuando
                    `posicionBadgeTipo='right'` se mueve a top-RIGHT para
                    convivir con un BookmarkGlass externo en top-LEFT
                    (caso MisGuardados, Sprint 9.3). */}
                <span
                    aria-hidden
                    className={
                        'absolute top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-sm ' +
                        (posicionBadgeTipo === 'right' ? 'right-2 ' : 'left-2 ') +
                        badgeTipo.clase
                    }
                >
                    <badgeTipo.Icono className="h-3 w-3" strokeWidth={2.5} />
                    {badgeTipo.label}
                </span>

                {/* Badge distancia — esquina inf-der sobre la foto.
                    Solo se renderiza cuando hay GPS y la distancia se
                    pudo calcular. Sprint 9.3 (iteración): tamaños
                    intermedios para coincidir con los badges del
                    CardNegocioCompacto: `px-2.5 py-1 text-xs gap-1.5
                    h-3.5 w-3.5`. */}
                {distancia && (
                    <span
                        aria-hidden
                        className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur"
                        title={`A ${distancia}`}
                    >
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                        <span className="tabular-nums">{distancia}</span>
                    </span>
                )}

                {/* Logo del negocio sobre la foto — solo en modo overlay
                    (`mostrarNegocioEnInfo=false`, feed normal). SOLO el
                    avatar circular, sin nombre del negocio: el nombre
                    saturaba visualmente la foto. La marca se identifica
                    por el logo + se hace explícita en el detalle.
                    En MisGuardados (`mostrarNegocioEnInfo=true`), este
                    bloque NO se renderiza aquí — el avatar+nombre se
                    mueve al bloque blanco inferior. */}
                {!mostrarNegocioEnInfo && esVacante && logoNegocio !== null && (
                    <div
                        className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white"
                        title={publicacion.negocioNombre ?? 'Negocio'}
                    >
                        <img
                            src={logoNegocio}
                            alt={publicacion.negocioNombre ?? 'Logo'}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    </div>
                )}
                {!mostrarNegocioEnInfo
                    && esVacante
                    && !logoNegocio
                    && publicacion.negocioNombre && (
                    <div
                        className="absolute bottom-2 left-2 grid h-10 w-10 place-items-center rounded-full bg-white shadow-md ring-2 ring-white"
                        title={publicacion.negocioNombre}
                    >
                        <Store className="h-5 w-5 text-slate-600" strokeWidth={2} />
                    </div>
                )}
            </div>

            {/* ── Info — mismo acomodo que CardHorizontal ──────────── */}
            {/* `flex flex-col flex-1` Sprint 9.3 (iteración):
                el bloque info ocupa todo el alto restante del card
                (después de la foto aspect-[4/3]). Combinado con
                `mt-auto` en el bloque footer (meta + ChatYA), el
                espacio sobrante cuando el título es corto queda al
                FINAL del card (no entre título y meta), evitando el
                hueco feo en medio. */}
            <div className="p-3 flex flex-col flex-1">
                {/* Avatar + nombre del negocio + sucursal ARRIBA del
                    título (solo en modo MisGuardados,
                    `mostrarNegocioEnInfo=true`, solo para vacantes).
                    Sprint 9.3 (iteración):
                      - Nombre: `font-bold` (no `font-extrabold`) para
                        coincidir con el peso usado en card de Negocios
                        cuando se renderiza inline (sin stroke ni shadow).
                      - Segunda línea con sucursal/Matriz cuando exista
                        ("Matriz" si la sucursal es la principal, nombre
                        propio si es secundaria). */}
                {mostrarNegocioEnInfo
                    && esVacante
                    && (logoNegocio !== null || publicacion.negocioNombre) && (() => {
                    // Label de sucursal: "Matriz" si es la principal,
                    // nombre propio si es secundaria, null si no hay datos.
                    const sucursalNombre = publicacion.sucursalNombre;
                    const labelSucursal = (() => {
                        if (!sucursalNombre) return null;
                        if (sucursalNombre === 'Principal'
                            || sucursalNombre === publicacion.negocioNombre) {
                            return 'Matriz';
                        }
                        return sucursalNombre;
                    })();
                    return (
                        <div className="mb-2 flex items-center gap-2 min-w-0">
                            {logoNegocio !== null ? (
                                <img
                                    src={logoNegocio}
                                    alt={publicacion.negocioNombre ?? 'Logo'}
                                    loading="lazy"
                                    className="h-9 w-9 lg:h-10 lg:w-10 shrink-0 rounded-full object-cover border-2 border-slate-200"
                                />
                            ) : (
                                <div className="h-9 w-9 lg:h-10 lg:w-10 shrink-0 rounded-full border-2 border-slate-200 bg-slate-100 grid place-items-center">
                                    <Store className="h-4 w-4 text-slate-500" strokeWidth={2} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                {publicacion.negocioNombre && (
                                    <div className="truncate text-sm lg:text-[14px] 2xl:text-base font-bold text-slate-900 leading-tight">
                                        {publicacion.negocioNombre}
                                    </div>
                                )}
                                {labelSucursal && (
                                    <div className="truncate text-xs lg:text-[11px] 2xl:text-xs font-medium text-slate-600 leading-tight mt-0.5">
                                        {labelSucursal}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Título: hasta 2 líneas (truncado con ellipsis).
                    Sprint 9.3 (iteración): se eliminó `min-h-[2.5em]`
                    que reservaba espacio para una 2da línea inexistente
                    y dejaba hueco visual feo cuando el título es de 1
                    línea. La uniformidad de altura del grid se resuelve
                    ahora con `h-full` en el `<article>` + `flex flex-col`
                    en el bloque info + `mt-auto` en el footer — el
                    espacio sobrante queda al final del card, no en
                    medio. */}
                <h3 className="line-clamp-2 text-base lg:text-[15px] 2xl:text-base font-bold leading-tight text-slate-900">
                    {publicacion.titulo}
                </h3>

                {/* Precio destacado — color sky o amber según tipo/modo.
                    Sprint 9.3 (iteración): se OCULTA en modo MisGuardados
                    (`mostrarNegocioEnInfo=true`) para limpiar la card —
                    el usuario que guarda no necesita el precio destacado,
                    le importa el puesto + negocio + meta para decidir. */}
                {!mostrarNegocioEnInfo && (
                    <p
                        className={
                            'mt-2 truncate text-sm lg:text-[13px] 2xl:text-base font-bold tabular-nums ' +
                            tonoPrecio
                        }
                    >
                        {precioMostrar}
                    </p>
                )}

                {/* Footer del card (meta + ChatYA) — Sprint 9.3:
                    envuelto en wrapper con `mt-auto` para que se empuje
                    al fondo del bloque info. Cuando el título es de 1
                    línea (y queda altura sobrante por la uniformidad
                    del grid), el espacio extra se distribuye ARRIBA
                    del footer (entre título y meta), pero como hay
                    `mt-auto`, el efecto es que el meta queda pegado al
                    fondo sin importar la longitud del título. */}
                <div className="mt-auto pt-2">
                    {/* Meta: modalidad (o tipoEmpleo) · tiempo. La distancia
                        ya vive como badge sobre la foto — no se duplica aquí. */}
                    <div className="flex items-center gap-1 text-xs lg:text-[11px] 2xl:text-xs font-medium leading-tight text-slate-600">
                        <span className="truncate">{metaSecundaria}</span>
                        <span aria-hidden className="text-slate-400">
                            ·
                        </span>
                        <span className="shrink-0 tabular-nums">{tiempo}</span>
                    </div>

                    {/* Botón ChatYA alineado a la DERECHA — wrapper flex
                        `justify-end` porque el contenedor padre es block.
                        Hover-scale 110% + stopPropagation. Solo visible en
                        MisGuardados + vacante + usuario no es dueño. */}
                    {mostrarChatYA && (
                        <div className="mt-2 flex justify-end">
                            <button
                                data-testid={`btn-chatya-card-servicio-${publicacion.id}`}
                                onClick={handleChatYA}
                                aria-label={`Abrir ChatYA con ${publicacion.negocioNombre ?? 'el negocio'}`}
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                            >
                                <img
                                    src="/ChatYA.webp"
                                    alt="ChatYA"
                                    className="h-9 w-auto lg:h-9"
                                />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

export default CardServicio;
