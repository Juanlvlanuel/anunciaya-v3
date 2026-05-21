# Auditoría — Navegación back + Modales por ruta

> Fecha: 2026-05-19
> Origen: solicitud del usuario (`Servicios` desbarató el patrón establecido; auditar TODA la app y discutir el comportamiento esperado de cada modal).
> Estándar de referencia: `docs/estandares/Sistema_Navegacion_Back.md`.
> Estado: **Bloques A + B + C + D inventariados.** Falta acordar el comportamiento esperado por tipo y ejecutar arreglos.

---

## Leyenda

- ✅ Cumple el estándar.
- ⚠️ Cumple parcial o con riesgo conocido.
- ❌ Bug confirmado (requiere arreglo).
- 🟡 Decisión UX pendiente (pregunto al usuario).

---

## Bloque A — Secciones públicas

### 🟢 `/negocios` — `PaginaNegocios.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` | ✅ |
| `navigate(...)` internos | L499: `navigate('/negocios/{id}')` (subruta) | ✅ |
| Links/NavLinks | — | — |
| FAB / banner | `PopupNegocio` → "Ver Perfil" → `/negocios/{id}` (subruta) | ✅ |

**Sin modales montados directamente** (los popups del mapa son del propio `MapContainer` de Leaflet, no modales React).

---

### 🟢 `/negocios/:sucursalId` — `PaginaPerfilNegocio.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/negocios')` | ✅ |
| `navigate(...)` internos | Solo subrutas | ✅ |

**Modales montados:**

| Modal | Trigger | Tipo | useBackNativo | Navegación interna |
|---|---|---|---|---|
| `ModalHorarios` | Botón "Horarios" | `ModalAdaptativo` | ✅ (auto) | ninguna |
| `ModalImagenes` | Click en portada / galería | universal | ✅ `_modalImagenes` | ninguna |
| `ModalMapaAbierto` | Botón "Mapa expandido" | `<ModalBottom>` móvil / `<ModalMapa>` desktop | ✅ móvil (manual `_mb_*`) / ⚠️ desktop verificar | ninguna |
| `ModalAuthRequerido` | Acciones que requieren auth | `<Modal>` wrapper | ✅ `_modalUI` | `urlRetorno` |
| `ModalOfertaDetalle` | Deep link desde notif | `<Modal>` | ✅ `_modalOfertaDetalle` | → `/negocios/{id}` (subruta del mismo padre) |
| ~~`ModalGaleria`~~ | — | — | — | **componente no existe en el repo (referencia errónea)** |

---

### 🟢 `/marketplace` — `PaginaMarketplace.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` | ✅ |
| `navigate(...)` internos | L163, L731: `/marketplace/publicar` (subruta) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo | Navegación interna |
|---|---|---|---|---|
| `ModalArticuloDetalle` | "Ver N preguntas más" en card | Custom (portal + backdrop) | ✅ manual (`pushState`/`popstate` propio) | sí (artículos relacionados) |

**Overlays:**
- `OverlayBuscadorMarketplace` (renderizado por `MainLayout`, no aquí) — overlay custom con `fixed inset-0 z-50` + gradient radial. ⚠️ **No usa `useBackNativo`** — solo cierra con Escape, click backdrop y botón X.

---

### ❌ `/marketplace/publicar` y `/marketplace/publicar/:id` — `PaginaPublicarArticulo.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | **NO usa `useVolverAtras`** — maneja back manual con `handleAtras()` | ❌ |
| `navigate(...)` | L467, 485, 514: `'/marketplace'` (subruta, OK con push pero sin hook) | ⚠️ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalAdaptativo` — "Salir sin publicar" | `handleAtras()` con cambios | `ModalAdaptativo` | ✅ (auto) |
| `ModalAdaptativo` — Rechazo moderación | Backend devuelve palabra prohibida | `ModalAdaptativo` | ✅ (auto) |
| `ModalSugerenciaModeracion` | Backend sugiere otra categoría | custom inline | ❌ no tiene |
| `ModalImagenes` | Click en foto del grid | universal | ✅ `_modalImagenes` |

---

### 🟢 `/marketplace/articulo/:id` — `PaginaArticuloMarketplace.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/marketplace')` | ✅ |
| `navigate(...)` | L174: `'/marketplace'` (subruta, OK) | ✅ |

