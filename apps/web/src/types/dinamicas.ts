/**
 * dinamicas.ts
 * ============
 * Tipos de Dinámicas (Fase 1-2) — espejo de la tabla `dinamicas` tal como la
 * devuelve el backend (Drizzle con nombres camelCase, sin transformación
 * adicional — `services/dinamicas.service.ts` usa el query builder, no SQL
 * crudo, así que no pasa por el middleware snake_case→camelCase).
 *
 * `precioBoleto` llega como `string`: es una columna `numeric` de Postgres,
 * Drizzle no la convierte a `number` (evita perder precisión) — mismo
 * criterio que otras columnas `numeric` de la app.
 *
 * Ubicación: apps/web/src/types/dinamicas.ts
 */

import type { ArchivoFoto } from './archivoFoto';

export type TipoPremio = 'fisico' | 'efectivo';
export type MetodoSorteo = 'tombola' | 'carta_unica' | 'tabla_completa';
export type ReglaDesempate = 'sorteo_instantaneo' | 'repartir_premio' | 'ronda_extra' | 'orden_inscripcion';
export type EstadoDinamica = 'borrador' | 'activa' | 'pospuesta' | 'en_sorteo' | 'cerrada' | 'cancelada';

export interface ConfirmacionesDinamica {
    premioReal: true;
    pagoFueraApp: true;
    resultadoHonesto: true;
    version: string;
    aceptadasAt: string;
}

// A partir del borrador parcial (solo título+ciudad obligatorios al crear),
// estos campos pueden llegar en NULL mientras la Dinámica sigue en
// 'borrador' — se vuelven obligatorios recién al publicar.
export interface Dinamica {
    id: string;
    organizadorUsuarioId: string;
    titulo: string;
    descripcion: string | null;
    fotosPremio: ArchivoFoto[];
    tipoPremio: TipoPremio | null;
    metodoSorteo: MetodoSorteo | null;
    numeroTotalBoletos: number | null;
    /** Número con el que arranca la numeración de boletos (default 1) — el
     *  final se calcula siempre como `numeroBoletoInicial + numeroTotalBoletos - 1`. */
    numeroBoletoInicial: number;
    precioBoleto: string | null;
    ciudadId: string | null;
    fechaLimiteInscripcion: string | null;
    reglaDesempate: ReglaDesempate | null;
    estado: EstadoDinamica;
    semillaAleatoria: string | null;
    timestampSorteo: string | null;
    hashVerificacion: string | null;
    /** Sala en vivo (Fase 4.1) — su sola presencia es la señal de "sala
     *  configurada". El estado de la sala reusa `estado` de arriba. */
    salaProgramadaPara: string | null;
    /** K = cuántos lugares premiados hay (default 1). */
    numeroLugaresGanadores: number;
    /** N = a qué intento (bola sin reemplazo) sale cada lugar, en cascada
     *  — el intento N es el 1er lugar, N-1 el 2do, etc. */
    numeroIntentosSorteo: number | null;
    confirmaciones: ConfirmacionesDinamica | null;
    /** Contador denormalizado de "Mis Guardados" — mismo patrón que
     *  `totalGuardados` de MarketPlace/Servicios. */
    totalGuardados: number;
    createdAt: string;
    updatedAt: string;
}

/** Solo `titulo` y `ciudad` son obligatorios — mismo criterio laxo que
 *  `crearDinamicaSchema` en el backend (un borrador solo necesita eso). */
export interface CrearDinamicaPayload {
    titulo: string;
    /** Nombre de ciudad (texto) — el backend resuelve el ciudadId real. */
    ciudad: string;
    descripcion?: string;
    fotosPremio?: ArchivoFoto[];
    tipoPremio?: TipoPremio;
    metodoSorteo?: MetodoSorteo;
    numeroTotalBoletos?: number;
    numeroBoletoInicial?: number;
    precioBoleto?: number;
    fechaLimiteInscripcion?: string;
    reglaDesempate?: ReglaDesempate;
    numeroLugaresGanadores?: number;
    numeroIntentosSorteo?: number;
}

export type EditarBorradorDinamicaPayload = Partial<CrearDinamicaPayload>;

export interface PublicarDinamicaPayload {
    confirmaciones: {
        premioReal: true;
        pagoFueraApp: true;
        resultadoHonesto: true;
        version: string;
    };
}

export interface InsigniaOrganizador {
    completadas: number;
    canceladas: number;
    nivel: 'nuevo' | 'activo' | 'confiable';
}

export interface MisDinamicasRespuesta {
    dinamicas: Dinamica[];
    insignia: InsigniaOrganizador;
}

// =============================================================================
// FASE 3 — feed público, ficha enriquecida y participación
// =============================================================================

export interface OrganizadorDinamica {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    /** Solo viene poblado en la ficha de detalle (`obtenerDinamicaPublica`),
     *  no en el feed. ISO/formato Postgres de `usuarios.ultima_conexion`. */
    ultimaConexion?: string | null;
}

/** Fila del feed público (`GET /api/dinamicas`) — la Dinámica + organizador
 *  embebido + boletos vendidos/disponibles, calcado de `ArticuloFeedInfinito`. */
export interface DinamicaFeedItem extends Dinamica {
    organizador: OrganizadorDinamica;
    boletosPagados: number;
    boletosDisponibles: number | null;
    /** true si el usuario autenticado actual la tiene en "Mis Guardados".
     *  Siempre false para visitantes anónimos. */
    guardado: boolean;
}

