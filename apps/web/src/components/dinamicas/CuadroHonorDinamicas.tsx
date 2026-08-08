/**
 * CuadroHonorDinamicas.tsx
 * ==========================
 * Resultados de rifas cerradas de la ciudad — antes el único lugar donde se
 * veían los ganadores era adentro de la sala de cada Dinámica (había que
 * saber que existía y entrar). Este es el resumen público agregado:
 * miniatura del premio + lista de ganadores (avatar real si tiene cuenta AY,
 * genérico si el organizador lo agregó a mano) por rifa cerrada.
 *
 * 2 exports, ambos puramente presentacionales (reciben `rifas` ya cargadas,
 * no hacen su propio fetch — el dueño del layout, `SeccionFeedDinamicas.tsx`,
 * pide los datos una sola vez y decide con ellos si hay o no columna fija):
 *
 *  - `CuadroHonorMovil` — reel horizontal con scroll nativo + snap, mismo
 *    tamaño y estilo de card que `CardArticuloReel.tsx` (MP) /
 *    `CardNegocioReel.tsx` (Negocios) — `w-44`, borde delgado, `shadow-sm`,
 *    foto 4:3 — para que se sienta del mismo módulo visual que esos reels.
 *  - `CuadroHonorLista` — solo el encabezado + la lista de cards, SIN
 *    wrapper de posición propio. `SeccionFeedDinamicas.tsx` es quien la
 *    mete en la columna fija por JS (mismo patrón "Recién publicado" de
 *    `SeccionFeedArticulos.tsx` / cards de `PaginaNegocios.tsx`).
 *
 * Click en cualquier card → la sala de esa Dinámica (`/marketplace/dinamica/:id/sala`),
 * que es donde vive el detalle completo del sorteo (cascada de intentos +
 * hash de verificación).
 *
 * Ubicación: apps/web/src/components/dinamicas/CuadroHonorDinamicas.tsx
 */

import { type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ImageOff } from 'lucide-react';
import type { DinamicaSalonFama, GanadorSalonFama } from '../../types/dinamicas';

interface CuadroHonorProps {
    rifas: DinamicaSalonFama[];
}

export function CuadroHonorMovil({ rifas }: CuadroHonorProps) {
    const navigate = useNavigate();

    if (rifas.length === 0) return null;

    function irASala(dinamicaId: string) {
        navigate(`/marketplace/dinamica/${dinamicaId}/sala`);
    }

    return (
        <div className="mb-4">
            <div className="px-3">
                <EncabezadoCuadroHonor />
            </div>
            <div
                data-testid="reel-cuadro-honor"
                className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-3 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            >
                {rifas.map((d) => (
                    <TarjetaSalonFama key={d.id} dinamica={d} onClick={() => irASala(d.id)} variante="movil" />
                ))}
            </div>
        </div>
    );
}

interface CuadroHonorListaProps extends CuadroHonorProps {
    /** Ref al PRIMER card renderizado — `SeccionFeedDinamicas.tsx` la usa
     *  para medir cuánto espacio ocupa el encabezado "Cuadro de Honor" y así
     *  alinear el card (no el encabezado) con el primer card del feed. */
    primerCardRef?: RefObject<HTMLButtonElement | null>;
}

export function CuadroHonorLista({ rifas, primerCardRef }: CuadroHonorListaProps) {
    const navigate = useNavigate();

    if (rifas.length === 0) return null;

    function irASala(dinamicaId: string) {
        navigate(`/marketplace/dinamica/${dinamicaId}/sala`);
    }

    return (
        <>
            <EncabezadoCuadroHonor />
            {rifas.map((d, i) => (
                <TarjetaSalonFama
                    key={d.id}
                    dinamica={d}
                    onClick={() => irASala(d.id)}
                    cardRef={i === 0 ? primerCardRef : undefined}
                />
            ))}
        </>
    );
}

function EncabezadoCuadroHonor() {
    return (
        <div className="mb-2 flex items-center gap-1.5 px-1">
            <Trophy className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.5} />
            <span className="text-sm font-bold uppercase tracking-wide text-slate-600">Últimos Ganadores</span>
        </div>
    );
}

function TarjetaSalonFama({
    dinamica,
    onClick,
    cardRef,
    variante = 'desktop',
}: {
    dinamica: DinamicaSalonFama;
    onClick: () => void;
    cardRef?: RefObject<HTMLButtonElement | null>;
    /** 'movil' calca tamaño y estilo de `CardArticuloReel.tsx`/`CardNegocioReel.tsx`:
     *  ancho fijo `w-44`, borde delgado, `shadow-sm`, foto 4:3. 'desktop'
     *  (default) mantiene el estilo de card de lista de la columna fija. */
    variante?: 'movil' | 'desktop';
}) {
    const portada = dinamica.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica.fotosPremio[0];
    const portadaUrl = portada?.tipo === 'video' ? portada.posterUrl : portada?.url;
    const esMovil = variante === 'movil';

    return (
        <button
            ref={cardRef}
            type="button"
            data-testid={`salon-fama-${dinamica.id}`}
            onClick={onClick}
            className={
                esMovil
                    ? 'w-44 shrink-0 snap-start flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-white text-left shadow-sm'
                    : 'mb-2.5 flex w-full flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white text-left transition-colors last:mb-0 lg:cursor-pointer lg:hover:border-amber-300'
            }
        >
            <div className={`w-full shrink-0 overflow-hidden bg-slate-200 ${esMovil ? 'aspect-4/3' : 'aspect-3/2'}`}>
                {portadaUrl ? (
                    <img src={portadaUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                )}
            </div>

            <div className="min-w-0 p-2.5">
                <p className="truncate text-sm font-bold text-slate-900">{dinamica.titulo}</p>
                <div className="mt-1.5 space-y-1">
                    {dinamica.ganadores.map((g) => (
                        <FilaGanadorSalonFama key={g.lugar} ganador={g} />
                    ))}
                </div>
            </div>
        </button>
    );
}

function FilaGanadorSalonFama({ ganador }: { ganador: GanadorSalonFama }) {
    const nombre = ganador.usuarioId
        ? `${ganador.usuarioNombre ?? ''} ${ganador.usuarioApellidos ?? ''}`.trim() || 'Usuario AY'
        : ganador.nombreManual ?? 'Participante';
    const inicial = (nombre.charAt(0) || '?').toUpperCase();

    return (
        <div className="flex min-w-0 items-center gap-1.5">
            {ganador.lugar === 1 ? (
                <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
            ) : (
                <span className="w-3.5 shrink-0 text-center text-[11px] font-bold text-slate-400">{ganador.lugar}º</span>
            )}
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200">
                {ganador.usuarioAvatarUrl ? (
                    <img src={ganador.usuarioAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span
                        className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    >
                        {inicial}
                    </span>
                )}
            </span>
            <span className="truncate text-xs font-semibold text-slate-700">{nombre}</span>
        </div>
    );
}
