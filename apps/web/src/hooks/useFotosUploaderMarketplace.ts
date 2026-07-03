/**
 * useFotosUploaderMarketplace.ts
 * ================================
 * Hook que encapsula la lógica de subida de fotos del composer de
 * MarketPlace a R2 (presigned URL flow) + tracking de huérfanas.
 *
 * Réplica 1:1 de `useFotosUploaderServicios.ts` con las únicas diferencias:
 *   - MAX_FOTOS_COMPOSER_MP = 12 (mismo máximo que Servicios; MP backend acepta hasta 12).
 *   - Usa las mutations de MarketPlace en lugar de las de Servicios.
 *   - Las fotos van al bucket con prefijo `marketplace/` (lo decide el backend
 *     al firmar la presigned URL).
 *
 * ── UI OPTIMISTA (Sprint 9.3) ────────────────────────────────────────
 * Al seleccionar archivos, se generan PREVIEWS locales inmediatos con
 * `URL.createObjectURL(blob)` que aparecen YA en el grid del composer
 * mientras la subida real ocurre en paralelo en background. Cuando una
 * foto termina su upload a R2:
 *   - éxito: se quita del array de previews y se agrega a `draft.fotos`
 *     con su URL pública R2.
 *   - error: se quita del array de previews y se muestra una notificación.
 *
 * Las subidas paralelas (Promise.allSettled) evitan que una foto lenta
 * bloquee al resto, y el INSERT batched al final de `draft.fotos` evita
 * race conditions con `onCambioFotos` (que recibe el array completo).
 *
 * Devuelve:
 *   - `eliminar(idx)`       → quita una foto del array y dispara delete R2
 *   - `subiendo`            → flag de loading (true mientras haya previews)
 *   - `previews`            → URLs locales (blob:) de fotos en curso de subida
 *   - `inputGaleriaProps`   → props para spread sobre un <input type="file" hidden />
 *   - `inputCamaraProps`    → props para spread con `capture="environment"`
 *   - `abrirGaleria()`      → click programático sobre el input galería
 *   - `abrirCamara()`       → click programático sobre el input cámara
 *
 * Ubicación: apps/web/src/hooks/useFotosUploaderMarketplace.ts
 */

import axios from 'axios';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
    useEliminarFotoMarketplaceHuerfana,
    useUploadFotoMarketplace,
} from './queries/useMarketplace';
import { notificar } from '../utils/notificaciones';
import { optimizarImagen } from '../utils/optimizarImagen';

export const MAX_FOTOS_COMPOSER_MP = 12;
const MAX_BYTES = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS: Record<
    string,
    'image/jpeg' | 'image/png' | 'image/webp'
> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
};

/**
 * Preview local de una foto en curso de subida. La `url` es un
 * `blob:` URL generada con `URL.createObjectURL` — el caller la usa
 * como `src` de la `<img>` para mostrar la imagen al instante.
 */
export interface FotoPreviewLocalMP {
    tempId: string;
    url: string;
}

interface UseFotosUploaderMPOpts {
    fotos: string[];
    onCambioFotos: (fotos: string[]) => void;
    /** Ref que rastrea las URLs subidas en esta sesión del composer
     *  (para limpiarlas si se descarta el borrador). */
    urlsSubidasEnSesion: MutableRefObject<Set<string>>;
}

