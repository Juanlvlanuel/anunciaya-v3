# 🧹 Mantenimiento R2 — Recolector de Basura de Archivos Huérfanos

**Última actualización:** 18 Abril 2026
**Estado:** ✅ Operacional
**Patrón técnico:** recolector de basura con algoritmo mark-and-sweep + reference counting + reconciliación cross-ambiente

---

## Qué problema resuelve

Con el tiempo, el bucket R2 acumula archivos huérfanos: imágenes subidas por el frontend pero nunca referenciadas en BD (uploads abandonados), imágenes anteriores al reemplazo (antes de los fixes de abril 2026), archivos dejados por eliminaciones incompletas, etc.

Borrar manualmente es tedioso y riesgoso (es fácil borrar un archivo que sí se usa). Esta herramienta automatiza el proceso con **0% de falsos positivos** como garantía.

## Patrón técnico — Recolector de Basura

El sistema implementa un **recolector de basura (garbage collector) de archivos huérfanos** — mismo concepto que el GC de memoria en lenguajes como JavaScript o Java, pero aplicado al storage R2 en vez de a RAM.

**Algoritmo: Mark-and-Sweep**
1. **Mark (marcar)** — `listarUrlsEnUso()` recorre el registry y marca como "vivos" todos los archivos referenciados por algún registro de BD
2. **Sweep (barrer)** — `ejecutarLimpiezaR2()` compara el universo R2 contra los marcados y elimina los no marcados (huérfanos)

**Extensiones sobre el algoritmo base:**
- **Reference counting**: antes de borrar un archivo verifica si otros registros lo referencian (previene el bug de URLs compartidas entre ofertas/artículos clonados entre sucursales)
- **Reconciliación cross-ambiente**: consulta múltiples BDs (local + producción) antes de decidir que un archivo es huérfano — necesario cuando el bucket R2 es compartido entre ambientes

Análogos conocidos en otros ecosistemas: `django-cleanup` (Django), `purge_unattached` (Rails ActiveStorage), `git lfs prune` (Git LFS), `npm prune` (npm). Todos son recolectores de basura de recursos huérfanos con variaciones del mismo patrón.

---

## Arquitectura

```
apps/api/src/
├── utils/imageRegistry.ts                      → FUENTE ÚNICA DE VERDAD (transversal)
├── services/
│   ├── r2.service.ts                            → + listarObjetosR2() (infra compartida)
│   └── admin/
│       └── mantenimiento.service.ts             → lógica del reconcile
├── controllers/
│   └── admin/
│       └── mantenimiento.controller.ts          → endpoints de la sección
├── routes/
│   └── admin/
│       ├── index.ts                             → agregador + gate requireAdminSecret
│       └── mantenimiento.routes.ts              → rutas /api/admin/mantenimiento/*
└── middleware/
    └── adminSecret.middleware.ts                → protección x-admin-secret (transversal al admin)
```

> **Convención de carpetas**: el Panel Admin usa sub-carpeta `admin/` dentro de `controllers/`, `services/` y `routes/` para aislar la lógica del dominio admin del resto del proyecto. Los archivos transversales (middleware, utils, r2.service) se quedan en sus carpetas raíz porque los consumen también otros contextos.

### Image Registry

`apps/api/src/utils/imageRegistry.ts` es la lista EXHAUSTIVA de columnas de BD que guardan URLs de imágenes. Es la fuente única de verdad que consume el reconcile.

**Regla de oro**: al agregar una columna nueva que guarde URL de imagen, AGRÉGALA al registry. Si no está en el registry, el reconcile la tratará como "no en uso" y podría borrar el archivo físico.

Cobertura actual (17 campos): `usuarios.avatar_url`, `negocios.logo_url`, `negocio_sucursales.foto_perfil`, `negocio_sucursales.portada_url`, `negocio_galeria.url`, `articulos.imagen_principal`, `articulos.imagenes_adicionales` (array), `pedido_articulos.imagen_url`, `ofertas.imagen`, `recompensas.imagen_url`, `empleados.foto_url`, `puntos_transacciones.foto_ticket_url`, `transacciones_evidencia.url_imagen`, `bolsa_trabajo.portafolio_url`, `notificaciones.actor_imagen_url`, `chat_mensajes.contenido` (text-scan-urls), `marketplace.imagenes` (text-scan-urls sobre JSONB).

