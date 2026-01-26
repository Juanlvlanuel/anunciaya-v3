import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// App y conexiones
import app from './app';
import { connectMongo } from './db/mongo';

const PORT = process.env.API_PORT || 4000;
const HOST = process.env.API_HOST || '0.0.0.0'; // Escuchar en todas las interfaces

// Iniciar servidor
const iniciarServidor = async () => {
  try {
    // Conectar a MongoDB
    await connectMongo();

    // Iniciar servidor en todas las interfaces de red
    app.listen(Number(PORT), HOST, () => {
      console.log('');
      console.log('🚀 AnunciaYA API v3.0.0');
      console.log(`📡 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌐 Red local: http://192.168.1.232:${PORT}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();