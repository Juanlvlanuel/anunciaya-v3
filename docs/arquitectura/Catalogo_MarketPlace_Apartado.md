# Mi Catálogo (MarketPlace) + Apartar

> **Estado:** Backend completo. Frontend: página pública + Apartar + gestión privada + configuración completos. **Pendiente: Alta Rápida MarketPlace** (carga masiva).
> **Rutas:** `/p/marketplace/usuario/:usuarioId` (pública) · `/marketplace/usuario/:usuarioId` (privada, sin cambios)
> Racional de producto: sesión de planeación 2026-08-12.

---

## 1. Qué es

Le da a un vendedor P2P de MarketPlace un **link público compartible** (sin cuenta AnunciaYA) con todo su inventario en venta — pensado para gente que hace **lives de venta** (ej. en Facebook) y necesita que su audiencia pueda "apartar" una pieza sin tener que llevar el control manualmente por comentarios.

Flujo: el vendedor comparte el link → el comprador (sin cuenta) ve el catálogo, da click en "Apartar" en la pieza que quiere, deja su nombre + WhatsApp → el vendedor ve la solicitud en su panel privado y la **confirma o rechaza** → si confirma, el artículo queda bloqueado ("Apartado") por un tiempo configurable; si nunca se concreta la venta, se libera solo.

AnunciaYA solo organiza el apartado — el pago y la entrega ocurren 100% fuera de la plataforma (mismo espíritu que Dinámicas/rifas).

---

## 2. Decisiones de arquitectura (sesión de planeación)

- **Reemplaza al "Perfil de Vendedor"**, no coexiste aparte — lo que vivía en Perfil (tus publicaciones de MarketPlace) es conceptualmente tu inventario/catálogo. La ruta **privada** (`/marketplace/usuario/:id`) sigue funcionando igual que antes (perfil neutral, KPIs, bloqueo, contactos, tab Dinámicas) — pero el grid de MarketPlace en modo "En venta" **también apartar** con la misma card/modal que la ruta pública, para el usuario que llega navegando DENTRO de la app (feed, comentarios) y no por el link externo. Solo el dueño del perfil (`esUnoMismo`) no ve el botón sobre sus propios artículos, y solo artículos `modo='vendo'` lo muestran (no `busco`). La ruta **pública** nueva es para gente SIN cuenta (ej. audiencia de un live).
- **Dinámicas NO aparece en la versión pública.** Una rifa no es inventario ni se "aparta" con nombre+WhatsApp — mezclarla en el link de un live confundiría a la audiencia.
- **Apartar es SIEMPRE sin cuenta** (nombre + WhatsApp manual) — a diferencia de Dinámicas, que soporta cuenta o manual. Quien aparta llega de un link en redes, nunca logueado.
- **El vendedor confirma/rechaza** — no es un lock automático al primer click. Varias personas pueden solicitar la misma pieza; el vendedor elige.
- **Tiempo de apartado configurable, pero único por vendedor** (no por artículo) — un solo número en `usuarios.marketplace_apartado_horas`, default 24h.
- **Sin etiqueta/código corto por artículo** — se descartó: como el apartado se hace dando click directo en la pieza dentro del catálogo (no escribiendo un código en el chat del live), no hace falta.
- **No se reintroduce carrito/checkout** — mismo principio que el catálogo de Negocios: solo un compositor de solicitud de contacto, sin pago dentro de la plataforma.

---

## 3. Backend

### 3.1 Schema (`docs/migraciones/2026-08-12-marketplace-apartados.sql`)

| Tabla/columna | Rol |
|---|---|
| `marketplace_apartados` | Una fila por SOLICITUD (historial completo). `estado`: `pendiente` \| `confirmado` \| `rechazado` \| `expirado`. Siempre `nombre_comprador` + `whatsapp_comprador`, nunca `usuario_id`. |
| `articulos_marketplace.apartado_hasta` | El LOCK vigente del artículo (NULL = disponible). Se llena solo al CONFIRMAR — lectura O(1) sin JOIN para pintar "Apartado" en el catálogo. |
| `usuarios.marketplace_apartado_horas` | Config única del vendedor, default 24. |

