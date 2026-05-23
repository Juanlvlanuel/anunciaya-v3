/**
 * useIniciarChatNegocio.ts
 * =========================
 * Equivalente para Negocios de `useIniciarChatServicio` y
 * `useIniciarChatMarketplace`. Encapsula la lógica de "iniciar
 * conversación con un negocio" desde un card (CardNegocioCompacto,
 * CardNegocioDetallado, etc.).
 *
 * Qué hace la función retornada (al recibir los datos del negocio):
 *   1. Valida que haya `usuarioId` (sin él no hay con quién crear el chat).
 *   2. Carga conversaciones (si no están en memoria) y BUSCA una existente
 *      con el mismo dueño del negocio en modo comercial (filtra por
 *      `negocioNombre` presente — distingue del chat personal). Si la
 *      encuentra, la abre directo — NO crea chat temporal duplicado.
 *   3. Si NO hay chat previo, abre un chat temporal con identidad del
 *      negocio (foto de perfil de la sucursal como avatar + label de
 *      sucursal cuando hay >1).
 *   4. Llama `abrirChatYA()` para mostrar el panel.
 *
 * Modos:
 *   - SIN `contexto` (caso genérico): chat con el negocio sin anclar a
 *     ningún recurso. Útil para cards de negocio, billetera CardYA, etc.
 *   - CON `contexto` (oferta / articulo_negocio): chat anclado a un
 *     recurso específico. Muestra preview (cardData) arriba del input y
 *     pre-carga el borrador. La card SOLO se persiste si el usuario envía
 *     el mensaje. Reemplaza la lógica inline que vivía en
 *     ModalOfertaDetalle y ModalDetalleItem.
 *
 * Ubicación: apps/web/src/hooks/useIniciarChatNegocio.ts
 */

import { useChatYAStore, type ContextoPendienteCardData } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';

/**
 * Contexto opcional cuando el chat se ancla a un recurso (oferta o
 * artículo del catálogo de un negocio). Cuando se pasa, el hook setea
 * `contextoPendiente` con el `cardData` para que aparezca el preview
 * arriba del input y pre-carga el `borradorInicial`.
 */
export interface IniciarChatNegocioContexto {
    /** Tipo de recurso al que se ancla el chat. */
    tipo: 'oferta' | 'articulo_negocio';
    /** UUID del recurso (oferta o artículo). Se pasa como
     *  `contextoReferenciaId` al backend al materializar la conv. */
    referenciaId: string;
    /** Card que se mostrará en el preview encima del input. */
    cardData: ContextoPendienteCardData;
    /** Borrador pre-cargado en el input. */
    borradorInicial: string;
}

interface IniciarChatNegocioInput {
    /** UUID del dueño del negocio (participante2 del chat). */
    usuarioId: string;
    /** UUID de la sucursal a contactar. `null` cuando el caller no
     *  tiene una sucursal específica (ej. billetera CardYA sin sucursal
     *  registrada). El backend rechaza `''` como UUID — usar `null`. */
    sucursalId: string | null;
    /** Nombre del negocio (header del chat). */
    negocioNombre: string;
    /** Foto de perfil de la SUCURSAL específica (avatar del header).
     *  El caller se encarga de hacer el fallback al logo del negocio. */
    avatarUrl: string | null;
    /** Label de sucursal a mostrar bajo el nombre del negocio en el
     *  header del chat. `undefined` cuando el negocio tiene una sola
     *  sucursal (el caller decide la lógica "Matriz" vs nombre propio). */
    sucursalNombre?: string;
    /** Contexto opcional cuando el chat se ancla a una oferta o artículo
     *  del catálogo del negocio. Omitir para chat genérico. */
    contexto?: IniciarChatNegocioContexto;
}

export function useIniciarChatNegocio() {
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
    const conversaciones = useChatYAStore((s) => s.conversaciones);
    const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
    const guardarBorrador = useChatYAStore((s) => s.guardarBorrador);
    const setContextoPendiente = useChatYAStore(
        (s) => s.setContextoPendiente,
    );
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    return async function iniciarChatNegocio(
        input: IniciarChatNegocioInput,
    ): Promise<void> {
        const {
            usuarioId,
            sucursalId,
            negocioNombre,
            avatarUrl,
            sucursalNombre,
            contexto,
        } = input;

        // Cuando hay contexto, el chat se ancla al recurso (oferta o
        // artículo): el backend toma `contextoTipo` + `contextoReferenciaId`
        // para insertar la card al materializar la conv. Sin contexto, el
        // chat es genérico (contextoTipo: 'negocio').
        const datosCreacion = contexto
            ? {
                  participante2Id: usuarioId,
                  participante2Modo: 'comercial' as const,
                  participante2SucursalId: sucursalId,
                  contextoTipo: contexto.tipo,
                  contextoReferenciaId: contexto.referenciaId,
              }
            : {
                  participante2Id: usuarioId,
                  participante2Modo: 'comercial' as const,
                  participante2SucursalId: sucursalId,
                  contextoTipo: 'negocio' as const,
              };

        // ── Buscar conversación existente con este negocio ────────────────
        // El backend trata persona ↔ negocio como un único hilo (mismo
        // patrón que ModalOfertaDetalle): filtramos por dueño del negocio
        // + presencia de `negocioNombre` en otroParticipante para distinguir
        // del chat personal del mismo usuario (un usuario puede tener
        // ambos perfiles — personal y comercial).
        let convs = conversaciones;
        if (convs.length === 0) {
            await cargarConversaciones('personal');
            convs = useChatYAStore.getState().conversaciones;
        }
        const convExistente = convs.find(
            (c) =>
                c.otroParticipante?.id === usuarioId &&
                !!c.otroParticipante?.negocioNombre,
        );

        if (convExistente) {
            abrirConversacion(convExistente.id);
            // Con contexto: setear preview + borrador. El orden importa
            // — `abrirConversacion` limpia el contextoPendiente residual
            // y carga el borrador propio del chat, así que primero
            // abrimos y después seteamos los del recurso nuevo.
            if (contexto) {
                setContextoPendiente({
                    datosCreacion,
                    cardData: contexto.cardData,
                });
                guardarBorrador(convExistente.id, contexto.borradorInicial);
            }
            abrirChatYA();
            return;
        }

        // ── No hay chat previo: chat temporal con identidad del negocio ───
        abrirChatTemporal({
            id: `temp_negocio_${sucursalId ?? 'sinsuc'}_${Date.now()}`,
            otroParticipante: {
                id: usuarioId,
                nombre: negocioNombre,
                apellidos: '',
                avatarUrl,
                negocioNombre,
                negocioLogo: avatarUrl ?? undefined,
                sucursalNombre: sucursalNombre || undefined,
            },
            datosCreacion,
            borradorInicial: contexto?.borradorInicial,
        });
        // La card SOLO se persiste cuando el chat temporal se materializa
        // al enviar el primer mensaje. Si el usuario descarta el preview
        // con la X, el chat sigue como temporal sin contexto.
        if (contexto) {
            setContextoPendiente({
                datosCreacion,
                cardData: contexto.cardData,
            });
        }
        abrirChatYA();
    };
}

export default useIniciarChatNegocio;
