# Checklist de pruebas E2E — Home / Coyo

> **Propósito:** validar que las features del Home / Coyo (Fase 1 + Fase 2)
> funcionan end-to-end antes de considerar el módulo "listo para beta".
>
> **Cómo usarlo:** marca cada ítem con `[x]` conforme lo pruebes. Si algo
> falla, anótalo abajo del bloque correspondiente con la fecha y un comentario.
>
> **Documentos relacionados:**
> - Arquitectura: `docs/arquitectura/Home_Coyo.md`
> - Visión: `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4

---

## 0. Setup previo

Antes de empezar, asegúrate de tener todo lo siguiente.

### 0.1 Base de datos

- [ ] Las 3 migraciones SQL del Home Fase 2 aplicadas en **local** (`anunciaya-dev` en Supabase):
  - [ ] `2026-06-01-respuestas-interes-resuelta.sql`
  - [ ] `2026-06-01-notificaciones-coyo-comunidad.sql`
  - [ ] `2026-06-01-notif-pregunta-seguida.sql`
- [ ] Las mismas 3 migraciones aplicadas en **producción** (`anunciaya` en Supabase) — si vas a probar contra prod.

**Verificación rápida:**

```sql
-- Las 3 tablas deben existir:
SELECT to_regclass('public.preguntas_comunidad') IS NOT NULL AS preguntas_ok,
       to_regclass('public.respuestas_preguntas_comunidad') IS NOT NULL AS respuestas_ok,
       to_regclass('public.preguntas_interesados') IS NOT NULL AS interesados_ok;

-- Los 3 tipos de notificación deben estar permitidos:
SELECT pg_get_constraintdef(oid) LIKE '%pregunta_comunidad_respondida%' AS r,
       pg_get_constraintdef(oid) LIKE '%pregunta_comunidad_seguida_respondida%' AS s,
       pg_get_constraintdef(oid) LIKE '%coyo_recomendacion%' AS c
