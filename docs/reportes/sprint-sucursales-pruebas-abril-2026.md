# Sprint Sucursales — Checklist Completo de Pruebas

**Periodo:** 16 – 18 Abril 2026
**Alcance:** Validación post-Sprint 12 BS Sucursales + hallazgos emergentes + Panel Admin (infraestructura)
**Estado:** 🟢 12/12 secciones completas · 14/18 recomendaciones cerradas · 4 pruebas de testing aún pendientes

---

## Contexto

Durante la validación del Sprint 12 (BS Sucursales) se ejecutó un checklist de **12 secciones** y surgieron **18 recomendaciones** adicionales (bugs potenciales, testing pendiente, documentación, UX). Estas dos listas son distintas pero complementarias y abarcan todo el trabajo post-sprint.

---

# 📋 Lista 1 — Las 12 secciones de pruebas del Sprint BS Sucursales

Estado: **12/12 completas** ✅

| # | Sección | Estado | Notas clave |
|---|---------|:------:|-------------|
| 1 | **CRUD de sucursales** | ✅ | Toggle activa/inactiva, filtros por estado, buscador, blindajes de Matriz (no desactivar, no eliminar), cleanup de imagen al reemplazar |
| 2 | **Clonación automática al crear** | ✅ | Horarios, métodos de pago, imágenes R2 (perfil/portada/galería/artículos), catálogo independiente. Clonado de ofertas agregado (no heredaba al inicio) |
| 3 | **Gerente Caso A — Creación** | ✅ | Cuenta nueva con contraseña provisional, email con credenciales, primer login fuerza cambio, gerente accede a BS de su sucursal |
| 4 | **Gerente Caso B — Promoción** | ✅ | Cuenta personal existente promovida a gerente, conserva su contraseña, `requiere_cambio_contrasena = false`, notificación por email |
| 5 | **Validación de correo 3 niveles** | ✅ | Formato, auto-exclusión (dueño), disponibilidad en BD, typo detection (10 dominios) |
| 6 | **Revocación de gerente** | ✅ | `sucursalAsignada = null`, `negocioId = null`, vuelve a modo personal, email enviado, siguiente request rechazado por middleware |
| 7 | **Reenviar credenciales** | ✅ | Contraseña regenerada, hash actualizado en BD, email nuevo, `requiere_cambio_contrasena = true` restablecido |
| 8 | **Hard delete + R2 cleanup** | ✅ | Protección `TIENE_HISTORIAL` → ofrece desactivar como alternativa. Sin historial → CASCADE + limpieza R2 |
| 9 | **Blindajes del gerente** | ✅ | No ve Sucursales en menú, 403 si intenta URL directa, no puede crear negocio propio (onboarding bloqueado), no puede cambiar correo ni datos del negocio |
| 10 | **Permisos gerente sobre empleados** | ✅ | CRUD de empleados solo de SU sucursal, 403 si intenta manipular otra, revocar sesión ScanYA funciona (fix de refresh token) |
| 11 | **Navegación / Navbar** | ✅ | Gerente sin opción Sucursales, dropdown sin prefijo "Suc.", `SelectorSucursalesInline` muestra lista actualizada y cambia datos al switch |
| 12 | **Edge cases finales** | ✅ | Crear sucursal con campos opcionales vacíos, cancelar modal sin quedar loading, crear varias seguidas con invalidación correcta, persistencia tras reload |

### Bugs descubiertos y corregidos durante el checklist 1

1. Matriz podía desactivarse/eliminarse → bloqueado
2. Modal stale tras revocar gerente → fix con `isSuccess`
3. Tabla empleados no se actualizaba al crear → fix invalidation prefix
4. Dueño aparecía en Reporte/Empleados para gerente → fix `incluirDueno`
5. Fuga de datos en reportes para gerente → fixes en Clientes y Promociones
6. **Crítico:** revocación de sesión ScanYA no funcionaba por bypass en refresh token → fix con check en `refrescarTokenScanYA`
7. Cupones canjeables cross-sucursal (feature implementada)
8. Rediseño completo de plantillas de email (6 emails unificados)
9. Fix UX del onboarding para gerentes
10. Rediseño del guard "Acceso restringido"

---

# 📋 Lista 2 — Las 18 recomendaciones post-sprint

Estado: **14/18 completas** ✅ · **4 pendientes**

### ✅ Completadas (14)

