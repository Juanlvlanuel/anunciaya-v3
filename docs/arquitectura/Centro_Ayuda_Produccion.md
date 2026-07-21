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

### 🎬 U-01 — "Qué es AnunciaYA y cómo preguntarle a Coyo" · 👤 · celular 9:16 · ~65-85 seg

> **Nota:** guion **genérico** (sirve para cualquier ciudad, no solo Puerto Peñasco). Los nombres entre comillas se verificaron contra la app real: el label del campo es **"Pregúntale a Coyo"**, el placeholder **"Escribe lo que buscas…"** y la burbuja de Coyo **"¿Qué andas buscando hoy?"**.

> `[Pantalla: app abierta en /inicio. Se ve a Coyo con el saludo "¡Hola, [nombre]!" y su burbuja "¿Qué andas buscando hoy?"]`
> **"¡Hola! Bienvenido a AnunciaYA, la app donde encontraras todo lo que necesitas cerca de ti, desde —negocios, ofertas y ademas también puedes comprar o vender en MarketPlace u ofrecer tus servicios a los vecinos. pero espera deja te presento a Coyo."**
>
> `[Pantalla: tocas el campo "Pregúntale a Coyo" (placeholder "Escribe lo que buscas…") y empiezas a escribir]`
> **"por que cuando Necesitas algo y no sabes dónde conseguirlo, Aquí, donde dice 'Pregúntale a Coyo', solo escríbelo. Por ejemplo: '¿dónde venden tacos cerca?'."**
>
> `[Pantalla: tocas enviar. Tu pregunta cae en el feed con la mascota animada, el texto "Coyo está pensando" y los tres puntitos]`
> **"Le das enviar… y aquí Coyo se pone a pensar. Dale unos segundos: está buscando entre todos los negocios, ofertas, publicaciones de MarketPlace y servicios de tu ciudad para encontrarte justo lo que pediste."**
>
> `[Pantalla: el bloque cambia a "Coyo encontró esto" con las tarjetas de resultados en fila]`
> **"Y listo: Coyo te responde con algunas recomendaciones. Tócalas para ver el detalle."**
>
> `[Pantalla: tu pregunta sigue publicada en el feed, debajo de la respuesta de Coyo]`
> **"Y ojo con esto: encuentre o no encuentre Coyo recomendaciones, tu pregunta se queda publicada aquí, en el feed de tu ciudad. Así cualquier vecino que sepa te puede echar la mano y responderte."**
>
> `[Pantalla: en una pregunta de otro vecino tocas "Comentar" y escribes en el campo "Responde a tu vecino…"]`
> **"Y tú también puedes ayudar a otro vecino: entra a cualquier pregunta de la comunidad, toca 'Comentar' y deja tu recomendación."**
>
> `[Pantalla: en la barra tocas el interruptor "Comunidad · Mis preguntas"]`
> **"Con este botón cambias entre 'Comunidad', para ver lo que pregunta la gente, y 'Mis preguntas', para seguir las tuyas."**
>
> `[Pantalla: muestras las secciones de la app]`
> **"Y tienes todas las secciones para explorar: Negocios, MarketPlace, Ofertas y Servicios. Échale un ojo… ¡y bienvenido a AnunciaYA!"**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Abre AnunciaYA en tu ciudad.
2. En **"Pregúntale a Coyo"**, escribe lo que buscas.
3. Dale enviar y espera un momento: **Coyo está pensando**.
4. **Coyo** te responde con negocios, ofertas y servicios cerca; tócalos para ver el detalle.
5. Encuentre o no Coyo, **tu pregunta queda en el feed de tu ciudad** y cualquier vecino puede responderte. Entra a otras preguntas y toca **"Comentar"** para ayudar tú también.
6. Cambia entre **Comunidad** y **Mis preguntas** para seguir las tuyas.

---

### 🎬 U-06 — "Encuentra negocios cerca y contáctalos" · 👤 · celular 9:16 · ~60-80 seg

> **Nota:** guion **genérico** (sirve para cualquier ciudad). El header muestra el nombre de la ciudad de forma dinámica ("En [tu ciudad] · N negocios"), así que en la narración no se fija ninguna ciudad. Nombres verificados contra la app real.

> `[Pantalla: desde el inicio, entras a la sección Negocios. Carga el listado; el header dice "Negocios Locales" y "En [tu ciudad] · N negocios"]`
> **"¿Buscas una tienda, un taller o un restaurante cerca de ti? En la sección Negocios los tienes todos, los de tu ciudad, en un solo lugar."**
>
> `[Pantalla: tocas el chip "Cerca de ti"; aparece el chip secundario "● 5 km ▾" y mueves el slider del radio]`
> **"Toca 'Cerca de ti' para ver solo lo que tienes alrededor. Y si quieres, ajusta cuántos kilómetros a la redonda buscar."**
>
> `[Pantalla: tocas el chip "Categoría" y eliges un giro; luego marcas "A domicilio" o "CardYA"]`
> **"Filtra por categoría —comida, salud, belleza, lo que sea— o marca 'A domicilio' y 'CardYA' para afinar todavía más."**
>
> `[Pantalla: tocas el botón redondo flotante de la derecha para cambiar a Mapa; tocas un pin y sale el globo del negocio]`
> **"Cámbialo a mapa para verlos a tu alrededor. Toca cualquiera y, de un vistazo, ves si está abierto, a qué distancia queda y su calificación."**
>
> `[Pantalla: tocas "Ver Perfil" y entra a la ficha. Señalas el pill de horario y bajas por Ofertas, Catálogo y opiniones]`
> **"Entra a su perfil y ahí está todo: si está abierto ahorita, sus ofertas, su catálogo y lo que opinan otros clientes."**
>
> `[Pantalla: en la fila de contacto tocas ChatYA; luego señalas WhatsApp, el teléfono y la ubicación]`
> **"Y para contactarlo es directo: escríbele por ChatYA o WhatsApp, márcale por teléfono, o toca la ubicación para que te lleve. ¡Así de fácil encuentras lo que necesitas cerca!"**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Abre la sección **Negocios** en tu ciudad.
2. Activa **"Cerca de ti"** y ajusta los kilómetros; filtra por **Categoría**, **A domicilio** o **CardYA**.
3. Cambia entre **Lista** y **Mapa**; toca un negocio para ver si está **abierto**, su distancia y su calificación.
4. Entra a **Ver Perfil** para ver horario, **ofertas**, **catálogo** y **opiniones**.
5. Contáctalo por **ChatYA**, **WhatsApp**, **llamada** o toca **Ubicación** para llegar.

---

### 🎬 U-10 — "Compra y vende en MarketPlace (Vendo / Busco)" · 👤 · celular 9:16 · ~75-90 seg

> **Nota:** guion **genérico** (sirve para cualquier ciudad). Textos verificados contra la app real. **Ojo:** el mapa §4 menciona encabezados "Recién publicado" y "Cerca de ti" que **ya no existen** en la versión actual del feed; el orden ahora se controla con los chips "Recientes"/"Más vistos" y el feed no tiene esos títulos. El **toggle del feed** dice "En venta / Se busca"; el **toggle al publicar** dice "Vendo / Busco". El contacto por ChatYA/WhatsApp aparece **al abrir la publicación** (no en la tarjeta del feed).

> `[Entras a MarketPlace. Header "MarketPlace · En [tu ciudad] · N publicaciones". Se ve el feed con fotos]`
> **"Eso que ya no usas, alguien cerca lo necesita. En MarketPlace compras y vendes de todo, aquí en tu ciudad."**
>
> `[Deslizas el feed; señalas foto, precio y distancia. Tocas el toggle "En venta / Se busca"]`
> **"Desliza y mira lo que hay: cada publicación trae foto, precio y qué tan cerca está. Con este botón cambias entre lo que está 'En venta'… y lo que la gente anda buscando, en 'Se busca'."**
>
> `[Tocas "Categoría" y eliges una; o abres la lupa para buscar]`
> **"Filtra por categoría, o usa la lupa para buscar algo específico."**
>
> `[Tocas una publicación para abrirla; en la barra de abajo tocas ChatYA y señalas WhatsApp]`
> **"¿Te interesó algo? Ábrelo para ver todos los detalles y contacta al vendedor directo por ChatYA o WhatsApp. Sin intermediarios."**
>
> `[Tocas el botón "Publicar" (o la barra "¿Qué estás vendiendo hoy?"). Eliges "Vendo" o "Busco"]`
> **"¿Y para vender lo tuyo? Toca 'Publicar'. Elige si 'Vendes' algo… o si 'Buscas' algo que necesitas."**
>
> `[Llenas el formulario: foto, título, categoría, precio, tu zona; tocas "Publicar"]`
> **"Súbele una foto, ponle título, categoría, precio y tu zona… y dale 'Publicar'. Listo: ya te vieron los vecinos de tu ciudad."**
>
> `[Vuelves al feed con tu publicación arriba]`
> **"Así de fácil compras y vendes en tu comunidad con AnunciaYA."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Abre **MarketPlace** en tu ciudad.
2. Desliza el feed; cambia entre **"En venta"** y **"Se busca"**, filtra por **Categoría** o busca con la lupa.
3. Abre una publicación y contacta al vendedor por **ChatYA** o **WhatsApp**.
4. Para vender, toca **"Publicar"** y elige **Vendo** o **Busco**.
5. Agrega **foto, título, categoría, precio y zona**, y toca **"Publicar"**.

---

### 🎬 U-19 — "Junta puntos con CardYA y canjea recompensas" · 👤 · celular 9:16 · ~70-90 seg

> **Nota:** guion **genérico** (sirve para cualquier ciudad). Textos verificados contra la app real. **Ojo:** el mapa §4 dice 3 pestañas (Billeteras/Recompensas/Historial), pero la app tiene **4**: "Billeteras · Recompensas · Vouchers · Historial". CardYA **no explica en pantalla cómo se ganan los puntos**, por eso el guion lo aclara (se ganan comprando en negocios afiliados). Los **niveles** (Bronce/Plata/Oro) solo aparecen en negocios que los tienen activos.

> `[Abres CardYA. Header "CardYA · Tus recompensas y beneficios". Se ve la pestaña "Billeteras"]`
> **"CardYA es tu tarjeta de premios digital. Cada vez que compras en un negocio afiliado, juntas puntos… y después los cambias por recompensas."**
>
> `[En "Billeteras" señalas una billetera con sus "puntos disponibles" y la barra de nivel]`
> **"En 'Billeteras' tienes una por cada negocio, con los puntos que llevas juntados. En algunos hasta subes de nivel: Bronce, Plata y Oro."**
>
> `[Tocas la pestaña "Recompensas"; se ven las recompensas con su costo "X pts"]`
> **"En 'Recompensas' ves todo lo que puedes canjear, y cuántos puntos te cuesta cada premio."**
>
> `[Tocas "Canjear ahora"; aparece el modal "Confirmar Canje"; tocas "Confirmar"]`
> **"¿Ya te alcanza? Toca 'Canjear ahora' y confirma…"**
>
> `[Sale "¡Canje Exitoso!" con el código QR]`
> **"…y listo: se genera tu voucher con un código. Solo lo muestras en el negocio para reclamar tu premio."**
>
> `[Tocas la pestaña "Vouchers" y luego "Historial"; se ven movimientos "Ganados"/"Canjeados"]`
> **"Y en 'Vouchers' e 'Historial' llevas el control: tus vales pendientes y todos los puntos que has ganado y canjeado."**
>
> `[Vuelves a la vista general de CardYA]`
> **"Así que ya sabes: compra local, junta puntos con CardYA… y date tus premios."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Abre **CardYA**: aquí juntas puntos comprando en negocios afiliados.
2. En **"Billeteras"** ves tus puntos por cada negocio (y tu nivel: Bronce, Plata, Oro).
3. En **"Recompensas"** mira lo que puedes canjear y su costo en **pts**.
4. Toca **"Canjear ahora"**, revisa y dale **"Confirmar"**.
5. Muestra el **código del voucher** en el negocio para reclamar tu premio.
6. Revisa tus **"Vouchers"** y el **"Historial"** de puntos ganados y canjeados.

