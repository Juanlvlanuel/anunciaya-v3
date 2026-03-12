# Reporte Tecnico: Backend ChatYA

**Fecha:** 2026-03-10
**Modulo:** ChatYA (Chat 1:1 en tiempo real)
**Stack:** Express + PostgreSQL + Drizzle ORM + Socket.io + Cloudflare R2
**Archivos analizados:** 9 archivos core (~3,200 lineas)

---

## Archivos Revisados

| Archivo | Lineas | Rol |
|---------|--------|-----|
| `services/chatya.service.ts` | ~3,057 | Logica de negocio completa |
| `controllers/chatya.controller.ts` | ~1,170 | Endpoints HTTP |
| `routes/chatya.routes.ts` | ~240 | Definicion de rutas |
| `types/chatya.types.ts` | ~286 | Tipos TypeScript |
| `socket.ts` | ~174 | WebSocket (Socket.io) |
| `db/schemas/schema.ts` | ~200 (chat) | Tablas PostgreSQL |
| `db/schemas/relations.ts` | ~120 (chat) | Relaciones Drizzle |
| `middleware/auth.ts` | ~208 | Auth dual AnunciaYA/ScanYA |
| `cron/chatya.cron.ts` | ~119 | Limpieza programada |
| `utils/jwtScanYA.ts` | ~177 | JWT tokens ScanYA |

---

## CRITICO

### C1. SQL Injection en busqueda de mensajes (ILIKE sin escape)

**Archivo:** `services/chatya.service.ts:2310`
**Funcion:** `buscarMensajes()`

```ts
const patron = `%${input.texto.trim()}%`;
// ...
sql`${chatMensajes.contenido} ILIKE ${patron}`,
```

