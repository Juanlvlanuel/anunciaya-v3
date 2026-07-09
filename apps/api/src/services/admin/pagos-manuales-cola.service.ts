/**
 * admin/pagos-manuales-cola.service.ts
 * ====================================
 * Lado admin de la Pieza 3 (pago manual con comprobante) — la COLA "Por verificar" del módulo
 * Suscripciones del Panel. El dueño sube su comprobante desde Mi Perfil (crea una fila en
 * `pagos_manuales_solicitudes`, estado 'pendiente'); aquí el equipo:
 *   - listarSolicitudesPendientes — la cola, acotada por rol (super = todas; gerente = su región).
 *   - aprobarSolicitud            — reusa marcarPagado (activa el negocio + recibo + empuja Stripe)
 *                                   y marca la solicitud 'aprobado' enlazando el recibo generado.
 *   - rechazarSolicitud           — marca 'rechazado' con motivo.
 *   - obtener/guardarDatosCobro   — los datos de depósito que ve el dueño (config global, solo super edita).
 *
 * El alcance del NEGOCIO al aprobar lo valida marcarPagado (cargarNegocioConAlcance); aquí solo
 * validamos el alcance para LISTAR/RECHAZAR.
 *
 * Ubicación: apps/api/src/services/admin/pagos-manuales-cola.service.ts
 */

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { configuracionSistema, negocios, pagosManualesSolicitudes, pagosMembresia, usuarios } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { marcarPagado } from './negocios-acciones.service.js';
import { registrarAuditoria } from './auditoria.service.js';
import { resetearCacheConfig } from '../configuracion.service.js';
import { CLAVE_DATOS_COBRO, DATOS_COBRO_DEFAULT, obtenerDatosCobro } from '../membresia.service.js';
import type { DatosCobro } from '../membresia.service.js';
import { notificarPagoRechazado, notificarPagoAprobado } from '../notificaciones.service.js';

// =============================================================================
// ALCANCE POR ROL (sobre el negocio de la solicitud)
// =============================================================================

/** Predicado de región para el gerente (matriz del negocio en su región). `undefined` = sin filtro (super). */
function alcanceRegion(panel: UsuarioPanel): ReturnType<typeof sql> | undefined {
    if (panel.rolEquipo === 'gerente') {
        return sql`EXISTS (SELECT 1 FROM negocio_sucursales ns JOIN ciudades c ON c.id = ns.ciudad_id
            WHERE ns.negocio_id = ${pagosManualesSolicitudes.negocioId} AND ns.es_principal = true AND c.region_id = ${panel.regionId})`;
    }
    return undefined;
}

// =============================================================================
// LISTAR LA COLA
// =============================================================================

export interface SolicitudCola {
    id: string;
    negocioId: string;
    negocioNombre: string;
    logoUrl: string | null;
    correoDueno: string | null;
    estadoMembresia: string;
    monto: string;
    mesesDeclarados: number;
    referencia: string | null;
    nota: string | null;
    comprobanteUrl: string;
    creadoAt: string;
}

export async function listarSolicitudesPendientes(panel: UsuarioPanel): Promise<SolicitudCola[]> {
    // Gerente sin región → no ve nada.
    if (panel.rolEquipo === 'gerente' && !panel.regionId) return [];

    const filas = await db
        .select({
            id: pagosManualesSolicitudes.id,
            negocioId: pagosManualesSolicitudes.negocioId,
            negocioNombre: negocios.nombre,
            logoUrl: negocios.logoUrl,
            correoDueno: usuarios.correo,
            estadoMembresia: negocios.estadoMembresia,
            monto: pagosManualesSolicitudes.monto,
            mesesDeclarados: pagosManualesSolicitudes.mesesDeclarados,
            referencia: pagosManualesSolicitudes.referencia,
            nota: pagosManualesSolicitudes.nota,
            comprobanteUrl: pagosManualesSolicitudes.comprobanteUrl,
            creadoAt: pagosManualesSolicitudes.creadoAt,
        })
        .from(pagosManualesSolicitudes)
        .innerJoin(negocios, eq(negocios.id, pagosManualesSolicitudes.negocioId))
        .innerJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(and(eq(pagosManualesSolicitudes.estado, 'pendiente'), alcanceRegion(panel)))
        .orderBy(desc(pagosManualesSolicitudes.creadoAt));

    return filas.map((f) => ({
        ...f,
        logoUrl: f.logoUrl ?? null,
        correoDueno: f.correoDueno ?? null,
        referencia: f.referencia ?? null,
        nota: f.nota ?? null,
    }));
}

