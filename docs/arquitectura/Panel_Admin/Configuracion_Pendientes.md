# Configuración — Pendientes (checklist del módulo)

> **Qué es este documento:** lo que **falta** por hacer en el módulo "Configuración" (módulo 9) del
> Panel Admin. Lo ya terminado (qué ES y cómo funciona) vive en el documento hermano
> **[`Configuracion.md`](Configuracion.md)**.
>
> **Regla de oro:** cuando un pendiente se termina, se **borra de aquí** y, si cambió el comportamiento,
> se documenta en `Configuracion.md`. Uno se vacía, el otro crece.
>
> **Proceso:** carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).
> **Plantilla de oro: Negocios.**
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · ✅ hecho
>
> **Última actualización:** 17 Junio 2026 — **v1 CONSTRUIDO Y CERRADO (Fases 1+2+3).** Editar trial/gracia
> + escalera de comisiones configurable (`comision_escalera`, JSON). Verificado con 2 harness + builds verdes;
> persistencia validada en dev. Detalle del módulo → `Configuracion.md`.

---

## Estado del módulo

**v1 cerrado.** El **tablero económico** del Panel: el SuperAdmin edita la **escalera de comisiones**, el
**trial** y la **gracia** sin tocar código. Backend de lectura + escritura (validación + auditoría + reset de
caché), UI con editor de tramos (vista previa en vivo + rueda del mouse). La escalera ya es configurable →
**Vendedores Fase 2 queda desbloqueada** (la lee para el devengo).

---

## Lo que falta (backlog)

| # | Pendiente | Prioridad |
|---|---|---|
| **P1** | ✅ **HECHO (2 jul 2026)** — `sembrar_comision_escalera.sql` corrida en PROD; la clave `comision_escalera` existe en `configuracion_sistema` (tramos 0-9=$0 / 10-24=$30 / 25+=$50). También en DEV. Ya no depende del default del código. | ✅ resuelto |
| **P2** | **Precio de membresía editable** — ✅ **HECHO** (Sprint de Stripe Pieza 1: se edita desde el Panel, crea el Price en Stripe sin redeploy). **Promos/cupones de lanzamiento** — ❌ **descartados** (Suscripciones §Cierre de alcance; la cortesía manual cubre fundadores y el Checkout de Stripe ya acepta promotion codes a mano). | ✅ resuelto |
| **P3** | **Nuevas palancas cuando se construyan sus secciones** — cada vez que una sección (ScanYA/Puntos, MarketPlace…) tenga un valor de política de negocio, registrarlo como clave en `CONFIG_EDITABLE` + leerlo con `obtenerConfig*` en vez de hardcodear. No antes. | 🟢 (orgánico) |
| **P4** | **2ª pasada de Configuración** — categorías `general`/`notificaciones` (toggles de funciones, textos/banners) si llegan a hacer falta. | 🟢 |

> Decisión de alcance (confirmada con Juan, 17 jun): v1 = **solo las palancas que tocan la caja** (escalera +
> trial + gracia). Lo demás no entra por inflar; se suma cuando exista una palanca económica real.

---

## Decisiones de diseño (implementadas)

- **D1 · Escalera = una clave `tipo='json'`** (`comision_escalera`), sin tabla nueva. Tramos contiguos
  `[{min,max,montoPorActivo}]`, `max:null` = sin tope. Comisión = `# activos × monto` del tramo.
- **D2 · Editar trial y gracia** (números con validación `min/max` del catálogo).
- **D3 · Precio FUERA de v1** (Stripe; sprint en Suscripciones con Coupons).
- **D4 · Escritura** `actualizarConfig` → `PATCH /admin/configuracion/:clave` (solo super): valida por tipo,
  UPSERT, `actualizado_por`, `admin_auditoria`, `resetearCacheConfig()`.
- **D5 · Lectura UI** `listarConfiguracion()` → `GET /admin/configuracion` (catálogo + valor actual).
- **D6 · Migración** `sembrar_comision_escalera.sql` (idempotente, opcional — UPSERT siembra igual). La corre Juan.
- **D7 · Validación escalera** contigua, sin huecos/solapes, primer tramo en 0, último `max:null`, montos ≥ 0
  (en el backend; el editor del front la espeja). **Categoría = `pagos`** (resuelto).
- **D8 · Auditoría** obligatoria (`admin_auditoria` + `actualizado_por`).
- **D9 · Invalidación de caché** tras cada UPDATE (`resetearCacheConfig()`).

---

## Criterios de aceptación — resultado

- ✅ **A1** — Solo SuperAdmin entra (gate global de superadmin; gerente/vendedor sin menú + 403).
- ✅ **A2** — Lista trial, gracia y escalera con descripción, unidad y rango.
- ✅ **A3** — Editar trial/gracia (número con min/max) → persiste + auditoría + caché reseteada.
- ✅ **A4** — Editar la escalera (agregar/quitar tramos, tope + monto) → persiste como JSON válido + auditoría.
- ✅ **A5** — Validaciones: número fuera de rango → 400; escalera con huecos/solapes/sin tope/monto negativo → 400.
- ✅ **A6** — `tsc` API + `tsc -b`/`vite build` Panel en verde. Harness validación (18 casos) TODO VERDE.

> Verificación de persistencia con datos reales: hecha en dev. Falta solo correr la migración en prod (P1).

---

## Checklist del carril

```
### Módulo: CONFIGURACIÓN   ·   Fase actual: 3 — Cerrado (v1)

Fase 0 — Definir ✅   ·   Fase 1 — VER ✅   ·   Fase 2 — ACTUAR ✅
Fase 3 — Cerrar
- [x] Doc canónico Configuracion.md (2 capas)
- [x] Vaciar este checklist + dejar solo backlog (P1–P4)
- [x] Índices (tablero, memoria)
- [x] Commit a main ✅ (committeado; módulo en prod)
- [x] Avisar a Vendedores: la escalera ya es configurable → desbloquea su Fase 2
```

---

## Referencias

- [`Configuracion.md`](Configuracion.md) — el módulo completo (qué es + apéndice técnico).
- [`Panel_Admin.md`](Panel_Admin.md) — §9 Configuración · matriz maestra (Config = solo super).
- [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) — **lee** la escalera (Fase 2, desbloqueada).
- `docs/migraciones/sembrar_comision_escalera.sql` — siembra de la escalera (P1).