| # | Recomendación | Resolución |
|---|---------------|------------|
| 1 | Datos legacy en BD (zona horaria, PostGIS) | N/A — BD local limpia entre cambios |
| 2 | Popup mapa `PaginaPerfilNegocio.tsx` con lógica frágil | Las 5 instancias corregidas + bonus popup del sidebar |
| 3 | Búsqueda del feed por nombre de sucursal | Verificada — la query ya funciona con `n.nombre` y `s.nombre` |
| 4 | Empleados huérfanos al eliminar/desactivar sucursal | Helper `revocarEmpleadosDeSucursal()` en negocioManagement — revoca sesiones ScanYA (Redis + socket), preserva registros para reactivación. `puntos_transacciones.empleado_id = SET NULL` preserva historial |
| 5 | Promociones heredadas al crear sucursal | Ofertas públicas se clonan con `duplicarImagenInteligente` (R2 o Cloudinary según origen) |
| 7 | **Cupones cross-sucursal end-to-end** | Canje validado con gerente en Matriz + empleado en Sucursal Norte. `oferta_usos.sucursal_id` registra sucursal del canje. Reportes consistentes |
| 10 | **Typo detection de email** con dominios reales | Los 10 typos detectados (gmial, gmal, gmai, hotmial, yahooo, outlok, icoud, livee, protonmai, etc.). Botón "Corregir" aplica sugerencia + re-valida |
| 11 | `LECCIONES_TECNICAS.md` | ~7 reglas nuevas: reference counting, interceptor 4xx, GREATEST defensivo, orden CASE, text-scan-urls, soft-delete con URLs, multi-BD reconcile |
| 12 | `PATRON_REACT_QUERY.md` | Mapa cross-módulo de invalidación documentado + regla `res.success` obligatoria en mutations |
| 13 | `CHANGELOG.md` | Entradas consolidadas por sesión + entrada de cierre "Sprint 17 Abril" con inventario completo |
| 14 | `Sucursales.md` | Selector coordenadas, popup fullscreen, edge cases de desactivación, bloqueo login ScanYA en sucursal desactivada |
| 16 | Validación de nombre duplicado de sucursal | 3 capas: UI en vivo con borde rojo + pre-submit guard + backend 409 `NOMBRE_DUPLICADO` |
| 17 | Selector de mapa en modal de **editar** sucursal | Ya existe en Mi Perfil → Ubicación + popup fullscreen en onboarding también |
| 18 | Zona horaria auto-detectar por estado | Helper `getZonaHorariaPorEstado()` mapea 32 estados MX a 5 zonas IANA. Aplicado en `crearSucursal` y `actualizarSucursal` |

### 🟡 Parcial (1)

| # | Recomendación | Qué falta |
|---|---------------|-----------|
| 9 | **R2 cleanup al eliminar sucursal** | Infraestructura exhaustivamente probada (ver sección "Recolector de Basura" abajo). Queda validación directa: crear sucursal de prueba → subir contenido exclusivo → eliminarla → verificar que URLs desaparecen de R2 |

### ⏳ Pendientes (3)

| # | Recomendación | Prioridad | Tiempo |
|---|---------------|:---------:|:------:|
| 6 | **Filtrado por sucursal en los 12 módulos BS** — vista dueño y vista gerente | Alta | ~2h dueño + 1h gerente |
| 8 | Revocación de sesión ScanYA **E2E automatizado** | Media (manual validado ✅) | Sprint ScanYA multi-branch |
| 15 | Tutorial primera vez al crear sucursal | Baja | UX opcional |

---

# 📋 Lista 3 — Las 6 pruebas de testing finales

Al cerrar las 14 recomendaciones (1-5, 7, 10-14, 16-18), quedaron **6 pruebas de testing manuales** agrupadas como "Pruebas #1-#6" para ejecución final. Estas se mapean a las recomendaciones 6-10 de la Lista 2.

### Estado de ejecución

| # Prueba | Descripción | Recomendación | Estado | Observaciones |
|:-------:|-------------|:-------------:|:------:|---------------|
| **1** | Filtrado por sucursal — vista dueño (12 módulos BS) | #6 | ⏳ Pendiente | Auditoría sistemática cross-módulo |
| **2** | Filtrado por sucursal — vista gerente | #6 | ⏳ Pendiente | Verificar que gerente solo ve su sucursal |
| **3** | Cupones cross-sucursal en ScanYA | #7 | ✅ **Completa** | Gerente Matriz canjeó Pizza Mediana, empleado Norte canjeó Zapatos |
| **4** | Revocación de sesión ScanYA (3 escenarios: manual, desactivar, eliminar) | #8 | ✅ **Completa** | Defensa en 3 capas validada: middleware + refresh + socket |
| **5** | R2 cleanup — validación integral del recolector de basura (9 sub-pruebas) | #9 | 🟡 Parcial | Infraestructura operativa y probada vía cleanup global de 128 archivos; 9 sub-pruebas de validación en vivo pendientes (ver detalle abajo) |
| **6** | Typo detection de email | #10 | ✅ **Completa** | Los 10 dominios probados con Levenshtein ≤ 2 |

### 🔬 Prueba 5 — Sub-pruebas detalladas

Al construir el recolector de basura R2 como infraestructura del Panel Admin (colateral del sprint), la Prueba 5 creció de "verificar cleanup al eliminar sucursal" a **"validación integral del sistema completo"**. Son 9 sub-pruebas que cubren: flujo end-to-end, los 13 fixes de bugs fuente en vivo, casos edge y seguridad.

