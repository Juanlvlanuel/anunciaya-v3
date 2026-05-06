# 🛒 MarketPlace — Compra-venta de Objetos entre Usuarios

> **Última actualización:** 06 Mayo 2026
> **Estado:** ✅ v1 + v1.1 (Sprints 9.1 y 9.2) completados y desplegados en producción. Pulido transversal en curso.
> **Versión:** 1.1.2
> **Pendientes opcionales:**
>  - v1.2 — Sistema de Niveles del Vendedor
>  - Pulido visual y ajustes UX detectados durante verificación: ver `docs/reportes/MarketPlace/Pendientes-Fase-C-Revision-Visual.md`

> **DATOS DEL SERVIDOR (React Query):**
> - Hooks principales: `apps/web/src/hooks/queries/useMarketplace.ts`
> - Sistema de guardados existente: `useArticulosMarketplaceGuardados` con `entity_type='articulo_marketplace'`
> - Sistema de votos existente: `useVotos` con `entity_type='usuario'` (botón "Seguir vendedor")

> **Identidad visual:** Verde teal — Header dark sticky estilo CardYA / Cupones / Guardados
> **Política de visibilidad:** Solo modo Personal. Modo Comercial bloqueado por completo.

---

## 📋 Índice

1. [¿Qué es MarketPlace?](#qué-es-marketplace)
2. [Filosofía y Tono del Módulo](#filosofía-y-tono-del-módulo)
3. [Alcance v1](#alcance-v1)
4. [Política de Visibilidad por Modo](#política-de-visibilidad-por-modo)
5. [Estados del Artículo](#estados-del-artículo)
6. [Moderación Autónoma](#moderación-autónoma)
7. [Identidad Visual](#identidad-visual)
8. [Pantallas](#pantallas)
   - [P1 — Feed](#p1--feed-de-marketplace)
   - [P2 — Detalle del Artículo](#p2--detalle-del-artículo)
   - [P3 — Perfil del Vendedor](#p3--perfil-del-vendedor)
   - [P4 — Wizard de Publicar / Editar](#p4--wizard-de-publicar--editar)
   - [P5 — Buscador Potenciado](#p5--buscador-potenciado)
   - [P6 — Página Pública Compartible](#p6--página-pública-compartible)
9. [Integraciones con Otros Módulos](#integraciones-con-otros-módulos)
10. [Backend — Endpoints en Producción](#backend--endpoints-en-producción)
11. [Base de Datos — Tablas en Producción](#base-de-datos--tablas-en-producción)
12. [Cron Jobs en Producción](#cron-jobs-en-producción)
13. [Decisiones Rechazadas](#decisiones-rechazadas)
14. [v1.2 Pendiente — Sistema de Niveles del Vendedor](#v12-pendiente--sistema-de-niveles-del-vendedor)

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

2. **División estricta entre MarketPlace y Servicios.** MarketPlace es **solo objetos físicos tangibles**. Cualquier publicación que ofrezca tiempo, mano de obra, conocimiento o disponibilidad es Servicio y va en `/servicios`. La línea es clara y se hace cumplir tanto en el wizard como en moderación.

3. **Cada publicación cumple un mínimo de información útil.** Sin foto, sin título descriptivo o sin precio, no se publica. Esto se valida en el wizard y elimina el ruido típico de "vendo esto" sin contexto.

4. **No es un foro ni una red social.** No hay comentarios públicos, no hay "me gusta" expuestos, no hay timeline social. Solo: ver publicaciones, contactar al vendedor, guardar para después. Punto.

5. **Optimizado para una sola intención: vender-comprar.** Cada elemento de la UI sirve a esa intención. Lo que no sirve, no está. Por eso descartamos categorías como navegación, karma sin datos reales, ofertas formales, trueques con toggle, etc.

### Lo que NO permitimos en MarketPlace

Estas reglas se aplican en moderación y en el checklist del paso 3 del wizard ("No vendo artículos prohibidos por las reglas"):

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

## 🎯 Alcance v1

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

- Publicar artículo en wizard de 3 pasos (Fotos+Título → Precio+Detalles → Ubicación+Confirmación)
- Editar publicación existente (reusa el wizard en modo edición)
- Pausar / activar / marcar como vendida / eliminar publicación
- Reactivar publicaciones pausadas (extiende +30 días)
- Ver métricas básicas por publicación: vistas, mensajes, guardados
- Recibir notificaciones automáticas de próxima expiración (3 días antes) y expiración

### Tabla resumen v1

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

Esta capa corre en el wizard (frontend + backend) y es la **única defensa real** del sistema. Si pasa esta capa, la publicación queda en el feed sin más controles.

**Implementación:** `apps/api/src/services/marketplace/filtros.ts`

#### 1.1 — Mínimos obligatorios (en el wizard P4)

- Mínimo 1 foto, máximo 8
- Título entre 10 y 80 caracteres
- Precio entero positivo, máximo $999,999
- Condición seleccionada (1 de 4: Nuevo / Seminuevo / Usado / Para reparar)
- Descripción mínimo 50 caracteres, máximo 1000
- Ubicación obligatoria (GPS del usuario o coordenada de su ciudad)
- Checklist final de 3 confirmaciones (solo en modo crear, no en edición)

#### 1.2 — Filtro de palabras prohibidas (RECHAZO DURO)

Si el título o la descripción contiene cualquier palabra de la lista negra, el wizard **NO permite publicar** y muestra un mensaje claro al usuario explicando por qué.

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

Cuando el texto sugiere un servicio en lugar de un objeto físico, el wizard muestra un modal con dos opciones:

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

> **Nota:** se omitió el botón "Llevar a Servicios" porque la sección `/servicios` aún no existe. Se agregará cuando se implemente.

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

Ambas notificaciones son **idempotentes** (verifica `WHERE referencia_id+tipo` antes de insertar). Si el cron corre 2 veces, no spamea.

### Lo que NO se implementa (decisión consciente)

- ❌ **Sistema de reportes de usuarios** — sin equipo para revisarlos, los reportes serían un canal sin destinatario. Falsa promesa al usuario.
- ❌ **Auto-pausa por umbral de reportes** — depende de los reportes mismos.
- ❌ **Bloqueo automático de usuarios reincidentes** — sin reportes, no hay forma justa de medir reincidencia.
- ❌ **Panel admin de moderación** — sin tiempo para atenderlo, sería un backlog que crece sin parar.
- ❌ **Aprobación manual antes de publicar** — no escala con un solo operador.
- ❌ **Detección con IA / análisis de imágenes** — costo y complejidad desproporcionados al alcance v1.

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

Botón con **logo oficial de ChatYA** (`/ChatYA.webp`) sin texto. Fondo Dark Gradient de Marca (`bg-linear-to-br from-slate-800 to-slate-950`). Convive con WhatsApp en barra de contacto y perfil del vendedor:

- En **P2 Detalle**: WhatsApp + ChatYA lado a lado (ambas variantes mobile/desktop).
- En **P3 Perfil del vendedor**: solo ChatYA + Seguir vendedor (WhatsApp queda como pendiente para próximo sprint, ver Pendientes-Fase-C-Revision-Visual §6).
- El click llama `useChatYAStore.abrirChatTemporal({...})` **+ `useUiStore.abrirChatYA()`** — ambas son obligatorias; si solo se llama `abrirChatTemporal` el panel de ChatYA no se abre y el botón parece roto.

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

### Decisiones visuales específicas tomadas durante implementación

- **Perfil del vendedor sin portada decorativa** — un banner teal full-width o imagen genérica se ve como publicidad. Solo avatar grande centrado en bloque blanco.
- **Sin badge "✓ Verificado"** — todos los usuarios tienen correo verificado (es requisito de login), por lo que el badge no diferencia a nadie. La diferenciación real vendrá con el sistema de niveles (v1.2).
- **Buscador físico**:
  - **Desktop:** input vive en el Navbar global (siempre visible). Al enfocar dispara `useSearchStore.abrirBuscador()` y se muestra el overlay.
  - **Móvil:** patrón inmersivo (sin Navbar global). El input vive **dentro del header del MarketPlace** y se expande al pulsar la lupa, igual que en Negocios. El input móvil escribe al mismo `useSearchStore.query` para que el overlay reuse toda su lógica (sugerencias, populares, recientes).
- **Patrón inmersivo móvil** — `/marketplace`, `/marketplace/articulo/:id`, `/marketplace/publicar`, `/marketplace/vendedor/:id`, `/marketplace/buscar`, `/negocios/:id` y `/ofertas` ocultan el Navbar global (banda azul "AnunciaYA Tu Comunidad Local") en móvil. La lógica vive en `MainLayout.tsx → esPaginaConHeaderPropio`. En desktop el Navbar siempre se mantiene (mismo patrón que CardYA / Mis Guardados).
- **Badge `RECIÉN`** en CardArticulo — antes decía `NUEVO` pero generaba confusión con la condición `nuevo` del artículo. Cambiado a `RECIÉN` el 2026-05-05. Indica publicación con `<24h` desde `created_at`.


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
- **Tap en "+ Publicar artículo"** → navega a `/marketplace/publicar` (P4 modo creación)
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
  - Móvil: swipe horizontal con `scroll-snap-x mandatory` + indicador `1/8` dinámico
  - Desktop: thumbnails verticales 88px + imagen principal grande
  - Tap en imagen → abre `ModalImagenes` (lightbox fullscreen reusado)

- **Card vendedor:** `apps/web/src/components/marketplace/CardVendedor.tsx`
  - Avatar circular 48px (con fallback a iniciales)
  - Nombre + ciudad + link "Ver perfil →" (navega a P3)

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
  - Cada bloque (Descripción, Card vendedor, Mapa, Q&A) vive dentro de su propio card `rounded-xl border border-slate-200 bg-white shadow-sm p-4` sobre el fondo gradient nativo de la app.
  - El contenedor raíz de la página (`PaginaArticuloMarketplace`) usa `bg-transparent` (no `bg-white`) para heredar el gradient del MainLayout.
  - El `MapaUbicacion` crea su propio stacking context (`relative z-0 isolate`) para que los z-index 400+ de Leaflet no escapen y tapen el BottomNav o la BarraContacto fija.
  - `pb-[150px]` en el contenedor para reservar espacio bajo el contenido y que la BarraContacto fija + BottomNav no oculten la última sección.

#### Comportamiento

- Al montar la página: incrementa `total_vistas` (solo si NO eres el dueño + dedupe por `sessionStorage`)
- **Tap en compartir (↑)** → copia link `/p/articulo-marketplace/:id` al portapapeles
- **Tap en ⋯** → menú con opción "Bloquear vendedor" (placeholder hasta v1.1+)
- **Tap en "Ver perfil →"** → navega a P3
- **Estado pausada (público):** overlay informativo "Esta publicación está pausada por el vendedor"
- **Estado vendida (público):** overlay informativo "Este artículo ya fue vendido"

#### Privacidad de ubicación

- El backend devuelve coordenadas **aleatorizadas** dentro de un círculo de 500m alrededor de la ubicación real (calculadas al guardar, no al consultar — coordenada estable entre sesiones)
- La columna `ubicacion` exacta NUNCA se serializa al frontend
- Distribución uniforme en disco usando `r = R · √random()` con compensación por latitud (test unitario verifica que 100 puntos generados están todos dentro del círculo de 500m)

---

### P3 — Perfil del Vendedor

**Ruta:** `/marketplace/vendedor/:usuarioId`
**Archivo:** `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx`

#### Estructura (móvil + desktop)

- Header transparente flotante (← atrás, ⋯ menú con "Bloquear usuario" placeholder)
- **Sin portada decorativa** (decisión consciente — banner teal o imagen genérica se ven como publicidad)
- Avatar circular grande (96px) centrado en bloque blanco limpio
- Nombre completo + ciudad + "Miembro desde [Mes Año]"
- 3 KPIs en fila inline (sin pastel, sin emojis, sin saltos tipográficos):
  - **Publicaciones activas** — `COUNT(*) WHERE estado='activa'`
  - **Vendidos** — `COUNT(*) WHERE estado='vendida'`
  - **Tiempo de respuesta** — promedio de minutos entre primer mensaje del comprador y primera respuesta del vendedor en últimos 30 días, **sin filtro de `contexto_tipo`** (es característica de la persona, no del módulo)
- Botones de contacto (ocultos si visitas tu propio perfil):
  - **WhatsApp** (gradiente verde brand `from-[#22C55E] to-[#15803D]`) — solo aparece si el vendedor tiene teléfono registrado. Mensaje precargado: `"Hola {nombre}, vi tu perfil en AnunciaYA"`. El backend `getVendedorMarketplace` devuelve `telefono` en el perfil; el tipo `PerfilVendedorMarketplace` incluye `telefono: string | null`.
  - **ChatYA** (Dark Gradient negro) — botón con logo oficial `/ChatYA.webp` sin texto. Llama `useChatYAStore.abrirChatTemporal({...})` + `useUiStore.abrirChatYA()` con `contextoTipo='vendedor_marketplace'`.
  - **Seguir vendedor** (blanco con borde) → `useVotos` con `entity_type='usuario'`, `tipo_accion='follow'`
- Tabs: **Publicaciones (X)** | **Vendidos (X)** con subrayado teal en activa
- Grid de cards estilo B (reusa `CardArticulo`)
- En tab "Vendidos": cada card envuelta en wrapper con overlay slate translúcido + texto "VENDIDO"

#### Datos del servidor

- `useVendedorMarketplace(usuarioId)` — perfil + KPIs (staleTime 2 min)
- `useVendedorPublicaciones(usuarioId, estado)` — lista paginada por estado
- Si el vendedor bloqueó al usuario actual → 404 sin revelar el motivo
- Si visitas tu propio perfil → botones Mensaje/Seguir ocultos

#### Notas sobre "Seguir vendedor" en v1

El botón funciona y registra el voto correctamente, pero **no aparece en ningún lado del UI** más allá del estado del propio botón. La lista de seguidos se materializará cuando se cree la tab "Vendedores" en Mis Guardados (v1.1+).

---

### P4 — Wizard de Publicar / Editar

**Rutas:**
- Crear: `/marketplace/publicar`
- Editar: `/marketplace/publicar/:articuloId`

**Archivo:** `apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx`

#### Modos del Wizard

| Modo | Detección | Título | Botón final |
|------|-----------|--------|-------------|
| **Crear** | sin `articuloId` en params | "Nueva publicación" | "Publicar ahora" |
| **Editar** | con `articuloId` en params | "Editar publicación" | "Guardar cambios" |

En modo edición:
- Datos precargados de la publicación existente
- El paso 3 (ubicación) es modificable pero el checklist NO se vuelve a mostrar
- `expira_at` NO se modifica (solo el endpoint "Reactivar" lo extiende)

#### Estructura general (móvil)

```
┌──────────────────────────────────────┐
│ [←]    Paso X de 3                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  ← barra progreso (3 segmentos)
│   [contenido del paso actual]        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐  ← barra fija inferior
│ [← Anterior]    [Continuar →]        │
└──────────────────────────────────────┘
```

#### Paso 1 — Fotos y Título

- Grid de 8 slots (tap → `<input type="file">`). Upload directo a R2 con `useSubirFotoMarketplace` (presigned URL, prefijo `marketplace/`)
- Primera foto se marca como "Portada" automáticamente (badge teal)
- Cada foto con botón X
- Input "Título" (10-80 caracteres, contador visible)
- Drag & drop reorden de fotos: pendiente para v1.1

#### Paso 2 — Precio y Detalles

- Input precio grande con `$` y `MXN`
- 4 chips de condición (Nuevo / Seminuevo / Usado / Para reparar) — selección única
- Toggle "Acepta ofertas" (default `true`)
- Textarea descripción (50-1000 caracteres, contador)
- Si precio < $10 → modal de advertencia antes de avanzar

#### Paso 3 — Ubicación y Confirmación

- Mapa Leaflet no interactivo con `<Circle radius={500}>` alrededor de GPS o coordenada de ciudad
- Texto: "Mostraremos un círculo de 500m, no tu dirección exacta."
- Si no hay GPS ni coordenada de ciudad → banner amarillo pidiendo activar ubicación (no permite avanzar)
- "Cambiar ubicación" omitido en v1 (mapa interactivo con marker arrastrable se evalúa para v1.1)
- Resumen compacto: foto portada + título + precio + condición
- Checklist obligatorio (3 checkboxes, solo en modo crear):
  - "No vendo artículos prohibidos por las reglas"
  - "Las fotos son del artículo real, sin retoque"
  - "Acepto que mi publicación se mostrará 30 días"
- Botón "Publicar ahora" / "Guardar cambios" — deshabilitado hasta cumplir todo

#### Vista previa en vivo (solo desktop)

- Layout 2 columnas (`lg:grid-cols-[60%_40%]`)
- Columna derecha sticky con instancia de `<CardArticulo>` actualizada en tiempo real
- Texto debajo: "Tip: Las publicaciones con buenas fotos y precio competitivo se venden en promedio 3 días más rápido."
- En móvil: NO hay vista previa (no cabe)

#### Manejo de moderación

- **Validación inline (cliente)** — el wizard no espera al submit final: `apps/web/src/utils/moderacionMarketplace.ts` detecta palabras prohibidas mientras el usuario escribe en `título` (paso 1) y `descripción` (paso 2). Si hay match, muestra el mensaje de la categoría rojo bajo el input y deshabilita el botón "Continuar". Cuando el texto se corrige, el botón se vuelve a habilitar.
- **Robustez contra evasión** (frontend + backend, lógica equivalente):
  - **Leetspeak** — sustituciones aplicadas en `normalizar()`: `0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `7→t`, `8→b`, `9→g`, `@→a`, `$→s`, `€→e`, `!→i`, `|→i`. Así "s0rt30" o "r1f@" matchean "sorteo" / "rifa".
  - **Separadores entre letras** — `construirRegex` permite cualquier carácter no-alfanumérico entre las letras del término (`r.i.f.a`, `r i f a`, `r-i-f-a`, `r_i_f_a` matchean `rifa`).
  - **Boundary robusto** — lookarounds `(?<![a-z0-9])` y `(?![a-z0-9])` en lugar de `\b`, para evitar que "deriva" matchee "rifa" o que "soporte" matchee "sorte".
  - **Variantes truncadas** — la lista incluye truncamientos comunes (`sorte`, `sortes`, `rife`, `rifen`, `cachit`, `subastar`, `rematando`, etc.) por si el usuario corta la palabra para evadir.
- **Rechazo duro (HTTP 422)** del backend → modal inline con palabra detectada visible. No permite continuar.
- **Sugerencia suave (HTTP 200 con `warning`)** → `ModalSugerenciaModeracion.tsx` con 2 botones:
  - "Editar mi publicación" → cierra modal, vuelve al paso correspondiente
  - "Continuar de todos modos" → reenvía con `confirmadoPorUsuario: true`
- Botón "Llevar a Servicios" omitido hasta que la sección `/servicios` exista

#### Auto-save (borrador local por usuario)

- **Storage key:** `wizard_marketplace_${usuarioId}_${articuloId ?? 'nuevo'}` — incluye `usuarioId` para que cada cuenta tenga su propio borrador en el mismo navegador. Si cambias de cuenta NO ves el borrador del usuario anterior.
- **Mecánica:** `sessionStorage` debounced 500ms.
- **Modo crear vs modo editar** tienen keys separadas (no se contaminan).
- **Salida del wizard:**
  - Si el usuario no escribió nada (sin fotos, título, descripción, precio) → sale directo a `/marketplace` sin preguntar.
  - Si tiene cambios → modal **"¿Salir sin publicar?"** (estilo `ModalAdaptativo` con header gradiente teal y patrón TC-6A) con 3 opciones en una fila:
    - **Seguir editando** (icono `Pencil`) — cierra el modal.
    - **Descartar** (icono `XCircle`) — limpia `sessionStorage` y elimina de R2 las fotos subidas en la sesión actual (las preexistentes en modo edición se respetan).
    - **Guardar borrador** (icono `BookmarkPlus`) — fuerza `sessionStorage.setItem` con el state actual y navega a `/marketplace`.

#### Subida de fotos a R2 (optimizada)

- **Optimización cliente-side antes de subir** — el helper `apps/web/src/utils/optimizarImagen.ts` (compartido con `useR2Upload`) redimensiona a `maxWidth: 1920` y comprime a WebP `quality: 0.85`. Reduce 70-90% el peso de fotos de cámara móvil (5-10MB → ~500KB). Llamado por `useSubirFotoMarketplace` antes del PUT a R2.
- **Limpieza al quitar foto** — el wizard mantiene un `useRef<Set<string>>` con las URLs subidas en la sesión actual. Al quitar una foto, si la URL está en ese set, dispara `DELETE /api/r2/imagen` (fire-and-forget). Las fotos preexistentes (modo edición) NO se borran al quitarlas — el reference count del helper `eliminarImagenSiHuerfana` del backend se encarga al guardar el artículo.

---

### P5 — Buscador Potenciado

**Implementación:** overlay anclado al store global `useSearchStore`. El overlay NO tiene input propio: el input físico vive en el Navbar global (desktop) o inline dentro del header del MarketPlace (móvil, patrón inmersivo). Ambos escriben al mismo `useSearchStore.query` para que el overlay reuse toda su lógica.

**Componente overlay:** `apps/web/src/components/marketplace/OverlayBuscadorMarketplace.tsx`
**Página de resultados:** `apps/web/src/pages/private/marketplace/PaginaResultadosMarketplace.tsx`

#### Comportamiento del overlay

- Suscribe a `useSearchStore.buscadorAbierto` y `query`
- Aparece cuando `(buscadorAbierto || query.length >= 1) && pathname.startsWith('/marketplace')`
- **Posicionamiento:** `fixed inset-0` con `mt-20 lg:mt-24` para que el panel quede despegado del Navbar/header (no pegado al borde superior). Esquinas `rounded-2xl`, `max-h-[75vh]` con scroll interno.
- **Desktop:** `onFocus` del input del Navbar emite `abrirBuscador()` solo en `/marketplace*`. `onBlur` con delay cierra solo si query vacío (permite click dentro del overlay).
- **Móvil:** la lupa del header del MP expande el input inline. NO llama `abrirBuscador()` directo — el overlay aparece automáticamente cuando `query.length >= 1`. Al borrar todo el texto el overlay desaparece pero el input inline sigue visible.
- Todos los inputs llevan `autoComplete="off"` para evitar el dropdown nativo del navegador (Chrome) que muestra valores de otras secciones.

#### Estado vacío (al abrir)

- Sección "Búsquedas recientes" con chips eliminables (X) — guardadas en localStorage `marketplace_busquedas_recientes` (FIFO máx 10)
- Sección "Más buscado en [ciudad]" con chips populares (top 6 de últimos 7 días)
- Botón "Borrar todo" si hay recientes

#### Mientras escribes (debounce 300ms)

- **Cards con preview** en lugar de lista plana de títulos. Cada card muestra:
  - Foto portada (56×56, `object-cover`) — primer foto del array `fotos[foto_portada_index]`
  - Título completo (truncado si excede)
  - Precio bold teal-700 con formato `$X,XXX.XX` (`toLocaleString('es-MX')`)
  - Condición (junto al precio, neutro slate-500: "Seminuevo", "Nuevo", etc.)
  - Ciudad
  - Ícono `ArrowUpRight` a la derecha
- **Click en card** → navega directo a `/marketplace/articulo/:id` (NO va al listado de resultados, salta directo al detalle)
- **Botón "Ver todos los resultados de '[query]'"** al final del listado → navega a `/marketplace/buscar?q=...` (mantiene el flujo del listado completo cuando el comprador quiere ver más opciones)
- Fuente: top 5 artículos completos (FTS `to_tsvector('spanish', titulo+descripcion) @@ plainto_tsquery(...)`). Endpoint `GET /marketplace/buscar/sugerencias` devuelve `{ id, titulo, precio, condicion, fotoPortada, ciudad }[]` (antes solo títulos).
- Solo dispara si `query.length >= 2`

#### Vista de resultados (después de Enter o tap en sugerencia)

- Header dark sticky: ← atrás, `"[query]" · X resultados`, dropdown ordenar
- Chips de filtros activos arriba del grid (removibles individuales o "Limpiar todos")
- Grid de cards estilo B (reusa `CardArticulo`) con scroll infinito (`IntersectionObserver`)
- Estado vacío: "No encontramos artículos para '[query]'. Probá quitar algunos filtros." + botón "Limpiar filtros"

#### Filtros (`FiltrosBuscador.tsx`)

Bottom sheet en móvil, sidebar fija en desktop:

| Filtro | Tipo | Valores |
|--------|------|---------|
| Distancia | Chips única | 1km · 3km · 5km · 10km · 25km · 50km (oculto si no hay GPS) |
| Precio | Slider con presets | <$500, $500-1k, $1k-5k, $5k+ y min/max manual |
| Condición | Chips múltiples | Nuevo, Seminuevo, Usado, Para reparar |

> **Filtro "Acepta ofertas" omitido en v1** — el default es `true`, por lo que el filtro siempre devolvería casi todo. Se evaluará si en v1.1 los vendedores empiezan a desactivar el toggle.

#### Ordenar (dropdown)

- **Más recientes** (default)
- **Más cercanos** (requiere GPS)
- **Precio menor**
- **Precio mayor**

#### URL state

- `useFiltrosBuscadorUrl` — sincroniza filtros ↔ `URLSearchParams`
- URL compartible y bookmarkeable: `/marketplace/buscar?q=bici&precioMax=5000&condicion=usado`

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

### ChatYA

- Contacto comprador → vendedor desde `useChatYAStore.abrirChatTemporal()` con `contextoTipo='marketplace'` y `contextoReferenciaId={articuloId}` (campo genérico).
- También usa `contextoTipo='vendedor_marketplace'` para mensajes desde el perfil sin artículo específico.
- La columna específica `chat_conversaciones.articulo_marketplace_id` existe en BD desde Sprint 1 pero no se llena vía el endpoint actual de `abrirChatTemporal`. Quedará para una iteración futura cuando se necesite.

### Mis Guardados

- Los artículos de MarketPlace se guardan con `entity_type='articulo_marketplace'` en la tabla `guardados`.
- Tab "Artículos" en `PaginaGuardados.tsx` activa con render de `<CardArticulo>`.
- Hook nuevo paralelo `useArticulosMarketplaceGuardados` (no se modificó `useMisGuardados` polimórfico para no romper Ofertas/Negocios).

### Mis Publicaciones (`/mis-publicaciones`)

- **Página global del modo Personal**, fuera del módulo MarketPlace.
- Su diseño definitivo se aterriza en otro documento (`MisPublicaciones.md`) cuando se decida cómo encajan los Servicios.
- MarketPlace expone `GET /api/marketplace/mis-articulos` para que esa página lo consuma cuando se construya.

### ModoPersonalEstrictoGuard

- Guard separado de `ModoGuard` existente. La política de MarketPlace es bloqueo total (sin auto-cambio), distinta de CardYA/ScanYA/Mis Publicaciones que sí auto-cambian.

### Sistema Universal de Compartir

- Botón "Compartir" en P2 usa `DropdownCompartir` reusado (Web Share API + copiar al portapapeles).
- URL compartida: `/p/articulo-marketplace/:id` (página pública P6 con OG tags).

### PanelNotificaciones (campanita global)

Eventos del MarketPlace que disparan notificaciones (ya implementados):
- **`marketplace_proxima_expirar`** — 3 días antes de expirar
- **`marketplace_expirada`** — al auto-pausar por TTL
- **`marketplace_nuevo_mensaje`** — reservado (lo dispara ChatYA cuando aplica)
- **`marketplace_nueva_pregunta`** — al vendedor cuando un comprador pregunta (Sprint 9.2)
- **`marketplace_pregunta_respondida`** — al comprador cuando el vendedor responde (Sprint 9.2)

**Click en notificación → navega al artículo:** `PanelNotificaciones.tsx → obtenerRutaDestino()` mapea cualquier notificación con `referenciaTipo === 'marketplace'` a `/marketplace/articulo/${referenciaId}`. Cubre los 5 tipos `marketplace_*` arriba — la `referenciaId` siempre es el UUID del artículo.

### Onboarding y Auth

- MarketPlace requiere usuario autenticado en modo Personal.
- Página pública (`/p/articulo-marketplace/:id`) es visible sin auth pero el botón de mensaje muestra `ModalAuthRequerido`.

### Sistema de Votos (`useVotos`)

- Botón "Seguir vendedor" en P3 reusa `useVotos` con `entity_type='usuario'`, `tipo_accion='follow'`.
- Migración del Sprint 5 agregó `'usuario'` al check `votos_entity_type_check`.

---

## 🔌 Backend — Endpoints en Producción

### Públicos (con `verificarTokenOpcional`)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/marketplace/feed` | Feed inicial (recientes + cercanos) por ciudad y GPS |
| GET | `/api/marketplace/feed/trending` | "Lo más visto hoy" — top por actividad 24h (Sprint 9.1) |
| GET | `/api/marketplace/articulos/:id` | Detalle público de un artículo |
| POST | `/api/marketplace/articulos/:id/vista` | Registrar vista (incrementa contador) |
| POST | `/api/marketplace/articulos/:id/heartbeat` | Heartbeat "viendo ahora" (Redis sorted set TTL 2min, Sprint 9.1) |
| GET | `/api/marketplace/articulos/:id/preguntas` | Q&A público. Visitante autenticado: `{ data: respondidas[], miPreguntaPendiente }`. Dueño: `{ data: { pendientes, respondidas } }`. |
| GET | `/api/marketplace/buscar/sugerencias` | Sugerencias en vivo con preview (top 5 con `id, titulo, precio, condicion, fotoPortada, ciudad`) |
| GET | `/api/marketplace/buscar/populares` | Top búsquedas populares por ciudad (cache Redis 1h) |
| GET | `/api/marketplace/buscar` | Resultados de búsqueda con filtros |
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
| POST | `/api/marketplace/articulos/:id/preguntas` | Comprador hace pregunta pública (Sprint 9.2) |
| POST | `/api/marketplace/preguntas/:id/responder` | Vendedor responde una pregunta pendiente (Sprint 9.2) |
| POST | `/api/marketplace/preguntas/:id/derivar-a-chat` | Vendedor abre ChatYA con el comprador. **NO** elimina la pregunta pública (cambio post-Sprint 9.2: el flag de soft delete original se quitó porque confundía al usuario al perder la pregunta sin avisar) |
| DELETE | `/api/marketplace/preguntas/:id` | Vendedor elimina pregunta de su artículo (soft delete) |
| DELETE | `/api/marketplace/preguntas/:id/mia` | Comprador retira su pregunta — solo si `respondida_at IS NULL` (409 si ya hay respuesta) |

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

Todos aceptan `confirmadoPorUsuario?: boolean` para flujo de moderación con sugerencia suave.

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
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,  -- siempre NULL en v1 por privacidad
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_busquedas_ciudad_fecha ON marketplace_busquedas_log(ciudad, created_at DESC);
```

### Cambios a tablas existentes

**`chat_conversaciones`** — agregada en Sprint 1:
- Columna `articulo_marketplace_id UUID REFERENCES articulos_marketplace(id) ON DELETE SET NULL`
- Check `contexto_tipo` ampliado con `'vendedor_marketplace'`
- Índice parcial `idx_chat_conv_articulo_marketplace`

**`guardados`** — agregada en Sprint 1:
- Check `entity_type` ampliado con `'articulo_marketplace'`

**`votos`** — agregada en Sprint 5:
- Check `entity_type` ampliado con `'usuario'`

**`notificaciones`** — agregada en Sprint 1, ampliada en Sprint 9.2:
- Check `tipo` ampliado con `'marketplace_nuevo_mensaje'`, `'marketplace_proxima_expirar'`, `'marketplace_expirada'`, `'marketplace_nueva_pregunta'`, `'marketplace_pregunta_respondida'`
- **Columna `tipo`:** ampliada a `VARCHAR(50)` (antes `VARCHAR(30)`). El tipo `marketplace_pregunta_respondida` mide 31 caracteres y excedía el límite, lo que hacía que el INSERT fallara silenciosamente por el `.catch(() => {})` del service y la notificación al comprador nunca se guardaba. Migración: `docs/migraciones/2026-05-05-notificaciones-tipo-varchar50.sql`.

**`marketplace_preguntas`** — agregada en Sprint 9.2:
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

**Sistema de Q&A público:** una pregunta por usuario por artículo (UNIQUE). Estado inferido: `respuesta IS NULL` → pendiente, `IS NOT NULL` → respondida, `deleted_at IS NOT NULL` → eliminada. Visibilidad pública solo si `respondida_at IS NOT NULL` (los visitantes solo ven respondidas; el dueño ve pendientes + respondidas).

**Vista visitante autenticado — su propia pregunta pendiente:** además del array de respondidas, el endpoint `GET /articulos/:id/preguntas` devuelve `miPreguntaPendiente: { id, pregunta, createdAt } | null` cuando el caller no es el dueño y tiene una pregunta sin responder en ese artículo. El frontend (`SeccionPreguntas.tsx`) renderiza un bloque amber **"Tu pregunta está pendiente"** con la pregunta + tiempo relativo + botón "Retirar pregunta" (usa `DELETE /preguntas/:id/mia`). El botón "Hacer una pregunta" se oculta automáticamente cuando ya hay pendiente, evitando que el usuario reciba un 409 del UNIQUE constraint.

**Botón "Mensaje privado" (vista dueño):** anteriormente etiquetado como "Por chat", se renombró para reflejar mejor su función. Mantiene el mismo handler (`derivarPreguntaAChat`) que abre ChatYA con datos del comprador, **pero ya no hace soft delete de la pregunta** — la pregunta pública se conserva visible. Tiene `title` con tooltip explicativo: *"Abre un chat privado con el comprador. La pregunta sigue visible públicamente."*

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
- **Solución:** se potencia el buscador (sugerencias, populares, recientes) y se eliminan las categorías. El artículo NO requiere categoría al publicar.

### Integración con CardYA

- **Qué era:** badge "CardYA habilitado" en cards y toggle "Cobrar con CardYA" al publicar como método de pago seguro.
- **Por qué se descarta:** CardYA es para puntos de lealtad en negocios verificados con suscripción comercial. NO aplica a compra-venta entre personas.

### "Buen precio" automático y "Buen título" feedback

- **Qué era:** sugerencias inteligentes al publicar comparando con artículos similares en la ciudad.
- **Por qué se descarta para v1:** requiere histórico de ventas y data suficiente. En beta no habrá datos para que la sugerencia sea confiable.
- **Cuándo retomar:** cuando haya 200+ artículos publicados y ventas confirmadas en el sistema.

### Borradores de publicaciones

- **Qué era:** guardar una publicación incompleta para terminar después.
- **Por qué se descarta para v1:** suma complejidad de UX y backend (estado adicional, lista de borradores, recuperación). Si el usuario abandona el wizard a medio publicar, vuelve a empezar. Hay auto-save en sessionStorage que cubre el caso de recarga accidental.

### "Acepta trueque" como toggle al publicar

- **Qué era:** marcar la publicación como dispuesta a intercambiar por otro artículo.
- **Por qué se descarta para v1:** caso de uso de nicho. Si el comprador quiere proponer trueque, lo hace por ChatYA.

### "Hacer oferta" como botón aparte en el detalle

- **Qué era:** botón formal "Hacer oferta $XXX" separado del botón de mensaje, con flujo de ofertas y contraofertas dentro de la app.
- **Por qué se descarta para v1:** el botón "Enviar mensaje" ya cubre la negociación. Diferenciar "ofertas formales" agrega complejidad de backend sin valor claro mientras la transacción siga siendo offline.

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
- **Por qué se descarta para v1:** como `aceptaOfertas` default es `true`, el filtro siempre devolvería casi todo. Si en v1.1 los vendedores empiezan a desactivar el toggle, se agrega.

### Buscador local en MarketPlace

- **Qué era:** input de búsqueda dentro del header dark de MarketPlace.
- **Por qué se descarta:** la app ya tiene un buscador global en el Navbar (`useSearchStore`) que se adapta a la sección activa con `placeholderSeccion('marketplace')`. Tener dos inputs confunde al usuario y duplica código.
- **Solución:** el overlay del buscador en MarketPlace NO tiene input propio — solo aporta contenido (sugerencias, populares, recientes) anclado al store global.

### "Cambiar ubicación" con input lat/lng manual

- **Qué era:** botón en el wizard de publicar para cambiar la ubicación del artículo introduciendo coordenadas manualmente.
- **Por qué se descarta:** ningún usuario sabe sus coordenadas. En v1 se usa solo GPS del usuario o coordenada de la ciudad activa por defecto. Si en v1.1 los usuarios lo piden, se agrega un mapa interactivo con marker arrastrable.

### Botón "Llevar a Servicios" en modal de sugerencia

- **Qué era:** cuando el wizard detecta un servicio disfrazado, ofrecer botón para precargar los datos en `/servicios/publicar`.
- **Por qué se descarta:** la sección `/servicios` aún no existe. El modal solo ofrece "Editar mi publicación" y "Continuar de todos modos". Se reactivará cuando exista la sección.

### Portada decorativa en perfil del vendedor

- **Qué era:** banner teal sólido o imagen genérica en la parte superior del perfil del vendedor.
- **Por qué se descarta:** se ve como banner publicitario raro. Solo avatar grande centrado en bloque blanco limpio. Si los usuarios suben portadas reales en v1.1, se agrega.

### Badge "✓ Verificado" en perfil

- **Qué era:** badge azul al lado del nombre del vendedor si tiene correo verificado.
- **Por qué se descarta:** todos los usuarios tienen correo verificado (es requisito de login), por lo que el badge no diferencia a nadie. La diferenciación real vendrá con el sistema de niveles del vendedor (v1.1).

### Filtrar tiempo de respuesta por `contexto_tipo`

- **Qué era:** calcular el KPI "tiempo de respuesta promedio" del vendedor solo con conversaciones de MarketPlace.
- **Por qué se descarta:** el tiempo de respuesta es característica de la persona, no del módulo. Filtrar por contexto haría que en beta (con pocos chats MarketPlace) el KPI siempre muestre `—` para vendedores que sí responden rápido en otros contextos.
- **Solución:** se usan TODOS los chats del vendedor (cross-módulo) en últimos 30 días.

### WhatsApp directo en página pública

- **Qué era:** botón WhatsApp visible sin login en la página `/p/articulo-marketplace/:id`.
- **Por qué se descarta:** un visitante anónimo podría obtener el número del vendedor con un scraper. Por privacidad, en la página pública solo aparece "Enviar mensaje" → `ModalAuthRequerido`. WhatsApp solo aparece después de login.

### Persistir `usuario_id` en `marketplace_busquedas_log`

- **Qué era:** guardar quién hizo cada búsqueda para "mis búsquedas frecuentes" personalizadas.
- **Por qué se descarta para v1:** principio de privacidad. Solo se necesita `ciudad + termino + created_at` para calcular populares. Si en v2 se quiere personalizar, hay localStorage para eso.
- **Implementación:** `usuario_id = NULL` siempre en `marketplace_busquedas_log`, aunque el endpoint sea autenticado.


---

## 🏆 v1.2 Pendiente — Sistema de Niveles del Vendedor

> **Estado:** ⏸ Pendiente — diseñado pero no implementado
> **Recomendación:** implementar después de tener data real de la beta (mínimo 2-3 meses de uso o 50+ ventas confirmadas). Los umbrales de cada nivel son adivinanzas hasta validarse con comportamiento real de usuarios.
>
> El módulo MarketPlace v1 funciona perfectamente sin este sistema.

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

### Decisiones explícitas para v1.1

- **Sin calificación numérica (4.5 estrellas, etc.)** — las reseñas requieren acción del comprador y son fáciles de manipular. Los niveles basados en comportamiento son más justos.
- **Sin penalización por bajada** — si un vendedor baja de Confiable a Frecuente porque no respondió rápido este mes, no se le humilla. El sistema solo actualiza el badge en silencio.
- **Boost en búsqueda con cuidado** — el boost no debe ser tan agresivo como para crear círculo vicioso (vendedor nuevo → menos visibilidad → menos ventas → no sube de nivel). Considerar boost suave (1.1x-1.2x) o mini-boost para vendedores con menos de 30 días.

### Acoplamiento con ChatYA

El mensaje automático de confirmación requiere modificar `BurbujaMensaje.tsx` para detectar el tipo `'confirmacion_compra_marketplace'` y renderizar botones interactivos. Esto **acopla ChatYA con MarketPlace** — si esto es problema, considerar API de slots configurables en ChatYA. Para v1.1 puede acoplarse y documentarse como deuda técnica.

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
- Sprint 7 — Polish + Crons + Página Pública (cierre v1)

### Archivos del módulo

**Backend:**
- `apps/api/src/services/marketplace.service.ts` — CRUD principal
- `apps/api/src/services/marketplace/filtros.ts` — Capa 1 de moderación
- `apps/api/src/services/marketplace/buscador.ts` — Lógica de búsqueda
- `apps/api/src/services/marketplace/expiracion.ts` — TTL y reactivación
- `apps/api/src/controllers/marketplace.controller.ts` — Handlers
- `apps/api/src/routes/marketplace.routes.ts` — Rutas
- `apps/api/src/validations/marketplace.schema.ts` — Schemas Zod
- `apps/api/src/cron/marketplace-expiracion.cron.ts` — Crons

**Frontend:**
- `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx` — P1 Feed
- `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx` — P2 Detalle
- `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx` — P3 Perfil
- `apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx` — P4 Wizard
- `apps/web/src/pages/private/marketplace/PaginaResultadosMarketplace.tsx` — P5 Resultados
- `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx` — P6 Pública
- `apps/web/src/components/marketplace/CardArticulo.tsx`
- `apps/web/src/components/marketplace/GaleriaArticulo.tsx`
- `apps/web/src/components/marketplace/CardVendedor.tsx`
- `apps/web/src/components/marketplace/MapaUbicacion.tsx`
- `apps/web/src/components/marketplace/BarraContacto.tsx`
- `apps/web/src/components/marketplace/OverlayBuscadorMarketplace.tsx`
- `apps/web/src/components/marketplace/FiltrosBuscador.tsx`
- `apps/web/src/components/marketplace/ModalSugerenciaModeracion.tsx`
- `apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx`
- `apps/web/src/hooks/queries/useMarketplace.ts`
- `apps/web/src/hooks/useFiltrosBuscadorUrl.ts`
- `apps/web/src/utils/busquedasRecientes.ts`
- `apps/web/src/types/marketplace.ts`

---

**Última actualización:** 04 Mayo 2026
**Estado del módulo:** ✅ v1 completado y desplegado
**Próximo paso:** evaluar Sprint 8 (Sistema de Niveles) después de tener data de beta
