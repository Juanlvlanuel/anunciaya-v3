/**
 * truncarTexto.ts
 * ================
 * Trunca texto a un máximo de caracteres, cortando en el último espacio
 * antes del límite (no parte palabras a la mitad). Usado para el patrón
 * "Ver más" inline al final de la descripción de una publicación (feed de
 * MarketPlace y de Negocios) — a diferencia de `line-clamp` (CSS), acá el
 * "Ver más" es texto real dentro del mismo párrafo, así se lee como
 * continuación de la oración en vez de un elemento flotante aparte.
 *
 * Ubicación: apps/web/src/utils/truncarTexto.ts
 */

export function truncarTexto(texto: string, maxChars: number): string {
    if (texto.length <= maxChars) return texto;
    const cortado = texto.slice(0, maxChars);
    const ultimoEspacio = cortado.lastIndexOf(' ');
    return (ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd();
}

export default truncarTexto;