**Modales:** `DropdownCompartir` (no es modal, dropdown), `SeccionPreguntas` (inline).

---

### 🟢 `/marketplace/usuario/:id` — `PaginaPerfilVendedor.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/marketplace')` | ✅ |
| `navigate(...)` | L362: `'/marketplace'` (subruta, OK) | ✅ |

**Modales:** ninguno explícito (botones inline para WhatsApp/ChatYA/Agregar contacto, sin modal propio).

---

### 🟢 `/ofertas` — `PaginaOfertas.tsx` + `HeaderOfertas.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` (en HeaderOfertas, móvil + desktop) | ✅ |
| `navigate(...)` | ModalOfertaDetalle L279: `/negocios/{id}` (cross-section subruta), Overlay L119: `/ofertas?oferta=:id` (mismo padre con param) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo | Navegación interna |
|---|---|---|---|---|
| `ModalOfertaDetalle` | Click en card del feed | `<Modal>` | ✅ `_modalUI` | → `/negocios/{id}` |

**Overlays:**
- `OverlayBuscadorOfertas` — overlay custom con `z-50` + gradient radial. ⚠️ **No usa `useBackNativo`**.

---

### Servicios (post-arreglo de hoy)

#### `/servicios` — `PaginaServicios.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` (en ServiciosHeader) | ✅ |
| `BannerVacantesBS` | `navegarASeccion('/business-studio/vacantes')` (era `/bs/vacantes` — **bug 404 ya arreglado**) | ✅ |
| FAB | `irAPublicar*` → `/servicios/publicar*` (subrutas) | ✅ |
| `navigate(...)` | Solo subrutas y card clicks | ✅ |

**Modales montados:** ninguno directamente.

**Overlays:**
- `OverlayBuscadorServicios` — overlay custom. ⚠️ **No usa `useBackNativo`**.
- Header móvil con input flotante en portal (`z-[60]`) — overlay propio, sin `useBackNativo`.

---

#### `/servicios/:id` — `PaginaServicio.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/servicios')` | ✅ |
| `navigate(...)` | Solo a `/servicios/usuario/{id}` (subruta) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalCrearResena` | Botón "Dejar reseña" | custom | ✅ `_modalCrearResena` (agregado hoy) |

---

#### `/servicios/publicar` — `PaginaPublicarServicio.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← (selector inicial) | `volverAFeed = useVolverAtras('/servicios')` | ✅ |
| Header ← (wizard) | `manejarBack` con confirmación condicional, llama `volverAFeed` | ✅ |
| Header ← (error edición) | `navegarASeccion('/mis-publicaciones')` | ✅ |
| `navigate(...)` post-publicar | `navigate('/servicios/{id}', {replace: true})` (subruta) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalExitoPublicacion` | Tras publicar OK | custom | ✅ `_modalExitoPublicacion` (agregado hoy) |
| `ModalSugerenciaSeccion` | Backend sugiere MP | custom | ✅ `_modalSugerenciaSeccion` (agregado hoy) |

---

#### `/servicios/usuario/:id` — `PaginaPerfilPrestador.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/servicios')` | ✅ |
| `navigate(...)` | Solo a `/servicios/{id}` (subruta) | ✅ |

**Modales:** ninguno.

---

## Hallazgos críticos del Bloque A

### ❌ Bug confirmado y arreglado en esta misma sesión
- `BannerVacantesBS` navegaba a `/bs/vacantes` (ruta inexistente) → era 404 silencioso. Arreglado a `/business-studio/vacantes` + uso de `useNavegarASeccion`.

### ❌ Bug pendiente
- `PaginaPublicarArticulo.tsx` (MP wizard) **no usa `useVolverAtras`**. Maneja back manual con `handleAtras()`. Aunque funciona (siempre va al padre), rompe el patrón estándar y no aprovecha el historial real.

