/**
 * useComposerServicios.ts
 * =========================
 * Estado del Composer de Servicios — formulario único que vive inline
 * en el feed de Servicios (`<ComposerSection>`). Reemplazó al wizard de
 * 3 pasos (eliminado en Sprint 9 — 20-May-2026).
 *
 * Características:
 *   - Un solo formulario; la validación es global (1 función) y
 *     devuelve un mapa de errores por campo para mostrarlos inline.
 *   - 2 campos separados (título y descripción) — decisión del producto.
 *     Límites: 10-80 chars (título) y 30-500 chars (descripción).
 *   - 3 confirmaciones legales se preservan en el draft (backend las
 *     necesita para auditoría) pero la UI las controla con 1 checkbox
 *     compactado que las setea todas a la vez.
 *
 * Persistencia: localStorage. Auto-save en cada cambio del draft.
 *   - aya:composer:servicios:draft-{ns}
 *
 * Edición: el componente que monta el hook pasa
 *   `storageNamespace: 'edit-{publicacionId}'` para que el borrador de
 *   edición no se mezcle con el de creación. Y `hidratarDesdePublicacion`
 *   inyecta los valores actuales una sola vez al cargar.
 *
 * Ubicación: apps/web/src/hooks/useComposerServicios.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    CategoriaClasificado,
    ModalidadServicio,
    ModoServicio,
    SubtipoPublicacion,
    TipoPublicacion,
} from '../types/servicios';

// =============================================================================
// CONSTANTES
// =============================================================================

const NAMESPACE_DEFAULT = 'v3';

function claveDraft(ns: string) {
    return `aya:composer:servicios:draft-${ns}`;
}

// Mismos límites que el backend (`validations/servicios.schema.ts`).
// Exportados para que el composer muestre un contador/hint en vivo — sin
// esto el usuario solo se enteraba del mínimo al chocar con el toast de
// error al intentar guardar.
export const TITULO_MIN = 10;
export const TITULO_MAX = 80;
const DESC_MAX = 500;
const ZONAS_MAX = 10;

// =============================================================================
// SHAPE DEL DRAFT
// =============================================================================

export interface ComposerServiciosDraft {
    // Modo del toggle Ofrezco/Solicito. Default lo decide el caller.
    modo: ModoServicio | null;

    // Texto
    categoria: CategoriaClasificado | null;
    titulo: string;
    descripcion: string;
    urgente: boolean;

    // Fotos (URLs públicas R2 ya subidas, vía presigned URL).
    fotos: string[];
    fotoPortadaIndex: number;

    // Detalles (acordeón colapsable en la UI).
    modalidad: ModalidadServicio | null;
    /** Strings para permitir vacío. Se convierten a number al publicar. */
    budgetMin: string;
    budgetMax: string;
    zonasAproximadas: string[];

    // Ubicación — viene del GPS, se siembra automáticamente.
    latitud: number | null;
    longitud: number | null;
    ciudad: string | null;

    // Confirmaciones legales — backend las necesita, UI las controla con
    // un solo checkbox compactado que las setea todas a la vez.
    confirmaciones: {
        legal: boolean;
        verdadera: boolean;
        coordinacion: boolean;
    };
}

const DRAFT_INICIAL: ComposerServiciosDraft = {
    modo: null,
    categoria: null,
    titulo: '',
    descripcion: '',
    urgente: false,
    fotos: [],
    fotoPortadaIndex: 0,
    modalidad: null,
    budgetMin: '',
    budgetMax: '',
    zonasAproximadas: [],
    latitud: null,
    longitud: null,
    ciudad: null,
    confirmaciones: {
        legal: false,
        verdadera: false,
        coordinacion: false,
    },
};

// =============================================================================
// HELPERS DE DERIVACIÓN (igual que el wizard)
// =============================================================================

/** Subtipo inferido por categoría dentro de modo=solicito. */
export function subtipoPorCategoria(
    c: CategoriaClasificado | null,
    modo: ModoServicio | null,
): SubtipoPublicacion | null {
    if (modo === 'ofrezco') return 'servicio-personal';
    if (!c) return null;
    if (c === 'empleo') return 'busco-empleo';
    return 'servicio-puntual';
}

/** Tipo inferido del modo. */
export function tipoPorModo(modo: ModoServicio | null): TipoPublicacion | null {
    if (modo === 'ofrezco') return 'servicio-persona';
    if (modo === 'solicito') return 'solicito';
    return null;
}

