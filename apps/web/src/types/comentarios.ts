/**
 * comentarios.ts
 * ==============
 * Tipo genérico de comentario (hilos de 1 nivel), COMPARTIDO entre secciones
 * (MarketPlace, Servicios y a futuro Coyo). Lo consume el componente
 * reutilizable `ComentarioItem`.
 *
 * `esVendedor` es genérico: el autor es el dueño de la publicación (artículo en
 * MP, publicación en Servicios). La etiqueta visible ("Vendedor", "Autor", …)
 * la decide cada pantalla vía la prop `etiquetaAutor` de `ComentarioItem`.
 *
 * Ubicación: apps/web/src/types/comentarios.ts
 */

export interface Comentario {
    id: string;
    autorId: string;
    autorNombre: string;
    autorApellidos: string;
    autorAvatarUrl: string | null;
    texto: string;
    /** El autor es el dueño de la publicación. */
    esVendedor: boolean;
    /** true si autorNombre/autorAvatarUrl muestran la identidad del NEGOCIO
     *  (comentó en Modo Comercial) en vez de la personal. Determina a dónde
     *  navega el click en el nombre: `/negocios/{negocioSucursalId}` en vez
     *  de `/marketplace/usuario/{autorId}`. Siempre `false` en MarketPlace. */
    esNegocio: boolean;
    /** Sucursal principal (Matriz) del negocio del autor — solo si `esNegocio`. */
    negocioSucursalId: string | null;
    editadoAt: string | null;
    createdAt: string;
    /** Respuestas anidadas (solo en comentarios raíz). */
    respuestas: Comentario[];
}
