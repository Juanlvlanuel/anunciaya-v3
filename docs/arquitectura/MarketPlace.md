# 🛒 MarketPlace — Compra-venta de Objetos entre Usuarios

> **Última actualización:** 03 Mayo 2026
> **Estado:** ⏳ 0% — Pendiente de implementación (Fase 6.1)
> **Versión:** 1.0 (alcance v1)
> **Tiempo estimado:** ~4 días
> **Depende de:** ChatYA ✅ completado

> **DATOS DEL SERVIDOR (React Query):**
> - Feed y detalle: `hooks/queries/useMarketplace.ts` (a crear)
> - Sistema de guardados existente: `useGuardados` con `entity_type='articulo_marketplace'`
> - Sistema de votos existente: NO aplica en MarketPlace v1 (sin likes/follows en artículos)

> **Identidad visual:** Verde teal — Header dark sticky estilo CardYA / Cupones / Guardados

---

## 📋 Índice

1. [¿Qué es MarketPlace?](#qué-es-marketplace)
2. [Filosofía y Tono del Módulo](#filosofía-y-tono-del-módulo)
3. [Visión y Alcance v1](#visión-y-alcance-v1)
4. [Decisiones Rechazadas (NO volver a proponer)](#decisiones-rechazadas)
5. [Política de Visibilidad por Modo](#política-de-visibilidad-por-modo)
6. [Estados del Artículo](#estados-del-artículo)
7. [Moderación Autónoma](#moderación-autónoma)
8. [Sistema de Niveles del Vendedor](#sistema-de-niveles-del-vendedor)
9. [Identidad Visual](#identidad-visual)
10. [Pantallas](#pantallas)
    - [P1 — Feed](#p1--feed-de-marketplace)
    - [P2 — Detalle del Artículo](#p2--detalle-del-artículo)
    - [P3 — Perfil del Vendedor](#p3--perfil-del-vendedor)
    - [P4 — Wizard de Publicar / Editar](#p4--wizard-de-publicar--editar)
    - [P5 — Buscador Potenciado](#p5--buscador-potenciado)
11. [Integraciones con Otros Módulos](#integraciones-con-otros-módulos)
12. [Backend — Endpoints Sugeridos](#backend--endpoints-sugeridos)
13. [Base de Datos — Tabla Sugerida](#base-de-datos--tabla-sugerida)
14. [Roadmap de Sprints](#roadmap-de-sprints)
15. [Preguntas Pendientes](#preguntas-pendientes)

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

> Ver: `01-VISION_ESTRATEGICA.md` §3.1 para el contexto estratégico.

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

## 🎯 Visión y Alcance v1

### Funciones del Comprador

- Ver feed de artículos cercanos con secciones "Recién publicado" y "Cerca de ti"
- Buscar artículos con buscador potenciado (sugerencias en vivo, búsquedas recientes, populares en la ciudad)
- Aplicar filtros: precio, condición, distancia
- Ver detalle del artículo con galería completa
- Contactar al vendedor por **ChatYA** o **WhatsApp**
- Guardar artículo en **Mis Guardados** (tab Artículos)
- Ver perfil simple del vendedor con sus publicaciones

### Funciones del Vendedor

- Publicar artículo en wizard de 3 pasos (Fotos+Título → Precio+Detalles → Ubicación+Confirmación)
- Editar publicación existente (reusa el wizard en modo edición)
- Pausar / activar / marcar como vendida / eliminar publicación
- Ver métricas básicas por publicación: vistas, mensajes, guardados
- Gestionar todas sus publicaciones desde **`/mis-publicaciones`** (página global del usuario, fuera de este módulo)

### Lo que SÍ está en v1

| Función | Comprador | Vendedor |
|---------|-----------|----------|
| Ver feed con cards "imagen arriba + info abajo" | ✅ | — |
| Buscador con sugerencias y filtros | ✅ | — |
| Detalle de artículo con galería (max 8 fotos) | ✅ | — |
| Contactar por ChatYA / WhatsApp | ✅ | — |
| Guardar artículo en Mis Guardados | ✅ | — |
| Ver perfil simple del vendedor | ✅ | — |
| Publicar artículo (3 pasos) | — | ✅ |
| Editar publicación | — | ✅ |
| Cambiar estado (pausar/vender/eliminar) | — | ✅ |
| Métricas básicas (vistas/mensajes/guardados) | — | ✅ |


---

## 🚫 Decisiones Rechazadas

> Esta sección documenta features que se evaluaron y descartaron para v1, con su justificación. **NO volver a proponer en futuras sesiones** sin nueva evidencia.

### "Lo busco" / Modo demanda

- **Qué era:** los compradores publicaban lo que buscaban y los vendedores respondían "Tengo eso".
- **Por qué se descarta:** se encima con **"Pregúntale a Peñasco"** del Home (feed conversacional donde cualquier usuario pregunta y vecinos/negocios responden). Tener ambos crearía confusión sobre dónde publicar una búsqueda.
- **Solución:** las búsquedas se hacen desde Pregúntale a Peñasco en el Home, que ya cubre ese caso de uso de forma más amplia (objetos, servicios, recomendaciones, etc.).

### Categorías como navegación principal

- **Qué era:** grid de categorías (Segunda mano, Hecho a mano, Hogar, Electrónicos, Moda, Libros, Deporte, etc.) como destino navegable en el feed.
- **Por qué se descarta:** el comportamiento real del usuario es buscar directo por nombre del artículo. Mantener categorías obliga a clasificar al publicar (alarga el wizard) sin aportar al descubrimiento. Facebook Marketplace y OLX han reducido el peso de categorías por la misma razón.
- **Solución:** se potencia el buscador (sugerencias, populares, recientes) y se eliminan las categorías como navegación. El artículo NO requiere categoría al publicar.

### Integración con CardYA

- **Qué era:** badge "CardYA habilitado" en cards y toggle "Cobrar con CardYA" al publicar como método de pago seguro.
- **Por qué se descarta:** CardYA es para puntos de lealtad en negocios verificados con suscripción comercial. NO aplica a compra-venta entre personas. Mezclarlos confunde la propuesta de valor de ambos sistemas.

### "Buen precio" automático y "Buen título" feedback

- **Qué era:** sugerencias inteligentes al publicar comparando con artículos similares en la ciudad.
- **Por qué se descarta para v1:** requiere histórico de ventas y data suficiente. En beta no habrá datos para que la sugerencia sea confiable.
- **Cuándo retomar:** cuando haya 200+ artículos publicados y ventas confirmadas en el sistema.

### Karma / Reputación del vendedor + Reseñas de vendedor

- **Qué era:** sistema de calificación al vendedor por sus compradores anteriores.
- **Por qué se descarta para v1:** requiere histórico. En beta todos arrancan en cero. Además, las "ventas" no se confirman dentro de la app (la transacción es offline), lo que hace difícil detectar quién vendió a quién.
- **Cuándo retomar:** cuando haya un mecanismo claro para confirmar que la transacción ocurrió.

### Borradores de publicaciones

- **Qué era:** guardar una publicación incompleta para terminar después.
- **Por qué se descarta para v1:** suma complejidad de UX y backend (estado adicional, lista de borradores, recuperación). Si el usuario abandona el wizard a medio publicar, vuelve a empezar.

### "Acepta trueque" como toggle al publicar

- **Qué era:** marcar la publicación como dispuesta a intercambiar por otro artículo.
- **Por qué se descarta para v1:** caso de uso de nicho. Si el comprador quiere proponer trueque, lo hace por ChatYA. No vale la pena un toggle dedicado en el wizard.

### "Hacer oferta" como botón aparte en el detalle

- **Qué era:** botón formal "Hacer oferta $XXX" separado del botón de mensaje, con flujo de ofertas y contraofertas dentro de la app.
- **Por qué se descarta para v1:** el botón "Enviar mensaje" ya cubre la negociación. Diferenciar "ofertas formales" agrega complejidad de backend (estado de oferta, expiración, contraoferta) sin valor claro mientras la transacción siga siendo offline.

### Importar lote (carga masiva)

- **Qué era:** subir varios artículos de una sola vez con un archivo.
- **Por qué se descarta:** feature de plataformas como Mercado Libre o vendedores profesionales. En MarketPlace de AnunciaYA el volumen por usuario es bajo (alguien vendiendo cosas usadas, no un comerciante).

### Vista previa en vivo en móvil

- **Qué era:** mientras publicas en móvil, ver al lado cómo se va a ver tu publicación.
- **Por qué se descarta:** el viewport móvil no tiene espacio para mostrar el formulario y la vista previa simultáneamente. Solo se conserva en **desktop** como bonus en el wizard.

### Notificaciones propias del módulo

- **Qué era:** sección de notificaciones específica de MarketPlace.
- **Por qué se descarta:** la app ya tiene `PanelNotificaciones` global. Las notificaciones del MarketPlace caen ahí con el `referencia_tipo` correspondiente.

### Chat propio del módulo

- **Qué era:** sistema de mensajería interna del MarketPlace.
- **Por qué se descarta:** la app ya tiene **ChatYA** completo. Las conversaciones se hacen desde ChatYA con `contextoTipo='marketplace'` y `articuloMarketplaceId` (campo nuevo a sumar a `chat_conv`, ver §10).

### Favoritos propios del módulo

- **Qué era:** sección "Favoritos" exclusiva de MarketPlace.
- **Por qué se descarta:** la app ya tiene **Mis Guardados** con sistema de tabs (Ofertas, Negocios, Servicios, Artículos). Los artículos guardados de MarketPlace caen en la tab "Artículos".


---

## 🔒 Política de Visibilidad por Modo

### Modo Personal

- **Acceso completo:** ver feed + publicar + contactar + guardar
- Visible en BottomNav (móvil) y Navbar (desktop)

### Modo Comercial

- **Bloqueo total** de la sección
- NO aparece en BottomNav ni Navbar (ya está implementado en `47-fe-layout-BottomNav.tsx`)
- Si entra por URL directa (`/marketplace`, `/marketplace/articulo/:id`, etc.) → redirige a `/inicio` con notificación: `notificar.info('MarketPlace solo está disponible en modo Personal')`
- Implementación: usar guard de ruta similar a `ModoGuard` pero al revés (`requiereModo="personal"`)

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
Pausada → Activa
Pausada → Eliminada
Vendida → Eliminada
```

### Notas

- **Pausada** es temporal: el vendedor la oculta del feed pero la sigue viendo en su panel. Útil cuando quiere "guardar" el anuncio pero no recibir mensajes ahora (vacaciones, lo está mostrando a alguien específico, etc.).
- **Vendida** es definitiva pero recuperable como histórico (no se borra de BD). Sirve para que el vendedor vea sus ventas pasadas.
- **Eliminada** es soft delete (`deleted_at`). El registro se mantiene en BD para auditoría pero no se muestra en ningún lado.
- Hay un **TTL automático**: las publicaciones Activas se marcan como Pausada después de 30 días sin actividad. El vendedor puede reactivarlas.

---

## 🛡️ Moderación Autónoma

> **Contexto:** AnunciaYA es operada por una sola persona (Juan). MarketPlace es un espacio gratuito que NO genera ingresos directos. Por lo tanto, la moderación debe ser **100% automatizada** y **cero intervención humana**. No hay equipo de moderadores, no hay panel de revisión, no hay sistema de reportes, no hay cola de aprobación.
>
> El compromiso es: **filtrar el 80% del ruido con automatizaciones simples**, y aceptar el 20% restante como costo del modelo. La filosofía del módulo + las validaciones automáticas hacen el trabajo pesado.

### Capa 1 — Validación preventiva al publicar

Esta capa corre en el wizard (frontend + backend) y es la **única defensa real** del sistema. Si pasa esta capa, la publicación queda en el feed sin más controles.

#### 1.1 — Mínimos obligatorios

Ya cubiertos en el wizard (P4):

- Mínimo 1 foto, máximo 8
- Título entre 10 y 80 caracteres
- Precio entero positivo, máximo $999,999
- Condición seleccionada (1 de 4)
- Descripción mínimo 50 caracteres, máximo 1000
- Ubicación obligatoria
- Checklist final de 3 confirmaciones

#### 1.2 — Filtro de palabras prohibidas (RECHAZO DURO)

Si el título o la descripción contiene cualquier palabra de la lista negra, el wizard **NO permite publicar** y muestra un mensaje claro al usuario explicando por qué.

**Ubicación del filtro:** `apps/api/src/services/marketplace/filtros.ts` (constante exportada en código, no en BD).

**Comportamiento:**

- Validación tanto en frontend (feedback inmediato) como en backend (defensa real).
- Búsqueda **case-insensitive**, ignora acentos (`normalize('NFD').replace(/\p{Diacritic}/gu, '')`).
- Match por **palabra completa** (regex con `\b`), no por substring — para evitar falsos positivos como "subastasta" o "barrifa".
- El mensaje al usuario debe ser **claro y sin ambigüedad**, indicando qué palabra activó el bloqueo y por qué.

**Lista negra inicial (categorías):**

| Categoría | Palabras |
|-----------|----------|
| **Rifas y sorteos** | `rifa`, `rifas`, `rifo`, `rifando`, `sorteo`, `sorteos`, `sorteando`, `boleto`, `boletos`, `cachito`, `cachitos`, `tómbola`, `tombola` |
| **Subastas** | `subasta`, `subastas`, `subastando`, `mejor postor`, `puja`, `pujar`, `pujas`, `remate`, `remato` |
| **Esquemas** | `multinivel`, `multi nivel`, `pirámide`, `piramide`, `network marketing`, `cripto`, `bitcoin`, `ethereum`, `forex`, `inversión garantizada`, `gana dinero rápido`, `gana desde casa` |
| **Adultos** | (lista a definir en implementación, palabras de contenido sexual explícito) |
| **Ilegal** | `arma`, `armas`, `pistola`, `revólver`, `revolver`, `municiones`, `droga`, `drogas`, `cocaína`, `marihuana`, `peyote`, `animales exóticos`, `tigre`, `tortuga marina`, `coral` |

> La lista exacta y completa se construye al implementar el filtro. Esta tabla es orientativa.

**Mensajes según categoría:**

| Categoría detectada | Mensaje al usuario |
|--------------------|-------------------|
| Rifas y sorteos | "No puedes publicar rifas, sorteos ni venta de boletos en MarketPlace. Las rifas no están permitidas." |
| Subastas | "No puedes publicar subastas en MarketPlace. Establece un precio fijo y publica de nuevo." |
| Esquemas | "MarketPlace no permite la promoción de esquemas multinivel, criptomonedas ni inversiones." |
| Adultos | "El contenido para adultos no está permitido en AnunciaYA." |
| Ilegal | "No puedes publicar artículos prohibidos por la ley en AnunciaYA." |

#### 1.3 — Detección de servicios disfrazados (SUGERENCIA SUAVE)

Cuando el texto sugiere un servicio en lugar de un objeto físico, el wizard muestra un aviso amarillo **sin bloquear**, dando la opción de continuar o ir a la sección correcta.

**Por qué suave (no rechazo duro):** la línea entre objeto y servicio puede ser ambigua ("servicio de mesa de porcelana" es un objeto; "servicio de plomería" no). Mejor sugerir y dejar que el usuario decida.

**Patrones a detectar (regex flexibles):**

- `ofrezco mis servicios de…`
- `doy clases de…`, `clases de…`
- `servicio de [verbo]` — limpieza, plomería, jardinería, cuidado, etc.
- `cobro $X la hora`, `cobro por hora`
- `disponible para…`
- `me dedico a…`
- `soy [profesión]`
- `presupuesto sin compromiso`
- `cotizo…`

**Comportamiento:**

```
┌──────────────────────────────────────┐
│ ⚠ ¿Esto es un servicio?              │
│                                      │
│ Detectamos que tu publicación        │
│ podría ser un servicio en lugar de   │
│ un objeto en venta.                  │
│                                      │
│ Los servicios deben publicarse en    │
│ la sección Servicios.                │
│                                      │
│ [Llevar a Servicios] [Continuar]     │
└──────────────────────────────────────┘
```

- "Llevar a Servicios" → navega a `/servicios/publicar` (cuando exista) y mantiene los datos en sessionStorage para precargarlos allá.
- "Continuar" → permite seguir publicando en MarketPlace bajo la responsabilidad del usuario.

#### 1.4 — Detección de búsquedas

Si el texto sugiere una búsqueda en lugar de una venta, mismo patrón de sugerencia suave.

**Patrones:**

- `busco…`, `se busca…`, `necesito…`, `quiero comprar…`, `compro…`, `quien tenga…`, `alguien que venda…`

**Mensaje:**

> "¿Estás buscando algo en lugar de vender? Las búsquedas se publican en *Pregúntale a [ciudad]* en el Home, donde más personas pueden ayudarte."

Botones: `[Ir al Home]` `[Continuar publicando]`.

#### 1.5 — Validación de precio

Bloqueo duro:

- Precio = $0 → "El precio debe ser mayor a cero. Si quieres regalar el artículo, no es el lugar correcto."
- Precio < $10 → advertencia suave: "Este precio parece muy bajo. ¿Es correcto?" (no bloquea, solo confirma).
- Precio > $999,999 → "El precio máximo permitido es $999,999."

### Capa 2 — Auto-expiración (TTL)

Cron job diario que mueve a `pausada` toda publicación con `expira_at < NOW()` y `estado = 'activa'`. Notificación al vendedor: "Tu publicación expiró. Reactívala con 1 click si sigue disponible."

Esto evita que el feed se llene de publicaciones zombi de hace 6 meses sin requerir intervención humana.

### Lo que NO se implementa (decisión consciente)

- ❌ **Sistema de reportes de usuarios** — sin equipo para revisarlos, los reportes serían un canal sin destinatario. Falsa promesa al usuario.
- ❌ **Auto-pausa por umbral de reportes** — se descarta porque depende de los reportes mismos.
- ❌ **Bloqueo automático de usuarios reincidentes** — sin reportes, no hay forma justa de medir reincidencia.
- ❌ **Panel admin de moderación** — sin tiempo para atenderlo, sería un backlog que crece sin parar.
- ❌ **Aprobación manual antes de publicar** — no escala con un solo operador.
- ❌ **Detección con IA / análisis de imágenes** — costo y complejidad desproporcionados al alcance v1.

### Lo que pasa con publicaciones que se cuelan

Si alguna publicación logra evadir la Capa 1 (palabra que no estaba en la lista, contenido en imagen, etc.), simplemente se queda hasta que:

1. El propio vendedor la borra o pausa.
2. Expira a los 30 días.
3. Juan la borra manualmente desde la BD si llega a saber de ella.

Es un costo aceptable y honesto del modelo. La filosofía del módulo (sección Filosofía) y la Capa 1 ya filtran la mayoría del ruido.

### Lista negra como artefacto vivo

La lista de palabras prohibidas debe poder crecer fácilmente. Como vive en código (`filtros.ts`), agregar palabras es:

1. Editar el archivo
2. Hacer commit
3. Deploy en Render

No requiere migración de BD ni panel admin. Es lo más simple posible.

---

## 🏆 Sistema de Niveles del Vendedor

> **Inspiración:** MercadoLíder de Mercado Libre, adaptado a un modelo P2P offline donde no existen reclamos formales, cancelaciones rastreables ni despachos. Mide **comportamiento real sostenido** en lugar de calificaciones u opiniones.
>
> **Objetivo:** generar confianza entre desconocidos, premiar a los vendedores activos, y diferenciar AnunciaYA de Facebook Marketplace donde todos los perfiles se ven iguales.
>
> **100% automático.** Se calcula con un cron job diario sin intervención humana. No hay reseñas, no hay reclamos, no hay panel admin.

### Datos que se miden (todos automáticos)

| Dato | Fuente | Cómo se calcula |
|------|--------|-----------------|
| Antigüedad | `usuarios.created_at` | `NOW() - created_at` |
| Tiempo de respuesta promedio | `chat_mensajes` | Promedio de minutos entre primer mensaje del comprador y primera respuesta del vendedor, en últimos 30 días |
| Tasa de respuesta | `chat_conv` + `chat_mensajes` | % de conversaciones donde el vendedor respondió al menos una vez, en últimos 30 días |
| Publicaciones activas | `articulos_marketplace` | `COUNT(*) WHERE estado='activa' AND usuario_id=X` |
| Ventas auto-reportadas | `articulos_marketplace` | `COUNT(*) WHERE estado='vendida' AND usuario_id=X` |
| Ventas confirmadas | `articulos_marketplace.venta_confirmada_por_comprador = true` | Ver §Confirmación de compra |
| Última actividad | `usuarios.ultima_conexion` | Fecha del último login o acción |

### Confirmación de compra (sin fricción)

Cuando el vendedor marca una publicación como `vendida`, el sistema dispara una pregunta automática al comprador con el que más mensajes intercambió en esa conversación:

```
┌──────────────────────────────────────┐
│ Mensaje automático en ChatYA:        │
│                                      │
│ Lucía marcó este artículo como       │
│ vendido. ¿Confirmas que lo compraste?│
│                                      │
│ [Sí, lo compré] [No fue conmigo]    │
└──────────────────────────────────────┘
```

**Comportamiento:**
- Si responde **"Sí"** → la venta cuenta como **confirmada**
- Si responde **"No"** → la venta queda como **auto-reportada** (cuenta para "ventas" pero no para "ventas confirmadas"). NO penaliza al vendedor (puede ser que vendió a otro comprador).
- Si **ignora el mensaje** (no responde en 7 días) → queda como auto-reportada
- Esta interacción NO es una reseña ni una calificación. Solo un check booleano.
- El comprador puede ignorarlo sin consecuencia. No genera fricción ni notificaciones molestas.

### Los 5 niveles

Los niveles **describen** el comportamiento del vendedor. **No hay niveles negativos** (sin colores rojo/amarillo). Si alguien no tiene actividad, simplemente no tiene nivel — no se le señala como "malo".

#### Nivel 0 — Sin nivel (default)

- Usuario nuevo sin actividad o con perfil incompleto
- No se muestra ningún badge
- En el perfil del vendedor (P3) aparece sin distintivo

#### Nivel 1 — Activo

**Requisitos (todos):**
- 1+ publicación activa en últimos 30 días
- Perfil completo: avatar real + nombre completo

**Cómo se ve:**
- En el perfil (P3): pequeño "✓ Vendedor activo" en gris discreto al lado del nombre
- En cards del feed: NO aparece badge (sería ruido)

#### Nivel 2 — Frecuente

**Requisitos (todos):**
- 5+ ventas auto-reportadas históricas

**Cómo se ve:**
- En el perfil (P3): badge "Vendedor frecuente" en gris medio
- En cards del feed: NO aparece badge

#### Nivel 3 — Confiable

**Requisitos (todos):**
- 10+ ventas auto-reportadas
- 3+ ventas confirmadas por compradores
- Tiempo de respuesta promedio < 2 horas (últimos 30 días)
- Antigüedad > 30 días

**Cómo se ve:**
- En el perfil (P3): badge "Vendedor confiable" en teal
- En cards del feed: badge teal pequeño en esquina inferior izquierda de la imagen
- En búsquedas con orden "Más relevantes": +20% boost de prioridad

#### Nivel 4 — Recomendado

**Requisitos (todos):**
- 25+ ventas auto-reportadas
- 10+ ventas confirmadas por compradores
- Tiempo de respuesta promedio < 1 hora (últimos 30 días)
- Tasa de respuesta > 80% (últimos 30 días)
- Antigüedad > 6 meses

**Cómo se ve:**
- En el perfil (P3): badge "Recomendado" en teal con ícono destacado (estilo medalla simple)
- En cards del feed: badge teal con ícono pequeño
- En búsquedas con orden "Más relevantes": +40% boost de prioridad

### Comportamiento del sistema

#### Cron job diario

Archivo sugerido: `apps/api/src/cron/marketplace-niveles.cron.ts`

- Corre 1 vez al día (madrugada)
- Recalcula nivel de todos los usuarios con publicaciones en MarketPlace
- Actualiza campo `nivel_marketplace` en tabla `usuarios` (a sumar al schema)
- Si un usuario sube de nivel: notificación push: *"¡Subiste a nivel Confiable! Tus publicaciones tendrán más visibilidad."*
- Si un usuario baja de nivel: NO se notifica (no se le hace pasar mal). El badge simplemente se actualiza silenciosamente.

#### Visibilidad en UI

| Lugar | Nivel 0 | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|-------|---------|---------|---------|---------|---------|
| **Card del feed** | — | — | — | Badge pequeño | Badge con ícono |
| **Detalle artículo (card vendedor)** | — | "✓ Activo" | "Frecuente" | Badge teal | Badge teal+ícono |
| **Perfil del vendedor (P3)** | — | Badge gris | Badge gris medio | Badge teal grande | Badge teal+ícono grande |
| **Resultados de búsqueda** (orden Más relevantes) | sin boost | sin boost | sin boost | +20% prioridad | +40% prioridad |

#### Tooltips explicativos

Cada badge es **clickeable** y abre un mini-modal explicando qué significa el nivel y qué hace falta para subir al siguiente. Esto le da al usuario la sensación de progreso sin gamificación caricaturesca.

Ejemplo:

```
┌──────────────────────────────────────┐
│ Vendedor confiable                   │
│                                      │
│ Lucía es un vendedor con              │
│ trayectoria comprobada en AnunciaYA: │
│                                      │
│ • 12 ventas reportadas               │
│ • 4 confirmadas por compradores      │
│ • Responde en <1h en promedio        │
│ • Miembro desde hace 8 meses         │
│                                      │
│ [Ver perfil completo]                │
└──────────────────────────────────────┘
```

### Decisiones explícitas

#### Por qué NO calificación numérica (4.5 estrellas, etc.)

Las reseñas requieren acción del comprador y son fáciles de manipular. Los niveles basados en comportamiento son más justos y no requieren intervención.

#### Por qué SÍ tiempo de respuesta

Es un indicador real de qué tan serio es el vendedor para el comprador. Y es 100% automático (`chat_mensajes`).

#### Por qué SÍ antigüedad

Filtra cuentas creadas para estafar. Una cuenta de 6 meses con ventas reales es muy difícil de falsificar.

#### Por qué NO penalizar bajadas

Si un vendedor baja de Confiable a Frecuente porque no respondió rápido este mes, no se le humilla. El sistema simplemente actualiza el badge en silencio. Cuando vuelva a subir, ahí sí se le notifica.

#### Por qué los beneficios reales del nivel alto importan

Sin beneficios concretos (boost en búsqueda, badges visibles), el sistema sería decorativo. Los vendedores serios merecen recompensa real por su comportamiento. Es lo que hace que el sistema **incentive** buen comportamiento, no solo lo registre.

### Backend — campos sugeridos

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

> `comprador_id` se llena cuando el vendedor marca como vendida y selecciona con quién (auto-detectado por el comprador con más mensajes en la conversación, confirmado por el vendedor).

### Endpoints adicionales

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/marketplace/articulos/:id/marcar-vendida` | Vendedor marca como vendida + selecciona comprador (auto-sugerido) |
| POST | `/api/marketplace/articulos/:id/confirmar-compra` | Comprador confirma o rechaza |
| GET | `/api/marketplace/usuarios/:id/nivel` | Detalles del nivel actual del usuario (para tooltips) |

---

## 🎨 Identidad Visual

### Color de marca

**Verde teal** — distinto del verde esmeralda de Cupones. Representa MarketPlace en toda la app.

| Uso | Token Tailwind | Hex aprox |
|-----|----------------|-----------|
| Acento principal (icono header, números destacados) | `teal-400` | `#2dd4bf` |
| Acento secundario (línea tab activo, badges sutiles) | `teal-500` | `#14b8a6` |
| Hover sobre acento | `teal-600` | `#0d9488` |

### Botones principales (CTAs)

**Negros** (Dark Gradient de Marca, ver `TOKENS_COMPONENTES.md` §7). Igual que en CardYA, Cupones, Negocios, Onboarding.

```css
background: linear-gradient(135deg, #1e293b, #0f172a);
```

Aplica a:
- "Publicar artículo" (header del feed)
- "Continuar" / "Anterior" (wizard)
- "Publicar ahora" (final del wizard)
- "Enviar mensaje" (detalle del artículo)
- "Guardar cambios" (modo edición)

### Botones secundarios

Blanco con borde slate (estándar de la app).

### WhatsApp

Verde WhatsApp (`#25D366`) por convención de marca externa. NO usar verde teal aquí.

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


---

## 📱 Pantallas

### P1 — Feed de MarketPlace

**Ruta:** `/marketplace`
**Archivo sugerido:** `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx`

#### Móvil — Estructura

Scroll vertical continuo, no estático. Invita a explorar.

```
┌──────────────────────────────────────┐
│ HEADER DARK STICKY                   │
│ ┌──────────────────────────────────┐ │
│ │ 🛒 MarketPlace          [Buscar] │ │
│ │ COMPRA-VENTA LOCAL               │ │
│ │ 📍 Manzanillo · 247 artículos    │ │
│ │ [+ Publicar artículo] (CTA neg.) │ │
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
│ ├──────┤ ├──────┤                    │
│ │ Card │ │ Card │                    │
│ └──────┘ └──────┘                    │
│         [Cargar más...]              │
└──────────────────────────────────────┘
                                  [+]   ← FAB "Publicar" sobre BottomNav
```

#### Desktop — Estructura

Mismo contenido, layout adaptado:
- Header con buscador inline (no necesita expandirse)
- Carrusel "Recién publicado" con drag-to-scroll y fade lateral
- Grid de "Cerca de ti" en 4-6 columnas según viewport (`@5xl:grid-cols-4 @[96rem]:grid-cols-6`)
- CTA "Publicar artículo" en el header, no flotante

#### Card del artículo (estilo B)

```
┌─────────────────────┐
│ [NUEVO]        [♥] │  ← badge si <24h + botón guardar
│                     │
│      IMAGEN         │  ← portada cuadrada (aspect 1:1)
│      PORTADA        │
│                     │
├─────────────────────┤
│ $11,910             │  ← precio bold grande
│ Bicicleta vintage…  │  ← título 1 línea (truncado)
│ 📍 600m · hace 6d   │  ← distancia + tiempo, gris
└─────────────────────┘
```

**Reglas:**
- Solo se muestra la **portada** (1ra foto) en la card
- NO carrusel interno en cards del feed (ensucia el grid)
- Para ver más fotos, el usuario entra al detalle
- Hover desktop: `shadow-md` estático, sin scale ni elevación

#### Comportamiento

- **Tap/click en card** → navega a `/marketplace/articulo/:id` (P2)
- **Tap en ❤️ guardar** → toggle vía `useGuardados` con `entity_type='articulo_marketplace'`
- **Tap en "+ Publicar artículo"** → navega a `/marketplace/publicar` (P4 modo creación)
- **Tap en buscador del header** → abre overlay del Buscador (P5)
- **Pull-to-refresh** en móvil → refresca feed

#### Datos del servidor

- `useMarketplaceFeed({ ciudad, lat, lng })` — devuelve dos arrays: `recientes` y `cercanos`
- Carrusel "Recién publicado": últimos 20 artículos publicados en la ciudad (orden por `created_at DESC`)
- Grid "Cerca de ti": ordenado por distancia ascendente, paginado de 20 en 20
- Filtro automático: solo artículos en estado `activa` y dentro del radio de la ciudad activa

---

### P2 — Detalle del Artículo

**Ruta:** `/marketplace/articulo/:articuloId`
**Archivo sugerido:** `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`

#### Móvil — Estructura

```
┌──────────────────────────────────────┐
│ [←]              [↑ compartir] [♥] [⋯]│  ← header transparente flotante
│                                      │
│         GALERÍA DE FOTOS             │
│      (swipe horizontal)              │
│                              1/8     │
├──────────────────────────────────────┤
│ $11,910                              │  ← precio bold gigante
│ Bicicleta vintage Rinos restaurada   │
│ [Nuevo] [Bicicleta] [600m]           │  ← chips
│ hace 6d · 144 vistas                 │
├──────────────────────────────────────┤
│ Descripción                          │
│ Bici de los 80s con piñón Shimano…   │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ [LR] Lucía R. ✓ Verificada     │   │  ← card vendedor
│ │      Manzanillo, Colima        │   │
│ │      [Ver perfil →]            │   │
│ └────────────────────────────────┘   │
├──────────────────────────────────────┤
│ Ubicación aproximada                 │
│ ┌────────────────────────────────┐   │
│ │      MAPA con círculo 500m     │   │
│ │           ⭕                    │   │
│ └────────────────────────────────┘   │
│ Centro · Manzanillo                  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐  ← barra fija inferior
│ [📱 WhatsApp] [💬 Enviar mensaje]   │
└──────────────────────────────────────┘
```

#### Desktop — Estructura (2 columnas 60/40)

**Columna izquierda (~60%):**
- Galería con thumbnails verticales al lado izquierdo (estilo Mercado Libre)
- Debajo: Descripción + Ubicación con mapa

**Columna derecha (~40%) — sticky:**
- Precio + título + chips
- Card del vendedor con "Ver perfil"
- Botones de contacto: "Enviar mensaje" (negro grande) + WhatsApp (verde) + ❤️ Guardar
- Tiempo y vistas

Patrón inspirado en `66-fe-page-public-PaginaArticuloPublico.tsx` que ya existe en tu app — los compradores que ya usan AnunciaYA se sienten en casa.

#### Comportamiento

- **Tap en galería** → abre `ModalImagenes` a pantalla completa (lightbox con swipe)
- **Tap en "Enviar mensaje"** → abre `ChatOverlay` con `contextoTipo='marketplace'` y `articuloMarketplaceId={id}`
- **Tap en WhatsApp** → abre WhatsApp con número del vendedor + mensaje precargado: `"Hola, vi tu publicación de [título] en AnunciaYA"`
- **Tap en ❤️** → toggle `useGuardados` con `entity_type='articulo_marketplace'`
- **Tap en compartir (↑)** → genera link público `/p/articulo-marketplace/:id` (similar al sistema universal de compartir existente)
- **Tap en ⋯** → menú con opciones: Bloquear vendedor
- **Tap en "Ver perfil →"** → navega a P3
- **Tap en mapa** → NO abre nada (es decorativo, ubicación aproximada)

#### Datos del servidor

- `useArticuloMarketplace(articuloId)` — devuelve artículo completo con galería, datos del vendedor, ubicación aproximada
- Al montar la página: `POST /api/marketplace/articulos/:id/vista` (incrementa vistas, sin auth requerida)
- Si el usuario está bloqueado por el vendedor → mostrar mensaje "Esta publicación no está disponible"

#### Privacidad de ubicación

- El backend devuelve coordenadas **aleatorizadas** dentro de un círculo de 500m alrededor de la ubicación real
- El círculo se renderiza con Leaflet (`L.circle`) sin pin central
- Texto bajo el mapa: `"Mostraremos un círculo de 500m, no la dirección exacta. Acuerda el punto de encuentro por chat."`


---

### P3 — Perfil del Vendedor

**Ruta:** `/marketplace/vendedor/:usuarioId`
**Archivo sugerido:** `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx`

#### Móvil — Estructura

```
┌──────────────────────────────────────┐
│ [←]                            [⋯]   │  ← header transparente flotante
│                                      │
│      PORTADA (color teal sólido      │
│       o imagen genérica)             │
│                                      │
├──────────────────────────────────────┤
│      ┌──────┐                        │
│      │ AVATAR│  Lucía R. ✓ Verificada│
│      └──────┘  Manzanillo, Colima    │
│                Miembro desde Mar 2026│
│                                      │
│  ┌────┐  ┌────┐  ┌────┐             │
│  │ 12 │  │ 45 │  │<1h │             │  ← KPIs simples
│  │Activ│ │Vend│ │Resp│             │
│  └────┘  └────┘  └────┘             │
│                                      │
│ [💬 Enviar mensaje]                  │  ← botón principal negro
│ [👁 Seguir vendedor]                 │  ← secundario blanco/borde
├──────────────────────────────────────┤
│ ┌─────────────────────────────────┐  │
│ │ Publicaciones (12) │ Vendidos(45)│  │  ← tabs
│ └─────────────────────────────────┘  │
├──────────────────────────────────────┤
│  Grid de cards estilo B (igual feed) │
│  ┌──────┐ ┌──────┐                   │
│  │ Card │ │ Card │                   │
│  └──────┘ └──────┘                   │
└──────────────────────────────────────┘
```

#### Desktop — Estructura

- Misma estructura, header con portada más alta
- KPIs en fila completa (4 columnas si agregamos uno más)
- Grid de publicaciones en 4 columnas

#### KPIs (3 números en fila)

| KPI | Valor | Cálculo |
|-----|-------|---------|
| Publicaciones activas | número entero | `COUNT(*) WHERE estado='activa'` |
| Vendidos | número entero | `COUNT(*) WHERE estado='vendida'` |
| Tiempo de respuesta | "<1h", "2h", "1d", "—" | promedio de tiempo entre primer mensaje y primera respuesta del vendedor en últimos 30 días |

> Sin tonos pastel, sin emojis como datos, sin saltos tipográficos exagerados (Regla 13 de TOKENS_GLOBALES.md). Listas densas inline tipo definition list.

#### Tabs

- **Publicaciones (X)** — solo `estado='activa'`. Grid de cards estilo B.
- **Vendidos (X)** — `estado='vendida'`. Grid de cards con marca de agua "VENDIDO" (overlay slate translúcido).

#### Comportamiento

- **Tap en "Enviar mensaje"** → abre ChatOverlay con `contextoTipo='vendedor_marketplace'` (sin artículo específico)
- **Tap en "Seguir vendedor"** → reusa sistema de votos existente (`tipo_accion='follow'`, `entity_type='usuario'`). Aparece en Mis Guardados → tab futura "Vendedores" o se integra en "Negocios" según se decida
- **Tap en card de publicación** → navega a P2 (detalle de ese artículo)
- **Tap en ⋯** → menú: Bloquear usuario

#### Sin tab de reseñas

Como definimos en el alcance, las reseñas de vendedor se cortan para v1. Cuando se sume, será una 3ra tab.

#### Datos del servidor

- `useVendedorMarketplace(usuarioId)` — devuelve perfil + KPIs + lista de publicaciones (paginada)
- Si el vendedor bloqueó al usuario actual → mostrar 404 sin revelar que el bloqueo existe

---

### P4 — Wizard de Publicar / Editar

**Rutas:**
- Crear: `/marketplace/publicar`
- Editar: `/marketplace/publicar/:articuloId`

**Archivo sugerido:** `apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx`

#### Modos del Wizard

El mismo componente funciona en 2 modos según la URL:

| Modo | Detección | Título | Botón final |
|------|-----------|--------|-------------|
| **Crear** | sin `articuloId` en params | "Nueva publicación" | "Publicar ahora" |
| **Editar** | con `articuloId` en params | "Editar publicación" | "Guardar cambios" |

En modo edición:
- Datos precargados de la publicación existente
- Las fotos ya existentes se muestran como editables (puede quitar/agregar)
- El paso 3 (ubicación) es modificable pero opcional (ya tiene una)
- El checklist del paso 3 NO se vuelve a mostrar (ya lo aceptó al publicar)

#### Estructura general (móvil)

```
┌──────────────────────────────────────┐
│ [←]    Paso X de 3                   │
│                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  ← barra progreso (3 segmentos)
│                                      │
│   [contenido del paso actual]        │
│                                      │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐  ← barra fija inferior
│ [← Anterior]    [Continuar →]        │
└──────────────────────────────────────┘
```

#### Paso 1 — Fotos y Título

```
┌──────────────────────────────────────┐
│ Fotos · hasta 8                      │
│ La primera foto será la portada.     │
│ Buena luz natural y fondo limpio     │
│ venden más.                          │
│                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │FOTO 1│ │FOTO 2│ │FOTO 3│          │  ← grid 4 cols
│ │PORTAD│ │  [X] │ │  [X] │          │     primera = "Portada"
│ └──────┘ └──────┘ └──────┘          │
│ ┌──────┐ ┌──────┐                    │
│ │FOTO 4│ │  +   │                    │
│ │  [X] │ │      │                    │
│ └──────┘ └──────┘                    │
│                                      │
│ Título de tu publicación             │
│ ┌────────────────────────────────┐   │
│ │ Bicicleta vintage Rinos        │   │
│ └────────────────────────────────┘   │
│                              34/80   │  ← contador
└──────────────────────────────────────┘
```

**Reglas:**
- Mínimo 1 foto, máximo 8
- Primera foto siempre marca "Portada", drag & drop para reordenar (bonus, puede esperar a v1.1)
- Upload directo a R2 (presigned URL, prefijo `marketplace/`) usando `useR2Upload`
- Título: mínimo 10 caracteres, máximo 80
- Botón "Continuar" deshabilitado si no cumple mínimos

#### Paso 2 — Precio y Detalles

```
┌──────────────────────────────────────┐
│ Precio                               │
│ ┌────────────────────────────────┐   │
│ │ $ 2,800                MXN     │   │  ← input grande bold
│ └────────────────────────────────┘   │
│                                      │
│ Condición                            │
│ [● Nuevo] [Seminuevo] [Usado]       │  ← chips selección única
│ [Para reparar]                       │
│                                      │
│ Acepta ofertas              [Toggle] │  ← negociar por chat
│                                      │
│ Descripción                          │
│ ┌────────────────────────────────┐   │
│ │ Bicicleta restaurada con       │   │
│ │ piezas originales Shimano…     │   │  ← textarea
│ │                                │   │
│ └────────────────────────────────┘   │
│ Mín. 50 caracteres        148/1000   │
└──────────────────────────────────────┘
```

**Reglas:**
- Precio: número entero positivo, en MXN, máximo $999,999
- Condición: una de [`nuevo`, `seminuevo`, `usado`, `para_reparar`]
- Acepta ofertas: boolean (default `true`)
- Descripción: mínimo 50 caracteres, máximo 1000

#### Paso 3 — Ubicación y Confirmación

```
┌──────────────────────────────────────┐
│ Zona aproximada                      │
│ Mostraremos un círculo de 500m,      │
│ no tu dirección exacta.              │
│                                      │
│ ┌────────────────────────────────┐   │
│ │       MAPA con círculo         │   │
│ │           ⭕                    │   │  ← Leaflet
│ │                                │   │
│ └────────────────────────────────┘   │
│ 📍 Centro · Manzanillo  [Cambiar]    │
│                                      │
│ ─────── Resumen ───────              │
│ ┌────────────────────────────────┐   │
│ │ [foto] Bicicleta vintage Rinos │   │
│ │        $2,800                  │   │  ← preview compacta
│ │        Acepta ofertas · Nuevo  │   │
│ └────────────────────────────────┘   │
│                                      │
│ Antes de publicar                    │
│ ☑ No vendo artículos prohibidos      │  ← checklist 3 items
│ ☑ Las fotos son del artículo real    │     todos requeridos
│ ☑ Acepto que mi publicación se       │
│   mostrará 30 días                   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ [← Anterior]   [✓ Publicar ahora]   │
└──────────────────────────────────────┘
```

**Reglas:**
- Ubicación inicial: GPS del dispositivo o ubicación de la ciudad activa
- Botón "Publicar ahora" deshabilitado hasta que los 3 checks estén marcados
- En modo edición: el checklist NO aparece (ya se aceptó al publicar la primera vez)
- Al publicar: POST al backend → notificación de éxito → redirige a `/mis-publicaciones`

#### Vista previa en vivo (solo desktop)

En desktop, el wizard usa layout 2 columnas:
- **Izquierda (60%):** formulario del paso actual
- **Derecha (40%):** card del artículo en vivo, actualizada en tiempo real conforme escribes

Card de preview muestra cómo se verá el artículo en el feed (estilo B con la foto portada actual + título + precio + condición).

En móvil, NO hay vista previa — no cabe.

#### Comportamiento

- **Tap en "Continuar"** → valida el paso actual, si pasa avanza al siguiente
- **Tap en "Anterior"** → vuelve al paso anterior conservando datos
- **Tap en "←" del header** → confirma "¿Salir sin publicar?" (los datos se pierden, no hay borradores en v1)
- **Validaciones inline** — errores debajo de cada campo en rojo, no bloquean tipeo
- **Auto-save al estado local** del navegador (sessionStorage) por si recarga la página accidentalmente

#### Datos del servidor

- Crear: `POST /api/marketplace/articulos`
- Editar: `PUT /api/marketplace/articulos/:id`
- Validación Zod en backend con los mismos rangos que frontend
- Imágenes ya están en R2 antes de hacer el POST/PUT (se sube cada foto al agregarla, no en el submit final)


---

### P5 — Buscador Potenciado

**No es una pantalla con ruta propia** — es un **overlay** que se monta encima del feed cuando el usuario toca el input de búsqueda en el header.

**Archivo sugerido:** `apps/web/src/components/marketplace/OverlayBuscador.tsx`

#### Estado vacío (al abrir)

```
┌──────────────────────────────────────┐
│ [←]  ┌──────────────────────────┐    │  ← input con foco automático
│      │ 🔍 Buscar...             │    │
│      └──────────────────────────┘    │
├──────────────────────────────────────┤
│ Búsquedas recientes      [Borrar]   │
│ [lentes ray ban  X]                  │
│ [mancuernas      X]                  │  ← chips eliminables
│ [mesa de centro  X]                  │
│                                      │
│ Más buscado en Manzanillo            │
│ [Bicicleta] [iPhone] [Sofá]          │  ← chips populares
│ [Plantas] [Libros] [Cámara]          │     no eliminables
└──────────────────────────────────────┘
```

#### Mientras escribes (sugerencias en vivo)

```
┌──────────────────────────────────────┐
│ [←]  ┌──────────────────────────┐    │
│      │ bicic                  X │    │  ← input con texto
│      └──────────────────────────┘    │
├──────────────────────────────────────┤
│ Sugerencias                          │
│ 🔍 Bicicleta vintage Rinos      ↗    │  ← coincidencias en títulos
│ 🔍 Bicicleta de montaña r26     ↗    │     de publicaciones activas
│ 🔍 Bicicleta plegable urbana    ↗    │     en la ciudad
└──────────────────────────────────────┘
```

#### Vista de resultados (después de Enter o tap en sugerencia)

```
┌──────────────────────────────────────┐
│ HEADER DARK STICKY (modo resultados) │
│ ┌──────────────────────────────────┐ │
│ │ [←] "silla vintage" · 24 result. │ │
│ │  Cerca primero ▾    [Filtros]    │ │  ← ordenar + botón filtros
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Filtros activos:                     │
│ [Distancia: 5km X] [Precio: <$30k X] │  ← chips removibles
│ [Condición: Nuevo X]   [Limpiar]     │
├──────────────────────────────────────┤
│  Grid 2 cols (móvil) / 4-6 (desktop) │
│  ┌──────┐ ┌──────┐                   │
│  │ Card │ │ Card │  ← cards estilo B │
│  └──────┘ └──────┘                   │
│  …                                   │
└──────────────────────────────────────┘
```

#### Filtros aplicables (en bottom sheet móvil / sidebar desktop)

| Filtro | Tipo | Valores |
|--------|------|---------|
| Distancia | Chips única | 1km · 3km · 5km · 10km · 25km · 50km |
| Precio | Slider doble | $0 - $999,999 (presets: <$500, $500-1k, $1k-5k, $5k+) |
| Condición | Chips múltiples | Nuevo, Seminuevo, Usado, Para reparar |
| Acepta ofertas | Toggle | sí/no |

#### Ordenar (dropdown)

- **Más recientes** (por `created_at DESC`) — default
- **Más cercanos** (por distancia ASC, requiere GPS del usuario)
- **Precio menor** (por `precio ASC`)
- **Precio mayor** (por `precio DESC`)

#### Comportamiento

- **Búsquedas recientes** se guardan en localStorage (últimas 10), por usuario
- **Más buscado en [ciudad]** se calcula en backend a partir de búsquedas agregadas (top 6 términos de la ciudad en últimos 7 días)
- **Sugerencias en vivo** consumen `/api/marketplace/buscar/sugerencias?q=…&ciudad=…` con debounce 300ms
- **Al ejecutar búsqueda:** se navega a `/marketplace/buscar?q=…&filtros=…` para que sea compartible y bookmarkeable
- **Estado vacío de resultados:** mostrar mensaje "No encontramos artículos para ‘X'. Probá quitar algunos filtros." con botón "Limpiar filtros"

#### Datos del servidor

- `useBuscadorSugerencias(query, ciudad)` — devuelve top 5 sugerencias
- `useBuscadorPopulares(ciudad)` — devuelve top 6 búsquedas populares
- `useBuscadorResultados({ q, filtros, ordenar, ciudad, lat, lng })` — paginado, devuelve artículos + total

---

## 🔗 Integraciones con Otros Módulos

### ChatYA

- **Contacto comprador → vendedor** se realiza desde ChatYA con `contextoTipo='marketplace'` y un nuevo campo `articuloMarketplaceId` en `chat_conv` (a sumar al schema existente).
- En el header de la VentanaChat, cuando es contexto MarketPlace, se muestra una mini-card del artículo: foto + título + precio + botón "Ver publicación →".
- Si la publicación pasa a estado `vendida`, `pausada` o `eliminada`, el chat queda intacto pero la mini-card muestra un badge correspondiente y el botón "Ver publicación" deja de funcionar (estado `inactivo`).

### Mis Guardados

- Los artículos de MarketPlace se guardan con `entity_type='articulo_marketplace'` en la tabla `guardados` existente.
- En `/guardados`, la tab **"Artículos"** (que actualmente está como "Próximamente disponible") se activa con esta integración.

### Mis Publicaciones (`/mis-publicaciones`)

- **Página global del modo Personal**, fuera del módulo MarketPlace.
- Ya existe como placeholder en producción.
- En el futuro tendrá tabs por tipo de publicación: Artículos del MarketPlace, Servicios (cuando se sumen), etc.
- Su diseño definitivo se aterriza en otro documento (`10-arq-Mis_Publicaciones.md`) cuando se decida cómo encajan los Servicios.
- MarketPlace solo necesita exponer el endpoint `GET /api/marketplace/mis-articulos` para que esa página lo consuma.

### ModalCambiarModo (no aplica)

- Como decidimos bloqueo total para modo comercial, el `ModalCambiarModo` NO se invoca desde MarketPlace.
- Si el usuario en modo comercial entra por URL → redirige directo a `/inicio`.

### Sistema Universal de Compartir

- Los artículos generan link público `/p/articulo-marketplace/:id` similar al sistema existente de Negocios y Ofertas.
- Página pública renderiza con OG tags (foto + título + precio) para compartir en redes sociales.
- Si el visitante no está logueado y toca "Enviar mensaje" → `ModalAuthRequerido` (componente existente).

### PanelNotificaciones (campanita global)

- Eventos del MarketPlace que disparan notificaciones:
  - **Nuevo mensaje** sobre tu publicación → ya lo maneja ChatYA
  - **Publicación próxima a expirar** (faltan 3 días para los 30) → notificación tipo `marketplace_proxima_expirar`
  - **Publicación expirada** (pasó a Pausada por TTL) → notificación tipo `marketplace_expirada`

### Onboarding y Auth

- MarketPlace requiere usuario autenticado. Sin auth, las páginas públicas (`/p/articulo-marketplace/:id`) sí son visibles pero el botón de mensaje muestra `ModalAuthRequerido`.
- No requiere un flujo de onboarding adicional — cualquier usuario en modo Personal puede publicar de inmediato.


---

## 🔌 Backend — Endpoints Sugeridos

> Estos son endpoints **sugeridos** para guiar la implementación. Los nombres y rutas finales se definen al armar `apps/api/src/routes/marketplace.routes.ts`.

### Públicos (sin auth, con `verificarTokenOpcional`)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/marketplace/feed` | Feed inicial (recientes + cercanos) por ciudad y GPS |
| GET | `/api/marketplace/articulos/:id` | Detalle público de un artículo (para link compartido) |
| POST | `/api/marketplace/articulos/:id/vista` | Registrar vista (incrementa contador, sin auth) |
| GET | `/api/marketplace/buscar/sugerencias` | Sugerencias en vivo (autocompletar) |
| GET | `/api/marketplace/buscar/populares` | Top búsquedas populares por ciudad |
| GET | `/api/marketplace/buscar` | Resultados de búsqueda con filtros |
| GET | `/api/marketplace/vendedor/:usuarioId` | Perfil público del vendedor + sus publicaciones |

### Privados (requieren `verificarToken` + modo Personal)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/marketplace/articulos` | Crear artículo |
| PUT | `/api/marketplace/articulos/:id` | Editar artículo (solo dueño) |
| PATCH | `/api/marketplace/articulos/:id/estado` | Cambiar estado (pausar/activar/vender) |
| DELETE | `/api/marketplace/articulos/:id` | Eliminar (soft delete, solo dueño) |
| GET | `/api/marketplace/mis-articulos` | Lista paginada de artículos del usuario actual |
| POST | `/api/marketplace/upload-imagen` | Presigned URL para subir foto a R2 (prefijo `marketplace/`) |

### Middleware aplicable

- `verificarToken` o `verificarTokenOpcional` según endpoint
- `validarModoPersonal` (a crear) — equivalente a `ModoGuard` pero para backend, devuelve 403 si el usuario está en modo Comercial
- `verificarPropietarioArticulo` (a crear) — para PUT/DELETE/PATCH, valida que el `usuario_id` del artículo coincida con el token

### Validaciones Zod

Schema `crearArticuloSchema`:

```typescript
{
  titulo: z.string().min(10).max(80),
  precio: z.number().int().positive().max(999999),
  condicion: z.enum(['nuevo', 'seminuevo', 'usado', 'para_reparar']),
  aceptaOfertas: z.boolean(),
  descripcion: z.string().min(50).max(1000),
  fotos: z.array(z.string().url()).min(1).max(8),
  fotoPortadaIndex: z.number().int().min(0).max(7).default(0),
  latitud: z.number(),
  longitud: z.number(),
  zonaAproximada: z.string(),  // ej: "Centro · Manzanillo"
}
```

---

## 🗄️ Base de Datos — Tabla Sugerida

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
  ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,  -- exacta, NUNCA se devuelve al frontend
  ubicacion_aproximada GEOGRAPHY(POINT, 4326) NOT NULL,  -- aleatorizada dentro de 500m, ESTA es la pública
  ciudad VARCHAR(100) NOT NULL,
  zona_aproximada VARCHAR(150) NOT NULL,  -- texto para mostrar (ej: "Centro · Manzanillo")
  
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

### Cambios a tablas existentes

**`chat_conv`** — agregar campo:
```sql
ALTER TABLE chat_conv ADD COLUMN articulo_marketplace_id UUID REFERENCES articulos_marketplace(id) ON DELETE SET NULL;
```

Y agregar `'marketplace'` y `'vendedor_marketplace'` al check constraint de `contexto_tipo`.

**`guardados`** — agregar `'articulo_marketplace'` al enum de `entity_type`.

**`notificaciones`** — agregar tipos:
- `'marketplace_nuevo_mensaje'`
- `'marketplace_proxima_expirar'`
- `'marketplace_expirada'`

### Cron jobs nuevos

- **Auto-pausar artículos expirados:** corre cada hora, marca como `pausada` los artículos donde `expira_at < NOW()` y `estado = 'activa'`. Envía notificación al vendedor.
- **Notificar próxima expiración:** corre diario, notifica a vendedores cuyas publicaciones expiran en 3 días.

### Búsquedas populares (tabla agregada)

Para "Más buscado en [ciudad]":

```sql
CREATE TABLE marketplace_busquedas_log (
  id BIGSERIAL PRIMARY KEY,
  ciudad VARCHAR(100) NOT NULL,
  termino VARCHAR(100) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_busquedas_ciudad_fecha ON marketplace_busquedas_log(ciudad, created_at DESC);
```

Cron diario que agrega los últimos 7 días por ciudad y guarda top 6 en cache (Redis).


---

## 🗓️ Roadmap de Sprints

> Sugerencia de orden de implementación. Cada sprint genera un commit funcional revisable.

### Sprint 1 — Backend base (~1 día)

- Crear tabla `articulos_marketplace` con migración SQL
- Modificar `chat_conv`, `guardados`, `notificaciones` con los campos/enums nuevos
- Schema Drizzle para la tabla nueva
- Service: `marketplace.service.ts` con CRUD básico (crear, obtener, actualizar, eliminar)
- Controller + Routes: 5 endpoints públicos + 5 privados básicos
- Validaciones Zod
- Middleware `validarModoPersonal`
- Test con usuario en modo Personal y modo Comercial

### Sprint 2 — Feed (~1 día)

- Endpoint `GET /api/marketplace/feed` con secciones recientes + cercanos
- Hook React Query `useMarketplaceFeed`
- `PaginaMarketplace.tsx` con header dark sticky + carrusel + grid
- Componente `CardArticulo.tsx` (estilo B)
- Integración con `useGuardados` (botón ❤️)
- Ruta `/marketplace` en router (protegida con guard de modo Personal)
- Visible en BottomNav y Navbar (ya está)

### Sprint 3 — Detalle del artículo (~1 día)

- Endpoint `GET /api/marketplace/articulos/:id` (con `verificarTokenOpcional`)
- Hook `useArticuloMarketplace`
- `PaginaArticuloMarketplace.tsx` con galería + descripción + card vendedor + mapa aproximado
- Integración con `ChatOverlay` (contexto `'marketplace'`)
- Botón WhatsApp con número del vendedor
- Ruta `/marketplace/articulo/:id`

### Sprint 4 — Wizard de Publicar (~1 día)

- Endpoint `POST /api/marketplace/articulos` + `PUT /api/marketplace/articulos/:id`
- Endpoint `/upload-imagen` con presigned URL
- **Crear `apps/api/src/services/marketplace/filtros.ts`** con la lista de palabras prohibidas y funciones `detectarPalabraProhibida(texto)`, `detectarServicio(texto)`, `detectarBusqueda(texto)`
- Validación en backend: rechazar publicación si detecta palabra prohibida (Capa 1.2)
- Validación en frontend: feedback inmediato + modal sugerencia para servicios/búsquedas (Capa 1.3 y 1.4)
- `PaginaPublicarArticulo.tsx` con 3 pasos
- Modo creación + modo edición en el mismo componente
- Validaciones inline + auto-save sessionStorage
- Vista previa en vivo (solo desktop)
- Ruta `/marketplace/publicar` y `/marketplace/publicar/:id`

### Sprint 5 — Perfil del vendedor (~0.5 día)

- Endpoint `GET /api/marketplace/vendedor/:usuarioId`
- `PaginaPerfilVendedor.tsx` con KPIs, tabs, grid
- Cálculo de tiempo de respuesta (query agregada con ChatYA)
- Ruta `/marketplace/vendedor/:id`

### Sprint 6 — Buscador potenciado (~1 día)

- Endpoints de búsqueda: sugerencias, populares, resultados con filtros
- Tabla `marketplace_busquedas_log` + cron de cálculo de populares
- `OverlayBuscador.tsx` con estado vacío + sugerencias en vivo
- Vista de resultados con filtros y orden
- Ruta `/marketplace/buscar?q=…`

### Sprint 7 — Polish + Cron jobs + Sistema de compartir (~0.5 día)

- Cron auto-pausar expirados + notificar próxima expiración
- Notificaciones en `PanelNotificaciones`
- Página pública `/p/articulo-marketplace/:id` con OG tags
- Activar tab "Artículos" en Mis Guardados
- Endpoint `GET /api/marketplace/mis-articulos` para que `/mis-publicaciones` lo consuma
- Tests E2E flujos completos

### Sprint 8 — Sistema de niveles del vendedor (~1 día)

- Migración BD: agregar `nivel_marketplace` y `nivel_marketplace_actualizado_at` a `usuarios`
- Migración BD: agregar `venta_confirmada_por_comprador` y `comprador_id` a `articulos_marketplace`
- Service `marketplace-niveles.service.ts` con función `calcularNivel(usuarioId)` que evalúa los 5 niveles
- Cron `marketplace-niveles.cron.ts` que recalcula niveles de todos los usuarios cada noche
- Endpoint `POST /marcar-vendida` con auto-detección de comprador
- Endpoint `POST /confirmar-compra` (consumido por mensaje automático en ChatYA)
- Mensaje automático en ChatYA al marcar vendida (nuevo tipo de mensaje sistema con 2 botones)
- Componentes UI: badges de nivel en CardArticulo, perfil del vendedor, tooltip explicativo
- Integración en buscador: boost de prioridad para niveles 3 y 4
- Notificación push al subir de nivel

### Total estimado: ~6 días de trabajo

> El estimado original del Roadmap era 4 días. Se extiende a 6 por incluir el buscador potenciado, sistema de compartir y sistema de niveles del vendedor. **El sistema de niveles puede dejarse para v1.1** si se quiere lanzar antes — el módulo funciona sin él, y los niveles se pueden activar después con un cron retroactivo que calcule basado en datos históricos.

---

## ❓ Preguntas Pendientes

> Decisiones que se postergaron para resolver durante la implementación. NO bloquean el inicio del sprint, pero hay que cerrarlas antes de los sprints correspondientes.

### Pendientes de UX

1. **Drag & drop para reordenar fotos** en el wizard — nice-to-have. ¿Lo metemos en v1 o esperamos a v1.1?
2. **¿Mostrar el número de teléfono o solo el botón WhatsApp?** — por privacidad, mejor solo el botón que abre el chat con mensaje precargado.
3. **Política de fotos prohibidas** — bloquear automáticamente subida de fotos con ciertos contenidos detectados (a futuro).

### Pendientes técnicos

5. **Aleatorización de la ubicación aproximada** — ¿la hacemos al guardar (genera 1 vez y queda fija) o al consultar (cambia cada vez)? Recomendación: al guardar, así el círculo no "salta" entre sesiones.
6. **Caché del feed** — ¿stale-time de cuántos minutos? Recomendación: 2 min para "Recién", 5 min para "Cerca".
7. **Política de re-publicación** — si una publicación expiró, ¿el usuario puede reactivarla con 1 click o tiene que volver a llenar el wizard? Recomendación: 1 click, que extienda 30 días más.

### Pendientes de producto

8. **¿Qué pasa con publicaciones de un usuario que cambia a modo Comercial?** — sus publicaciones deberían quedar visibles, pero él no podría editarlas hasta volver a Personal. Necesita confirmación.
9. **¿Cómo manejamos** un mismo artículo publicado en MarketPlace que también aparece en el catálogo de un negocio? — no debería pasar (el usuario no es negocio), pero si en el futuro permitimos a negocios publicar usados, hay que pensarlo.
10. **Reseñas del comprador al vendedor (post-v1)** — ¿se hace por confianza o se vincula a algún evento confirmable?

---

## 📚 Referencias

### Documentos relacionados

- `01-VISION_ESTRATEGICA.md` §3.1 — definición estratégica del MarketPlace
- `02-ROADMAP.md` — Sprint 6.1 con estimación de 4 días
- `10-arq-Sistema.md` §1.2 — Sistema de Modos (visibilidad por modo)
- `10-arq-ChatYA.md` — integración del chat
- `10-arq-Guardados.md` — tab "Artículos" pendiente de activar
- `20-est-TOKENS_GLOBALES.md` Regla 13 — estética profesional B2B
- `20-est-TOKENS_COMPONENTES.md` §7 — Dark Gradient de Marca para botones

### Código de referencia (patrones a replicar)

- `41-fe-PaginaPerfilNegocio.tsx` — layout 2 columnas en desktop con sticky derecha
- `66-fe-page-public-PaginaArticuloPublico.tsx` — galería con thumbnails + descripción
- `68-fe-page-cardya-PaginaCardYA.tsx` — header dark sticky con tabs
- `49-fe-negocios-CardNegocio.tsx` — NO replicar el glassmorphism (MarketPlace usa estilo B)
- `47-fe-layout-BottomNav.tsx` — la lógica de visibilidad por modo ya existe ahí

---

**Última actualización:** 03 Mayo 2026
**Estado del documento:** Versión 1.0 — Listo para arrancar Sprint 1 en Claude Code
