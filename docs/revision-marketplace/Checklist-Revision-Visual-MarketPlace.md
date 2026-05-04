# 📋 Checklist Exhaustivo — Revisión Visual MarketPlace v1

> **Propósito:** revisar exhaustivamente cada pantalla del módulo MarketPlace en las 3 resoluciones para detectar bugs visuales, problemas de UX, inconsistencias y oportunidades de mejora.
>
> **Resoluciones a revisar (3 estándares del proyecto):**
> - **Móvil** — `375px` ancho (iPhone SE / Galaxy S)
> - **Laptop** — `1366×768`
> - **Desktop** — `1920×1080` o más
>
> **Formato:** Cada pantalla tiene su propio bloque. Dentro, items agrupados por tipo. Marca cada item conforme avanzas.

---

## 🎯 Cómo usar este checklist

1. Abre la pantalla correspondiente en tu navegador en la resolución indicada.
2. Toma screenshot.
3. Pásalo al chat (Claude Code) junto con el item del checklist que estás revisando.
4. Si todo está bien → marcas ✅ y pasas al siguiente.
5. Si hay problema → discuten la solución → aplicas el fix → revisas de nuevo.
6. **NO usar previews automáticos** — siempre tú abres y compartes screenshot.

---

## 📱 P1 — Feed de MarketPlace (`/marketplace`)

### Móvil (375px)

#### Header dark sticky
- [ ] Logo "MarketPlace" visible y legible
- [ ] Subtítulo "COMPRA-VENTA LOCAL" presente con tracking-wider
- [ ] Glow teal sutil en esquina superior derecha
- [ ] Grid pattern sutil de fondo (opacity 0.08)
- [ ] Header se queda fijo al hacer scroll (sticky)
- [ ] Sin rounded corners en móvil (full-width)
- [ ] Indicador de ciudad visible: "📍 Manzanillo · X artículos"
- [ ] Verifica que el título de página en pestaña del navegador sea correcto

#### Carrusel "Recién publicado"
- [ ] Título "✦ LO MÁS FRESCO" visible
- [ ] Subtítulo "Recién publicados"
- [ ] Carrusel con scroll horizontal funciona
- [ ] Cards no se cortan a la mitad (snap correcto)
- [ ] Padding lateral consistente
- [ ] Si hay menos de 4 artículos, no debería haber espacio raro

#### Grid "Cerca de ti"
- [ ] Título "📍 A PASOS DE AQUÍ" visible
- [ ] Subtítulo "Cerca de ti"
- [ ] Grid de **2 columnas** (correcto en móvil)
- [ ] Espaciado entre cards consistente
- [ ] Scroll infinito carga más al hacer scroll

#### Card del artículo
- [ ] Imagen aspect 1:1 (cuadrada)
- [ ] Imagen no se ve estirada/aplastada
- [ ] Badge "NUEVO" en esquina superior izquierda si <24h
- [ ] Botón ❤️ en esquina superior derecha
- [ ] Precio bold y grande, formato `$11,910`
- [ ] Título 1 línea con truncado correcto
- [ ] Línea con distancia + tiempo en gris pequeño
- [ ] Border 2px slate-300, sombra `shadow-md`
- [ ] Sin glassmorphism, sin gradientes pastel
- [ ] Tap en card navega a detalle
- [ ] Tap en ❤️ togglea sin navegar

#### FAB "+ Publicar artículo"
- [ ] Visible en esquina inferior derecha
- [ ] No se solapa con BottomNav (usa `pb-safe` o `bottom-X`)
- [ ] Tap navega a `/marketplace/publicar`
- [ ] Color negro con icono +
- [ ] Sombra apropiada

#### Estados especiales
- [ ] **Sin GPS:** banner amarillo accionable "Activa tu ubicación" con botón
- [ ] **Sin GPS:** muestra solo "Recién publicado" (sin "Cerca de ti")
- [ ] **Loading inicial:** spinner centrado o skeleton
- [ ] **Sin artículos en tu ciudad:** mensaje amistoso "Aún no hay artículos..."
- [ ] **Error de red:** bloque rojo con botón reintentar

#### Buscador (Navbar global)
- [ ] Input del Navbar muestra placeholder "Buscar en Marketplace..." cuando estás en `/marketplace`
- [ ] Tap en el input abre el overlay (P5)
- [ ] NO hay input de búsqueda dentro del header dark de MarketPlace (input único global)

