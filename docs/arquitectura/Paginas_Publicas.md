# Páginas Públicas (rutas `/p/...` y `/registro`)

> **Estado:** ✅ Sistema unificado v3 (06 ago 2026) — 7 páginas públicas con el mismo chrome, mismo patrón de card de negocio/autor (avatar + ChatYA + WhatsApp + "Publicado hace X" + "Ver negocio"), mismo tratamiento de imagen (full-bleed móvil + zoom hover + `aspect-[4/3]`) y mismo `ModalAuthRequerido` por color de módulo.

## Propósito

Las páginas públicas son las que ven los visitantes **sin sesión** cuando alguien comparte un link desde la app autenticada. Cada link `/p/...` corresponde a un detalle (producto, oferta, artículo de MarketPlace, Dinámica, publicación de Servicios, perfil de negocio, publicación de negocio) accesible de manera estable sin requerir login.

El objetivo: que el visitante público sienta la **misma marca** que la app autenticada — al hacer login no debe haber corte visual de fondo, header ni footer.

---

## Rutas y archivos

| Ruta | Archivo | Layout | Contexto |
|------|---------|--------|----------|
| `/p/articulo/:articuloId` | `apps/web/src/pages/public/PaginaArticuloPublico.tsx` | Auto-contenido | Producto/servicio del catálogo de un negocio |
| `/p/oferta/:ofertaId` | `apps/web/src/pages/public/PaginaOfertaPublico.tsx` | Auto-contenido | Oferta de un negocio |
| `/p/articulo-marketplace/:articuloId` | `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx` | Auto-contenido | Artículo P2P del MarketPlace |
| `/p/dinamica/:dinamicaId` | `apps/web/src/pages/public/PaginaDinamicaPublica.tsx` | Auto-contenido | Rifa/Dinámica |
| `/p/servicio/:publicacionId` | `apps/web/src/pages/public/PaginaServicioPublico.tsx` | Auto-contenido | Vacante / servicio-persona / solicito (Servicios) |
| `/p/negocio-post/:publicacionId` | `apps/web/src/pages/public/PaginaPublicacionNegocioPublica.tsx` | Auto-contenido | Publicación del feed de un negocio |
| `/p/negocio/:sucursalId` | `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` | Vía `LayoutPublico` | Perfil de un negocio |
| `/registro` | `apps/web/src/pages/public/PaginaRegistro.tsx` | Auto-contenido | Formulario de registro |

> `PaginaPerfilNegocio` se reutiliza para la vista pública envolviéndola en `LayoutPublico` (con el prop `sinPaddingMovil` — ver más abajo). Las otras 6 son específicas para el caso público, todas con el mismo esqueleto (`HeaderPublico` + `<main overflow-y-auto>` + `FooterPublico`).

---

## Arquitectura visual

### Chrome (header + footer + fondo)

Todas las páginas públicas comparten el mismo "chrome":

- **`HeaderPublico`** (`apps/web/src/components/public/HeaderPublico.tsx`):
  - Background: clase `.bg-header-app` (gradient azul `linear-gradient(90deg, #1e3a8a, #2563eb)` — mismo que `Navbar` autenticado).
  - Logo `/logo-anunciaya-azul.webp`, `h-11 lg:h-9 2xl:h-11` — mismo tamaño que el resto del chrome público (ver nota `LayoutPublico` abajo, que antes tenía un tamaño distinto en móvil).
  - Beneficios desktop: 3 iconos en tonos claros (`amber-300`, `blue-200`, `green-300`) + texto blanco + separadores `text-white/60 font-bold`.
  - Botón "Registrarse": `bg-white text-blue-700 rounded-full font-bold` (estilo "tab activo" del Navbar — pill blanco prominente).
  - Wrapper sticky con `<div className="header-app-shine" />` debajo (línea brillante animada).
  - Padding alineado al Navbar: `px-4 lg:px-4 2xl:px-8 py-2.5 lg:py-3 2xl:py-4`. **Sin** `max-w-` wrapper interno — full width como en Navbar.