---

### 🎬 C-01 — "Da de alta tu negocio (Onboarding)" · 🏪 · PC 16:9 · ~90-110 seg

> **Nota:** en PC no se ven títulos grandes de cada paso; el comerciante se orienta con el **indicador lateral** de 8 pasos. Header: "Configuración del negocio". Botones: "Siguiente paso" / "Anterior" / "Finalizar". Al finalizar redirige a Inicio (no hay pantalla de felicitación).

> `[Pantalla: "Configuración del negocio" con el indicador lateral de 8 pasos. Estás en el Paso 1 "Categorías"]`
> **"Vamos a dar de alta tu negocio en AnunciaYA. Son 8 pasos rápidos, y aquí a la izquierda ves tu avance en todo momento."**
>
> `[Paso 1 "Categorías": escribes el nombre del negocio, eliges categoría y hasta 3 subcategorías]`
> **"Primero, el nombre de tu negocio y su categoría. Elige hasta 3 subcategorías para que tus clientes te encuentren fácil."**
>
> `[Paso 2 "Ubicación": llenas dirección y ciudad, y ajustas el pin en el mapa o tocas "Mi Ubicación"]`
> **"Luego tu dirección. Ajusta el pin en el mapa —o toca 'Mi Ubicación'— para que te ubiquen bien."**
>
> `[Paso 3 "Contacto": llenas teléfono, WhatsApp y correo]`
> **"Tus datos de contacto: teléfono, WhatsApp, correo. Con uno basta, pero entre más, mejor."**
>
> `[Paso 4 "Horarios": activas los días y pones apertura y cierre; usas "Duplicar"]`
> **"Tus horarios: marca los días que abres y tu hora de apertura y cierre. Con 'Duplicar' copias el mismo a toda la semana."**
>
> `[Paso 5 "Imágenes": subes logo, portada y galería]`
> **"Ahora las fotos: tu logo, una portada y algunas de tu negocio. Esto es lo que más engancha, así que ponle tus mejores imágenes."**
>
> `[Paso 6 "Pagos": activas Efectivo, Tarjeta o Transferencia]`
> **"Marca cómo te pueden pagar: efectivo, tarjeta o transferencia."**
>
> `[Paso 7 "Puntos": activas "¿Participar en CardYA?"]`
> **"Activa CardYA para que tus clientes junten puntos contigo y regresen. Los detalles los ajustas después."**
>
> `[Paso 8 "Productos": tocas "Agregar" y subes al menos 3 productos o servicios]`
> **"Y por último, agrega al menos 3 productos o servicios para arrancar."**
>
> `[Tocas "Finalizar"]`
> **"Le das 'Finalizar'… ¡y tu negocio ya está en AnunciaYA! Todo lo demás lo administras desde Business Studio."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **"Configuración del negocio"** (8 pasos), Paso 1: **nombre**, **categoría** y hasta **3 subcategorías**.
2. **Ubicación**: dirección, ciudad y ajusta el **pin en el mapa**.
3. **Contacto**: teléfono, WhatsApp o correo (con uno basta).
4. **Horarios**: marca días y horas; usa **"Duplicar"** para copiar a la semana.
5. **Imágenes**: logo, **portada** (obligatoria) y galería (mínimo 1).
6. **Pagos**: elige al menos uno (Efectivo, Tarjeta, Transferencia).
7. **Puntos**: activa **"¿Participar en CardYA?"** (opcional).
8. **Productos**: agrega al menos 3 y toca **"Finalizar"**.

---

### 🎬 C-04 — "Sube tu primer producto al catálogo" · 🏪 · PC 16:9 · ~60-75 seg

> `[Pantalla: Business Studio, módulo "Catálogo". Se ve el toggle Productos/Servicios y los KPIs Total/Disponibles/Ocultos]`
> **"En 'Catálogo' organizas todo lo que ofreces. Arriba cambias entre Productos y Servicios."**
>
> `[Tocas "Nuevo Producto"; se abre el modal]`
> **"Para subir tu primero, toca 'Nuevo Producto'."**
>
> `[En el modal: agregas imagen, eliges categoría, pones precio y nombre]`
> **"Sube una foto, elige su categoría, y ponle nombre y precio. Si quieres, agrégale una descripción."**
>
> `[Señalas los toggles de visible y destacado]`
> **"Puedes marcarlo como destacado para que salga primero, o dejarlo oculto si aún no está listo."**
>
> `[Tocas "Crear producto"]`
> **"Dale 'Crear producto'… y listo: ya aparece en tu catálogo, visible para tus clientes."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Catálogo** en Business Studio; cambia entre **Productos** y **Servicios** arriba.
2. Toca **"Nuevo Producto"**.
3. Agrega **foto**, elige **categoría**, y pon **nombre** y **precio** (opcional: descripción).
4. Marca **destacado** u **oculto** si lo necesitas.
5. Toca **"Crear producto"**.

---

### 🎬 C-09 — "Configura puntos y recompensas" · 🏪 · PC 16:9 · ~75-90 seg

> **Nota:** el módulo tiene dos vistas con toggle de iconos: **"Sistema de Puntos"** (configuración) y **"Recompensas"**. La config se guarda con un botón flotante; la recompensa se crea desde un modal.

> `[Pantalla: vista "Sistema de Puntos". Se ve la card "Puntos por Compra" con el formato Gasta $__ → Gana __ puntos]`
> **"Aquí configuras tu programa de lealtad CardYA. Primero, cuántos puntos regalas: defines cuánto gasta el cliente para ganar puntos."**
>
> `[Señalas la expiración de puntos y el "Sistema de Niveles" (Bronce/Plata/Oro)]`
> **"Decides si esos puntos expiran o no. Y si quieres, activas niveles —Bronce, Plata y Oro— para premiar con más puntos a tus clientes más frecuentes."**
>
> `[Guardas con el botón flotante de guardar]`
> **"Guarda tus cambios con el botón de abajo."**
>
> `[Cambias a la vista "Recompensas" (icono regalo) y tocas "Nueva"]`
> **"Ahora las recompensas: lo que tus clientes canjean con esos puntos. Toca 'Nueva'."**
>
> `[En el modal: eliges el tipo (Por puntos / Por compras), imagen, puntos requeridos y nombre]`
> **"Elige si se canjea 'Por puntos'… o crea una 'Tarjeta de Sellos': compra tantas veces y la siguiente va gratis. Ponle foto, nombre y cuánto cuesta."**
>
> `[Tocas "Crear recompensa"]`
> **"Dale 'Crear recompensa'… y ya tienes tu primer premio listo para enganchar clientes."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **Sistema de Puntos**, define cuánto se gasta para ganar puntos (**Gasta $X → Gana Y**).
2. Configura si los puntos **expiran** y, opcional, activa **Niveles** (Bronce/Plata/Oro).
3. **Guarda** los cambios.
4. Ve a **Recompensas** y toca **"Nueva"**.
5. Elige tipo (**Por puntos** o **Tarjeta de Sellos**), agrega foto, nombre y costo en puntos.
6. Toca **"Crear recompensa"**.

---

### 🎬 C-06 — "Crea tu primera oferta" · 🏪 · PC 16:9 · ~60-75 seg

> **Nota:** el módulo se llama **"Promociones"** e incluye dos vistas con toggle: **Ofertas** (públicas) y **Cupones** (privados). Este guion cubre una **oferta pública** (modal de una sola pantalla). Tipos exactos: 2x1, 3x2, Envío, Desc. %, Monto $, Otro.

> `[Pantalla: módulo "Promociones", vista "Ofertas". Se ven los KPIs y el toggle Ofertas/Cupones]`
> **"En 'Promociones' creas ofertas para atraer clientes. Arriba puedes cambiar entre Ofertas públicas y Cupones."**
>
> `[Tocas "Nueva Oferta"; se abre el modal]`
> **"Para tu primera oferta, toca 'Nueva Oferta'."**
>
> `[En el modal: eliges el tipo de promoción de la rejilla]`
> **"Elige el tipo: un descuento por porcentaje, un monto fijo, 2x1, 3x2 o envío gratis."**
>
> `[Pones el valor, el producto o servicio, y la vigencia (Inicio/Fin); subes una imagen]`
> **"Ponle el valor, a qué producto o servicio aplica, y desde cuándo y hasta cuándo está vigente. Y súbele una foto llamativa."**
>
> `[Tocas "Crear oferta"]`
> **"Dale 'Crear oferta'… y ya está publicada, lista para que tus clientes la vean en AnunciaYA."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Promociones** (Business Studio); arriba cambias entre **Ofertas** y **Cupones**.
2. Toca **"Nueva Oferta"**.
3. Elige el **tipo**: Desc. %, Monto $, 2x1, 3x2 o Envío.
4. Pon el **valor**, el **producto o servicio** y la **vigencia** (Inicio/Fin); agrega una **foto**.
5. Toca **"Crear oferta"**.

---

### 🎬 C-· — "Actualiza la info de tu negocio (Mi Perfil)" · 🏪 · PC 16:9 · ~70-85 seg

> **Nota:** las **imágenes** (logo, portada, galería) y el toggle de CardYA se guardan **al instante**; el resto de campos se guardan con un **botón flotante** que aparece abajo cuando hay cambios.

> `[Pantalla: Business Studio, módulo "Mi Perfil". Se ven las pestañas Negocio · Contacto · Ubicación · Horarios · Imágenes · Operación]`
> **"En 'Mi Perfil' actualizas toda la información de tu negocio cuando quieras. Está organizado en pestañas."**
>
> `[Pestaña "Negocio": nombre, descripción, categoría]`
> **"En 'Negocio' cambias el nombre, la descripción y tu categoría."**
>
> `[Pestaña "Contacto": teléfono, WhatsApp, correo, redes sociales]`
> **"En 'Contacto', tus teléfonos, tu correo y tus redes sociales."**
>
> `[Pestañas "Ubicación" y "Horarios"]`
> **"En 'Ubicación' ajustas tu dirección en el mapa, y en 'Horarios' cuándo abres."**
>
> `[Pestaña "Imágenes": Logo, Portada, Galería con "Cambiar"]`
> **"En 'Imágenes' cambias tu logo, tu portada y tu galería. Estas se guardan al instante."**
>
> `[Pestaña "Operación": métodos de pago y opciones de entrega]`
> **"Y en 'Operación', cómo te pagan y si haces envíos o servicio a domicilio."**
>
> `[Haces un cambio y aparece el botón flotante de guardar]`
> **"Cuando cambias algo, abajo aparece el botón para guardar. Dale, y tu perfil queda actualizado."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Mi Perfil** en Business Studio (pestañas Negocio, Contacto, Ubicación, Horarios, Imágenes, Operación).
2. **Negocio**: nombre, descripción y categoría.
3. **Contacto**: teléfonos, correo, sitio web y redes sociales.
4. **Ubicación** y **Horarios**: dirección en el mapa y días/horas de atención.
5. **Imágenes**: logo, portada y galería (se guardan al instante).
6. **Operación**: métodos de pago y opciones de entrega.
7. Guarda con el **botón flotante** cuando aparezca.

---

### 🎬 C-· — "Da de alta a tus empleados (y su PIN para ScanYA)" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** el PIN es de **exactamente 4 dígitos**. No hay "roles"; se configuran **5 permisos** por toggle. La sucursal se toma de la sucursal activa (no se elige en el modal).

> `[Pantalla: módulo "Empleados" ("Gestión de equipo"), KPIs Total/Activos/Inactivos]`
> **"En 'Empleados' das de alta a tu equipo para que te ayuden a operar, sobre todo en ScanYA, tu punto de venta."**
>
> `[Tocas "Nuevo empleado"]`
> **"Toca 'Nuevo empleado'."**
>
> `[Modal: "Nombre completo", "Nick" y "PIN" de 4 dígitos]`
> **"Ponle su nombre, un nick y un PIN de 4 dígitos. Con ese PIN tu empleado entra a ScanYA para registrar ventas."**
>
> `[Sección "Permisos": activas los toggles]`
> **"Y decides qué puede hacer: registrar ventas, procesar canjes, ver el historial, responder chat o reseñas. Le das solo los permisos que necesite."**
>
> `[Tocas "Crear empleado"]`
> **"Dale 'Crear empleado'… y ya puede empezar a trabajar contigo."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Empleados** en Business Studio y toca **"Nuevo empleado"**.
2. Pon **nombre completo**, **nick** y un **PIN de 4 dígitos** (con ese PIN entra a ScanYA).
3. Activa sus **Permisos**: Registrar ventas, Procesar canjes, Ver historial, Responder chat, Responder reseñas.
4. Toca **"Crear empleado"**.

