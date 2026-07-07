/**
 * ayudaService.ts (Panel)
 * =======================
 * Cliente del módulo "Ayuda y Tutoriales" del Panel: CRUD de categorías y
 * artículos + subida de video/poster a R2 (presigned URL). Solo superadmin.
 *
 * Ubicación: apps/admin/src/services/ayudaService.ts
 */

import { api, type RespuestaAPI } from './api';

export type AppAyuda = 'anunciaya' | 'scanya';
export type AudienciaAyuda = 'cliente' | 'comerciante';

/**
 * Sección del Centro de Ayuda: las 3 ramificaciones que ve el usuario final
 * (AnunciaYA · Business Studio · ScanYA). Es una vista simplificada de la pareja
 * (app, audiencia) con la que persiste el backend — se mapea 1:1:
 *   AnunciaYA       → anunciaya  + cliente      (visible para Personal y Comercial)
 *   Business Studio → anunciaya  + comerciante  (solo Comercial)
 *   ScanYA          → scanya     + comerciante  (solo Comercial)
 * Así el Panel maneja UN solo concepto en vez de dos ejes cruzados.
 */
export type SeccionAyuda = 'anunciaya' | 'business_studio' | 'scanya';

export const SECCIONES: { valor: SeccionAyuda; label: string }[] = [
  { valor: 'anunciaya', label: 'AnunciaYA' },
  { valor: 'business_studio', label: 'Business Studio' },
  { valor: 'scanya', label: 'ScanYA' },
];

export const SECCION_LABEL: Record<SeccionAyuda, string> = {
  anunciaya: 'AnunciaYA',
  business_studio: 'Business Studio',
  scanya: 'ScanYA',
};

/** Deriva la sección a partir de la pareja (app, audiencia) guardada. */
export function seccionDeCategoria(app: AppAyuda, audiencia: AudienciaAyuda): SeccionAyuda {
  if (app === 'scanya') return 'scanya';
  if (audiencia === 'comerciante') return 'business_studio';
  return 'anunciaya';
}

/** Traduce la sección a la pareja (app, audiencia) que espera el backend. */
export function appAudDeSeccion(seccion: SeccionAyuda): { app: AppAyuda; audiencia: AudienciaAyuda } {
  switch (seccion) {
    case 'scanya':
      return { app: 'scanya', audiencia: 'comerciante' };
    case 'business_studio':
      return { app: 'anunciaya', audiencia: 'comerciante' };
    default:
      return { app: 'anunciaya', audiencia: 'cliente' };
  }
}

export interface ArticuloAdmin {
  id: string;
  categoriaId: string;
  slug: string;
  pregunta: string;
  respuesta: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  duracionSeg: number | null;
  videoVertical: boolean | null;
  orden: number;
  publicado: boolean;
  compartiblePublico: boolean;
  vistas: number;
  utilSi: number;
  utilNo: number;
}

export interface CategoriaAdmin {
  id: string;
  nombre: string;
  icono: string | null;
  app: AppAyuda;
  audiencia: AudienciaAyuda;
  orden: number;
  activo: boolean;
  articulos: ArticuloAdmin[];
}

export interface CategoriaInput {
  nombre: string;
  icono?: string | null;
  app: AppAyuda;
  audiencia: AudienciaAyuda;
  orden?: number;
  activo?: boolean;
}

export interface ArticuloInput {
  categoriaId: string;
  slug: string;
  pregunta: string;
  respuesta?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  duracionSeg?: number | null;
  videoVertical?: boolean | null;
  orden?: number;
  publicado?: boolean;
  compartiblePublico?: boolean;
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export async function listarAyuda(): Promise<CategoriaAdmin[]> {
  const { data } = await api.get<RespuestaAPI<CategoriaAdmin[]>>('/admin/ayuda');
  return data.data ?? [];
}

// ── Categorías ───────────────────────────────────────────────────────────────

export async function crearCategoria(input: CategoriaInput): Promise<{ id: string }> {
  const { data } = await api.post<RespuestaAPI<{ id: string }>>('/admin/ayuda/categorias', input);
  return data.data!;
}

export async function editarCategoria(id: string, input: Partial<CategoriaInput>): Promise<void> {
  await api.patch(`/admin/ayuda/categorias/${id}`, input);
}

export async function borrarCategoria(id: string): Promise<void> {
  await api.delete(`/admin/ayuda/categorias/${id}`);
}

// ── Artículos ────────────────────────────────────────────────────────────────

export async function crearArticulo(input: ArticuloInput): Promise<{ id: string }> {
  const { data } = await api.post<RespuestaAPI<{ id: string }>>('/admin/ayuda/articulos', input);
  return data.data!;
}

export async function editarArticulo(id: string, input: Partial<ArticuloInput>): Promise<void> {
  await api.patch(`/admin/ayuda/articulos/${id}`, input);
}

export async function borrarArticulo(id: string): Promise<void> {
  await api.delete(`/admin/ayuda/articulos/${id}`);
}

// ── Subida a R2 (presigned URL) ──────────────────────────────────────────────

async function subirArchivo(file: File, tipo: 'video' | 'poster'): Promise<string> {
  const { data } = await api.post<RespuestaAPI<{ uploadUrl: string; publicUrl: string }>>(
    '/admin/ayuda/upload',
    { nombreArchivo: file.name, contentType: file.type, tipo },
  );
  const info = data.data;
  if (!info?.uploadUrl) throw new Error('No se pudo preparar la subida.');

  // PUT directo del archivo a R2 (no pasa por el backend).
  const put = await fetch(info.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!put.ok) throw new Error('No se pudo subir el archivo a R2.');
  return info.publicUrl;
}

export function subirVideoAyuda(file: File): Promise<string> {
  return subirArchivo(file, 'video');
}

export function subirPosterAyuda(file: File): Promise<string> {
  return subirArchivo(file, 'poster');
}

/** Borra de R2 un archivo ya subido pero que no llegó a guardarse (cancelar el modal). */
export async function borrarArchivoAyuda(url: string): Promise<void> {
  await api.delete('/admin/ayuda/upload', { data: { url } });
}

/**
 * Optimiza una imagen en el navegador antes de subirla: la redimensiona a un
 * ancho máximo y la re-encode a WebP (menos peso, sin pérdida visible). Si algo
 * falla o no reduce el tamaño, devuelve el archivo original.
 */
export async function optimizarImagen(file: File, maxAncho = 1280, calidad = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxAncho / bitmap.width);
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));
    if (!blob || blob.size >= file.size) return file; // si no mejora, mantener el original
    const nombre = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], nombre, { type: 'image/webp' });
  } catch {
    return file;
  }
}
