/**
 * CardDinamica.tsx
 * =================
 * Card del feed de Dinámicas — calca la estructura de `CardArticuloFeed.tsx`
 * (header con avatar+nombre+tiempo, imagen de portada, título, footer con
 * datos clave) pero simplificada: sin galería swipe/video/comentarios
 * inline (eso vive en la ficha de detalle, `PaginaDinamica.tsx`), con
 * identidad ámbar (`GRADIENTE_DINAMICAS`, igual que el composer) en vez de
 * teal.
 *
 * Igual que MP: el `<article>` NO tiene `onClick` propio — cada zona
 * interactiva (avatar, nombre, imagen, título) navega por su cuenta, calcado
 * de `handleAvatarClick`/`irAlPerfilVendedor`/`irAlDetalle` de
 * `CardArticuloFeed.tsx`. Dinámicas no tiene página de perfil de organizador
 * (a diferencia del vendedor de MP), así que avatar/nombre navegan a la
 * misma ficha de detalle en vez de a un perfil aparte.
 *
 * Ubicación: apps/web/src/components/dinamicas/CardDinamica.tsx
 */

import { useCallback, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, ImageOff, Ticket, Users } from 'lucide-react';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIniciarChatDinamica } from '../../hooks/useIniciarChatDinamica';
import { ModalImagenes } from '../ui/ModalImagenes';
import type { DinamicaFeedItem } from '../../types/dinamicas';

interface CardDinamicaProps {
    dinamica: DinamicaFeedItem;
}

// Colores sólidos (no pastel/translúcido) — el pill vive SOBRE la foto de
// portada, que puede tener cualquier tono de fondo; una versión pastel se
// perdía casi por completo sobre blanco/claro. Sólido + sombra se lee bien
// sobre cualquier imagen.
const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
    activa: { texto: 'Activa', clase: 'bg-emerald-500 text-white' },
    pospuesta: { texto: 'Pospuesta', clase: 'bg-amber-500 text-white' },
    en_sorteo: { texto: 'En sorteo', clase: 'bg-violet-500 text-white' },
    cerrada: { texto: 'Cerrada', clase: 'bg-slate-600 text-white' },
    cancelada: { texto: 'Cancelada', clase: 'bg-rose-500 text-white' },
};

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

// Solo el valor (no "Cierra en X") — esta card lo muestra en su propia
// columna con la etiqueta "para cerrar" debajo, así que el prefijo sería
// redundante.
function formatearCuentaRegresiva(fechaLimite: string | null): string | null {
    if (!fechaLimite) return null;
    const restante = new Date(fechaLimite).getTime() - Date.now();
    if (restante <= 0) return 'Cerrada';
    const dias = Math.floor(restante / (24 * 60 * 60 * 1000));
    if (dias >= 1) return `${dias}d`;
    const horas = Math.floor(restante / (60 * 60 * 1000));
    if (horas >= 1) return `${horas}h`;
    const min = Math.floor(restante / (60 * 1000));
    return `${min}min`;
}

