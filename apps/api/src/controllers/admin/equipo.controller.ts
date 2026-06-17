/**
 * admin/equipo.controller.ts
 * ==========================
 * Controllers de la sección "Equipo y accesos" del Panel Admin: lecturas (lista paginada + ficha).
 * Leen query/params, validan, llaman al service y arman la respuesta. El acceso y el rol ya los
 * validó `requierePanel(['superadmin','gerente'])` en la ruta.
 *
 * Las acciones de escritura (alta de vendedor/gerente, editar datos, reasignar región, revocar/
 * reactivar acceso) ya están implementadas; sus controllers viven más abajo. La gestión de
 * ciudades/territorio del vendedor no es de este módulo (se difirió a "Vendedores y comisiones");
 * aquí solo se asigna la cobertura inicial al dar de alta.
 *
 * Ubicación: apps/api/src/controllers/admin/equipo.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarEquipo,
    obtenerMiembro,
    contarEquipo,
    listarCiudadesEquipo,
    buscarCuentasPorCorreo,
    ROLES_EQUIPO,
    ORDENES_EQUIPO,
    type RolEquipoFiltro,
    type OrdenEquipo,
} from '../../services/admin/equipo.service.js';
import {
    altaVendedor,
    altaGerente,
    revocarAcceso,
    reactivarAcceso,
    editarDatos,
    reasignarRegion,
    sugerirCodigoReferido,
} from '../../services/admin/equipo-acciones.service.js';
import {
    altaVendedorSchema,
    altaGerenteSchema,
    editarDatosSchema,
    reasignarRegionSchema,
} from '../../validations/admin/equipo.schema.js';

const POR_PAGINA_DEFAULT = 20;
const POR_PAGINA_MAX = 100;

/** Convierte un query param suelto a entero positivo con tope, o el default. */
function enteroPositivo(valor: unknown, porDefecto: number, maximo?: number): number {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 1) return porDefecto;
    const entero = Math.floor(n);
    return maximo ? Math.min(entero, maximo) : entero;
}

/** Región efectiva para la consulta. El gerente usa SIEMPRE su región del token (ignora ?regionId por
 *  seguridad); el superadmin usa la "lente" ?regionId si la mandó (si no, ve todo el equipo). */
function regionDeConsulta(req: Request): string | undefined {
    if (req.usuarioPanel?.rolEquipo === 'gerente') return req.usuarioPanel.regionId ?? undefined;
    const q = req.query.regionId;
    return typeof q === 'string' && q.trim() ? q.trim() : undefined;
}

// =============================================================================
// GET /api/admin/equipo
// =============================================================================

