/**
 * SeccionTerritorios.tsx
 * ======================
 * Sección "Territorios" del Panel (Red de ventas). Layout: el MAPA ocupa todo el alto a la
 * izquierda; la COLUMNA DERECHA concentra todo — selector de ciudad, "Nueva zona", el
 * formulario de guardado y la lista de zonas (con reasignar/borrar). El vendedor solo ve su
 * pedazo (mapa + lista, sin acciones).
 *
 * Dropdowns con el SelectorBuscable estándar del Panel (no <select> nativo). El formulario de
 * guardado vive en la columna (no en overlay) para que el popover del selector no quede tapado.
 *
 * Ubicación: apps/admin/src/components/territorios/SeccionTerritorios.tsx
 */

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
    useZonas,
    useCiudadesDelAlcance,
    useVendedoresAsignables,
    useMarcasEquipo,
    useNegociosMapa,
    useCrearZona,
    useEditarZona,
    useAsignarZona,
    useBorrarZona,
} from '../../hooks/queries/useTerritoriosAdmin';
import { MapaTerritorios } from './MapaTerritorios';
import { VistaVendedorTerritorio } from './VistaVendedorTerritorio';
import { COLOR_TIPO, ETIQUETA_TIPO, COLOR_NEGOCIO } from './MapaMarcas';
import { SelectorBuscable, type OpcionBuscable } from '../ui/SelectorBuscable';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import type { RolPanel } from '../../data/menuPanel';
import type { PoligonoGeoJSON, TipoMarca, ZonaTerritorio } from '../../services/territoriosService';

const COLORES = ['#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2'];
const TIPOS_MARCA: TipoMarca[] = ['visitado', 'interesado', 'cerrado', 'sin_interes'];

interface SeccionTerritoriosProps {
    rol: RolPanel;
}

export function SeccionTerritorios({ rol }: SeccionTerritoriosProps) {
    // El vendedor tiene su propia vista ("Mi territorio"): solo su zona + sus marcas.
    if (rol === 'vendedor') return <VistaVendedorTerritorio />;
    return <VistaAdminTerritorio rol={rol} />;
}

