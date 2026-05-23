/**
 * useIniciarChatDirectoPersona.ts
 * =================================
 * Equivalente para chats persona ↔ persona DIRECTOS (sin recurso
 * anclado — sin oferta, sin artículo, sin servicio). Cierre del set de
 * hooks centralizados:
 *   - `useIniciarChatNegocio`  → persona ↔ negocio (chat comercial).
 *   - `useIniciarChatMarketplace` → persona ↔ persona anclado a artículo MP.
 *   - `useIniciarChatServicio` → persona ↔ persona/negocio anclado a publicación de Servicios.
 *   - `useIniciarChatDirectoPersona` → persona ↔ persona sin recurso (este).
 *
 * Casos de uso:
 *   - Business Studio: dueño/empleado contactando a un cliente desde
 *     PaginaClientes, ModalDetalleCliente, PaginaTransacciones,
 *     ModalDetalleTransaccionBS, ModalDetalleCanjeBS.
 *   - ScanYA: comerciante contactando a un cliente desde ModalHistorial
 *     o ModalVouchers.
 *   - Marketplace: hover-popup de un comentarista (BotonComentarista) o
 *     contacto desde PaginaPerfilVendedor.
 *   - Servicios: contacto desde PaginaPerfilPrestador.
 *
 * Qué hace la función retornada (al recibir datos básicos del otro usuario):
 *   1. Valida que haya usuario autenticado y que no esté abriendo chat
 *      consigo mismo.
 *   2. Carga conversaciones (si no están en memoria) y BUSCA una
 *      existente con esa persona en modo personal (filtra por AUSENCIA
 *      de `negocioNombre` en otroParticipante — descarta el chat
 *      comercial del mismo usuario si existe). Si la encuentra, la
 *      abre directo — NO crea chat temporal duplicado.
 *   3. Si NO hay chat previo, abre un chat temporal sin contexto.
 *   4. Llama `abrirChatYA()` para mostrar el panel.
 *
 * Decisión: este hook NO usa `setContextoPendiente` ni `borradorInicial`.
 * Chat directo entre personas no tiene recurso al cual anclarse — abrir
 * un chat con un cliente desde BS o un comentarista del feed no requiere
 * card "Vienes de X". Las cards solo aplican a artículos/ofertas/servicios.
 *
 * Ubicación: apps/web/src/hooks/useIniciarChatDirectoPersona.ts
 */

import { useChatYAStore } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { notificar } from '../utils/notificaciones';

interface IniciarChatDirectoPersonaInput {
    /** UUID del usuario destinatario (participante2 del chat). */
    usuarioId: string;
    /** Nombre del usuario (header del chat). */
    nombre: string;
    /** Apellidos del usuario. Puede ir vacío si la fuente no los trae. */
    apellidos?: string;
    /** Avatar del usuario. `null` si no tiene foto cargada. */
    avatarUrl: string | null;
}

export function useIniciarChatDirectoPersona() {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
    const conversaciones = useChatYAStore((s) => s.conversaciones);
    const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    return async function iniciarChatDirectoPersona(
        input: IniciarChatDirectoPersonaInput,
    ): Promise<void> {
        const { usuarioId, nombre, apellidos = '', avatarUrl } = input;

        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }

        // Defensa: no permitir chat consigo mismo. La mayoría de callers
        // ya filtra este caso antes de mostrar el botón.
        if (usuarioActual.id === usuarioId) {
            notificar.info('No puedes enviarte un mensaje a ti mismo');
            return;
        }

        // ── Buscar conversación existente con esta persona ────────────────
        // Chat directo es persona ↔ persona en modo personal: filtramos por
        // AUSENCIA de `negocioNombre` en otroParticipante (un usuario puede
        // tener ambos perfiles — personal y comercial — y NO queremos
        // abrir el chat comercial cuando el caller pidió contacto persona).
        let convs = conversaciones;
        if (convs.length === 0) {
            await cargarConversaciones('personal');
            convs = useChatYAStore.getState().conversaciones;
        }
        const convExistente = convs.find(
            (c) =>
                c.otroParticipante?.id === usuarioId &&
                !c.otroParticipante?.negocioNombre,
        );

        if (convExistente) {
            abrirConversacion(convExistente.id);
            abrirChatYA();
            return;
        }

        // ── No hay chat previo: chat temporal sin contexto ────────────────
        abrirChatTemporal({
            id: `temp_directo_${usuarioId}_${Date.now()}`,
            otroParticipante: {
                id: usuarioId,
                nombre,
                apellidos,
                avatarUrl,
            },
            datosCreacion: {
                participante2Id: usuarioId,
                participante2Modo: 'personal',
                contextoTipo: 'directo',
            },
        });
        abrirChatYA();
    };
}

export default useIniciarChatDirectoPersona;
