# 🍃 AnunciaYA v3.0 - Schemas MongoDB (ChatYA)

**Última Actualización:** 26 Diciembre 2024  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Resumen](#resumen)
2. [Conexión con PostgreSQL](#conexión-con-postgresql)
3. [Colección: chats](#colección-chats)
4. [Colección: mensajes](#colección-mensajes)
5. [Colección: contactos](#colección-contactos)
6. [Índices](#índices)
7. [Ejemplos de Queries](#ejemplos-de-queries)

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total de colecciones | 3 |
| ODM | Mongoose |
| Hosting | MongoDB Atlas (M0 Free) |
| Propósito | Sistema de chat (ChatYA) |

### Colecciones

| Colección | Propósito | Documentos típicos |
|-----------|-----------|-------------------|
| `chats` | Conversaciones | ~10-100 por usuario activo |
| `mensajes` | Contenido de mensajes | ~100-1000 por chat |
| `contactos` | Lista de contactos | ~50-200 por usuario |

---

## Conexión con PostgreSQL

### Cambio Principal

Todos los campos que referencian usuarios/negocios usan **String** (UUIDs de PostgreSQL), **NO** ObjectId de MongoDB.

| Antes (MongoDB nativo) | Ahora (con PostgreSQL) |
|------------------------|------------------------|
| `ObjectId("507f1f77bcf86cd799439011")` | `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |

### IDs Internos de MongoDB (siguen siendo ObjectId)

- `chats._id`
- `mensajes._id`
- `mensajes.chat` (referencia a chats)
- `mensajes.replyTo._id` (referencia a otro mensaje)
- `contactos._id`

### IDs de PostgreSQL (son String/UUID)

- `chats.participantes`
- `chats.negocioId`
- `mensajes.emisor`
- `mensajes.negocioId`
- `contactos.usuarioId`
- `contactos.contactoId`
- `contactos.negocioId`

---

## Colección: chats

Almacena las conversaciones entre usuarios.

### Schema

```typescript
// apps/api/src/db/models/Chat.ts
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ChatSchema = new Schema({
  // ══════════════════════════════════════════════════
  // TIPO DE CHAT
  // ══════════════════════════════════════════════════
  tipo: { 
    type: String, 
    enum: ['privado', 'grupo'], 
    default: 'privado' 
  },
  
  contextoChat: {
    type: String,
    enum: ['personal', 'comercial'],
    default: 'personal'
  },
  
  // ══════════════════════════════════════════════════
  // PARTICIPANTES (UUIDs de PostgreSQL)
  // ══════════════════════════════════════════════════
  participantes: [{ 
    type: String  // UUID de PostgreSQL
  }],
  
  usuarioA: { 
    type: String,  // UUID de PostgreSQL
    default: null 
  },
  
  usuarioB: { 
    type: String,  // UUID de PostgreSQL
    default: null 
  },
  
  // ══════════════════════════════════════════════════
  // REFERENCIA A NEGOCIO
  // ══════════════════════════════════════════════════
  negocioId: { 
    type: String,  // UUID de PostgreSQL
    default: null 
  },
  
  // ══════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ══════════════════════════════════════════════════
  isSelfChat: { 
    type: Boolean, 
    default: false 
  },
  
  nombre: { 
    type: String, 
    default: null 
  },
  
  backgroundUrl: { 
    type: String, 
    default: '' 
  },
  
  // ══════════════════════════════════════════════════
  // ESTADOS POR USUARIO
  // ══════════════════════════════════════════════════
  favoritesBy: [{ 
    type: String,  // UUIDs de usuarios
    default: [] 
  }],
  
  pinnedBy: [{ 
    type: String,
    default: [] 
  }],
  
  deletedFor: [{ 
    type: String,
    default: [] 
  }],
  
  archivedFor: [{ 
    type: String,
    default: [] 
  }],
  
  blockedBy: [{ 
    type: String,
    default: [] 
  }],
  
  // ══════════════════════════════════════════════════
  // MENSAJES FIJADOS POR USUARIO
  // ══════════════════════════════════════════════════
  pinsByUser: {
    type: Map,
    of: [{ type: Schema.Types.ObjectId, ref: 'Mensaje' }],
    default: () => new Map()
  },
  
  // ══════════════════════════════════════════════════
  // ÚLTIMO MENSAJE (denormalizado)
  // ══════════════════════════════════════════════════
  ultimoMensaje: { 
    type: String, 
    default: '' 
  },
  
  ultimoMensajeAt: { 
    type: Date, 
    default: null 
  },
  
  // ══════════════════════════════════════════════════
  // CONTADOR DE NO LEÍDOS
  // ══════════════════════════════════════════════════
  unreadCount: {
    type: Map,
    of: Number,
    default: () => new Map()
    // Claves: UUIDs de usuario
    // Valores: número de mensajes no leídos
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Chat', ChatSchema);
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID del documento (MongoDB) |
| `tipo` | String | 'privado' o 'grupo' |
| `contextoChat` | String | 'personal' o 'comercial' |
| `participantes` | [String] | Array de UUIDs de usuarios |
| `usuarioA` | String | UUID del primer participante |
| `usuarioB` | String | UUID del segundo participante |
| `negocioId` | String | UUID del negocio (si aplica) |
| `isSelfChat` | Boolean | Chat consigo mismo (notas) |
| `nombre` | String | Nombre del grupo |
| `backgroundUrl` | String | Fondo personalizado |
| `favoritesBy` | [String] | Usuarios que lo marcaron favorito |
| `pinnedBy` | [String] | Usuarios que lo fijaron |
| `deletedFor` | [String] | Usuarios que lo eliminaron |
| `archivedFor` | [String] | Usuarios que lo archivaron |
| `blockedBy` | [String] | Usuarios que bloquearon |
| `pinsByUser` | Map | Mensajes fijados por usuario |
| `ultimoMensaje` | String | Texto del último mensaje |
| `ultimoMensajeAt` | Date | Fecha del último mensaje |
| `unreadCount` | Map | Mensajes no leídos por usuario |
| `createdAt` | Date | Fecha de creación |
| `updatedAt` | Date | Última actualización |

---

## Colección: mensajes

Almacena el contenido de los mensajes.

### Schema

```typescript
// apps/api/src/db/models/Mensaje.ts
import mongoose from 'mongoose';

// Sub-schema para archivos adjuntos
const ArchivoSchema = new mongoose.Schema({
  name: String,
  filename: String,
  url: String,
  thumbUrl: String,
  mimeType: String,
  size: Number,
  isImage: Boolean,
  isAudio: Boolean,
  duration: Number,  // Duración del audio en segundos
  width: Number,
  height: Number,
  public_id_cloudinary: String,
  url_optimizada: String,
  subido_en: { type: Date, default: Date.now },
  visiblePara: [{ type: String }]  // UUIDs
}, { _id: true });

// Sub-schema para autor en respuestas
const ReplyAutorSchema = new mongoose.Schema({
  _id: { type: String },  // UUID de PostgreSQL
  nickname: String,
  nombre: String
}, { _id: false });

// Sub-schema para respuesta a mensaje
const ReplySchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mensaje' },
  texto: String,
  preview: String,
  autor: ReplyAutorSchema
}, { _id: false });

// Sub-schema para mensaje reenviado
const ForwardSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mensaje' }
}, { _id: false });

// Sub-schema para reacciones
const ReaccionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  usuario: { type: String, required: true },  // UUID de PostgreSQL
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

// Schema principal
const MensajeSchema = new mongoose.Schema({
  // ══════════════════════════════════════════════════
  // REFERENCIAS
  // ══════════════════════════════════════════════════
  chat: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat',
    required: true
  },
  
  emisor: { 
    type: String,  // UUID de PostgreSQL
    required: true
  },
  
  negocioId: { 
    type: String,  // UUID de PostgreSQL (si es mensaje comercial)
    default: null 
  },
  
  // ══════════════════════════════════════════════════
  // CONTENIDO
  // ══════════════════════════════════════════════════
  texto: { 
    type: String 
  },
  
  archivos: [ArchivoSchema],
  
  // ══════════════════════════════════════════════════
  // RESPUESTA Y REENVÍO
  // ══════════════════════════════════════════════════
  replyTo: ReplySchema,
  
  forwardOf: ForwardSchema,
  
  // ══════════════════════════════════════════════════
  // REACCIONES
  // ══════════════════════════════════════════════════
  reacciones: [ReaccionSchema],
  
  // ══════════════════════════════════════════════════
  // ESTADO DE LECTURA
  // ══════════════════════════════════════════════════
  leidoPor: [{ 
    type: String  // UUIDs de usuarios que lo leyeron
  }],
  
  // ══════════════════════════════════════════════════
  // ELIMINACIÓN SELECTIVA
  // ══════════════════════════════════════════════════
  deletedFor: [{ 
    type: String,  // UUIDs de usuarios
    default: [] 
  }],
  
  // ══════════════════════════════════════════════════
  // EDICIÓN
  // ══════════════════════════════════════════════════
  editedAt: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Mensaje', MensajeSchema);
```

### Campos Principales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID del mensaje (MongoDB) |
| `chat` | ObjectId | Referencia al chat |
| `emisor` | String | UUID del usuario que envía |
| `negocioId` | String | UUID del negocio (opcional) |
| `texto` | String | Contenido del mensaje |
| `archivos` | [Archivo] | Archivos adjuntos |
| `replyTo` | Object | Mensaje al que responde |
| `forwardOf` | Object | Mensaje reenviado |
| `reacciones` | [Reaccion] | Emojis de reacción |
| `leidoPor` | [String] | UUIDs que lo leyeron |
| `deletedFor` | [String] | UUIDs que lo eliminaron |
| `editedAt` | Date | Fecha de edición |
| `createdAt` | Date | Fecha de creación |
| `updatedAt` | Date | Última actualización |

### Sub-documento: Archivo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre original |
| `filename` | String | Nombre en servidor |
| `url` | String | URL completa |
| `thumbUrl` | String | Miniatura |
| `mimeType` | String | Tipo MIME |
| `size` | Number | Tamaño en bytes |
| `isImage` | Boolean | ¿Es imagen? |
| `isAudio` | Boolean | ¿Es audio? |
| `duration` | Number | Duración (audio/video) |
| `width` | Number | Ancho (imagen) |
| `height` | Number | Alto (imagen) |
| `public_id_cloudinary` | String | ID en Cloudinary |
| `url_optimizada` | String | URL optimizada |

---

## Colección: contactos

Lista de contactos por usuario.

### Schema

```typescript
// apps/api/src/db/models/Contacto.ts
import mongoose from 'mongoose';

const ContactoSchema = new mongoose.Schema({
  // ══════════════════════════════════════════════════
  // DUEÑO DEL CONTACTO
  // ══════════════════════════════════════════════════
  usuarioId: { 
    type: String,  // UUID de PostgreSQL
    required: true,
    index: true
  },
  
  // ══════════════════════════════════════════════════
  // TIPO DE CONTACTO
  // ══════════════════════════════════════════════════
  tipo: { 
    type: String, 
    enum: ['personal', 'comercial'], 
    required: true 
  },
  
  // ══════════════════════════════════════════════════
  // REFERENCIA AL CONTACTO
  // ══════════════════════════════════════════════════
  // Si tipo="personal" → contactoId tiene valor
  contactoId: { 
    type: String,  // UUID de usuario
    default: null 
  },
  
  // Si tipo="comercial" → negocioId tiene valor
  negocioId: { 
    type: String,  // UUID de negocio
    default: null 
  },
  
  // ══════════════════════════════════════════════════
  // PERSONALIZACIÓN
  // ══════════════════════════════════════════════════
  apodo: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  
  notas: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  
  etiquetas: [{ 
    type: String 
  }],
  
  // ══════════════════════════════════════════════════
  // ESTADOS
  // ══════════════════════════════════════════════════
  favorito: { 
    type: Boolean, 
    default: false 
  },
  
  bloqueado: { 
    type: Boolean, 
    default: false 
  },
  
  // ══════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ══════════════════════════════════════════════════
  totalMensajes: { 
    type: Number, 
    default: 0 
  },
  
  ultimaInteraccion: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Contacto', ContactoSchema);
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID del documento |
| `usuarioId` | String | UUID del dueño |
| `tipo` | String | 'personal' o 'comercial' |
| `contactoId` | String | UUID del contacto (si personal) |
| `negocioId` | String | UUID del negocio (si comercial) |
| `apodo` | String | Nombre personalizado |
| `notas` | String | Notas privadas |
| `etiquetas` | [String] | Etiquetas personalizadas |
| `favorito` | Boolean | Marcado como favorito |
| `bloqueado` | Boolean | Contacto bloqueado |
| `totalMensajes` | Number | Total de mensajes intercambiados |
| `ultimaInteraccion` | Date | Última interacción |

---

## Índices

### Colección: chats

```javascript
ChatSchema.index({ participantes: 1, updatedAt: -1 });
ChatSchema.index({ tipo: 1, participantes: 1 });
ChatSchema.index({ negocioId: 1 });
ChatSchema.index({ blockedBy: 1 });
ChatSchema.index({ archivedFor: 1 });
ChatSchema.index({ pinnedBy: 1 });
```

### Colección: mensajes

```javascript
MensajeSchema.index({ chat: 1, createdAt: -1 });
MensajeSchema.index({ emisor: 1 });
MensajeSchema.index({ negocioId: 1 });
```

### Colección: contactos

```javascript
ContactoSchema.index({ usuarioId: 1, tipo: 1 });
ContactoSchema.index({ usuarioId: 1, contactoId: 1 }, { unique: true, sparse: true });
ContactoSchema.index({ usuarioId: 1, negocioId: 1 }, { unique: true, sparse: true });
ContactoSchema.index({ favorito: 1 });
```

---

## Ejemplos de Queries

### Obtener chats de un usuario

```typescript
// Chats donde el usuario participa, ordenados por último mensaje
const chats = await Chat.find({
  participantes: userId,
  deletedFor: { $ne: userId }
})
.sort({ ultimoMensajeAt: -1 })
.limit(20);
```

### Obtener mensajes de un chat

```typescript
// Mensajes de un chat, con paginación
const mensajes = await Mensaje.find({
  chat: chatId,
  deletedFor: { $ne: userId }
})
.sort({ createdAt: -1 })
.skip(page * limit)
.limit(limit);
```

### Marcar mensajes como leídos

```typescript
// Marcar todos los mensajes de un chat como leídos
await Mensaje.updateMany(
  {
    chat: chatId,
    emisor: { $ne: userId },
    leidoPor: { $ne: userId }
  },
  {
    $addToSet: { leidoPor: userId }
  }
);

// Resetear contador de no leídos
await Chat.findByIdAndUpdate(chatId, {
  $set: { [`unreadCount.${userId}`]: 0 }
});
```

### Buscar contactos

```typescript
// Buscar contactos por nombre o apodo
const contactos = await Contacto.find({
  usuarioId,
  $or: [
    { apodo: { $regex: busqueda, $options: 'i' } }
  ]
});
```

### Crear nuevo chat

```typescript
// Crear chat privado entre dos usuarios
const nuevoChat = await Chat.create({
  tipo: 'privado',
  contextoChat: 'personal',
  participantes: [usuarioAId, usuarioBId],
  usuarioA: usuarioAId,
  usuarioB: usuarioBId
});
```

### Enviar mensaje

```typescript
// Crear mensaje y actualizar chat
const mensaje = await Mensaje.create({
  chat: chatId,
  emisor: userId,
  texto: 'Hola!'
});

await Chat.findByIdAndUpdate(chatId, {
  ultimoMensaje: mensaje.texto,
  ultimoMensajeAt: mensaje.createdAt,
  $inc: { [`unreadCount.${otroUsuarioId}`]: 1 }
});
```

---

## Conexión

```typescript
// apps/api/src/db/mongo.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

export const connectMongo = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando MongoDB:', error);
    process.exit(1);
  }
};
```

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
