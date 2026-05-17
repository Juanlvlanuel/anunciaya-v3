/**
 * useWizardServicios.ts
 * ======================
 * Estado del Wizard de Publicar (3 pasos — handoff `design_handoff_publish_wizard/`).
 *
 *   Paso 1 — Qué necesitas: categoría + título + descripción + urgente
 *   Paso 2 — Detalles: fotos + modalidad + presupuesto (min/max) + zonas
 *   Paso 3 — Revisa y publica: preview + 3 confirmaciones legales
 *
 * El `modo` (ofrezco/solicito) viene del FAB vía `?modo=...` y se mantiene
 * oculto al usuario — el preview del Paso 3 lo refleja en el badge.
 *
 * Mapeo de BD vs draft:
 *   - El draft expone `budgetMin/budgetMax` (strings, para permitir vacío).
 *   - Al publicar:
 *       modo='solicito' → presupuesto={min,max} si ambos llenos, precio=a-convenir
 *       modo='ofrezco'  → precio={kind:'rango',min,max} si ambos llenos, sino a-convenir
 *   - El `subtipo` se deriva: 'busco-empleo' si categoria='empleo', sino 'servicio-puntual'
 *     (ofrezco siempre usa 'servicio-personal').
 *
 * Persistencia: `localStorage` (sobrevive cierres del browser).
 *   - aya:servicios:wizard:draft-v2
 *   - aya:servicios:wizard:step-v2
 *
 * Ubicación: apps/web/src/hooks/useWizardServicios.ts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
    CategoriaClasificado,
    ModalidadServicio,
    ModoServicio,
    SubtipoPublicacion,
    TipoPublicacion,
} from '../types/servicios';

/**
 * Namespace por defecto para el flujo de CREAR. En modo edición se usa
 * `edit-{publicacionId}` para no mezclar borradores.
 */
const NAMESPACE_DEFAULT = 'v2';

function claveDraft(ns: string) {
    return `aya:servicios:wizard:draft-${ns}`;
}
function claveStep(ns: string) {
    return `aya:servicios:wizard:step-${ns}`;
}

/** Shape simplificado del wizard (handoff v2). */
export interface WizardServiciosDraft {
    // Modo del FAB — oculto al usuario, pero influye en el payload final.
    modo: ModoServicio | null;
    // Paso 1
    categoria: CategoriaClasificado | null;
    titulo: string;
    descripcion: string;
    urgente: boolean;
    // Paso 2
    fotos: string[];
    fotoPortadaIndex: number;
    modalidad: ModalidadServicio | null;
    /** Strings para permitir vacío; se convierten a number al publicar. */
    budgetMin: string;
    budgetMax: string;
    zonasAproximadas: string[];
    // Ubicación viene del GPS, no del usuario.
    latitud: number | null;
    longitud: number | null;
    ciudad: string | null;
    // Paso 3
    confirmaciones: {
        legal: boolean;
        verdadera: boolean;
        coordinacion: boolean;
    };
}

const DRAFT_INICIAL: WizardServiciosDraft = {
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

export const TOTAL_PASOS = 3;
export type PasoWizard = 1 | 2 | 3;

// =============================================================================
// HELPERS BD-side (derivación tipo/subtipo)
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

// =============================================================================
// PERSISTENCIA — localStorage
// =============================================================================

function cargarDraft(ns: string): WizardServiciosDraft {
    if (typeof window === 'undefined') return DRAFT_INICIAL;
    try {
        const raw = localStorage.getItem(claveDraft(ns));
        if (!raw) return DRAFT_INICIAL;
        const parsed = JSON.parse(raw) as Partial<WizardServiciosDraft>;
        return { ...DRAFT_INICIAL, ...parsed };
    } catch {
        return DRAFT_INICIAL;
    }
}

function cargarPaso(ns: string): PasoWizard {
    if (typeof window === 'undefined') return 1;
    const n = parseInt(localStorage.getItem(claveStep(ns)) ?? '1', 10);
    if (Number.isNaN(n)) return 1;
    return Math.min(Math.max(n, 1), TOTAL_PASOS) as PasoWizard;
}

function guardarDraft(ns: string, d: WizardServiciosDraft) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(claveDraft(ns), JSON.stringify(d));
    } catch {
        /* noop */
    }
}

function guardarPaso(ns: string, p: PasoWizard) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(claveStep(ns), String(p));
    } catch {
        /* noop */
    }
}

function limpiarDraftServicios(ns: string) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(claveDraft(ns));
        localStorage.removeItem(claveStep(ns));
    } catch {
        /* noop */
    }
}

// =============================================================================
// HOOK
// =============================================================================

interface UseWizardServiciosOpts {
    modoInicial?: ModoServicio | null;
    /** Namespace para localStorage. Default `'v2'` (CREAR). Para EDITAR usar
     *  `'edit-{publicacionId}'` para no mezclar borradores. */
    storageNamespace?: string;
}

