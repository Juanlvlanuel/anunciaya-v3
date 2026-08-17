# Mi Catálogo (MarketPlace) + Apartar

> **Estado:** Backend completo. Frontend: página pública + Apartar + gestión privada + configuración completos. **Pendiente: Alta Rápida MarketPlace** (carga masiva) y correr la migración de 2026-08-16 (ver §5).
> **Rutas:** `/p/marketplace/usuario/:usuarioId` (pública) · `/marketplace/usuario/:usuarioId` (privada, sin cambios)
> Racional de producto: sesión de planeación 2026-08-12. Rediseño a modelo de 2 estados: sesión 2026-08-16.

---

## 1. Qué es

Le da a un vendedor P2P de MarketPlace un **link público compartible** (sin cuenta AnunciaYA) con todo su inventario en venta — pensado para gente que hace **lives de venta** (ej. en Facebook) y necesita que su audiencia pueda "apartar" una pieza sin tener que llevar el control manualmente por comentarios.

Flujo (2026-08-16, modelo de 2 estados): el vendedor comparte el link → el comprador (sin cuenta) ve el catálogo, da click en "Apartar" en la pieza que quiere, deja su nombre + WhatsApp → la solicitud **bloquea el artículo de inmediato** (nadie más puede apartarlo; el artículo sigue público con overlay "Apartado", no se oculta) → el vendedor ve la solicitud en su panel privado y decide: **"Rechazar"** (libera el bloqueo) o **"Vendido"** (despublica el artículo). Si nunca actúa, el bloqueo se libera solo al vencer el tiempo configurable.

AnunciaYA solo organiza el apartado — el pago y la entrega ocurren 100% fuera de la plataforma (mismo espíritu que Dinámicas/rifas).

---

## 2. Decisiones de arquitectura (sesión de planeación)

- **Reemplaza al "Perfil de Vendedor"**, no coexiste aparte — lo que vivía en Perfil (tus publicaciones de MarketPlace) es conceptualmente tu inventario/catálogo. La ruta **privada** (`/marketplace/usuario/:id`) sigue funcionando igual que antes (perfil neutral, KPIs, bloqueo, contactos, tab Dinámicas) — pero el grid de MarketPlace en modo "En venta" **también apartar** con la misma card/modal que la ruta pública, para el usuario que llega navegando DENTRO de la app (feed, comentarios) y no por el link externo. Solo el dueño del perfil (`esUnoMismo`) no ve el botón sobre sus propios artículos, y solo artículos `modo='vendo'` lo muestran (no `busco`). La ruta **pública** nueva es para gente SIN cuenta (ej. audiencia de un live).
- **Dinámicas NO aparece en la versión pública.** Una rifa no es inventario ni se "aparta" con nombre+WhatsApp — mezclarla en el link de un live confundiría a la audiencia.
- **Apartar es SIEMPRE sin cuenta** (nombre + WhatsApp manual) — a diferencia de Dinámicas, que soporta cuenta o manual. Quien aparta llega de un link en redes, nunca logueado.
- **La solicitud bloquea de inmediato** (2026-08-16, reemplaza el diseño original de "el vendedor confirma/rechaza sin lock automático"). Se descartó el paso intermedio de "confirmar": fusionarlo con el bloqueo evita que 2+ compradores pidan la misma pieza a la vez, y el vendedor solo decide el desenlace (Rechazar/Vendido), no si vale la pena reservarla. El overlay "Apartado" (mismo patrón visual que "Vendido"/"Pausado" en Mis Publicaciones) comunica el bloqueo sin ocultar el artículo — quien tenga el link directo no se topa con un 404.
- **Tiempo de apartado configurable, pero único por vendedor** (no por artículo) — un solo número en `usuarios.marketplace_apartado_horas`, default 24h.
- **Sin etiqueta/código corto por artículo** — se descartó: como el apartado se hace dando click directo en la pieza dentro del catálogo (no escribiendo un código en el chat del live), no hace falta.
- **No se reintroduce carrito/checkout** — mismo principio que el catálogo de Negocios: solo un compositor de solicitud de contacto, sin pago dentro de la plataforma.

---

## 3. Backend

### 3.1 Schema (`docs/migraciones/2026-08-12-marketplace-apartados.sql` + `2026-08-16-marketplace-apartados-2-estados.sql`)

