/**
 * ============================================================================
 * MIDDLEWARE: Transform Response
 * ============================================================================
 * 
 * UBICACIÓN: apps/backend/src/middlewares/transformResponse.middleware.ts
 * 
 * PROPÓSITO:
 * Transformar automáticamente TODAS las respuestas del backend de snake_case
 * a camelCase antes de enviarlas al frontend.
 * 
 * ESTO ELIMINA LA NECESIDAD DE MAPPERS MANUALES EN EL FRONTEND.
 * 
 * USO:
 * - Se aplica globalmente en app.ts ANTES de las rutas
 * - Funciona automáticamente en TODAS las respuestas JSON
 * - Soporta objetos anidados, arrays, null, undefined
 * 
 * CREADO: Enero 2026 - Solución definitiva para conversión de nombres
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// FUNCIONES DE TRANSFORMACIÓN
// =============================================================================

/**
 * Convierte una string de snake_case a camelCase
 * 
 * @example
 * snakeToCamel('precio_base') // 'precioBase'
 * snakeToCamel('imagen_principal') // 'imagenPrincipal'
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transforma recursivamente un objeto/array de snake_case a camelCase
 * 
 * @param obj - Objeto, array, o valor primitivo a transformar
 * @returns Objeto transformado con keys en camelCase
 * 
 * @example
 * transformToCamel({ precio_base: "35.00", imagen_principal: "url" })
 * // { precioBase: "35.00", imagenPrincipal: "url" }
 * 
 * transformToCamel([{ negocio_id: "123" }])
 * // [{ negocioId: "123" }]
 */
function transformToCamel(obj: any): any {
  // Caso 1: null o undefined → retornar tal cual
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Caso 2: Array → transformar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(transformToCamel);
  }

  // Caso 3: Objeto Date → retornar tal cual
  if (obj instanceof Date) {
    return obj;
  }

  // Caso 4: Objeto plano → transformar keys
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = snakeToCamel(key);
      acc[camelKey] = transformToCamel(obj[key]); // Recursión para objetos anidados
      return acc;
    }, {} as any);
  }

  // Caso 5: Primitivo (string, number, boolean) → retornar tal cual
  return obj;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Middleware que intercepta res.json() y transforma automáticamente
 * todas las respuestas de snake_case a camelCase
 * 
 * IMPORTANTE: Debe aplicarse ANTES de las rutas en app.ts
 * 
 * @example
 * // En app.ts:
 * app.use(transformResponseMiddleware);
 * app.use('/api/auth', authRoutes);
 * app.use('/api/articulos', articulosRoutes);
 */
export function transformResponseMiddleware(req: Request, res: Response, next: NextFunction) {
  // Guardar la función original res.json
  const originalJson = res.json.bind(res);

  // Sobrescribir res.json con nuestra versión transformadora
  res.json = function (data: any) {
    // Si hay data y es transformable, aplicar transformación
    if (data && typeof data === 'object') {
      data = transformToCamel(data);
    }

    // Llamar a la función original con los datos transformados
    return originalJson(data);
  };

  next();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default transformResponseMiddleware;