---

### 🎬 C-· — "Agrega una sucursal" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** módulo exclusivo del **dueño**. Al crear una sucursal se **clonan de la Matriz** horarios, métodos de pago, imágenes, catálogo y ofertas. La Matriz no se puede eliminar. Para editar una sucursal, el botón lleva a **Mi Perfil** con esa sucursal activa.

> `[Pantalla: módulo "Sucursales" ("Gestiona tus ubicaciones"), KPIs]`
> **"Si tu negocio tiene más de una ubicación, en 'Sucursales' las administras todas."**
>
> `[Tocas "Nueva sucursal" (o "Agregar sucursal")]`
> **"Para agregar una, toca 'Nueva sucursal'."**
>
> `[Modal: nombre, ciudad, dirección y ubicación en el mapa]`
> **"Ponle nombre, su ciudad, y ajusta su ubicación en el mapa."**
>
> `[Señalas el bloque "Se copiarán automáticamente de este Negocio:"]`
> **"Y lo mejor: tus horarios, pagos, imágenes, catálogo y ofertas se copian solitos desde tu Matriz."**
>
> `[Tocas "Crear sucursal"; sale la animación "¡Sucursal creada!"]`
> **"Dale 'Crear sucursal'… y en segundos queda lista."**
>
> `[Señalas el selector de sucursal en la franja de arriba ("1 de 3")]`
> **"Después, aquí arriba cambias entre tus sucursales cuando quieras."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Sucursales** (solo el dueño) y toca **"Nueva sucursal"**.
2. Pon **nombre**, **ciudad** y ajusta la **ubicación en el mapa**.
3. Se **copian de tu Matriz**: horarios, pagos, imágenes, catálogo y ofertas.
4. Toca **"Crear sucursal"**.
5. Cambia entre sucursales con el **selector** de la franja superior.

---

### 🎬 C-· — "Publica una vacante" · 🏪 · PC 16:9 · ~60-75 seg

> **Nota:** el formulario es un **wizard lateral de 3 pasos** (Puesto · Descripción · Horarios). La vacante aparece en la sección pública **"Servicios"** y los candidatos contactan por ChatYA o WhatsApp.

> `[Pantalla: módulo "Vacantes" ("Publica y gestiona tus ofertas de empleo"), KPIs Total/Activas/Por expirar/Chats]`
> **"¿Necesitas contratar? En 'Vacantes' publicas empleos que aparecen en la sección Servicios de AnunciaYA, para gente de tu ciudad."**
>
> `[Tocas "Nueva vacante"; abre el wizard de 3 pasos: Puesto · Descripción · Horarios]`
> **"Toca 'Nueva vacante'. Son 3 pasos."**
>
> `[Paso 1 "Puesto": puesto, tipo de empleo, modalidad]`
> **"Primero el puesto, el tipo de empleo —tiempo completo, medio turno— y la modalidad: presencial, remoto o híbrido."**
>
> `[Paso 2 "Descripción": salario, descripción, requisitos, beneficios]`
> **"Luego el sueldo —o déjalo 'a tratar'—, la descripción, los requisitos y los beneficios."**
>
> `[Paso 3 "Horarios": opcional; confirmas las políticas]`
> **"Al final, el horario si aplica, y confirmas las políticas."**
>
> `[Tocas "Publicar vacante"]`
> **"Dale 'Publicar vacante'… y ya está buscando candidatos. Ellos te escriben directo por ChatYA o WhatsApp."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Vacantes** y toca **"Nueva vacante"** (wizard de 3 pasos).
2. **Puesto**: nombre del puesto, **tipo de empleo** y **modalidad** (Presencial/Remoto/Híbrido).
3. **Descripción**: salario (o "Sueldo a tratar"), descripción, requisitos y beneficios.
4. **Horarios** (opcional) y confirma las políticas.
5. Toca **"Publicar vacante"** — aparece en la sección **Servicios**.

---

### 🎬 C-· — "Crea y envía cupones privados a tus clientes" · 🏪 · PC 16:9 · ~75-90 seg

> **Nota:** este video cubre el **cupón privado** de punta a punta (categoría "Atraer clientes"). Flujo real verificado con Juan: al pulsar **"Crear cupón"** el cupón **NO se envía** todavía — queda en la tabla; el **envío es una acción aparte desde la tabla** (ícono de enviar), junto con **Reenviar / Revocar / Reactivar**. El cliente recibe un **código único** que su empleado valida en **ScanYA** (ver el video de ScanYA "Canjea un cupón privado"). El video corto **"Envía cupones y ofertas por ChatYA"** (categoría "ChatYA para tu negocio") es **aparte** y cubre solo la **difusión por ChatYA** de ofertas y cupones — ver su guion abajo. Los dos NO se pisan.

> `[Pantalla: módulo "Promociones", vista "Cupones". KPIs Total/Activos/Usados/Revocados/Vencidos]`
> **"Los cupones privados son ofertas exclusivas que le mandas directo a un cliente. Aquí en 'Cupones' los creas y los gestionas."**
>
> `[Tocas "Nuevo Cupón"; modal, pestaña "Detalles"]`
> **"Toca 'Nuevo Cupón'. En 'Detalles' eliges el tipo —descuento, monto, 2x1, 3x2 o envío—, el valor, a qué producto o servicio aplica, y su vigencia."**
>
> `[Tocas "Crear cupón"]`
> **"Le das 'Crear cupón'. Ojo: aquí solo se crea; todavía no se le envía a nadie."**
>
> `[En la fila del cupón, tocas el ícono de enviar]`
> **"Ahora, desde la tabla, tocas el botón de enviar y eliges a qué cliente se lo mandas. Le llega un código único a su notificación."**
>
> `[Señalas las acciones de la fila: reenviar / revocar / reactivar]`
> **"Y desde aquí lo controlas todo: lo puedes reenviar, revocarlo para que ya no lo usen, o reactivarlo cuando quieras."**
>
> `[Cierre]`
> **"Tu cliente presenta su código en el negocio, y tu empleado lo valida en ScanYA. Así premias a tus mejores clientes de forma personal."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Promociones → Cupones** y toca **"Nuevo Cupón"**.
2. En **Detalles**: elige **tipo** (Desc. %, Monto $, 2x1, 3x2, Envío), **valor**, **producto o servicio** y **vigencia**.
3. Toca **"Crear cupón"** (se crea, pero **aún no se envía**).
4. En la **tabla**, toca el botón de **enviar** y elige al **cliente**; le llega un **código único**.
5. Gestiona desde la tabla: **Reenviar**, **Revocar** o **Reactivar** el cupón.
6. El cliente presenta su código y tu empleado lo **valida en ScanYA**.

---

### 🎬 C-· — "Gestiona y envía cupones y ofertas por ChatYA" · 🏪 · PC 16:9 · ~60-80 seg

> **Nota:** video de la categoría "ChatYA para tu negocio". Cubre la **gestión desde la tabla** + la **difusión por ChatYA** (es distinto de "Crea y envía cupones privados", que crea el cupón). Acciones reales por fila — **Ofertas:** "Ocultar"/"Mostrar", "Duplicar", "Compartir por ChatYA", "Eliminar". **Cupones:** "Reenviar cupón", "Revocar cupón" / "Reactivar cupón", "Eliminar".

> `[Pantalla: módulo "Promociones", vista "Ofertas". Señalas los íconos de acción de una fila]`
> **"Todas tus ofertas y cupones los gestionas y los compartes desde aquí, en la tabla. Te muestro las acciones."**
>
> `[En una oferta, señalas los íconos: ocultar, duplicar, compartir por ChatYA, eliminar]`
> **"En tus ofertas puedes: ocultarla para que deje de mostrarse, duplicarla para crear otra parecida, compartirla por ChatYA… o eliminarla."**
>
> `[Tocas "Compartir por ChatYA" → selector de destinatarios → "Enviar por ChatYA"]`
> **"Al compartir por ChatYA, eliges a qué clientes de tu ciudad se la mandas, y les llega directo al chat."**
>
> `[Cambias a la vista "Cupones". Señalas los íconos de acción de una fila]`
> **"Y tus cupones tienen sus propias acciones: reenviarlo a un cliente, revocarlo para que ya no lo pueda usar —o reactivarlo—, y también eliminarlo."**
>
> `[Cierre]`
> **"Así tienes todo bajo control: gestionas y haces llegar tus promociones a tus clientes, sin complicarte."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **Promociones**, cada oferta y cupón se gestiona desde los **íconos de su fila**.
2. **Ofertas:** Ocultar/Mostrar, Duplicar, **Compartir por ChatYA**, Eliminar.
3. Al **Compartir por ChatYA**: elige a los clientes y toca **"Enviar por ChatYA"**.
4. **Cupones:** **Reenviar**, **Revocar** (o Reactivar) y Eliminar.

---

### 🎬 C-· — "Activa niveles (Bronce/Plata/Oro)" · 🏪 · PC 16:9 · ~40-55 seg

> **Nota:** reenfocado a **solo niveles** — las tarjetas de sellos y las recompensas ya se cubren en el video "Configura tu sistema de puntos y crea recompensas" (C-09), así que aquí NO se repiten. Los niveles se activan con un switch en "Sistema de Puntos" (cards Bronce/Plata/Oro con Mínimo/Máximo/Multiplicador).

> `[Pantalla: vista "Sistema de Puntos". Activas el switch de la card "Sistema de Niveles"]`
> **"Además de los puntos, puedes premiar a tus clientes más frecuentes con niveles. Actívalos en 'Sistema de Niveles'."**
>
> `[Se ven las cards Bronce / Plata / Oro]`
> **"Tienes tres: Bronce, Plata y Oro. Cada cliente sube según los puntos que acumula."**
>
> `[Señalas mínimo/máximo y multiplicador de cada nivel]`
> **"En cada uno defines desde cuántos puntos empieza… y su multiplicador: entre más alto el nivel, más puntos gana por cada compra."**
>
> `[Cierre]`
> **"Así tus clientes más fieles ganan más rápido… y se quedan contigo."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **Sistema de Puntos**, activa el switch de **Sistema de Niveles**.
2. Tienes 3 niveles: **Bronce, Plata, Oro**.
3. En cada uno define su **mínimo/máximo de puntos** y su **multiplicador**.
4. Guarda los cambios.

---

### 🎬 C-· — "Destaca, oculta o duplica productos entre sucursales" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** todo desde la tabla del **Catálogo**. **Destacar** = estrella; **Ocultar/Mostrar** = ojo; **Duplicar** abre el modal "Duplicar a sucursales" (requiere ≥2 sucursales y ser dueño; botón "Duplicar (N)").

> `[Pantalla: módulo "Catálogo", tabla de productos. Señalas la columna "Destacar" (estrella)]`
> **"En tu catálogo controlas cada producto desde su fila. Con la estrella lo 'Destacas' para que salga primero."**
>
> `[Señalas el ícono del ojo: "Ocultar"/"Mostrar"]`
> **"Con el ojo lo ocultas cuando se te acaba, y lo vuelves a mostrar cuando lo tengas de nuevo."**
>
> `[Tocas "Duplicar" en una fila → modal "Duplicar a sucursales"]`
> **"¿Tienes varias sucursales? Toca 'Duplicar' y elige a cuáles copiar el producto, sin volver a capturarlo."**
>
> `[Seleccionas sucursales y tocas "Duplicar (N)"]`
> **"Marcas las sucursales… y dale 'Duplicar'. Listo: el mismo producto en todas."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **Catálogo**, cada producto se controla desde los íconos de su fila.
2. **Destacar**: la **estrella** lo pone primero.
3. **Ocultar/Mostrar**: el **ojo** lo esconde o lo vuelve a mostrar.
4. **Duplicar entre sucursales**: toca **"Duplicar"**, elige las sucursales y toca **"Duplicar (N)"** (necesitas ≥2 sucursales).

