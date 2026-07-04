# Centro de Ayuda (Tutoriales en video) — AnunciaYA v3.0

> **Estado:** ✅ **COMPLETO (2026-07-03)** — Centro `/ayuda` (usuario / comerciante / ScanYA), landing pública `/p/tutorial/:slug` con OG, accesos en los 4 menús, métricas ("¿Te sirvió?" + vistas) y **CRUD en el Panel Admin** (grupo Soporte → "Ayuda y Tutoriales", solo superadmin) con subida de video/poster a R2. Typecheck backend/web/admin OK.
>
> **Pendientes operativos** (de Juan, no de código): correr las 2 migraciones (`2026-07-03-ayuda-feedback-vistas.sql` en DEV/PROD) + agregar el origen del Panel a la **CORS del bucket R2** (para que la subida directa navegador→R2 funcione) + cargar/grabar la Tanda 1 de videos.
>
> **Qué es:** una sección tipo *Help Center* (categorías + buscador) donde cada respuesta es una ficha corta con **pasos en texto + un video tutorial embebido**. Un solo sistema de contenido que sirve a las **3 audiencias** de las apps (usuario, comerciante en Business Studio, comerciante en ScanYA), filtrando lo que cada quien ve.
>
> **Origen:** inventario de capacidades levantado del código el 2026-07-03 (5 barridos: descubrimiento personal, cuenta personal, Business Studio, ScanYA y ChatYA). Este documento es el **estado canónico** del feature — el checklist de videos vive aquí y se va tachando conforme se graban.
>
> **Última actualización:** 2026-07-03.

---

## 1. Concepto

En vez de una lista plana de preguntas (que a los 40 videos se vuelve inservible), el Centro de Ayuda se organiza en tres niveles:

```
Centro de Ayuda
 └─ Categoría (ej: "MarketPlace", "Puntos y recompensas")
     └─ Artículo = una pregunta / tarea
         ├─ Video tutorial (embebido arriba)
         └─ Pasos en texto corto (por si no quieren ver el video)
```

Cada **artículo** es una pregunta-con-video. Las **categorías + buscador** permiten crecer ordenado: se arranca con pocos esenciales y se van agregando videos por necesidad sin desordenar.

### Criterio editorial (qué merece video)

Regla de oro para no inflar el catálogo:

- **NO se graba** lo que es idéntico a apps conocidas y auto-explicativo (enviar una foto, grabar un audio, tachar un filtro). Eso se resuelve, si acaso, con un único video "tour".
- **SÍ se graba** lo específico de AnunciaYA y no obvio (contactar desde una publicación con tarjeta de contexto, canjear un voucher, ver la billetera del cliente en el chat, dar de alta un negocio, etc.).
- **1 video = 1 flujo completo**, no 1 botón. "Buscar + filtrar + ver detalle + contactar" es **un** video, no cinco.

Con este criterio, las ~330 micro-acciones descubiertas colapsan en **~58 videos** (ver §7), de los cuales **14 son la Tanda 1** de lanzamiento.

---

## 2. Las 3 audiencias

| Audiencia | Dónde vive | Qué contenido ve |
|---|---|---|
| 👤 **Usuario** (modo personal / cliente) | AnunciaYA modo personal | Descubrir negocios, comprar/vender, puntos, cupones, chat, su cuenta |
| 🏪 **Comerciante** (Business Studio) | AnunciaYA modo comercial | Dar de alta el negocio, catálogo, promociones, puntos, clientes, equipo, reportes, membresía |
| 📟 **Comerciante en ScanYA** | ScanYA (app aparte, `s.anunciaya.mx`) | Operar la caja: turnos, ventas, puntos, vouchers |

> El comerciante es **la misma persona en dos modos**: como negocio (BS/ScanYA) y como cliente (modo personal). Esto es clave para decidir la ubicación de los accesos (§5).

---

## 3. Arquitectura de información (categorías por audiencia)

### 👤 Usuario
Primeros pasos · Pregúntale a Peñasco · Encontrar negocios · MarketPlace · Ofertas y cupones · Servicios · CardYA (puntos) · ChatYA · Mi cuenta y seguridad