/** Parsea un string a entero positivo, devuelve null si vacío o inválido. */
export function parseEntero(v: string): number | null {
    const limpio = v.replace(/[^\d]/g, '');
    if (!limpio) return null;
    const n = parseInt(limpio, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// =============================================================================
// PERSISTENCIA
// =============================================================================

function cargarDraft(ns: string): ComposerServiciosDraft {
    if (typeof window === 'undefined') return DRAFT_INICIAL;
    try {
        const raw = localStorage.getItem(claveDraft(ns));
        if (!raw) return DRAFT_INICIAL;
        const parsed = JSON.parse(raw) as Partial<ComposerServiciosDraft>;
        return { ...DRAFT_INICIAL, ...parsed };
    } catch {
        return DRAFT_INICIAL;
    }
}

function guardarDraft(ns: string, d: ComposerServiciosDraft) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(claveDraft(ns), JSON.stringify(d));
    } catch {
        /* noop */
    }
}

function limpiarDraftServicios(ns: string) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(claveDraft(ns));
    } catch {
        /* noop */
    }
}

/** Determina si un draft está "vacío" — el usuario no ha llenado nada
 *  significativo. Útil para mostrar/no la pill "Continúa tu borrador" y
 *  para decidir si vale la pena pedir confirmación al cerrar. */
export function draftEstaIntacto(d: ComposerServiciosDraft): boolean {
    return (
        d.categoria === null &&
        d.titulo === '' &&
        d.descripcion === '' &&
        d.urgente === false &&
        d.fotos.length === 0 &&
        d.modalidad === null &&
        d.budgetMin === '' &&
        d.budgetMax === '' &&
        d.zonasAproximadas.length === 0 &&
        !d.confirmaciones.legal &&
        !d.confirmaciones.verdadera &&
        !d.confirmaciones.coordinacion
    );
}

/** Compara dos drafts ignorando `modo` (usado para detectar cambios reales
 *  en modo edición, donde el draft nace prellenado y nunca está "vacío").
 *  Cambiar solo el toggle Ofrezco/Solicito sin tocar nada más NO cuenta
 *  como "cambios sin guardar" — es solo corregir la intención, no
 *  contenido. El draft es 100% datos planos serializables, así que
 *  comparar su JSON (normalizando `modo` a un valor fijo en ambos lados)
 *  es correcto y evita listar cada campo a mano. */
function draftsIgualesSalvoModo(a: ComposerServiciosDraft, b: ComposerServiciosDraft): boolean {
    return JSON.stringify({ ...a, modo: 'ofrezco' }) === JSON.stringify({ ...b, modo: 'ofrezco' });
}

// =============================================================================
// VALIDACIÓN GLOBAL
// =============================================================================

/** Llaves de error que la UI puede mostrar inline bajo cada campo. */
export type CampoErrorComposer =
    | 'modo'
    | 'categoria'
    | 'titulo'
    | 'descripcion'
    | 'modalidad'
    | 'presupuesto'
    | 'zonas'
    | 'ubicacion'
    | 'confirmaciones';

export type ErroresComposer = Partial<Record<CampoErrorComposer, string>>;

export interface ResultadoValidacionComposer {
    errores: ErroresComposer;
    valido: boolean;
    /** Mensaje único para mostrar arriba del botón Publicar cuando hay
     *  errores. Toma el primer error en orden de aparición visual. */
    mensajeBoton: string | null;
}

