import express, { type Express } from 'express';

// Middleware
import {
  configurarCors,
  configurarHelmet,
  limitadorGeneral,
  manejadorErrores,
  rutaNoEncontrada,
} from './middleware';

// ✅ NUEVO - Middleware de transformación snake_case → camelCase
import { transformResponseMiddleware } from './middleware/transformResponse.middleware';

// Rutas
import routes from './routes';


// Crear app
const app: Express = express();

app.set('trust proxy', 1);

// Middleware de seguridad
app.use(configurarHelmet);
app.use(configurarCors);
app.use(limitadorGeneral);

// ============================================================================
// IMPORTANTE: Parser JSON con EXCEPCIÓN para webhook de Stripe
// ============================================================================
// Stripe necesita el raw body para verificar la firma. Usamos esta función
// para excluir la ruta del webhook del parser JSON.
app.use((req, res, next) => {
  // Si es el webhook de Stripe, NO parsear como JSON
  if (req.originalUrl === '/api/pagos/webhook') {
    next();
  } else {
    // Para todas las demás rutas, usar JSON parser
    express.json()(req, res, next);
  }
});

// ============================================================================
// ✅ NUEVO - Transformación automática snake_case → camelCase
// ============================================================================
// Transforma TODAS las respuestas JSON del backend de snake_case a camelCase
// Esto elimina la necesidad de mappers manuales en el frontend.
// DEBE ir DESPUÉS del parser JSON y ANTES de las rutas.
app.use(transformResponseMiddleware);

// Rutas de la API
app.use('/api', routes);

// Ruta no encontrada (404)
app.use(rutaNoEncontrada);

// Manejador global de errores
app.use(manejadorErrores);

export default app;