---

### 🎬 C-· — "Gestiona tu membresía y tu método de cobro" · 🏪 · PC 16:9 · ~65-80 seg

> **Nota:** vive en **Mi Perfil → tab "Membresía y Pagos" → "Membresía"** (visible solo con negocio comercial). No hay literal "$864/mes" en esta vista. Botones de método: "Actualizar tarjeta", "Desactivar cobro automático", "Activar cobro automático".

> `[Pantalla: Mi Perfil → "Membresía y Pagos", vista "Membresía". Card "Tu membresía" con el estado]`
> **"En 'Membresía y Pagos' ves el estado de tu membresía: si estás 'Al corriente', tu método de cobro y tu próximo pago."**
>
> `[Señalas "Historial de pagos" y el botón "Descargar recibo"]`
> **"Abajo tienes tu historial de pagos, y de cada uno puedes descargar tu recibo."**
>
> `[Señalas los botones: "Desactivar cobro automático" / "Activar cobro automático"]`
> **"Y aquí cambias cómo pagas: si estás con tarjeta automática, puedes actualizarla o desactivar el cobro automático para pagar por transferencia. Y al revés, activarlo cuando quieras."**
>
> `[Cierre]`
> **"Así llevas el control de tu membresía sin salir de la app."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **Mi Perfil → Membresía y Pagos → Membresía**.
2. Revisa el **estado** ("Al corriente"), tu **método de cobro** y tu **próximo cobro**.
3. En **Historial de pagos**, usa **"Descargar recibo"**.
4. Cambia el método: **"Desactivar cobro automático"** (tarjeta → transferencia) o **"Activar cobro automático"** (transferencia → tarjeta).

---

### 🎬 C-· — "Paga manualmente con comprobante o recupera tu tarjeta" · 🏪 · PC 16:9 · ~65-80 seg

> **Nota:** mismo tab **"Membresía y Pagos"**. Pago manual: card "Pagar por transferencia o depósito" → modal (meses 1/3/6/12, "Subir foto del comprobante", "Enviar" → "Pago en revisión"). Recuperar tarjeta morosa: botón "Actualizar tarjeta y reintentar pago" (abre el portal de Stripe), aparece solo con morosidad.

> `[Pantalla: tab "Membresía y Pagos". Card "Pagar por transferencia o depósito"]`
> **"Si prefieres pagar por transferencia o depósito, toca 'Pagar por transferencia o depósito'."**
>
> `[Modal: datos de cobro (Banco, CLABE) y "¿Cuántos meses pagas?"]`
> **"Ahí ves los datos para depositar y eliges cuántos meses pagas: 1, 3, 6 o hasta 12, que es el plan anual."**
>
> `[Subes el comprobante ("Subir foto del comprobante") y tocas "Enviar"]`
> **"Sube la foto de tu comprobante y dale 'Enviar'. Un administrador lo revisa y se suma a tu vigencia."**
>
> `[Escenario tarjeta morosa: señalas "Actualizar tarjeta y reintentar pago"]`
> **"Y si tu tarjeta falló y tu pago quedó pendiente, con 'Actualizar tarjeta y reintentar pago' actualizas tus datos y se reintenta el cobro al instante."**
>
> `[Cierre]`
> **"Así nunca se te vence la membresía, pagues como pagues."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **Membresía y Pagos**, toca **"Pagar por transferencia o depósito"**.
2. Revisa los **datos de cobro** y elige **cuántos meses** pagas (1/3/6/12).
3. Sube la **foto del comprobante** y toca **"Enviar"** (queda **"Pago en revisión"**).
4. Si tu tarjeta falló, usa **"Actualizar tarjeta y reintentar pago"** para actualizarla y reintentar el cobro.

---

### 🎬 S-01 — "Entra a ScanYA y abre tu turno" · 📟 · tablet/celular · ~50-65 seg

> **Nota:** login con dos modos: **Dueño/Gerente** (correo y contraseña) o **Empleado** (nick + PIN de 4 dígitos, el mismo que se le asigna en Business Studio → Empleados). Abrir turno es un solo botón, sin fondo de caja inicial.

> `[Pantalla: login de ScanYA, toggle "Dueño/Gerente" / "Empleado"]`
> **"Para entrar a ScanYA, tu punto de venta, elige cómo entras: como dueño o gerente, con tu correo y contraseña… o como empleado, con tu nick y tu PIN."**
>
> `[Empleado: escribe nick, teclado numérico PIN de 4 dígitos]`
> **"Si entras como empleado, escribe tu nick y tu PIN de 4 dígitos —el mismo que te dio tu jefe al darte de alta."**
>
> `[Entra a la pantalla principal]`
> **"Y listo, ya estás dentro."**
>
> `[Pantalla: "No tienes un turno abierto", botón "Abrir Turno"]`
> **"Antes de vender, abre tu turno. Toca 'Abrir Turno'."**
>
> `[Turno activo, ResumenTurno con KPIs]`
> **"Y ya quedó: ahora ves tus ventas, tus puntos otorgados y el total vendido en tu turno, en tiempo real."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En el login de ScanYA, elige **"Dueño/Gerente"** (correo y contraseña) o **"Empleado"** (nick y PIN de 4 dígitos).
2. Confirma tu acceso.
3. En la pantalla principal, toca **"Abrir Turno"**.
4. Con el turno activo, ves tus KPIs: **Ventas, Puntos, Total $ y Vouchers**.

---

### 🎬 S-02 — "Registra una venta, otorga puntos y aplica cupones" · 📟 · tablet/celular · ~65-80 seg

> **Nota:** el **cupón privado NO tiene pantalla propia** — se valida dentro del mismo modal "Registrar Venta" (campo opcional "Código de Cupón"), por eso este video incluye cupones y no hay un video aparte de "canjear cupón" (decisión 14-jul-2026, evita redundancia con S-02).

> `[Toca "Registrar Venta"]`
> **"Para registrar una venta, toca 'Registrar Venta'."**
>
> `[Escribe teléfono del cliente a 10 dígitos; aparece su nombre y nivel]`
> **"Primero, el teléfono del cliente. En cuanto completas los 10 dígitos, el sistema lo busca solo y te muestra su nombre y su nivel."**
>
> `[Si trae cupón, escribe en "Código de Cupón"]`
> **"¿Tu cliente trae un cupón? Escríbelo aquí, en 'Código de Cupón', y se aplica el descuento automático."**
>
> `[Pone el Monto, toca "Continuar"]`
> **"Pon el monto de la venta y dale 'Continuar'."**
>
> `[Elige Método de Pago: Efectivo/Tarjeta/Transf./Mixto]`
> **"Elige cómo te pagó: efectivo, tarjeta, transferencia, o mixto si combina varias."**
>
> `[Toca "Confirmar Venta"]`
> **"Dale 'Confirmar Venta'…"**
>
> `[Pantalla de éxito "¡Puntos otorgados!"]`
> **"…y listo: se registra tu venta y tu cliente gana sus puntos, automático."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Toca **"Registrar Venta"**.
2. Escribe el **teléfono del cliente** (10 dígitos) — el sistema lo busca solo.
3. Si tiene un cupón, escríbelo en **"Código de Cupón"** para aplicar el descuento.
4. Pon el **Monto** y toca **"Continuar"**.
5. Elige el **Método de Pago** (Efectivo, Tarjeta, Transferencia o Mixto).
6. Toca **"Confirmar Venta"** — tu cliente gana sus puntos automáticamente.

---

### 🎬 S-03 — "Canjea un voucher y cierra tu turno" · 📟 · tablet/celular · ~65-80 seg

> **Nota:** el voucher (recompensa de puntos CardYA) sí tiene pantalla propia — botón "Vouchers" → lista con tabs → "Canjear Voucher" → "Escanear QR" o "Código Manual" (6 dígitos). Es distinto del cupón (ver S-02).

> `[Toca "Vouchers" en los accesos rápidos]`
> **"Cuando un cliente viene a canjear su recompensa de puntos, toca 'Vouchers'."**
>
> `[Lista "Pendientes"; buscas por teléfono si hace falta]`
> **"Ahí ves sus vouchers pendientes. Si no lo encuentras, búscalo por su teléfono."**
>
> `[Tocas el voucher, luego "Canjear Voucher"]`
> **"Toca su voucher, y dale 'Canjear Voucher'."**
>
> `[Eliges "Escanear QR" o "Código Manual"]`
> **"Escanea el código QR que te muestra en su celular… o, si no puede, pídele que te dicte su código de 6 dígitos."**
>
> `[Confirma; sale "¡Voucher Canjeado!"]`
> **"Se canjea al instante. Solo entrégale su recompensa."**
>
> `[Tocas "Cerrar Turno" en el resumen]`
> **"Al terminar tu turno, toca 'Cerrar Turno'."**
>
> `[Resumen: duración, Ventas, Puntos; nota opcional; confirmas]`
> **"Revisa tu resumen: cuántas ventas hiciste y cuántos puntos otorgaste. Si quieres, deja una nota, y confirma."**
>
> `[Cierre]`
> **"Y tu turno queda cerrado. Así de simple es operar con ScanYA."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Toca **"Vouchers"** en los accesos rápidos.
2. Busca al cliente (por teléfono si hace falta) y toca su voucher pendiente.
3. Toca **"Canjear Voucher"** y elige **"Escanear QR"** o **"Código Manual"** (6 dígitos).
4. Confirma — verás **"¡Voucher Canjeado!"**; entrega la recompensa.
5. Al terminar, toca **"Cerrar Turno"**.
6. Revisa el resumen (Ventas, Puntos), agrega una nota si quieres, y confirma.

---

### 🎬 C-02 — "Entiende tu Dashboard (ventas, ofertas y alertas de un vistazo)" · 🏪 · PC 16:9 · ~60-75 seg

> **Nota:** categoría "Mis Primeros Pasos - Comerciante". Verificado contra capturas reales del Dashboard (14-jul-2026) — módulo distinto de "Reportes" (ver siguiente guion), sin traslape: el Dashboard es el resumen rápido, Reportes es el análisis a fondo.

> `[Pantalla: Dashboard, header "Dashboard · Métricas y actividad". KPIs "$550 Ventas · 1 Clientes · 1 Transacciones"]`
> **"Al entrar a Business Studio, lo primero que ves es tu Dashboard: el resumen de tu negocio en un vistazo. Arriba, tus ventas, tus clientes y tus transacciones."**
>
> `[Filtros de periodo: Hoy / 7 días / 30 días / 3 meses / 1 año]`
> **"Ajusta el periodo que quieras ver —hoy, la semana, el mes— y todo se actualiza."**
>
> `[Card "Ventas del Periodo": gráfica, "Prom/día", "Mejor día"]`
> **"Aquí ves cómo se mueven tus ventas día a día, tu promedio diario y cuál fue tu mejor día."**
>
> `[Card "Ofertas" con vistas y clics de cada una]`
> **"Abajo, tus ofertas activas: cuántas vistas y clics lleva cada una."**
>
> `[Card "Alertas"]`
> **"Y tus alertas: puntos por expirar, vouchers pendientes, clientes VIP inactivos… todo lo que necesita tu atención."**
>
> `[Card "Actividad Reciente"]`
> **"Y a un lado, la actividad reciente: quién te siguió, quién compró, quién dejó una reseña."**
>
> `[Cierre]`
> **"Con un vistazo al Dashboard sabes exactamente cómo va tu negocio hoy."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Al entrar a Business Studio, el **Dashboard** resume tu negocio: Ventas, Clientes y Transacciones.
2. Ajusta el **periodo** (Hoy, 7 días, 30 días, 3 meses, 1 año).
3. En **"Ventas del Periodo"** ves tu gráfica diaria, tu promedio y tu mejor día.
4. En **"Ofertas"** ves las vistas y clics de tus promociones activas.
5. En **"Alertas"** revisas lo que necesita tu atención (puntos por expirar, vouchers, clientes inactivos).
6. En **"Actividad Reciente"** ves seguidores, compras y reseñas nuevas.

