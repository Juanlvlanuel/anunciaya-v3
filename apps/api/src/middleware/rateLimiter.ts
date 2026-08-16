import rateLimit from 'express-rate-limit';

// Detectar ambiente
const isDev = process.env.NODE_ENV !== 'production';

// Límite general: 10000 en desarrollo, 2500 en producción
export const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 10000 : 2000,
  message: {
    success: false,
    message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite estricto para login: 1000 en desarrollo, 5 en producción
export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 1000 : 5,  // 1000 en dev, 5 en prod
  message: {
    success: false,
    message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite para OG previews: 500 en desarrollo, 30 en producción
export const limitadorOgPreview = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 500 : 30,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de preview, intenta en un momento',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite para verificación de disponibilidad de correo: 500 dev, 30 prod por minuto
// Usado en flujos de creación de cuenta (ej: crear gerente desde BS Sucursales)
export const limitadorVerificacionCorreo = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 500 : 30,
  message: {
    success: false,
    message: 'Demasiadas verificaciones, espera un momento',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite para el Asistente Coyo (FAB global): 300 dev, 20 prod por minuto.
// Cada llamada dispara Gemini (texto/audio/imagen) — más estricto que el
// general para acotar costo y abuso, sin bloquear una conversación normal.
export const limitadorAsistente = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 300 : 20,
  message: {
    success: false,
    message: 'Demasiadas peticiones al asistente, espera un momento',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite para "Apartar" en Mi Catálogo (MarketPlace): 300 dev, 8 prod por
// minuto. Endpoint PÚBLICO sin auth que acepta nombre+WhatsApp libremente —
// sin este límite, cualquiera podría inundar a un vendedor con solicitudes
// falsas.
export const limitadorApartarMarketplace = rateLimit({
  windowMs: 60 * 1000,
  // 2026-08-15: el catálogo público permite seleccionar varias piezas y
  // mandar una sola solicitud (1 request HTTP por artículo elegido) — el
  // límite sube de 8 a 20 para no bloquear una selección legítima de varias
  // piezas en un solo envío.
  max: isDev ? 300 : 20,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de apartado, espera un momento',
  },
  standardHeaders: true,
  legacyHeaders: false,
});