### 🏪 Comerciante (Business Studio)
Empezar en Business Studio · Mi catálogo · Atraer clientes (promociones) · Puntos y recompensas · Clientes, opiniones y alertas · ChatYA para tu negocio · Mi equipo · Empleo (vacantes) · Análisis · Membresía y pagos

### 📟 ScanYA
Empezar y operar la caja · Recompensas · Avanzado

---

## 4. Decisiones de diseño (CERRADAS 2026-07-03)

| # | Tema | Decisión |
|---|---|---|
| 1 | **Nombre visible de la sección** | ✅ **"Ayuda y Tutoriales"** |
| 2 | **Dónde se guardan los videos** | ✅ **Cloudflare R2** (egreso gratis, white-label, privado de verdad; ya hay infra de subida + recolector de huérfanos). Disciplina: clips cortos 720p H.264 con `faststart` + `poster`; CORS del bucket para el origen; registrar `video_url` y `poster_url` en `IMAGE_REGISTRY` y usar el helper de huérfanos. Los metadatos (título, pasos, etc.) viven en Postgres; solo el archivo va a R2. |
| 3 | **Visibilidad** | ✅ **Híbrida**: el Centro navegable completo (categorías, buscador, switch) vive **dentro de la app** (con sesión); **cada video tiene además una URL pública compartible** (`anunciaya.mx/p/tutorial/<slug>`) que abre una landing ligera sin login (video + pasos + CTA "Abrir AnunciaYA"). Botón **"Compartir"** por video (WhatsApp/redes/copiar link). Flag `compartible_publico` por video (default `true`; SuperAdmin puede marcar alguno como solo-interno). Ver §7. |
| 4 | **Shell (cómo se muestra)** | ✅ Ruta dedicada `/ayuda` con `MainLayout` en AnunciaYA + el mismo componente reutilizado como **drawer full-screen** en ScanYA (no sacar al comerciante de la caja). |
| 5 | **Cómo se cargan los videos** | ✅ CRUD en el **Panel Admin**, **solo SuperAdmin** (grupo "Soporte" → "Tutoriales"): crear categorías y artículos, subir video + poster, elegir app/audiencia/orden/estado. |
| 6 | **Extras (incluidos en el MVP)** | ✅ Botón **"¿Te sirvió?"** — feedback de utilidad **binario 👍/👎**, con campo opcional "¿qué te faltó?" en el 👎 — **+ contador de vistas**. Sirven para saber qué videos ayudan y cuáles regrabar. |

---

## 5. Ubicación de los accesos (botones)

Puntos de entrada ya mapeados en el código:

| Audiencia | Archivo | Inserción |
|---|---|---|
| 👤 Usuario | `apps/web/src/components/layout/MenuDrawer.tsx` (móvil) + `DrawerDesktop.tsx` | Nuevo ítem "Ayuda" junto a "Mi Perfil" |
| 🏪 Comerciante | `apps/web/src/components/layout/DrawerBusinessStudio.tsx` | Nuevo ítem "Ayuda" antes de "Mi Perfil" |
| 📟 ScanYA | `apps/web/src/components/scanya/HeaderScanYA.tsx` | Ícono "?" que abre el Centro como drawer |
| ⚙️ Panel Admin (CRUD) | `apps/admin/src/data/menuPanel.ts` | Grupo "Soporte" → "Tutoriales" (superadmin) |

### ✅ Decidido (2026-07-03): ¿una entrada o dos para el comerciante?

**El problema (planteado por Juan):** un botón dentro de BS es cómodo y contextual para los videos comerciales, pero hay videos que **no** son de BS ni ScanYA (los de modo personal/cliente) que el comerciante no encontraría ahí.

**Recomendación:** no es un dilema de "1 vs 2 sistemas". Es **un solo Centro de Ayuda con varias puertas contextuales + un switch interno**:

1. Cada **puerta abre el Centro filtrado a su contexto**: la de BS entra en "Para mi negocio", la de ScanYA en "ScanYA", la del MenuDrawer personal en "Para usar la app".
2. **Dentro del Centro siempre hay un selector de audiencia** (tabs: *Para usar la app* · *Para mi negocio* · *ScanYA*) para que ningún video quede inalcanzable desde ninguna puerta.
3. Así el comerciante encuentra sus videos de BS **por comodidad, dentro de BS**, y si quiere los de "cómo uso la app como cliente", cambia de pestaña — o los ve desde su MenuDrawer cuando está en modo personal.

> Resultado: 1 fuente de contenido, entradas donde el usuario ya está, y cobertura total garantizada por el switch. ✅ **Ésta es la estructura elegida.**

---

## 6. Modelo de datos (borrador)

Dos tablas. La categoría define `app` + `audiencia`; los artículos heredan.

```
ayuda_categorias
  id            uuid pk
  nombre        text
  icono         text            -- slug de apps/web/src/config/iconos.ts
  app           text            -- 'anunciaya' | 'scanya'
  audiencia     text            -- 'cliente' | 'comerciante'
  orden         int
  activo        bool
  created_at / updated_at

ayuda_articulos
  id                   uuid pk
  categoria_id         uuid fk -> ayuda_categorias
  slug                 text unique     -- URL amigable: /ayuda/<slug>
  pregunta             text            -- el título / la pregunta
  respuesta            text            -- markdown con los pasos
  video_url            text null       -- R2 (registrar en IMAGE_REGISTRY)
  poster_url           text null       -- R2, portada del video (og:image al compartir)
  duracion_seg         int null
  orden                int
  publicado            bool            -- borrador vs publicado
  compartible_publico  bool default true  -- expone la landing pública /ayuda/<slug>
  vistas               int default 0   -- para saber qué se usa más
  util_si / util_no    int default 0   -- votos "¿Te sirvió?" 👍/👎 (agregados, sin identidad)
  created_at / updated_at

ayuda_feedback                    -- RESERVADA (no usada aún; el "¿Te sirvió?" usa util_si/util_no)
  id            uuid pk
  articulo_id   uuid fk -> ayuda_articulos
  usuario_id    uuid fk -> usuarios
  util          bool            -- 👍 true / 👎 false
  comentario    text null       -- opcional, sobre todo cuando util=false
  created_at
  -- UNIQUE (articulo_id, usuario_id): 1 voto por usuario por artículo
```

Búsqueda: `ILIKE` sobre `pregunta` + `respuesta` para el MVP; full-text si crece.
El contador `vistas` se incrementa al abrir un artículo (1× por sesión); los 👍/👎 se agregan en `util_si`/`util_no` vía `POST /api/ayuda/:id/feedback` y `POST /api/ayuda/:id/vista` (anti-doble por `localStorage`, sin identidad → funciona también desde ScanYA). `ayuda_feedback` (por-usuario) quedó **reservada** para un feedback detallado futuro (con comentario), cuando se resuelva la identidad cross-app. Migración: `docs/migraciones/2026-07-03-ayuda-feedback-vistas.sql`.

---

## 7. UI/UX — PC vs Móvil

**PC** (2 columnas dentro de `MainLayout`): buscador prominente arriba ("¿Con qué te ayudamos?"), sidebar de categorías a la izquierda, contenido a la derecha. Al abrir un artículo: video 16:9 arriba, pregunta como título, pasos debajo.

**Móvil** (página full-width): buscador arriba → lista de categorías → tap → preguntas → tap → detalle con video full-width arriba + pasos abajo. Back nativo (sistema de navegación existente).

**Estado de entrada** (definido 2026-07-03): al abrir el Centro sin elegir nada, el panel muestra las fichas de la **primera categoría** (más adelante se puede sumar un bloque "Esenciales / más vistos"). **Los pasos se escriben en Markdown** (campo `respuesta`) y se renderizan con estilo de lista/pasos. Mockup aprobado: `scratchpad/centro_ayuda_mockup.html`.