---

### Laptop (1366×768)

#### Header dark sticky
- [ ] `lg:rounded-b-3xl` aplicado (esquinas redondeadas inferiores)
- [ ] Logo + subtítulo visibles
- [ ] CTA "+ Publicar artículo" inline a la derecha (no es FAB)
- [ ] Espaciado horizontal consistente

#### Carrusel "Recién publicado"
- [ ] Drag-to-scroll funciona con cursor (mouse)
- [ ] Cards se ven proporcionales (no muy chicas ni muy grandes)
- [ ] Si hay flechas de navegación, son visibles y funcionales

#### Grid "Cerca de ti"
- [ ] Grid de **4 columnas** (laptop)
- [ ] Cards no quedan demasiado anchas o desproporcionadas
- [ ] Hover en card: sombra cambia o ligera elevación visual
- [ ] Hover en ❤️: cambio de cursor a pointer

#### Sin FAB
- [ ] No debe aparecer el FAB en laptop+ (CTA está en el header)

---

### Desktop (1920×1080)

#### Header
- [ ] Header se ve proporcional, no estirado ni vacío
- [ ] Espaciado horizontal apropiado para pantalla grande

#### Grid "Cerca de ti"
- [ ] Grid de **6 columnas** (desktop ≥96rem según `2xl:`)
- [ ] Cards no se ven minúsculas ni desperdician espacio
- [ ] Margen lateral apropiado (no contenido pegado a los bordes)

---

## 🛒 P2 — Detalle del Artículo (`/marketplace/articulo/:id`)

### Móvil (375px)

#### Header transparente flotante
- [ ] 4 botones visibles: ← atrás, ↑ compartir, ❤️ guardar, ⋯ menú
- [ ] Botones sobre fondo gradiente oscuro `from-black/40 to-transparent`
- [ ] Botones legibles sobre cualquier color de imagen
- [ ] Tap en ← regresa al feed correctamente

#### Galería
- [ ] Swipe horizontal funciona
- [ ] Indicador "1/8" en esquina inferior derecha
- [ ] Indicador se actualiza dinámicamente al swipear
- [ ] Tap en imagen abre `ModalImagenes` (lightbox fullscreen)
- [ ] Lightbox tiene navegación con swipe + cerrar con X
- [ ] Si solo hay 1 foto, indicador no aparece o muestra "1/1"

#### Bloque info
- [ ] Precio bold gigante (`$11,910`)
- [ ] Título completo (no truncado)
- [ ] Chips: condición + distancia
- [ ] Línea: "hace 6d · 144 vistas" en gris

#### Descripción
- [ ] Título "Descripción" visible
- [ ] Texto completo legible
- [ ] Si la descripción es larga, scroll vertical funciona

#### CardVendedor
- [ ] Avatar circular 48px (con fallback a iniciales si no hay foto)
- [ ] Nombre + ciudad
- [ ] Link "Ver perfil →" a la derecha
- [ ] Tap en "Ver perfil →" navega a `/marketplace/vendedor/:id`

#### Mapa de ubicación
- [ ] Mapa Leaflet visible
- [ ] Círculo teal de 500m visible
- [ ] **NO hay marker central** (solo el círculo)
- [ ] Mapa NO es interactivo (no se puede hacer zoom/drag)
- [ ] Texto debajo: "Mostraremos un círculo de 500m, no la dirección exacta..."

#### BarraContacto fija inferior
- [ ] Visible en `bottom-0` por encima del BottomNav (sin solaparse)
- [ ] Botón WhatsApp verde `#25D366` con icono
- [ ] Botón "Enviar mensaje" negro Dark Gradient
- [ ] Si vendedor sin teléfono → WhatsApp oculto (solo "Enviar mensaje")
- [ ] Tap WhatsApp abre `wa.me/...` con mensaje precargado
- [ ] Tap "Enviar mensaje" abre ChatYA con contexto correcto

