import Redis from 'ioredis';

// Conexión a Redis
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL no está definida en las variables de entorno');
}

// Cliente Redis
export const redis = new Redis(redisUrl);

// Eventos de conexión
redis.on('connect', () => {
  console.log('✅ Redis conectado correctamente');
});

redis.on('error', (error) => {
  console.error('❌ Error en Redis:', error);
});

// Desconexión (útil para tests)
export const disconnectRedis = async (): Promise<void> => {
  await redis.quit();
  console.log('Redis desconectado');
};