| Tabla/columna | Rol |
|---|---|
| `marketplace_apartados` | Una fila por SOLICITUD (historial completo). `estado`: `apartado` \| `vendido` \| `rechazado` \| `expirado` (2026-08-16, ya no hay `pendiente`/`confirmado` por separado). Siempre `nombre_comprador` + `whatsapp_comprador`, nunca `usuario_id`. |
| `articulos_marketplace.apartado_hasta` | El LOCK vigente del artículo (NULL = disponible). Se llena de inmediato al APARTAR (ya no espera confirmación) — lectura O(1) sin JOIN para pintar "Apartado" en el catálogo. Lo limpian "Rechazar", "Vendido" y el cron de expiración. |
| `usuarios.marketplace_apartado_horas` | Config única del vendedor, default 24. |

### 3.2 Endpoints (`marketplace.routes.ts`)

| Método | Ruta | Auth | Rol |
|---|---|---|---|
| POST | `/articulos/:id/apartar` | Público (rate-limited, `limitadorApartarMarketplace`: 8/min prod) | Comprador solicita apartar — bloquea el artículo de inmediato (`estado='apartado'`, `apartado_hasta` calculado con las horas del vendedor) |
| PATCH | `/apartados/:id/vendido` | Privado, dueño del artículo | Marca la solicitud `vendido` y despublica el artículo (`estado='vendida'`) |
| PATCH | `/apartados/:id/rechazar` | Privado, dueño | Rechaza — libera `apartado_hasta` |
| GET | `/mis-apartados?estado=` | Privado | Panel de gestión — todas las solicitudes de todos mis artículos |
| GET/PATCH | `/mi-configuracion-apartado` | Privado | Horas de apartado del vendedor |
| GET | `/vendedor/:usuarioId/publicaciones?modo=vendo` | Público (`verificarTokenOpcional`, ya existía) | Extendido con filtro `modo` para Mi Catálogo |

Lógica en `services/marketplace.service.ts` (`apartarArticulo`, `marcarApartadoVendido`, `rechazarApartado`, `obtenerApartadosDeVendedor`, `obtenerConfiguracionApartado`, `actualizarConfiguracionApartado`, `liberarApartadosExpirados`).

### 3.3 Cron (`cron/marketplace-apartados-expiracion.cron.ts`)

Cada 30 min (mismo criterio que `dinamicas-expiracion.cron.ts`): un UPDATE atómico vía CTE marca `estado='expirado'` en las filas `apartado` con `expira_en` vencido, y limpia `apartado_hasta` en `articulos_marketplace`. A diferencia de Dinámicas (que borra el boleto), aquí se conserva el historial — el vendedor puede revisarlo en su panel.

---

## 4. Frontend

