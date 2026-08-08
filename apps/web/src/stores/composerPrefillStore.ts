/**
 * composerPrefillStore.ts
 * =========================
 * Puente efímero entre el Asistente Coyo (FAB global) y los composers de
 * MarketPlace/Servicios: cuando Coyo arma un borrador (capacidades
 * `crear_publicacion_marketplace` / `crear_publicacion_servicio`), lo deja
 * aquí antes de navegar a `/marketplace?crear=vendo|busco` o
 * `/servicios?crear=ofrezco|solicito`; el composer correspondiente lo
 * consume al montar.
 *
 * Estado de UI puro (no viene del servidor) — Zustand, no React Query.
 *
 * `consumir*()` lee Y limpia en el mismo paso — el composer lo llama
 * INMEDIATAMENTE al montar (no espera a que el usuario aplique nada) y
 * limpia también al desmontar como red de seguridad, para que datos viejos
 * del asistente nunca se filtren a una creación manual posterior.
 *
 * Ubicación: apps/web/src/stores/composerPrefillStore.ts
 */

import { create } from 'zustand';
import type { ArchivoFoto } from '../types/archivoFoto';

export interface PrefillMarketplace {
    titulo?: string;
    descripcion?: string;
    precio?: number;
    categoriaId?: number | null;
    /** Condición sugerida por la IA a partir de la foto — 4 valores válidos de `campoCondicion`, o `null`. */
    condicion?: 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar' | null;
    /** Fotos ya subidas a R2 (adjuntadas desde el chat de Coyo) — el composer las aplica directo a `draft.fotos`. */
    fotos?: ArchivoFoto[];
}

export interface PrefillServicios {
    titulo?: string;
    descripcion?: string;
    /** Un solo número que el usuario dio — se usa como budgetMin y budgetMax. */
    presupuesto?: number;
}

interface ComposerPrefillState {
    pendienteMarketplace: PrefillMarketplace | null;
    pendienteServicios: PrefillServicios | null;
    setPrefillMarketplace: (datos: PrefillMarketplace) => void;
    setPrefillServicios: (datos: PrefillServicios) => void;
    /** Lee el prefill pendiente de MarketPlace y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirMarketplace: () => PrefillMarketplace | null;
    /** Lee el prefill pendiente de Servicios y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirServicios: () => PrefillServicios | null;
}

export const useComposerPrefillStore = create<ComposerPrefillState>((set, get) => ({
    pendienteMarketplace: null,
    pendienteServicios: null,
    setPrefillMarketplace: (datos) => set({ pendienteMarketplace: datos }),
    setPrefillServicios: (datos) => set({ pendienteServicios: datos }),
    consumirMarketplace: () => {
        const datos = get().pendienteMarketplace;
        if (datos) set({ pendienteMarketplace: null });
        return datos;
    },
    consumirServicios: () => {
        const datos = get().pendienteServicios;
        if (datos) set({ pendienteServicios: null });
        return datos;
    },
}));
