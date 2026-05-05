# Sprint 9.2 — Plan de Implementación: Preguntas y Respuestas

**Fecha:** 2026-05-04
**Estado:** COMPLETADO — B1 ✅ B2 ✅ B3 ✅ B4 ✅ B5 ✅ B6 ✅ B7 ✅ B8 ✅ B9 ✅

---

## Resumen ejecutivo

Sistema de Q&A público sobre artículos del MarketPlace. El comprador pregunta, el vendedor responde, y la respuesta queda visible para futuros compradores — reduciendo mensajes repetidos y acelerando la decisión de compra. Sin comentarios libres, sin likes, sin hilos. Una tabla nueva + moderación reutilizada del Sprint 4.

---

## Decisiones técnicas resueltas

| Decisión | Resolución |
|---|---|
| Tabla nueva | Una sola `marketplace_preguntas` con `respuesta` y `respondida_at` inline. Estado inferido: `respuesta IS NULL` → pendiente, `IS NOT NULL` → respondida, `deleted_at IS NOT NULL` → eliminada. Sin tabla separada. |
| Constraint UNIQUE | `(articulo_id, comprador_id)` — una pregunta por usuario por artículo. |
| Moderación preguntas | Solo rechazo duro (`severidad='rechazo'`). Las sugerencias de "parece servicio/búsqueda" no aplican a Q&A de compradores. |
| Moderación respuestas | Igual: solo rechazo duro. |
| `validarTextoPublicacion` con 1 campo | Llamar `validarTextoPublicacion(texto, '')` — el segundo parámetro vacío no activa reglas extra. |
| `derivarPreguntaAChat` | Backend: soft delete de la pregunta + devuelve `{ compradorId, compradorNombre, compradorApellidos, compradorAvatarUrl }`. Frontend: llama `abrirChatTemporal({ id: 'temp_...', otroParticipante: {...}, datosCreacion: { participante2Id, contextoTipo: 'marketplace', contextoReferenciaId: articuloId } })` + `abrirChatYA()`. No hay campo `mensajeInicial` en `ChatTemporal` — el vendedor escribe el mensaje manualmente en el chat. |
| `total_preguntas_respondidas` en feed | LEFT JOIN en `obtenerFeed` y `obtenerTrending`. Sin columna desnormalizada (beta, pocos artículos). |
| `notificaciones.tipo` constraint | **CHECK constraint** (no ENUM Postgres). Confirmado en `schema.ts` línea 1942: `check("notificaciones_tipo_check", sql\`(tipo)::text = ANY ((ARRAY[...])::text[])\`)`. La migración usará DROP CONSTRAINT + ADD CONSTRAINT con lista extendida. |
| Tipos notificación nuevos | `marketplace_nueva_pregunta` + `marketplace_pregunta_respondida`. |
| Prioridad señal en `CardArticulo` | `viendo ≥ 3 → guardados ≥ 5 → preguntas_respondidas ≥ 1 → vistas24h ≥ 20` |
| Visibilidad preguntas | Públicas solo si `respondida_at IS NOT NULL`. Vendedor ve todas (incluyendo pendientes) cuando es dueño del artículo. |
| Eliminación por el vendedor | Vendedor puede hacer soft delete de cualquier pregunta (respondida o no). |
| Eliminación por el comprador | **Comprador SÍ puede retirar su pregunta**, pero SOLO si `respondida_at IS NULL` (sin respuesta aún). Endpoint: `DELETE /preguntas/:id/mia`. |

---

## Puntos confirmados (antes de codear)