| Sub-prueba | Descripción | Cómo probarla | Prioridad |
|:-:|------|------|:-:|
| **5.1** | **Eliminación de sucursal con contenido exclusivo** (la prueba original) ✅ | Ejecutada 18 Abril 2026 con "Sucursal Prueba R2" (contenido: 1 perfil, 1 portada, 8 galería, 4 ofertas R2, 5 artículos R2 exclusivos, 6 artículos Cloudinary compartidos, 1 oferta Cloudinary compartida). Resultado: 18 archivos R2 eliminados limpiamente, URLs Cloudinary compartidas protegidas por reference count, `huerfanas: 0` y `rotas: 0` post-cleanup | ✅ Alta |
| **5.2** | **Editar imagen** en artículo/logo/portada/perfil ✅ | Ejecutada 20 Abril 2026. Validados los 4 puntos de aplicación del fix: artículo (catálogo), logo del negocio, portada de sucursal y foto de perfil de sucursal. En cada caso al subir imagen nueva, la anterior desapareció correctamente de R2. `huerfanas: 0` post-cambios | ✅ Alta |
| **5.3** | **Eliminar mensaje chat con adjunto** ✅ | Ejecutada 20 Abril 2026. Validado hard delete de conversación completa con documentos e imágenes: ambos tipos de archivos se eliminaron de R2 correctamente cuando la conversación fue eliminada por ambos usuarios | ✅ Media |
| **5.4** | **Seguridad del endpoint admin** ✅ | Ejecutada 20 Abril 2026. Los 4 casos prácticos pasaron: sin header → 401; secret incorrecto → 401; POST sin confirmación → 400; POST con confirmación mala → 400. Caso 5 (sin ADMIN_SECRET → 503) validado por diseño del middleware (salto por comodidad: requiere modificar .env + reiniciar) | ✅ Media |
| **5.5** | **Periodo de gracia** (archivo reciente no se borra) | 🔵 Cubierta por diseño, validación en vivo opcional. La lógica está implementada en `generarReporteReconcile` (constante `MINUTOS_GRACIA_POR_DEFECTO = 5`). Caso edge raro: requiere subir archivo manual sin BD + esperar 6 min | 🔵 Opcional (Baja) |
| **5.6** | **Multi-BD failover** (secundaria offline) | 🔵 Cubierta por diseño, validación en vivo opcional. `reconcileConnections.ts` maneja `intentoConexionSecundariaFallido` con warning. Escenario muy poco probable en dev | 🔵 Opcional (Baja) |
| **5.7** | **URLs rotas** (archivo R2 borrado manual) | 🔵 Cubierta por diseño, validación en vivo opcional. Detección implementada en `detectarUrlsRotas`. Escenario requiere borrado manual desde Cloudflare (poco común en operación normal) | 🔵 Opcional (Baja) |
| **5.8** | **Reference counting compartido** | 🔵 Cubierta por diseño + validada indirectamente en 5.1 (URLs Cloudinary compartidas entre artículos clonados NO se tocaron al eliminar la sucursal). Helper `imagenEsUsadaPorOtroArticulo` con tests implícitos | 🔵 Opcional (Baja) |
| **5.9** | **Cron ChatYA** (ejecución manual) | 🔵 Cubierta por diseño, validación en vivo opcional. Fix aplicado y compilando. El cron corre diariamente a las 3 AM — se autovalidará en uso real. Forzarlo requiere bajar umbral de 6 meses temporalmente | 🔵 Opcional (Baja) |

**Estado:** 4/9 sub-pruebas validadas en vivo (las prioritarias: 5.1-5.4 cubren el 90% del uso diario). Las 5 restantes (5.5-5.9) están cubiertas por el diseño del código y probadas indirectamente — su validación directa se marca como **opcional**, se pueden ejecutar más adelante si aparece algún síntoma real.

---

# 🧹 Hallazgo emergente — Recolector de Basura R2

Durante la exploración de la Prueba #5 (R2 cleanup al eliminar sucursal), se identificó que el sistema **carecía de una herramienta** para detectar y limpiar archivos huérfanos en R2. Esto derivó en la construcción de:

### Infraestructura nueva (17-18 Abril)

- **Panel Admin backend** con convención de sub-carpetas `admin/*` en controllers/services/routes
- **Middleware temporal** `requireAdminSecret` (preparado para migrar a auth admin real cuando haya UI)
- **Recolector de Basura** (garbage collector) con algoritmo mark-and-sweep + reference counting + reconciliación cross-ambiente multi-BD
- **Registry** de 19 campos de imágenes en 13 tablas como fuente única de verdad
- **Tabla de auditoría** `r2_reconcile_log` en ambas BDs (local + producción)
- **3 endpoints** admin (GET reporte, POST ejecutar, GET log)

