/**
 * useAsistenteCoyoStore.ts
 * ==========================
 * Historial de chat del Asistente Coyo (FAB global). Estado de UI puro
 * (Zustand) con persistencia manual en `localStorage`, mismo patrón que los
 * borradores de ChatYA (`useChatYAStore.ts`) — sin librería `persist`,
 * lectura/escritura explícita para controlar exactamente cuándo se toca
 * storage.
 *
 * Ubicación: apps/web/src/stores/useAsistenteCoyoStore.ts
 */

import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import type { ItemCoyo } from '../types/preguntasComunidad';

// =============================================================================
// TIPOS
// =============================================================================

export interface MensajeAsistenteCoyo {
    id: string;
    rol: 'usuario' | 'coyo';
    texto: string;
    timestamp: number;
    /** true si este turno del usuario se originó por voz (dispara TTS en la respuesta de Coyo). */
    origenVoz?: boolean;
    /** Si viene, el mensaje de Coyo muestra un botón "Revisar y publicar". Los datos se aplican al composer SOLO al hacer click (no antes) — evita que un borrador nunca confirmado quede pendiente para una próxima creación manual sin relación. */
    accionPublicarMarketplace?: { ruta: string; titulo?: string; descripcion?: string; categoriaId?: number; precio?: number };
    /** Mismo patrón que `accionPublicarMarketplace`, para el composer de Servicios. */
    accionPublicarServicio?: { ruta: string; titulo?: string; descripcion?: string; categoria?: 'hogar' | 'cuidados' | 'eventos' | 'belleza-bienestar' | 'empleo' | 'otros'; presupuesto?: number };
    /** Mismo patrón, para el modal de Catálogo (Business Studio) — solo modo comercial. */
    accionPublicarCatalogo?: { ruta: string; tipo: 'producto' | 'servicio'; nombre: string; descripcion?: string; categoria?: string; precioBase?: number };
    /** Mismo patrón, para el composer de Publicaciones del negocio (Business Studio) — solo modo comercial. */
    accionPublicarNegocio?: { ruta: string; texto: string; precio?: number };
    /** Mismo patrón, para el wizard de Vacantes (Business Studio) — solo modo comercial. */
    accionPublicarVacante?: { ruta: string; titulo: string; descripcion: string; tipoEmpleo: 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual'; modalidad: 'presencial' | 'remoto' | 'hibrido'; salario?: number };
    /** Mismo patrón, para el modal de Recompensas de CardYA (Business Studio) — solo modo comercial. */
    accionPublicarRecompensa?: { ruta: string; nombre: string; descripcion?: string; puntosRequeridos?: number };
    /** Mismo patrón, para el formulario SIEMPRE VISIBLE de config de Puntos (Business Studio) — solo modo comercial. */
    accionEditarConfigPuntos?: { ruta: string; pesosPor?: number; puntosGanados?: number; diasExpiracionPuntos?: number | null; diasExpiracionVoucher?: number };
    /** Mismo patrón, para el modal de crear Sucursal (Business Studio) — solo modo comercial. Ciudad/estado/lat/lng ya resueltos por el backend contra el catálogo real de ciudades. */
    accionPublicarSucursal?: { ruta: string; nombre: string; ciudad: string; estado: string; latitud: number; longitud: number; direccion?: string; telefono?: string };
    /** Mismo patrón, para el modal de crear Empleado (Business Studio) — solo modo comercial. Nunca incluye PIN (se deja en blanco a propósito). */
    accionPublicarEmpleado?: { ruta: string; nombre: string; nick: string; especialidad?: string; telefono?: string; puedeRegistrarVentas?: boolean; puedeProcesarCanjes?: boolean; puedeVerHistorial?: boolean; puedeResponderChat?: boolean; puedeResponderResenas?: boolean };
    /** Mismo patrón, para el formulario SIEMPRE VISIBLE de Mi Perfil Comercial (Business Studio) — solo modo comercial. Nunca incluye nombre/categoría/horarios/imágenes. */
    accionEditarPerfilComercial?: { ruta: string; descripcion?: string; telefono?: string; whatsapp?: string; correo?: string; sitioWeb?: string; direccion?: string; ciudad?: string; estado?: string; latitud?: number; longitud?: number; metodoPagoEfectivo?: boolean; metodoPagoTarjeta?: boolean; metodoPagoTransferencia?: boolean; tieneEnvio?: boolean; tieneServicio?: boolean };
    /** Mismo patrón, para el modal de crear Oferta pública (Business Studio → Promociones) — solo modo comercial. Nunca es cupón privado. */
    accionPublicarOferta?: { ruta: string; titulo: string; tipoOferta: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro'; valor?: string; fechaInicio: string; fechaFin: string; descripcion?: string; compraMinima?: number };
    /** Burbuja de audio (mensaje de voz del usuario) — igual patrón visual que ChatYA: onda + reproducir. `audioUrl` es un blob URL, solo vive mientras dure la pestaña — NUNCA se persiste a localStorage (no se sube el audio a ningún lado, igual que en el backend). Tras recargar la página, el mensaje vuelve a mostrarse como texto simple. */
    audioUrl?: string;
    audioWaveform?: number[];
    audioDuracion?: number;
    /** Foto adjuntada por el usuario (botón de cámara) — a diferencia de `audioUrl`, esta SÍ es una URL pública de R2 (no un blob local), así que persiste normal en localStorage sin necesitar limpieza especial. */
    imagenUrl?: string;
    /** `true` en mensajes de error de Coyo (falló la red o la IA) — habilita el botón "Reintentar" cuando este es el ÚLTIMO mensaje del chat. */
    esError?: boolean;
    /** Resultados reales de `buscar_informacion` (negocio/oferta/marketplace/servicio), aplanados — se muestran como lista clicable bajo la respuesta para que el usuario navegue directo, en vez de solo describirlos en texto. */
    resultadosBusqueda?: ItemCoyo[];
}

interface AsistenteCoyoState {
    mensajes: MensajeAsistenteCoyo[];
    silenciado: boolean;
    hidratado: boolean;
    hidratarDesdeStorage: () => void;
    /** Devuelve el `id` del mensaje creado — permite actualizarlo después (ver `actualizarMensaje`), ej. para mostrar una foto al instante y rellenar el texto real cuando termine de analizarse. */
    agregarMensaje: (mensaje: Omit<MensajeAsistenteCoyo, 'id' | 'timestamp'>) => string;
    /** Actualiza campos de un mensaje ya agregado (por id) — no cambia su posición ni timestamp. */
    actualizarMensaje: (id: string, cambios: Partial<Omit<MensajeAsistenteCoyo, 'id' | 'timestamp'>>) => void;
    vaciarChat: () => void;
    toggleSilenciado: () => void;
}

// =============================================================================
// STORAGE (manual, por usuario)
// =============================================================================

function getMensajesKey(): string | null {
    try {
        const usuarioId = useAuthStore.getState().usuario?.id;
        return usuarioId ? `ay_asistente_coyo_chat_${usuarioId}` : null;
    } catch {
        return null;
    }
}

const CLAVE_SILENCIADO = 'ay_asistente_coyo_silenciado';

function guardarMensajes(mensajes: MensajeAsistenteCoyo[]): void {
    const key = getMensajesKey();
    if (!key) return;
    try {
        // `audioUrl` es un blob URL de esta pestaña — inválido tras recargar,
        // así que nunca se persiste (se guarda undefined, no la URL vieja).
        const paraGuardar = mensajes.map((m) => {
            const copia = { ...m };
            delete copia.audioUrl;
            return copia;
        });
        localStorage.setItem(key, JSON.stringify(paraGuardar));
    } catch { /* sin acceso a localStorage */ }
}

// =============================================================================
// STORE
// =============================================================================

export const useAsistenteCoyoStore = create<AsistenteCoyoState>((set, get) => ({
    mensajes: [],
    silenciado: false,
    hidratado: false,

    hidratarDesdeStorage: () => {
        if (get().hidratado) return;
        let mensajes: MensajeAsistenteCoyo[] = [];
        let silenciado = false;
        try {
            const key = getMensajesKey();
            if (key) {
                const guardado = localStorage.getItem(key);
                if (guardado) mensajes = JSON.parse(guardado);
            }
            silenciado = localStorage.getItem(CLAVE_SILENCIADO) === '1';
        } catch { /* sin acceso a localStorage */ }
        set({ mensajes, silenciado, hidratado: true });
    },

    agregarMensaje: (mensaje) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => {
            const nuevo: MensajeAsistenteCoyo = {
                ...mensaje,
                id,
                timestamp: Date.now(),
            };
            const mensajes = [...state.mensajes, nuevo];
            guardarMensajes(mensajes);
            return { mensajes };
        });
        return id;
    },

    actualizarMensaje: (id, cambios) => {
        set((state) => {
            const mensajes = state.mensajes.map((m) => (m.id === id ? { ...m, ...cambios } : m));
            guardarMensajes(mensajes);
            return { mensajes };
        });
    },

    vaciarChat: () => {
        guardarMensajes([]);
        set({ mensajes: [] });
    },

    toggleSilenciado: () => {
        set((state) => {
            const silenciado = !state.silenciado;
            try {
                localStorage.setItem(CLAVE_SILENCIADO, silenciado ? '1' : '0');
            } catch { /* sin acceso a localStorage */ }
            return { silenciado };
        });
    },
}));