#### Estados especiales (visualización)
- [ ] **Loading:** spinner centrado fullscreen
- [ ] **Error:** bloque con mensaje + botón reintentar
- [ ] **404:** icono + "Artículo no encontrado" + botón "Volver al MarketPlace"
- [ ] **Estado pausada (visitante):** overlay con badge "PAUSADO" sobre galería
- [ ] **Estado vendida (visitante):** overlay con badge "VENDIDO" sobre galería
- [ ] **Si eres dueño + estado=pausada:** botón "Reactivar publicación" REEMPLAZA la BarraContacto
- [ ] **Si eres el dueño:** BarraContacto oculta (no contactarte a ti mismo)

#### Menú ⋯
- [ ] Tap abre popover con "Bloquear vendedor"
- [ ] "Bloquear vendedor" muestra `notificar.info('Próximamente disponible')`

---

### Laptop (1366×768)

#### Layout 2 columnas (60/40)
- [ ] Columna izquierda 60% con galería + descripción + mapa
- [ ] Columna derecha 40% sticky con precio + vendedor + contacto
- [ ] Columna derecha se queda fija al hacer scroll
- [ ] Espaciado entre columnas apropiado

#### Galería desktop
- [ ] Thumbnails verticales 88px a la izquierda
- [ ] Imagen principal grande a la derecha
- [ ] Click en thumbnail cambia imagen principal sin abrir lightbox
- [ ] Click en imagen principal abre lightbox
- [ ] Thumbnail activa con borde teal-500

#### BarraContacto en columna derecha
- [ ] Inline (no fija al fondo)
- [ ] Botones legibles y proporcionales

---

### Desktop (1920×1080)

- [ ] Layout no se ve desperdiciado ni estirado
- [ ] Galería principal se ve grande pero proporcional
- [ ] Margen lateral cómodo (contenido centrado)

---

## 👤 P3 — Perfil del Vendedor (`/marketplace/vendedor/:id`)

### Móvil (375px)

#### Header transparente flotante
- [ ] ← atrás visible
- [ ] ⋯ menú con "Bloquear usuario"
- [ ] Sin portada decorativa (decisión consciente)

#### Hero del vendedor
- [ ] Avatar grande (96px) circular centrado
- [ ] Nombre completo legible
- [ ] Ciudad debajo del nombre
- [ ] "Miembro desde [Mes Año]"
- [ ] **SIN badge "✓ Verificado"** (correcto, decisión consciente)
- [ ] Bloque blanco limpio sin pastel

#### KPIs en fila
- [ ] 3 KPIs: Publicaciones activas / Vendidos / Tiempo respuesta
- [ ] Estética profesional (sin emojis como datos, sin saltos tipográficos)
- [ ] Si tiempo respuesta = "—", se ve correcto (no roto)
- [ ] Layout en fila inline funciona

#### Botones de acción
- [ ] "Enviar mensaje" Dark Gradient negro
- [ ] "Seguir vendedor" blanco con borde slate
- [ ] Si visitas tu propio perfil → ambos botones ocultos
- [ ] Tap "Seguir": cambia estado visualmente (color/texto)
- [ ] Tap "Enviar mensaje" abre ChatYA con `contextoTipo='vendedor_marketplace'`

#### Tabs Publicaciones / Vendidos
- [ ] Tabs con conteos: "Publicaciones (X)" | "Vendidos (X)"
- [ ] Subrayado teal en tab activa
- [ ] Click en tab cambia el grid
- [ ] Tab activa tiene contraste visual claro

#### Grid de publicaciones
- [ ] Grid 2 columnas en móvil
- [ ] Reusa CardArticulo del feed
- [ ] En tab "Vendidos": cada card con overlay slate translúcido + texto "VENDIDO" centrado
- [ ] Estado vacío por tab: mensaje amistoso

#### Estados especiales
- [ ] **Vendedor bloqueó al visitante:** muestra 404 sin revelar el bloqueo
- [ ] **Loading:** spinner
- [ ] **Sin publicaciones:** mensaje "Este vendedor no tiene publicaciones"

---

### Laptop (1366×768)
- [ ] KPIs en fila completa, no apretados
- [ ] Grid de publicaciones en 4 columnas
- [ ] Botones de acción tamaño apropiado

### Desktop (1920×1080)
- [ ] Layout no desperdicia espacio
- [ ] Grid en 4-5 columnas según ancho

---

## ✏️ P4 — Wizard de Publicar (`/marketplace/publicar` y `/:articuloId`)

### Móvil (375px) — los 3 pasos