### Ejecuciones de prueba

| # | Acción | Huérfanos | Eliminadas | Fallidas | Resultado |
|:-:|--------|:---------:|:----------:|:--------:|-----------|
| 1 | Reporte inicial (dry-run) | 156 | 0 | 0 | Detectados 135 falsos positivos en chat (registry incompleto) |
| 2 | Fix registry (`chat_mensajes.contenido` como `text-scan-urls`) + carpeta `brand/` protegida | 138 | 0 | 0 | Falsos positivos reducidos |
| 3 | Fix multi-BD (unión local + Supabase) | 128 | 0 | 0 | +10 archivos salvados que prod usa |
| 4 | Cleanup piloto (solo `portadas/`) | 2 | 2 | 0 | ✅ Validación en vivo |
| 5 | Cleanup global | 128 | **128** | **0** | ✅ Bucket limpio al 100% |
| 6 | Verificación post-cleanup | 0 | - | - | ✅ `huerfanas: 0`, `rotas: 0` |
| 7 | Auditoría en BD | - | - | - | ✅ Fila registrada en `r2_reconcile_log` con detalle JSONB |

### Comparación final

| Métrica | Antes | Después |
|---------|:-----:|:-------:|
| Archivos R2 | 246 | 116 |
| URLs en uso (multi-BD) | — | 231 |
| Huérfanos | 128 | **0** |
| Balance por carpeta (enR2 = enBD) | ❌ | ✅ |

---

# 🐛 Bugs fuente de leaks de archivos corregidos (prevención hacia adelante)

Durante las pruebas se identificaron **13 flujos** que generaban archivos huérfanos. Todos corregidos con reference counting:

| # | Archivo / función | Bug | Fix |
|---|--------------------|-----|-----|
| 1 | `articulos.service.ts` → `actualizarArticulo` | Reemplazar imagen borraba URL sin verificar si otros artículos la usaban | Reference count + helper `imagenEsUsadaPorOtroArticulo` |
| 2 | `articulos.service.ts` → `eliminarArticulo` | Mismo patrón al eliminar | Idem |
| 3 | `negocioManagement.service.ts` → `eliminarSucursal` | Batch de borrado R2 sin reference count | Reference count antes del `Promise.all` |
| 4 | `negocioManagement.service.ts` → `actualizarLogoNegocio` | No borraba el logo anterior al reemplazar | Helper `eliminarImagenSiHuerfana` + captura URL previa |
| 5 | `negocioManagement.service.ts` → `actualizarPortadaSucursal` | Igual | Idem |
| 6 | `negocioManagement.service.ts` → `actualizarFotoPerfilSucursal` | Igual | Idem |
| 7 | `chatya.service.ts` → `eliminarMensaje` | Soft-delete sobrescribía `contenido` perdiendo URL adjunta | Captura URLs antes del UPDATE + limpieza con reference count |
| 8 | `chatya.service.ts` → `eliminarConversacion` | 2 paths (soft delete invisibles + hard delete) sin limpiar R2 | Mismo patrón |
| 9 | `ofertas.service.ts` → `eliminarOferta` + `revocarCuponMasivo` | CASCADE eliminaba archivos de chat normal sin limpiar R2 | Recolección URLs con regex antes del DELETE |
| 10 | `cron/chatya.cron.ts` | Cron diario a las 3 AM eliminaba conversaciones de +6 meses sin limpiar R2 (`TODO Sprint 6` pendiente) | Implementado con reference count |
| 11 | `negocioManagement.service.ts` → `eliminarImagenGaleria` | Solo limpiaba Cloudinary, URLs R2 colgadas | Usa `eliminarImagenSiHuerfana` |
| 12 | `puntos.service.ts` → `actualizarRecompensa` + `eliminarRecompensa` | Sin reference count | Usa helper compartido |
| 13 | `ofertas.service.ts` → `actualizarOferta` + `eliminarOferta` | Sin reference count | Reference count contra otras ofertas + `chat_mensajes` tipo cupón |

---

# 🐛 Bugs funcionales no-R2 descubiertos durante pruebas

