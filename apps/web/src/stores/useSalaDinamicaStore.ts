/**
 * useSalaDinamicaStore.ts
 * ========================
 * Estado en vivo de la sala de una Dinámica (Fase 4.1) — chat, moderación
 * propia y cascada del sorteo. Store propio (no se reutiliza
 * `useChatYAStore.ts`, ya sobrecargado de lógica 1:1/negocio) pero mismo
 * patrón de conexión: `escucharEvento()` registrado a nivel de módulo
 * (se aplica una sola vez, sobrevive reconexiones) y acciones que emiten
 * por `emitirEvento()`.
 *
 * Los ganadores completos (con nombre) NO se arman aquí a partir del evento
 * `dinamica:sala:sorteo-cerrado` (solo trae lugar/número/intento, sin
 * nombre) — el hook `useSalaDinamica.ts` refresca la carga HTTP
 * (`useEstadoSalaDinamica`) cuando el estado pasa a 'cerrada', que sí trae
 * el detalle completo.
 *
 * Ubicación: apps/web/src/stores/useSalaDinamicaStore.ts
 */

import { create } from 'zustand';
import { escucharEvento, emitirEvento, emitirCuandoConectado, conectarSocket, conectarSocketInvitado } from '../services/socketService';
import type {
    EstadoDinamica,
    EstadoSalaDinamica,
    MensajeSalaDinamica,
    IntentoSorteoEvento,
    AccionModeracionSala,
} from '../types/dinamicas';

export interface SalaDinamicaState {
    dinamicaId: string | null;
    unido: boolean;
    estado: EstadoDinamica | null;
    salaProgramadaPara: string | null;
    numeroLugaresGanadores: number;
    numeroIntentosSorteo: number | null;
    esOrganizador: boolean;
    miModeracion: { silenciado: boolean; expulsado: boolean };
    mensajes: MensajeSalaDinamica[];
    intentosRevelados: IntentoSorteoEvento[];
    /** Cómo se está revelando el sorteo en curso — `null` fuera de
     *  'en_sorteo'. 'automatico' = cascada temporizada (como siempre);
     *  'manual' = el organizador revela cada bola con un botón. */
    modoSorteo: 'automatico' | 'manual' | null;
    /** Solo aplica en modo automático — el organizador la pausó a mitad
     *  de la cascada. */
    pausadoSorteo: boolean;
    hashVerificacion: string | null;
    semillaAleatoria: string | null;
    expulsadoAhora: boolean;
    error: string | null;
    /** usuarioIds conectados AHORA MISMO al room de la sala (invitados
     *  anónimos no cuentan, no tienen usuarioId) — para los íconos
     *  conectado/desconectado del panel de moderación. */
    conectados: Set<string>;

    /** `autenticado` decide si se conecta con sesión (`conectarSocket`) o
     *  como invitado sin token (`conectarSocketInvitado`) — la ficha
     *  pública admite ambos casos. */
    unirse: (dinamicaId: string, autenticado: boolean) => void;
    salir: () => void;
    enviarMensaje: (contenido: string) => void;
    moderar: (usuarioId: string, accion: AccionModeracionSala, motivo?: string) => void;
    iniciarSorteo: (modo: 'automatico' | 'manual') => void;
    revelarSiguienteBola: () => void;
    pausarSorteo: () => void;
    reanudarSorteo: () => void;
    limpiarError: () => void;
}

const ESTADO_INICIAL_SALA = {
    dinamicaId: null,
    unido: false,
    estado: null,
    salaProgramadaPara: null,
    numeroLugaresGanadores: 1,
    numeroIntentosSorteo: null,
    esOrganizador: false,
    miModeracion: { silenciado: false, expulsado: false },
    mensajes: [],
    intentosRevelados: [],
    modoSorteo: null,
    pausadoSorteo: false,
    hashVerificacion: null,
    semillaAleatoria: null,
    expulsadoAhora: false,
    error: null,
    conectados: new Set<string>(),
} satisfies Omit<
    SalaDinamicaState,
    | 'unirse'
    | 'salir'
    | 'enviarMensaje'
    | 'moderar'
    | 'iniciarSorteo'
    | 'revelarSiguienteBola'
    | 'pausarSorteo'
    | 'reanudarSorteo'
    | 'limpiarError'
>;

