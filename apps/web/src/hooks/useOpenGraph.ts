/**
 * ============================================================================
 * HOOK: useOpenGraph
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useOpenGraph.ts
 * 
 * PROPÓSITO:
 * Actualiza dinámicamente los meta tags de Open Graph para que los links
 * compartidos en redes sociales (WhatsApp, Facebook, Twitter) muestren
 * previews correctos con imagen, título y descripción.
 * 
 * USO:
 * ```tsx
 * useOpenGraph({
 *   title: 'Barbería El Güero | AnunciaYA',
 *   description: 'La mejor barbería de Puerto Peñasco',
 *   image: 'https://cloudinary.com/logo.jpg',
 *   url: 'https://anunciaya.com/p/negocio/abc123',
 *   type: 'business.business'
 * });
 * ```
 * 
 * CREADO: Fase 5.3.1 - Sistema Universal de Compartir
 */

import { useEffect } from 'react';

// =============================================================================
// TIPOS
// =============================================================================

interface OpenGraphData {
  /** Título que aparece en el preview (ej: "Barbería El Güero | AnunciaYA") */
  title: string;
  
  /** Descripción corta del contenido (máx ~155 caracteres recomendado) */
  description: string;
  
  /** URL de la imagen para el preview (recomendado: 1200x630px) */
  image?: string;
  
  /** URL canónica de la página */
  url: string;
  
  /** Tipo de contenido: website, article, business.business, product, etc. */
  type?: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Imagen por defecto si no se proporciona una */
const DEFAULT_OG_IMAGE = '/og-image.webp';

/** Nombre de la app para sufijo en títulos */
const APP_NAME = 'AnunciaYA';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Crea o actualiza un meta tag en el <head>
 */
function setMetaTag(property: string, content: string, isName = false): void {
  const attribute = isName ? 'name' : 'property';
  let meta = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement | null;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, property);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', content);
}

/**
 * Trunca texto a un máximo de caracteres sin cortar palabras
 */
function truncarTexto(texto: string, maxLength: number): string {
  if (texto.length <= maxLength) return texto;
  
  const truncado = texto.substring(0, maxLength);
  const ultimoEspacio = truncado.lastIndexOf(' ');
  
  return ultimoEspacio > 0 
    ? truncado.substring(0, ultimoEspacio) + '...'
    : truncado + '...';
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para actualizar meta tags de Open Graph dinámicamente
 * 
 * @param data - Datos para los meta tags
 * 
 * @example
 * // En una página de negocio
 * useOpenGraph({
 *   title: `${negocio.nombre} | AnunciaYA`,
 *   description: negocio.descripcion || `${categoria} en ${ciudad}`,
 *   image: negocio.logoUrl,
 *   url: `https://anunciaya.com/p/negocio/${sucursalId}`
 * });
 */
export function useOpenGraph(data: OpenGraphData): void {
  useEffect(() => {
    // Guardar título original para restaurar al desmontar
    const tituloOriginal = document.title;
    
    // ---------------------------------------------------------------------
    // Actualizar título del documento
    // ---------------------------------------------------------------------
    document.title = data.title;
    
    // ---------------------------------------------------------------------
    // Open Graph Tags (Facebook, WhatsApp, LinkedIn, etc.)
    // ---------------------------------------------------------------------
    setMetaTag('og:title', data.title);
    setMetaTag('og:description', truncarTexto(data.description, 155));
    setMetaTag('og:url', data.url);
    setMetaTag('og:type', data.type || 'website');
    setMetaTag('og:site_name', APP_NAME);
    
    // Imagen (usar default si no hay)
    const imagenUrl = data.image || DEFAULT_OG_IMAGE;
    setMetaTag('og:image', imagenUrl);
    setMetaTag('og:image:alt', data.title);
    
    // ---------------------------------------------------------------------
    // Twitter Card Tags
    // ---------------------------------------------------------------------
    setMetaTag('twitter:card', 'summary_large_image', true);
    setMetaTag('twitter:title', data.title, true);
    setMetaTag('twitter:description', truncarTexto(data.description, 155), true);
    setMetaTag('twitter:image', imagenUrl, true);
    
    // ---------------------------------------------------------------------
    // Tags adicionales para mejor SEO
    // ---------------------------------------------------------------------
    setMetaTag('description', truncarTexto(data.description, 155), true);
    
    // Link canónico
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', data.url);
    
    // ---------------------------------------------------------------------
    // Cleanup: restaurar título original al desmontar
    // ---------------------------------------------------------------------
    return () => {
      document.title = tituloOriginal;
    };
  }, [data.title, data.description, data.image, data.url, data.type]);
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default useOpenGraph;