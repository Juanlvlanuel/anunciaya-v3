# Panel Admin · Módulo Métricas — Pendientes / checklist 📊

> **Qué es:** el checklist vivo del módulo Métricas (lo que FALTA). Lo **terminado** vive en el doc
> canónico [`Metricas.md`](Metricas.md). **Estado: construido y cerrado** (solo lectura → saltó Fase 2).
>
> **Última actualización:** 21 Junio 2026 · **Fase:** ✔ Cerrado.

---

## Estado

Las 3 pestañas (**Crecimiento · Uso de la app · Usuarios**) con KPIs, gráficas (recharts), rankings,
selector de periodo (presets + rango por fechas, granularidad día/mes automática), alcance por rol +
lente de región, y deep-link "Negocios en riesgo" → Negocios con scroll + highlight. Backend verificado
con 3 harness contra datos reales (`probar-metricas-*.ts`); `tsc` api+admin y `vite build` verdes. Sin
migración SQL. **Qué es y cómo funciona:** [`Metricas.md`](Metricas.md).

## Checklist de fases

```
### Módulo: Métricas   ·   ✔ CERRADO

Fase 0 — Definir       [x] mini-spec · decisiones · criterios de aceptación
Fase 1 — VER           [x] Backend (3 secciones, 3 harness verdes, 3 roles + lente + consistencia serie↔KPI)
                       [x] Frontend (3 pestañas, recharts, selector de periodo, deep-link highlight)
                       [x] GATE 1: verificado con datos reales + revisión visual de Juan + tsc/build ✅
Fase 2 — ACTUAR        → SE SALTA (módulo solo lectura)
Fase 3 — Cerrar        [x] Doc canónico Metricas.md · [x] tablero · [x] Panel_Admin.md · [x] Tokens_Panel.md
                       [x] ROADMAP/CHANGELOG · [x] memoria · [ ] commit (lo hace Juan)
```

## Backlog (mejoras menores, no bloquean)

- 🟢 **Limpiar `verificadosPct`** del backend (service/tipo/harness): el KPI "Verificados" se retiró del
  front por redundante (todos nacen verificados), pero el backend lo sigue calculando.
- 🟢 **Deep-link a negocio en otra página:** el scroll+highlight de "Negocios en riesgo" solo alcanza la
  página visible de Negocios (20/pág); saltar a la página exacta del negocio queda como mejora.
- 🟢 **Más KPIs / desgloses** cuando haya volumen real (hoy beta sin actividad ScanYA).
- 🟦 **Analítica de comportamiento** (tiempo por sección, recorridos, embudos) = módulo aparte: hoy no se
  captura, requiere instrumentar eventos.
- 🟦 **Negocios "sin región"** (matriz sin ciudad) no caen en ninguna lente regional → el total > suma de
  regiones. Es comportamiento correcto y consistente con el Panel; se resuelve asignando ciudad a esos
  negocios (dato, no código). Diagnóstico: `scripts/diag-metricas-region.ts`.

## Referencias
- **Doc canónico:** [`Metricas.md`](Metricas.md) · **Carril:** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
- **Diseño:** [`Tokens_Panel.md`](Tokens_Panel.md) · **Arquitectura:** [`Panel_Admin.md`](Panel_Admin.md)
