/**
 * useIniciarChatMarketplace.ts
 * =============================
 * Equivalente para Marketplace de `useIniciarChatServicio`. Encapsula la
 * lógica de "iniciar conversación con el vendedor de un artículo MP"
 * (antes vivía solo en `BarraContacto.handleEnviarMensaje`) para
 * reutilizarla desde el botón ChatYA del card en MisGuardados.
 *
 * Qué hace la función retornada (al recibir un `ArticuloMarketplaceDetalle`):
 *   1. Valida que haya usuario autenticado (si no, muestra toast).
 *   2. Construye `datosCreacion` (siempre modo personal — MP es P2P).
 *   3. Construye `cardData` para el preview arriba del input del chat.
 *   4. Carga conversaciones (si no están en memoria) y BUSCA una
 *      existente con el mismo vendedor en modo personal. Si la
 *      encuentra, la abre y guarda el borrador + contexto pendiente
 *      — NO crea chat temporal duplicado.
 *   5. Si NO hay chat previo, abre un chat temporal con todos los datos.
 *   6. Llama `abrirChatYA()` para mostrar el panel.
 *
 * Decisión: este hook NO hace fetch del detalle. El caller es el
 * responsable de pasar un `ArticuloMarketplaceDetalle` completo (la
 * pieza importante es `vendedor` con id/nombre/avatar — el feed/lista
 * de guardados no lo trae).
 *
 * Ubicación: apps/web/src/hooks/useIniciarChatMarketplace.ts
 */

import { useChatYAStore } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { notificar } from '../utils/notificaciones';
import { formatearPresupuesto } from '../utils/marketplace';
import type { ArticuloMarketplaceDetalle } from '../types/marketplace';

export function useIniciarChatMarketplace() {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
    const conversaciones = useChatYAStore((s) => s.conversaciones);
    const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
    const guardarBorrador = useChatYAStore((s) => s.guardarBorrador);
    const setContextoPendiente = useChatYAStore(
        (s) => s.setContextoPendiente,
    );
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    return async function iniciarChatMarketplace(
        articulo: ArticuloMarketplaceDetalle,
    ): Promise<void> {
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }

        const { vendedor, titulo, id, precio, condicion, fotos, fotoPortadaIndex, modo, presupuesto } =
            articulo;

        // Auto-rechazo si el visitante es el dueño (defensa extra; la
        // mayoría de callers ya filtran este caso antes de mostrar el
        // botón, pero por si acaso).
        if (usuarioActual.id === vendedor.id) return;

        // Foto principal del artículo para el preview del chat.
        const idxPortada = Math.max(
            0,
            Math.min(fotoPortadaIndex ?? 0, (fotos?.length ?? 0) - 1),
        );
        const fotoUrl = fotos?.[idxPortada] ?? fotos?.[0] ?? null;

        // Datos para crear la conversación + insertar card en backend.
        // MP es siempre P2P en modo personal — sin sucursal.
        const datosCreacion = {
            participante2Id: vendedor.id,
            participante2Modo: 'personal' as const,
            contextoTipo: 'marketplace' as const,
            contextoReferenciaId: id,
            // FK al artículo: el backend hace JOIN para snapshot y emite
            // el mensaje sistema vía Socket.io a ambos participantes al
            // materializar la conv.
            articuloMarketplaceId: id,
        };

        // Preview de la card encima del input (no se persiste hasta enviar).
        // En modo 'busco' el precio siempre es null — el rango real vive en
        // `presupuesto`. Sin esto, el preview del chat no mostraba nada
        // aunque el usuario sí hubiera puesto un presupuesto (mismo bug
        // que "A tratar" en Servicios/Solicito).
        const precioTexto =
            modo === 'busco'
                ? formatearPresupuesto(presupuesto)
                : (precio ?? undefined);
        const cardData = {
            subtipo: 'articulo_marketplace' as const,
            titulo,
            imagen: fotoUrl,
            precio: precioTexto,
            condicion: condicion ?? undefined,
        };

        const borradorTexto = `Hola, me interesa tu publicación de "${titulo}". `;

        // ── Buscar conversación existente entre los participantes ─────────
        // Si ya hay un chat personal con este vendedor, abrirlo directo y
        // mostrar el preview arriba del input. La card SOLO se persiste si
        // el usuario envía el mensaje. Si descarta o cierra sin enviar, no
        // queda nada en BD.
        let convs = conversaciones;
        if (convs.length === 0) {
            await cargarConversaciones('personal');
            convs = useChatYAStore.getState().conversaciones;
        }
        const convExistente = convs.find((c) => {
            if (c.otroParticipante?.id !== vendedor.id) return false;
            // MP es personal — descartar conversaciones comerciales del
            // mismo usuario (puede tener ambos perfiles).
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
        const idTemp = `temp_marketplace_${id}_${Date.now()}`;
        abrirChatTemporal({
            id: idTemp,
            otroParticipante: {
                id: vendedor.id,
                nombre: vendedor.nombre,
                apellidos: vendedor.apellidos,
                avatarUrl: vendedor.avatarUrl,
            },
            datosCreacion,
            borradorInicial: borradorTexto,
        });
        setContextoPendiente({ datosCreacion, cardData });
        abrirChatYA();
    };
}

export default useIniciarChatMarketplace;
