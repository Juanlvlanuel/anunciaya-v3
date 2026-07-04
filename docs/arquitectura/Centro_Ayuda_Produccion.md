# Centro de Ayuda — Producción de videos y guiones — AnunciaYA v3.0

> **Qué es este documento:** el **manual operativo** para producir los videos tutoriales del Centro de Ayuda: cómo grabar, con qué voz, en qué dispositivo, cómo escribir los guiones y **dónde vive cada pantalla en el código** para grabar el flujo correcto. Aquí también se van **acumulando los guiones ya escritos**.
>
> **Relación con el doc técnico:** `Centro_Ayuda.md` (su compañero) es lo **técnico** — cómo está construido el Centro (tablas, componentes, endpoints) y el **checklist maestro de los 58 videos**. Este es lo **operativo** — cómo se graban y qué se dice. Uno crece con features; el otro crece con guiones.
>
> **Última actualización:** 2026-07-03.

---

## 1. Cómo usar este documento (y el chat de guiones)

Los guiones se producen en **un chat dedicado** (no en el chat donde se construyó el feature). Este documento es todo lo que ese chat necesita para trabajar pegado a la app real.

**Prompt de arranque para el chat nuevo:**

> *"Lee `docs/arquitectura/Centro_Ayuda_Produccion.md` completo. Vamos a escribir los guiones de narración de la **Tanda 1** (14 videos), uno por uno. Para cada video, **primero abre los archivos que indica el mapa de la §4** y describe lo que de verdad se ve en pantalla; luego escribe el guion con el formato de la §3. Empecemos por el **Video 1 (U-01)**"* (o el que sigas).

**Regla de oro (no negociable):** ningún guion se escribe "de memoria". Antes de redactar la narración de un video, **se abre la pantalla real en el código** (el mapa §4 dice cuáles archivos) y se verifican los nombres exactos de botones, pestañas y secciones. La app es la fuente de verdad, no la memoria del chat.

---

## 2. Workflow de grabación

### 2.1 Voz
- **Voz en off con tu propia voz**, no a cámara. Screencast (grabación de pantalla) con tu narración encima.
- Por qué tu voz: AnunciaYA es una app **local/comunidad**; una voz humana y cercana genera más confianza que una voz de IA. Para la Tanda 1, tu voz.
- Por qué no a cámara: en un tutorial la gente quiere ver **dónde tocar**, no una cara. Además es más fácil de producir y de regrabar.
- IA/TTS: solo si más adelante hay que producir mucho volumen rápido. Pierde calidez.

### 2.2 Dispositivo y proporción — **graba donde de verdad se usa la función**

| Audiencia / sección | Dónde se usa | Grabar en | Proporción |
|---|---|---|---|
| 👤 Usuario (Home/Coyo, Negocios, MarketPlace, Ofertas, Servicios, CardYA, ChatYA, Perfil) | Celular | **Celular** | **Vertical 9:16** |
| 🏪 Business Studio (dashboard, catálogo, ofertas, puntos, reportes) | Más en PC/escritorio | **PC** | **Horizontal 16:9** |
| 🏪 Onboarding de negocio | Celular o PC (wizard fullscreen) | El que uses para dar de alta | El de ese dispositivo |
| 📟 ScanYA | Punto de venta (tablet/celular) | **El dispositivo real** | El de ese dispositivo |

> El reproductor del Centro es **adaptativo**: los horizontales llenan el ancho (16:9) y los verticales se ven altos y centrados, sin franjas negras. Mantén **una misma orientación por audiencia** para que la lista se vea pareja. El **poster** (portada) debe ser de la **misma proporción** que el video.

### 2.3 Dos flujos de producción

**Flujo A — narrar en vivo (recomendado para arrancar):**
1. Ten a la mano el guion (§3/§5).
2. Graba pantalla **y narra al mismo tiempo**, haciendo cada acción **despacio**.
3. Una sola toma. Si te trabas, repites (son videos cortos).
4. En CapCut solo recortas inicio/fin + subtítulos automáticos.
→ Sale sincronizado solo, mínima edición.

