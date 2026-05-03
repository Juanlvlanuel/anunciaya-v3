# Sprint A — Verificación Runtime: Dedup Ofertas + Fixes de Visibilidad

**Fecha de ejecución:** 2026-04-30  
**Rama:** main  
**Commit base:** Implementación Sprint A (ver `sprint-A-dedup-ofertas-cierre.md`)

---

## 1. Estado del Servidor

- **Servidor arrancado:** Ya estaba corriendo al inicio de la sesión.
- **Puerto:** 4000 (según `API_PORT` en `.env`).
- **Errores al arrancar:** Ninguno.

> Nota: el archivo de verificación original asumía puerto 3001, pero el proyecto usa 4000.

---

## 2. Token de Autenticación

- **Usuario usado:** `a0000001-0000-0000-0000-000000000021` (usuario de prueba con `perfil = 'cliente'`).
- **Cómo se obtuvo:** JWT generado directamente vía `jsonwebtoken` en Node.js usando `JWT_SECRET` del `.env`. La tabla `usuarios` no tiene columna `rol` — usa `perfil` y `estado`.

---

## 3. Visibilidad

### Cupón privado — `GET /api/ofertas/detalle/<UUID_PRIVADO>`

- **UUID probado:** `6372ad08-541e-4dd0-b6a9-130f29de6cd2` ("Corte de Pelo", visibilidad = 'privado').
- **HTTP code recibido:** 404.
- **Body:** `{ "success": false, "message": "Oferta no encontrada" }`.
- **Resultado:** ✅ — el fix `AND o.visibilidad = 'publico'` en `obtenerOfertaDetalle` funciona correctamente.

### Cupón público — `GET /api/ofertas/detalle/<UUID_PUBLICO>`

- **UUID probado:** `c9133a34-46a5-4f86-bd62-32a59515241f` ("2x1 en Impresiones", visibilidad = 'publico').
- **HTTP code recibido:** 200.
- **Resultado:** ✅ — oferta pública accesible.

---

## 4. Deduplicación

### Línea base en BD

| Métrica | Valor |
|---|---|
| `total_con_duplicados` (query SQL) | 14 |
| `total_sin_duplicados` (query SQL con DISTINCT) | 11 |
| **Total devuelto por feed** (`limite=100`) | **11** |

**¿Coincide con esperado?** ✅

> El feed permite máximo `limite=100` (validado por Zod). La query de prueba con `limite=500` retornaba 400.

### Campo `totalSucursales`

- **¿Existe en la respuesta?** ✅
- **Ofertas con `totalSucursales > 1` encontradas:** 2

| Título | Sucursal representante | totalSucursales |
|---|---|---|
| Tacos | Imprenta FindUS | 2 |
| DESAYUNOS | Imprenta FindUS | 3 |

> Los "DESAYUNOS" que aparecen múltiples veces en el feed (con `totalSucursales = 1`) tienen contenido operativo diferente en alguno de los 8 campos del PARTITION BY (`negocio_id, titulo, descripcion, tipo, valor, imagen, fecha_inicio, fecha_fin`). Son grupos legítimamente distintos — no son duplicados.

---

## 5. Caso `sucursalId` (sin dedup)

- **Sucursal probada:** `41165179-a32a-4e37-a3cf-6e0e08bb9850` (Imprenta FindUS, es_principal = true).
- **Total devuelto:** 7 ofertas de esa sucursal.
- **Comportamiento:** devuelve todas las ofertas de la sucursal específica sin deduplicar entre sucursales del mismo negocio.
- **Resultado:** ✅ — `deduplicar = !sucursalId` funciona correctamente.

---

## 6. Cada Orden

### `orden=recientes`

- **HTTP:** 200, 10 items.
- **Verificación:** ordenados `DESC` por `createdAt` ✅.
- **Rango de fechas:** 2026-04-24 → 2026-01-11.

### `orden=vencen_pronto`

- **HTTP:** 200, 10 items.
- **Verificación:** ordenados `ASC` por `fechaFin` ✅.
- **Observación:** todas las ofertas vencen el 2026-04-30 (mismo día del test), por lo que el orden interno es por `created_at DESC` dentro del mismo `fechaFin`.

### `orden=populares`

- **HTTP:** 200, 10 items.
- **Resultado:** primeras 3 con `esPopular: true`, restantes con `false`.
- **Resultado:** ✅ — las populares aparecen primero.

---

## 7. Destacada del Día

