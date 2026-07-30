/**
 * PanelNotasNegocios.tsx
 * =======================
 * Página completa "Mis notas" del módulo Territorios: TODOS mis puntos — tanto mis NEGOCIOS
 * asignados con nota (`negocios.nota_territorio`) como TODAS mis MARCAS de prospección
 * (`territorio_marcas`, los pines que yo mismo pongo al recorrer la zona, tengan o no nota) — en
 * una sola lista buscable por nombre. Reemplaza a la antigua lista aparte "Mis puntos" del gerente
 * (28→29 jul): mismo dato, sin duplicar sección (30 jul).
 *
 * Acción por tarjeta:
 *   - **Marca**: un solo ícono de lápiz — abre su editor completo (tipo/nombre/teléfono/nota) sobre
 *     el mapa (sale de "Mis notas": es un formulario grande, no cabe inline).
 *   - **Negocio**: DOS íconos — lápiz = edita la nota **inline, sin salir de "Mis notas"** (solo tiene
 *     un campo, cabe perfecto aquí); pin = "ver en el mapa", vuela hasta la ubicación exacta del
 *     negocio aunque su ciudad no sea la que está seleccionada ahorita (30 jul: antes el pin de
 *     negocio no hacía nada visible si ya estabas en la misma ciudad).
 *
 * Casi presentacional: recibe la lista ya unificada (`items`) de cada vista padre (arma el arreglo
 * con datos que YA tenía cargados), pero SÍ dispara directo la mutación de guardar nota de negocio
 * (`onGuardarNotaNegocio`) para poder editar sin navegar.
 *
 * Ubicación: apps/admin/src/components/territorios/PanelNotasNegocios.tsx
 */

import { useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Pencil, Search, X, StickyNote, Store, Pin } from 'lucide-react';

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
    /** "Ver en el mapa" (negocio) o "editar" (marca): navega al mapa. */
    onVerEnMapa: (item: NotaListItem) => void;
    /** Guarda la nota de un negocio SIN navegar (edición inline aquí mismo). */
    onGuardarNotaNegocio: (negocioId: string, nota: string | null) => void;
    guardandoNotaNegocio?: boolean;
}

export function PanelNotasNegocios({ items, cargando = false, onVolver, onVerEnMapa, onGuardarNotaNegocio, guardandoNotaNegocio = false }: PanelNotasNegociosProps) {
    const [busqueda, setBusqueda] = useState('');
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [borrador, setBorrador] = useState('');

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return items;
        return items.filter((n) => n.nombre.toLowerCase().includes(q));
    }, [items, busqueda]);

    const abrirEdicion = (n: NotaListItem) => {
        setEditandoId(n.id);
        setBorrador(n.nota);
    };
    const cancelarEdicion = () => setEditandoId(null);
    const guardarEdicion = (n: NotaListItem) => {
        onGuardarNotaNegocio(n.entidadId, borrador.trim() || null);
        setEditandoId(null);
    };

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
                            Aún no tienes ningún punto. Agrega uno desde el mapa.
                        </p>
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                        Ningún negocio coincide con "{busqueda}".
                    </div>
                ) : (
                    filtrados.map((n) => {
                        const enEdicion = editandoId === n.id;
                        return (
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
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {n.origen === 'marca' ? (
                                            <button
                                                type="button"
                                                data-testid={`nota-editar-${n.id}`}
                                                onClick={() => onVerEnMapa(n)}
                                                aria-label="Editar punto"
                                                className="grid h-9 w-9 place-items-center rounded-full bg-marca-suave text-marca transition hover:opacity-80"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    data-testid={`nota-editar-${n.id}`}
                                                    onClick={() => (enEdicion ? cancelarEdicion() : abrirEdicion(n))}
                                                    aria-label={enEdicion ? 'Cancelar edición' : 'Editar nota'}
                                                    className={`grid h-9 w-9 place-items-center rounded-full transition hover:opacity-80 ${enEdicion ? 'bg-superficie-2 text-texto-3' : 'bg-marca-suave text-marca'}`}
                                                >
                                                    {enEdicion ? <X size={18} /> : <Pencil size={18} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid={`nota-ver-mapa-${n.id}`}
                                                    onClick={() => onVerEnMapa(n)}
                                                    aria-label="Ver en el mapa"
                                                    className="grid h-9 w-9 place-items-center rounded-full bg-marca-suave text-marca transition hover:opacity-80"
                                                >
                                                    <MapPin size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {enEdicion ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            data-testid={`nota-editar-textarea-${n.id}`}
                                            autoFocus
                                            value={borrador}
                                            onChange={(e) => setBorrador(e.target.value)}
                                            placeholder="Nota sobre este negocio (ej. pidió que le llamen la próxima semana…)"
                                            rows={5}
                                            className="w-full resize-none rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13.5px] text-texto outline-none focus:border-marca"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={cancelarEdicion}
                                                className="flex-1 rounded-[10px] border border-borde px-3 py-2 text-[13px] text-texto-2 transition hover:bg-superficie-2"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                data-testid={`nota-editar-guardar-${n.id}`}
                                                onClick={() => guardarEdicion(n)}
                                                disabled={guardandoNotaNegocio}
                                                className="flex-1 rounded-[10px] bg-marca px-3 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                                            >
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                ) : n.nota ? (
                                    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-texto-2">{n.nota}</p>
                                ) : (
                                    <p className="text-[13px] italic text-texto-3">Sin nota</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default PanelNotasNegocios;
