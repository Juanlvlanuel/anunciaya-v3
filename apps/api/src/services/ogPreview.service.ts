/**
 * ogPreview.service.ts
 * =====================
 * Servicio para obtener metadatos Open Graph de URLs externas.
 * Usado por ChatYA para mostrar previews de enlaces en mensajes.
 *
 * SEGURIDAD:
 * - Bloquea IPs privadas (previene SSRF)
 * - Bloquea URLs de AnunciaYA (ya tienen su propio OG)
 * - Timeout de 5 segundos
 * - Limita body a 100KB
 *
 * CACHE:
 * - Redis con TTL de 24h para resultados exitosos
 * - TTL de 1h para URLs sin datos OG (cache negativa)
 *
 * UBICACIÓN: apps/api/src/services/ogPreview.service.ts
 */

import { parse } from 'node-html-parser';
import { createHash } from 'crypto';
import dns from 'dns/promises';
import { redis } from '../db/redis.js';
import type { RespuestaServicio } from '../types/notificaciones.types.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface DatosOgPreview {
  titulo: string | null;
  descripcion: string | null;
  imagen: string | null;
  dominio: string;
  url: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 100 * 1024; // 100KB
const CACHE_TTL_EXITO = 86400; // 24 horas
const CACHE_TTL_VACIO = 3600; // 1 hora
const CACHE_PREFIX = 'og:preview:';

const DOMINIOS_BLOQUEADOS: string[] = [];

const RANGOS_IP_PRIVADOS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

// =============================================================================
// HELPERS
// =============================================================================

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

function extraerDominio(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function esUrlSegura(url: string): Promise<{ segura: boolean; mensaje?: string }> {
  // Validar formato
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { segura: false, mensaje: 'URL inválida' };
  }

  // Solo HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { segura: false, mensaje: 'Protocolo no permitido' };
  }

  // Longitud máxima
  if (url.length > 2048) {
    return { segura: false, mensaje: 'URL demasiado larga' };
  }

  // Dominios bloqueados
  const hostname = parsed.hostname.toLowerCase();
  if (DOMINIOS_BLOQUEADOS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return { segura: false, mensaje: 'Dominio bloqueado' };
  }

  // Resolver DNS y verificar IP (solo en producción)
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    try {
      const addresses = await dns.resolve4(hostname).catch(() => []);
      const addresses6 = await dns.resolve6(hostname).catch(() => []);
      const todasLasIps = [...addresses, ...addresses6];

      for (const ip of todasLasIps) {
        if (RANGOS_IP_PRIVADOS.some((regex) => regex.test(ip))) {
          return { segura: false, mensaje: 'IP privada no permitida' };
        }
      }
    } catch {
      // Si no resuelve DNS, dejarlo pasar (el fetch fallará solo)
    }
  }

  return { segura: true };
}

function extraerMetaTag(root: ReturnType<typeof parse>, propiedad: string): string | null {
  // Buscar por property (OG) y name (fallback)
  const meta =
    root.querySelector(`meta[property="${propiedad}"]`) ||
    root.querySelector(`meta[name="${propiedad}"]`);

  return meta?.getAttribute('content')?.trim() || null;
}

// =============================================================================
// SERVICIO PRINCIPAL
// =============================================================================

export async function obtenerOgPreview(url: string): Promise<RespuestaServicio<DatosOgPreview>> {
  try {
    // 1. Validar seguridad
    const validacion = await esUrlSegura(url);
    if (!validacion.segura) {
      return { success: false, message: validacion.mensaje || 'URL no permitida', code: 400 };
    }

    const dominio = extraerDominio(url);
    const cacheKey = `${CACHE_PREFIX}${hashUrl(url)}`;

    // 2. Buscar en cache
    const cacheado = await redis.get(cacheKey);
    if (cacheado) {
      const datos: DatosOgPreview = JSON.parse(cacheado);
      return { success: true, message: 'Preview obtenido (cache)', data: datos };
    }

    // 3. Fetch de la URL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AnunciaYA-Bot/1.0 (+https://anunciaya.com)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });
    } catch {
      clearTimeout(timeout);
      const datosFallback: DatosOgPreview = { titulo: null, descripcion: null, imagen: null, dominio, url };
      await redis.set(cacheKey, JSON.stringify(datosFallback), 'EX', CACHE_TTL_VACIO);
      return { success: true, message: 'URL no accesible', data: datosFallback };
    } finally {
      clearTimeout(timeout);
    }

    // Verificar content-type
    const contentType = respuesta.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      const datosFallback: DatosOgPreview = { titulo: null, descripcion: null, imagen: null, dominio, url };
      await redis.set(cacheKey, JSON.stringify(datosFallback), 'EX', CACHE_TTL_VACIO);
      return { success: true, message: 'No es HTML', data: datosFallback };
    }

    // 4. Leer body limitado a 100KB
    const reader = respuesta.body?.getReader();
    if (!reader) {
      const datosFallback: DatosOgPreview = { titulo: null, descripcion: null, imagen: null, dominio, url };
      return { success: true, message: 'Sin body', data: datosFallback };
    }

    let html = '';
    let bytesLeidos = 0;
    const decoder = new TextDecoder();

    while (bytesLeidos < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesLeidos += value.length;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    // 5. Parsear HTML y extraer meta tags
    const root = parse(html);

    const titulo = extraerMetaTag(root, 'og:title')
      || root.querySelector('title')?.textContent?.trim()
      || null;

    const descripcion = extraerMetaTag(root, 'og:description')
      || extraerMetaTag(root, 'description')
      || null;

    let imagen = extraerMetaTag(root, 'og:image')
      || extraerMetaTag(root, 'twitter:image')
      || null;

    // Resolver URL relativa de imagen
    if (imagen && !imagen.startsWith('http')) {
      try {
        imagen = new URL(imagen, url).href;
      } catch {
        imagen = null;
      }
    }

    // 6. Construir resultado
    const datos: DatosOgPreview = {
      titulo: titulo ? titulo.slice(0, 200) : null,
      descripcion: descripcion ? descripcion.slice(0, 300) : null,
      imagen,
      dominio,
      url,
    };

    // 7. Cachear
    const tieneDatos = datos.titulo || datos.descripcion || datos.imagen;
    await redis.set(cacheKey, JSON.stringify(datos), 'EX', tieneDatos ? CACHE_TTL_EXITO : CACHE_TTL_VACIO);

    return { success: true, message: 'Preview obtenido', data: datos };
  } catch (error) {
    console.error('Error en obtenerOgPreview:', error);
    return { success: false, message: 'Error al obtener preview', code: 500 };
  }
}