/** Respuesta paginada del feed — mismo shape que `RespuestaFeedInfinito` de MarketPlace. */
export interface RespuestaFeedDinamicas {
    dinamicas: DinamicaFeedItem[];
    pagina: number;
    limite: number;
    hayMas: boolean;
}

/** Ficha pública (`GET /api/dinamicas/:id`) — la Dinámica + organizador + insignia. */
export interface DinamicaDetallePublico extends Dinamica {
    organizador: OrganizadorDinamica;
    boletosPagados: number;
    boletosDisponibles: number | null;
    insigniaOrganizador: InsigniaOrganizador;
    /** Nombre de la ciudad (join con `ciudades` a partir de `ciudadId`). */
    ciudadNombre: string | null;
    /** true si el usuario autenticado actual la tiene en "Mis Guardados". */
    guardado: boolean;
}

export type EstadoBoletoDinamica = 'reservado' | 'pagado';

/** Fila de la lista pública de participantes (`GET /api/dinamicas/:id/boletos`)
 *  — sin teléfono (ver Contexto_Dinamicas.md). `usuario` viene con los campos
 *  exactos que pide `useIniciarChatDirectoPersona` para el botón "Contactar". */
export interface BoletoDinamica {
    id: string;
    numeroBoleto: number;
    estado: EstadoBoletoDinamica;
    usuario: OrganizadorDinamica | null;
    /** Nombre del participante "Sin cuenta AY" — null si sí tiene cuenta. */
    nombreManual: string | null;
    /** Solo presente cuando quien pide la lista es el organizador — lo
     *  necesita `ModalEditarParticipante` para hidratar el teléfono. */
    telefonoManual?: string | null;
}

/** Dinámicas organizadas por un usuario específico + su insignia
 *  (`GET /api/dinamicas/organizador/:usuarioId`) — alimenta la sección
 *  "Dinámicas organizadas" del perfil público compartido de MarketPlace. */
export interface DinamicasDeOrganizadorRespuesta {
    dinamicas: DinamicaFeedItem[];
    insignia: InsigniaOrganizador;
    pagina: number;
    limite: number;
    hayMas: boolean;
}

/** Ganador dentro del "Cuadro de Honor" (`GET /api/dinamicas/salon-fama`) —
 *  mismo shape que resuelve la sala (`obtenerEstadoSala`) más el avatar, que
 *  ahí no hacía falta pero acá sí (se pinta junto al nombre). */
export interface GanadorSalonFama {
    lugar: number;
    numeroBoleto: number;
    usuarioId: string | null;
    nombreManual: string | null;
    usuarioNombre: string | null;
    usuarioApellidos: string | null;
    usuarioAvatarUrl: string | null;
}

/** Rifa cerrada dentro del "Cuadro de Honor". */
export interface DinamicaSalonFama {
    id: string;
    titulo: string;
    fotosPremio: ArchivoFoto[];
    updatedAt: string;
    ganadores: GanadorSalonFama[];
}

export interface SalonFamaRespuesta {
    dinamicas: DinamicaSalonFama[];
    pagina: number;
    limite: number;
    hayMas: boolean;
}

// =============================================================================
// FASE 4.1 — sala en vivo + motor de sorteo
// =============================================================================

export type TipoMensajeSala = 'texto' | 'sistema';

/** Mensaje del chat de la sala — llega tanto en la carga inicial
 *  (`GET /:id/sala`) como por el evento `dinamica:sala:mensaje`. Los
 *  mensajes `tipo: 'sistema'` (moderación) no traen datos de autor. */
export interface MensajeSalaDinamica {
    id: string;
    usuarioId: string;
    tipo: TipoMensajeSala;
    contenido: string;
    createdAt: string;
    nombre?: string;
    apellidos?: string;
    avatarUrl?: string | null;
}

export interface GanadorDinamica {
    lugar: number;
    numeroIntento: number;
    numeroBoleto: number;
    usuarioId: string | null;
    nombreManual: string | null;
    usuarioNombre?: string | null;
    usuarioApellidos?: string | null;
}

/** Snapshot completo de la sala — respuesta de `GET /:id/sala` y del evento
 *  `dinamica:sala:estado-inicial` al unirse por socket. */
export interface EstadoSalaDinamica {
    estado: EstadoDinamica;
    salaProgramadaPara: string | null;
    numeroLugaresGanadores: number;
    numeroIntentosSorteo: number | null;
    esOrganizador: boolean;
    miModeracion: { silenciado: boolean; expulsado: boolean };
    mensajes: MensajeSalaDinamica[];
    ganadores: { lista: GanadorDinamica[]; hashVerificacion: string | null; semillaAleatoria: string | null } | null;
}

/** Payload del evento `dinamica:sala:intento` — una bola revelada. */
export interface IntentoSorteoEvento {
    numeroIntento: number;
    numeroBoleto: number;
    esGanador: boolean;
    lugar: number | null;
}

/** Payload del evento `dinamica:sala:sorteo-cerrado`. */
export interface SorteoDCerradoEvento {
    hashVerificacion: string | null;
    semillaAleatoria: string | null;
    ganadores: { lugar: number | null; numeroBoleto: number; numeroIntento: number }[];
}

export type AccionModeracionSala =
    | 'silenciar'
    | 'expulsar'
    | 'quitar-silencio'
    | 'quitar-expulsion'
    | 'bloquear'
    | 'desbloquear';