FROM pg_constraint WHERE conname='notificaciones_tipo_check';
```

Todo debe devolver `t`.

### 0.2 Variables de entorno

- [ ] `GEMINI_API_KEY` definida en `apps/api/.env` (sin esta, Coyo cae a `sin_respuesta` en cada pregunta).
- [ ] `DATABASE_URL` apuntando al ambiente que vas a probar.
- [ ] `REDIS_URL` válida (Upstash).

### 0.3 Datos de prueba

- [ ] Al menos **2 usuarios** con cuenta personal en la ciudad de prueba:
  - Usuario A → será el **autor** de las preguntas.
  - Usuario B → será el **vecino** que responde y marca interés.
- [ ] Al menos **1 ciudad** con datos reales: negocios, ofertas, artículos de MarketPlace, servicios. Sin esto Coyo siempre cae en "no encontré" / `sin_respuesta`.
- [ ] Idealmente: **1 negocio con sucursales** (matriz + 1 sucursal en la misma ciudad) para probar el subtítulo "Sucursal X · Ciudad".

### 0.4 Servidores

- [ ] `pnpm dev` corriendo (API + Web) sin errores en consola.
- [ ] Abrir el Home desde 2 navegadores distintos (o uno normal + uno incógnito) — para probar simultáneamente Usuario A y Usuario B.

---

## 1. Hero "Coyo te habla"

> Esto es lo primero que ve cualquier usuario al entrar al Home.

### 1.1 Render inicial

- [ ] Al cargar `/inicio`, Coyo Rive se monta y hace la animación de **saludo** (mano alzada).
- [ ] Después del saludo (~2.5s), Coyo entra en `idle`: respira (cuerpo escala ligeramente), parpadea, mueve la cola.
- [ ] El bocadillo de texto muestra `¡Hola, {tu nombre}!` con tu nombre en azul.
- [ ] Debajo: `¿Qué andas buscando hoy?` + `Pregúntame y te ayudo al instante.`

### 1.2 Input + botón

- [ ] Si hay ciudad activa: input habilitado con placeholder `¿Algún plomero por la colonia centro?`.
- [ ] Si NO hay ciudad activa: input deshabilitado con placeholder `Activa tu ubicación para preguntar`.
- [ ] Botón **Preguntar** disabled si el input está vacío.
- [ ] Botón habilitado en cuanto hay al menos 1 carácter no-espacio.

### 1.3 Coyo reactivo al input

- [ ] Tecleo al menos 1 carácter → Coyo cambia a estado **`atento`** (ladea la cabeza).
- [ ] Borro todo → Coyo regresa a `idle`.

### 1.4 Stat "X vecinos preguntando hoy"

- [ ] Si nadie ha preguntado en las últimas 24h: muestra `Sé el primero en preguntar hoy`.
- [ ] Si exactamente 1 persona ha preguntado: `1 vecino preguntando hoy`.
- [ ] Si N personas: `N vecinos preguntando hoy`.

---

## 2. Publicar pregunta

### 2.1 Flujo normal

- [ ] Escribo un texto válido y presiono **Preguntar** (o Enter).
- [ ] El botón muestra spinner Loader2 brevemente.
- [ ] La pregunta aparece **inmediatamente** en el feed (arriba del resto).
- [ ] La card de mi pregunta muestra:
  - Avatar mío con iniciales o foto.
  - Mi nombre + `hace un momento`.
  - El texto literal de la pregunta.
- [ ] Coyo (en el hero) cambia a estado **`pensando`** (mano en barbilla).

### 2.2 Validaciones del input

- [ ] Texto vacío → no se puede enviar.
- [ ] Texto con solo espacios → no se puede enviar.
- [ ] Texto >500 chars → el input lo trunca automáticamente a 500.
- [ ] Enter (sin Shift) envía la pregunta.

---

## 3. Coyo procesando la pregunta

### 3.1 Bloque "Coyo está pensando…" en la card

- [ ] La card de mi pregunta muestra debajo del texto el bloque de Coyo procesando.
- [ ] El bloque es **inline** (sin caja azul de fondo).
- [ ] A la izquierda: **Coyo Rive mini animado** en estado `pensando` (40px móvil / 48px desktop).
- [ ] A la derecha: texto en negrita `Coyo está pensando…`.
- [ ] El sondeo (polling) ocurre cada 2 segundos al endpoint `/coyo`.

### 3.2 Cuando termina

- [ ] El bloque "pensando" desaparece y se reemplaza por uno de:
  - `Coyo encontró esto para ti` (azul claro) con tarjetas.
  - `Coyo sugiere` (ámbar) si la pregunta era vaga.
  - `Coyo aclara` (slate) si era no-local.
  - `Coyo no pudo procesar tu pregunta` (slate) si falló IA.
- [ ] El sondeo se detiene solo (no sigue haciendo requests cada 2s).
- [ ] Coyo (en el hero) cambia a estado **`respondiendo`** durante ~6s (mueve la boca).
- [ ] Luego Coyo (en el hero) vuelve a `idle`.

---

## 4. Coyo "listo" con resultados

> Caso feliz: la pregunta tenía un dominio claro y Coyo encontró cosas.
> Prueba con: *"¿alguna panadería?"* o *"¿algún restaurante de mariscos?"*

### 4.1 Estructura del bloque

- [ ] Fondo azul claro + borde azul.
- [ ] Encabezado: `✨ Coyo encontró esto para ti`.
- [ ] Texto cálido (1-2 frases) presentando los resultados.

### 4.2 Grupos de tarjetas

- [ ] Los grupos aparecen en orden: **Negocios → Ofertas → MarketPlace → Servicios**.
- [ ] Solo se muestran grupos que tienen al menos 1 item.
- [ ] Max 3 tarjetas por grupo.
- [ ] Si el grupo tiene más de 3 resultados, el título muestra `(N)` con el total.

### 4.3 Tarjetas (Sprint 2.A — clicables)

- [ ] Hover en desktop: borde cambia a azul + tinte azul suave.
- [ ] Cursor pointer en desktop.
- [ ] Click → al activo, `active:scale[0.995]` (feedback táctil).
- [ ] **Negocio** → click navega a `/negocios/:sucursalId` (perfil del negocio).
- [ ] **Oferta** → click navega a `/ofertas?oferta=:id` (la sección detecta el query y abre el modal).
- [ ] **MarketPlace** → click navega a `/marketplace/articulo/:id`.
- [ ] **Servicio** → click navega a `/servicios/:id`.
- [ ] El back del navegador vuelve al Home con el feed intacto.

### 4.4 Chips de datos ricos

- [ ] **Negocio:** `⭐ 4.5 (N)` solo si N > 0; `Verificado`; `Abierto`/`Cerrado` si hay horario.
- [ ] **Oferta:** `⭐` del negocio (solo si rating > 0); `Vence en N días`/`Vence hoy`/`Vence mañana`.
- [ ] **MarketPlace:** condición (Nuevo/Seminuevo/Usado/Para reparar); `Negociable` si acepta ofertas.
- [ ] **NO** debe aparecer `⭐ 0.0` cuando totalReseñas=0 (regla Sprint 2.C).

### 4.5 "Ver N más en X" (Sprint 2.A)

- [ ] Si un grupo tiene más resultados de los que muestra (top 3), aparece al pie:
  - `Ver 5 más en Negocios →` (con flecha ArrowRight).
- [ ] Click → navega a la sección (`/negocios`, `/ofertas`, etc.).
- [ ] La sección destino abre con el **buscador activo** y el query = el texto de tu pregunta.
- [ ] Los resultados de la sección coinciden con lo que esperabas.

---

## 5. Coyo "no_aplica" — pregunta vaga (Sprint 2.C)

> Prueba con: *"¿alguien tiene algo bueno?"*, *"¿qué tal todo?"*, *"¿quién me puede ayudar con la casa?"*

- [ ] Fondo **ámbar claro** + borde ámbar.
- [ ] Encabezado: `✨ Coyo sugiere`.
- [ ] Texto generado por Gemini con sugerencias específicas para reformular (ej. *"Por ejemplo, ¿buscas X o Y?"*).
- [ ] **NO** se muestran tarjetas.

---

## 6. Coyo "no_aplica" — pregunta no-local (Sprint 2.C)

> Prueba con: *"¿cuánto es 2+2?"*, *"¿cómo está el clima?"*, *"escribe un poema"*.

- [ ] Fondo **slate claro** + borde slate.
- [ ] Encabezado: `✨ Coyo aclara`.
- [ ] Texto fijo de redirección amable (algo como *"Para eso no soy bueno, pero si buscas algo aquí en tu ciudad…"*).
- [ ] **NO** se muestran tarjetas.

---

## 7. Coyo "no_aplica" — pregunta inapropiada

> Prueba con: drogas ilegales, armas, contenido sexual explícito, insultos directos.
> **⚠️ Cuidado:** lo que escribas queda registrado en BD aunque se oculte del feed.

- [ ] La pregunta **NO aparece** en el feed público.
- [ ] Verificar en BD:
  ```sql
  SELECT estado_pregunta, estado_coyo
  FROM preguntas_comunidad
  WHERE texto LIKE '%<lo-que-escribiste>%';
  -- estado_pregunta = 'oculta'
  -- estado_coyo = 'no_aplica'
  ```
- [ ] El autor SÍ ve su pregunta en `/inicio/mis-preguntas` (con badge "Eliminada").

---

## 8. Coyo "sin_respuesta" → Reintentar (Sprint 2.D)

> Caso raro pero importante: Gemini falló los 6 intentos automáticos.
> Como ya casi no pasa con billing pagado, hay que forzarlo manualmente.

### 8.1 Forzar el estado

Ejecuta en local (NO en prod):

```sql
UPDATE preguntas_comunidad
SET estado_coyo = 'sin_respuesta',
    respuesta_coyo = NULL,
    resultados_coyo = NULL
