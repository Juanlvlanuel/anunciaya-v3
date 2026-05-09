# Páginas Públicas (rutas `/p/...` y `/registro`)

> **Estado:** ✅ Sistema unificado v2 (09 May 2026) — header gradient + cards bordeadas + CTA personalizado por módulo + fondo degradado de app.

## Propósito

Las páginas públicas son las que ven los visitantes **sin sesión** cuando alguien comparte un link desde la app autenticada. Cada link `/p/...` corresponde a un detalle (artículo, oferta, MarketPlace, negocio) accesible de manera estable sin requerir login.

El objetivo: que el visitante público sienta la **misma marca** que la app autenticada — al hacer login no debe haber corte visual de fondo, header ni footer.

---

## Rutas y archivos

| Ruta | Archivo | Layout | Contexto |
|------|---------|--------|----------|
| `/p/articulo/:articuloId` | `apps/web/src/pages/public/PaginaArticuloPublico.tsx` | Auto-contenido | Producto/servicio del catálogo de un negocio |
| `/p/oferta/:ofertaId` | `apps/web/src/pages/public/PaginaOfertaPublico.tsx` | Auto-contenido | Oferta de un negocio |
| `/p/articulo-marketplace/:articuloId` | `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx` | Auto-contenido | Artículo P2P del MarketPlace |
| `/p/negocio/:sucursalId` | `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` | Vía `LayoutPublico` | Perfil de un negocio |
| `/registro` | `apps/web/src/pages/public/PaginaRegistro.tsx` | Auto-contenido | Formulario de registro |

> `PaginaPerfilNegocio` se reutiliza para la vista pública envolviéndola en `LayoutPublico`. Las otras 3 son específicas para el caso público.

---

## Arquitectura visual

### Chrome (header + footer + fondo)

Todas las páginas públicas comparten el mismo "chrome":

- **`HeaderPublico`** (`apps/web/src/components/public/HeaderPublico.tsx`):
  - Background: clase `.bg-header-app` (gradient azul `linear-gradient(90deg, #1e3a8a, #2563eb)` — mismo que `Navbar` autenticado).
  - Logo `/logo-anunciaya-azul.webp` (mismo que el Navbar).
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

## Layout de contenido (3 páginas auto-contenidas)

`PaginaArticuloMarketplacePublico`, `PaginaOfertaPublico` y `PaginaArticuloPublico` comparten **el mismo patrón estructural**:

```tsx
<div className="bg-app-degradado flex h-screen flex-col">
  <HeaderPublico />

  <main className="flex flex-1 flex-col overflow-y-auto">
    <div className="flex flex-1 items-center lg:mx-auto lg:w-full lg:max-w-7xl lg:px-6 2xl:px-8">
      <div className="w-full pb-12 lg:py-8">

        {/* Layout 2-col 3fr/2fr en desktop */}
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
          {/* COLUMNA IZQUIERDA: imagen card */}
          <div className="min-w-0 space-y-5 lg:space-y-6">
            <div className="aspect-[4/3] lg:aspect-[3/2] rounded-xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
              {/* imagen + badges */}
            </div>

            {/* Solo móvil — en desktop va al panel sticky */}
            <div className="lg:hidden">{/* bloque info */}</div>
            <div className="lg:hidden">{/* descripción */}</div>
            <div className="lg:hidden">{/* card negocio */}</div>
            <div className="lg:hidden">{/* botones */}</div>
          </div>

          {/* COLUMNA DERECHA: panel sticky desktop */}
          <div className="hidden min-w-0 lg:flex lg:flex-col">
            <div className="sticky top-24 flex min-w-0 flex-col gap-3">
              <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                {/* BloqueInfo compacto + botones */}
              </div>
              <CardNegocio />
              <div className="rounded-xl ...">{/* descripción */}</div>
            </div>
          </div>
        </div>

        {/* CTA "Únete gratis a AnunciaYA" — gancho personalizado por módulo */}
        {!estaLogueado && <CTAUneteAnunciaYA />}
      </div>
    </div>

    <FooterPublico />
  </main>
</div>
```

