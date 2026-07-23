/**
 * CardPublicacionNegocioFeed.tsx
 * ================================
 * Card del feed de publicaciones de Negocio — estilo Facebook: header, texto,
 * precio, fotos deslizables y una barra de métricas (comentarios/vistas) al
 * final. Sin vista previa de comentarios inline — el feed se mantiene limpio
 * para aprovechar el espacio con más publicaciones; el ícono de comentarios
 * abre `ModalComentariosPublicacionNegocio` con TODOS los comentarios
 * (mismo componente que usa la página de detalle).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/CardPublicacionNegocioFeed.tsx
 */

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Store, ImageOff, MessageCircle, Pencil } from 'lucide-react';
import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { formatearTiempoRelativo, formatearPrecio } from '../../../utils/marketplace';
import { truncarTexto } from '../../../utils/truncarTexto';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { ModalComentariosPublicacionNegocio } from './ModalComentariosPublicacionNegocio';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { PublicacionNegocioFeedItemConComentarios } from '../../../types/negocioPublicaciones';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

/** Mismo formato que `CardNegocio`/`CardNegocioCompacto`: metros si es <1km. */
function formatearDistancia(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Tope de caracteres para el texto recortado — "Ver más" se agrega como
// texto real dentro del mismo párrafo (no `line-clamp` + overlay flotante),
// mismo criterio que CardArticuloFeed de MarketPlace. ~3 líneas en el ancho
// típico de la card.
const TEXTO_MAX_CHARS = 150;

interface CardPublicacionNegocioFeedProps {
    publicacion: PublicacionNegocioFeedItemConComentarios;
    /** Navega a la página de detalle (`/negocios/publicacion/:id`). */
    onAbrirDetalle: (id: string) => void;
}

export function CardPublicacionNegocioFeed({
    publicacion,
    onAbrirDetalle,
}: CardPublicacionNegocioFeedProps) {
    const navigate = useNavigate();
    const [indiceFoto, setIndiceFoto] = useState(publicacion.fotoPortadaIndex ?? 0);
    const [lightboxAbierto, setLightboxAbierto] = useState(false);
    const [logoAbierto, setLogoAbierto] = useState(false);
    const [comentariosAbierto, setComentariosAbierto] = useState(false);

    const fotos = publicacion.fotos ?? [];
    const tieneMultiples = fotos.length > 1;
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const textoCorto = truncarTexto(publicacion.texto, TEXTO_MAX_CHARS);
    const textoRecortado = textoCorto.length < publicacion.texto.length;

    // Editar inline: solo visible para quien opera esa sucursal en modo
    // comercial — mismo criterio de "sucursal activa" que ya usa el composer
    // al crear (ComposerPublicacionNegocio.tsx). Abre el composer existente
    // vía query param, sin lógica de edición nueva.
    const usuario = useAuthStore((s) => s.usuario);
    const sucursalUsuario = usuario?.sucursalActiva || usuario?.sucursalAsignada;
    const esMia = usuario?.modoActivo === 'comercial' && sucursalUsuario === publicacion.sucursalId;

    function irAPerfilNegocio() {
        navigate(`/negocios/${publicacion.sucursalId}`);
    }

    function irAEditar() {
        navigate(`/negocios?editar=${publicacion.id}`, { replace: true });
    }

    function anterior(e: React.MouseEvent) {
        e.stopPropagation();
        setIndiceFoto((i) => (i - 1 + fotos.length) % fotos.length);
    }
    function siguiente(e: React.MouseEvent) {
        e.stopPropagation();
        setIndiceFoto((i) => (i + 1) % fotos.length);
    }

    // ── Swipe táctil de fotos (mismo patrón que CardArticuloFeed de MP):
    // arrastra en vivo con translateX, la foto adyacente se asoma en el
    // borde y al soltar hace snap a la siguiente/anterior o regresa a 0. ──
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
        setLightboxAbierto(true);
    }, []);

    return (
        <article
            data-testid={`card-publicacion-negocio-${publicacion.id}`}
            className="rounded-2xl border-2 border-slate-300 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden"
        >
            {/* ── Header: logo (click → expande) + nombre (click → perfil) + distancia + tiempo ── */}
            <div className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-4">
                <button
                    type="button"
                    data-testid={`card-publicacion-negocio-logo-${publicacion.id}`}
                    onClick={() => publicacion.sucursalAvatarUrl && setLogoAbierto(true)}
                    aria-label="Ver logo en grande"
                    className={`shrink-0 ${publicacion.sucursalAvatarUrl ? 'lg:cursor-pointer' : ''}`}
                >
                    {publicacion.sucursalAvatarUrl ? (
                        <img
                            src={publicacion.sucursalAvatarUrl}
                            alt=""
                            className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200"
                        />
                    ) : (
                        <div
                            aria-hidden
                            className="h-14 w-14 rounded-full bg-blue-600 grid place-items-center text-white ring-2 ring-slate-200"
                        >
                            <Store className="h-6 w-6" strokeWidth={2} />
                        </div>
                    )}
                </button>
                <button
                    type="button"
                    onClick={irAPerfilNegocio}
                    className="min-w-0 flex-1 text-left lg:cursor-pointer"
                >
                    <div className="flex items-center gap-1.5 leading-tight">
                        <span className="truncate text-[17px] font-extrabold text-slate-900 lg:hover:underline">
                            {publicacion.sucursalNombre}
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-blue-600 animate-bounceX" strokeWidth={2.5} />
                    </div>
                    {/* Tiempo solo — el "hace 9h" queda claro sin competir en
                        la misma línea con la distancia. */}
                    <div className="mt-1 text-sm text-slate-600 font-semibold">
                        {tiempo}
                    </div>
                </button>

                {/* Distancia — badge aparte a la orilla derecha, en azul,
                    separada del tiempo. */}
                {publicacion.distanciaKm !== null && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-700">
                        <MapPin className="w-3.5 h-3.5" />
                        {formatearDistancia(publicacion.distanciaKm)}
                    </span>
                )}

                {/* Editar — solo visible para quien opera esta sucursal en
                    modo comercial. Abre el mismo composer de siempre. */}
                {esMia && (
                    <button
                        type="button"
                        data-testid={`card-publicacion-negocio-editar-${publicacion.id}`}
                        onClick={irAEditar}
                        aria-label="Editar publicación"
                        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 lg:cursor-pointer lg:hover:bg-blue-100"
                    >
                        <Pencil className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </button>
                )}
            </div>

            {/* ── Texto — "Ver más" es texto REAL dentro del mismo párrafo
                (recorte por caracteres, no `line-clamp` + overlay flotante)
                — se lee como continuación de la oración, no como un
                elemento aparte. Mismo criterio que CardArticuloFeed de
                MarketPlace (mismo texto "Ver más", acento temático propio:
                azul acá, teal en MP). Siempre visible (CTA al detalle),
                aunque el texto sea corto y no haga falta recortarlo con
                "…". ── */}
            <div className={`px-3 lg:px-4 ${publicacion.precio ? 'pb-1' : 'pb-3'}`}>
                <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-slate-800">
                    {textoCorto}
                    {textoRecortado ? '… ' : ' '}
                    <button
                        type="button"
                        onClick={() => onAbrirDetalle(publicacion.id)}
                        className="font-semibold text-blue-600 lg:cursor-pointer lg:hover:underline"
                    >
                        Ver más
                    </button>
                </p>
            </div>

            {/* ── Precio — dato comercial principal, aparte de las métricas
                del footer (mismo criterio que el precio de MP). ── */}
            {publicacion.precio && (
                <div className="px-3 lg:px-4 pb-3">
                    <span className="text-xl font-extrabold text-blue-700 tabular-nums">
                        {formatearPrecio(publicacion.precio)}
                    </span>
                </div>
            )}

            {/* ── Fotos — deslizables con el dedo (swipe), misma foto adyacente
                asomando en el borde durante el arrastre que en MP. ── */}
            {fotos.length > 0 && (
                <div
                    className="group relative aspect-[4/3] lg:aspect-[2/1] w-full overflow-hidden bg-slate-100 touch-pan-y lg:cursor-zoom-in"
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
                                alt=""
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
                                onClick={anterior}
                                aria-label="Foto anterior"
                                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity lg:cursor-pointer"
                            >
                                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                            </button>
                            <button
                                type="button"
                                onClick={siguiente}
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
            )}

            {fotos.length === 0 && (
                <div className="flex items-center justify-center gap-2 px-3 lg:px-4 py-6 text-slate-300">
                    <ImageOff className="h-5 w-5" strokeWidth={1.75} />
                </div>
            )}

            {/* ── Footer: comentarios (clickeable → modal con todos) a la
                orilla izquierda, vistas a la orilla derecha. Íconos grandes,
                estilo Facebook — sin vista previa inline de comentarios. ── */}
            <div className="flex items-center justify-between gap-3 px-3 lg:px-4 py-3 border-t-[1.5px] border-slate-300">
                <button
                    type="button"
                    data-testid={`card-publicacion-negocio-abrir-comentarios-${publicacion.id}`}
                    onClick={() => setComentariosAbierto(true)}
                    aria-label="Ver comentarios"
                    className="flex items-center gap-2 text-base font-semibold text-slate-600 lg:cursor-pointer lg:hover:text-slate-800"
                >
                    <MessageCircle className="h-6 w-6" strokeWidth={2} />
                    {publicacion.totalComentarios}
                </button>
                <span className="flex items-center gap-2 text-base font-semibold text-slate-600">
                    <Eye className="h-6 w-6" />
                    {publicacion.totalVistas}
                </span>
            </div>

            {lightboxAbierto && (
                <ModalImagenes
                    images={fotos}
                    initialIndex={indiceFoto}
                    isOpen={lightboxAbierto}
                    onClose={() => setLightboxAbierto(false)}
                />
            )}

            {logoAbierto && publicacion.sucursalAvatarUrl && (
                <ModalImagenes
                    images={[publicacion.sucursalAvatarUrl]}
                    initialIndex={0}
                    isOpen={logoAbierto}
                    onClose={() => setLogoAbierto(false)}
                />
            )}

            {comentariosAbierto && (
                <ModalComentariosPublicacionNegocio
                    abierto={comentariosAbierto}
                    onCerrar={() => setComentariosAbierto(false)}
                    publicacionId={publicacion.id}
                />
            )}
        </article>
    );
}

export default CardPublicacionNegocioFeed;