Drizzle parametriza el valor, asi que **no hay SQL injection directa**. Sin embargo, los caracteres especiales de LIKE (`%`, `_`, `\`) dentro del texto del usuario NO se escapan. Un usuario puede buscar `%` y hacer match con TODOS los mensajes de texto, causando un full table scan. Lo mismo aplica a `buscarPersonas()` (linea 2447) y `buscarNegocios()` (linea 2515).

**Impacto:** Performance degradada por busquedas wildcard; no es una vulnerabilidad de inyeccion SQL pero si un vector de abuso.
**Fix:** Escapar `%`, `_` y `\` antes de interpolar en el patron ILIKE:
```ts
const escaped = input.texto.trim().replace(/[%_\\]/g, '\\$&');
const patron = `%${escaped}%`;
```

---

### C2. Socket.io sin autenticacion — cualquier websocket puede suplantar un usuario

**Archivo:** `socket.ts:39-49`

```ts
socket.on('unirse', (usuarioId: string) => {
  if (usuarioId) {
    socket.join(`usuario:${usuarioId}`);
    socket.data.usuarioId = usuarioId;
    socket.broadcast.emit('chatya:estado-usuario', {
      usuarioId, estado: 'conectado',
    });
  }
});
```

**Problema:** No hay verificacion de token en la conexion WebSocket. Cualquiera que conozca un UUID de usuario puede:
1. Conectarse al socket sin autenticacion
2. Emitir `unirse` con cualquier `usuarioId`
3. Unirse a la room de otro usuario y **recibir todos sus mensajes en tiempo real**
4. Emitir `chatya:estado` con cualquier userId para falsificar estados
5. Emitir `chatya:entregado` con mensajeIds arbitrarios para marcar entrega falsa

**Impacto:** Lectura no autorizada de mensajes en tiempo real, suplantacion de identidad.

**Fix:** Validar el JWT en el middleware de conexion de Socket.io:
```ts
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const resultado = verificarAccessToken(token);
  if (!resultado.valido) return next(new Error('Token invalido'));
  socket.data.usuarioId = resultado.payload.usuarioId;
  next();
});
```
Y en el evento `unirse`, verificar que `usuarioId === socket.data.usuarioId`.

---

### C3. Evento `chatya:estado` permite spoofear estado de cualquier usuario

**Archivo:** `socket.ts:115-120`

```ts
socket.on('chatya:estado', (data: { usuarioId: string; estado: string }) => {
  socket.broadcast.emit('chatya:estado-usuario', {
    usuarioId: data.usuarioId,
    estado: data.estado,
  });
});
```

**Problema:** No valida que `data.usuarioId === socket.data.usuarioId`. Cualquier socket conectado puede emitir estado "conectado" o "desconectado" para cualquier usuario. Ademas, hace `broadcast.emit` a TODOS los clientes conectados — en una app con miles de usuarios esto seria un flood innecesario.

**Impacto:** Spoofing de presencia + broadcast masivo innecesario.

**Fix:** Validar identidad y emitir solo a rooms relevantes:
```ts
socket.on('chatya:estado', (data: { estado: string }) => {
  const uid = socket.data.usuarioId;
  if (!uid) return;
  socket.broadcast.emit('chatya:estado-usuario', { usuarioId: uid, estado: data.estado });
});
```

---

### C4. `chatya:estado-usuario` se emite con broadcast a TODOS los clientes

**Archivo:** `socket.ts:45-48, 115-120, 134-137`

Los eventos `chatya:estado-usuario` usan `socket.broadcast.emit()` que envia a **todos** los sockets conectados, no solo a los que tienen conversacion con ese usuario. En una app con 10,000 usuarios conectados, cada conexion/desconexion genera 10,000 mensajes.

**Impacto:** O(N) mensajes por cada evento de presencia. Escala cuadraticamente con usuarios concurrentes.

**Fix:** Emitir solo a usuarios con conversacion activa, o mantener un set de "observadores" por usuario.

---

## IMPORTANTE

### I1. N+1 queries en `listarConversaciones` — problema de performance critico

**Archivo:** `services/chatya.service.ts:290-335`

```ts
const items = await Promise.all(
  conversaciones.map(async (conv) => {
    const otroParticipante = await obtenerDatosParticipante(...); // 1-4 queries por conv
    const contextoNombre = await resolverContextoNombre(...);     // 0-1 query por conv
    // ...
  })
);
```

`obtenerDatosParticipante()` hace:
1. Query usuario (siempre)
2. Query negocio (si modo=comercial)
3. Query sucursal (si tiene sucursalId)
4. Query count sucursales (si tiene sucursalId)

Para una lista de 20 conversaciones: **20-100 queries adicionales** por request.

**Impacto:** Latencia de 200-500ms+ en listar conversaciones. Se ejecuta frecuentemente (cada vez que el usuario abre ChatYA o cambia de pestaña).

**Fix:** Extraer todos los IDs unicos primero, hacer queries batch, luego mapear en memoria.

---

### I2. N+1 queries en `listarContactos` — mismo patron

**Archivo:** `services/chatya.service.ts:1586-1653`

Para cada contacto comercial hace: query negocio + query sucursal + query count sucursales = **3 queries por contacto**. Con 50 contactos = 150 queries.

**Fix:** Mismo enfoque: batch queries previas.

---

### I3. Race condition en `crearObtenerConversacion`

**Archivo:** `services/chatya.service.ts:444-493`

Si dos usuarios crean la misma conversacion simultaneamente:
1. Ambos hacen SELECT y no encuentran nada
2. Ambos hacen INSERT
3. Se crean 2 conversaciones duplicadas

**No hay unique constraint** a nivel de BD que prevenga duplicados. La tabla `chat_conversaciones` no tiene un constraint UNIQUE sobre la combinacion (p1Id, p2Id, p1Modo, p2Modo, p1SucursalId, p2SucursalId).

**Impacto:** Conversaciones duplicadas que confunden al usuario.

**Fix:** Agregar unique constraint parcial o usar `INSERT ... ON CONFLICT` con advisory locks.

---

### I4. `contarTotalNoLeidos` hace 2 queries separadas en vez de 1

**Archivo:** `services/chatya.service.ts:2413-2421`

```ts
const [resultP1] = await db.select({ total: sql`COALESCE(SUM(no_leidos_p1), 0)::int` })...
const [resultP2] = await db.select({ total: sql`COALESCE(SUM(no_leidos_p2), 0)::int` })...
```

Son 2 queries que podrian ser 1:
```sql
SELECT
  COALESCE(SUM(CASE WHEN participante1_id = $1 ... THEN no_leidos_p1 ELSE 0 END), 0) +
  COALESCE(SUM(CASE WHEN participante2_id = $1 ... THEN no_leidos_p2 ELSE 0 END), 0)