---

### 🎬 C-· — "Lee y exporta tus reportes (ventas, clientes, promociones)" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** categoría "Análisis". Verificado contra capturas reales del módulo (14-jul-2026).

> `[Pantalla: módulo "Reportes", header "Reportes · Análisis detallado de tu negocio". KPIs "$550 Total vendido · $550 Venta promedio · 1 Transacciones · 0 Canceladas"]`
> **"En 'Reportes' vas más a fondo: aquí analizas tu negocio con lupa."**
>
> `[Tabs: Ventas / Clientes / Operador / Promociones / Reseñas]`
> **"Tienes pestañas para cada cosa: Ventas, Clientes, Operador, Promociones y Reseñas."**
>
> `[Selector de fechas y accesos rápidos 7 días/30 días/3 meses/1 año/Todo]`
> **"Elige el rango de fechas exacto, o usa los accesos rápidos."**
>
> `[Tablas: "Total vendido por día de la semana", "Métodos de pago", "Horarios pico"]`
> **"Ves tus ventas por día de la semana, cómo te pagan tus clientes, y tus horarios pico: cuándo vendes más."**
>
> `[Botón "Exportar"]`
> **"Y si necesitas los datos para tu contador o para analizarlos aparte, toca 'Exportar'."**
>
> `[Cierre]`
> **"Así tomas mejores decisiones para tu negocio, con datos reales."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **"Reportes"** para el análisis detallado de tu negocio.
2. Cambia entre pestañas: **Ventas, Clientes, Operador, Promociones y Reseñas**.
3. Elige el **rango de fechas** (o usa los accesos rápidos: 7 días, 30 días, 3 meses, 1 año, Todo).
4. Revisa tus **ventas por día**, tus **métodos de pago** y tus **horarios pico**.
5. Toca **"Exportar"** para descargar tus datos.

---

### 🎬 C-· — "Mide el desempeño de tus promociones (vistas, clics, canjes)" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** categoría "Atraer Clientes". Las métricas viven en dos lugares: iconos rápidos (Vistas/Clics/Shares) en la tabla de Ofertas, y el detalle completo en Reportes → pestaña Promociones. Los Cupones NO muestran esas 3 columnas en su tabla (son privados) — solo su Estado.

> `[Pantalla: módulo "Promociones", vista "Ofertas". Señalas los iconos de vistas/clics/shares en una fila]`
> **"¿Quieres saber si tus ofertas están funcionando? Aquí mismo, en cada fila, ves sus vistas, sus clics y cuántas veces se compartió."**
>
> `[Cambias a "Cupones"; solo se ve su Estado]`
> **"Los cupones no muestran estos números aquí —son privados—, pero sí ves su estado: activo, usado o vencido."**
>
> `[Vas a "Reportes", pestaña "Promociones"]`
> **"Para el detalle completo, ve a 'Reportes', pestaña 'Promociones'."**
>
> `[Tocas "Ofertas (públicas)" → "Detalle de Ofertas" con tabla ordenable]`
> **"Toca 'Ofertas' y ves la tabla completa: vistas, clics y compartidos de cada una, ordenable como quieras."**
>
> `[Tocas "Cupones (privados)" → "Detalle de Cupones"]`
> **"Y en 'Cupones' ves cuántos enviaste, cuántos se canjearon, cuántos se vencieron o revocaste."**
>
> `[Señalas "Mejor oferta" / "Mejor cupón"]`
> **"Aquí también ves cuál es tu mejor oferta y tu mejor cupón: el que más canjes o clics tuvo."**
>
> `[Cierre]`
> **"Así sabes qué promociones sí funcionan… y repites la fórmula."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En **Promociones → Ofertas**, cada fila muestra sus **Vistas, Clics y Shares**.
2. Los **Cupones** no muestran esos números en la tabla (son privados); solo su **Estado**.
3. Para el detalle completo, ve a **Reportes → Promociones**.
4. Toca **"Ofertas (públicas)"** o **"Cupones (privados)"** para ver la tabla completa y ordenable.
5. Revisa las cards **"Mejor oferta"** y **"Mejor cupón"** para ver lo que más funciona.

---

### 🎬 C-14 — "Responde a tus clientes por ChatYA (desde BS y ScanYA) y ve su billetera" · 🏪 · PC 16:9 · ~60-75 seg

> **Nota:** categoría "ChatYA para tu Negocio". El botón "Ver detalle del cliente" **NO aparece en ScanYA** (roles de ScanYA solo ven la info básica: puntos, nivel, última compra). Si el cliente no tiene compras registradas, el panel muestra "Sin billetera aquí".

> `[Pantalla: Business Studio, tocas el ícono rojo de ChatYA en el Navbar; se abre la lista de conversaciones]`
> **"Desde Business Studio, toca el ícono de ChatYA para ver todos tus chats con clientes."**
>
> `[Tocas una conversación; se abre la ventana de chat]`
> **"Toca cualquier chat para responder. Ahí ves si tu cliente está en línea o escribiendo, y le contestas normal, como cualquier chat."**
>
> `[Tocas el nombre/avatar del cliente en el header; panel lateral con "Nivel", "Puntos disponibles", "Última compra"]`
> **"Y esto es lo mejor: toca su nombre arriba, y del lado derecho ves su billetera con este negocio —su nivel, sus puntos disponibles y su última compra— sin salir del chat."**
>
> `[Señalas "Ver detalle del cliente"]`
> **"Si necesitas más información, toca 'Ver detalle del cliente' para su ficha completa."**
>
> `[Cambias a ScanYA; tocas el ícono de ChatYA en los accesos rápidos]`
> **"Y si estás en el mostrador, en ScanYA también tienes acceso directo a ChatYA, con el mismo ícono."**
>
> `[Cierre]`
> **"Así respondes a tus clientes y conoces su historial contigo, todo en un solo lugar."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En Business Studio, toca el **ícono rojo de ChatYA** para ver tus conversaciones.
2. Abre un chat y responde normal, viendo si está **en línea** o **escribiendo**.
3. Toca el **nombre del cliente** arriba para ver su billetera: **Nivel, Puntos disponibles y Última compra**.
4. Toca **"Ver detalle del cliente"** para su ficha completa (solo en Business Studio).
5. En **ScanYA**, el mismo ícono de ChatYA te da acceso directo desde el mostrador.

---

### 🎬 C-· — "Usa el Directorio comercial de tu ciudad" · 🏪 · PC 16:9 · ~50-65 seg

> **Nota:** categoría "ChatYA para tu Negocio". El Directorio vive dentro de "Contactos" → sub-pestaña "Directorio" (solo visible en modo comercial). Si la sucursal no tiene ciudad asignada, la app muestra el mismo mensaje vacío que "sin usuarios" — sin distinguir la causa en pantalla, por eso no se promete explicarlo visualmente.

> `[Pantalla: ChatYA abierto en modo comercial. Tocas "Contactos"]`
> **"¿Sabías que puedes contactar a cualquier persona de tu ciudad, aunque nunca te haya escrito? Toca 'Contactos'."**
>
> `[Sub-pestañas "Mis contactos" / "Directorio"; tocas "Directorio"]`
> **"Aquí tienes dos pestañas: 'Mis contactos', los que ya guardaste, y 'Directorio': todos los usuarios de AnunciaYA en tu ciudad."**
>
> `[Buscas con "Buscar contacto..."]`
> **"Búscalos por nombre con el buscador de arriba."**
>
> `[Tocas a una persona → se abre el chat directo]`
> **"Toca a quien quieras y se abre el chat directo con esa persona, así nunca te haya contactado antes."**
>
> `[Señalas el ícono de guardar contacto]`
> **"Si quieres tenerlo a la mano después, guárdalo con este ícono, y pasa a 'Mis contactos'."**
>
> `[Cierre]`
> **"Así llegas tú primero a los vecinos de tu ciudad, sin esperar a que ellos te encuentren."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En ChatYA (modo comercial), toca **"Contactos"**.
2. Cambia a la pestaña **"Directorio"**: todos los usuarios de AnunciaYA en tu ciudad.
3. Búscalos por nombre con **"Buscar contacto..."**.
4. Toca a cualquier persona para abrir un **chat directo** con ella.
5. Guárdala con el ícono correspondiente para encontrarla luego en **"Mis contactos"**.

---

### 🎬 C-· — "Responde las opiniones de tus clientes" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** categoría "Clientes, Opiniones y Alertas". No existe filtro "Respondidas" — solo "Todas" y "Pendientes". No hay opción de eliminar una respuesta ya publicada, solo editarla.

> `[Pantalla: módulo "Opiniones · Reseñas de tus clientes". KPIs: Promedio, Total, Pendientes]`
> **"En 'Opiniones' ves todas las reseñas de tus clientes: tu calificación promedio, el total, y cuántas te faltan por responder."**
>
> `[Filtras por estrellas "5★" a "1★" o el chip "Pendientes"]`
> **"Filtra por calificación, o toca 'Pendientes' para ver solo las que aún no has contestado."**
>
> `[Tocas una reseña; se abre el panel de detalle]`
> **"Toca una reseña para verla completa y responderla."**
>
> `[Usas una plantilla rápida: "Agradecimiento"/"Disculpa"/"Invitación"]`
> **"Si no sabes qué decir, usa una respuesta rápida: 'Agradecimiento', 'Disculpa' o 'Invitación' según el caso, y edítala a tu gusto."**
>
> `[Escribes en el textarea y envías]`
> **"Escribe tu respuesta y envíala. Así de fácil."**
>
> `[Cierre]`
> **"Responder tus reseñas muestra que te importa lo que opinan tus clientes, y eso genera confianza."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **"Opiniones"** para ver tu calificación promedio y las reseñas pendientes.
2. Filtra por **estrellas** o toca **"Pendientes"** para ver solo las que faltan.
3. Toca una reseña para abrir su detalle.
4. Usa una **respuesta rápida** ("Agradecimiento", "Disculpa", "Invitación") o escribe la tuya (máx. 500 caracteres).
5. Envía tu respuesta — puedes **editarla** después si lo necesitas.

---

### 🎬 C-· — "Conoce a tus clientes: niveles, puntos e historial" · 🏪 · PC 16:9 · ~60-75 seg

> **Nota:** categoría "Clientes, Opiniones y Alertas". Los chips de nivel (Todos/Bronce/Plata/Oro) y el badge de nivel en el modal solo aparecen si el negocio tiene el Sistema de Niveles activo (ver módulo Puntos y Recompensas).

> `[Pantalla: módulo "Clientes · Registro de clientes". KPIs Total/Nuevos/Inactivos]`
> **"En 'Clientes' tienes el registro completo de quiénes te compran: cuántos tienes en total, cuántos son nuevos, y cuántos llevan tiempo sin volver."**
>
> `[Buscas con "Nombre o Celular..."; filtras por nivel Bronce/Plata/Oro]`
> **"Búscalos por nombre o celular, o filtra por nivel: Bronce, Plata u Oro."**
>
> `[Tocas un cliente de la tabla; se abre su ficha]`
> **"Toca cualquiera para ver su ficha completa."**
>
> `[Señalas Disponibles/Acumulados/Canjeados y la barra de progreso al siguiente nivel]`
> **"Ahí ves sus puntos disponibles, acumulados y canjeados, y qué tan cerca está de subir de nivel."**
>
> `[Señalas Total gastado/Promedio compra/Visitas/Vouchers]`
> **"Y sus estadísticas: cuánto ha gastado contigo, su compra promedio, sus visitas y sus vouchers."**
>
> `[Bajas a "Últimas transacciones" y tocas "Ver historial completo"]`
> **"Abajo, sus últimas transacciones, o toca 'Ver historial completo' para todo su historial."**
>
> `[Cierre]`
> **"Así conoces a tus clientes de verdad, y sabes a quién consentir."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **"Clientes"** para ver tu Total, Nuevos e Inactivos.
2. Búscalos por **"Nombre o Celular"** o filtra por **nivel** (Bronce/Plata/Oro).
3. Toca un cliente para abrir su ficha.
4. Revisa sus **Puntos** (Disponibles, Acumulados, Canjeados) y su progreso al siguiente nivel.
5. Revisa sus **Estadísticas** (Total gastado, Promedio de compra, Visitas, Vouchers).
6. Toca **"Ver historial completo"** para todas sus transacciones.

