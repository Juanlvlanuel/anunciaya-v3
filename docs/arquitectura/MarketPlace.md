# 🛒 MarketPlace — Compra-venta de Objetos entre Usuarios

> **Última actualización:** 30 Junio 2026 (Q&A reemplazado por **Comentarios públicos** con hilos de 1 nivel — `marketplace_comentarios`, `SeccionComentarios`, `ComentarioItem`).
> **Estado:** ✅ En producción.
> **Versión:** 1.7.0
> **Pendientes opcionales:**
>  - Sistema de Niveles del Vendedor (ver §Niveles)
>  - Stories de contactos arriba del feed

> **DATOS DEL SERVIDOR (React Query):**
> - Hooks principales: `apps/web/src/hooks/queries/useMarketplace.ts`
> - Sistema de guardados existente: `useArticulosMarketplaceGuardados` con `entity_type='articulo_marketplace'`
> - Sistema de contactos de ChatYA: `useChatYAStore.contactos` con `tipo='personal'` (botón "Agregar a contactos" en P3 — ver §P3 y §Sistema de Contactos)

> **Identidad visual:** Verde teal — Header dark sticky estilo CardYA / Cupones / Guardados
> **Política de visibilidad:** Solo modo Personal. Modo Comercial bloqueado por completo.

---

## 📋 Índice

