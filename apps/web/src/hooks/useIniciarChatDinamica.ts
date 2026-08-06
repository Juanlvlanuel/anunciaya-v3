/**
 * useIniciarChatDinamica.ts
 * ==========================
 * Equivalente para Dinámicas de `useIniciarChatMarketplace.ts`. Encapsula
 * "iniciar conversación con el organizador de una Dinámica" desde el botón
 * ChatYA de `CardOrganizadorDinamica` (PaginaDinamica.tsx) — abre el chat
 * con un mensaje pre-llenado + una mini-card de contexto (foto, título,
 * precio por boleto), mismo comportamiento que ya existe en MarketPlace.
 *
 * Diferencia con `useIniciarChatMarketplace`: Dinámicas NO tiene columna FK
 * dedicada en `chat_conversaciones` (`dinamica_id`) — usa la columna
 * genérica `contextoReferenciaId`, mismo patrón que oferta/articulo_negocio
 * (ver `insertarMensajeContextoDinamica` en `chatya.service.ts`). No hizo
 * falta agregar columna nueva, solo ampliar el CHECK de `contexto_tipo`.
 *
 * Acepta tanto `DinamicaFeedItem` (card del feed, `CardDinamica.tsx`) como
 * `DinamicaDetallePublico` (ficha de detalle, `PaginaDinamica.tsx`) — ambos
 * comparten los campos que este hook necesita (id/titulo/precioBoleto/
 * fotosPremio/organizador), así que basta un tipo estructural mínimo en vez
 * de acoplarse a uno de los dos shapes concretos.
 *
 * Ubicación: apps/web/src/hooks/useIniciarChatDinamica.ts
 */

import { useChatYAStore } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { notificar } from '../utils/notificaciones';
import type { ArchivoFoto } from '../types/archivoFoto';
import type { OrganizadorDinamica } from '../types/dinamicas';

interface DinamicaParaChat {
    id: string;
    titulo: string;
    precioBoleto: string | null;
    fotosPremio: ArchivoFoto[];
    organizador: OrganizadorDinamica;
}

export function useIniciarChatDinamica() {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
    const conversaciones = useChatYAStore((s) => s.conversaciones);
    const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
    const guardarBorrador = useChatYAStore((s) => s.guardarBorrador);
    const setContextoPendiente = useChatYAStore((s) => s.setContextoPendiente);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    return async function iniciarChatDinamica(
        dinamica: DinamicaParaChat,
    ): Promise<void> {
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }

        const { organizador, titulo, id, precioBoleto, fotosPremio } = dinamica;

        // Auto-rechazo si el visitante es el propio organizador (defensa
        // extra — el botón ya se oculta en ese caso).
        if (usuarioActual.id === organizador.id) return;

        const portada = fotosPremio.find((f) => f.tipo === 'imagen') ?? fotosPremio[0];
        const fotoUrl = portada ? (portada.tipo === 'video' ? portada.posterUrl : portada.url) : null;

        // Dinámicas es siempre P2P en modo personal — sin sucursal, sin FK
        // dedicada (usa la genérica `contextoReferenciaId`).
        const datosCreacion = {
            participante2Id: organizador.id,
            participante2Modo: 'personal' as const,
            contextoTipo: 'dinamica' as const,
            contextoReferenciaId: id,
        };

        const cardData = {
            subtipo: 'dinamica' as const,
            titulo,
            imagen: fotoUrl,
            precio: precioBoleto ?? undefined,
        };

        const borradorTexto = `Hola, me interesa tu Dinámica "${titulo}". `;

        // ── Buscar conversación existente entre los participantes ─────────
        let convs = conversaciones;
        if (convs.length === 0) {
            await cargarConversaciones('personal');
            convs = useChatYAStore.getState().conversaciones;
        }
        const convExistente = convs.find((c) => {
            if (c.otroParticipante?.id !== organizador.id) return false;
            // Dinámicas es personal — descartar conversaciones comerciales
            // del mismo usuario (puede tener ambos perfiles).
            return !c.otroParticipante?.negocioNombre;
        });

        if (convExistente) {
            abrirConversacion(convExistente.id);
            setContextoPendiente({ datosCreacion, cardData });
            guardarBorrador(convExistente.id, borradorTexto);
            abrirChatYA();
            return;
        }

        // ── No hay chat previo: chat temporal con datos completos ─────────
        const idTemp = `temp_dinamica_${id}_${Date.now()}`;
        abrirChatTemporal({
            id: idTemp,
            otroParticipante: {
                id: organizador.id,
                nombre: organizador.nombre,
                apellidos: organizador.apellidos,
                avatarUrl: organizador.avatarUrl,
            },
            datosCreacion,
            borradorInicial: borradorTexto,
        });
        setContextoPendiente({ datosCreacion, cardData });
        abrirChatYA();
    };
}

export default useIniciarChatDinamica;