### 🟡 Decisiones UX pendientes (resueltas tras verificación)

1. ✅ **Los 4 OverlayBuscador*** (`Negocios`, `MP`, `Ofertas`, `Servicios`) — usuario confirmó: deben cerrar con back nativo. **Pendiente de implementar.**
2. ✅ **`ModalHorarios`**: usa `ModalAdaptativo` → ya cubierto. **`ModalAuthRequerido`**: usa `Modal` → ya cubierto. **`ModalGaleria`**: el componente NO existe en el repo (referencia errónea del análisis inicial). **`ModalAdaptativo` del wizard de MP** (Salir + Rechazo): ya cubiertos. **`ModalSugerenciaModeracion`**: inline custom → pendiente.
3. 🟡 **El input móvil flotante de ServiciosHeader** (portal `z-[60]`) — pendiente decidir si back lo cierra. Es un input, no un modal con estado, pero sí es un overlay.

### ⚠️ Patrón inconsistente
- 3 buscadores tienen overlays con gradient radial idéntico pero código duplicado en cada archivo. Idealmente extraer a un `<OverlayModal>` reutilizable que ya traiga `useBackNativo`.

---

## Bloque B — Rutas personales del usuario

### 🟢 `/cardya` — `PaginaCardYA.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` (móvil + desktop) | ✅ |
| `navigate(...)` | Ninguno explícito en la página | — |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo | Navegación interna |
|---|---|---|---|---|
| `ModalDetalleTransaccion` | Click en transacción del historial | `ModalAdaptativo` | ✅ (auto) | ninguna |
| `ModalDetalleBilletera` | Click en card de billetera | `ModalAdaptativo` | ✅ (auto) | sí (callback `onVerHistorial` cambia tab a 'historial') |
| `ModalDetalleRecompensa` | Click en "Ver detalle" en recompensa | `ModalAdaptativo` | ✅ (auto) | ninguna |
| `ModalConfirmarCanje` | Botón "Canjear" en recompensa | `ModalAdaptativo` | ✅ (auto) | ninguna |
| `ModalVoucherGenerado` | Tras canje exitoso | `ModalAdaptativo` | ✅ (auto) | ninguna |
| `ModalDetalleVoucher` | Click en voucher del historial | `ModalAdaptativo` | ✅ (auto) | ninguna |
| `ModalImagenes` | Click en imagen de voucher | universal | ✅ `_modalImagenes` | ninguna |

✅ **CardYA está limpio** — todos los modales usan `ModalAdaptativo` o el wrapper universal de imágenes.

---

### 🟢 `/mis-cupones` — `PaginaMisCupones.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` | ✅ |
| `navigate(...)` | Ninguno | — |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalDetalleCupon` | Click en cupón o deep link desde notif | `ModalAdaptativo` | ✅ (auto) |

✅ **Mis Cupones está limpio.**

---

### 🟢 `/guardados` — `PaginaGuardados.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` | ✅ |
| `navigate(...)` | L195: `/negocios/{id}` (subruta); L817/L905: `navegarASeccion('/ofertas')` y `/negocios` (cross-section con replace condicional) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo | Navegación interna |
|---|---|---|---|---|
| `ModalOfertaDetalle` | Click en card de oferta guardada | `<Modal>` (importado de `components/negocios`) | ✅ `_modalUI` | → `/negocios/{id}` |

---

### 🟢 `/mis-publicaciones` — `PaginaMisPublicaciones.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | `useVolverAtras('/inicio')` | ✅ |
| `navigate(...)` | L239: `/marketplace/publicar`, L244: `/marketplace/publicar/{id}`, L786: `/servicios/publicar?modo=ofrezco` (todas subrutas correctas) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalAdaptativo` — "Marcar como vendido" | Menu "⋯" en card MP | `ModalAdaptativo` | ✅ (auto) |
| `ModalAdaptativo` — "Eliminar publicación" | Menu "⋯" en card MP | `ModalAdaptativo` | ✅ (auto) |
| (Modales internos de `MisPublicacionesServiciosSection`) | Render condicional según `tipoActivo === 'servicios'` | — | ⚠️ revisar componente |

---

### 🟢 `/perfil` (BS — `/business-studio/perfil`)

Auditado dentro de Bloque C (Business Studio). Sin modales propios — los hijos de cada tab los aportan.

---

### 🟢 `/crear-negocio` — `PaginaCrearNegocio.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | No tiene header con ←. Tiene botón "Cancelar y volver" → `navigate('/inicio')` (L290-298). | ⚠️ patrón inconsistente |
| `navigate(...)` | L52/L84: redirects de validación a `/business-studio` o `/inicio` | ✅ |

