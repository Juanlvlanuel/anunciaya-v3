# Prompt: Pruebas 1 y 2 — Filtrado por sucursal en Business Studio

> **Creado:** 21 Abril 2026
> **Para:** retomar en una sesión independiente dedicada a cerrar el módulo Sucursales
> **Tiempo estimado:** ~3 horas
> **Prerequisito:** proyecto en `main` al día (último commit del Recolector de Basura)

---

## Cómo usar

Copia y pega el bloque de abajo en una **nueva sesión de Claude Code**. Todo el contexto necesario viene incluido — no hace falta releer todo el código.

---

## Prompt

```
# Sprint de cierre — Módulo Sucursales (Pruebas 1 y 2 de filtrado)

Retomando el proyecto AnunciaYA. Este chat está dedicado exclusivamente a 
ejecutar las 2 últimas pruebas que faltan para cerrar el módulo Sucursales 
al 100%.

## LEE PRIMERO (NO hace falta releer todo el código)

1. `docs/reportes/sprint-sucursales-pruebas-abril-2026.md`
   → Estado completo del sprint. Las Pruebas 1 y 2 son los únicos 
   pendientes de alto impacto. Todo lo demás está cerrado.

2. `CLAUDE.md` (solo secciones: "Reglas de Trabajo", "Convenciones de Código", 
   "Multi-Sucursal")

## CONTEXTO RÁPIDO

- main al día con múltiples commits del sprint completado
- 13 bugs fuente de leaks R2 + 12 bugs funcionales corregidos en sesiones 
  previas
- Recolector de Basura R2 operativo con auditoría
- Panel Admin con infraestructura backend lista
- Sub-pruebas 5.1-5.4 del recolector ya validadas en vivo
- Sub-pruebas 5.5-5.9 cubiertas por diseño (opcionales)

## QUÉ VAMOS A HACER

Auditoría sistemática de filtrado por sucursal en Business Studio. Valida 
que cada módulo respete el selector de sucursal activa y no haya fuga 
cross-sucursal.

### Prueba 1 — Vista dueño (12 módulos, ~2h)

Como dueño, con 2 sucursales activas (Matriz + Sucursal Norte), auditar 
cada módulo BS:

Para cada uno:
1. Activar Matriz en el selector del navbar
2. Anotar qué datos se muestran (cuentas, montos, listas, filtros)
3. Cambiar a Sucursal Norte
4. Verificar que la data cambia correctamente y corresponde SOLO a esa 
   sucursal
5. Si hay algo que no filtra o mezcla datos → parar, investigar el bug, 
   corregir y re-probar

Módulos a auditar (en orden sugerido por complejidad):

1. Dashboard — KPIs, gráficas, últimas actividades
2. Transacciones — tab Ventas + tab Canjes/Vouchers, filtros, operadores
3. Clientes — tabla, KPIs de total/nuevos/inactivos, modal detalle
4. Opiniones — reseñas de clientes
5. Alertas — eventos de seguridad
6. Catálogo — artículos, precios por sucursal, disponibilidad
7. Promociones — ofertas públicas + cupones asignados
8. Puntos y Recompensas — tarjetas de lealtad, configuración de puntos
9. Empleados — lista, KPIs, permisos ScanYA
10. Mi Perfil — datos de sucursal vs datos del negocio (global)
11. Reportes — KPIs consolidados, funnels, top clientes/productos
12. Sucursales — la tabla de gestión misma

### Prueba 2 — Vista gerente (~1h)

Logout del dueño. Login como gerente (María o Jazmín — cuenta con 
`sucursalAsignada = UUID`).

Verificar:
- El selector de sucursal NO aparece (el gerente no puede cambiar)
- Solo ve data de SU sucursal
- Los 12 módulos muestran datos filtrados automáticamente
- El menú NO muestra la opción "Sucursales"
- No puede acceder a URLs de sucursales ajenas (intento de fuga con URL)

## SETUP NECESARIO (antes de arrancar)

- BD con al menos 2 sucursales activas del mismo negocio
- Ambas con datos propios (transacciones, clientes, reseñas, ofertas, etc.) 
  — si falta data en alguna, crear antes
- 1 gerente asignado a una sucursal específica
- Servidor dev corriendo (`pnpm dev` en apps/api)
- Frontend corriendo (`pnpm dev` en apps/web)

## METODOLOGÍA POR MÓDULO

Guíame módulo por módulo. Para cada uno:
1. Me dices qué esperas ver en cada sucursal
2. Yo te reporto qué veo en la app
3. Si hay diferencia/bug → pausamos, revisamos código, corregimos
4. Al terminar el módulo, actualizamos checkmark en el reporte

No avancemos al siguiente módulo hasta cerrar el actual.

## CRITERIOS DE ACEPTACIÓN

Para cerrar cada módulo:
- [x] Vista dueño: data cambia correctamente al switchear sucursal
- [x] Vista gerente: solo ve su sucursal
- [x] No hay fuga cross-sucursal en ninguna tabla, KPI, filtro o modal
- [x] Consistencia entre lo que se ve en frontend y lo que hay en BD

## QUÉ ACTUALIZAR AL TERMINAR

Al cerrar ambas pruebas:

1. `docs/reportes/sprint-sucursales-pruebas-abril-2026.md`
   - Prueba 1 y 2 marcadas como ✅
   - Lista 2 recomendación #6 cerrada
   - Estado final del reporte al 100%

2. `docs/CHANGELOG.md`
   - Entrada nueva con los bugs encontrados durante la auditoría (si hay)

3. `docs/ROADMAP.md`
   - Marcar el bloque de sucursales/BS como cerrado al 100% si aplica

4. Commit + push

## ARRANCAR

Empieza con el Dashboard (módulo 1). Guíame los pasos y te reporto.
```
