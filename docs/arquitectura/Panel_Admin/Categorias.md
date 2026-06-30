# Categorías — Módulo del Panel Admin

> **Qué es:** el documento canónico del módulo **Categorías** (catálogo de giros de
> negocio: categorías + subcategorías, y su **disponibilidad por ciudad**).
> Capa 1 = en lenguaje de persona; Capa 2 = apéndice técnico. Lo que FALTA vive en
> [`Categorias_Pendientes.md`](Categorias_Pendientes.md).
>
> **Estado:** ✅ construido (código + tsc/build verde en api/admin/web). Falta correr la
> migración en dev/prod y la verificación E2E a mano. **Última actualización:** 29 Junio 2026.

---

## Capa 1 — Qué es y cómo funciona

### Para qué sirve
Le permite al **SuperAdmin** administrar el **catálogo de giros** de la app —las
**categorías** (ej. Comida, Salud, Bienes Raíces) y sus **subcategorías** (ej.
Inmobiliarias, Avalúos)— **sin tocar código ni hacer deploy**. Antes el catálogo solo se
cambiaba por SQL directo. Además decide **en qué ciudades** aparece cada categoría o
subcategoría.

### Quién lo usa
**Solo SuperAdmin.** Gerente y vendedor no ven este módulo (es estructura de plataforma,
igual que Ciudades). La ruta va **bajo el gate global de superadmin**.

### Qué ve y hace
Una **lista jerárquica**: categorías expandibles → subcategorías. Por fila puede:
- **Crear/editar** categoría o subcategoría (solo **nombre**).
- **Disponibilidad por ciudad**: un diálogo con un interruptor **"Disponible en todas las
  ciudades"** (global) o una lista multi-selección de ciudades.
- **Activar/Desactivar**. **"Quitar" = desactivar**, nunca borrar: conserva la integridad
  con los negocios ya clasificados (igual que Ciudades/Regiones).

Cada fila muestra chips: nº de subcategorías, **Todas / N ciudades**, y nº de negocios que
usan el giro (para ver el impacto antes de desactivar).

### Cómo se conecta con la app
El catálogo es **global por defecto**. La capa de disponibilidad es **aditiva**: si una
categoría/subcategoría **no** tiene ciudades asignadas → es **global** (aparece en todas);
si tiene → solo en esas. Una **subcategoría** solo puede estar en ciudades donde su
**categoría** también esté disponible.

Cuando el SuperAdmin acota un giro a ciertas ciudades, el **filtro de Negocios** de la app
(`apps/web`) deja de mostrarlo a los usuarios de las demás ciudades (la página pasa la
ciudad activa del usuario como `?ciudadId=`).

**Onboarding y Business Studio** (donde el comerciante clasifica su negocio) muestran el
**catálogo completo** —no se filtra por ciudad— y el catálogo se **auto-puebla por demanda
real**: si un comercio se clasifica en una categoría/subcategoría **acotada** cuya ciudad no
estaba incluida, **se permite** y esa elección **habilita su ciudad** en la disponibilidad
(la agrega). Así nunca queda un negocio "invisible" en su propia ciudad. Las **globales** no
cambian. Esto evita reordenar el wizard (la categoría se elige antes que la ciudad) y respeta
la decisión: la demanda real manda. ⚠️ Implica que un negocio puede **re-habilitar** una ciudad
que el SuperAdmin había excluido.

### Tabla de permisos
| Acción | SuperAdmin | Gerente | Vendedor |
|---|---|---|---|
| Todo el módulo (ver, crear/editar, activar, disponibilidad por ciudad) | ✅ | — | — |

### Reglas y FAQ
- **¿No hay íconos?** No. La app web nunca renderizó el `icono` del catálogo (mostraba un
  placeholder), así que era data muerta. Se quitó de la UI, de los flujos de alta/edición del
  Panel, del ORM y de los services que lo serializaban (Categorías público, Negocios, Ofertas) y
  de los tipos (29 jun). La **columna `icono`** se elimina con `docs/migraciones/2026-06-29-drop-catalogo-icono.sql`
  (fase contract): correr **después** de desplegar el código que ya no la lee (DEV ya; PROD tras deploy).
- **¿Qué pasa si desactivo una categoría con negocios?** No se pierde nada: los negocios
  conservan su asignación; la categoría solo deja de aparecer en el catálogo público. Se
  puede reactivar.
- **¿Default global?** Sí. Crear una categoría/subcategoría la deja visible en todas las
  ciudades; se acota después con "Disponibilidad".

---

## Capa 2 — Apéndice técnico