WHERE id = '<uuid-de-tu-pregunta-de-prueba>';
```

Refresca el Home.

### 8.2 Vista del autor

- [ ] La card muestra el bloque slate `BloqueCoyoSinRespuesta`.
- [ ] Encabezado: `⚠️ Coyo no pudo procesar tu pregunta`.
- [ ] Mensaje: *"Hubo un problema temporal con el asistente. Puedes intentar de nuevo."*
- [ ] Aparece el botón **Reintentar** (slate-700 con ícono RefreshCcw).

### 8.3 Vista del vecino

- [ ] Login con Usuario B y abre el Home.
- [ ] En la misma pregunta, el bloque slate SÍ aparece.
- [ ] Mensaje distinto: *"Coyo no pudo responder ahorita, pero los vecinos sí pueden ayudar."*
- [ ] El botón **Reintentar NO aparece** (solo el autor lo ve).

### 8.4 Acción de reintentar

- [ ] Click en Reintentar → botón cambia a spinner `Reintentando…`.
- [ ] Toast verde: *"Reintentando — Coyo está procesando de nuevo"*.
- [ ] La card vuelve al estado `pendiente` (Coyo mini animado + "Coyo está pensando…").
- [ ] Después del procesamiento, llega a `listo`/`no_aplica` o vuelve a `sin_respuesta` (si Gemini sigue cayendo).

---

## 9. Respuestas de la comunidad (Sprint 1.F1)

### 9.1 Vecino responde a una pregunta de otro

> Como Usuario B, en una pregunta de Usuario A.

- [ ] En una pregunta SIN respuestas, veo el CTA azul `💬 Sé el primero en responder`.
- [ ] Click → se abre la caja con textarea + botón enviar (avión de papel).
- [ ] Escribo texto y presiono Enter (sin Shift) → publica.
- [ ] **Shift+Enter** inserta salto de línea (no envía).
- [ ] La respuesta aparece en la lista, debajo de la pregunta:
  - Avatar + nombre del vecino.
  - Tiempo relativo (`hace un momento`).
  - Texto de la respuesta.
- [ ] El contador en la card sube: `💬 Ver 1 respuesta`.
- [ ] La caja se limpia para que pueda escribir otra.

### 9.2 Ver respuestas

- [ ] Otra vez como Usuario B (o A), en una pregunta con respuestas, veo `💬 Ver N respuestas` (gris).
- [ ] Click → expande y muestra todas las respuestas en orden cronológico ascendente (la más vieja primero).
- [ ] Click otra vez → colapsa (`Ocultar respuestas`).

### 9.3 Borrar mi propia respuesta

- [ ] En una respuesta MÍA, veo un ícono de papelera (Trash2) a la derecha.
- [ ] Click → soft-delete inmediato; la respuesta desaparece de la lista.
- [ ] El contador `Ver N respuestas` baja en 1.
- [ ] **En respuestas de OTROS, NO veo el ícono de papelera** (solo el autor borra).

### 9.4 Autor NO se autorresponde (Sprint 2.B')

> Como Usuario A, en MI propia pregunta.

- [ ] En MI propia pregunta sin respuestas → **NO veo** `Sé el primero en responder`.
- [ ] En MI propia pregunta con respuestas → veo `Ver N respuestas` pero **NO la caja para responder**.
- [ ] Si abro DevTools y hago un `POST /preguntas-comunidad/:id/respuestas` con mi propio token → backend responde **403** *"No puedes responder a tu propia pregunta"*.

### 9.5 No responder a pregunta cerrada/oculta

- [ ] Cierro una pregunta (ver §11).
- [ ] La pregunta sale del feed. Pero si llego por otra ruta (ej. link directo, mis preguntas), el bloque de respuestas **NO ofrece** caja para escribir.
- [ ] Las respuestas viejas siguen siendo legibles.

---

## 10. "Yo también quiero saber" (Sprint 1.F1)

### 10.1 Marcar interés

> Como Usuario B, en una pregunta de Usuario A.

- [ ] Veo el botón gris claro `✨ Yo también quiero saber` (con contador si N > 0).
- [ ] Click → cambia **instantáneo** (optimistic):
  - Color azul (bg-blue-100, text-blue-700).
  - Texto: `Te avisaremos` + contador (subió en 1).
- [ ] Click otra vez → vuelve al estado base gris, contador baja en 1.

### 10.2 Idempotencia

- [ ] Doble-click rápido NO duplica el conteo (solo +1 / -1).
- [ ] Refrescar el Home preserva el estado (azul sigue azul).

### 10.3 Autor NO ve el botón en su propia pregunta

> Como Usuario A, en MI propia pregunta.

- [ ] El botón "Yo también quiero saber" **NO aparece** (no tiene sentido marcar interés en tu propia pregunta).

### 10.4 Pregunta cerrada/oculta

- [ ] Después de cerrar una pregunta (§11), el botón ya no aparece para ningún vecino.

---

## 11. Menú del autor (Sprint 1.F2)

> Como Usuario A, en MI propia pregunta. Los 3 puntitos (⋮) están a la derecha del nombre.

### 11.1 Visibilidad del menú

- [ ] Los `⋮` solo aparecen en MIS preguntas (no en las de Usuario B).
- [ ] Click → dropdown se abre con animación slide-down.
- [ ] Click fuera del menú → se cierra.

### 11.2 Opciones según estado

| Si la pregunta está… | Opciones esperadas |
|---|---|
| Activa + 0 respuestas | Editar · Marcar como resuelta · Cerrar pregunta · Eliminar |
| Activa + con respuestas | (sin Editar) · Marcar como resuelta · Cerrar pregunta · Eliminar |
| Activa + ya resuelta | (sin "Marcar resuelta") · Editar (si 0 respuestas) · Cerrar pregunta · Eliminar |
| Cerrada | Eliminar (única opción) |
| Oculta | (el ⋮ no aparece — no hay acciones) |

- [ ] Probar cada caso y verificar que las opciones coinciden.

### 11.3 Editar pregunta (solo si 0 respuestas)

- [ ] Click "Editar" → se abre modal `ModalAdaptativo` con textarea precargado con el texto actual.
- [ ] Modal centrado en desktop / bottom-sheet en móvil.
- [ ] Si NO modifico → botón "Guardar cambios" disabled, texto "Aún no hay cambios".
- [ ] Si modifico → botón se habilita, texto "Hay cambios sin guardar".
- [ ] Contador `N/500` actualizado en vivo.
- [ ] Click "Guardar" → toast `Pregunta actualizada — Coyo está re-procesando`.
- [ ] El modal se cierra.
- [ ] La card en el feed se actualiza con el texto nuevo.
- [ ] El bloque de Coyo cambia a "Coyo está pensando…" (porque se re-procesa).
- [ ] Después de procesar, Coyo da una respuesta nueva basada en el texto editado.

### 11.4 Marcar como resuelta

- [ ] Click "Marcar como resuelta" → modal de confirmación verde con texto explicativo.
- [ ] Click "Sí, ya la resolví" → toast verde.
- [ ] La pregunta sigue en el feed.
- [ ] Aparece un **badge verde `✓ Resuelta`** al lado del tiempo.
- [ ] El menú ⋮ ya no muestra "Marcar como resuelta".
- [ ] La pregunta puede seguir recibiendo respuestas (el badge no la cierra).

### 11.5 Cerrar pregunta

- [ ] Click "Cerrar pregunta" → modal de confirmación ámbar.
- [ ] Click "Sí, cerrar pregunta" → toast verde.
- [ ] La pregunta **desaparece del feed público**.
- [ ] En `/inicio/mis-preguntas` aparece con badge ámbar **`Cerrada`**.
- [ ] Las respuestas viejas se conservan (visibles desde Mis preguntas).
- [ ] Ya no acepta nuevas respuestas.

### 11.6 Eliminar pregunta

- [ ] Click "Eliminar" → modal de confirmación rojo (destructivo).
- [ ] Click "Sí, eliminar" → toast verde.
- [ ] La pregunta **desaparece del feed público**.
- [ ] En `/inicio/mis-preguntas` aparece con badge slate **`Eliminada`**.
- [ ] El bloque de respuestas ya no se renderiza ahí (estado oculto).

---

## 12. Vista "Mis preguntas" (Sprint 1.F3)

- [ ] En el header del feed (debajo del hero), aparece el link **`Mis preguntas →`** azul a la derecha.
- [ ] Click → navega a `/inicio/mis-preguntas`.
- [ ] Header con flecha "Volver" + título "Mis preguntas" + subtítulo "Todas las preguntas que has publicado en el Home".
- [ ] Click "Volver" → vuelve a `/inicio`.

### 12.1 Lista con badges de estado

- [ ] Si no tengo preguntas: empty state con ícono Inbox azul + CTA "Ir al inicio".
- [ ] Si tengo: lista con todas mis preguntas (activa + cerrada + oculta), más recientes primero.
- [ ] Cada card muestra:
  - Badge de estado: **Activa** (azul) / **Cerrada** (ámbar) / **Eliminada** (slate).
  - Badge **Resuelta** (verde) si aplica.
  - Tiempo relativo.
  - Texto de la pregunta.
  - Stats inline: `X respuestas · Y personas interesadas`.
  - Menú ⋮ con las opciones del estado actual.

### 12.2 Acciones sobre cards en Mis preguntas

- [ ] El menú ⋮ funciona igual que en el Home (cerrar/marcar resuelta/editar/eliminar).
- [ ] El bloque de respuestas se puede expandir para leer lo que dejaron.
- [ ] En preguntas cerradas, el aviso "Esta pregunta ya no recibe respuestas nuevas" aparece.
- [ ] En preguntas eliminadas, el aviso "Esta pregunta fue eliminada — ya no aparece en el feed público" aparece.

---

## 13. Expiración pasiva 14 días (Sprint 1.E)

> Las preguntas que pasan 14 días sin nuevas respuestas se autocierran al
> listar el feed.

### 13.1 Forzar el caso

```sql
-- Forzar fecha vieja a una pregunta de prueba:
UPDATE preguntas_comunidad
SET created_at = NOW() - INTERVAL '15 days',
    updated_at = NOW() - INTERVAL '15 days'