---

### 🎬 C-· — "Revisa y resuelve tus alertas" · 🏪 · PC 16:9 · ~55-70 seg

> **Nota:** categoría "Clientes, Opiniones y Alertas". Hay 16 tipos de alerta en 4 categorías (Seguridad, Operativa, Rendimiento, Engagement) — solo se ven listados por nombre en el modal "Configuración"; en la lista, el título de cada alerta es texto dinámico con datos reales.

> `[Pantalla: módulo "Alertas · Monitoreo y seguridad". KPIs Total/No leídas/Alta/Resueltas]`
> **"En 'Alertas' AnunciaYA te avisa de lo que necesita tu atención: desde ventas raras hasta clientes que dejaron de comprarte."**
>
> `[Filtras por Categoría: Seguridad/Operativa/Rendimiento/Engagement, o por Severidad]`
> **"Filtra por categoría —seguridad, operación, rendimiento o interacción con tus clientes— o por qué tan urgente es."**
>
> `[Tocas una alerta; se abre el detalle con "Datos del evento" y "Acciones sugeridas"]`
> **"Toca cualquiera para ver el detalle: qué pasó, y qué te sugerimos hacer."**
>
> `[Tocas "Marcar como resuelta"]`
> **"Cuando ya la atendiste, dale 'Marcar como resuelta'."**
>
> `[Ícono de engranaje → modal "Configuración"]`
> **"Y en el engranaje de arriba, eliges exactamente qué alertas quieres recibir, y ajustas cuándo se disparan."**
>
> `[Cierre]`
> **"Así no se te escapa nada importante de tu negocio."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **"Alertas"** para ver lo que necesita tu atención: Total, No leídas y de severidad Alta.
2. Filtra por **Categoría** (Seguridad, Operativa, Rendimiento, Engagement) o por **Severidad**.
3. Toca una alerta para ver sus **"Datos del evento"** y **"Acciones sugeridas"**.
4. Toca **"Marcar como resuelta"** cuando ya la atendiste.
5. En el ícono de **engranaje**, activa/desactiva los tipos de alerta y ajusta sus umbrales.

---

### 🎬 C-· — "Revisa tu historial de Transacciones (ventas, cupones y vouchers)" · 🏪 · PC 16:9 · ~80-95 seg

> **Nota:** propuesto para categoría **"Clientes, Opiniones y Alertas"** (el propio proyecto agrupa Clientes+Transacciones en un solo doc de arquitectura, `Clientes_Transacciones.md`) — **confirmar al subir al Panel**. Módulo con 3 vistas por toggle de iconos: **Ventas** ($), **Cupones** (🎫), **Vouchers** (🎁). El botón **"Reporte"** solo existe en Ventas y Cupones, no en Vouchers. Revocar una venta descuenta los puntos otorgados del saldo del cliente; los cupones y vouchers no tienen acción de revocar desde este módulo.

> `[Pantalla: módulo "Transacciones · Historial de ventas". KPIs Ventas/Transacciones/Ticket Prom./Revocadas]`
> **"En 'Transacciones' tienes el historial completo de tus ventas: cuánto has vendido, cuántas transacciones, tu ticket promedio, y cuántas revocaste."**
>
> `[Filtras por periodo, chips "Todas/Válidas/Revocadas", dropdown "Operador", buscador "Nombre o Celular..."]`
> **"Filtra por periodo, por si fue válida o revocada, por el empleado que la atendió, o busca a un cliente por su nombre o celular."**
>
> `[Tocas una fila; se abre el detalle]`
> **"Toca cualquier venta para ver su detalle completo: el desglose, el método de pago, los puntos que otorgó, y quién la atendió."**
>
> `[Tocas "Revocar transacción", escribes el motivo, confirmas]`
> **"¿Te equivocaste en una venta? Desde ahí mismo la revocas: escribe el motivo y confirma. Los puntos que había otorgado se le descuentan al cliente automáticamente."**
>
> `[Ícono de ticket "Cupones"]`
> **"Arriba, con estos iconos, cambias de vista. En 'Cupones' ves cada cupón que se canjeó: cuál, de qué tipo, y su descuento."**
>
> `[Ícono de regalo "Vouchers"]`
> **"Y en 'Vouchers' ves los canjes de recompensas: pendientes, usados o vencidos."**
>
> `[Tocas "Reporte" para exportar]`
> **"Y si necesitas los datos aparte, en 'Reporte' descargas todo con tus filtros aplicados."**
>
> `[Cierre]`
> **"Así tienes control total de cada venta, cupón y voucher de tu negocio."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Entra a **"Transacciones"** para tu historial completo: Ventas, Transacciones, Ticket Prom. y Revocadas.
2. Filtra por **periodo**, **estado** (Todas/Válidas/Revocadas), **operador**, o busca por **Nombre o Celular**.
3. Toca una venta para ver su detalle: desglose, método de pago, puntos y quién la atendió.
4. Si necesitas revocarla, toca **"Revocar transacción"**, escribe el motivo y confirma (los puntos se descuentan del cliente).
5. Cambia de vista con los **iconos de arriba**: **"Cupones"** (canjes de promociones) y **"Vouchers"** (canjes de recompensas).
6. Toca **"Reporte"** para exportar tus datos con los filtros activos.

---

### 🎬 S-· — "Registra ventas sin internet (modo offline)" · 📟 · tablet/celular · ~70-85 seg

> **Nota:** categoría "Operar la caja" (ScanYA). En offline NO se identifica al cliente (solo teléfono); los puntos se otorgan hasta que se "Procesa" el recordatorio con conexión, no al guardarlo.

> `[Badge naranja "SIN CONEXIÓN" en el header]`
> **"¿Se te fue el internet a medio negocio? No hay problema. ScanYA sigue funcionando sin conexión."**
>
> `[El botón cambia solo a "Guardar Recordatorio"]`
> **"El botón cambia solo: en vez de 'Registrar Venta', dice 'Guardar Recordatorio'."**
>
> `[Formulario: teléfono, monto, método de pago; texto "Sin conexión: se guardará para procesar después"]`
> **"Captura el teléfono del cliente, el monto y cómo te pagó. Sin internet no podemos identificar al cliente automáticamente, pero no te preocupes: se guarda todo para procesarlo después."**
>
> `[Tocas "Guardar Recordatorio"; toast "Recordatorio Guardado"]`
> **"Dale 'Guardar Recordatorio'… y queda ahí, esperando."**
>
> `[Tocas "Offline" en accesos rápidos; se abre "Ventas Offline"]`
> **"Todas tus ventas guardadas las ves en 'Offline', en accesos rápidos."**
>
> `[Regresa el internet; aviso "¡Tienes X venta(s) por procesar!"]`
> **"En cuanto regrese tu internet, te avisamos: '¡Tienes ventas por procesar!'."**
>
> `[Tocas "Procesar" en una tarjeta; se completa la venta y otorga puntos]`
> **"Entra, toca 'Procesar' en cada una… y ahí sí se registra la venta y se otorgan los puntos a tu cliente."**
>
> `[Cierre]`
> **"Así nunca dejas de vender, ni con el internet caído."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Sin conexión, verás el badge **"SIN CONEXIÓN"** y el botón cambia a **"Guardar Recordatorio"**.
2. Captura el teléfono del cliente, el monto y el método de pago (no se identifica al cliente hasta procesar).
3. Toca **"Guardar Recordatorio"** — queda guardado localmente.
4. Consulta tus ventas guardadas en **"Offline"** (accesos rápidos).
5. Al regresar tu internet, toca **"Procesar"** en cada tarjeta para registrar la venta y otorgar los puntos.

---

### 🎬 S-· — "Consulta el historial del turno y filtra (período / empleado)" · 📟 · tablet/celular · ~55-70 seg

> **Nota:** categoría "Avanzado" (ScanYA). El título cambia según el rol: dueño/gerente ven "Historial de Transacciones", empleado ve "Mi Historial". El filtro por empleado solo lo ven dueño y gerente.

> `[Tocas "Historial de Transacciones" en accesos rápidos]`
> **"Para revisar tus ventas pasadas, toca 'Historial de Transacciones'."**
>
> `[Filtras por período: Hoy/Semana/Mes/3M/Año]`
> **"Filtra por el período que quieras ver: hoy, la semana, el mes, o hasta un año atrás."**
>
> `[Dueño/Gerente: filtras por "Operador"]`
> **"Si eres dueño o gerente, también filtras por empleado, para ver las ventas de alguien en específico."**
>
> `[Lista con cliente, monto, fecha]`
> **"Ahí ves cada venta: quién compró, cuánto, y cuándo."**
>
> `[Tocas una fila; se abre "Detalle de venta"]`
> **"Toca cualquiera para ver el detalle completo: el desglose, el método de pago, los puntos otorgados y quién la atendió."**
>
> `[Cierre]`
> **"Así llevas control de todo lo que ha pasado en tu caja."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Toca **"Historial de Transacciones"** en los accesos rápidos.
2. Filtra por **período** (Hoy, Semana, Mes, 3M, Año).
3. Si eres dueño o gerente, filtra también por **empleado** ("Operador").
4. Revisa cada venta: cliente, monto y fecha.
5. Toca una fila para ver su detalle completo.

---

### 🎬 S-· — "Consulta y gestiona los vouchers de tus clientes" · 📟 · tablet/celular · ~55-70 seg

> **Nota:** categoría "Recompensas" (ScanYA). Es la vista de LISTA/gestión — la acción de canjear un voucher individual ya está cubierta en "Canjea un voucher (QR o código) y cierra tu turno". Los empleados solo ven la tab "Pendientes".

> `[Tocas "Vouchers" en accesos rápidos]`
> **"En 'Vouchers' no solo canjeas: aquí también consultas y organizas todos los de tus clientes."**
>
> `[Tabs "Pendientes" / "Usados" / "Vencidos"]`
> **"Cambia entre 'Pendientes', 'Usados' y 'Vencidos' para ver en qué estado está cada uno."**
>
> `[Buscas con "Buscar cliente específico"]`
> **"¿Buscas los de un cliente en particular? Toca 'Buscar cliente específico' y pon su teléfono."**
>
> `[Dueño/Gerente, en "Usados": filtras por Operador]`
> **"Si eres dueño o gerente, en 'Usados' también filtras por qué empleado los canjeó."**
>
> `[Cierre]`
> **"Así siempre sabes qué recompensas tienen pendientes tus clientes, y cuáles ya se entregaron."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Toca **"Vouchers"** en los accesos rápidos.
2. Cambia entre las pestañas **"Pendientes"**, **"Usados"** y **"Vencidos"**.
3. Usa **"Buscar cliente específico"** para ver los vouchers de alguien en particular.
4. (Dueño/Gerente) En **"Usados"**, filtra también por empleado.

---

### 🎬 S-· — "Cambia de sucursal en ScanYA" · 📟 · tablet/celular · ~45-60 seg

> **Nota:** categoría "Avanzado" (ScanYA). Solo lo ve el **dueño** con más de 1 sucursal. Si el turno actual ya tiene ventas registradas, pide confirmación (se cierra ese turno y abre uno nuevo); si está vacío, cambia directo sin avisar.

> `[Tocas el chip/ícono junto al nombre del negocio]`
> **"Si tu negocio tiene varias sucursales, cambia entre ellas tocando aquí, junto al nombre de tu negocio."**
>
> `[Se abre "Cambiar de sucursal"; lista con "Matriz" y las demás]`
> **"Elige a cuál quieres cambiarte."**
>
> `[Si tu turno tiene ventas, aparece la confirmación]`
> **"Si tu turno actual ya tiene ventas registradas, te lo advertimos: se cierra ese turno y se abre uno nuevo en la otra sucursal."**
>
> `[Confirmas; "Ahora estás en {sucursal}"]`
> **"Confirmas… y listo, ya estás operando en la otra sucursal."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Si tienes más de una sucursal, toca el selector junto al nombre de tu negocio (solo el dueño lo ve).
2. Elige la sucursal a la que quieres cambiarte.
3. Si tu turno actual ya tiene ventas, confirma: se cierra ese turno y se abre uno nuevo en la sucursal elegida.
4. Listo — ya estás operando ahí.