Player: `<video>` nativo con `controls`, `preload="none"`, `poster`. **En móvil, al rotar a horizontal el video entra a pantalla completa automáticamente** (`requestFullscreen` / iOS `webkitEnterFullscreen`) y sale al volver a vertical. Respetar `TOKENS_GLOBALES.md` (Regla 13: densidad, iconos 14–16px sin círculos, neutro + 1 acento; nada caricaturesco). Variantes móvil/desktop explícitas.

### Landing pública compartible (`/ayuda/<slug>`)

Página ligera **sin login** que muestra un solo video + sus pasos + CTA "Abrir AnunciaYA". Es lo que viaja por WhatsApp/redes.

- **La sirve el backend (Express), no el SPA.** Los crawlers de WhatsApp/Facebook/Twitter no ejecutan JS, así que los meta tags Open Graph (`og:title`, `og:description`, `og:image` = poster, `og:type` = video, `twitter:card`) deben venir en el HTML del servidor. El backend consulta el artículo por `slug` y arma ese HTML.
- **Bucket R2 público** para videos y posters, servido por **dominio propio** (white-label, sin marca de terceros).
- Solo se expone si `publicado = true` **y** `compartible_publico = true`.
- **Botón "Compartir"** (en la app y en la landing): Web Share API en móvil (menú nativo: WhatsApp, etc.) + copiar-link y botones de red en escritorio.

---

## 8. Checklist maestro de videos

> Leyenda — Tanda: **T1** lanzamiento · **T2** consolidación · **T3** cobertura fina. Prioridad: 🔴 Esencial · 🟡 Útil · 🟢 Opcional.
> Marca la casilla cuando el video esté **grabado y publicado**.
>
> **Totales:** 58 videos — T1: 14 · T2: 23 · T3: 21.
>
> **Catálogo vivo:** esta lista NO es cerrada. Es una biblioteca que crecerá — conforme aparezcan necesidades (features nuevos, dudas frecuentes de la beta, huecos que se noten) se agregan videos aquí, sin límite. Grabar la Tanda 1 primero; el resto se llena por necesidad.

### 👤 Usuario (modo personal / cliente) — 27 videos

**Primeros pasos**
- [ ] **U-01 · Qué es AnunciaYA y cómo preguntarle a Peñasco** — 👤 · T1 · 🔴
- [ ] **U-02 · Crea tu cuenta y verifica tu correo** — 👤 · T2 · 🔴
- [ ] **U-03 · Elige tu ciudad (y por qué cambia lo que ves)** — 👤 · T2 · 🔴
- [ ] **U-04 · Instala AnunciaYA en tu teléfono** — 👤 · T3 · 🟢
- [ ] **U-05 · Recupera tu contraseña** — 👤 · T3 · 🟢

**Encontrar negocios**
- [ ] **U-06 · Encuentra negocios cerca y ve si están abiertos** — 👤 · T1 · 🔴
- [ ] **U-07 · Usa el mapa y los filtros (categoría, distancia, CardYA, domicilio)** — 👤 · T2 · 🟡
- [ ] **U-08 · Explora el perfil de un negocio: horarios, catálogo y ofertas** — 👤 · T2 · 🟡
- [ ] **U-09 · Escribe una reseña de un negocio** — 👤 · T3 · 🟢

**MarketPlace**
- [ ] **U-10 · Compra y vende en MarketPlace (Vendo / Busco)** — 👤 · T1 · 🔴
- [ ] **U-11 · Publica tu artículo con fotos, paso a paso** — 👤 · T2 · 🔴
- [ ] **U-12 · Administra tus publicaciones (pausar, marcar vendido, editar)** — 👤 · T2 · 🟡
- [ ] **U-13 · Haz preguntas en una publicación** — 👤 · T3 · 🟢

**Ofertas y cupones**
- [ ] **U-14 · Encuentra ofertas y aprovecha las de "últimas horas"** — 👤 · T2 · 🔴
- [ ] **U-15 · Usa Mis Cupones: revela y muestra el código en la tienda** — 👤 · T2 · 🔴
- [ ] **U-16 · Guarda ofertas para después** — 👤 · T3 · 🟢

**Servicios**
- [ ] **U-17 · Encuentra un servicio, un empleo o solicita algo** — 👤 · T2 · 🔴
- [ ] **U-18 · Ofrece un servicio o publica una solicitud** — 👤 · T2 · 🟡

