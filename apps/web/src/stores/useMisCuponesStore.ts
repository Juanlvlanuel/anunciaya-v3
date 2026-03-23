/**
 * useMisCuponesStore.ts
 * ======================
 * Store Zustand para Mis Cupones (vista cliente).
 * Persiste datos entre navegaciones para evitar recargas.
 *
 * UBICACIÓN: apps/web/src/stores/useMisCuponesStore.ts
 */

import { create } from 'zustand';
import { obtenerMisCupones } from '../services/misCuponesService';
import type { CuponCliente } from '../services/misCuponesService';
import { escucharEvento } from '../services/socketService';

interface MisCuponesState {
    cupones: CuponCliente[];
    cargando: boolean;
    cargado: boolean;
    iniciarListener: () => () => void;
    cargarCupones: () => Promise<void>;
}

export const useMisCuponesStore = create<MisCuponesState>((set, get) => ({
    cupones: [],
    cargando: false,
    cargado: false,

    iniciarListener: () => {
        return escucharEvento('cupon:actualizado', () => {
            get().cargarCupones();
        });
    },

    cargarCupones: async () => {
        // Si ya cargó, no bloquear UI — recargar en background
        const yaCargoAntes = get().cargado;
        if (!yaCargoAntes) set({ cargando: true });

        try {
            const res = await obtenerMisCupones();
            if (res.success && Array.isArray(res.data)) {
                set({ cupones: res.data, cargado: true });

                // Pre-cargar logos e imágenes
                const urls = new Set<string>();
                for (const c of res.data) {
                    if (c.negocioLogo) urls.add(c.negocioLogo);
                    if (c.imagen) urls.add(c.imagen);
                }
                urls.forEach(url => { const img = new Image(); img.src = url; });
            }
        } catch {
            // silencioso
        } finally {
            set({ cargando: false });
        }
    },
}));
