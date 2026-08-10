/**
 * asistente.service.ts — Orquesta un turno del Asistente Coyo (FAB global)
 * ==========================================================================
 * Decide qué hacer con lo que interpretó `interpretarPeticionAsistente`
 * (coyoIA.service.ts): ejecutar una capacidad del catálogo (navegar, armar
 * borrador de MarketPlace, buscar información) o devolver la pregunta de
 * aclaración de Coyo tal cual, para que el controller solo la reenvíe.
 *
 * `responderBusquedaAsistente` reusa las MISMAS piezas que el orquestador de
 * "Pregúntale a Peñasco" (`coyo/orquestador.ts`): interpretarPregunta →
 * buscarEnTodaLaApp → redactarRespuestaCoyo. No reusa el orquestador
 * completo porque ese está armado para el flujo asíncrono que escribe en
 * `preguntas_comunidad` y notifica — el FAB es una consulta síncrona que
 * nunca debe crear una pregunta pública.
 *
 * Ubicación: apps/api/src/services/asistente/asistente.service.ts
 */

import {
    interpretarPeticionAsistente,
    interpretarPregunta,
    redactarRespuestaCoyo,
    type TurnoChatAsistente,
    type ContextoAppAsistente,
} from '../coyo/coyoIA.service.js';
import { buscarEnTodaLaApp, type ResultadoBusquedaUnificada } from '../coyo/buscadorUnificado.js';
import { listarSucursalesCercanas } from '../negocios.service.js';
import { obtenerCategoriasMarketplace } from '../marketplace/categorias.js';
import { listarCiudadesPublicas } from '../ciudadesPublica.service.js';
import { resolverDestino, destinoRequierePersonal } from './capacidades.js';

// =============================================================================
// TIPOS
// =============================================================================

export type ResultadoAsistenteFrontend =
    | { tipo: 'pregunta'; texto: string }
    | { tipo: 'respuesta'; texto: string; resultados: ResultadoBusquedaUnificada['resultados'] | null }
    | { tipo: 'navegar'; ruta: string; mensaje?: string }
    | {
          tipo: 'prefill_marketplace';
          ruta: string;
          modo: 'vendo' | 'busco';
          descripcionArticulo: string;
          descripcion?: string;
          categoriaId?: number;
          precio?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_servicio';
          ruta: string;
          modo: 'ofrezco' | 'solicito';
          descripcionServicio: string;
          descripcion?: string;
          categoria?: 'hogar' | 'cuidados' | 'eventos' | 'belleza-bienestar' | 'empleo' | 'otros';
          presupuesto?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_catalogo';
          ruta: string;
          tipoArticulo: 'producto' | 'servicio';
          nombre: string;
          descripcion?: string;
          categoria?: string;
          precioBase?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_publicacion_negocio';
          ruta: string;
          texto: string;
          precio?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_vacante';
          ruta: string;
          titulo: string;
          descripcion: string;
          tipoEmpleo: 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual';
          modalidad: 'presencial' | 'remoto' | 'hibrido';
          salario?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_recompensa';
          ruta: string;
          nombre: string;
          descripcion?: string;
          puntosRequeridos?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_config_puntos';
          ruta: string;
          pesosPor?: number;
          puntosGanados?: number;
          diasExpiracionPuntos?: number | null;
          diasExpiracionVoucher?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_sucursal';
          ruta: string;
          nombre: string;
          ciudad: string;
          estado: string;
          latitud: number;
          longitud: number;
          direccion?: string;
          telefono?: string;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_empleado';
          ruta: string;
          nombre: string;
          nick: string;
          especialidad?: string;
          telefono?: string;
          puedeRegistrarVentas?: boolean;
          puedeProcesarCanjes?: boolean;
          puedeVerHistorial?: boolean;
          puedeResponderChat?: boolean;
          puedeResponderResenas?: boolean;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_perfil_comercial';
          ruta: string;
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
          mensaje?: string;
      }
    | {
          tipo: 'prefill_oferta';
          ruta: string;
          titulo: string;
          tipoOferta: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
          valor?: string;
          fechaInicio: string;
          fechaFin: string;
          descripcion?: string;
          compraMinima?: number;
          mensaje?: string;
      };