**Modales:** Ninguno. Es un formulario simple que redirige a Stripe checkout (`window.location.href = checkoutUrl`).

🟡 **Decisión UX**: ¿Hay que migrar `/crear-negocio` a `useVolverAtras('/inicio')` para que use el patrón estándar? El botón "Cancelar y volver" cumple la misma función pero hace `navigate` directo.

---

## Bloque C — Business Studio (13 módulos)

### Layout y patrón común

- **No hay `BusinessStudioLayout`**. Todos los módulos viven dentro de `MainLayout` con `MenuBusinessStudio.tsx` como sidebar.
- **Ningún módulo BS usa `useVolverAtras`** explícito en su header. El usuario navega entre módulos vía sidebar / NavBar, no con back.
- Header BS típico: icono animado + título + KPIs (`CarouselKPI`) + FAB contextual.

**Implicación para back nativo en móvil dentro de BS:** Como no hay `useVolverAtras`, el back nativo del navegador en cualquier módulo BS te devuelve a la ruta previa del historial real (puede ser `/inicio`, otro módulo BS, o cualquier ruta hermana). No hay fallback declarado.

---

### Inventario por módulo

| Módulo | Ruta | Modales | Wrapper |
|---|---|---|---|
| **Dashboard** | `/business-studio` | `ModalOferta`, `ModalArticulo` | `ModalAdaptativo` ✅ |
| **Mi Perfil** | `/business-studio/perfil` | `ModalImagenes`, `SelectorCategoria` (dropdown, no modal) | universal ✅ |
| **Catálogo** | `/business-studio/catalogo` | `ModalArticulo`, `ModalDuplicar`, `ModalImagenes` | `ModalAdaptativo` ✅ |
| **Promociones** | `/business-studio/ofertas` | `ModalOferta` (3 tabs), `ModalDuplicarOferta`, `ModalDetalleCliente` (anidado), `ModalImagenes` | `ModalAdaptativo` ✅ |
| **Puntos** | `/business-studio/puntos` | `ModalRecompensa` | `ModalAdaptativo` ✅ |
| **Transacciones** | `/business-studio/transacciones` | `ModalDetalleTransaccionBS`, `ModalDetalleCanjeBS` | `ModalAdaptativo` ✅ |
| **Clientes** | `/business-studio/clientes` | `ModalDetalleCliente` (con ChatYA y historial) | `ModalAdaptativo` ✅ |
| **Opiniones** | `/business-studio/opiniones` | `ModalResponder` | `ModalAdaptativo` ✅ |
| **Alertas** | `/business-studio/alertas` | `ModalDetalleAlerta` (navega a otros módulos BS al cerrar), `ModalConfiguracion` (4 tabs) | `ModalAdaptativo` ✅ |
| **Empleados** | `/business-studio/empleados` | `ModalEmpleado`, `ModalDetalleEmpleado` | `ModalAdaptativo` ✅ |
| **Reportes** | `/business-studio/reportes` | `ModalClientesInactivos`, `ModalDetallePromocion` (+ tabs navegan a `/clientes?busqueda=` y `/empleados?busqueda=`) | `ModalAdaptativo` ✅ |
| **Sucursales** | `/business-studio/sucursales` | `ModalCrearSucursal` (con Leaflet), `ModalDetalleSucursal` | `ModalAdaptativo` ✅ |
| **Vacantes** | `/business-studio/vacantes` | `SlideoverNuevaVacante` (3 pasos, NO es modal — slideover lateral con `createPortal` custom) | ❌ no tiene |

