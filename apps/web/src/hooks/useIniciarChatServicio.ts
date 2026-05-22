/**
 * useIniciarChatServicio.ts
 * ===========================
 * Hook que encapsula la lógica de "iniciar conversación con el oferente
 * de una publicación de Servicios". Centraliza el comportamiento que antes
 * vivía únicamente en `BarraContactoServicio.handleEnviarMensaje` para
 * reutilizarlo desde otras vistas (ej. botón ChatYA del card en
 * MisGuardados — Sprint 9.3).
 *
 * Qué hace la función retornada (al recibir un `PublicacionDetalle`):
 *   1. Valida que haya usuario autenticado (si no, muestra toast).
 *   2. Construye `datosCreacion` (modo comercial para vacante /
 *      personal para servicio-persona y solicito).
 *   3. Construye `cardData` para el preview arriba del input del chat.
 *   4. Carga conversaciones (si no están en memoria) y BUSCA una
 *      existente entre los participantes. Si la encuentra, la abre
 *      y guarda el borrador + contexto pendiente — NO crea chat
 *      temporal duplicado.
 *   5. Si NO hay chat previo, abre un chat temporal con todos los
 *      datos (incluyendo borrador inicial y card de preview).
 *   6. Llama `abrirChatYA()` para mostrar el panel.
 *
 * Decisión: este hook NO hace fetch del detalle. El caller es el
 * responsable de pasar un `PublicacionDetalle` completo. Eso permite
 * que vistas que YA tienen el detalle (detalle de la publicación) no
 * paguen el costo de un fetch extra, y vistas que NO lo tienen
 * (cards) puedan obtenerlo on-demand con `qc.fetchQuery` (usa cache).
 *
 * Ubicación: apps/web/src/hooks/useIniciarChatServicio.ts
 */

import { useChatYAStore } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { notificar } from '../utils/notificaciones';
import {
    formatearPrecioServicio,
    modalidadLabel,
    obtenerFotoPortada,
} from '../utils/servicios';
import type { PublicacionDetalle } from '../types/servicios';

export function useIniciarChatServicio() {
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

    return async function iniciarChatServicio(
        publicacion: PublicacionDetalle,
    ): Promise<void> {
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }

        const { oferente, titulo, id, precio, modalidad, tipo, sucursalId } =
            publicacion;

        // Auto-rechazo si el visitante es el dueño (defensa extra; la
        // mayoría de callers ya filtran este caso antes de mostrar el
        // botón, pero por si acaso).
        if (usuarioActual.id === oferente.id) return;

        // Vacantes BS son siempre de un negocio → el chat debe ir al
        // lado comercial del oferente (con sucursalId), no a su perfil
        // personal. Si no, el dueño nunca vería el mensaje desde BS
        // (ChatYA filtra por modo) y los KPIs de Vacantes BS no se
        // actualizan.
        const esVacanteEmpresa = tipo === 'vacante-empresa';
        const participante2Modo = esVacanteEmpresa
            ? ('comercial' as const)
            : ('personal' as const);
        const participante2SucursalId = esVacanteEmpresa ? sucursalId : null;

        // Foto de portada para el preview.
        const fotoUrl = obtenerFotoPortada(
            publicacion.fotos,
            publicacion.fotoPortadaIndex,
        );

        // Datos para crear la conversación + insertar card en backend.
        const datosCreacion = {
            participante2Id: oferente.id,
            participante2Modo,
            participante2SucursalId,
            contextoTipo: 'servicio' as const,
            contextoReferenciaId: id,
            servicioPublicacionId: id,
        };

        // Preview de la card encima del input (no se persiste hasta enviar).
        // `esVacante` se pasa al formatter para que en vacantes el
        // precio sin definir aparezca como "Sueldo a tratar" (no
        // "A tratar" genérico) — coherente con cómo se ve en el card
        // del feed y el detalle.
        const cardData = {
            subtipo: 'servicio_publicacion' as const,
            titulo,
            imagen: fotoUrl,
            precio: formatearPrecioServicio(precio, { esVacante: esVacanteEmpresa }),
            modalidad: modalidadLabel(modalidad),
        };

        const borradorTexto = `Hola, me interesa tu publicación de "${titulo}". `;

        // ── Buscar conversación existente entre los participantes ─────────
        // Si ya hay un chat con este oferente (mismo modo / sucursal cuando
        // aplica), abrirlo directamente y mostrar el preview arriba del input.
        // La card SOLO se persiste si el usuario envía el mensaje. Si descarta
        // el preview o cierra el chat sin enviar, no queda nada en BD.
        let convs = conversaciones;
        if (convs.length === 0) {
            await cargarConversaciones('personal');
            convs = useChatYAStore.getState().conversaciones;
        }
        const convExistente = convs.find((c) => {
            if (c.otroParticipante?.id !== oferente.id) return false;
            // Para vacante-empresa, el chat está en el lado comercial:
            // filtrar por que tenga negocioNombre (lo trae el backend
            // cuando el participante2Modo es 'comercial').
            if (esVacanteEmpresa) return !!c.otroParticipante?.negocioNombre;
            // Para servicio personal, asegurar que NO sea el chat
            // comercial del mismo usuario (puede tener ambos perfiles).
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
        // Cuando es vacante-empresa, el header debe mostrar la identidad del
        // NEGOCIO con la foto de perfil de la SUCURSAL específica (no el
        // logo del negocio) y "Matriz" cuando es la sucursal principal.
        const sucursalLabel = esVacanteEmpresa
            ? oferente.sucursalEsPrincipal
                ? 'Matriz'
                : oferente.sucursalNombre ?? undefined
            : undefined;
        const otroParticipante =
            esVacanteEmpresa && oferente.negocioNombre
                ? {
                      id: oferente.id,
                      nombre: oferente.negocioNombre,
                      apellidos: '',
                      avatarUrl: oferente.sucursalFotoPerfil ?? null,
                      negocioNombre: oferente.negocioNombre,
                      negocioLogo: oferente.sucursalFotoPerfil ?? undefined,
                      sucursalNombre: sucursalLabel,
                  }
                : {
                      id: oferente.id,
                      nombre: oferente.nombre,
                      apellidos: oferente.apellidos,
                      avatarUrl: oferente.avatarUrl,
                  };

        const idTemp = `temp_servicio_${id}_${Date.now()}`;
        abrirChatTemporal({
            id: idTemp,
            otroParticipante,
            datosCreacion,
            borradorInicial: borradorTexto,
        });
        setContextoPendiente({ datosCreacion, cardData });
        abrirChatYA();
    };
}

export default useIniciarChatServicio;