---

### 🎬 S-· — "Responde reseñas desde ScanYA" · 📟 · tablet/celular · ~55-70 seg

> **Nota:** categoría "Avanzado" (ScanYA). Requiere el permiso **"responderResenas"**; sin él, el empleado ve el error "No tienes permiso para acceder a las reseñas". Es un componente propio de ScanYA, distinto al de Business Studio (aunque el texto en pantalla es prácticamente igual).

> `[Tocas "Reseñas" en accesos rápidos]`
> **"Desde ScanYA también respondes las reseñas de tus clientes. Toca 'Reseñas'."**
>
> `[Cambias entre "Todas" y "Pendientes"]`
> **"Cambia entre 'Todas' y 'Pendientes' para ver las que aún te faltan."**
>
> `[Tocas "Responder Mensaje" en una reseña]`
> **"Toca 'Responder Mensaje' en la que quieras contestar."**
>
> `[Escribes en "Escribe tu respuesta..." y envías]`
> **"Escribe tu respuesta y envíala."**
>
> `[Si ya respondiste, tocas "Editar Respuesta"]`
> **"Y si ya la habías respondido, puedes editarla cuando quieras."**
>
> `[Cierre]`
> **"Así atiendes a tus clientes sin tener que salir de tu punto de venta."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Toca **"Reseñas"** en los accesos rápidos.
2. Cambia entre **"Todas"** y **"Pendientes"** para ver lo que falta.
3. Toca **"Responder Mensaje"** en la reseña que quieras contestar.
4. Escribe tu respuesta y envíala (máx. 500 caracteres).
5. Si ya respondiste, usa **"Editar Respuesta"** para actualizarla.

---

### 🎬 S-· — "Instala ScanYA en tu tablet o teléfono" · 📟 · tablet/celular · ~30-40 seg

> **Nota:** categoría "Avanzado" (ScanYA). ScanYA vive en su propio subdominio (**s.anunciaya.mx**) con su propio flujo de instalación PWA, distinto al banner genérico de AnunciaYA. El botón "Instalar como app" vive en la pantalla de login y se oculta si ya corre en modo standalone.

> `[Entras a s.anunciaya.mx desde el navegador; pantalla de login de ScanYA]`
> **"Para instalar ScanYA en tu tablet o celular, entra desde tu navegador a s.anunciaya.mx."**
>
> `[Abajo del login, tocas "Instalar como app"]`
> **"Abajo, en la pantalla de acceso, toca 'Instalar como app'."**
>
> `[Confirmas la instalación del navegador]`
> **"Confirma la instalación… y listo: ya tienes el ícono de ScanYA en tu pantalla, como cualquier aplicación."**
>
> `[Cierre]`
> **"Ábrela directo desde ahí, sin pasar por el navegador cada vez."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Desde tu tablet o celular, entra a **s.anunciaya.mx** en tu navegador.
2. En la pantalla de acceso, toca **"Instalar como app"**.
3. Confirma la instalación.
4. Listo: ya tienes el ícono de ScanYA en tu pantalla de inicio.

---

### 🎬 S-· — "Activa las notificaciones de ChatYA y responde chats desde ScanYA" · 📟 · tablet/celular · ~55-70 seg

> **Nota:** categoría **"4.- Avanzado"**, posición **#1** (confirmado 15-jul-2026 — primero, por ser comunicación con clientes de uso frecuente). La campana **no es exclusiva de ChatYA** — es el mismo mecanismo de suscripción push del dispositivo usado en "Mi Perfil → Seguridad", solo etiquetado aquí para el contexto de ScanYA. El diálogo de permiso lo controla el navegador (Chrome/Safari/etc.), no la app. Responder el chat requiere el permiso de empleado **"responderChat"**; sin él, el error es "No tienes permiso para acceder al chat".

> `[Pantalla: header de ScanYA, tocas el ícono de campana]`
> **"Para no perderte ningún mensaje mientras vendes, toca la campana: 'Notificaciones de ChatYA'."**
>
> `[Se abre el popover; estado "Desactivadas"; activas el switch]`
> **"Actívalas. Tu navegador te va a pedir permiso: acéptalo."**
>
> `[Cambia a "Activadas · te avisamos al instante"]`
> **"Y listo: 'Activadas, te avisamos al instante'. Ahora te llega el aviso aunque estés en medio de una venta."**
>
> `[Si quedaron bloqueadas: "Bloqueadas en el navegador"]`
> **"Si por accidente las bloqueaste, aquí mismo te dice cómo activarlas desde los ajustes de tu navegador."**
>
> `[Tocas el ícono de ChatYA en accesos rápidos; se abre el chat]`
> **"Para responder, toca el ícono de ChatYA. Se abre el mismo chat de siempre: contesta a tu cliente sin salir de ScanYA."**
>
> `[Cierre]`
> **"Así atiendes a tus clientes al instante, sin perder ni una venta."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. En el header de ScanYA, toca la campana ("Notificaciones de ChatYA").
2. Actívalas y acepta el permiso que te pida tu navegador.
3. Verás **"Activadas · te avisamos al instante"** — te llegará un aviso con cada mensaje nuevo.
4. Si quedaron **"Bloqueadas en el navegador"**, actívalas desde los ajustes del navegador para este sitio.
5. Toca el ícono de **ChatYA** en los accesos rápidos para responder sin salir de ScanYA.

---

### 🎬 S-· — "Registra visitas en una Tarjeta de Sellos" · 📟 · tablet/celular · ~55-70 seg

> **Nota:** categoría **"2.- Operar la caja"**, posición **#2** (confirmado 15-jul-2026 — justo después de "Registra una Venta...", mismo modal). No es un flujo aparte — el sello se suma **dentro del mismo "Registrar Venta"**, junto con los puntos, en la misma transacción. La sección "Tarjeta de Sellos (opcional)" solo aparece si el cliente tiene alguna tarjeta activa con el negocio; si tiene varias, se elige una (selección única, con botón "Quitar selección").

> `[Pantalla: registrando una venta, identificas al cliente por teléfono]`
> **"Si tu cliente tiene una Tarjeta de Sellos contigo, aquí mismo, al registrar su venta, se la sumas."**
>
> `[Se despliega "Tarjeta de Sellos (opcional)"]`
> **"Aparece la sección 'Tarjeta de Sellos'. Si tiene más de una, elige cuál."**
>
> `[Seleccionas; se ve el conteo "3/8" con el +1 proyectado]`
> **"Selecciónala, y ves su avance: cuántos sellos lleva y cuántos le faltan, ya contando el que le vas a dar."**
>
> `[Terminas de llenar la venta y confirmas]`
> **"Termina de registrar la venta normal, con su monto y método de pago, y confirma."**
>
> `[Pantalla de éxito: "🎯 {nombre} X/Y" o "🎉 ¡Tarjeta completada!"]`
> **"Al final ves su nuevo avance… y si con esta venta completó la tarjeta, te avisamos: '¡Tarjeta completada!', para que le entregues su premio."**
>
> `[Cierre]`
> **"Así, cada visita cuenta, y tu cliente ve que va avanzando."**

**Pasos en texto (para el campo `respuesta` del Panel):**
1. Al registrar una venta, identifica al cliente por su teléfono.
2. Si tiene una Tarjeta de Sellos activa, aparece **"Tarjeta de Sellos (opcional)"** — si tiene varias, elige cuál.
3. Verás su avance actual, ya con el sello de esta compra sumado.
4. Completa el resto de la venta (monto, método de pago) y confirma.
5. Si la tarjeta se completó, verás **"¡Tarjeta completada!"** — entrega el premio a tu cliente.

---

*(Los guiones U-21, … se agregan debajo conforme se escriben en el chat de producción.)*

---

## 6. Seguimiento de producción (todos los videos)

