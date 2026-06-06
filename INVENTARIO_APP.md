# INVENTARIO COMPLETO — AnunciaYA

> Generado el **2026-06-03** por recorrido de solo lectura del monorepo (`apps/api`, `apps/web`, `packages/shared`, `docs/migraciones`).
> Basado en el **código real**, no en la documentación. Objetivo: insumo para diseñar el **Panel de Administradores** (sección 3 es la prioritaria).

---

## 1. Módulos / secciones funcionales

### 1.1 Backend (apps/api/src) — por módulo

| Módulo | Prefijo ruta | # endpoints | Endpoints clave | Tablas principales | Estado real |
|---|---|---|---|---|---|
| **auth** | `/api/auth` | 21 | `POST /registro`, `/login`, `/refresh`, `/google`, `/2fa/verificar`, `GET /yo` | usuarios, usuarioCodigosRespaldo, negocios | Completo |
| **pago** (Stripe) | `/api/pagos` | 4 | `POST /crear-checkout`, `/crear-checkout-upgrade`, `/webhook`, `GET /verificar-session` | usuarios, negocios, negocioSucursales | Completo (con 1 webhook sin implementar) |
| **categorias** | `/api/categorias` | 2 | `GET /`, `/:id/subcategorias` | categoriasNegocio, subcategoriasNegocio | Completo |
| **onboarding** | `/api/onboarding` | 24 | `GET /mi-negocio`, `POST /:negocioId/paso1`, `/finalizar`, `GET /:negocioId/progreso` | negocios, negocioSucursales, galería, horarios, métodos pago, artículos, puntosConfiguracion | Completo (auto-publicación, sin aprobación admin) |
| **negocios** | `/api/negocios` | 30 | `GET /:id`, `/sucursal/:id`, `PUT /:id/informacion`, `POST /:negocioId/sucursales`, `/sucursal/:id/crear-gerente` | negocios, negocioSucursales, negocioGaleria, empleados, usuarios | Completo |
| **resenas** | `/api/resenas` | 10 | `GET /sucursal/:id`, `POST /`, `GET /business-studio`, `POST /business-studio/responder` | resenas, negocios, negocioSucursales, usuarios | Completo |
| **articulos** (catálogo) | `/api/articulos` | 10 | `GET /negocio/:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/duplicar` | articulos, articuloSucursales | Completo |
| **ofertas** (Ofertas+Cupones) | `/api/ofertas` | 26 | `GET /feed`, `/mis-cupones`, `POST /`, `/:id/asignar`, `/:id/revelar` | ofertas, ofertaUsos, ofertaUsuarios, puntosBilletera, notificaciones | Completo |
| **votos / seguidos** | `/api/votos`, `/api/seguidos` | 4 | `POST /`, `DELETE /:tipo/:id/:accion`, `GET /` | votos | Completo (router montado 2× a propósito) |
| **guardados** | `/api/guardados` | 3 | `POST /`, `DELETE /:tipo/:id`, `GET /` | guardados, ofertas, serviciosPublicaciones, articulosMarketplace | Completo |
| **dashboard** (BS) | `/api/business/dashboard` | 6 | `GET /kpis`, `/ventas`, `/campanas`, `/interacciones`, `/alertas` | puntosTransacciones, ofertaUsuarios, metricasEntidad, votos, resenas | Completo |
| **alertas** (BS) | `/api/business/alertas` | 11 | `GET /`, `/kpis`, `PUT /:id/resuelta`, `/configuracion/:tipo` | alertasSeguridad, alertaLecturas, alertasConfiguracion | Completo |
| **empleados** (BS) | `/api/business/empleados` | 10 | `GET /kpis`, `POST /`, `PATCH /:id/activo`, `POST /:id/revocar-sesion` | empleados, empleadoHorarios, scanyaTurnos | Completo |
| **metricas** | `/api/metricas` | 6 | `POST /public-view`, `/view`, `/share`, `/click`, `GET /:tipo/:id` | metricasEntidad | Completo |
| **scanya** | `/api/scanya` | 29 | `POST /login-dueno`, `/identificar-cliente`, `/otorgar-puntos`, `/validar-voucher`, `/turno/abrir` | empleados, puntosBilletera/Transacciones, recompensas, vouchersCanje, scanyaTurnos | Completo |
| **puntos** (BS) | `/api/puntos` | 9 | `GET/PUT /configuracion`, `GET/POST /recompensas`, `GET /estadisticas` | puntosConfiguracion, puntosBilletera, recompensas, vouchersCanje | Completo |
| **transacciones** (BS) | `/api/transacciones` | 8 | `GET /historial`, `/kpis`, `/exportar`, `/canjes`, `POST /:id/revocar` | puntosTransacciones, vouchersCanje, recompensas | Completo |
| **clientes** (BS) | `/api/clientes` | 6 | `GET /top`, `/kpis`, `/exportar`, `/:id/historial` | puntosBilletera/Transacciones, vouchersCanje | Completo |
| **cardya** | `/api/cardya` | 8 | `GET /mis-puntos`, `/negocio/:id`, `POST /canjear`, `GET /vouchers` | puntosBilletera, recompensas, vouchersCanje, ofertas | Completo |
| **notificaciones** | `/api/notificaciones` | 5 | `GET /`, `/no-leidas`, `PATCH /marcar-todas`, `/:id/leida`, `DELETE /:id` | notificaciones | Completo |
| **chatya** | `/api/chatya` | 37 | `GET /conversaciones`, `POST /.../mensajes`, `/bloqueados`, `/mensajes/:id/reaccion`, `/upload-imagen` | chatConversaciones, chatMensajes, chatReacciones, chatContactos, chatBloqueados | Completo |
| **reportes** (BS) | `/api/business/reportes` | 4 | `GET /`, `/exportar`, `/clientes-inactivos`, `/detalle-promocion` | puntosTransacciones, ofertas, vouchersCanje, resenas, metricasEntidad | Completo |
| **marketplace** | `/api/marketplace` | 25 | `GET /feed/infinito`, `/articulos/:id`, `POST /articulos`, `/articulos/:id/heartbeat`, `/preguntas/:id/responder` | articulosMarketplace, marketplacePreguntas, marketplaceBusquedasLog | Completo (buscador real = sprint posterior) |
| **servicios** | `/api/servicios` | 24 | `GET /feed/infinito`, `/publicaciones/:id`, `POST /publicaciones`, `/publicaciones/:id/resenas` | serviciosPublicaciones, serviciosPreguntas, serviciosResenas | Completo |
| **vacantes** (BS) | `/business-studio/vacantes` | 7 | `GET /kpis`, `GET /`, `POST /`, `PATCH /:id/cerrar`, `DELETE /:id` | serviciosPublicaciones, negocioSucursales, empleados | Completo (publica a Servicios) |
| **preguntasComunidad** (Home/Coyo) | `/api/preguntas-comunidad` | 16 | `POST /`, `GET /`, `/mis-preguntas`, `POST /:id/respuestas`, `/:id/interes`, `/:id/resolver` | preguntasComunidad, respuestasPreguntasComunidad, preguntasInteresados | Completo |
| **coyo** (buscador IA) | `/api/coyo` | 1 | `GET /buscar` (buscador hiperlocal unificado) | articulosMarketplace, ofertas, serviciosPublicaciones, preguntasComunidad | Completo |
| **r2** | `/api/r2` | 1 | `DELETE /imagen` | (R2 storage) | Completo |
| **admin** | `/api/admin` | 3 | `GET/POST /mantenimiento/r2-reconcile`, `GET /.../log` | r2ReconcileLog + cross-tabla | **En progreso** (solo Mantenimiento R2; Panel Admin sin construir) |

