# Reporte de progreso — Sección Servicios

> **Fecha:** 2026-05-17 (actualizado tras cierre de Sprint 7)
> **Estado:** 7 de 8 sprints completados + 2 subsprints + Sprint 7 cerrado en sus 9 sub-tareas. Solo resta Sprint 8 (BS Vacantes, post-launch).

## Resumen ejecutivo

La sección **Servicios** está **funcionalmente lista para la beta**. Los usuarios pueden:

- Ver el feed mezclado con widget de Clasificados
- Ver el detalle de cualquier publicación con galería swipeable + Q&A + mapa real
- Publicar tanto `ofrezco` como `solicito` con wizard de 3 pasos
- Ver el perfil de cualquier prestador con sus servicios activos, reseñas y distribución de estrellas
- Buscar con sugerencias en vivo y overlay completo
- **Gestionar sus propias publicaciones**: pausar/reactivar/editar/eliminar desde `Mis Publicaciones`
- **Editar publicaciones** con el wizard de 3 pasos en modo edición (mismo flujo de creación)
- **Dejar reseñas** a los prestadores con quienes contactaron
- Recibir **sugerencias de moderación pasiva** ("¿Esto encajaría mejor en MarketPlace?") cuando el contenido luce a venta de objeto

Lo único que falta:
- **BS Vacantes** (Sprint 8, post-launch): módulo en Business Studio para que negocios publiquen vacantes corporativas en Servicios.

---

## ✅ Lo completado

### Sprint 1 — Backend base (BD + Services + Validación)

- [x] Migración SQL `2026-05-15-servicios-base.sql` con 4 tablas: `servicios_publicaciones`, `servicios_preguntas`, `servicios_resenas`, `servicios_busquedas_log`
- [x] Migración SQL `2026-05-15-chat-servicios-fk.sql` (cols `servicio_publicacion_id` en chat)
- [x] Drizzle schema en `apps/api/src/db/schemas/schema.ts` con CHECK constraints y discriminated union `precio`
- [x] Service core `services/servicios.service.ts` (~830 líneas) con 11 funciones: crear, leer, listar, actualizar, cambiar estado, eliminar, registrar vista, generar URL upload, eliminar foto huérfana
- [x] Zod schemas en `validations/servicios.schema.ts` (~500 líneas) — `crearPublicacionSchema`, `actualizarPublicacionSchema`, `cambiarEstadoSchema`, `feedQuerySchema`, `feedInfinitoQuerySchema`, etc.
- [x] Helpers: `aleatorizarCoordenada()` (offset random ~500m), `pgArrayLiteral()` (serialización correcta de arrays vacíos)
- [x] Controllers + rutas REST en `apps/api/src/controllers/servicios.controller.ts` y `routes/servicios.routes.ts`
- [x] Mapper interno `mapearPublicacion()` (snake_case BD → camelCase frontend con `ST_X/ST_Y`)
- [x] Seeds de desarrollo `seed-servicios-dev.ts` (5 publicaciones de ejemplo)

### Sprint 2 — Feed Frontend

- [x] `PaginaServicios.tsx` con layout `min-h-full bg-transparent` heredando gradiente
- [x] `ServiciosHeader` sticky `max-w-7xl rounded-b-3xl` con 2 variantes (`'feed'` y `'pagina'`)
- [x] Carrusel "Recién publicado" con snap horizontal
- [x] Grid "Cerca de ti" (2 cols móvil / 3 cols lg / 4 cols 2xl)
- [x] 5 chips de filtro estilo MP isolated pills: `Todos · Presencial · Remoto · Servicio · Empleo`
- [x] Toggle Ofrecen/Solicitan (mobile dentro del carrusel de chips primero como "Todos")
- [x] `FABPublicar` con 2 opciones (Ofrezco / Solicito)
- [x] Hooks React Query: `useServiciosFeed`, `useServiciosFeedInfinito` con `placeholderData: keepPreviousData`
- [x] Estados vacío + error con CTAs

### Sprint 3 — Detalle de publicación

- [x] `PaginaServicio.tsx` (ruta `/servicios/:id`) con render condicional por tipo:
  - `servicio-persona` → galería 4:3 + skills
  - `vacante-empresa` → portada 16:9 con logo + Requisitos
  - `solicito` → sin galería destacada + bloque presupuesto amber
