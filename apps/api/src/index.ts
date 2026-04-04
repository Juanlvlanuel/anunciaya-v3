import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// App y conexiones
import app from './app';
import { createServer } from 'http';
import { inicializarSocket } from './socket';
import { inicializarCronChatYA } from './cron/chatya.cron.js';
import { inicializarCronAlertas } from './cron/alertas.cron.js';

const PORT = process.env.API_PORT || 4000;
const HOST = process.env.API_HOST || '0.0.0.0';

// Iniciar servidor
const iniciarServidor = async () => {
  try {
    // Crear servidor HTTP y montar Socket.io
    const server = createServer(app);
    inicializarSocket(server);

    // Iniciar servidor en todas las interfaces de red
    server.listen(Number(PORT), HOST, () => {
      console.log('');
      console.log('🚀 AnunciaYA API v3.0.0');
      console.log(`📡 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌐 Red local: http://192.168.1.232:${PORT}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
      console.log('');
    });

    // Cron jobs
    inicializarCronChatYA();      // Limpieza chats inactivos (diario 3:00 AM)
    inicializarCronAlertas();     // Detección alertas (diario 4:00 AM + semanal lunes 5:00 AM)
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();