| Orden | ID | Video | Guion | Grabado | Editado | Subido al Panel | Publicado |
|---|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | U-01 | Qué es AnunciaYA / Coyo | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | U-06 | Encuentra negocios | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | U-10 | MarketPlace | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | U-19 | CardYA / puntos | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | U-21 | Contactar + cupones (ChatYA) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | C-01 | Alta de negocio (onboarding) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | C-02 | Entiende tu Dashboard (ventas, ofertas y alertas de un vistazo) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | C-04 | Primer producto | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | C-06 | Primera oferta | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10 | C-09 | Puntos y recompensas | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11 | C-14 | Responde a tus clientes por ChatYA (desde BS y ScanYA) y ve su billetera | ✅ | ✅ | ✅ | ✅ | ✅ |
| 12 | S-01 | Entra a ScanYA y abre tu turno | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13 | S-02 | Registra venta, otorga puntos y aplica cupones | ✅ | ✅ | ✅ | ✅ | ✅ |
| 14 | S-03 | Canjea un voucher y cierra tu turno | ✅ | ✅ | ✅ | ✅ | ✅ |
| 15 | C-· | Crea y envía cupones privados | ✅ | ✅ | ✅ | ✅ | ✅ |
| 16 | C-· | Gestiona y envía cupones y ofertas por ChatYA | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17 | C-· | Actualiza info del negocio (Mi Perfil) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 18 | C-· | Registra empleados y asígnales permisos | ✅ | ✅ | ✅ | ✅ | ✅ |
| 19 | C-· | Crea y Asigna una Sucursal | ✅ | ✅ | ✅ | ✅ | ✅ |
| 20 | C-· | Publica una Vacante | ✅ | ✅ | ✅ | ✅ | ✅ |
| 21 | C-· | Activa niveles (Bronce/Plata/Oro) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 22 | C-· | Destaca, oculta o duplica productos entre sucursales | ✅ | ✅ | ✅ | ✅ | ✅ |
| 23 | C-· | Gestiona tu membresía y tu método de pago | ✅ | ✅ | ✅ | ✅ | ✅ |
| 24 | C-· | Paga tu membresía manualmente | ✅ | ✅ | ✅ | ✅ | ✅ |
| 25 | C-· | Mide el desempeño de tus promociones (vistas, clics, canjes) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 26 | C-· | Usa el Directorio comercial de tu ciudad | ✅ | ✅ | ✅ | ✅ | ✅ |
| 27 | C-· | Responde las opiniones de tus clientes | ✅ | ✅ | ✅ | ✅ | ✅ |
| 28 | C-· | Conoce a tus clientes: niveles, puntos e historial | ✅ | ✅ | ✅ | ✅ | ✅ |
| 29 | C-· | Revisa y resuelve tus alertas | ✅ | ✅ | ✅ | ✅ | ✅ |
| 30 | C-· | Lee y exporta tus reportes (ventas, clientes, promociones) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 31 | C-· | Revisa tu historial de Transacciones (ventas, cupones y vouchers) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 32 | S-· | Registra ventas sin internet (modo offline) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 33 | S-· | Consulta el historial del turno y filtra (período / empleado) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 34 | S-· | Consulta y gestiona los vouchers de tus clientes | ✅ | ✅ | ✅ | ✅ | ✅ |
| 35 | S-· | Cambia de sucursal en ScanYA | ✅ | ✅ | ✅ | ✅ | ✅ |
| 36 | S-· | Responde reseñas desde ScanYA | ✅ | ✅ | ✅ | ✅ | ✅ |
| 37 | S-· | Instala ScanYA en tu tablet o teléfono | ✅ | ✅ | ✅ | ✅ | ✅ |
| 38 | S-· | Activa las notificaciones de ChatYA y responde chats desde ScanYA | ✅ | ✅ | ✅ | ✅ | ✅ |
| 39 | S-· | Registra visitas en una Tarjeta de Sellos | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Publicados en redes:** U-01 y U-06 también están en TikTok y Facebook (descripciones en §5/chat). U-10 y U-19: publicados en el Panel — confirmar si van a redes.
> **Títulos reales del Panel (14-jul-2026):** algunos artículos se publicaron con un título ligeramente distinto al propuesto en el guion — la tabla ya refleja el título REAL visible en el Panel, no el de trabajo.
> **Video descartado:** "Recuperar tarjeta morosa" (parte del guion original de #24) **NO se grabará** — Juan no tiene forma de simular honestamente un cobro con tarjeta rechazada en producción. Si más adelante hay un escenario de prueba real (ej. tarjeta de test de Stripe), se retoma.
> **#25–#30 — artículos que ya existían en el Panel** (checklist original, categorías "Atraer Clientes", "ChatYA para tu Negocio", "Clientes, Opiniones y Alertas", "Análisis") descubiertos al revisar el orden de categorías — **pendientes de guion**, se abordan explorando cada pantalla antes de escribir (regla de oro del proyecto). El **Directorio comercial de ChatYA** se confirmó construido en código (`useChatYAStore.ts`, `ListaConversaciones.tsx`, `chatyaService.ts`) — la memoria decía "por implementar" pero ya está hecho.
> **Decisión (14-jul-2026):** el cupón privado NO tiene pantalla propia en ScanYA — se valida dentro del modal "Registrar Venta". Se **fusionó** con S-02 (ahora "Registra venta, otorga puntos y aplica cupones"); no existe video separado de "canjear cupón".

---

## 7. Plan de producción — Serie Comerciante (prioridad activa)

> **Decisión (14-jul-2026):** pausamos la secuencia de videos de usuario para enfocar la producción en los videos de **comerciante** — son quienes pagan la suscripción ($864/mes) y quienes sostienen la beta (50 negocios piloto en Puerto Peñasco). Objetivo: que un negocio **entienda → se dé de alta → opere → no cancele**.

### Enfoque: "construir un negocio demo"
Se graba en el **orden del viaje del comerciante**, de modo que cada video reutiliza los datos reales del anterior (das de alta → subes producto → configuras puntos → creas una oferta → registras una venta en ScanYA → esa venta ya aparece en el Dashboard). Grabar sobre el **negocio demo** (el mismo que usan los vendedores, ver `docs/arquitectura/Demo_Business_Studio.md`) para no exponer datos de un piloto real.

### Dispositivos
- **Onboarding / Business Studio:** PC — horizontal **16:9**.
- **ScanYA:** tablet o celular (como se usa en el punto de venta) — proporción del dispositivo.

### Orden de grabación
| # | ID | Video | Dónde | Guion |
|---|---|---|---|:--:|
| 0 | (venta) | ¿Por qué AnunciaYA para tu negocio? (pitch) | mixto | ⬜ |
| 1 | C-01 | Da de alta tu negocio (Onboarding) | PC 16:9 | ✅ |
| 2 | C-04 | Sube tu primer producto (Catálogo) | PC 16:9 | ✅ |
| 3 | C-09 | Configura puntos y recompensas | PC 16:9 | ✅ |
| 4 | C-06 | Crea tu primera oferta | PC 16:9 | ✅ |
| 5 | C-· | Crea y envía cupones privados a tus clientes | PC 16:9 | ✅ |
| 6 | C-· | Gestiona y envía cupones y ofertas por ChatYA | PC 16:9 | ✅ |
| 7 | C-· | Actualiza la info de tu negocio (Mi Perfil) | PC 16:9 | ✅ |
| 8 | C-· | Da de alta a tus empleados (+ PIN para ScanYA) | PC 16:9 | ✅ |
| 9 | C-· | Agrega una sucursal | PC 16:9 | ✅ |
| 10 | C-· | Publica una vacante | PC 16:9 | ✅ |
| 11 | C-· | Activa niveles (Bronce/Plata/Oro) | PC 16:9 | ✅ |
| 12 | C-· | Destaca, oculta o duplica productos entre sucursales | PC 16:9 | ✅ |
| 13 | C-· | Gestiona tu membresía y tu método de cobro | PC 16:9 | ✅ |
| 14 | C-· | Paga tu membresía manualmente | PC 16:9 | ✅ |
| 15 | S-01 | Entra a ScanYA y abre tu turno | tablet/celular | ✅ |
| 16 | S-02 | Registra venta, otorga puntos y aplica cupones | tablet/celular | ✅ |
| 17 | S-03 | Canjea un voucher y cierra tu turno | tablet/celular | ✅ |
| 18 | C-02 | Entiende tu Dashboard (ventas, ofertas y alertas de un vistazo) | PC 16:9 | ✅ |
| 19 | C-· | Lee y exporta tus reportes (ventas, clientes, promociones) | PC 16:9 | ✅ |
| 20 | C-14 | Responde a tus clientes por ChatYA (desde BS y ScanYA) y ve su billetera | PC 16:9 | ✅ |
| 21 | C-· | Mide el desempeño de tus promociones (vistas, clics, canjes) | PC 16:9 | ✅ |
| 22 | C-· | Usa el Directorio comercial de tu ciudad | PC 16:9 | ✅ |
| 23 | C-· | Responde las opiniones de tus clientes | PC 16:9 | ✅ |
| 24 | C-· | Conoce a tus clientes: niveles, puntos e historial | PC 16:9 | ✅ |
| 25 | C-· | Revisa y resuelve tus alertas | PC 16:9 | ✅ |
| 26 | C-· | Revisa tu historial de Transacciones (ventas, cupones y vouchers) | PC 16:9 | ✅ |

> **Alcance de esta tabla:** SOLO comerciante (Business Studio + ScanYA) — por diseño **no incluye** los 4 videos de usuario (U-01, U-06, U-10, U-19), que viven en la Tanda 1 original (§4/§6). Por eso su conteo de "guion listo" (26, todas las filas 1-26) es distinto del total de **27 publicados** de §6 (= 4 usuario + 23 comerciante ya publicados; los 3 de ScanYA #15-17 tienen guion pero faltan por grabar).
> Esta tabla es el **orden de grabación** y si el guion está listo. El **estado de producción** (grabado/editado/subido/publicado) y el **conteo total real** viven en la tabla maestra de **§6** — no se duplican aquí para evitar que las dos tablas se desincronicen otra vez.
> **Avance (14-jul-2026):** **todo Business Studio ya tiene guion escrito** (26/26 de esta tabla). Solo faltan por escribir: pitch (#0) y U-21 (usuario). Corrección: faltaba la fila "Lee y exporta tus reportes" (ya agregada como #19).
> **ScanYA tiene 9 tutoriales en total** (3 de esta tabla + 6 más descubiertos al revisar el checklist real del Panel: modo offline, historial con filtros, gestión de vouchers, cambio de sucursal, reseñas, instalación PWA). Los 6 extra **no están en esta tabla** (que sigue el plan de journey original) — su guion vive en §5 y su estado en §6 (filas 32-37).
> **Fila #14:** el guion original incluía "recuperar tarjeta morosa" — se **descartó** (sin forma de simular un cobro rechazado real); el título y el video publicado son solo "Paga tu membresía manualmente".

> Los videos **#7–#10** son los de "BS sin ventas" (configuración/gestión) — se graban antes de ScanYA. **Empleados (#8)** es prerrequisito de ScanYA (el PIN).
> **Cupones — dos videos que NO se pisan:** el **#5** cubre **crear + enviar + gestionar** un cupón privado (categoría "Atraer clientes"); el **#6** es un video corto de **difusión por ChatYA** de ofertas y cupones (categoría "ChatYA para tu negocio"). Ninguno se borra.
> **Voucher vs cupón (resuelto 14-jul-2026):** el cupón privado NO tiene pantalla propia en ScanYA — se valida dentro de "Registrar Venta". Se fusionó con S-02; no hay video separado de "canjear cupón" (ver S-02 arriba).
> El **ID C-· / S-·** queda por mapear al número exacto del checklist maestro (`Centro_Ayuda.md` §8) al publicarlos en el Panel.

> El **pitch (#0)** es material de **venta** (beneficios + qué incluye la membresía), no un tutorial de "cómo se usa"; conviene grabarlo al final, cuando el negocio demo ya esté armado y se puedan mostrar pantallas reales. Vive en redes y en manos de los vendedores, además del Centro de Ayuda.
> Los videos de **usuario** de la Tanda 1 (U-01 y U-06 grabados; U-10 y U-19 con guion listo; U-21 pendiente) se retoman después.

### Orden de categorías en el Panel (Business Studio)

Definido 14-jul-2026, de mayor a menor importancia según el viaje del comerciante (arrancar → vender → fidelizar → promocionar → operar → comunicar → gestionar → medir → extras → administrar):

1. Mis Primeros Pasos - Comerciante
2. Mi Catálogo
3. Puntos y Recompensas
4. Atraer Clientes
5. Mi Equipo
6. ChatYA para tu Negocio
7. Clientes, Opiniones y Alertas
8. Análisis
9. Empleo (Vacantes)
10. Membresía y Pagos

> Aplicado en el Panel (`SeccionAyuda.tsx`, módulo Ayuda y Tutoriales). Pendiente: mismo ejercicio de reordenar **títulos de videos** dentro de cada categoría (en pausa, retomar cuando Juan lo indique).

### Orden de categorías en el Panel (AnunciaYA — usuario)

Definido 14-jul-2026. Coincide **exactamente** con la jerarquía oficial de `CLAUDE.md`: las 4 secciones públicas en su orden (Negocios, MarketPlace, Ofertas, Servicios) + las secundarias (CardYA, ChatYA, Perfil). No hubo que reordenar nada, solo enumerar:

1. Mis Primeros Pasos - Usuario
2. Encontrar negocios
3. MarketPlace
4. Ofertas y Cupones
5. Servicios
6. CardYA
7. ChatYA
8. Mi Cuenta y Seguridad

> Aplicado en el Panel. 27 tutoriales totales en AnunciaYA, 4 con video (15% grabados) — U-01, U-06, U-10, U-19.

### Categorías y orden de videos en el Panel (ScanYA)

Categorías ya existentes en el Panel (no se reordenaron, siguen el flujo natural de un empleado: entrar → operar → recompensas → extra):

1. Empezar en ScanYA
2. Operar la caja
3. Recompensas
4. Avanzado

**Orden de videos dentro de cada categoría** (definido 15-jul-2026, tras agregar los 2 videos nuevos de esta sesión):

**2.- Operar la caja**
1. Registra una Venta, Otorga Puntos y Aplica Cupones
2. Registra visitas en una Tarjeta de Sellos *(nuevo — va justo después: es el mismo modal de "Registrar Venta", solo un campo distinto)*
3. Canjea un Voucher (QR o código) y Cierra tu Turno
4. Registra ventas sin internet (modo offline) *(al final: es el caso excepcional, no la operación normal)*

**3.- Recompensas**
1. Consulta y Gestiona los Vouchers de tus Clientes

**4.- Avanzado**
1. Activa las notificaciones de ChatYA y responde chats desde ScanYA *(nuevo — primero: comunicación con clientes, de uso frecuente)*
2. Responde reseñas desde ScanYA *(también comunicación/atención al cliente, junto al anterior)*
3. Consulta el historial del turno y filtra (período / empleado)
4. Cambia de sucursal en ScanYA *(más específico: solo negocios con varias sucursales)*
5. Instala ScanYA en tu tablet o teléfono *(al final: referencia de configuración inicial de dispositivo, no de uso diario)*

> **Decisión sobre "Canjea un Voucher... y Cierra tu Turno":** se evaluó moverlo a "Recompensas" (ya que incluye canjear un voucher) pero se **descartó** — el video también cubre "Cerrar turno", una acción puramente operativa que necesita quedarse en "Operar la caja" para completar el arco natural del día de un cajero (abrir turno → vender → cerrar turno). "Recompensas" ya tiene su propio video de vouchers que se sostiene solo (consultar/gestionar, sin mezclar cierre de caja).
> ScanYA suma **11 tutoriales en total**, todos con guion, grabados y publicados (15-jul-2026) — ver §6 filas 12-14 y 32-39.