| # | Pregunta | Resolución |
|---|---|---|
| 1 | ¿Constraint `notificaciones.tipo` es ENUM Postgres o CHECK de string? | **CHECK constraint** → `DROP CONSTRAINT notificaciones_tipo_check` + `ADD CONSTRAINT` con lista extendida incluyendo los 2 tipos nuevos. |
| 2 | ¿URL de ChatYA para `derivarPreguntaAChat`? | **Resuelto.** Patrón existente: `abrirChatTemporal` + `abrirChatYA()`. No hay ruta navegable ni `mensajeInicial`. Backend devuelve datos del comprador; frontend usa `useChatYAStore.getState().abrirChatTemporal(...)` + `useUiStore.getState().abrirChatYA()`. Ver `BarraContacto.tsx` como referencia exacta. |
| 3 | ¿El comprador puede retirar su pregunta mientras no tenga respuesta? | **Sí.** Agregar endpoint `DELETE /preguntas/:id/mia` con auth del comprador. Condición: `respondida_at IS NULL`; si ya tiene respuesta → 409. |

---

## Bloques de implementación

### Bloque 1 ✅ — Migración SQL + schema Drizzle + tipos notificación

**Archivos:** migración SQL nueva, `apps/api/src/db/schemas/schema.ts`, `apps/api/src/types/notificaciones.types.ts`

**Tabla `marketplace_preguntas`:**
```sql
CREATE TABLE marketplace_preguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES articulos_marketplace(id) ON DELETE CASCADE,
  comprador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pregunta VARCHAR(200) NOT NULL,
  respuesta VARCHAR(500),
  respondida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT preguntas_unique_comprador UNIQUE (articulo_id, comprador_id)
);

CREATE INDEX idx_preguntas_articulo
  ON marketplace_preguntas(articulo_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_preguntas_respondidas
  ON marketplace_preguntas(articulo_id, respondida_at)
  WHERE respondida_at IS NOT NULL AND deleted_at IS NULL;
```

**Tipos notificación nuevos:** `marketplace_nueva_pregunta`, `marketplace_pregunta_respondida`

Patrón exacto para la migración (CHECK constraint, no ENUM):
```sql
-- Leer primero el nombre exacto del constraint con:
-- SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_name = 'notificaciones' AND constraint_type = 'CHECK';

ALTER TABLE notificaciones DROP CONSTRAINT notificaciones_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo::text = ANY (ARRAY[
    -- ... todos los tipos existentes ...,
    'marketplace_nueva_pregunta',
    'marketplace_pregunta_respondida'
  ]::text[]));
```

**Schema Drizzle:** agregar `marketplacePreguntas` con los mismos campos. Actualizar `check()` en la tabla `notificaciones`.

---

### Bloque 2 ✅ — Service `apps/api/src/services/marketplace/preguntas.ts`

**7 funciones:**

| Función | Lógica clave |
|---|---|
| `crearPregunta(articuloId, compradorId, texto)` | Verifica comprador ≠ dueño (404 si artículo no existe, 403 si es dueño, 409 si ya preguntó) + moderación rechazo + INSERT + notificación `marketplace_nueva_pregunta` al vendedor |
| `obtenerPreguntasPublicas(articuloId)` | `WHERE respondida_at IS NOT NULL AND deleted_at IS NULL ORDER BY respondida_at DESC`. Nombre comprador: `nombre + inicial apellido` (ej: "María R.") |
| `obtenerPreguntasParaVendedor(articuloId, vendedorId)` | Verifica que `vendedorId` es dueño del artículo + devuelve pendientes (`respuesta IS NULL`) + respondidas, sin eliminadas. Dos arrays separados en la respuesta. |
| `responderPregunta(preguntaId, vendedorId, respuesta)` | Verifica dueño por JOIN con `articulos_marketplace` + verifica que pregunta no tiene respuesta (409 si ya respondió) + moderación rechazo + UPDATE `respuesta + respondida_at = NOW()` + notificación `marketplace_pregunta_respondida` al comprador |
| `eliminarPregunta(preguntaId, vendedorId)` | Verifica dueño + soft delete (`deleted_at = NOW()`) |
| `eliminarPreguntaComprador(preguntaId, compradorId)` | Verifica que `comprador_id = compradorId` (403 si no) + verifica `respondida_at IS NULL` (409 si ya respondida) + soft delete |
| `derivarPreguntaAChat(preguntaId, vendedorId)` | Verifica dueño + soft delete + devuelve `{ compradorId, compradorNombre, compradorApellidos, compradorAvatarUrl, articuloId }` para que el frontend abra ChatYA con `abrirChatTemporal` |