#### Header del wizard
- [ ] ← atrás visible
- [ ] "Paso X de 3" centrado
- [ ] Barra de progreso con 3 segmentos
- [ ] Segmento activo en teal, otros en slate
- [ ] Tap en ← muestra confirmación "¿Salir sin publicar?"

#### Paso 1 — Fotos y Título
- [ ] Texto guía: "Fotos · hasta 8" + tip de calidad
- [ ] Grid de 8 slots visible
- [ ] Slot vacío con border dashed y "+"
- [ ] Tap en slot abre selector de archivos
- [ ] Foto subida muestra preview correctamente
- [ ] Botón X en cada foto para borrar
- [ ] Primera foto marcada con badge "Portada" en teal
- [ ] Input "Título" con contador "0/80"
- [ ] Validación inline: error en rojo si <10 chars
- [ ] Botón "Continuar" deshabilitado si no cumple mínimos
- [ ] Mientras sube foto: indicador de progreso

#### Paso 2 — Precio y Detalles
- [ ] Input precio grande con `$` prefix y `MXN` suffix
- [ ] Input solo acepta números enteros
- [ ] 4 chips condición visibles, selección única funciona
- [ ] Chip activo con `aria-pressed` y color teal
- [ ] Toggle "Acepta ofertas" con default true
- [ ] Textarea descripción con contador "148/1000"
- [ ] Si precio < $10: modal advertencia antes de continuar
- [ ] Botón "Continuar" deshabilitado si no cumple mínimos
- [ ] Botón "Anterior" funciona y conserva datos del paso 1

#### Paso 3 — Ubicación y Confirmación
- [ ] Mapa Leaflet con círculo 500m alrededor de GPS o ciudad
- [ ] Mapa NO interactivo (igual que detalle)
- [ ] Texto: "Mostraremos un círculo de 500m, no tu dirección exacta"
- [ ] Si NO hay GPS ni ciudad: banner amarillo, no permite avanzar
- [ ] Resumen compacto: foto portada + título + precio + condición
- [ ] **En modo crear:** checklist 3 items visible, todos requeridos
- [ ] **En modo editar:** checklist NO se muestra
- [ ] Botón final cambia según modo: "Publicar ahora" o "Guardar cambios"
- [ ] Botón final deshabilitado hasta cumplir todo

#### Modal de moderación — Rechazo duro (palabra prohibida)
- [ ] Si pones "rifa" en título: modal rojo bloquea
- [ ] Mensaje específico de la categoría
- [ ] Solo botón "Entendido" para cerrar
- [ ] No permite avanzar hasta corregir

#### Modal de moderación — Sugerencia suave (servicio/búsqueda)
- [ ] Si pones "doy clases de inglés": modal amarillo aparece
- [ ] 2 botones: "Editar mi publicación" / "Continuar de todos modos"
- [ ] "Editar" cierra modal y vuelve al paso correspondiente
- [ ] "Continuar" reenvía con confirmadoPorUsuario:true y publica

#### Auto-save sessionStorage
- [ ] Si recargas la página a mitad del wizard, los datos se preservan
- [ ] Modo crear y modo editar tienen claves separadas (no se mezclan)

---

### Laptop (1366×768)

#### Vista previa en vivo
- [ ] Layout 2 columnas (`lg:grid-cols-[60%_40%]`)
- [ ] Izquierda: formulario del paso actual
- [ ] Derecha: Card del artículo en vivo, actualizada conforme escribes
- [ ] Tip debajo de la card visible

### Desktop (1920×1080)
- [ ] Vista previa proporcional
- [ ] Espaciado cómodo

---

## 🔍 P5 — Buscador Potenciado (overlay + página resultados)

### Overlay (móvil 375px)

#### Apertura
- [ ] Tap en input del Navbar global abre overlay
- [ ] Backdrop oscuro detrás del overlay
- [ ] **NO hay input dentro del overlay** (input único es el del Navbar)

#### Estado vacío (sin escribir)
- [ ] Sección "Búsquedas recientes" si hay
- [ ] Chips eliminables con X
- [ ] Botón "Borrar todo"
- [ ] Sección "Más buscado en [ciudad]" con chips
- [ ] Si no hay recientes: solo populares
- [ ] Si no hay populares: estado vacío amistoso

