# Resumen / inicio — Pendientes (checklist vivo)

> **Estado:** ✅ **Construido y en uso** (20 Junio 2026). La descripción completa del módulo vive en el
> doc canónico [`Resumen.md`](Resumen.md); aquí solo queda lo que falta.
>
> Módulo **solo lectura** → el carril saltó la Fase 2. Verificado con harness
> `apps/api/scripts/probar-resumen-lectura.ts` (datos reales) + `tsc` (api+admin) y `vite build` verdes.
> **Sin migración SQL.**
>
> Proceso: [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).

---

## Hecho (resumen)

- KPIs por rol (super/gerente: negocios activos · usuarios · ingresos del mes · cobros fallidos · con
  lente de región; vendedor: cartera activa · comisiones pendientes · efectivo por entregar).
- Cola de pendientes accionable: **efectivo por entregar** + **negocios en gracia** (2 tipos, por el
  neteo). Hasta 5 filas + "Ver todos".
- **Deep-link con filtro:** KPI/pendiente → sección que resuelve la tarea (Negocios filtrado "en
  gracia", Suscripciones filtrado "cobro_fallido", Vendedores, Usuarios) vía `useNavegacionPanel`.
- **Campana del shell** (`BandejaPendientes`) conectada a datos reales (eliminado `PENDIENTES_DEMO`).
- Diseño pulido (Tokens_Panel §5): KPI responsive (móvil apilado / escritorio horizontal), estado
  vacío positivo. Verificado visualmente por Juan en su preview.
- Seed dev nuevo `seed-efectivo-pendiente-dev.ts` (+ `seed-negocios-estados-dev.ts`) para poblar la cola.

## Pendiente

- [ ] **Commit a main** (lo hace Juan).

## Backlog / futuro

- Deep-link de **efectivo/comisiones** podría pre-seleccionar al vendedor o la pestaña de efectivo (hoy
  abre Vendedores sin filtro).
- Más KPIs (negocios nuevos del mes, usuarios nuevos) si se quiere enriquecer el tablero.
- El análisis profundo (actividad, gráficas, tendencias) es el módulo **Métricas (#2)**, aparte.