**Servicios auxiliares sin trío propio** (todos con código real): `negocioManagement.service.ts` (CRUD compartido Onboarding↔BS, ~24 funciones), `sucursales.service.ts`, `alertas-motor.service.ts` (motor de alertas, lo consume el cron), `scanya-cierre-auto.service.ts` (cron), `interesPreguntasComunidad` / `respuestasPreguntasComunidad`, `ogPreview.service.ts` (previews de links en ChatYA), `coyo/*` (5 archivos del asistente Coyo), `_helpers/busquedaFlexible.ts`.

> **Observación:** no se encontraron stubs, `not implemented` ni TODOs de implementación en los services (salvo el webhook `subscription.updated`, ver §3). El único módulo realmente parcial es **admin**.

### 1.2 Frontend (apps/web/src) — por sección de UI

Rutas en `apps/web/src/router/index.tsx`. **La mayoría de las "🚧" del CLAUDE.md ya están implementadas como páginas reales** en el frontend.

| Sección UI | Ruta(s) | ¿React Query? | Estado real |
|---|---|---|---|
| **Home / Pregúntale a Peñasco (Coyo)** | `/inicio` | Sí (`usePreguntasComunidad`) | Completo / muy desarrollado (feed 2 columnas + mascota Coyo + Mis preguntas) |
| **Negocios** | `/negocios`, `/negocios/:sucursalId`, `/p/negocio/:id` | Sí (`useNegocios`) | Completo |
| **MarketPlace** | `/marketplace`, `/marketplace/articulo/:id`, `/marketplace/usuario/:id` | Sí (`useMarketplace`, `useArticulos`) | En progreso (feed real; buscador real = sprint posterior) |
| **Ofertas** | `/ofertas`, `/p/oferta/:id` | Sí (`useOfertas`, `useOfertasFeed`) | Completo / avanzado (feed editorial, carruseles, ticker) |
| **Servicios** | `/servicios`, `/servicios/:id`, `/servicios/usuario/:id`, `/p/servicio/:id` | Sí (`useServicios`) | En progreso / avanzado (feed 3 secciones, composer inline, tabs Servicios/Vacantes) |
| **Vacantes / Empleos (BS)** | `/business-studio/vacantes` | Sí (`useVacantesBS`) | Completo (nace con React Query) |
| **CardYA** | `/cardya` (guard personal) | Sí (`useCardYA`) | Completo |
| **Mis Cupones** | `/mis-cupones` (guard personal) | Sí (`useMisCupones`) | Completo |
| **Guardados** | `/guardados` | Sí (`useMisGuardados`) | Completo |
| **Mis Publicaciones** | `/mis-publicaciones` (guard personal) | Sí | Completo |
| **ChatYA** | overlay flotante (sin ruta) | No (Socket.io + store + service) | Completo |
| **Perfil** | `/perfil`, `/business-studio/perfil` | Sí (`usePerfil`) | Completo |
| **ScanYA** | `/scanya`, `/scanya/login` (sin MainLayout) | No (store + service propios) | Completo |
| **Onboarding** | `/business/onboarding` (sin MainLayout) | No (store dedicado) | Completo |
| **Crear negocio (upgrade)** | `/crear-negocio`, `/crear-negocio-exito` | — (usa `pagoService`) | Completo |
| **Business Studio** | `/business-studio/*` (dashboard, transacciones, clientes, opiniones, alertas, catálogo, ofertas, puntos, empleados, reportes, sucursales, perfil) | Sí (12/12 con React Query) | Completo |
| **Configurar negocio** | `/negocio/configurar` | No | **Placeholder real** (PlaceholderPage inline "en construcción") |
| **Panel Admin** | — | — | **No existe UI** (solo backend) |