- [x] `GaleriaServicio.tsx` con scroll-snap nativo + dots móvil + flechas desktop + `ModalImagenes` lightbox
- [x] `OferenteCard` con avatar + nombre + "Ver perfil"
- [x] `MapaPlaceholderServicio` (mapa real pendiente Sprint 7)
- [x] `SeccionPreguntasServicio` con filtro de privacidad (anónimo/autor/dueño)
- [x] `BarraContactoServicio` con `subtipo='servicio_publicacion'` en ChatYA + WhatsApp
- [x] ChatYA context cards con `insertarMensajeContextoServicio` en backend

### Sprint 4 v2 — Wizard de Publicar (3 pasos)

> El Sprint 4 se reescribió 2 veces:
> - **v1**: 4 pasos diferenciados por modo (ofrezco 3 pasos, solicito 4 pasos)
> - **v2** (actual): 3 pasos unificados según handoff `design_handoff_publish_wizard/`

- [x] `useWizardServicios` hook con shape simplificado: `categoria + titulo + descripcion + urgente + fotos + modalidad + budgetMin/Max + zonas + confirmaciones`
- [x] Persistencia `localStorage` con claves `aya:servicios:wizard:draft-v2` y `aya:servicios:wizard:step-v2`
- [x] Validación step-by-step con `nextHelp` contextual ("Tu título necesita 10 caracteres más")
- [x] **Paso 1 — Qué necesitas**: Categoría + título + descripción + urgente
- [x] **Paso 2 — Detalles**: Fotos (6 tiles) + Modalidad + Presupuesto rango + Zonas + Info ubicación detectada
- [x] **Paso 3 — Revisa y publica**: Preview en vivo + 3 confirmaciones legales
- [x] `WizardServiciosLayout` con barra inferior flotante mobile + banner amarillo `nextHelp` desktop
- [x] Nav inferior mobile **dinámico** que sube/baja con el BottomNav usando `useHideOnScroll`
- [x] Botones "Atrás" + "Siguiente / Publicar" tanto en header desktop como en nav mobile
- [x] `WizardSeccionCard` reusable — cada bloque del paso vive en su propio card blanco
- [x] **Optimización de fotos** cliente-side con `optimizarImagen()`: resize 1920px máx + WebP calidad 0.85 (reduce 70-90% el peso)
- [x] Upload directo a R2 con presigned URL (mismo patrón que MarketPlace)
- [x] **Limpieza de fotos huérfanas** al cancelar/borrar borrador: ref `urlsSubidasEnSesion: Set<string>` + endpoint `DELETE /servicios/foto-huerfana` con reference count
- [x] `ModalExitoPublicacion` tras publicar (botones "Ver mi anuncio" + "Publicar otro")
- [x] `ConfirmExitModal` custom (handoff `design_handoff_confirm_exit_modal/`) reemplazando el modal nativo
- [x] Construcción de payload con mapeo automático modo → precio/presupuesto correcto

### Sprint 5 — Perfil del Prestador + Reseñas

- [x] Backend `services/servicios/perfilPrestador.ts` con 3 funciones: `obtenerPerfilPrestador`, `obtenerPublicacionesDelPrestador`, `obtenerResenasDelPrestador`
- [x] KPIs agregados vía subqueries: rating promedio, total reseñas, total publicaciones activas
- [x] 3 endpoints REST: `GET /usuarios/:id`, `GET /usuarios/:id/publicaciones`, `GET /usuarios/:id/resenas`
- [x] 3 hooks React Query: `usePerfilPrestador`, `usePublicacionesDelPrestador`, `useResenasDelPrestador`
- [x] `PaginaPerfilPrestador.tsx` (ruta `/servicios/usuario/:usuarioId`) con tabs Servicios/Reseñas
- [x] Bloque identidad: avatar 80/96px + nombre + ciudad + "Miembro desde Mayo 2026" + chip rating amber con estrellas
- [x] KPIs desktop en columna lateral (Servicios activos + Tiempo respuesta)
- [x] Tab Servicios: grid 2/3 cols con `CardServicio` y `CardVacante`
- [x] Tab Reseñas: card de promedio destacado + lista densa con autor+rating+texto+publicación origen
- [x] Estado vacío para ambos tabs con copy contextual

### Sprint 6 — Buscador

> Implementado fuera de orden antes que Sprint 4. Patrón `PATRON_BUSCADOR_SECCION.md`.