export async function listarEquipoController(req: Request, res: Response): Promise<void> {
    try {
        const busquedaRaw = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
        const rolRaw = typeof req.query.rol === 'string' ? req.query.rol : '';
        const ordenRaw = typeof req.query.orden === 'string' ? req.query.orden : '';

        const rol = ROLES_EQUIPO.includes(rolRaw as RolEquipoFiltro) ? (rolRaw as RolEquipoFiltro) : undefined;
        const orden = ORDENES_EQUIPO.includes(ordenRaw as OrdenEquipo) ? (ordenRaw as OrdenEquipo) : undefined;

        const resultado = await listarEquipo({
            busqueda: busquedaRaw || undefined,
            rol,
            orden,
            pagina: enteroPositivo(req.query.pagina, 1),
            porPagina: enteroPositivo(req.query.porPagina, POR_PAGINA_DEFAULT, POR_PAGINA_MAX),
            rolSolicitante: req.usuarioPanel?.rolEquipo,
            regionSolicitante: regionDeConsulta(req),
        });

        res.status(200).json({ success: true, message: 'Equipo obtenido', data: resultado });
    } catch (error) {
        console.error('Error en listarEquipoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el equipo',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/equipo/conteo   (super + gerente · total para el badge del menú)
// =============================================================================

export async function contarEquipoController(req: Request, res: Response): Promise<void> {
    try {
        const total = await contarEquipo(req.usuarioPanel?.rolEquipo, regionDeConsulta(req));
        res.status(200).json({ success: true, message: 'Conteo obtenido', data: { total } });
    } catch (error) {
        console.error('Error en contarEquipoController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el conteo' });
    }
}

// =============================================================================
// GET /api/admin/equipo/:id
// =============================================================================

export async function obtenerMiembroController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const miembro = await obtenerMiembro(id, req.usuarioPanel?.rolEquipo, regionDeConsulta(req));
        if (!miembro) {
            res.status(404).json({ success: false, message: 'Miembro del equipo no encontrado' });
            return;
        }
        res.status(200).json({ success: true, message: 'Miembro obtenido', data: miembro });
    } catch (error) {
        console.error('Error en obtenerMiembroController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el miembro del equipo',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/equipo/ciudades   (catálogo para el selector del wizard)
// =============================================================================

export async function listarCiudadesController(req: Request, res: Response): Promise<void> {
    try {
        const regionIdParam = typeof req.query.regionId === 'string' ? req.query.regionId.trim() : undefined;
        const ciudades = await listarCiudadesEquipo(
            req.usuarioPanel?.rolEquipo,
            req.usuarioPanel?.regionId ?? null,
            regionIdParam || undefined,
        );
        res.status(200).json({ success: true, message: 'Ciudades obtenidas', data: ciudades });
    } catch (error) {
        console.error('Error en listarCiudadesController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las ciudades' });
    }
}

// =============================================================================
// GET /api/admin/equipo/buscar-cuenta?correo=   (typeahead del alta)
// =============================================================================

export async function buscarCuentaController(req: Request, res: Response): Promise<void> {
    try {
        const correo = typeof req.query.correo === 'string' ? req.query.correo : '';
        const cuentas = await buscarCuentasPorCorreo(correo);
        res.status(200).json({ success: true, message: 'Cuentas encontradas', data: cuentas });
    } catch (error) {
        console.error('Error en buscarCuentaController:', error);
        res.status(500).json({ success: false, message: 'Error al buscar cuentas' });
    }
}

// =============================================================================
// GET /api/admin/equipo/sugerir-codigo?nombre=&apellidos=
// =============================================================================

export async function sugerirCodigoController(req: Request, res: Response): Promise<void> {
    try {
        const nombre = typeof req.query.nombre === 'string' ? req.query.nombre.trim() : '';
        const apellidos = typeof req.query.apellidos === 'string' ? req.query.apellidos.trim() : '';
        const codigo = await sugerirCodigoReferido(nombre, apellidos);
        res.status(200).json({ success: true, message: 'Código sugerido', data: { codigo } });
    } catch (error) {
        console.error('Error en sugerirCodigoController:', error);
        res.status(500).json({ success: false, message: 'Error al sugerir el código' });
    }
}

// =============================================================================
// POST /api/admin/equipo/vendedores   (alta de vendedor — crear o promover)
// =============================================================================

export async function altaVendedorController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = altaVendedorSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await altaVendedor(req.usuarioPanel!, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(201).json({
            success: true,
            message: r.promovido ? 'Cuenta promovida a vendedor' : 'Vendedor dado de alta',
            data: { usuarioId: r.usuarioId, promovido: r.promovido, correoEnviado: r.correoEnviado },
        });
    } catch (error) {
        console.error('Error en altaVendedorController:', error);
        res.status(500).json({ success: false, message: 'Error al dar de alta al vendedor' });
    }
}

// =============================================================================
// POST /api/admin/equipo/:id/revocar   (revocar acceso del vendedor)
// =============================================================================

export async function revocarAccesoController(req: Request, res: Response): Promise<void> {
    try {
        const r = await revocarAcceso(req.usuarioPanel!, req.params.id);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Acceso revocado' });
    } catch (error) {
        console.error('Error en revocarAccesoController:', error);
        res.status(500).json({ success: false, message: 'Error al revocar el acceso' });
    }
}

// =============================================================================
// POST /api/admin/equipo/:id/reactivar   (devolver el acceso a un vendedor revocado)
// =============================================================================

export async function reactivarAccesoController(req: Request, res: Response): Promise<void> {
    try {
        const r = await reactivarAcceso(req.usuarioPanel!, req.params.id);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Acceso reactivado' });
    } catch (error) {
        console.error('Error en reactivarAccesoController:', error);
        res.status(500).json({ success: false, message: 'Error al reactivar el acceso' });
    }
}

// =============================================================================
// POST /api/admin/equipo/gerentes   (alta de gerente — solo superadmin)
// =============================================================================

export async function altaGerenteController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = altaGerenteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await altaGerente(req.usuarioPanel!, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(201).json({
            success: true,
            message: r.promovido ? 'Cuenta promovida a gerente' : 'Gerente dado de alta',
            data: { usuarioId: r.usuarioId, promovido: r.promovido, correoEnviado: r.correoEnviado },
        });
    } catch (error) {
        console.error('Error en altaGerenteController:', error);
        res.status(500).json({ success: false, message: 'Error al dar de alta al gerente' });
    }
}

// =============================================================================
// PATCH /api/admin/equipo/:id/datos   (corregir nombre/apellidos/teléfono/correo)
// =============================================================================

export async function editarDatosController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = editarDatosSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await editarDatos(req.usuarioPanel!, req.params.id, parsed.data);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Datos actualizados', data: { correoEnviado: r.correoEnviado } });
    } catch (error) {
        console.error('Error en editarDatosController:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar los datos' });
    }
}

// =============================================================================
// PATCH /api/admin/equipo/:id/region   (reasignar región de un gerente — solo superadmin)
// =============================================================================

export async function reasignarRegionController(req: Request, res: Response): Promise<void> {
    try {
        const parsed = reasignarRegionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
            return;
        }
        const r = await reasignarRegion(req.usuarioPanel!, req.params.id, parsed.data.regionId);
        if (!r.ok) {
            res.status(r.status).json({ success: false, message: r.mensaje });
            return;
        }
        res.status(200).json({ success: true, message: 'Región reasignada' });
    } catch (error) {
        console.error('Error en reasignarRegionController:', error);
        res.status(500).json({ success: false, message: 'Error al reasignar la región' });
    }
}