> Páginas públicas para compartir (sin auth): `/p/articulo/:id`, `/p/articulo-marketplace/:id`, `/p/oferta/:id`, `/p/servicio/:id`, `/p/negocio/:id`. Login/2FA/recuperación son modales (`components/auth/*`).

---

## 2. Entidades de base de datos

**50 tablas** (`pgTable`) en `apps/api/src/db/schemas/schema.ts`; relaciones en `relations.ts`. Columna "¿Usada?": **sí** = aparece en queries de `services/`/`controllers/`; **solo-rel** = solo en relaciones/FKs; **no** = sin referencia en lógica.

### Auth / Usuarios
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `usuarios` | raíz | Cuentas (personal/comercial), 2FA, Stripe, embajador | sí |
| `usuarioCodigosRespaldo` | usuarios | Códigos de respaldo 2FA | sí |
| `direccionesUsuario` | usuarios | Libreta de direcciones de entrega | sí |
| `metricasUsuario` | usuarios | Métricas agregadas del usuario | sí (raw SQL) |

### Negocios / Sucursales
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `negocios` | usuarios | Negocio del comerciante (raíz comercial) | sí |
| `negocioSucursales` | negocios | Sucursales (multi-sucursal) | sí |
| `negocioHorarios` | sucursal | Horarios por día | sí |
| `negocioMetodosPago` | negocios | Métodos de pago aceptados | sí |
| `negocioGaleria` | negocios | Galería de imágenes | sí |
| `categoriasNegocio` / `subcategoriasNegocio` | catálogo | Categorías/subcategorías | sí |
| `asignacionSubcategorias` | negocio↔subcat | N:M negocio↔subcategoría | sí |
| `empleados` | usuarios + sucursal | Empleados (permisos ScanYA, PIN) | sí |
| `empleadoHorarios` | empleados | Horarios laborales | sí |
| `negocioModulos` | negocios | Flags de módulos activos | **no** |
| `negocioPreferencias` | negocios | Preferencias de mensajería | **no** |
| `negocioCitasConfig` / `negocioCitasFechasEspecificas` | negocios | Config de agenda de citas | **no** |

