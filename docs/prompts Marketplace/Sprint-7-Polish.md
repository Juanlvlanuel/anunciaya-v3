# Sprint 7 — MarketPlace: Polish + Cron Jobs + Sistema de Compartir

## Contexto

El módulo MarketPlace ya está funcional para comprador y vendedor. Este sprint cierra los detalles que faltan para considerarlo **listo para producción**:

- Cron jobs de auto-expiración
- Notificaciones en `PanelNotificaciones`
- Página pública para enlaces compartidos
- Activación de tab "Artículos" en Mis Guardados
- Endpoint para que `/mis-publicaciones` consuma los artículos del usuario
- Tests E2E

## Antes de empezar

1. Lee del documento maestro:
   - `docs/arquitectura/MarketPlace.md` — sección §11 Integraciones con Otros Módulos
   - §6 Estados del Artículo (auto-pausa por TTL)
2. Revisa estos archivos como referencia:
   - `apps/api/src/cron/scanya-cierre-auto.cron.ts` (o similar) — patrón de cron
   - `apps/web/src/pages/public/PaginaArticuloPublico.tsx` — patrón de página pública con OG tags
   - `apps/web/src/hooks/useOpenGraph.ts` — hook para OG tags
   - `apps/web/src/pages/private/guardados/PaginaGuardados.tsx` — tab "Artículos" (que está como "Próximamente")
   - `apps/api/src/services/notificaciones.service.ts` — patrón para crear notificaciones

## Alcance del Sprint

### Backend

1. **Cron de auto-pausar expirados** en `apps/api/src/cron/marketplace-expiracion.cron.ts`:
   - Corre cada hora (puedes empezar con cada 6 horas)
   - Marca como `pausada` los artículos con `expira_at < NOW()` y `estado='activa'`
   - Crea notificación tipo `marketplace_expirada` para el vendedor con mensaje: "Tu publicación '[título]' expiró. Reactívala con 1 click si sigue disponible."
   - Registra log de cuántos artículos auto-pausó

2. **Cron de notificar próxima expiración** (puede ir en el mismo archivo):
   - Corre 1 vez al día (madrugada)
   - Detecta artículos con `expira_at` entre hoy+3d y hoy+3d+1h, estado `activa`
   - Crea notificación tipo `marketplace_proxima_expirar` con mensaje: "Tu publicación '[título]' expira en 3 días. ¿La extendemos?"
   - Solo crea la notificación 1 vez por artículo (idempotente — si ya existe la notificación para ese artículo, no la duplicar)

3. **Endpoint** `POST /api/marketplace/articulos/:id/reactivar`:
   - Solo el dueño puede reactivar
   - Solo si está en estado `pausada`
   - Extiende `expira_at` a `NOW() + 30 days`
   - Cambia estado a `activa`
   - notificar.exito en frontend al usar este endpoint

4. **Endpoint** `GET /api/marketplace/mis-articulos`:
   - Devuelve todos los artículos del usuario actual con paginación
   - Incluye filtro opcional por estado: `?estado=activa|pausada|vendida`
   - Para que `/mis-publicaciones` (página global, fuera de este módulo) lo consuma cuando se construya

5. **Página pública para link compartido** `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx`:
   - Ruta: `/p/articulo-marketplace/:articuloId`
   - Sin auth requerida
   - Layout 2 columnas similar a `PaginaArticuloPublico` existente
   - OG tags con `useOpenGraph`: foto + título + precio (formato `$11,910 · Bicicleta vintage`)
   - Botón "Enviar mensaje al vendedor" → si NO está logueado → muestra `ModalAuthRequerido` con redirect a la misma URL
   - Botón "WhatsApp" funciona sin login (es link directo)
   - Footer con CTA "Descubre más en AnunciaYA →"

### Frontend

6. **Activar tab "Artículos"** en `PaginaGuardados.tsx`:
   - Reemplazar el placeholder "Próximamente disponible"
   - Reusa el patrón de las otras tabs (Ofertas, Negocios)
   - Renderiza `CardArticulo` con datos de los artículos guardados
   - Quita el filtro `tipo=articulo` del placeholder y conecta con el endpoint real
   - Hook nuevo `useGuardadosArticulosMarketplace` o extender el existente

7. **Notificaciones en `PanelNotificaciones`**:
   - Verificar que las notificaciones nuevas (`marketplace_expirada`, `marketplace_proxima_expirar`) se rendericen correctamente
   - Click en notificación → navega al artículo correspondiente o a la lista de mis publicaciones

8. **Botón "Reactivar" en Mis Publicaciones (si ya existe esa página)** o en el detalle del artículo cuando está pausado:
   - Aparece solo al dueño
   - Llama a `POST /:id/reactivar`
   - Refresca el feed con React Query invalidate

### QA y Tests

9. **Tests E2E** con Playwright:
   - Flujo del comprador completo: feed → buscar → ver detalle → guardar → enviar mensaje
   - Flujo del vendedor completo: publicar artículo (3 pasos) → editar → pausar → marcar vendido
   - Test de modo Comercial: verificar 403 en endpoints + redirect en frontend
   - Test de moderación: intentar publicar con palabra prohibida y verificar rechazo

## Lo que NO entra en este sprint

- Sistema de niveles del vendedor (Sprint 8)
- Página `/mis-publicaciones` con tabs por tipo (otro documento, otro módulo)
- Búsquedas guardadas con alerta (futuro)

## Reglas obligatorias

- Paso a paso, plan primero.
- TypeScript estricto, NUNCA `any`.
- Tailwind v4: `lg:` y `2xl:` con `2xl:` siempre.
- Idioma: español.
- `data-testid` obligatorio en interactivos.
- Cron jobs idempotentes — correr 2 veces no debe duplicar notificaciones.
- La página pública debe verse bien sin login y con OG tags correctos para preview en redes.

## Resultado esperado

1. El cron auto-pausa correctamente los artículos vencidos y notifica al vendedor.
2. 3 días antes de expirar, el vendedor recibe notificación.
3. El botón "Reactivar" extiende 30 días más.
4. La tab "Artículos" en Mis Guardados muestra los artículos del MarketPlace guardados.
5. El link `/p/articulo-marketplace/:id` se ve bien sin login y se puede compartir en redes con preview correcto.
6. Tests E2E pasan al menos los flujos felices completos.
7. El módulo está listo para considerarse v1.

## Plan de trabajo

Espera confirmación entre bloques:

1. Plan detallado
2. Cron jobs (expiración + próxima expiración) con tests de idempotencia
3. Endpoint reactivar + endpoint mis-articulos
4. Notificaciones tipos nuevos + integración con PanelNotificaciones
5. Página pública para compartir con OG tags
6. Activar tab "Artículos" en Mis Guardados
7. Tests E2E (al menos flujos felices)
8. QA final del módulo completo

**Empieza con el plan.**