WHERE id = '<uuid-pregunta-de-prueba>';

-- Borrar respuestas de esa pregunta (si las tenía) para que el barrido la cierre:
DELETE FROM respuestas_preguntas_comunidad WHERE pregunta_id = '<uuid>';
```

### 13.2 Verificar el cierre automático

- [ ] Recarga `/inicio`.
- [ ] La pregunta que tenía 15 días debe **desaparecer del feed**.
- [ ] Verifica en BD:
  ```sql
  SELECT estado_pregunta FROM preguntas_comunidad
  WHERE id = '<uuid>';
  -- estado_pregunta = 'cerrada'
  ```
- [ ] En `/inicio/mis-preguntas` aparece con badge **Cerrada**.

### 13.3 NO debe cerrar preguntas con actividad reciente

- [ ] Toma otra pregunta con `created_at` viejo pero con una respuesta activa de hace <14d.
- [ ] Esa pregunta debe seguir **activa** después de recargar el feed (la `MAX(respuestas.created_at)` la rescata).

---

## 14. Notificaciones (Sprint 1.D + 2.B')

> 3 tipos: al autor, a interesados, a dueños de items recomendados.

### 14.1 `pregunta_comunidad_respondida` — al autor

- [ ] Usuario A publica una pregunta.
- [ ] Usuario B responde esa pregunta con un texto.
- [ ] Usuario A recibe notificación en el panel con:
  - Tile azul + glifo de chat (familia comunidad).
  - Nombre completo de Usuario B arriba (formato `.pn-title`: 15px, navy, 600).
  - Texto entre comillas tipográficas con la respuesta (1 línea con ellipsis si es larga).
  - Tiempo abajo.
- [ ] Click → navega a `/inicio?preguntaId=<id>`.

### 14.2 `pregunta_comunidad_seguida_respondida` — a interesados (Sprint 2.B')

- [ ] Usuario A publica una pregunta.
- [ ] Usuario B (interesado) marca "Yo también quiero saber".
- [ ] Usuario C responde la pregunta de A.
- [ ] **Usuario B (interesado) recibe** notificación:
  - Tile azul + glifo de chat (igual visual que la anterior).
  - Nombre de Usuario C arriba.
  - Texto de la respuesta entre comillas.
- [ ] **Usuario A (autor) NO recibe esta notificación duplicada** (solo recibe la de "Respondió tu pregunta").
- [ ] **Usuario C (responder) NO se auto-notifica** aunque haya marcado interés antes.

### 14.3 `coyo_recomendacion` — al gerente/dueño

> Caso comercial: cuando Coyo recomienda un negocio/oferta/servicio.

- [ ] Usuario A publica una pregunta que active resultados de Coyo (ej. `"¿alguna panadería?"`).
- [ ] Coyo recomienda al negocio X.
- [ ] **El gerente de la sucursal X** recibe notificación:
  - Tile violeta + glifo sparkle (familia coyo).
  - Modo: comercial.
- [ ] Si la sucursal X **no tiene gerente** → notifica al **dueño** del negocio (fallback).
- [ ] Si el negocio X aparece más de una vez (matriz + sucursal), cada uno recibe su propia notificación.
- [ ] **Si Usuario A es el dueño/gerente del negocio recomendado, NO se auto-notifica**.

### 14.4 Notificación en MarketPlace personal

- [ ] Usuario A pregunta `"¿alguien vende una bicicleta?"`.
- [ ] Coyo recomienda un artículo de Usuario B.
- [ ] Usuario B recibe notificación con modo `personal` (no comercial).

### 14.5 Layout y navegación del panel

- [ ] Los 3 tipos del Home/Coyo usan el mismo **layout compacto** en el panel:
  - Nombre arriba (formato `.pn-title`).
  - Mensaje entre comillas tipográficas en 1 línea con `…` si no cabe.
  - Tiempo abajo.
  - SIN título visible (queda en `aria-label`).
- [ ] Click en cualquiera de los 3 → navega a `/inicio?preguntaId=<id>`.

---

## 15. Empty state del feed (Sprint 2.C)

> Cómo se ve cuando una ciudad NO tiene preguntas activas todavía.

### 15.1 Cómo forzarlo

Opción A: cambiar la ciudad del `useGpsStore` a una sin preguntas (ej. *Hermosillo*, *Guadalajara*).

Opción B: borrar todas las preguntas activas de la ciudad actual:

```sql
UPDATE preguntas_comunidad
SET estado_pregunta = 'oculta'
WHERE ciudad = 'Puerto Peñasco' AND estado_pregunta = 'activa';
```

### 15.2 Lo que debe verse

- [ ] El bloque vacío en lugar de la lista de preguntas.
- [ ] Ícono Inbox **azul** (bg-blue-50, color blue-600).
- [ ] Texto principal: **`Sé el primero en preguntarle a {Ciudad}`** (cambia con la ciudad activa).
- [ ] Sub-texto: *"Coyo te ayuda al instante y tus vecinos pueden completar la respuesta."*
- [ ] Sección **`IDEAS PARA EMPEZAR`** con 3 ejemplos en italic con sparkles ámbar:
  - *"¿Algún plomero confiable por aquí?"*
  - *"¿Qué restaurante recomiendan para una cena?"*
  - *"¿Dónde reparan laptops?"*

---

## 16. Edge cases

### 16.1 Sin ciudad seleccionada

- [ ] Si `useGpsStore.ciudad` es null, el feed no se carga.
- [ ] El input del hero muestra placeholder `Activa tu ubicación para preguntar`.
- [ ] El feed muestra `EstadoSinCiudad`: *"Activa tu ubicación para ver las preguntas de tu ciudad."*

### 16.2 Sin sesión

- [ ] El Home es ruta privada (`RutaPrivada`). Sin sesión → redirige a login.

### 16.3 Sin GEMINI_API_KEY

- [ ] Si la API key falta, Coyo cae a `sin_respuesta` en TODAS las preguntas.
- [ ] La app sigue funcionando, las preguntas se pueden publicar, los vecinos pueden responder.
- [ ] El autor ve el botón Reintentar (que también fallará).

### 16.4 Sin internet a media respuesta

- [ ] Publico una pregunta, Coyo procesa, pero pierdo internet a los 3s.
- [ ] El sondeo del frontend falla silenciosamente.
- [ ] Al volver internet y recargar, la card muestra el estado real (probablemente `listo` o `sin_respuesta`).

### 16.5 Doble-click rápido al botón "Yo también"

- [ ] Pulsar 2 veces rápido NO duplica el conteo.
- [ ] Visualmente el contador parpadea +1 / -1 / +1.
- [ ] El estado final es consistente con lo que realmente esté en BD.

### 16.6 Pregunta con caracteres especiales

- [ ] Probar con: emojis, acentos, comillas dobles, `<script>`, saltos de línea.
- [ ] El texto debe mostrarse literal (sin escape visible), sin romper el layout, sin ejecutar HTML.

---

## 17. Accesibilidad

- [ ] **Tab navigation**: puedo moverme entre el input, el botón Preguntar, las cards, el menú ⋮, y los botones de cada card solo con Tab.
- [ ] **Enter** en el input del hero envía la pregunta.
- [ ] **Enter** en la caja de respuesta envía la respuesta.
- [ ] **Escape** cierra los modales (ModalAdaptativo).
- [ ] **aria-live** en el bloque "Coyo está pensando…" anuncia el cambio a lectores de pantalla.
- [ ] **aria-label** en botones críticos:
  - Avatar del autor: `Coyo, asistente de AnunciaYA`.
  - Botón Preguntar: `Publicar pregunta`.
  - Botones de las tarjetas: `Ver {titulo}`.
  - Botones del panel de notificaciones: estado leído/no leído + título.

---

## 18. Performance

- [ ] **Sondeo selectivo**: el endpoint `/coyo` solo se llama para preguntas en `pendiente`/`procesando`. Una pregunta vieja en `listo` no genera requests.
- [ ] **Carga lazy de respuestas**: el endpoint `/respuestas` solo se llama al expandir el bloque (no al cargar el feed).
- [ ] **Optimistic update**: marcar "Yo también" no parpadea / no espera al server para verse aplicado.
- [ ] **Expiración pasiva**: el UPDATE de cierre solo afecta a la ciudad consultada, no a toda la BD.
- [ ] **Cache de Coyo categorías**: `obtenerCatalogoCategorias` cachea 1h. Cambios al catálogo se reflejan en máx 1h.

---

## 19. Tests automatizados existentes

- [ ] `pnpm --filter api exec vitest run src/__tests__/coyo-filtro-caso-a.test.ts src/__tests__/coyo-filtro-caso-b.test.ts` pasa con **54/54 tests**.

```bash
# Comando completo para correr todos los tests del módulo:
cd apps/api && pnpm exec vitest run src/__tests__/coyo-filtro-caso-a.test.ts src/__tests__/coyo-filtro-caso-b.test.ts
```

Áreas SIN tests dedicados (decisión consciente — ver `Home_Coyo.md` §Tests):
- `notificacionesCoyo.service.ts` (cobertura vía E2E cuando crezca el uso).
- `cerrarPreguntasVencidasDeCiudad` (depende de timestamps reales).
- Hooks con optimistic update (`useMarcarInteres` / `useQuitarInteres`).

---

## 20. Bugs encontrados / observaciones

> Anota aquí cualquier cosa que se rompió, se vio raro o tienes dudas. Cada
> bullet con fecha + descripción corta.

- [ ] _(vacío — completar mientras pruebas)_

---

## ✅ Criterios para considerar el Home / Coyo "listo para beta"

Cumplir todo lo siguiente:

- [ ] **Bloques 1–18** marcados al 100%.
- [ ] Sin bugs críticos abiertos en §20.
- [ ] Las 3 migraciones SQL aplicadas en prod (Supabase).
- [ ] `GEMINI_API_KEY` activa en Render.
- [ ] Probado con al menos **3 vecinos reales** distintos (no solo cuentas de prueba).
- [ ] Probado en **móvil + desktop**.
- [ ] Probado en **Chrome + Safari** (al menos uno de cada).

---

**Versión:** 1.0
**Última actualización:** 1 Junio 2026
**Autor:** Juan (con asistencia de Claude)
**Doc maestro del módulo:** `docs/arquitectura/Home_Coyo.md`
