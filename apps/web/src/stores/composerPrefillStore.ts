/**
 * composerPrefillStore.ts
 * =========================
 * Puente efímero entre el Asistente Coyo (FAB global) y el composer de
 * MarketPlace: cuando Coyo arma un borrador (capacidad
 * `crear_publicacion_marketplace`), lo deja aquí antes de navegar a
 * `/marketplace?crear=vendo|busco`; `ComposerMarketplace` lo consume al
 * montar.
 *
 * Estado de UI puro (no viene del servidor) — Zustand, no React Query.
 *
 * `consumir()` lee Y limpia en el mismo paso — el composer lo llama
 * INMEDIATAMENTE al montar (no espera a que el usuario aplique nada) y
 * limpia también al desmontar como red de seguridad, para que datos viejos
 * del asistente nunca se filtren a una creación manual posterior.
 *
 * Ubicación: apps/web/src/stores/composerPrefillStore.ts
 */

import { create } from 'zustand';

export interface PrefillMarketplace {
    titulo?: string;
    descripcion?: string;
    precio?: number;
    categoriaId?: number | null;
}

interface ComposerPrefillState {
    pendiente: PrefillMarketplace | null;
    setPrefillMarketplace: (datos: PrefillMarketplace) => void;
    /** Lee el prefill pendiente y lo limpia en el mismo paso. `null` si no hay nada. */
    consumir: () => PrefillMarketplace | null;
}

export const useComposerPrefillStore = create<ComposerPrefillState>((set, get) => ({
    pendiente: null,
    setPrefillMarketplace: (datos) => set({ pendiente: datos }),
    consumir: () => {
        const datos = get().pendiente;
        if (datos) set({ pendiente: null });
        return datos;
    },
}));
