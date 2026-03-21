/**
 * PreviewEnlace.tsx
 * ==================
 * Muestra un preview card de Open Graph para URLs en mensajes de ChatYA.
 * Estilo profesional similar a WhatsApp/Telegram/iMessage.
 *
 * COMPORTAMIENTO:
 * - Carga lazy: hace fetch solo cuando se renderiza
 * - Cache en Map a nivel de módulo (persiste mientras ChatYA esté montado)
 * - Si no hay datos OG: muestra fallback con dominio
 * - Click abre la URL en nueva pestaña
 *
 * UBICACIÓN: apps/web/src/components/chatya/PreviewEnlace.tsx
 */

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { getOgPreview } from '../../services/chatyaService';
import { extraerDominio } from './enlacesUtils';
import type { DatosOgPreview } from '../../types/chatya';

// =============================================================================
// CACHE A NIVEL DE MÓDULO
// =============================================================================

const cacheOgPreview = new Map<string, DatosOgPreview | null>();

// =============================================================================
// COMPONENTE
// =============================================================================

interface PreviewEnlaceProps {
  url: string;
  esMio: boolean;
}

export function PreviewEnlace({ url, esMio }: PreviewEnlaceProps) {
  const [datos, setDatos] = useState<DatosOgPreview | null | undefined>(() => {
    // Leer de cache si existe
    if (cacheOgPreview.has(url)) return cacheOgPreview.get(url) ?? null;
    return undefined; // undefined = no cargado
  });
  const [cargando, setCargando] = useState(datos === undefined);

  useEffect(() => {
    if (datos !== undefined) return; // Ya cargado (de cache o fetch previo)

    let cancelado = false;

    (async () => {
      try {
        const respuesta = await getOgPreview(url);
        if (cancelado) return;

        const resultado = respuesta.success && respuesta.data ? respuesta.data : null;
        cacheOgPreview.set(url, resultado);
        setDatos(resultado);
      } catch {
        if (cancelado) return;
        cacheOgPreview.set(url, null);
        setDatos(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => { cancelado = true; };
  }, [url, datos]);

  const dominio = extraerDominio(url);

  // Skeleton mientras carga
  if (cargando) {
    return (
      <div className={`mt-2 rounded-lg overflow-hidden ${esMio ? 'bg-white/10' : 'bg-white/5'}`}>
        <div className="animate-pulse">
          <div className={`w-full h-32 ${esMio ? 'bg-white/10' : 'bg-white/5'}`} />
          <div className="p-3 space-y-2">
            <div className={`h-3.5 rounded w-3/4 ${esMio ? 'bg-white/15' : 'bg-white/10'}`} />
            <div className={`h-3 rounded w-full ${esMio ? 'bg-white/10' : 'bg-white/5'}`} />
            <div className={`h-2.5 rounded w-1/3 ${esMio ? 'bg-white/10' : 'bg-white/5'}`} />
          </div>
        </div>
      </div>
    );
  }

  // Sin datos — fallback mínimo con dominio
  if (!datos || (!datos.titulo && !datos.descripcion && !datos.imagen)) {
    return null;
  }

  const tieneSoloTexto = !datos.imagen;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`
        mt-2 block rounded-lg overflow-hidden
        ${esMio ? 'bg-white/10 hover:bg-white/15' : 'bg-white/5 hover:bg-white/10'}
      `}
    >
      {/* Imagen */}
      {datos.imagen && (
        <div className="w-full h-44 lg:h-40 2xl:h-44 overflow-hidden">
          <img
            src={datos.imagen}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Contenido */}
      <div className={`px-3 py-2.5 ${tieneSoloTexto ? '' : 'border-t border-white/10'}`}>
        {datos.titulo && (
          <p className={`text-[13px] lg:text-[12px] 2xl:text-[13px] font-semibold leading-snug line-clamp-2 ${esMio ? 'text-white' : 'text-white/90'}`}>
            {datos.titulo}
          </p>
        )}
        {datos.descripcion && (
          <p className={`text-[12px] lg:text-[11px] 2xl:text-[12px] leading-snug line-clamp-2 mt-0.5 ${esMio ? 'text-white/70' : 'text-white/55'}`}>
            {datos.descripcion}
          </p>
        )}
        <div className={`flex items-center gap-1 mt-1.5 ${esMio ? 'text-white/50' : 'text-white/40'}`}>
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="text-[11px] font-medium truncate">{dominio}</span>
        </div>
      </div>
    </a>
  );
}

export default PreviewEnlace;
