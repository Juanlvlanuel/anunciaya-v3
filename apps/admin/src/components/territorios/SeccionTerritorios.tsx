/**
 * SeccionTerritorios.tsx
 * ======================
 * Sección "Territorios" del Panel (Red de ventas).
 *
 *   - Escritorio (≥1024px): el MAPA ocupa todo a la izquierda; una COLUMNA DERECHA de 288px
 *     concentra todo — selector de ciudad, "Nueva zona", el formulario y la lista de zonas.
 *   - Móvil (<1024px): el MAPA es protagonista a pantalla completa; arriba flota una barra
 *     compacta (ciudad + "Zona") y abajo una HOJA con "peek" (HojaMovil) que asoma un resumen
 *     y se sube (arrastrando o tocando) para ver filtros, negocios y la lista de zonas.
 *
 * El vendedor tiene su propia vista ("Mi territorio"): solo su pedazo, sin acciones.
 * Dropdowns con el SelectorBuscable estándar del Panel (no <select> nativo).
 *
 * Ubicación: apps/admin/src/components/territorios/SeccionTerritorios.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, Store } from 'lucide-react';
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
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { MapaTerritorios } from './MapaTerritorios';
import { HojaMovil } from './HojaMovil';
import { VistaVendedorTerritorio } from './VistaVendedorTerritorio';
import { COLOR_TIPO, ETIQUETA_TIPO } from './MapaMarcas';
import { SelectorBuscable, type OpcionBuscable } from '../ui/SelectorBuscable';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
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
    const esEscritorio = useEsEscritorio();

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
    // Estado de la hoja móvil (peek/expandida). En escritorio no se usa.
    const [hojaExpandida, setHojaExpandida] = useState(false);
    // Panel derecho en móvil horizontal: visible u oculto (deslizado a la derecha).
    const [panelAbierto, setPanelAbierto] = useState(true);

    // Al terminar de dibujar (aparece el formulario) la hoja se expande para verlo;
    // al empezar a dibujar se colapsa a peek para no tapar el mapa.
    // Al dibujar/nombrar (modo dibujo o mini-form abierto) la hoja se colapsa a peek para no tapar
    // el mapa ni el mini-form. (El mini-form vive sobre el mapa, ya no en la hoja.)
    useEffect(() => { if (dibujando || poligonoNuevo) setHojaExpandida(false); }, [dibujando, poligonoNuevo]);

    // Orientación del teléfono: en HORIZONTAL (girado) ocultamos header + nav SIEMPRE (mapa total),
    // solo en este módulo. En vertical, las barras siguen a la hoja.
    const [esHorizontal, setEsHorizontal] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
    );
    useEffect(() => {
        const mql = window.matchMedia('(orientation: landscape)');
        const alCambiar = (e: MediaQueryListEvent) => setEsHorizontal(e.matches);
        mql.addEventListener('change', alCambiar);
        setEsHorizontal(mql.matches);
        return () => mql.removeEventListener('change', alCambiar);
    }, []);

    // "Modo mapa" (móvil): header y nav del shell. En VERTICAL siguen a la hoja (ocultos en peek,
    // visibles al subirla); en HORIZONTAL se ocultan SIEMPRE. Al salir de la sección, restaurar.
    const setNavVisible = useScrollPanel((s) => s.setNavVisible);
    const setHeaderVisible = useScrollPanel((s) => s.setHeaderVisible);
    useEffect(() => {
        if (esEscritorio) return;
        const barrasVisibles = esHorizontal ? false : hojaExpandida;
        setNavVisible(barrasVisibles);
        setHeaderVisible(barrasVisibles);
        return () => { setNavVisible(true); setHeaderVisible(true); };
    }, [esEscritorio, esHorizontal, hojaExpandida, setNavVisible, setHeaderVisible]);

    /** Vuela (zoom cine) hacia la zona al hacer clic en su nombre. Nonce para re-volar aunque sea la misma.
     *  En móvil colapsa la hoja a peek para que el vuelo no quede tapado (en escritorio no hay hoja). */
    const enfocarZona = (z: ZonaTerritorio) => {
        setFoco((f) => ({ poligono: z.poligono, nonce: (f?.nonce ?? 0) + 1 }));
        setHojaExpandida(false);
    };

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

    /** Entrar a editar una zona existente: precarga sus datos, abre el editor con su contorno y
     *  VUELA a la zona para que el modo dibujo sea visible (si no, en móvil se activa fuera de vista). */
    const editarZonaInline = (z: ZonaTerritorio) => {
        setZonaEditando(z);
        setNombre(z.nombre);
        setColor(z.color ?? COLORES[0]);
        setEmbajadorId(z.embajadorId ?? '');
        setPoligonoNuevo(null);
        setDibujando(true);
        enfocarZona(z);
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

    // ── Piezas de UI compartidas entre escritorio y móvil ──────────────────────

    const elMapa = isError ? (
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
    );

    const piezaCiudad = (
        <SelectorBuscable
            value={ciudadId}
            onChange={(id) => { setCiudadId(id); setDibujando(false); }}
            opciones={opcCiudades}
            placeholder="Elige una ciudad…"
            buscarPlaceholder="Buscar ciudad…"
            testid="territorios-ciudad"
        />
    );

    // Filtro de las marcas del equipo (lectura): mismo set que se pinta en el mapa.
    const piezaFiltros = !poligonoNuevo && marcas.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TIPOS_MARCA.map((t) => {
                const activo = filtroMarca === t;
                return (
                    <button
                        key={t}
                        type="button"
                        data-testid={`filtro-marca-${t}`}
                        onClick={() => setFiltroMarca((f) => (f === t ? null : t))}
                        aria-pressed={activo}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition ${activo ? 'border-marca bg-marca-suave font-medium text-texto' : 'border-borde text-texto-3 hover:bg-superficie-2'}`}
                    >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                        {ETIQUETA_TIPO[t]}
                    </button>
                );
            })}
        </div>
    ) : null;

    // Toggle de negocios como botón flotante (solo ícono) sobre el mapa. `posicion` ubica la esquina
    // según el layout (abajo-izquierda en horizontal/escritorio; bajo la barra de ciudad en vertical).
    const botonNegocios = (posicion: string) =>
        !poligonoNuevo ? (
            <div className={`absolute z-10 ${posicion}`}>
                <Tooltip text={mostrarNegocios ? 'Ocultar negocios' : 'Mostrar negocios'} position="right">
                    <button
                        type="button"
                        data-testid="toggle-negocios"
                        onClick={() => setMostrarNegocios((v) => !v)}
                        aria-pressed={mostrarNegocios}
                        aria-label={mostrarNegocios ? 'Ocultar negocios del mapa' : 'Mostrar negocios del mapa'}
                        className={`grid h-11 w-11 place-items-center rounded-full border shadow-tarjeta-panel transition ${mostrarNegocios ? 'border-marca bg-marca text-white' : 'border-borde bg-superficie text-texto-3'}`}
                    >
                        <Store size={18} />
                    </button>
                </Tooltip>
            </div>
        ) : null;

    // Mini-form sobre el MAPA (al Terminar de dibujar): nombre + colores + Guardar, sin cambiar de
    // pantalla. El vendedor se asigna después desde la lista. Enter guarda.
    const miniFormZona = poligonoNuevo ? (
        <div
            className="absolute left-3 top-3 z-30 w-[min(420px,calc(100%-1.5rem))] rounded-[14px] border border-borde bg-superficie p-3 shadow-tarjeta-panel"
            data-testid="form-nueva-zona"
        >
            <h2 className="mb-2 text-[13px] font-semibold text-texto">{zonaEditando ? 'Editar zona' : 'Nueva zona'}</h2>
            <input
                autoFocus
                data-testid="zona-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') guardarZona(); }}
                placeholder="Nombre de la zona (ej. Centro)"
                className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none focus:border-marca"
            />
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                    {COLORES.map((c) => (
                        <button
                            key={c}
                            type="button"
                            aria-label={`Color ${c}`}
                            onClick={() => setColor(c)}
                            style={{ backgroundColor: c }}
                            className={`h-6 w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-offset-superficie' : 'opacity-70 hover:opacity-100'}`}
                        />
                    ))}
                </div>
                <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={cancelarForm} className="rounded-[10px] border border-borde px-3 py-2 text-[13px] text-texto-2 transition hover:bg-superficie-2">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        data-testid="zona-guardar"
                        onClick={guardarZona}
                        disabled={!nombre.trim() || crear.isPending || editar.isPending}
                        className="rounded-[10px] bg-marca px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // Lista de zonas (en el panel/hoja). El formulario ya NO vive aquí: salió al mini-form del mapa.
    const piezaLista = (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
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
                            <button type="button" data-testid={`zona-ir-${z.id}`} onClick={() => enfocarZona(z)} className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium text-texto transition hover:text-marca">{z.nombre}</button>
                            {z.puedoEditar && (
                                <Tooltip text="Editar zona" className="shrink-0">
                                    <button
                                        type="button"
                                        data-testid={`zona-editar-${z.id}`}
                                        onClick={() => editarZonaInline(z)}
                                        aria-label="Editar zona"
                                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-marca-suave hover:text-marca"
                                    >
                                        <Pencil size={17} />
                                    </button>
                                </Tooltip>
                            )}
                            {z.puedoEditar && (
                                <Tooltip text="Borrar zona" className="shrink-0">
                                    <button
                                        type="button"
                                        data-testid={`zona-borrar-${z.id}`}
                                        onClick={() => setZonaABorrar({ id: z.id, nombre: z.nombre })}
                                        aria-label="Borrar zona"
                                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-peligro-suave hover:text-peligro"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
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
    );

    const dialogoBorrar = zonaABorrar ? (
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
    ) : null;

    // Contenido del panel de gestión (ciudad + nueva zona + filtros + negocios + lista/form). Se monta
    // en la columna derecha tanto en ESCRITORIO (288px) como en MÓVIL HORIZONTAL (1/3 de la pantalla).
    const contenidoPanel = (
        <>
            <div className="flex shrink-0 items-stretch gap-2">
                <div className="min-w-0 flex-1">{piezaCiudad}</div>
                {!poligonoNuevo && (
                    <Tooltip text={!ciudadId ? 'Elige una ciudad primero' : 'Dibujar una zona'} className="shrink-0 items-stretch">
                        <button
                            type="button"
                            data-testid="territorios-nueva-zona"
                            onClick={() => setDibujando(true)}
                            disabled={!ciudadId || dibujando}
                            aria-label="Nueva zona"
                            className="grid h-full shrink-0 place-items-center rounded-[10px] bg-marca px-3.5 text-white transition hover:opacity-90 disabled:opacity-40"
                        >
                            <Plus size={18} />
                        </button>
                    </Tooltip>
                )}
            </div>
            {piezaFiltros && (
                <div className="flex shrink-0 flex-col gap-1.5">
                    <span className="text-[11.5px] font-medium text-texto-3">Marcas del equipo ({marcasFiltradas.length})</span>
                    {piezaFiltros}
                </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{piezaLista}</div>
        </>
    );

    // ── Móvil HORIZONTAL: mapa de fondo + panel de gestión 1/3 a la derecha, ocultable ──
    if (!esEscritorio && esHorizontal && puedeEditar) {
        return (
            <div className="relative h-full w-full overflow-hidden" data-testid="seccion-territorios">
                <div className="absolute inset-0">{elMapa}{botonNegocios('bottom-3 left-3')}{miniFormZona}</div>
                <aside
                    className={`absolute inset-y-0 right-0 z-20 flex w-[45%] flex-col gap-2 border-l border-borde bg-superficie p-2.5 shadow-tarjeta-panel transition-transform duration-300 ${panelAbierto ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Tirador: desliza el panel hacia la derecha para ocultarlo (y lo trae de vuelta).
                        Queda asomado en el borde derecho de la pantalla cuando el panel está cerrado. */}
                    <button
                        type="button"
                        data-testid="territorios-toggle-panel"
                        onClick={() => setPanelAbierto((v) => !v)}
                        aria-label={panelAbierto ? 'Ocultar panel' : 'Mostrar panel'}
                        className="absolute left-0 top-1/2 grid h-14 w-7 -translate-x-full -translate-y-1/2 place-items-center rounded-l-[12px] border border-r-0 border-borde bg-superficie text-texto-3 shadow-tarjeta-panel transition hover:text-marca"
                    >
                        {panelAbierto ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    {contenidoPanel}
                </aside>
                {dialogoBorrar}
            </div>
        );
    }

    // ── Móvil VERTICAL: mapa a pantalla completa + barra flotante + hoja con peek ───────
    if (!esEscritorio && puedeEditar) {
        return (
            <div className="relative h-full w-full overflow-hidden" data-testid="seccion-territorios">
                <div className="absolute inset-0">{elMapa}{botonNegocios('bottom-[64px] left-3')}{miniFormZona}</div>

                {/* Barra flotante: ciudad + nueva zona. Se oculta mientras se DIBUJA o se nombra la zona
                    (la barra de dibujo / el mini-form ocupan el top); reaparece al cancelar o terminar. */}
                {!dibujando && !poligonoNuevo && (
                    <div className="absolute inset-x-2 top-2 z-10 flex gap-2">
                        <div className="min-w-0 flex-1 rounded-[10px] shadow-tarjeta-panel">{piezaCiudad}</div>
                        <button
                            type="button"
                            data-testid="territorios-nueva-zona"
                            onClick={() => setDibujando(true)}
                            disabled={!ciudadId || dibujando}
                            title={!ciudadId ? 'Elige una ciudad primero' : 'Dibujar una zona'}
                            className="flex shrink-0 items-center gap-1 rounded-[10px] bg-marca px-3 text-[13px] font-medium text-white shadow-tarjeta-panel transition hover:opacity-90 disabled:opacity-40"
                        >
                            <Plus size={16} /> Zona
                        </button>
                    </div>
                )}

                {/* Hoja con peek: resumen + filtros asomados; al subir, negocios + lista */}
                <HojaMovil
                    expandida={hojaExpandida}
                    onExpandidaChange={setHojaExpandida}
                    resumen={piezaFiltros}
                >
                    {piezaLista}
                </HojaMovil>

                {dialogoBorrar}
            </div>
        );
    }

    // ── Escritorio: mapa a la izquierda + columna derecha de gestión ───────────
    return (
        <div className="flex h-full flex-col gap-3 lg:flex-row" data-testid="seccion-territorios">
            <div className="relative min-h-[320px] min-w-0 flex-1">{elMapa}{botonNegocios('bottom-3 left-3')}{miniFormZona}</div>

            {puedeEditar && (
                <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72 lg:pr-3 lg:pt-3">
                    {contenidoPanel}
                </aside>
            )}

            {dialogoBorrar}
        </div>
    );
}

export default SeccionTerritorios;