FROM chat_conversaciones
WHERE ...
```

**Impacto:** El badge de no leidos se consulta frecuentemente (polling o al abrir la app). 2x queries innecesarias.

---

### I5. Cron job elimina conversaciones una por una en un loop

**Archivo:** `cron/chatya.cron.ts:54-68`

```ts
for (const conv of inactivas) {
  await db.delete(chatConversaciones).where(eq(chatConversaciones.id, conv.id));
}
```

Si hay 1,000 conversaciones inactivas, hace 1,000 queries DELETE individuales. Deberia ser un solo DELETE batch:

```ts
const ids = inactivas.map(c => c.id);
await db.delete(chatConversaciones).where(sql`${chatConversaciones.id} IN ${ids}`);
```

**Nota:** El loop individual tiene sentido si se necesita limpiar R2 antes (TODO comentado), pero hasta que se implemente esa limpieza, es waste.

---

### I6. No hay rate limiting en endpoints sensibles

**Archivo:** `routes/chatya.routes.ts`

Los endpoints de envio de mensajes (`POST /mensajes`), upload de archivos, busqueda de personas y negocios no tienen rate limiting. Un usuario malicioso puede:
- Enviar miles de mensajes por segundo
- Generar miles de presigned URLs
- Hacer busquedas ILIKE masivas (ver C1)

**Fix:** Agregar middleware de rate limiting (ej: `express-rate-limit`) al menos en:
- `POST /conversaciones/:id/mensajes` — max 30/min
- `POST /upload-*` — max 10/min
- `GET /buscar-personas` y `GET /buscar-negocios` — max 20/min

---

### I7. Upload de imagen no valida tamano

**Archivo:** `services/chatya.service.ts:2633-2688`

`generarUrlUploadImagenChat()` valida contentType pero **no valida tamano del archivo**. A diferencia de documentos (25MB) y audio (5MB) que si validan, las imagenes no tienen limite de tamano. Un usuario puede solicitar una presigned URL y subir una imagen de 500MB+.

**Fix:** Agregar parametro `tamano` y validacion como en los otros uploads.

---

### I8. `eliminarConversacion` tiene ventana para mensajes huerfanos

**Archivo:** `services/chatya.service.ts:748-766`

La logica de limpieza de mensajes huerfanos compara timestamps de visibilidad, pero entre el `UPDATE eliminada=true` y el `DELETE mensajes`, un nuevo mensaje puede llegar (enviado por el otro participante). Ese mensaje quedaria huerfano.

Ademas, la linea 754 compara strings ISO como `<` (comparacion lexicografica) en vez de fechas:
```ts
const corte = convParaLimpieza.miVisibleDesde < convParaLimpieza.otroVisibleDesde
```
Funciona correctamente con ISO 8601 porque es ordenable lexicograficamente, pero es fragil — un formato diferente romperia la logica.

---

### I9. Permiso `responderChat` de ScanYA no se verifica

**Archivo:** `middleware/auth.ts:179-204`

El middleware `verificarTokenChatYA` acepta tokens de ScanYA y verifica que tenga `negocioUsuarioId`, pero **nunca verifica** el permiso `responderChat` del payload ScanYA. Un empleado sin permiso de chat podria acceder a todas las funciones de ChatYA.

```ts
// Falta:
if (!sy.permisos?.responderChat) {
  res.status(403).json({ success: false, message: 'No tienes permiso para usar ChatYA' });
  return;
}
```

---

### I10. `enviarMensaje` restaura conversacion eliminada sin consentimiento

**Archivo:** `services/chatya.service.ts:1039-1049`

```ts
if (pos === 'p1' && conv.eliminadaPorP2) {
  await db.update(chatConversaciones)
    .set({ eliminadaPorP2: false })
    .where(eq(chatConversaciones.id, input.conversacionId));
}
```

Si un usuario elimina una conversacion y el otro le envia un mensaje, la conversacion se restaura automaticamente para el que la elimino. Esto podria no ser el comportamiento deseado — el usuario elimino explicitamente esa conversacion.

**Alternativa:** Solo restaurar la visibilidad cuando el usuario eliminado abra la conversacion, no cuando reciba un mensaje.

---

## MENOR

### M1. Codigo preview de tipo de mensaje repetido 3 veces

**Archivo:** `services/chatya.service.ts:208-216, 1318-1327, 1372-1380`

La logica de generar texto preview ("Imagen", "Audio", etc.) esta copy-pasted en 3 lugares: `actualizarPreview()`, `eliminarMensaje()` (recalculo preview), y el payload socket del delete. Si se agrega un nuevo tipo de mensaje, hay que actualizarlo en 3 lugares.

**Fix:** Extraer a un helper `generarTextoPreview(tipo, contenido)`.

---

### M2. `select()` sin columnas especificas en queries frecuentes

**Archivo:** `services/chatya.service.ts` (multiples)

Varias queries hacen `select()` sin especificar columnas (ej: lineas 275, 362, 632, 807, 971, etc.), lo que trae **todas** las columnas de la tabla. En `chatConversaciones` son 25+ columnas cuando muchas veces solo se necesitan 2-3.

**Impacto menor** porque son queries por ID con LIMIT 1, pero en `listarConversaciones` (linea 275) trae 25 columnas x 20-50 filas innecesariamente.

---

### M3. `buscarMensajes` usa ILIKE en vez de full-text search

**Archivo:** `services/chatya.service.ts:2321`

```ts
sql`${chatMensajes.contenido} ILIKE ${patron}`
```

ILIKE con wildcards `%texto%` no puede usar indices, resultando en sequential scan. Para conversaciones con miles de mensajes, esto sera lento.

**Fix futuro:** Usar `tsvector`/`tsquery` de PostgreSQL con indice GIN para full-text search. Esto mejoraria dramticamente la performance y calidad de busqueda (stemming, ranking, etc.).

---

### M4. Cron scheduler usa `setTimeout` + `setInterval` en vez de biblioteca

**Archivo:** `cron/chatya.cron.ts:112-118`

El scheduler casero con `setTimeout` -> `setInterval(24h)` tiene drift: si la funcion tarda 30 segundos, el proximo dia ejecutara a las 3:00:30, y asi acumulativamente. Ademas, si el proceso se reinicia, pierde la referencia temporal.

**Fix:** Usar `node-cron` o `cron` de npm que recalcula el proximo tick correctamente.

---

### M5. Falta indice para busqueda ILIKE en `buscarPersonas`

**Archivo:** `services/chatya.service.ts:2449-2472`

La query `buscarPersonas` hace ILIKE sobre `nombre`, `apellidos` y `alias`. Sin indice `pg_trgm` (trigram), esto es un sequential scan sobre toda la tabla `usuarios`.

**Fix:** Crear indices GIN con `pg_trgm` en las columnas de busqueda:
```sql
CREATE INDEX idx_usuarios_nombre_trgm ON usuarios USING gin (nombre gin_trgm_ops);
CREATE INDEX idx_usuarios_apellidos_trgm ON usuarios USING gin (apellidos gin_trgm_ops);
```

---

### M6. `emitirEvento` hace broadcast global

**Archivo:** `socket.ts:149-155`

```ts
export function emitirEvento(evento: string, datos: unknown): void {
  io.emit(evento, datos);
}
```

Esta funcion emite a **todos** los sockets. No se usa actualmente en ChatYA (se usa `emitirAUsuario`), pero existe como API publica. Si alguien la usa accidentalmente para un evento de chat, filtraria datos a todos los usuarios.

---

### M7. Error silencioso en `eliminarContacto`

**Archivo:** `services/chatya.service.ts:1743-1761`

```ts
export async function eliminarContacto(contactoId: string, usuarioId: string) {
  await db.delete(chatContactos).where(
    and(eq(chatContactos.id, contactoId), eq(chatContactos.usuarioId, usuarioId))
  );
  return { success: true, message: 'Contacto eliminado' };
}
```

No verifica si el DELETE afecto alguna fila. Si el `contactoId` no existe o no pertenece al usuario, retorna `success: true` igualmente.

---

### M8. `desbloquearUsuario` mismo problema que M7

**Archivo:** `services/chatya.service.ts:1887-1906`

El DELETE no verifica filas afectadas, retorna `success: true` aunque no haya desbloqueado nada.

---

### M9. `obtenerReacciones` no verifica acceso a la conversacion del mensaje

**Archivo:** `services/chatya.service.ts:2047-2085`

La funcion recibe `_usuarioId` (con underscore, no lo usa). Cualquier usuario autenticado puede obtener las reacciones de cualquier mensaje sin verificar que sea participante de esa conversacion.

**Fix:** Verificar que el mensaje pertenece a una conversacion donde el usuario es participante.

---

### M10. `listarMensajesFijados` puede mostrar mensajes eliminados (soft delete)

**Archivo:** `services/chatya.service.ts:2247-2261`

El JOIN con `chatMensajes` no filtra por `eliminado = false`. Si un mensaje fue eliminado despues de ser fijado (la fila de fijados se borra en `eliminarMensaje`, pero puede haber timing issues), podria aparecer un mensaje eliminado en la lista de fijados.

---

### M11. Falta validacion de UUID en parametros de ruta

**Archivo:** `controllers/chatya.controller.ts` (multiples)

Los parametros `:id`, `:convId`, `:msgId` no validan que sean UUIDs validos antes de pasarlos al service. Un request con `GET /api/chatya/conversaciones/not-a-uuid` generaria un error de PostgreSQL en vez de un 400 limpio.

**Fix:** Agregar middleware de validacion de UUID o usar Zod/Joi en los parametros.

---

### M12. Falta `try/catch` en 2 controllers de archivos compartidos

**Archivo:** `controllers/chatya.controller.ts:1137-1170`

`listarArchivosCompartidosController` y `contarArchivosCompartidosController` no tienen `try/catch`, a diferencia de todos los demas controllers. Si el service lanza una excepcion, Express devolvera un 500 generico sin el formato consistente `{ success: false, message: '...' }`.

---

## Resumen de Severidad

| Severidad | Cantidad | IDs |
|-----------|----------|-----|
| **Critico** | 4 | C1, C2, C3, C4 |
| **Importante** | 10 | I1-I10 |
| **Menor** | 12 | M1-M12 |

## Top 5 Acciones Prioritarias

1. **Autenticar Socket.io con JWT** (C2, C3, C4) — la vulnerabilidad mas grave. Sin esto, cualquier persona puede leer mensajes ajenos.
2. **Agregar rate limiting** (I6) — proteger contra abuso masivo de endpoints.
3. **Verificar permiso `responderChat`** (I9) — un fix de 3 lineas que cierra un agujero de permisos.
4. **Resolver N+1 en `listarConversaciones`** (I1) — el mayor impacto en UX percibido por los usuarios.
5. **Agregar unique constraint para conversaciones** (I3) — prevenir datos corruptos.