### Catálogo / Citas / Pedidos
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `articulos` | negocios | Productos/servicios del catálogo | sí |
| `articuloSucursales` | articulos+sucursal | Disponibilidad por sucursal | sí |
| `articuloInventario` | articulos | Stock | sí |
| `articuloVariantes` | articulos | Grupos de variantes | sí |
| `articuloVarianteOpciones` | variantes | Opciones de variante | **no** (¿vía JOIN?) |
| `citas` | negocio+cliente | Reservas/citas | sí |
| `carrito` / `carritoArticulos` | usuarios | Carrito de compras | sí |
| `pedidos` | sucursal+comprador | Pedidos/órdenes | sí |
| `pedidoArticulos` | pedidos | Líneas del pedido | **no** |

### MarketPlace
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `articulosMarketplace` | usuarios | MarketPlace P2P v1 (geo-privacidad) | sí |
| `marketplaceBusquedasLog` | usuarios | Log de búsquedas populares | sí (raw SQL) |
| `marketplacePreguntas` | artículo+comprador | Q&A público | sí |
| `marketplace` (legado) | usuarios | Tabla MarketPlace **vieja** | **no** |
| `categoriasMarketplace` (legado) | — | Categorías MP viejo | **no** |

### Servicios / Vacantes
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `serviciosPublicaciones` | usuarios (+sucursal vacantes) | Publicaciones (ofrezco/solicito/vacante) | sí |
| `serviciosPreguntas` | publicación+autor | Q&A público | sí |
| `serviciosResenas` | publicación+autor | Reseñas 1–5 de prestadores | sí (raw SQL) |
| `serviciosBusquedasLog` | usuarios | Log de búsquedas | sí (raw SQL) |
| `bolsaTrabajo` (legado) | negocios/usuarios | Vacantes/servicios **viejo** | **no** |

### Ofertas / Cupones / Promociones
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `ofertas` | negocios+sucursal | Ofertas/cupones | sí |
| `ofertaUsos` | ofertas+usuario | Canjes/usos | sí |
| `ofertaUsuarios` | ofertas+usuario | Asignación de cupón privado | sí |
| `ofertaVistas` | ofertas+usuario | Vistas por oferta | sí (raw SQL) |
| `ofertasDestacadas` | ofertas+admin | Override "oferta del día" | sí (raw SQL) |
| `planesAnuncios` | — | Catálogo de anuncios pagados | **no** |
| `promocionesPagadas` | planesAnuncios+usuario | Promoción pagada (Stripe) | **no** |
| `promocionesTemporales` / `promocionesUsadas` | usuarios | Códigos de descuento temporales | **no** |

### Puntos / CardYA / Recompensas
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `puntosConfiguracion` | negocios | Config del programa de puntos | sí |
| `puntosBilletera` | usuario+negocio | Billetera de puntos por negocio | sí |
| `puntosTransacciones` | billetera+negocio | Transacciones de puntos | sí |
| `transaccionesEvidencia` | transacción | Imágenes de evidencia (ticket) | sí |
| `recompensas` | negocios | Catálogo canjeable | sí |
| `recompensaProgreso` | usuario+recompensa | Progreso de recompensas | sí (raw SQL) |
| `vouchersCanje` | billetera+recompensa | Vouchers de canje (QR/código) | sí |

### ScanYA
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `scanyaTurnos` | negocio+sucursal+empleado | Turnos de operación | sí |
| `scanyaConfiguracion` | negocios | Config (foto ticket, nº orden) | sí |
| `scanyaRecordatorios` | negocio+empleado | Recordatorios/pendientes | sí |

### Chat (ChatYA)
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `chatConversaciones` | usuarios (p1/p2)+sucursales | Conversaciones 1:1 con contexto | sí |
| `chatMensajes` | conversación+emisor | Mensajes | sí |
| `chatReacciones` / `chatMensajesFijados` | mensajes | Reacciones / fijados | sí |
| `chatContactos` / `chatBloqueados` | usuarios | Contactos / bloqueos | sí |

### Coyo / Preguntas (Home) · Notificaciones · Métricas
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `preguntasComunidad` | usuarios | Preguntas "Pregúntale a Peñasco" + resp. Coyo | sí |
| `respuestasPreguntasComunidad` | pregunta+usuario | Respuestas de vecinos | sí |
| `preguntasInteresados` | pregunta+usuario | "Yo también quiero saber" | sí |
| `notificaciones` | usuario (+negocio) | Notificaciones in-app | sí |
| `alertasSeguridad` | negocio+sucursal | Alertas inteligentes (motor BS) | sí |
| `alertasConfiguracion` | negocios | Umbrales por tipo de alerta | sí |
| `votos` | usuario/sucursal | Likes/follows polimórficos | sí |
| `guardados` | usuarios | Favoritos | sí |
| `resenas` | usuario/sucursal/empleado | Reseñas cliente↔negocio | sí |
| `metricasEntidad` | polimórfico | Métricas por entidad | sí (raw SQL) |