export const useSalaDinamicaStore = create<SalaDinamicaState>((set, get) => ({
    ...ESTADO_INICIAL_SALA,

    unirse: (dinamicaId, autenticado) => {
        if (autenticado) {
            conectarSocket();
        } else {
            conectarSocketInvitado();
        }
        set({ ...ESTADO_INICIAL_SALA, dinamicaId });
        // `conectarSocket()`/`conectarSocketInvitado()` es asíncrono (el
        // handshake tarda) — emitir el "unirse" con `emitirEvento` normal
        // justo después se perdía en silencio si el socket todavía no
        // terminaba de conectar (esa función solo manda si YA está
        // conectado, sin reintentar). `emitirCuandoConectado` sí reintenta
        // cada 500ms hasta que la conexión esté lista.
        emitirCuandoConectado('dinamica:sala:unirse', { dinamicaId });
    },

    salir: () => {
        const { dinamicaId } = get();
        if (dinamicaId) emitirEvento('dinamica:sala:salir', { dinamicaId });
        set({ ...ESTADO_INICIAL_SALA });
    },

    enviarMensaje: (contenido) => {
        const { dinamicaId } = get();
        if (!dinamicaId || !contenido.trim()) return;
        emitirEvento('dinamica:sala:mensaje', { dinamicaId, contenido: contenido.trim() });
    },

    moderar: (usuarioId, accion, motivo) => {
        const { dinamicaId } = get();
        if (!dinamicaId) return;
        emitirEvento('dinamica:sala:moderar', { dinamicaId, usuarioId, accion, motivo });
    },

    iniciarSorteo: (modo) => {
        const { dinamicaId } = get();
        if (!dinamicaId) return;
        emitirEvento('dinamica:sala:iniciar-sorteo', { dinamicaId, modo });
    },

    revelarSiguienteBola: () => {
        const { dinamicaId } = get();
        if (!dinamicaId) return;
        emitirEvento('dinamica:sala:revelar-siguiente-bola', { dinamicaId });
    },

    pausarSorteo: () => {
        const { dinamicaId } = get();
        if (!dinamicaId) return;
        emitirEvento('dinamica:sala:pausar-sorteo', { dinamicaId });
    },

    reanudarSorteo: () => {
        const { dinamicaId } = get();
        if (!dinamicaId) return;
        emitirEvento('dinamica:sala:reanudar-sorteo', { dinamicaId });
    },

    limpiarError: () => set({ error: null }),
}));

// =============================================================================
// LISTENERS SOCKET.IO — Tiempo real (mismo patrón que useChatYAStore.ts:
// registrados a nivel de módulo, se re-aplican solos si el socket se
// reconecta — ver `socketService.ts`).
// =============================================================================

escucharEvento<EstadoSalaDinamica>('dinamica:sala:estado-inicial', (data) => {
    useSalaDinamicaStore.setState({
        unido: true,
        estado: data.estado,
        salaProgramadaPara: data.salaProgramadaPara,
        numeroLugaresGanadores: data.numeroLugaresGanadores,
        numeroIntentosSorteo: data.numeroIntentosSorteo,
        esOrganizador: data.esOrganizador,
        miModeracion: data.miModeracion,
        mensajes: data.mensajes,
        hashVerificacion: data.ganadores?.hashVerificacion ?? null,
        semillaAleatoria: data.ganadores?.semillaAleatoria ?? null,
        // "Ponte al día" si el sorteo ya estaba en curso al unirse — viene
        // en el MISMO evento (no uno aparte) para que no haya un instante
        // pintando "esperando la primera bola" antes de que llegue.
        intentosRevelados: data.intentosEnCurso ?? [],
        modoSorteo: data.modoSorteoActual ?? null,
    });
});

escucharEvento<{ message: string; code?: number }>('dinamica:sala:error', (data) => {
    useSalaDinamicaStore.setState({ error: data.message });
});

escucharEvento<MensajeSalaDinamica>('dinamica:sala:mensaje', (mensaje) => {
    const state = useSalaDinamicaStore.getState();
    if (!state.dinamicaId) return;
    if (state.mensajes.some((m) => m.id === mensaje.id)) return;
    useSalaDinamicaStore.setState({ mensajes: [...state.mensajes, mensaje] });
});

escucharEvento<{ contenido: string; createdAt: string }>('dinamica:sala:sistema', (data) => {
    const state = useSalaDinamicaStore.getState();
    if (!state.dinamicaId) return;
    useSalaDinamicaStore.setState({
        mensajes: [
            ...state.mensajes,
            {
                id: `sistema-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                usuarioId: '',
                tipo: 'sistema',
                contenido: data.contenido,
                createdAt: data.createdAt,
            },
        ],
    });
});

escucharEvento<{ accion: AccionModeracionSala }>('dinamica:sala:moderacion-actualizada', (data) => {
    const state = useSalaDinamicaStore.getState();
    if (data.accion === 'silenciar') {
        useSalaDinamicaStore.setState({ miModeracion: { ...state.miModeracion, silenciado: true } });
    } else if (data.accion === 'quitar-silencio') {
        useSalaDinamicaStore.setState({ miModeracion: { ...state.miModeracion, silenciado: false } });
    } else if (data.accion === 'quitar-expulsion') {
        useSalaDinamicaStore.setState({ miModeracion: { ...state.miModeracion, expulsado: false } });
    }
});

escucharEvento('dinamica:sala:expulsado', () => {
    const state = useSalaDinamicaStore.getState();
    useSalaDinamicaStore.setState({ expulsadoAhora: true, miModeracion: { ...state.miModeracion, expulsado: true } });
});

escucharEvento<{ estado: EstadoDinamica; modoSorteo?: 'automatico' | 'manual' }>('dinamica:sala:estado-cambio', (data) => {
    useSalaDinamicaStore.setState({ estado: data.estado, modoSorteo: data.modoSorteo ?? null, pausadoSorteo: false });
});

escucharEvento<{ pausado: boolean }>('dinamica:sala:pausa-cambio', (data) => {
    useSalaDinamicaStore.setState({ pausadoSorteo: data.pausado });
});

escucharEvento<IntentoSorteoEvento>('dinamica:sala:intento', (intento) => {
    const state = useSalaDinamicaStore.getState();
    useSalaDinamicaStore.setState({ intentosRevelados: [...state.intentosRevelados, intento] });
});

escucharEvento<{ usuarioIds: string[] }>('dinamica:sala:presencia', (data) => {
    useSalaDinamicaStore.setState({ conectados: new Set(data.usuarioIds) });
});
