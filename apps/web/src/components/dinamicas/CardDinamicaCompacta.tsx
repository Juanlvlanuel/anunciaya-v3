/**
 * CardDinamicaCompacta.tsx
 * ==========================
 * Card compacta de Dinámica para grillas densas — calca `CardArticulo.tsx`
 * variant="compacta" (usada en el mismo contexto: el perfil de un usuario,
 * "grillas densas (perfil de usuario)" según su propio comentario), pensada
 * para 2+ columnas por fila.
 *
 * A diferencia de `CardDinamica.tsx` (card del feed principal, grande, con
 * header de organizador + footer "Contactar"): aquí NO hay avatar ni nombre
 * del organizador — ya estamos parados en su perfil, sería redundante — ni
 * botón de contacto. Toda la card es un solo link a la ficha de detalle
 * (igual que `CardArticulo` compacta).
 *
 * Ubicación: apps/web/src/components/dinamicas/CardDinamicaCompacta.tsx
 */

import { useNavigate } from 'react-router-dom';
import { Clock, ImageOff, Ticket } from 'lucide-react';
import type { DinamicaFeedItem } from '../../types/dinamicas';

interface CardDinamicaCompactaProps {
    dinamica: DinamicaFeedItem;
}

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
    activa: { texto: 'Activa', clase: 'bg-emerald-500 text-white' },
    pospuesta: { texto: 'Pospuesta', clase: 'bg-amber-500 text-white' },
    en_sorteo: { texto: 'En sorteo', clase: 'bg-violet-500 text-white' },
    cerrada: { texto: 'Cerrada', clase: 'bg-slate-600 text-white' },
    cancelada: { texto: 'Cancelada', clase: 'bg-rose-500 text-white' },
};

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

export function CardDinamicaCompacta({ dinamica }: CardDinamicaCompactaProps) {
    const navigate = useNavigate();

    const portada = dinamica.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica.fotosPremio[0];
    const portadaUrl = portada?.tipo === 'video' ? portada.posterUrl : portada?.url;

    const totalBoletos = dinamica.numeroTotalBoletos ?? 0;
    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const estado = ETIQUETA_ESTADO[dinamica.estado] ?? ETIQUETA_ESTADO.activa;

    return (
        <article
            data-testid={`card-dinamica-compacta-${dinamica.id}`}
            onClick={() => navigate(`/marketplace/dinamica/${dinamica.id}`)}
            className="group min-w-0 cursor-pointer flex flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-md"
        >
            <div className="relative w-full aspect-3/2 overflow-hidden bg-slate-200">
                {portadaUrl ? (
                    <img
                        src={portadaUrl}
                        alt={dinamica.titulo}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                )}
                <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${estado.clase}`}>
                    {estado.texto}
                </span>
            </div>

            <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
                <div className="truncate text-base font-bold leading-snug text-slate-900">
                    {dinamica.titulo}
                </div>

                {dinamica.precioBoleto && (
                    <div className="text-lg font-bold leading-tight text-amber-700">
                        ${Number(dinamica.precioBoleto).toLocaleString('es-MX')}
                        <span className="ml-1 text-sm font-medium text-amber-700/80">por boleto</span>
                    </div>
                )}

                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <Ticket className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>
                        {dinamica.boletosPagados}
                        {totalBoletos > 0 ? `/${totalBoletos}` : ''} vendidos
                    </span>
                </div>

                {cuentaRegresiva && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                        <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
                        <span>{cuentaRegresiva} para cerrar</span>
                    </div>
                )}
            </div>
        </article>
    );
}

export default CardDinamicaCompacta;
