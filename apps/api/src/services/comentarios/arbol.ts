/**
 * arbol.ts
 * ========
 * Tipos y armado del árbol de comentarios (hilos de 1 nivel), COMPARTIDO entre
 * secciones (MarketPlace, Servicios y a futuro Coyo). Evita duplicar la lógica
 * de plano → árbol en cada service.
 *
 * `esVendedor` es genérico: significa "el autor es el dueño de la publicación"
 * (artículo en MP, publicación en Servicios). El texto visible de la etiqueta
 * lo decide el frontend.
 *
 * Ubicación: apps/api/src/services/comentarios/arbol.ts
 */

/** Nodo de comentario para el árbol que consume el frontend. */
export interface ComentarioNodo {
    id: string;
    autorId: string;
    autorNombre: string;
    autorApellidos: string;
    autorAvatarUrl: string | null;
    texto: string;
    /** El autor es el dueño de la publicación (para la etiqueta de autor). */
    esVendedor: boolean;
    editadoAt: string | null;
    createdAt: string;
    /** Respuestas (solo presente en comentarios raíz). */
    respuestas: ComentarioNodo[];
}

/** Fila plana de comentario (antes de armar el árbol). */
export interface ComentarioPlano {
    id: string;
    autorId: string;
    autorNombre: string;
    autorApellidos: string;
    autorAvatarUrl: string | null;
    parentId: string | null;
    texto: string;
    esVendedor: boolean;
    editadoAt: string | null;
    createdAt: string;
}

/**
 * Arma el árbol de 1 nivel a partir de filas planas.
 * Asume `planos` ordenado por created_at ASC. Raíces más recientes primero
 * (DESC); respuestas en orden cronológico (ASC) dentro de cada hilo.
 */
export function armarArbolComentarios(planos: ComentarioPlano[]): ComentarioNodo[] {
    const aNodo = (p: ComentarioPlano): ComentarioNodo => ({
        id: p.id,
        autorId: p.autorId,
        autorNombre: p.autorNombre,
        autorApellidos: p.autorApellidos,
        autorAvatarUrl: p.autorAvatarUrl,
        texto: p.texto,
        esVendedor: p.esVendedor,
        editadoAt: p.editadoAt,
        createdAt: p.createdAt,
        respuestas: [],
    });

    const raicesPorId = new Map<string, ComentarioNodo>();
    const raices: ComentarioNodo[] = [];
    for (const p of planos) {
        if (p.parentId === null) {
            const nodo = aNodo(p);
            raicesPorId.set(p.id, nodo);
            raices.push(nodo);
        }
    }
    for (const p of planos) {
        if (p.parentId !== null) {
            const raiz = raicesPorId.get(p.parentId);
            if (raiz) raiz.respuestas.push(aNodo(p));
        }
    }
    raices.reverse(); // raíces más recientes primero
    return raices;
}