### Embajadores / Planes / Sistema (mayormente DORMIDAS)
| Tabla | Pertenece a | Propósito | ¿Usada? |
|---|---|---|---|
| `configuracionSistema` | usuarios | Config global clave-valor | sí |
| `regiones` | — | Regiones/ciudades para embajadores | solo-rel |
| `embajadores` | usuarios+regiones | Vendedores con código referido | solo-rel |
| `embajadorComisiones` | embajadores+negocios | Comisiones (primer pago/recurrente) | **no** |
| `planes` / `planReglas` | — | Catálogo de planes y límites | solo-rel |
| `bitacoraUso` | usuarios+negocios | Bitácora de consumo de límites | **no** |

### Tablas candidatas a NO USADAS (resumen)

**Confianza ALTA — legado reemplazado:** `marketplace`, `categoriasMarketplace` (→ `articulosMarketplace`), `bolsaTrabajo` (→ `serviciosPublicaciones`).
**Confianza ALTA — módulos sin construir:** `planesAnuncios`, `promocionesPagadas`, `promocionesTemporales`, `promocionesUsadas`, `planes`, `planReglas`, `embajadores`, `regiones`, `embajadorComisiones`, `bitacoraUso`.
**Confianza MEDIA — features incompletas:** `negocioCitasConfig`, `negocioCitasFechasEspecificas`, `negocioModulos`, `negocioPreferencias`, `articuloVarianteOpciones`, `pedidoArticulos`.

> ⚠️ No confundir con "no usadas": `metricasEntidad`, `ofertaVistas`, `ofertasDestacadas`, `recompensaProgreso`, `metricasUsuario`, `*BusquedasLog`, `serviciosResenas` **sí se usan** vía SQL crudo. Las candidatas de confianza media podrían tener uso en `cron/`/`routes/`/tests no revisados.

---

## 3. Operaciones administrativas / cross-negocio ⭐

> **Hallazgo central: NO existe un sistema de roles admin ni cuentas administrativas reales.** El único gate de plataforma es un **secreto compartido por header HTTP** (`x-admin-secret`). Casi todas las operaciones que un Panel Admin necesita (aprobar/suspender negocios, banear usuarios, métricas globales, comisiones) **no existen** o se harían por SQL manual.

### 3.1 Cómo se determina "quién es admin" HOY

- **Mecanismo:** `requireAdminSecret` (`apps/api/src/middleware/adminSecret.middleware.ts`) compara el header `x-admin-secret` contra `env.ADMIN_SECRET` (string opcional, definido en `config/env.ts:74`). → `503` si no está configurado, `401` si falta/no coincide, `next()` si coincide.
- **Sin JWT, sin usuario, sin roles, sin auditoría de identidad** (el reconcile registra `ejecutadoPor: 'admin-secret'` genérico).
- Aplicado globalmente en `routes/admin/index.ts` a todo `/api/admin/*`, que **hoy solo expone Mantenimiento R2**.
- **No hay campo `rol`/`esAdmin` en `usuarios`.** La identidad admin no se modela en BD.

### 3.2 Operaciones que SÍ existen (con endpoint)