- **`FooterPublico`** (`apps/web/src/components/public/FooterPublico.tsx`):
  - Background `bg-black` con logo azul + copyright + redes sociales (mismo estilo que `FooterLanding`).
  - Botón flotante "Volver arriba" condicional al scroll: aparece cuando `<main className="overflow-y-auto">` ancestro tiene `scrollTop > 100px`. Fade `opacity-0 → opacity-100`.
  - Layout responsive: una fila desktop / 2 líneas móvil.

- **`LayoutPublico`** (`apps/web/src/components/layout/LayoutPublico.tsx`):
  - Wrapper para `PaginaPerfilNegocio` cuando se accede vía `/p/negocio/...`.
  - Estructura `flex h-screen flex-col` con `bg-app-degradado` + header gradient + `<main className="flex-1 min-h-0 overflow-y-auto">` que envuelve children + `<FooterPublico />`.
  - Reusa `<FooterPublico />` (eliminada la duplicación inline de ~110 líneas).
  - **Prop `sinPaddingMovil`** (nuevo): `PaginaPerfilNegocio` lo pasa siempre en ruta pública. Quita el `px-4`/`pt-4` del wrapper en móvil — `PaginaPerfilNegocio` ya trae su propio padding por sección (`ml-5` en el logo, `px-5` en Ofertas/Catálogo, igual que la vista privada) y se duplicaba con el del layout, además de dejar un margen encima de la portada. El `pb-4` se conserva para no dejar el contenido pegado al footer. Otros consumidores de `LayoutPublico` (Términos, Aviso de Privacidad) no lo pasan — sin cambios para ellos.

### Utility classes en `index.css`

```css
/* Fondo degradado azul de la app — mismo que aplica MainLayout */
.bg-app-degradado {
  background: linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%);
}

/* Gradient + shine line del header — mismo que Navbar autenticado */
.bg-header-app {
  background: linear-gradient(90deg, #1e3a8a, #2563eb);
}

.header-app-shine { /* línea brillante 5px de alto debajo del header */ }
@keyframes headerAppShine { /* animación shineLine 2.5s ease-in-out infinite */ }
```

---

## Layout de contenido (6 páginas auto-contenidas)

`PaginaArticuloPublico`, `PaginaOfertaPublico`, `PaginaArticuloMarketplacePublico`, `PaginaDinamicaPublica`, `PaginaServicioPublico` y `PaginaPublicacionNegocioPublica` comparten **el mismo patrón estructural**:

```tsx
<div className="bg-app-degradado flex h-screen flex-col">
  <HeaderPublico />

  <main className="flex-1 overflow-y-auto">
    <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
      <div className="pb-5 lg:pb-8 lg:pt-2">

        {/* Layout 2-col 3fr/2fr en desktop */}
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
          {/* COLUMNA IZQUIERDA */}
          <div className="min-w-0 space-y-5 lg:mt-8 lg:space-y-6">
            {/* Imagen — full-bleed en móvil, card bordeada desde `lg:` */}
            <div className="relative overflow-hidden bg-white lg:rounded-xl lg:border-2 lg:border-slate-300 lg:shadow-md">
              {/* imagen (aspect-[4/3], zoom en hover) + badges píldora con gradiente */}
            </div>

            {/* Solo móvil — en desktop van al panel sticky */}
            <div className="lg:hidden">{/* BloqueInfo: eyebrow · título · precio/valor */}</div>
            <div className="lg:hidden">{/* Card de negocio/autor */}</div>
          </div>

          {/* COLUMNA DERECHA — panel sticky, solo desktop */}
          <div className="hidden lg:-mt-12 lg:flex lg:flex-col">
            <div className="sticky top-10 flex flex-col gap-2">
              <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                {/* BloqueInfo compacto */}
              </div>
              <CardNegocio /> {/* mismo componente que en móvil */}
            </div>
          </div>
        </div>

        {/* CTA "Únete gratis a AnunciaYA" — gancho personalizado por módulo */}
        <CTAUneteAnunciaYA />
      </div>
    </div>

    <FooterPublico />
  </main>
</div>
```

