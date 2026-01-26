import mongoose from 'mongoose';

// Conexión a MongoDB Atlas
export const connectMongo = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI no está definida en las variables de entorno');
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB conectado correctamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
};

// Desconexión (útil para tests)
export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log('MongoDB desconectado');
};

// Exportar mongoose por si se necesita
export { mongoose };