| Operación | Dónde vive | Endpoint | Protección | Estado |
|---|---|---|---|---|
| **Reporte R2 reconcile (dry-run)** | `services/admin/mantenimiento.service.ts:342` | `GET /api/admin/mantenimiento/r2-reconcile` | `requireAdminSecret` | ✅ |
| **Ejecutar limpieza R2 (borra huérfanas)** | `mantenimiento.service.ts:440` | `POST /.../r2-reconcile/ejecutar` | `requireAdminSecret` + body `confirmacion:'SI_BORRAR_HUERFANAS'` + gracia 5min + max 500 + re-verificación BD | ✅ |
| **Log de auditoría reconcile** | controller `:114`, tabla `r2_reconcile_log` | `GET /.../r2-reconcile/log` | `requireAdminSecret` (requiere migración manual de la tabla) | ✅ |
| **Borrar imagen R2 puntual (reference-count)** | `mantenimiento.service.ts:158` → `r2.controller.ts` | `DELETE /api/r2/imagen` | ⚠️ `verificarToken` (**cualquier usuario logueado, no admin**) | ✅ |
| **Crear suscripción Stripe $449/mes (registro)** | `pago.service.ts:118` | `POST /api/pagos/crear-checkout` | ⚠️ **sin auth** (registro público, valida email en Redis) | ✅ |
| **Crear suscripción (upgrade personal→comercial)** | `pago.service.ts:260` | `POST /api/pagos/crear-checkout-upgrade` | `verificarToken` | ✅ |
| **Webhook Stripe (crea usuario+negocio+sucursal al pagar)** | `pago.service.ts:376` | `POST /api/pagos/webhook` | Firma `STRIPE_WEBHOOK_SECRET` | ✅ |
| **Cancelación de suscripción (despublica negocio)** | `pago.service.ts:815` | webhook `subscription.deleted` | firma Stripe | ✅ |
| **Renovación / cambio de plan** | `pago.service.ts:406` | webhook `subscription.updated` | firma Stripe | 🚧 **`// TODO` — no hace nada** |
| **Aprobar/publicar negocio nuevo** | `onboarding.service.ts:117` `finalizarOnboarding` | `POST /api/onboarding/:negocioId/finalizar` | `verificarToken` — **el dueño se auto-publica, sin aprobación humana** | ✅ (auto) |
| **Activar/desactivar sucursal (revoca gerente)** | `negocioManagement.service.ts:1398` | BS | `verificarToken`+`verificarNegocio` (scope 1 negocio) | ✅ |
| **Eliminar / crear sucursal** | `negocioManagement.service.ts:1474` / `:1092` | BS | scope negocio | ✅ |
| **Revocar gerente/empleado (ScanYA)** | `empleados.service.ts:453` + Redis `:504` | BS / ScanYA | scope negocio (por dueño, no admin de plataforma) | ✅ |
| **Reset / cambio de contraseña** | `auth.routes.ts:58-64` | `POST /api/auth/olvide-contrasena`, etc. | Flujo de usuario (token email) — **no hay reset forzado por admin** | ✅ |

### 3.3 Operaciones que NO EXISTEN (o son SQL manual) — el corazón del Panel Admin

| Operación faltante | Estado actual | Notas para el Panel Admin |
|---|---|---|
| **Suspender / banear NEGOCIO** | 🟥 NO EXISTE | Solo `esBorrador=true` por SQL manual, o cancelación Stripe. Falta acción admin + campo de estado real. |
| **Suspender / banear USUARIO** | 🟥 manual sin efecto | Campos `usuarios.estado` / `motivoCambioEstado` / `fechaCambioEstado` (`activo/inactivo/suspendido`) **existen pero ningún código los lee ni escribe**. Escribir por SQL **no bloquea** login ni sesiones. Necesita UI + enforcement en `auth`. |
| **Aprobar negocio nuevo (moderación humana)** | 🟥 NO EXISTE | Hoy el comerciante se auto-publica al finalizar onboarding. |
| **Marcar negocio `verificado`** | 🟥 NO EXISTE | Campo `negocios.verificado` solo se setea `false` en el webhook; nada lo pone `true`. |
| **Métricas / KPIs GLOBALES de plataforma** | 🟥 NO EXISTE | `dashboard`/`reportes` son **por-negocio** (`verificarNegocio`). No hay vista agregada cross-negocio. |
| **Gestión de embajadores / vendedores** | 🟥 schema dormido | Tablas `embajadores`, `usuarios.esEmbajador`/`referidoPor`, `negocios.embajadorId` existen; **ningún service/route las lee**. |
| **Comisiones de vendedores (calcular/pagar)** | 🟥 schema dormido | `embajador_comisiones` (tipo `primer_pago`/`recurrente`, %, monto, estado `pendiente/pagada/cancelada`) completo pero **sin lógica**; las comisiones no se generan. |
| **Atribuir referido en checkout** | 🟥 NO EXISTE | El checkout Stripe no captura `codigoReferido` ni setea `negocios.embajadorId`. |
| **Reset de contraseña forzado por admin** | 🟥 NO EXISTE | Solo autoservicio por email. |
| **Disparar/monitorear crons manualmente** | 🟥 NO EXISTE | Sin panel para ver última corrida (salvo el log del reconcile R2). |

### 3.4 Jobs Cron (cross-negocio, sin gate admin, sin endpoint)

Patrón `setTimeout`+`setInterval` (no `node-cron`); reloj del servidor (UTC en Render).