// =============================================================================
// CARGAR UNA SOLICITUD CON ALCANCE (para aprobar/rechazar)
// =============================================================================

type ResultadoCola =
    | { ok: true }
    | { ok: false; status: number; mensaje: string };

interface SolicitudCargada {
    id: string;
    negocioId: string;
    estado: string;
    monto: string;
    mesesDeclarados: number;
    // Vigencia actual del negocio (para calcular la nueva al aprobar).
    fechaProximoCobro: string | null;
    fechaVencimiento: string | null;
}

async function cargarSolicitudConAlcance(
    panel: UsuarioPanel,
    solicitudId: string
): Promise<{ ok: true; solicitud: SolicitudCargada } | { ok: false; status: number; mensaje: string }> {
    if (panel.rolEquipo === 'gerente' && !panel.regionId) {
        return { ok: false, status: 404, mensaje: 'Solicitud no encontrada.' };
    }
    const [s] = await db
        .select({
            id: pagosManualesSolicitudes.id,
            negocioId: pagosManualesSolicitudes.negocioId,
            estado: pagosManualesSolicitudes.estado,
            monto: pagosManualesSolicitudes.monto,
            mesesDeclarados: pagosManualesSolicitudes.mesesDeclarados,
            fechaProximoCobro: negocios.fechaProximoCobro,
            fechaVencimiento: negocios.fechaVencimiento,
        })
        .from(pagosManualesSolicitudes)
        .innerJoin(negocios, eq(negocios.id, pagosManualesSolicitudes.negocioId))
        .where(and(eq(pagosManualesSolicitudes.id, solicitudId), alcanceRegion(panel)))
        .limit(1);

    if (!s) return { ok: false, status: 404, mensaje: 'Solicitud no encontrada.' };
    if (s.estado !== 'pendiente') {
        return { ok: false, status: 409, mensaje: 'Esta solicitud ya fue revisada.' };
    }
    return { ok: true, solicitud: s };
}

/**
 * Nueva vigencia al aprobar: suma N meses sobre el MAYOR entre hoy y la vigencia vigente
 * (respeta el periodo aún no consumido, igual que "Registrar pago" del Panel). Tope 2 años (Stripe).
 */
function calcularHasta(solicitud: SolicitudCargada, meses: number): string {
    const hoy = new Date();
    const vigenteISO = solicitud.fechaProximoCobro ?? solicitud.fechaVencimiento;
    const vigente = vigenteISO ? new Date(vigenteISO) : hoy;
    const base = vigente > hoy ? vigente : hoy;
    const hasta = new Date(base);
    hasta.setMonth(hasta.getMonth() + meses);
    const tope = new Date();
    tope.setFullYear(tope.getFullYear() + 2);
    return (hasta > tope ? tope : hasta).toISOString();
}

// =============================================================================
// APROBAR (reusa marcarPagado: activa negocio + recibo + empuja Stripe)
// =============================================================================

export interface AprobarInput {
    monto?: number;           // monto confirmado por el admin (default: el declarado por el dueño)
    meses?: number | null;    // meses confirmados por el admin (default: los declarados)
}

