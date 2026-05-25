/**
 * busquedaFlexible.ts (helper compartido entre buscadores)
 * =========================================================
 * Helpers usados por los 4 buscadores (negocios, marketplace, servicios,
 * ofertas) cuando operan en "modo flexible" — el modo que el orquestador
 * de Coyo activa para que una query de MÚLTIPLES palabras se trate como
 * OR (cualquiera matchea) en vez de AND (todas requeridas).
 *
 * Por qué existe:
 *   El modo por defecto de los buscadores usa `plainto_tsquery` (que une
 *   las palabras con AND implícito) y un único `ILIKE '%frase entera%'`.
 *   Eso falla cuando Coyo extrae 2-3 palabras clave porque ningún registro
 *   contiene las palabras juntas. El modo flexible reemplaza ese AND por
 *   un OR por palabra: con 'plomería fontanero', cualquier registro que
 *   contenga 'plomería' O 'fontanero' matchea.
 *
 * IMPORTANTE: este helper SOLO se invoca desde la rama `modoFlexible=true`.
 * Los usuarios normales que escriben en los overlays de búsqueda siguen
 * usando el comportamiento por defecto (AND/frase completa) sin cambios.
 *
 * Ubicación: apps/api/src/services/_helpers/busquedaFlexible.ts
 */

/**
 * Tokeniza la query en palabras: split por whitespace, trim, filtra vacíos.
 * Conserva el orden de aparición.
 *
 * @example
 *   tokenizarQuery('  plomería   fontanero  ') → ['plomería', 'fontanero']
 *   tokenizarQuery('') → []
 */
export function tokenizarQuery(q: string): string[] {
    return q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
}

/**
 * Une tokens con " OR " para alimentar a `websearch_to_tsquery` de Postgres
 * (que reconoce el literal "OR" como operador de unión OR de tsquery).
 *
 * @example
 *   unirOr(['plomería', 'fontanero']) → 'plomería OR fontanero'
 *   unirOr(['tacos']) → 'tacos'  (un solo token: equivale a búsqueda simple)
 *   unirOr([]) → ''  (caller debe haber chequeado length>0 antes)
 */
export function unirOr(tokens: string[]): string {
    return tokens.join(' OR ');
}
