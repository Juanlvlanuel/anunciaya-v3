import { Router } from 'express';
import {
  guardarPaso1Controller,
  actualizarSucursalPrincipalController,
  actualizarContacto,
  guardarHorarios,
  actualizarLogo,
  actualizarPortada,
  agregarGaleria,
  guardarMetodosPago,
  configurarPuntos,
  crearArticulos,
  finalizar,
  obtenerProgreso,
  obtenerMiNegocio,
  guardarBorradorPaso1Controller,
  guardarBorradorSucursalController,
  guardarBorradorContactoController,
  guardarBorradorHorariosController,
  guardarBorradorLogoController,
  guardarBorradorPortadaController,
  guardarBorradorGaleriaController,
  guardarBorradorMetodosPagoController,
  guardarBorradorPuntosController,
  guardarBorradorArticulosController,
} from '../controllers/onboarding.controller';
import { verificarToken } from '../middleware/auth';
// import { verificarPropietarioNegocio } from '../middleware/negocio.middleware'; // Crearemos después

const router: Router = Router();

// ============================================
// MIDDLEWARE GLOBAL
// ============================================
// Todas las rutas requieren autenticación
router.use(verificarToken);

// NOTA: Descomentar cuando se cree negocio.middleware.ts
// Todas las rutas requieren que el usuario sea dueño del negocio
// router.use('/:negocioId', verificarPropietarioNegocio);

// ============================================
// OBTENER NEGOCIO DEL USUARIO AUTENTICADO
// ============================================

/**
 * GET /api/onboarding/mi-negocio
 * Obtiene el negocio del usuario autenticado (si existe)
 * Retorna: { success: true, data: { negocioId, nombre, esBorrador, onboardingCompletado } | null }
 */
router.get('/mi-negocio', obtenerMiNegocio);

// ============================================
// PASO 1: NOMBRE DEL NEGOCIO, CATEGORIA Y SUBCATEGORÍAS
// ============================================

/**
 * POST /api/onboarding/:negocioId/paso1
 * Guarda nombre del negocio y asigna 1-3 subcategorías
 * Body: { nombre: string, subcategoriasIds: number[] }
 */
router.post('/:negocioId/paso1', guardarPaso1Controller);

// ============================================
// PASO 2: UBICACIÓN - CREAR SUCURSAL PRINCIPAL
// ============================================

/**
 * ✅ CAMBIO: POST → PUT
 * PUT /api/onboarding/:negocioId/sucursal
 * Actualiza la sucursal principal con ubicación
 * (La sucursal ya fue creada automáticamente en el registro)
 * Body: { ciudad: string, direccion: string, latitud: number, longitud: number }
 * Retorna: { success: true, sucursalId: string }
 */
router.put('/:negocioId/sucursal', actualizarSucursalPrincipalController);  // ✅ POST → PUT

// ============================================
// PASO 3: CONTACTO
// ============================================

/**
 * POST /api/onboarding/:negocioId/contacto
 * Actualiza contacto del negocio y sucursal
 * Body: {
 *   sucursalId?: string,
 *   telefono?: string,
 *   whatsapp?: string,
 *   correo?: string,
 *   sitioWeb?: string
 * }
 */
router.post('/:negocioId/contacto', actualizarContacto);

// ============================================
// PASO 4: HORARIOS
// ============================================

/**
 * POST /api/onboarding/:negocioId/horarios
 * Guarda horarios de 7 días para la sucursal
 * Body: {
 *   sucursalId: string,
 *   horarios: [{
 *     diaSemana: number (0-6),
 *     abierto: boolean,
 *     horaApertura?: string,
 *     horaCierre?: string,
 *     tieneHorarioComida?: boolean,
 *     comidaInicio?: string,
 *     comidaFin?: string
 *   }]
 * }
 */
router.post('/:negocioId/horarios', guardarHorarios);

// ============================================
// PASO 5: IMÁGENES
// ============================================

/**
 * POST /api/onboarding/:negocioId/logo
 * Actualiza el logo del negocio
 * Body: { logoUrl: string }
 */
router.post('/:negocioId/logo', actualizarLogo);

/**
 * POST /api/onboarding/:negocioId/portada
 * Actualiza la imagen de portada del negocio
 * Body: { portadaUrl: string }
 */
router.post('/:negocioId/portada', actualizarPortada);

/**
 * POST /api/onboarding/:negocioId/galeria
 * Agrega hasta 10 imágenes a la galería
 * Body: { imagenes: string[] }
 */
router.post('/:negocioId/galeria', agregarGaleria);

// ============================================
// PASO 6: MÉTODOS DE PAGO
// ============================================