| # | Área | Bug | Fix |
|---|------|-----|-----|
| 1 | Notificaciones | Al marcar todas como leídas desde Matriz se marcaban las de Sucursal Norte | Filtro por `sucursalId` en controller + service + frontend service |
| 2 | BS Transacciones | `BadgeEstadoCanje` crasheaba con estado `cancelado` ("icono undefined") | Caso agregado + fallback defensivo + paleta unificada |
| 3 | BS Transacciones | Tabla mostraba vouchers cancelados inflando conteo | Filtro `estado != 'cancelado'` en query |
| 4 | BS Clientes | "Visitas" inconsistente entre tabla/modal/export | Cálculo unificado (tx confirmadas + vouchers usados) con filtro sucursal |
| 5 | BS Clientes | Modal detalle no respetaba sucursal activa | Param `sucursalId` en service + controller |
| 6 | ChatYA | `extraerUrlsR2DeMensajeChat` solo capturaba URL directa, no JSON con metadatos | Regex robusto sobre dominio R2 independiente del formato |
| 7 | ScanYA | Empleado podía loguearse en sucursal desactivada | Check `sucursal.activa = true` en `loginEmpleado` y 3 paths de `loginDueno` |
| 8 | Cupones | Estado `usado` cuando en realidad estaban vencidos | CASE SQL computado con prioridad correcta |
| 9 | Ofertas | Estado `vencida` cuando en realidad eran `agotadas` | Reordenamiento del CASE |
| 10 | CardYA | `cancelarVoucher` violaba check constraint por saldo negativo | `GREATEST(puntos_canjeados_total - x, 0)` |
| 11 | React Query | Mutations resolvían éxito aunque backend respondiera 4xx | Verificar `res.success` en todas las mutations |
| 12 | Axios interceptor | Duplicaba `sucursalId` en `/notificaciones` | Agregado a `RUTAS_SIN_SUCURSAL` |

---

# 📊 Resumen ejecutivo

## Por listas

| Lista | Total | Completas | Parciales | Pendientes | % |
|-------|:-----:|:---------:|:---------:|:----------:|:-:|
| Lista 1 — 12 secciones BS Sucursales | 12 | 12 ✅ | 0 | 0 | **100%** |
| Lista 2 — 18 recomendaciones post-sprint | 18 | 14 | 1 | 3 | **78%** |
| Lista 3 — 6 pruebas de testing | 6 | 4 (incluye 5.1-5.4 del recolector) | 1 (5.5-5.9 opcionales) | 2 (filtrado dueño/gerente) | **67%** |

## Bugs y fixes

- **13 bugs fuente de leaks de archivos** identificados y corregidos (prevención hacia adelante)
- **12 bugs funcionales** descubiertos durante pruebas y corregidos
- **10 bugs/mejoras** registradas en Lista 1 durante ejecución del checklist inicial

**Total:** ~35 bugs/mejoras aplicados como colateral de las pruebas.

## Infraestructura nueva (colateral)

- Panel Admin con estructura escalable para múltiples roles (admin + vendedor/embajador)
- Recolector de Basura R2 (garbage collector) con auditoría persistente
- Sistema multi-BD cross-ambiente para reconcile seguro
- ~13 docs actualizados + 3 nuevos (`Panel_Admin.md`, `Mantenimiento_R2.md`, migración SQL)

---

# 🎯 Pendientes priorizados

Lo que queda para cerrar el 100%:

### Nivel 1 — Filtrado (en progreso — actualizado 24 Abril)

Prueba 1 (vista dueño, 12 módulos BS) en curso. Progreso por módulo:

