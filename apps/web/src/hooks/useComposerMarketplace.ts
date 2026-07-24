/**
 * useComposerMarketplace.ts
 * ===========================
 * Estado del Composer de MarketPlace — réplica 1:1 del patrón usado en
 * `useComposerServicios.ts` pero con el shape del artículo MP.
 *
 * Diferencias con Servicios:
 *   - Sin `modo` (Ofrezco/Solicito) — todo es "vender un artículo".
 *   - Sin `categoria`, `modalidad`, `urgente`, `presupuesto rango`.
 *   - Precio = un solo entero (no discriminated union).
 *   - Condición + Acepta ofertas + Unidad de venta (campos exclusivos MP).
 *   - Zona = string única (no array).
 *   - Foto OBLIGATORIA mínimo 1 (en Servicios es opcional).
 *   - 4 confirmaciones legales (licito, enPoder, honesto, seguro).
 *
 * Persistencia: localStorage `aya:composer:marketplace:draft-{ns}`.
 *   - `v1` para creación (un solo borrador por usuario).
 *   - `edit-{articuloId}` para edición.
 *
 * Ubicación: apps/web/src/hooks/useComposerMarketplace.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CondicionArticulo, ModoArticulo } from '../types/marketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

const NAMESPACE_DEFAULT = 'v1';

function claveDraft(ns: string) {
    return `aya:composer:marketplace:draft-${ns}`;
}

// Mismos límites que el backend (`validations/marketplace.schema.ts`).
// Exportados para que el composer muestre un contador/hint en vivo — sin
// esto el usuario solo se enteraba del mínimo al chocar con el toast de
// error al intentar guardar.
export const TITULO_MIN = 10;
export const TITULO_MAX = 80;
const DESC_MAX = 1000;
const PRECIO_MAX = 999999;
const ZONA_MAX = 150;
const UNIDAD_MAX = 30;

// =============================================================================
// SHAPE DEL DRAFT
// =============================================================================

export interface ComposerMarketplaceDraft {
    /** Doble sentido: 'vendo' (venta) | 'busco' (demanda de compra). */
    modo: ModoArticulo;
    /** Categoría obligatoria (ambos modos). null = sin elegir. */
    categoriaId: number | null;

    // Visible arriba
    titulo: string;
    descripcion: string;
    /** String para permitir input vacío; se convierte a number al publicar.
     *  Solo aplica a modo='vendo'. */
    precio: string;

    // Presupuesto deseado — solo modo='busco'. Strings para permitir vacío.
    presupuestoMin: string;
    presupuestoMax: string;
    /** Pin al top del feed de búsquedas — solo modo='busco'. */
    urgente: boolean;

    // Fotos (URLs públicas R2 ya subidas, vía presigned URL).
    fotos: string[];
    fotoPortadaIndex: number;

    // Detalles (acordeón colapsable en la UI). Solo aplican a modo='vendo'.
    condicion: CondicionArticulo | null;
    aceptaOfertas: boolean | null;
    unidadVenta: string;

    // Ubicación — viene del GPS, se siembra automáticamente.
    latitud: number | null;
    longitud: number | null;
    ciudad: string | null;
    /** Zona aproximada (string única, mínimo 3 chars). */
    zonaAproximada: string;

    // Confirmaciones legales — backend pide 4 con su versión.
    confirmaciones: {
        licito: boolean;
        enPoder: boolean;
        honesto: boolean;
        seguro: boolean;
    };
}

const DRAFT_INICIAL: ComposerMarketplaceDraft = {
    modo: 'vendo',
    categoriaId: null,
    titulo: '',
    descripcion: '',
    precio: '',
    presupuestoMin: '',
    presupuestoMax: '',
    urgente: false,
    fotos: [],
    fotoPortadaIndex: 0,
    condicion: null,
    aceptaOfertas: null,
    unidadVenta: '',
    latitud: null,
    longitud: null,
    ciudad: null,
    zonaAproximada: '',
    confirmaciones: {
        licito: false,
        enPoder: false,
        honesto: false,
        seguro: false,
    },
};

// =============================================================================
// HELPERS
// =============================================================================

/** Parsea un string a entero positivo, devuelve null si vacío o inválido. */
export function parseEnteroPositivo(v: string): number | null {
    const limpio = v.replace(/[^\d]/g, '');
    if (!limpio) return null;
    const n = parseInt(limpio, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// =============================================================================
// PERSISTENCIA
// =============================================================================

function cargarDraft(ns: string): ComposerMarketplaceDraft {
    if (typeof window === 'undefined') return DRAFT_INICIAL;
    try {
        const raw = localStorage.getItem(claveDraft(ns));
        if (!raw) return DRAFT_INICIAL;
        const parsed = JSON.parse(raw) as Partial<ComposerMarketplaceDraft>;
        return { ...DRAFT_INICIAL, ...parsed };
    } catch {
        return DRAFT_INICIAL;
    }
}

function guardarDraft(ns: string, d: ComposerMarketplaceDraft) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(claveDraft(ns), JSON.stringify(d));
    } catch {
        /* noop */
    }
}