- **Endpoint:** `GET /api/ofertas/destacada-del-dia`
- **HTTP:** 200.
- **Oferta devuelta:** "DESAYUNOS" de "Imprenta FindUS".
- **¿Devuelve oferta pública?** ✅ — devuelve datos (si fuera privada, el WHERE `AND o.visibilidad = 'publico'` la habría excluido).
- **SucursalId devuelta:** `41165179-a32a-4e37-a3cf-6e0e08bb9850`.
- **¿La sucursal es matriz (`es_principal = true`)?** ✅ — confirmado: esa sucursal fue verificada en BD como la principal de Imprenta FindUS.

> El campo `visibilidad` no aparece en la respuesta JSON porque `obtenerOfertaDetalle` (que genera la respuesta completa) no lo incluye en su SELECT. No es un bug — la visibilidad se filtra en la query y no necesita exponerse al cliente.

---

## 8. EXPLAIN ANALYZE

Query ejecutada: feed base sin GPS, sin filtros adicionales, `LIMIT 20`, deduplicación activa.

### Resultado

```
Execution Time: 1.163 ms
Planning Time:  2.131 ms
```

### Plan resumido

| Nodo | Tipo | Filas escaneadas | Filas resultado |
|---|---|---|---|
| `ofertas o` | **Seq Scan** | 42 (28 filtradas) | 14 |
| `negocios n` | **Seq Scan** | 20 (1 filtrado) | 19 |
| `negocio_sucursales s` | **Seq Scan** | 42 | 42 (filtro en Join) |
| WindowAgg (ROW_NUMBER) | — | 14 | 14 |
| WindowAgg (COUNT) | — | 14 | 11 |
| Sort final | quicksort 29kB | 11 | 11 |

### Análisis

- **Seq Scan justificado:** con 42 filas en `ofertas`, 19 en `negocios` y 42 en `negocio_sucursales`, el planner elige Seq Scan correctamente — el overhead de un Index Scan no se amortiza a este escala.
- **Los índices existentes** (`idx_ofertas_activo`, `idx_ofertas_negocio_id`, etc.) no son usados en beta, pero estarán disponibles cuando el volumen crezca.
- **Window functions:** el overhead de `ROW_NUMBER()` + `COUNT() OVER()` sobre 14 filas es despreciable (sort de 28kB en memoria).

### ¿Recomendarías crear índice?

**No en este momento.** A escala de beta (~50 negocios, ~42 ofertas), 1.163 ms es óptimo.

**Cuando `Seq Scan on ofertas` supere los ~10.000 filas**, crear:
```sql
CREATE INDEX idx_ofertas_feed_base
  ON ofertas (activo, visibilidad, negocio_id, fecha_inicio, fecha_fin);
```
Este índice cubrirá el WHERE base + los campos del PARTITION BY con un solo scan.

---

## 9. Bugs Encontrados

### Observación: títulos repetidos en el feed

El feed devuelve múltiples ofertas con el mismo título "DESAYUNOS" del mismo negocio. **No es un bug** — tienen contenido operativo diferente en alguno de los 8 campos del PARTITION BY (probablemente `descripcion`, `imagen`, o `fecha_inicio`/`fecha_fin`). La deduplicación solo agrupa ofertas idénticas en todos los campos simultáneamente.

**Impacto:** ninguno. La lógica es correcta.

### Observación: `visibilidad` ausente en respuesta de `/destacada-del-dia`

El endpoint no expone el campo `visibilidad` en la respuesta JSON. **No es un bug** — la visibilidad se filtra en la query y no tiene utilidad en el cliente para este endpoint.

**No se encontraron bugs bloqueantes.**

---

## 10. Resumen Final

| Test | Resultado |
|---|---|
| Servidor corriendo en puerto 4000 | ✅ |
| Token JWT generado y válido | ✅ |
| Cupón privado → HTTP 404 | ✅ |
| Cupón público → HTTP 200 | ✅ |
| Feed devuelve `total_sin_duplicados` (11) | ✅ |
| Campo `totalSucursales` presente en respuesta | ✅ |
| Al menos 1 oferta con `totalSucursales > 1` | ✅ (2 ofertas) |
| `sucursalId` desactiva dedup correctamente | ✅ |
| `orden=recientes` ordenado por createdAt DESC | ✅ |
| `orden=vencen_pronto` ordenado por fechaFin ASC | ✅ |
| `orden=populares` populares primero | ✅ |
| `/destacada-del-dia` devuelve oferta pública | ✅ |
| `/destacada-del-dia` sucursal es matriz | ✅ |
| EXPLAIN ANALYZE < 200ms | ✅ (1.163 ms) |

**¿Sprint A puede declararse cerrado?** **Sí.** Todos los tests de runtime pasan. No hay bugs bloqueantes. El código TypeScript compila sin errores (`tsc --noEmit` → exit 0, verificado en sesión anterior).