### 3.2 Endpoints (`marketplace.routes.ts`)

| Método | Ruta | Auth | Rol |
|---|---|---|---|
| POST | `/articulos/:id/apartar` | Público (rate-limited, `limitadorApartarMarketplace`: 8/min prod) | Comprador solicita apartar |
| PATCH | `/apartados/:id/confirmar` | Privado, dueño del artículo | Confirma — bloquea el artículo, rechaza automáticamente otras solicitudes `pendiente` del mismo artículo |
| PATCH | `/apartados/:id/rechazar` | Privado, dueño | Rechaza |
| GET | `/mis-apartados?estado=` | Privado | Panel de gestión — todas las solicitudes de todos mis artículos |
| GET/PATCH | `/mi-configuracion-apartado` | Privado | Horas de apartado del vendedor |
| GET | `/vendedor/:usuarioId/publicaciones?modo=vendo` | Público (`verificarTokenOpcional`, ya existía) | Extendido con filtro `modo` para Mi Catálogo |

Lógica en `services/marketplace.service.ts` (`apartarArticulo`, `confirmarApartado`, `rechazarApartado`, `obtenerApartadosDeVendedor`, `obtenerConfiguracionApartado`, `actualizarConfiguracionApartado`, `liberarApartadosExpirados`).

### 3.3 Cron (`cron/marketplace-apartados-expiracion.cron.ts`)

Cada 30 min (mismo criterio que `dinamicas-expiracion.cron.ts`): un UPDATE atómico vía CTE marca `estado='expirado'` en `marketplace_apartados` y limpia `apartado_hasta` en `articulos_marketplace`. A diferencia de Dinámicas (que borra el boleto), aquí se conserva el historial — el vendedor puede revisarlo en su panel.

---

## 4. Frontend