export interface DatosBusquedaAsistente {
    ciudad: string | null;
    lat?: number;
    lng?: number;
    usuarioId: string | null;
}

// =============================================================================
// TEXTOS FIJOS
// =============================================================================

const TEXTO_NO_DISPONIBLE =
    'Ahorita no puedo ayudarte con eso, ¿lo intentamos de nuevo en un momento?';
const TEXTO_SIN_CIUDAD =
    'Antes de buscar necesito saber tu ciudad — activa tu ubicación e intenta de nuevo.';
const TEXTO_NO_SE_HACER_AUN =
    'Todavía no sé hacer eso, pero pronto voy a poder ayudarte con más cosas por aquí.';
const TEXTO_REDIRECCION_NO_LOCAL =
    'Para eso no soy bueno, pero si buscas algo aquí en tu ciudad, dime y te ayudo a buscar.';
const TEXTO_DESTINO_DESCONOCIDO =
    'No encontré esa sección, ¿me dices con otras palabras a dónde quieres ir?';
const TEXTO_NEGOCIO_NO_ENCONTRADO =
    'No encontré ningún negocio con ese nombre por aquí — ¿me dices si lo escribiste bien o me das más pistas?';
const TEXTO_REQUIERE_MODO_PERSONAL =
    'Esa sección solo está disponible en modo Personal — estás en modo comercial (Business Studio) ahorita. Cambia de modo desde tu perfil y vuelve a pedírmelo.';
const TEXTO_FALTA_DETALLE_PUBLICACION =
    '¡Claro! Para dejarte una buena publicación, cuéntame un poco más — por ejemplo qué características tiene, para cuándo lo necesitas, o cualquier dato que ayude a describirlo mejor.';
const TEXTO_REQUIERE_MODO_COMERCIAL =
    'Eso es del catálogo de tu negocio — necesitas estar en modo Comercial (Business Studio) para que te ayude con eso. Cambia de modo desde tu perfil y vuelve a pedírmelo.';

/** Espejo de `CATEGORIAS_CLASIFICADO` (`validations/servicios.schema.ts`) — Servicios en modo="solicito" (Clasificados). */
const CATEGORIAS_CLASIFICADO_VALIDAS = ['hogar', 'cuidados', 'eventos', 'belleza-bienestar', 'empleo', 'otros'] as const;
type CategoriaClasificado = (typeof CATEGORIAS_CLASIFICADO_VALIDAS)[number];
function esCategoriaClasificadoValida(valor: string): valor is CategoriaClasificado {
    return (CATEGORIAS_CLASIFICADO_VALIDAS as readonly string[]).includes(valor);
}

// =============================================================================
// buscar_informacion — mismas piezas que "Pregúntale a Peñasco", sin BD
// =============================================================================

async function responderBusquedaAsistente(
    pregunta: string,
    datos: DatosBusquedaAsistente,
): Promise<ResultadoAsistenteFrontend> {
    if (!datos.ciudad) return { tipo: 'pregunta', texto: TEXTO_SIN_CIUDAD };

    const interpretacion = await interpretarPregunta(pregunta);
    if (!interpretacion.disponible) {
        return { tipo: 'pregunta', texto: TEXTO_NO_DISPONIBLE };
    }

    if (interpretacion.data.tipo === 'inapropiada' || interpretacion.data.tipo === 'no_local') {
        return { tipo: 'respuesta', texto: TEXTO_REDIRECCION_NO_LOCAL, resultados: null };
    }
    if (interpretacion.data.tipo === 'vaga') {
        return {
            tipo: 'respuesta',
            texto: interpretacion.data.mensajeReformular.trim() || TEXTO_REDIRECCION_NO_LOCAL,
            resultados: null,
        };
    }

    const resultadoBusqueda = await buscarEnTodaLaApp({
        q: interpretacion.data.terminos,
        ciudad: datos.ciudad,
        lat: datos.lat,
        lng: datos.lng,
        usuarioId: datos.usuarioId,
        intencion: interpretacion.data.intencion,
        esEmpleo: interpretacion.data.esEmpleo,
    });

    const redaccion = await redactarRespuestaCoyo(
        pregunta,
        resultadoBusqueda.resultados,
        interpretacion.data.intencion,
        interpretacion.data.esEmpleo,
    );
    const texto = redaccion.disponible ? redaccion.data : 'Mira lo que encontré:';

    return { tipo: 'respuesta', texto, resultados: resultadoBusqueda.resultados };
}

