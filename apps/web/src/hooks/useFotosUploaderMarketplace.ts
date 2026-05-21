/**
 * useFotosUploaderMarketplace.ts
 * ================================
 * Hook que encapsula la lógica de subida de fotos del composer de
 * MarketPlace a R2 (presigned URL flow) + tracking de huérfanas.
 *
 * Réplica 1:1 de `useFotosUploaderServicios.ts` con las únicas diferencias:
 *   - MAX_FOTOS_COMPOSER_MP = 8 (Servicios usa 6, MP backend acepta hasta 8).
 *   - Usa las mutations de MarketPlace en lugar de las de Servicios.
 *   - Las fotos van al bucket con prefijo `marketplace/` (lo decide el backend
 *     al firmar la presigned URL).
 *
 * Devuelve:
 *   - `eliminar(idx)`       → quita una foto del array y dispara delete R2
 *   - `subiendo`            → flag de loading
 *   - `inputGaleriaProps`   → props para spread sobre un <input type="file" hidden />
 *   - `inputCamaraProps`    → props para spread con `capture="environment"`
 *   - `abrirGaleria()`      → click programático sobre el input galería
 *   - `abrirCamara()`       → click programático sobre el input cámara
 *
 * Ubicación: apps/web/src/hooks/useFotosUploaderMarketplace.ts
 */

import axios from 'axios';
import { useRef, useState, type MutableRefObject } from 'react';
import {
    useEliminarFotoMarketplaceHuerfana,
    useUploadFotoMarketplace,
} from './queries/useMarketplace';
import { notificar } from '../utils/notificaciones';
import { optimizarImagen } from '../utils/optimizarImagen';

export const MAX_FOTOS_COMPOSER_MP = 8;
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
    const [subiendo, setSubiendo] = useState(false);
    const uploadMutation = useUploadFotoMarketplace();
    const eliminarHuerfanaMutation = useEliminarFotoMarketplaceHuerfana();

    async function manejarArchivos(files: FileList | null) {
        if (!files || files.length === 0) return;
        const espacios = MAX_FOTOS_COMPOSER_MP - fotos.length;
        if (espacios <= 0) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER_MP} fotos por publicación.`,
            );
            return;
        }
        const archivos = Array.from(files).slice(0, espacios);
        setSubiendo(true);
        const acumulado = [...fotos];
        try {
            for (const archivo of archivos) {
                if (!TIPOS_PERMITIDOS[archivo.type.toLowerCase()]) {
                    notificar.error(
                        `${archivo.name}: tipo no permitido (JPG, PNG o WebP).`,
                    );
                    continue;
                }
                if (archivo.size > MAX_BYTES) {
                    notificar.error(`${archivo.name}: pesa más de 5 MB.`);
                    continue;
                }
                let blob: Blob;
                try {
                    blob = await optimizarImagen(archivo, {
                        maxWidth: 1920,
                        quality: 0.85,
                    });
                } catch {
                    notificar.error(
                        `${archivo.name}: no se pudo procesar la imagen.`,
                    );
                    continue;
                }
                const res = await uploadMutation.mutateAsync({
                    nombreArchivo: archivo.name.replace(/\.[^.]+$/, '.webp'),
                    contentType: 'image/webp',
                });
                if (!res.success || !res.data) {
                    notificar.error(
                        `No se pudo preparar la subida de ${archivo.name}.`,
                    );
                    continue;
                }
                try {
                    await axios.put(res.data.uploadUrl, blob, {
                        headers: { 'Content-Type': 'image/webp' },
                    });
                } catch {
                    notificar.error(
                        `Falló la subida de ${archivo.name}. Intenta de nuevo.`,
                    );
                    continue;
                }
                const publicUrl = res.data.publicUrl;
                urlsSubidasEnSesion.current.add(publicUrl);
                acumulado.push(publicUrl);
            }
            if (acumulado.length !== fotos.length) {
                onCambioFotos(acumulado.slice(0, MAX_FOTOS_COMPOSER_MP));
            }
        } finally {
            setSubiendo(false);
            if (inputGaleriaRef.current) inputGaleriaRef.current.value = '';
            if (inputCamaraRef.current) inputCamaraRef.current.value = '';
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
        if (subiendo) return false;
        if (fotos.length >= MAX_FOTOS_COMPOSER_MP) {
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
        subiendo,
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
