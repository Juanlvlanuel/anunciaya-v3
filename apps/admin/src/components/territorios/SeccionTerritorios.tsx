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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, Store, X, MapPin, StickyNote } from 'lucide-react';
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
    useActualizarNotaNegocio,
    useMisMarcas,
    useCrearMarca,
    useEditarMarca,
    useMoverMarca,
    useBorrarMarca,
    useMisNotasNegocio,
} from '../../hooks/queries/useTerritoriosAdmin';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { MapaTerritorios } from './MapaTerritorios';
import { HojaMovil } from './HojaMovil';
import { VistaVendedorTerritorio } from './VistaVendedorTerritorio';
import { PanelNotasNegocios, type NotaListItem } from './PanelNotasNegocios';
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
    // El gerente TAMBIÉN tiene figura de vendedor (embajador propio, ver reference_gerente_tambien_vendedor)
    // y puede querer prospectar sin tener una zona propia — a diferencia del vendedor (siempre nace con
    // una), aquí elige la CIUDAD en vez de depender de un territorio. El super nunca pone puntos.
    const esGerente = rol === 'gerente';
    const esEscritorio = useEsEscritorio();

    const [ciudadId, setCiudadId] = useState('');
    const { data: ciudades = [] } = useCiudadesDelAlcance(puedeEditar);
    // Con una sola ciudad en el alcance (hoy: solo Puerto Peñasco), el selector "Todas mis ciudades"
    // no tiene nada que elegir — se autoselecciona sin pedirle nada al usuario (el dropdown se oculta
    // más abajo). El mapa además ya arranca centrado en Puerto Peñasco (ver `MapaTerritorios.tsx`).
    useEffect(() => {
        if (ciudades.length === 1 && !ciudadId) setCiudadId(ciudades[0].id);
    }, [ciudades, ciudadId]);
    const { data: vendedores = [] } = useVendedoresAsignables(puedeEditar);
    const { data: zonas = [], isLoading, isError } = useZonas(ciudadId ? { ciudadId } : {});
    const { data: marcas = [] } = useMarcasEquipo(ciudadId || undefined, puedeEditar);
    const { data: negocios = [] } = useNegociosMapa(ciudadId || undefined, puedeEditar);
    const { data: misMarcas = [] } = useMisMarcas(esGerente);
    const { data: notasNegocio = [], isLoading: cargandoNotas } = useMisNotasNegocio(esGerente);
    const crear = useCrearZona();
    const editar = useEditarZona();
    const asignar = useAsignarZona();
    const borrar = useBorrarZona();
    const actualizarNotaNegocio = useActualizarNotaNegocio();
    const crearMiMarca = useCrearMarca();
    const editarMiMarca = useEditarMarca();
    const moverMiMarca = useMoverMarca();
    const borrarMiMarca = useBorrarMarca();

    // "Mis notas" (solo gerente, tiene embajador propio): página completa con todas mis notas
    // guardadas, buscable por nombre de negocio. El super nunca tiene negocios "suyos".
    const [vista, setVista] = useState<'mapa' | 'notas'>('mapa');
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
    // "Ver en el mapa" de un negocio desde "Mis notas": vuela a sus coordenadas exactas (no depende
    // de esperar a que carguen los negocios de la ciudad — ya trae lat/lng desde la nota).
    const [focoPunto, setFocoPunto] = useState<{ coords: [number, number]; nonce: number } | null>(null);
    // Estado de la hoja móvil (peek/expandida). En escritorio no se usa.
    const [hojaExpandida, setHojaExpandida] = useState(false);
    // Panel derecho en móvil horizontal: visible u oculto (deslizado a la derecha).
    const [panelAbierto, setPanelAbierto] = useState(true);

    // "Mis puntos" (gerente, G.2 sin zona propia): igual patrón que el editor de marca del vendedor.
    const [modoAgregarMarca, setModoAgregarMarca] = useState(false);
    const [marcaEditando, setMarcaEditando] = useState<{ id: string | null; tipo: TipoMarca; nombre: string; telefono: string; nota: string } | null>(null);
    const [confirmarBorrarMarca, setConfirmarBorrarMarca] = useState(false);
    // Menú del FAB "+" único (gerente: elige entre "Dibujar zona" y "Agregar punto"; el super, al no
    // tener la 2ª opción, entra directo a dibujar sin menú).
    const [menuAgregarAbierto, setMenuAgregarAbierto] = useState(false);

    // Cerrar el editor de "mi punto" al hacer click/tap FUERA de él (mismo patrón que el editor de
    // marca del vendedor). 'click' (no 'pointerdown') para que arrastrar el mapa no lo cierre.
    const formMarcaGerenteRef = useRef<HTMLDivElement>(null);
    // Ignora el click-fuera justo tras CREAR/ABRIR: el mismo tap que dispara la apertura (o su "ghost
    // click" en táctil) llegaría al listener y cerraría el editor recién abierto.
    const ignorarCierreMarcaRef = useRef(false);
    useEffect(() => {
        if (!marcaEditando || confirmarBorrarMarca) return;
        const alClickFuera = (e: MouseEvent) => {
            if (ignorarCierreMarcaRef.current) return;
            if (formMarcaGerenteRef.current && !formMarcaGerenteRef.current.contains(e.target as Node)) setMarcaEditando(null);
        };
        document.addEventListener('click', alClickFuera);
        return () => document.removeEventListener('click', alClickFuera);
    }, [marcaEditando, confirmarBorrarMarca]);

    // Al terminar de dibujar (aparece el formulario) la hoja se expande para verlo;
    // al empezar a dibujar se colapsa a peek para no tapar el mapa.
    // Al dibujar/nombrar (modo dibujo o mini-form abierto) la hoja se colapsa a peek para no tapar
    // el mapa ni el mini-form. (El mini-form vive sobre el mapa, ya no en la hoja.)
    useEffect(() => {
        if (dibujando || poligonoNuevo || modoAgregarMarca || marcaEditando) setHojaExpandida(false);
    }, [dibujando, poligonoNuevo, modoAgregarMarca, marcaEditando]);

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

    // "Mis notas" (solo gerente): une mis negocios con nota + TODOS mis puntos (tengan o no nota) en
    // una sola lista buscable por nombre — reemplaza la antigua lista aparte "Mis puntos" (30 jul,
    // eran casi lo mismo). Reusa los datos ya cargados (sin pedirlos de nuevo).
    const notasUnificadas: NotaListItem[] = useMemo(() => {
        if (!esGerente) return [];
        const deNegocios: NotaListItem[] = notasNegocio.map((n) => ({
            id: `negocio-${n.id}`, entidadId: n.id, nombre: n.nombre, nota: n.nota,
            origen: 'negocio', subtitulo: n.ciudadNombre, lat: n.lat, lng: n.lng, ciudadId: n.ciudadId,
        }));
        const deMarcas: NotaListItem[] = misMarcas.map((m) => ({
            id: `marca-${m.id}`, entidadId: m.id, nombre: m.nombre || ETIQUETA_TIPO[m.tipo], nota: m.nota ?? '',
            origen: 'marca', subtitulo: ETIQUETA_TIPO[m.tipo], lat: m.lat, lng: m.lng,
        }));
        return [...deNegocios, ...deMarcas].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [esGerente, notasNegocio, misMarcas]);

    /** "Ver en el mapa" de una tarjeta en "Mis notas": si es un negocio, cambia a su ciudad (si hace
     *  falta) Y vuela a sus coordenadas exactas; si es una de mis marcas, abre su editor directo. */
    const irANotaEnMapa = (n: NotaListItem) => {
        setVista('mapa');
        if (n.origen === 'negocio') {
            if (n.ciudadId && n.ciudadId !== ciudadId) setCiudadId(n.ciudadId);
            setFocoPunto((f) => ({ coords: [n.lng, n.lat], nonce: (f?.nonce ?? 0) + 1 }));
            return;
        }
        abrirMarca(n.entidadId);
    };

    const ciudadSel = useMemo(() => ciudades.find((c) => c.id === ciudadId), [ciudades, ciudadId]);
    // Memoizado: sin esto, `centro` era un array NUEVO en cada render (así ciudadSel no cambiara) y
    // MapaTerritorios lo recibe como dependencia de efecto — cualquier re-render ajeno (abrir un menú,
    // etc.) volvía a "armar" el reencuadre pendiente y cortaba a medias el vuelo cinematográfico de 2.6s
    // con un snap instantáneo justo después. Con la referencia estable, el efecto solo reacciona cuando
    // la ciudad realmente cambia.
    const centro: [number, number] | null = useMemo(
        () => (ciudadSel && ciudadSel.lng != null && ciudadSel.lat != null ? [ciudadSel.lng, ciudadSel.lat] : null),
        [ciudadSel],
    );

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
        setMenuAgregarAbierto(false);
        enfocarZona(z);
    };

    const cancelarForm = () => {
        setPoligonoNuevo(null);
        setZonaEditando(null);
        setDibujando(false);
        setMenuAgregarAbierto(false);
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

    // ── "Mis puntos" del gerente (sin zona propia — la ciudad elegida hace ese papel) ────────────

    /** Toca el mapa en modo "Agregar punto": crea el punto EN LA CIUDAD elegida y abre su editor al
     *  instante (optimista), igual que el flujo del vendedor. */
    const alAgregarMarca = (lat: number, lng: number) => {
        if (!ciudadId) return;
        setModoAgregarMarca(false);
        ignorarCierreMarcaRef.current = true;
        window.setTimeout(() => { ignorarCierreMarcaRef.current = false; }, 400);
        setMarcaEditando({ id: null, tipo: 'visitado', nombre: '', telefono: '', nota: '' });
        crearMiMarca.mutate(
            { lat, lng, tipo: 'visitado', ciudadId },
            { onSuccess: (data) => setMarcaEditando((p) => (p && p.id === null ? { ...p, id: data.id } : p)) },
        );
    };

    /** Abre el editor de uno de mis puntos existentes (clic en el pin o "editar" desde la lista). */
    const abrirMarca = (id: string) => {
        const m = misMarcas.find((x) => x.id === id);
        if (!m) return;
        // Ignora el click-fuera del propio gesto: el botón "editar" de la lista no hace stopPropagation
        // como el pin → sin esto, su click cerraría el editor recién abierto.
        ignorarCierreMarcaRef.current = true;
        window.setTimeout(() => { ignorarCierreMarcaRef.current = false; }, 400);
        setModoAgregarMarca(false);
        setMenuAgregarAbierto(false);
        setMarcaEditando({ id: m.id, tipo: m.tipo as TipoMarca, nombre: m.nombre ?? '', telefono: m.telefono ?? '', nota: m.nota ?? '' });
    };

    const guardarMarca = () => {
        if (!marcaEditando?.id) return;
        editarMiMarca.mutate(
            { id: marcaEditando.id, datos: { tipo: marcaEditando.tipo, nombre: marcaEditando.nombre.trim() || null, telefono: marcaEditando.telefono.trim() || null, nota: marcaEditando.nota.trim() || null } },
            { onSuccess: () => setMarcaEditando(null) },
        );
    };

    const borrarMarcaConfirmada = () => {
        if (!marcaEditando?.id) return;
        borrarMiMarca.mutate(marcaEditando.id); // optimista: el pin se va al instante (revierte si falla)
        setConfirmarBorrarMarca(false);
        setMarcaEditando(null);
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
            enfocarPunto={focoPunto?.coords ?? null}
            enfocarPuntoNonce={focoPunto?.nonce ?? 0}
            onPoligonoCompleto={alPoligonoCompleto}
            mapaFijo={!esEscritorio && !esHorizontal}
            onGuardarNotaNegocio={(id, nota) => actualizarNotaNegocio.mutate({ id, nota })}
            guardandoNotaNegocio={actualizarNotaNegocio.isPending}
            misMarcas={esGerente ? misMarcas : []}
            modoAgregarMarca={modoAgregarMarca}
            onAgregarMarca={alAgregarMarca}
            onClicMiMarca={abrirMarca}
            onMoverMiMarca={(id, lat, lng) => moverMiMarca.mutate({ id, lat, lng })}
            miMarcaSeleccionadaId={marcaEditando?.id ?? null}
        />
    );

    // Con una sola ciudad en el alcance no hay nada que elegir — el dropdown no aporta (ya se
    // autoseleccionó arriba). Se oculta por completo en vez de mostrar un selector inerte.
    const piezaCiudad = ciudades.length <= 1 ? null : (
        <SelectorBuscable
            value={ciudadId}
            onChange={(id) => { setCiudadId(id); setDibujando(false); }}
            opciones={opcCiudades}
            placeholder="Elige una ciudad…"
            buscarPlaceholder="Buscar ciudad…"
            testid="territorios-ciudad"
            textoClase="text-[13.5px]"
            paddingClase="px-3 py-3"
            redondo
        />
    );

    // Filtro de las marcas del equipo (lectura): mismo set que se pinta en el mapa. En la hoja móvil
    // (`carrusel`) van en 1 sola fila deslizable; en el panel de PC se acomodan en varias filas.
    const hayFiltros = !poligonoNuevo && marcas.length > 0;
    const piezaFiltros = (carrusel: boolean) => (hayFiltros ? (
        <div className={carrusel
            ? 'flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'flex flex-wrap gap-1'}>
            {TIPOS_MARCA.map((t) => {
                const activo = filtroMarca === t;
                return (
                    <button
                        key={t}
                        type="button"
                        data-testid={`filtro-marca-${t}`}
                        onClick={() => setFiltroMarca((f) => (f === t ? null : t))}
                        aria-pressed={activo}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
                        style={activo ? { background: `color-mix(in srgb, ${COLOR_TIPO[t]} 12%, transparent)`, borderColor: `color-mix(in srgb, ${COLOR_TIPO[t]} 34%, transparent)`, color: COLOR_TIPO[t] } : undefined}
                    >
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                        {ETIQUETA_TIPO[t]}
                    </button>
                );
            })}
        </div>
    ) : null);

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
                        className={`grid h-[52px] w-[52px] place-items-center rounded-full border shadow-tarjeta-panel transition ${mostrarNegocios ? 'border-marca bg-marca text-white' : 'border-borde bg-superficie text-texto-3'}`}
                    >
                        <Store size={22} />
                    </button>
                </Tooltip>
            </div>
        ) : null;

    // FAB único "+" sobre el mapa. El super (sin la opción de puntos) entra DIRECTO a dibujar una zona,
    // igual que antes. El gerente abre un menú de 2 opciones ("Dibujar zona" / "Agregar punto") porque
    // ahora tiene ambas acciones. Mientras cualquiera de las dos esté en curso, el mismo botón se
    // convierte en "Cancelar" (◯→✕) para esa acción — el Cancelar vive en el FAB, no en cada mini-form.
    const fabAgregar = (posicion: string) => {
        if (poligonoNuevo || marcaEditando) return null; // esos mini-form ya tienen su propio Cancelar
        const enModo = dibujando || modoAgregarMarca;
        if (enModo) {
            return (
                <div className={`absolute z-10 ${posicion}`}>
                    <Tooltip text="Cancelar" position="left">
                        <button
                            type="button"
                            data-testid="territorios-cancelar-agregar"
                            onClick={() => { if (dibujando) cancelarForm(); if (modoAgregarMarca) setModoAgregarMarca(false); }}
                            aria-label="Cancelar"
                            className="grid h-[52px] w-[52px] place-items-center rounded-full bg-marca text-white shadow-tarjeta-panel transition hover:opacity-90"
                        >
                            <X size={26} />
                        </button>
                    </Tooltip>
                </div>
            );
        }
        const deshabilitado = !ciudadId;
        const alClicPrincipal = () => {
            if (deshabilitado) return;
            if (!esGerente) { setDibujando(true); return; } // super: sin menú, una sola opción
            setMenuAgregarAbierto((v) => !v);
        };
        return (
            <div className={`absolute z-10 flex flex-col items-end gap-2 ${posicion}`}>
                {esGerente && menuAgregarAbierto && (
                    <>
                        <Tooltip text="Agregar punto" position="left">
                            <button
                                type="button"
                                data-testid="territorios-opcion-punto"
                                onClick={() => { setMenuAgregarAbierto(false); setModoAgregarMarca(true); }}
                                aria-label="Agregar punto"
                                className="grid h-[46px] w-[46px] place-items-center rounded-full border border-borde bg-superficie text-marca shadow-tarjeta-panel transition hover:bg-marca-suave"
                            >
                                <MapPin size={20} />
                            </button>
                        </Tooltip>
                        <Tooltip text="Dibujar zona" position="left">
                            <button
                                type="button"
                                data-testid="territorios-opcion-zona"
                                onClick={() => { setMenuAgregarAbierto(false); setDibujando(true); }}
                                aria-label="Dibujar zona"
                                className="grid h-[46px] w-[46px] place-items-center rounded-full border border-borde bg-superficie text-marca shadow-tarjeta-panel transition hover:bg-marca-suave"
                            >
                                <Pencil size={18} />
                            </button>
                        </Tooltip>
                    </>
                )}
                <Tooltip text={deshabilitado ? 'Elige una ciudad primero' : (esGerente ? 'Agregar' : 'Nueva zona')} position="left">
                    <button
                        type="button"
                        data-testid="territorios-agregar"
                        onClick={alClicPrincipal}
                        disabled={deshabilitado}
                        aria-label="Agregar"
                        aria-expanded={esGerente ? menuAgregarAbierto : undefined}
                        className={`grid h-[52px] w-[52px] place-items-center rounded-full bg-marca text-white shadow-tarjeta-panel transition hover:opacity-90 disabled:bg-marca-suave disabled:text-marca ${menuAgregarAbierto ? 'rotate-45' : ''}`}
                    >
                        <Plus size={26} />
                    </button>
                </Tooltip>
            </div>
        );
    };

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

    // Mini-form de "mi punto" (nuevo o en edición): mismo patrón que el editor de marca del vendedor
    // (estado + nota + borrar/guardar), sin selector de zona porque el punto no depende de una.
    const miniFormMarca = marcaEditando ? (
        <div ref={formMarcaGerenteRef} className="absolute left-3 top-3 z-30 w-[min(420px,calc(100%-1.5rem))] rounded-[14px] border border-borde bg-superficie p-3 shadow-tarjeta-panel" data-testid="form-marca-gerente">
            <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-texto">{marcaEditando.id ? 'Editar punto' : 'Nuevo punto'}</span>
                <button type="button" onClick={() => setMarcaEditando(null)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full text-texto-3 transition hover:bg-superficie-2">
                    <X size={20} />
                </button>
            </div>
            <div className="flex flex-wrap gap-1">
                {TIPOS_MARCA.map((t) => (
                    <button
                        key={t}
                        type="button"
                        data-testid={`marca-gerente-tipo-${t}`}
                        onClick={() => setMarcaEditando((p) => (p ? { ...p, tipo: t } : p))}
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1.5 text-[13px] transition ${
                            marcaEditando.tipo === t ? 'border-marca bg-marca-suave font-medium text-texto' : 'border-borde text-texto-2 hover:bg-superficie-2'
                        }`}
                    >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                        {ETIQUETA_TIPO[t]}
                    </button>
                ))}
            </div>
            <input
                data-testid="marca-gerente-nombre"
                value={marcaEditando.nombre}
                onChange={(e) => setMarcaEditando((p) => (p ? { ...p, nombre: e.target.value } : p))}
                placeholder="Nombre del negocio (opcional)"
                className="mt-2 w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[14px] text-texto outline-none focus:border-marca"
            />
            <input
                data-testid="marca-gerente-telefono"
                type="tel"
                value={marcaEditando.telefono}
                onChange={(e) => setMarcaEditando((p) => (p ? { ...p, telefono: e.target.value } : p))}
                placeholder="Teléfono o celular (opcional)"
                className="mt-2 w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[14px] text-texto outline-none focus:border-marca"
            />
            <textarea
                data-testid="marca-gerente-nota"
                value={marcaEditando.nota}
                onChange={(e) => setMarcaEditando((p) => (p ? { ...p, nota: e.target.value } : p))}
                placeholder="Nota (ej. contactar la próxima semana…)"
                rows={8}
                className="mt-2 w-full resize-none rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[14px] text-texto outline-none focus:border-marca"
            />
            <div className="mt-2 flex gap-2">
                <button
                    type="button"
                    data-testid="marca-gerente-borrar"
                    onClick={() => setConfirmarBorrarMarca(true)}
                    disabled={!marcaEditando.id}
                    aria-label="Borrar punto"
                    className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-borde px-3 py-2 text-[13px] text-texto-3 transition hover:bg-peligro-suave hover:text-peligro disabled:opacity-40"
                >
                    <Trash2 size={16} /> Borrar
                </button>
                <button
                    type="button"
                    data-testid="marca-gerente-guardar"
                    onClick={guardarMarca}
                    disabled={editarMiMarca.isPending || !marcaEditando.id}
                    className="flex-1 rounded-[10px] bg-marca px-3 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                >
                    Guardar
                </button>
            </div>
        </div>
    ) : null;

    // Lista de zonas (en el panel/hoja). El formulario ya NO vive aquí: salió al mini-form del mapa.
    const piezaLista = (
        <div className="flex shrink-0 flex-col">
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
                    <div key={z.id} data-testid={`zona-${z.id}`} className="flex flex-col gap-1.5 border-b border-borde py-2.5 last:border-b-0">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: z.color ?? '#2563eb' }} />
                            <span data-testid={`zona-nombre-${z.id}`} className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-texto">{z.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {z.puedoEditar ? (
                                <div className="min-w-0 flex-1">
                                    <SelectorBuscable
                                        value={z.embajadorId ?? ''}
                                        onChange={(id) => asignar.mutate({ id: z.id, embajadorId: id || null })}
                                        opciones={opcVendedores}
                                        placeholder="Sin asignar"
                                        buscarPlaceholder="Buscar vendedor…"
                                        testid={`zona-vendedor-${z.id}`}
                                        textoClase="text-[13.5px]"
                                        redondo
                                    />
                                </div>
                            ) : (
                                <span className="min-w-0 flex-1 truncate text-[12px] text-texto-3">{z.vendedorNombre ?? 'Sin asignar'} · {z.ciudadNombre ?? '—'}</span>
                            )}
                            <div className="flex shrink-0 items-center gap-1.5">
                                {/* Ver la zona en el mapa (antes era el clic en el nombre). Siempre disponible,
                                    también en zonas que el rol no edita. Círculo con el color de la zona. */}
                                <Tooltip text="Ver en el mapa">
                                    <button
                                        type="button"
                                        data-testid={`zona-ir-${z.id}`}
                                        onClick={() => enfocarZona(z)}
                                        aria-label="Ver zona en el mapa"
                                        style={{ backgroundColor: `${z.color ?? '#2563eb'}1f`, color: z.color ?? '#2563eb' }}
                                        className="grid h-10 w-10 place-items-center rounded-full transition hover:opacity-80"
                                    >
                                        <MapPin size={20} />
                                    </button>
                                </Tooltip>
                                {z.puedoEditar && (
                                    <Tooltip text="Editar zona">
                                        <button
                                            type="button"
                                            data-testid={`zona-editar-${z.id}`}
                                            onClick={() => editarZonaInline(z)}
                                            aria-label="Editar zona"
                                            className="grid h-10 w-10 place-items-center rounded-full bg-marca-suave text-marca transition hover:opacity-80"
                                        >
                                            <Pencil size={20} />
                                        </button>
                                    </Tooltip>
                                )}
                                {z.puedoEditar && (
                                    <Tooltip text="Borrar zona">
                                        <button
                                            type="button"
                                            data-testid={`zona-borrar-${z.id}`}
                                            onClick={() => setZonaABorrar({ id: z.id, nombre: z.nombre })}
                                            aria-label="Borrar zona"
                                            className="grid h-10 w-10 place-items-center rounded-full bg-peligro-suave text-peligro transition hover:opacity-80"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
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

    const dialogoBorrarMarca = confirmarBorrarMarca ? (
        <DialogoConfirmar
            abierto
            variante="danger"
            titulo="Borrar punto"
            mensaje="Se eliminará este punto y su nota. Esta acción no se puede deshacer."
            textoConfirmar="Borrar"
            cargando={borrarMiMarca.isPending}
            onCerrar={() => setConfirmarBorrarMarca(false)}
            onConfirmar={borrarMarcaConfirmada}
        />
    ) : null;

    // "Mis puntos" como lista aparte se retiró (30 jul): quedó unificada dentro de "Mis notas"
    // (PanelNotasNegocios), que ahora también lista los puntos sin nota. Ver notasUnificadas.

    // "Mis notas" (solo gerente: tiene embajador propio, puede tener negocios en su cartera).
    const botonNotas = esGerente ? (
        <button
            type="button"
            data-testid="ir-notas"
            onClick={() => setVista('notas')}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-superficie-2"
        >
            <StickyNote size={14} /> Mis notas
        </button>
    ) : null;

    // Contenido del panel de gestión (ciudad + filtros + lista/form). El "Nueva zona" ya NO vive aquí:
    // es un FAB sobre el mapa en todos los layouts. `filtrosCarrusel`: en HORIZONTAL (panel angosto) los
    // 4 filtros van en 1 fila deslizable; en ESCRITORIO se acomodan con flex-wrap.
    const contenidoPanel = (filtrosCarrusel: boolean) => (
        <>
            {piezaCiudad && <div className="shrink-0">{piezaCiudad}</div>}
            {botonNotas && <div className="shrink-0">{botonNotas}</div>}
            {hayFiltros && <div className="shrink-0">{piezaFiltros(filtrosCarrusel)}</div>}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {piezaLista}
            </div>
        </>
    );

    // El panel de notas se arma una sola vez: en escritorio vive DENTRO de la columna derecha (el mapa
    // se sigue viendo); en móvil (vertical u horizontal) es página completa (early return más abajo).
    const panelNotas = (
        <PanelNotasNegocios
            items={notasUnificadas}
            cargando={cargandoNotas}
            onVolver={() => setVista('mapa')}
            onVerEnMapa={irANotaEnMapa}
            onGuardarNotaNegocio={(id, nota) => actualizarNotaNegocio.mutate({ id, nota })}
            guardandoNotaNegocio={actualizarNotaNegocio.isPending}
        />
    );

    if (vista === 'notas' && !esEscritorio) {
        return panelNotas;
    }

    // ── Móvil HORIZONTAL: mapa de fondo + panel de gestión 1/3 a la derecha, ocultable ──
    if (!esEscritorio && esHorizontal && puedeEditar) {
        return (
            <div className="relative h-full w-full overflow-hidden" data-testid="seccion-territorios">
                <div className="absolute inset-0">
                    {elMapa}
                    {botonNegocios('bottom-3 left-3')}
                    {/* FAB "+": sigue al panel — a su izquierda cuando está abierto, a la esquina cuando se cierra. */}
                    {fabAgregar(`bottom-3 transition-[right] duration-300 ${panelAbierto ? 'right-[calc(45%+0.75rem)]' : 'right-3'}`)}
                    {miniFormZona}
                    {miniFormMarca}
                </div>
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
                    {contenidoPanel(true)}
                </aside>
                {dialogoBorrar}
                {dialogoBorrarMarca}
            </div>
        );
    }

    // ── Móvil VERTICAL: mapa a pantalla completa + barra flotante + hoja con peek ───────
    if (!esEscritorio && puedeEditar) {
        return (
            <div className="relative h-full w-full overflow-hidden" data-testid="seccion-territorios">
                {/* Mapa FIJO al viewport: no se redimensiona cuando el header/nav del shell colapsan
                    (modo mapa), así la transición de la hoja NO provoca flash/estiramiento del canvas. El
                    header/nav (z-30) se superponen y, al ocultarse, revelan mapa ya renderizado. */}
                <div className="fixed inset-0 z-0">{elMapa}</div>
                {/* Overlay sin captura de eventos (pointer-events-none) para que los clics en zonas
                    vacías lleguen al mapa/controles de zoom (z-0); los hijos sí los reciben. */}
                <div className="pointer-events-none absolute inset-0 z-10 [&>*]:pointer-events-auto">
                    {botonNegocios('bottom-[64px] left-3')}
                    {fabAgregar('bottom-[64px] right-3')}
                    {miniFormZona}
                    {miniFormMarca}
                </div>

                {/* Barra flotante: solo la ciudad (el "Nueva zona" pasó a ser un FAB abajo a la derecha).
                    Se oculta mientras se DIBUJA o se nombra la zona; reaparece al cancelar o terminar.
                    Con una sola ciudad no hay selector que mostrar (piezaCiudad es null). */}
                {piezaCiudad && !dibujando && !poligonoNuevo && !modoAgregarMarca && !marcaEditando && (
                    <div className="absolute left-2 top-2 z-10 w-[70%] max-w-[260px]">
                        <div className="rounded-[10px] shadow-tarjeta-panel">{piezaCiudad}</div>
                    </div>
                )}

                {/* Hoja con peek: resumen + filtros asomados; al subir, negocios + lista */}
                <HojaMovil
                    expandida={hojaExpandida}
                    onExpandidaChange={setHojaExpandida}
                    resumen={piezaFiltros(true)}
                    altura="68%"
                >
                    {botonNotas && <div className="shrink-0">{botonNotas}</div>}
                    {piezaLista}
                </HojaMovil>

                {dialogoBorrar}
                {dialogoBorrarMarca}
            </div>
        );
    }

    // ── Escritorio: mapa a la izquierda + columna derecha de gestión ───────────
    return (
        <div className="flex h-full flex-col gap-3 lg:flex-row" data-testid="seccion-territorios">
            <div className="relative min-h-[320px] min-w-0 flex-1">
                {elMapa}
                {botonNegocios('bottom-3 left-3')}
                {puedeEditar && fabAgregar('bottom-3 right-3')}
                {miniFormZona}
                {miniFormMarca}
            </div>

            {puedeEditar && (
                <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-[420px] lg:pr-3 lg:pt-3">
                    {vista === 'notas' ? panelNotas : contenidoPanel(false)}
                </aside>
            )}

            {dialogoBorrar}
            {dialogoBorrarMarca}
        </div>
    );
}

export default SeccionTerritorios;
