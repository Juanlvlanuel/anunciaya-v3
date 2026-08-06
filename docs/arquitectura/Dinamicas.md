# 🎟️ Dinámicas — Rifas y Concursos P2P entre Usuarios

> **Última actualización:** 6 Agosto 2026
> **Estado:** 🟡 En construcción — Fases 1-3 completas y en producción (incl. página pública para compartir y chat con contexto por ChatYA), Fase 4 (motor de sorteo) y Fase 5 (tarjeta compartible) pendientes. Único hueco funcional dentro de Fase 3: el botón "Guardar" del detalle es placeholder (ver §Decisiones y pendientes abiertos).
> **Versión:** 0.3.1 (Fase 3 + pulido visual y chat/compartir)
> **Doc de planeación original:** `docs/kit-dinamicas/Contexto_Dinamicas.md` (decisiones de producto previas a construir; este documento es la referencia técnica viva de lo ya construido — se va actualizando fase por fase).

> **Identidad visual:** Ámbar (`#f59e0b → #d97706`) — distingue a Dinámicas de MarketPlace (teal) dentro del mismo módulo compartido.
> **Política de visibilidad:** Solo modo Personal (100% P2P, igual que MarketPlace).
> **Transacción 100% offline:** igual que MarketPlace, la app NO cobra, NO retiene dinero, NO entrega el premio. Solo conecta organizador y participantes; el pago del boleto y la entrega del premio se coordinan por ChatYA fuera de la app.

---

## 📋 Índice