/** Vista de gestión (super/gerente): dibujar zonas, asignarlas y borrarlas. */
function VistaAdminTerritorio({ rol }: SeccionTerritoriosProps) {
    const puedeEditar = rol === 'superadmin' || rol === 'gerente';

    const [ciudadId, setCiudadId] = useState('');
    const { data: ciudades = [] } = useCiudadesDelAlcance(puedeEditar);
    const { data: vendedores = [] } = useVendedoresAsignables(puedeEditar);
    const { data: zonas = [], isLoading, isError } = useZonas(ciudadId ? { ciudadId } : {});
    const { data: marcas = [] } = useMarcasEquipo(ciudadId || undefined, puedeEditar);
    const { data: negocios = [] } = useNegociosMapa(ciudadId || undefined, puedeEditar);
    const crear = useCrearZona();
    const editar = useEditarZona();
    const asignar = useAsignarZona();
    const borrar = useBorrarZona();

    const [dibujando, setDibujando] = useState(false);
    const [zonaEditando, setZonaEditando] = useState<ZonaTerritorio | null>(null);
    const [filtroMarca, setFiltroMarca] = useState<TipoMarca | null>(null);
    const [mostrarNegocios, setMostrarNegocios] = useState(true);
    const [poligonoNuevo, setPoligonoNuevo] = useState<PoligonoGeoJSON | null>(null);
    const [nombre, setNombre] = useState('');
    const [color, setColor] = useState(COLORES[0]);
    const [embajadorId, setEmbajadorId] = useState('');
    const [zonaABorrar, setZonaABorrar] = useState<{ id: string; nombre: string } | null>(null);
    const [foco, setFoco] = useState<{ poligono: PoligonoGeoJSON; nonce: number } | null>(null);

    /** Vuela (zoom cine) hacia la zona al hacer clic en su nombre. Nonce para re-volar aunque sea la misma. */
    const enfocarZona = (z: ZonaTerritorio) => setFoco((f) => ({ poligono: z.poligono, nonce: (f?.nonce ?? 0) + 1 }));

    const ciudadSel = useMemo(() => ciudades.find((c) => c.id === ciudadId), [ciudades, ciudadId]);
    const centro: [number, number] | null =
        ciudadSel && ciudadSel.lng != null && ciudadSel.lat != null ? [ciudadSel.lng, ciudadSel.lat] : null;

    const opcCiudades: OpcionBuscable[] = useMemo(
        () => [{ id: '', etiqueta: 'Todas mis ciudades' }, ...ciudades.map((c) => ({ id: c.id, etiqueta: c.nombre }))],
        [ciudades],
    );
    const opcVendedores: OpcionBuscable[] = useMemo(
        () => [{ id: '', etiqueta: 'Sin asignar' }, ...vendedores.map((v) => ({ id: v.embajadorId, etiqueta: v.nombre ?? 'Vendedor' }))],
        [vendedores],
    );
    const marcasFiltradas = useMemo(
        () => (filtroMarca === null ? marcas : marcas.filter((m) => m.tipo === filtroMarca)),
        [marcas, filtroMarca],
    );
    // Al editar una zona, ocúltala de la capa de zonas (su contorno ya se ve en el editor, sin duplicar).
    const zonasPintadas = useMemo(
        () => (zonaEditando ? zonas.filter((z) => z.id !== zonaEditando.id) : zonas),
        [zonas, zonaEditando],
    );

    /** Entrar a editar una zona existente: precarga sus datos y abre el editor con su contorno. */
    const editarZonaInline = (z: ZonaTerritorio) => {
        setZonaEditando(z);
        setNombre(z.nombre);
        setColor(z.color ?? COLORES[0]);
        setEmbajadorId(z.embajadorId ?? '');
        setPoligonoNuevo(null);
        setDibujando(true);
    };

    const cancelarForm = () => {
        setPoligonoNuevo(null);
        setZonaEditando(null);
        setDibujando(false);
    };

    const alPoligonoCompleto = (poly: PoligonoGeoJSON) => {
        setPoligonoNuevo(poly);
        setDibujando(false);
        if (!zonaEditando) {
            // Solo al crear se limpian; al editar, nombre/color ya están precargados.
            setNombre('');
            setColor(COLORES[0]);
            setEmbajadorId('');
        }
    };

    const guardarZona = () => {
        if (!poligonoNuevo || !nombre.trim()) return;
        if (zonaEditando) {
            editar.mutate(
                { id: zonaEditando.id, datos: { nombre: nombre.trim(), poligono: poligonoNuevo, color } },
                { onSuccess: () => { setPoligonoNuevo(null); setZonaEditando(null); } },
            );
        } else {
            if (!ciudadId) return;
            crear.mutate(
                { ciudadId, nombre: nombre.trim(), poligono: poligonoNuevo, color, embajadorId: embajadorId || null },
                { onSuccess: () => setPoligonoNuevo(null) },
            );
        }
    };

    return (
        <div className="flex h-full flex-col gap-3 lg:flex-row" data-testid="seccion-territorios">
            {/* Mapa: lo más alto/ancho posible */}
            <div className="min-h-[320px] min-w-0 flex-1">
                {isError ? (
                    <div className="grid h-full place-items-center rounded-[12px] border border-borde text-[13px] text-peligro">
                        No se pudieron cargar las zonas.
                    </div>
                ) : (
                    <MapaTerritorios
                        zonas={zonasPintadas}
                        marcas={marcasFiltradas}
                        negocios={mostrarNegocios ? negocios : []}
                        centro={centro}
                        modoDibujo={dibujando}
                        poligonoEditando={zonaEditando?.poligono ?? null}
                        poligonoPreview={poligonoNuevo}
                        enfocarPoligono={foco?.poligono ?? null}
                        enfocarNonce={foco?.nonce ?? 0}
                        introAnimado={rol === 'gerente'}
                        onPoligonoCompleto={alPoligonoCompleto}
                        onCancelarDibujo={cancelarForm}
                    />
                )}
            </div>

            {/* Columna derecha: SOLO super/gerente (gestión de zonas). El vendedor ve solo su mapa + (G.2) sus marcas. */}
            {puedeEditar && (
            <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72 lg:pr-3 lg:pt-3">
                {puedeEditar && (
                    <div className="flex shrink-0 flex-col gap-2">
                        <SelectorBuscable
                            value={ciudadId}
                            onChange={(id) => { setCiudadId(id); setDibujando(false); }}
                            opciones={opcCiudades}
                            placeholder="Elige una ciudad…"
                            buscarPlaceholder="Buscar ciudad…"
                            testid="territorios-ciudad"
                        />
                        {!poligonoNuevo && (
                            <button
                                type="button"
                                data-testid="territorios-nueva-zona"
                                onClick={() => setDibujando(true)}
                                disabled={!ciudadId || dibujando}
                                title={!ciudadId ? 'Elige una ciudad primero' : 'Dibujar una zona'}
                                className="flex items-center justify-center gap-1.5 rounded-[10px] bg-marca px-3 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                            >
                                <Plus size={15} /> Nueva zona
                            </button>
                        )}
                    </div>
                )}

                {/* Filtro de las marcas del equipo (lectura): mismo set que se pinta en el mapa */}
                {!poligonoNuevo && marcas.length > 0 && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                        <span className="text-[11.5px] font-medium text-texto-3">Marcas del equipo ({marcasFiltradas.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                            {TIPOS_MARCA.map((t) => {
                                const activo = filtroMarca === t;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        data-testid={`filtro-marca-${t}`}
                                        onClick={() => setFiltroMarca((f) => (f === t ? null : t))}
                                        aria-pressed={activo}
                                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition ${activo ? 'border-marca bg-marca-suave font-medium text-texto' : 'border-borde text-texto-3 hover:bg-superficie-2'}`}
                                    >
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                                        {ETIQUETA_TIPO[t]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Toggle de los negocios reales en el mapa + leyenda de atribución */}
                {!poligonoNuevo && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                            type="button"
                            data-testid="toggle-negocios"
                            onClick={() => setMostrarNegocios((v) => !v)}
                            aria-pressed={mostrarNegocios}
                            className={`flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2 text-[12.5px] transition ${mostrarNegocios ? 'border-marca bg-marca-suave text-texto' : 'border-borde text-texto-3 hover:bg-superficie-2'}`}
                        >
                            <span>Negocios en el mapa</span>
                            <span className={`text-[11px] ${mostrarNegocios ? 'text-marca' : 'text-texto-3'}`}>{mostrarNegocios ? 'Visibles' : 'Ocultos'}</span>
                        </button>
                        {mostrarNegocios && negocios.length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-texto-3">
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: COLOR_NEGOCIO.sinVendedor }} />Sin vendedor</span>
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: COLOR_NEGOCIO.conVendedor }} />Con vendedor</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Formulario de la zona recién dibujada (en la columna, no en overlay) */}
                {poligonoNuevo ? (
                    <div className="flex shrink-0 flex-col gap-2 rounded-[12px] border border-borde bg-superficie-2 p-3" data-testid="form-nueva-zona">
                        <h2 className="text-[14px] font-semibold text-texto">{zonaEditando ? 'Editar zona' : 'Guardar zona'}</h2>
                        <input
                            autoFocus
                            data-testid="zona-nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Nombre (ej. Centro)"
                            className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none focus:border-marca"
                        />
                        <div className="flex gap-1.5">
                            {COLORES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{ backgroundColor: c }}
                                    className={`h-6 w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-offset-superficie-2' : 'opacity-70 hover:opacity-100'}`}
                                />
                            ))}
                        </div>
                        {!zonaEditando && (
                            <SelectorBuscable
                                value={embajadorId}
                                onChange={setEmbajadorId}
                                opciones={opcVendedores}
                                placeholder="Sin asignar"
                                buscarPlaceholder="Buscar vendedor…"
                                testid="zona-vendedor-nuevo"
                            />
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={cancelarForm} className="flex-1 rounded-[10px] border border-borde px-3 py-2 text-[13px] text-texto-2 transition hover:bg-superficie">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                data-testid="zona-guardar"
                                onClick={guardarZona}
                                disabled={!nombre.trim() || crear.isPending || editar.isPending}
                                className="flex-1 rounded-[10px] bg-marca px-3 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Lista de zonas */
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                        {isLoading ? (
                            <div className="rounded-[10px] border border-borde px-3 py-6 text-center text-[13px] text-texto-3">Cargando…</div>
                        ) : zonas.length === 0 ? (
                            <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                                {ciudadId
                                    ? 'Esta ciudad no tiene zonas. Dibuja la primera con "Nueva zona".'
                                    : 'Elige una ciudad para ver/dibujar sus zonas.'}
                            </div>
                        ) : (
                            zonas.map((z) => (
                                <div key={z.id} data-testid={`zona-${z.id}`} className="flex flex-col gap-1.5 rounded-[10px] border border-borde bg-superficie p-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: z.color ?? '#2563eb' }} />
                                        <button type="button" data-testid={`zona-ir-${z.id}`} onClick={() => enfocarZona(z)} title="Ir a la zona" className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium text-texto transition hover:text-marca">{z.nombre}</button>
                                        {z.puedoEditar && (
                                            <button
                                                type="button"
                                                data-testid={`zona-editar-${z.id}`}
                                                onClick={() => editarZonaInline(z)}
                                                title="Editar zona"
                                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-marca-suave hover:text-marca"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                        {z.puedoEditar && (
                                            <button
                                                type="button"
                                                data-testid={`zona-borrar-${z.id}`}
                                                onClick={() => setZonaABorrar({ id: z.id, nombre: z.nombre })}
                                                title="Borrar zona"
                                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-peligro-suave hover:text-peligro"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                    {z.puedoEditar ? (
                                        <SelectorBuscable
                                            value={z.embajadorId ?? ''}
                                            onChange={(id) => asignar.mutate({ id: z.id, embajadorId: id || null })}
                                            opciones={opcVendedores}
                                            placeholder="Sin asignar"
                                            buscarPlaceholder="Buscar vendedor…"
                                            testid={`zona-vendedor-${z.id}`}
                                        />
                                    ) : (
                                        <span className="truncate text-[12px] text-texto-3">{z.vendedorNombre ?? 'Sin asignar'} · {z.ciudadNombre ?? '—'}</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </aside>
            )}

            {/* Confirmar borrado */}
            {zonaABorrar && (
                <DialogoConfirmar
                    abierto
                    variante="danger"
                    titulo="Borrar zona"
                    mensaje={`Se eliminará la zona "${zonaABorrar.nombre}". Esta acción no se puede deshacer.`}
                    textoConfirmar="Borrar"
                    cargando={borrar.isPending}
                    onCerrar={() => setZonaABorrar(null)}
                    onConfirmar={() => borrar.mutate(zonaABorrar.id, { onSuccess: () => setZonaABorrar(null) })}
                />
            )}
        </div>
    );
}

export default SeccionTerritorios;