// =============================================================================
// navegar_a_perfil_negocio — busca el negocio real por nombre y resuelve su ruta
// =============================================================================

async function resolverPerfilNegocio(
    nombreNegocio: string,
    datos: DatosBusquedaAsistente,
): Promise<ResultadoAsistenteFrontend> {
    if (!datos.ciudad) return { tipo: 'pregunta', texto: TEXTO_SIN_CIUDAD };

    const resultado = await listarSucursalesCercanas(datos.usuarioId, {
        latitud: datos.lat,
        longitud: datos.lng,
        busqueda: nombreNegocio,
        ciudad: datos.ciudad,
        limite: 1,
        offset: 0,
        modoFlexible: true,
    });

    const primero = resultado.data?.[0] as { sucursalId?: string } | undefined;
    if (!primero?.sucursalId) {
        return { tipo: 'pregunta', texto: TEXTO_NEGOCIO_NO_ENCONTRADO };
    }

    return { tipo: 'navegar', ruta: `/negocios/${primero.sucursalId}` };
}

// =============================================================================
// crear_publicacion_marketplace — empareja el nombre de categoría (texto
// libre que dio Gemini) contra el catálogo real de MarketPlace
// =============================================================================

async function resolverCategoriaMarketplace(nombreCategoria: string): Promise<number | undefined> {
    const nombre = nombreCategoria.trim().toLowerCase();
    if (!nombre) return undefined;
    const categorias = await obtenerCategoriasMarketplace();
    const exacta = categorias.find((c) => c.nombre.toLowerCase() === nombre);
    if (exacta) return exacta.id;
    const parcial = categorias.find(
        (c) => c.nombre.toLowerCase().includes(nombre) || nombre.includes(c.nombre.toLowerCase()),
    );
    return parcial?.id;
}

function normalizarTextoCiudad(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

/**
 * Resuelve una ciudad dicha por el usuario contra el catálogo activo
 * (`ciudades`, el mismo que hidrata el autocomplete real del modal de
 * Sucursales) para aproximar lat/lng al centro de esa ciudad — Coyo nunca
 * inventa coordenadas. El comerciante ajusta el pin en el mapa a mano.
 */
async function resolverCiudadSucursal(
    nombreCiudad: string,
): Promise<{ nombre: string; estado: string; lat: number; lng: number } | undefined> {
    const buscado = normalizarTextoCiudad(nombreCiudad);
    if (!buscado) return undefined;
    const ciudades = await listarCiudadesPublicas();
    const candidatas = ciudades.filter((c) => c.coordenadas.lat !== null && c.coordenadas.lng !== null);
    const exacta = candidatas.find((c) => normalizarTextoCiudad(c.nombre) === buscado);
    const match =
        exacta ??
        candidatas.find(
            (c) =>
                normalizarTextoCiudad(c.nombre).includes(buscado) ||
                buscado.includes(normalizarTextoCiudad(c.nombre)) ||
                (c.alias ?? []).some((a) => normalizarTextoCiudad(a).includes(buscado)),
        );
    if (!match) return undefined;
    return { nombre: match.nombre, estado: match.estado, lat: match.coordenadas.lat as number, lng: match.coordenadas.lng as number };
}

/**
 * Sanitiza un nick sugerido por Gemini contra el formato real que exige
 * `crearEmpleadoSchema` (solo letras/números/guión bajo, sin acentos ni
 * espacios) — nunca confiamos en que el prompt baste, igual que el resto de
 * enums validados con `.includes()` en este archivo.
 */
function sanitizarNickEmpleado(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 30);
}

// =============================================================================
// FUNCIÓN PRINCIPAL — un turno completo del asistente
// =============================================================================

/**
 * Interpreta un turno del Asistente Coyo y devuelve lo que el frontend debe
 * hacer: mostrar una pregunta de aclaración, mostrar una respuesta de
 * búsqueda, navegar a una ruta, o abrir el composer de MarketPlace
 * prellenado. Nunca lanza — cualquier caso no disponible cae a un texto
 * cálido, igual que el resto de la cajita de Coyo.
 */
