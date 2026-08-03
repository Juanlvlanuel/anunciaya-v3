/**
 * useBloqueoAutoReloadStore.ts
 * ==============================
 * Señal global para posponer el auto-reload de la PWA (ver `main.tsx`,
 * `controllerchange` del Service Worker) mientras haya trabajo sin guardar
 * en algún composer (MarketPlace / Servicios / Publicaciones de Negocio).
 *
 * Motivo: el SW se actualiza en cada deploy y, cuando la pestaña vuelve a
 * primer plano (ej. el usuario regresa de grabar un video con la cámara
 * nativa), `main.tsx` puede detectar la versión nueva y recargar la página
 * de inmediato. Si en ese momento el usuario tiene un composer abierto con
 * texto/fotos/video sin publicar (o un archivo subiéndose), el reload borra
 * todo sin aviso — bug real encontrado 2-ago-2026 (video de 63s interrumpido
 * a media subida, sin mostrar ningún error).
 *
 * Uso: cada composer llama `bloquear(id)` mientras `estaIntacto` sea false
 * (hay cambios sin guardar) y `desbloquear(id)` cuando vuelve a estar
 * intacto o se desmonta. `main.tsx` consulta `bloqueado` antes de recargar.
 *
 * Set de razones (no un simple boolean) porque, aunque en la práctica solo
 * un composer suele estar montado a la vez, un Set es robusto ante más de
 * una fuente de bloqueo simultánea sin que una pise a la otra.
 *
 * Ubicación: apps/web/src/stores/useBloqueoAutoReloadStore.ts
 */

import { create } from 'zustand';

interface BloqueoAutoReloadState {
    razones: Set<string>;
    bloqueado: boolean;
    bloquear: (id: string) => void;
    desbloquear: (id: string) => void;
}

export const useBloqueoAutoReloadStore = create<BloqueoAutoReloadState>((set) => ({
    razones: new Set(),
    bloqueado: false,
    bloquear: (id) =>
        set((s) => {
            if (s.razones.has(id)) return s;
            const razones = new Set(s.razones);
            razones.add(id);
            return { razones, bloqueado: razones.size > 0 };
        }),
    desbloquear: (id) =>
        set((s) => {
            if (!s.razones.has(id)) return s;
            const razones = new Set(s.razones);
            razones.delete(id);
            return { razones, bloqueado: razones.size > 0 };
        }),
}));
