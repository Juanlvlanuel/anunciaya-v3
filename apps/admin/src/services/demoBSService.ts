/**
 * demoBSService.ts
 * ================
 * Llamadas al backend del Demo de Business Studio (ver docs/arquitectura/Demo_Business_Studio.md).
 * El vendedor abre/reinicia su copia del demo; el backend devuelve un handoff token para entrar a BS.
 */

import { api } from './api';

interface RespuestaAPI<T> {
    success: boolean;
    message?: string;
    data?: T;
    errorCode?: string;
}

export interface EstadoDemo {
    existeCopia: boolean;
    creadaAt: string | null;
    hayMaestro: boolean;
}

export interface AbrirDemoResp {
    negocioId: string;
    sucursalPrincipalId: string;
    handoffToken: string;
}

export async function obtenerEstadoDemo(): Promise<EstadoDemo> {
    const { data } = await api.get<RespuestaAPI<EstadoDemo>>('/admin/demo-bs/estado');
    return data.data ?? { existeCopia: false, creadaAt: null, hayMaestro: false };
}

// La primera vez clona todo el maestro en la BD; damos margen sobre el timeout global (10s).
const TIMEOUT_CLONADO = 30000;

export async function abrirDemo(): Promise<AbrirDemoResp> {
    const { data } = await api.post<RespuestaAPI<AbrirDemoResp>>('/admin/demo-bs/abrir', undefined, { timeout: TIMEOUT_CLONADO });
    if (!data.data) throw new Error(data.message || 'No se pudo abrir el demo');
    return data.data;
}

export async function reiniciarDemo(): Promise<AbrirDemoResp> {
    const { data } = await api.post<RespuestaAPI<AbrirDemoResp>>('/admin/demo-bs/reiniciar', undefined, { timeout: TIMEOUT_CLONADO });
    if (!data.data) throw new Error(data.message || 'No se pudo reiniciar el demo');
    return data.data;
}