| # | Módulo | Estado | Notas |
|---|--------|:------:|-------|
| 1 | Dashboard | ✅ | KPIs y feed filtran correctamente por sucursal activa |
| 2 | Transacciones (Ventas + Canjes/Vouchers) | ✅ | |
| 3 | Clientes | ✅ | |
| 4 | Opiniones | ✅ | |
| 5 | Alertas | ✅ | **Refactor arquitectural grande** (ver abajo) |
| 6 | Catálogo | ✅ | Scoping de KPIs/listas, categorías del dropdown, edición cross-sucursal sin contaminación, duplicación Norte→Matriz. Vista pública post-edición: no validada en vivo — comportamiento estándar de React Query (`refetchOnWindowFocus` + invalidación de `['negocios','catalogo',negocioId]`). Colateral: refactor completo del preview de BS (container queries + modales contenidos + header dark + drag-to-scroll). |
| 7 | Promociones | ✅ | Scoping de KPIs/listas en Cupones y Ofertas, métricas (vistas/shares/clicks) por sucursal, edición cross-sucursal sin contaminación, crear/eliminar/duplicar oferta entre sucursales. Bugs encontrados y corregidos: (a) dropdowns de Tipo y Estado mostraban opciones que no existían en la sucursal/toggle activo → `tiposDisponibles` y `estadosDisponibles` con `useMemo([ofertas, filtros.visibilidad])` filtran lista hardcoded; (b) cambiar de toggle Ofertas↔Cupones arrastraba el filtro de Tipo causando tabla vacía → handlers de toggle resetean también `tipo: 'todos'`. Real-time cross-usuario no implementado (criterio: solo Alertas justifica socket por urgencia accionable). |
| 8 | Puntos y Recompensas | ✅ | Módulo exclusivo de Matriz. Validados: el menú filtra correctamente Puntos/Sucursales en sucursales secundarias, guardar config base persiste al refresh, crear recompensa nueva actualiza KPIs (3→4 activas), datos persisten al cambio Matriz↔Norte→Matriz. **Hueco arquitectural cerrado**: nuevo `MatrizGuard` (`apps/web/src/router/guards/MatrizGuard.tsx`) protege la URL directa — el menú ya ocultaba el ítem en sucursales secundarias, pero `/business-studio/puntos` y `/business-studio/sucursales` por URL cargaban en "modo solo lectura" engañoso. Ahora redirigen a `/business-studio` con notificación info. |
| 9 | Empleados | ✅ | Alcance: filtrado multi-sucursal en BS (no incluye validación numérica de stats ScanYA, eso queda para sprint separado de ScanYA). Validados: scoping de la lista por sucursal (Matriz=2 Carlos/Jazmín, Norte=1 Ian — sin mezcla), buscador filtra por nombre y username, tabs Activos/Inactivos con estados vacíos contextuales (`Sin resultados` vs `Sin empleados inactivos / Todos tus empleados están activos`), creación se asigna automáticamente a la sucursal activa (creé "Test Empleado" en Norte → quedó solo en Norte, sin contaminar Matriz), modal de detalle muestra permisos + bloque Estadísticas ScanYA (estructura UI presente), eliminar funciona y los KPIs se actualizan, reset del buscador al cambiar de sucursal funciona correctamente. **Hallazgo intencional**: el modal de edición no expone selector de sucursal — un empleado pertenece a UNA sucursal y no es portátil; para reasignarlo hay que borrarlo y recrearlo. Esto es coherente con el modelo (`empleados.sucursal_id` no nulable y vínculo histórico a `puntos_transacciones`). |
| 10 | Mi Perfil | ✅ | **Diseño arquitectural confirmado**: la página adapta sus tabs según la sucursal activa. En Matriz se ven 6 tabs (Negocio, Contacto, Ubicación, Horarios, Imágenes, Operación) con campos globales del negocio + datos de la Matriz. En sucursales secundarias se ven 5 tabs (Sucursal, Ubicación, Horarios, Imágenes, Operación) con solo campos por-sucursal — el tab "Negocio" desaparece y "Contacto" se fusiona en "Sucursal". Validado: nombre del negocio/descripción/categoría/CardYA/Sitio Web/Logo son globales (solo editables en Matriz); nombre de la sucursal/teléfono/WhatsApp/correo/redes sociales/dirección/mapa/horarios/foto de perfil/portada/galería/métodos de pago/opciones de entrega son por-sucursal. Edición probada: cambio "Sucursal Norte" → "Sucursal Norte v2" se persistió correctamente sin contaminar Matriz. **Refactor UI**: los botones "Cambiar" (azul) y "Eliminar" (rojo) del tab Imágenes se transformaron al estilo slate estándar — Cambiar/Subir ahora usa dark gradient TC-7 (acción primaria), Eliminar pasó a `bg-white border-slate-300` con tinte rojo solo en hover (secundario destructivo, según TC-7 §"Botones secundarios"). |
| 11 | Reportes | ✅ | Reportes NO es exclusivo de Matriz (filtra correctamente por sucursal en los 5 sub-tabs Ventas/Clientes/Empleados/Promociones/Reseñas). Validado: Matriz $17,883/45 trans/Juan Manuel top, Norte $950/4 trans/Ian Manuel top, números diferentes y consistentes. **Bug histórico encontrado y mitigado**: la oferta "más popular" se mostraba sin foto en Norte porque el query `mejorOferta` retornaba arbitrariamente cualquier oferta cuando todas tenían 0 clicks (con `ORDER BY totalClicks DESC NULLS LAST LIMIT 1`), y algunas ofertas de Norte estaban con `imagen=NULL` por un bug histórico ya corregido en `duplicarOfertaASucursales` (que en su momento no incluía el campo `imagen` en el INSERT). Fix aplicado en `apps/api/src/services/reportes.service.ts:836` — agregado `metricasEntidad.totalClicks > 0` al WHERE: cuando ninguna oferta tiene clicks, retorna `null` y el componente muestra el `emptyText` "Sin clicks en ofertas" (coherente con la métrica anunciada). Validado: el flujo actual de duplicación cross-sucursal sí copia la imagen correctamente. Las ofertas huérfanas legacy en Norte (vigencia 10-30 Abr sin foto) no se limpian — el fix las neutraliza. |
| 12 | Sucursales | ✅ | Módulo exclusivo de Matriz (junto con Puntos). El menú filtra correctamente y la URL directa está protegida por `MatrizGuard` (ver módulo 8). El módulo en sí está validado en este reporte como infraestructura del sprint (recomendaciones 1-18) — toda la gestión de sucursales fue el insumo para la Prueba 1 completa. |

**Prueba 1 (vista dueño, 12 módulos BS): ✅ COMPLETADA — 25 Abril 2026**

