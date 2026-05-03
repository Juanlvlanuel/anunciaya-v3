# Sprint 1 — MarketPlace: Backend Base

## Contexto

Vamos a iniciar la implementación de la sección **MarketPlace** del proyecto. Esta sección permite a los usuarios en modo Personal publicar y vender objetos físicos entre sí (P2P), con compra-venta 100% offline (la app NO procesa pagos).

## Antes de empezar

1. Lee completo el documento maestro del módulo:
   - `docs/arquitectura/MarketPlace.md`

2. Lee también:
   - `docs/CLAUDE.md` (reglas generales del proyecto)
   - `docs/estandares/REGLAS_ESTILO_CODIGO.md`
   - `docs/estandares/Sistema_Transformacion_snake_camelCase.md`

3. Revisa estos archivos del backend como referencia de patrones existentes:
   - `apps/api/src/services/articulos.service.ts` (patrón service para entidades con imágenes en R2)
   - `apps/api/src/controllers/articulos.controller.ts`
   - `apps/api/src/routes/articulos.routes.ts`
   - `apps/api/src/middleware/sucursal.middleware.ts` (patrón middleware de validación)

## Alcance del Sprint

Implementar la base de backend del módulo MarketPlace:

1. **Migración SQL** — crear tabla `articulos_marketplace` con todos los campos descritos en la sección §10 del documento maestro (Base de Datos).
2. **Modificaciones a tablas existentes:**
   - `chat_conv` — agregar `articulo_marketplace_id` y permitir `'marketplace'` y `'vendedor_marketplace'` en `contexto_tipo`.
   - `guardados` — permitir `'articulo_marketplace'` en `entity_type`.
   - `notificaciones` — permitir nuevos tipos `'marketplace_nuevo_mensaje'`, `'marketplace_proxima_expirar'`, `'marketplace_expirada'`.
3. **Schema Drizzle** correspondiente.
4. **Service** `marketplace.service.ts` con CRUD básico:
   - `crearArticulo(usuarioId, datos)`
   - `obtenerArticuloPorId(articuloId)` — público con `verificarTokenOpcional`
   - `obtenerFeed(ciudad, lat, lng)` — devuelve `{ recientes: [...], cercanos: [...] }`
   - `obtenerMisArticulos(usuarioId, paginacion)`
   - `actualizarArticulo(articuloId, usuarioId, datos)` — solo dueño puede editar
   - `cambiarEstado(articuloId, usuarioId, nuevoEstado)` — pausar/activar/vender/eliminar
   - `eliminarArticulo(articuloId, usuarioId)` — soft delete
   - `registrarVista(articuloId)` — incrementa `total_vistas`
5. **Validaciones Zod** según schema del documento (titulo, precio, condicion, descripcion, fotos, etc.).
6. **Middleware** `validarModoPersonal.ts` que retorna 403 si el usuario está en modo Comercial.
7. **Controller** `marketplace.controller.ts`.
8. **Routes** `marketplace.routes.ts` con los endpoints públicos y privados básicos del documento (sin búsqueda ni perfil del vendedor todavía).
9. **Integración con R2** para upload de imágenes (presigned URL con prefijo `marketplace/`), reusando el patrón de `r2.service.ts` existente.

## Lo que NO entra en este sprint

- Frontend (todo el FE viene en sprints siguientes)
- Filtros de moderación (palabras prohibidas) — viene en Sprint 4
- Endpoints de búsqueda — viene en Sprint 6
- Endpoint de perfil del vendedor — viene en Sprint 5
- Cron jobs (auto-pausar expiradas) — viene en Sprint 7
- Sistema de niveles del vendedor — viene en Sprint 8

## Reglas obligatorias

- Sigue **paso a paso**. Antes de codear nada, dame tu plan detallado por bloques pequeños y espera mi confirmación.
- TypeScript estricto, NUNCA usar `any`.
- Idioma: TODO en español (variables, funciones, comentarios, archivos).
- Patrón de respuestas snake_case → camelCase ya está configurado globalmente, no lo reimplementes.
- Sigue los patrones existentes en `articulos.service.ts` y módulos similares — NO inventes patrones nuevos.
- La migración SQL debe ir en `docs/migraciones/` con nombre claro y fecha.
- `data-testid` obligatorio en cualquier componente UI (no aplica este sprint pero recordatorio).

## Resultado esperado

Al final del sprint debe ser posible:

1. Hacer `POST /api/marketplace/articulos` con un payload válido y crear un artículo (probable con Postman).
2. Hacer `GET /api/marketplace/feed?ciudad=X&lat=Y&lng=Z` y obtener `{ recientes, cercanos }`.
3. Hacer `GET /api/marketplace/articulos/:id` y obtener el detalle.
4. Verificar que un usuario en modo Comercial recibe 403 al intentar publicar.
5. Marcar como vendida, pausar, reactivar y eliminar (soft) un artículo.

## Plan de trabajo

Espera mi confirmación entre cada bloque grande:

1. Plan detallado del sprint (sin codear)
2. Migración SQL + schema Drizzle
3. Service + validaciones Zod
4. Middleware `validarModoPersonal`
5. Controller + Routes
6. Endpoint de upload de imágenes (R2)
7. Pruebas manuales con Postman / curl

**Empieza con el plan detallado.**
