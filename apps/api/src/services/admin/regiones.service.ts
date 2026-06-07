/**
 * admin/regiones.service.ts
 * =========================
 * Lista de regiones configuradas para el filtro global del Panel. Solo el
 * superadmin lo usa: "ver el Panel como el gerente de la región X" (lente de
 * visibilidad). Gerente/vendedor tienen alcance fijo por su token.
 *
 * Ubicación: apps/api/src/services/admin/regiones.service.ts
 */

import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { regiones } from '../../db/schemas/schema.js';

export interface RegionPanel {
    id: string;
    nombre: string;
}

/** Regiones activas, ordenadas por nombre, para poblar el selector de ámbito. */
export async function listarRegiones(): Promise<RegionPanel[]> {
    return db
        .select({ id: regiones.id, nombre: regiones.nombre })
        .from(regiones)
        .where(eq(regiones.activa, true))
        .orderBy(asc(regiones.nombre));
}