No hay campos pendientes — scan exhaustivo del schema. En Fase D (28 Abril 2026) se eliminaron del registry `dinamicas.imagen_url` y `dinamica_premios.imagen_url` al hacer DROP de las tablas dinamicas (visión v3 — Dinámicas descartadas, ver `VISION_ESTRATEGICA_AnunciaYA.md` §5.1).

### Tipos de campo soportados

- **`url`** — columna `varchar`/`text` con una URL única
- **`array`** — columna `text[]` con múltiples URLs (ej. `articulos.imagenes_adicionales`)
- **`text-scan-urls`** — columna texto/varchar **o JSONB** donde pueden aparecer URLs embebidas. Se extraen con regex que matchea el dominio R2 configurado en `env.R2_PUBLIC_URL`. Hace cast `::text` automático, así que funciona también con columnas JSONB de estructura variable (ej. `marketplace.imagenes`). Casos de uso: `chat_mensajes.contenido` (URL directa o JSON con imagen) y `marketplace.imagenes` (JSONB)

### Carpetas protegidas

`CARPETAS_PROTEGIDAS` en `imageRegistry.ts` lista carpetas de R2 que el reconcile **nunca toca**, aunque los archivos no aparezcan referenciados en BD. Son assets del equipo (no de usuarios):

- **`brand/`** — logos y assets de la marca AnunciaYA subidos manualmente

Al agregar nuevos assets estáticos del equipo en R2, listar la carpeta aquí.

---

## Cómo usarlo

### Variable de entorno

Agrega a `.env`:

```bash
ADMIN_SECRET=<string aleatorio de 16+ caracteres>
```

Sin esa variable, todos los endpoints `/api/admin/*` responden `503`.

### Endpoint de reporte (dry-run seguro)

```
GET /api/admin/mantenimiento/r2-reconcile
Headers: x-admin-secret: <ADMIN_SECRET>
```

Query params opcionales:
- `carpetas=portadas,logos` → solo inspecciona esas carpetas
- `gracia=10` → aumenta periodo de gracia a 10 minutos

**Ejemplo con curl:**
```bash
curl -H "x-admin-secret: TU_SECRETO" \
  http://localhost:3000/api/admin/mantenimiento/r2-reconcile
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "urlsEnBD": 89,
      "objetosEnR2": 94,
      "huerfanas": 5,
      "rotas": 0,
      "ignoradasPorGracia": 0
    },
    "porCarpeta": {
      "portadas": { "enR2": 8, "enBD": 6, "huerfanas": 2 },
      "logos": { "enR2": 3, "enBD": 3, "huerfanas": 0 }
    },
    "huerfanas": [
      {
        "url": "https://pub-xxx.r2.dev/portadas/1776465020181-261b86d7.webp",
        "key": "portadas/1776465020181-261b86d7.webp",
        "carpeta": "portadas",
        "size": 49152,
        "lastModified": "2026-04-17T15:30:19.000Z"
      }
    ],
    "rotas": [],
    "ignoradasPorGracia": []
  }
}
```

### Endpoint de auditoría (histórico de ejecuciones)

```
GET /api/admin/mantenimiento/r2-reconcile/log
Headers: x-admin-secret: <ADMIN_SECRET>
```

Query params opcionales:
- `limit`: cantidad de filas (default 50, máx 500)
- `soloEjecuciones=true`: filtra solo ejecuciones reales (omite los dry-runs)

Devuelve las últimas N ejecuciones con detalle de qué se borró, quién, cuándo. Usa la tabla `r2_reconcile_log` (migración: `docs/migraciones/2026-04-17-r2-reconcile-log.sql`). Si la tabla no existe aún, responde 503 con instrucción para crearla.

### Endpoint de ejecución (con confirmación explícita)

```
POST /api/admin/mantenimiento/r2-reconcile/ejecutar
Headers:
  x-admin-secret: <ADMIN_SECRET>
  Content-Type: application/json
Body:
  {
    "confirmacion": "SI_BORRAR_HUERFANAS",
    "carpetas": ["portadas"],      // opcional, limita el scope
    "gracia": 5,                    // opcional, minutos
    "maxBorrados": 500              // opcional, tope de seguridad
  }
```