**Flujo B — audio limpio (cuando quieras pulir):**
1. Graba **tu voz primero**, por pasos, con una pausita entre cada uno.
2. Graba la pantalla haciendo las acciones.
3. En CapCut pon **la voz de base** y **ajusta el video encima** (congela un frame en las pausas, acelera tramos lentos) para que la acción caiga con la voz.
→ Principio clave: **la voz manda, el video se ajusta** (nunca al revés).

### 2.4 Herramientas
- **Grabar celular:** grabador de pantalla nativo (iOS / Android).
- **Grabar PC:** OBS Studio (gratis) o Xbox Game Bar (`Win+G`).
- **Editar:** CapCut — recorte + **subtítulos automáticos** (para quien ve sin audio).

### 2.5 Especificaciones técnicas (para que pese poco y cargue rápido)
- **720p**, códec **H.264**, con **faststart** (metadatos al inicio → reproduce sin esperar la descarga completa).
- **Poster** (imagen de portada) en la misma proporción del video.
- Se suben desde el **Panel Admin → Soporte → Ayuda y Tutoriales** (subida directa a R2). La duración se **auto-detecta** al subir.

### 2.6 Tips de oro
- **Graba lento.** Tocar pausado hace que la sincronía después sea facilísima y se sigue mejor.
- **1 video = 1 flujo completo**, no 1 botón. "Buscar + filtrar + ver detalle + contactar" es **un** video.
- **Duración objetivo ~50-90 seg.** Si un tema pasa de ~4-5 min, pártelo en dos.
- **No grabes lo obvio** (enviar una foto, escribir un mensaje). Solo lo específico de AnunciaYA (ver criterio editorial en `Centro_Ayuda.md` §1).

---

## 3. Formato y tono del guion

**Formato:** por cada video, la narración **palabra por palabra** con indicaciones de **qué mostrar** entre corchetes, para que voz y acción cuadren.

```
[Pantalla: qué se ve / qué se toca]
"Lo que dices, tal cual."
```

**Tono:**
- De **"tú"**, español **mexicano**, cercano y claro. Nada acartonado.
- **Frases cortas**, fáciles de leer en voz alta.
- Estructura: **gancho** (1 frase: qué van a lograr) → **pasos** (mostrando la acción) → **cierre** (invitación / CTA breve).

**Bonus:** el mismo guion sirve para los **pasos en texto** del artículo (campo `respuesta`, Markdown). Al terminar cada guion, se puede derivar una versión "pasos" de 3-5 viñetas para pegar en el Panel.

---

## 4. Mapa de la Tanda 1 — video → pantalla real

Antes de escribir cada guion, **abre estos archivos** (en `apps/web/src`) y describe lo que de verdad se ve.

**1 · U-01 · Qué es AnunciaYA y cómo preguntarle a Peñasco** — 👤 · celular 9:16
- **URL:** `/inicio`
- **Abrir:** `pages/private/PaginaInicio.tsx` + `EscenaCoyo`, `AreaPreguntaCoyo` (CoyoInput), `CardPreguntaEditorial`, `RespuestasComunidad`
- **Qué se ve:** feed conversacional con Coyo; campo "Pregúntale a Peñasco"; toggle **"Comunidad · Mis preguntas"**.

**2 · U-06 · Encuentra negocios cerca y contáctalos** — 👤 · celular 9:16
- **URL:** `/negocios` (listado) → `/negocios/:sucursalId` (ficha)
- **Abrir:** `pages/private/negocios/PaginaNegocios.tsx` + `Mapa`, `CardNegocio`, `ChipsFiltros`, `SeccionOfertas`, `SeccionCatalogo`
- **Qué se ve:** mapa compacto + grid de negocios cercanos (toggle lista/mapa en móvil); ficha con horarios, catálogo, ofertas, opiniones.