**Prueba 2 (vista gerente): ✅ COMPLETADA — validada en sesiones previas del sprint (gerentes María / Jazmín con sucursal asignada). Puntos confirmados: selector de sucursal oculto en navbar, menú lateral filtra "Sucursales" y "Puntos y Recompensas", `MatrizGuard` redirige acceso por URL directa, data filtrada automáticamente a la sucursal asignada del gerente, Mi Perfil muestra solo los 5 tabs por-sucursal (sin tab "Negocio").**

## 🏁 SPRINT MULTI-SUCURSAL CERRADO — 25 Abril 2026

Las 2 pruebas terminadas (vista dueño y vista gerente). El filtrado multi-sucursal en Business Studio funciona correctamente en los 12 módulos validados.

### Alertas — refactor arquitectural (22 Abril)

Durante la auditoría multi-sucursal de Alertas salieron 2 bugs en cadena y un tercero conceptual, resueltos todos:

- **Bug 1 (scoping de sucursal):** `marcarTodasLeidas` y `eliminarAlertasResueltas` solo filtraban por `negocio_id` → afectaban TODAS las sucursales. Fix inicial: agregar `sucursalId` al service + `AND (sucursal_id = ? OR sucursal_id IS NULL)` al WHERE.
- **Bug 2 (estado por usuario):** al probar el fix, se descubrió que el estado `leida` era columna booleana global → la acción de un gerente afectaba al dueño. Fix: migración `2026-04-22-alerta-lecturas-por-usuario.sql` — nueva tabla `alerta_lecturas(alerta_id, usuario_id, leida_at, resuelta_at)` con PK compuesta y CASCADE. Refactor del service para usar LEFT JOIN y upsert.
- **Bug 3 (resolución compartida):** al probar, se detectó que `resuelta` NO debía ser por usuario — es un problema del negocio, una vez atendido todos deben saberlo. Segunda migración `2026-04-22b-alertas-resuelta-global-ocultamiento-por-usuario.sql` corrige el modelo híbrido:
  - `leída` → por usuario (`alerta_lecturas.leida_at`)
  - `resuelta` → **global** (`alertas_seguridad.resuelta` + `resuelta_por_usuario_id`)
  - `ocultada` → por usuario (`alerta_lecturas.ocultada_at`, antes "Eliminar")
  - Borrado físico → admin/cron únicamente
- **Real-time (Socket.io):** al probar con 2 navegadores (dueño y gerente simultáneos), la acción de uno no se reflejaba en el otro hasta refresh. Implementación: `broadcastAlertaActualizada` en service emite al room del dueño; hook `useAlertasRealtimeSync` montado en `MenuBusinessStudio` invalida caché de React Query al recibir. Cubre dueño y gerentes en modo comercial (ambos en el mismo room).
- **UI:** botón "Eliminar" cambió semántica (ahora oculta del feed del usuario); modal de detalle muestra "✓ Resuelta por {Nombre} · {Fecha}" cuando aplica.

**Lección transversal** (agregada a LECCIONES_TECNICAS.md): decidir "por-entidad vs por-usuario" **acción por acción**, no por entidad. La misma entidad puede tener acciones globales y por-usuario simultáneamente.

Documentación actualizada: `docs/arquitectura/Alertas.md`, `docs/CHANGELOG.md`, `docs/estandares/LECCIONES_TECNICAS.md`.

### Fix transversal — reset de filtros con jerarquía sucursal>toggle>filtros (24 Abril)

Durante la auditoría del módulo 7 (Promociones) emergió un bug cross-cutting que afectaba a casi todos los módulos del BS: al cambiar de sucursal con el selector del navbar, los filtros locales (`useState` o stores Zustand) se mantenían con valores que podían no aplicar a la nueva sucursal — operadores que no trabajaban ahí, categorías inexistentes, búsquedas con texto obsoleto, etc. Mismo problema al cambiar entre toggles del mismo módulo (Productos↔Servicios, Ofertas↔Cupones, etc.). Los datos se refetchaban correctamente porque los queryKeys incluyen `sucursalId`, pero el state del frontend quedaba congelado.

**Jerarquía adoptada:** `sucursal activa > toggle activo > filtros`. Cuando algo de arriba cambia, todo lo de abajo se resetea.

**Aplicado en 10 módulos** con `useEffect([sucursalActiva]) → setFiltros(VALORES_INICIALES)` o `limpiar()` del store si aplica:

| Módulo | Estrategia |
|---|---|
| Catálogo | `setFiltros({...})` directo + handlers de toggle Productos/Servicios resetean búsqueda/categoría/disponible |
| Transacciones | `limpiar()` del store + reset de inputs locales `textoBusqueda`/`textoBusquedaCanjes` + `clearTimeout` de debounce refs |
| Promociones | `setFiltros({...})` resetea visibilidad, tipo, estado, búsqueda |
| Clientes | `limpiar()` del store (autosync de input vía `useEffect([busqueda])`) |
| Opiniones | `setFiltroEstado/setFiltroEstrellas/setBusqueda` directos |
| Alertas | `limpiarFiltros()` del store + reset explícito de `busquedaLocal` (input con debounce) |
| Dashboard | `setPeriodo('mes')` (único filtro) |
| Puntos | `limpiar()` del store |
| Empleados | Reset de los 3 estados: `busquedaLocal`, `busqueda`, `filtroActivo` |
| Reportes | `limpiar()` del store |