---

### Bloque 3 ✅ — Controller + Routes + validaciones Zod

**Validaciones Zod:**
- `crearPreguntaSchema`: `{ pregunta: z.string().min(10).max(200) }`
- `responderPreguntaSchema`: `{ respuesta: z.string().min(5).max(500) }`

**Endpoints y orden en el router:**

| Método | Ruta | Auth | Nota |
|---|---|---|---|
| `GET` | `/articulos/:id/preguntas` | `verificarTokenOpcional` | Declarar ANTES de `/articulos/:id` para evitar conflicto Express |
| `POST` | `/articulos/:id/preguntas` | `verificarToken + requiereModoPersonal` | |
| `POST` | `/preguntas/:id/responder` | `verificarToken + requiereModoPersonal` | |
| `POST` | `/preguntas/:id/derivar-a-chat` | `verificarToken + requiereModoPersonal` | |
| `DELETE` | `/preguntas/:id` | `verificarToken + requiereModoPersonal` | Solo vendedor |
| `DELETE` | `/preguntas/:id/mia` | `verificarToken + requiereModoPersonal` | Solo comprador, solo si sin respuesta |

**Controller `GET /articulos/:id/preguntas`:** detecta si el caller es el dueño del artículo y llama a `obtenerPreguntasPublicas` o `obtenerPreguntasParaVendedor` según corresponda.

---

### Bloque 4 — Backend: extender feed y trending con `totalPreguntasRespondidas`

**Archivo:** `apps/api/src/services/marketplace.service.ts`

LEFT JOIN en `obtenerFeed` (recientes + cercanos) y `obtenerTrending`:
```sql
LEFT JOIN (
    SELECT articulo_id, COUNT(*)::int AS total
    FROM marketplace_preguntas
    WHERE respondida_at IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY articulo_id
) pq ON pq.articulo_id = a.id
```

`ArticuloFeedRow` extendida con `totalPreguntasRespondidas: number` (default 0).

---

### Bloque 5 — Tipos + hooks React Query frontend

**`apps/web/src/types/marketplace.ts` — nuevo tipo:**
```typescript
export interface PreguntaMarketplace {
    id: string;
    compradorNombre: string;
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    createdAt: string;
}

export interface PreguntasParaVendedor {
    pendientes: PreguntaMarketplace[];
    respondidas: PreguntaMarketplace[];
}
```

`ArticuloFeed` extendida con `totalPreguntasRespondidas?: number`.

**Hooks en `useMarketplace.ts`:**

| Hook / Mutation | staleTime | Invalida |
|---|---|---|
| `usePreguntasArticulo(articuloId, esDueno)` | 1 min | — |
| `useCrearPregunta()` | — | `preguntas(articuloId)` |
| `useResponderPregunta()` | — | `preguntas(articuloId)` |
| `useEliminarPregunta()` | — | `preguntas(articuloId)` |
| `useEliminarPreguntaMia()` | — | `preguntas(articuloId)` |
| `useDerivarPreguntaAChat()` | — | `preguntas(articuloId)`, abre ChatYA |

**`queryKeys.ts`:** clave `preguntas(articuloId)`.

---

### Bloque 6 — `SeccionPreguntas.tsx`

**Archivo:** `apps/web/src/components/marketplace/SeccionPreguntas.tsx`

Se monta en `PaginaArticuloMarketplace.tsx` debajo de `MapaUbicacion`.

**Props:**
```typescript
interface SeccionPreguntasProps {
    articuloId: string;
    esDueno: boolean;
}
```

**Vista visitante (no es dueño):**
- Título: "Preguntas sobre este artículo ({n})"
- Lista de preguntas respondidas: `Q:` + texto pregunta, `R:` + texto respuesta, nombre comprador + tiempo relativo
- Si sin preguntas respondidas: "Sé el primero en preguntar"
- Botón "Hacer una pregunta" → `ModalHacerPregunta`
- Si visitante no autenticado → `ModalAuthRequerido`

