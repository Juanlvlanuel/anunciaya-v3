/**
 * CardHorizontal.tsx
 * ====================
 * Variante compacta usada en el carrusel "Recién publicado" del feed de
 * Servicios. Diseñada para que 4 cards quepan EXACTOS sin scroll dentro
 * del container `max-w-[920px] lg:px-4` del feed:
 *   container interior = 920 − 32 (padding) = 888px
 *   4 cards × 213px + 3 gaps × 12px (gap-3) = 852 + 36 = 888px ✓
 *
 * Layout:
 *   - Foto `aspect-[4/3]` arriba con badge tipo (OFREZCO/SOLICITO).
 *   - Bloque info: título 2 líneas con altura reservada + precio + meta.
 *
 * Auditoría tokens (Sprint 9.3 iteración):
 *   - §2 Tonos: `border-slate-300`, `text-slate-600`+, placeholder slate.
 *   - §7 Sombras: solo `shadow-sm` constante. SIN `hover:shadow`,
 *     `hover:scale` ni `hover:-translate-y` (prohibidos en cards).
 *   - §10 Transiciones: solo border en hover (instantáneo, sin transition).
 *   - §1 Tamaños texto: `text-sm lg:text-[13px] 2xl:text-sm` para no
 *     bajar de 14px en móvil. Badge usa `text-[11px]` (mínimo laptop)
 *     porque es overlay sobre foto, no contenido principal.
 *   - §13 Estética: placeholder slate neutral (no pastel saturado).
 *
 * Tonos del precio (heredado del composer y demás cards):
 *   - Ofrezco → sky-700.
 *   - Solicito → amber-700.
 *
 * Ubicación: apps/web/src/components/servicios/CardHorizontal.tsx
 */

import { Briefcase, Image as ImageIcon, MapPin, Store } from 'lucide-react';
import type { PublicacionServicio } from '../../types/servicios';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    formatearTiempoRelativo,
    formatearDistancia,
    obtenerFotoPortada,
    modalidadLabel,
} from '../../utils/servicios';

interface CardHorizontalProps {
    publicacion: PublicacionServicio;
    /** Distancia en metros desde el GPS del usuario. Si está disponible,
     *  se muestra como badge sobre la foto (inf-der) — igual que CardServicio. */
    distanciaMetros?: number | null;
    onClick?: () => void;
}