export function validarComposer(
    d: ComposerServiciosDraft,
): ResultadoValidacionComposer {
    const errores: ErroresComposer = {};

    // ── OBLIGATORIOS ────────────────────────────────────────────────
    // Solo Modo, Título, Ubicación GPS y Confirmaciones legales son
    // obligatorios (decisión 2026-05-20). Descripción, Categoría,
    // Modalidad, Presupuesto, Zonas, Fotos y Urgente son opcionales —
    // si el usuario los llena bien, mejor; si no, igual puede publicar.
    if (!d.modo) {
        errores.modo = 'Elige si ofreces o solicitas.';
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

    if (d.latitud === null || d.longitud === null || !d.ciudad) {
        errores.ubicacion = 'Activa tu ubicación para continuar.';
    }

    const todasOk =
        d.confirmaciones.legal &&
        d.confirmaciones.verdadera &&
        d.confirmaciones.coordinacion;
    if (!todasOk) {
        errores.confirmaciones = 'Acepta las reglas de publicación.';
    }

    // ── OPCIONALES ─────────────────────────────────────────────────
    // Solo validamos límites máximos cuando SÍ hay contenido. Vacíos
    // no producen error.
    const descLen = d.descripcion.trim().length;
    if (descLen > DESC_MAX) {
        errores.descripcion = `La descripción no debe pasar de ${DESC_MAX} caracteres.`;
    }

    const min = parseEntero(d.budgetMin);
    const max = parseEntero(d.budgetMax);
    if (min !== null && max !== null && min > max) {
        errores.presupuesto = 'El mínimo debe ser menor o igual al máximo.';
    } else if ((min !== null) !== (max !== null)) {
        errores.presupuesto = 'Ingresa mínimo y máximo, o deja ambos vacíos.';
    }

    if (d.zonasAproximadas.length > ZONAS_MAX) {
        errores.zonas = `Máximo ${ZONAS_MAX} zonas.`;
    }

    const orden: CampoErrorComposer[] = [
        'modo',
        'titulo',
        'descripcion',
        'categoria',
        'modalidad',
        'presupuesto',
        'zonas',
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

interface UseComposerServiciosOpts {
    /** Modo inicial Ofrezco/Solicito. Solo se aplica si el draft cargado
     *  no tiene modo o tiene uno distinto al previo (mismo criterio que
     *  el wizard para no perder borradores). */
    modoInicial?: ModoServicio | null;
    /** Namespace para localStorage. Default `'v3'` (CREAR). Para EDITAR
     *  usar `'edit-{publicacionId}'` para no mezclar borradores. */
    storageNamespace?: string;
}

export function useComposerServicios(opts: UseComposerServiciosOpts = {}) {
    const ns = opts.storageNamespace ?? NAMESPACE_DEFAULT;

    const [draft, setDraft] = useState<ComposerServiciosDraft>(() => {
        const previo = cargarDraft(ns);

        // Reset cuando el caller pidió otro modo y el draft tenía uno
        // distinto: significa que el usuario cambió de tipo de publicación
        // y los datos viejos no aplican.
        if (
            opts.modoInicial &&
            previo.modo !== null &&
            opts.modoInicial !== previo.modo
        ) {
            return { ...DRAFT_INICIAL, modo: opts.modoInicial };
        }

        // Draft previo sin modo: aplicamos el sugerido sin perder lo demás.
        if (opts.modoInicial && previo.modo === null) {
            return { ...previo, modo: opts.modoInicial };
        }

        return previo;
    });

    // "Base de comparación" para detectar cambios reales: arranca en lo que
    // el initializer de arriba haya producido (vacío, un borrador resumido,
    // o ese borrador con el modo sugerido aplicado) — NO en `DRAFT_INICIAL`
    // fijo, porque si quedó un borrador viejo en localStorage el composer
    // marcaría "hay cambios" de inmediato sin que el usuario haya tocado
    // nada en esta sesión. En edición, `hidratarDesdePublicacion` la mueve
    // al contenido original de la publicación.
    const draftBaseRef = useRef<ComposerServiciosDraft>(draft);

    useEffect(() => {
        guardarDraft(ns, draft);
    }, [draft, ns]);

    const actualizar = useCallback(
        (
            cambio:
                | Partial<ComposerServiciosDraft>
                | ((d: ComposerServiciosDraft) => Partial<ComposerServiciosDraft>),
        ) => {
            setDraft((d) => {
                const patch = typeof cambio === 'function' ? cambio(d) : cambio;
                return { ...d, ...patch };
            });
        },
        [],
    );

    /** Setea las 3 confirmaciones legales con un solo valor — refleja la
     *  decisión de UI de compactar 3 checkboxes en 1 ("Acepto las reglas
     *  de publicación de AnunciaYA"). Backend sigue recibiendo las 3 con
     *  su versión. */
    const setConfirmacionesUnificadas = useCallback((acepta: boolean) => {
        setDraft((d) => ({
            ...d,
            confirmaciones: {
                legal: acepta,
                verdadera: acepta,
                coordinacion: acepta,
            },
        }));
    }, []);

    const limpiar = useCallback(() => {
        limpiarDraftServicios(ns);
        const modo = opts.modoInicial ?? null;
        setDraft({ ...DRAFT_INICIAL, modo });
    }, [ns, opts.modoInicial]);

    /** Sembrado automático de ubicación (GPS) — NO es una edición del
     *  usuario, así que también actualiza la base de comparación para que
     *  `estaIntacto` no se dispare solo por esto (ver ComposerServicios,
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

    /** Hidrata el draft con valores de una publicación existente (modo
     *  edición). El caller debe asegurarse de llamarla UNA SOLA VEZ
     *  cuando la publicación se carga, típicamente con un ref-guard. */
    const hidratarDesdePublicacion = useCallback(
        (d: Partial<ComposerServiciosDraft>) => {
            setDraft((prev) => {
                const nuevo = { ...prev, ...d };
                draftBaseRef.current = nuevo;
                return nuevo;
            });
        },
        [],
    );

    const validacion = useMemo(() => validarComposer(draft), [draft]);

    return {
        draft,
        actualizar,
        setConfirmacionesUnificadas,
        sembrarUbicacion,
        limpiar,
        hidratarDesdePublicacion,
        // Validación
        errores: validacion.errores,
        valido: validacion.valido,
        mensajeBoton: validacion.mensajeBoton,
        // Utilidades
        estaIntacto: draftsIgualesSalvoModo(draft, draftBaseRef.current),
    };
}

export default useComposerServicios;