1. [¿Qué es MarketPlace?](#qué-es-marketplace)
2. [Filosofía y Tono del Módulo](#filosofía-y-tono-del-módulo)
3. [Alcance](#alcance)
4. [Política de Visibilidad por Modo](#política-de-visibilidad-por-modo)
5. [Estados del Artículo](#estados-del-artículo)
6. [Moderación Autónoma](#moderación-autónoma)
7. [Identidad Visual](#identidad-visual)
8. [Pantallas](#pantallas)
   - [P1 — Feed](#p1--feed-de-marketplace)
   - [P2 — Detalle del Artículo](#p2--detalle-del-artículo)
   - [P3 — Perfil de Usuario](#p3--perfil-de-usuario)
   - [P4 — Composer inline de Publicar / Editar](#p4--composer-inline-de-publicar--editar)
   - [P5 — Buscador Potenciado](#p5--buscador-potenciado)
   - [P6 — Página Pública Compartible](#p6--página-pública-compartible)
9. [Integraciones con Otros Módulos](#integraciones-con-otros-módulos)
10. [Backend — Endpoints en Producción](#backend--endpoints-en-producción)
11. [Base de Datos — Tablas en Producción](#base-de-datos--tablas-en-producción)
12. [Cron Jobs en Producción](#cron-jobs-en-producción)
13. [Decisiones Rechazadas](#decisiones-rechazadas)
14. [Sistema de Niveles del Vendedor (Pendiente)](#sistema-de-niveles-del-vendedor-pendiente)

---

## 🎯 ¿Qué es MarketPlace?

**MarketPlace** es la sección pública de AnunciaYA donde los usuarios en modo Personal compran y venden **objetos físicos** entre sí (segunda mano, hecho a mano, productos nuevos sin negocio formal).

> ⚠️ **CRÍTICO — La transacción ocurre 100% offline.**
>
> AnunciaYA **NO procesa pagos**, **NO gestiona envíos**, **NO retiene dinero** ni interviene en la entrega del artículo. El rol de la app se limita a:
>
> 1. Mostrar la publicación del vendedor en el feed.
> 2. Conectar al comprador y vendedor por **ChatYA** o **WhatsApp**.
> 3. Que ellos acuerden por su cuenta cómo, cuándo y dónde se hace la entrega y el pago.
>
> Esto define el alcance del módulo: **sin Stripe, sin pasarelas, sin integración con paqueterías, sin escrow, sin sistema de devoluciones, sin disputas en la app**. Cualquier feature que se proponga en futuras sesiones que implique procesar pagos o gestionar envíos debe ser rechazada en MarketPlace.

### Propósito

- Compra-venta P2P (Person-to-Person) de objetos tangibles
- Espacio para vaciar casa, vender lo que no se usa, hecho a mano, etc.
- Alternativa local a Facebook Marketplace y OLX, integrada con ChatYA

### Lo que NO es MarketPlace

- ❌ NO incluye servicios (van en `/servicios`)
- ❌ NO incluye empleos (van en `/servicios`)
- ❌ NO sirve para que negocios vendan su catálogo (eso es Business Studio → Catálogo)
- ❌ NO procesa pagos (la transacción es offline entre las personas)
- ❌ NO tiene sistema de envíos integrado

---

## 🌱 Filosofía y Tono del Módulo

> Esta sección es la **brújula** del MarketPlace. Cuando una decisión de UX, copy, feature o moderación sea ambigua, se resuelve con base en estos principios.

### Por qué existe MarketPlace

La sección nace como respuesta directa a la experiencia caótica que viven los usuarios en grupos de compra-venta de Facebook:

- Mezcla de objetos, servicios, rifas, mitotes, subastas, promociones y conversaciones sin filtro.
- Información mal estructurada (fotos sin precio, precios sin descripción, ubicaciones imposibles de saber).
- Vendedores serios mezclados con publicaciones que no aportan al comercio.
- Sin manera de saber si el vendedor es real, cercano, o si la publicación sigue activa.

**MarketPlace de AnunciaYA es lo opuesto:** un espacio **ordenado, sostenible, predecible**, donde un vecino puede entrar a vender o comprar algo y sentirse en un entorno **digno y profesional**, no en un grupo de WhatsApp colectivo.

### Principios de diseño no negociables

1. **Una sola cosa por publicación, claramente categorizada.** Una publicación es UN objeto en venta. Punto. Sin ofertas múltiples, sin "vendo varias cosas", sin packs ambiguos. Si tienes 5 cosas, son 5 publicaciones.

2. **División estricta entre MarketPlace y Servicios.** MarketPlace es **solo objetos físicos tangibles**. Cualquier publicación que ofrezca tiempo, mano de obra, conocimiento o disponibilidad es Servicio y va en `/servicios`. La línea es clara y se hace cumplir tanto en el composer (hint inline) como en moderación.

3. **Cada publicación cumple un mínimo de información útil.** Sin foto, sin título descriptivo o sin precio, no se publica. Esto se valida en el composer y elimina el ruido típico de "vendo esto" sin contexto.

4. **No es un foro ni una red social.** No hay comentarios públicos, no hay "me gusta" expuestos, no hay timeline social. Solo: ver publicaciones, contactar al vendedor, guardar para después. Punto.

5. **Optimizado para una sola intención: vender-comprar.** Cada elemento de la UI sirve a esa intención. Lo que no sirve, no está. Por eso descartamos categorías como navegación, karma sin datos reales, ofertas formales, trueques con toggle, etc.

### Lo que NO permitimos en MarketPlace

Estas reglas se aplican en moderación y en el checklist legal del composer (4 confirmaciones compactadas en 1 checkbox: lícito, en mi poder, honesto, seguro):

- ❌ **Subastas** ("el que dé más se lo lleva", pujas, ventas con remate)
- ❌ **Rifas, sorteos o ventas de boletos** (riesgo legal SEGOB + ya descartado en Visión Estratégica)
- ❌ **Servicios de cualquier tipo** (van en `/servicios`)
- ❌ **Búsquedas de empleo o "se solicita personal"** (van en `/servicios`)
- ❌ **Publicaciones de "se busca" o "necesito"** (eso vive en *Pregúntale a [ciudad]* del Home)
- ❌ **Promoción de negocios formales** (los negocios usan Business Studio → Catálogo)
- ❌ **Multi-nivel, criptomonedas, esquemas piramidales**
- ❌ **Artículos prohibidos por ley** (armas, drogas, animales protegidos, fauna silvestre, etc.)
- ❌ **Contenido para adultos** o cualquier cosa inadecuada para una app comunitaria
- ❌ **Mensajes ajenos al artículo** (mitotes, denuncias, opiniones políticas, etc.)

### El tono que queremos transmitir

- **Limpio, no saturado.** Espacio en blanco, jerarquía clara, info esencial primero.
- **Profesional pero cálido.** No es Mercado Libre corporativo, pero tampoco es WhatsApp informal.
- **Orientado a confianza.** Cada elemento (perfil del vendedor, ubicación aproximada, tiempo de respuesta, foto del artículo) está diseñado para que comprador y vendedor se sientan seguros antes de coordinar.
- **Hiperlocal.** El usuario debe sentir que está viendo cosas de **su pueblo**, de **sus vecinos**, no un catálogo global anónimo.

### Cuando una decisión sea ambigua

Preguntarse:

1. ¿Esto fomenta el comercio P2P de objetos físicos en mi ciudad?
2. ¿Esto reduce el caos vs Facebook, o lo replica?
3. ¿Esto mantiene la separación clara con Servicios y con Business Studio?
4. ¿Esto le da a comprador y vendedor un espacio más digno?

Si la respuesta a cualquiera es "no", la decisión se rechaza.


---

## 🎯 Alcance

### Funciones del Comprador

- Ver feed de artículos cercanos con secciones "Recién publicado" y "Cerca de ti"
- Buscar artículos con buscador potenciado (sugerencias en vivo, búsquedas recientes, populares en la ciudad)
- Aplicar filtros: precio, condición, distancia
- Ver detalle del artículo con galería completa (hasta 8 fotos)
- Contactar al vendedor por **ChatYA** o **WhatsApp**
- Guardar artículo en **Mis Guardados** (tab Artículos)
- Ver perfil simple del vendedor con sus publicaciones
- Compartir publicación por link público

### Funciones del Vendedor

- Publicar artículo en composer inline en el feed (`/marketplace?crear=1`)
- Editar publicación existente (reusa el composer vía `/marketplace?editar=<id>`)
- Pausar / activar / marcar como vendida / eliminar publicación
- Reactivar publicaciones pausadas (extiende +30 días)
- Ver métricas básicas por publicación: vistas, mensajes, guardados
- Recibir notificaciones automáticas de próxima expiración (3 días antes) y expiración

### Tabla resumen

| Función | Comprador | Vendedor |
|---------|-----------|----------|
| Ver feed con cards "imagen arriba + info abajo" | ✅ | — |
| Buscador con sugerencias y filtros | ✅ | — |
| Detalle de artículo con galería (max 8 fotos) | ✅ | — |
| Contactar por ChatYA / WhatsApp | ✅ | — |
| Guardar artículo en Mis Guardados | ✅ | — |
| Ver perfil simple del vendedor | ✅ | — |
| Compartir por link público con OG tags | ✅ | — |
| Publicar artículo (3 pasos) | — | ✅ |
| Editar publicación | — | ✅ |
| Cambiar estado (pausar/vender/eliminar) | — | ✅ |
| Reactivar publicación pausada | — | ✅ |
| Métricas básicas (vistas/mensajes/guardados) | — | ✅ |
| Notificaciones de expiración (3d antes / al expirar) | — | ✅ |

---

## 🔒 Política de Visibilidad por Modo

### Modo Personal

- **Acceso completo:** ver feed + publicar + contactar + guardar
- Visible en BottomNav (móvil) y Navbar (desktop)

### Modo Comercial

- **Bloqueo total** de la sección
- NO aparece en BottomNav ni Navbar
- Si entra por URL directa (`/marketplace`, `/marketplace/articulo/:id`, etc.) → redirige a `/inicio` con notificación: `notificar.info('MarketPlace solo está disponible en modo Personal')`
- Implementado en el guard `ModoPersonalEstrictoGuard.tsx` (separado de `ModoGuard` para no romper auto-cambio en CardYA/ScanYA)

### Justificación

- MarketPlace es P2P entre personas. Un negocio formal con suscripción comercial usa **Catálogo** en Business Studio para vender sus productos.
- Bloqueo total simplifica el código, evita estados intermedios y bugs de "qué se ve y qué no" en modo comercial.

---

## 📊 Estados del Artículo

Los artículos pasan por 4 estados a lo largo de su ciclo de vida:

| Estado | Visible en Feed | Recibe Mensajes | Aparece en Mis Publicaciones | Editable |
|--------|:---------------:|:---------------:|:----------------------------:|:--------:|
| **Activa** | ✅ | ✅ | Tab "Activas" | ✅ |
| **Pausada** | ❌ | ❌ | Tab "Pausadas" | ✅ |
| **Vendida** | ❌ | ❌ | Tab "Vendidas" (histórico) | ❌ |
| **Eliminada** | ❌ | ❌ | NO aparece (borrado lógico) | ❌ |

### Transiciones permitidas

```
Activa  ⇄ Pausada
Activa  → Vendida
Activa  → Eliminada
Pausada → Activa  (vía botón "Reactivar")
Pausada → Eliminada
Vendida → Eliminada
```

### Notas

- **Pausada** es temporal: el vendedor la oculta del feed pero la sigue viendo en su panel. Útil cuando quiere "guardar" el anuncio pero no recibir mensajes ahora (vacaciones, lo está mostrando a alguien específico, etc.).
- **Vendida** es definitiva pero recuperable como histórico (no se borra de BD). Sirve para que el vendedor vea sus ventas pasadas.
- **Eliminada** es soft delete (`deleted_at`). El registro se mantiene en BD para auditoría pero no se muestra en ningún lado.
- **TTL automático:** las publicaciones Activas se marcan como Pausada después de 30 días sin actividad. Notificación automática al vendedor. El vendedor puede reactivarlas con un click (extiende +30 días).


---

## 🛡️ Moderación Autónoma

> **Contexto:** AnunciaYA es operada por una sola persona. MarketPlace es un espacio gratuito que NO genera ingresos directos. Por lo tanto, la moderación es **100% automatizada** y **cero intervención humana**. No hay equipo de moderadores, no hay panel de revisión, no hay sistema de reportes, no hay cola de aprobación.
>
> El compromiso es: **filtrar el ruido con automatizaciones simples**, y aceptar el resto como costo del modelo. La filosofía del módulo + las validaciones automáticas hacen el trabajo pesado.

### Capa 1 — Validación preventiva al publicar

Esta capa corre en el composer (frontend + backend) y es la **única defensa real** del sistema. Si pasa esta capa, la publicación queda en el feed sin más controles.

**Implementación:** `apps/api/src/services/marketplace/filtros.ts`

#### 1.1 — Mínimos obligatorios (en el composer P4)

- Mínimo 1 foto, máximo 8
- Título entre 10 y 80 caracteres
- Precio entero positivo, máximo $999,999
- Condición seleccionada (1 de 4: Nuevo / Seminuevo / Usado / Para reparar)
- Descripción mínimo 50 caracteres, máximo 1000
- Ubicación obligatoria (GPS del usuario o coordenada de su ciudad)
- Checklist final de 3 confirmaciones (solo en modo crear, no en edición)

#### 1.2 — Filtro de palabras prohibidas (RECHAZO DURO)

Si el título o la descripción contiene cualquier palabra de la lista negra, el composer **NO permite publicar** y muestra un mensaje claro al usuario explicando por qué (toast con el mensaje del backend tras un 422).

**Comportamiento técnico:**
- Validación tanto en frontend (feedback inmediato) como en backend (defensa real).
- Búsqueda **case-insensitive**, ignora acentos (`normalize('NFD').replace(/\p{Diacritic}/gu, '')`).
- Match por **palabra completa** (regex con `\b`), no por substring — para evitar falsos positivos como "subastasta" o "barrifa".
- 32 tests unitarios cubren palabras exactas, mayúsculas, acentos, y edge cases que NO deben matchear.

**Lista negra implementada (5 categorías):**

| Categoría | Mensaje al usuario |
|-----------|-------------------|
| **Rifas y sorteos** (rifa, sorteo, boleto, tómbola, cachito, etc.) | "No puedes publicar rifas, sorteos ni venta de boletos en MarketPlace. Las rifas no están permitidas." |
| **Subastas** (subasta, mejor postor, puja, remate) | "No puedes publicar subastas en MarketPlace. Establece un precio fijo y publica de nuevo." |
| **Esquemas** (multinivel, pirámide, criptomonedas, forex, gana dinero rápido) | "MarketPlace no permite la promoción de esquemas multinivel, criptomonedas ni inversiones." |
| **Adultos** (contenido sexual explícito) | "El contenido para adultos no está permitido en AnunciaYA." |
| **Ilegal** (armas, drogas, animales protegidos) | "No puedes publicar artículos prohibidos por la ley en AnunciaYA." |

**Ubicación de la lista:** vive en código (`filtros.ts`), no en BD. Para agregar una palabra: editar archivo, commit y deploy. Sin migración, sin panel admin.

#### 1.3 — Detección de servicios disfrazados (SUGERENCIA SUAVE)

Cuando el texto sugiere un servicio en lugar de un objeto físico, el composer muestra el modal `ModalSugerenciaModeracion` post-publicación con dos opciones (además del hint inline `<ComposerHintModeracion>` que aparece mientras se escribe):

**Patrones detectados:** `ofrezco mis servicios de…`, `doy clases de…`, `servicio de [verbo]`, `cobro $X la hora`, `disponible para…`, `me dedico a…`, `soy [profesión]`, `presupuesto sin compromiso`, etc.

**Modal `ModalSugerenciaModeracion.tsx`:**

```
┌──────────────────────────────────────┐
│ ¿Esto es un servicio?                │
│                                      │
│ Detectamos que tu publicación        │
│ podría ser un servicio en lugar de   │
│ un objeto en venta.                  │
│                                      │
│ [Editar mi publicación]              │
│ [Continuar de todos modos]           │
└──────────────────────────────────────┘
```

- "Editar mi publicación" → cierra modal, vuelve al paso correspondiente.
- "Continuar de todos modos" → reenvía al backend con `confirmadoPorUsuario: true` y publica.

> **Nota:** el botón "Llevar a Servicios" se mantiene fuera del modal porque la sección `/servicios` aún no existe. Se agregará cuando se implemente.

#### 1.4 — Detección de búsquedas (SUGERENCIA SUAVE)

Mismo patrón que servicios. Si detecta `busco…`, `se busca…`, `necesito…`, `quiero comprar…`, `compro…`, etc. → modal sugiriendo usar *Pregúntale a [ciudad]* en el Home.

#### 1.5 — Validación de precio

- Precio = $0 → bloqueo duro: "El precio debe ser mayor a cero."
- Precio < $10 → advertencia suave en frontend: "Este precio parece muy bajo. ¿Es correcto?" (no bloquea, solo confirma).
- Precio > $999,999 → bloqueo en Zod.

### Capa 2 — Auto-expiración (TTL)

**Cron job:** `apps/api/src/cron/marketplace-expiracion.cron.ts`

Dos schedules:
- **Auto-pausa de expirados:** cada 6 horas (60s después del arranque + intervalo). Marca como `pausada` toda publicación con `expira_at < NOW()` y `estado = 'activa'`. Notificación al vendedor: "Tu publicación expiró. Reactívala con 1 click si sigue disponible."
- **Notificación de próxima expiración:** 1 vez al día (09:00 UTC). Detecta artículos que expiran en 3 días y notifica al vendedor.

#### TTL "fin del día" con zona horaria (Sprint 9.2)

`expira_at` se calcula con `sqlExpiracionFinDeDia(ttlDias, zona)` (`apps/api/src/utils/expiracion.ts`):

- `TTL_DIAS_DEFAULT = 30` días.
- La expresión SQL usa `AT TIME ZONE` para devolver el último segundo (`23:59:59`) del día local de la ciudad, no la hora exacta de creación.
- Zona horaria resuelta con `getZonaHorariaPorCiudad()` (`apps/api/src/utils/zonaHoraria.ts`) — mapeo IANA por ciudad mexicana. Default `'America/Hermosillo'` para Puerto Peñasco.

Antes del fix, una publicación creada a las 14:30 del día 1 expiraba a las 14:30 del día 31. Ahora expira a las 23:59:59 del día 31 en hora local. Aplica también en `marketplace/expiracion.ts` (`reactivarArticulo`), `servicios.service.ts`, `vacantes.service.ts`, `cardya.service.ts`.

Ambas notificaciones son **idempotentes** (verifica `WHERE referencia_id+tipo` antes de insertar). Si el cron corre 2 veces, no spamea.

### Lo que NO se implementa (decisión consciente)

- ❌ **Sistema de reportes de usuarios** — sin equipo para revisarlos, los reportes serían un canal sin destinatario. Falsa promesa al usuario.
- ❌ **Auto-pausa por umbral de reportes** — depende de los reportes mismos.
- ❌ **Bloqueo automático de usuarios reincidentes** — sin reportes, no hay forma justa de medir reincidencia.
- ❌ **Panel admin de moderación** — sin tiempo para atenderlo, sería un backlog que crece sin parar.
- ❌ **Aprobación manual antes de publicar** — no escala con un solo operador.
- ❌ **Detección con IA / análisis de imágenes** — costo y complejidad desproporcionados al alcance del módulo.

### Lo que pasa con publicaciones que se cuelan

Si alguna publicación logra evadir la Capa 1 (palabra que no estaba en la lista, contenido en imagen, etc.), simplemente se queda hasta que:

1. El propio vendedor la borra o pausa.
2. Expira a los 30 días por TTL automático.
3. Se borra manualmente desde la BD si llega a saberse.

Es un costo aceptable y honesto del modelo.

---

## 🎨 Identidad Visual

### Color de marca

**Verde teal** — distinto del verde esmeralda de Cupones. Representa MarketPlace en toda la app.

| Uso | Token Tailwind | Hex |
|-----|----------------|-----|
| Acento principal (icono header, números destacados) | `teal-400` | `#2dd4bf` |
| Acento secundario (línea tab activo, badges sutiles) | `teal-500` | `#14b8a6` |
| Hover sobre acento | `teal-600` | `#0d9488` |

### Botones principales (CTAs)

**Negros** (Dark Gradient de Marca, ver `TOKENS_COMPONENTES.md` §7). Igual que en CardYA, Cupones, Negocios, Onboarding.

```css
background: linear-gradient(135deg, #1e293b, #0f172a);
```

### Botones secundarios

Blanco con borde slate (estándar de la app).

### WhatsApp

Verde brand con gradiente: `bg-linear-to-br from-[#22C55E] to-[#15803D]`. NO usar verde teal aquí. El gradiente da más cuerpo al botón y queda alineado con la estética de los demás CTAs gradient del módulo (CY, dark gradient, etc.).

### ChatYA (CTA de contacto privado)

El CTA de ChatYA adopta dos variantes visuales según la pantalla:

- En **P2 Detalle**: botón con **logo oficial de ChatYA** (`/ChatYA.webp`) sin texto sobre Dark Gradient de Marca (`bg-linear-to-br from-slate-800 to-slate-950`). Convive con WhatsApp lado a lado en la barra de contacto, mismas medidas en mobile/desktop.
- En **P3 Perfil del usuario**: botón inline tipo "link grande con icono" — icono `MessageSquare h-5 w-5 text-blue-700` + texto `"ChatYA"`, sin fondo ni ring (`text-slate-900` sobre el card blanco del HeroCard), hover `bg-emerald-100`. Convive con WhatsApp (icono `MessageCircle text-emerald-700`) y con "Agregar contacto" (`UserPlus`/`UserCheck text-emerald-700`) en la misma fila de acciones del HeroCard.
- En ambas variantes, el click llama `useChatYAStore.abrirChatTemporal({...})` **+ `useUiStore.abrirChatYA()`** — ambas son obligatorias; si solo se llama `abrirChatTemporal` el panel de ChatYA no se abre y el botón parece roto.

### Header de página

**Header dark sticky** estilo CardYA:
- Fondo `#000000`
- Glow sutil teal arriba-derecha (radial-gradient con `rgba(20,184,166,0.07)`)
- Grid pattern sutil (opacity 0.08)
- `lg:rounded-b-3xl` en desktop, sin rounded en móvil (full-width)
- Subtítulo decorativo: `"COMPRA-VENTA LOCAL"` (uppercase, tracking-wider)

### Card del artículo (estilo B)

Imagen arriba + bloque blanco abajo. Distinto del glassmorphism inmersivo de CardNegocio. Razones:
- El precio se lee mejor sobre fondo blanco
- Las fotos de usuarios son inconsistentes (mala iluminación, fondos variados) → glass se ve mal sobre ellas
- Diferenciación visual de Negocios
- Estándar del rubro (Mercado Libre, Wallapop, OLX)

### Reglas obligatorias (heredadas)

- Cumple `TOKENS_GLOBALES.md` Regla 13 (estética profesional B2B, no caricaturesca)
- Sin emojis como datos, sin íconos en círculos pastel, sin saltos tipográficos exagerados
- Iconos 14-16px sin círculo de fondo
- Color neutro slate + acento teal como único color de marca
- Bordes `border-2 border-slate-300` en cards, sombras `shadow-md` sin hover de elevación

### Decisiones visuales específicas del módulo

- **Perfil del vendedor sin portada decorativa** — un banner teal full-width o imagen genérica se ve como publicidad. Solo avatar grande centrado en bloque blanco.
- **Sin badge "✓ Verificado"** — todos los usuarios tienen correo verificado (es requisito de login), por lo que el badge no diferencia a nadie. La diferenciación real vive en el sistema de niveles del vendedor (ver §Sistema de Niveles).
- **Buscador físico**:
  - **Desktop:** input vive en el Navbar global (siempre visible). Al enfocar dispara `useSearchStore.abrirBuscador()` y se muestra el overlay.
  - **Móvil:** patrón inmersivo (sin Navbar global). El input vive **dentro del header del MarketPlace** y se expande al pulsar la lupa, igual que en Negocios. El input móvil escribe al mismo `useSearchStore.query` para que el overlay reuse toda su lógica (sugerencias, populares, recientes).
- **Patrón inmersivo móvil** — `/marketplace`, `/marketplace/articulo/:id`, `/marketplace/vendedor/:id`, `/negocios/:id` y `/ofertas` ocultan el Navbar global (banda azul "AnunciaYA Tu Comunidad Local") en móvil. La lógica vive en `MainLayout.tsx → esPaginaConHeaderPropio`. En desktop el Navbar siempre se mantiene (mismo patrón que CardYA / Mis Guardados). _Nota: las rutas viejas del wizard `/marketplace/publicar` y `/marketplace/publicar/:id` redirigen al composer inline con query params (`?crear=1` / `?editar=<id>`)._
- **Badge `RECIÉN`** en CardArticulo — indica publicación con `<24h` desde `created_at`. Se usa la palabra "RECIÉN" en lugar de "NUEVO" para evitar confusión con la condición `nuevo` del artículo.


---

## 📱 Pantallas

### P1 — Feed de MarketPlace

**Ruta:** `/marketplace`
**Archivo:** `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx`

#### Móvil — Estructura

Scroll vertical continuo, no estático. Invita a explorar.

```
┌──────────────────────────────────────┐
│ HEADER DARK STICKY (sin Navbar)      │
│ ┌──────────────────────────────────┐ │
│ │ ← 🛒 MarketPlace      🔍  ☰     │ │  ← flecha + buscar + menú
│ │ ─ En Manzanillo · 247 artículos ─│ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ✦ LO MÁS FRESCO                      │
│ Recién publicados                    │
│ ◀ [Card] [Card] [Card] [Card] ▶      │  ← carrusel horizontal
├──────────────────────────────────────┤
│ 📍 A PASOS DE AQUÍ                   │
│ Cerca de ti                          │
│ ┌──────┐ ┌──────┐                    │  ← grid 2 columnas
│ │ Card │ │ Card │                    │     scroll infinito
│ ├──────┤ ├──────┤                    │
│ │ Card │ │ Card │                    │
│ └──────┘ └──────┘                    │
└──────────────────────────────────────┘
                                  [+]   ← FAB "Publicar" sobre BottomNav
```

#### Desktop — Estructura

- Header con CTA "+ Publicar artículo" inline a la derecha
- Carrusel "Recién publicado" con drag-to-scroll (`useDragScroll`)
- Grid de "Cerca de ti" en 4-6 columnas según viewport (`@5xl:grid-cols-4 @[96rem]:grid-cols-6`)

#### Card del artículo (estilo B)

**Componente:** `apps/web/src/components/marketplace/CardArticulo.tsx`

```
┌─────────────────────┐
│ [RECIÉN]       [♥] │  ← badge si <24h + botón guardar
│                     │
│      IMAGEN         │  ← portada cuadrada (aspect 1:1)
│      PORTADA        │
├─────────────────────┤
│ $11,910             │  ← precio bold grande
│ Bicicleta vintage…  │  ← título 1 línea (truncado)
│ 📍 600m · hace 6d   │  ← distancia + tiempo, gris
└─────────────────────┘
```

#### Comportamiento

- **Tap/click en card** → navega a `/marketplace/articulo/:id` (P2)
- **Tap en ❤️ guardar** → toggle vía `useGuardados` con `entity_type='articulo_marketplace'`
- **Tap en "+ Publicar artículo"** → expande el composer inline en el mismo feed (`navigate('/marketplace?crear=1')` + scroll arriba). El orquestador `<ComposerSection>` detecta el query param y abre `<ComposerMarketplace>` sobre el feed (P4).
- **Buscador**:
  - **Desktop:** focus en input del Navbar global → abre overlay P5.
  - **Móvil:** lupa en header del MP → input se expande inline, escribir abre overlay P5 con cards preview.

#### Datos del servidor

- **Hook:** `useMarketplaceFeed({ ciudad, lat, lng })`
- **Endpoint:** `GET /api/marketplace/feed`
- Solo dispara si hay GPS + ciudad + lat/lng. Sin GPS muestra banner accionable "Activa tu ubicación".
- StaleTime: 2 minutos

#### Estados visuales

- Loading → spinner centrado
- Sin GPS → banner accionable "Activa tu ubicación" + solo "Recién publicado"
- Arrays vacíos → mensaje amistoso "Aún no hay artículos en tu ciudad. ¡Sé el primero en publicar!"
- Error → bloque rojo con botón reintentar

---

### P2 — Detalle del Artículo

**Ruta:** `/marketplace/articulo/:articuloId`
**Archivo:** `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`

#### Móvil — Estructura

```
┌──────────────────────────────────────┐
│ [←]      [↑ compartir] [♥]    [⋯]   │  ← header transparente flotante
│                                      │
│         GALERÍA DE FOTOS             │
│      (swipe horizontal)              │
│                              1/8     │
├──────────────────────────────────────┤
│ $11,910                              │  ← precio bold gigante
│ Bicicleta vintage Rinos restaurada   │
│ [Nuevo] [600m]                       │  ← chips
│ hace 6d · 144 vistas                 │
├──────────────────────────────────────┤
│ Descripción                          │
│ Bici de los 80s con piñón Shimano…   │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ [LR] Lucía R.                  │   │  ← card vendedor
│ │      Manzanillo, Colima        │   │
│ │      [Ver perfil →]            │   │
│ └────────────────────────────────┘   │
├──────────────────────────────────────┤
│ Ubicación aproximada                 │
│ ┌────────────────────────────────┐   │
│ │      MAPA con círculo 500m     │   │
│ │           ⭕                    │   │
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐  ← barra fija inferior
│ [📱 WhatsApp]   [logo ChatYA]        │  ← lado a lado, logos sin texto
└──────────────────────────────────────┘
```

#### Desktop — Estructura (2 columnas 60/40)

**Columna izquierda (~60%):** Galería con thumbnails verticales + Descripción + Mapa

**Columna derecha (~40%) — sticky:** Precio + título + chips + Card vendedor + Botones de contacto

#### Componentes

- **Galería:** `apps/web/src/components/marketplace/GaleriaArticulo.tsx`
  - **Móvil:** carrusel horizontal de la foto principal con `scroll-snap-x mandatory` + swipe nativo. Indicador `X/N` flotante en la esquina bottom-right de la foto principal, `bg-black/60 backdrop-blur` + texto blanco.
  - **Desktop:** foto principal full-width arriba con `max-h-[480px] 2xl:max-h-[560px]` y `object-contain` sobre fondo slate-100. **Dos flechas overlay** (`ChevronLeft` y `ChevronRight`) circulares `h-11 w-11` con `bg-white/90 backdrop-blur shadow-lg` posicionadas a los lados de la imagen para navegar prev/next entre fotos con loop infinito (al llegar a la última vuelve a la primera, al inicio salta a la última). Las flechas son `position: absolute` siblings del `<button>` de la imagen (no anidadas), de modo que su click no propaga al wrapper que abre el lightbox.
  - **Tira horizontal de thumbnails debajo de la foto principal** (móvil + desktop). Cada miniatura es `h-16 w-16` en móvil y `h-20 w-20` en desktop, `rounded-lg border-2`. La inactiva va al 70% de opacidad con `border-slate-200`; la activa lleva `border-teal-500 ring-2 ring-teal-300`. Scroll horizontal nativo con `overflow-x-auto scroll-smooth [scrollbar-width:none]`. Cuando cambia `indiceActual`, la thumbnail activa se centra automáticamente con `scrollTo({ behavior: 'smooth' })` calculando `thumb.offsetLeft - tira.clientWidth/2 + thumb.clientWidth/2`.
  - **Click en una thumbnail** cambia la foto principal y sincroniza el carrusel móvil con `scrollTo` al ancho correspondiente.
  - **Click en la foto principal** abre `ModalImagenes` (lightbox fullscreen reusado).

- **Card vendedor:** `apps/web/src/components/marketplace/CardVendedor.tsx`
  - Avatar `h-12 w-12` simplificado (sin ring gradient — decisión Sprint 9.3 "avatar simplificado").
  - Nombre completo en 2 líneas con `BadgeCheck` invertido inline (`fill-blue-500 text-white` estilo Twitter/X) cuando es vendedor verificado.
  - **Sin ciudad** (decisión UX Sprint 9.3 — la ubicación exacta del personal no se expone).
  - Actividad relativa ("Activa hace 2 hrs") inline con un dot, en lugar de pill.
  - `Ver perfil →` alineado a la derecha (`ml-auto`) en el **mismo renglón** que la actividad.
  - Mismo patrón compartido con `OferenteCard`/`SidebarSobreNegocio` de Servicios (tema sky); aquí amber/teal.

- **Mapa:** `apps/web/src/components/marketplace/MapaUbicacion.tsx`
  - `<MapContainer>` no interactivo (zoom/dragging desactivados)
  - `<Circle radius={500}>` con stroke teal y fill teal/15%
  - Sin marker central
  - Texto debajo: "Mostraremos un círculo de 500m, no la dirección exacta. Acuerda el punto de encuentro por chat."

- **Barra de contacto:** `apps/web/src/components/marketplace/BarraContacto.tsx`
  - **WhatsApp** (gradiente verde brand `from-[#22C55E] to-[#15803D]`) con ícono Lucide `MessageCircle`. Mensaje precargado: `"Hola, vi tu publicación de [título] en AnunciaYA"`
  - **ChatYA** (Dark Gradient) — botón con logo oficial `/ChatYA.webp` sin texto + `aria-label="Contactar por ChatYA"`. Llama `useChatYAStore.abrirChatTemporal({...})` **+ `useUiStore.abrirChatYA()`** (las dos son obligatorias, sin la segunda el panel no aparece). `contextoTipo='marketplace'` + `contextoReferenciaId={articuloId}`.
  - **Layout:** botones lado a lado en mobile y desktop (no apilados). Padding bajo `py-1.5` para que el botón se ajuste al tamaño del logo.
  - **Móvil:** la barra es **`fixed`** y se posiciona dinámicamente sobre el BottomNav. Usa `useHideOnScroll` para sincronizarse: cuando el BottomNav está visible → `bottom: 68px` (sobre él); cuando se oculta al hacer scroll → `bottom: 0` (pegada al borde). Transición suave 300ms. `z-50` para quedar sobre BottomNav (`z-40`). Sin fondo propio (transparente) para heredar el gradient de la app.
  - Si vendedor sin teléfono → oculta WhatsApp
  - Si visitante es el dueño → oculta toda la barra
  - Si dueño + estado=pausada → reemplaza la barra con botón "Reactivar publicación"

- **Layout móvil — secciones envueltas en cards** (estilo Mercado Libre):
  - Cada bloque (Descripción, Card vendedor, Mapa, Comentarios) vive dentro de su propio card `rounded-xl border border-slate-200 bg-white shadow-sm p-4` sobre el fondo gradient nativo de la app.
  - El contenedor raíz de la página (`PaginaArticuloMarketplace`) usa `bg-transparent` (no `bg-white`) para heredar el gradient del MainLayout.
  - El `MapaUbicacion` crea su propio stacking context (`relative z-0 isolate`) para que los controles/canvas de MapLibre no escapen y tapen el BottomNav o la BarraContacto fija.
  - `pb-[150px]` en el contenedor para reservar espacio bajo el contenido y que la BarraContacto fija + BottomNav no oculten la última sección.

#### Comportamiento

- Al montar la página: incrementa `total_vistas` (solo si NO eres el dueño + dedupe por `sessionStorage`)
- **Tap en compartir (↑)** → copia link `/p/articulo-marketplace/:id` al portapapeles
- **Tap en ⋯** → menú con opción "Bloquear vendedor" (placeholder pendiente)
- **Tap en "Ver perfil →"** → navega a P3
- **Estado pausada (público):** overlay informativo "Esta publicación está pausada por el vendedor"
- **Estado vendida (público):** overlay informativo "Este artículo ya fue vendido"

#### Privacidad de ubicación

- El backend devuelve coordenadas **aleatorizadas** dentro de un círculo de 500m alrededor de la ubicación real (calculadas al guardar, no al consultar — coordenada estable entre sesiones)
- La columna `ubicacion` exacta NUNCA se serializa al frontend
- Distribución uniforme en disco usando `r = R · √random()` con compensación por latitud (test unitario verifica que 100 puntos generados están todos dentro del círculo de 500m)

---

### P3 — Perfil de Usuario

**Ruta canónica:** `/marketplace/usuario/:usuarioId`
**Ruta alterna:** `/marketplace/vendedor/:usuarioId` → redirige a la canónica (`<Navigate replace />` en `router/index.tsx`) para que los enlaces antiguos en producción sigan funcionando.
**Archivo:** `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx`

> Esta pantalla se llama "Perfil de Usuario" porque la abren tanto vendedores como compradores que solo comentan en el feed. El UI detecta automáticamente el rol y adapta lo que muestra (KPIs, tabs y grid de publicaciones solo si la persona es vendedor).

#### Modo de visualización (vendedor vs comprador/comentarista)

El UI se adapta automáticamente al rol de la persona perfilada:

| Caso | Detección | Qué se muestra |
|------|-----------|-----------------|
| **Vendedor** | `publicacionesActivas > 0 \|\| vendidos > 0` | HeroCard con KPIs + acciones de contacto + tabs + grid |
| **Comentarista/comprador** | sin publicaciones | HeroCard minimalista (identidad + acciones de contacto, sin KPIs ni tabs) |

#### Header de la página

Header dark sticky con identidad teal MP, idéntico al patrón de P1 y P2 del módulo:

- Fondo `#000000`, glow teal radial sutil arriba-derecha (`rgba(20,184,166,0.07)`) y grid pattern white opacity 0.08.
- Bloque izquierdo: botón `←` volver (centralizado en `useVolverAtras` con fallback a `/marketplace`), icono cuadrado 36×36 con gradient teal `#2dd4bf → #0d9488` con `BadgeCheck` adentro, título `Perfil` en blanco completo (no bicolor), separador vertical `1.5px bg-white/50` y subtítulo `text-sm/85% blanco` con el nombre completo del usuario (`{nombre} {apellidos}`).
- `lg:rounded-b-3xl` en desktop, sin rounded en móvil (full-width).
- Bloque derecho: botón Bloquear/Desbloquear inline solo en lg+ con tooltip TC-19 (`Ban` slate blanco para bloquear, `ShieldOff` rojo cuando ya está bloqueado). Se oculta cuando el perfil es el del usuario actual.

#### HeroCard

Card bordeado `overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-md`. Layout 2 columnas en desktop, apilado vertical en móvil:

```
wrapper: lg:grid lg:grid-cols-2 lg:items-stretch
```

**Columna izquierda — identidad**

`flex flex-col items-center gap-4 p-5 text-center lg:flex-row lg:items-center lg:gap-5 lg:border-r-2 lg:border-slate-300 lg:text-left`. Apilada vertical centrada en móvil; horizontal con avatar izquierda + texto derecha en desktop. Contiene:

- **Avatar** `h-12 w-12` simplificado, sin ring decorativo (decisión Sprint 9.3 — "avatar simplificado"). Status dot online (verde emerald `conectado`, ámbar `ausente`, sin dot `desconectado`) anclado en bottom-right con `ring-2 ring-white`. La presencia llega vía Socket.io: la página emite `chatya:consultar-estado` al montar y lee `useChatYAStore.estadosUsuarios[usuarioId]`.
- **Nombre completo** en 2 líneas con `BadgeCheck` invertido inline estilo Twitter/X (`fill-blue-500 text-white`) cuando la persona es vendedor verificado. Antes era `text-blue-600` plano; ahora el badge es relleno azul con palomita blanca para mayor reconocibilidad.
- **Sin ciudad** (decisión UX Sprint 9.3 — ubicación exacta del personal no se expone). Antes había una línea `MapPin + ciudad`.
- **Miembro desde** en `mt-0.5 text-sm font-medium text-slate-600` con formato `"Miembro desde {Mes} {Año}"` calculado con `MESES_ES` en español.

**Columna derecha — KPIs + acciones**

`flex flex-col border-t-2 border-slate-300 lg:border-t-0` (la border-t crea separación visual en móvil al apilar; en desktop la columna izquierda ya separa con `border-r-2`).

**Sub-bloque de KPIs (solo si la persona es vendedor):**

- Grid 3 columnas con divisores verticales: `grid grid-cols-3 border-2 border-slate-300 bg-slate-100 divide-x-2 divide-slate-300` (Sprint 9.3 — antes era `bg-slate-200` sin border; se igualó al patrón "estética profesional" de la regla 13 de tokens).
- Cada bloque KPI (`KpiBlock`) lleva:
  - Número grande arriba: `text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900`.
  - Label inline debajo: `inline-flex items-center gap-1 text-[11px] lg:text-xs font-bold uppercase tracking-wider text-slate-600` con icono `h-3.5 w-3.5 text-slate-600` a la izquierda.
- Los 3 KPIs son:
  - **Publicaciones** — `COUNT(*) WHERE estado='activa'` para el usuario.
  - **Vendidos** — `COUNT(*) WHERE estado='vendida'` para el usuario.
  - **Responde** — promedio del tiempo de respuesta del vendedor en los últimos 30 días. Si no hay datos suficientes muestra `—`. **Sin filtro de `contexto_tipo`** (es característica de la persona, no del módulo).

**Sub-bloque de acciones de contacto:**

- Wrapper `flex flex-1 flex-wrap items-center justify-center gap-2 p-4 lg:gap-3`. Cuando hay KPIs arriba, agrega `border-t-2 border-slate-300` para separarlo del bloque de números.
- Se oculta por completo cuando la persona perfilada es uno mismo o cuando hay relación de bloqueo bidireccional.
- 3 botones inline con logos de marca (Sprint 9.3 — sustituyeron a los icons lucide planos):
  - **WhatsApp** — SVG inline de WhatsApp con su verde brand `#22C55E → #15803D`. Solo aparece si `perfil.telefono` está presente. Abre `https://wa.me/{numero}?text={mensaje}` con mensaje precargado `"Hola {nombre}, vi tu perfil en AnunciaYA"`.
  - **ChatYA** — imagen `/ChatYA.webp` inline (logo oficial). Llama `useChatYAStore.abrirChatTemporal` con `contextoTipo='directo'` (sin card de contexto — el chat abre limpio) **+** `useUiStore.abrirChatYA()` (las dos son obligatorias). Antes de abrir un chat temporal busca si ya existe una conversación con esa persona en modo personal sin negocio asociado; si existe, abre esa conversación con su historial.
  - **Agregar contacto / En contactos** — icono `UserPlus` (o `UserCheck` cuando ya es contacto) envuelto en `Tooltip`. Llama `useChatYAStore.agregarContacto`/`eliminarContacto` sincronizando con la agenda real (`chat_contactos`). Estado leído filtrando `contactos` por `(contactoId, tipo='personal', sucursalId=null)`. Es uno de los 5 puntos de entrada al sistema de contactos de ChatYA — sincroniza en tiempo real con los otros 4 dentro del chat (`VentanaChat`, `PanelInfoContacto`, `MenuContextualChat`, `ListaConversaciones`).

> El mismo patrón de logos inline se reusa en Servicios (`OferenteCard`, `SidebarSobreNegocio`, `CardServicio`) — ver `docs/arquitectura/Servicios.md` §3.3.

**Banner de bloqueado (estado especial):**

- Cuando hay bloqueo bidireccional, sustituye al sub-bloque de acciones por un banner full-width abajo del grid: `flex items-center gap-3 border-t-2 border-red-300 bg-red-100 px-5 py-3 lg:px-6` con icono `Ban h-5 w-5 text-red-700` + texto explicativo `"Has bloqueado a este usuario. No podrán enviarse mensajes mutuamente."`.

#### Tabs Publicaciones / Vendidos

Solo cuando la persona es vendedor. Underline minimalista estilo Linear/Stripe/Notion:

- Tablist: `flex gap-8 border-b-2 border-slate-300`.
- Cada tab (`TabUnderline`):
  - `relative -mb-0.5 inline-flex items-center gap-2.5 border-b-2 px-1 pb-3.5 pt-1.5 text-base lg:text-lg font-bold transition-colors`.
  - Activa: `border-teal-500 text-teal-700`.
  - Inactiva: `border-transparent text-slate-600 hover:text-slate-800`.
  - Icono `h-5 w-5 strokeWidth=2.5` (`Package` para Publicaciones, `ShoppingBag` para Vendidos).
  - Counter inline: `text-sm font-bold tabular-nums` color `text-teal-700` cuando la tab está activa, `text-slate-500` cuando está inactiva.

#### Grid de publicaciones

- Solo cuando la persona es vendedor.
- Grid responsive `grid grid-cols-2 items-start gap-3 lg:grid-cols-4 lg:gap-4 2xl:grid-cols-5` con `CardArticulo variant="compacta"` (aspect 4:3).
- Tab "Vendidos": cada card va envuelta en `CardConOverlayVendido` que superpone `bg-slate-900/60` con icono `PackageX h-8 w-8` blanco + texto `"VENDIDO"` en `text-base font-extrabold tracking-wider`.
- Estado vacío (`EstadoVacio`) cuando el tab no tiene resultados: icono dentro de círculo `h-24 w-24` con gradient teal `#2dd4bf → #0d9488`, halos `animate-ping` concéntricos, sparkles decorativos arriba, título extrabold + cuerpo medio en slate-600. Los copys cambian según `esUnoMismo` y `tabActiva`.

#### Datos del servidor

- `useVendedorMarketplace(usuarioId)` — perfil + KPIs (staleTime 2 min). Se ejecuta siempre (necesitamos saber si la persona es vendedor o no).
- `useVendedorPublicaciones(usuarioId, estado)` — lista paginada por estado. **Solo se ejecuta si la persona es vendedor** (el hook recibe `usuarioId=undefined` cuando no, y queda deshabilitado por `enabled: !!usuarioId`).
- Si el usuario bloqueó al actual → 404 sin revelar el motivo.
- Si visitas tu propio perfil → todos los botones de contacto (WhatsApp, ChatYA, Agregar contacto) quedan ocultos.

#### Endpoints API

Las URLs del backend son `GET /api/marketplace/vendedor/:usuarioId` y `GET /api/marketplace/vendedor/:usuarioId/publicaciones`. La URL del frontend usa `/marketplace/usuario/:usuarioId` mientras que los endpoints conservan `/vendedor/` como detalle de implementación que el usuario nunca ve.

---

### P4 — Composer inline de Publicar / Editar

> **Cambio Sprint 9 (Mayo 2026):** el wizard de 3 pasos que vivía en
> `/marketplace/publicar` se **eliminó**. Ahora el composer vive **inline en
> el feed de MarketPlace** (`/marketplace`), réplica 1:1 del composer de
> Servicios. Las URLs viejas redirigen al feed con el composer expandido
> vía query param. Las decisiones de diseño que motivaron el cambio están
> documentadas en `docs/prompts Marketplace/Sprint-9-Composer-Inline.md`.

**Ruta única:** `/marketplace` con activación por query params:

- `?crear=1` → expande el composer en modo creación.
- `?editar=<articuloId>` → expande el composer en modo edición.

Después de procesarlos, el orquestador `<ComposerSection>` los limpia del
URL con `navigate(..., { replace: true })`.

**Archivos clave (todos en `apps/web/src/`):**

| Archivo | Rol |
|---------|-----|
| `components/marketplace/composer/ComposerSection.tsx` | Orquestador: decide colapsado vs expandido, lee query params. |
| `components/marketplace/composer/ComposerColapsado.tsx` | Pill colapsada en el feed (con variante "borrador en progreso"). |
| `components/marketplace/composer/ComposerMarketplace.tsx` | Composer expandido (header + fotos + campos + acciones). |
| `components/marketplace/composer/ComposerHintModeracion.tsx` | Hint inline cuando el texto parece servicio o búsqueda. |
| `components/marketplace/composer/MisArticulosWidget.tsx` | Widget lateral en PC con los 2 (o 5) artículos activos del autor. |
| `components/marketplace/composer/ChipInputList.tsx` | Input + chips reutilizable (heredado del de Servicios). |
| `hooks/useComposerMarketplace.ts` | Draft + validación + auto-save localStorage. |
| `hooks/useFotosUploaderMarketplace.ts` | Subida batch a R2 + cleanup de huérfanas. |
| `utils/composerMarketplacePayload.ts` | `construirPayloadCrearMP` / `construirPayloadEditarMP`. |
| `utils/borradorComposerMarketplace.ts` | `leerBorradorMarketplace` / `descartarBorradorMarketplace`. |
| `utils/deteccionServicio.ts` | Regex `pareceServicio` / `pareceBusqueda` para el hint. |

#### Modos del composer

| Modo | Detección | Título | Botón final |
|------|-----------|--------|-------------|
| **Crear** | sin `?editar` | "Vender un artículo" | "Publicar" |
| **Editar** | con `?editar=<id>` | "Editar publicación" | "Guardar cambios" |

En modo edición:
- Datos precargados desde `useArticuloMarketplace(id)` (hidratación una sola
  vez con ref-guard, evita pisar lo que el usuario escribió).
- El checklist legal NO se vuelve a mostrar (el original persiste en BD).
- `expira_at` NO se modifica (solo el endpoint "Reactivar" lo extiende).

#### Estructura visual

El composer reutiliza el mismo patrón que `ComposerServicios` con tonos
**teal** (identidad MarketPlace) en lugar de sky. Layout:

```
┌────────────────────────────── COMPOSER COLAPSADO ──────────────────────────┐
│ [✎ teal]  ¿Qué estás vendiendo hoy?            [📷 móvil]                  │
│ ─────────────────────────────────────────────────────────────────────────  │
│ 🖼 Fotos │ 💲 Precio │ 🏷 Condición │ 📍 Zona │ ⋯ Detalles   ← solo PC    │
└────────────────────────────────────────────────────────────────────────────┘

         ↓ click pill o FAB Publicar ↓

┌─────────────── COMPOSER EXPANDIDO (PC: 2 columnas) ────────────────────────┐
│ [avatar] Vender un artículo                                          [✕]   │
│          Juan · Puerto Peñasco                                              │
│ ──────────────────────────────────────────────────────────────────────────  │
│ ┌──────────────┐  Título                                                    │
│ │              │  [Ej: Bicicleta de montaña rodada 26                  ]   │
│ │   ZONA       │  Precio (MXN)                                              │
│ │   FOTOS      │  [$ 0                                                  ]   │
│ │              │  Descripción (opcional, máx 1000)                          │
│ │  [carrusel]  │  [textarea …                                          ]   │
│ │              │  💡 hint inline si parece servicio o búsqueda              │
│ └──────────────┘                                                            │
│                                                                              │
│ Detalles    1/4                                                              │
│ [🏷 Condición] [⋯ Ofertas] [📦 Unidad] [📍 Zona]   ← chips full-width      │
│ ↳ Acordeón con panel del chip activo (PC) / ModalBottom (móvil)            │
│                                                                              │
│ ──────────────────────────────────────────────────────────────────────────  │
│ ☑ Acepto las reglas de publicación de MarketPlace · ver detalles  [Cancel] │
│                                                                  [Publicar] │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Campos del composer

**Columna izquierda (PC) / Bloque arriba (móvil) — `<ZonaFotos>`:**
- Aspect `3/1` móvil (compacto) / `square` PC.
- Vacío: placeholder grande clickeable que abre menú **Cámara / Galería**
  (móvil) o picker de archivos directo (PC).
- Con fotos: carrusel con dots, flechas y badge "Portada" en la primera.
- Botón `+` overlay en hover para agregar más, `X` rojo overlay para
  eliminar la actual (cleanup R2 inline si era de esta sesión).
- Click en la imagen abre el lightbox `<ModalImagenes>` (con back nativo).
- Hasta `MAX_FOTOS_COMPOSER_MP = 8` fotos. Mínimo 1 (obligatorio).

**Columna derecha — campos principales:**
- **Título** — input 10-80 chars con `autoFocus` en creación.
- **Precio (MXN)** — input numérico entero positivo, máximo $999,999. Solo
  acepta dígitos.
- **Descripción** — textarea opcional, máx 1000 chars con contador.
- **`<ComposerHintModeracion>`** — debajo del textarea. Detecta servicio
  (`ofrezco|reparo|clases|asesoría…`) o búsqueda (`busco|necesito|quiero|
  requiero`) con debounce 600ms y sugiere ir a `/servicios?crear=ofrezco`
  o al Home (`/inicio`) según el caso.

**Detalles (full-width, fila de íconos + acordeón único):**
- **Condición** (`Tags`) — chips Nuevo / Seminuevo / Usado / Para reparar.
  Opcional (NULL si no aplica).
- **Acepta ofertas** (`MoreHorizontal`) — chips Sí / No. Opcional (NULL si
  no se especifica).
- **Unidad de venta** (`Package`) — input libre con sugerencias clickables
  (`c/u`, `por kg`, `por docena`, `por litro`, `por metro`). Máx 30 chars.
- **Zona aproximada** (`MapPin`) — input texto 3-150 chars. **Obligatorio.**

Cada chip muestra un dot verde si el campo ya tiene contenido (KPI
`activos/total` arriba del chip strip). En PC el panel se abre inline
debajo de la fila; en móvil abre un `<ModalBottom>` (variante B).

**Footer (Reglas + Acciones):**
- Checkbox unificado: "Acepto las reglas de publicación de MarketPlace"
  más botón "ver detalles" que despliega los 4 puntos legales (lícito,
  en mi poder, honesto, seguro). Marcar el checkbox activa los 4
  internamente. La versión `VERSION_CONFIRMACIONES_MP_COMPOSER` se
  persiste en BD junto con el snapshot.
- Botones **Cancelar** (colapsa, conserva el borrador) y **Publicar**
  (deshabilitado si la validación local falla; muestra el primer error
  abriendo el panel correspondiente al click).

#### Widget lateral — `<MisArticulosWidget>` (solo PC)

A la derecha del composer en grid `lg:grid-cols-[minmax(0,1fr)_320px]`.
Muestra los **2** artículos activos más recientes del autor (mini-cards
con thumbnail, precio en chip teal, condición, KPIs vistas/mensajes/
tiempo) y un footer con link a `/mis-publicaciones`. Cuando el composer
está expandido aumenta a **5** mini-cards (más altura disponible).

#### Manejo de moderación

Dos niveles:

1. **Inline hint (`<ComposerHintModeracion>`)** — detección cliente con
   `pareceServicio` y `pareceBusqueda` (regex espejo del backend) que
   aparece debajo del campo descripción con debounce 600ms. Botón
   amber "Llévame a Servicios" o "Llévame al Home" cierra el composer y
   navega. Botón X discreto para ignorar.

2. **Modal post-publish (`<ModalSugerenciaModeracion>`)** — si el
   backend devuelve `success: false` con `severidad: 'sugerencia'`, abre
   el mismo modal que usaba el wizard antiguo con dos botones:
   - "Editar publicación" → cierra el modal, queda editando.
   - "Continuar de todos modos" → re-llama `publicar(true)` con
     `confirmadoPorUsuario: true`.

**Rechazo duro (HTTP 422)** → `notificar.error(mensaje)` con el texto del
backend (no permite continuar). La detección sigue siendo robusta contra
evasión (leetspeak, separadores, boundary, truncamientos) — la lógica
vive en `apps/api/src/services/marketplace/filtros.ts` y no cambió.

#### Auto-save (borrador local por usuario)

- **Storage**: `localStorage` con key `aya:composer:marketplace:draft-v1`
  para creación, `aya:composer:marketplace:draft-edit-<articuloId>` para
  edición. Cada cambio del draft re-escribe la entrada (sin debounce — es
  trivial vs el costo de perder el borrador).
- **Persistencia entre sesiones**: el borrador sobrevive al cierre del
  navegador, recargas, logout y login posterior. La pill colapsada del
  feed lo detecta y muestra la variante "Borrador en progreso" con
  botones [Descartar] / [Continuar].
- **Aislamiento cross-usuario**: por convención el composer es global y la
  key NO incluye `usuarioId`. Cuando otro usuario se loguea en el mismo
  dispositivo, vería el borrador del anterior — `useAuthStore` limpia la
  key al hacer logout para evitar contaminación cross-cuenta.
- **Descartar borrador** (desde la pill): itera `borrador.fotos` y
  dispara `DELETE /api/marketplace/foto-huerfana` por cada URL antes de
  eliminar la key. El backend valida reference count antes de borrar de
  R2 (las URLs que ya quedaron en un artículo publicado quedan
  protegidas).

#### Subida de fotos a R2 (optimización + cleanup)

- **Optimización cliente-side antes de subir**:
  `apps/web/src/utils/optimizarImagen.ts` (helper compartido con
  `useR2Upload` de ChatYA y BS) redimensiona a `maxWidth: 1920` y
  comprime a WebP `quality: 0.85`. Reduce 70-90% el peso de fotos de
  cámara móvil (5-10 MB → ~500 KB).
- **Flujo del upload**: `useUploadFotoMarketplace` (mutation) pide
  presigned URL al backend (`POST /marketplace/upload-imagen`), el hook
  `useFotosUploaderMarketplace` hace PUT directo a R2 con el blob WebP
  optimizado y empuja la URL al state.
- **Optimistic preview (Sprint 9.2)**: al seleccionar imágenes se generan
  blobs locales (`URL.createObjectURL`) que aparecen INSTANT en el strip
  con un overlay de spinner. Las subidas a R2 corren en paralelo con
  `Promise.allSettled`. Cuando una termina, su preview se reemplaza por
  la URL final de R2. Si falla, se quita la preview y se notifica al
  usuario sin bloquear el resto. Estado expuesto vía `previews:
  FotoPreviewLocal[]` (`{ id, blobUrl, file }`). Mismo patrón en
  `useFotosUploaderServicios`.
- **Cleanup R2 al quitar foto (botón X de la zona de fotos)**: el
  uploader dispara `DELETE /marketplace/foto-huerfana` solo para las
  URLs subidas en la sesión actual (tracked en `urlsSubidasEnSesion`
  ref). Las preexistentes del artículo en edición las maneja el backend
  con `eliminarFotoMarketplaceSiHuerfana` al hacer submit (diff fotos
  viejas vs nuevas en `actualizarArticulo`).
- **Cleanup R2 al descartar borrador**: ver sección Auto-save.
- **Defensa en profundidad en el endpoint backend**: el service
  `eliminarFotoMarketplaceSiHuerfana(url, excluirId?)` verifica
  reference count contra `articulos_marketplace.fotos` antes de borrar
  de R2. Si la URL sigue referenciada conserva el archivo.

> **Hook `useSubirFotoMarketplace` (legacy)**: existe en
> `hooks/queries/useMarketplace.ts` por compatibilidad histórica con el
> wizard. El composer NO lo usa — usa `useUploadFotoMarketplace`
> (mutation, batch-friendly). Eliminar cuando se haga la próxima
> limpieza grande del hook de mutations.

---

### P5 — Buscador con sugerencias en vivo

**Implementación:** overlay anclado al store global `useSearchStore`. El overlay NO tiene input propio: el input físico vive en el Navbar global (desktop) o inline dentro del header del MarketPlace (móvil, patrón inmersivo). Ambos escriben al mismo `useSearchStore.query` para que el overlay reuse toda su lógica.

**Componente overlay:** `apps/web/src/components/marketplace/OverlayBuscadorMarketplace.tsx`

> **Decisión 14 May 2026 — sin página dedicada de resultados.** Antes existía `/marketplace/buscar?q=` con grid + filtros (precio, condición, distancia, ordenar) y un botón "Ver todos los resultados" en el overlay para llegar ahí. Se eliminó por sobre-ingeniería: con ~decenas de artículos por ciudad, los filtros adicionales no aportan valor real y la página solo mostraba lo mismo que ya está en el overlay. El endpoint backend `GET /marketplace/buscar` se mantiene (`buscarArticulos` en `services/marketplace/buscador.ts`) por si la página completa se reabre cuando el volumen lo justifique. Se borraron del frontend: `PaginaResultadosMarketplace.tsx`, `FiltrosBuscador.tsx`, `useFiltrosBuscadorUrl.ts`, `useBuscadorResultados`, ruta `/marketplace/buscar` y query key `marketplace.resultadosBusqueda`.

#### Comportamiento del overlay

- Suscribe a `useSearchStore.buscadorAbierto` y `query`
- Aparece cuando `(buscadorAbierto || query.length >= 1) && pathname.startsWith('/marketplace')`
- **Posicionamiento:** `fixed inset-0` con `mt-20 lg:mt-24` para que el panel quede despegado del Navbar/header (no pegado al borde superior). Esquinas `rounded-2xl`, `max-h-[75vh]` con scroll interno.
- **Desktop:** `onFocus` del input del Navbar emite `abrirBuscador()` solo en `/marketplace*`. `onBlur` con delay cierra solo si query vacío (permite click dentro del overlay).
- **Móvil:** la lupa del header del MP expande el input inline. NO llama `abrirBuscador()` directo — el overlay aparece automáticamente cuando `query.length >= 1`. Al borrar todo el texto el overlay desaparece pero el input inline sigue visible.
- Todos los inputs llevan `autoComplete="off"` para evitar el dropdown nativo del navegador (Chrome) que muestra valores de otras secciones.

#### Estado vacío (al abrir)

- Sección "Búsquedas recientes" con chips eliminables (X) — guardadas en localStorage `marketplace_busquedas_recientes` (FIFO máx 10). Click en chip rellena el query (no cierra el overlay).
- Sección "Más buscado en [ciudad]" con chips populares (top 6 de últimos 7 días). Click en chip rellena el query.
- Botón "Borrar todo" si hay recientes.

#### Mientras escribes (debounce 300ms)

- **Cards con preview** en lugar de lista plana de títulos. Cada card muestra:
  - Foto portada (56×56, `object-cover`) — primer foto del array `fotos[foto_portada_index]`
  - Título completo (truncado si excede)
  - Precio bold teal-700 con formato `$X,XXX.XX` (`toLocaleString('es-MX')`)
  - Condición (junto al precio, neutro slate-500: "Seminuevo", "Nuevo", etc.)
  - Ciudad
  - Ícono `ArrowUpRight` a la derecha
- **Click en card** → navega directo a `/marketplace/articulo/:id` y cierra el overlay.
- Fuente: top 5 artículos completos. SQL combina FTS español (`to_tsvector('spanish', unaccent(...)) @@ plainto_tsquery('spanish', unaccent(...))`) con `ILIKE` substring para cubrir prefix matching ("bici" → "bicicleta") sin perder el ranking del FTS. Endpoint `GET /marketplace/buscar/sugerencias` devuelve `{ id, titulo, precio, condicion, fotoPortada, ciudad }[]`.
- Solo dispara si `query.length >= 2`

#### Privacidad

- `marketplace_busquedas_log` guarda `usuario_id = NULL` siempre (aunque el endpoint sea autenticado). Solo `ciudad + termino + created_at`. Suficiente para calcular populares, imposible de usar para perfilamiento.
- Sanitización del término al guardar: `trim() + toLowerCase()`, quitar puntuación con regex, descartar si `length < 3`.

---

### P6 — Página Pública Compartible

**Ruta:** `/p/articulo-marketplace/:articuloId` (sin guard, fuera del MainLayout privado)
**Archivo:** `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx`

#### Propósito

Permitir compartir un artículo en redes sociales (WhatsApp, Facebook, etc.) con preview correcto vía OG tags.

#### Estructura

- Layout similar a P2 pero sin el MainLayout privado (no muestra Navbar/BottomNav)
- Galería + descripción + card vendedor (sin link "Ver perfil") + mapa con círculo 500m
- OG tags vía `useOpenGraph({ titulo, descripcion, imagen, precio })` — formato: `"$11,910 · Bicicleta vintage Rinos"`
- Footer con CTA "Descubre más en AnunciaYA →" → navega a landing

#### Botones de contacto

**Privacidad — sin WhatsApp directo en página pública:**
- Solo botón "Enviar mensaje al vendedor" → si NO está logueado → `ModalAuthRequerido` con redirect a la misma URL
- WhatsApp solo aparece después de login (en la versión privada)
- Esto evita que scrapers anónimos recolecten teléfonos de vendedores desde páginas públicas

#### Mensajes diferenciados según estado

- **Vendida:** overlay "Este artículo ya fue vendido" + botones de contacto OCULTOS
- **Pausada:** overlay "Esta publicación está pausada por el vendedor" + botones de contacto OCULTOS
- **Eliminada:** 404 amigable directo (no se muestra nada del artículo)


---

## 🔗 Integraciones con Otros Módulos

### Componente `CardArticuloFeed` — props de presentación

`apps/web/src/components/marketplace/CardArticuloFeed.tsx` es la card grande del feed (estilo Facebook) y también es la que se reusa como vista previa en el wizard de publicar. Expone dos props opcionales para adaptar su layout cuando se monta en contenedores distintos al feed:

- **`ocultarThumbnailsLaterales?: boolean`** (default `false`) — cuando es `true`, no renderiza el sidebar de thumbnails laterales en desktop ni reserva el espacio `lg:mr-24` para él dentro de la galería. Útil para contenedores estrechos donde el sidebar no caben los 24 px laterales.
- **`claseAspectoGaleria?: string`** (default `aspect-[4/3] lg:aspect-[2/1]`) — sobrescribe las clases de aspecto/altura de la galería principal. Útil en previsualizaciones que necesitan más altura vertical para que las miniaturas entren completas (p. ej. el wizard P4 usa `aspect-[4/3] lg:aspect-square`).

El sidebar de thumbnails laterales del feed real (cuando `tieneMultiples && !modoModal && !ocultarThumbnailsLaterales`) usa `absolute top-0 right-0 bottom-0 hidden w-24 flex-col gap-2 overflow-y-auto bg-slate-200 p-2 lg:flex` para tomar el alto exacto del wrapper relative (= alto de la galería principal). Si las miniaturas exceden ese alto, scrollean internamente con `overflow-y-auto`.

**Comentarios inline en el feed:** `CardArticuloFeed.tsx` trae `topComentarios` (árbol de 1 nivel, antes `topPreguntas`) y `totalComentarios` (antes `totalPreguntasRespondidas`). Muestra los hilos inline con el mismo `ComentarioItem` que el detalle + un input de comentario (mínimo 2 caracteres).

### ChatYA

- Contacto comprador → vendedor desde `useChatYAStore.abrirChatTemporal()` con `contextoTipo='marketplace'` y `contextoReferenciaId={articuloId}` cuando viene del detalle de un artículo (genera card de contexto embebida del artículo).
- Para chats desde el perfil del usuario (P3) o desde el botón **Contactar** del menú kebab de un comentario (`ComentarioItem`) usa `contextoTipo='directo'` sin card.
- La columna específica `chat_conversaciones.articulo_marketplace_id` existe en BD pero no se llena vía el endpoint actual de `abrirChatTemporal`. Queda para una iteración futura cuando se necesite.

### Mis Guardados

- Los artículos de MarketPlace se guardan con `entity_type='articulo_marketplace'` en la tabla `guardados`.
- Tab "Artículos" en `PaginaGuardados.tsx` activa con render de `<CardArticulo>`.
- Hook dedicado `useArticulosMarketplaceGuardados` paralelo a `useMisGuardados` (polimórfico para Ofertas/Negocios), para mantener las superficies independientes.

### Mis Publicaciones (`/mis-publicaciones`)

Panel del vendedor implementado en `apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx`. Identidad visual: header dark sticky con acento **cyan** (`#22d3ee → #0891b2`, glow `rgba(6,182,212,0.07)`, icono `Package`) — replica el patrón estandarizado de CardYA/Cupones/Guardados/MarketPlace pero con paleta propia para distinguir el panel del vendedor del feed teal del comprador.

> **Decisión arquitectural (pendiente de aplicar cuando llegue Servicios):** cuando exista el sprint de Servicios y los usuarios puedan publicar tanto artículos (MarketPlace) como servicios/empleos (Servicios), `/mis-publicaciones` se mantiene como **punto único de entrada** y se agrega un **selector top-level "MarketPlace / Servicios"** que cambia el contexto completo (tabs, ícono, card, estados). Cada sub-sección conserva su ciclo de vida independiente: MP usa Activas/Pausadas/Vendidas con `CardArticuloMio`; Servicios usará sus propios estados (Activos/Pausados/Cerrados o similar) con `CardServicioMio`. Mezclar ambos tipos en los mismos tabs forzaría taxonomía artificial (un servicio no se "vende"). Referencia UX: MercadoLibre "Mis publicaciones" único con filtro de tipo arriba.

**Estructura:**

- 3 tabs (chips estilo CardYA): **Activas / Pausadas / Vendidas**. El conteo del tab activo aparece como pill blanca dentro del chip. La columna `eliminada` queda fuera (soft delete; el endpoint la filtra de raíz).
- Banner condicional **"Tienes un borrador sin publicar"** — aparece solo si existe la key `aya:composer:marketplace:draft-v1` en localStorage con contenido válido (título o al menos una foto). Click → navega a `/marketplace?crear=1`, que expande el composer inline y hidrata el borrador automáticamente. Si no hay borrador, el banner no se renderiza.
- Listado responsive de `CardArticuloMio` (1 col móvil · 2 col laptop · 3 col 2xl) con foto cuadrada + título + precio + pill de estado + KPIs reales (`👁 vistas · 💬 mensajes · ♡ guardados · ⏱ días restantes`). Click en card → detalle público P2 (`/marketplace/articulos/:id`). Menú "⋯" → acciones contextuales según estado.
- Estado vacío por tab con CTA "Publicar artículo" (solo en tab Activas; los otros tabs tienen mensaje contextual sin CTA).
- FAB "+" en móvil (esquina inferior derecha, encima del BottomNav) para publicar rápido; CTA "Publicar" en el header lado derecho en desktop.

**Acciones del menú "⋯" por estado:**

| Estado | Acciones |
|--------|----------|
| `activa` | Editar · Pausar · Marcar vendido · (sep) · Eliminar |
| `pausada` | Editar · Reactivar (+30 días) · Marcar vendido · (sep) · Eliminar |
| `vendida` | Eliminar (estado terminal; no se puede reabrir) |

Acciones reversibles (Pausar / Reactivar) ejecutan directo con `notificar.exito/error`. Acciones destructivas (Marcar vendido / Eliminar) abren `ModalAdaptativo` de confirmación con descripción del impacto antes de disparar la mutation.

**Datos del servidor (React Query):**

- `useMisArticulosMarketplace(estado, paginacion)` — `GET /api/marketplace/mis-articulos?estado=&limit=&offset=` con `placeholderData: keepPreviousData` (regla del proyecto, evita temblor visual al cambiar de tab).
- `useCambiarEstadoArticuloMarketplace()` — `PATCH /articulos/:id/estado` con body `{estado: 'activa'|'pausada'|'vendida'}`. Reglas de transición aplicadas en backend.
- `useEliminarArticuloMarketplace()` — `DELETE /articulos/:id` (soft delete con cleanup R2 vía reference counting).
- `useReactivarArticulo()` — `POST /articulos/:id/reactivar` (extiende `expira_at +30d` + estado=activa). Reutilizado del sprint anterior.

Todas las mutations invalidan `marketplace.all()` para que el cambio se refleje en feed público, perfil del vendedor (P3) y Mis Guardados de otros usuarios (estos últimos vía refetch — el filtro server-side en `guardados.service.ts` ya excluye `vendida/pausada/eliminada`). El detalle individual (`marketplace.articulo(id)`) también se invalida puntualmente.

**Query key:** `['marketplace', 'mis-articulos', estado ?? 'todos', paginacion]` — registrada en `apps/web/src/config/queryKeys.ts` bajo `marketplace.misArticulos`.

### ModoPersonalEstrictoGuard

- Guard separado de `ModoGuard` existente. La política de MarketPlace es bloqueo total (sin auto-cambio), distinta de CardYA/ScanYA/Mis Publicaciones que sí auto-cambian.

### Sistema Universal de Compartir

- Botón "Compartir" en P2 usa `DropdownCompartir` reusado (Web Share API + copiar al portapapeles).
- URL compartida: `/p/articulo-marketplace/:id` (página pública P6 con OG tags).

### PanelNotificaciones (campanita global)

Eventos del MarketPlace que disparan notificaciones:
- **`marketplace_proxima_expirar`** — 3 días antes de expirar
- **`marketplace_expirada`** — al auto-pausar por TTL
- **`marketplace_nuevo_mensaje`** — reservado (lo dispara ChatYA cuando aplica)
- **`marketplace_nuevo_comentario`** — al dueño del artículo cuando alguien comenta
- **`marketplace_respuesta_comentario`** — al autor de un comentario cuando le responden

> Los tipos viejos `marketplace_nueva_pregunta` / `marketplace_pregunta_respondida` se **conservan** en el CHECK de `notificaciones.tipo` por compatibilidad histórica, pero ya no se emiten.

**Click en notificación → navega al artículo:** `PanelNotificaciones.tsx → obtenerRutaDestino()` mapea cualquier notificación con `referenciaTipo === 'marketplace'` a `/marketplace/articulo/${referenciaId}`. Cubre los 5 tipos `marketplace_*` arriba — la `referenciaId` siempre es el UUID del artículo.

### Onboarding y Auth

- MarketPlace requiere usuario autenticado en modo Personal.
- Página pública (`/p/articulo-marketplace/:id`) es visible sin auth pero el botón de mensaje muestra `ModalAuthRequerido`.

### Sistema de Contactos (`useChatYAStore`)

- Botón "Agregar a contactos" en P3 (`PaginaPerfilVendedor.tsx`) lee `useChatYAStore.contactos` y llama `agregarContacto`/`eliminarContacto`. El estado se calcula filtrando por `(contactoId, tipo='personal', sucursalId=null)`. Carga `cargarContactos('personal')` al montar.
- Persiste en `chat_contactos` (sistema real de agenda persistente del chat — ver `docs/arquitectura/ChatYA.md` §4.9). 5to punto de entrada que se sincroniza con las otras 4 superficies dentro del chat.
- El follow de negocios (`entity_type='sucursal'`) en `PaginaPerfilNegocio.tsx` es una feature distinta y vive en la tabla `votos`. El check `votos_entity_type_check` solo acepta `'sucursal'` para esa relación; MarketPlace no usa `votos` para conexiones entre personas.

---

## 🔌 Backend — Endpoints en Producción

### Públicos (con `verificarTokenOpcional`)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/marketplace/feed` | Feed inicial (recientes + cercanos) por ciudad y GPS |
| GET | `/api/marketplace/feed/trending` | "Lo más visto hoy" — top por actividad 24h |
| GET | `/api/marketplace/articulos/:id` | Detalle público de un artículo |
| POST | `/api/marketplace/articulos/:id/vista` | Registrar vista (incrementa contador) |
| POST | `/api/marketplace/articulos/:id/heartbeat` | Heartbeat "viendo ahora" (Redis sorted set TTL 2min) |
| GET | `/api/marketplace/articulos/:id/comentarios` | Comentarios públicos. Devuelve el árbol de 1 nivel `{ success, data: ComentarioNodo[] }`. Cada nodo: `id, autorId, autorNombre, autorApellidos, autorAvatarUrl, texto, esVendedor` (autor == dueño del artículo), `editadoAt, createdAt, respuestas[]`. Lo ve cualquiera (no hay estado "pendiente" ni visibilidad restringida). |
| GET | `/api/marketplace/buscar/sugerencias` | Sugerencias en vivo con preview (top 5 con `id, titulo, precio, condicion, fotoPortada, ciudad`) |
| GET | `/api/marketplace/buscar/populares` | Top búsquedas populares por ciudad (cache Redis 1h) |
| GET | `/api/marketplace/buscar` | Resultados de búsqueda con filtros (ya no consumido por frontend desde 14-may-2026 — ver §P5) |
| GET | `/api/marketplace/vendedor/:usuarioId` | Perfil público del vendedor + KPIs |
| GET | `/api/marketplace/vendedor/:usuarioId/publicaciones` | Lista de publicaciones del vendedor por estado |

### Privados (requieren `verificarToken` + `requiereModoPersonal`)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/marketplace/articulos` | Crear artículo (con validación de moderación) |
| PUT | `/api/marketplace/articulos/:id` | Editar artículo (solo dueño, con validación de moderación) |
| PATCH | `/api/marketplace/articulos/:id/estado` | Cambiar estado (pausar/activar/vender) |
| POST | `/api/marketplace/articulos/:id/reactivar` | Reactivar publicación pausada (extiende +30 días) |
| DELETE | `/api/marketplace/articulos/:id` | Eliminar (soft delete, solo dueño) |
| GET | `/api/marketplace/mis-articulos` | Lista paginada de artículos del usuario actual |
| POST | `/api/marketplace/upload-imagen` | Presigned URL para subir foto a R2 (prefijo `marketplace/`) |
| POST | `/api/marketplace/articulos/:id/comentarios` | Crear comentario o respuesta. Body `{ texto, parentId? }` (texto 2-500 chars). `parentId` ausente = comentario raíz; con valor = respuesta. Si `parentId` apunta a una respuesta, el backend sube el `parentId` al raíz (hilos de 1 nivel). Mantiene la **moderación de texto** (rechazo duro) del Q&A viejo. El dueño del artículo también puede comentar/responder en su propia publicación. |
| PUT | `/api/marketplace/comentarios/:id` | Editar comentario. Body `{ texto }`. Solo el autor, **sin límite de tiempo**. |
| DELETE | `/api/marketplace/comentarios/:id` | Eliminar comentario (soft delete). Autor del comentario **o** dueño del artículo. Borrar un raíz hace soft-delete en cascada de sus respuestas. |

### Middleware aplicable

- `verificarToken` o `verificarTokenOpcional` según endpoint
- `requiereModoPersonal` (existente, reusado del módulo de validación de modos)
- `verificarPropietarioArticulo` (verificación inline en service para PUT/DELETE/PATCH)

### Validaciones Zod

`apps/api/src/validations/marketplace.schema.ts`:

- `crearArticuloSchema` — campos completos del wizard
- `actualizarArticuloSchema` — todos opcionales, NO acepta `expira_at` ni `estado` (lock de seguridad)
- `cambiarEstadoSchema` — enum `activa | pausada | vendida` (`eliminada` solo por DELETE)
- `feedQuerySchema` — `lat`, `lng`, `ciudad`
- `misArticulosQuerySchema` — paginación + filtro opcional por estado
- `uploadImagenSchema` — tipos `image/jpeg | image/png | image/webp`
- `sugerenciasQuerySchema`, `popularesQuerySchema`, `buscarQuerySchema` — buscador
- `crearComentarioSchema` (`{ texto: 2-500 chars, parentId?: uuid }`) y `editarComentarioSchema` (`{ texto: 2-500 chars }`) — comentarios públicos

Los schemas de artículo aceptan `confirmadoPorUsuario?: boolean` para flujo de moderación con sugerencia suave.

---

## 🗄️ Base de Datos — Tablas en Producción

### `articulos_marketplace`

```sql
CREATE TABLE articulos_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Contenido
  titulo VARCHAR(80) NOT NULL,
  descripcion TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL,
  condicion VARCHAR(20) NOT NULL CHECK (condicion IN ('nuevo','seminuevo','usado','para_reparar')),
  acepta_ofertas BOOLEAN NOT NULL DEFAULT true,

  -- Fotos (array de URLs en R2)
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto_portada_index SMALLINT NOT NULL DEFAULT 0,

  -- Ubicación (con privacidad)
  ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,            -- exacta, NUNCA pública
  ubicacion_aproximada GEOGRAPHY(POINT, 4326) NOT NULL, -- aleatorizada 500m, ESTA es pública
  ciudad VARCHAR(100) NOT NULL,
  zona_aproximada VARCHAR(150) NOT NULL,

  -- Estado
  estado VARCHAR(20) NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa','pausada','vendida','eliminada')),

  -- Métricas
  total_vistas INTEGER NOT NULL DEFAULT 0,
  total_mensajes INTEGER NOT NULL DEFAULT 0,
  total_guardados INTEGER NOT NULL DEFAULT 0,

  -- TTL (auto-pausa a los 30 días)
  expira_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vendida_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_marketplace_estado ON articulos_marketplace(estado);
CREATE INDEX idx_marketplace_ciudad ON articulos_marketplace(ciudad);
CREATE INDEX idx_marketplace_usuario ON articulos_marketplace(usuario_id);
CREATE INDEX idx_marketplace_created ON articulos_marketplace(created_at DESC);
CREATE INDEX idx_marketplace_expira ON articulos_marketplace(expira_at);
CREATE INDEX idx_marketplace_ubicacion ON articulos_marketplace USING GIST(ubicacion_aproximada);
CREATE INDEX idx_marketplace_titulo_fts ON articulos_marketplace
  USING GIN(to_tsvector('spanish', titulo || ' ' || descripcion));
```

### `marketplace_busquedas_log`

```sql
CREATE TABLE marketplace_busquedas_log (
  id BIGSERIAL PRIMARY KEY,
  ciudad VARCHAR(100) NOT NULL,
  termino VARCHAR(100) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,  -- siempre NULL por privacidad
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_busquedas_ciudad_fecha ON marketplace_busquedas_log(ciudad, created_at DESC);
```

### Cambios a tablas existentes

**`chat_conversaciones`**:
- Columna `articulo_marketplace_id UUID REFERENCES articulos_marketplace(id) ON DELETE SET NULL`.
- Check `contexto_tipo` incluye los valores que usa MarketPlace (`'marketplace'` y `'directo'`).
- Índice parcial `idx_chat_conv_articulo_marketplace`.

**`guardados`**:
- Check `entity_type` incluye `'articulo_marketplace'`.

**`votos`**:
- Check `entity_type` incluye `'sucursal'` para el follow de negocios. MarketPlace no usa esta tabla para conexiones entre personas (esas viven en `chat_contactos`).

**`notificaciones`**:
- Check `tipo` incluye `'marketplace_nuevo_mensaje'`, `'marketplace_proxima_expirar'`, `'marketplace_expirada'`, `'marketplace_nuevo_comentario'`, `'marketplace_respuesta_comentario'`. Los tipos viejos `'marketplace_nueva_pregunta'` y `'marketplace_pregunta_respondida'` se **conservan en el CHECK** por compatibilidad histórica (filas antiguas), aunque ya no se emiten.
- **Columna `tipo`:** `VARCHAR(50)`. El tipo `marketplace_respuesta_comentario` mide 33 caracteres y necesita este ancho para que el INSERT no falle silenciosamente por el `.catch(() => {})` del service. Migración aplicada: `docs/migraciones/2026-05-05-notificaciones-tipo-varchar50.sql`.

**`marketplace_comentarios`** (reemplaza a `marketplace_preguntas`, que fue **eliminada con DROP**):
```sql
CREATE TABLE marketplace_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES articulos_marketplace(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES marketplace_comentarios(id) ON DELETE CASCADE,  -- NULL = raíz; con valor = respuesta
  texto VARCHAR(500) NOT NULL,
  editado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mp_comentarios_articulo
  ON marketplace_comentarios(articulo_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_mp_comentarios_parent
  ON marketplace_comentarios(parent_id)
  WHERE deleted_at IS NULL;
```

**Migraciones:** `docs/migraciones/2026-06-29-marketplace-comentarios.sql` (creación de la tabla + migración de datos del Q&A viejo) y `docs/migraciones/2026-06-30-drop-marketplace-preguntas.sql` (fase *contract* que elimina `marketplace_preguntas`).

**Sistema de Comentarios públicos:** los comentarios son **públicos al instante** — ya no existe el estado "pendiente" ni la visibilidad restringida. Cualquiera ve todos los comentarios de un artículo.

- **Hilos de 1 nivel:** un comentario raíz (`parent_id IS NULL`) puede tener respuestas. "Responder a una respuesta" cuelga del mismo hilo raíz — el backend resuelve subiendo el `parentId` recibido hasta el raíz antes de insertar. El árbol se arma con el helper compartido `armarArbolComentarios` de `apps/api/src/services/comentarios/arbol.ts` (tipos `ComentarioNodo` / `ComentarioPlano`), reutilizado por MarketPlace y Servicios.
- **Longitud del texto:** mínimo 2, máximo 500 caracteres.
- **Permisos:** **editar** lo hace solo el autor, sin límite de tiempo (setea `editado_at = NOW()`). **Eliminar** lo hace el autor del comentario **o** el dueño del artículo; borrar un raíz hace soft-delete en cascada de sus respuestas. El **dueño del artículo** también puede comentar/responder en su propia publicación (sus comentarios llevan la etiqueta de autor "Vendedor", calculada con `esVendedor = autor == dueño del artículo`).
- **Notificaciones:** crear un comentario raíz notifica al dueño del artículo (`marketplace_nuevo_comentario`); responder notifica al autor del comentario que se respondió (`marketplace_respuesta_comentario`).

Se retiró toda la "gestión/moderación del dueño" del modelo viejo: ya no hay "responder como vendedor en burbuja especial", ni "derivar a chat", ni endpoints `/mia`, ni badge "Pendiente". El contacto directo con el autor se hace desde el botón **Contactar** del menú kebab de cada comentario (abre ChatYA).

---

## ⏰ Cron Jobs en Producción

**Archivo:** `apps/api/src/cron/marketplace-expiracion.cron.ts`

### Auto-pausar expirados

- **Frecuencia:** cada 6 horas (60s después del arranque + intervalo)
- **Acción:** `UPDATE articulos_marketplace SET estado='pausada' WHERE estado='activa' AND expira_at < NOW()` con `RETURNING`
- Por cada artículo afectado crea notificación tipo `marketplace_expirada` (idempotente — verifica existencia previa)
- Logs: `[Marketplace Cron] Auto-pausados: N`

### Notificar próxima expiración

- **Frecuencia:** 1 vez al día a las 09:00 UTC (mañana en México)
- **Acción:** SELECT artículos con `expira_at` entre `NOW()+3d` y `NOW()+3d+1h`, estado `activa`
- Por cada uno crea notificación `marketplace_proxima_expirar` (idempotente)
- Solo crea la notificación 1 vez por artículo

### Helper compartido

`crearNotificacionMarketplace(usuarioId, tipo, titulo, articuloId)` verifica `WHERE referencia_id+tipo` antes de insertar. Garantiza idempotencia para ambos crons.


---

## 🚫 Decisiones Rechazadas

> Esta sección documenta features que se evaluaron y descartaron. **NO volver a proponer en futuras sesiones** sin nueva evidencia.

### "Lo busco" / Modo demanda

- **Qué era:** los compradores publicaban lo que buscaban y los vendedores respondían "Tengo eso".
- **Por qué se descarta:** se encima con **"Pregúntale a [ciudad]"** del Home (feed conversacional donde cualquier usuario pregunta y vecinos/negocios responden). Tener ambos crearía confusión sobre dónde publicar una búsqueda.
- **Solución:** las búsquedas se hacen desde Pregúntale a [ciudad] en el Home, que ya cubre ese caso de uso de forma más amplia (objetos, servicios, recomendaciones, etc.).

### Categorías como navegación principal

- **Qué era:** grid de categorías (Segunda mano, Hecho a mano, Hogar, Electrónicos, etc.) como destino navegable en el feed.
- **Por qué se descarta:** el comportamiento real del usuario es buscar directo por nombre del artículo. Mantener categorías obliga a clasificar al publicar (alarga el wizard) sin aportar al descubrimiento. Facebook Marketplace y OLX han reducido el peso de categorías por la misma razón.
- **Solución:** el buscador (sugerencias, populares, recientes) cubre el descubrimiento. El artículo NO requiere categoría al publicar.

### Integración con CardYA

- **Qué era:** badge "CardYA habilitado" en cards y toggle "Cobrar con CardYA" al publicar como método de pago seguro.
- **Por qué se descarta:** CardYA es para puntos de lealtad en negocios verificados con suscripción comercial. NO aplica a compra-venta entre personas.

### "Buen precio" automático y "Buen título" feedback

- **Qué era:** sugerencias inteligentes al publicar comparando con artículos similares en la ciudad.
- **Por qué se descarta:** requiere histórico de ventas y data suficiente. En beta no habrá datos para que la sugerencia sea confiable.
- **Cuándo retomar:** cuando haya 200+ artículos publicados y ventas confirmadas en el sistema.

### "Acepta trueque" como toggle al publicar

- **Qué era:** marcar la publicación como dispuesta a intercambiar por otro artículo.
- **Por qué se descarta:** caso de uso de nicho. Si el comprador quiere proponer trueque, lo hace por ChatYA.

### "Hacer oferta" como botón aparte en el detalle

- **Qué era:** botón formal "Hacer oferta $XXX" separado del botón de mensaje, con flujo de ofertas y contraofertas dentro de la app.
- **Por qué se descarta:** el botón "Enviar mensaje" ya cubre la negociación. Diferenciar "ofertas formales" agrega complejidad de backend sin valor claro mientras la transacción siga siendo offline.

### Importar lote (carga masiva)

- **Qué era:** subir varios artículos de una sola vez con un archivo.
- **Por qué se descarta:** feature de plataformas como Mercado Libre o vendedores profesionales. En MarketPlace de AnunciaYA el volumen por usuario es bajo.

### Vista previa en vivo en móvil

- **Qué era:** mientras publicas en móvil, ver al lado cómo se va a ver tu publicación.
- **Por qué se descarta:** el viewport móvil no tiene espacio para mostrar el formulario y la vista previa simultáneamente. Solo se conserva en **desktop** como bonus.

### Notificaciones propias del módulo

- **Qué era:** sección de notificaciones específica de MarketPlace.
- **Por qué se descarta:** la app ya tiene `PanelNotificaciones` global. Las notificaciones del MarketPlace caen ahí con el `tipo` correspondiente.

### Chat propio del módulo

- **Qué era:** sistema de mensajería interna del MarketPlace.
- **Por qué se descarta:** la app ya tiene **ChatYA** completo. Las conversaciones se hacen desde ChatYA con `contextoTipo='marketplace'`.

### Favoritos propios del módulo

- **Qué era:** sección "Favoritos" exclusiva de MarketPlace.
- **Por qué se descarta:** la app ya tiene **Mis Guardados** con sistema de tabs. Los artículos guardados de MarketPlace caen en la tab "Artículos".

### Sistema de reportes de usuarios

- **Qué era:** botón "Reportar publicación" + cola de revisión admin.
- **Por qué se descarta:** sin equipo para revisar reportes, sería un canal sin destinatario. Falsa promesa al usuario. La moderación se mantiene 100% automatizada (Capa 1 + auto-expiración).

### Filtro "Acepta ofertas" en buscador

- **Qué era:** toggle para filtrar solo publicaciones que aceptan ofertas.
- **Por qué se descarta:** como `aceptaOfertas` default es `true`, el filtro siempre devolvería casi todo. Si los vendedores empiezan a desactivar el toggle en cantidad significativa, se agrega.

### Buscador local en MarketPlace

- **Qué era:** input de búsqueda dentro del header dark de MarketPlace.
- **Por qué se descarta:** la app ya tiene un buscador global en el Navbar (`useSearchStore`) que se adapta a la sección activa con `placeholderSeccion('marketplace')`. Tener dos inputs confunde al usuario y duplica código.
- **Solución:** el overlay del buscador en MarketPlace NO tiene input propio — solo aporta contenido (sugerencias, populares, recientes) anclado al store global.

### "Cambiar ubicación" con input lat/lng manual

- **Qué era:** botón en el wizard de publicar para cambiar la ubicación del artículo introduciendo coordenadas manualmente.
- **Por qué se descarta:** ningún usuario sabe sus coordenadas. Se usa solo GPS del usuario o coordenada de la ciudad activa por defecto. Si los usuarios lo piden con frecuencia, se evaluará agregar un mapa interactivo con marker arrastrable.

### Botón "Llevar a Servicios" en modal de sugerencia

- **Qué era:** cuando el wizard detecta un servicio disfrazado, ofrecer botón para precargar los datos en `/servicios/publicar`.
- **Por qué se descarta:** la sección `/servicios` aún no existe. El modal solo ofrece "Editar mi publicación" y "Continuar de todos modos". Se reactivará cuando exista la sección.

### Portada decorativa en perfil del vendedor

- **Qué era:** banner teal sólido o imagen genérica en la parte superior del perfil del vendedor.
- **Por qué se descarta:** se ve como banner publicitario raro. Solo avatar grande centrado en bloque blanco limpio. Si los usuarios piden poder subir su propia portada, se evaluará agregar.

### Badge "✓ Verificado" en perfil

- **Qué era:** badge azul al lado del nombre del vendedor si tiene correo verificado.
- **Por qué se descarta:** todos los usuarios tienen correo verificado (es requisito de login), por lo que el badge no diferencia a nadie. La diferenciación real vive en el sistema de niveles del vendedor (ver §Sistema de Niveles).

### Filtrar tiempo de respuesta por `contexto_tipo`

- **Qué era:** calcular el KPI "tiempo de respuesta promedio" del vendedor solo con conversaciones de MarketPlace.
- **Por qué se descarta:** el tiempo de respuesta es característica de la persona, no del módulo. Filtrar por contexto haría que en beta (con pocos chats MarketPlace) el KPI siempre muestre `—` para vendedores que sí responden rápido en otros contextos.
- **Solución:** se usan TODOS los chats del vendedor (cross-módulo) en últimos 30 días.

### WhatsApp directo en página pública

- **Qué era:** botón WhatsApp visible sin login en la página `/p/articulo-marketplace/:id`.
- **Por qué se descarta:** un visitante anónimo podría obtener el número del vendedor con un scraper. Por privacidad, en la página pública solo aparece "Enviar mensaje" → `ModalAuthRequerido`. WhatsApp solo aparece después de login.

### Persistir `usuario_id` en `marketplace_busquedas_log`

- **Qué era:** guardar quién hizo cada búsqueda para "mis búsquedas frecuentes" personalizadas.
- **Por qué se descarta:** principio de privacidad. Solo se necesita `ciudad + termino + created_at` para calcular populares. Si en el futuro se quiere personalizar, hay localStorage para eso.
- **Implementación:** `usuario_id = NULL` siempre en `marketplace_busquedas_log`, aunque el endpoint sea autenticado.


---

## 🏆 Sistema de Niveles del Vendedor (Pendiente)

> **Estado:** ⏸ Pendiente — diseñado pero no implementado
> **Recomendación:** implementar después de tener data real de la beta (mínimo 2-3 meses de uso o 50+ ventas confirmadas). Los umbrales de cada nivel son adivinanzas hasta validarse con comportamiento real de usuarios.
>
> El módulo MarketPlace funciona perfectamente sin este sistema.

### Inspiración

MercadoLíder de Mercado Libre, adaptado a un modelo P2P offline donde no existen reclamos formales, cancelaciones rastreables ni despachos. Mide **comportamiento real sostenido** en lugar de calificaciones u opiniones.

### Objetivo

Generar confianza entre desconocidos, premiar a los vendedores activos, y diferenciar AnunciaYA de Facebook Marketplace donde todos los perfiles se ven iguales.

**100% automático.** Se calcula con un cron job diario sin intervención humana. No hay reseñas, no hay reclamos, no hay panel admin.

### Datos que se medirían (todos automáticos)

| Dato | Fuente | Cómo se calcula |
|------|--------|-----------------|
| Antigüedad | `usuarios.created_at` | `NOW() - created_at` |
| Tiempo de respuesta promedio | `chat_mensajes` | Promedio de minutos entre primer mensaje del comprador y primera respuesta del vendedor, en últimos 30 días |
| Tasa de respuesta | `chat_conversaciones` + `chat_mensajes` | % de conversaciones donde el vendedor respondió al menos una vez, en últimos 30 días |
| Publicaciones activas | `articulos_marketplace` | `COUNT(*) WHERE estado='activa' AND usuario_id=X` |
| Ventas auto-reportadas | `articulos_marketplace` | `COUNT(*) WHERE estado='vendida' AND usuario_id=X` |
| Ventas confirmadas | `articulos_marketplace.venta_confirmada_por_comprador = true` | Ver §Confirmación de compra |
| Última actividad | `usuarios.ultima_conexion` | Fecha del último login o acción |

### Confirmación de compra (sin fricción)

Cuando el vendedor marca una publicación como `vendida`, el sistema dispara un mensaje automático en ChatYA al comprador con el que más mensajes intercambió en esa conversación:

```
┌──────────────────────────────────────┐
│ Lucía marcó este artículo como       │
│ vendido. ¿Confirmas que lo compraste?│
│                                      │
│ [Sí, lo compré] [No fue conmigo]    │
└──────────────────────────────────────┘
```

**Comportamiento:**
- Si responde **"Sí"** → la venta cuenta como **confirmada**
- Si responde **"No"** → la venta queda como **auto-reportada** (cuenta para "ventas" pero no para "ventas confirmadas"). NO penaliza al vendedor.
- Si **ignora el mensaje** (no responde en 7 días) → queda como auto-reportada
- Esta interacción NO es una reseña ni una calificación. Solo un check booleano.

### Los 5 niveles

Los niveles **describen** el comportamiento del vendedor. **No hay niveles negativos** (sin colores rojo/amarillo). Si alguien no tiene actividad, simplemente no tiene nivel — no se le señala como "malo".

#### Nivel 0 — Sin nivel (default)

- Usuario nuevo sin actividad o con perfil incompleto
- No se muestra ningún badge

#### Nivel 1 — Activo

**Requisitos (todos):**
- 1+ publicación activa en últimos 30 días
- Perfil completo: avatar real + nombre completo

**Cómo se ve:**
- En el perfil (P3): pequeño "✓ Vendedor activo" en gris discreto al lado del nombre

#### Nivel 2 — Frecuente

**Requisitos (todos):**
- 5+ ventas auto-reportadas históricas

**Cómo se ve:**
- En el perfil (P3): badge "Vendedor frecuente" en gris medio

#### Nivel 3 — Confiable

**Requisitos (todos):**
- 10+ ventas auto-reportadas
- 3+ ventas confirmadas por compradores
- Tiempo de respuesta promedio < 2 horas (últimos 30 días)
- Antigüedad > 30 días

**Cómo se ve:**
- En el perfil (P3): badge "Vendedor confiable" en teal
- En cards del feed: badge teal pequeño en esquina inferior izquierda de la imagen
- En búsquedas con orden "Más relevantes": **boost de prioridad** (ajustado en implementación, recomendación inicial 1.2x)

#### Nivel 4 — Recomendado

**Requisitos (todos):**
- 25+ ventas auto-reportadas
- 10+ ventas confirmadas por compradores
- Tiempo de respuesta promedio < 1 hora (últimos 30 días)
- Tasa de respuesta > 80% (últimos 30 días)
- Antigüedad > 6 meses

**Cómo se ve:**
- En el perfil (P3): badge "Recomendado" en teal con ícono destacado
- En cards del feed: badge teal con ícono pequeño
- En búsquedas con orden "Más relevantes": **boost de prioridad** mayor (recomendación inicial 1.4x — evaluar si es muy agresivo y bajar a 1.2x para no perjudicar a vendedores nuevos)

### Comportamiento del sistema

#### Cron job diario

- Corre 1 vez al día (madrugada, 03:00 UTC)
- Recalcula nivel de todos los usuarios con publicaciones en MarketPlace en últimos 30 días
- Actualiza campo `nivel_marketplace` en tabla `usuarios`
- Si un usuario sube de nivel: notificación push: *"¡Subiste a nivel Confiable! Tus publicaciones tendrán más visibilidad."*
- Si un usuario baja de nivel: NO se notifica (no se le hace pasar mal). El badge simplemente se actualiza silenciosamente.

#### Tooltips explicativos

Cada badge es **clickeable** y abre un mini-modal explicando qué significa el nivel y qué hace falta para subir al siguiente. Esto le da al usuario la sensación de progreso sin gamificación caricaturesca.

### Backend — campos requeridos

**Tabla `usuarios`** — agregar:
```sql
ALTER TABLE usuarios
  ADD COLUMN nivel_marketplace SMALLINT NOT NULL DEFAULT 0
    CHECK (nivel_marketplace BETWEEN 0 AND 4),
  ADD COLUMN nivel_marketplace_actualizado_at TIMESTAMPTZ;
```

**Tabla `articulos_marketplace`** — agregar:
```sql
ALTER TABLE articulos_marketplace
  ADD COLUMN venta_confirmada_por_comprador BOOLEAN DEFAULT false,
  ADD COLUMN comprador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
```

### Endpoints adicionales

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/marketplace/articulos/:id/marcar-vendida` | Vendedor marca como vendida + dispara mensaje de confirmación al comprador |
| POST | `/api/marketplace/articulos/:id/confirmar-compra` | Comprador confirma `{ confirma: boolean }` |
| GET | `/api/marketplace/usuarios/:id/nivel` | Detalles del nivel actual del usuario para tooltips |

### Decisiones explícitas del sistema

- **Sin calificación numérica (4.5 estrellas, etc.)** — las reseñas requieren acción del comprador y son fáciles de manipular. Los niveles basados en comportamiento son más justos.
- **Sin penalización por bajada** — si un vendedor baja de Confiable a Frecuente porque no respondió rápido este mes, no se le humilla. El sistema solo actualiza el badge en silencio.
- **Boost en búsqueda con cuidado** — el boost no debe ser tan agresivo como para crear círculo vicioso (vendedor nuevo → menos visibilidad → menos ventas → no sube de nivel). Considerar boost suave (1.1x-1.2x) o mini-boost para vendedores con menos de 30 días.

### Acoplamiento con ChatYA

El mensaje automático de confirmación requiere modificar `BurbujaMensaje.tsx` para detectar el tipo `'confirmacion_compra_marketplace'` y renderizar botones interactivos. Esto **acopla ChatYA con MarketPlace** — si esto es problema, considerar API de slots configurables en ChatYA. La opción razonable es acoplarlo y documentarlo como deuda técnica.

---

## 📚 Referencias

### Documentos relacionados

- `01-VISION_ESTRATEGICA.md` §3.1 — definición estratégica del MarketPlace
- `Sistema.md` §1.2 — Sistema de Modos (visibilidad por modo)
- `ChatYA.md` — integración del chat
- `Guardados.md` — tab "Artículos" activada
- `TOKENS_GLOBALES.md` Regla 13 — estética profesional B2B
- `TOKENS_COMPONENTES.md` §7 — Dark Gradient de Marca para botones

### Reportes de implementación (por sprint)

- Sprint 1 — Backend Base
- Sprint 2 — Feed Frontend
- Sprint 3 — Detalle del Artículo
- Sprint 4 — Wizard de Publicar + Moderación
- Sprint 5 — Perfil del Vendedor
- Sprint 6 — Buscador Potenciado
- Sprint 7 — Polish + Crons + Página Pública
- Sprint 8 — Q&A público (preguntas/respuestas en el detalle, notificaciones `marketplace_*_pregunta_*`) — **reemplazado en el Sprint de Comentarios (30 jun 2026)**
- Sprint 9 — Composer inline (sustituye al wizard `/marketplace/publicar`, replicación 1:1 del composer de Servicios)
- Sprint 9.1 — Layout `max-w-[920px]` con `min-w-0` en el detalle para respetar el contenedor sin overflow
- Sprint 9.2 — TTL "fin del día" con zona horaria (`sqlExpiracionFinDeDia` + `getZonaHorariaPorCiudad`) + fotos optimistas (blob previews + `Promise.allSettled`)
- Sprint 9.3 — Perfil rediseñado (avatar simplificado, BadgeCheck invertido, sin ciudad, KPIs `border-2 bg-slate-100 divide-x-2`) + botones contacto con logos de marca (WhatsApp SVG inline + ChatYA.webp + UserPlus con Tooltip). Mismo patrón compartido con `OferenteCard`/`SidebarSobreNegocio` de Servicios.
- **Comentarios (30 jun 2026)** — el Q&A público (preguntas/respuestas, badge "Pendiente", visibilidad restringida) se **reemplazó** por **comentarios públicos con hilos de 1 nivel**. Tabla `marketplace_comentarios` (DROP de `marketplace_preguntas`), endpoints `…/comentarios` (GET árbol · POST · PUT · DELETE), notificaciones `marketplace_nuevo_comentario` / `marketplace_respuesta_comentario`. Frontend: `SeccionComentarios.tsx` (sustituye a `SeccionPreguntas.tsx`) + `ComentarioItem.tsx` (genérico, etiqueta "Vendedor"); el feed (`CardArticuloFeed.tsx`) muestra `topComentarios` + `totalComentarios`. Helper backend compartido `services/comentarios/arbol.ts` y tipo frontend genérico `types/comentarios.ts` reutilizados por Servicios.

### Archivos del módulo

**Backend:**
- `apps/api/src/services/marketplace.service.ts` — CRUD principal
- `apps/api/src/services/marketplace/filtros.ts` — Capa 1 de moderación
- `apps/api/src/services/marketplace/buscador.ts` — Lógica de búsqueda
- `apps/api/src/services/marketplace/expiracion.ts` — TTL y reactivación
- `apps/api/src/services/marketplace/comentarios.ts` — Comentarios públicos (CRUD + árbol + notificaciones). Reemplaza a `marketplace/preguntas.ts` (eliminado)
- `apps/api/src/services/comentarios/arbol.ts` — helper compartido `armarArbolComentarios` (tipos `ComentarioNodo` / `ComentarioPlano`), reutilizado por MP y Servicios
- `apps/api/src/controllers/marketplace.controller.ts` — Handlers
- `apps/api/src/routes/marketplace.routes.ts` — Rutas
- `apps/api/src/validations/marketplace.schema.ts` — Schemas Zod
- `apps/api/src/cron/marketplace-expiracion.cron.ts` — Crons

**Frontend — Páginas:**
- `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx` — P1 Feed
- `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx` — P2 Detalle
- `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx` — P3 Perfil de Usuario
- `apps/web/src/components/marketplace/composer/ComposerSection.tsx` — P4 Composer inline (orquestador)
- `apps/web/src/components/marketplace/composer/ComposerMarketplace.tsx` — P4 Composer expandido
- `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx` — P6 Pública

**Frontend — Componentes del feed (cards estilo Facebook):**
- `apps/web/src/components/marketplace/CardArticuloFeed.tsx` — card grande del feed
- `apps/web/src/components/marketplace/CardArticuloReel.tsx` — card compacta del carrusel
- `apps/web/src/components/marketplace/ReelMarketplace.tsx` — carrusel auto-scroll
- `apps/web/src/components/marketplace/ChipsFiltrosFeed.tsx` — chips de filtro
- `apps/web/src/components/marketplace/ModalArticuloDetalle.tsx` — modal overlay del detalle
- `apps/web/src/components/marketplace/SeccionComentarios.tsx` — Comentarios públicos del detalle (reemplaza a `SeccionPreguntas.tsx`, eliminado)
- `apps/web/src/components/marketplace/ComentarioItem.tsx` — componente genérico reutilizable que renderiza un hilo (avatar/nombre clickeables, etiqueta de autor configurable vía prop `etiquetaAutor`, menú kebab Contactar/Editar/Eliminar, botón Responder). Reusado por Servicios
- `apps/web/src/components/marketplace/BotonComentarista.tsx` — enlace al perfil del autor (simplificado: se le quitó el menú de clic-derecho)

**Frontend — Componentes generales:**
- `apps/web/src/components/marketplace/CardArticulo.tsx` — card compacta (usada en Guardados, Resultados de búsqueda y grid del Perfil del usuario)
- `apps/web/src/components/marketplace/GaleriaArticulo.tsx`
- `apps/web/src/components/marketplace/CardVendedor.tsx`
- `apps/web/src/components/marketplace/MapaUbicacion.tsx`
- `apps/web/src/components/marketplace/BarraContacto.tsx`
- `apps/web/src/components/marketplace/OverlayBuscadorMarketplace.tsx`
- `apps/web/src/components/marketplace/ModalSugerenciaModeracion.tsx`

**Frontend — Hooks, guards, utils:**
- `apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx`
- `apps/web/src/hooks/queries/useMarketplace.ts` — hooks de mutación + perfil + KPIs + comentarios (`useComentariosArticulo`, `useCrearComentario`, `useEditarComentario`, `useEliminarComentario`)
- `apps/web/src/hooks/queries/useFeedInfinitoMarketplace.ts` — `useInfiniteQuery` del feed
- `apps/web/src/utils/busquedasRecientes.ts` — helper para localStorage por sección (compartido con Ofertas y Negocios)
- `apps/web/src/utils/normalizarTexto.ts` — helper accent-insensitive para filtros in-memory
- `apps/web/src/utils/moderacionMarketplace.ts` — validación inline cliente
- `apps/web/src/utils/optimizarImagen.ts` — redimensión + compresión WebP
- `apps/web/src/types/marketplace.ts` (`ComentarioMarketplace` es alias del tipo genérico `Comentario`)
- `apps/web/src/types/comentarios.ts` — interface genérica `Comentario` compartida (MP usa `ComentarioMarketplace`, Servicios `ComentarioServicio`, ambos alias)

**Eliminados al migrar a Comentarios (30 jun 2026):** `apps/api/src/services/marketplace/preguntas.ts`, `apps/web/src/components/marketplace/SeccionPreguntas.tsx`, los tipos `PreguntaMarketplace` / `PreguntasVisitante` / `PreguntasParaVendedor` / `MiPreguntaPendiente` / `PreguntaInlineFeed` y el helper `agruparPorComprador`.

---

**Última actualización:** 30 Junio 2026 (Comentarios públicos reemplazan al Q&A)
**Estado del módulo:** ✅ En producción (versión 1.7.0)
**Próximo paso:** evaluar Sistema de Niveles del Vendedor cuando haya data real de la beta (mínimo 2-3 meses de uso o 50+ ventas confirmadas)