#### Mientras escribes (debounce 300ms)
- [ ] Si escribes 1 char: no busca
- [ ] Si escribes ≥2 chars: muestra sugerencias
- [ ] Sugerencias son títulos completos de artículos existentes
- [ ] Cada sugerencia con icono ↗
- [ ] Tap en sugerencia ejecuta búsqueda + guarda en localStorage

#### Cerrar overlay
- [ ] Tap en backdrop cierra overlay
- [ ] Vaciar el input cierra overlay (con delay para no perder click)

---

### Página de Resultados (`/marketplace/buscar`)

#### Header (móvil 375px)
- [ ] ← atrás
- [ ] Título "[query] · X resultados"
- [ ] Botón Filtros visible
- [ ] Dropdown ordenar visible

#### Chips de filtros activos
- [ ] Chips arriba del grid
- [ ] Cada chip removible con X
- [ ] Botón "Limpiar todos" si hay 2+
- [ ] Si no hay filtros activos, sección oculta

#### Grid de resultados
- [ ] 2 columnas móvil
- [ ] Reusa CardArticulo
- [ ] Scroll infinito carga más al hacer scroll
- [ ] Indicador de loading en el sentinel inferior

#### Estado vacío
- [ ] Mensaje "No encontramos artículos para '[query]'"
- [ ] Botón "Limpiar filtros" si hay filtros activos
- [ ] Sugerencia de qué probar

#### Filtros (bottom sheet móvil)
- [ ] Bottom sheet sube desde abajo
- [ ] Backdrop oscuro
- [ ] Filtro Distancia: chips única (1km, 3km, 5km, 10km, 25km, 50km)
- [ ] Distancia se OCULTA si no hay GPS
- [ ] Filtro Precio: slider con presets + min/max manual
- [ ] Filtro Condición: chips múltiples (4 opciones)
- [ ] Botones "Aplicar" y "Limpiar"

#### Ordenar (dropdown)
- [ ] 4 opciones: Más recientes, Más cercanos (si GPS), Precio menor, Precio mayor
- [ ] Selección actual visible

#### URL state
- [ ] La URL refleja filtros: `/marketplace/buscar?q=...&precioMax=...`
- [ ] Refrescar la página mantiene filtros
- [ ] Compartir el link funciona

---

### Laptop (1366×768)

- [ ] Grid de resultados en 3-4 columnas
- [ ] Filtros en sidebar fija a la izquierda (no bottom sheet)
- [ ] Sidebar con scroll independiente si es muy alta

### Desktop (1920×1080)

- [ ] Grid en 4-6 columnas
- [ ] Sidebar de filtros con tamaño cómodo

---

## 🌐 P6 — Página Pública Compartible (`/p/articulo-marketplace/:id`)

### Sin login (móvil 375px)

#### Verificación de OG tags
- [ ] Compartir el link en WhatsApp: muestra preview con foto + precio + título
- [ ] Compartir en Facebook: igual
- [ ] Inspeccionar `<head>` del HTML: meta tags `og:title`, `og:description`, `og:image` presentes

#### Estructura
- [ ] NO hay Navbar/BottomNav (fuera del MainLayout privado)
- [ ] Galería + descripción + card vendedor + mapa
- [ ] Footer con CTA "Descubre más en AnunciaYA →"

#### Botones de contacto (sin login)
- [ ] **NO hay botón WhatsApp directo** (privacidad)
- [ ] Solo "Enviar mensaje al vendedor"
- [ ] Tap en "Enviar mensaje" abre `ModalAuthRequerido`
- [ ] Modal tiene opciones de login/registro
- [ ] Después de login redirige de vuelta al artículo

#### Estados según artículo
- [ ] **Activa:** layout normal con botón Enviar mensaje
- [ ] **Pausada:** overlay "Esta publicación está pausada por el vendedor", botones ocultos
- [ ] **Vendida:** overlay "Este artículo ya fue vendido", botones ocultos
- [ ] **Eliminada:** muestra 404 amigable (no detalle del artículo)

### Con login (móvil 375px)
- [ ] Si entras logueado, sí aparece botón WhatsApp
- [ ] Botón "Enviar mensaje" abre ChatYA directamente

---

## 🔗 Flujos transversales a verificar

