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
 * Ubicación: apps/web/src/components/dinamicas/CardDinamica.tsx
 */

import { useNavigate } from 'react-router-dom';
import { Clock, ImageOff, Ticket } from 'lucide-react';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { DinamicaFeedItem } from '../../types/dinamicas';

interface CardDinamicaProps {
    dinamica: DinamicaFeedItem;
}

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
    activa: { texto: 'Activa', clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' },
    pospuesta: { texto: 'Pospuesta', clase: 'bg-amber-500/15 text-amber-300 border-amber-400/30' },
    en_sorteo: { texto: 'En sorteo', clase: 'bg-violet-500/15 text-violet-300 border-violet-400/30' },
    cerrada: { texto: 'Cerrada', clase: 'bg-slate-500/15 text-slate-300 border-slate-400/30' },
    cancelada: { texto: 'Cancelada', clase: 'bg-rose-500/15 text-rose-300 border-rose-400/30' },
};

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

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

export function CardDinamica({ dinamica }: CardDinamicaProps) {
    const navigate = useNavigate();

    const portada = dinamica.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica.fotosPremio[0];
    const portadaUrl = portada?.tipo === 'video' ? portada.posterUrl : portada?.url;

    const totalBoletos = dinamica.numeroTotalBoletos ?? 0;
    const progresoPct = totalBoletos > 0 ? Math.min(100, Math.round((dinamica.boletosPagados / totalBoletos) * 100)) : 0;
    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const estado = ETIQUETA_ESTADO[dinamica.estado] ?? ETIQUETA_ESTADO.activa;

    return (
        <article
            data-testid={`card-dinamica-${dinamica.id}`}
            onClick={() => navigate(`/marketplace/dinamica/${dinamica.id}`)}
            className="w-full max-w-[920px] mx-auto rounded-2xl border border-amber-400/15 bg-white/5 overflow-hidden cursor-pointer lg:hover:border-amber-400/35 transition-colors"
        >
            {/* Header — organizador */}
            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
                {dinamica.organizador.avatarUrl ? (
                    <img
                        src={dinamica.organizador.avatarUrl}
                        alt={dinamica.organizador.nombre}
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="h-9 w-9 rounded-full bg-amber-500/20 text-amber-300 text-sm font-semibold flex items-center justify-center shrink-0">
                        {obtenerIniciales(dinamica.organizador.nombre, dinamica.organizador.apellidos)}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                        {dinamica.organizador.nombre} {dinamica.organizador.apellidos}
                    </p>
                    <p className="text-xs text-slate-400">{formatearTiempoRelativo(dinamica.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${estado.clase}`}>
                    {estado.texto}
                </span>
            </div>

            {/* Portada */}
            <div className="relative aspect-video w-full bg-slate-800">
                {portadaUrl ? (
                    <img src={portadaUrl} alt={dinamica.titulo} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">
                        <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                )}
            </div>

            {/* Cuerpo */}
            <div className="px-4 pt-3 pb-4 space-y-3">
                <h3 className="text-[15px] font-semibold text-white leading-snug line-clamp-2" data-testid={`card-dinamica-titulo-${dinamica.id}`}>
                    {dinamica.titulo}
                </h3>

                {dinamica.precioBoleto && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                            <span className="flex items-center gap-1.5">
                                <Ticket className="h-3.5 w-3.5 text-amber-400" strokeWidth={2} />
                                ${Number(dinamica.precioBoleto).toLocaleString('es-MX')} por boleto
                            </span>
                            <span>
                                {dinamica.boletosPagados}
                                {totalBoletos > 0 ? ` / ${totalBoletos}` : ''} vendidos
                            </span>
                        </div>
                        {totalBoletos > 0 && (
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${progresoPct}%`, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {cuentaRegresiva && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                        {cuentaRegresiva}
                    </p>
                )}
            </div>
        </article>
    );
}

export default CardDinamica;