### Modelo de datos
- `categorias_negocio` (id serial, nombre único, icono, orden, activa) — **preexistente**.
- `subcategorias_negocio` (id serial, categoria_id, nombre, orden, activa, icono;
  unique(categoria_id, nombre)) — **preexistente**.
- `categoria_ciudades` (categoria_id→categorias_negocio, ciudad_id→ciudades, PK compuesta) — **NUEVA**.
- `subcategoria_ciudades` (subcategoria_id→subcategorias_negocio, ciudad_id→ciudades, PK compuesta) — **NUEVA**.
- Migración: `docs/migraciones/2026-06-29-catalogo-categorias-por-ciudad.sql` (idempotente,
  corre Juan en dev+prod). Las tablas nacen vacías → todo el catálogo sigue global, sin backfill.

**Regla de visibilidad** (en `categorias.service.ts`): visible en ciudad C ⟺ `activa` Y
(`NOT EXISTS` filas en su tabla de disponibilidad **o** `EXISTS` una con C). La subcategoría
exige además que su categoría sea visible en C.

### Backend (`apps/api`)
| Archivo | Rol |
|---|---|
| `services/admin/categorias.service.ts` | Lectura: `listarCatalogoAdmin()` (catálogo anidado + ciudades + conteo de negocios). |
| `services/admin/categorias-acciones.service.ts` | Acciones: crear/editar/activar/reordenar/asignar-ciudades de categoría y subcategoría; auditoría; regla "subcategoría ⊆ categoría"; coherencia descendente al acotar una categoría. |
| `controllers/admin/categorias.controller.ts` · `routes/admin/categorias.routes.ts` | Endpoints (montados bajo el gate de superadmin en `routes/admin/index.ts`). |
| `validations/admin/categorias.schema.ts` | Zod de los bodies. |
| `services/categorias.service.ts` (público) | `GET /api/categorias` y `/:id/subcategorias` ahora aceptan `?ciudadId=` (opcional, retrocompatible). |
| `services/negocioManagement.service.ts` → `autohabilitarCatalogoPorCiudad(negocioId)` | **Auto-poblado por demanda**: 2 INSERT idempotentes (ON CONFLICT DO NOTHING) que habilitan las ciudades de las sucursales del negocio en las cat/sub **acotadas** que el negocio usa. Best-effort. Invocada por `finalizarOnboarding` y por `actualizarInfoGeneral` (Business Studio). |

**Endpoints admin** (solo super): `GET /admin/categorias` · `POST /admin/categorias` ·
`POST /admin/categorias/reordenar` · `PATCH /admin/categorias/:id` · `…/:id/activa` ·
`…/:id/ciudades` · `POST /admin/categorias/subcategorias` · `…/subcategorias/reordenar` ·
`PATCH /admin/categorias/subcategorias/:id` · `…/:id/activa` · `…/:id/ciudades`.

### Frontend del Panel (`apps/admin`)
| Archivo | Rol |
|---|---|
| `services/categoriasService.ts` · `hooks/queries/useCategoriasAdmin.ts` | React Query (catálogo + mutaciones). Keys en `config/queryKeys.ts` (`categorias`). |
| `components/categorias/SeccionCategorias.tsx` | Lista jerárquica + acciones por fila. |
| `components/categorias/DialogosCategorias.tsx` | Diálogos: categoría, subcategoría, disponibilidad por ciudad (multi-select + toggle global). |
| `data/menuPanel.ts` · `config/iconosPanel.tsx` (`Tags`) · `pages/PaginaPanel.tsx` | Registro del módulo en el menú (grupo Crecimiento, solo super) y el shell. |
| `components/auditoria/accionesAuditoria.tsx` | Humanización de las ~12 acciones nuevas (categoria_*/subcategoria_*). |

### Frontend público (`apps/web`)
- `hooks/queries/usePerfil.ts`: `usePerfilCategorias(ciudadId?)` / `usePerfilSubcategorias(catId, ciudadId?)` pasan `?ciudadId=`.
- `data/ciudadesPopulares.ts`: `resolverCiudadId(nombre, estado)` (nombre+estado de la ciudad activa → uuid del catálogo hidratado).
- `pages/private/negocios/PaginaNegocios.tsx`: resuelve la ciudad GPS y filtra el catálogo de giros del filtro.

### Verificación
- `tsc`/`build` de `apps/api`, `apps/admin` y `apps/web` en verde.
- Harness: `apps/api/scripts/probar-categorias-acciones.ts` (requiere la migración corrida).
- Falta verificación visual E2E a mano en el Panel.

### Referencias
- [`Ciudades.md`](Ciudades.md) — la plantilla que se calcó (estructura de plataforma, solo super).
- [`Panel_Admin.md`](Panel_Admin.md) · [`Tokens_Panel.md`](Tokens_Panel.md).
