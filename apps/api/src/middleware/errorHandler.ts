import { Request, Response, NextFunction } from 'express';

// Interfaz para errores personalizados
interface ErrorConEstado extends Error {
  statusCode?: number;
}

// Manejador global de errores
export const manejadorErrores = (
  error: ErrorConEstado,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const mensaje = error.message || 'Error interno del servidor';

  console.error('❌ Error:', {
    mensaje,
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    mensaje,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

// Manejador de rutas no encontradas
export const rutaNoEncontrada = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
};