**CardYA (puntos)**
- [ ] **U-19 · Junta puntos con CardYA y canjea recompensas** — 👤 · T1 · 🔴
- [ ] **U-20 · Revisa tu historial de compras y tus vouchers** — 👤 · T3 · 🟢

**ChatYA (cliente)**
- [ ] **U-21 · Contacta a un vendedor o negocio desde una publicación y reclama cupones** — 👤 · T1 · 🔴
- [ ] **U-22 · Conoce ChatYA: envía fotos, audios, responde y busca mensajes** — 👤 · T3 · 🟢
- [ ] **U-23 · Reenvía, fija y reacciona a mensajes** — 👤 · T3 · 🟢

**Mi cuenta y seguridad**
- [ ] **U-24 · Edita tu perfil: foto, datos y ciudad** — 👤 · T2 · 🔴
- [ ] **U-25 · Cambia tu contraseña y activa la verificación en dos pasos (2FA)** — 👤 · T2 · 🟡
- [ ] **U-26 · Revisa tus Guardados (negocios, ofertas, artículos, servicios)** — 👤 · T3 · 🟢
- [ ] **U-27 · Entiende tus notificaciones** — 👤 · T3 · 🟢

### 🏪 Comerciante — Business Studio — 22 videos

**Empezar en Business Studio**
- [ ] **C-01 · Da de alta tu negocio (onboarding completo)** — 🏪 · T1 · 🔴
- [ ] **C-02 · Tour de Business Studio: entiende tu Dashboard** — 🏪 · T1 · 🔴
- [ ] **C-03 · Completa el perfil de tu negocio (fotos, horarios, contacto, pagos)** — 🏪 · T2 · 🔴

**Mi catálogo**
- [ ] **C-04 · Sube tu primer producto o servicio al catálogo** — 🏪 · T1 · 🔴
- [ ] **C-05 · Destaca, oculta o duplica productos entre sucursales** — 🏪 · T3 · 🟢

**Atraer clientes (promociones)**
- [ ] **C-06 · Crea tu primera oferta (descuento, 2x1, envío gratis)** — 🏪 · T1 · 🔴
- [ ] **C-07 · Crea y envía un cupón privado a un cliente** — 🏪 · T2 · 🔴
- [ ] **C-08 · Mide el desempeño de tus promociones (vistas, clics, canjes)** — 🏪 · T3 · 🟢

**Puntos y recompensas**
- [ ] **C-09 · Configura tu sistema de puntos y crea recompensas** — 🏪 · T1 · 🔴
- [ ] **C-10 · Activa niveles (Bronce/Plata/Oro) y tarjetas de sellos** — 🏪 · T3 · 🟢

**Clientes, opiniones y alertas**
- [ ] **C-11 · Responde las opiniones de tus clientes** — 🏪 · T2 · 🔴
- [ ] **C-12 · Conoce a tus clientes: niveles, puntos e historial** — 🏪 · T2 · 🟡
- [ ] **C-13 · Revisa y resuelve tus alertas** — 🏪 · T3 · 🟢

**ChatYA para tu negocio**
- [ ] **C-14 · Responde a tus clientes por ChatYA (desde BS y ScanYA) y ve su billetera** — 🏪 · T1 · 🔴
- [ ] **C-15 · Usa el Directorio comercial de tu ciudad** — 🏪 · T2 · 🟡
- [ ] **C-16 · Envía cupones y ofertas por chat** — 🏪 · T2 · 🟡

**Mi equipo**
- [ ] **C-17 · Agrega empleados y asígnales permisos** — 🏪 · T2 · 🔴
- [ ] **C-18 · Administra tus sucursales y cambia entre ellas** — 🏪 · T2 · 🟡

**Empleo (vacantes)**
- [ ] **C-19 · Publica una vacante y recibe candidatos** — 🏪 · T2 · 🟡

**Análisis**
- [ ] **C-20 · Lee y exporta tus reportes (ventas, clientes, promociones)** — 🏪 · T3 · 🟢