**Vista dueño:**
- Título: "Preguntas sobre tu artículo ({total})"
- Sección "Pendientes de responder (n)" — visible solo si n > 0:
  - Cada pregunta con botones `[Responder]` `[Por chat]` `[Eliminar]`
  - `[Responder]` abre modal inline de respuesta
  - `[Por chat]` llama `useDerivarPreguntaAChat` → backend devuelve datos del comprador → frontend abre ChatYA con `abrirChatTemporal` + `abrirChatYA`
  - `[Eliminar]` llama `useEliminarPregunta` con confirmación
- Sección "Respondidas (n)":
  - Misma estructura que vista visitante + `[Eliminar]`
- Si no hay preguntas: "Aún no hay preguntas sobre este artículo"

**Reglas visuales:**
- Cada pregunta: bloque con `border-b border-slate-200 py-3`
- Pregunta: `text-sm font-semibold text-slate-900`
- Respuesta: `text-sm text-slate-600`
- Nombre + tiempo: `text-xs text-slate-400`
- Botones de acción dueño: `text-xs`, inline, separados por `·`
- Sin emojis — iconos Lucide: `MessageCircle`, `Clock`, `CheckCircle2`, `Trash2`, `MessageSquare`

---

### Bloque 7 — `ModalHacerPregunta.tsx`

**Archivo:** `apps/web/src/components/marketplace/ModalHacerPregunta.tsx`

- Usa `ModalAdaptativo` con `ancho='md'`
- Aviso superior: *"Tu pregunta será visible para todos. Si es algo personal, mejor envía un mensaje al vendedor."*
- `Textarea` con `maxLength={200}` + contador `{n}/200`
- Validación frontend: mínimo 10 caracteres antes de habilitar el botón
- Error 422 (rechazo moderación): `notificar.error` con el mensaje de la categoría detectada
- Error 409 (ya preguntaste): `notificar.info('Ya tienes una pregunta en esta publicación')`
- `data-testid="modal-hacer-pregunta"`, `data-testid="textarea-pregunta"`, `data-testid="btn-enviar-pregunta"`

---

### Bloque 8 — Modal responder + integración ChatYA

**Integrado en `SeccionPreguntas.tsx`** como estado local (no componente separado):

```typescript
const [preguntaRespondiendo, setPreguntaRespondiendo] = useState<PreguntaMarketplace | null>(null);
```

Modal inline con `ModalAdaptativo centrado`:
- Pregunta original arriba: gris pequeño, no editable
- `Textarea` respuesta + contador `{n}/500`
- Mínimo 5 caracteres
- Misma gestión de errores 422

**Integración `derivarPreguntaAChat`:**

Backend devuelve: `{ compradorId, compradorNombre, compradorApellidos, compradorAvatarUrl, articuloId }`

Frontend en `onSuccess`:
```typescript
const abrirChatTemporal = useChatYAStore.getState().abrirChatTemporal;
const abrirChatYA = useUiStore.getState().abrirChatYA;
abrirChatTemporal({
    id: `temp_pregunta_${preguntaId}_${Date.now()}`,
    otroParticipante: {
        id: compradorId,
        nombre: compradorNombre,
        apellidos: compradorApellidos,
        avatarUrl: compradorAvatarUrl,
    },
    datosCreacion: {
        participante2Id: compradorId,
        participante2Modo: 'personal',
        contextoTipo: 'marketplace',
        contextoReferenciaId: articuloId,
    },
});
abrirChatYA();
```

Ver `BarraContacto.tsx:63` como referencia exacta del mismo patrón.

---

### Bloque 9 — Indicador en `CardArticulo` + `obtenerTrending`