**Total BS:** 19 modales `ModalAdaptativo` (todos ✅ por wrapper) + `ModalImagenes` universal + **1 Slideover sin back nativo**.

### Hallazgos críticos del Bloque C

- ❌ **`SlideoverNuevaVacante`** (Vacantes) es un slideover con `createPortal` que NO usa `useBackNativo`. Es un overlay fullscreen en móvil → debe soportar back.
- ⚠️ **`ModalDetalleAlerta`** navega a otros módulos BS (`navigate(enlace.ruta)`) al cerrar. Verificar que el back nativo del módulo destino no devuelva al alerta de origen (probable doble push en historial).
- ⚠️ **`ModalDetalleCliente` anidado en Promociones** — un modal abre otro modal. Verificar Z-index y que cerrar el hijo no cierre el padre.

---

## Bloque D — Hub, Onboarding, ScanYA y overlays globales

### 🟢 `/inicio` — `PaginaInicio.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | **No tiene** — es el root, no debería salir de la app sin warning (cubierto por buffer fantasma del `RootLayout`) | ✅ por diseño |
| `navigate(...)` | Ninguno — página placeholder estática ("Pregúntale a [Ciudad]") | — |
| Modales | Ninguno | — |

---

### 🟢 `/business/onboarding` — `PaginaOnboarding.tsx` (wizard 8 pasos)

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | **No usa `useVolverAtras`** — el wizard cierra con botón "Pausar" que abre `ModalPausar` | ⚠️ |
| `navigate(...)` | L104: `/inicio` (blindaje gerentes), L132: `/business-studio` (éxito), L142: `/business` (error init). Todos con `replace: true`. | ✅ |
| Pasos | Navegación entre pasos es **state-based** (`useOnboardingStore.irAPaso()`) — no toca history | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalPausar` | Botón "Pausar" en header | `ModalAdaptativo` | ✅ (auto) |
| `ModalImagenes` (en `PasoImagenes`) | Click en imagen para ampliar | universal | ✅ `_modalImagenes` |

✅ **Onboarding está limpio.**

---

### 🟢 `/scanya` — `PaginaScanYA.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | **No usa `useVolverAtras`** — PWA independiente (punto de venta), no se navega "atrás" desde aquí | ✅ por diseño |
| `navigate(...)` | L399: `navigate(ruta)` en `handleNavigate` (futuras subrutas) | ✅ |
| Modal único activo | State unificado `modalActivo` (8 valores) — exclusión mutua entre modales | ✅ |

**Modales (8, todos custom inline con `fixed inset-0`, ninguno usa wrapper ni useBackNativo):**

| Modal | Tipo | useBackNativo |
|---|---|---|
| `ModalCerrarTurno` | custom `fixed inset-0 z-9999` | ❌ no tiene |
| `ModalRegistrarVenta` | custom drawer `fixed inset-0 z-40` | ❌ no tiene |
| `ModalHistorial` | custom drawer `fixed inset-0 z-40/60` | ❌ no tiene |
| `ModalVouchers` | custom drawer `fixed inset-0` | ❌ no tiene |
| `ModalCanjearVoucher` | custom `fixed inset-0 z-40` | ❌ no tiene |
| `ModalRecordatorios` | custom `fixed inset-0 z-40` | ❌ no tiene |
| `ModalResenas` | custom drawer `fixed inset-0 z-40` | ❌ no tiene |
| `ModalAvisoTurnoAutoCerrado` | custom con `createPortal` | ❌ no tiene |

❌ **Los 8 modales de ScanYA requieren `useBackNativo`** o migración a `ModalAdaptativo`. Esto es el grupo más grande del proyecto sin cubrir.