function limpiarDraftMarketplace(ns: string) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(claveDraft(ns));
    } catch {
        /* noop */
    }
}

/** Determina si un draft está vacío (sin cambios significativos del usuario). */
export function draftEstaIntacto(d: ComposerMarketplaceDraft): boolean {
    return (
        d.categoriaId === null &&
        d.titulo === '' &&
        d.descripcion === '' &&
        d.precio === '' &&
        d.presupuestoMin === '' &&
        d.presupuestoMax === '' &&
        !d.urgente &&
        d.fotos.length === 0 &&
        d.condicion === null &&
        d.aceptaOfertas === null &&
        d.unidadVenta === '' &&
        d.zonaAproximada === '' &&
        !d.confirmaciones.licito &&
        !d.confirmaciones.enPoder &&
        !d.confirmaciones.honesto &&
        !d.confirmaciones.seguro
    );
}

/** Compara dos drafts ignorando `modo` (usado para detectar cambios reales
 *  en modo edición, donde el draft nace prellenado y nunca está "vacío").
 *  Cambiar solo el toggle Vendo/Busco sin tocar nada más NO cuenta como
 *  "cambios sin guardar" — es solo corregir la intención, no contenido. El
 *  draft es 100% datos planos serializables, así que comparar su JSON
 *  (normalizando `modo` a un valor fijo en ambos lados) es correcto y evita
 *  listar cada campo a mano. */
function draftsIgualesSalvoModo(a: ComposerMarketplaceDraft, b: ComposerMarketplaceDraft): boolean {
    return JSON.stringify({ ...a, modo: 'vendo' }) === JSON.stringify({ ...b, modo: 'vendo' });
}

// =============================================================================
// VALIDACIÓN GLOBAL
// =============================================================================

export type CampoErrorComposerMP =
    | 'categoria'
    | 'titulo'
    | 'descripcion'
    | 'precio'
    | 'presupuesto'
    | 'fotos'
    | 'condicion'
    | 'unidadVenta'
    | 'zonaAproximada'
    | 'ubicacion'
    | 'confirmaciones';

export type ErroresComposerMP = Partial<Record<CampoErrorComposerMP, string>>;

export interface ResultadoValidacionMP {
    errores: ErroresComposerMP;
    valido: boolean;
    mensajeBoton: string | null;
}

export function validarComposerMP(
    d: ComposerMarketplaceDraft,
): ResultadoValidacionMP {
    const errores: ErroresComposerMP = {};
    const esBusco = d.modo === 'busco';

    // ── OBLIGATORIOS ────────────────────────────────────────────────
    if (d.categoriaId === null) {
        errores.categoria = 'Elige una categoría.';
    }

    const titLen = d.titulo.trim().length;
    if (titLen < TITULO_MIN) {
        errores.titulo =
            titLen === 0
                ? 'Escribe un título.'
                : `Faltan ${TITULO_MIN - titLen} caracteres en el título.`;
    } else if (titLen > TITULO_MAX) {
        errores.titulo = `El título no debe pasar de ${TITULO_MAX} caracteres.`;
    }

    if (!esBusco) {
        // ── VENDO: precio obligatorio + al menos 1 foto ──
        const precio = parseEnteroPositivo(d.precio);
        if (precio === null) {
            errores.precio = 'Escribe el precio.';
        } else if (precio > PRECIO_MAX) {
            errores.precio = `El precio máximo es $${PRECIO_MAX.toLocaleString('es-MX')}.`;
        }

        if (d.fotos.length < 1) {
            errores.fotos = 'Agrega al menos 1 foto.';
        }
    } else {
        // ── BUSCO: presupuesto opcional; si se llena, ambos y min ≤ max ──
        const min = parseEnteroPositivo(d.presupuestoMin);
        const max = parseEnteroPositivo(d.presupuestoMax);
        const algunoLleno = d.presupuestoMin.trim() !== '' || d.presupuestoMax.trim() !== '';
        if (algunoLleno) {
            if (min === null || max === null) {
                errores.presupuesto = 'Completa ambos montos o déjalos vacíos.';
            } else if (min > PRECIO_MAX || max > PRECIO_MAX) {
                errores.presupuesto = `El presupuesto máximo es $${PRECIO_MAX.toLocaleString('es-MX')}.`;
            } else if (max < min) {
                errores.presupuesto = 'El máximo debe ser mayor o igual al mínimo.';
            }
        }
    }

    if (d.latitud === null || d.longitud === null || !d.ciudad) {
        errores.ubicacion = 'Activa tu ubicación para continuar.';
    }

    const todasOk =
        d.confirmaciones.licito &&
        d.confirmaciones.enPoder &&
        d.confirmaciones.honesto &&
        d.confirmaciones.seguro;
    if (!todasOk) {
        errores.confirmaciones = 'Acepta las reglas de publicación.';
    }

    // ── OPCIONALES (validan solo límites máximos si hay contenido) ──
    const descLen = d.descripcion.trim().length;
    if (descLen > DESC_MAX) {
        errores.descripcion = `La descripción no debe pasar de ${DESC_MAX} caracteres.`;
    }

    if (d.unidadVenta.trim().length > UNIDAD_MAX) {
        errores.unidadVenta = `La unidad no debe pasar de ${UNIDAD_MAX} caracteres.`;
    }

    // Zona: opcional en ambos modos (Vendo y Busco). Solo validamos el máximo.
    if (d.zonaAproximada.trim().length > ZONA_MAX) {
        errores.zonaAproximada = `La zona no debe pasar de ${ZONA_MAX} caracteres.`;
    }

    const orden: CampoErrorComposerMP[] = [
        'categoria',
        'titulo',
        'descripcion',
        'precio',
        'presupuesto',
        'fotos',
        'condicion',
        'unidadVenta',
        'zonaAproximada',
        'ubicacion',
        'confirmaciones',
    ];
    let mensajeBoton: string | null = null;
    for (const k of orden) {
        if (errores[k]) {
            mensajeBoton = errores[k] ?? null;
            break;
        }
    }

    return {
        errores,
        valido: Object.keys(errores).length === 0,
        mensajeBoton,
    };
}