**Membresía y pagos**
- [ ] **C-21 · Gestiona tu membresía y tu método de cobro** — 🏪 · T2 · 🔴
- [ ] **C-22 · Paga manualmente con comprobante o recupera tu tarjeta** — 🏪 · T3 · 🟢

### 📟 Comerciante — ScanYA — 9 videos

**Empezar y operar la caja**
- [ ] **S-01 · Entra a ScanYA y abre tu turno (dueño/gerente y empleado con PIN)** — 📟 · T1 · 🔴
- [ ] **S-02 · Registra una venta y otorga puntos al cliente** — 📟 · T1 · 🔴
- [ ] **S-03 · Canjea un voucher (QR o código) y cierra tu turno** — 📟 · T1 · 🔴
- [ ] **S-04 · Registra ventas sin internet (modo offline)** — 📟 · T2 · 🟡

**Recompensas**
- [ ] **S-05 · Consulta y gestiona los vouchers de tus clientes** — 📟 · T3 · 🟢

**Avanzado**
- [ ] **S-06 · Consulta el historial del turno y filtra (período / empleado)** — 📟 · T3 · 🟢
- [ ] **S-07 · Cambia de sucursal en ScanYA** — 📟 · T3 · 🟢
- [ ] **S-08 · Responde reseñas desde ScanYA** — 📟 · T3 · 🟢
- [ ] **S-09 · Instala ScanYA en tu tablet o teléfono** — 📟 · T3 · 🟢

---

## 9. Plan de grabación — Tanda 1 (lanzamiento beta)

> **Manual de producción y guiones:** cómo grabar (voz, dispositivo, CapCut, especs), el formato de guion, el **mapa video → pantalla real** y los **guiones ya escritos** viven en `Centro_Ayuda_Produccion.md`. Los guiones se producen en un chat dedicado que lee ese doc.

Los 14 esenciales, en orden de grabación sugerido:

| Orden | ID | Video | Audiencia |
|---|---|---|---|
| 1 | U-01 | Qué es AnunciaYA y cómo preguntarle a Peñasco | 👤 |
| 2 | U-06 | Encuentra negocios cerca y contáctalos | 👤 |
| 3 | U-10 | Compra y vende en MarketPlace | 👤 |
| 4 | U-19 | Junta puntos con CardYA y canjea recompensas | 👤 |
| 5 | U-21 | Contacta desde una publicación y reclama cupones (ChatYA) | 👤 |
| 6 | C-01 | Da de alta tu negocio (onboarding) | 🏪 |
| 7 | C-02 | Tour de Business Studio (Dashboard) | 🏪 |
| 8 | C-04 | Sube tu primer producto al catálogo | 🏪 |
| 9 | C-06 | Crea tu primera oferta | 🏪 |
| 10 | C-09 | Configura puntos y recompensas | 🏪 |
| 11 | C-14 | Responde a tus clientes por ChatYA y ve su billetera | 🏪 |
| 12 | S-01 | Entra a ScanYA y abre tu turno | 📟 |
| 13 | S-02 | Registra una venta y da puntos | 📟 |
| 14 | S-03 | Canjea un voucher y cierra tu turno | 📟 |

---

## 10. Fases de implementación (código)

