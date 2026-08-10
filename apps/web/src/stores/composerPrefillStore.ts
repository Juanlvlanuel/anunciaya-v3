/**
 * composerPrefillStore.ts
 * =========================
 * Puente efímero entre el Asistente Coyo (FAB global) y los composers de
 * MarketPlace/Servicios: cuando Coyo arma un borrador (capacidades
 * `crear_publicacion_marketplace` / `crear_publicacion_servicio`), lo deja
 * aquí antes de navegar a `/marketplace?crear=vendo|busco` o
 * `/servicios?crear=ofrezco|solicito`; el composer correspondiente lo
 * consume al montar.
 *
 * Estado de UI puro (no viene del servidor) — Zustand, no React Query.
 *
 * `consumir*()` lee Y limpia en el mismo paso — el composer lo llama
 * INMEDIATAMENTE al montar (no espera a que el usuario aplique nada) y
 * limpia también al desmontar como red de seguridad, para que datos viejos
 * del asistente nunca se filtren a una creación manual posterior.
 *
 * Ubicación: apps/web/src/stores/composerPrefillStore.ts
 */

import { create } from 'zustand';
import type { ArchivoFoto } from '../types/archivoFoto';
import type { CategoriaClasificado } from '../types/servicios';

export interface PrefillMarketplace {
    titulo?: string;
    descripcion?: string;
    precio?: number;
    categoriaId?: number | null;
    /** Condición sugerida por la IA a partir de la foto — 4 valores válidos de `campoCondicion`, o `null`. */
    condicion?: 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar' | null;
    /** Fotos ya subidas a R2 (adjuntadas desde el chat de Coyo) — el composer las aplica directo a `draft.fotos`. */
    fotos?: ArchivoFoto[];
}

export interface PrefillServicios {
    titulo?: string;
    descripcion?: string;
    /** Solo aplica a modo="solicito" (Clasificados) — deducida por Coyo. */
    categoria?: CategoriaClasificado;
    /** Un solo número que el usuario dio — se usa como budgetMin y budgetMax. */
    presupuesto?: number;
}

/** Puente para `crear_producto_catalogo` (Business Studio → Catálogo). A diferencia
 *  de MarketPlace/Servicios, Catálogo no tiene borrador — el modal de crear
 *  artículo (`ModalArticulo.tsx`) recibe estos valores como estado inicial y el
 *  comerciante da el "Guardar" final él mismo, igual regla de oro. */
export interface PrefillCatalogo {
    tipo?: 'producto' | 'servicio';
    nombre?: string;
    descripcion?: string;
    categoria?: string;
    precioBase?: number;
}

/** Puente para `crear_publicacion_negocio` (Business Studio → Publicaciones). El
 *  composer (`ComposerPublicacionNegocio.tsx`) ya se abre solo con `?crear=1` —
 *  Coyo solo necesita dejar el texto/precio aquí antes de navegar ahí. */
export interface PrefillPublicacionNegocio {
    texto?: string;
    precio?: number;
}

/** Puente para `crear_vacante` (Business Studio → Vacantes). El wizard
 *  (`SlideoverNuevaVacante.tsx`) ya tiene su propio borrador en localStorage —
 *  el prefill de Coyo tiene PRIORIDAD sobre ese borrador si ambos existen
 *  (la intención más reciente del comerciante gana). Sin requisitos/
 *  beneficios/horario/días — se dejan para que el comerciante los agregue
 *  él mismo en el wizard, ya con lo esencial listo. */
export interface PrefillVacante {
    titulo?: string;
    descripcion?: string;
    tipoEmpleo?: 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual';
    modalidad?: 'presencial' | 'remoto' | 'hibrido';
    /** Monto único en pesos mexicanos (mensual) — si no viene, el wizard arranca en "A convenir". */
    salario?: number;
}

/** Puente para `crear_recompensa_cardya` (Business Studio → Puntos y Recompensas).
 *  Mismo patrón que Catálogo: `ModalRecompensa.tsx` recibe estos valores como
 *  estado inicial y el comerciante da el "Guardar" final él mismo. */
export interface PrefillRecompensa {
    nombre?: string;
    descripcion?: string;
    puntosRequeridos?: number;
}

/** Puente para `editar_config_puntos_cardya` (Business Studio → Puntos, tab
 *  Configuración). A diferencia de los demás, NO hay modal ni borrador: el
 *  formulario está siempre visible y editable — Coyo solo precarga los
 *  inputs, el comerciante sigue dando "Guardar" con el botón de siempre.
 *  Deliberadamente NO toca los niveles Bronce/Plata/Oro (rangos/multiplicadores
 *  tienen validación cruzada frágil — se dejan para edición manual). */
