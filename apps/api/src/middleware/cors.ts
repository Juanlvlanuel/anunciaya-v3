import cors from 'cors';

// Orígenes permitidos
// Quita una posible barra final: el header `Origin` del navegador nunca la trae, así que
// 'https://x.vercel.app/' en la env var rompería el match con el origen real. Defensivo.
const sinBarraFinal = (u: string | undefined) => u?.replace(/\/+$/, '');

const origenesPermitidos = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3100',      // Panel Admin (apps/admin) en dev
  'http://192.168.1.232:3000',
  'http://192.168.1.125:3000',
  'https://192.168.1.125:3000',
  'https://192.168.1.232:3000',
  sinBarraFinal(process.env.FRONTEND_URL),
  sinBarraFinal(process.env.PANEL_URL),  // Panel Admin en prod (misma env var que el enlace del correo)
].filter(Boolean) as string[];

/**
 * Valida si un origen está permitido. Compartido entre el CORS de Express
 * (configurarCors) y el CORS de Socket.io (socket.ts) para no duplicar reglas.
 */
export function esOrigenPermitido(origin: string | undefined): boolean {
  // Permitir peticiones sin origin (Postman, curl, same-origin sin header Origin)
  if (!origin) return true;
  // Permitir cualquier subdominio de ngrok (para desarrollo)
  if (origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) return true;
  return origenesPermitidos.includes(origin);
}

// Configuración de CORS
export const configurarCors = cors({
  origin: (origin, callback) => {
    if (esOrigenPermitido(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});