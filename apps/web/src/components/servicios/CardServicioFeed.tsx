/**
 * CardServicioFeed.tsx
 * =====================
 * Card del feed de Servicios estilo Facebook — post completo, calcado de
 * `CardArticuloFeed.tsx` (MarketPlace) / `CardPublicacionNegocioFeed.tsx`
 * (Negocios) para mantener consistencia visual entre las 3 secciones
 * públicas (Sprint 9.4).
 *
 * Universal para los 3 tipos de publicación (mismo criterio que la card de
 * grilla `CardServicio.tsx`):
 *   - servicio-persona (modo='ofrezco')  → header con el oferente (avatar+nombre).
 *   - solicito (modo='solicito')         → header con el solicitante (avatar+nombre).
 *   - vacante-empresa                    → header con el negocio (logo+nombre).
 *
 * Diferencias con `CardServicio.tsx` (grid, se queda viva para Guardados/
 * Perfil Prestador/Servicio Público):
 *   - Header con identidad del oferente/negocio (el feed ahora SÍ trae
 *     `oferenteResumen` — antes solo lo tenía el detalle).
 *   - Galería de fotos completa (swipe + thumbnails laterales desktop) en
 *     vez de una sola foto de portada.
 *   - Descripción visible con "Ver más".
 *   - Footer con comentarios (abre `ModalComentariosServicio`) + vistas.
 *
 * Ubicación: apps/web/src/components/servicios/CardServicioFeed.tsx
 */

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    Pencil,
    Search,
    Store,
    Wrench,
} from 'lucide-react';
import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { useAuthStore } from '../../stores/useAuthStore';
import { truncarTexto } from '../../utils/truncarTexto';
import { ModalImagenes } from '../ui/ModalImagenes';
import { ModalComentariosServicio } from './ModalComentariosServicio';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    formatearTiempoRelativo,
    formatearDistancia,
    modalidadLabel,
    labelCategoria,
} from '../../utils/servicios';
import type { PublicacionFeed, TipoEmpleo } from '../../types/servicios';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;

const ETIQUETA_TIPO_EMPLEO: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'Tiempo completo',
    'medio-tiempo': 'Medio tiempo',
    'por-proyecto': 'Por proyecto',
    'eventual': 'Eventual',
};

// Tope de caracteres para la descripción recortada — mismo criterio que
// CardArticuloFeed/CardPublicacionNegocioFeed: "Ver más" como texto REAL
// dentro del mismo párrafo, no line-clamp + overlay.
const DESCRIPCION_MAX_CHARS = 150;

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

interface CardServicioFeedProps {
    publicacion: PublicacionFeed;
}

