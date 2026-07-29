/**
 * PanelNotasNegocios.tsx
 * =======================
 * Página completa "Mis notas" del módulo Territorios: TODAS las notas que YO escribí — tanto sobre
 * mis NEGOCIOS asignados (`negocios.nota_territorio`) como sobre mis MARCAS de prospección
 * (`territorio_marcas.nota`, los pines que yo mismo pongo al recorrer la zona) — en una sola lista
 * buscable por nombre. Se abre con el botón "Notas" (reemplaza el mapa); "Ver en el mapa" regresa
 * a él centrado en ese punto.
 *
 * Es puramente presentacional: recibe la lista ya unificada (`items`) — cada vista padre
 * (VistaVendedorTerritorio / VistaAdminTerritorio) arma el arreglo con los datos que YA tiene
 * cargados (useMisNotasNegocio + useMisMarcas), sin volver a pedirlos aquí.
 *
 * Ubicación: apps/admin/src/components/territorios/PanelNotasNegocios.tsx
 */

import { useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Search, X, StickyNote, Store, Pin } from 'lucide-react';

/** Una nota unificada (negocio real o marca de prospección propia) para la lista "Mis notas". */
export interface NotaListItem {
    /** Clave única para la lista (prefijada por origen: no colisiona entre negocio/marca). */
    id: string;
    /** Id real de la entidad (negocio o marca), para centrar/editar en el mapa. */
    entidadId: string;
    nombre: string;
    nota: string;
    origen: 'negocio' | 'marca';
    /** Ciudad (negocio) o estado de la marca (Visitado/Interesado/…), como subtítulo. */
    subtitulo: string | null;
    lat: number;
    lng: number;
    /** Solo origen 'negocio': para que la vista del gerente pueda cambiar a esa ciudad al "ver en el mapa". */
    ciudadId?: string | null;
}

interface PanelNotasNegociosProps {
    items: NotaListItem[];
    cargando?: boolean;
    onVolver: () => void;
    /** "Ver en el mapa" de una nota: regresa al mapa centrado/abierto en ese punto. */
    onVerEnMapa: (item: NotaListItem) => void;
}

export function PanelNotasNegocios({ items, cargando = false, onVolver, onVerEnMapa }: PanelNotasNegociosProps) {
    const [busqueda, setBusqueda] = useState('');

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return items;
        return items.filter((n) => n.nombre.toLowerCase().includes(q));
    }, [items, busqueda]);

    return (
        <div className="flex h-full flex-col gap-3 p-3 lg:p-0" data-testid="panel-mis-notas">
            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    data-testid="notas-volver"
                    onClick={onVolver}
                    aria-label="Volver al mapa"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-borde bg-superficie text-texto-2 transition hover:bg-superficie-2"
                >
                    <ArrowLeft size={19} />
                </button>
                <h2 className="text-[15px] font-semibold text-texto">Mis notas</h2>
                {items.length > 0 && (
                    <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[12px] font-medium text-texto-3">{items.length}</span>
                )}
            </div>

            <div className="relative shrink-0">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
                <input
                    data-testid="notas-buscar"
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre de negocio…"
                    className="w-full rounded-full border border-borde bg-superficie-2 py-2.5 pl-10 pr-9 text-[13.5px] font-medium text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
                />
                {busqueda && (
                    <button
                        type="button"
                        aria-label="Limpiar búsqueda"
                        onClick={() => setBusqueda('')}
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {cargando ? (
                    <div className="rounded-[10px] border border-borde px-3 py-6 text-center text-[13px] text-texto-3">Cargando…</div>
                ) : items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-borde px-3 py-10 text-center">
                        <StickyNote size={26} className="text-texto-4" />
                        <p className="text-[13px] text-texto-3">
                            Aún no has guardado ninguna nota. Anota un negocio o una marca desde el mapa.
                        </p>
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                        Ningún negocio coincide con "{busqueda}".
                    </div>
                ) : (
                    filtrados.map((n) => (
                        <div key={n.id} data-testid={`nota-${n.id}`} className="flex flex-col gap-1.5 border-b border-borde py-3 last:border-b-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        {n.origen === 'negocio' ? (
                                            <Store size={13} className="shrink-0 text-texto-4" />
                                        ) : (
                                            <Pin size={13} className="shrink-0 text-texto-4" />
                                        )}
                                        <span className="truncate text-[14px] font-semibold text-texto">{n.nombre}</span>
                                    </div>
                                    {n.subtitulo && <span className="text-[12px] text-texto-3">{n.subtitulo}</span>}
                                </div>
                                <button
                                    type="button"
                                    data-testid={`nota-ver-mapa-${n.id}`}
                                    onClick={() => onVerEnMapa(n)}
                                    aria-label="Ver en el mapa"
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca-suave text-marca transition hover:opacity-80"
                                >
                                    <MapPin size={18} />
                                </button>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-texto-2">{n.nota}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default PanelNotasNegocios;