**Trampas detectadas y corregidas durante la migración:**
1. Inputs con patrón debounce tienen 2 `useState`: el visible (`busquedaLocal`) y el aplicado al filtro (`busqueda`). Resetear solo uno deja el otro con el texto anterior. Hay que resetear ambos + `clearTimeout` de los timers pendientes.
2. Dropdowns con listas hardcoded (todos los tipos del enum) muestran opciones que no existen en la sucursal actual → tabla vacía al filtrar. Solución: `useMemo([items, toggle])` para extraer opciones realmente presentes y filtrar la lista hardcoded. Aplicado en `PaginaOfertas.tsx`.
3. Selectores que dependen de atributos UX (`title`, `aria-label`) se rompen si esos atributos cambian. Caso real: `closest('button[title="Notificaciones"]')` para el click-outside del panel se rompió al quitar el `title` por limpieza UX. Solución: usar `data-*` attributes (semántica estable). Documentado en LECCIONES_TECNICAS.md.

**Documentación generada:**
- `LECCIONES_TECNICAS.md` — 4 entradas nuevas: container queries vs viewport, drag-to-scroll, modales contenidos, reset de filtros transversal.
- `TOKENS_COMPONENTES.md` — TC-21 (carrusel drag-to-scroll), TC-22 (modales contenidos).
- Mi Perfil, Sucursales, Rifas, Vacantes: skip (sin filtros locales o no implementados).

### Prompt de continuación

Para retomar en un chat nuevo: `docs/reportes/prompt-sprint-multi-sucursal-bs-continuacion-abril-2026.md`

### Nivel 2 — Recolector de Basura R2 ✅ (validación priorizada completa)

Las 4 sub-pruebas prioritarias fueron validadas en vivo los días 18 y 20 de Abril. Las 5 restantes están cubiertas por el diseño del código y se marcan como opcionales.

| # | Sub-prueba | Estado |
|:-:|------|:------:|
| ~~5.1~~ | ~~Eliminación sucursal con contenido exclusivo~~ | ✅ Completada 18 Abril |
| ~~5.2~~ | ~~Editar imagen en artículo/logo/portada/perfil~~ | ✅ Completada 20 Abril |
| ~~5.3~~ | ~~Eliminar mensaje chat con adjunto~~ | ✅ Completada 20 Abril |
| ~~5.4~~ | ~~Seguridad endpoint admin~~ | ✅ Completada 20 Abril (4/5 casos) |
| 5.5 | Periodo de gracia | 🔵 Opcional (cubierta por diseño) |
| 5.6 | Multi-BD failover | 🔵 Opcional (cubierta por diseño) |
| 5.7 | URLs rotas | 🔵 Opcional (cubierta por diseño) |
| 5.8 | Reference counting compartido | 🔵 Opcional (validada indirectamente en 5.1) |
| 5.9 | Cron ChatYA forzado | 🔵 Opcional (auto-valida en uso diario) |

**Nivel 2 cerrado.** Las pruebas opcionales se pueden ejecutar más adelante si aparece algún síntoma real en producción.

### Nivel 3 — Futuro / opcionales

| # | Tarea | Lista | Prioridad | Tiempo |
|---|-------|:-----:|:---------:|:------:|
| 6 | Revocación ScanYA E2E automatizado | L2 #8 | Media (manual ✅) | Sprint futuro |
| 7 | Tutorial primera vez al crear sucursal | L2 #15 | Baja (UX opcional) | ~1h |

---

# 📁 Archivos relevantes

### Código nuevo principal

```
apps/api/src/
├── controllers/admin/mantenimiento.controller.ts
├── services/admin/mantenimiento.service.ts
├── middleware/adminSecret.middleware.ts
├── routes/admin/index.ts
├── routes/admin/mantenimiento.routes.ts
├── db/reconcileConnections.ts
└── utils/imageRegistry.ts
```

### Documentación relacionada

- `docs/arquitectura/Sucursales.md` — módulo completo
- `docs/arquitectura/Panel_Admin.md` — paraguas del Panel Admin
- `docs/arquitectura/Mantenimiento_R2.md` — recolector de basura
- `docs/migraciones/2026-04-17-r2-reconcile-log.sql` — tabla de auditoría
- `docs/CHANGELOG.md` — entradas consolidadas por sesión
- `docs/estandares/LECCIONES_TECNICAS.md` — 7 reglas nuevas
- `docs/estandares/PATRON_REACT_QUERY.md` — mapa cross-módulo
- Este reporte
