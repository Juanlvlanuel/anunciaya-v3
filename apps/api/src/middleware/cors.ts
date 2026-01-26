import cors from 'cors';

// Orígenes permitidos
const origenesPermitidos = [
  'http://localhost:3000',
  'http://192.168.1.232:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Configuración de CORS
export const configurarCors = cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Permitir cualquier subdominio de ngrok (para desarrollo)
    if (origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) {
      return callback(null, true);
    }

    if (origenesPermitidos.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});