1. [¿Qué es Dinámicas?](#qué-es-dinámicas)
2. [Reglas no negociables](#reglas-no-negociables)
3. [Ciclo de vida de una Dinámica](#ciclo-de-vida-de-una-dinámica)
4. [Boletos y participación](#boletos-y-participación)
5. [Moderación](#moderación)
6. [Identidad visual](#identidad-visual)
7. [Pantallas y componentes](#pantallas-y-componentes)
   - [Página pública para compartir](#página-pública-para-compartir)
   - [Chat con contexto — ChatYA](#chat-con-contexto--chatya)
8. [Backend — Endpoints](#backend--endpoints)
9. [Base de Datos](#base-de-datos)
10. [Cron Jobs](#cron-jobs)
11. [Assets — Cartas de lotería mexicana](#assets--cartas-de-lotería-mexicana)
12. [Estado por fase](#estado-por-fase)
13. [Decisiones y pendientes abiertos](#decisiones-y-pendientes-abiertos)

---

## 🎯 ¿Qué es Dinámicas?

**Dinámicas** es la sub-sección de MarketPlace donde un usuario en modo Personal organiza una **rifa o concurso** entre vecinos: vende boletos numerados por un premio (físico o en efectivo) y, cuando cierra la inscripción, se sortea un ganador.

Vive **dentro de MarketPlace** (no es una sección nueva del BottomNav): en `/marketplace`, un switch de contexto en el header alterna entre "MarketPlace" (artículos) y "Dinámicas" (rifas), compartiendo header, ciudad, notificaciones y FAB de publicar.

### Por qué vive aquí y no en MarketPlace normal

MarketPlace prohíbe explícitamente rifas/sorteos/venta de boletos (ver `docs/arquitectura/MarketPlace.md` §Lo que NO permitimos — riesgo legal SEGOB). Dinámicas es el espacio construido a propósito para esa necesidad, con sus propias reglas legales (checklist de confirmaciones al publicar) y su propio ciclo de vida — no un hueco en las reglas de MarketPlace.

### Lo que NO es Dinámicas

- ❌ NO es una lotería operada por la app — la app nunca cobra, nunca entrega el premio, nunca participa en el pago.
- ❌ NO tiene motor de sorteo todavía (Fase 4, pendiente) — hoy solo cubre publicar la rifa y vender boletos.
- ❌ NO permite premios ilegales, de esquema piramidal ni contenido para adultos (mismo filtro reducido, ver §Moderación).

---

## 🔒 Reglas no negociables

1. **El pago del boleto es offline.** El organizador coordina el cobro por ChatYA/WhatsApp fuera de la app. La app solo registra qué número reservó quién y si el organizador ya marcó ese boleto como pagado.
2. **El sorteo debe ser auditable.** Aunque el motor (Fase 4) no está construido, el schema ya reserva `semilla_aleatoria`, `timestamp_sorteo` y `hash_verificacion` en `dinamicas` para que el resultado sea verificable, no solo "confía en el organizador".
3. **Transparencia de participantes.** La lista de boletos de una Dinámica es pública (sin teléfono) — cualquiera que la vea puede confirmar que el sorteo no está arreglado. Ver `GET /api/dinamicas/:id/boletos`.
4. **El checklist legal se acepta al publicar, no al crear el borrador.** Mismo criterio que MarketPlace: un borrador solo exige título + ciudad; las 3 confirmaciones (premio real, pago fuera de la app, resultado honesto) se guardan como snapshot inmutable (`confirmaciones` JSONB) justo al publicar.

---

## 🔄 Ciclo de vida de una Dinámica

**Módulo puro y testeable:** `apps/api/src/services/dinamicas/estados.ts`

```
borrador → activa ⇄ pospuesta → en_sorteo → cerrada
                ↓         ↓
            cancelada  cancelada
```

| Transición | Disparador | Notas |
|---|---|---|
| `borrador → activa` | Publicar | Exige todos los campos completos (ver abajo) + checklist de 3 confirmaciones |
| `activa → pospuesta` | Posponer | Extiende `fecha_limite_inscripcion`. También `pospuesta → pospuesta` (posponer de nuevo, sin límite de veces) |
| `activa/pospuesta → en_sorteo` | (Fase 4, no expuesto todavía) | Arranca el motor de sorteo |
| `en_sorteo → cerrada` | (Fase 4) | Resultado final, terminal |
| `borrador/activa/pospuesta → cancelada` | Cancelar | Terminal. **NO** se puede cancelar desde `en_sorteo` (el sorteo ya arrancó) |

Un borrador solo exige **título + ciudad** (mismo patrón "borrador parcial" que MarketPlace). Para poder **publicar**, `camposFaltantesParaPublicar()` (`dinamicas.service.ts`) exige: descripción (≥20 caracteres), ≥1 foto del premio, tipo de premio, método de sorteo, número de boletos, precio de boleto, fecha límite de inscripción, ciudad.

---

## 🎫 Boletos y participación

**Tabla:** `dinamica_boletos` — un boleto = un número dentro de la Dinámica.

### Estados del boleto

| Estado | Significado | TTL |
|---|---|---|
| `reservado` | Alguien apartó el número, pendiente de pago | 24h — se libera automáticamente si nadie confirma el pago (cron, ver §Cron Jobs) |
| `pagado` | El organizador confirmó que ya cobró (fuera de la app) | Permanente |

### 2 formas de entrar un participante

1. **Reserva propia** (`POST /:id/boletos/reservar`) — cualquier usuario logueado reserva un número disponible. Dispara automáticamente un mensaje de ChatYA al organizador (best-effort, `contextoTipo: 'directo'` — no se agregó un tipo nuevo al catálogo de conversaciones para esto).
2. **Alta manual del organizador** (`POST /:id/boletos/manual`) — para participantes "Sin cuenta AY". Entra directo en `pagado` (el organizador ya cobró por fuera antes de registrarlo) — requiere `nombreManual` + `telefonoManual`.

La condición de carrera (dos personas reservando el mismo número al mismo tiempo) la resuelve el `UNIQUE (dinamica_id, numero_boleto)` de la tabla, no un lock aplicativo — `esErrorBoletoDuplicado()` (`dinamicas/errores.ts`) traduce el código Postgres `23505` a un mensaje de dominio legible.

---

## 🛡️ Moderación

**Implementación:** `apps/api/src/services/dinamicas/filtros.ts` — copia **reducida** de `marketplace/filtros.ts` (mismo motor: normalización NFD + sustitución leet-speak + regex con boundary), pero con **solo 3 de las 5 categorías** de MarketPlace:

| Categoría | Incluida | Motivo |
|---|:---:|---|
| Rifas/sorteos/boletos | ❌ | Es vocabulario **normal** de este módulo — MarketPlace la bloquea, Dinámicas la permite |
| Subastas | ❌ | Excluida a propósito (ver `Contexto_Dinamicas.md`) |
| Esquemas (multinivel, cripto, "gana dinero rápido") | ✅ | Rechazo duro |
| Adultos | ✅ | Rechazo duro |
| Ilegal (armas, drogas, fauna protegida) | ✅ | Rechazo duro |

**Sin "sugerencia suave"** (a diferencia de MarketPlace, que sugiere "esto parece un servicio"): si `detectarPalabraProhibidaDinamica` encuentra algo, es rechazo 422 directo, sin modal intermedio — las 3 categorías que quedan ya eran rechazo duro sin excepción en MarketPlace.

---

## 🎨 Identidad visual

| Uso | Valor |
|---|---|
| Gradiente principal | `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)` |
| Acento (badges, iconos) | `amber-600` / `amber-700` |
| Icono | `Ticket` (lucide) |
| Header (glow, líneas de acento, subtítulo del feed) | **Dinámico** — comparte el mismo header que MarketPlace y cambia entre teal/ámbar según el contexto activo (`colorAcento` en `PaginaMarketplace.tsx`) |

Cumple las mismas reglas heredadas que MarketPlace (`TOKENS_GLOBALES.md` Regla 13): sin pastel, sin iconos en círculo, bordes `border-2 border-slate-300` en cards, un solo color de acento (ámbar) + neutro slate.

---

## 📱 Pantallas y componentes

### Feed — dentro de `/marketplace`

**Switch de contexto:** `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx` — 2 íconos fijos (carrito=Artículos, boleto=Dinámicas) + flecha de intercambio animada con `framer-motion` (`layout` + reorder de `order` CSS). El activo queda pegado al título; cambia también el título ("MarketPlace" / "Dinámicas"), las líneas de acento del header y el conteo de publicaciones mostrado.

- `?dinamicas=1` en la URL selecciona el contexto inicial (usado por el botón "Organizar" del FAB/menú).
- Montaje perezoso: Artículos se monta siempre (vista default), Dinámicas se monta la primera vez que se activa y de ahí en adelante queda vivo, alternando con `hidden` CSS (no ternario que desmonta) — conserva scroll/estado al ir y volver.

**Sección de feed:** `apps/web/src/components/dinamicas/SeccionFeedDinamicas.tsx` — scroll infinito (`IntersectionObserver`), filtrado por ciudad, dueña también del composer inline (`ComposerSectionDinamicas`).

**Hook:** `useFeedInfinitoDinamicas({ ciudad })` (`hooks/queries/useDinamicas.ts`) — mismo patrón offset-based que `useFeedInfinitoMarketplace` (`pagina/limite/hayMas`).

### Card del feed — `CardDinamica.tsx`

`apps/web/src/components/dinamicas/CardDinamica.tsx` — card grande del feed principal. En `lg:` se parte en 2 columnas (foto panorámica `aspect-video` a la izquierda con ancho fijo `40%`, contenido a la derecha estirado a la misma altura vía `items-stretch`):

- Header del organizador (avatar, nombre + flecha animada tipo MP, botón ChatYA con logo oficial) — en `lg:` vive arriba del contenido de la derecha, no en una barra separada.
- Título + descripción (line-clamp-2).
- **Panel de KPIs** (fondo `slate-50`, sin pastel): precio por boleto (icono `Ticket` ámbar), boletos vendidos (icono `Users` teal), cuenta regresiva "para cerrar" (icono `Clock` rosa) + barra de progreso. En `lg:` el panel se pega al fondo del card con `mt-auto`.
- Pill de estado (Activa/Pospuesta/En sorteo/Cerrada/Cancelada) superpuesto en la esquina de la foto.

### Card compacta — `CardDinamicaCompacta.tsx`

`apps/web/src/components/dinamicas/CardDinamicaCompacta.tsx` — para grillas densas (perfil de usuario). Mismas proporciones tipográficas que `CardArticulo.tsx` variant="compacta" (título `text-base`, precio `text-lg`, meta `text-xs`) para que ambos tipos de card convivan en armonía visual. Sin avatar/nombre del organizador (redundante cuando ya se está parado en su perfil). Countdown en su propia línea con texto ("3h **para cerrar**"), no solo el número suelto.

### Card de gestión — `CardDinamicaMio.tsx`

`apps/web/src/components/dinamicas/CardDinamicaMio.tsx` — usada en "Mis Publicaciones". Mismo cuerpo visual que la compacta, más un menú "⋯" (mismo patrón que `CardArticuloMio.tsx` de MarketPlace) con:

- **Posponer** y **Cancelar** — solo si `estado IN ('activa', 'pospuesta')`. El botón "⋯" ni se muestra si la Dinámica está en `en_sorteo`/`cerrada`/`cancelada` (nada que gestionar).
- **Sin "Editar" ni "Eliminar"** — una Dinámica publicada no se edita (solo se pospone/cancela) y no hay endpoint DELETE (no aplica; se cancela, no se borra).

### Ficha de detalle — `PaginaDinamica.tsx`

**Ruta:** `/marketplace/dinamica/:dinamicaId`
**Archivo:** `apps/web/src/pages/private/marketplace/PaginaDinamica.tsx`

Rediseñada (ago-2026) para calcar el patrón de `PaginaArticuloMarketplace.tsx` (P2 de MarketPlace) — header dark sticky ancho completo + hero de 2 columnas en desktop, ancho `max-w-7xl`/`2xl:max-w-[920px]` en ambas. Usa el patrón **app-shell propio** (`useScrollAppShell` + contenedor `flex-1 min-h-0 overflow-y-auto`, header como hermano `shrink-0`) — sin esto el scroll vertical no funciona en móvil, porque la ruta cae en `esAppShellPropio` de `MainLayout.tsx`.

- **Header dark sticky:** ícono+"Detalle"+título truncado, botones **Compartir** (`DropdownCompartir`, apunta a la página pública `/p/dinamica/:id`) y **Guardar** (bookmark) a la derecha.
- **Hero 2 columnas** (`lg:grid-cols-[3fr_2fr]`): galería (`GaleriaArticulo` con `ajusteImagen="cover"` — rellena el área sin importar la relación de aspecto) a la izquierda; columna derecha con 3 cards apiladas (`sticky`, no scrollean con el resto):
  1. Card de info: título, precio del boleto, tags densos (tipo de premio / método de sorteo / cuenta regresiva) — sin pills grandes, patrón `rounded-md` denso (Regla 13 de tokens).
  2. **Card del organizador** — mismo patrón que `CardVendedor` (MP) / `OferenteCard` (Servicios): avatar con ring, nombre en 2 líneas + `BadgeCheck`, insignia + ícono de ChatYA (solo ícono, sin fondo) en el mismo renglón, actividad ("Activa hace X") + "Ver perfil →" (a `/marketplace/usuario/:id?tab=dinamicas`) en el renglón de abajo.
  3. Trust box "Cómo funciona" (ámbar).
- **Menú "⋯" del organizador** (kebab, esquina superior derecha de la card de info — solo si `esOrganizador`): "Agregar Part." (azul), "Posponer" (ámbar), "Cancelar Dinámica" (rojo), y "Editar borrador" si `estado='borrador'`. Reemplazó los botones inline que había antes.
- **Grid de boletos** — ya NO es un grid que crece verticalmente: es un carrusel horizontal (`grid-flow-col grid-rows-[repeat(5,3.5rem)] auto-cols-[3.5rem]`, 5 filas fijas, columnas nuevas hacia la derecha) navegado con flechas `ChevronLeft`/`ChevronRight`, 3 estados visuales (disponible/reservado/pagado).
- **Lista pública de participantes** — nombre (o "Sin cuenta AnunciaYA"), estado del boleto, botón "Contactar" por fila y "Confirmar pago" (solo organizador, solo `reservado`).
- **Modales unificados** — `apps/web/src/components/dinamicas/ModalesAccionDinamica.tsx`: `ModalAgregarParticipanteDinamica`, `ModalPosponerDinamica`, `ModalCancelarDinamica`. Un solo componente compartido entre esta página y "Mis Publicaciones" (antes cada una tenía su propia copia con estilos distintos, una incluso usaba `window.confirm()` nativo). Header con gradiente color-coded por acción (azul/ámbar/rojo) + ícono en círculo, mismo patrón que `ModalConfirmarCanje.tsx` de CardYA. El campo de teléfono de "Agregar participante" usa `InputTelefono` (lada `+52` editable + formato visual `(638) 113 2658`).

### Composer — crear/editar

**Orquestador:** `apps/web/src/components/dinamicas/composer/ComposerSectionDinamicas.tsx` — calcado 1:1 del composer de MarketPlace. Activado por query params:

- `?dinamicas=1&crearDinamica=1` → modo creación.
- `?dinamicas=1&editarDinamica=<id>` → modo edición (solo mientras `estado='borrador'`).

Móvil: página completa estilo "Nueva publicación" de Instagram/Facebook. Desktop: `ModalAdaptativo` de tamaño fijo. Guarda borrador automáticamente en localStorage mientras el usuario escribe (mismo patrón que MarketPlace).

### Integración — Perfil público del organizador

`apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx` (compartida con MarketPlace) — 2 tabs de nivel superior: **MarketPlace** y **Dinámicas** (cada una solo aparece si la persona tiene actividad en ella). Dentro de MarketPlace, sub-filtro "En venta"/"Vendidas". La tab Dinámicas usa `useDinamicasDeOrganizador(usuarioId)` (sin `incluirCanceladas` — perfil público, no muestra canceladas) y renderiza `CardDinamicaCompacta` en el mismo grid `2/3/4` columnas que Publicaciones/Vendidos. KPI del HeroCard (Completadas/Canceladas) cambia dinámicamente según la tab activa.

### Integración — Mis Publicaciones (gestión del organizador)

`apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx` — 3er tipo de publicación (**MarketPlace / Servicios / Dinámicas**) en el selector top-level (icon-pill ámbar). 2 chips de estado propios (no los 3 de MarketPlace, que no calzan con el ciclo de Dinámicas):

- **Activas** — agrupa `activa`, `pospuesta`, `en_sorteo`.
- **Cerradas** — agrupa `cerrada`, `cancelada`.

Usa `useDinamicasDeOrganizador(usuarioId, { incluirCanceladas: true })` — a diferencia del perfil público, aquí SÍ se ven las canceladas (es el propio organizador gestionando lo suyo). Renderiza `CardDinamicaMio` con su menú "⋯" (Agregar Part. / Posponer / Cancelar, mismo componente `ModalesAccionDinamica.tsx` que la ficha de detalle). FAB dice "Organizar" en vez de "Publicar" y enruta a `/marketplace?dinamicas=1&crearDinamica=1`.

### Página pública para compartir

**Ruta:** `/p/dinamica/:dinamicaId`
**Archivo:** `apps/web/src/pages/public/PaginaDinamicaPublica.tsx`

Versión accesible sin sesión del detalle, para los links compartidos (WhatsApp/redes). Sigue el mismo patrón que `PaginaArticuloMarketplacePublico.tsx` (su par de MarketPlace, plantilla de este archivo):

- Mismo diseño aprobado del detalle privado (galería, hero 2 columnas, boletos, participantes, "Cómo funciona"), pero con el chrome de auth intercambiado: `HeaderPublico`/`FooterPublico` en vez del header dark del módulo; sin menú de acciones del organizador (100% privadas); reservar boleto y "Contactar" abren `ModalAuthRequerido` (nuevo tipo `'dinamica'`, ícono `Ticket`, tema ámbar) en vez de la acción real.
- OG tags vía `useOpenGraph` para que el preview en WhatsApp/FB se vea bien.
- El botón "Compartir" de la ficha privada apunta aquí (antes apuntaba a la ruta privada como placeholder).
- **Importante:** las columnas del hero (`lg:grid-cols-[3fr_2fr]`) necesitan `min-w-0` en ambos hijos — sin eso, el carrusel de boletos (ancho intrínseco de cientos de px) expande la columna del grid y desborda toda la página horizontalmente. La ficha privada ya lo tenía; la pública lo copió después de un bug real.

### Chat con contexto — ChatYA

El botón "Contactar" (organizador, desde el card del feed o la ficha) abre ChatYA con una card de contexto pre-cargada (foto + título + precio por boleto) + mensaje pre-llenado, igual que ya existe en MarketPlace/Servicios/Ofertas. Piezas:

- **Nuevo `contextoTipo: 'dinamica'`** en `chat_conversaciones` — migración `docs/migraciones/2026-08-05-chat-contexto-tipo-dinamica.sql` (amplía el `CHECK`). Reusa la columna genérica `contexto_referencia_id` (mismo patrón que `oferta`/`articulo_negocio`) — **no** tiene columna FK dedicada como `articulo_marketplace_id`, así que no hizo falta agregar columna nueva.
- **Backend:** `insertarMensajeContextoDinamica()` en `chatya.service.ts`, cableado en `crearObtenerConversacion()` tanto para conversación nueva como existente.
- **Frontend:** `apps/web/src/hooks/useIniciarChatDinamica.ts` (calca `useIniciarChatMarketplace.ts`) — acepta un tipo estructural mínimo (`{id, titulo, precioBoleto, fotosPremio, organizador}`) que satisfacen tanto `DinamicaFeedItem` como `DinamicaDetallePublico`, así lo puede usar tanto `CardDinamica.tsx` (feed) como `PaginaDinamica.tsx` (detalle) sin acoplarse a un solo shape.
- **Render de la card:** `PreviewContextoInput.tsx` (antes de enviar) y `BurbujaMensaje.tsx` (persistida) — nuevo caso `subtipo: 'dinamica'`, eyebrow ámbar "Dinámicas", navega a `/marketplace/dinamica/:id` al hacer click.
- El "Contactar" de un **participante** (no el organizador) en la lista de la ficha sigue usando el chat directo simple (`useIniciarChatDirectoPersona`), sin card — son personas, no el recurso.

---

## 🔌 Backend — Endpoints

**Archivo:** `apps/api/src/routes/dinamicas.routes.ts`

### Privados (`verificarToken` + `requiereModoPersonal`)

| Método | Ruta | Función |
|---|---|---|
| GET | `/mias` | Mis Dinámicas (todas, sin filtro de estado — usado por composer/legacy) |
| POST | `/` | Crear borrador |
| PUT | `/:id` | Editar borrador (solo si `estado='borrador'`) |
| POST | `/upload-imagen` | Presigned URL R2 para fotos del premio |
| DELETE | `/foto-huerfana` | Limpieza R2 con reference count |
| POST | `/:id/publicar` | Publicar (borrador → activa) + checklist de confirmaciones |
| POST | `/:id/posponer` | Posponer (nueva `fechaLimiteInscripcion`) |
| POST | `/:id/cancelar` | Cancelar |
| POST | `/:id/boletos/reservar` | Reservar boleto propio |
| POST | `/:id/boletos/manual` | Alta manual (solo organizador) |
| POST | `/:id/boletos/:boletoId/confirmar-pago` | Confirmar pago (solo organizador) |

### Públicos (`verificarTokenOpcional`)

| Método | Ruta | Función |
|---|---|---|
| GET | `/` | Feed público filtrado por ciudad (`?ciudad=&pagina=&limite=`) |
| GET | `/organizador/:usuarioId` | Dinámicas de un organizador + insignia (`?incluirCanceladas=1` solo si el requester es ese mismo usuario autenticado) |
| GET | `/:id` | Ficha enriquecida (organizador + boletos + insignia) |
| GET | `/:id/boletos` | Lista pública de participantes (sin teléfono) |

**No existe todavía** (Fase 4): endpoint para arrancar/resolver el sorteo (elegir ganador, semilla, hash).

---

## 🗄️ Base de Datos

**Archivo:** `apps/api/src/db/schemas/schema.ts`

### `dinamicas`

Campos obligatorios solo para publicar (nullable en borrador): `descripcion`, `fotos_premio`, `tipo_premio` (`fisico`|`efectivo`), `metodo_sorteo` (`tombola`|`carta_unica`|`tabla_completa`), `numero_total_boletos`, `precio_boleto`, `ciudad_id`, `fecha_limite_inscripcion`. `regla_desempate` solo aplica a `tabla_completa`. `confirmaciones` (JSONB, checklist legal) se llena al publicar. `semilla_aleatoria`/`timestamp_sorteo`/`hash_verificacion` reservados para el motor de sorteo (Fase 4, hoy siempre NULL).

### `dinamica_boletos`

`UNIQUE (dinamica_id, numero_boleto)` — la defensa real contra doble-reserva. `CHECK`: o tiene `usuario_id`, o tiene `nombre_manual` + `telefono_manual` (no puede quedar sin dueño). `reservado_expira_en` = `reservado_en` + 24h, usado por el cron de liberación.

### `dinamica_ganadores`

Tabla ya creada (Fase 1) pero **sin uso todavía** — reservada para cuando el motor de sorteo (Fase 4) registre al/los ganador(es). `UNIQUE (dinamica_id, boleto_id)`.

---

## ⏰ Cron Jobs

**Archivo:** `apps/api/src/cron/dinamicas-expiracion.cron.ts`

- **Frecuencia:** cada 30 minutos (vs 6h/1x-día de MarketPlace — TTL corto de 24h en vez de 30 días).
- **Qué hace:** `DELETE FROM dinamica_boletos WHERE estado='reservado' AND reservado_expira_en < NOW()`. El número simplemente vuelve a estar disponible — no hay estado "expirado" intermedio.

---

## 🎴 Assets — Cartas de lotería mexicana

Las 54 cartas necesarias para los métodos de sorteo `carta_unica`/`tabla_completa` (Fase 4) ya están generadas — arte original vía prompt en Gemini, **no** la baraja de "Don Clemente" (derechos de autor).

- **Ubicación:** `apps/web/public/loteria/` (asset estático, no pasa por R2).
- **Formato:** WebP, 800×1200px, nombradas `carta-{NN}-{slug-personaje}.webp` (ej. `carta-01-el-gallo.webp` … `carta-54-la-rana.webp`).
- **Diseño fijo en las 54:** marco azul de marca `#1D4ED8` con esquinas redondeadas (horneadas en el pixel — no envolver con `rounded-xl`/`border` de CSS al usarlas), panel crema interior, título+número arriba, ilustración con colores naturales del personaje, franja azul inferior con mini-cabeza + título en blanco.
- El mazo es fijo y reusable: armar una "tabla" de 16 para un participante es solo elegir 16 al azar sin repetir y referenciar los archivos existentes — no se genera nada en tiempo real.

Detalle completo (incluye el prompt maestro usado, por si hace falta regenerar/agregar una carta) en la memoria de sesión del proyecto.

---

## 📦 Estado por fase

| Fase | Alcance | Estado |
|---|---|---|
| **Fase 1** | Backend: ciclo de vida, CRUD de borrador, transiciones de estado, boletos (funciones internas sin endpoint) | ✅ Completa |
| **Fase 2** | Moderación de texto reducida, checklist legal al publicar, fotos de evidencia del premio en R2, composer de creación/edición | ✅ Completa |
| **Fase 3** | Feed público, ficha de detalle, reservar/confirmar boletos, alta manual, chat automático por ChatYA, cron de expiración de reservas, integración en Perfil y Mis Publicaciones, **página pública para compartir**, **chat con contexto (card+mensaje pre-llenado) al Contactar**, **modales unificados** | ✅ Completa salvo el botón "Guardar" (placeholder, ver §Decisiones y pendientes abiertos) |
| **Fase 4** | Motor de sorteo: tómbola clásica animada, lotería carta única, lotería tabla completa (con sincronización en tiempo real) + 3 pantallas de resultado | 🔜 Pendiente — no ha empezado. Las 54 cartas de lotería ya están listas como preparación. |
| **Fase 5** | Tarjeta compartible (imagen de resultado para redes sociales) | 🔜 Pendiente |

---

## 🧭 Decisiones y pendientes abiertos

- **Botón "Guardar" (bookmark) del detalle es placeholder.** Muestra un toast "estará disponible pronto" — `'dinamica'` todavía no existe como `entityType` en el sistema de `useGuardados` (ni en el CHECK de la tabla `guardados`). Es el único hueco funcional que le falta a Fase 3. Para cerrarlo: agregar `'dinamica'` al union de `EntityType` en `useGuardados.ts`, ampliar el CHECK de `guardados.entity_type` (migración) y conectar el botón en `PaginaDinamica.tsx`.
- **`pospuesta → activa` no existe como transición explícita.** Posponer es idempotente desde `activa` o `pospuesta`; siempre aterriza en `pospuesta` con la nueva fecha. Si se quiere una acción "reactivar" separada más adelante, es un cambio de alcance a discutir.
- **El feed de "Mis Dinámicas" (`GET /mias`)** no filtra por estado (trae todo) — a diferencia de `listarDinamicasDeOrganizador` (usado en Perfil/Mis Publicaciones), que sí agrupa. Verificar si `GET /mias` sigue en uso real o quedó obsoleto tras la integración a Mis Publicaciones.
- **Detalle de implementación de los 3 métodos de sorteo (Fase 4)** aún no se ha bajado a pantallas concretas — se resuelve en el mismo orden en que se van a construir: primero tómbola (más simple, prueba el motor base), luego carta única (reusa el mismo motor, solo cambia la piel visual), y tabla completa al final (única que requiere sincronización en tiempo real).
- Ver `docs/kit-dinamicas/Contexto_Dinamicas.md` para el razonamiento de producto detrás de estas decisiones (por qué solo 3 métodos de los 7 originalmente considerados, por qué el filtro de moderación es reducido, etc.).