1. **Datos + lectura** ✅ **(2026-07-03)** — tablas creadas en DEV/PROD; `schema.ts` (3 tablas Drizzle); `GET /api/ayuda?app=&audiencia=` (`ayuda.routes/controller/service`, privado); front `useCentroAyuda` + `ayudaService` + `queryKeys.ayuda` + `/ayuda` excluida del `sucursalId` en `api.ts`. Typecheck backend y web OK. **Falta desplegar** (push cuando se decida; las tablas ya existen, no tumba Render).
2. **Componente `<CentroAyuda>`** ✅ **(2026-07-03, escritorio + móvil)** — página `/ayuda` (`pages/private/ayuda/PaginaCentroAyuda.tsx`) + `components/ayuda/` (`TabsAudiencia`, `VistaArticulo`, `ReproductorVideo` con auto-fullscreen en landscape, `ContenidoPasos` = render Markdown mínimo propio, sin dependencia nueva). Tabs de audiencia, buscador, sidebar/lista, estados carga/vacío. Ruta registrada en el router. **Envoltura drawer para ScanYA ✅** (`components/scanya/ModalCentroAyudaScanYA.tsx` reutiliza la página con `soloAudiencia="scanya" embebido`). Typecheck OK. Pendiente: persistir feedback/vistas (2b).
3. **Landing pública + compartir** ✅ **(2026-07-03)** — ruta pública **`/p/tutorial/:slug`** (`pages/public/PaginaTutorialPublico.tsx`, con `HeaderPublico`/`FooterPublico`, reusa `ReproductorVideo` + `ContenidoPasos`) + endpoint `GET /api/ayuda/publico/:slug` (`verificarTokenOpcional`, solo `publicado` + `compartible_publico`) + **OG server-side** vía `apps/web/api/og.ts` (tipo `tutorial`; el rewrite genérico `/p/:tipo/:id` de `vercel.json` ya lo cubre, sin tocar). El botón Compartir reusa `DropdownCompartir` y apunta a `/p/tutorial/<slug>`. Preview de WhatsApp funciona en prod (Vercel serverless); en local carga el SPA.
4. **CRUD en Panel Admin** ✅ **(2026-07-03)** — grupo "Soporte" → "Ayuda y Tutoriales" (solo superadmin). Backend `services/admin/ayuda.service` + `controllers/admin/ayuda.controller` + `routes/admin/ayuda.routes` (CRUD categorías/artículos + `POST /upload` presigned R2). Frontend `apps/admin`: `SeccionAyuda` (lista + métricas) + `DialogoCategoria` + `DialogoArticulo` (subida video/poster) + borrar con `DialogoConfirmar`. `video_url`/`poster_url` en `IMAGE_REGISTRY`. **Nota:** el bucket R2 necesita CORS con el origen del Panel para la subida desde el navegador (ver memoria `reference_r2_cors_panel`).
5. **Accesos** ✅ **(2026-07-03)** — ítem "Ayuda y Tutoriales" en `MenuDrawer` (móvil, personal + comercial), `DrawerDesktop` (popover del avatar, todas las secciones) y `DrawerBusinessStudio` (BS móvil, navega con push para que el back regrese a BS); y botón **"?"** en `HeaderScanYA` (móvil + escritorio) que abre `ModalCentroAyudaScanYA`. Nota: `GET /api/ayuda` pasó a `verificarTokenOpcional` para que el Centro cargue también desde ScanYA (que usa otro token); no expone datos del usuario, la privacidad se mantiene a nivel de UI. Typecheck OK.
6. **Contenido** — cargar y grabar la Tanda 1.

---

## 11. Referencia — evidencia del inventario

Archivos base por audiencia (para saber qué mostrar al grabar cada flujo):

- **Usuario:** `pages/private/PaginaInicio.tsx` (Coyo), `pages/private/negocios/`, `pages/private/marketplace/`, `pages/private/ofertas/`, `pages/private/servicios/`, `pages/private/cardya/`, `pages/private/cupones/`, `pages/private/publicaciones/`, `pages/private/guardados/`, `pages/private/perfil/`, `components/chatya/`, `components/layout/ModalUbicacion.tsx`, `components/layout/PanelNotificaciones.tsx`.
- **Comerciante (BS):** `pages/private/business-studio/**` (dashboard, catalogo, ofertas, puntos, clientes, opiniones, alertas, empleados, vacantes, reportes, sucursales, perfil), `pages/private/PaginaOnboarding.tsx`.
- **ScanYA:** `pages/private/scanya/PaginaScanYA.tsx`, `pages/private/scanya/PaginaLoginScanYA.tsx`, `components/scanya/**`.
- **ChatYA (ambos modos):** `components/chatya/**` + doc `docs/arquitectura/ChatYA.md`.

> Nota: features de ChatYA marcados como *planeados* (plantillas de respuesta rápida, gestión de candidatos de vacante) **no** se graban hasta implementarse.