**Decisiones clave:**
- `h-screen` en root + `<main className="flex-1 overflow-y-auto">` → el scroll vive dentro de `<main>` (necesario porque `body` tiene `overflow:hidden` desde lg+ en `index.css`).
- `<FooterPublico />` **dentro** del `<main>` → footer scrollea al final del contenido (no fijo).
- `min-w-0` en grid items → permite compresión cuando hay palabras largas sin espacios.
- Ninguna página envuelve la imagen en `mx-3`/margen en móvil — todas full-bleed (ver siguiente sección).

---

## Imagen — full-bleed móvil + zoom hover + `aspect-[4/3]`

Unificado en las 6 páginas (06 ago 2026). Antes cada módulo tenía su propio tratamiento (Servicios en `16:9`, MarketPlace/Dinámicas cuadradas `1:1`, Producto/Ofertas ya en `4:3` con margen `mx-3`) — ahora todas usan:

- **Contenedor**: `relative overflow-hidden bg-white lg:rounded-xl lg:border-2 lg:border-slate-300 lg:shadow-md` — **sin** margen ni bordes redondeados en móvil (full-bleed, borde a borde), card bordeada solo desde `lg:`.
- **Aspect-ratio móvil**: `aspect-[4/3]` en todas. Desktop mantiene el tratamiento propio de cada galería (bandas de alto fijo o `aspect-[3/2]`, según el módulo).
- **Zoom en hover** (solo desktop): `group` en el wrapper + `transition-transform duration-300 lg:group-hover:scale-[1.02]` en el `<img>`.
- **Click para expandir**: todas las imágenes principales son clickeables → `ModalImagenes`. Antes solo MarketPlace/Dinámicas y Servicios (ofrezco/solicito) lo tenían — Producto, Ofertas y la portada de Vacante (Servicios) no.
- **Componentes compartidos con prop de opt-in** (para no afectar las vistas PRIVADAS que usan los mismos componentes):
  - `GaleriaArticulo.tsx` (MarketPlace/Dinámicas, público y privado) — prop `aspectMovil` (default `'aspect-square'`, las públicas pasan `'aspect-[4/3]'`).
  - `GaleriaServicio.tsx` (Servicios, público y privado) — ahora `aspect-[4/3]` por defecto en las 3 ramas (vacante / sin fotos / servicio-persona-solicito), ya no hace falta un prop porque el bump de 16:9→4:3 aplicó parejo.
  - `GaleriaPublicacionNegocio.tsx` (Publicación de Negocio, público y privado) — prop `fullBleedMovil` (default `false`; solo la pública la pasa). Además el branch desktop pasó de `object-contain` (dejaba franjas vacías arriba/abajo si el aspect-ratio de la foto no calzaba) a `object-cover` con alto fijo `h-[380px] lg:h-[460px] 2xl:h-[560px]` — cambio aplicado parejo (público y privado), no era un tema de diseño público-vs-privado sino un bug de la imagen sin llenar el marco.
- **Badges tipo píldora con gradiente**: en Producto, los badges "Producto/Servicio · categoría" y "Disponible/No disponible" pasaron de `rounded-lg` sólido a `rounded-full border bg-linear-to-r` (mismo estilo que ya usaban los badges de Ofertas/Dinámicas).
- **Vacante de Servicios** (`GaleriaServicio.tsx`): se quitó el sello dorado "Empresa verificada" y la barra inferior con logo+nombre+sucursal superpuestos a la portada — esa info ya vive en el card "Sobre el negocio" debajo, era redundante. La portada queda limpia, solo la foto.