**Overlays especiales:**
- `ChatOverlay` (L859) — overlay persistente con backstack manual (`history.state.scanyaModal`, refs `overlayHistoryRef` / `overlayHandlerRef`). Exclusión mutua con modales ScanYA. **Caso especial documentado**.

---

### 🟢 `/scanya/login` — `PaginaLoginScanYA.tsx`

Ruta pública sin `MainLayout`. Sin header back. Form de login simple.

---

### 🟢 `/` — `PaginaLanding.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | No aplica — landing pública | — |
| `navigate(...)` | Múltiples a `/registro`, `/inicio` (L157, 460, 477, 637, 675, 778, 804, 809, 815, 817) | ✅ |
| Modales | Abre `ModalLogin` global vía `useUiStore.abrirModalLogin()` (montado en `RootLayout`) | ✅ |

---

### 🟢 `/registro` — `PaginaRegistro.tsx`

| Aspecto | Detalle | Estado |
|---|---|---|
| Header ← | No aplica — ruta pública con su propia navegación | — |
| `navigate(...)` | L358/L504: `/inicio`, L520: `/negocio/configurar` (ruta existe en router L534, ✅ no es bug) | ✅ |

**Modales:**

| Modal | Trigger | Tipo | useBackNativo |
|---|---|---|---|
| `ModalVerificacionEmail` | Auto tras submit | custom inline (sin wrapper, `if (!isOpen) return null`) | ❌ no tiene |
| `ModalBienvenida` | Auto tras verificar email (solo personal) | custom inline (sin wrapper) | ❌ no tiene |

---

### 🔴 Overlays globales flotantes

#### `MenuDrawer` (drawer perfil del usuario, móvil)

| Aspecto | Detalle | Estado |
|---|---|---|
| Tipo | Side sheet derecha `min(76vw, 312px)` — implementación CSS custom (`.md4-drawer` con keyframes propios) | — |
| Cierre | Click scrim, X, ESC | ✅ |
| useBackNativo | **❌ NO tiene** (verificado: no importa `useBackNativo`, no usa `pushState/popstate`, no usa wrapper) | ❌ |
| Tabs Personal/Comercial | Cambia modo + redirige a `/inicio` si ruta es exclusiva del modo anterior | ✅ |

#### `PanelNotificaciones` (popover desktop / side sheet móvil)

| Aspecto | Detalle | Estado |
|---|---|---|
| Tipo desktop | Popover 392px anclado al botón campana del Navbar | — |
| Tipo móvil | Side sheet derecha `min(82vw, 360px)` — implementación CSS custom (`.pn-drawer-mobile`) | — |
| Cierre | ESC, click scrim, click fuera | ✅ |
| useBackNativo | **❌ NO tiene** (verificado: no importa `useBackNativo`, no usa `pushState/popstate`, no usa wrapper) | ❌ |
| Tabs | Todas / No leídas con badges + agrupación temporal | ✅ |

#### `ChatOverlay` (chat 1:1 real-time, flotante persistente)

| Aspecto | Detalle | Estado |
|---|---|---|
| Tipo | Persistente, 3 estados: cerrado / minimizado (desktop 56px) / expandido (~620px desktop, 90vh móvil) | — |
| Backstack | **MANUAL con `history.state` custom** (refs `overlayHistoryRef`, `overlayHandlerRef`, `overlayPathnameRef`) — caso especial documentado en su propio archivo | ✅ |
| Exclusión mutua | Con modales ScanYA (cierra uno, cierra el otro) | ✅ |
| Modales internos sobrepuestos | `ModalDetalleCliente`, `ModalOfertaDetalle`, `ModalDetalleItem` | ✅ |

---

## Estado de los wrappers base (verificado)

| Wrapper | Archivo | useBackNativo / equivalente | Implementación |
|---|---|---|---|
| `Modal` | `components/ui/Modal.tsx` (L29-30, L72) | ✅ hook `useBackNativo({ discriminador: '_modalUI' })` | wrapper centrado desktop |
| `ModalBottom` | `components/ui/ModalBottom.tsx` (L127-129, L271-304) | ✅ manual (`pushState` + `popstate` con id `_mb_*` único) | bottom sheet móvil |
| `ModalAdaptativo` | `components/ui/ModalAdaptativo.tsx` (L139-180) | ✅ delega a `Modal` o `ModalBottom` según breakpoint | wrapper híbrido |