export interface PrefillConfigPuntos {
    pesosPor?: number;
    puntosGanados?: number;
    /** `null` = "nunca expiran". */
    diasExpiracionPuntos?: number | null;
    diasExpiracionVoucher?: number;
}

/** Puente para `crear_sucursal` (Business Studio → Sucursales). El backend ya
 *  resolvió ciudad/estado/lat/lng contra el catálogo real de ciudades — el
 *  modal (`ModalCrearSucursal.tsx`) recibe estos valores como estado inicial
 *  (incluye el mapa ya centrado) y el comerciante da "Crear sucursal" él
 *  mismo, tras ajustar el marcador a la ubicación exacta. */
export interface PrefillSucursal {
    nombre?: string;
    ciudad?: string;
    estado?: string;
    latitud?: number;
    longitud?: number;
    direccion?: string;
    telefono?: string;
}

/** Puente para `crear_empleado` (Business Studio → Empleados). El modal
 *  (`ModalEmpleado.tsx`) recibe estos valores como estado inicial y el
 *  comerciante da "Crear empleado" él mismo. El nick ya viene sanitizado por
 *  el backend; el modal igual corre su verificación de disponibilidad en
 *  vivo por si ya está en uso. Deliberadamente SIN PIN — ese campo se queda
 *  en blanco a propósito, es información sensible de acceso a caja que el
 *  comerciante siempre captura a mano. */
export interface PrefillEmpleado {
    nombre?: string;
    nick?: string;
    especialidad?: string;
    telefono?: string;
    puedeRegistrarVentas?: boolean;
    puedeProcesarCanjes?: boolean;
    puedeVerHistorial?: boolean;
    puedeResponderChat?: boolean;
    puedeResponderResenas?: boolean;
}

/** Puente para `editar_perfil_comercial` (Business Studio → Mi Perfil). No hay
 *  modal ni composer: el formulario de las 4 pestañas afectadas (Negocio,
 *  Contacto, Ubicación, Operación) está siempre visible — `usePerfil.ts`
 *  aplica estos valores por encima de los cargados del servidor (quedan como
 *  "cambio pendiente", el mismo FAB de Guardar de siempre los persiste).
 *  Deliberadamente SIN nombre/categoría (cambios sensibles), SIN horarios
 *  (validación delicada) y SIN imágenes (Coyo nunca sube fotos). */
export interface PrefillPerfilComercial {
    descripcion?: string;
    telefono?: string;
    whatsapp?: string;
    correo?: string;
    sitioWeb?: string;
    direccion?: string;
    ciudad?: string;
    estado?: string;
    latitud?: number;
    longitud?: number;
    metodoPagoEfectivo?: boolean;
    metodoPagoTarjeta?: boolean;
    metodoPagoTransferencia?: boolean;
    tieneEnvio?: boolean;
    tieneServicio?: boolean;
}

/** Puente para `crear_oferta` (Business Studio → Promociones). Reusa el mismo
 *  prop `datosIniciales` que ya usa el flujo "duplicar cupón" de `ModalOferta.tsx`
 *  — todo como string porque así lo espera `FormularioState`. Solo ofertas
 *  PÚBLICAS: Coyo nunca arma un cupón privado (requiere elegir clientes reales). */
export interface PrefillOferta {
    titulo?: string;
    tipo?: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
    valor?: string;
    fechaInicio?: string;
    fechaFin?: string;
    descripcion?: string;
    compraMinima?: string;
}

