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
- Cola de pendientes accionable: **4 tipos** — *efectivo por entregar* + *negocios en gracia* (los 2
  originales) + *pagos por verificar* + *comisiones por pagar* (sumados 29 jun). Hasta 5 filas + "Ver
  todos". Prueba de admisión dura ("al clic resuelvo"); lo informativo queda fuera (vive en Auditoría/
  Métricas/Suscripciones).
- **Deep-link con filtro:** KPI/pendiente → sección que resuelve la tarea (Negocios filtrado "en
  gracia", Suscripciones filtrado "cobro_fallido" o pestaña "Por verificar", Vendedores, Usuarios) vía
  `useNavegacionPanel`. **Deep-link a vendedor + pestaña** (29 jun): efectivo→"Por entregar",
  comisiones→"Pagos" (abre el detalle del vendedor en su tab, placeholder + React Query).
- **Campana del shell** (`BandejaPendientes`) conectada a datos reales (eliminado `PENDIENTES_DEMO`).
- **Alcance por rol** de las colas nuevas: pagos por verificar = super + gerente (su región);
  comisiones por pagar = **solo super** (es tesorería; con lente de región no aplica).
- Diseño pulido (Tokens_Panel §5): KPI responsive (móvil apilado / escritorio horizontal), estado
  vacío positivo, tarjetas de pendiente calcadas de las existentes. Verificado E2E por Juan (los 4).
- Seeds dev para poblar la cola: `seed-efectivo-pendiente-dev.ts`, `seed-negocios-estados-dev.ts` y
  `seed-pago-manual-pendiente-dev.ts` (nuevo, 29 jun).

## Pendiente

- [ ] **Commit a main** (lo hace Juan).

## Backlog / futuro

- Deep-link a vendedor + pestaña ✅ hecho (29 jun). Falta: con **varios** vendedores en un pendiente, la
  **campana** abre la lista (no un tab); podría ofrecer elegir. Y el efectivo del **propio vendedor**
  (vista "Mi cartera") aún no abre su tab "Por entregar".
- Más KPIs (negocios nuevos del mes, usuarios nuevos) si se quiere enriquecer el tablero.
- El análisis profundo (actividad, gráficas, tendencias) es el módulo **Métricas (#2)**, aparte.
