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
| **5.2** | **Editar imagen** en artículo/logo/portada/perfil | En cada uno: subir imagen nueva → verificar que la anterior desaparece de R2 con reference count correcto | Alta |
| **5.3** | **Eliminar mensaje chat con adjunto** | Enviar imagen/audio/documento en chat → eliminar el mensaje → verificar que el archivo R2 se borra (y socket propaga eliminación al frontend) | Media |
| **5.4** | **Seguridad del endpoint admin** (5 casos) | Request sin `x-admin-secret` → 401; con secret incorrecto → 401; sin `ADMIN_SECRET` en env → 503; POST sin `confirmacion` → 400; POST con valor distinto a `SI_BORRAR_HUERFANAS` → 400 | Media |
| **5.5** | **Periodo de gracia** (archivo reciente no se borra) | Subir archivo a R2 manualmente sin referenciar en BD → correr reconcile dentro de los primeros 5 min → debe aparecer en `ignoradasPorGracia`, NO en `huerfanas`. Tras 5 min, nueva ejecución lo marca como huérfano | Media |
| **5.6** | **Multi-BD failover** (secundaria offline) | Simular Supabase inaccesible (apagar VPN o cambiar `DATABASE_URL_PRODUCTION` a URL inválida temporalmente) → reconcile debe continuar solo con BD principal sin crashear, con warning en consola | Baja |
| **5.7** | **URLs rotas** (archivo R2 borrado manual) | Borrar un archivo directamente desde Cloudflare R2 cuya URL sigue referenciada en BD → correr reconcile → debe aparecer en `rotas` con `ubicacion: "tabla.columna"` (o `ambiente:tabla.columna` con multi-BD) | Baja |
| **5.8** | **Reference counting compartido** | Forzar escenario: 2 artículos con misma URL (ej. clonado de Matriz con fallback Cloudinary) → eliminar uno → la imagen NO se borra de R2 (log: "Imagen conservada, usada por N artículo/s"). Eliminar el segundo → ahora sí se borra | Baja |
| **5.9** | **Cron ChatYA** (ejecución manual) | Forzar la ejecución del cron `limpiarConversacionesInactivas` (temporalmente bajar el umbral de 6 meses a segundos o correr la función directo desde un script) → verificar que elimina conversaciones Y limpia sus archivos R2 | Baja |

**Total estimado:** ~90 min para ejecutar las 9 sub-pruebas (la 5.1 ~15 min, las 5.2-5.3 ~30 min, las demás 45 min).

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
| Lista 3 — 6 pruebas de testing | 6 | 3 | 1 (con 9 sub-pruebas) | 2 | **50%** |

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

### Nivel 1 — Filtrado (testing de alto impacto)

| # | Prueba | Lista | Prioridad | Tiempo |
|---|--------|:-----:|:---------:|:------:|
| 1 | Prueba 1 — Filtrado por sucursal vista dueño (12 módulos BS) | L3 #1, L2 #6 | Alta | ~2h |
| 2 | Prueba 2 — Filtrado por sucursal vista gerente | L3 #2, L2 #6 | Alta | ~1h |

### Nivel 2 — Recolector de Basura R2 (9 sub-pruebas)

| # | Sub-prueba | Prioridad | Tiempo |
|:-:|------|:---------:|:------:|
| ~~5.1~~ | ~~Eliminación sucursal con contenido exclusivo (prueba original)~~ — ✅ **Completada 18 Abril 2026** | — | — |
| 5.2 | Editar imagen en artículo/logo/portada/perfil → anterior se borra | Alta | ~15 min |
| 5.3 | Eliminar mensaje chat con adjunto → archivo R2 se borra | Media | ~15 min |
| 5.4 | Seguridad endpoint admin (5 casos: 401/400/503) | Media | ~10 min |
| 5.5 | Periodo de gracia (archivo reciente no se borra) | Media | ~10 min |
| 5.6 | Multi-BD failover (secundaria offline) | Baja | ~10 min |
| 5.7 | URLs rotas (archivo R2 borrado manual) | Baja | ~5 min |
| 5.8 | Reference counting compartido (2 recursos, 1 URL) | Baja | ~10 min |
| 5.9 | Cron ChatYA forzado manual | Baja | ~15 min |

**Subtotal nivel 2:** ~90 min si se hacen todas.

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
