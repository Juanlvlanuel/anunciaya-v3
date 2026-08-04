/**
 * dinamicas.ts
 * ============
 * Tipos de Dinámicas (Fase 1-2) — espejo de la tabla `dinamicas` tal como la
 * devuelve el backend (Drizzle con nombres camelCase, sin transformación
 * adicional — `services/dinamicas.service.ts` usa el query builder, no SQL
 * crudo, así que no pasa por el middleware snake_case→camelCase).
 *
 * `precioBoleto` llega como `string`: es una columna `numeric` de Postgres,
 * Drizzle no la convierte a `number` (evita perder precisión) — mismo
 * criterio que otras columnas `numeric` de la app.
 *
 * Ubicación: apps/web/src/types/dinamicas.ts
 */

import type { ArchivoFoto } from './archivoFoto';

export type TipoPremio = 'fisico' | 'efectivo';
export type MetodoSorteo = 'tombola' | 'carta_unica' | 'tabla_completa';
export type ReglaDesempate = 'sorteo_instantaneo' | 'repartir_premio' | 'ronda_extra' | 'orden_inscripcion';
export type EstadoDinamica = 'borrador' | 'activa' | 'pospuesta' | 'en_sorteo' | 'cerrada' | 'cancelada';

export interface ConfirmacionesDinamica {
    premioReal: true;
    pagoFueraApp: true;
    resultadoHonesto: true;
    version: string;
    aceptadasAt: string;
}

// A partir del borrador parcial (solo título+ciudad obligatorios al crear),
// estos campos pueden llegar en NULL mientras la Dinámica sigue en
// 'borrador' — se vuelven obligatorios recién al publicar.
export interface Dinamica {
    id: string;
    organizadorUsuarioId: string;
    titulo: string;
    descripcion: string | null;
    fotosPremio: ArchivoFoto[];
    tipoPremio: TipoPremio | null;
    metodoSorteo: MetodoSorteo | null;
    numeroTotalBoletos: number | null;
    precioBoleto: string | null;
    ciudadId: string | null;
    fechaLimiteInscripcion: string | null;
    reglaDesempate: ReglaDesempate | null;
    estado: EstadoDinamica;
    semillaAleatoria: string | null;
    timestampSorteo: string | null;
    hashVerificacion: string | null;
    confirmaciones: ConfirmacionesDinamica | null;
    createdAt: string;
    updatedAt: string;
}

/** Solo `titulo` y `ciudad` son obligatorios — mismo criterio laxo que
 *  `crearDinamicaSchema` en el backend (un borrador solo necesita eso). */
export interface CrearDinamicaPayload {
    titulo: string;
    /** Nombre de ciudad (texto) — el backend resuelve el ciudadId real. */
    ciudad: string;
    descripcion?: string;
    fotosPremio?: ArchivoFoto[];
    tipoPremio?: TipoPremio;
    metodoSorteo?: MetodoSorteo;
    numeroTotalBoletos?: number;
    precioBoleto?: number;
    fechaLimiteInscripcion?: string;
    reglaDesempate?: ReglaDesempate;
}

export type EditarBorradorDinamicaPayload = Partial<CrearDinamicaPayload>;

export interface PublicarDinamicaPayload {
    confirmaciones: {
        premioReal: true;
        pagoFueraApp: true;
        resultadoHonesto: true;
        version: string;
    };
}

export interface InsigniaOrganizador {
    completadas: number;
    canceladas: number;
    nivel: 'nuevo' | 'activo' | 'confiable';
}

export interface MisDinamicasRespuesta {
    dinamicas: Dinamica[];
    insignia: InsigniaOrganizador;
}
