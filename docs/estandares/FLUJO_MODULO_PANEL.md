# El carril — cómo se construye un módulo del Panel Admin

> **Qué es:** el proceso **repetible** para construir cualquiera de las secciones del Panel
> (`apps/admin`). Mismo orden, mismos pasos, mismos gates — para los 10 módulos que faltan.
>
> **Por qué existe:** avanzar sin un proceso fijo genera lo que ya pasó con Negocios — dudas de
> "¿está completo o a medias?", documentos que se desfasan, y pendientes dispersos. El carril
> elimina eso: cada módulo nace con criterios de aceptación, se verifica contra ellos, y se cierra
> con sus dos documentos al día.
>
> **Referencia canónica (plantilla de oro):** el módulo **Negocios** (`apps/admin/src/components/
> negocios/` + `apps/api/src/{routes,controllers,services}/admin/negocios*`). Todo módulo nuevo se
> **calca** de ahí.
>
> **Docs hermanos:** [`../arquitectura/Panel_Admin/Panel_Admin.md`](../arquitectura/Panel_Admin/Panel_Admin.md)
> (arquitectura del Panel) · [`../arquitectura/Panel_Admin/Tokens_Panel.md`](../arquitectura/Panel_Admin/Tokens_Panel.md)
> (sistema de diseño del Panel).
>
> **Última actualización:** 10 Junio 2026.

---

## Las dos reglas que evitan el caos

1. **Regla del gate.** Un módulo **no avanza de fase** hasta que sus **criterios de aceptación**
   (escritos en la Fase 0) están **verificados con datos reales**. Adiós a "no sé si está completo".
2. **Regla de oro de los documentos.** Cada módulo tiene **dos** documentos y **nunca** se duplican:
   - `<Modulo>.md` → **qué ES y cómo funciona** (lo terminado).
   - `<Modulo>_Pendientes.md` → **qué FALTA** (checklist vivo).
   - Cuando un pendiente se termina, **sale** del checklist y, si cambió el comportamiento, **entra**
     al `<Modulo>.md`. Uno se vacía, el otro crece.

---

## Las 4 fases (vista rápida)

```
Fase 0 — DEFINIR    mini-spec · decisiones · criterios de aceptación
   ↓
Fase 1 — VER        backend lectura · frontend lectura (con diseño base) · GATE 1
   ↓
Fase 2 — ACTUAR     backend acciones · frontend acciones · GATE 2 · PULIDO VISUAL
   ↓                (se salta si el módulo es solo lectura, p. ej. Métricas/Resumen)
Fase 3 — CERRAR     doc canónico · checklist · índices · commit a main
```

---

## Fase 0 — Definir *(antes de teclear una línea)*

1. **Mini-spec** (1 carilla): qué hace el módulo, qué **NO** hace, y su fila de la **matriz de
   permisos** por rol (superadmin / gerente / vendedor). Sale de `Panel_Admin.md`.
2. **Decisiones de diseño abiertas:** resolverlas o anotarlas — estados, qué toca Stripe vs. BD,
   qué se audita, qué **migración SQL** hace falta.
