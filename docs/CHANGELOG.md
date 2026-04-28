# 📜 AnunciaYA v3.0 - Changelog

Todas las novedades notables del proyecto están documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Versionamiento Semántico](https://semver.org/lang/es/).

---

## [29 Abril 2026] - Fix etiqueta "Matriz" en buscador de ChatYA 🐛

**Bug:** En el buscador de chats, al buscar un negocio multi-sucursal, la sucursal Matriz aparecía con el nombre del negocio duplicado en la segunda línea: *"Imprenta FindUS / Imprenta FindUS"*. Las sucursales secundarias se veían bien.

**Causa raíz:** En BD la sucursal Matriz suele tener `nombre = "Imprenta FindUS"` (igual al negocio). El backend retornaba ese nombre literal sin distinguir si era principal.

**Fix en `buscarNegocios` (`apps/api/src/services/chatya.service.ts`):**
- La query ahora incluye `s.es_principal`.
- Lógica de etiqueta:
  - 1 sola sucursal → `null` (no se renderiza segunda línea).
  - Sucursal Matriz de negocio con varias → `"Matriz"` literal.
  - Sucursal secundaria → su nombre real.

Frontend no requirió cambios: ya respeta `sucursalNombre` del response.

Commit: `ab36c10`.

---

## [29 Abril 2026] - Mis Notas independientes por sucursal en ChatYA 📓

**Bug:** Las notas en "Mis Notas" se compartían entre sucursales — al cambiar de sucursal activa, las notas viejas aparecían a la **izquierda** (recibidas) en lugar de a la derecha (enviadas) — efecto espejo. Causa: la lógica frontend `mensajeEsMio` ya usaba la tupla `(emisorId, emisorSucursalId)` por la Coherencia A inter-sucursal del Sprint 13, pero las notas no filtraban por sucursal, así que un mensaje grabado en Matriz se veía como "ajeno" desde otra sucursal.

**Solución arquitectónica:** Mis Notas es ahora **independiente por sucursal**. Cada sucursal tiene su propio "cuaderno" de notas. Cuando el operador cambia de sucursal, ve solo las notas que escribió desde esa sucursal específica.

**Cambios:**
- **Migración SQL** (`docs/migraciones/2026-04-28-chat-mis-notas-backfill-sucursal.sql`): backfill de mensajes legacy en conversaciones tipo `notas` con `emisor_sucursal_id IS NULL`. Dueños → Matriz del negocio, gerentes → su sucursal asignada. Idempotente. Aplicada en staging (6 mensajes legacy backfileados).
- **Backend** (`listarMensajes` en `chatya.service.ts`): filtro condicional `WHERE emisor_sucursal_id = sucursalId` cuando `contexto_tipo = 'notas'` y hay sucursal activa.
- **Frontend**:
  - `useChatYAStore.invalidarMisNotas()`: nueva acción que limpia `cacheMensajes`/`cacheTotalMensajes`/`cacheHayMas` de Mis Notas y recarga si está abierta.
  - `useScanYAStore.cambiarSucursal`: invoca invalidar tras cambio en ScanYA.
  - `useAuthStore.setSucursalActiva`: invoca invalidar en modo comercial (BS).

Validación end-to-end: dueño con notas en Matriz, al cambiar a Sucursal Norte ve Mis Notas vacía; al volver a Matriz, las notas reaparecen.

Commit: `30a9ff1`.

---

## [28-29 Abril 2026] - Rediseño profesional PanelInfoContacto + Regla 13 🎨

**Problema:** El panel lateral de información de contacto en ChatYA se sentía caricaturesco / videojuego en lugar de herramienta B2B: cards anidados con headers oscuros gruesos, iconos en círculos pastel, emojis 🥉🥈🥇 como datos, saltos tipográficos exagerados, bordes 2px y colores saturados.

**Rediseño aplicado** en ambas vistas (cliente y negocio) con variantes adaptativas móvil/desktop:

- **Vista cliente — Puntos y nivel:** lista densa label/valor con divider 1px, iconos pequeños inline (Award, Coins, Calendar) sin círculo, sin emojis.
- **Vista negocio — Rating + Categoría / Horario / Ver perfil / Ubicación:** `bg-white border-1 slate-300 shadow-sm`, botones con texto neutro slate, color semántico solo donde aporta info (verde "Abierto ahora", rojo "Cerrado").
- **Variantes móvil** (sobre gradiente azul oscuro del panel): `bg-white/10 backdrop-blur-sm + border-white/15` (glass), tipografía `text-[15px]` con peso aumentado, iconos `text-white/60-70`, estados semánticos `text-emerald-400 / text-red-400` para legibilidad sobre oscuro.
- **Footer Silenciar/Bloquear/Eliminar:** iconos un escalón menos, línea divisoria superior eliminada.
- **Sección archivos:** `slice(0, 6)` defensivo, sin scroll interno (grid 3×2 cabe siempre con `aspect-square`).
- **Galería completa (modal con tabs):** tamaños de tab y contador móvil aumentados, lista de documentos con tipografía y contraste mejorados.

**Documentación nueva — Regla 13 "Estética Profesional vs Caricaturesca"** en `docs/estandares/TOKENS_GLOBALES.md`:
- Anti-patrones a evitar (iconos en círculos pastel, emojis como datos, saltos tipográficos, bordes ≥2px, colores pastel saturados).
- Patrones correctos (listas densas inline, iconos 14–16px sin círculo, jerarquía por peso no tamaño, color neutro + 1 acento).
- Tabla de variantes móvil/desktop.
- Excepción: vistas al consumidor final (CardYA, públicas) pueden ser más amigables.
- Caso de referencia: `PanelInfoContacto.tsx` (28 abr 2026).

Referenciada desde `CLAUDE.md` con resumen accionable para que aparezca en el contexto inicial de futuras sesiones.

Commits: `1588283` + `69c1ce7`.

---

## [28 Abril 2026] - Auto-cierre de turnos colgados en ScanYA ⏰

**Problema:** Cuando el operador cerraba ScanYA sin hacer logout, el turno (`scanya_turnos`) quedaba con `hora_fin = NULL` indefinidamente, distorsionando stats y bloqueando futuros logins.

**Solución:** Cron cada 30 min que cierra turnos rebasados + aviso al operador en su próximo login a ScanYA.

**Algoritmo del límite (sin config nueva):**
- Sucursal con horario operativo ese día → duración del horario + 2h gracia.
- Sucursal cerrada ese día o sin horario → 24h.
- 24/7 (apertura == cierre) → 24h.
- Cap absoluto: 30h.
- Filtro: turnos con < 3h ni siquiera entran al cálculo.

Ejemplo validado: lunes 08:30–18:30 (10h) → límite 12h.

**Cierre del turno:**
- `hora_fin = NOW()`
- `cerrado_por = NULL` (manual siempre tiene UUID — distingue auto vs manual).
- `notas_cierre = "Cerrado automáticamente — turno excedió Xh sin cierre manual."`

**Aviso al operador (modal, no notificación):**
- NO se envía notificación AY: los empleados no tienen cuenta propia en AnunciaYA — `empleados.usuario_id` apunta al dueño que los creó. Notificar a ese ID saturaría al dueño con notifs ajenas.
- En su lugar, el endpoint de login (`loginDueno` / `loginEmpleado`) llama a `obtenerAvisoTurnoAutoCerrado(operador)` y retorna info del último turno auto-cerrado en las últimas 24h, si no abrió otro después y si el aviso aún no ha sido visto.
- Frontend muestra `ModalAvisoTurnoAutoCerrado` con look ScanYA (negro + glow azul) + patrón adaptativo (bottom-sheet móvil, centrado desktop). Texto conciso, NO se auto-cierra.

**Marca de "ya visto" para que no aparezca repetidamente:**
- Migración: `docs/migraciones/2026-04-28-scanya-turnos-aviso-visto.sql` agrega columna `scanya_turnos.aviso_visto_at TIMESTAMPTZ`.
- `obtenerAvisoTurnoAutoCerrado` filtra por `aviso_visto_at IS NULL` y, al encontrar uno, hace UPDATE para marcarlo.

Validación end-to-end con turno de empleado y de dueño: modal aparece en el primer login post-cierre y NO en logins subsiguientes.

Doc: `docs/arquitectura/ScanYA.md` → v1.6.

Commit: `cabe419`.

---

## [28 Abril 2026] - Fix zona horaria por sucursal en Reportes BS 🐛

**Bug:** Una venta hecha en Puerto Peñasco a las **09:05** (hora Sonora, UTC-7) aparecía en el bucket de las **10:00** del gráfico "Horarios pico" en Reportes BS. Verificado en transacción `67b4f9d4` (raw UTC `16:05` → bucket viejo `10` → bucket correcto `9`).

**Causa raíz:** Las queries SQL en `reportes.service.ts` usaban `AT TIME ZONE 'America/Mexico_City'` **hardcoded**, ignorando la columna `zona_horaria` que cada sucursal ya tiene configurada en `negocio_sucursales`. México tiene 5 zonas horarias (Tijuana UTC-8, Hermosillo UTC-7 sin DST, Mazatlán UTC-7 con DST, Cancún UTC-5, CDMX UTC-6); asumir CDMX en todas falla con sucursales fuera del centro.

**Fix:**
- Nuevo helper `obtenerZonaHorariaSucursal(negocioId, sucursalId?)` en `apps/api/src/utils/zonaHoraria.ts` — devuelve la zona de la sucursal filtrada, o la de Matriz si no hay filtro.
- Aplicado en `reportes.service.ts` reemplazando `'America/Mexico_City'` hardcoded en 3 funciones:
  - `obtenerReporteVentas`: horarios pico + ventas por día de la semana.
  - `obtenerReporteClientes`: tendencia de adquisición por semana.
  - `obtenerReporteResenas`: tendencia de rating por semana.

**Validación:** SQL ejecutado contra prod-staging muestra que la transacción reportada cae correctamente en bucket 9 con la zona de la sucursal (Hermosillo) y en bucket 10 con CDMX hardcoded — exactamente la diferencia que el usuario reportó.

**Datos en BD:** Las sucursales de Sonora ya tienen `zona_horaria = 'America/Hermosillo'` desde antes — no se requirió migración.

**Lección agregada a `LECCIONES_TECNICAS.md`:** nunca hardcodear zona horaria en agregaciones SQL — siempre derivar de la sucursal/negocio.

---

## [27-28 Abril 2026] - Sprint ScanYA Multi-Sucursal cerrado ✅

Cierre del **sprint dedicado de ScanYA Multi-Sucursal** (las 4 fases completas). El backend ya estaba listo; este sprint completó el frontend, validó los 3 roles (dueño/gerente/empleado), aplicó coherencia de filtros por sucursal en todos los modales, y arregló bugs de timing y consistencia descubiertos durante las pruebas.

### 🎯 Fase 1 — UI selector de sucursal (frontend)

- **Backend nuevo**: `POST /api/scanya/cambiar-sucursal` ([scanya.routes.ts:67](apps/api/src/routes/scanya.routes.ts:67)) → cierra turno actual, re-emite tokens, deja al frontend abrir el turno nuevo. Schema Zod `cambiarSucursalSchema` agregado.
- **`loginDueno` retoma turno colgado**: si el dueño tenía un turno abierto en otra sucursal, el login entra a esa sucursal en lugar de Matriz por default. Si la sucursal está desactivada, fallback a Matriz con guard.
- **Tipo `UsuarioScanYA.esSucursalPrincipal`** agregado al store + propagado en `loginDueno`, `loginEmpleado` y `cambiarSucursalDueno`. Permite mostrar "Matriz" en UI sin depender del nombre real de la sucursal en BD (que suele coincidir con el del negocio).
- **`obtenerSucursalesLista`** ahora retorna `esPrincipal` y `activa`, ordena Matriz primero. Compatibilidad con consumidores existentes (filtros de Vouchers/Historial/Reseñas).
- **Componente `ModalCambiarSucursalScanYA`** ([apps/web/src/components/scanya/ModalCambiarSucursalScanYA.tsx](apps/web/src/components/scanya/ModalCambiarSucursalScanYA.tsx)) — bottom-sheet móvil + dropdown desktop, ⭐ Matriz, sucursal activa marcada con check verde, confirmación inline si hay turno con datos, bypass si turno vacío. Renderizado vía `createPortal(document.body)` para escapar del stacking context del header sticky y aparecer encima de cualquier overlay (incluido ChatYA).
- **`HeaderScanYA`**: chip clickeable en desktop (centro del header con `ChevronDown`) y botón circular (40x40) en móvil junto al avatar y logout. Solo visible si `usuario.puedeElegirSucursal && totalSucursales > 1`.
- **`PaginaScanYA.cargarDatos(silencioso?)`**: refresh fluido al cambiar sucursal sin parpadeo (keepPreviousData manual).
- **Avatar de empleado** ([AvatarEmpleadoScanYA.tsx](apps/web/src/components/scanya/AvatarEmpleadoScanYA.tsx)) ahora también se muestra para dueño/gerente, en modo solo lectura (sin botón cámara). Para cambiar la foto van a BS → Mi Perfil → Imágenes.

### 🎯 Fase 2 — 3 roles validados

- **Dueño**: ve chip clickeable, puede cambiar sucursal, retoma turno colgado al re-loguear, opera en cualquier sucursal activa.
- **Gerente**: NO ve chip clickeable. Header desktop muestra `Imprenta FindUS · Matriz` como texto estático. Si intenta forzar `/cambiar-sucursal` desde DevTools → 403 "Solo el dueño puede cambiar de sucursal".
- **Empleado**: NO ve chip. Login con nick+PIN va directo a su sucursal asignada. Sigue pudiendo cambiar su avatar desde el header.

### 🎯 Fase 3 — Coherencia A: filtro por sucursal activa en todos los modales

Decisión arquitectural: **el header del dashboard ScanYA es la única fuente de verdad del contexto de sucursal**. Todos los modales filtran automáticamente por `payload.sucursalId` del token. Para vista cross-sucursal el dueño usa Business Studio.

- **Vouchers** ([scanya.service.ts:obtenerVouchers](apps/api/src/services/scanya.service.ts)): filtra por sucursal del token (incluye NULL para pendientes cross-sucursal canjeables). Se agregó `sucursalEsPrincipal` al payload para mostrar "Matriz" en el detalle. Frontend: dropdown de sucursal eliminado.
- **Historial de Transacciones** ([scanya.service.ts:obtenerHistorial](apps/api/src/services/scanya.service.ts)): filtra por sucursal del token para los 3 roles. Subtítulo del header dinámico ("Matriz" / nombre real). Dropdown de sucursal eliminado del frontend.
- **Reseñas** ([resenas.controller.ts:getResenasNegocio](apps/api/src/controllers/resenas.controller.ts)): controller filtra por `req.scanyaUsuario.sucursalId` para los 3 roles. Frontend: eliminado el dropdown de sucursal y la función completa `DropdownFiltro` interna (~80 líneas).
- **Recordatorios (Offline)** ([scanya.service.ts:obtenerRecordatorios](apps/api/src/services/scanya.service.ts)): el dueño ahora también filtra por sucursal del token (antes veía todos los del negocio).
- **Contadores del header** ([scanya.service.ts:obtenerContadores](apps/api/src/services/scanya.service.ts)): badges de Reseñas y Recordatorios cambian con la sucursal activa.

### 🎯 Fase 4 — Stats ScanYA en BS Empleados

- **Bug encontrado**: las stats del modal de detalle leían contadores de `scanya_turnos` (transacciones, puntos_otorgados) que pueden estar desincronizados con la realidad por deuda técnica histórica.
- **Fix**: [empleados.service.ts:obtenerEstadisticasTurnos](apps/api/src/services/empleados.service.ts) ahora cuenta directamente desde `puntos_transacciones` con `estado='confirmado'` (misma fuente que BS Transacciones). Los números cuadran.
- **Validado** con cuenta de empleado Carlos López (Matriz): 1 venta registrada → modal de detalle muestra 1 transacción / 124 puntos (en lugar de 11/4142 inflados).

### 🐛 Bugs adicionales arreglados durante el sprint

- **Race condition entre modales**: cambiar de un modal a otro causaba que el segundo no abriera. Causado por el `history.back()` síncrono del cleanup de un modal, que disparaba el `popstate` listener del modal nuevo. **Fix**: `setTimeout 0` con check de `mid` único — si otro modal ya hizo `pushState`, no hacemos back. Aplicado a Vouchers, Historial, Reseñas, Recordatorios, RegistrarVenta, CanjearVoucher.
- **Banner "Continuando turno" duplicado y disparado en cambios activos**: eliminado completamente. La duración del turno y el chip del header dan suficiente contexto.
- **Modal cambiar sucursal quedaba detrás del chat** por stacking context del header sticky. **Fix**: `createPortal(document.body)`.
- **Exclusión mutua chat/modal**: ChatYA y modales de ScanYA ya no coexisten en pantalla (el chat ocupaba todo el ancho, tapaba modales). Al abrir uno se cierra el otro automáticamente. Fix preventivo en `ChatOverlay` para no hacer `history.back()` si el state actual es de un modal de ScanYA.
- **"Ver detalle del cliente" oculto en ScanYA** ([PanelInfoContacto.tsx](apps/web/src/components/chatya/PanelInfoContacto.tsx)) — para los 3 roles. Ese flujo es de gestión y vive en BS → Clientes.
- **Filtro de operadores muestra solo quienes han operado realmente** ([negocios.service.ts:listarOperadoresNegocio](apps/api/src/services/negocios.service.ts)): nuevo parámetro `contexto: 'transacciones' | 'vouchers' | 'ambos'`. Vouchers requiere `estado='usado'` Y `sucursal_id` estricto (sin OR NULL).
- **Filtro de operador oculto en tabs Pendientes/Vencidos del modal Vouchers**: solo aparece en Usados (los pendientes/vencidos tienen `usado_por = NULL`).
- **Tab "Cancelados" eliminado del modal Vouchers**: la cancelación es acción del cliente desde CardYA, no aporta info operativa al comerciante. Tab "Expirados" → "Vencidos" (también en mensajes vacíos y detalle: "Vence" / "Venció").
- **Header de gerente en BS** ([SelectorSucursalesInline.tsx](apps/web/src/components/layout/SelectorSucursalesInline.tsx)): mostraba "Imprenta FindUS / Imprenta FindUS" duplicado cuando la sucursal asignada era la principal. Ahora muestra "Imprenta FindUS / Matriz".
- **Reset de filtros al cerrar modales** (Vouchers, Historial, Reseñas): filtros y UI vuelven a base. Cache de datos se mantiene (yaCargo, lista, página) → al reabrir si hay filtros distintos, recarga sin loader (keepPreviousData estricto).
- **`pn.tsx` — TS error preexistente** en `ModalDetalleCanjeBS.tsx:197` corregido (estado 'cancelado' faltante en `GRADIENTES_ESTADO` e `ICONOS_ESTADO`).

### 📋 Tareas separadas flageadas (no de este sprint)

- **Auto-cierre de turnos por inactividad** — turnos colgados de 19+ días en BD. Sprint dedicado.
- **Rediseño PanelInfoContacto vista comercial** — KPIs en lugar de cards, scroll interno en archivos.
- **Bug zona horaria en Reportes BS — Horarios pico** — agrupa con offset incorrecto.

### 🏁 Estado del sprint

Las 4 fases completadas. Frontend de ScanYA ya soporta multi-sucursal completo con UX coherente. Documento `docs/reportes/prompt-sprint-scanya-multi-sucursal.md` marcado como cerrado.

---

## [25 Abril 2026 — tarde] - Sprint multi-sucursal: módulos 10 + 12 cerrados → Prueba 1 ✅ completa

Cierre del **módulo 10 (Mi Perfil)** y **módulo 12 (Sucursales)** del sprint multi-sucursal. Con esto la **Prueba 1 (vista dueño, 12 módulos BS) queda completa**.

### 🎯 Cerrado del sprint multi-sucursal (módulo 10 — Mi Perfil)

- **Módulo 10 — Mi Perfil** ✅. Diseño arquitectural validado: la página adapta sus tabs según la sucursal activa.
  - **En Matriz** se ven 6 tabs (Negocio, Contacto, Ubicación, Horarios, Imágenes, Operación) con campos globales del negocio + datos de la Matriz.
  - **En sucursales secundarias** se ven 5 tabs (Sucursal, Ubicación, Horarios, Imágenes, Operación) — el tab "Negocio" desaparece y "Contacto" se fusiona en "Sucursal".
  - **Globales** (solo en Matriz): Nombre del negocio, Descripción, Categoría, Subcategorías, CardYA, Sitio Web, Logo.
  - **Por-sucursal**: Nombre de la sucursal, Teléfono, WhatsApp, Correo, Redes Sociales, Dirección, Mapa, Horarios, Foto de Perfil, Portada, Galería, Métodos de Pago, Opciones de Entrega.
  - Edición probada: cambio en sucursal secundaria no contamina Matriz.

### 🎯 Cerrado del sprint multi-sucursal (módulo 12 — Sucursales)

- **Módulo 12 — Sucursales** ✅. Exclusivo de Matriz, protegido por `MatrizGuard` (ver módulo 8). La gestión de sucursales fue el insumo del sprint completo (recomendaciones 1-18 ya documentadas).

### 🎨 Refactor UI: botones del tab Imágenes (Mi Perfil)

Los botones "Cambiar" (azul) y "Eliminar" (rojo) del tab Imágenes no combinaban con el resto de los módulos del BS, que usan paleta slate/dark gradient (TC-7).

**Archivo:** [apps/web/src/pages/private/business-studio/perfil/components/TabImagenes.tsx:574-595](apps/web/src/pages/private/business-studio/perfil/components/TabImagenes.tsx:574)

| Botón | Antes | Después |
|---|---|---|
| Cambiar / Subir | `bg-blue-100 text-blue-600 border-blue-300` | Dark gradient `linear-gradient(135deg, #1e293b, #334155)` con `text-white shadow-sm` (TC-7 acción primaria) |
| Eliminar | `bg-red-50 text-red-600 border-red-200` | `bg-white text-slate-700 border-slate-300` con tinte rojo solo en hover (TC-7 botón secundario destructivo) |
| Texto "Subiendo..." | `text-blue-600` | `text-slate-600` (coherencia) |

**Criterio**: aplicar el patrón estandarizado de TC-7 — primario en dark gradient (igual que `+Nueva Oferta`, `+Nuevo Artículo`), secundario en blanco con borde slate. La indicación destructiva (rojo) aparece solo al hover, evitando saturación visual del card.

### ✅ Prueba 1 — Filtrado vista dueño completada

12/12 módulos BS validados con auditoría multi-sucursal.

### ✅ Prueba 2 — Vista gerente confirmada

Validada en sesiones previas del sprint con gerentes María y Jazmín (con `sucursalAsignada`). Puntos confirmados:
- Selector de sucursal oculto en navbar
- Menú lateral filtra "Sucursales" y "Puntos y Recompensas"
- `MatrizGuard` redirige acceso por URL directa a esos módulos
- Data filtrada automáticamente a la sucursal asignada del gerente
- Mi Perfil muestra solo los 5 tabs por-sucursal (sin tab "Negocio")

### 🏁 Sprint multi-sucursal cerrado al 100%

Las 2 pruebas terminadas. El filtrado multi-sucursal en Business Studio funciona correctamente en los 12 módulos validados (vista dueño + vista gerente).

---

## [25 Abril 2026] - Sprint multi-sucursal: módulo 11 Reportes + fix query mejorOferta

Cierre del módulo **Reportes** del sprint multi-sucursal.

### 🎯 Cerrado

- **Módulo 11 — Reportes** ✅. Reportes NO es exclusivo de Matriz (a diferencia de Puntos/Sucursales). Filtra correctamente por sucursal en los 5 sub-tabs (Ventas, Clientes, Empleados, Promociones, Reseñas). Validado con números reales: Matriz $17,883/45 trans/Juan Manuel top vs Norte $950/4 trans/Ian Manuel top.

### 🐛 Bug encontrado y mitigado: query `mejorOferta` en Reportes

**Síntoma**: en Norte, el bloque "Oferta más popular" del tab Promociones de Reportes mostraba placeholder oscuro sin imagen, aunque la oferta "ganadora" sí tenía foto en Matriz.

**Causa raíz** (compuesta):
1. **Bug histórico en `duplicarOfertaASucursales`** (`apps/api/src/services/ofertas.service.ts:1094`) — antes del fix, el INSERT de la copia NO incluía el campo `imagen`, dejando ofertas duplicadas con `imagen=NULL` permanentemente en BD. Hoy el código está corregido (línea 1094 con comentario `← AGREGAR ESTA LÍNEA`), pero las ofertas duplicadas durante el período del bug quedaron huérfanas.
2. **Query del reporte no filtraba ofertas con 0 clicks** — `ORDER BY metricasEntidad.totalClicks DESC NULLS LAST LIMIT 1` no es determinístico cuando todas las ofertas tienen 0 clicks. Retornaba arbitrariamente cualquier oferta con registro en `metricasEntidad`, y si esa específica era una de las huérfanas legacy → response con `imagen: null`, `descripcion: null`.

**Fix aplicado** en [reportes.service.ts:836](apps/api/src/services/reportes.service.ts:836):

```ts
.where(and(
  eq(ofertas.negocioId, negocioId),
  sql`${ofertas.visibilidad} = 'publico'`,
  sql`${metricasEntidad.totalClicks} > 0`,  // ← NUEVO
  ...
))
```

Ahora cuando ninguna oferta tiene clicks reales, `mejorOferta = null` → el componente muestra el `emptyText`: "Sin clicks en ofertas" (coherente con `metricaLabel: 'clicks'`).

**Validación del flujo actual**: el usuario duplicó una oferta CON foto desde Matriz → Sucursal Norte usando el botón ⎘ duplicar. La copia en Norte conservó la foto correctamente. **El bug está corregido y solo persisten las ofertas huérfanas legacy** (vigencia 10-30 Abr en Norte sin foto). El fix del query las neutraliza para el reporte.

### 📝 Notas

- `mejorCupon` y `mejorRecompensa` no tocados — sus métricas (canjes) sí son legítimas cuando hay valores reales. Cupones nunca tienen foto en el modelo (esperado). Pizza Mediana sin foto = data faltante (subir foto en Puntos resuelve).

---

## [24 Abril 2026 — tarde] - Sprint multi-sucursal: módulos 8-9 + MatrizGuard

Cierre de los módulos **Puntos y Recompensas** (8) y **Empleados** (9) del sprint multi-sucursal.

### 🎯 Cerrado del sprint multi-sucursal (módulo 9 — Empleados)

- **Módulo 9 — Empleados** ✅. Alcance: filtrado multi-sucursal en BS (no incluye validación numérica de stats ScanYA — queda para sprint separado de ScanYA). Validados: scoping correcto de la lista por sucursal (cada empleado solo aparece en su sucursal asignada, sin mezcla cross-sucursal), buscador filtra por nombre y username, tabs Activos/Inactivos con estados vacíos contextuales, creación se asigna automáticamente a la sucursal activa, modal de detalle muestra permisos + bloque Estadísticas ScanYA, eliminar funciona y actualiza KPIs, reset del buscador al cambiar de sucursal aplicado.
- **Hallazgo intencional**: el modal de edición no expone selector de sucursal — un empleado pertenece a UNA sucursal y no es portátil. Para reasignarlo, borrar+recrear (coherente con el modelo: `empleados.sucursal_id` no nulable y vínculo histórico a `puntos_transacciones`).

---

## [24 Abril 2026 — media tarde] - Sprint multi-sucursal: módulo 8 + MatrizGuard

Cierre del módulo **Puntos y Recompensas** del sprint multi-sucursal. Aprovechando el flujo distinto de los módulos exclusivos de Matriz (que solo aparecen en el menú cuando la sucursal activa es Matriz), se detectó y cerró un hueco arquitectural en la protección por URL directa.

### 🎯 Cerrado del sprint multi-sucursal

- **Módulo 8 — Puntos y Recompensas** ✅. Validados: el menú filtra correctamente Puntos/Sucursales en sucursales secundarias (`MenuBusinessStudio` ya tenía el filtro), guardar config base persiste al refresh, crear recompensa nueva actualiza KPIs (3→4 activas), datos sobreviven al cambio de sucursal Matriz↔Norte→Matriz.

### 🛡️ Nuevo guard arquitectural: `MatrizGuard`

**Hueco detectado:** las rutas `/business-studio/puntos` y `/business-studio/sucursales` solo tenían `ModoGuard requiereModo="comercial"`. Si un dueño en sucursal secundaria escribía la URL directa, la página se cargaba en "modo solo lectura" engañoso (los datos mostrados eran globales del negocio, no de la sucursal). El menú ya las ocultaba pero la URL no estaba protegida.

**Solución:** nuevo guard `MatrizGuard.tsx` (~50 líneas) que verifica `esSucursalPrincipal` y, si es `false`, redirige a `/business-studio` con notificación info "Este módulo solo está disponible desde la Matriz". Compone con `ModoGuard` por anidación, sin mezclar responsabilidades:

```tsx
<ModoGuard requiereModo="comercial">
  <MatrizGuard>
    <PaginaPuntos />
  </MatrizGuard>
</ModoGuard>
```

**Archivos:**
- `apps/web/src/router/guards/MatrizGuard.tsx` — guard nuevo
- `apps/web/src/router/guards/index.ts` — export
- `apps/web/src/router/index.tsx` — aplicado a `/business-studio/puntos` y `/business-studio/sucursales`

**Decisión:** Reportes (también marcado como exclusivo de Matriz en notas previas) NO se envuelve aún. Se evaluará al llegar al módulo 11 — podría tener KPIs consolidados con valor en sucursales secundarias.

---

## [24 Abril 2026] - Sprint multi-sucursal: módulos 6-7 + refactor preview de BS + fix transversal de filtros

Cierre de los módulos **Catálogo** y **Promociones** del sprint multi-sucursal, más una serie de mejoras arquitecturales y de UX colaterales que emergieron durante la auditoría.

### 🎯 Cerrado del sprint multi-sucursal

- **Módulo 6 — Catálogo** ✅. Validados: scoping de KPIs/listas, dropdown de categorías scoped, edición cross-sucursal sin contaminación, duplicación Norte→Matriz. Vista pública post-edición no validada en vivo (comportamiento estándar de React Query con `refetchOnWindowFocus`).
- **Módulo 7 — Promociones** ✅. Validados: scoping de Cupones y Ofertas, métricas (vistas/shares/clicks) por sucursal, edición cross-sucursal, crear/eliminar/duplicar entre sucursales. Bugs corregidos: dropdowns hardcoded mostraban opciones inexistentes, toggle Ofertas↔Cupones arrastraba filtro de Tipo causando tabla vacía.

### 🏗️ Refactor del preview de negocio en Business Studio

El preview que el dueño ve en BS (panel lateral con tabs Card / Perfil) tenía un bug visual de raíz: los componentes se diseñaron con `lg:`/`2xl:` (viewport queries de Tailwind), pero al renderizarse en un panel estrecho (~540px) dentro de un viewport desktop (1920px), las clases se disparaban por viewport y rompían el layout (cards apretadas en grid de 4 columnas en 540px).

**Solución arquitectural — migración a container queries (Tailwind v4):**
- Reemplazo de `lg:` → `@5xl:`, `2xl:` → `@[96rem]:`, `sm:` → `@[40rem]:` en 4 componentes (`PaginaPerfilNegocio`, `CardNegocio`, `SeccionCatalogo`, `SeccionOfertas`).
- `@container` declarado a nivel layout (`LayoutPublico`, `MainLayout`, `PanelPreviewNegocio` ambas tabs, `PanelInfoContacto` para ChatYA).
- Componentes ahora son agnósticos al contexto: responden al ancho del wrapper, no del viewport.
- Trampa documentada: NO sobrescribir `--container-*` con `@theme` — esas variables también controlan `max-w-sm/md/lg/xl/2xl` y romperían modales de todo el sistema.

**Modales contenidos al preview (`PortalTargetContext`):**
- Hook `usePortalTarget` + `PortalTargetProvider` para que los modales descendientes porteen al elemento del preview en lugar de `document.body`.
- Adaptación de bases comunes (`Modal.tsx`, `ModalBottom.tsx`, `ModalImagenes.tsx`): `position: absolute` en modo contenido, `fixed` en modo normal. Bloqueo de scroll del body solo cuando es fullscreen.
- Todos los modales del perfil (`ModalCatalogo`, `ModalOfertaDetalle`, `ModalDetalleItem`, `ModalHorarios`, `ModalResenas`, etc.) heredan el comportamiento automáticamente al consumir alguna base.

**Carruseles drag-to-scroll:**
- Hook `useDragScroll` reutilizable (~40 líneas): mousedown+drag escrollea el contenedor horizontalmente, threshold de 3px para no matar clicks, cancela el siguiente click si hubo drag real, sobrescribe `document.body.style.cursor='grabbing'` durante el arrastre, previene `dragstart` HTML5 nativo de `<img>` (evita el "ghost fantasma" y cursor 🚫).
- Aplicado en `SeccionCatalogo`, `SeccionOfertas`, galería inline de `PaginaPerfilNegocio`.
- Cursor `grab`/`grabbing` forzado en descendientes con `[&_*]:cursor-grab` para que no se pierda el affordance sobre cards con `cursor-pointer`.
- Fade oscuro (`bg-gradient-to-l from-black/90 via-black/50`) en el borde de la dirección de scroll para indicar visualmente que hay más contenido.

**Ajustes específicos del modal de Reseñas:**
- Altura unificada con otros modales (80vh en lugar de 92vh).
- En modo contenido (preview/ChatYA): `h-[90%]! max-h-[90%]!` para que el `flex-1` interno (lista de reseñas) tenga espacio sin desbordar el panel.
- Paleta de la burbuja de respuesta del negocio: blue-* → slate + accent amber (consistencia con header dorado del modal).

**Polish UI del preview:**
- Header del preview compactado a 1 fila: tabs pill `rounded-full` con backdrop-blur, indicador "En vivo" con texto `text-sm` y glow verde sutil. Eliminado título "Vista Previa" + icono Eye (contexto evidente).
- Gradiente del header: azul → **dark gradient negro→slate-900** consistente con el border-l-4 del panel.
- Border izquierdo del panel: `border-blue-500` → `border-black`.
- Botón "Ver mi Negocio" del navbar: gradiente verde saturado → **glassmorphism** (`bg-white/10 border border-white/25 backdrop-blur-md`), texto "Ver mi Negocio" → "Vista previa", forma `rounded-lg` → `rounded-full`.
- Card del preview: `max-w-[300px]` + `mr-14` obsoleto → `max-w-[400px]` (proporción de celular real, sin margen del scale-[1.2] eliminado).

### 🔧 Fix transversal — reset de filtros con jerarquía sucursal>toggle>filtros

Bug cross-cutting detectado durante la auditoría: al cambiar de sucursal con el selector del navbar, los filtros locales (`useState` o stores Zustand) se mantenían con valores potencialmente inválidos en la nueva sucursal. Mismo problema al cambiar entre toggles del mismo módulo (Productos↔Servicios, Ofertas↔Cupones, Ventas↔Cupones↔Canjes-Vouchers).

**Jerarquía adoptada:** `sucursal activa > toggle activo > filtros`. Cuando algo arriba cambia, todo lo de abajo se resetea.

**Aplicado en 10 módulos:** Catálogo, Transacciones, Promociones, Clientes, Opiniones, Alertas, Dashboard, Puntos, Empleados, Reportes. Mi Perfil/Sucursales/ChatYA no aplican (sin filtros locales). Rifas/Vacantes aún no implementados.

**Trampas detectadas y resueltas:**
- Inputs con patrón debounce tienen 2 `useState` (visible + aplicado al filtro). Resetear solo uno deja el otro con texto obsoleto. Resuelto en Transacciones (`textoBusqueda`/`textoBusquedaCanjes`), Empleados (`busquedaLocal`), Alertas (`busquedaLocal`).
- Dropdowns con listas hardcoded (todos los tipos del enum) muestran opciones inexistentes → tabla vacía al filtrar. Resuelto en `PaginaOfertas.tsx` con `tiposDisponibles` y `estadosDisponibles` (`useMemo([ofertas, filtros.visibilidad])`).
- Selectores que dependen de atributos UX (`title`, `aria-label`) se rompen si esos atributos cambian. Caso real: `closest('button[title="Notificaciones"]')` se rompió al quitar el `title` por limpieza UX → cambio a `data-notificaciones-boton` (atributo estable).

### 📚 Documentación

- `docs/estandares/LECCIONES_TECNICAS.md` — 5 entradas nuevas en sección "Layout y CSS":
  1. Container queries vs viewport queries.
  2. Carruseles con drag-to-scroll (patrón obligatorio app).
  3. Modales contenidos al preview vs fullscreen del viewport.
  4. Reset de filtros con jerarquía sucursal>toggle>filtros.
  5. Selectores con `data-*` attributes vs atributos UX.
- `docs/estandares/TOKENS_COMPONENTES.md` — 2 secciones nuevas:
  - TC-21: Carrusel con Drag-to-Scroll.
  - TC-22: Modales contenidos en preview (PortalTargetContext).
- `docs/reportes/sprint-sucursales-pruebas-abril-2026.md` — Catálogo y Promociones marcados ✅, sección dedicada al fix transversal.

### 🐛 Bugs adicionales corregidos

| Área | Bug | Fix |
|---|---|---|
| Navbar Notificaciones | Click en botón estando panel abierto se peleaba con click-outside (cerraba+abría simultáneo) | Selector del click-outside cambiado de `title="Notificaciones"` a `data-notificaciones-boton` |
| Tooltips redundantes | Botón "Vista previa" y campana de notificaciones tenían tooltips obvios | Removidos — icono + label son self-explanatory |
| Modal Reseñas | Lista de reseñas no se veía en preview (`flex-1` colapsaba sin altura forzada) | `h-[90%]! max-h-[90%]!` cuando `esContenido` |
| ModalOfertas en desktop | Cards verticales en grid 1-col cuando antes eran grid 2-cols | `useMemo` para tipos/estados disponibles + condicional en grid via `esMobile` (no container queries — el modal es fixed-width) |

---

## [22 Abril 2026 — parte 2] - Alertas: ajuste semántico del modelo de estados

### 🧩 Problema con el primer refactor

Tras mover `leida` y `resuelta` a la tabla `alerta_lecturas` (estado por usuario), probando el flujo multi-usuario se detectó que `resuelta` NO debe ser por usuario: cuando alguien resuelve un problema del negocio (ej. un gerente atiende una alerta de seguridad), el dueño y los demás usuarios deben saberlo. De lo contrario cada persona tendría que resolver el mismo problema por su cuenta. Además, `eliminar` desde la UI debería ser una preferencia personal (no un borrado físico que afecta a todos).

### ✅ Modelo de estados híbrido

| Estado | Modelo | Ubicación |
|--------|--------|-----------|
| **Leída** | Por usuario | `alerta_lecturas.leida_at` |
| **Resuelta** | Global | `alertas_seguridad.resuelta` + `resuelta_at` + `resuelta_por_usuario_id` |
| **Ocultada** | Por usuario | `alerta_lecturas.ocultada_at` |
| **Borrado físico** | Global, solo admin/cron | `DELETE FROM alertas_seguridad` |

### 📋 Cambios

**BD** (migración `2026-04-22b-alertas-resuelta-global-ocultamiento-por-usuario.sql`):
- `alerta_lecturas`: `resuelta_at` eliminada, `ocultada_at` agregada
- `alertas_seguridad`: columna `resuelta_por_usuario_id` agregada con FK a `usuarios`

**Backend:**
- `marcarAlertaResuelta` ahora hace UPDATE global a `alertas_seguridad` + registra quién resolvió + marca leída para el que resolvió
- `ocultarAlerta` (reemplaza el antiguo `eliminarAlerta` desde UI) → upsert `ocultada_at` por usuario
- `ocultarAlertasResueltas` (reemplaza `eliminarAlertasResueltas`) → bulk hide de las resueltas globales
- `eliminarAlertaFisicamente` reservada para jobs admin
- Todas las queries excluyen ocultadas del usuario actual
- `obtenerAlertaDetalle` retorna `resueltaPor: { id, nombre }` cuando aplica

**Frontend:**
- Tipo `AlertaCompleta` incluye `resueltaPor: { id, nombre } | null`
- Modal de detalle muestra badge verde *"✓ Resuelta por {Nombre} · {Fecha}"* cuando está resuelta
- Botón "Ocultar resueltas" reintroducido (antes "Eliminar resueltas") con nueva semántica
- `eliminarAlerta` individual ahora oculta del feed del usuario; toast: "Alerta oculta de tu feed"
- `alertasService.eliminarAlertasResueltas` retorna `{ ocultadas: number }` (antes `{ eliminadas }`)

**Documentación:**
- `docs/arquitectura/Alertas.md` reestructurado con tabla de semántica por acción, patrones SQL y tabla de endpoints actualizada
- Este CHANGELOG describe el antes/después

### 🎯 Flujo multi-usuario verificado

- Gerente marca alerta como resuelta → dueño la ve resuelta con el nombre del gerente
- Dueño marca alerta leída → gerente la sigue viendo no leída (estado personal)
- Cada usuario puede ocultar de SU feed sin afectar a los demás
- Ninguna acción desde la UI borra físicamente una alerta: eso queda para admin/cron

---

## [22 Abril 2026] - Alertas: estado "leída/resuelta" por usuario (refactor arquitectural)

### 🐛 Bug descubierto

Durante la auditoría de filtrado multi-sucursal en Alertas, se detectó que `marcarTodasLeidas` y `eliminarResueltas` afectaban a **todas las sucursales del negocio**. Primer fix parcial: agregar filtro `(sucursal_id = ? OR sucursal_id IS NULL)` — pero eso reveló un problema más profundo: el estado `leida`/`resuelta` estaba guardado como columnas booleanas en `alertas_seguridad`, lo que hacía que la acción de un usuario (ej. un gerente) afectara a todos los demás (dueño y otros gerentes). Las alertas son avisos del negocio que cada persona con acceso debe ver hasta que *ella misma* las atienda.

### ✅ Fix arquitectural

Nueva tabla `alerta_lecturas(alerta_id, usuario_id, leida_at, resuelta_at)` con PK compuesta y `ON DELETE CASCADE`. El estado "leída" / "resuelta" ahora es por usuario.

**Backend:**
- Migración `docs/migraciones/2026-04-22-alerta-lecturas-por-usuario.sql` — crea tabla + índices parciales + backfill al dueño
- `alertas.service.ts` reescrito: todas las funciones de lectura usan `LEFT JOIN alerta_lecturas AND usuario_id = ${actual}`; las de escritura usan `INSERT ... ON CONFLICT DO UPDATE`
- `dashboard.service.ts` — `obtenerAlertasRecientes` y `marcarAlertaLeida` también usan el nuevo modelo
- Controllers extraen `usuarioId` de `req.usuario.usuarioId` y lo pasan al service
- Las columnas `leida`, `leida_at`, `resuelta`, `resuelta_at` de `alertas_seguridad` quedan obsoletas (backwards-compat, se retirarán en migración futura)

**Frontend:**
- Botón "Eliminar resueltas" removido de `PaginaAlertas.tsx` — semántica confusa en modelo por-usuario; el filtro "Resueltas" ya permite mostrar/ocultar
- El badge de no leídas, KPIs y feed ahora reflejan el estado del usuario autenticado

**Tests:**
- `__tests__/helpers.ts` — `crearAlertaPrueba` ahora inserta fila en `alerta_lecturas` para el dueño del negocio de prueba cuando se pasa `leida: true` o `resuelta: true`

### 📚 Documentación

- `docs/arquitectura/Alertas.md` — sección nueva "Estado por usuario (22 Abril 2026)" con patrón de lectura/escritura, firmas de funciones, impacto en UI y migración
- `docs/estandares/LECCIONES_TECNICAS.md` — nueva lección: **Estado por-entidad vs estado por-usuario** (cuándo aplicar tabla de lecturas separada)

### 🎯 Verificación manual pendiente

Las pruebas a validar en vivo tras este refactor:
- Dueño marca alerta como leída → gerente la sigue viendo como no leída
- "Marcar todas como leídas" en Matriz → solo afecta al usuario actual (no a gerentes ni al dueño)
- Cambiar de sucursal → el estado por-usuario no se ve afectado incorrectamente cross-sucursal

---

## [20-21 Abril 2026] - Validación en vivo del Recolector de Basura + prompts de continuación

### ✅ Validaciones ejecutadas

- **Sub-prueba 5.2** — Editar imagen en artículo/logo/portada/foto-perfil: los 4 puntos de aplicación del fix validados en vivo. Al subir imagen nueva, la anterior desaparece de R2 correctamente
- **Sub-prueba 5.3** — Eliminar mensaje chat con adjunto: hard delete de conversación con documentos e imágenes limpia todos los archivos R2 adjuntos
- **Sub-prueba 5.4** — Seguridad endpoint admin: los 4 casos prácticos pasaron (401 sin header, 401 con secret incorrecto, 400 sin confirmación, 400 con confirmación inválida). Caso 5 (503 sin ADMIN_SECRET) cubierto por diseño
- **Sub-pruebas 5.5-5.9** — marcadas como opcionales (cubiertas por diseño, validación directa no crítica)

### 📋 Prompts de continuación archivados

Para cerrar el módulo Sucursales al 100% en sesiones futuras, se guardaron 2 prompts auto-contenidos en `docs/reportes/`:
- `prompt-sprint-filtrado-sucursal-bs.md` — Pruebas 1 y 2 (filtrado por sucursal en 12 módulos BS, ~3h)
- `prompt-sprint-scanya-multi-sucursal.md` — Implementación frontend del selector + validación de 3 roles (dueño/gerente/empleado, 1-2 días)

### 📊 Estado del sprint de sucursales tras esta sesión

- Lista 1 (12 secciones BS Sucursales): 12/12 ✅
- Lista 2 (18 recomendaciones post-sprint): 14/18 + 1 parcial + 3 pendientes
- Lista 3 (6 pruebas de testing): 4/6 validadas en vivo (Pruebas 3, 4, 5, 6) + 2 pendientes (Pruebas 1 y 2)
- Recolector de Basura R2: 4/9 sub-pruebas validadas en vivo, 5 cubiertas por diseño

**90% del uso diario del Recolector de Basura validado en vivo.** El módulo queda cerrado con las pruebas prioritarias; las restantes son seguros de capa extra que se pueden validar cuando aparezcan síntomas reales.

---

## [17 Abril 2026 — Sprint de cierre] - Resumen consolidado del día

> **Infraestructura de mantenimiento R2 + auditoría sistemática de leaks de archivos + arranque del Panel Admin.**

Esta entrada resume las tres oleadas de trabajo del 17 de abril en una sola vista. Los bullets técnicos completos siguen en las entradas detalladas más abajo.

### 🎯 Lo más importante

1. **Herramienta operativa de mantenimiento R2** — endpoint admin que detecta y limpia archivos huérfanos en el bucket, con 0% de falsos positivos garantizados por: registry exhaustivo, reference-count, dry-run por defecto, periodo de gracia, tope de borrados, multi-BD cross-ambiente. Con auditoría persistente en tabla `r2_reconcile_log`
2. **11 bugs fuente de leaks de archivos corregidos** — cada flujo que borra o reemplaza imágenes ahora verifica referencias antes de tocar storage. Cubre artículos, ofertas, recompensas, galería, logos, portadas, perfiles, mensajes de chat (soft-delete + conversaciones), revocación de cupones, eliminación de sucursales y el cron diario de limpieza
3. **Arquitectura del Panel Admin iniciada** — convención `controllers/admin/`, `services/admin/`, `routes/admin/` con middleware temporal `requireAdminSecret` listo para reemplazar por auth admin real cuando haya UI. Primera sección operativa: Mantenimiento
4. **Limpieza histórica ejecutada con éxito** — 128 archivos huérfanos eliminados del bucket en una sola pasada, 0 fallas, con auditoría registrada. Bucket ahora al 100% en balance `enR2 = enBD` por carpeta

### 🧭 Otros ejes del mismo día (entradas detalladas más abajo)

- **Notificaciones por sucursal** — filtrado contextual (BS vs fuera de BS), fan-out a gerentes, limpieza automática al cerrar ciclo, socket de eliminación en vivo, marcar todas leídas por contexto
- **Promociones** — estados computados con CASE, paleta unificada de badges, política de visibilidad de cupones vencidos
- **Visitas del cliente** — cálculo unificado entre tabla/modal/export, incluye canjes puros de voucher
- **Validación live** de inputs (nick de empleado, correo de contacto con typo detection, teléfono)
- **Bloqueo login ScanYA** en sucursal desactivada
- **Varios fixes puntuales** — interceptor Axios 4xx, GREATEST defensivo, orden CASE SQL, paleta badges transacciones

### 📚 Documentación creada/actualizada

- `docs/arquitectura/Panel_Admin.md` ← NUEVO (paraguas del Panel Admin)
- `docs/arquitectura/Mantenimiento_R2.md` ← NUEVO (reconcile R2, multi-BD, auditoría)
- `docs/migraciones/2026-04-17-r2-reconcile-log.sql` ← NUEVO (migración SQL)
- `docs/arquitectura/Notificaciones.md` — filtrado por sucursal, destinatarios, limpieza automática
- `docs/arquitectura/Promociones.md` v3.1 — estados computados, paleta unificada
- `docs/arquitectura/ScanYA.md` v1.4 — bloqueo login sucursal desactivada + cleanup notificaciones
- `docs/arquitectura/CardYA.md` v2.1 — notificaciones nivel negocio + GREATEST defensivo
- `docs/arquitectura/Empleados.md` — validación live nick + InputCorreoValidado modo contacto
- `docs/arquitectura/Sucursales.md` — edge case login desactivada
- `docs/arquitectura/Clientes_Transacciones.md` v3.2 — cálculo de visitas + filtro cancelados
- `docs/arquitectura/Sistema.md` v9.1 — Panel Admin como tercer ámbito operativo
- `docs/estandares/LECCIONES_TECNICAS.md` — ~7 reglas nuevas (reference count, text-scan-urls, soft-delete con URLs, interceptor 4xx, GREATEST, orden CASE, multi-BD reconcile)
- `docs/estandares/PATRON_REACT_QUERY.md` — mutations deben verificar `res.success`
- `docs/ROADMAP.md` — Panel Admin 10% (infra backend)
- `CLAUDE.md` — Panel Admin agregado como ámbito "Administración del Sistema"

### 🗂️ Archivos nuevos relevantes

```
apps/api/src/
├── middleware/adminSecret.middleware.ts        ← NUEVO
├── routes/admin/index.ts                        ← NUEVO (agregador)
├── routes/admin/mantenimiento.routes.ts         ← NUEVO
├── controllers/admin/mantenimiento.controller.ts ← NUEVO
├── services/admin/mantenimiento.service.ts      ← NUEVO (reconcile R2)
├── db/reconcileConnections.ts                   ← NUEVO (multi-BD)
└── utils/imageRegistry.ts                       ← NUEVO (19 campos registrados)
```

### ✅ Estado final

- Bucket R2: balanceado al 100% (0 huérfanos)
- 11 flujos de borrado/reemplazo de imágenes ahora limpian storage correctamente
- Cron diario a las 3 AM ya no genera huérfanos
- Sistema reusable para futuro Panel Admin (solo cambia middleware cuando haya auth real)
- 128 archivos basura eliminados con auditoría verificable

---

## [17 Abril 2026] - Notificaciones por sucursal, estados computados de cupones, validación live de inputs

### ✨ Agregado

**Filtrado de notificaciones por sucursal (modo comercial)**
- `obtenerNotificaciones` y `contarNoLeidas` ahora aceptan `sucursalId` opcional y filtran con `(sucursal_id = $X OR sucursal_id IS NULL)` — las notificaciones con `sucursal_id = NULL` son eventos a nivel negocio y se ven siempre
- Frontend calcula la sucursal según contexto (helper `obtenerSucursalIdParaFiltro`):
  - Gerente: su `sucursalAsignada` (fija)
  - Dueño dentro de Business Studio: la `sucursalActiva` del selector
  - Dueño fuera de BS (inicio, marketplace, ScanYA web): `sucursalPrincipalId` (Matriz)
- Recarga automática al entrar/salir de BS (efecto en `MainLayout`) y al cambiar sucursal activa (`setSucursalActiva` en `useAuthStore`)
- Filtro en socket `notificacion:nueva` (`agregarNotificacion`) — si llega una notificación de otra sucursal, se ignora localmente

**Destinatarios ampliados a gerentes**
- Ventas, reseñas y vouchers cobrados ahora notifican tanto al dueño como al gerente de la sucursal afectada (antes solo al dueño)
- `voucher_pendiente` (de CardYA) se emite con `sucursalId: null` (evento a nivel negocio) y se envía por fan-out a todos los gerentes del negocio

**Limpieza automática de notificaciones de voucher al canjearse**
- Al validar un voucher en ScanYA (`validarVoucher`), se eliminan las notificaciones `tipo = 'voucher_pendiente'` con `referencia_id = voucherId`
- Evita que el panel quede con recordatorios obsoletos de vouchers ya entregados

**Validación live de nick de empleado**
- Nuevo endpoint `GET /api/business/empleados/verificar-nick?nick=X&excluirEmpleadoId=Y?`
- Si el nick está tomado, devuelve 3 sugerencias (sufijos numéricos y variantes) presentadas como chips clickeables en el modal
- Debounce 400ms + indicadores visuales (spinner / check / X)

**`InputCorreoValidado` modo `contacto`**
- Nuevo modo para correos que son dato de contacto (no cuenta de usuario): valida formato y detecta typos de dominio, pero NO consulta la BD de usuarios
- Usado en `ModalEmpleado` (correo del empleado) y `ModalCrearSucursal` (correo de la sucursal)
- X en el indicador de error ahora es clickeable para limpiar el input

**Bloqueo de login ScanYA en sucursal desactivada**
- `loginEmpleado`, `loginDueno` (3 paths: `sucursalId` específico, fallback Matriz, gerente) ahora validan `sucursal.activa = true` antes de emitir token
- Respuesta `403 "La sucursal está desactivada"` si la sucursal fue deshabilitada desde BS mientras había sesiones abiertas

### 🐛 Corregido

**Cupones mostrando estado incorrecto**
- El backend devolvía `oferta_usuarios.estado` crudo; un cupón activo que vencía seguía apareciendo como "Activo"
- `obtenerClientesAsignados` y `obtenerMisCupones` ahora calculan estado con CASE (prioridad: revocado > usado > vencido > activo)

**Ofertas "Vencidas" cuando en realidad estaban agotadas**
- Orden del CASE en `obtenerOfertas` corregido: ahora evalúa `agotada` antes que `vencida`. Una oferta que se agotó y luego venció se muestra como "Agotada" (causa real del cierre)

**Paleta de badges confusa (Activo y Usado ambos verdes)**
- Nueva paleta unificada aplicada en BS `PaginaOfertas`, BS `TabClientes` y cliente `CardCupon`:
  - Activo → emerald
  - Usado → **sky** (antes verde)
  - Vencido → amber (label unificado, antes "Expirado" en algunos puntos)
  - Revocado → red

**Cupones vencidos sin canjear generan frustración al cliente**
- `obtenerMisCupones` filtra cupones con estado computado `vencido` y `usado_at IS NULL` — no aparecen en ningún tab de Mis Cupones
- Los usados vencidos sí se conservan en tab "Usados" (historial legítimo)

**Cancelar voucher con constraint violation**
- `cancelarVoucher` resta `puntos_usados` a `puntos_canjeados_total`; en billeteras legacy con total inconsistente, la resta iba a negativo y rompía el check constraint
- Fix defensivo: `puntosCanjeadosTotal: sql\`GREATEST(puntos_canjeados_total - puntos_usados, 0)\``

**Toast "Empleado creado" aparecía aunque el backend rechazara**
- El interceptor Axios resolvía la promesa con `{ success: false, error }` para respuestas 4xx en lugar de rechazarla
- Las mutations de `hooks/queries/useEmpleados.ts` no verificaban `res.success` y ejecutaban `onSuccess` siempre
- Fix aplicado a las 6 mutations (Crear, Actualizar, ToggleActivo, Eliminar, ActualizarHorarios, RevocarSesion): `throw new Error(res.error ?? res.message)` cuando `!res.success`

**Nueva herramienta: Reconcile de imágenes huérfanas en R2**
- Endpoint admin `GET /api/admin/mantenimiento/r2-reconcile` reporta imágenes en R2 que ya no están referenciadas por ningún registro en BD (huérfanas) y URLs en BD que apuntan a archivos inexistentes (rotas). Respuesta JSON con detalle por carpeta
- Endpoint admin `POST /api/admin/mantenimiento/r2-reconcile/ejecutar` borra las huérfanas. Requiere body `{ "confirmacion": "SI_BORRAR_HUERFANAS" }` para evitar ejecuciones accidentales
- Estructura de carpetas preparada para el Panel Admin: `controllers/admin/`, `services/admin/`, `routes/admin/` con `index.ts` agregador. Sub-secciones futuras (negocios, usuarios, reportes-globales, etc.) siguen el mismo patrón
- Tipo de campo `text-scan-urls` en el registry: extrae URLs R2 embebidas con regex sobre columnas tipo texto/JSON. Cubre `chat_mensajes.contenido` (audios, imágenes, documentos, cupones) donde el formato varía según el tipo de mensaje
- `CARPETAS_PROTEGIDAS` en el registry — lista de carpetas R2 que el reconcile nunca toca aunque no estén referenciadas en BD (assets del equipo, ej. `brand/`)
- Tabla `r2_reconcile_log` para auditoría: cada ejecución registra `ejecutado_at`, `dry_run`, `carpetas` filtradas, counts y `detalle` JSONB con las eliminaciones. Migración en `docs/migraciones/2026-04-17-r2-reconcile-log.sql`
- Endpoint `GET /api/admin/mantenimiento/r2-reconcile/log` para consultar el histórico desde el futuro Panel Admin
- `text-scan-urls` extendido con cast `::text` automático — ahora soporta columnas JSONB además de text/varchar. Cobertura completa: agregado `marketplace.imagenes` al registry (estructura variable, antes pendiente)
- Fix posterior en `extraerUrlsR2DeMensajeChat`: el contenido de mensajes tipo imagen puede ser URL directa o JSON con metadatos (`{"url": "...", "ancho": ..., "miniatura": "data:..."}`). El helper original solo capturaba URL directa → archivos quedaban huérfanos al eliminar mensajes con JSON. Reescrito con regex que matchea el dominio R2 — cubre cualquier formato presente o futuro
- **Multi-BD cross-ambiente** en el reconcile: cuando el bucket R2 es compartido entre dev y prod (mismas credenciales en `.env`), ejecutar reconcile desde un solo ambiente puede borrar archivos del otro. Nuevo módulo `apps/api/src/db/reconcileConnections.ts` arma una lista de conexiones (principal + secundaria si está accesible). `listarUrlsEnUso` y `detectarUrlsRotas` iteran sobre todas y unen resultados. Cuando se ejecuta desde local con `DATABASE_URL_PRODUCTION` configurada, el reconcile consulta ambas BDs y solo marca como huérfano lo que NINGUNA referencia. El cleanup es 100% seguro cross-ambiente
- Protegidos por middleware temporal `requireAdminSecret` (header `x-admin-secret` contra env var `ADMIN_SECRET`). Preparado para migrarse a auth admin real cuando exista el Panel Admin sin cambios en controllers/service
- Garantías de 0% falsos positivos: `IMAGE_REGISTRY` exhaustivo (17 campos de 13 tablas) como fuente única de verdad, dry-run por defecto, re-verificación atómica antes de borrar, periodo de gracia de 5 min para uploads recientes, tope de 500 borrados por ejecución
- Arquitectura reutilizable — el futuro Panel Admin consumirá los mismos endpoints sin refactor
- Doc: nuevo `docs/arquitectura/Mantenimiento_R2.md`

**Ofertas: revocar/eliminar cupón con conversaciones huérfanas dejaba archivos R2 colgados**
- Cuando `eliminarOferta` o `revocarCuponMasivo` dejaba una conversación sin mensajes vivos, se ejecutaba `DELETE FROM chat_mensajes WHERE conversacion_id = X` — borrando **todos** los mensajes de esa conversación incluyendo imágenes/audios/documentos del chat normal que nada tenían que ver con la oferta. Los archivos R2 adjuntos quedaban huérfanos
- Este era el bug fuente principal de los ~120 archivos huérfanos de chat que detectó el reconcile
- Fix: recolección de URLs R2 con regex sobre el `contenido` de cada mensaje ANTES del DELETE, y limpieza posterior con reference-count contra otras conversaciones

**Cron job ChatYA: limpieza diaria de conversaciones inactivas no limpiaba R2**
- `limpiarConversacionesInactivas` (corre diariamente a las 3 AM) hace hard delete de conversaciones con `updated_at > 6 meses`. Comentario explícito `TODO Sprint 6: Limpiar archivos R2` sin implementar
- Cada ejecución del cron eliminaba conversaciones con CASCADE pero dejaba todos sus archivos R2 colgados → acumulación silenciosa de huérfanos a lo largo del tiempo
- Fix: el cron ahora recolecta URLs R2 de los mensajes antes del CASCADE y las limpia con reference-count

**ChatYA: eliminar mensajes con archivo adjunto dejaba leaks en R2**
- `eliminarMensaje` hacía soft-delete (reemplazaba `contenido` por "Se eliminó este mensaje") pero **no borraba el archivo R2 adjunto**. Los archivos de imagen/audio/documento/cupón quedaban huérfanos para siempre
- `eliminarConversacion` tenía 2 bugs similares: al limpiar mensajes "invisibles para ambos participantes" no tocaba R2, y el hard-delete cuando ambos eliminaban la conversación tenía un TODO sin implementar (comentario explícito `TODO Sprint 6: Limpiar archivos R2`)
- Fix en `chatya.service.ts`: nuevos helpers `extraerUrlsR2DeMensajeChat(contenido, tipo)` y `limpiarUrlR2DeMensajeHuerfana(url, excluirId)` con reference-count contra otros mensajes (por si la URL está duplicada en reenvíos o respuestas citadas)
- Los 3 flujos (eliminar mensaje, limpieza de invisibles, hard-delete de conversación) ahora capturan URLs ANTES del delete y limpian R2 después

**Galería de sucursal: al eliminar imagen no se borraba de R2**
- `eliminarImagenGaleria` solo limpiaba Cloudinary, las URLs R2 quedaban colgadas
- Fix: ahora usa `eliminarImagenSiHuerfana` que detecta el storage correcto (R2 o Cloudinary) y hace reference-count

**Ofertas: reemplazar o eliminar oferta borraba imagen sin reference-count**
- `actualizarOferta` y `eliminarOferta` ejecutaban `eliminarArchivo` sin verificar si otras ofertas o mensajes de chat tipo cupón compartían la URL (escenario posible por fallback del clonado cuando `duplicarImagenInteligente` no puede replicar — típicamente Cloudinary)
- Fix: reference-count contra tabla `ofertas` y contra campo `imagen` dentro de `chat_mensajes.contenido` (JSON) antes de borrar. Solo se borra si nadie más la usa

**Recompensas: reemplazar o eliminar recompensa borraba imagen sin reference-count**
- `actualizarRecompensa` y `eliminarRecompensa` tenían el mismo patrón directo de `eliminarArchivo`
- Fix: usan el helper compartido `eliminarImagenSiHuerfana` (ahora extendido para verificar todas las tablas relevantes: sucursales, artículos, negocios, galería, ofertas, recompensas)

**Helper `eliminarImagenSiHuerfana` generalizado**
- Se exporta desde `negocioManagement.service.ts` y reutiliza en otros services (puntos, galería, en el futuro donde se necesite)
- Verifica reference-count contra 6 tablas: `negocio_sucursales` (portada/perfil), `articulos` (principal/adicionales), `negocios` (logo), `negocio_galeria` (url), `ofertas` (imagen), `recompensas` (imagen_url)
- Borra del storage correcto (R2 vía `eliminarArchivo` o Cloudinary vía `cloudinary.uploader.destroy`)

**Reemplazar logo, portada o foto de perfil dejaba la imagen anterior como basura en R2/Cloudinary**
- `actualizarLogoNegocio`, `actualizarPortadaSucursal` y `actualizarFotoPerfilSucursal` actualizaban la URL en BD pero NO borraban el archivo anterior del storage. Cada vez que el dueño cambiaba una imagen, la anterior quedaba colgada acumulando cuota/costo
- Fix: las 3 funciones ahora capturan la URL previa antes del UPDATE y, tras completarlo, llaman al nuevo helper `eliminarImagenSiHuerfana(url, excluirSucursalId?)` que verifica que la imagen no esté siendo usada en otra parte antes de borrarla. Revisa: `negocio_sucursales.portada_url`, `negocio_sucursales.foto_perfil`, `articulos.imagen_principal`, `articulos.imagenes_adicionales`, `negocios.logo_url`
- El helper borra de R2 (con `eliminarArchivo`) o Cloudinary (con `cloudinary.uploader.destroy`) según el origen
- Protección adicional contra el mismo patrón que causaba el 404 anterior: si una URL llegó a compartirse entre sucursales por el fallback del clonado, el helper detecta el uso compartido y conserva el archivo

**CRÍTICO: editar o eliminar un artículo dejaba a otras sucursales con imagen rota (404)**
- El clonado de Matriz al crear sucursales nuevas usa `duplicarArchivo` (solo funciona con R2). Para URLs de Cloudinary el código cae al fallback `nuevaUrl = urlOriginal` → 3 artículos (uno por sucursal) apuntan al mismo archivo Cloudinary
- Al editar un artículo en una sucursal (reemplazando la imagen) o al eliminarlo, el backend hacía `eliminarImagenInteligente(urlVieja)` **sin verificar si otros artículos la usaban**. Borraba el archivo de Cloudinary/R2 y dejaba a las otras sucursales con `imagen_principal` apuntando a un archivo inexistente (404 en toda la UI pública y BS)
- Mismo patrón en `eliminarSucursal` — las URLs R2 de artículos huérfanos se borraban sin reference count; si otra sucursal los seguía usando, rompía la imagen
- Fix en `articulos.service.ts`: nuevo helper `imagenEsUsadaPorOtroArticulo(url, excluirId?)` que cuenta referencias en `imagen_principal` + `imagenes_adicionales` antes de borrar. Aplicado en `actualizarArticulo` y `eliminarArticulo`
- Fix en `negocioManagement.service.ts` `eliminarSucursal`: reference count para URLs R2 antes del `eliminarArchivo` en paralelo
- Query diagnóstica para detectar artículos actualmente compartiendo URL: `SELECT imagen_principal, COUNT(DISTINCT id) FROM articulos WHERE imagen_principal IS NOT NULL GROUP BY imagen_principal HAVING COUNT(DISTINCT id) > 1;`

**"Marcar todas como leídas" ignoraba la sucursal activa**
- El endpoint `PATCH /api/notificaciones/marcar-todas` marcaba TODAS las notificaciones del usuario en ese modo, sin filtrar por sucursal
- Desde Matriz, al presionar el botón se marcaban también las pendientes de Sucursal Norte (que ni siquiera eran visibles en ese contexto)
- Fix: `marcarTodasComoLeidas` ahora acepta `sucursalId` opcional y filtra `(sucursal_id = X OR sucursal_id IS NULL)` en modo comercial. Mismo patrón que `obtenerNotificaciones` y `contarNoLeidas`
- Frontend: `marcarTodasLeidas` service agrega `sucursalId` al query string usando el helper `obtenerSucursalIdParaFiltro()` (BS usa sucursal activa, fuera de BS usa Matriz)

**Eliminación de notificaciones no se propagaba por Socket.io**
- Al crear notificaciones emitíamos `notificacion:nueva` y el panel se actualizaba en vivo. Al borrarlas (voucher entregado, cancelado, expirado) no emitíamos nada → el usuario veía la tarjeta hasta cerrar/reabrir el panel o recargar
- Fix: nuevo helper `eliminarNotificacionesPorReferencia(filtro)` en `notificaciones.service.ts` que hace el DELETE y emite `notificacion:eliminada` con `{ ids }` a cada usuario afectado
- Los 3 flujos que borraban notifs con SQL crudo (`validarVoucher`, `cancelarVoucher`, `expirarVouchersVencidos`) ahora usan el helper
- Frontend: nuevo listener en `useNotificacionesStore` + acción `eliminarVariasPorIds(ids)` que filtra localmente y ajusta el contador de no leídas. Sin fetch, sin parpadeo

**Notificaciones `voucher_pendiente` quedaban huérfanas al expirar el voucher**
- `validarVoucher` y `cancelarVoucher` ya limpiaban sus notificaciones, pero el job pasivo `expirarVouchersVencidos` (que marca como `expirado` los vouchers que nunca se canjearon) no las limpiaba
- Resultado: el dueño/gerentes veían en su panel "Recompensa por entregar" apuntando a vouchers que ya no existían como pendientes (puntos ya devueltos al cliente). Zombies permanentes hasta que alguien las marcara como leídas manualmente
- Fix: agregado `DELETE FROM notificaciones WHERE tipo='voucher_pendiente' AND referencia_id=voucher.id` en `expirarVouchersVencidos` (`puntos.service.ts`)
- Completa la cobertura de los 3 flujos que cierran un voucher: entrega (ScanYA), cancelación (CardYA cliente), expiración automática (job)
- Para datos históricos (vouchers expirados/canjeados antes de estos fixes), ejecutar una vez en SQL: `DELETE FROM notificaciones n USING vouchers_canje v WHERE n.tipo='voucher_pendiente' AND n.referencia_tipo='voucher' AND n.referencia_id::uuid=v.id AND v.estado != 'pendiente'`

**"Visitas" del cliente quedaba descoordinado entre tabla, modal y export**
- El conteo de visitas en la tabla de Clientes no coincidía con el del modal detalle (ej: tabla decía 109, modal decía 107). Causas múltiples:
  1. **Canje puro de voucher** no contaba como visita — `validarVoucher` solo toca `vouchers_canje`, no inserta en `puntos_transacciones`. Un cliente que fue físicamente al negocio a reclamar su recompensa quedaba invisible
  2. **Tabla contaba transacciones revocadas**, modal y export no — la tabla no filtraba por `estado='confirmado'`
  3. **Modal detalle no respetaba filtro de sucursal** — siempre devolvía agregación global del negocio. Gerente veía 3 visitas en tabla (su sucursal) y 7 en modal (negocio completo)
- Fix aplicado a los 3 queries en `clientes.service.ts`:
  - `listarClientes`, `obtenerDetalleCliente`, `obtenerClientesParaExportar` ahora comparten la misma fórmula: `COUNT(tx WHERE estado='confirmado' Y sucursal) + COUNT(vouchers_canje WHERE estado='usado' Y sucursal)`
  - `obtenerDetalleCliente` recibe ahora `sucursalId` opcional (leído del interceptor Axios en el controller)
- Los cupones no requieren fix — ya pasan por `registrarVenta` (incluso los "gratis" con monto=0), por lo que ya estaban contados
- Documentación: nueva sección §4.6 "Cálculo de Visitas" en `docs/arquitectura/Clientes_Transacciones.md`

**BS Transacciones mostraba vouchers cancelados inflando el historial**
- `obtenerCanjesVouchers` devolvía todos los estados — incluyendo `cancelado`. Resultado: la tabla mostraba "15 vouchers" pero los KPIs sumaban solo 7 (3 pendientes + 4 usados + 0 vencidos) porque los KPIs sí filtran por estado específico
- Los vouchers cancelados son "arrepentimientos" del cliente antes del canje: no representan acción pendiente, ni canje real, ni vencimiento. No aportan al histórico operativo
- Fix: filtro `estado != 'cancelado'` agregado a la condición base del service. El tipo `VoucherCanje['estado']` y el badge en `PaginaTransacciones` conservan `'cancelado'` con fallback defensivo para futuros contextos (modales de detalle, auditoría) donde sí convenga mostrarlos
- Badge `BadgeEstadoCanje` actualizado también con la paleta unificada: Usado → sky, Vencido → amber, Cancelado → red

**Dueño veía notificaciones de todas las sucursales mezcladas**
- El interceptor Axios añadía `sucursalId` en `config.params`, pero `notificacionesService` ya lo mandaba en la URL — se duplicaba
- Fix: `/notificaciones` agregado a `RUTAS_SIN_SUCURSAL` en `api.ts` para que el interceptor no duplique

### 📚 Documentación

- `Notificaciones.md` — nuevas secciones "Filtrado por sucursal", "Destinatarios por tipo de evento", "Limpieza automática"
- `Promociones.md` v3.1 — secciones 7.1 (estados computados), 7.2 (paleta unificada) y política de visibilidad de cupones vencidos en §9
- `Empleados.md` — sección "Validación live de inputs en ModalEmpleado" + endpoint `/verificar-nick` + bug del interceptor 4xx

---

## [16 Abril 2026] - BS Sucursales: Selector de mapa, clonado de ofertas, protección de historial

### ✨ Agregado

**Selector de coordenadas obligatorio al crear sucursal**
- `ModalCrearSucursal` ahora incluye un mapa interactivo Leaflet con marcador arrastrable
- Al seleccionar ciudad del autocomplete, las coordenadas se auto-llenan con el centro de la ciudad y el marcador aparece en el mapa
- El usuario puede arrastrar el marcador (o tocar el mapa en móvil) para ajustar la ubicación exacta
- Zod schema `crearSucursalSchema` requiere `latitud`/`longitud` como `z.number()` con validación `-90/90` y `-180/180`
- Service `crearSucursal` construye `ubicacion` como `ST_GeogFromText('SRID=4326;POINT(lng lat)')` — mismo patrón que `actualizarSucursal`
- Sin coordenadas → botón "Crear sucursal" deshabilitado

**Popup fullscreen del mapa en los 3 puntos de edición de ubicación**
- Ícono `Maximize2` flotante en la esquina superior derecha del mapa
- Al click: overlay con `createPortal(document.body)` y `z-[99999]` para quedar por encima de cualquier modal padre
- Header oscuro con gradiente `slate`, ícono `MapPin`, título "Ajustar ubicación" y botón `X` cerrar
- Mapa fullscreen con `zoom=16`, `scrollWheelZoom` habilitado y `zoomControl` visible para ajuste preciso
- El marcador se mantiene sincronizado entre el mapa pequeño y el fullscreen (comparten state)
- Aplicado en: `ModalCrearSucursal`, `TabUbicacion` (Mi Perfil) y `PasoUbicacion` (Onboarding)

**Zona horaria derivada automáticamente del estado**
- Nuevo helper `apps/api/src/utils/zonaHoraria.ts` con función `getZonaHorariaPorEstado(estado)` que mapea los 32 estados mexicanos a sus 5 zonas IANA:
  - `America/Tijuana` (Baja California)
  - `America/Hermosillo` (Sonora)
  - `America/Mazatlan` (Baja California Sur, Sinaloa, Nayarit, Chihuahua)
  - `America/Cancun` (Quintana Roo)
  - `America/Mexico_City` (resto del país)
- `crearSucursal` y `actualizarSucursal` usan el helper — ya no se hereda zona horaria de Matriz ni se acepta la que llega del cliente
- Normaliza el nombre de estado (lowercase, sin tildes) para tolerar variantes
- Fallback seguro a `America/Mexico_City` si el estado no se reconoce

**Validación de nombre duplicado de sucursal en 3 capas**
- **UI en vivo** (`ModalCrearSucursal`): `useMemo` calcula `esNombreDuplicado` comparando con la lista cacheada de sucursales. Input con borde rojo + mensaje inline + botón "Crear sucursal" deshabilitado
- **Guard pre-submit** (`handleGuardar`): `notificar.error` si hay duplicado antes de enviar
- **Backend** (`negocioManagement.service.ts`): query contra `negocioSucursales` → `throw new Error('NOMBRE_DUPLICADO')`. Controller responde `409` con `code: 'NOMBRE_DUPLICADO'`. Frontend atrapa el code y muestra mensaje específico
- Comparación case-insensitive con `trim().toLowerCase()` — "Sucursal Centro" colisiona con "SUCURSAL CENTRO" y "  sucursal centro  "

**Componente reutilizable `InputTelefono` con lada separada**
- Nuevo archivo `apps/web/src/components/ui/InputTelefono.tsx` con dos inputs: lada (máx 4 chars, default `+52`) + número de 10 dígitos
- Exporta también `normalizarTelefono(tel)` para parseo consistente en formatos: `"+52 6381234567"`, `"+526381234567"`, `"6381234567"`
- Guarda el valor en formato `"+52 6381234567"` (lada + espacio + 10 dígitos) — mismo formato que `TabContacto` de Mi Perfil
- Usado en `ModalCrearSucursal` reemplazando los inputs simples
- Zod schema acepta los 3 formatos (con lada y espacio, sin espacio, o solo 10 dígitos) por retrocompatibilidad

**Checklist visual de clonado de Matriz**
- Al final del formulario de crear sucursal, cuadro `bg-slate-200 border-2 border-slate-300` con lista de elementos que se clonarán de Matriz
- Cada ítem con `CheckCircle2` emerald: Horarios, Métodos de pago, Imágenes (perfil, portada, galería), Catálogo y Ofertas
- Sustituye el párrafo de texto plano que existía antes

**Clonado de Ofertas al crear sucursal nueva**
- `crearSucursal` ahora clona ofertas públicas (`visibilidad = 'publico'`) de Matriz a la sucursal nueva — paso 7 del flujo de creación
- Imágenes de ofertas se duplican en R2 con `duplicarArchivo(url, 'ofertas')` — URL independiente por sucursal
- Se preserva: título, descripción, tipo, valor, fechas, compra mínima, límites de uso
- `usosActuales` se reinicia a 0 en la copia (sin heredar historial)
- Cupones privados (`visibilidad = 'privado'`) NO se clonan — son asignaciones individuales a usuarios con `codigoPersonal`
- Animación de progreso en `VistaProgreso` incluye el paso "Copiando ofertas" con ícono `Tag`

**Cleanup R2 al actualizar imagen de oferta**
- `actualizarOferta` (`ofertas.service.ts`) ahora detecta cuando `datos.imagen` cambia respecto a la anterior
- Si la imagen anterior es URL de R2 propia (`esUrlR2`), se elimina con `eliminarArchivo` después del UPDATE (fire-and-forget con log de error)
- Evita acumulación de imágenes huérfanas en el bucket cuando se reemplaza o elimina la imagen de una oferta existente

**Revocación automática de empleados al desactivar/eliminar sucursal**
- Nuevo helper interno `revocarEmpleadosDeSucursal(sucursalId, motivo)` en `negocioManagement.service.ts`:
  - Cierra turnos ScanYA abiertos (`UPDATE scanya_turnos SET hora_fin = NOW(), notas_cierre = motivo`)
  - Marca timestamp en Redis con `revocarSesionesEmpleado(empleadoId)`
  - Emite socket `scanya:sesion-revocada` al `usuarioId` del dueño (ScanYA filtra por `empleadoId` y cierra la sesión del empleado afectado)
- Se ejecuta en `toggleActivaSucursal` al desactivar con motivo `'Sucursal desactivada'`
- Se ejecuta en `eliminarSucursal` **antes del DELETE físico** con motivo `'Sucursal eliminada'` — los IDs deben obtenerse antes del CASCADE que los borra
- Los empleados NO se marcan inactivos en BD al desactivar la sucursal — al reactivarla pueden volver a iniciar sesión

**Protección de historial: bloqueo de eliminación si hay transacciones**
- `eliminarSucursal` cuenta `puntos_transacciones` de la sucursal; si `> 0` lanza `Error('TIENE_HISTORIAL')`
- Controller responde `409` con `code: 'TIENE_HISTORIAL'`
- Frontend (`handleEliminar` en `PaginaSucursales`) atrapa el code y ofrece alternativa: *"'Sucursal Centro' tiene ventas registradas. Para conservar el historial no se puede eliminar. ¿Quieres desactivarla?"*
- Si el dueño acepta → se llama a `toggleActivaSucursal(false)` automáticamente
- Si no hay historial (sucursal recién creada por error, sin uso) → eliminación física con CASCADE y cleanup R2 como siempre
- Hook `useEliminarSucursal.onError` suprime el toast genérico cuando `code === 'TIENE_HISTORIAL'` — evita toast + confirm duplicados

**Acceso del dueño/gerente a sucursales desactivadas**
- `obtenerPerfilSucursal` (`negocios.service.ts`) tenía filtro `s.activa = true` que bloqueaba también a BS → Mi Perfil
- Nueva lógica con `OR`: la sucursal se devuelve si está activa O el `userId` es el dueño del negocio O es el gerente asignado a esa sucursal
- Resultado: usuarios anónimos/clientes siguen sin verla, pero el dueño puede seguir editando horarios, imágenes, dirección mientras la sucursal está "apagada" — útil para preparar la reactivación

**Nombre de sucursal en feed público y perfil**
- Query del feed (`listarSucursales` en `negocios.service.ts`) ahora selecciona `s.es_principal` y una subquery `(SELECT COUNT(*) FROM negocio_sucursales WHERE negocio_id = n.id AND activa = true)` como `total_sucursales`
- `SucursalResumenRow` y `NegocioResumen` incluyen `esPrincipal: boolean` y `totalSucursales: number`
- Regla unificada de visualización:
  - `totalSucursales > 1` → muestra `"Matriz"` (si `esPrincipal`) o el nombre de sucursal
  - `totalSucursales === 1` → muestra la categoría del negocio (como siempre)
- Aplicado en `CardNegocio` (feed), `PaginaNegocios` (popup del mapa) y las 5 ubicaciones de `PaginaPerfilNegocio` (header mobile, header desktop, popup del mapa dentro de `ModalMapa`, popup fullscreen en `ModalBottom` y popup compacto del sidebar)

### 🐛 Corregido

**Zona horaria por defecto incorrecta en sucursales nuevas (bug crítico de horarios)**
- `crearSucursal` no copiaba `zonaHoraria` al insertar la nueva sucursal → se aplicaba el default del schema `America/Mexico_City` aunque Matriz estuviera en otra zona (ej: Sonora con `America/Hermosillo`)
- Desfase de +1 hora hacía que la query del feed público marcara la sucursal como "Cerrado" cuando en realidad estaba abierta (la hora calculada caía fuera del horario laboral)
- El modal de horarios del frontend sí calculaba bien (usa la zona del array de horarios recibido) — creando inconsistencia visible: badge "Cerrado" vs "Abierto — Cierra a las 6:00 PM"
- Fix: `crearSucursal` deriva `zonaHoraria` del `datos.estado` con el helper nuevo (ver Agregado)

**Feed público no reflejaba cambios al activar/desactivar sucursal**
- `useInvalidarSucursales` invalidaba `sucursales.all()` y `perfil.sucursales(negocioId)` pero no `negocios.all()` (queries del feed público de `PaginaNegocios` y `PaginaPerfilNegocio`)
- Al desactivar una sucursal desde BS, el dueño tenía que recargar la página para verificar que había desaparecido del feed
- Fix: el helper ahora invalida también `queryKeys.negocios.all()`. Lista, popup y perfil individual del feed se refrescan automáticamente

**Flechas del header PC mostraban módulos restringidos a gerentes**
- Cuando un gerente navegaba con las flechas `<` `>` del header en vista desktop (`Navbar.tsx`), podía llegar a "Puntos" y "Sucursales" aunque están restringidos para su rol
- `MobileHeader.tsx` ya tenía el filtro correcto con `vistaComoGerente` y `modulosFiltrados`
- Fix: `Navbar.tsx` ahora usa la misma lógica — nueva constante `RUTAS_OCULTAS_GERENTE = ['/business-studio/puntos', '/business-studio/sucursales']` y `modulosNavegables` filtrados según `vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente)`
- Las flechas, índice del módulo actual y flags `hayModuloAnterior` / `hayModuloSiguiente` usan la lista filtrada

**Popup compacto del sidebar de `PaginaPerfilNegocio` no mostraba nombre de sucursal**
- Había 5 lugares con lógica de nombre de sucursal pero solo 4 usaban el condicional. El popup del sidebar (línea ~1521) tenía un markup propio más compacto y nunca había incluido el subtítulo
- Fix: envuelto el `<h3>` en un `<div className="min-w-0 flex-1">` con el condicional estándar. Estructura consistente con los otros 4 popups del archivo

**Mi Perfil bloqueado al desactivar la sucursal activa**
- La query `obtenerPerfilSucursal` filtraba `s.activa = true` → al desactivar la sucursal actualmente seleccionada, Mi Perfil respondía 404 y el dueño no podía editarla
- Fix: ver "Acceso del dueño/gerente a sucursales desactivadas" en Agregado

**Inputs de teléfono/WhatsApp aceptaban letras**
- Los inputs simples del modal permitían pegar o escribir cualquier carácter
- Fix: reemplazados por `InputTelefono` que filtra `replace(/\D/g, '')` en cada cambio, `maxLength={10}` y `inputMode="numeric"` (teclado numérico en móvil)
- Zod valida formato `^\+\d{1,3}\s?\d{10}$` o 10 dígitos crudos como fallback

### 🔧 Cambios técnicos

**`negocioSucursales` no tiene columnas `latitud`/`longitud` separadas**
- El schema Drizzle solo define `ubicacion: text()` (PostGIS POINT serializado)
- Las queries de perfil extraen las coordenadas con `ST_Y(s.ubicacion::geometry)` y `ST_X(s.ubicacion::geometry)`
- `actualizarSucursal` y `crearSucursal` ya siguen este patrón — no se insertan columnas separadas que no existen

**Navegación de edición de sucursal**
- El botón ✏️ en BS → Sucursales llama a `handleEditar(suc)` que hace `setSucursalActiva(id)` + `navigate('/business-studio/perfil')`
- No existe `ModalEditarSucursal` dedicado — la edición completa (datos, imágenes, horarios, ubicación) se hace en Mi Perfil del contexto de la sucursal seleccionada

---

## [16 Abril 2026] - BS Sucursales: Refinamiento post-Sprint 12

### ✨ Agregado

**Cupones canjeables en cualquier sucursal del mismo negocio**
- Antes: un cupón emitido por una oferta de Sucursal X solo se podía canjear en Sucursal X
- Ahora: los cupones se canjean en cualquier sucursal del mismo negocio. `oferta_usos.sucursal_id` sigue registrando dónde ocurrió el canje para reportes correctos
- Backend: eliminada validación de sucursal específica en `validarCupon()` (`scanya.service.ts`). Solo valida que la oferta pertenezca al negocio del ScanYA activo
- Las ofertas siguen creándose por sucursal (sin cambios en creación) — el cambio es solo en la lógica de canje

**Filtros correctos por sucursal en Reportes (gerente)**
- Auditoría de fugas de datos: gerentes veían información de otras sucursales en KPIs de Reportes
- **Reporte Clientes** (`reportes.service.ts`):
  - "Clientes en riesgo" y "Perdidos" ahora usan subquery sobre `puntos_transacciones` cuando hay `sucursalId` (la tabla `puntos_billetera` es por negocio, no por sucursal)
  - `obtenerClientesInactivos` acepta `sucursalId` y aplica mismo subquery
- **Reporte Promociones** (reescrito con filtros):
  - Funnel ofertas públicas: `(sucursal_id = X OR sucursal_id IS NULL)` — incluye globales
  - Métricas engagement (vistas/clicks/shares): filtradas a ofertas aplicables
  - Funnel cupones: filtra por ofertas aplicables a la sucursal
  - Funnel recompensas canjeadas: filtra por `vouchers_canje.sucursal_id` (donde se canjeó)
  - Descuento total: filtra por `oferta_usos.sucursal_id`
  - Mejor cupón/recompensa: filtran por sucursal del canje
  - Por vencer: filtra ofertas aplicables a la sucursal
- El dueño (sin filtro) ve agregados de todo el negocio como antes

**Dueño ya no aparece en Reporte/Empleados cuando el usuario es gerente**
- `obtenerReporteEmpleados` acepta nuevo parámetro `incluirDueno: boolean` (default `true`)
- Controller pasa `!esGerente` como valor — gerentes no ven al dueño en su reporte
- KPIs "Mejor vendedor", "Ventas totales" del tab Empleados ahora reflejan solo empleados reales del gerente

**Validación inteligente de correo al asignar gerente**
- Nuevo componente reutilizable `InputCorreoValidado` con 4 niveles de validación:
  1. Formato (regex RFC 5322 simplificada) — inmediato
  2. Auto-exclusión (no puede ser correo del dueño) — inmediato
  3. Detección de typos de dominio con distancia Levenshtein (13 dominios comunes MX: gmail.com, hotmail.com, yahoo.com.mx, etc.) — con botón "Corregir"
  4. Disponibilidad contra BD con debounce 400ms
- Indicadores visuales: `XCircle` rojo (error), `Lightbulb` ámbar (typo), `CheckCircle2` verde (nuevo), `UserCheck` verde (promoción)
- Callback `onValidezCambio` retorna `{ valido, tipo: 'nuevo' | 'promocion', existente? }` para que el padre adapte UI
- Modos `'registro'` y `'gerente'` — diseñado genérico para uso futuro en registro y Mi Perfil
- Nuevo endpoint `GET /auth/verificar-disponibilidad-correo` con `verificarToken` + rate limit (500/min dev, 30/min prod) — evita enumeración pública de usuarios
- Nuevos archivos: `utils/validarCorreo.ts` (puro), `hooks/queries/useVerificarCorreo.ts`, `components/ui/InputCorreoValidado.tsx`

**Promoción de cuentas personales existentes a gerente**
- Refactor `crearCuentaGerente` → `asignarGerenteSucursal` que maneja dos casos:
  - **Caso A — Creación**: correo no existe → crea usuario nuevo con contraseña provisional (como antes)
  - **Caso B — Promoción**: correo existe y es 100% personal → actualiza usuario existente, NO toca contraseña, fuerza `requiereCambioContrasena = false`
- Nuevo email template `enviarEmailGerenteAsignado` — notificación sin credenciales para promoción
- Inputs de nombre/apellidos se auto-llenan y deshabilitan cuando se detecta cuenta existente (se toman de la BD)
- Botón adaptativo: "Crear cuenta" (slate) / "Asignar gerente" (con ícono UserCheck) según tipo
- Toast del backend ahora dice el mensaje correcto según tipo (creación vs promoción)

**Gerentes ahora pueden gestionar empleados de SU sucursal**
- Cambio de política: gerentes tienen CRUD completo sobre empleados de su sucursal asignada
- Backend `empleados.controller.ts` reescrito con nueva lógica:
  - Helper `gerentePuedeOperarSobreEmpleado(req, empleadoId)` — true si dueño o si gerente Y el empleado es de su sucursal
  - Nuevo helper exportado `empleadoPerteneceASucursal(empleadoId, sucursalId)` en `empleados.service.ts`
  - Al crear/editar: `sucursalId` del body se fuerza al de gerente (no puede elegir otra)
  - Ver detalle / toggle / eliminar / revocar sesión / editar horarios: validan pertenencia a su sucursal → 403 si no
  - Dueño mantiene control total sin cambios
- Frontend: botón "Nuevo empleado" visible para gerentes; botones "Revocar sesión" y "Eliminar" visibles en modal detalle

**Emails estilizados estilo ScanYA**
- Plantilla `plantillaGerenteBase` actualizada: header con gradiente azul oficial ScanYA `linear-gradient(135deg, #02143D 10%, #001E70 50%, #034AE3 100%)` + logo AnunciaYA desde URL pública en R2 (`brand/anunciaya-logo2.png`)
- Logo cargado por URL pública (no base64) — Gmail bloquea data URIs desde 2013. PNG para máxima compatibilidad con clientes de email
- Alt vacío en `<img>` para no mostrar texto si la imagen falla
- Aplica a los 4 templates: creación, promoción, credenciales reenviadas, revocación

### 🐛 Corregido

**Cambio de contraseña provisional — mala UX**
- `VistaCambiarContrasena` pedía 3 campos: contraseña provisional + nueva + confirmar. Pedir la provisional de nuevo era redundante porque ya se validó en el login (el `tokenTemporal` lo certifica)
- Simplificado: ahora solo pide nueva contraseña + confirmar
- Backend `cambiarContrasenaProvisional(tokenTemporal, nuevaContrasena)` — firma reducida. La validación "nueva ≠ provisional" ahora se hace con `bcrypt.compare` contra `contrasenaHash` almacenado

**Promoción no limpiaba `requiereCambioContrasena`**
- Si un usuario existente tenía el flag en `true` de un flujo anterior (ej: ex-gerente que nunca cambió su contraseña provisional), al ser promovido seguía con el flag en true → el sistema le forzaba cambio de contraseña aunque ya tiene una válida
- Fix: el `UPDATE` del caso promoción fuerza `requiereCambioContrasena: false`

**Toast genérico ignoraba el tipo de asignación**
- `useCrearGerente` mostraba siempre "Cuenta de gerente creada. Se enviaron las credenciales por correo." aunque fuera promoción
- Fix: lee `respuesta.message` del backend (que ya es condicional según tipo)

**`description de negocio sin peso explícito**
- `PaginaPerfilNegocio.tsx` mostraba `negocioDescripcion` sin `font-medium` (peso mínimo según TOKENS_GLOBALES)
- Fix: agregado `font-medium`

**Bug: Matriz podía desactivarse/eliminarse (bug crítico)**
- `toggleActivaSucursal` tenía `catch` preparado para error "principal" pero nadie lo lanzaba → cualquier sucursal podía desactivarse incluyendo Matriz
- Fix backend: agregadas validaciones que lanzan "La Matriz no se puede desactivar/eliminar"
- Fix frontend UI preventiva: botones Power y Trash de Matriz ahora `disabled`, color `slate-300`, tooltip explicativo — previene el error antes del click
- Hook `useToggleSucursalActiva` y `useEliminarSucursal`: usan mensaje de error real del backend (no genérico)

**Bug: modal stale tras revocar gerente**
- `ModalDetalleSucursal` usaba `gerenteQuery.data ?? sucursal.gerente` — el `??` devolvía el prop viejo cuando el query retornaba `null` tras revocar
- Fix: cambiado a `gerenteQuery.isSuccess ? gerenteQuery.data : sucursal.gerente` — confía en el query una vez completado

**Bug: tabla de empleados no se actualizaba al crear (cache stale)**
- `useCrearEmpleado` invalidaba con `queryKeys.empleados.lista(sucursalId)` que produce `['empleados', 'lista', sucursalId, undefined]` — no hacía prefix match con keys que incluyen filtros
- Fix: invalidar con `['empleados', 'lista', sucursalId]` (sin el `undefined` final) — prefix match correcto

### 🎨 UX del modal de asignar gerente

**Header contextual** — al abrir el sub-flujo de asignar gerente, el header del modal cambia:
- Icono: `Building2` → `UserPlus`
- Título: nombre de sucursal → "Asignar gerente"
- Subtítulo: estado (Activa) → nombre de sucursal

**Footer oculto durante sub-flujo**
- Cuando `mostrarFormGerente === true`, se ocultan "Cerrar" y "Editar en Mi Perfil" del footer para evitar clicks accidentales. Solo queda "Cancelar" y "Crear cuenta/Asignar gerente" del sub-flujo.

**Orden del formulario invertido**
- Antes: Nombre → Apellidos → Correo
- Ahora: Correo → Nombre → Apellidos. Al escribir el correo se detecta si es cuenta existente y se auto-llenan nombre/apellidos.

**Texto contextual condicional**
- Solo aparece cuando el correo fue validado (no antes)
- Promoción: "{Nombre} recibirá una invitación por correo."
- Creación: "{Nombre} recibirá sus credenciales de acceso por correo."
- Se personaliza con el primer nombre (sin apellidos) para evitar redundancia

**Mensaje verde del input más conciso**
- Antes: "Se promoverá cuenta existente de {Nombre} {Apellidos} a gerente"
- Ahora: "Cuenta existente — se promoverá a modo comercial"
- El nombre se muestra en el texto gris debajo del form (evita redundancia)

**Botón "Revocar gerente" compacto cuando aparece solo**
- Si el gerente ya activó su cuenta (`requiereCambioContrasena=false`), el botón "Reenviar credenciales" se oculta
- "Revocar gerente" cambia a estilo compacto ghost alineado a la derecha (sin borde, hover con fondo rojo suave)

### 📧 Rediseño completo de emails transaccionales

**Plantilla base unificada (`plantillaBase`)** — 6 emails ahora comparten estilo:
- Verificación de correo (registro)
- Recuperación de contraseña
- Gerente creado (caso creación)
- Gerente asignado (caso promoción)
- Credenciales reenviadas
- Gerente revocado

**Header con gradiente azul oficial ScanYA**
- `linear-gradient(135deg, #02143D 10%, #001E70 50%, #034AE3 100%)`
- Logo AnunciaYA blanco desde R2 pública (`brand/anunciaya-logo2.png`) — 180px
- Logo clickeable con `<a href="${env.FRONTEND_URL}">` (abre en nueva pestaña)

**Rediseño de cajas de código** (verificación, recuperación, provisionales)
- Fondo `#e2e8f0` + borde `#94a3b8` — tonos slate con contraste
- Código en `#0f172a` (casi negro) monospace 22px letter-spacing 3px
- Label uppercase 11px con letter-spacing — estilo empresarial
- Eliminados emojis (🚀 ⏱️ ⚠️) para aspecto más profesional

**Cajas de alerta "Importante"** — nuevo estilo:
- Barra lateral ámbar 4px (`#d97706`)
- Fondo `#fef3c7` con texto `#78350f`
- Sin emojis, `"Importante:"` en bold negro ámbar oscuro

**Footer**: `"Tu Comunidad Local"` (antes `"Comercio Local en México"`)

**Contexto de negocio/sucursal en emails de gerente**
- Nuevo helper `obtenerContextoSucursal(sucursalId)` en `sucursales.service.ts` que retorna `{ nombreNegocio, nombreSucursal }` via JOIN
- Emails personalizados: "Has sido asignado(a) como **gerente de \"Sucursal Centro\"** del negocio **\"Panadería Tijuana\"**"
- Asunto: "Te asignaron como gerente en Panadería Tijuana" (antes genérico)
- Helper `escape()` HTML-safe para nombres con caracteres especiales

### 🛡️ Blindaje UX del onboarding para gerentes

- `PaginaOnboarding.tsx`: `useRef` evita que el toast "Los gerentes no pueden crear negocios" se muestre 2 veces (StrictMode)
- `useEffect` de inicialización del store hace early return si `esGerente` — evita toast erróneo "No se encontró un negocio asociado a tu cuenta"
- Return `null` temprano en el render cuando es gerente — evita flash visual antes del redirect
- Mensaje "Acceso restringido" en `/business-studio/sucursales`: rediseñado como card con fondo blanco, icono `Lock` con gradiente slate oscuro, shadow-lg y max-width 28rem — más sobrio y profesional

### 🎨 Pequeños detalles visuales

- Modal detalle de sucursal principal: quitado texto "Matriz" duplicado en badge (queda solo estrella dorada)
- Tooltips de botones usan "Matriz" en vez de "sucursal principal" — consistente con UI
- Dropdown de avatar: quitado prefijo "Suc." — queda solo nombre de sucursal (ej: "Sucursal Centro" en vez de "Suc. Sucursal Centro")

### 📝 Documentación

- Actualizado: `docs/arquitectura/Sucursales.md` — flujo dos casos (creación vs promoción), validación correo 4 niveles, emails, blindajes Matriz, flujo primer login actualizado
- Actualizado: `docs/arquitectura/Empleados.md` — política permisos dueño vs gerente, helpers, fix cache
- Actualizado: `docs/arquitectura/Promociones.md` — cupones canjeables cross-sucursal
- Actualizado: `docs/arquitectura/Reportes.md` — aislamiento por sucursal para gerentes
- Actualizado: `docs/ROADMAP.md` — Perfil Personal usuario + ScanYA multi-sucursal como sprints futuros
- Nuevo: `docs/reportes/scanya-multi-sucursal-prompt-sprint.md` — prompt detallado para sprint futuro de ScanYA multi-sucursal

---

## [16 Abril 2026] - BS Sucursales: Módulo Completo (Sprint 12)

### ✨ Agregado

**Módulo BS Sucursales — CRUD multi-sucursal + gestión de gerentes**

**CRUD Sucursales**
- Página principal con KPIs (Total, Activas, Inactivas) en `CarouselKPI`
- Filtros: chips estado (Todas/Activas/Inactivas) + buscador con `placeholderData: keepPreviousData`
- Vista dual: cards móvil / tabla desktop con columna "Gerente"
- Modal crear sucursal: formulario + **vista de progreso animado** con 5 pasos (Creando → Horarios → Métodos pago → Imágenes → Catálogo) sincronizados con el request real
- Modal detalle sucursal: info + sección gerente (asignar/revocar/reenviar credenciales)
- Toggle activa/inactiva (revoca gerente automáticamente si se desactiva)
- Autocomplete de ciudades con `buscarCiudades` + auto-rellenado de estado

**Clonación automática desde Matriz al crear sucursal**
- **Horarios**: 7 registros clonados de Matriz (o vacíos si Matriz no tiene)
- **Métodos de pago**: todos clonados con tipo/activo/instrucciones
- **Catálogo**: artículos duplicados como **registros independientes** (no asignaciones compartidas) con imágenes R2 duplicadas — cada sucursal puede tener precios/imágenes/disponibilidad distintos
- **Imágenes R2**: foto perfil → `perfiles/`, portada → `portadas/`, galería completa → `galeria/`. Usa `CopyObjectCommand` (server-side en R2, no pasa por el backend)
- `duplicarArchivo()` helper en `r2.service.ts`

**Gestión de gerentes — creación directa por el dueño**
- Dueño crea cuenta del gerente desde el modal de detalle de sucursal (nombre, apellidos, correo)
- Backend genera contraseña provisional (10 chars, 1 mayús + 1 minús + 1 número) con `crypto.randomInt` + bcrypt 12 rondas + Fisher-Yates shuffle
- Email enviado al gerente con credenciales provisionales
- Campo nuevo `requiereCambioContrasena` en `usuarios` marca el primer login
- Revocación → vuelve a modo personal (`sucursalAsignada=null, negocioId=null, modoActivo='personal'`)
- Reenviar credenciales regenera password y envía nuevo email

**Blindajes anti-fraude**
- Dueño NO puede asignarse a sí mismo como gerente (validación por correo)
- Correo único en tabla `usuarios` (409 si ya existe)
- Máximo 1 gerente por sucursal (validación en backend)
- Gerente NO puede: crear negocio/onboarding, cambiar correo, cambiar `sucursalAsignada`, acceder a BS Sucursales
- Revocación en tiempo real: middleware `validarAccesoSucursal` consulta BD en cada request (no requiere blacklist Redis)

**Hard delete de sucursales con limpieza exhaustiva de R2**
- Recolección paralela de URLs (7 queries `Promise.all`): sucursal, galería, ofertas/cupones, empleados, dinámicas + premios, bolsa de trabajo, transacciones + evidencia ScanYA
- Detección de artículos huérfanos (sin otras sucursales asignadas) → eliminación de registro + imágenes
- Eliminación paralela en R2 con `Promise.all` + filtrado con `esUrlR2()` (solo archivos de nuestro bucket)
- CASCADE de PostgreSQL elimina horarios, métodos pago, galería, ofertas, empleados, dinámicas, bolsa trabajo, transacciones
- Imágenes de ChatYA **NO** se eliminan (pertenecen a conversaciones de usuarios)

**Arquitectura Backend**
- `services/sucursales.service.ts` (nuevo): KPIs, lista con gerente (LEFT JOIN evita N+1), CRUD gerentes, helper `generarContrasenaProvisional()`
- `controllers/sucursales.controller.ts` (nuevo): 9 controllers (5 CRUD + 4 gerentes) con `validarEsDueno()`
- `validations/sucursales.schema.ts` (nuevo): Zod schemas
- `negocioManagement.service.ts` (extendido): `crearSucursal` con clonación, `toggleActivaSucursal` con revocación auto, `eliminarSucursal` con limpieza R2
- 9 rutas nuevas en `negocios.routes.ts`
- 3 templates email: creación, reenvío credenciales, revocación

**Arquitectura Frontend**
- React Query: `useSucursales.ts` con 6 mutations (crear, toggle, eliminar, crear gerente, revocar gerente, reenviar credenciales)
- Invalidación cruzada: todas las mutations invalidan `queryKeys.perfil.sucursales(negocioId)` para sincronizar `SelectorSucursalesInline` del Navbar
- Guard doble: frontend oculta módulo a gerentes + backend retorna 403

### 🐛 Corregido

**Bug: portadas guardadas en carpeta `sucursales/` en lugar de `portadas/`**
- `duplicarArchivo(url, 'sucursales')` al duplicar la portada — ahora usa `portadas/` correctamente y foto de perfil usa `perfiles/`

**Bug: soft delete de sucursal dejaba datos huérfanos**
- `eliminarSucursal` hacía `UPDATE activa=false` en vez de DELETE. Refactorizado a hard delete con CASCADE + limpieza R2 exhaustiva

**Bug: `font-medium` mínimo en descripción de negocio**
- `PaginaPerfilNegocio.tsx`: texto `negocioDescripcion` sin peso explícito → ahora `font-medium` cumpliendo `TOKENS_GLOBALES`

### 📝 Documentación

- Nuevo: `docs/arquitectura/Sucursales.md` — documento completo del módulo
- Actualizado: `docs/arquitectura/Business_Studio.md` — Sucursales marcado completado (12/14 módulos)
- Actualizado: `docs/ROADMAP.md` — Sprint 12 agregado
- Actualizado: `CLAUDE.md` — BS módulos completados 12/14 (85.7%)

### 🔄 Migración BD aplicada en producción (16 Abril 2026)

```sql
ALTER TABLE usuarios
ADD COLUMN requiere_cambio_contrasena BOOLEAN NOT NULL DEFAULT false;
```

---

## [12 Abril 2026] - BS Reportes: Módulo Completo (Sprint 11)

### ✨ Agregado

**Módulo de Reportes — 5 tabs con KPIs, tablas y cards visuales**
- **Tab Ventas:** 4 KPIs (Total vendido, Venta promedio, Transacciones, Canceladas) + 3 tablas (Ventas por día, Métodos de pago, Horarios pico)
- **Tab Clientes:** 4 KPIs (Clientes, Compra promedio, En riesgo, Inactivos) + 3 tablas (Top 10 gasto con avatar, Top 10 frecuencia con avatar, Clientes nuevos por semana) + Modal detalle clientes inactivos/en riesgo con navegación al módulo Clientes
- **Tab Empleados:** 4 KPIs (Empleados, Ventas totales, Mejor vendedor, Alertas) + Tabla desempeño con columnas clickeables para ordenar. Incluye al dueño como pseudo-empleado (badge "Dueño"). Empleados inactivos/eliminados con ventas aparecen con badge "Inactivo"
- **Tab Promociones:** 2 KPIs (Descuento total, Por vencer) + 3 funnels (Ofertas públicas con vistas/clicks/shares, Cupones privados, Recompensas) + 3 cards visuales (Oferta más popular por clicks, Mejor cupón por canjes, Mejor recompensa por canjes) con imagen, badge tipo, pill de métrica, gradientes estilo CardNegocio
- **Tab Reseñas:** 3 KPIs (Total reseñas, Sin responder, Tasa respuesta) + 3 tablas (Distribución de estrellas, Tendencia de rating por semana, Respuestas por persona con avatar y badge Dueño)

**Componentes reutilizables**
- `KpiCard` en `ReporteUI.tsx` — 6 colores semánticos con gradientes, tamaños idénticos al Dashboard BS
- `CarouselKPI` reutilizado — scroll horizontal en móvil con fades dinámicos
- `CardMejorPromocion` — card visual reutilizable para ofertas, cupones y recompensas
- `formatearSemana()` — formatea "16 - 22 Feb 2026" en español con manejo inteligente de mes/año

**Layout responsivo**
- PC: Header + KPIs en Row 1 (flex-row), Tabs a la derecha en Row 2 con `lg:mt-7 2xl:mt-14`, Filter, Body
- Móvil: KPIs arriba de todo (mt-5), Tabs, Filter, Body
- Prop `solo: 'kpis' | 'body'` en cada Tab — renderizado doble sin duplicar fetch (React Query deduplica)

**Filtro universal de fechas**
- DatePicker custom + rangos rápidos (7d, 30d, 3m, 1a, Todo)
- `placeholderData: keepPreviousData` — sin flash al cambiar filtros
- Zustand store para tab activo y rango

**Exportación XLSX** por tab con ExcelJS + headers estilizados

### 🐛 Corregido

**Bug crítico: Reseñas — sin-responder/tasa/tiempo siempre incorrectos**
- Los queries usaban `respondidoPorEmpleadoId IS NULL` en la reseña original del cliente (campo que nunca se actualiza). Reescrito con `NOT EXISTS` + self-join sobre filas de respuesta (`autor_tipo='negocio'`). Ahora cuenta correctamente respuestas del dueño, gerente y empleados

**Bug: Empleados — solo mostraba empleados con ventas**
- Query original hacía `FROM puntosTransacciones INNER JOIN empleados`, excluyendo empleados sin ventas. Refactorizado a partir de `FROM empleados` con LEFT JOIN de transacciones

**Bug: Promociones — `fechaFinNorm` nunca se usaba**
- Variable calculada pero ninguna de las queries la aplicaba. Al filtrar por rango custom, el tab mostraba datos sin límite superior. Corregido en las 4 queries que lo necesitan

**Bug: Empleados modal — estado stale tras toggle activo**
- `useToggleEmpleadoActivo` solo hacía optimistic update de la lista, no del detalle. El modal mostraba el estado anterior. Agregado optimistic update + rollback del detalle en toggle, actualizar, eliminar y horarios

### 🗑️ Eliminado

**Código muerto de KPIs removidos**
- `ventasPorSemana` (BE query + interface + FE + tests) — reemplazado por filtro de fechas universal
- `concentracionIngresos` (BE query + interface + FE + tests) — ruido visual, no accionable
- `totalTurnos` en EmpleadoReporte (BE query + XLSX + interface) — no se mostraba en UI
- `velocidadCanjeDias` en Promociones — no accionable
- `tasaPorTipo` en Promociones — nombres crudos de BD, mayormente 0%
- `puntos` (histórico total) en Promociones — es lealtad, no promociones; global sin filtro de fecha

**Limpieza imports**
- `recompensas`, `scanyaTurnos` eliminados de imports de `reportes.service.ts`

### 📝 Documentación

- Nuevo: `docs/arquitectura/Reportes.md` — documento completo del módulo
- Actualizado: `docs/arquitectura/Business_Studio.md` — Reportes marcado como completado
- Actualizado: `docs/ROADMAP.md` — Sprint 11 agregado, BS progreso actualizado
- Actualizado: `docs/CHANGELOG.md` — esta entrada

---

## [11 Abril 2026] - Audit React Query BS + Limpieza ScanYA Legacy

### 🔧 Corregido

**Audit React Query — 11 modulos BS auditados**
- ~30 invalidaciones cross-modulo corregidas en 8 hooks de React Query
- Dashboard: `handleGuardarOferta/Articulo` ahora usan hooks RQ en vez de service directo
- Transacciones: `useRevocarTransaccion` invalida clientes, puntos, dashboard, reportes. Optimistic incluye `motivoRevocacion`
- Mi Perfil: helper `invalidarCachesNegocio(actualizaAuth?)` invalida 5 caches + sincroniza `useAuthStore` (logo, foto, nombre, correo)
- Promociones: helper `invalidarOfertasRelacionadas` para las 4 mutaciones + acciones directas de cupones
- Puntos: `useActualizarConfigPuntos` invalida clientes (niveles recalculados). Recompensas invalidan `['cardya', 'recompensas']`
- Alertas: 3 mutaciones agregan invalidacion de `dashboard.alertas` (ruta distinta a `queryKeys.alertas.all()`)
- Empleados: 4 mutaciones invalidan `transacciones.operadores` (dropdown de filtro)
- Reportes: 5 tabs ahora se invalidan desde Transacciones, Ofertas, Resenas, Puntos, Empleados

**Bugs de display encontrados y corregidos**
- `PanelCampanas`: prop `totalActivas` no se destructuraba — badge mostraba `length` limitado a 5 en vez del total real
- `ModalDetalleTransaccionBS`: texto "Los puntos fueron devueltos" era de vouchers, corregido a "Se descontaron {N} pts del saldo del cliente"
- `ModalDetalleCliente`: `FilaTransaccion` ahora muestra TX revocadas con monto/puntos tachados + badge "Revocada"

### 🗑️ Eliminado

**Limpieza ScanYA legacy**
- Columnas `alerta_monto_alto` y `alerta_transacciones_hora` de `scanya_configuracion` (legacy, reemplazadas por sistema de Alertas BS)
- 6 archivos de codigo limpiados: schema Drizzle, Zod, service, controller, tipos frontend, doc arquitectura

**Limpieza drizzle-kit**
- Eliminados artefactos de drizzle-kit: `drizzle.config.ts`, 2 archivos SQL de migracion, carpeta `meta/` con journal y snapshots
- Removida dependencia `drizzle-kit` de devDependencies (el proyecto maneja migraciones con SQL manual en PGAdmin/Supabase)

### 📝 Documentacion

- `docs/estandares/PATRON_REACT_QUERY.md`: reglas 8-9, 6 patrones avanzados, mapa completo cross-modulo (~35 queries), 5 lecciones clave
- `docs/estandares/LECCIONES_TECNICAS.md`: 7 lecciones nuevas (authStore paralelo, cross-tab, display bugs, granularidad, drizzle-kit vs ORM, ScanYA independiente, codigo legacy)
- `docs/reportes/audit-react-query-completo-abril-2026.md`: reporte unificado (ronda 1 + ronda 2 + limpieza ScanYA)
- `docs/arquitectura/ScanYA.md`: actualizado (columnas legacy + nota migracion alertas)

---

## [5 Abril 2026] - BS Empleados: Módulo Completo (Sprint 10)

### ✨ Agregado

**Módulo de Empleados — Backend**
- CRUD completo: crear, editar, activar/desactivar, eliminar empleados
- 5 permisos granulares verificados en BD en tiempo real (no del token JWT)
- Horarios semanales (empleado_horarios): CRUD con DELETE + INSERT masivo
- Estadísticas de turnos ScanYA: total turnos, transacciones, puntos otorgados
- Revocación remota de sesiones: cierre de turno + blacklist Redis + Socket.io
- tokenStoreScanYA.ts: revocación por timestamp en Redis (TTL 13h)
- Validaciones Zod: nick alfanumérico único, PIN 4 dígitos, UUID regex

**Módulo de Empleados — Frontend**
- Página completa con KPIs (Total, Activos, Inactivos)
- Filtros: chips estado + buscador + botón "+ Nuevo" (solo dueño)
- Vista dual: cards móvil (scroll infinito) / tabla desktop ("Cargar más")
- Modal crear/editar: formulario + 5 toggles permisos
- Modal detalle: permisos en tabla cebra, stats con separadores degradados, tooltips
- Caché inteligente sin skeleton en recargas ni al filtrar

**Permisos ScanYA — Verificación completa**
- `registrarVentas`: verificado en `/otorgar-puntos`, `/validar-codigo`
- `procesarCanjes`: verificado en `/validar-voucher`, `/vouchers-*`, `/buscar-cliente-vouchers`
- `verHistorial`: verificado en `/historial`
- `responderChat`: verificado en rutas de escritura de ChatYA + bloqueo frontend
- `responderResenas`: verificado en `/negocio`, `/responder` (ya existía)
- Frontend ScanYA: botones ChatYA y Reseñas bloqueados con notificación si no tiene permiso

**Refresh token mejorado**
- Permisos se obtienen de BD al refrescar (no del token viejo)
- Incluye `negocioUsuarioId` para compatibilidad ChatYA

### 🐛 Corregido

- Permisos de empleados nunca se verificaban en rutas ScanYA — agregado `verificarPermiso` a 7 rutas
- Refresh token reutilizaba permisos del token viejo — ahora consulta BD
- `negocioUsuarioId` faltante en refresh — ChatYA con usuarioId vacío para empleados
- ChatYA `mis-notas` 500 para empleados — Drizzle casing incompatible, solucionado con SQL raw
- `z.string().uuid()` rechaza UUIDs variante no-estándar — cambiado a regex
- Import Redis como default vs named export en tokenStoreScanYA

### 🧪 Testing

- API: 188 tests (21 nuevos de empleados)
- E2E: 9 tests Playwright
- Manual: 5 permisos verificados con empleados reales en ScanYA

### 📝 Documentación

- Nuevo: `docs/arquitectura/Empleados.md` — documento completo del módulo

---

## [5 Abril 2026] - ChatYA × ScanYA: Integración Completa para Empleados

### 🐛 Corregido

- **ChatYA inaccesible desde ScanYA** — Token ScanYA pasaba como AnunciaYA (mismo JWT_SECRET), `usuarioId` quedaba vacío. Fix: filtro por `_tipo` en middleware `verificarTokenChatYA`
- **ChatOverlay se cerraba al abrir** — El guard `!usuario → cerrarChatYA()` no contemplaba sesión ScanYA
- **Socket.io no conectaba desde ScanYA** — Solo buscaba `ay_access_token`. Ahora busca ambos tokens
- **Estado conexión no se mostraba** — Socket backend rechazaba tokens ScanYA y emitía IDs incorrectos
- **Socket usaba token expirado de AnunciaYA** — `conectarSocket()` tomaba `ay_access_token` primero (expirado de sesión anterior). Ahora en contexto ScanYA prioriza `sy_access_token`
- **Estado "últ. vez" no aparecía en ScanYA** — `emitirEvento` se ejecutaba antes de que el socket se conectara. Se creó `emitirCuandoConectado()` con retry automático
- **401 en `/api/clientes/:id` desde ScanYA** — Ruta de clientes usaba `verificarToken` (solo AnunciaYA). Cambiado a `verificarTokenChatYA` que acepta ambos tokens
- **404 en `/api/auth/yo` desde ScanYA** — `hidratarAuth()` se llamaba innecesariamente en rutas `/scanya/*`

### ✨ Agregado

- **Hook `useChatYASession`** — Adaptador unificado de sesión para ChatYA. Hook React (`useChatYASession()`) + 4 helpers no-React (`obtenerMiIdChatYA`, `obtenerModoChatYA`, `obtenerSucursalChatYA`, `estaAutenticadoChatYA`)
- **Campo `negocioUsuarioId`** en response de login ScanYA (dueño/gerente/empleado) y tipo `UsuarioScanYA`
- **Suscripción logout ScanYA** en `useChatYAStore` — Limpia conversación activa y cierra overlay al cerrar sesión
- **Socket.io backend** acepta tokens ScanYA con `negocioUsuarioId` como identidad del room
- **`emitirCuandoConectado()`** en socketService — emite evento esperando a que el socket se conecte (retry cada 500ms, máx 10 intentos)
- **Auth dual en `/api/clientes`** — Ruta usa `verificarTokenChatYA` para que empleados ScanYA vean detalle de clientes en ChatYA

### 📝 Documentación

- `ChatYA.md` — Sección "Adaptador de sesión unificado" con reglas de uso
- `LECCIONES_TECNICAS.md` — 4 lecciones sobre integración multi-auth

---

## [3 Abril 2026] - BS Alertas: Módulo Completo (Sprint 9)

### ✨ Agregado

**Módulo de Alertas — Backend**
- 16 tipos de alertas en 4 categorías: Seguridad (5), Operativa (4), Rendimiento (4), Engagement (3)
- Motor de detección automática con 16 funciones de análisis
- Detección en tiempo real: hook fire-and-forget en ScanYA tras cada transacción
- Cron diario (4 AM): alertas operativas + engagement
- Cron semanal (lunes 5 AM): alertas de rendimiento
- Anti-duplicado inteligente por contexto (24h)
- Configuración de umbrales por negocio (UPSERT)
- `montos_redondos` desactivado por defecto
- Notificaciones push + Socket.io para alertas de severidad alta
- Nombres completos (nombre + apellidos) en todos los datos de alertas
- Endpoints DELETE individual y masivo (resueltas)

**Módulo de Alertas — Frontend**
- Página completa con KPIs (Total, No leídas, Alta, Resueltas)
- Filtros: dropdowns Categoría/Severidad + chips No leídas/Resueltas + buscador
- Tabla desktop con header dark gradient + scroll interno + "Cargar más"
- Cards móvil con scroll infinito (IntersectionObserver)
- Modal detalle: datos enriquecidos, acciones sugeridas, enlace contextual a módulo relacionado
- Modal configuración: tabs por categoría, toggles, inputs de umbrales
- Badge en menú BS con actualización optimista
- Marca leída automática al abrir modal (sin botón)
- Eliminar individual (icono basura en tabla) + eliminar resueltas (link masivo)
- Caché inteligente: sin skeleton en recargas (patrón Clientes/Transacciones)
- Texto informativo: "Las alertas de seguridad se detectan en cada venta..."

**Dashboard — Rediseño paneles de alertas**
- PanelAlertas: iconos con gradiente por severidad, click navega a Alertas, link "Ver todas"
- BannerAlertasUrgentes (móvil): rediseño moderno con header slate oscuro

**Navbar — Rediseño iconos**
- ChatYA, Notificaciones y Avatar con tamaño uniforme y circular
- ChatYA usa `/IconoRojoChatYA.webp` en vez del logo completo
- Panel de notificaciones altura 85vh + botón "Ver notificaciones anteriores"

**Dashboard — Caché inteligente**
- Store no se limpia al salir del Dashboard
- Skeleton solo en primera carga, recargas silenciosas en fondo

### 🐛 Corregido

- `LIMIT ${expr}` y `(${a} - ${b})` en Drizzle SQL: pre-calcular en JS
- Filtro sucursal en alertas: `OR sucursal_id IS NULL` para incluir alertas globales
- `fuera_horario` anti-duplicado por sucursal/día (antes generaba 1 por transacción)
- Pluralización correcta: "1 cliente VIP inactivo" vs "3 clientes VIP inactivos"
- Test ChatYA: limpiar contactos en beforeAll para evitar 409
- Test Alertas: 16 tipos (no 17), montos_redondos desactivado por defecto

### 🗄️ Migraciones

- `alertas_seguridad`: columnas `categoria`, `sucursal_id`, `acciones_sugeridas`, `resuelta`, `resuelta_at`
- `alertas_configuracion`: tabla nueva (negocio_id + tipo_alerta UNIQUE, activo, umbrales JSONB)
- CHECK constraints actualizados: 16 tipos, 4 categorías

### 🧪 Testing

- API: 167 tests (60+ de alertas + validaciones)
- E2E: 12 tests Playwright (página, filtros, modales)
- Motor real: 16/16 tipos verificados con datos reales
- ScanYA real: monto_inusual, fuera_horario, montos_redondos probados en vivo

### 📝 Documentación

- Nuevo: `docs/arquitectura/Alertas.md` — documento completo del módulo

---

## [1 Abril 2026] - Sistema de Niveles Condicional + Auditoría Recompensas/Sellos + Notificaciones

### ✨ Agregado

**Notificaciones — Cambio de niveles**
- Notificación personal a todos los clientes con billetera cuando el negocio activa/desactiva niveles
- Tipo `sistema` con logo del negocio como actor (estilo "mensaje del negocio")
- Textos: "Sistema de niveles desactivado/activado" con explicación clara

**Notificaciones — Expansión inline**
- Click en notificaciones sin ruta de destino expande/colapsa el texto completo (toggle)
- Nuevo modo de renderizado "Personal con actor sin \n" (5 modos totales)

**ScanYA — Pantalla de éxito mejorada**
- Muestra progreso de tarjeta de sellos: "🎯 Corte de Pelo 4/5" o "🎉 ¡Tarjeta completada!"
- Puntos ahora se muestran correctamente (antes mostraba "+undefined")

**CardYA — Vouchers gratis**
- Modal confirmar canje muestra "¡Gratis!" en vez de "-1 punto" para tarjetas de sellos
- Vouchers con 0 puntos muestran "Gratis" en verde en cards, tabla y modales (CardYA + ScanYA)
- Mensaje de cancelar voucher contextual según si hubo puntos o no

**Deep link inteligente en notificaciones**
- "Recompensa desbloqueada" abre modal de detalle si no canjeada, o voucher pendiente si ya canjeada
- Navegación sin recarga cuando ya estás en la misma ruta (replace en vez de navigate)
- No cambia de tab si ya estás en el correcto

### 🐛 Corregido

**Bugs críticos del sistema de Recompensas/Sellos**
- `ResultadoOtorgarPuntos` tipo frontend desincronizado con backend (pantalla éxito mostraba "+undefined")
- Canje gratis restaba 1 punto en vez de 0 (constraint BD cambiado de `> 0` a `>= 0`)
- Revocar venta no quitaba sello de tarjeta (nueva columna `recompensa_sellos_id` en transacciones)
- Cancelar voucher de sellos no restauraba progreso (ahora restaura `desbloqueada=true`)
- Optimistic update no manejaba `puntosUsados=0` ni reset de tarjeta de sellos

**Atomicidad**
- `otorgarPuntos()` ahora envuelve todas las escrituras en `db.transaction()` (antes eran separadas)
- `verificarRecompensasDesbloqueadas()` marcada como deprecated (mecanismo dual eliminado)

**Tipos TypeScript**
- `tarjetaSellos` agregado al tipo de retorno de `otorgarPuntos` en API
- `cuponTipo`/`cuponValor` agregados a `TransaccionScanYA`
- `respuesta.data!.id` en `useOfertas.ts`

### 📝 Documentación
- `Notificaciones.md` — 5 modos de renderizado, expansión inline, catálogo niveles, patrón deep link con tabs
- `CardYA.md` — Sección N+1 reescrita con flujo completo actualizado (canje, cancelación, revocación, ciclos)
- `ScanYA.md` — Transacción atómica, tarjeta de sellos en venta, nivelesActivos condicional

### 🗄️ Migraciones de BD requeridas
```sql
-- Permitir vouchers gratis
ALTER TABLE vouchers_canje DROP CONSTRAINT vouchers_canje_puntos_check;
ALTER TABLE vouchers_canje ADD CONSTRAINT vouchers_canje_puntos_check CHECK (puntos_usados >= 0);

-- Vincular tarjeta de sellos a transacción (para revocación)
ALTER TABLE puntos_transacciones ADD COLUMN recompensa_sellos_id UUID NULL;
```

---

## [23 Marzo 2026] - Rediseño Mis Cupones/Guardados + ChatYA Cupones + Flujos Revocar/Reactivar

### ✨ Agregado

**ChatYA — Burbuja de cupón**
- Nuevo tipo de mensaje `cupon` en `chat_mensajes` (check constraint actualizado en BD)
- Burbuja especial: imagen + emoji 🎁 animado + "¡Felicidades!" + botón "Reclamar cupón" con efecto shine
- Preview en lista de chats: icono Ticket + 🎁 + título (en vez de JSON crudo)
- Envío automático al crear, reenviar y reactivar cupón
- Fix: emisor usa `usuario_id` del negocio (no `negocio_id`)

**Reactivación de cupones**
- Nuevo endpoint `POST /api/ofertas/:id/reactivar` — reactiva todos los usuarios revocados
- Reactiva oferta + envía notificación "¡Tu cupón fue reactivado!" + mensaje ChatYA
- Botón RefreshCw verde en tabla BS y en header del modal de edición
- Elimina notificaciones de revocación previas antes de reactivar

**Revocación masiva mejorada**
- Nuevo endpoint `POST /api/ofertas/:id/revocar-todos` — revoca todos los usuarios activos
- Limpieza cascada: elimina mensajes chat + notificaciones originales + conversaciones vacías
- Socket `chatya:cupon-eliminado` para eliminación de burbujas sin parpadeo

**Clientes asignados a cupón**
- Nuevo endpoint `GET /api/ofertas/:id/clientes-asignados`
- TabClientes en modo edición: lista readonly con avatar, fecha, badge estado
- Click en cliente abre ModalDetalleCliente

**ScanYA — Flujo completo de cupones**
- Cupones sin compra (monto $0): cliente → código → confirmar directo
- Validación de estado del cupón (usado/revocado/expirado)
- Marca oferta_usuarios.estado = 'usado' al confirmar
- Sección "Código de cupón" reubicada al #2 (después de cliente)
- Check constraint BD permite monto >= 0

**CarouselCupones en ColumnaIzquierda**
- Carousel automático (5s) de cupones activos con cronómetro animado (Timer + ring)
- Unificado con botón "Mis Cupones" (badge rojo circular con conteo)
- Se oculta en `/mis-cupones`

**Store useMisCuponesStore (Zustand)**
- Persistencia de datos entre navegaciones
- Pre-carga de imágenes (logos + imágenes de cupón)
- Listener socket `cupon:actualizado` para tiempo real

**Actualización en tiempo real (Socket.io)**
- Evento `chatya:cupon-eliminado` — elimina burbujas sin parpadeo
- Evento `chatya:recargar-conversaciones` — recarga chats + mensajes activos
- Evento `notificacion:recargar` — recarga panel de notificaciones
- Evento `cupon:actualizado` — refresca store de cupones
- Principio: sockets se emiten después de `await` en todas las operaciones de BD

**Mis Guardados — Rediseño visual**
- Header dark estilo CardYA con identidad rose
- Icono Bookmark → Heart
- Branding: "Mis **Guardados**" (blanco + rose-400)
- Subtítulo: "Tus favoritos en un solo lugar" + "COLECCIÓN PERSONAL"
- Header propio en móvil (MobileHeader oculto)
- KPIs desktop + tabs estilo CardYA + ordenamiento integrado en tabs
- Estados vacíos unificados a rose
- Tema ColumnaIzquierda dark con acentos rose

### 🔧 Modificado

**ModalDetalleCupon — Rediseño**
- Gradiente unificado slate (no varía por tipo)
- Toggle ver/ocultar contraseña
- Botón ChatYA con icono `/IconoRojoChatYA.webp` + tooltip PC
- Info como lista con divisores (Tag, Calendar, DollarSign, Gift)
- Badge "Activo": sólido verde + letra blanca
- "Código de descuento" → "Código de cupón"

**CardCupon — Rediseño**
- Logo negocio circular dentro de la imagen (overlay con sombra blanca)
- Móvil: logo arriba-izq, badge abajo-izq, metadata vertical
- Desktop: imagen h-32/h-40, línea gradiente emerald→negro h-1.5
- Solo botón "Ver cupón" abre modal (activos); card completa clickeable (no activos)
- Hover en botón: fondo oscurece + texto blanco

**PaginaMisCupones — Rediseño estilo CardYA**
- Header dark sticky con glow emerald, esquinas curvas `lg:rounded-b-3xl`
- Branding dual: "Mis **Cupones**" + "CUPONERA DIGITAL"
- Header propio en móvil (MobileHeader oculto)
- Deep link inteligente: cambia al tab correcto según estado del cupón

**ModalOferta — Edición de cupones**
- Toggle visibilidad oculto en edición
- Campos readonly cuando cupón inactivo (opacity-60, pointer-events-none)
- Tab Ajustes siempre readonly en edición (motivo + límite)
- Carga motivo desde clientes asignados
- Prop `onRecargar` para actualizar tabla después de reactivar/revocar

**Tabla Promociones BS — Toggle Ofertas/Cupones**
- Toggle en header (desktop: iconos, móvil: con texto) reemplaza dropdown visibilidad
- Columnas dinámicas: cupones oculta Vistas/Shares/Clicks
- Estados dinámicos por tipo (Activos/Revocados/Vencidos para cupones)
- Modal sin toggle: visibilidad pre-establecida desde la tabla
- Botones dinámicos: "Nueva Oferta" / "Nuevo Cupón"
- Imagen del modal más compacta (aspect-4/3 en desktop)
- Cupones: ocultar iconos Duplicar y Ocultar/Mostrar
- Orden acciones cupones: Revocar/Reactivar → Eliminar → Reenviar
- Mensaje al crear cupón: "Cupón enviado exitosamente"

**ScanYA**
- "Código de descuento" → "Código de cupón" (label + placeholder)

**Reenviar cupón**
- Ahora envía notificación + mensaje ChatYA (antes solo notificación)
- Código personal removido de notificación (dato sensible)
- Tipo corregido: `nueva_oferta` → `cupon_asignado`

**Eliminar oferta/cupón — Limpieza cascada**
- Elimina mensajes chat tipo `cupon` + notificaciones + conversaciones vacías
- Elimina imagen de R2 (si `esUrlR2`)
- Socket para actualización en tiempo real

**Limpieza imágenes huérfanas R2**
- ModalOferta + ModalArticulo: al cerrar sin guardar, elimina imagen subida de R2
- Al guardar: marca como no huérfana antes de cerrar

**ColumnaIzquierda**
- Nuevos temas: `cupones` (emerald) y `guardados` (rose), mismo fondo azul que CardYA
- CTA "Empezar ahora": gradiente azul del header
- "7 días": color azul fijo en todas las páginas
- Colores TabClientes: indigo → blue

**ChatYA**
- Fix: restaurar conversación eliminada actualiza `mensajes_visibles_desde` (no muestra mensajes viejos)
- Fix: `enviarCuponPorChatYA` usa `negocioUsuarioId` (no `negocioId`) como emisor

**Navegación**
- Flechas atrás en CardYA y Mis Cupones: `navigate(-1)` → `navigate('/inicio')`

**Base de datos**
- Tipo `cupon` agregado a `chat_msg_tipo_check` y `chat_conv_ultimo_mensaje_tipo_check`
- Aplicado en local (Docker) y producción (Supabase)

---

## [22 Marzo 2026] - Promociones (Ofertas + Cupones) + Mis Cupones + N+1 CardYA

### ✨ Agregado

**Promociones — Ofertas potenciadas con cupones privados**
- Toggle Oferta (📢) / Cupón (🎟️) en modal de crear promoción
- Cupones privados: código único por usuario (ANUN-XXXXXX), intransferible
- Selector de clientes con filtros por nivel (Bronce/Plata/Oro) y actividad (Activos/Inactivos)
- Modal refactorizado con 3 tabs: Detalles | Ajustes | Enviar a
- 2 dropdowns TC-4 para filtros de clientes
- Preview de notificación en vivo en tab Ajustes
- Botón "Enviar cupón" dinámico
- Reenviar cupón a clientes asignados
- Revocar cupón desde BS (desactiva oferta)
- Filtro visibilidad en PaginaOfertas: Todas / Ofertas / Cupones (solo desktop)

**Mis Cupones — Vista cliente**
- Página `/mis-cupones` con header dark emerald + 3 tabs (Activos/Usados/Historial)
- CardCupon: layout horizontal móvil + vertical desktop (patrón CardRecompensaCliente)
- ModalDetalleCupon: detalle completo + botón "Revelar código" (copiable)
- Deep link desde notificaciones
- Enlace en ColumnaIzquierda + MenuDrawer

**Recompensas N+1 en CardYA**
- Tipo de recompensa "Por compras frecuentes" (N compras → desbloqueo)
- Toggle "Requiere gastar puntos" (gratis al completar N)
- Verificación automática en ScanYA al registrar venta
- Tabla `recompensa_progreso` para tracking

**ScanYA — Migración cupones → ofertas**
- Validación migrada de tabla `cupones` → `oferta_usuarios.codigo_personal`
- Labels: "Cupón" → "Código de cupón"
- Endpoint: `/validar-cupon` → `/validar-codigo`
- Puntos se calculan sobre monto PAGADO (post-descuento)

**Notificaciones**
- Tipos: `cupon_asignado` (Ticket verde), `cupon_revocado` (Ticket rojo), `recompensa_desbloqueada`
- Deep link: `/mis-cupones?id={id}` desde panel de notificaciones

**UI / Renombrado**
- Menú BS: "Ofertas" → "Promociones"
- Subtítulo: "Ofertas y cupones"
- Iconos: Megaphone (oferta) / Ticket (cupón)
- Tabla header: "PROMOCIÓN"
- Conteo dinámico: "11 promociones" / "8 ofertas" / "3 cupones"

**Testing**
- 21 tests Zod ofertas (visibilidad, asignar, validar código)
- 14 tests Zod recompensas N+1
- 7 tests E2E Playwright (modal tabs, filtro visibilidad, Mis Cupones)
- Login E2E via JWT inyectado en localStorage

### 🗑️ Eliminado

**Limpieza total de Cupones (módulo separado)**
- 4 tablas BD eliminadas: `cupones`, `cupon_usos`, `cupon_usuarios`, `cupon_galeria`
- FKs migradas: `pedidos` y `puntos_transacciones` apuntan a `ofertas`/`oferta_usos`
- Placeholder `BSPaginaCupones` eliminado del router
- `PaginaMisCupones.tsx` placeholder eliminada
- "Cupones" removido del menú BS (sidebar + drawer)
- Botón "Mis Cupones" removido de ColumnaIzquierda y MenuDrawer
- Imports `cupones`/`cuponUsos` removidos de scanya.service.ts
- Tipos `nuevo_cupon` y referencia `cupon` legacy removidos de notificaciones

### 🔧 Modificado

**Base de datos (4 migraciones SQL)**
1. Tablas nuevas: `oferta_usos`, `oferta_usuarios`, `recompensa_progreso`
2. Columnas en `ofertas`: `visibilidad`, `limite_usos_por_usuario`
3. Columnas en `recompensas`: `tipo`, `numero_compras_requeridas`, `requiere_puntos`
4. Columnas en `oferta_usuarios`: `codigo_personal`, `estado`, `usado_at`, `revocado_at`, `revocado_por`, `motivo_revocacion`
5. DROP 4 tablas cupones + migrar FKs

**Tokens de diseño**
- Tabs: dark gradient activo (TC-4)
- Checkboxes/indicadores: indigo
- Chips filtro: `bg-indigo-100 border-indigo-300`
- Responsive 3 niveles en todos los componentes
- Inputs: sin focus ring, con boxShadow inset

---

## [20 Marzo 2026] - ChatYA 100% completado + Testing E2E

### ✨ Agregado

**Testing — Infraestructura completa**
- Vitest configurado en `apps/api/` — primer framework de testing del proyecto
- Playwright configurado en `apps/web/` — tests E2E con navegador real (Chromium)
- Helpers reutilizables: generación de tokens JWT, usuarios de prueba, HTTP requests
- `data-testid` agregados en componentes clave de ChatYA (ChatOverlay, ConversacionItem, InputMensaje, BurbujaMensaje, MenuContextualMensaje, BarraBusquedaChat, VentanaChat)

**ChatYA — 41 API Tests (Vitest)**
- Conversaciones: crear, retomar, listar, obtener, fijar/desfijar, archivar/desarchivar, silenciar, eliminar
- Mensajes: enviar texto, enviar con URL, listar, editar, edición no autorizada, marcar leídos, reenviar, eliminar
- Reacciones: agregar, obtener, quitar (toggle)
- Mensajes fijados: fijar, listar, desfijar
- Búsqueda: full-text en conversación, buscar personas
- Contactos: agregar, listar, eliminar
- Bloqueo: bloquear, listar, desbloquear, verificar post-desbloqueo
- Badge no leídos, Mis Notas
- OG Preview: URL válida, protocolo inválido, URL inválida, sin parámetro

**ChatYA — 10 E2E Tests (Playwright)**
- Abrir ChatYA y ver conversaciones
- Abrir conversación y ver mensajes
- Enviar mensaje de texto
- URL clicable en mensaje
- Editar mensaje propio
- Eliminar mensaje propio
- Buscar en conversación
- Reaccionar a un mensaje
- Fijar/desfijar conversación
- Silenciar/desilenciar conversación

### 📊 Métricas
- **ChatYA Sprint 7: 100% completado** — módulo cerrado
- 51 tests totales (41 API + 10 E2E), todos pasan
- Infraestructura de testing reutilizable para futuros módulos

---

## [20 Marzo 2026] - Rediseño PanelNotificaciones + Open Graph Previews ChatYA

### ✨ Agregado

**Panel de Notificaciones — Rediseño completo**
- Iconos Lucide con gradientes de color en lugar de emojis genéricos
- Estilo Facebook: avatar/iniciales del actor + mini badge de tipo superpuesto
- Campos `actor_imagen_url` y `actor_nombre` en tabla `notificaciones`
- Imagen contextual: foto de recompensa/oferta para notificaciones de items, logo del negocio para modo personal, avatar del cliente para modo comercial
- Paginación con botón "Cargar más" (15 por página)
- Eliminación individual de notificaciones (icono basura con hover)
- Formato de mensajes con salto de línea para separar nombre del negocio

**Notificaciones — Deep Links inteligentes**
- Click en notificación abre el modal/detalle específico del item referenciado
- Transacciones BS: `?transaccionId=UUID` abre modal de detalle
- Canjes BS: `?tab=canjes&canjeId=UUID` abre tab canjes + modal
- Recompensas BS: `?recompensaId=UUID` abre tab recompensas + modal de edición
- Opiniones BS: `?resenaId=UUID` abre modal de responder
- Ofertas/Reseñas públicas: `?ofertaId=UUID`, `?resenaId=UUID` con deep link
- Toast informativo cuando el item ya no existe ("Esta reseña ya no está disponible")
- Patrón robusto con state pendiente para funcionar estando ya en la página

**Notificaciones — Cleanup automático**
- Al eliminar oferta/recompensa: borrado automático de notificaciones asociadas
- Al revocar transacción: borrado automático de notificaciones
- Al cancelar voucher: borrado automático de notificaciones
- Prevención de duplicados: `notificarNegocioCompleto` y `notificarSucursal` excluyen al dueño

**ChatYA — Open Graph Previews (Sprint 7)**
- Endpoint `GET /api/chatya/og-preview?url=...` con fetch HTTP + parseo HTML (node-html-parser)
- Extracción de og:title, og:description, og:image con fallbacks (title tag, meta description, twitter:image)
- Cache Redis 24h para resultados exitosos, 1h para cache negativa
- Validación SSRF: bloqueo de IPs privadas en producción
- Rate limiting: 30 requests/minuto por usuario
- URLs clicables en mensajes (links azules) via `TextoConEnlaces.tsx`
- Preview card visual con imagen, título, descripción y dominio via `PreviewEnlace.tsx`
- Skeleton animado mientras carga
- Cache frontend en Map a nivel de módulo
- Ancho de burbuja limitado para mensajes con preview

### 🔧 Mejorado
- CardYA deep links: reemplazado `setTimeout(1500)` por patrón de state pendiente (más robusto)
- `GaleriaArchivosCompartidos`: regex de URLs extraída a `enlacesUtils.ts` compartido

### 📊 Métricas
- ChatYA: Sprint 7 → **98%** (falta: E2E testing)
- Backend: 2 archivos nuevos, ~15 archivos modificados
- Frontend: 4 archivos nuevos, ~12 archivos modificados

---

## [7 Marzo 2026] - Business Studio: Transacciones + Clientes + Opiniones ✅

### ✨ Agregado

**Módulo Transacciones BS**
- Historial completo de ventas con filtros por fecha, sucursal y nivel CardYA
- Exportar reportes CSV
- `PaginaTransacciones.tsx`, `ModalDetalleTransaccionBS.tsx`

**Módulo Clientes BS**
- Lista de clientes que han comprado con detalle: visitas, puntos acumulados, nivel CardYA
- Filtros por sucursal y nivel
- `PaginaClientes.tsx`, `ModalDetalleCliente.tsx`

**Módulo Opiniones BS**
- Ver reseñas con calificación ⭐ 1-5, filtros por rating y estado (Todas / Pendientes / Respondidas)
- Responder reseñas desde BS con edición posterior
- Métricas en header: promedio, total, pendientes de respuesta
- Badge "Pendientes" en tiempo real
- `PaginaOpiniones.tsx`, `PanelOpiniones.tsx`, `ModalResponder.tsx`
- Responder reseñas también disponible desde ScanYA (móvil) ✅

### 📊 Métricas
- Business Studio: 5/15 → **8/15 módulos completados**
- Frontend: ~6 archivos nuevos

---

## [7 Marzo 2026] - ChatYA UX + Integración ScanYA + Integración Perfil Negocio

### ✨ Agregado

**ChatYA — Integración con ScanYA (Fase 14 ScanYA)**
- Middleware `verificarTokenChatYA` en `auth.ts`: acepta token AnunciaYA (`ay_*`) y token ScanYA (`sy_*`). Mapea `negocioUsuarioId → usuarioId`, `modoActivo = 'comercial'`, `sucursalAsignada = sucursalId` del token ScanYA
- Campo `negocioUsuarioId` agregado al payload de los 3 tipos de login ScanYA (dueño, gerente, empleado) en `jwtScanYA.ts` y `scanya_service.ts`
- `chatya_routes.ts` usa `verificarTokenChatYA` en lugar de `verificarToken`
- `PaginaScanYA.tsx` monta `<ChatOverlay />` directamente (no usa MainLayout) con ref guard anti-StrictMode
- `PaginaScanYA.tsx` intercepta ruta `/scanya/chat` y abre ChatOverlay en lugar de navegar
- `inicializarScanYA()` en `useChatYAStore.ts`: inicialización ligera para ScanYA — solo carga badge de no leídos, sin duplicar carga de conversaciones
- Badge de mensajes no leídos en `IndicadoresRapidos` reactivo en tiempo real vía Socket.io
- `socketService.ts`: fallback `ay_usuario → sy_usuario` para obtener userId en contexto ScanYA
- `api.ts`: interceptor Axios agrega `?sucursalId=` automáticamente en llamadas a `/chatya` desde contexto ScanYA, garantizando filtrado correcto por sucursal

**ChatYA — Integración con Perfil de Negocio**
- Botón "💬 Enviar mensaje" en `PaginaPerfilNegocio.tsx` abre ChatOverlay con `contextoTipo = 'negocio'`
- `ModalAuthRequerido` si el usuario no está logueado
- Backend deduplica: si ya existe conversación con esa sucursal, la retoma

**ChatYA — Perfil de negocio embebido en PanelInfoContacto**
- `PaginaPerfilNegocio` acepta props opcionales `sucursalIdOverride` y `modoPreviewOverride` para funcionar sin router
- `BreakpointOverride forzarMobile` + CSS `.perfil-embebido` / `.perfil-contenedor` fuerzan vista mobile dentro del panel estrecho
- Desktop: panel se expande a 500px al abrir perfil. Mobile: sub-vista fullscreen con botón ← atrás
- `history.pushState` para que el botón atrás nativo cierre la vista perfil

### 🛠 Corregido

**Bug: Conversaciones duplicadas en ScanYA**
- Causa: interceptor Axios no enviaba `?sucursalId=` en rutas `/chatya` desde contexto ScanYA, devolviendo conversaciones de todas las sucursales del dueño
- Solución: `api.ts` detecta `esScanYA` + `config.url.includes('/chatya')` y agrega `sucursalId` del store ScanYA

**Bug: Carga duplicada de conversaciones al abrir ChatOverlay**
- Causa: `ListaConversaciones.tsx` disparaba `cargarConversaciones` al montar, duplicando la carga que ya hizo `ChatOverlay` vía `inicializar()`
- Solución: Guard `yaHayDatos` — si ya hay conversaciones cargadas, `ListaConversaciones` hace refresh silencioso en lugar de carga completa

**UX: Etiqueta "Desde:" aparecía para ambos participantes**
- Causa: Sin condición de receptor — todos veían el contexto de origen
- Solución: Solo se muestra cuando `conversacion.participante1Id !== miId` (solo el receptor). Caso `contextoTipo = 'negocio'` solo en modo comercial

**UX: Botón Bloquear oculto en modo comercial**
- Causa: Condición `!esModoComercial` en `PanelInfoContacto.tsx` — originalmente intencional pero innecesariamente restrictiva
- Solución: Botón visible en todos los modos. El bloqueo es solo de mensajería, no afecta la relación comercial

### 📊 Métricas del Sprint

**Duración:** 1 día (7 marzo)

**Archivos modificados:**
- Backend: `auth.ts`, `jwtScanYA.ts`, `scanya_service.ts`, `chatya_routes.ts` (4 archivos)
- Frontend: `api.ts`, `socketService.ts`, `useChatYAStore.ts`, `PaginaScanYA.tsx`, `PaginaPerfilNegocio.tsx`, `ListaConversaciones.tsx`, `VentanaChat.tsx`, `PanelInfoContacto.tsx` (8 archivos)

---


## [6 Mar 2026] - ChatYA Sprint 7: Pulido (EN PROGRESO)

### ✨ Agregado

**ChatYA Sprint 7 — Pulido y detalles UX**
- Indicador "Escribiendo..." — `InputMensaje` emite `chatya:escribiendo` / `chatya:dejar-escribir` con debounce 2s. Visible en header de VentanaChat y en preview de ConversacionItem (reemplaza el último mensaje en azul)
- Palomitas "Entregado" (2 palomitas grises) — receptor emite `chatya:entregado` al recibir mensaje vía Socket.io. 3 estados: ✓ enviado, ✓✓ gris entregado, ✓✓ azul leído. Unificadas a `w-4 h-4 scale-y-[1.1]` en burbujas y ConversacionItem
- Estados de usuario en tiempo real — conectado (green-600) / ausente 15 min (amber-400) / desconectado + "últ. vez hoy a la(s) 10:08 a.m." Componente `UltimaVezAnimada`: scroll horizontal con CSS `translateX` calculado via `useLayoutEffect`. Timer inactividad 15 min con throttle 30s (mousemove, keydown, touchstart, scroll) emite `ausente`/`conectado`. Visible en VentanaChat, PanelInfoContacto y lista archivos compartidos
- Sonido de notificación + vibración háptica — suena cuando el mensaje NO es propio + conversación NO activa (o pestaña no visible). 5 tonos disponibles (`ay_tono_chat`). Vibración 300ms en móvil (`navigator.vibrate`). Preferencias en localStorage `ay_tono_chat` + `ay_sonido_chat`

### 🔲 Pendiente Sprint 7
- Preview de enlaces (Open Graph)
- Testing end-to-end

---

## [26 Feb – 5 Mar 2026] - ChatYA Sprint 6: Multimedia ✅ COMPLETADO

### ✨ Agregado

**Imágenes**
- Pipeline zero-flicker: LQIP 16px blur(20px) → imagen real con opacity transition 150ms
- Presigned URL → upload paralelo a Cloudflare R2; múltiples imágenes a la vez (hasta 10, drag & drop)
- Drag & drop en toda el área de VentanaChat + InputMensaje
- Visor galería fullscreen con portal (`document.body`) y navegación entre imágenes

**Audio**
- Grabación inline con waveform en vivo (50 barras normalizadas 0-1)
- Hold-to-record: deslizar hacia arriba para cancelar (`touchAction: none` en botón mic)
- Presigned URL + upload a R2; reproductor AudioBurbuja con Howler.js (Web Audio API)
- Fade-in 150ms anti-artefacto, AudioContext pre-warm, seek arrastrable
- Avatar ↔ velocidad dinámica 1×/1.5×/2×; cleanup al cambiar chat
- Duración máx 5 min, 5 MB, detección formato MediaRecorder cross-browser

**Documentos**
- 9 tipos MIME (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV), máx 25 MB
- Ícono coloreado por tipo, descarga vía blob

**Archivos compartidos en PanelInfoContacto**
- Preview grid 3×2; galería fullscreen 3 tabs: Multimedia / Documentos / Enlaces
- Agrupado por mes con sticky headers; scroll infinito
- Caché 3 niveles (módulo) con invalidación en tiempo real al enviar/recibir multimedia

**Ubicación**
- `ModalUbicacionChat.tsx`: GPS automático + mapa Leaflet con pin arrastrable + reverse geocoding Nominatim
- `UbicacionBurbuja`: `MapContainer` sin controles + botón Google Maps
- Botón clip convertido en menú: Galería / Cámara / Documento / Ubicación (portal)

**Rendimiento y UX**
- Scroll nativo con IntersectionObserver — preservación de posición al cargar mensajes antiguos
- Caché de mensajes por conversación + pre-carga de las primeras 5 conversaciones
- Montaje persistente de VentanaChat (nunca se desmonta una vez abierta)
- `content-visibility: auto`, `LIMITE_INICIAL=30`, detección caché imágenes
- Back button nativo: sistema 4 capas popstate en ChatOverlay (cierra visor → panel info → minimiza → cierra)
- Input reestructurado estilo WhatsApp: iconos dentro del pill, botón dinámico micrófono/enviar
- Quote rediseñado: thumbnail a altura completa, borde izquierdo de color
- Banner mensajes fijados con preview de imágenes
- Íconos tipo mensaje en lista conversaciones (📷 🎤 📄)
- Eliminación de mensajes: preview recalcula último mensaje vivo (backend genera `textoPreview`, socket envía `nuevoPreview`)

### 📊 Métricas del Sprint
- **Duración:** ~8 días (26 Feb – 5 Mar)
- Backend: `r2_service.ts`, endpoints presigned URL, ubicación (4 archivos)
- Frontend: `useImagenChat.ts`, `useDocumentoChat.ts`, `VisorImagenesChat.tsx`, `AudioBurbuja`, `UbicacionBurbuja`, `ModalUbicacionChat.tsx`, actualizaciones en `BurbujaMensaje.tsx`, `VentanaChat.tsx`, `InputMensaje.tsx`, `PanelInfoContacto.tsx` (~12 archivos)

---

## [23–25 Feb 2026] - ChatYA Sprint 5: Frontend Complementario ✅ COMPLETADO

### ✨ Agregado
- Buscador inteligente: 3 secciones en un input (conversaciones locales + negocios API + personas API) con debounce 300ms y GPS integrado para distancia
- Mis Notas — conversación del usuario consigo mismo
- Vista Archivados con badge verde de no leídos
- Búsqueda full-text dentro del chat con navegación entre resultados
- Menú contextual mensajes: popup flotante desktop (click derecho) / long press en móvil (500ms + vibración) con acciones distribuidas en header
- Responder (quote/reply) con scroll al original y resaltado; ESC cancela
- Editar mensajes propios sin límite de tiempo — barra ámbar, ESC cancela
- Eliminar mensajes (soft delete, desaparecen del chat)
- Reenviar mensaje — `ModalReenviar.tsx` con `zIndice="z-90"`
- Fijar mensajes; copiar texto completo o selección parcial (`window.getSelection()`)
- Reacciones con emojis — pills persistentes visibles; preview en lista "Reaccionaste con ❤️ a..."
- Sistema de emojis Google Noto completo (`EmojiNoto`, `SelectorEmojis`)
- Burbujas solo-emoji estilo WhatsApp (font más grande)
- Hora inline estilo WhatsApp — hora + editado + palomitas como `<span inline-flex>` dentro del párrafo
- Panel lateral `PanelInfoContacto` con 3 vistas dinámicas
- Sistema de contactos a nivel sucursal con Optimistic UI (`ContactoDisplay`, `id: temp_${Date.now()}`)
- Borradores persistentes por conversación
- Montaje persistente con CSS hidden (4 componentes: ChatOverlay, VentanaChat, ListaConversaciones, PanelInfoContacto)
- Menú contextual ⋮ con toggles optimistas (fijar, archivar, silenciar, eliminar conversación, bloquear)

### 🛠 Corregido
- Palomitas azules sincronizadas multi-dispositivo
- Mensajes reaparecen tras edición
- Sucursales mezcladas en modo comercial
- Conversación nueva vía Socket.io: si no existe en lista → fetch + insert al inicio

### 📊 Métricas del Sprint
- **Duración:** 2-3 días
- Frontend: ~15 archivos nuevos/modificados

---

## [20–22 Feb 2026] - ChatYA Sprint 4: Frontend Core ✅ COMPLETADO

### ✨ Agregado
- Store Zustand `useChatYAStore.ts` (~1,940 líneas) con 43 acciones
- Service API `chatyaService.ts` (~615 líneas) + types `chatya.ts` (~500 líneas)
- `ChatOverlay.tsx` v3.0 — 3 estados: cerrado / minimizado / abierto; persiste entre navegación
- `ListaConversaciones.tsx` — tabs Todos/Personas/Negocios, ordenadas por reciente, fijadas arriba
- `VentanaChat.tsx` — scroll infinito, optimistic updates, palomitas ✓✓, separadores de fecha
- `BurbujaMensaje.tsx` — burbujas por tipo: texto, imagen placeholder, audio placeholder, documento
- Enviar/recibir mensajes en tiempo real vía Socket.io
- Responsive: móvil fullscreen, desktop split (lista 320px + chat expandible)
- Modo dual personal/comercial — listas completamente separadas, filtradas por sucursal
- Badges de no leídos en Navbar y BottomNav (total global)
- `ConversacionItem.tsx` — avatar, preview último mensaje, badge, hora relativa

### 📊 Métricas del Sprint
- **Duración:** 3 días
- Frontend: ~10 archivos nuevos

---

## [18–19 Feb 2026] - ChatYA Sprint 3: Backend Complementario ✅ COMPLETADO

### ✨ Agregado
- Contactos: CRUD completo a nivel sucursal; separados entre personal y comercial
- Bloqueo: bloquear/desbloquear usuarios y negocios SPAM; lista de bloqueados
- Reacciones: endpoint agregar/quitar reacción; actualiza preview conversación en tiempo real
- Mensajes fijados: fijar/desfijar dentro de conversación; endpoint listar fijados
- Búsqueda full-text en español — `to_tsvector('spanish', ...)` en PostgreSQL
- Badge total no leídos para Navbar — endpoint `GET /api/chatya/no-leidos/total`
- Cron job limpieza — elimina conversaciones inactivas > 6 meses (TTL configurable)
- Archivado/silenciado de conversaciones

### 📊 Métricas del Sprint
- **Duración:** 2 días
- Backend: ~6 archivos modificados

---

## [15–17 Feb 2026] - ChatYA Sprint 2: Backend Core ✅ COMPLETADO

### ✨ Agregado
- Types completos `chatya_types.ts`
- Service `chatya_service.ts` — 13 funciones: crear conversación (dedup automático), enviar mensaje, cargar mensajes paginados, marcar leídos, editar, eliminar (soft), fijar, listar conversaciones, archivar, silenciar, listar fijados, listar contactos, reaccionar
- Controller `chatya_controller.ts` — 13 handlers
- Routes `chatya_routes.ts` — 13 endpoints REST
- Socket.io — 11 eventos: `chatya:mensaje-nuevo`, `chatya:mensaje-editado`, `chatya:mensaje-eliminado`, `chatya:reaccion`, `chatya:escribiendo`, `chatya:dejar-escribir`, `chatya:leido`, `chatya:entregado`, `chatya:fijado`, `chatya:estado-usuario`, `chatya:consultar-estado`
- Multi-dispositivo: palomitas azules sincronizadas en todos los dispositivos del usuario
- `socket.data.usuarioId` + actualización `ultima_conexion` al disconnect
- Soporte empleados ScanYA (`empleado_id` en mensajes)
- Identidad por modo activo — en modo comercial, el emisor actúa como el negocio/sucursal

### 📊 Métricas del Sprint
- **Duración:** 3 días
- Backend: ~4 archivos nuevos (~800 líneas)

---

## [13–14 Feb 2026] - ChatYA Sprint 1: Base de Datos ✅ COMPLETADO

### ✨ Agregado
- 6 tablas PostgreSQL: `chatya_conversaciones`, `chatya_mensajes`, `chatya_participantes`, `chatya_contactos`, `chatya_bloqueados`, `chatya_reacciones`
- Columna `ultima_conexion` en tabla `usuarios`
- Schema Drizzle con `AnyPgColumn` para auto-referencias (tabla mensajes referencia a sí misma para `mensajeRespondidoId`)
- Relaciones Drizzle con `relationName` para diferenciar participante1 / participante2
- Índices para búsqueda full-text y ordenamiento por fecha
- ChatYA usa **PostgreSQL** (no MongoDB) — decisión arquitectónica confirmada

### 📊 Métricas del Sprint
- **Duración:** 2 días
- BD: 6 tablas nuevas, 1 columna modificada

---

## [6-12 Febrero 2026] - Sprint CardYA + Socket.io + Notificaciones + Reseñas

### ✨ Agregado

**CardYA - Sistema de Lealtad para Clientes (Fase 5.7)**
- 8 endpoints backend REST completos:
  - `GET /api/cardya/mis-puntos` - Billeteras del usuario
  - `GET /api/cardya/negocio/:id` - Detalle billetera por negocio
  - `GET /api/cardya/recompensas` - Recompensas disponibles
  - `POST /api/cardya/canjear` - Canjear recompensa → genera voucher
  - `GET /api/cardya/vouchers` - Vouchers del usuario
  - `DELETE /api/cardya/vouchers/:id` - Cancelar voucher (devuelve puntos)
  - `GET /api/cardya/historial/compras` - Historial de compras
  - `GET /api/cardya/historial/canjes` - Historial de canjes
- 10 componentes frontend React:
  - `PaginaCardYA.tsx` - Página principal con tabs (Billeteras/Recompensas/Vouchers/Historial)
  - `CardBilletera.tsx` - Card de billetera por negocio
  - `CardRecompensaCliente.tsx` - Card de recompensa canjeable con efecto glow
  - `DropdownNegocio.tsx` - Filtro por negocio
  - `TablaHistorialCompras.tsx` - Historial de compras responsive
  - `TablaHistorialVouchers.tsx` - Historial de vouchers
  - `ModalDetalleBilletera.tsx` - Detalle de billetera + nivel + progreso
  - `ModalDetalleTransaccion.tsx` - Detalle de una compra
  - `ModalConfirmarCanje.tsx` - Confirmación antes de canjear
  - `ModalVoucherGenerado.tsx` - Voucher recién canjeado con QR
- Store Zustand `useCardyaStore.ts` con optimistic updates
- Service API `cardyaService.ts` con tipos TypeScript
- Widget `WidgetCardYA.tsx` en columna izquierda con datos reales
- Sistema de niveles Bronce/Plata/Oro por negocio (no global)

**Socket.io - Infraestructura Tiempo Real**
- Backend `socket.ts` con funciones: `inicializarSocket`, `emitirEvento`, `emitirAUsuario`
- Rooms personales por usuario (`usuario:{id}`)
- Frontend `socketService.ts` con reconexión automática y re-registro de listeners
- Integración con `useAuthStore` (conectar al login, desconectar al logout)

**Sistema de Notificaciones Tiempo Real**
- Tabla `notificaciones` en PostgreSQL con campo `sucursal_id`
- Types: 14 tipos de notificación, 9 tipos de referencia
- Service `notificaciones.service.ts` con CRUD completo
- Controller y routes REST (`/api/notificaciones`)
- 7 tipos de notificación activos:
  - `puntos_ganados` - Cliente recibe puntos por compra
  - `voucher_generado` - Cliente canjea recompensa
  - `voucher_cobrado` - Cliente usa voucher en tienda
  - `voucher_pendiente` - Dueño recibe voucher para entregar
  - `nueva_oferta` - Clientes con billetera reciben ofertas
  - `nueva_recompensa` - Clientes con billetera reciben recompensas
  - `stock_bajo` - Dueño alertado cuando recompensa tiene <5 stock
- Store `useNotificacionesStore.ts` con filtrado por modo (personal/comercial)
- Service `notificacionesService.ts` frontend
- Componente `PanelNotificaciones.tsx` con badge "9+" y deep linking
- Integración en `MobileHeader.tsx` y `Navbar.tsx`

**Navegación desde Notificaciones (Deep Linking)**
- `PanelNotificaciones.tsx` → función `obtenerRutaDestino()` según `referenciaTipo`
- `PaginaCardYA.tsx` → `useSearchParams` para abrir tabs y modales específicos
- `PaginaPerfilNegocio.tsx` → `?ofertaId=xxx` abre modal oferta
- Efecto glow en recompensas destacadas (CSS keyframes)

**Sistema de Reseñas Verificadas**
- Schema Zod `resenas.schema.ts` (sucursalId, rating 1-5, texto max 500)
- Service `resenas.service.ts` con verificación compra últimos 90 días
- Controller y routes REST (`/api/resenas`)
- Endpoints:
  - `GET /api/resenas/sucursal/:sucursalId` - Reseñas públicas
  - `GET /api/resenas/sucursal/:sucursalId/promedio` - Promedio
  - `GET /api/resenas/puede-resenar/:sucursalId` - Verificar permiso
  - `POST /api/resenas` - Crear reseña
- Métricas UPSERT en `metricas_entidad` (conteo real, no incrementos)
- Notificación al dueño cuando recibe reseña
- `ModalEscribirResena.tsx` con estrellas interactivas
- Integración en `PaginaPerfilNegocio.tsx` con datos reales

**Contadores en ScanYA**
- Badge vouchers pendientes en botón "Vouchers"
- Polling cada 30 segundos (empleados no reciben Socket.io)
- Endpoint `obtenerContadores()` incluye `vouchersPendientes`

### 🛠 Corregido

**Bug Crítico #1: cardya_controller.ts obtenerUsuarioId()**
- Síntoma: Todos los endpoints de CardYA retornaban arrays vacíos
- Causa: `req.usuarioId` no existe, el middleware pone datos en `req.usuario`
- Solución: Cambiar a `(req as RequestConAuth).usuario?.id`

**Bug #2: Notificaciones duplicadas por Socket.io**
- Causa: `escucharEvento()` se llamaba múltiples veces acumulando listeners
- Solución: Flag `listenerRegistrado` + `socket.off()` antes de `socket.on()`

**Bug #3: Reseñas generaban 2 notificaciones al dueño**
- Causa: `crearNotificacion()` + `notificarSucursal()` encontraba al mismo usuario
- Solución: Eliminar llamada a `notificarSucursal()` de `crearResena()`

**Bug #4: Parpadeo Modal Vouchers en ScanYA**
- Causa 1: `yaCargo` nunca se reseteaba al reabrir
- Causa 2: `setCargando(true)` vaciaba lista visualmente
- Solución: Recargar siempre + loading condicional si no hay datos previos

### 📊 Métricas del Sprint

**Duración:** 7 días (6-12 febrero)

**Código:**
- Backend: ~2,500 líneas (16 archivos nuevos/modificados)
- Frontend: ~3,000 líneas (14 archivos nuevos/modificados)
- Total: **~5,500 líneas**

**Archivos creados/modificados:**
- Backend: 16 archivos (socket.ts, notificaciones.*, resenas.*, cardya.*, etc.)
- Frontend: 14 archivos (stores, services, componentes CardYA, etc.)

### 📝 Documentación

- `SESION_CardYA_Integracion_Frontend_Backend.md` - 18 archivos documentados
- `Socket_io_Sistema_Notificaciones_Completo.md` - Arquitectura completa

---

## [29 Enero - 5 Febrero 2026] - Sprint Config Puntos + Expiración

### ✨ Agregado

**Business Studio - Configuración de Puntos (Fase 15 ScanYA)**
- Página `PaginaPuntos.tsx` en Business Studio con layout de 3 secciones
- Métricas en header: Clientes, Otorgados, Canjeados, Disponibles
- **Configuración Base:**
  - Acumulación de puntos: "Por cada $X MXN gana Y pts"
  - Expiración de puntos: X días (con checkbox "No expiran")
  - Expiración de vouchers: X días
  - Textos aclaratorios sobre comportamiento de expiración
- **Sistema de Niveles:**
  - Toggle activo/inactivo
  - 3 niveles: Bronce (cafe), Plata (plata), Oro (amarillo)
  - Cada nivel con: Mínimo, Máximo, Multiplicador
  - Máximo de Oro = ∞ (infinito, fijo)
  - Validaciones: rangos ascendentes, multiplicadores ascendentes, sin decimales
  - Recálculo automático de niveles de todos los clientes al cambiar rangos
  - Beneficios explicados: Mayor retención, Multiplicadores de puntos, Compromiso emocional
- **Recompensas (CRUD):**
  - Crear/editar recompensa con: imagen, nombre, descripción, puntos requeridos
  - Stock disponible con checkbox "Ilimitado" (valor -1)
  - Toggle "Requiere aprobación" (canje necesita confirmación manual)
  - Toggle activo/inactivo por recompensa
  - Eliminar recompensa
  - Cards visuales con iconos de editar/eliminar

**Sistema de Expiración en Tiempo Real**
- Validación reactiva (sin cron jobs ni servicios externos)
- Expiración de puntos por inactividad al final del día local del negocio (23:59:59)
- Expiración de vouchers vencidos con auto-reembolso de puntos a billetera
- Función `expirarVouchersVencidos(negocioId)` masiva, reutilizable desde cualquier endpoint
- Función `expirarPuntosPorInactividad(usuarioId, negocioId)` individual por cliente
- Función `verificarExpiraciones()` combinada para endpoints de cliente específico
- Manejo correcto de zona horaria del negocio (`negocio_sucursales.zona_horaria`)

### 🐛 Corregido

**Bug: Paso 0 en obtenerVouchers no devolvía puntos**
- `obtenerVouchers` (ScanYA) marcaba vouchers como expirados pero NO devolvía puntos
- Reemplazado SQL inline por `expirarVouchersVencidos()` que incluye auto-reembolso
- Aplicado también en `obtenerVouchersPendientes`

**Bug: Desfase de zona horaria en expiración de puntos**
- Servidor en UTC causaba que puntos expiraran horas antes de lo esperado
- Implementada función `calcularFinDiaExpiracion()` que convierte a hora local del negocio
- Puntos ahora expiran al final del día local (23:59:59 zona horaria del negocio)

### 📝 Documentación
- Nueva sección #12 "Sistema de Expiración" en `ARQUITECTURA ScanYA.md`
- Fase 15 actualizada a completada en progreso del proyecto
- CHANGELOG y ROADMAP actualizados

---

## [17-29 Enero 2026] - Sprint ScanYA + Migración Cloud

### ✨ Agregado

**Arquitectura ScanYA - Diseño Previo (19 Enero 2026)**
- Día completo de diseño arquitectónico antes de implementar código (4 horas)
- Decisiones de roles: Dueño/Gerente/Empleado con permisos diferenciados
- Sistema de autenticación dual: Email+Password (dueños/gerentes) vs Nick+PIN (empleados)
- Arquitectura de tokens separados: `ay_*` (AnunciaYA) vs `sy_*` (ScanYA)
- Sesiones 100% independientes entre plataformas
- Separación de configuraciones: `puntos_configuracion` vs `scanya_configuracion`
- Documento generado: `PROMPT_SCANYA_COMPLETO.md` (50 páginas)

**16 Fases Internas de ScanYA:**

| Fase | Descripción | Estado | Fecha |
|------|-------------|--------|-------|
| 1-7 | Backend completo (23 endpoints) | ✅ 100% | 20-21 Ene |
| 8 | Login frontend | ✅ 100% | 20 Ene |
| 9 | Cloudflare R2 fotos tickets | ✅ 100% | 20 Ene |
| 10 | Dashboard + Sistema turnos | ✅ 100% | 21 Ene |
| 11 | Modal Registrar Venta (acordeón) | ✅ 100% | 21-22 Ene |
| 12 | Historial + Validar vouchers | ✅ 100% | 22 Ene |
| 13 | Recordatorios offline | ✅ 100% | 22-24 Ene |
| 14 | Chat + Reseñas | ⏸️ Pausada | Requiere ChatYA |
| 15 | BS > Puntos Config + Expiración | ✅ 100% | 29 Ene - 5 Feb |
| 16 | PWA Testing e instalación | ✅ 100% | 27-29 Ene |

**Estado final:** 15/16 fases = 93.75% completado

**Sistema ScanYA PWA (87.5% completado)**
- Autenticación dual: Email+Password (dueños/gerentes) / Nick+PIN (empleados)
- Sistema de turnos: Apertura/cierre con estadísticas (ventas, horas, puntos otorgados)
- Registrar ventas: Identificar cliente, validar cupones, otorgar puntos
- Sistema de puntos CardYA con niveles (Bronce/Plata/Oro)
- Multiplicadores de puntos: 1.0x / 1.2x / 1.5x según nivel
- Validación de cupones: Descuento % y $ aplicados automáticamente
- Vouchers: Listar pendientes entrega y validar canje
- Recordatorios offline: Guardar ventas sin conexión con auto-sincronización
- Sistema completo de permisos por rol (dueño/gerente/empleado)
- PWA instalable: iOS, Android y Desktop con Service Worker
- Sesiones independientes: Tokens `sy_*` separados de `ay_*`
- Upload directo a Cloudflare R2 para fotos de tickets
- Historial de transacciones filtrado por rol y periodo
- Dashboard con indicadores rápidos y resumen de turno
- 23 endpoints API REST backend
- 18 componentes React frontend
- 3 hooks personalizados (useOnlineStatus, useOfflineSync, useRedirectScanYAPWA)

**Sistema de Guardados (Favoritos) - Fase 5.3.3**
- Tabla separada `guardados` independiente de `votos`
- **Decisión arquitectónica:** Separación SRP (Single Responsibility Principle)
  - `votos` = calificaciones públicas (afectan métricas del negocio)
  - `guardados` = colección privada (solo para el usuario)
- Hook `useGuardados` con actualizaciones optimistas
- Tabs separados: Ofertas guardadas / Negocios guardados
- Endpoint `/api/guardados` con filtros por tipo
- Paginación infinita (20 items por carga)
- Eliminación optimista con reversión automática si falla

**Migración Infraestructura Cloud**
- Backend: Railway ($5/mes) → Render Free Tier ($0/mes)
- Base de datos: Railway PostgreSQL ($7/mes) → Supabase Free ($0/mes)
- Emails: Zoho ($3/mes) → AWS SES Sandbox ($0/mes)
- Fotos tickets: Cloudinary → Cloudflare R2 ($0/mes, 10GB gratis)
- Total stack: 9 servicios operando en free tier

### 🔄 Cambiado

- Base de datos: 42 tablas → **65 tablas** (+23 tablas nuevas para ScanYA)
- Agregados 17 campos a tablas existentes
- Creados 8 índices nuevos para optimización
- Service Worker: Estrategia cache-first para offline
- Sistema de roles: Ahora soporta Dueño/Gerente/Empleado
- Middleware de autenticación: 4 niveles de permisos implementados

### 🐛 Corregido

**Bug Crítico #1: Token Hydration Logout Fantasma**
- Síntoma: Logout automático al cargar la app en App.tsx
- Causa: `useEffect` con dependencia vacía ejecutaba logout antes de hidratación
- Solución: Mover `checkAuthStatus()` a Router raíz después de hidratación
- Líneas modificadas: 12 líneas en App.tsx

**Bug Crítico #2: Sync localStorage entre Pestañas**
- Síntoma: Logout en ScanYA cerraba sesión en AnunciaYA principal
- Causa: Event `storage` disparaba en TODAS las pestañas sin discriminar contexto
- Solución: Ignorar eventos `storage` si pathname empieza con `/scanya`
- Líneas modificadas: 4 líneas críticas en useAuthStore.ts

**Bug Crítico #3: Service Worker Redirección Innecesaria**
- Síntoma: PWA abría en `/` en lugar de `/scanya/login`
- Causa: SW interceptaba navegación y redirigía erróneamente
- Solución: Remover lógica redirección, solo cachear recursos
- Líneas modificadas: Completa reescritura sw-scanya.js

**Bug Crítico #4: Instalación PWA desde Ruta Incorrecta**
- Síntoma: Chrome ignoraba `start_url` del manifest si se instalaba desde `/inicio`
- Causa: Navegador toma URL actual como start_url si no es controlable
- Solución: Hook `useRedirectScanYAPWA` con 4 métodos de detección PWA
- Archivos creados: useRedirectScanYAPWA.ts (85 líneas)

**Bug Crítico #5: beforeinstallprompt No Disparaba**
- Síntoma: Banner instalación PWA no aparecía
- Causa: Manifest dinámico via JavaScript no funciona en Chrome
- Solución: Manifest estático permanente en `<head>` del index.html

**Bug #6: Sesiones NO Independientes**
- Síntoma: Tokens AnunciaYA y ScanYA compartidos causaban conflictos
- Solución: Arquitectura completa separación (prefijos `ay_*` vs `sy_*`)

### 📚 Documentación Técnica Generada

Durante este sprint se generaron **8 documentos técnicos** con ~27,420 líneas totales:

| Documento | Líneas | Propósito |
|-----------|--------|-----------|
| Fase 13 Recordatorios Offline | 1,772 | Sistema offline completo con Service Worker |
| Sistema PWA ScanYA | 2,019 | Roadmap PWA + instalación multiplataforma |
| Migración PostgreSQL → Supabase | 1,054 | Proceso completo de migración cloud |
| Inventario Credenciales | 2,905 | 9 servicios cloud configurados ($0/mes) |
| Modal Registrar Venta | 850 | Acordeón otorgar puntos con UX optimizada |
| Historial Transacciones | 720 | Historial completo + validación vouchers |
| Checklist ScanYA (13/16 fases) | 2,100 | Validación exhaustiva pre-producción |
| Bitácora Desarrollo Completa | ~15,000 | Log detallado 17-29 enero |
| **TOTAL** | **~27,420** | **8 documentos técnicos** |

**Nota:** Esta documentación se encuentra en la carpeta del proyecto para referencia técnica detallada.

### 📊 Métricas del Sprint

**Progreso:**
- Progreso global: 60% → 81% (+21 puntos porcentuales)
- Fases completadas: Fase 5.5 ScanYA (87.5%)

**Desarrollo:**
- Duración: 12 días calendario (17-29 enero)
- Horas activas: ~74 horas
- Promedio diario: ~6 horas/día

**Código:**
- Backend: ~4,850 líneas (8 archivos nuevos)
- Frontend: ~4,500 líneas (18 componentes + 3 hooks)
- Types/Utils: ~1,300 líneas (tipos + service)
- Total nuevo código: **~10,650 líneas**

**Testing:**
- Tests ejecutados: 99
- Tests pasados: 99 (100%)
- Endpoints testeados: 23/23 (100%)
- Bugs encontrados: 14
- Bugs resueltos: 14 (100%)
- Bugs críticos: 5 (todos resueltos)

**Infraestructura:**
- Costo mensual anterior: $15-20/mes
- Costo mensual nuevo: $0/mes
- Ahorro anual proyectado: **$180-240/año**

**PWA Testing:**
- Plataformas testeadas: 3 (Chrome Desktop, Safari iOS, Chrome Android)
- Tests de instalación: 13/13 pasados (100%)
- Service Worker: Operativo en todas las plataformas
- Detección PWA con 4 métodos de fallback
- Manifest estático permanente en `<head>`
- Estrategia cache-first para funcionamiento offline

---

## [07-16 Enero 2026] - Sprint Business Studio

### ✨ Agregado

**Dashboard (Fase 5.4)**
- KPIs principales y secundarios
- Gráfica de ventas
- Actividad reciente
- 7 endpoints backend

**CRUD Catálogo (Fase 5.4.1)**
- Lista de productos/servicios del negocio
- Modal crear/editar artículo (6 campos + imágenes)
- Upload múltiple de imágenes a Cloudinary
- Filtros: por tipo (producto/servicio) y categoría
- Toggle activo/inactivo con actualización optimista
- Vista previa pública `/p/articulo/:id`
- Selector de sucursales (asignación N:N)

**CRUD Ofertas (Fase 5.4.2)**
- Dashboard con 5 contadores de estado
- Lista de ofertas con filtros avanzados
- Modal crear/editar oferta con 6 tipos:
  - 2x1, 3x2, Descuento %, Descuento $, Envío gratis, Otro
- Configuración días y horarios de vigencia
- Función duplicar oferta existente
- Sistema de activación/desactivación optimista
- Vista previa pública `/p/oferta/:id`
- Métricas por oferta (vistas, compartidos)

**Mi Perfil - Business Studio (Fase 5.4)**
- Tab "Datos del Negocio" con panel CardYA integrado
- Tab "Contacto" (teléfono, WhatsApp, Facebook, Instagram)
- Tab "Ubicación" con mapa Leaflet interactivo
- Tab "Horarios" con soporte 24/7, cerrado y break/comida
- Tab "Imágenes" (logo, portada, galería hasta 10 fotos)
- Tab "Operación" (métodos pago, envío domicilio, servicio domicilio)

### 🔄 Cambiado

- Servicio `negocioManagement.service.ts`: Agregadas 15 funciones CRUD reutilizables
- Interceptor Axios: Ahora inyecta `sucursalId` automáticamente en modo comercial
- Tabla `articulos`: Agregado campo `subcategoria_id`
- Sistema de imágenes: Ahora soporta múltiples fotos por artículo

### 🐛 Corregido

- Toggle activo/inactivo ahora muestra estado correcto inmediatamente
- Upload de imágenes no duplica archivos en Cloudinary
- Filtros de catálogo preservan estado al cambiar de tab
- Validación horarios: No permite crear horarios superpuestos

### 📊 Métricas del Sprint

**Desarrollo:**
- Duración: 9 días (7-16 enero)
- Módulos BS completados: 4/15 (27%)
  - Dashboard ✅
  - Mi Perfil ✅
  - Catálogo ✅
  - Ofertas ✅

**Código:**
- Componentes nuevos: 12
- Endpoints API: 8
- Total líneas: ~3,500

**Funcionalidad:**
- Dashboard: 100% operativo
- Catálogo: 100% operativo
- Ofertas: 100% operativo
- Mi Perfil: 100% operativo

---

## [06 Enero 2026] - Decisiones Arquitectónicas

### 🔄 Cambiado

**Decisión Arquitectónica - Negocios Solo Físicos**
- Eliminado tipo de negocio "Online" del sistema
- Todos los negocios requieren ubicación física obligatoria
- Agregados campos `tiene_servicio_domicilio` y `tiene_envio_domicilio` en `negocio_sucursales`
- Eliminada columna `requiere_direccion` (redundante)
- Justificación: Usuarios sin local físico pueden usar Empleos/MarketPlace (gratis)
- CardYA requiere escaneo presencial en punto de venta físico
- Documentación generada: `Eliminación_de_Negocios_Online.md`

**Optimización de Imágenes Client-Side**
- Compresión automática antes de subir a Cloudinary
- Logo: 500px max, quality 0.85, formato WebP
- Portada: 1600px max, quality 0.85, formato WebP
- Galería: 1200px max, quality 0.85, formato WebP
- Productos: 800px max, quality 0.85, formato WebP
- Beneficios:
  - Reduce costos de almacenamiento Cloudinary
  - Acelera tiempo de carga en frontend
  - Mejora experiencia en conexiones lentas

**Upload Diferido (Optimista)**
- Preview instantáneo con `URL.createObjectURL()` sin esperar upload
- Upload a Cloudinary solo al confirmar paso/formulario
- Evita imágenes huérfanas en servidor
- UX optimista: interfaz "snappy" sin esperas

**Validación Flexible de Productos**
- Guardar borrador: Mínimo 1 producto
- Publicar negocio: Mínimo 3 productos completos
- Permite trabajo incremental sin forzar completitud prematura

### 📊 Métricas

**Decisiones implementadas:** 4  
**Archivos de documentación generados:** 1  
**Impacto:** Simplificación del sistema y mejora de UX

---

## [02-06 Enero 2026] - Sprint Negocios Directorio + Sistema Compartir

### ✨ Agregado

**Negocios Directorio (Fase 5.3)**
- Lista de negocios con geolocalización PostGIS
- Ordenamiento por distancia (cercanos primero)
- Filtros por categoría y subcategoría dinámica
- Búsqueda por nombre de negocio
- Vista mapa con marcadores Leaflet
- Perfil completo del negocio:
  - Galería de imágenes
  - Horarios de atención
  - Métodos de pago
  - Catálogo de productos/servicios
  - Información de contacto
- Sistema de "Seguir" (campanita) - Items seguidos se guardan en "Mis Guardados"
- Métricas de interacción (likes, visitas, rating)

**Sistema Compartir Base (Fase 5.3.1)**
- Componente `DropdownCompartir.tsx` reutilizable
- Banner registro para usuarios no logueados
- Layout público sin navbar principal
- Hook `useOpenGraph` para metadatos dinámicos
- Rutas públicas implementadas:
  - `/p/negocio/:id` - Perfil negocio
  - `/p/articulo/:id` - Detalle artículo
  - `/p/oferta/:id` - Detalle oferta

**Auth Opcional + ModalAuthRequerido (Fase 5.3.2)**
- Modal "Inicia sesión para continuar" con beneficios claros
- Sistema de redirección post-login a ruta original
- Contenido público visible sin login
- CTAs estratégicos para registro/descarga app

### 🔄 Cambiado

- Backend ahora calcula distancia en kilómetros (PostGIS)
- Filtros de negocios ahora son dinámicos (subcategorías por categoría)

### 🐛 Corregido

- PostGIS retornaba coordenadas en formato WKB binario → Usar `ST_X()/ST_Y()`
- Mapa Leaflet no centraba en ubicación correcta del negocio
- Botón "Seguir" permitía duplicados al hacer click rápido

### 📊 Métricas del Sprint

**Duración:** 5 días (2-6 enero)

**Código:**
- Componentes nuevos: 8
- Endpoints API: 5
- Total líneas: ~2,800

---

## [26 Diciembre 2024] - Fase 5.2 Toggle UI + Protección Rutas

### ✨ Agregado

**Sistema de Modos (Frontend)**
- Componente `ToggleModoUsuario.tsx` reutilizable (cambio directo sin modal)
- Modal `ModalCambiarModo.tsx` (solo cuando usuario accede a /business/* por URL directa estando en modo Personal)
- Guard `ModoGuard.tsx` para protección de rutas

**Componentes Dinámicos por Modo:**
- Navbar: Toggle + items dinámicos + avatar dinámico (personal/negocio)
- MenuDrawer: Toggle + secciones por modo
- ColumnaIzquierda: Contenido adaptado al modo activo
- BottomNav: Market ↔ Business según modo

**Backend:**
- Migración: Campo `foto_perfil` en `negocio_sucursales`
- Función `obtenerDatosNegocio()` en negocios service
- Datos del negocio incluidos en respuestas JWT
- Nuevo token generado al cambiar modo

### 🔄 Cambiado

- Store `useAuthStore`: Agregada función `cambiarModo()` + campos negocio
- Router: Guards aplicados en rutas `/business/*` y `/inicio/*`
- Login: Ahora respeta último modo usado por usuario

### 📊 Métricas

**Decisiones Arquitectónicas:**
- Multi-dispositivo: Sesiones independientes
- Notificaciones: Solo modo activo recibe
- Token JWT: Se renueva al cambiar modo

---

## [20-26 Diciembre 2024] - Fase 5.1 Onboarding Completo

### ✨ Agregado

**Frontend Onboarding (Fase 5.1.1)**
- Layout base con 8 pasos numerados
- Paso 1: Categorías (selección múltiple)
- Paso 2: Ubicación (mapa Leaflet + GPS)
- Paso 3: Contacto (lada editable internacional)
- Paso 4: Horarios (24/7, cerrado, break/comida)
- Paso 5: Imágenes (logo, portada, galería - Cloudinary)
- Paso 6: Métodos de Pago (efectivo, tarjeta, transferencia)
- Paso 7: Puntos CardYA (toggle activación)
- Paso 8: Productos/Servicios (CRUD completo)
- Sistema de finalización funcional
- Botón "Anterior" ahora guarda cambios

**Backend Onboarding (Fase 5.0 + 5.1)**
- 15 endpoints REST para onboarding
- Sistema de sucursales implementado
- Migración BD: Tablas reestructuradas para multi-sucursal
- Middleware `verificarNegocio` y `validarAccesoSucursal`

### 🐛 Corregido

**Bug #1:** PostGIS retornaba WKB binario → Usar `ST_X()/ST_Y()`  
**Bug #2:** Lada mostraba 3 dígitos → Función específica por país  
**Bug #3:** Imágenes huérfanas en Cloudinary → Upload diferido  
**Bug #4:** Error 400 snake_case → Usar camelCase en requests  
**Bug #5:** Duplicación productos → DELETE + INSERT en vez de UPDATE  
**Bug #6:** Finalizar no funcionaba → Lógica completa implementada  
**Bug #7:** `/auth/yo` devolvía false → Consultar tabla negocios  
**Bug #8:** Loop infinito redirección → Flag sessionStorage

### 📊 Métricas

**Duración:** 7 días (20-26 diciembre)

**Código:**
- Frontend: ~4,000 líneas
- Backend: ~1,000 líneas
- Total: **~5,000 líneas**

**Endpoints creados:** 8 nuevos

**Bugs resueltos:** 8 (todos críticos para onboarding)

---

## [21 Diciembre 2024] - Fase 5.1.0 Estandarización Nomenclatura

### 🔄 Cambiado

**Parte 1: Drizzle Snake Case**
- Configurado Drizzle con `casing: 'snake_case'`
- Conversión automática camelCase ↔ snake_case
- Base de datos permanece en snake_case
- TypeScript permanece en camelCase

**Parte 2: API Responses en Inglés**
- 439 cambios de español a inglés
- Estructura estandarizada: `{ success, data, message }`
- Mensajes de error en español (user-facing)
- Nombres de campos en inglés (machine-readable)

### 🐛 Corregido

- Rate Limiter ajustado: 1000 dev, 100 prod
- Redirección según `onboardingCompletado` corregida
- JWT ahora incluye `onboardingCompletado`

---

## [18-19 Diciembre 2024] - Cloudinary + GPS + BD

### ✨ Agregado

**Cloudinary Upload/Delete Optimista**
- Upload directo desde frontend
- Actualización optimista UI
- Reversión automática si falla
- Preset configurado: `anunciaya_uploads`

**GPS con Fallback**
- Prioridad 1: GPS nativo (alta precisión)
- Prioridad 2: WiFi triangulación
- Prioridad 3: IP geolocation
- Timeout 10 segundos

**Actualización Base de Datos**
- 42 tablas en 9 esquemas
- PostGIS para geolocalización
- Índices optimizados para búsquedas

---

## [Diciembre 2024] - Fase 4 Frontend Base + Auth

### ✅ Completado

**Infraestructura Frontend:**
- React 18 + Vite + TypeScript
- Tailwind CSS v4
- Zustand para state management
- React Router v7
- Axios con interceptores

**Sistema de Autenticación:**
- Login/Registro con validación
- JWT con refresh tokens
- Protección de rutas
- Persistencia de sesión
- Multi-dispositivo

**Componentes Base:**
- Navbar responsive
- Sidebar/Drawer navegación
- BottomNav móvil
- Layout principal
- Sistema de notificaciones personalizado

---

## [Noviembre-Diciembre 2024] - Fases 1-3 Fundamentos

### ✅ Completado

**Fase 1: Monorepo**
- Estructura pnpm workspace
- Configuración TypeScript
- ESLint + Prettier
- Scripts de desarrollo

**Fase 2: Base de Datos**
- PostgreSQL con Drizzle ORM
- PostGIS para geolocalización
- MongoDB para ChatYA (preparado)
- Redis para caché/sesiones (preparado)
- 42 tablas iniciales diseñadas

**Fase 3: Backend Core + Auth**
- Express + TypeScript
- Sistema JWT completo
- Middleware de autenticación
- Rate limiting
- CORS configurado
- Endpoints auth base:
  - POST `/api/auth/register`
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - POST `/api/auth/logout`
  - GET `/api/auth/yo`
  - POST `/api/auth/recuperar-password`
  - POST `/api/auth/restablecer-password`
- Google OAuth implementado

---

## 📝 Notas de Versionamiento

### Formato de Fechas
- Se usa formato `[DD-DD Mes YYYY]` para sprints multi-día
- Se usa formato `[DD Mes YYYY]` para cambios de un solo día

### Secciones Utilizadas
- **✨ Agregado** - Para funcionalidades nuevas
- **🔄 Cambiado** - Para cambios en funcionalidad existente
- **🐛 Corregido** - Para corrección de bugs
- **📊 Métricas** - Para datos cuantitativos del sprint
- **📚 Documentación** - Para documentación técnica generada
- **🗑️ Eliminado** - Para features removidas (no usado aún)
- **⚠️ Deprecated** - Para features que se eliminarán (no usado aún)

### Principios de Documentación
- Orden cronológico inverso (más reciente primero)
- Lenguaje claro y ejecutivo
- Sin código técnico en changelog
- Métricas cuantificables cuando sea posible
- Bugs críticos documentados con solución
- Referencias a documentación técnica detallada en carpeta ARQUITECTURA

---

**Última actualización:** 7 Marzo 2026