export async function aprobarSolicitud(
    panel: UsuarioPanel,
    solicitudId: string,
    datos: AprobarInput
): Promise<ResultadoCola> {
    const cargada = await cargarSolicitudConAlcance(panel, solicitudId);
    if (!cargada.ok) return cargada;
    const sol = cargada.solicitud;

    const meses = datos.meses ?? sol.mesesDeclarados;
    const monto = datos.monto ?? Number(sol.monto);
    if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
        return { ok: false, status: 400, mensaje: 'Los meses deben estar entre 1 y 24.' };
    }
    if (!Number.isFinite(monto) || monto <= 0) {
        return { ok: false, status: 400, mensaje: 'El monto debe ser mayor a 0.' };
    }
    const hasta = calcularHasta(sol, meses);

    // Registra el pago real (concepto 'transferencia' = ingreso manual). marcarPagado valida el
    // alcance sobre el negocio, activa la membresía, escribe el recibo y empuja Stripe si aplica.
    const r = await marcarPagado(panel, sol.negocioId, {
        hasta,
        concepto: 'transferencia',
        monto,
        meses,
    });
    if (!r.ok) return r;

    // Enlaza el recibo recién generado (el más reciente del negocio) y marca la solicitud aprobada.
    const [reciboReciente] = await db
        .select({ id: pagosMembresia.id })
        .from(pagosMembresia)
        .where(eq(pagosMembresia.negocioId, sol.negocioId))
        .orderBy(desc(pagosMembresia.createdAt))
        .limit(1);

    await db
        .update(pagosManualesSolicitudes)
        .set({
            estado: 'aprobado',
            revisadoPor: panel.usuarioId,
            revisadoAt: new Date().toISOString(),
            pagoMembresiaId: reciboReciente?.id ?? null,
        })
        .where(eq(pagosManualesSolicitudes.id, solicitudId));

    await registrarAuditoria(panel, {
        accion: 'pago_manual_aprobar',
        entidadTipo: 'negocio',
        entidadId: sol.negocioId,
        datosPrevios: null,
        datosNuevos: { solicitudId, monto, meses, hasta },
        motivo: null,
    });

    // Aviso in-app al dueño (personal, best-effort): su pago fue aprobado y la membresía quedó activa.
    await notificarPagoAprobado(sol.negocioId, hasta);

    return { ok: true };
}

// =============================================================================
// RECHAZAR
// =============================================================================

export async function rechazarSolicitud(
    panel: UsuarioPanel,
    solicitudId: string,
    motivo: string
): Promise<ResultadoCola> {
    const cargada = await cargarSolicitudConAlcance(panel, solicitudId);
    if (!cargada.ok) return cargada;
    const sol = cargada.solicitud;

    await db
        .update(pagosManualesSolicitudes)
        .set({
            estado: 'rechazado',
            revisadoPor: panel.usuarioId,
            revisadoAt: new Date().toISOString(),
            motivoRechazo: motivo.trim().slice(0, 500),
        })
        .where(eq(pagosManualesSolicitudes.id, solicitudId));

    await registrarAuditoria(panel, {
        accion: 'pago_manual_rechazar',
        entidadTipo: 'negocio',
        entidadId: sol.negocioId,
        datosPrevios: null,
        datosNuevos: { solicitudId, motivo: motivo.trim().slice(0, 500) },
        motivo: null,
    });

    // Aviso in-app al dueño (personal, best-effort): su comprobante fue rechazado.
    await notificarPagoRechazado(sol.negocioId, motivo);

    return { ok: true };
}

// =============================================================================
// DATOS DE COBRO (config global de depósito que ve el dueño)
// =============================================================================

/** Lee los datos de depósito (para mostrarlos en el Panel; el dueño los ve vía /pagos/datos-cobro). */
export async function obtenerDatosCobroAdmin(): Promise<DatosCobro> {
    return obtenerDatosCobro();
}

/** Guarda los datos de depósito en `configuracion_sistema` (clave JSON). Solo superadmin (la ruta lo restringe). */
export async function guardarDatosCobro(panel: UsuarioPanel, datos: DatosCobro): Promise<void> {
    const valor = JSON.stringify({ ...DATOS_COBRO_DEFAULT, ...datos });
    await db
        .insert(configuracionSistema)
        .values({
            clave: CLAVE_DATOS_COBRO,
            valor,
            tipo: 'json',
            descripcion: 'Datos de cuenta de AnunciaYA para pagos manuales (transferencia/depósito).',
            categoria: 'pagos',
            actualizadoPor: panel.usuarioId,
        })
        .onConflictDoUpdate({
            target: configuracionSistema.clave,
            set: { valor, actualizadoPor: panel.usuarioId, updatedAt: new Date().toISOString() },
        });

    resetearCacheConfig();

    await registrarAuditoria(panel, {
        accion: 'datos_cobro_actualizar',
        entidadTipo: 'configuracion',
        entidadId: null,
        datosPrevios: null,
        datosNuevos: { clave: CLAVE_DATOS_COBRO },
        motivo: null,
    });
}
