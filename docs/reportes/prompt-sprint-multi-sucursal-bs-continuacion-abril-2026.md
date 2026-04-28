# Prompt de continuación — Multi-sucursal BS (Abril 2026)

> **🏁 SPRINT CERRADO AL 100% — 25 Abril 2026**
> Prueba 1 (vista dueño, 12 módulos) ✅ + Prueba 2 (vista gerente) ✅.
> Este documento queda como **referencia histórica**. Si surge un sprint
> de auditoría multi-sucursal en el futuro, partir desde aquí.
>
> **Para:** retomar el sprint de pruebas multi-sucursal en un chat nuevo (ya no aplica)
> **Reemplaza a:** `prompt-sprint-filtrado-sucursal-bs.md` (parcialmente cubierto)

---

## Cómo usar

1. Abre un chat nuevo de Claude Code en esta misma carpeta (`E:\AnunciaYA\anunciaya`)
2. Pega el prompt completo de la sección **Prompt** más abajo
3. El asistente te guiará módulo por módulo

---

## Prompt

```
Continuar el sprint de pruebas multi-sucursal en Business Studio.

LEE PRIMERO (no releer todo el código):
- docs/arquitectura/Sucursales.md      → módulo base
- docs/arquitectura/Alertas.md         → modelo de estados híbrido (referencia)
- docs/reportes/sprint-sucursales-pruebas-abril-2026.md → estado del sprint
- CLAUDE.md                            → convenciones del proyecto

CONTEXTO RÁPIDO

AnunciaYA es una super-app de comercio local. Business Studio (BS) es el
panel del comerciante. Un negocio puede tener múltiples sucursales (Matriz +
Sucursal Norte, Sucursal Sur, etc). El dueño cambia entre sucursales con el
selector del navbar; los gerentes tienen sucursal fija (`sucursalAsignada`
en el usuario).

Cada módulo BS debe respetar el scope de sucursal activa:
  • No mezclar datos entre sucursales
  • Filtros, KPIs, listas y mutaciones se ciñen a la activa
  • El interceptor Axios agrega ?sucursalId=... automáticamente en modo comercial
  • Los queryKeys de React Query incluyen sucursalId → cambio de sucursal
    dispara refetch automático

QUÉ VAMOS A HACER

Auditoría multi-sucursal por módulo: activar Matriz, anotar data; cambiar a
Sucursal Norte, verificar que la data cambia correctamente y NO mezcla; si
hay fuga o no-filtrado, parar, investigar, corregir, re-probar.

PROGRESO HASTA HOY (25 Abril 2026)

✅ PRUEBA 1 (vista dueño, 12 módulos BS) — COMPLETADA

Todos los módulos cerrados:
  ✅ 1. Dashboard
  ✅ 2. Transacciones (Ventas + Canjes/Vouchers)
  ✅ 3. Clientes
  ✅ 4. Opiniones
  ✅ 5. Alertas  ← refactor arquitectural grande (22 Abril)
  ✅ 6. Catálogo
  ✅ 7. Promociones (Ofertas + Cupones)
  ✅ 8. Puntos y Recompensas  ← exclusivo de Matriz; nuevo MatrizGuard
  ✅ 9. Empleados
  ✅ 10. Mi Perfil  ← diseño adaptativo (6 tabs en Matriz vs 5 en secundarias)
  ✅ 11. Reportes  ← bug histórico mitigado en query mejorOferta
  ✅ 12. Sucursales  ← exclusivo de Matriz, MatrizGuard

⏳ PRUEBA 2 (vista gerente, ~1h) — pendiente, ÚNICO faltante

  - Logout del dueño, login como gerente (María / Jazmín)
  - Verificar:
    • Selector de sucursal NO aparece en navbar
    • Menú lateral: NO aparecen "Sucursales" ni "Puntos y Recompensas"
    • Data filtrada automáticamente a su sucursal asignada
    • NO puede acceder a URLs de otras sucursales por manipulación
    • NO puede acceder a /business-studio/sucursales ni /business-studio/puntos
      (debería redirigir gracias a MatrizGuard)
    • Mi Perfil: solo ve los 5 tabs por-sucursal, no los globales del negocio
    • Acciones que requieren ser dueño (config de Puntos, modificar
      Categoría del negocio, etc.) están bloqueadas o no aparecen

NOTAS DE LO YA APLICADO TRANSVERSALMENTE (no re-trabajar)

A) Reset de filtros con jerarquía sucursal>toggle>filtros — Ya implementado
   en los 10 módulos con filtros (Catálogo, Transacciones, Promociones,
   Clientes, Opiniones, Alertas, Dashboard, Puntos, Empleados, Reportes).
   Mi Perfil/Sucursales/Rifas/Vacantes no lo necesitan. Si encuentras un
   módulo donde el reset NO funciona, revisa que también se reseteen los
   inputs locales con debounce (busquedaLocal/textoBusqueda separados del
   estado del store). Ver docs/estandares/LECCIONES_TECNICAS.md → "Reset de
   filtros locales al cambiar de sucursal o de toggle/tab".

B) Refactor del preview de BS — Ya completado:
   - Container queries (@container + @5xl:/@[96rem]:) en lugar de viewport
     queries (lg:/2xl:) para PaginaPerfilNegocio, CardNegocio, SeccionCatalogo,
     SeccionOfertas. Ver LECCIONES_TECNICAS.md → "Container queries vs viewport".
   - Modales contenidos al panel del preview vía PortalTargetContext
     (hooks/usePortalTarget). Ver TOKENS_COMPONENTES.md → TC-22.
   - Carruseles drag-to-scroll con cursor grab + fade oscuro vía useDragScroll.
     Ver TOKENS_COMPONENTES.md → TC-21.
   - Header del preview con dark gradient + tabs pill compactos.
   - Botón "Vista previa" con glassmorphism en navbar.

C) Decisión arquitectural sobre Socket.io (no aplicar a más módulos) —
   Solo Alertas, ChatYA y Notificaciones tienen socket porque son los únicos
   módulos donde el desfase causa daño accionable o duplicación de acción.
   Para todo lo demás, refetchOnWindowFocus de React Query + invalidación de
   mutations cubre el 95% real. NO agregar socket en Promociones, Catálogo,
   Clientes, etc. — sería sobre-ingeniería. Ver conversación documentada en
   este reporte si surge la pregunta.

LECCIONES RECIENTES (aplicar a los módulos pendientes)

1) Estado por-usuario vs global — decidir ACCIÓN por acción, no por entidad.
   Ejemplo real: en alertas, `leída` = por usuario; `resuelta` = global;
   `ocultada` = por usuario; `eliminar físico` = admin/cron. Cuando veas un
   módulo con estados booleanos compartidos (p.ej. "leído", "favorito",
   "visto"), revisa si debe ser por-usuario.

2) Acciones masivas que no filtran por sucursal — patrón común de bug:
   endpoints tipo `marcar-todas-leidas`, `eliminar-resueltas`, export CSV,
   que filtran solo por `negocio_id` y afectan TODAS las sucursales. Revisar
   que acepten `?sucursalId=` y lo apliquen en el WHERE.

3) Real-time con Socket.io — solo donde el desfase causa daño accionable.
   Ya implementado en Alertas/ChatYA/Notificaciones. Para módulos pendientes,
   NO añadir socket por defecto — usar React Query default.

4) Dropdowns de filtro con listas hardcoded muestran opciones inexistentes
   en la sucursal/toggle activo → tabla vacía al filtrar. Solución:
   `useMemo([items, toggle])` extrae opciones realmente presentes y filtra
   la lista hardcoded. Aplicado en `PaginaOfertas.tsx` (tiposDisponibles,
   estadosDisponibles).

5) Inputs con debounce tienen 2 useState (visible + aplicado al filtro).
   Resetear solo uno deja el otro con texto obsoleto. Resetear ambos +
   clearTimeout de los timers pendientes al cambiar sucursal/toggle.

6) Selectores DOM globales (click-outside) deben usar `data-*` attributes,
   nunca atributos UX (`title`, `aria-label`). Caso real: el panel de
   Notificaciones usaba `closest('button[title="Notificaciones"]')`,
   y al limpiar el title por UX se rompió. Cambiado a
   `data-notificaciones-boton`.

7) Patrón estándar de filtros — los filtros se COMPLEMENTAN, no se excluyen.
   Cambiar un filtro NO limpia los otros. La X del buscador solo limpia texto.

8) Estados vacíos contextuales — cada módulo con filtros múltiples debe
   mostrar mensaje según la combinación activa (no genérico "sin datos").
   Pattern helper `mensajeVacio<Modulo>()` o componente
   `EstadoVacio<Modulo>`. Ver Transacciones, Clientes, Ofertas, Catálogo,
   Puntos y Alertas como referencia.

SETUP (antes de arrancar)

- BD local con al menos 2 sucursales activas del mismo negocio
  (Imprenta FindUS: Matriz + Sucursal Norte ya existen en dev)
- Datos de prueba en ambas sucursales: ventas, clientes, productos, ofertas,
  empleados, etc. Si faltan, crear con ScanYA o UI de BS
- Usuario dueño y al menos 1 gerente (María / Jazmín) con sucursal asignada
- Backend local corriendo con DATABASE_URL local
- Frontend local (localhost:3000)

METODOLOGÍA POR MÓDULO

Para cada uno:
  1. Activar Matriz en el selector del navbar
  2. Anotar datos visibles: KPIs, listas, contadores, filtros disponibles
  3. Cambiar a Sucursal Norte
  4. Verificar:
     a. KPIs cambian correctamente (o son 0)
     b. Listas solo muestran datos de Norte
     c. Dropdowns de filtros (operador, etc.) solo tienen opciones de Norte
     d. Acciones masivas (si las hay) solo afectan Norte
     e. Modales de detalle muestran contexto de Norte
  5. Si hay fuga o mezcla → parar, investigar, corregir, re-probar
  6. No avanzar al siguiente módulo hasta cerrar el actual

CRITERIOS DE ACEPTACIÓN

- 0 fugas cross-sucursal en el módulo
- Todas las acciones masivas respetan la sucursal activa
- Queries/mutations de React Query invalidan correctamente al cambiar
- Si aplica, real-time socket cubre cambios globales
- Estado vacío contextual para las combinaciones de filtros

QUÉ ACTUALIZAR AL TERMINAR

Al cerrar cada módulo:
  - Marcar el módulo como ✅ en docs/reportes/sprint-sucursales-pruebas-abril-2026.md
  - Si hubo bug significativo, agregar entrada a docs/CHANGELOG.md
  - Si hubo lección transversal, agregar a docs/estandares/LECCIONES_TECNICAS.md
  - Si se cambió backend o contrato, actualizar docs/arquitectura/<Modulo>.md

Al terminar todo el sprint:
  - Documentar la validación final en un reporte consolidado
  - Ejecutar Prueba 2 (vista gerente)

REGLAS DE TRABAJO (recordatorio de CLAUDE.md)

- Español en respuestas, razonamiento, comentarios
- Paso a paso, no adelantarse
- Preguntar antes de crear archivos >100 líneas o cambiar contratos
- Usar str_replace antes de reescribir
- Al tocar UI, consultar docs/estandares/TOKENS_GLOBALES.md y
  docs/estandares/TOKENS_COMPONENTES.md
- Actualizar docs tras migrar o refactorizar
- NO iniciar preview automáticamente — solo cuando el usuario lo pida

ARRANCAR — PRUEBA 2 VISTA GERENTE

Prueba 1 (vista dueño, 12 módulos) está cerrada al 100%. Solo queda Prueba 2.

Pasos:
  1. Logout del dueño (juan.manuel)
  2. Login como gerente — verificar credenciales en BD:
     • María: gerente con sucursal asignada (Matriz o Norte, revisar)
     • Jazmín Cecilia (cecys): empleada con permisos elevados, también
       con sucursalAsignada
  3. Validar que en la sesión de gerente:
     a. NO aparece selector de sucursal en navbar (no puede cambiar)
     b. El header del navbar muestra fija la sucursal asignada
     c. En el menú lateral NO aparecen "Sucursales" ni "Puntos y Recompensas"
        (módulos exclusivos de Matriz, además gerente no puede gestionar)
     d. Por URL directa /business-studio/sucursales o /business-studio/puntos
        debe redirigir a /business-studio (gracias al MatrizGuard)
     e. En cada módulo accesible:
        - Los KPIs corresponden solo a su sucursal
        - Las listas filtradas
        - Los modales de detalle
        - Las acciones masivas
     f. Mi Perfil: solo ve los 5 tabs por-sucursal (Sucursal, Ubicación,
        Horarios, Imágenes, Operación) — el tab Negocio NO aparece
     g. En tabs editables, los campos globales del negocio están en modo
        solo lectura o no aparecen (categoría, descripción del negocio,
        logo, sitio web)

Reporta lo que ves en cada paso. Si encuentras algún hueco
(p.ej. gerente puede ver/editar un campo que no debería), parar e
investigar.

REGLAS DE TRABAJO (recordatorio)

- Español en respuestas, razonamiento, comentarios
- Paso a paso, no adelantarse
- NO iniciar preview automáticamente — solo cuando el usuario lo pida

Yo reporto lo que veo y avanzamos juntos.
```

---

## Archivos relevantes si surgen dudas

- `apps/api/src/services/alertas.service.ts` — patrón de socket.io broadcast
- `apps/web/src/hooks/queries/useAlertas.ts` — patrón `useAlertasRealtimeSync`
- `apps/web/src/components/layout/MenuBusinessStudio.tsx` — montaje del listener global
- `apps/api/src/middleware/validarAccesoSucursal.ts` — middleware que filtra por sucursal activa
- `apps/web/src/services/api.ts` — interceptor Axios que agrega `?sucursalId=`
- `docs/estandares/PATRON_REACT_QUERY.md` — estándar de query keys con sucursalId