**3 · U-10 · Compra y vende en MarketPlace (Vendo / Busco)** — 👤 · celular 9:16
- **URL:** `/marketplace` → `/marketplace/articulo/:articuloId`; publicar con `?crear=1`
- **Abrir:** `pages/private/marketplace/PaginaMarketplace.tsx` + `CardArticuloFeed`, `ReelMarketplace`, `ChipsFiltrosFeed`, `ComposerSection`, `ModalArticuloDetalle`
- **Qué se ve:** feed "Recién publicado" + "Cerca de ti"; composer inline; detalle de artículo.

**4 · U-19 · Junta puntos con CardYA y canjea recompensas** — 👤 · celular 9:16
- **URL:** `/cardya`
- **Abrir:** `pages/private/cardya/PaginaCardYA.tsx` + `CardBilletera`, `CardRecompensaCliente`, `TablaHistorialCompras`, `DropdownNegocio` + Modal Confirmar Canje
- **Qué se ve:** billeteras por negocio; recompensas; pestañas Billeteras/Recompensas/Historial; canje de puntos.

**5 · U-21 · Contacta desde una publicación y reclama cupones (ChatYA)** — 👤 · celular 9:16
- **URL:** overlay de chat (se dispara desde una ficha de MarketPlace o de negocio)
- **Abrir:** `components/layout/ChatOverlay.tsx` + `components/chatya/` (`ListaConversaciones`, `VentanaChat`); origen del contacto: `ModalArticuloDetalle` / ficha de negocio
- **Qué se ve:** botón contactar en la publicación → se abre ChatYA con tarjeta de contexto; reclamar cupón por chat.

**6 · C-01 · Da de alta tu negocio (onboarding completo)** — 🏪 · celular o PC
- **URL:** `/business/onboarding`
- **Abrir:** `pages/private/business/onboarding/PaginaOnboarding.tsx` + `LayoutOnboarding`, `PasoCategoria`, `PasoUbicacion`, `PasoContacto`, `PasoHorarios`, `PasoImagenes`, `PasoMetodosPago`, `PasoPuntos`, `PasoProductos`
- **Qué se ve:** wizard de 8 pasos, fullscreen, con indicador de progreso.

**7 · C-02 · Tour de Business Studio (Dashboard)** — 🏪 · PC 16:9
- **URL:** `/business-studio`
- **Abrir:** `pages/private/business-studio/dashboard/PaginaDashboard.tsx` + `CarouselKPI`, `GraficaVentas`, `PanelCampanas`, `PanelAlertas`, `PanelInteracciones` + el menú de módulos
- **Qué se ve:** KPIs (Ventas, Clientes, Transacciones), gráficas, campañas, alertas; recorrido por el menú.

**8 · C-04 · Sube tu primer producto al catálogo** — 🏪 · PC 16:9
- **URL:** `/business-studio/catalogo`
- **Abrir:** carpeta `pages/private/business-studio/catalogo/` → ubicar la página + el modal/form de alta de producto
- **Qué se ve:** listado del catálogo + alta de producto con fotos, precio, categoría.

**9 · C-06 · Crea tu primera oferta** — 🏪 · PC 16:9
- **URL:** `/business-studio/ofertas`
- **Abrir:** carpeta `pages/private/business-studio/ofertas/` → página + form de creación de oferta
- **Qué se ve:** crear oferta (descuento, 2x1, envío gratis).

**10 · C-09 · Configura puntos y recompensas** — 🏪 · PC 16:9
- **URL:** `/business-studio/puntos`
- **Abrir:** carpeta `pages/private/business-studio/puntos/` → configuración de puntos + alta de recompensas
- **Qué se ve:** definir cuántos puntos por compra y crear recompensas canjeables.

**11 · C-14 · Responde a tus clientes por ChatYA y ve su billetera** — 🏪 · PC 16:9
- **URL:** overlay de chat en modo comercial (BS/ScanYA)
- **Abrir:** `components/layout/ChatOverlay.tsx` + `components/chatya/` (vista comercial) — ubicar dónde se muestra la **billetera del cliente** dentro del chat
- **Qué se ve:** conversación con un cliente + su billetera de puntos a la vista.