export function useWizardServicios(opts: UseWizardServiciosOpts = {}) {
    const ns = opts.storageNamespace ?? NAMESPACE_DEFAULT;
    const [paso, setPaso] = useState<PasoWizard>(() => cargarPaso(ns));
    const [draft, setDraft] = useState<WizardServiciosDraft>(() => {
        const previo = cargarDraft(ns);
        // Si el FAB trae un modo distinto al guardado, reinicia.
        if (opts.modoInicial && opts.modoInicial !== previo.modo) {
            return { ...DRAFT_INICIAL, modo: opts.modoInicial };
        }
        if (opts.modoInicial && previo.modo === null) {
            return { ...previo, modo: opts.modoInicial };
        }
        return previo;
    });

    useEffect(() => {
        guardarDraft(ns, draft);
    }, [draft, ns]);

    useEffect(() => {
        guardarPaso(ns, paso);
    }, [paso, ns]);

    const actualizar = useCallback(
        (
            cambio:
                | Partial<WizardServiciosDraft>
                | ((d: WizardServiciosDraft) => Partial<WizardServiciosDraft>),
        ) => {
            setDraft((d) => {
                const patch = typeof cambio === 'function' ? cambio(d) : cambio;
                return { ...d, ...patch };
            });
        },
        [],
    );

    const siguientePaso = useCallback(() => {
        setPaso((p) => Math.min(TOTAL_PASOS, p + 1) as PasoWizard);
    }, []);

    const pasoAnterior = useCallback(() => {
        setPaso((p) => Math.max(1, p - 1) as PasoWizard);
    }, []);

    const limpiar = useCallback(() => {
        limpiarDraftServicios(ns);
        const modo = opts.modoInicial ?? null;
        setDraft({ ...DRAFT_INICIAL, modo });
        setPaso(1);
    }, [ns, opts.modoInicial]);

    /** Hidrata el draft con valores de una publicación existente (modo
     *  edición). Solo aplicar UNA VEZ cuando la publicación se carga. */
    const hidratarDesdePublicacion = useCallback(
        (d: Partial<WizardServiciosDraft>) => {
            setDraft((prev) => ({ ...prev, ...d }));
        },
        [],
    );

    const validacion = useMemo(() => validarPaso(paso, draft), [paso, draft]);
    const pasoValido = validacion.errores.length === 0;

    return {
        draft,
        paso,
        actualizar,
        siguientePaso,
        pasoAnterior,
        limpiar,
        pasoValido,
        nextHelp: validacion.nextHelp,
        totalPasos: TOTAL_PASOS,
        hidratarDesdePublicacion,
    };
}

// =============================================================================
// VALIDACIÓN POR PASO + MENSAJE CONTEXTUAL "nextHelp"
// =============================================================================

interface ResultadoValidacion {
    errores: string[];
    /** Mensaje contextual a mostrar arriba del botón "Siguiente". */
    nextHelp: string | null;
}

function validarPaso(
    paso: PasoWizard,
    d: WizardServiciosDraft,
): ResultadoValidacion {
    const errores: string[] = [];
    let nextHelp: string | null = null;

    if (paso === 1) {
        if (!d.categoria) {
            errores.push('categoria');
            nextHelp = 'Selecciona una categoría para continuar.';
        }
        const titLen = d.titulo.trim().length;
        if (titLen < 10) {
            errores.push('titulo');
            if (!nextHelp) {
                nextHelp = `Tu título necesita ${10 - titLen} caracteres más.`;
            }
        } else if (titLen > 80) {
            errores.push('titulo');
            if (!nextHelp) nextHelp = 'El título no debe pasar de 80 caracteres.';
        }
        const descLen = d.descripcion.trim().length;
        if (descLen < 30) {
            errores.push('descripcion');
            if (!nextHelp) {
                nextHelp = `La descripción necesita ${30 - descLen} caracteres más.`;
            }
        } else if (descLen > 500) {
            errores.push('descripcion');
            if (!nextHelp)
                nextHelp = 'La descripción no debe pasar de 500 caracteres.';
        }
    }

    if (paso === 2) {
        if (!d.modalidad) {
            errores.push('modalidad');
            nextHelp = 'Selecciona una modalidad.';
        }
        const min = parseEntero(d.budgetMin);
        const max = parseEntero(d.budgetMax);
        if (min !== null && max !== null && min > max) {
            errores.push('presupuesto');
            if (!nextHelp) nextHelp = 'El mínimo debe ser menor o igual al máximo.';
        }
        if (d.zonasAproximadas.length < 1) {
            errores.push('zonas');
            if (!nextHelp) nextHelp = 'Agrega al menos una zona.';
        }
        if (
            d.latitud === null ||
            d.longitud === null ||
            !d.ciudad
        ) {
            errores.push('ubicacion');
            if (!nextHelp)
                nextHelp =
                    'Activa la ubicación de tu dispositivo para continuar.';
        }
    }

    if (paso === 3) {
        const todasOk =
            d.confirmaciones.legal &&
            d.confirmaciones.verdadera &&
            d.confirmaciones.coordinacion;
        if (!todasOk) {
            errores.push('confirmaciones');
            nextHelp = 'Confirma los tres puntos para poder publicar.';
        }
    }

    return { errores, nextHelp };
}

/** Parsea un string a entero positivo, devuelve null si vacío o inválido. */
export function parseEntero(v: string): number | null {
    const limpio = v.replace(/[^\d]/g, '');
    if (!limpio) return null;
    const n = parseInt(limpio, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}