export async function ejecutarPeticionAsistente(
    turnoActual: { texto?: string; audioBase64?: string; audioMimeType?: string },
    historial: TurnoChatAsistente[],
    contextoApp: ContextoAppAsistente,
    datosBusqueda: DatosBusquedaAsistente,
): Promise<ResultadoAsistenteFrontend> {
    const interpretacion = await interpretarPeticionAsistente(turnoActual, historial, contextoApp);
    if (!interpretacion.disponible) {
        return { tipo: 'pregunta', texto: TEXTO_NO_DISPONIBLE };
    }

    const { data } = interpretacion;
    if (data.tipo === 'pregunta') {
        return { tipo: 'pregunta', texto: data.texto };
    }

    switch (data.capacidad) {
        case 'navegar_a_destino': {
            const destino = typeof data.parametros.destino === 'string' ? data.parametros.destino : '';
            const ruta = resolverDestino(destino);
            if (!ruta) return { tipo: 'pregunta', texto: TEXTO_DESTINO_DESCONOCIDO };
            if (contextoApp.modoComercial && destinoRequierePersonal(destino)) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_PERSONAL };
            }
            return { tipo: 'navegar', ruta, mensaje: data.mensaje };
        }
        case 'navegar_a_perfil_negocio': {
            const nombreNegocio =
                typeof data.parametros.nombreNegocio === 'string' ? data.parametros.nombreNegocio : '';
            if (!nombreNegocio.trim()) return { tipo: 'pregunta', texto: TEXTO_NEGOCIO_NO_ENCONTRADO };
            const resultado = await resolverPerfilNegocio(nombreNegocio, datosBusqueda);
            if (resultado.tipo === 'navegar' && data.mensaje) {
                return { ...resultado, mensaje: data.mensaje };
            }
            return resultado;
        }
        case 'crear_publicacion_marketplace': {
            if (contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_PERSONAL };
            }
            const modo = data.parametros.modo === 'busco' ? 'busco' : 'vendo';
            const descripcionArticulo =
                typeof data.parametros.descripcionArticulo === 'string'
                    ? data.parametros.descripcionArticulo
                    : '';
            const descripcion =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : '';
            if (!descripcion) {
                return { tipo: 'pregunta', texto: TEXTO_FALTA_DETALLE_PUBLICACION };
            }
            const categoriaTexto =
                typeof data.parametros.categoria === 'string' ? data.parametros.categoria : '';
            const categoriaId = categoriaTexto
                ? await resolverCategoriaMarketplace(categoriaTexto)
                : undefined;
            const precio =
                typeof data.parametros.precio === 'number' ? data.parametros.precio : undefined;
            return {
                tipo: 'prefill_marketplace',
                ruta: modo === 'busco' ? '/marketplace?crear=busco' : '/marketplace?crear=vendo',
                modo,
                descripcionArticulo,
                descripcion,
                categoriaId,
                precio,
                mensaje: data.mensaje,
            };
        }
        case 'crear_publicacion_servicio': {
            if (contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_PERSONAL };
            }
            const modo = data.parametros.modo === 'solicito' ? 'solicito' : 'ofrezco';
            const descripcionServicio =
                typeof data.parametros.descripcionServicio === 'string'
                    ? data.parametros.descripcionServicio
                    : '';
            const descripcion =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : '';
            if (!descripcion) {
                return { tipo: 'pregunta', texto: TEXTO_FALTA_DETALLE_PUBLICACION };
            }
            const presupuesto =
                typeof data.parametros.presupuesto === 'number' ? data.parametros.presupuesto : undefined;
            const categoriaTexto = typeof data.parametros.categoria === 'string' ? data.parametros.categoria : '';
            const categoria = modo === 'solicito' && esCategoriaClasificadoValida(categoriaTexto)
                ? categoriaTexto
                : undefined;
            return {
                tipo: 'prefill_servicio',
                ruta: `/servicios?crear=${modo}`,
                modo,
                descripcionServicio,
                descripcion,
                categoria,
                presupuesto,
                mensaje: data.mensaje,
            };
        }
        case 'crear_producto_catalogo': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const tipoArticulo = data.parametros.tipo === 'servicio' ? 'servicio' : 'producto';
            const nombre =
                typeof data.parametros.nombre === 'string' ? data.parametros.nombre.trim() : '';
            if (!nombre) {
                return { tipo: 'pregunta', texto: '¿Cómo se llama el producto o servicio que quieres agregar a tu catálogo?' };
            }
            const descripcion =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : undefined;
            const categoria =
                typeof data.parametros.categoria === 'string' ? data.parametros.categoria.trim() : undefined;
            const precioBase =
                typeof data.parametros.precioBase === 'number' ? data.parametros.precioBase : undefined;
            return {
                tipo: 'prefill_catalogo',
                ruta: '/business-studio/catalogo',
                tipoArticulo,
                nombre,
                descripcion: descripcion || undefined,
                categoria: categoria || undefined,
                precioBase,
                mensaje: data.mensaje,
            };
        }
        case 'crear_publicacion_negocio': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const texto =
                typeof data.parametros.texto === 'string' ? data.parametros.texto.trim() : '';
            if (!texto) {
                return { tipo: 'pregunta', texto: '¿De qué quieres que hable tu publicación?' };
            }
            const precio =
                typeof data.parametros.precio === 'number' ? data.parametros.precio : undefined;
            return {
                tipo: 'prefill_publicacion_negocio',
                ruta: '/business-studio/publicaciones?crear=1',
                texto,
                precio,
                mensaje: data.mensaje,
            };
        }
        case 'crear_vacante': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const titulo =
                typeof data.parametros.titulo === 'string' ? data.parametros.titulo.trim() : '';
            if (!titulo) {
                return { tipo: 'pregunta', texto: '¿Qué puesto quieres publicar?' };
            }
            const descripcionVacante =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : '';
            if (!descripcionVacante) {
                return { tipo: 'pregunta', texto: TEXTO_FALTA_DETALLE_PUBLICACION };
            }
            const TIPOS_EMPLEO_VALIDOS = ['tiempo-completo', 'medio-tiempo', 'por-proyecto', 'eventual'] as const;
            const MODALIDADES_VALIDAS = ['presencial', 'remoto', 'hibrido'] as const;
            const tipoEmpleoTexto = typeof data.parametros.tipoEmpleo === 'string' ? data.parametros.tipoEmpleo : '';
            const modalidadTexto = typeof data.parametros.modalidad === 'string' ? data.parametros.modalidad : '';
            const tipoEmpleoValido = (TIPOS_EMPLEO_VALIDOS as readonly string[]).includes(tipoEmpleoTexto);
            const modalidadValida = (MODALIDADES_VALIDAS as readonly string[]).includes(modalidadTexto);
            if (!tipoEmpleoValido || !modalidadValida) {
                return { tipo: 'pregunta', texto: '¿Es de tiempo completo, medio tiempo, por proyecto o eventual? ¿Y es presencial, remoto o híbrido?' };
            }
            const salario =
                typeof data.parametros.salario === 'number' ? data.parametros.salario : undefined;
            return {
                tipo: 'prefill_vacante',
                ruta: '/business-studio/vacantes',
                titulo,
                descripcion: descripcionVacante,
                tipoEmpleo: tipoEmpleoTexto as 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual',
                modalidad: modalidadTexto as 'presencial' | 'remoto' | 'hibrido',
                salario,
                mensaje: data.mensaje,
            };
        }
        case 'crear_recompensa_cardya': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const nombreRecompensa =
                typeof data.parametros.nombre === 'string' ? data.parametros.nombre.trim() : '';
            if (!nombreRecompensa) {
                return { tipo: 'pregunta', texto: '¿Cómo se llama la recompensa que quieres agregar?' };
            }
            const descripcionRecompensa =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : undefined;
            const puntosRequeridos =
                typeof data.parametros.puntosRequeridos === 'number' ? data.parametros.puntosRequeridos : undefined;
            return {
                tipo: 'prefill_recompensa',
                ruta: '/business-studio/puntos',
                nombre: nombreRecompensa,
                descripcion: descripcionRecompensa || undefined,
                puntosRequeridos,
                mensaje: data.mensaje,
            };
        }
        case 'editar_config_puntos_cardya': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const pesosPor =
                typeof data.parametros.pesosPor === 'number' ? data.parametros.pesosPor : undefined;
            const puntosGanados =
                typeof data.parametros.puntosGanados === 'number' ? data.parametros.puntosGanados : undefined;
            const nuncaExpiran = data.parametros.puntosNuncaExpiran === true;
            const diasExpiracionPuntos = nuncaExpiran
                ? null
                : typeof data.parametros.diasExpiracionPuntos === 'number'
                    ? data.parametros.diasExpiracionPuntos
                    : undefined;
            const diasExpiracionVoucher =
                typeof data.parametros.diasExpiracionVoucher === 'number' ? data.parametros.diasExpiracionVoucher : undefined;
            if (
                pesosPor === undefined &&
                puntosGanados === undefined &&
                diasExpiracionPuntos === undefined &&
                diasExpiracionVoucher === undefined
            ) {
                return { tipo: 'pregunta', texto: '¿Qué quieres cambiar de tu configuración de puntos — la tasa de puntos por compra, o los días de expiración?' };
            }
            return {
                tipo: 'prefill_config_puntos',
                ruta: '/business-studio/puntos',
                pesosPor,
                puntosGanados,
                diasExpiracionPuntos,
                diasExpiracionVoucher,
                mensaje: data.mensaje,
            };
        }
        case 'crear_sucursal': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const nombreSucursal =
                typeof data.parametros.nombre === 'string' ? data.parametros.nombre.trim() : '';
            if (!nombreSucursal) {
                return { tipo: 'pregunta', texto: '¿Cómo quieres llamar a esta sucursal?' };
            }
            const ciudadTexto =
                typeof data.parametros.ciudad === 'string' ? data.parametros.ciudad.trim() : '';
            if (!ciudadTexto) {
                return { tipo: 'pregunta', texto: '¿En qué ciudad está esta sucursal?' };
            }
            const ciudadResuelta = await resolverCiudadSucursal(ciudadTexto);
            if (!ciudadResuelta) {
                return {
                    tipo: 'pregunta',
                    texto: `No encontré "${ciudadTexto}" en nuestro catálogo de ciudades — ¿me confirmas el nombre?`,
                };
            }
            const direccionSucursal =
                typeof data.parametros.direccion === 'string' ? data.parametros.direccion.trim() : undefined;
            const telefonoSucursal =
                typeof data.parametros.telefono === 'string' ? data.parametros.telefono.trim() : undefined;
            return {
                tipo: 'prefill_sucursal',
                ruta: '/business-studio/sucursales',
                nombre: nombreSucursal,
                ciudad: ciudadResuelta.nombre,
                estado: ciudadResuelta.estado,
                latitud: ciudadResuelta.lat,
                longitud: ciudadResuelta.lng,
                direccion: direccionSucursal || undefined,
                telefono: telefonoSucursal || undefined,
                mensaje: data.mensaje,
            };
        }
        case 'crear_empleado': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const nombreEmpleado =
                typeof data.parametros.nombre === 'string' ? data.parametros.nombre.trim() : '';
            if (!nombreEmpleado) {
                return { tipo: 'pregunta', texto: '¿Cómo se llama el empleado que quieres agregar?' };
            }
            const nickTexto =
                typeof data.parametros.nick === 'string' ? sanitizarNickEmpleado(data.parametros.nick) : '';
            if (!nickTexto || nickTexto.length < 2) {
                return { tipo: 'pregunta', texto: '¿Qué nick le ponemos para que entre a ScanYA? (solo letras, números o guión bajo)' };
            }
            const especialidadEmpleado =
                typeof data.parametros.especialidad === 'string' ? data.parametros.especialidad.trim() : undefined;
            const telefonoEmpleado =
                typeof data.parametros.telefono === 'string' ? data.parametros.telefono.trim() : undefined;
            return {
                tipo: 'prefill_empleado',
                ruta: '/business-studio/empleados',
                nombre: nombreEmpleado,
                nick: nickTexto,
                especialidad: especialidadEmpleado || undefined,
                telefono: telefonoEmpleado || undefined,
                puedeRegistrarVentas: typeof data.parametros.puedeRegistrarVentas === 'boolean' ? data.parametros.puedeRegistrarVentas : undefined,
                puedeProcesarCanjes: typeof data.parametros.puedeProcesarCanjes === 'boolean' ? data.parametros.puedeProcesarCanjes : undefined,
                puedeVerHistorial: typeof data.parametros.puedeVerHistorial === 'boolean' ? data.parametros.puedeVerHistorial : undefined,
                puedeResponderChat: typeof data.parametros.puedeResponderChat === 'boolean' ? data.parametros.puedeResponderChat : undefined,
                puedeResponderResenas: typeof data.parametros.puedeResponderResenas === 'boolean' ? data.parametros.puedeResponderResenas : undefined,
                mensaje: data.mensaje,
            };
        }
        case 'editar_perfil_comercial': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const descripcionPerfil =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : undefined;
            const telefonoPerfil =
                typeof data.parametros.telefono === 'string' ? data.parametros.telefono.trim() : undefined;
            const whatsappPerfil =
                typeof data.parametros.whatsapp === 'string' ? data.parametros.whatsapp.trim() : undefined;
            const correoPerfil =
                typeof data.parametros.correo === 'string' ? data.parametros.correo.trim() : undefined;
            const sitioWebPerfil =
                typeof data.parametros.sitioWeb === 'string' ? data.parametros.sitioWeb.trim() : undefined;
            const direccionPerfil =
                typeof data.parametros.direccion === 'string' ? data.parametros.direccion.trim() : undefined;
            const ciudadTexto =
                typeof data.parametros.ciudad === 'string' ? data.parametros.ciudad.trim() : '';
            let ciudadResuelta: { nombre: string; estado: string; lat: number; lng: number } | undefined;
            if (ciudadTexto) {
                ciudadResuelta = await resolverCiudadSucursal(ciudadTexto);
                if (!ciudadResuelta) {
                    return {
                        tipo: 'pregunta',
                        texto: `No encontré "${ciudadTexto}" en nuestro catálogo de ciudades — ¿me confirmas el nombre?`,
                    };
                }
            }
            const metodoPagoEfectivo =
                typeof data.parametros.metodoPagoEfectivo === 'boolean' ? data.parametros.metodoPagoEfectivo : undefined;
            const metodoPagoTarjeta =
                typeof data.parametros.metodoPagoTarjeta === 'boolean' ? data.parametros.metodoPagoTarjeta : undefined;
            const metodoPagoTransferencia =
                typeof data.parametros.metodoPagoTransferencia === 'boolean' ? data.parametros.metodoPagoTransferencia : undefined;
            const tieneEnvioPerfil =
                typeof data.parametros.tieneEnvio === 'boolean' ? data.parametros.tieneEnvio : undefined;
            const tieneServicioPerfil =
                typeof data.parametros.tieneServicio === 'boolean' ? data.parametros.tieneServicio : undefined;

            const nadaQueCambiar =
                descripcionPerfil === undefined &&
                telefonoPerfil === undefined &&
                whatsappPerfil === undefined &&
                correoPerfil === undefined &&
                sitioWebPerfil === undefined &&
                direccionPerfil === undefined &&
                !ciudadResuelta &&
                metodoPagoEfectivo === undefined &&
                metodoPagoTarjeta === undefined &&
                metodoPagoTransferencia === undefined &&
                tieneEnvioPerfil === undefined &&
                tieneServicioPerfil === undefined;
            if (nadaQueCambiar) {
                return {
                    tipo: 'pregunta',
                    texto: '¿Qué quieres actualizar de tu perfil — la descripción, tu contacto, tu ubicación, o tus formas de pago/entrega?',
                };
            }

            return {
                tipo: 'prefill_perfil_comercial',
                ruta: '/business-studio/perfil',
                descripcion: descripcionPerfil,
                telefono: telefonoPerfil,
                whatsapp: whatsappPerfil,
                correo: correoPerfil,
                sitioWeb: sitioWebPerfil,
                direccion: direccionPerfil,
                ciudad: ciudadResuelta?.nombre,
                estado: ciudadResuelta?.estado,
                latitud: ciudadResuelta?.lat,
                longitud: ciudadResuelta?.lng,
                metodoPagoEfectivo,
                metodoPagoTarjeta,
                metodoPagoTransferencia,
                tieneEnvio: tieneEnvioPerfil,
                tieneServicio: tieneServicioPerfil,
                mensaje: data.mensaje,
            };
        }
        case 'crear_oferta': {
            if (!contextoApp.modoComercial) {
                return { tipo: 'pregunta', texto: TEXTO_REQUIERE_MODO_COMERCIAL };
            }
            const tituloOferta =
                typeof data.parametros.titulo === 'string' ? data.parametros.titulo.trim() : '';
            if (!tituloOferta) {
                return { tipo: 'pregunta', texto: '¿Qué producto o promoción quieres anunciar?' };
            }
            const TIPOS_OFERTA_VALIDOS = ['porcentaje', 'monto_fijo', '2x1', '3x2', 'envio_gratis', 'otro'] as const;
            const tipoOfertaTexto = typeof data.parametros.tipoOferta === 'string' ? data.parametros.tipoOferta : '';
            if (!(TIPOS_OFERTA_VALIDOS as readonly string[]).includes(tipoOfertaTexto)) {
                return {
                    tipo: 'pregunta',
                    texto: '¿Qué tipo de promoción es — porcentaje de descuento, monto fijo, 2x1, 3x2, envío gratis, u otra cosa?',
                };
            }
            const necesitaValorNumerico = tipoOfertaTexto === 'porcentaje' || tipoOfertaTexto === 'monto_fijo';
            const necesitaValorTexto = tipoOfertaTexto === 'otro';
            const valorOfertaTexto = typeof data.parametros.valor === 'string' ? data.parametros.valor.trim() : '';
            if ((necesitaValorNumerico || necesitaValorTexto) && !valorOfertaTexto) {
                return {
                    tipo: 'pregunta',
                    texto: tipoOfertaTexto === 'otro' ? '¿En qué consiste la promoción?' : '¿De cuánto es el descuento?',
                };
            }
            if (necesitaValorNumerico && Number.isNaN(Number(valorOfertaTexto))) {
                return { tipo: 'pregunta', texto: '¿De cuánto es el descuento? Dame solo el número.' };
            }
            const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
            const fechaInicioOferta =
                typeof data.parametros.fechaInicio === 'string' ? data.parametros.fechaInicio.trim() : '';
            const fechaFinOferta =
                typeof data.parametros.fechaFin === 'string' ? data.parametros.fechaFin.trim() : '';
            if (!FORMATO_FECHA.test(fechaInicioOferta) || !FORMATO_FECHA.test(fechaFinOferta)) {
                return { tipo: 'pregunta', texto: '¿Del/desde cuándo hasta cuándo quieres que dure la promoción?' };
            }
            if (fechaFinOferta < fechaInicioOferta) {
                return { tipo: 'pregunta', texto: 'La fecha de fin debe ser después de la de inicio — ¿me confirmas las fechas?' };
            }
            const descripcionOferta =
                typeof data.parametros.descripcion === 'string' ? data.parametros.descripcion.trim() : undefined;
            const compraMinimaOferta =
                typeof data.parametros.compraMinima === 'number' ? data.parametros.compraMinima : undefined;
            return {
                tipo: 'prefill_oferta',
                ruta: '/business-studio/ofertas',
                titulo: tituloOferta,
                tipoOferta: tipoOfertaTexto as 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro',
                valor: valorOfertaTexto || undefined,
                fechaInicio: fechaInicioOferta,
                fechaFin: fechaFinOferta,
                descripcion: descripcionOferta || undefined,
                compraMinima: compraMinimaOferta,
                mensaje: data.mensaje,
            };
        }
        case 'buscar_informacion': {
            const pregunta =
                typeof data.parametros.pregunta === 'string'
                    ? data.parametros.pregunta
                    : turnoActual.texto ?? '';
            return responderBusquedaAsistente(pregunta, datosBusqueda);
        }
        default:
            return { tipo: 'pregunta', texto: TEXTO_NO_SE_HACER_AUN };
    }
}
