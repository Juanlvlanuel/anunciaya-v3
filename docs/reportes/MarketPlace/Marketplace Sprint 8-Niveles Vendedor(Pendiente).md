# Plan + Avance — Sprint 8 MarketPlace: Sistema de Niveles del Vendedor

> **Fecha inicio:** 04 Mayo 2026
> **Última actualización:** 04 Mayo 2026
> **Tipo:** Plan de implementación con seguimiento de avance
> **Sprint:** MarketPlace v1 · Sprint 8/8 — **OPCIONAL para v1**
> **Prompt origen:** `docs/prompts Marketplace/Sprint-8-Niveles-Vendedor.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md` (§8 Sistema de Niveles)
> **Sprints anteriores:** 1–7 todos cerrados, módulo v1 lanzable sin este sprint.
>
> **Estado actual:** 🟡 Plan presentado — codeo en progreso

---

## Avance por bloque

| # | Bloque | Estado |
|---|---|---|
| 1 | BD migration + schema Drizzle | ⏸ Pendiente |
| 2 | Service `marketplace-niveles.ts` + tests unitarios | ⏸ Pendiente |
| 3 | Cron diario 03:00 UTC | ⏸ Pendiente |
| 4 | Endpoints (marcar-vendida, confirmar-compra, nivel) | ⏸ Pendiente |
| 5 | Mensaje sistema en ChatYA (backend + frontend) | ⏸ Pendiente |
| 6 | Componentes `BadgeNivelVendedor` + `TooltipNivelVendedor` | ⏸ Pendiente |
| 7 | Integración en CardArticulo / Detalle / Perfil | ⏸ Pendiente |
| 8 | Boost en buscador | ⏸ Pendiente |
| 9 | QA + cierre del módulo MarketPlace v1 | ⏸ Pendiente |

---

## Contexto

Sistema de reputación automática del vendedor basado en comportamiento real (NO reseñas). 5 niveles descriptivos (0–4), recálculo diario con cron, sin penalización por bajada.

---

## Hallazgos previos del codebase

1. **`cambiarEstado` (Sprint 1)** ya soporta `'vendida'`, pero no auto-detecta comprador ni crea mensaje. El nuevo endpoint `marcar-vendida` extiende esa lógica.
2. **Cron pattern** (Sprints 1, 5, 7) — replicar.
3. **Datos del Sprint 5** (`obtenerVendedorPorId`) ya calculan tiempo de respuesta — reuso en `calcularNivel`.
4. **Buscador del Sprint 6** se extenderá con boost por nivel en `ordenar='recientes'`.

---

## Decisiones predefinidas

1. **Cron diario 03:00 UTC** (madrugada).
2. **Tests unitarios** de `calcularNivel` con 5 casos límite.
3. **Boost en búsqueda:** weight en `ORDER BY` solo para `ordenar='recientes'`.
4. **Auto-detección comprador:** SELECT por más mensajes enviados en la conversación con `contexto_referencia_id = articuloId`.
5. **Mensaje sistema en ChatYA:** `tipo='sistema'` + `contenido` JSON. Frontend detecta `JSON.parse(contenido).tipo === 'confirmacion_compra_marketplace'` y renderiza botones interactivos.

---

## Bloques

### Bloque 1 — BD migration

`docs/migraciones/2026-05-04-marketplace-niveles.sql`

```sql
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS nivel_marketplace SMALLINT NOT NULL DEFAULT 0
        CHECK (nivel_marketplace BETWEEN 0 AND 4),
    ADD COLUMN IF NOT EXISTS nivel_marketplace_actualizado_at TIMESTAMPTZ;

ALTER TABLE articulos_marketplace
    ADD COLUMN IF NOT EXISTS venta_confirmada_por_comprador BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS comprador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
```

Schema Drizzle correspondiente.

### Bloque 2 — Service `marketplace-niveles.ts` + tests

`apps/api/src/services/marketplace/niveles.ts`:
- `calcularNivel(usuarioId)` — evalúa Nivel 4→3→2→1→0, devuelve el primero que cumpla.
- `actualizarNivelUsuario(usuarioId)` — calcula + UPDATE + notificación push si subió.
- Helper `obtenerDatosNivel(usuarioId)` — query agregada con todos los datos en una sola pasada.

Tests: 5 casos límite (un usuario por nivel) + edge cases (subida/bajada).

### Bloque 3 — Cron diario

`apps/api/src/cron/marketplace-niveles.cron.ts`:
- Schedule diario 03:00 UTC.
- SELECT usuarios con ≥1 artículo en marketplace en últimos 30d.
- Itera y llama `actualizarNivelUsuario`.

### Bloque 4 — Endpoints

3 endpoints nuevos:
- `POST /articulos/:id/marcar-vendida` (con/sin compradorId)
- `POST /articulos/:id/confirmar-compra` (solo el comprador detectado)
- `GET /usuarios/:id/nivel`

### Bloque 5 — Mensaje sistema en ChatYA

Backend: al marcar vendida con `comprador_id`, INSERT en `chat_mensajes` con `tipo='sistema'` y `contenido` JSON.

Frontend: `BurbujaMensaje.tsx` detecta el tipo y renderiza un mini-modal con 2 botones que llaman al endpoint de confirmación.

### Bloque 6 — Componentes UI

- `BadgeNivelVendedor.tsx` con 3 tamaños y 4 niveles visibles (0 no renderiza).
- `TooltipNivelVendedor.tsx` con datos reales del vendedor + botón "Ver perfil completo".

### Bloque 7 — Integración

- `CardArticulo`: badge solo en niveles 3-4 (esquina inferior izquierda imagen).
- `PaginaArticuloMarketplace`: badge en CardVendedor desde nivel 1.
- `PaginaPerfilVendedor`: badge grande al lado del nombre.

### Bloque 8 — Boost en buscador

Modificar `buscarArticulos` (Sprint 6) — agregar score basado en nivel cuando `ordenar='recientes'`:
```sql
ORDER BY (
    CASE u.nivel_marketplace
        WHEN 4 THEN 1.4
        WHEN 3 THEN 1.2
        ELSE 1.0
    END
) DESC, a.created_at DESC
```

### Bloque 9 — QA + cierre

- Migración aplicada en BD local.
- Test cron con seed data.
- Verificación visual de badges + tooltips.
- Mensaje de commit final que cierra el módulo MarketPlace v1 completo.

---

## Próximo paso

Después de Sprint 8: **MarketPlace v1 100% completo**. Los Sprints 9+ (si los hay) son features post-beta basados en feedback real.
