/**
 * admin/resumen.service.ts
 * ========================
 * Lectura del módulo "Resumen / inicio" del Panel Admin — el tablero de bienvenida: KPIs gruesos +
 * cola de pendientes accionable, scoped por rol. SOLO LECTURA (orquesta consultas de otros services;
 * no agrega lógica de dominio propia ni muta datos).
 *
 * ALCANCE POR ROL (matriz de Panel_Admin.md · "Resumen / inicio"):
 *   - superadmin → toda la plataforma (o la región del filtro global vía `panelConFiltroRegion`).
 *   - gerente    → su región.
 *   - vendedor   → lo suyo (su cartera, sus comisiones, su efectivo).
 *
 * El filtro global de región del superadmin lo aplica el controller con `panelConFiltroRegion` ANTES de
 * llamar aquí (lo convierte en "gerente de esa región" para las lecturas). Cada consulta reusa el mismo
 * predicado de alcance de su service de dominio — no se reinventa aquí.
 *
 * Ubicación: apps/api/src/services/admin/resumen.service.ts
 */

import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import {
    contarNegociosActivos,
    listarNegociosEnGracia,
    resolverEmbajadorId,
    type ListaEnGracia,
} from './negocios.service.js';
import { contarUsuarios } from './usuarios.service.js';
import { resumenIngresos } from './suscripciones.service.js';
import { listarEfectivoPendiente, saldoEfectivo, type EfectivoPendiente } from './comisiones-efectivo.service.js';
import { comisionesPendientesDe, listarComisionesPorPagar, type ComisionesPorPagar } from './comisiones-liquidacion.service.js';
import { listarSolicitudesPendientes, type SolicitudCola } from './pagos-manuales-cola.service.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Un KPI del tablero. El front mapea `clave` → etiqueta, formato, acento y sección destino. */
export interface KpiResumen {
    clave: string;
    valor: number;
}

export interface SolicitudesResumen {
    items: SolicitudCola[]; // hasta `limite` para el tablero del Resumen
    total: number;          // cuántas solicitudes de pago manual hay por verificar
}

export interface PendientesResumen {
    efectivo: EfectivoPendiente;
    gracia: ListaEnGracia;
    /** Pagos manuales con comprobante por verificar (super + gerente de su región). */
    solicitudes: SolicitudesResumen;
    /** Comisiones por liquidar a vendedores (solo superadmin). */
    comisiones: ComisionesPorPagar;
    /** Total de tareas para el contador de la campana. */
    contador: number;
}

export interface ResumenPanel {
    rol: string;
    kpis: KpiResumen[];
    pendientes: PendientesResumen;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Inicio del mes en curso (ISO) — ventana de "ingresos del mes" / "cobros fallidos del mes". */
function inicioDeMesISO(): string {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
}

// =============================================================================
// RESUMEN
// =============================================================================

/**
 * Arma el tablero del Resumen según el rol. Para super/gerente: KPIs de plataforma/región + cola de
 * pendientes de la red. Para vendedor: KPIs de su operación + su propio efectivo y sus negocios en gracia.
 */
export async function obtenerResumen(panel: UsuarioPanel): Promise<ResumenPanel> {
    if (panel.rolEquipo === 'vendedor') {
        return resumenVendedor(panel);
    }
    return resumenAdmin(panel);
}

/** Super y gerente (y super con lente de región, que llega ya como gerente). */
async function resumenAdmin(panel: UsuarioPanel): Promise<ResumenPanel> {
    const desdeMes = inicioDeMesISO();

    const [negociosActivos, usuarios, ingresos, efectivo, gracia, solicitudesArr, comisiones] = await Promise.all([
        contarNegociosActivos(panel),
        contarUsuarios(panel.rolEquipo, panel.regionId),
        resumenIngresos(panel, desdeMes),
        listarEfectivoPendiente(panel),
        listarNegociosEnGracia(panel),
        listarSolicitudesPendientes(panel),     // pagos manuales por verificar (super + gerente)
        listarComisionesPorPagar(panel),         // comisiones por liquidar (solo super)
    ]);

    const kpis: KpiResumen[] = [
        { clave: 'negociosActivos', valor: negociosActivos },
        { clave: 'usuarios', valor: usuarios },
        { clave: 'ingresosMes', valor: ingresos.ingresos },
        { clave: 'cobrosFallidos', valor: ingresos.fallidos },
    ];

    const solicitudes: SolicitudesResumen = { items: solicitudesArr.slice(0, 5), total: solicitudesArr.length };

    return {
        rol: panel.rolEquipo,
        kpis,
        pendientes: {
            efectivo,
            gracia,
            solicitudes,
            comisiones,
            contador: efectivo.totalVendedores + gracia.total + solicitudes.total + comisiones.totalVendedores,
        },
    };
}

/** Vendedor: lo suyo. Cartera activa, comisiones pendientes y efectivo por entregar (propio). */
async function resumenVendedor(panel: UsuarioPanel): Promise<ResumenPanel> {
    const embajadorId = await resolverEmbajadorId(panel.usuarioId);

    const [carteraActiva, comisiones, saldo, gracia] = await Promise.all([
        contarNegociosActivos(panel),
        embajadorId ? comisionesPendientesDe(embajadorId) : Promise.resolve(0),
        embajadorId ? saldoEfectivo(embajadorId) : Promise.resolve(0),
        listarNegociosEnGracia(panel),
    ]);

    const kpis: KpiResumen[] = [
        { clave: 'carteraActiva', valor: carteraActiva },
        { clave: 'comisionesPendientes', valor: comisiones },
        { clave: 'efectivoPorEntregar', valor: saldo },
    ];

    // El vendedor no ve la red: su "efectivo" es su propio saldo (sin items de otros vendedores).
    const efectivo: EfectivoPendiente = {
        items: [],
        totalVendedores: saldo > 0 ? 1 : 0,
        monto: saldo,
    };

    return {
        rol: panel.rolEquipo,
        kpis,
        pendientes: {
            efectivo,
            gracia,
            // El vendedor no verifica pagos manuales (super/gerente) ni liquida comisiones (solo super).
            solicitudes: { items: [], total: 0 },
            comisiones: { items: [], totalVendedores: 0, monto: 0 },
            contador: (saldo > 0 ? 1 : 0) + gracia.total,
        },
    };
}