| Cron | Archivo | Schedule | Qué hace |
|---|---|---|---|
| **Alertas — diario** | `cron/alertas.cron.ts:24` | Diario 04:00 | Recorre **todos los negocios activos** → detección diaria de alertas + notificaciones |
| **Alertas — semanal** | `alertas.cron.ts:53` | Lunes 05:00 | Detección semanal por negocio |
| **ScanYA — cierre auto turnos** | `cron/scanya.cron.ts:20` | Cada 30 min | Cierra turnos dejados abiertos (cross-negocio) |
| **ChatYA — limpieza** | `cron/chatya.cron.ts:32` | Diario 03:00 | Hard-delete de conversaciones >6 meses + borrado R2 con reference-count |
| **MarketPlace — auto-pausa** | `cron/marketplace-expiracion.cron.ts:35` | Cada 6h | Pausa publicaciones con TTL 30 días vencido + notifica |
| **MarketPlace — pre-aviso** | `marketplace-expiracion.cron.ts:56` | Diario 09:00 UTC | Avisa antes de expirar (idempotente) |
| **Servicios — auto-pausa** | `cron/servicios-expiracion.cron.ts:21` | Cada 6h | Pausa publicaciones con 30 días sin interacción |

> El reconcile R2 **no** está agendado: es manual vía endpoint.

### 3.5 Hallazgos de seguridad relevantes para el Panel Admin

1. **🟥 CRÍTICO — Onboarding sin verificación de propiedad.** En `routes/onboarding.routes.ts:38-40` el middleware `verificarPropietarioNegocio` está **comentado**. Todas las rutas `/api/onboarding/:negocioId/*` (incl. `finalizar`, logo, artículos) solo exigen `verificarToken`. Cualquier usuario autenticado puede pasar un `negocioId` ajeno y modificar/publicar el negocio de otro. El middleware ya existe en `negocio.middleware.ts:15` — solo falta activarlo.
2. **🟥 `usuarios.estado` es decorativo** (ver 3.3) — suspender por SQL no tiene efecto.
3. **`ADMIN_SECRET` es un único string compartido**, sin rotación, identidad ni scoping — insuficiente para el modelo multi-rol admin/vendedor de la visión.
4. **`DELETE /api/r2/imagen` accesible para cualquier usuario logueado**, no admin-only (mitigado por reference-count + validación de dominio).
5. **`subscription.updated` sin implementar** — renovaciones/fallos de pago no actualizan estado.

### 3.6 Infraestructura lista para reutilizar

- **Namespace `/api/admin/*` ya montado** con gate central de un punto y sub-router agregador que ya prevé slots: `negocios`, `usuarios`, `reportes-globales`, `suscripciones`, `auditoria`.
- **Patrón de auditoría** probado con `r2_reconcile_log` (dry-run vs real, ejecutadoPor).
- **Schema de embajadores/comisiones completo** — modelo de datos de vendedores/comisiones ya diseñado; falta toda la capa servicios/rutas/UI.
- `IMAGE_REGISTRY` (`utils/imageRegistry.ts`) + `reconcileConnections` (multi-BD cross-ambiente) como base de Mantenimiento.

---

## 4. Archivos obsoletos / candidatos a eliminar

| Archivo / ruta | Tipo | Confianza | Evidencia |
|---|---|---|---|
| `apps/web/src/pages/private/TestIconos.tsx` (`/test-iconos`) | Página de prueba | **Seguro obsoleto** | Header dice "PÁGINA TEMPORAL… BORRAR". Solo en `router/index.tsx` con comentario "TEMPORAL — BORRAR" |
| `apps/web/src/pages/private/TestModalSesion.tsx` (`/test-modal-sesion`) | Página de prueba | **Seguro obsoleto** | Header "PÁGINA TEMPORAL… BORRAR". Solo en `router/index.tsx` "TEMPORAL — BORRAR" |
| `apps/web/src/pages/private/dev/PaginaMockupMenu.tsx` (`/dev/menu-mockup`) | Mockup dev | **Probablemente** | "Página de prueba/mockup… no expuesto en navegación". Único contenido de `dev/` |
| `PaginaConfigurarNegocio` (inline en `router/index.tsx`, `/negocio/configurar`) | Placeholder muerto | **Revisar** | `PlaceholderPage` inline sin página real; no está en navegación |
| Tablas BD legado: `marketplace`, `categoriasMarketplace`, `bolsaTrabajo` | Tablas BD | **Seguro obsoleto** | Reemplazadas por `articulosMarketplace` / `serviciosPublicaciones`; sin queries |
| Tablas BD dormidas: `planesAnuncios`, `promociones*`, `planes`, `planReglas`, `embajadores`*, `bitacoraUso` | Tablas BD | **Revisar** (no borrar) | Sin lógica hoy, pero parte de features planeadas (anuncios pagados, embajadores) |

\* `embajadores`/`embajadorComisiones`/`regiones` están dormidas pero son **base del Panel Admin** (comisiones de vendedores) — no eliminar.