**`CardArticulo.tsx`** — insertar entre prioridad 2 y prioridad 3 del `senalActividad`:
```typescript
if ((articulo.totalPreguntasRespondidas ?? 0) >= 1) {
    return {
        icono: <MessageCircle className="h-3 w-3 shrink-0" strokeWidth={2} />,
        texto: `${articulo.totalPreguntasRespondidas} pregunta${n > 1 ? 's' : ''} respondida${n > 1 ? 's' : ''}`,
    };
}
```

**Orden final de prioridad:**
1. `viendo ≥ 3` → "X personas viendo ahora"
2. `totalGuardados ≥ 5` → "X personas lo guardaron"
3. `totalPreguntasRespondidas ≥ 1` → "X pregunta/s respondida/s"
4. `vistas24h ≥ 20` → "Visto X veces hoy"

---

## Archivos a crear/modificar

| Archivo | Tipo | Cambio |
|---|---|---|
| `docs/migraciones/2026-05-04-marketplace-preguntas.sql` | nuevo | tabla + índices + tipos notificación (DROP/ADD CHECK constraint) |
| `apps/api/src/db/schemas/schema.ts` | modificar | `marketplacePreguntas` + actualizar `check()` en `notificaciones` |
| `apps/api/src/types/notificaciones.types.ts` | modificar | 2 tipos nuevos |
| `apps/api/src/services/marketplace/preguntas.ts` | nuevo | 7 funciones (incluye `eliminarPreguntaComprador`) |
| `apps/api/src/services/marketplace.service.ts` | modificar | LEFT JOIN `totalPreguntasRespondidas` en feed y trending |
| `apps/api/src/validations/marketplace.schema.ts` | modificar | `crearPreguntaSchema`, `responderPreguntaSchema` |
| `apps/api/src/controllers/marketplace.controller.ts` | modificar | 6 controllers nuevos |
| `apps/api/src/routes/marketplace.routes.ts` | modificar | 6 rutas nuevas |
| `apps/web/src/types/marketplace.ts` | modificar | `PreguntaMarketplace`, `PreguntasParaVendedor`, extender `ArticuloFeed` |
| `apps/web/src/config/queryKeys.ts` | modificar | clave `preguntas` |
| `apps/web/src/hooks/queries/useMarketplace.ts` | modificar | 6 hooks/mutations nuevos |
| `apps/web/src/components/marketplace/SeccionPreguntas.tsx` | nuevo | completo (visitante + dueño) |
| `apps/web/src/components/marketplace/ModalHacerPregunta.tsx` | nuevo | completo |
| `apps/web/src/components/marketplace/CardArticulo.tsx` | modificar | prioridad 3 en `senalActividad` |
| `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx` | modificar | montar `SeccionPreguntas` |

---

## Confirmación pendiente

| # | Confirmación requerida | Estado |
|---|---|---|
| 1 | ¿Arranco el **Bloque 3** (controller + routes + validaciones Zod)? | ⏳ Esperando |

---

## Orden de implementación

```
B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9
```

Esperar confirmación entre cada bloque.

---

## Riesgos y consideraciones

| Riesgo | Mitigación |
|---|---|
| `notificaciones.tipo` CHECK constraint — necesita nombre exacto antes de DROP | Verificar nombre real del constraint al momento de ejecutar la migración: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'notificaciones' AND constraint_type = 'CHECK'`. |
| Sin preguntas en BD test — indicador en card nunca aparece | Crear seed de preguntas de prueba después de B1. |
| `derivarPreguntaAChat` — no hay mensaje precargado | Aceptado. El vendedor ve el chat abierto con el comprador y escribe manualmente. Agregar `mensajeInicial` a `ChatTemporal` sería trabajo del equipo de ChatYA, fuera del scope de este sprint. |
| LEFT JOIN de preguntas en el feed puede ser lento si hay muchas preguntas | Aceptable en beta. Agregar al plan de optimización post-lanzamiento. |
| Comprador elimina pregunta — solo si sin respuesta | Condición en backend: `respondida_at IS NULL`; 409 si ya tiene respuesta. |