Sin el `confirmacion` literal, responde `400`.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "dryRun": false,
    "huerfanasDetectadas": 5,
    "eliminadas": 5,
    "fallidas": 0,
    "ignoradasPorGracia": 0,
    "detalleEliminaciones": [
      { "url": "...", "ok": true },
      ...
    ]
  }
}
```

---

## Auditoría

La tabla `r2_reconcile_log` registra **solo las ejecuciones** del endpoint POST (`/r2-reconcile/ejecutar`), tanto dry-runs explícitos como cleanups reales. El endpoint GET (reporte de lectura) no crea filas — así el log queda libre de ruido y refleja solo acciones.

Columnas:

| Campo | Descripción |
|-------|-------------|
| `id` | UUID único de la ejecución |
| `ejecutado_at` | Timestamp |
| `ejecutado_por` | Identificador (hoy: `'admin-secret'`; futuro: user_id del admin) |
| `dry_run` | `true` para reportes, `false` para limpiezas reales |
| `carpetas` | Array de carpetas si se filtró, `null` si todas |
| `huerfanas_detectadas` | Count |
| `eliminadas`, `fallidas`, `ignoradas_por_gracia` | Counts |
| `detalle` | JSONB `[{ url, ok, error? }]` con las eliminaciones |

Queries útiles:

```sql
-- Últimas 20 ejecuciones (dry-run y reales)
SELECT ejecutado_at, dry_run, eliminadas, fallidas
FROM r2_reconcile_log
ORDER BY ejecutado_at DESC LIMIT 20;

-- Buscar cuándo se borró una URL específica
SELECT ejecutado_at, ejecutado_por
FROM r2_reconcile_log
WHERE dry_run = false
  AND detalle @> '[{"url": "https://pub-xxx.r2.dev/ruta/archivo.webp"}]'::jsonb;

-- Total de archivos borrados en los últimos 30 días
SELECT SUM(eliminadas) AS total
FROM r2_reconcile_log
WHERE dry_run = false
  AND ejecutado_at > NOW() - INTERVAL '30 days';
