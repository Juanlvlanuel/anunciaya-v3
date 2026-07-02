import Redis, { RedisOptions } from 'ioredis';

// Conexión a Redis
let redisUrl = process.env.REDIS_URL?.trim();

if (!redisUrl) {
  throw new Error('REDIS_URL no está definida en las variables de entorno');
}

// Saneamiento defensivo del valor (Render/.env a veces conservan comillas,
// espacios o pierden el esquema al pegar), para que ioredis no lo tome como
// ruta de socket local y falle con ENOENT:
// 1) quitar comillas envolventes accidentales
if (
  (redisUrl.startsWith('"') && redisUrl.endsWith('"')) ||
  (redisUrl.startsWith("'") && redisUrl.endsWith("'"))
) {
  redisUrl = redisUrl.slice(1, -1).trim();
}
// 2) garantizar el esquema: sin redis:// o rediss:// asumimos TLS (Upstash)
if (!/^rediss?:\/\//i.test(redisUrl)) {
  redisUrl = 'rediss://' + redisUrl.replace(/^\/+/, '');
}

// TLS explícito cuando el esquema es seguro (Upstash lo requiere)
const opciones: RedisOptions = redisUrl.startsWith('rediss://') ? { tls: {} } : {};

// Cliente Redis
export const redis = new Redis(redisUrl, opciones);

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