interface ComposerPrefillState {
    pendienteMarketplace: PrefillMarketplace | null;
    pendienteServicios: PrefillServicios | null;
    pendienteCatalogo: PrefillCatalogo | null;
    pendientePublicacionNegocio: PrefillPublicacionNegocio | null;
    pendienteVacante: PrefillVacante | null;
    pendienteRecompensa: PrefillRecompensa | null;
    pendienteConfigPuntos: PrefillConfigPuntos | null;
    pendienteSucursal: PrefillSucursal | null;
    pendienteEmpleado: PrefillEmpleado | null;
    pendientePerfilComercial: PrefillPerfilComercial | null;
    pendienteOferta: PrefillOferta | null;
    setPrefillMarketplace: (datos: PrefillMarketplace) => void;
    setPrefillServicios: (datos: PrefillServicios) => void;
    setPrefillCatalogo: (datos: PrefillCatalogo) => void;
    setPrefillPublicacionNegocio: (datos: PrefillPublicacionNegocio) => void;
    setPrefillVacante: (datos: PrefillVacante) => void;
    setPrefillRecompensa: (datos: PrefillRecompensa) => void;
    setPrefillConfigPuntos: (datos: PrefillConfigPuntos) => void;
    setPrefillSucursal: (datos: PrefillSucursal) => void;
    setPrefillEmpleado: (datos: PrefillEmpleado) => void;
    setPrefillPerfilComercial: (datos: PrefillPerfilComercial) => void;
    setPrefillOferta: (datos: PrefillOferta) => void;
    /** Lee el prefill pendiente de MarketPlace y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirMarketplace: () => PrefillMarketplace | null;
    /** Lee el prefill pendiente de Servicios y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirServicios: () => PrefillServicios | null;
    /** Lee el prefill pendiente de Catálogo y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirCatalogo: () => PrefillCatalogo | null;
    /** Lee el prefill pendiente de Publicaciones y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirPublicacionNegocio: () => PrefillPublicacionNegocio | null;
    /** Lee el prefill pendiente de Vacantes y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirVacante: () => PrefillVacante | null;
    /** Lee el prefill pendiente de Recompensa y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirRecompensa: () => PrefillRecompensa | null;
    /** Lee el prefill pendiente de Config de Puntos y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirConfigPuntos: () => PrefillConfigPuntos | null;
    /** Lee el prefill pendiente de Sucursal y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirSucursal: () => PrefillSucursal | null;
    /** Lee el prefill pendiente de Empleado y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirEmpleado: () => PrefillEmpleado | null;
    /** Lee el prefill pendiente de Mi Perfil Comercial y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirPerfilComercial: () => PrefillPerfilComercial | null;
    /** Lee el prefill pendiente de Oferta y lo limpia en el mismo paso. `null` si no hay nada. */
    consumirOferta: () => PrefillOferta | null;
}

export const useComposerPrefillStore = create<ComposerPrefillState>((set, get) => ({
    pendienteMarketplace: null,
    pendienteServicios: null,
    pendienteCatalogo: null,
    pendientePublicacionNegocio: null,
    pendienteVacante: null,
    pendienteRecompensa: null,
    pendienteConfigPuntos: null,
    pendienteSucursal: null,
    pendienteEmpleado: null,
    pendientePerfilComercial: null,
    pendienteOferta: null,
    setPrefillMarketplace: (datos) => set({ pendienteMarketplace: datos }),
    setPrefillServicios: (datos) => set({ pendienteServicios: datos }),
    setPrefillCatalogo: (datos) => set({ pendienteCatalogo: datos }),
    setPrefillPublicacionNegocio: (datos) => set({ pendientePublicacionNegocio: datos }),
    setPrefillVacante: (datos) => set({ pendienteVacante: datos }),
    setPrefillRecompensa: (datos) => set({ pendienteRecompensa: datos }),
    setPrefillConfigPuntos: (datos) => set({ pendienteConfigPuntos: datos }),
    setPrefillSucursal: (datos) => set({ pendienteSucursal: datos }),
    setPrefillEmpleado: (datos) => set({ pendienteEmpleado: datos }),
    setPrefillPerfilComercial: (datos) => set({ pendientePerfilComercial: datos }),
    setPrefillOferta: (datos) => set({ pendienteOferta: datos }),
    consumirMarketplace: () => {
        const datos = get().pendienteMarketplace;
        if (datos) set({ pendienteMarketplace: null });
        return datos;
    },
    consumirServicios: () => {
        const datos = get().pendienteServicios;
        if (datos) set({ pendienteServicios: null });
        return datos;
    },
    consumirCatalogo: () => {
        const datos = get().pendienteCatalogo;
        if (datos) set({ pendienteCatalogo: null });
        return datos;
    },
    consumirPublicacionNegocio: () => {
        const datos = get().pendientePublicacionNegocio;
        if (datos) set({ pendientePublicacionNegocio: null });
        return datos;
    },
    consumirVacante: () => {
        const datos = get().pendienteVacante;
        if (datos) set({ pendienteVacante: null });
        return datos;
    },
    consumirRecompensa: () => {
        const datos = get().pendienteRecompensa;
        if (datos) set({ pendienteRecompensa: null });
        return datos;
    },
    consumirConfigPuntos: () => {
        const datos = get().pendienteConfigPuntos;
        if (datos) set({ pendienteConfigPuntos: null });
        return datos;
    },
    consumirSucursal: () => {
        const datos = get().pendienteSucursal;
        if (datos) set({ pendienteSucursal: null });
        return datos;
    },
    consumirEmpleado: () => {
        const datos = get().pendienteEmpleado;
        if (datos) set({ pendienteEmpleado: null });
        return datos;
    },
    consumirPerfilComercial: () => {
        const datos = get().pendientePerfilComercial;
        if (datos) set({ pendientePerfilComercial: null });
        return datos;
    },
    consumirOferta: () => {
        const datos = get().pendienteOferta;
        if (datos) set({ pendienteOferta: null });
        return datos;
    },
}));