```

---

## Garantías de seguridad (0% falsos positivos)

1. **Registry exhaustivo** — toda URL referenciada por cualquier tabla aparece en el registry y se considera "en uso"
2. **Multi-BD cross-ambiente** — `listarUrlsEnUso` consulta tanto la BD local como la de producción cuando ambas están accesibles. Solo los archivos que NINGUNA BD referencia se consideran huérfanos. Esto es crítico cuando el bucket R2 es compartido entre dev y prod (ver sección siguiente)
3. **Dry-run por defecto** — `ejecutarLimpiezaR2({ dryRun: true })` solo reporta
4. **Re-verificación atómica antes de borrar** — entre el reporte y la ejecución, el servicio vuelve a consultar BD (también multi-BD). Si una URL apareció como referenciada en ese intervalo, se descarta del borrado
5. **Periodo de gracia** — archivos subidos en los últimos 5 minutos (configurable) no se borran aunque no aparezcan en BD. Cubre el caso de uploads en progreso donde el archivo ya está en R2 pero aún no se commiteó el INSERT
6. **Tope de borrados por ejecución** — máximo 500 por default. Previene cascadas catastróficas
7. **Confirmación explícita** — el endpoint de ejecución exige el string literal `SI_BORRAR_HUERFANAS`

---

## Multi-BD cross-ambiente (para bucket R2 compartido)

### Problema

Si el bucket R2 es el mismo para desarrollo y producción (mismas credenciales `R2_BUCKET_NAME`, `R2_PUBLIC_URL`), ejecutar el reconcile consultando solo una BD es inseguro:

- Ejecutar reconcile desde **local** con solo BD local → considera huérfanos archivos subidos desde **producción** que la BD local nunca registró → al borrar, rompe producción
- Ejecutar desde **producción** con solo BD de prod → considera huérfanos archivos de desarrollo que prod no conoce → rompe local

### Solución: consultar todas las BDs accesibles

El módulo `apps/api/src/db/reconcileConnections.ts` arma un array de conexiones:
- La **principal** (lo que define `DB_ENVIRONMENT` en `.env`)
- La **secundaria** si está disponible (ej. prod remota vía `DATABASE_URL_PRODUCTION`)

`listarUrlsEnUso` y `detectarUrlsRotas` iteran sobre todas y unen los resultados. Solo los archivos que NADA referencia en NINGÚN ambiente se marcan como huérfanos.

### Comportamiento por ambiente

| Entorno | Principal | Secundaria | Cobertura |
|---------|-----------|------------|-----------|
| Dev local (`DB_ENVIRONMENT=local`) con `DATABASE_URL_PRODUCTION` configurada | local | producción | ✅ Cross-ambiente |
| Dev local apuntando a prod (`DB_ENVIRONMENT=production`) | producción | local | ✅ Cross-ambiente |
| Producción (Render/VPS) | producción | — (no tiene acceso a local) | ⚠️ Solo prod |

**Consecuencia práctica**: cuando R2 es compartido, **el cleanup seguro DEBE ejecutarse desde el entorno local** (donde ambas BDs son accesibles). El log de auditoría (`r2_reconcile_log`) se escribe en la BD principal del ambiente donde se ejecutó.

### Logs

Al arrancar el backend con conexión secundaria activa aparece:
```
[reconcile] Conexión secundaria inicializada para consultas cross-ambiente
```

Y al ejecutar el reconcile:
```
[reconcile/local] Error leyendo X.Y:     ← si algo falla en principal
[reconcile/production] Error leyendo X.Y: ← si algo falla en secundaria
```

Las URLs rotas incluyen la etiqueta del ambiente donde se detectaron: `"local:articulos.imagen_principal"`.

### Migración futura

Cuando el proyecto tenga usuarios reales y cargas significativas, lo recomendado es separar los buckets R2 por ambiente (cada uno con sus propias credenciales). Con buckets separados, el reconcile multi-BD ya no es estrictamente necesario pero sigue sirviendo como red de seguridad.

---

## Rotas (URL en BD sin archivo en R2)

El reporte también detecta el caso inverso: URLs en BD que apuntan a archivos R2 que ya no existen (por borrado manual accidental, fallos de upload, etc.). El campo `rotas` del reporte las lista con su ubicación (`tabla.columna`).

**No se auto-resuelven** — requieren decisión manual (re-subir el archivo, poner null, etc.).

---

## Protección temporal vs Panel Admin futuro

**Hoy:** middleware `requireAdminSecret` valida header `x-admin-secret`. Sirve para correr la herramienta desde Postman/cURL sin tener cuentas admin.

**Futuro Panel Admin:** cuando existan cuentas admin con JWT propio, reemplazar `router.use(requireAdminSecret)` en `routes/admin/index.ts` por el middleware de auth admin. Los controllers, el servicio y los sub-routers NO cambian. El Panel Admin consume los mismos endpoints y muestra los datos en una UI.

### Agregar secciones nuevas al Panel Admin

Cuando aparezca una sección nueva (ej. "Gestión de Negocios"):

1. Crear `apps/api/src/services/admin/negocios.service.ts`
2. Crear `apps/api/src/controllers/admin/negocios.controller.ts`
3. Crear `apps/api/src/routes/admin/negocios.routes.ts`
4. Registrar en `apps/api/src/routes/admin/index.ts`: `router.use('/negocios', negociosRoutes);`

El middleware `requireAdminSecret` ya cubre automáticamente la nueva sección.

---

## Uso recomendado

- **Ad-hoc**: correr el reporte (GET) cuando se sospeche un leak
- **Antes de ejecutar**: revisar las URLs huérfanas y confirmar que ninguna se ve sospechosa
- **Periódico**: configurar un cron job semanal que corra el dry-run y alerte si hay >X huérfanas
- **Post-deploy**: después de migrations que muevan URLs, correr el reporte

---

## Checklist para agregar un campo de imagen nuevo

Cuando agregues una columna nueva que guarde una URL de imagen:

1. [ ] Agregar la fila correspondiente en `apps/api/src/utils/imageRegistry.ts`
2. [ ] Definir `tipo` correctamente (`url` | `array` | `jsonb-array-url`)
3. [ ] Incluir una `descripcion` clara
4. [ ] Correr el reporte después del deploy para verificar que el count "urlsEnBD" suba con los nuevos registros