---

## Card de negocio/autor — patrón unificado

Cada página tiene una card de "quién ofrece esto" (negocio, vendedor, organizador, oferente) con la **misma estructura** en las 4 esquinas:

1. **Avatar/logo** (izquierda) — clickeable → `ModalImagenes`. Tamaño unificado `h-14 w-14 lg:h-16 lg:w-16` en los 5 módulos (antes MarketPlace/Dinámicas estaban en `h-12` fijo, más chico que Producto/Ofertas).
2. **Nombre** + `BadgeCheck` azul (`h-6 w-6 fill-blue-500`) — siempre visible, sin condicionar a tipo de publicación (antes Servicios solo lo mostraba para vacantes).
3. **Fila de contacto** (íconos, alineados a la derecha): ChatYA (`/ChatYA.webp`, siempre) + WhatsApp (círculo verde `#25D366`, **solo si la publicación es de un negocio** — Producto, Oferta, Vacante de Servicios; no aplica a MarketPlace P2P, Dinámicas, ni a servicio-persona/solicito de Servicios, ni a Publicación de Negocio porque el feed no trae ese dato).
4. **Fila de actividad + acción** (mismo renglón, `justify-between`): `"Publicado hace X"` a la izquierda (ver siguiente sección) + `"Ver negocio"`/`"Ver perfil"` a la derecha, color temático del módulo, con `ChevronRight`.

Ya **no** se muestra "Ofrecido por" / "Sobre el negocio" como label encima de la card (era redundante con el contenido de la card misma) — se quitó en Producto, Ofertas y Servicios.

**ChatYA — chat real, no solo `ModalAuthRequerido`:**
- Producto, Ofertas y Servicios: si hay sesión, `useIniciarChatNegocio` abre el panel de ChatYA directo (sin navegar) y navega a `/negocios/:sucursalId` después para que el `ChatOverlay` (montado en `MainLayout`) lo muestre — la página pública en sí no tiene `ChatOverlay`. Sin sesión, abre `ModalAuthRequerido`.
- MarketPlace y Dinámicas: sin sesión, `ModalAuthRequerido`; con sesión, navegan a la versión privada del mismo detalle (que sí trae `BarraContacto`/chat completo).
- Publicación de Negocio: mismo patrón que Producto/Ofertas (chat real vía `useIniciarChatNegocio`, sin contexto anclado — chat genérico con el negocio).

---

## "Publicado hace X" — reemplaza "Activa hace X"

Unificado 06 ago 2026 en `CardVendedor` (MP), `CardOrganizadorPublico` (Dinámicas), `CardOferentePublico` (Servicios) y `CardNegocioPublicacion` (Publicación de Negocio). Antes mostraban la última conexión del usuario (`formatearUltimaConexion`), que en datos de prueba suele venir `null`/desactualizada y dejaba la fila vacía. Ahora usan `Publicado ${formatearTiempoRelativo(createdAt)}` — la fecha de creación de la publicación, que siempre existe.

`CardVendedor` requiere el prop `articuloCreatedAt` (los 4 call-sites, público y privado, ya lo pasan).

---

## `ModalAuthRequerido` — color por módulo

`apps/web/src/components/compartir/ModalAuthRequerido.tsx`, `CONFIG_TIPO` — un color/copy por `contexto.tipo`:

| `tipo` | Módulo | Color |
|--------|--------|-------|
| `articulo` | MarketPlace | teal |
| `producto` | Producto (catálogo de negocio) | blue |
| `oferta` | Ofertas | amber (antes rose, por error) |
| `vacante` | Servicios · Vacante | sky |
| `solicitud` | Servicios · Solicito | sky (antes amber, por error — debe ser igual que vacante/servicio, mismo módulo) |
| `servicio` | Servicios · Ofrezco | sky |
| `dinamica` | Dinámicas | amber |
| `publicacion` | Publicación de Negocio | blue |