**12 · S-01 · Entra a ScanYA y abre tu turno** — 📟 · tablet/celular
- **URL:** `/scanya/login` → `/scanya`
- **Abrir:** `pages/private/scanya/PaginaLoginScanYA.tsx`, `pages/private/scanya/PaginaScanYA.tsx` + `HeaderScanYA`, `ResumenTurno`
- **Qué se ve:** login (dueño/gerente y empleado con PIN) → abrir turno.

**13 · S-02 · Registra una venta y otorga puntos** — 📟 · tablet/celular
- **URL:** `/scanya`
- **Abrir:** `pages/private/scanya/PaginaScanYA.tsx` + `ModalRegistrarVenta`, `IndicadoresRapidos`, botón "Otorgar Puntos"
- **Qué se ve:** registrar una venta y otorgar puntos al cliente.

**14 · S-03 · Canjea un voucher y cierra tu turno** — 📟 · tablet/celular
- **URL:** `/scanya`
- **Abrir:** `pages/private/scanya/PaginaScanYA.tsx` + `ModalVouchers`, `ModalCerrarTurno`
- **Qué se ve:** canjear voucher (QR/código) y cerrar el turno.

> Los IDs (U-01, C-04, S-01…) corresponden al **checklist maestro** de `Centro_Ayuda.md` §8. Al terminar de grabar y publicar, marca ahí la casilla.

---

## 5. Guiones

> Se van agregando aquí conforme se escriben. El **Video 1** queda como **plantilla de oro** del formato y tono.

### 🎬 U-01 — "Qué es AnunciaYA y cómo preguntarle a Peñasco" · 👤 · ~50-60 seg

> `[Pantalla: app abierta en /inicio, se ve a Coyo]`
> **"¡Hola! Bienvenido a AnunciaYA, la app de tu comunidad aquí en Puerto Peñasco. Con ella encuentras negocios, ofertas y servicios cerca de ti. Te enseño lo primero que tienes que saber."**
>
> `[Pantalla: tocas el campo "Pregúntale a Peñasco" y empiezas a escribir]`
> **"¿Necesitas algo y no sabes dónde conseguirlo? Solo escríbelo aquí, donde dice 'Pregúntale a Peñasco'. Por ejemplo: '¿dónde venden tacos cerca?'."**
>
> `[Pantalla: envías la pregunta y aparece la respuesta de Coyo]`
> **"Coyo, nuestro asistente, te responde al momento con los negocios, ofertas o servicios que te sirven. Así de fácil."**
>
> `[Pantalla: bajas al feed y tocas el interruptor "Comunidad · Mis preguntas"]`
> **"Aquí abajo ves lo que pregunta la comunidad. Puedes cambiar entre 'Comunidad' y 'Mis preguntas' para seguir las tuyas."**
>
> `[Pantalla: señalas las secciones de arriba — Negocios, Ofertas, Servicios]`
> **"Y arriba tienes todas las secciones para explorar. Échale un ojo… ¡y bienvenido a AnunciaYA!"**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Abre AnunciaYA en tu ciudad.
2. En **"Pregúntale a Peñasco"**, escribe lo que buscas.
3. **Coyo** te responde con negocios, ofertas y servicios cerca.
4. Cambia entre **Comunidad** y **Mis preguntas** para seguir las tuyas.

---

*(Los guiones U-06, U-10, U-19, … se agregan debajo conforme se escriben en el chat de producción.)*

---

## 6. Seguimiento de la Tanda 1

| Orden | ID | Video | Guion | Grabado | Editado | Subido al Panel | Publicado |
|---|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | U-01 | Qué es AnunciaYA / Coyo | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | U-06 | Encuentra negocios | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | U-10 | MarketPlace | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | U-19 | CardYA / puntos | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | U-21 | Contactar + cupones (ChatYA) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | C-01 | Alta de negocio (onboarding) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | C-02 | Tour Business Studio | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | C-04 | Primer producto | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | C-06 | Primera oferta | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | C-09 | Puntos y recompensas | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | C-14 | ChatYA negocio + billetera | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | S-01 | Entrar y abrir turno | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 13 | S-02 | Registrar venta + puntos | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 14 | S-03 | Canjear voucher + cerrar turno | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