**Conclusión clave:** Cualquier modal que use uno de estos 3 wrappers ya tiene back nativo cubierto en ambas vistas. **Solo los modales custom y overlays no-modal requieren arreglo.**

---

## Resumen de elementos que **SÍ requieren arreglo de back nativo**

> Lista verificada archivo por archivo. **No quedan "verificar" — cada componente está clasificado.**

### Modales custom sin back nativo

| # | Componente | Sección | Tipo actual |
|---|---|---|---|
| 1 | `ModalSugerenciaModeracion` | MP wizard | custom inline |
| 2 | `ModalVerificacionEmail` | Registro | inline (`if (!isOpen) return null`) |
| 3 | `ModalBienvenida` | Registro | inline |
| 4 | `ModalCerrarTurno` | ScanYA | `fixed inset-0 z-9999` |
| 5 | `ModalRegistrarVenta` | ScanYA | drawer `fixed inset-0 z-40` |
| 6 | `ModalHistorial` | ScanYA | drawer `fixed inset-0 z-40/60` |
| 7 | `ModalVouchers` | ScanYA | drawer `fixed inset-0` |
| 8 | `ModalCanjearVoucher` | ScanYA | `fixed inset-0 z-40` |
| 9 | `ModalRecordatorios` | ScanYA | `fixed inset-0 z-40` |
| 10 | `ModalResenas` | ScanYA | drawer `fixed inset-0 z-40` |
| 11 | `ModalAvisoTurnoAutoCerrado` | ScanYA | `createPortal` custom |

**Total: 11 modales custom sin back nativo** (1 MP wizard + 2 Registro + 8 ScanYA).

### Modales custom QUE SÍ tienen back nativo manual (caso especial — NO tocar)

| Componente | Sección | Implementación |
|---|---|---|
| `ModalArticuloDetalle` | Marketplace (`/marketplace`) | `pushState({modalArticulo: id})` + `popstate` listener propio (L38-54) |
| `ChatOverlay` | global | Backstack manual de 4 capas con `history.state` custom |

### Overlays no-modal sin back nativo

| # | Componente | Sección |
|---|---|---|
| 1 | `OverlayBuscadorNegocios` | `/negocios` |
| 2 | `OverlayBuscadorMarketplace` | `/marketplace` |
| 3 | `OverlayBuscadorOfertas` | `/ofertas` |
| 4 | `OverlayBuscadorServicios` | `/servicios` |
| 5 | Input móvil flotante de `ServiciosHeader` (portal z-[60]) | `/servicios` |
| 6 | `SlideoverNuevaVacante` | BS Vacantes |
| 7 | `MenuDrawer` (móvil) | global |
| 8 | `PanelNotificaciones` (móvil) | global |

**Total: 8 overlays sin back nativo.**

### Bug pendiente de header

- `PaginaPublicarArticulo` (MP wizard) — no usa `useVolverAtras`, maneja back manual con `handleAtras()`.

### Total general

- **19 elementos** requieren back nativo (11 modales + 8 overlays).
- **1 bug** de patrón de header.
- **0 modales del Bloque C BS** requieren cambios — todos ya cubiertos por `ModalAdaptativo`.
- **0 modales de CardYA / Mis Cupones / Negocios** requieren cambios — todos cubiertos por wrappers.

---

## Comportamiento esperado del back por tipo de elemento

> Acuerdo a discutir y luego documentar en `docs/estandares/Sistema_Navegacion_Back.md`.

### A. Páginas de ruta normal (top-level y subrutas)