- [x] `services/servicios/buscador.ts` con `obtenerSugerenciasServicios()` usando FTS + `unaccent`
- [x] Endpoint `GET /buscar/sugerencias?q=&ciudad=` (top 5 en vivo)
- [x] `OverlayBuscadorServicios.tsx` clon de `OverlayBuscadorOfertas` con paleta sky
- [x] Búsquedas recientes + sugerencias en vivo + estado vacío
- [x] Botón de búsqueda en `ServiciosHeader` (desktop + mobile)
- [x] Integración en `MainLayout` con `detectarSeccion === 'servicios'`

### Subsprint Clasificados (widget formal)

> Handoff `design_handoff_clasificados/`.

- [x] Migración `2026-05-16-servicios-categoria-urgente.sql`: cols `categoria` (varchar 20, nullable) + `urgente` (boolean default false) + 2 CHECK + 2 índices parciales
- [x] Drizzle schema actualizado + Zod `campoCategoria` enum + filtros `categoria`/`soloUrgente` en feed infinito
- [x] Service `obtenerFeedInfinito` con orden "urgente DESC, created_at DESC" cuando `modo='solicito'`
- [x] Tipos frontend `CategoriaClasificado` + `FiltroClasificado` (incluye 'todos' y 'urgente' como pseudo)
- [x] Helpers `labelCategoria()` y `tonoCategoria()` en utils
- [x] `ClasificadosWidget.tsx` con header KPI dinámico + tag strip + 6 filas/celdas + footer CTA
- [x] `PedidoRow` subcomponente con eyebrow categoría + precio amber tabular-nums + meta densa
- [x] Eliminación de `SeccionClasificados.tsx` (versión periódico previa)
- [x] Integración en `PaginaServicios.tsx` con state `filtroClasificado` + orden urgentes-primero en cliente
- [x] Seed `2026-05-16-seeds-clasificados-dev.sql` con 5 pedidos + categorías variadas + 1 urgente

### Subsprint Categorías v2 (consolidación a 5 macro + Otros)

- [x] Migración `2026-05-16-categorias-clasificados-v2.sql` con UPDATE remapeo:
  - `mudanzas` → `hogar`
  - `tutorias` + `mascotas` → `cuidados`
  - `belleza-bienestar` (nuevo)
  - Resto preservado
- [x] Drizzle CHECK constraint reescrito
- [x] Zod + tipos frontend + `labelCategoria()` actualizados
- [x] Seed dev remapeado

### Subsprint UX/Visual

- [x] Header negro persistente en todas las rutas de Servicios (con breadcrumb desktop + subtituloMobile en pagina)
- [x] Banner amarillo `nextHelp` en wizard desktop (movido del header negro)
- [x] Wizard separado en cards individuales (Paso 1, 2, 3) con `WizardSeccionCard`
- [x] Detalle (`PaginaServicio`) separado en cards individuales con `SeccionCard`
- [x] `ModalExitoPublicacion` rediseñado: primario gradient sky + ícono → / icono +, secundario ghost
- [x] `GaleriaServicio` con swipe + lightbox + dots paginación (replicado del patrón MP)
- [x] Compactación mobile de los 3 pasos (~150-200px ahorro por paso)
- [x] Nav inferior wizard convertido a barra flotante que se mueve con BottomNav (dinámico)

---

### Sprint 7 — Polish + Crons + Mis Publicaciones (CERRADO 2026-05-17)

> Sprint cerrado en sus 9 sub-tareas. Todo lo crítico para producción quedó listo.

#### 7.1 — Backend de "Mis Publicaciones" ✅

- [x] Service `obtenerMisPublicaciones(usuarioId, opts)`
- [x] Service `cambiarEstadoPublicacion(id, usuarioId, nuevoEstado)` (activa ↔ pausada)
- [x] Service `eliminarPublicacion(id, usuarioId)` (soft delete)
- [x] Service `actualizarPublicacion(id, usuarioId, datos)`
- [x] Endpoints REST: `GET /mis-publicaciones`, `PATCH /publicaciones/:id/estado`, `DELETE /publicaciones/:id`, `PUT /publicaciones/:id`
- [x] **Endpoint nuevo** `POST /publicaciones/:id/reactivar` (resetea `expira_at` a NOW()+30d y vuelve a 'activa' en una sola transacción atómica, evitando re-pausa inmediata del cron)

