import rateLimit from 'express-rate-limit';

// Detectar ambiente
const isDev = process.env.NODE_ENV !== 'production';

// Límite general: 1000 en desarrollo, 100 en producción
export const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 1000 : 100,
  message: {
    success: false,
    message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite estricto para login: 10 en desarrollo, 5 en producción
export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 20 : 5,  // 20 en dev, 5 en prod
  message: {
    success: false,
    message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
});