export function CardServicioFeed({ publicacion }: CardServicioFeedProps) {
    const navigate = useNavigate();

    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esOfrece = publicacion.modo === 'ofrezco';

    const [indiceFoto, setIndiceFoto] = useState(publicacion.fotoPortadaIndex ?? 0);
    const [avatarAbierto, setAvatarAbierto] = useState(false);
    const [comentariosAbierto, setComentariosAbierto] = useState(false);

    // Galería: fotos propias; si es vacante sin fotos, cae a la portada de
    // la sucursal (mismo fallback que CardServicio/CardHorizontal).
    const fotos = publicacion.fotos.length > 0
        ? publicacion.fotos
        : (esVacante && publicacion.sucursalPortada ? [publicacion.sucursalPortada] : []);
    const tieneMultiples = fotos.length > 1;

    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const distancia = formatearDistancia(publicacion.distanciaMetros);
    const descripcionCorta = publicacion.descripcion
        ? truncarTexto(publicacion.descripcion, DESCRIPCION_MAX_CHARS)
        : '';
    const descripcionRecortada = descripcionCorta.length < publicacion.descripcion.length;

    // Precio + tono — misma lógica que CardServicio.tsx.
    const precioMostrar = (esVacante || esOfrece)
        ? formatearPrecioServicio(publicacion.precio, { esVacante })
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A tratar';
    const tonoPrecio = esVacante ? 'text-sky-700' : esOfrece ? 'text-emerald-700' : 'text-amber-700';

    const metaSecundaria = esVacante && publicacion.tipoEmpleo
        ? ETIQUETA_TIPO_EMPLEO[publicacion.tipoEmpleo]
        : modalidadLabel(publicacion.modalidad);

    const badgeTipo = esVacante
        ? { label: 'VACANTE', Icono: Briefcase, clase: 'bg-sky-600 text-white' }
        : esOfrece
          ? { label: 'SERVICIO', Icono: Wrench, clase: 'bg-emerald-600 text-white' }
          : { label: 'SOLICITUD', Icono: Search, clase: 'bg-amber-500 text-white' };

    // Identidad del header: negocio (logo+nombre) si es vacante; oferente
    // (avatar+nombre) para servicio-persona/solicito. El feed básico ya trae
    // `oferenteResumen` (Sprint 9.4) — antes solo lo tenía el detalle.
    const nombreOferente = publicacion.oferenteResumen
        ? `${publicacion.oferenteResumen.nombre} ${publicacion.oferenteResumen.apellidos}`.trim()
        : 'Usuario';
    const inicialesOferente = publicacion.oferenteResumen
        ? obtenerIniciales(publicacion.oferenteResumen.nombre, publicacion.oferenteResumen.apellidos)
        : '?';
    const nombreHeader = esVacante ? (publicacion.negocioNombre ?? 'Negocio') : nombreOferente;
    const avatarHeader = esVacante ? publicacion.negocioLogo : publicacion.oferenteResumen?.avatarUrl ?? null;

    // Editar inline: solo el dueño de una publicación PERSONAL (servicio-
    // persona/solicito). Las vacantes se editan desde Business Studio, no
    // desde el feed público — fuera de alcance de este refactor.
    const usuarioActual = useAuthStore((s) => s.usuario);
    const esMia = !esVacante && usuarioActual?.id === publicacion.usuarioId;

    const irAlDetalle = useCallback(() => {
        navigate(`/servicios/${publicacion.id}`);
    }, [navigate, publicacion.id]);

    const irAlPerfilOferente = useCallback(() => {
        if (esVacante) {
            if (publicacion.sucursalId) navigate(`/negocios/${publicacion.sucursalId}`);
            return;
        }
        if (publicacion.oferenteResumen) {
            navigate(`/servicios/usuario/${publicacion.oferenteResumen.id}`);
        }
    }, [navigate, esVacante, publicacion.sucursalId, publicacion.oferenteResumen]);

    const irAEditar = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/servicios?editar=${publicacion.id}`, { replace: true });
    }, [navigate, publicacion.id]);

    const handleAvatarClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (avatarHeader) {
            setAvatarAbierto(true);
        } else {
            irAlPerfilOferente();
        }
    }, [avatarHeader, irAlPerfilOferente]);

    const fotoAnterior = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIndiceFoto((i) => (i === 0 ? fotos.length - 1 : i - 1));
    }, [fotos.length]);
    const fotoSiguiente = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIndiceFoto((i) => (i === fotos.length - 1 ? 0 : i + 1));
    }, [fotos.length]);

    // ─── Swipe con translateX en vivo — mismo patrón que CardArticuloFeed ──
    const galeriaWidthRef = useRef(0);
    const touchStartXRef = useRef(0);
    const touchDeltaXRef = useRef(0);
    const swipeOcurrioRef = useRef(false);
    const [offsetPx, setOffsetPx] = useState(0);
    const [enTransicion, setEnTransicion] = useState(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!tieneMultiples) return;
        touchStartXRef.current = e.touches[0].clientX;
        touchDeltaXRef.current = 0;
        swipeOcurrioRef.current = false;
        setEnTransicion(false);
        galeriaWidthRef.current = (e.currentTarget as HTMLDivElement).getBoundingClientRect().width;
    }, [tieneMultiples]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!tieneMultiples) return;
        const dx = e.touches[0].clientX - touchStartXRef.current;
        touchDeltaXRef.current = dx;
        setOffsetPx(dx);
    }, [tieneMultiples]);

    const handleTouchEnd = useCallback(() => {
        if (!tieneMultiples) return;
        const delta = touchDeltaXRef.current;
        const UMBRAL = 60;
        const ancho = galeriaWidthRef.current || window.innerWidth;
        touchDeltaXRef.current = 0;

        if (Math.abs(delta) < UMBRAL) {
            setEnTransicion(true);
            setOffsetPx(0);
            setTimeout(() => setEnTransicion(false), 220);
            return;
        }

        swipeOcurrioRef.current = true;
        setEnTransicion(true);

        if (delta < 0) {
            setOffsetPx(-ancho);
            setTimeout(() => {
                setEnTransicion(false);
                setIndiceFoto((i) => (i === fotos.length - 1 ? 0 : i + 1));
                setOffsetPx(0);
            }, 220);
        } else {
            setOffsetPx(ancho);
            setTimeout(() => {
                setEnTransicion(false);
                setIndiceFoto((i) => (i === 0 ? fotos.length - 1 : i - 1));
                setOffsetPx(0);
            }, 220);
        }
    }, [tieneMultiples, fotos.length]);

    const handleClickGaleria = useCallback(() => {
        if (swipeOcurrioRef.current) {
            swipeOcurrioRef.current = false;
            return;
        }
        irAlDetalle();
    }, [irAlDetalle]);

    return (
        <article
            data-testid={`card-servicio-feed-${publicacion.id}`}
            className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)]"
        >
            {/* ─── HEADER ──────────────────────────────────────────────── */}
            <header className="flex items-center gap-3 px-4 py-3">
                <button
                    type="button"
                    data-testid={`card-servicio-feed-avatar-${publicacion.id}`}
                    onClick={handleAvatarClick}
                    className="shrink-0 lg:cursor-pointer"
                    aria-label={`Avatar de ${nombreHeader}`}
                >
                    {avatarHeader ? (
                        <img
                            src={avatarHeader}
                            alt={nombreHeader}
                            className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200"
                        />
                    ) : esVacante ? (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white ring-2 ring-slate-200">
                            <Store className="h-6 w-6" strokeWidth={2} />
                        </div>
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-sky-700 text-base font-bold text-white ring-2 ring-slate-200">
                            {inicialesOferente}
                        </div>
                    )}
                </button>

                <button
                    type="button"
                    onClick={irAlPerfilOferente}
                    className="min-w-0 flex-1 text-left lg:cursor-pointer"
                >
                    <div className="flex items-center gap-1.5 leading-tight">
                        <span
                            data-testid={`card-servicio-feed-nombre-${publicacion.id}`}
                            className="truncate text-[17px] font-extrabold text-slate-900 lg:hover:underline"
                        >
                            {nombreHeader}
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-sky-600 animate-bounceX" strokeWidth={2.5} />
                    </div>
                    <div className="mt-1 text-sm text-slate-600 font-semibold">
                        {tiempo}
                    </div>
                </button>

                {distancia && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-sm font-bold text-sky-700">
                        <MapPin className="w-3.5 h-3.5" />
                        {distancia}
                    </span>
                )}

                {esMia && (
                    <button
                        type="button"
                        data-testid={`card-servicio-feed-editar-${publicacion.id}`}
                        onClick={irAEditar}
                        aria-label="Editar publicación"
                        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700 lg:cursor-pointer lg:hover:bg-sky-100"
                    >
                        <Pencil className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </button>
                )}
            </header>

            {/* ─── CUERPO: título + precio + chips + descripción ─────────── */}
            <div className="px-4 pb-3">
                <h3>
                    <button
                        type="button"
                        data-testid={`card-servicio-feed-titulo-${publicacion.id}`}
                        onClick={irAlDetalle}
                        className="line-clamp-2 block w-full text-left text-lg font-bold text-slate-900 leading-snug lg:cursor-pointer lg:hover:underline"
                    >
                        {publicacion.titulo}
                    </button>
                </h3>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold tracking-wide ${badgeTipo.clase}`}
                    >
                        <badgeTipo.Icono className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {badgeTipo.label}
                    </span>
                    <span className={`text-2xl font-extrabold tabular-nums ${tonoPrecio}`}>
                        {precioMostrar}
                    </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                        {metaSecundaria}
                    </span>
                    {!esVacante && publicacion.categoria && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                            {labelCategoria(publicacion.categoria)}
                        </span>
                    )}
                    {publicacion.urgente && (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-sm font-bold text-red-600">
                            Urgente
                        </span>
                    )}
                    {publicacion.zonasAproximadas[0] && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                            {publicacion.zonasAproximadas[0]}
                        </span>
                    )}
                </div>

                {publicacion.descripcion && (
                    <p className="mt-2.5 text-base font-medium leading-relaxed text-slate-600">
                        {descripcionCorta}
                        {descripcionRecortada ? '… ' : ' '}
                        <button
                            type="button"
                            data-testid={`card-servicio-feed-ver-mas-${publicacion.id}`}
                            onClick={irAlDetalle}
                            className="font-semibold text-sky-700 lg:cursor-pointer lg:hover:underline"
                        >
                            Ver más
                        </button>
                    </p>
                )}
            </div>

            {/* ─── GALERÍA — 1 sola foto visible, deslizable con flechas
                laterales/swipe (sin thumbnails), igual que
                CardPublicacionNegocioFeed.tsx. ───────────────────────── */}
            {fotos.length > 0 ? (
                <div
                    className="group relative aspect-[4/3] lg:aspect-[2/1] w-full overflow-hidden bg-slate-100 lg:cursor-pointer touch-pan-y"
                    onClick={handleClickGaleria}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {fotos.map((foto, i) => {
                        if (!tieneMultiples && i !== indiceFoto) return null;
                        const distAtras = (indiceFoto - i + fotos.length) % fotos.length;
                        const distAdelante = (i - indiceFoto + fotos.length) % fotos.length;
                        let rol: 'prev' | 'curr' | 'next' | null = null;
                        if (i === indiceFoto) rol = 'curr';
                        else if (distAtras === 1) rol = 'prev';
                        else if (distAdelante === 1) rol = 'next';
                        if (!rol) return null;

                        const baseTransform = rol === 'prev' ? '-100%' : rol === 'next' ? '100%' : '0%';
                        const esCurr = rol === 'curr';

                        return (
                            <img
                                key={i}
                                src={foto}
                                alt={esCurr ? `${publicacion.titulo} — foto ${i + 1}` : ''}
                                aria-hidden={esCurr ? undefined : true}
                                draggable={false}
                                decoding="async"
                                className={`absolute inset-0 h-full w-full select-none object-cover ${esCurr ? '' : 'pointer-events-none'}`}
                                style={{
                                    transform: `translateX(calc(${baseTransform} + ${offsetPx}px))`,
                                    transition: enTransicion ? 'transform 220ms ease-out' : 'none',
                                    willChange: 'transform',
                                }}
                            />
                        );
                    })}

                    {tieneMultiples && (
                        <>
                            <button
                                type="button"
                                onClick={fotoAnterior}
                                data-testid={`card-servicio-feed-foto-prev-${publicacion.id}`}
                                aria-label="Foto anterior"
                                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity lg:cursor-pointer"
                            >
                                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                            </button>
                            <button
                                type="button"
                                onClick={fotoSiguiente}
                                data-testid={`card-servicio-feed-foto-next-${publicacion.id}`}
                                aria-label="Foto siguiente"
                                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity lg:cursor-pointer"
                            >
                                <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
                            </button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                                {fotos.map((_, i) => (
                                    <span
                                        key={i}
                                        aria-hidden
                                        className={`h-1.5 rounded-full transition-all ${
                                            i === indiceFoto ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2 px-3 lg:px-4 py-6 text-slate-300">
                    {esVacante ? (
                        <Briefcase className="h-5 w-5" strokeWidth={1.75} />
                    ) : (
                        <ImageOff className="h-5 w-5" strokeWidth={1.75} />
                    )}
                </div>
            )}

            {/* ─── FOOTER: comentarios a la orilla izquierda, vistas a la
                orilla derecha — igual que CardPublicacionNegocioFeed.tsx. ── */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-base font-medium text-slate-600 border-t-[1.5px] border-slate-300">
                <button
                    type="button"
                    data-testid={`card-servicio-feed-abrir-comentarios-${publicacion.id}`}
                    onClick={() => setComentariosAbierto(true)}
                    aria-label="Ver comentarios"
                    className="flex items-center gap-2 lg:cursor-pointer lg:hover:text-slate-800"
                >
                    <MessageCircle className="h-6 w-6 shrink-0" strokeWidth={2} />
                    {publicacion.totalComentarios}
                </button>
                <span className="flex items-center gap-2">
                    <Eye className="h-6 w-6 shrink-0" strokeWidth={2} />
                    {publicacion.totalVistas}
                </span>
            </div>

            {avatarAbierto && avatarHeader && (
                <ModalImagenes
                    images={[avatarHeader]}
                    initialIndex={0}
                    isOpen={avatarAbierto}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}

            {comentariosAbierto && (
                <ModalComentariosServicio
                    abierto={comentariosAbierto}
                    onCerrar={() => setComentariosAbierto(false)}
                    publicacionId={publicacion.id}
                />
            )}
        </article>
    );
}

export default CardServicioFeed;