#### 7.2 — UI "Mis Publicaciones" ✅

- [x] `MisPublicacionesServiciosSection.tsx` — sección reutilizable inyectada en `PaginaMisPublicaciones.tsx`
- [x] 2 listas: **Activas** y **Pausadas** (sin "Vendidas" — un servicio no se agota; si ya no se ofrece, se elimina)
- [x] `CardServicioMio.tsx` — preview compacto + pill de estado + KPIs (vistas, mensajes, días restantes) + menú "⋯"
- [x] Acciones inline: Pausar / Reactivar / Editar / Eliminar — todas con modal de confirmación
- [x] Hook `useMisPublicacionesServicio` con paginación
- [x] FAB del Modo Personal trabaja en ambos modos (Servicios + MP) con paleta sky en Servicios
- [x] `conteosServicios` reactivo desde React Query para mostrar contadores en tabs

#### 7.3 — Wizard de Editar ✅

- [x] `useWizardServicios` refactorizado con opt `storageNamespace` para mantener drafts separados (`v2` para crear, `edit-{id}` para editar) — no contamina el draft de crear
- [x] `PaginaPublicarServicio.tsx` detecta `:publicacionId`, hidrata el draft una sola vez con `hidratadoRef` y hace `PUT` en lugar de `POST`
- [x] Helper `publicacionAlDraft()` reversa `construirPayload()` para llenar el wizard con datos de BD
- [x] Helper `construirPayloadEdicion()` arma payload de `PUT` con diff implícito (todos los campos editables)
- [x] Ruta `/servicios/publicar/:publicacionId` registrada
- [x] Botón "Guardar cambios" con ícono Save (no "Publicar"); redirige al detalle directamente sin modal

#### 7.4 — Cron de expiración automática ✅

- [x] `apps/api/src/services/servicios/expiracion.ts` con `autoPausarExpiradosServicios()` (SQL atómico)
- [x] `apps/api/src/cron/servicios-expiracion.cron.ts` registrado en `index.ts` (delay inicial 60s, luego cada 6h)
- [x] Idempotente: solo toca publicaciones `estado='activa' AND expira_at < NOW()`
- [x] Logs estructurados con conteo de pausados

#### 7.5 — Tiempo de respuesta ✅ / Identidad verificada ❌ DESCARTADO 2026-05-17

> **Decisión de producto:** la feature "Identidad verificada" se elimina del MVP.
> No hay forma sostenible de validar identidad real en la beta (verificación
> manual no escala más allá de los 50 negocios piloto; terceros como
> Truora/MetaMap cuestan $1-5 USD por validación, no rentable sin ingresos
> todavía). Si en el futuro se quiere agregar, sería como **beneficio del plan
> comercial $449/mes** con verificación manual desde Panel Admin.
>
> **Tiempo de respuesta SÍ se conserva**: es un cálculo automático sin
> verificación humana ni costo externo. Lo poblará un cron mensual desde
> ChatYA cuando exista (Sprint 9+). Por ahora la columna es NULL para todos
> y el frontend oculta el KPI cuando es null.

- [x] Migración `2026-05-17-usuarios-tiempo-respuesta.sql` aplicada en BD local. Solo agrega `usuarios.servicio_tiempo_respuesta_minutos integer`.
- [x] Drizzle schema con `servicioTiempoRespuestaMinutos` (sin `identidadVerificada`).
- [x] `obtenerPerfilPrestador()` lee `servicio_tiempo_respuesta_minutos`.
- [x] `PerfilPrestador` y `OferenteServicio` (tipos web) con `tiempoRespuestaMinutos: number | null`.
- [x] UI `PaginaPerfilPrestador.tsx`: KPI "Tiempo de respuesta" visible solo cuando hay dato (`!== null`); badge "Verificado" eliminado del header.
- [ ] **Pendiente para Sprint 9+ (no bloquea beta):** cron mensual que recalcule `tiempo_respuesta_minutos` desde `chat_mensajes`.
- [ ] **Pendiente operativo:** ejecutar `docs/migraciones/2026-05-17-usuarios-tiempo-respuesta.sql` en Supabase staging y producción.

#### 7.6 — Crear reseña ✅