| Tipo | Back nativo esperado |
|---|---|
| Top-level (`/negocios`, `/marketplace`, `/ofertas`, `/servicios`, `/cardya`, `/mis-cupones`, `/guardados`, `/mis-publicaciones`, `/crear-negocio`) | → `/inicio` (vía `useVolverAtras('/inicio')` con `replace` condicional) |
| Subruta dentro de top-level (`/servicios/:id`, `/marketplace/articulo/:id`, etc.) | → padre top-level |
| Wizards/formularios largos (`/marketplace/publicar`, `/servicios/publicar`) | → padre (con confirmación si hay cambios) |
| `/inicio` (root) | → buffer fantasma del `RootLayout` evita salir; cualquier intento de back debe ser explícito |
| Rutas BS (`/business-studio/*`) | → historial real del navegador (no hay fallback declarado) |

### B. Modales con wrapper (`Modal` / `ModalBottom` / `ModalAdaptativo`)

✅ **Ya cubiertos automáticamente.** Back nativo cierra el modal sin tocar la ruta. No requieren cambios.

### C. Modales custom (sin wrapper)

Deben sumar `useBackNativo({ discriminador })` con un ID único por instancia (patrón aplicado hoy a `ModalCrearResena`, `ModalExitoPublicacion`, `ModalSugerenciaSeccion`).

### D. Overlays no-modal (buscadores, drawers, side sheets, slideovers)

Mismo criterio que C — cualquier capa que tape la pantalla y que el usuario espere cerrar con back debe usar `useBackNativo`. Idealmente extraer un wrapper `OverlayModal` reutilizable que ya lo traiga.

### E. ChatOverlay

Caso especial documentado. **No tocar** — ya tiene backstack manual robusto integrado con modales de ScanYA.

---

## Puntos a confirmar con el usuario antes de ejecutar arreglos

> Lista depurada — tras la verificación archivo por archivo, varios puntos se resolvieron solos. Quedan estos:

1. **Orden de ejecución sugerido** (de menor a mayor riesgo):
   1. Los 2 modales de Registro (`ModalVerificacionEmail`, `ModalBienvenida`) — flujo aislado, bajo impacto.
   2. `ModalSugerenciaModeracion` (MP) — un solo modal.
   3. Los 8 modales custom de ScanYA — todos siguen el mismo patrón, fix en lote.
   4. Los 4 OverlayBuscador (extraer `<OverlayModal>` reutilizable primero).
   5. `SlideoverNuevaVacante` — wizard de 3 pasos, requiere cuidado con back entre pasos.
   6. `MenuDrawer` y `PanelNotificaciones` móvil — afectan TODA la app, requieren regresión amplia.
   7. `PaginaPublicarArticulo` (MP) — bug de header `useVolverAtras`.
   8. Input móvil de `ServiciosHeader` — decisión UX previa.

   ¿Confirmas este orden?

2. **Extraer `<OverlayModal>` reutilizable** para los 4 buscadores: ¿lo hacemos antes (1 cambio limpio en wrapper, 4 buscadores adoptan) o tras (4 fixes paralelos)?

3. **ScanYA — homogeneización:** los 8 modales tienen patrones distintos (algunos drawer custom, otros centrados, uno con `createPortal`). ¿Migrar TODOS a `ModalAdaptativo` o solo agregar `useBackNativo` manual conservando cada estructura?

4. **`SlideoverNuevaVacante`** wizard de 3 pasos: cuando el usuario está en paso 2/3, ¿back nativo cierra el slideover entero o regresa al paso anterior?

5. **Input móvil de `ServiciosHeader` (portal z-[60]):** es un input flotante, no un modal con estado propio. ¿Back lo cierra o se ignora?

6. **`/crear-negocio` header:** botón "Cancelar y volver" hace `navigate('/inicio')` directo en vez de usar `useVolverAtras`. ¿Lo migramos al patrón estándar mientras estamos? Cambio mínimo.

7. **ChatOverlay y ModalArticuloDetalle (MP)** ya tienen back nativo manual propio. ¿Los dejamos como están (caso especial documentado) o los migramos al hook `useBackNativo` por consistencia? Recomendación: dejarlos — son flujos complejos con razones específicas para el patrón manual.