| Pieza | Archivo | Nota |
|---|---|---|
| Página pública | `pages/private/marketplace/PaginaPerfilVendedor.tsx` → `MiCatalogoPublico()` | Mismo archivo que la ruta privada; detecta `/p/marketplace` por `location.pathname` y renderiza un componente completamente distinto (sin bloqueo/contactos/Dinámicas). Ruta bare, sin MainLayout — igual que `/p/negocio/...` |
| Card seleccionable | Mismo archivo — `CardCatalogoVendedor` | Interacción de dos zonas (calca "+Agregar" vs click-en-card de `PaginaCatalogoNegocio.tsx`): el círculo (esquina superior derecha de la imagen) es el ÚNICO elemento que alterna selección (`onToggleSeleccion`, con `stopPropagation`); el resto de la card (imagen+texto, envueltos en un `<button>`) abre `ModalDetalleArticuloMarketplace` (`onVerDetalle`) |
| Modal de detalle | Mismo archivo — `ModalDetalleArticuloMarketplace` (2026-08-15) | Calca el estilo visual de `components/negocios/ModalDetalleItem.tsx` (hero+gradiente, compartir/cerrar flotantes, badge Disponible/Apartado, título+categoría sobre la imagen, franja divisora, precio+contacto, descripción) pero adaptado a MarketPlace: contacta al vendedor vía `useIniciarChatDirectoPersona`/`useAbrirWhatsApp` en vez del chat de negocio; sin botón de apartar adentro (eso vive solo en el círculo de la card). Usa `Modal` (no `ModalAdaptativo`), igual que su referencia. |
| Panel Apartar (sidebar) | Mismo archivo — `PanelApartar` (2026-08-15, reemplaza al `ModalApartar` centrado) | Calca el patrón "Tu pedido" de `PaginaCatalogoNegocio.tsx`: sidebar `fixed` en desktop + `ModalBottom` con header oscuro en móvil (FAB "Apartar · N" para abrirlo). Selección múltiple: se eligen varias piezas y se manda UN solo formulario nombre+WhatsApp (una solicitud por artículo internamente). Usado en **ambas** vistas — público (`usuarioActual=null`, siempre pide nombre+WhatsApp manual) y privado in-app (`usuarioActual` del store: nombre se autocompleta del perfil sin pedirlo, WhatsApp se precarga de `usuario.telefono` si existe — sigue siendo obligatorio tener 10 dígitos válidos al enviar, el precargado es lo que lo vuelve "opcional" en la práctica). WhatsApp usa `InputTelefono` (mismo componente validado de Mi Perfil/Sucursales — solo dígitos, 10 exactos) en vez de un `<input type="tel">` libre. **Porteado a `document.body`** vía `createPortal`+`usePortalTarget` — dentro de AY, `PerfilVendedorPrivado` vive bajo el `<main>` de `MainLayout`, que crea su propio stacking context; un `fixed` renderizado ahí queda atrapado debajo del `<aside>` de publicidad (z-30) sin importar el z-index — portear al body lo saca de ese árbol (mismo patrón que ya usan `Modal`/`ModalBottom`). **Alineado al header vía grid, no vía offsets fijos** (2026-08-15, versión final): los intentos con `translate-x`/`max-width` reducido para "hacerle hueco" quedaban desalineados del header (que vive en su propio wrapper `max-w-7xl`, ver comentario en `PerfilVendedorPrivado`). La solución real: `PanelApartar` acepta `variante: 'flotante' | 'grid'`. En `'grid'` (usada por `PerfilVendedorPrivado`) el desktop NO se portea — se renderiza como columna `sticky` normal dentro del `grid-cols-[1fr_320px]` que `PerfilVendedorPrivado` arma en su propio wrapper de contenido (que además, mientras hay selección, adopta el MISMO `max-w-7xl`/padding que el header en vez del `max-w-[920px]` de siempre) — así el borde derecho del sidebar coincide con el borde derecho del header, y el contenido con su borde izquierdo, por construcción de CSS (mismo `mx-auto max-w-7xl`), sin medir nada por JS ni depender del ancho de la columna de publicidad. `'flotante'` (usada por `MiCatalogoPublico`, sin header con el que alinear ni columna de publicidad) conserva el comportamiento original: `fixed right-4`, porteado a `document.body`. El móvil (FAB + `ModalBottom`) es igual en ambas variantes, siempre porteado. |
| Gestión privada + config | `components/marketplace/ModalGestionApartados.tsx` | Modal con filtros Pendientes/Confirmados/Historial + confirmar/rechazar + ajuste de horas, todo en un solo componente |
| Entrada | `pages/private/publicaciones/PaginaMisPublicaciones.tsx` | Botón con badge de pendientes en el header laptop, junto a "Publicar" — **solo agregado ahí; falta replicarlo en las variantes mobile/PC del mismo header si se quiere consistencia total** |
| Hooks | `hooks/queries/useMarketplace.ts` | `useApartarArticulo`, `useMisApartados`, `useConfirmarApartado`, `useRechazarApartado`, `useMiConfiguracionApartado`, `useActualizarConfiguracionApartado` |

---

## 5. Pendiente

- **Alta Rápida MarketPlace** — entrada de carga masiva (foto/texto/manual → tabla editable → publicar en lote), calcando el patrón de `docs/arquitectura/Alta_Rapida_Catalogo.md` pero para MarketPlace en modo `vendo`. NO reemplaza el alta uno-por-uno que ya existe.
- Botón "Solicitudes de apartado" en `PaginaMisPublicaciones.tsx` solo se agregó en el header laptop — pendiente replicarlo en mobile/PC si se quiere el mismo acceso en todos los breakpoints.
- QA E2E completo de los 2 flujos (apartar público → confirmar/rechazar privado → expiración por cron).
- Correr la migración `docs/migraciones/2026-08-12-marketplace-apartados.sql` en DEV y PROD.