- [x] `crearResenaSchema` Zod (`rating` int 1-5, `texto` max 200 con normalización empty→null)
- [x] Service `crearResenaServicio()` con validaciones:
  - Publicación existe y no eliminada
  - El autor NO es el dueño (no self-review)
  - El autor no había dejado reseña previa para esta publicación (1 reseña por par autor+publicación)
  - Insert + invalida queries del perfil del prestador
- [x] Endpoint `POST /publicaciones/:id/resenas`
- [x] `ModalCrearResena.tsx` con estrellas tap-to-select + textarea + contador chars
- [x] CTA "Dejar reseña" en `SeccionCard` del detalle visible solo cuando el viewer NO es el dueño
- [x] Hook `useCrearResenaServicio` con `invalidateQueries` del perfil

#### 7.7 — Moderación pasiva ✅

- [x] Helper `detectarSugerenciaSeccion()` en service con regex `\b(vendo|vendido|venta|remato|cambio por|cambio x)\b/i`
- [x] `crearPublicacion()` chequea heurística antes de insert si `!confirmadoPorUsuario`; si matchea, retorna `code=409` con `sugerencia: 'marketplace'`
- [x] `ModalSugerenciaSeccion.tsx` con copy "¿Estás vendiendo un objeto?" + 2 CTAs ("Llévame a MarketPlace" / "Continuar en Servicios")
- [x] `PaginaPublicarServicio.tsx` intercepta axios 409, abre el modal y al confirmar reenvía con `confirmadoPorUsuario=true`
- [x] Tests unitarios del helper en `servicios-helpers.test.ts` (15 casos: venta detectada, servicios genuinos no detectados, edge cases con `\b`)

#### 7.8 — Tests + Documentación ✅

- [x] Doc maestro `docs/arquitectura/Servicios.md`
- [x] Reporte de progreso (este archivo)
- [x] **Tests Vitest (40 casos, 2 archivos):**
  - `servicios-validaciones.test.ts` (19 casos) — `crearPublicacionSchema` (happy ofrezco/solicito, 5 kinds de precio, refines de coherencia modo/tipo, presupuesto solo solicito, categoría solo solicito, todas las confirmaciones true, max ≥ min en rangos, límites de campos titulo/descripcion/fotos/skills) + `crearResenaSchema` (rating 1-5, texto max 200, empty → null)
  - `servicios-helpers.test.ts` (21 casos) — `pgArrayLiteral` (vacío→`{}`, escapado de `"`/`\\`, unicode, edge cases) + `detectarSugerenciaSeccion` (detecta vendo/venta/remato/cambio en mayus/minus, no falsea con servicios genuinos como "fotógrafo"/"plomería", respeta word boundaries con "vendaje")
- [x] Helpers `pgArrayLiteral` y `detectarSugerenciaSeccion` exportados para tests unitarios
- [ ] **Pendiente como mejora:** Tests E2E con Playwright en `apps/web/e2e/` (flujo publicar/editar/cancelar). No bloquea beta.

#### 7.9 — Polish visual final ✅

- [x] **Mapa real** en el detalle: `MapaPlaceholderServicio` reemplazado por `MapaUbicacion` de MarketPlace (reuso cross-sección)
- [x] **Distribución de estrellas 5★→1★** en sidebar desktop del perfil con helper `calcularDistribucion()` y barras horizontales con `amber-fill`
- [x] Header negro persistente en todas las rutas con variantes `'feed'` y `'pagina'`
- [x] Banner amarillo `nextHelp` en wizard (movido del header al wizard)
- [x] Wizard en cards individuales (`WizardSeccionCard`) tanto en mobile como desktop
- [x] Compactación mobile de los 3 pasos (~150-200px ahorro por paso)
- [x] Botones del `ModalExitoPublicacion` con gradient sky pill + iconos
- [ ] **Pendiente como polish puramente cosmético:** animaciones de transición entre pasos del wizard + skeleton states para los 3 hooks paralelos del perfil. No bloquea beta.

---

## 🚧 Lo pendiente

### Sprint 8 — BS Vacantes (módulo en Business Studio)

> Post-launch. No bloquea la beta. Permite que negocios publiquen vacantes corporativas que aparecen en el feed de Servicios.

#### 8.1 — Backend

- [ ] Service que adapta `crearPublicacion` para `modo='solicito'` + `tipo='vacante-empresa'`:
  - `usuario_id` puede ser el dueño/operador del negocio
  - Auto-completa info del negocio en el preview (logo + nombre + verificado)
  - Precio mensual: `{kind:'mensual', monto}` con CHECK extra (mensual solo en vacantes)
