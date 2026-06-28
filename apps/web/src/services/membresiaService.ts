/**
 * membresiaService.ts
 * ====================
 * Llamadas API de la sección "Membresía / Pagos" de Mi Perfil (Modo Personal).
 * Es el espejo self-service del estado de membresía que el Panel Admin ve por negocio,
 * acotado al negocio del usuario logueado.
 *
 * ENDPOINTS:
 * - GET /api/pagos/mi-membresia                       → estado + historial de recibos
 * - GET /api/pagos/mi-recibo/:reciboId/descargar      → URL del PDF del recibo
 *
 * Ubicación: apps/web/src/services/membresiaService.ts
 */

import { get, post } from './api';

// =============================================================================
// TIPOS (espejo de apps/api/src/services/membresia.service.ts)
// =============================================================================

export type EstadoMembresia = 'al_corriente' | 'en_gracia' | 'suspendido' | 'cancelado';
export type MetodoCobro = 'tarjeta' | 'manual';
export type ConceptoRecibo = 'efectivo' | 'transferencia' | 'cortesia' | 'tarjeta';

export interface ReciboMembresia {
    id: string;
    folio: number | null;
    concepto: ConceptoRecibo;
    monto: string | null;       // MXN; null en cortesía
    fechaPago: string | null;
    periodoHasta: string | null;
    anulado: boolean;
}

export interface NegocioMembresia {
    id: string;
    nombre: string;
    logoUrl: string | null;
    estadoMembresia: EstadoMembresia;
    estadoAdmin: 'activo' | 'suspendido' | 'archivado';
    metodoCobro: MetodoCobro;
    activo: boolean;
    fechaProximoCobro: string | null;
    fechaVencimiento: string | null;
    fechaLimiteGracia: string | null;
    fechaPrimerPago: string | null;
    /** ¿El dueño puede abrir el Customer Portal de Stripe? (tiene stripe_customer_id). */
    puedeAbrirPortal: boolean;
}

export interface SolicitudPendiente {
    id: string;
    monto: string;
    mesesDeclarados: number;
    referencia: string | null;
    nota: string | null;
    comprobanteUrl: string;
    creadoAt: string;
}

export interface UltimoRechazo {
    id: string;
    monto: string;
    mesesDeclarados: number;
    motivo: string | null;
    revisadoAt: string | null;
}

export interface SolicitudRechazada {
    id: string;
    monto: string;
    mesesDeclarados: number;
    motivo: string | null;
    comprobanteUrl: string;
    fecha: string | null;
}

export interface MiMembresia {
    tieneNegocio: boolean;
    solicitudPendiente: SolicitudPendiente | null;
    ultimoRechazo: UltimoRechazo | null;
    solicitudesRechazadas: SolicitudRechazada[];
    negocio: NegocioMembresia | null;
    recibos: ReciboMembresia[];
}

export interface DatosCobro {
    banco: string;
    titular: string;
    clabe: string;
    cuenta: string;
    tarjeta: string;
    instrucciones: string;
    /** Precio mensual de la membresía (MXN). El total a pagar = meses × este precio. */
    precioMensual: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

/** Estado de la membresía del negocio del usuario logueado + historial de recibos. */
export async function obtenerMiMembresia() {
    return get<MiMembresia>('/pagos/mi-membresia');
}

/** URL del PDF de un recibo propio (validado en backend contra el negocio del usuario). */
export async function obtenerUrlReciboMembresia(reciboId: string) {
    return get<{ reciboUrl: string }>(`/pagos/mi-recibo/${reciboId}/descargar`);
}

/** Crea una sesión del Customer Portal de Stripe y devuelve su URL (actualizar tarjeta + pagar). */
export async function crearSesionPortal() {
    return post<{ url: string }>('/pagos/portal');
}

// ─── Pago manual (transferencia/depósito + comprobante) ───

/** Datos de la cuenta de AnunciaYA para depositar/transferir. */
export async function obtenerDatosCobro() {
    return get<DatosCobro>('/pagos/datos-cobro');
}

/** Presigned URL para subir el comprobante a R2 (forma compatible con useR2Upload). */
export async function generarUrlComprobante(nombreArchivo: string, contentType: string) {
    return post<{ uploadUrl: string; publicUrl: string; key?: string; expiresIn?: number }>(
        '/pagos/comprobante/url-subida',
        { nombreArchivo, contentType },
    );
}

export interface CrearSolicitudInput {
    monto: number;
    mesesDeclarados: number;
    referencia?: string | null;
    nota?: string | null;
    comprobanteUrl: string;
}

/** Crea la solicitud de pago manual (cola de verificación). */
export async function crearSolicitudPagoManual(datos: CrearSolicitudInput) {
    return post<{ solicitudId: string }>('/pagos/solicitud-pago-manual', datos);
}

// ─── Cambio de método de cobro (tarjeta ↔ manual) ───

/** Pasa de cobro con tarjeta a pago manual (cancela el cobro automático, respeta vigencia). */
export async function cambiarAPagoManual() {
    return post<{ advertencia: string | null }>('/pagos/cambiar-a-manual');
}

/** Activa el cobro con tarjeta en un negocio manual: devuelve la URL del Checkout de Stripe. */
export async function cambiarATarjeta() {
    return post<{ checkoutUrl: string }>('/pagos/cambiar-a-tarjeta');
}