export function useFotosUploaderMarketplace({
    fotos,
    onCambioFotos,
    urlsSubidasEnSesion,
}: UseFotosUploaderMPOpts) {
    const inputGaleriaRef = useRef<HTMLInputElement>(null);
    const inputCamaraRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<FotoPreviewLocalMP[]>([]);
    const uploadMutation = useUploadFotoMarketplace();
    const eliminarHuerfanaMutation = useEliminarFotoMarketplaceHuerfana();

    const fotosRef = useRef(fotos);
    useEffect(() => {
        fotosRef.current = fotos;
    }, [fotos]);

    useEffect(() => {
        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function subirUno(archivo: File): Promise<string> {
        if (!TIPOS_PERMITIDOS[archivo.type.toLowerCase()]) {
            throw new Error(`${archivo.name}: tipo no permitido (JPG, PNG o WebP).`);
        }
        if (archivo.size > MAX_BYTES) {
            throw new Error(`${archivo.name}: pesa más de 5 MB.`);
        }
        let blob: Blob;
        try {
            blob = await optimizarImagen(archivo, {
                maxWidth: 1920,
                quality: 0.85,
            });
        } catch {
            throw new Error(`${archivo.name}: no se pudo procesar la imagen.`);
        }
        const res = await uploadMutation.mutateAsync({
            nombreArchivo: archivo.name.replace(/\.[^.]+$/, '.webp'),
            contentType: 'image/webp',
        });
        if (!res.success || !res.data) {
            throw new Error(`No se pudo preparar la subida de ${archivo.name}.`);
        }
        try {
            await axios.put(res.data.uploadUrl, blob, {
                headers: { 'Content-Type': 'image/webp' },
            });
        } catch {
            throw new Error(`Falló la subida de ${archivo.name}. Intenta de nuevo.`);
        }
        return res.data.publicUrl;
    }

    async function manejarArchivos(files: FileList | null) {
        if (!files || files.length === 0) return;
        const ocupados = fotosRef.current.length + previews.length;
        const espacios = MAX_FOTOS_COMPOSER_MP - ocupados;
        if (espacios <= 0) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER_MP} fotos por publicación.`,
            );
            return;
        }
        const archivos = Array.from(files).slice(0, espacios);

        const items = archivos.map((archivo) => ({
            tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            url: URL.createObjectURL(archivo),
            archivo,
        }));
        setPreviews((prev) => [
            ...prev,
            ...items.map(({ tempId, url }) => ({ tempId, url })),
        ]);

        if (inputGaleriaRef.current) inputGaleriaRef.current.value = '';
        if (inputCamaraRef.current) inputCamaraRef.current.value = '';

        const resultados = await Promise.allSettled(
            items.map(async (item) => {
                const publicUrl = await subirUno(item.archivo);
                return { tempId: item.tempId, publicUrl };
            }),
        );

        const exitosas: string[] = [];
        resultados.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                exitosas.push(r.value.publicUrl);
                urlsSubidasEnSesion.current.add(r.value.publicUrl);
            } else {
                const msg = r.reason instanceof Error
                    ? r.reason.message
                    : `Falló la subida de ${items[i].archivo.name}.`;
                notificar.error(msg);
            }
        });

        const tempIdsProcesados = new Set(items.map((i) => i.tempId));
        setPreviews((prev) =>
            prev.filter((p) => !tempIdsProcesados.has(p.tempId)),
        );
        items.forEach((i) => URL.revokeObjectURL(i.url));

        if (exitosas.length > 0) {
            const combinadas = [...fotosRef.current, ...exitosas].slice(
                0,
                MAX_FOTOS_COMPOSER_MP,
            );
            onCambioFotos(combinadas);
        }
    }

    function eliminar(idx: number) {
        const url = fotos[idx];
        const nuevas = fotos.filter((_, i) => i !== idx);
        onCambioFotos(nuevas);
        if (url) {
            urlsSubidasEnSesion.current.delete(url);
            eliminarHuerfanaMutation.mutate(url);
        }
    }

    function puedeAgregar(): boolean {
        const ocupados = fotos.length + previews.length;
        if (ocupados >= MAX_FOTOS_COMPOSER_MP) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER_MP} fotos por publicación.`,
            );
            return false;
        }
        return true;
    }

    function abrirGaleria() {
        if (!puedeAgregar()) return;
        inputGaleriaRef.current?.click();
    }

    function abrirCamara() {
        if (!puedeAgregar()) return;
        inputCamaraRef.current?.click();
    }

    return {
        subiendo: previews.length > 0,
        previews,
        eliminar,
        abrirGaleria,
        abrirCamara,
        inputGaleriaProps: {
            ref: inputGaleriaRef,
            type: 'file' as const,
            accept: 'image/jpeg,image/png,image/webp',
            multiple: true,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
        inputCamaraProps: {
            ref: inputCamaraRef,
            type: 'file' as const,
            accept: 'image/jpeg,image/png,image/webp',
            capture: 'environment' as const,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
    };
}