export function CardDinamica({ dinamica }: CardDinamicaProps) {
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChatDinamica = useIniciarChatDinamica();

    const portada = dinamica.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica.fotosPremio[0];
    const portadaUrl = portada?.tipo === 'video' ? portada.posterUrl : portada?.url;

    const totalBoletos = dinamica.numeroTotalBoletos ?? 0;
    const progresoPct = totalBoletos > 0 ? Math.min(100, Math.round((dinamica.boletosPagados / totalBoletos) * 100)) : 0;
    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const estado = ETIQUETA_ESTADO[dinamica.estado] ?? ETIQUETA_ESTADO.activa;
    const esMio = usuarioActual?.id === dinamica.organizador.id;

    const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);

    const irAlDetalle = () => navigate(`/marketplace/dinamica/${dinamica.id}`);
    const irAlPerfilOrganizador = () => navigate(`/marketplace/usuario/${dinamica.organizador.id}`);

    // Mismo patrón que CardArticuloFeed: con avatar → abre ModalImagenes;
    // sin avatar → el click va directo al perfil (no hay nada que mostrar
    // en el modal).
    const handleAvatarClick = useCallback((e: MouseEvent) => {
        e.stopPropagation();
        if (dinamica.organizador.avatarUrl) {
            setModalAvatarAbierto(true);
        } else {
            irAlPerfilOrganizador();
        }
    }, [dinamica.organizador.avatarUrl, dinamica.organizador.id]);

    function contactarOrganizador(e: MouseEvent) {
        e.stopPropagation();
        if (usuarioActual?.id === dinamica.organizador.id) return;
        iniciarChatDinamica(dinamica);
    }

    return (
        <article
            data-testid={`card-dinamica-${dinamica.id}`}
            className="w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)]"
        >
            {/* Card vertical — foto arriba, contenido abajo, en todos los
                breakpoints (mismo patrón que `CardDinamicaMio.tsx` de "Mis
                Publicaciones"). Piensa en grid de 2 cards por fila, no en
                una card ancha ocupando todo el contenedor. */}

            {/* Portada — clickeable (va al detalle, como la galería de MP).
                El estado va superpuesto arriba a la derecha (sólido +
                sombra, se lee sobre cualquier foto). */}
            <button
                type="button"
                onClick={irAlDetalle}
                aria-label="Ver Dinámica"
                className="relative block aspect-video w-full bg-slate-200 lg:cursor-pointer"
            >
                {portadaUrl ? (
                    <img src={portadaUrl} alt={dinamica.titulo} className="block h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                )}
                <span className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md shadow-black/20 ${estado.clase}`}>
                    {estado.texto}
                </span>
            </button>

            {/* Header — organizador. Avatar y nombre son los que navegan (no
                el card completo), igual que CardArticuloFeed de MP. La
                flecha animada junto al nombre replica la señal de "esto
                lleva a algo" de MP. ChatYA (logo oficial) vive aquí — no al
                fondo del card — como acceso directo al organizador, igual
                patrón que BarraContacto.tsx. */}
            <header className="flex flex-col gap-1.5 border-b border-slate-100 px-4 py-3 lg:px-5 lg:pt-4 lg:pb-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        data-testid={`card-dinamica-avatar-${dinamica.id}`}
                        onClick={handleAvatarClick}
                        aria-label={`Avatar de ${dinamica.organizador.nombre}`}
                        className="shrink-0 lg:cursor-pointer"
                    >
                        {dinamica.organizador.avatarUrl ? (
                            <img
                                src={dinamica.organizador.avatarUrl}
                                alt={dinamica.organizador.nombre}
                                className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-200"
                            />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-amber-700 text-sm font-bold text-white ring-2 ring-slate-200">
                                {obtenerIniciales(dinamica.organizador.nombre, dinamica.organizador.apellidos)}
                            </div>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={irAlPerfilOrganizador}
                        className="min-w-0 flex-1 text-left lg:cursor-pointer"
                    >
                        <span className="flex items-center gap-1 truncate text-base font-extrabold text-slate-900 lg:hover:underline">
                            <span className="truncate">{dinamica.organizador.nombre} {dinamica.organizador.apellidos}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-amber-600 animate-bounceX" strokeWidth={2.5} />
                        </span>
                        <div className="mt-0.5 text-xs font-semibold text-slate-600">
                            {formatearTiempoRelativo(dinamica.createdAt)}
                        </div>
                    </button>
                </div>

                {!esMio && (
                    <div className="flex justify-end -mt-4">
                        <button
                            type="button"
                            data-testid={`card-dinamica-contactar-${dinamica.id}`}
                            onClick={contactarOrganizador}
                            aria-label="Contactar por ChatYA"
                            className="shrink-0 inline-flex items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:cursor-pointer lg:hover:scale-110"
                        >
                            <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto shrink-0 object-contain" />
                        </button>
                    </div>
                )}
            </header>

            {/* Cuerpo — solo el título navega (igual que MP). Los 3 KPIs
                viven en un panel propio (fondo slate neutro, NO pastel —
                Regla 13 de TOKENS_GLOBALES.md) para que resalten del resto
                del texto: icono + valor grande + label por cada uno. */}
            <div className="min-w-0 px-4 pt-3 pb-4 lg:px-5">
                <h3>
                    <button
                        type="button"
                        data-testid={`card-dinamica-titulo-${dinamica.id}`}
                        onClick={irAlDetalle}
                        className="block text-left text-base font-bold text-slate-900 leading-snug line-clamp-2 lg:cursor-pointer lg:hover:underline"
                    >
                        {dinamica.titulo}
                    </button>
                </h3>

                {dinamica.descripcion && (
                    <p className="mt-1.5 text-sm text-slate-600 leading-snug line-clamp-2">
                        {dinamica.descripcion}
                    </p>
                )}

                {dinamica.precioBoleto && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Ticket className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                                <div>
                                    <p className="text-base font-extrabold leading-tight text-slate-900">
                                        ${Number(dinamica.precioBoleto).toLocaleString('es-MX')}
                                    </p>
                                    <p className="text-xs text-slate-500">por boleto</p>
                                </div>
                            </div>
                            <div className="h-9 w-px shrink-0 bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 shrink-0 text-teal-600" strokeWidth={2} />
                                <div>
                                    <p className="text-base font-extrabold leading-tight text-slate-900">
                                        {dinamica.boletosPagados}{totalBoletos > 0 ? `/${totalBoletos}` : ''}
                                    </p>
                                    <p className="text-xs text-slate-500">vendidos</p>
                                </div>
                            </div>
                            <div className="h-9 w-px shrink-0 bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 shrink-0 text-rose-500" strokeWidth={2} />
                                <div>
                                    <p className="text-base font-extrabold leading-tight text-slate-900">
                                        {cuentaRegresiva ?? '—'}
                                    </p>
                                    <p className="text-xs text-slate-500">para cerrar</p>
                                </div>
                            </div>
                        </div>
                        {totalBoletos > 0 && (
                            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${progresoPct}%`, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {modalAvatarAbierto && dinamica.organizador.avatarUrl && (
                <ModalImagenes
                    isOpen={modalAvatarAbierto}
                    onClose={() => setModalAvatarAbierto(false)}
                    images={[dinamica.organizador.avatarUrl]}
                    initialIndex={0}
                />
            )}
        </article>
    );
}

export default CardDinamica;