⚠️ `producto` y `articulo` son tipos **distintos a propósito** — Producto (negocio) y MarketPlace (P2P) compartían antes el mismo `tipo: 'articulo'`, así que Producto heredaba el color teal de MarketPlace. No fusionar de nuevo.

**Evitar apilar modales**: cuando el ícono de ChatYA vive DENTRO de otro modal (`ModalOfertaDetalle`, `ModalDetalleItem` — usados en el perfil público de negocio `/p/negocio/:sucursalId`), si el visitante no tiene sesión el modal actual se **cierra primero** (`onClose()`) y luego se abre `ModalAuthRequerido` (prop `onRequiereAuth`, opcional, threaded desde `PaginaPerfilNegocio` → `SeccionOfertas`/`SeccionCatalogo` → `ModalOfertas`/`ModalCatalogo` → `ModalOfertaDetalle`/`ModalDetalleItem`). Antes quedaban apilados con problema de z-index (`ModalOfertaDetalle` fuerza `z-75`, el de auth quedaba detrás).

---

## Restricciones de privacidad

- **Sin botón guardar/heart** en ninguna página pública (requiere login).
- **Sin Q&A/comentarios** para visitantes sin sesión — MarketPlace nunca los mostró; **Publicación de Negocio** los quitó en el rediseño 06 ago 2026 (antes reusaba `DetallePublicacionNegocioContenido`, que trae una columna de comentarios que para un anónimo solo decía "Inicia sesión para comentar" — no aportaba nada, y el resto de páginas públicas tampoco muestra esa sección).
- **WhatsApp**: ya NO está bloqueado en MarketPlace P2P por ser el único módulo persona-a-persona (ahí sigue sin mostrarse, anti-scrapers). En Producto, Ofertas y Vacantes de Servicios (negocios reales, número ya público en su ficha) el ícono de WhatsApp SÍ se muestra en la card de contacto.
- **Sin `BarraContacto` real** en las páginas 100% auto-contenidas — se reusa solo cuando hay sesión (navega a la privada).

---

## Publicación de Negocio — doble-fetch de GPS (bug corregido)

`DetallePublicacionNegocioContenido` (usado antes en la pública) hace su propio fetch de `usePublicacionNegocio(publicacionId, { latitud, longitud })`. Si la página padre pedía los mismos datos SIN esos params, el `queryKey` no coincidía → dos peticiones independientes → la página pintaba rápido con un spinner chico del hijo, que luego se reemplazaba por el contenido real (más alto) → el footer "rebotaba" al cargar.

Fix: `DetallePublicacionNegocioContenido` acepta `sinGps?: boolean` (solo lo usa la pública, si en algún momento se vuelve a usar) y `PaginaPublicacionNegocioPublica` ahora ni siquiera pasa GPS a su propio `usePublicacionNegocio` — mismo `queryKey` (sin coords) en ambos lados, un solo fetch. Efecto secundario correcto: el badge de distancia ("2.1 km") ya no aparece para un visitante anónimo — no tiene mucho sentido en un link compartido.

---

## Detalle de Publicación de Negocio (privado) — columna izquierda sin scroll

`DetallePublicacionNegocioContenido.tsx`, layout desktop: la columna izquierda (imagen + texto) ya no tiene alto fijo `h-[700px]` con `overflow-y-auto` — crece según su contenido. La columna de comentarios (derecha) conserva el alto fijo con scroll interno (necesita comportarse como panel de chat). Las dos columnas ya no quedan forzadas a la misma altura.

---

## CTA "Únete gratis a AnunciaYA" — personalizado por módulo

Cada página pública tiene su propio CTA con la **identidad de color del módulo**, pero el patrón visual es idéntico:

| Módulo | Color | Icono | Headline (con `ciudad`) |
|--------|-------|-------|--------------------------|
| MarketPlace | teal | `ShoppingCart` | *"Más artículos a la venta en {ciudad}"* |
| Oferta | amber | `Tag` | *"Más ofertas y descuentos en {ciudad}"* |
| Producto (catálogo) | blue | `Store` | *"Más negocios y servicios en {ciudad}"* |
| Dinámicas | amber | `Ticket` | *"Organiza o participa en Dinámicas"* |
| Servicios | sky | `Wrench` | *"Más servicios cerca de {ciudad}"* |
| Publicación de Negocio | blue | `Store` | *"Descubre negocios locales en AnunciaYA"* |

**Estructura visual:**
- Fondo: gradient sutil (`from-{color}-50 via-white to-{color2}-50`) + borde `{color}-200`.
- Cuadro icono: gradient del color del módulo, blanco interior con icono lucide.
- Headline `text-lg lg:text-xl font-extrabold` personalizado con `ciudad` cuando existe.
- Subtítulo con primera frase resaltada + 3 chips blancos pill con `Check` + botón sólido `bg-{color}-600 → ArrowRight`.

---

## OG Tags para previews en redes sociales

Cada página llama `useOpenGraph({ title, description, image, url, type })` con datos del recurso para que cuando se comparta el link en WhatsApp/FB/Twitter aparezca preview rico (foto + título + precio).

---

## Pendientes / mejoras futuras

- [ ] WhatsApp en la card de "Publicación de Negocio" — el endpoint del feed no trae el número del negocio (solo la ficha del negocio lo tiene); requiere agregar el campo al backend si se quiere.
- [ ] Considerar un componente `<CardNegocio />` genérico (avatar + ChatYA/WhatsApp + Publicado hace X + Ver negocio) para dejar de duplicar la misma estructura en 6 archivos.
- [ ] Considerar un componente `<CTAUneteAnunciaYA color={...} icon={...} headline={...} />` para evitar la duplicación entre las 6 páginas auto-contenidas.
- [ ] Tests E2E que validen el flujo completo (visitar link público → ver contenido → click ChatYA sin sesión → `ModalAuthRequerido` → login → chat real).
- [ ] Refactorizar `MainLayout`, `PaginaLanding`, `PaginaRegistro`, `PaginaRegistroExito`, `ModalBienvenida` para usar `.bg-app-degradado` en lugar del gradient inline duplicado.

---

## Archivos relacionados

- `apps/web/src/pages/public/PaginaArticuloPublico.tsx`
- `apps/web/src/pages/public/PaginaOfertaPublico.tsx`
- `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx`
- `apps/web/src/pages/public/PaginaDinamicaPublica.tsx`
- `apps/web/src/pages/public/PaginaServicioPublico.tsx`
- `apps/web/src/pages/public/PaginaPublicacionNegocioPublica.tsx`
- `apps/web/src/pages/public/PaginaRegistro.tsx`
- `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` (reusada con `LayoutPublico`)
- `apps/web/src/components/public/HeaderPublico.tsx`
- `apps/web/src/components/public/FooterPublico.tsx`
- `apps/web/src/components/layout/LayoutPublico.tsx`
- `apps/web/src/components/compartir/ModalAuthRequerido.tsx`
- `apps/web/src/components/marketplace/CardVendedor.tsx` / `GaleriaArticulo.tsx`
- `apps/web/src/components/servicios/GaleriaServicio.tsx`
- `apps/web/src/components/negocios/publicaciones/GaleriaPublicacionNegocio.tsx` / `DetallePublicacionNegocioContenido.tsx`
- `apps/web/src/components/negocios/{ModalOfertaDetalle,ModalDetalleItem,ModalOfertas,ModalCatalogo,SeccionOfertas,SeccionCatalogo}.tsx`
- `apps/web/src/hooks/useIniciarChatNegocio.ts`
- `apps/web/src/index.css` — utility classes globales (`.bg-app-degradado`, `.bg-header-app`, `.header-app-shine`).