/**
 * POST /api/onboarding/:negocioId/metodos-pago
 * Guarda métodos de pago del negocio
 * Body: { metodosPago: string[] }
 * Valores permitidos: ['efectivo_en_local', 'efectivo_en_entrega', 'transferencia']
 */
router.post('/:negocioId/metodos-pago', guardarMetodosPago);

// ============================================
// PASO 7: PARTICIPACIÓN EN PUNTOS
// ============================================

/**
 * POST /api/onboarding/:negocioId/puntos
 * Configura si el negocio participa en el sistema de puntos
 * Body: { participaPuntos: boolean }
 */
router.post('/:negocioId/puntos', configurarPuntos);

// ============================================
// PASO 8: ARTÍCULOS INICIALES
// ============================================

/**
 * POST /api/onboarding/:negocioId/articulos
 * Crea mínimo 3 artículos iniciales
 * Body: {
 *   articulos: [{
 *     tipo: 'producto' | 'servicio',
 *     nombre: string,
 *     descripcion: string,
 *     precioBase: number,
 *     imagenPrincipal: string,
 *     disponible: boolean
 *   }]
 * }
 */
router.post('/:negocioId/articulos', crearArticulos);

// ============================================
// FINALIZAR ONBOARDING
// ============================================

/**
 * POST /api/onboarding/:negocioId/finalizar
 * Valida que todos los pasos estén completos y publica el negocio
 * Body: { usuarioId: string }
 * Cambia: es_borrador=false, onboarding_completado=true
 * Asigna: usuarios.negocio_id = negocio.id
 */
router.post('/:negocioId/finalizar', finalizar);

// ============================================
// OBTENER PROGRESO
// ============================================

/**
 * GET /api/onboarding/:negocioId/progreso
 * Obtiene el estado actual del onboarding
 * Retorna qué pasos están completos
 */
router.get('/:negocioId/progreso', obtenerProgreso);

// ============================================
// ENDPOINTS DE BORRADOR (SIN VALIDACIÓN COMPLETA)
// ============================================

/**
 * PATCH /api/onboarding/:negocioId/paso1/draft
 * Guarda borrador del paso 1 SIN validar campos requeridos
 * Body: { nombre?: string, subcategoriasIds?: number[] }
 */
router.patch('/:negocioId/paso1/draft', guardarBorradorPaso1Controller);

/**
 * PATCH /api/onboarding/:negocioId/sucursal/draft
 * Guarda borrador de ubicación SIN validar campos requeridos
 * Body: { ciudad?: string, direccion?: string, latitud?: number, longitud?: number }
 */
router.patch('/:negocioId/sucursal/draft', guardarBorradorSucursalController);

/**
 * PATCH /api/onboarding/:negocioId/contacto/draft
 * Guarda borrador de contacto SIN validar que al menos 1 esté presente
 * Body: { telefono?: string, whatsapp?: string, correo?: string, sitioWeb?: string }
 */
router.patch('/:negocioId/contacto/draft', guardarBorradorContactoController);

/**
 * PATCH /api/onboarding/:negocioId/horarios/draft
 * Guarda borrador de horarios SIN validar que sean 7 días completos
 * Body: { horarios?: [...] }
 */
router.patch('/:negocioId/horarios/draft', guardarBorradorHorariosController);

/**
 * PATCH /api/onboarding/:negocioId/logo/draft
 * Guarda borrador de logo SIN validar
 * Body: { logoUrl?: string }
 */
router.patch('/:negocioId/logo/draft', guardarBorradorLogoController);

/**
 * PATCH /api/onboarding/:negocioId/portada/draft
 * Guarda borrador de portada SIN validar
 * Body: { portadaUrl?: string }
 */
router.patch('/:negocioId/portada/draft', guardarBorradorPortadaController);

/**
 * PATCH /api/onboarding/:negocioId/galeria/draft
 * Guarda borrador de galería SIN validar cantidad
 * Body: { imagenes?: [...] }
 */
router.patch('/:negocioId/galeria/draft', guardarBorradorGaleriaController);

/**
 * PATCH /api/onboarding/:negocioId/metodos-pago/draft
 * Guarda borrador de métodos de pago SIN validar mínimo 1
 * Body: { metodos?: string[] }
 */
router.patch('/:negocioId/metodos-pago/draft', guardarBorradorMetodosPagoController);

/**
 * PATCH /api/onboarding/:negocioId/puntos/draft
 * Guarda borrador de puntos SIN validar
 * Body: { participaPuntos?: boolean }
 */
router.patch('/:negocioId/puntos/draft', guardarBorradorPuntosController);

/**
 * PATCH /api/onboarding/:negocioId/articulos/draft
 * Guarda borrador de artículos SIN validar mínimo 3
 * Body: { articulos?: [...] }
 */
router.patch('/:negocioId/articulos/draft', guardarBorradorArticulosController);



export default router;