- [ ] Endpoint `POST /api/business-studio/vacantes` (NO /servicios, vive en BS)
- [ ] La vacante creada se inserta en `servicios_publicaciones` con bandera implícita (tipo='vacante-empresa') y aparece en el feed público de Servicios

#### 8.2 — UI en Business Studio

- [ ] Módulo "Vacantes" en el menú lateral de BS (icono Briefcase)
- [ ] Página `/business-studio/vacantes` con tabs `Activas | Pausadas`
- [ ] Wizard simplificado (3 pasos):
  - Paso 1: Título del puesto + descripción + categoría='empleo' fija
  - Paso 2: Requisitos (chips) + Horario + Días + Modalidad + Sueldo mensual (NO presupuesto)
  - Paso 3: Preview + 3 confirmaciones (legales para empleador)
- [ ] Métricas en el dashboard de BS: postulantes (mensajes recibidos), vacantes activas

#### 8.3 — Cross-funcional

- [ ] `CardVacante` ya existe y maneja `tipo='vacante-empresa'` con banda sky + logo del negocio
- [ ] `BarraContactoServicio` muestra "Postular vía ChatYA" en lugar de "Cotizar" cuando es vacante
- [ ] Filtro "Empleo" del header del feed ya muestra estas vacantes

---

## 📊 Métricas del trabajo

| Métrica | Valor |
|---|---|
| Archivos backend creados/modificados | ~22 |
| Archivos frontend creados/modificados | ~42 |
| Líneas SQL (migraciones + seeds) | ~650 |
| Componentes React nuevos | ~32 |
| Endpoints REST implementados | 19 (incluye reactivar, reseñas) |
| Hooks React Query | 18 (incluye misPublicaciones, editar, reseñas, reactivar) |
| Schemas Zod | 9 (incluye `crearResenaSchema`) |
| Casos del wizard cubiertos | 5 (ofrezco / busco servicio / busco trabajo / vacante legacy / **editar**) |
| Tests E2E | 0 (pendientes como mejora, no bloquean beta) |
| Tests API Vitest | **40 (2 archivos: validaciones + helpers)** |
| Crons activos | 1 (auto-pausa expiración cada 6h) |

---

## 🎯 Próximos pasos sugeridos

Servicios ya está **funcionalmente cerrada para la beta**. Los próximos pasos lógicos son:

1. **Ejecutar migración pendiente** en Supabase: `docs/migraciones/2026-05-17-usuarios-tiempo-respuesta.sql` (agrega `usuarios.servicio_tiempo_respuesta_minutos`).
2. **Tests E2E con Playwright** (opcional, no bloquea beta): flujo publicar, editar, cancelar wizard, dejar reseña.
3. **Cron mensual** que pueble `servicio_tiempo_respuesta_minutos` desde `chat_mensajes` (Sprint 9+, una vez que haya datos suficientes en ChatYA).
4. **Sprint 8 — BS Vacantes** (post-launch, cuando haya tracción de negocios).
5. **Identidad verificada como beneficio premium** (post-launch, opcional): si la beta valida tracción comercial, reintroducir verificación manual desde Panel Admin solo para suscriptores del plan $449/mes.

Decisiones de producto **diferidas a observación de la beta**:
- ¿Las reseñas se piden tras cerrar la conversación ChatYA, o tras trigger manual? — actualmente: trigger manual desde la `SeccionCard` del detalle.
- ¿Moderación pasiva amplía señales (renta, donación, etc.)? — actualmente: solo detecta venta de objetos (→ MarketPlace).
- ¿La gente publica más en `ofrezco` o `solicito`? — métricas tras 30 días.

Decisiones tomadas:
- **2026-05-17 — Identidad verificada descartada del MVP**: no hay forma sostenible de validarla en beta. La columna `usuarios.identidad_verificada` se descartó de la migración antes de llegar a `main` — el repo no la incluye. Reevaluar como beneficio premium para Sprint 9+. **Tiempo de respuesta SÍ se conserva** porque es automático (no requiere verificación humana ni costo externo).

---

**Última actualización:** 2026-05-17 (cierre Sprint 7)
**Autor:** Sesión de implementación + refactor iterativo con feedback en vivo del comerciante (Juan).