3. **Criterios de aceptación** = la Definición de Terminado. Lista **verificable** ("el gerente solo
   ve los de su región", "cancelar degrada al dueño y devuelve puntos"). **Se escriben aquí, no al final.**

---

## Fase 1 — VER *(lectura primero, siempre)*

4. **Backend de lectura:** `routes/admin/<modulo>.routes.ts → controllers/admin → services/admin`,
   con **alcance por rol** en el service (`condicionAlcance`). Tipos en el service. Montar las rutas
   **antes** del gate global de superadmin si las usan gerente/vendedor.
5. **Frontend de lectura:** `services/<modulo>Service.ts → hooks/queries/use<Modulo>.ts` (React Query
   con `keepPreviousData` en listas con filtros) → sección (tabla/cards + filtros) + **ficha
   instantánea** (placeholder de la fila + prefetch en hover). **Diseño base** según `Tokens_Panel.md`
   (tipografía, color, rounded, responsive `base/lg:/2xl:`), calcando Negocios. `data-testid` en todo
   lo interactivo.
6. **GATE 1:** verificar VER con **datos reales** + `tsc --noEmit` y `build` en verde → marcar los
   criterios de aceptación de lectura. ✅

---

## Fase 2 — ACTUAR *(acciones/escritura — se salta si el módulo es solo lectura)*

7. **Backend de acciones:** service de escritura con **alcance sincronizado con el de lectura**
   (mismo predicado; si tocas uno, tocas el otro), **auditoría** (`registrarAuditoria` → `admin_auditoria`),
   guards de estado (409), y manejo **defensivo** de servicios externos (Stripe/email: si fallan, la BD
   manda y se devuelve un aviso). **Migración SQL** si toca schema → correr en **dev y prod**.
8. **Frontend de acciones:** diálogos **reusando** los base (`ModalAdaptativo`, `DialogoConfirmar`,
   `useToastPanel`) + mutaciones React Query con **invalidación** de las queries afectadas + footer/acciones
   **por rol** (el backend es la fuente de verdad; la UI solo refleja). `data-testid`.
9. **GATE 2:** verificar cada acción con **datos reales** (harness `apps/api/src/scripts/probar-*.ts`) +
   `tsc`/`build` → marcar los criterios de acción. ✅
10. **PULIDO VISUAL** *(módulo completo)*: con todo armado, una pasada contra `Tokens_Panel.md` —
    estética profesional (no caricaturesca), responsive real probado en `lg:` y `2xl:`, variantes
    móvil/desktop donde el fondo cambia, microinteracciones/animaciones, consistencia con los otros
    módulos. Opcional: mini-reporte en `docs/reportes/`.

---

## Fase 3 — Cerrar *(el módulo no "existe" hasta aquí)*

11. **Doc canónico `<Modulo>.md`** — formato de **dos capas** como `Negocios.md`: Capa 1 en lenguaje
    de persona (qué es, quién lo usa, qué ve, tabla de permisos, FAQ) + Capa 2 apéndice técnico
    (mapa de archivos, endpoints, alcance, detalles de cada acción).
12. **Checklist `<Modulo>_Pendientes.md`** — lo que quedó 🟡/⬜ + **sacar el módulo del
    `PENDIENTES_PanelAdmin.md` global** dejando un puntero.
13. **Índices:** actualizar el **tablero** de módulos, el índice + matriz de `Panel_Admin.md`,
    `ROADMAP.md`, la **memoria-puntero** y regenerar el **kit de claude.ai**.
14. **Commit a `main`** (`tipo(admin): ...`). Push dispara el redeploy.

---

## Lo que se reusa en CADA módulo (no se reinventa)

| Pieza | Dónde | Para qué |
|---|---|---|
| `requierePanel([roles])` | `middleware/panel.middleware.ts` | Gate por rol + resuelve región (revalida en BD) |
| `registrarAuditoria` + `admin_auditoria` | `services/admin/auditoria.service.ts` | Bitácora de acciones sensibles |
| `ModalAdaptativo` | `components/ui/ModalAdaptativo.tsx` | Modal centrado (escritorio) / bottom-sheet (móvil) |
| `DialogoConfirmar` | `components/ui/DialogoConfirmar.tsx` | Confirmación con motivo opcional/obligatorio |
| `Toaster` + `useToastPanel` | `components/ui/Toaster.tsx` · `stores/useToastPanel.ts` | Toasts del Panel (`toast.exito/error/...`) |
| `useBackNativo` | `hooks/useBackNativo.ts` | Botón atrás nativo |
| Ficha instantánea | (patrón) | Placeholder de la fila + prefetch en hover |
| Filtro global de región | `stores/useFiltroRegion` + interceptor en `services/api.ts` | El superadmin acota el Panel a una región |
| Tokens del Panel | `Tokens_Panel.md` + `index.css` | Color, tipografía, rounded, sombras, tema |

---

## Mapa de la plantilla de oro (qué calcar de Negocios)

| Necesitas… | Calca de… |
|---|---|
| Rutas con permiso por rol | `routes/admin/negocios.routes.ts` |
| Controller (lee, llama service, responde) | `controllers/admin/negocios.controller.ts` |
| Lecturas + alcance por rol | `services/admin/negocios.service.ts` (`condicionAlcance`, `panelConFiltroRegion`) |
| Acciones + auditoría + Stripe defensivo | `services/admin/negocios-acciones.service.ts` |
| Service axios del frontend | `services/negociosService.ts` |
| Hooks React Query (lista + detalle + mutaciones) | `hooks/queries/useNegociosAdmin.ts` |
| Sección con tabla/cards + filtros + paginación | `components/negocios/SeccionNegocios.tsx` |
| Ficha + footer por rol + diálogos | `components/negocios/FichaNegocio.tsx` + `Dialogo*.tsx` |

---

## Convenciones técnicas obligatorias (resumen)

- **Controllers → Services.** El controller no lleva lógica de negocio. (Ver `CLAUDE.md`.)
- **Alcance por rol sincronizado** lectura ↔ escritura (mismo predicado matriz/cartera).
- **React Query** para datos del servidor, **Zustand** para estado de UI — nunca mezclar.
  Query keys en `config/queryKeys.ts`. (Ver `PATRON_REACT_QUERY.md`.)
- **`data-testid`** en todo elemento interactivo desde su creación. (Ver `REGLAS_TESTING.md`.)
- **Diseño:** `Tokens_Panel.md` (del Panel) — **NO** `TOKENS_GLOBALES.md` (esos son de `apps/web`).
- **Migraciones SQL** one-shot en `docs/migraciones/`, corridas en **dev y prod**.
- **Verificación con datos reales** (regla 8 de `CLAUDE.md`): harness que detone el flujo real.
- **Commit a `main`** siempre (sin feature branches).

---

## Checklist copia-pega (duplícalo al iniciar cada módulo)

```
### Módulo: <NOMBRE>   ·   Fase actual: ___

Fase 0 — Definir
- [ ] Mini-spec (qué hace / qué no / matriz de permisos por rol)
- [ ] Decisiones de diseño + ¿migración SQL?
- [ ] Criterios de aceptación escritos (la Definición de Terminado)

Fase 1 — VER
- [ ] Backend lectura (routes → controller → service, alcance por rol)
- [ ] Frontend lectura (service → hook RQ → sección + ficha instantánea, diseño base)
- [ ] GATE 1: verificado con datos reales + tsc/build ✅ + criterios de lectura marcados

Fase 2 — ACTUAR  (saltar si es solo lectura)
- [ ] Backend acciones (alcance sincronizado + auditoría + guards + externos defensivos + migración dev/prod)
- [ ] Frontend acciones (diálogos base + mutaciones con invalidación + acciones por rol)
- [ ] GATE 2: verificado con datos reales + tsc/build ✅ + criterios de acción marcados
- [ ] PULIDO VISUAL del módulo completo (Tokens_Panel.md, responsive lg/2xl, variantes, consistencia)

Fase 3 — Cerrar
- [ ] Doc canónico <Modulo>.md (2 capas)
- [ ] Checklist <Modulo>_Pendientes.md + sacar del PENDIENTES global (puntero)
- [ ] Índices (tablero, Panel_Admin.md, ROADMAP, memoria, kit claude.ai)
- [ ] Commit a main
```

---

## Referencias

- **Plantilla de oro:** módulo Negocios (código) + [`Negocios.md`](../arquitectura/Panel_Admin/Negocios.md) (doc canónico de ejemplo).
- **Diseño del Panel:** [`Tokens_Panel.md`](../arquitectura/Panel_Admin/Tokens_Panel.md).
- **Arquitectura del Panel:** [`Panel_Admin.md`](../arquitectura/Panel_Admin/Panel_Admin.md).
- **Estándares transversales:** `PATRON_REACT_QUERY.md` · `REGLAS_TESTING.md` · `REGLAS_ESTILO_CODIGO.md`.