> **Corrección a una hipótesis previa:** los 6 stores Zustand de BS (`useDashboardStore`, `useTransaccionesStore`, `useClientesStore`, `useAlertasStore`, `useReportesStore`, `usePuntosStore`) **NO están huérfanos**. Tras migrar a React Query quedaron reducidos a estado de UI (filtros, tabs, períodos) y siguen importados/usados. Igual los services frontend (`dashboardService`, etc.): ahora son la capa de fetch que consumen los hooks `hooks/queries/use*.ts`. **No hay archivos `.bak/.old/.tmp` ni componentes huérfanos** detectados.

---

## 5. Roles y permisos existentes

### 5.1 Ejes de identidad (todos a nivel usuario/negocio, NO plataforma)

| Eje | Dónde se define | Valores | Cómo se valida (middleware) |
|---|---|---|---|
| **Perfil de cuenta** | `usuarios.perfil` (schema:59) | `personal` / `comercial` | `verificarPerfil()`, `requiereAccesoComercial` (`auth.ts`, `validarModo.ts`) |
| **Modo activo** | `usuarios.modoActivo` + JWT | `personal` / `comercial` | `requiereModoPersonal` / `requiereModoComercial` (`validarModo.ts`) |
| **Membresía** | `usuarios.membresia` (1/2/3) | nivel | `verificarMembresia(nivel)` — **sin uso real en rutas** |
| **Dueño vs Gerente** (web) | `usuarios.sucursalAsignada` (null=dueño / UUID=gerente) | — | `validarAccesoSucursal` (`sucursal.middleware.ts`): dueño ve todas las sucursales, gerente solo la asignada |
| **Dueño/Gerente/Empleado** (ScanYA) | JWT ScanYA `tipo` + `permisos` | `dueno`/`gerente`/`empleado` | `verificarEsDueno`, `verificarEsDuenoOGerente`, `verificarPermiso(x)` (`scanyaAuth.middleware.ts`); permisos de empleado se re-leen de BD en cada request |
| **Propiedad de negocio** | `negocios.usuarioId` | — | `verificarPropietarioNegocio` (`negocio.middleware.ts:15`) — **definido pero comentado en onboarding** (ver §3.5.1) |
| **Estado de usuario** | `usuarios.estado` | `activo`/`inactivo`/`suspendido` | **Ningún código lo lee/escribe** → decorativo |
| **Admin de plataforma** | header `x-admin-secret` vs `env.ADMIN_SECRET` | — | `requireAdminSecret` (`adminSecret.middleware.ts`) — sin usuario ni roles |

### 5.2 Middleware — qué protege qué

| Middleware | Archivo | Protege |
|---|---|---|
| `verificarToken` | `middleware/auth.ts` | Rutas que requieren usuario autenticado (JWT) |
| `authOpcional` | `authOpcional.middleware.ts` | Rutas públicas con datos extra si hay sesión |
| `requiereModoPersonal` / `requiereModoComercial` | `validarModo.ts` | Separa funciones personales (CardYA, cupones) de comerciales (BS) |
| `verificarNegocio` | `negocio.middleware.ts` | El usuario tiene un negocio asociado |
| `verificarPropietarioNegocio` | `negocio.middleware.ts:15` | Propiedad del `negocioId` de la URL (**comentado en onboarding**) |
| `validarAccesoSucursal` | `sucursal.middleware.ts` | Acceso dueño/gerente a la sucursal solicitada |
| `verificarTokenScanYA` + `verificarEsDueno` / `verificarPermiso` | `scanyaAuth.middleware.ts` | Sesión ScanYA y permisos granulares de empleado |
| `requireAdminSecret` | `adminSecret.middleware.ts` | Todo `/api/admin/*` (solo Mantenimiento R2 hoy) |
| `transformResponse` / `cors` / `helmet` / `rateLimiter` / `errorHandler` | varios | Transversales (snake→camel, seguridad HTTP, rate limit) |

### 5.3 Cadena típica de middlewares (BS)

```
verificarToken → requiereModoComercial → verificarNegocio → validarAccesoSucursal → controller
```

### 5.4 Brechas de roles para el Panel Admin (resumen)

- **No hay rol `admin` ni `vendedor` en BD** — la visión describe Panel Admin multi-rol (admin + vendedores/embajadores), pero hoy solo existe el secreto compartido.
- **Enforcement de suspensión ausente** — `usuarios.estado` no se chequea en login/middleware.
- **`verificarMembresia` sin uso** — los límites por plan (`planes`/`planReglas`) no se aplican.
- **Auditoría limitada** — solo el reconcile R2 registra acciones; falta bitácora general de acciones admin.

---

*Fin del inventario. Rutas de archivo relativas a `E:\AnunciaYA\anunciaya\`. Generado por exploración de solo lectura; ningún archivo de código fue modificado.*