**Decisiones clave:**
- `h-screen` en root + `<main className="flex-1 overflow-y-auto">` → el scroll vive dentro de `<main>` (necesario porque `body` tiene `overflow:hidden` desde lg+ en `index.css`).
- `flex flex-1 items-center` en el wrapper interior → centra verticalmente el contenido cuando es más corto que el viewport.
- `<FooterPublico />` **dentro** del `<main>` → footer scrollea al final del contenido (no fijo).
- `min-w-0` en grid items → permite compresión cuando hay palabras largas sin espacios.
- `break-words` en `<p>` de descripción → palabras largas se rompen dentro del card.
- Cards con `p-4` unificado en el panel sticky desktop.

---

## CTA "Únete gratis a AnunciaYA" — personalizado por módulo

Cada página pública tiene su propio CTA con la **identidad de color del módulo**, pero el patrón visual es idéntico:

| Módulo | Color | Icono | Headline (con `ciudad`) | 3 trust chips |
|--------|-------|-------|-------------------------|---------------|
| MarketPlace | **teal** | `ShoppingCart` | *"Más artículos a la venta en {ciudad}"* | Hiperlocal · Sin comisiones · Sin spam |
| Oferta | **amber** | `Tag` | *"Más ofertas y descuentos en {ciudad}"* | Hiperlocal · 100% gratis · Acumula puntos |
| Artículo (catálogo) | **blue** | `Store` | *"Más negocios y servicios en {ciudad}"* | Hiperlocal · Verificados · Sin spam |

**Estructura visual:**
- Fondo: gradient sutil (`from-{color}-50 via-white to-{color2}-50`) + borde `{color}-200`.
- Cuadro icono: gradient del color del módulo, blanco interior con icono lucide.
- Headline `text-lg lg:text-xl font-extrabold` personalizado con `ciudad` cuando existe.
- Subtítulo con primera frase resaltada (`<span className="font-bold text-slate-900">Únete gratis a AnunciaYA.</span>` + descripción del valor).
- 3 chips blancos pill con `Check` icono color del módulo + texto.
- Botón sólido `bg-{color}-600 hover:bg-{color}-700 rounded-lg px-5 py-2.5 + ArrowRight`.

---

## Restricciones de privacidad (heredadas de Sprint 7 MP)

Las páginas públicas respetan reglas estrictas de privacidad:

- **Sin botón WhatsApp directo** en MarketPlace público (anti-scrapers de teléfonos). Solo "Enviar mensaje al vendedor" → `ModalAuthRequerido`.
- **Sin botón guardar/heart** (requiere login).
- **Sin Q&A** en MarketPlace público (preguntar requiere login).
- **Sin `BarraContacto` real** — se reusa cuando hay sesión, no en visitantes públicos.

En artículo/oferta sí se muestra "Preguntar por WhatsApp" (es número público del negocio, ya expuesto).

---

## OG Tags para previews en redes sociales

Cada página llama `useOpenGraph({ title, description, image, url, type })` con datos del recurso para que cuando se comparta el link en WhatsApp/FB/Twitter aparezca preview rico (foto + título + precio).

---

## Pendientes / mejoras futuras

- [ ] Refactorizar `MainLayout`, `PaginaLanding`, `PaginaRegistro`, `PaginaRegistroExito`, `ModalBienvenida` para usar `.bg-app-degradado` en lugar del gradient inline duplicado.
- [ ] Tests E2E que validen el flujo completo (visitar link público → ver contenido → click "Enviar mensaje" → `ModalAuthRequerido` → login → redirect a versión privada).
- [ ] Considerar un componente `<CTAUneteAnunciaYA color={...} icon={...} headline={...} chips={...} />` para evitar la duplicación entre las 3 páginas auto-contenidas.

---

## Archivos relacionados

- `apps/web/src/pages/public/PaginaArticuloPublico.tsx`
- `apps/web/src/pages/public/PaginaOfertaPublico.tsx`
- `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx`
- `apps/web/src/pages/public/PaginaRegistro.tsx`
- `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` (reusada con `LayoutPublico`)
- `apps/web/src/components/public/HeaderPublico.tsx`
- `apps/web/src/components/public/FooterPublico.tsx`
- `apps/web/src/components/layout/LayoutPublico.tsx`
- `apps/web/src/index.css` — utility classes globales (`.bg-app-degradado`, `.bg-header-app`, `.header-app-shine`).
