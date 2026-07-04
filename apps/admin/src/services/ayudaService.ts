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

export interface ArticuloAdmin {
  id: string;
  categoriaId: string;
  slug: string;
  pregunta: string;
  respuesta: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  duracionSeg: number | null;
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