| Pieza | Archivo | Nota |
|---|---|---|
| Página pública | `pages/private/marketplace/PaginaPerfilVendedor.tsx` → `MiCatalogoPublico()` | Mismo archivo que la ruta privada; detecta `/p/marketplace` por `location.pathname` y renderiza un componente completamente distinto (sin bloqueo/contactos/Dinámicas). Ruta bare, sin MainLayout — igual que `/p/negocio/...` |
| Card seleccionable | Mismo archivo — `CardCatalogoVendedor` | Interacción de dos zonas (calca "+Agregar" vs click-en-card de `PaginaCatalogoNegocio.tsx`): el círculo (esquina superior derecha de la imagen) es el ÚNICO elemento que alterna selección (`onToggleSeleccion`, con `stopPropagation`); el resto de la card (imagen+texto, envueltos en un `<button>`) abre `ModalDetalleArticuloMarketplace` (`onVerDetalle`) |
| Modal de detalle | Mismo archivo — `ModalDetalleArticuloMarketplace` (2026-08-15) | Calca el estilo visual de `components/negocios/ModalDetalleItem.tsx` (hero+gradiente, compartir/cerrar flotantes, badge Disponible/Apartado, título+categoría sobre la imagen, franja divisora, precio+contacto, descripción) pero adaptado a MarketPlace: contacta al vendedor vía `useIniciarChatDirectoPersona`/`useAbrirWhatsApp` en vez del chat de negocio; sin botón de apartar adentro (eso vive solo en el círculo de la card). Usa `Modal` (no `ModalAdaptativo`), igual que su referencia. |
| Panel Apartar (sidebar) | Mismo archivo — `PanelApartar` (2026-08-15, reemplaza al `ModalApartar` centrado) | Calca el patrón "Tu pedido" de `PaginaCatalogoNegocio.tsx`: sidebar `fixed` en desktop + `ModalBottom` con header oscuro en móvil (FAB "Apartar · N" para abrirlo). Selección múltiple: se eligen varias piezas y se manda UN solo formulario nombre+WhatsApp (una solicitud por artículo internamente). Usado en **ambas** vistas — público (`usuarioActual=null`, siempre pide nombre+WhatsApp manual) y privado in-app (`usuarioActual` del store: nombre se autocompleta del perfil sin pedirlo, WhatsApp se precarga de `usuario.telefono` si existe — sigue siendo obligatorio tener 10 dígitos válidos al enviar, el precargado es lo que lo vuelve "opcional" en la práctica). WhatsApp usa `InputTelefono` (mismo componente validado de Mi Perfil/Sucursales — solo dígitos, 10 exactos) en vez de un `<input type="tel">` libre. **Porteado a `document.body`** vía `createPortal`+`usePortalTarget` — dentro de AY, `PerfilVendedorPrivado` vive bajo el `<main>` de `MainLayout`, que crea su propio stacking context; un `fixed` renderizado ahí queda atrapado debajo del `<aside>` de publicidad (z-30) sin importar el z-index — portear al body lo saca de ese árbol (mismo patrón que ya usan `Modal`/`ModalBottom`). **Alineado al header vía grid, no vía offsets fijos** (2026-08-15, versión final): los intentos con `translate-x`/`max-width` reducido para "hacerle hueco" quedaban desalineados del header (que vive en su propio wrapper `max-w-7xl`, ver comentario en `PerfilVendedorPrivado`). La solución real: `PanelApartar` acepta `variante: 'flotante' | 'grid'`. En `'grid'` (usada por `PerfilVendedorPrivado`) el desktop NO se portea — se renderiza como columna `sticky` normal dentro del `grid-cols-[1fr_320px]` que `PerfilVendedorPrivado` arma en su propio wrapper de contenido (que además, mientras hay selección, adopta el MISMO `max-w-7xl`/padding que el header en vez del `max-w-[920px]` de siempre) — así el borde derecho del sidebar coincide con el borde derecho del header, y el contenido con su borde izquierdo, por construcción de CSS (mismo `mx-auto max-w-7xl`), sin medir nada por JS ni depender del ancho de la columna de publicidad. `'flotante'` (usada por `MiCatalogoPublico`, sin header con el que alinear ni columna de publicidad) conserva el comportamiento original: `fixed right-4`, porteado a `document.body`. El móvil (FAB + `ModalBottom`) es igual en ambas variantes, siempre porteado. |
| Gestión privada + config | `components/marketplace/ModalGestionApartados.tsx` | Modal rediseñado (2026-08-16) con header gradiente teal (patrón "Modal de Detalle", TC-6A) + filtros Apartados/Vendidos + botones "Rechazar"/"Vendido" (con texto, no solo ícono) + ajuste de horas, todo en un solo componente. Alto FIJO (`h-[85vh] lg:h-[75vh]`, no `max-h-`) para que no cambie de tamaño entre tabs. |
| Entrada | `pages/private/publicaciones/PaginaMisPublicaciones.tsx` | Botón con badge (cuenta `estado='apartado'`) + `Tooltip`, presente en los headers Laptop y PC (PC agregado 2026-08-16). **Pendiente: no existe entrada equivalente en el header móvil.** |
| Hooks | `hooks/queries/useMarketplace.ts` | `useApartarArticulo`, `useMisApartados`, `useMarcarApartadoVendido`, `useRechazarApartado`, `useMiConfiguracionApartado`, `useActualizarConfiguracionApartado` |

---

## 5. Pendiente

- **Alta Rápida MarketPlace** — entrada de carga masiva (foto/texto/manual → tabla editable → publicar en lote), calcando el patrón de `docs/arquitectura/Alta_Rapida_Catalogo.md` pero para MarketPlace en modo `vendo`. NO reemplaza el alta uno-por-uno que ya existe.
- Botón "Solicitudes de apartado" en `PaginaMisPublicaciones.tsx` solo existe en los headers Laptop y PC — pendiente agregarlo también al header móvil.
- **Correr la migración `docs/migraciones/2026-08-16-marketplace-apartados-2-estados.sql` en DEV y PROD** (rediseño a 2 estados — afecta datos existentes, ver el propio archivo para el detalle del mapeo).
- Falta notificación en tiempo real al vendedor cuando llega una solicitud de apartado (hoy solo se entera si abre el modal) — discutido pero no implementado.
- Falta un lock a nivel BD contra la carrera "2 solicitudes casi simultáneas para el mismo artículo" (hoy es check-then-insert en el service, sin constraint que lo blindee).
- QA E2E completo del flujo (apartar público → Rechazar/Vendido privado → expiración por cron).
- ~~Correr la migración `docs/migraciones/2026-08-12-marketplace-apartados.sql` en DEV y PROD.~~ ✅ Corrida en ambos entornos (16 ago 2026).