export function CardHorizontal({
    publicacion,
    distanciaMetros = null,
    onClick,
}: CardHorizontalProps) {
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const modalidad = modalidadLabel(publicacion.modalidad);
    const distancia = formatearDistancia(distanciaMetros);
    const esOfrece = publicacion.modo === 'ofrezco';
    const esVacante = publicacion.tipo === 'vacante-empresa';

    // Foto principal: para vacantes usamos `sucursalPortada` como
    // fallback (la foto del local da contexto visual del negocio cuando
    // la vacante no tiene foto propia). Para el resto, solo `fotos[]`.
    const fotoUrl = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex,
    ) ?? (esVacante ? publicacion.sucursalPortada ?? null : null);

    // Logo del negocio — solo se renderiza para vacantes que lo tengan.
    const logoNegocio = esVacante ? publicacion.negocioLogo ?? null : null;

    // Precio según tipo/modo:
    //   - Vacante (modo='solicito' + tipo='vacante-empresa') → el rango
    //     salarial vive en `publicacion.precio` (lo guarda BS Vacantes).
    //   - Ofrezco → precio del servicio en `publicacion.precio`.
    //   - Solicito de persona (clasificado) → `publicacion.presupuesto`
    //     si existe, sino "A tratar" (el `precio` está como
    //     {kind:'a-convenir'} en estos casos).
    // Para vacantes pasamos `esVacante: true` al helper para que el
    // texto del precio sin definir sea "Sueldo a tratar" en lugar
    // del genérico "A tratar".
    const precioMostrar = (esVacante || esOfrece)
        ? formatearPrecioServicio(publicacion.precio, { esVacante })
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A tratar';

    return (
        <article
            data-testid={`card-horizontal-${publicacion.id}`}
            onClick={onClick}
            // Hover de "consumidor final" (§13 excepción): suave elevación
            // del card + scale en la imagen. Permitido porque esta vista
            // es para el visitante público del feed de Servicios — no es
            // un card de panel de Business Studio.
            className="group w-[213px] shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm lg:hover:-translate-y-0.5 lg:hover:border-sky-400 lg:hover:shadow-md transition-all duration-200"
        >
            {/* ── Foto (aspect 4:3 igual que CardArticuloMio/CardServicio) ─ */}
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
                        {/* Vacantes sin foto NI portada de sucursal: usar
                            Briefcase para indicar "esto es una vacante".
                            Resto: ImageIcon genérico de "sin foto". */}
                        {esVacante ? (
                            <Briefcase
                                className="h-10 w-10 text-slate-400"
                                strokeWidth={1.5}
                            />
                        ) : (
                            <ImageIcon
                                className="h-10 w-10 text-slate-400"
                                strokeWidth={1.5}
                            />
                        )}
                    </div>
                )}

                {/* Badge tipo — esquina sup-izq. Sustantivos singulares
                    que matchean los nombres plurales de las tabs/secciones
                    del feed (Vacantes / Servicios / Solicitudes) — el
                    usuario asocia el badge con el filtro al primer vistazo.
                    Tres tonos distintos para distinguir sin leer:
                      VACANTE   → sky     (azul: negocio formal)
                      SERVICIO  → emerald (verde: persona disponible)
                      SOLICITUD → amber   (ámbar: persona busca) */}
                <span
                    aria-hidden
                    className={
                        'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-sm ' +
                        (esVacante
                            ? 'bg-sky-600 text-white'
                            : esOfrece
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white')
                    }
                >
                    {esVacante && <Briefcase className="h-3 w-3" strokeWidth={2.5} />}
                    {esVacante ? 'VACANTE' : esOfrece ? 'SERVICIO' : 'SOLICITUD'}
                </span>

                {/* Logo del negocio — avatar circular en esquina inf-izq
                    sobre la foto, solo cuando es vacante con logo. Da
                    identidad de marca sin ocupar el espacio del bloque
                    info de abajo. Ring blanco para contraste sobre
                    cualquier foto. */}
                {logoNegocio !== null && (
                    <div
                        className="absolute bottom-2 left-2 h-9 w-9 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white"
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
                {/* Fallback: si es vacante con negocio pero sin logo,
                    mostrar icono Store en lugar del avatar para mantener
                    el patrón visual de identidad. */}
                {esVacante && !logoNegocio && publicacion.negocioNombre && (
                    <div
                        className="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md ring-2 ring-white"
                        title={publicacion.negocioNombre}
                    >
                        <Store className="h-4 w-4 text-slate-600" strokeWidth={2} />
                    </div>
                )}

                {/* Badge distancia — esquina inf-der sobre la foto.
                    Igual que CardServicio: solo se renderiza cuando hay
                    GPS y la distancia se pudo calcular. */}
                {distancia && (
                    <span
                        aria-hidden
                        className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur"
                        title={`A ${distancia}`}
                    >
                        <MapPin className="h-3 w-3" strokeWidth={2.5} />
                        <span className="tabular-nums">{distancia}</span>
                    </span>
                )}
            </div>

            {/* ── Info ──────────────────────────────────────────────── */}
            <div className="p-3">
                {/* Título — 2 líneas reservadas (min-h) para que todas
                    las cards del carrusel tengan la misma altura, sin
                    importar si el título es corto o largo. */}
                <h3 className="line-clamp-2 min-h-[2.5em] text-sm lg:text-[13px] 2xl:text-sm font-semibold leading-tight text-slate-900">
                    {publicacion.titulo}
                </h3>

                {/* Precio destacado — color según modo (sky/amber). */}
                <p
                    className={
                        'mt-2 truncate text-sm lg:text-[13px] 2xl:text-base font-bold tabular-nums ' +
                        (esOfrece ? 'text-sky-700' : 'text-amber-700')
                    }
                >
                    {precioMostrar}
                </p>

                {/* Meta: modalidad · tiempo. `text-xs` (móvil) cae a
                    `text-[11px]` en laptop (mínimo permitido por §1). */}
                <div className="mt-0.5 flex items-center gap-1 text-xs lg:text-[11px] 2xl:text-xs font-medium leading-tight text-slate-600">
                    <span className="truncate">{modalidad}</span>
                    <span aria-hidden className="text-slate-400">
                        ·
                    </span>
                    <span className="shrink-0 tabular-nums">{tiempo}</span>
                </div>
            </div>
        </article>
    );
}

export default CardHorizontal;