// =============================================================================
// HOOK
// =============================================================================

interface UseComposerMarketplaceOpts {
    /** Namespace para localStorage. Default `'v1'` (CREAR). Para EDITAR usar
     *  `'edit-{articuloId}'` para no mezclar borradores. */
    storageNamespace?: string;
}

export function useComposerMarketplace(opts: UseComposerMarketplaceOpts = {}) {
    const ns = opts.storageNamespace ?? NAMESPACE_DEFAULT;

    const [draft, setDraft] = useState<ComposerMarketplaceDraft>(() =>
        cargarDraft(ns),
    );

    // "Base de comparación" para detectar cambios reales: arranca en lo que
    // `cargarDraft` haya devuelto (vacío si no hay nada guardado, o el
    // borrador resumido de una sesión anterior) — NO en `DRAFT_INICIAL` fijo,
    // porque si quedó un borrador viejo en localStorage el composer marcaría
    // "hay cambios" de inmediato sin que el usuario haya tocado nada en esta
    // sesión. En edición, `hidratarDesdeArticulo` la mueve al contenido
    // original del artículo.
    const draftBaseRef = useRef<ComposerMarketplaceDraft>(draft);

    useEffect(() => {
        guardarDraft(ns, draft);
    }, [draft, ns]);

    const actualizar = useCallback(
        (
            cambio:
                | Partial<ComposerMarketplaceDraft>
                | ((d: ComposerMarketplaceDraft) => Partial<ComposerMarketplaceDraft>),
        ) => {
            setDraft((d) => {
                const patch = typeof cambio === 'function' ? cambio(d) : cambio;
                return { ...d, ...patch };
            });
        },
        [],
    );

    /** Setea las 4 confirmaciones legales con un solo valor — refleja la
     *  decisión de UI de compactar 4 checkboxes en 1. */
    const setConfirmacionesUnificadas = useCallback((acepta: boolean) => {
        setDraft((d) => ({
            ...d,
            confirmaciones: {
                licito: acepta,
                enPoder: acepta,
                honesto: acepta,
                seguro: acepta,
            },
        }));
    }, []);

    const limpiar = useCallback(() => {
        limpiarDraftMarketplace(ns);
        setDraft(DRAFT_INICIAL);
    }, [ns]);

    /** Hidrata el draft con valores de un artículo existente (modo edición).
     *  Llamar UNA SOLA VEZ cuando el artículo se carga (ref-guard). */
    /** Sembrado automático de ubicación (GPS) — NO es una edición del
     *  usuario, así que también actualiza la base de comparación para que
     *  `estaIntacto` no se dispare solo por esto (ver ComposerMarketplace,
     *  efecto de auto-siembra de GPS al montar). */
    const sembrarUbicacion = useCallback(
        (u: { latitud: number; longitud: number; ciudad: string | null }) => {
            setDraft((prev) => {
                const nuevo = { ...prev, latitud: u.latitud, longitud: u.longitud, ciudad: u.ciudad };
                draftBaseRef.current = { ...draftBaseRef.current, latitud: u.latitud, longitud: u.longitud, ciudad: u.ciudad };
                return nuevo;
            });
        },
        [],
    );

    const hidratarDesdeArticulo = useCallback(
        (d: Partial<ComposerMarketplaceDraft>) => {
            setDraft((prev) => {
                const nuevo = { ...prev, ...d };
                draftBaseRef.current = nuevo;
                return nuevo;
            });
        },
        [],
    );

    const validacion = useMemo(() => validarComposerMP(draft), [draft]);

    return {
        draft,
        actualizar,
        setConfirmacionesUnificadas,
        sembrarUbicacion,
        limpiar,
        hidratarDesdeArticulo,
        // Validación
        errores: validacion.errores,
        valido: validacion.valido,
        mensajeBoton: validacion.mensajeBoton,
        // Utilidades
        estaIntacto: draftsIgualesSalvoModo(draft, draftBaseRef.current),
    };
}

export default useComposerMarketplace;