### Flujo Comprador completo
- [ ] Entrar a `/marketplace`
- [ ] Ver feed con cards
- [ ] Tap en card → ver detalle
- [ ] Tap ❤️ guardar
- [ ] Ir a `/guardados` → tab Artículos → ver el artículo guardado
- [ ] Tap en card guardada → vuelve al detalle
- [ ] Tap "Enviar mensaje" → ChatYA abre con contexto correcto
- [ ] Verificar que el chat tiene mini-card del artículo arriba

### Flujo Vendedor completo
- [ ] Entrar a `/marketplace` (modo Personal)
- [ ] Tap "+ Publicar artículo"
- [ ] Completar paso 1 (foto + título)
- [ ] Completar paso 2 (precio + condición + descripción)
- [ ] Completar paso 3 (ubicación + checklist)
- [ ] Tap "Publicar ahora"
- [ ] Verificar que aparece en el feed
- [ ] Editar el artículo
- [ ] Pausar el artículo
- [ ] Reactivar el artículo
- [ ] Marcar como vendida

### Flujo Modo Comercial bloqueado
- [ ] Cambiar a modo Comercial
- [ ] Verificar que `/marketplace` NO aparece en BottomNav
- [ ] Intentar entrar por URL: `/marketplace`
- [ ] Verificar redirección a `/inicio` con notificar.info
- [ ] Repetir con `/marketplace/articulo/:id`, `/marketplace/publicar`, etc.

### Flujo Moderación
- [ ] En el wizard, escribir "rifa especial" en título
- [ ] Verificar modal de rechazo duro
- [ ] Cambiar a "doy clases de plomería"
- [ ] Verificar modal de sugerencia suave
- [ ] Tap "Continuar de todos modos" → publica

### Flujo Buscador
- [ ] Tap en buscador del Navbar (estando en `/marketplace`)
- [ ] Verificar overlay con recientes/populares
- [ ] Escribir "bici" → verificar sugerencias
- [ ] Tap en sugerencia → verificar navegación a `/marketplace/buscar?q=...`
- [ ] Aplicar filtros → verificar URL actualiza
- [ ] Compartir URL → otra pestaña debería mostrar mismos resultados

### Flujo Compartir
- [ ] En detalle del artículo, tap ↑ compartir
- [ ] Verificar que copia el link `/p/articulo-marketplace/:id`
- [ ] Abrir el link en navegador sin login
- [ ] Verificar que se ve la versión pública correcta

---

## 🎨 Verificaciones visuales globales

Aplicar a TODAS las pantallas:

### Tipografía
- [ ] Tamaños de texto consistentes con el sistema de tokens
- [ ] No hay textos cortados ni con overflow
- [ ] Jerarquía clara (títulos vs cuerpo vs metadata)
- [ ] Sin saltos tipográficos exagerados

### Colores
- [ ] Color teal usado solo en MarketPlace (no se mezcla con otros módulos)
- [ ] Sin tonos pastel saturados
- [ ] Botones principales en negro Dark Gradient
- [ ] Estados (error/warning/éxito) usan colores semánticos correctos

### Espaciado
- [ ] Padding lateral consistente en todas las secciones
- [ ] Márgenes verticales no exagerados ni apretados
- [ ] Cards no pegadas a los bordes de pantalla en móvil

### Iconos
- [ ] Iconos 14-16px en general
- [ ] Sin iconos en círculos pastel
- [ ] Iconos coherentes con la librería (Lucide React)

### Bordes
- [ ] Bordes 1-2px, no más
- [ ] Border-radius consistente (rounded-xl en cards, rounded-lg en botones)

### Hover states (laptop+)
- [ ] Todos los botones cambian cursor a pointer
- [ ] Hover sutil (no escalado dramático)

### Estados de carga
- [ ] Loading visible y claro en cada acción
- [ ] Skeleton en lugar de spinner en componentes complejos
- [ ] No hay flash de contenido vacío

### Accesibilidad básica
- [ ] Botones tienen texto o aria-label
- [ ] Inputs tienen labels asociados
- [ ] Contraste de texto suficiente
- [ ] Focus visible al tabular

---

## 📊 Resumen al cierre

Al terminar la revisión, anotar:
- Total de items revisados: _____ / _____
- Bugs visuales encontrados y corregidos: _____
- Mejoras de UX implementadas: _____
- Items pendientes para v1.1+: _____
