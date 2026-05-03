# Sprint 8 — MarketPlace: Sistema de Niveles del Vendedor

## ⚠️ Sprint Opcional

Este sprint es **opcional para v1**. El módulo MarketPlace funciona perfecto sin él.

Recomendación: lanzar primero los Sprints 1-7 con beta testers, recoger feedback de uso real, y SOLO entonces implementar este sprint con datos reales que validen los umbrales de cada nivel.

Si decides implementarlo de entrada, los umbrales (5 ventas, 10 ventas, etc.) son sugerencias que podrían ajustarse con la primera data real.

## Contexto

Construimos un **sistema automático de reputación** para vendedores basado en comportamiento real (no en reseñas). Mide datos que el sistema ya captura por su cuenta: antigüedad, tiempo de respuesta, ventas auto-reportadas, ventas confirmadas por compradores, tasa de respuesta.

Inspirado en MercadoLíder de Mercado Libre pero adaptado a un modelo P2P offline donde NO hay reclamos formales ni despachos.

## Antes de empezar

1. Lee la sección completa del documento maestro:
   - `docs/arquitectura/MarketPlace.md` — sección §8 Sistema de Niveles del Vendedor
2. Especialmente:
   - Los 5 niveles y sus requisitos
   - Confirmación de compra sin fricción
   - Visibilidad en UI por nivel
   - Tooltips explicativos
   - Decisiones explícitas (por qué NO calificación numérica, por qué NO penalizar bajadas)
3. Revisa estos archivos como referencia:
   - `apps/api/src/cron/scanya-cierre-auto.cron.ts` — patrón de cron diario
   - Tablas existentes para mensajes de sistema en ChatYA (mensaje con botones)
   - `apps/web/src/components/marketplace/CardArticulo.tsx` (Sprint 2) — para sumar badge

## Alcance del Sprint

### Backend

1. **Migración SQL:**
   ```sql
   ALTER TABLE usuarios 
     ADD COLUMN nivel_marketplace SMALLINT NOT NULL DEFAULT 0
       CHECK (nivel_marketplace BETWEEN 0 AND 4),
     ADD COLUMN nivel_marketplace_actualizado_at TIMESTAMPTZ;

   ALTER TABLE articulos_marketplace 
     ADD COLUMN venta_confirmada_por_comprador BOOLEAN DEFAULT false,
     ADD COLUMN comprador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
   ```

2. **Service** `marketplace-niveles.service.ts`:
   - Función `calcularNivel(usuarioId)`:
     - Obtiene los datos: antigüedad, tiempo de respuesta promedio (30 días), tasa de respuesta (30 días), ventas auto-reportadas, ventas confirmadas, perfil completo (avatar + nombre)
     - Evalúa de mayor a menor (Nivel 4 → 3 → 2 → 1) y devuelve el primero que cumpla todos los requisitos. Si ninguno → 0.
   - Función `actualizarNivelUsuario(usuarioId)`:
     - Calcula nivel actual
     - Compara con `nivel_marketplace` existente
     - Si subió → notificación push: "¡Subiste a nivel [Nombre]! Tus publicaciones tendrán más visibilidad."
     - Si bajó → solo actualiza, NO notifica
     - Actualiza `nivel_marketplace` y `nivel_marketplace_actualizado_at`

3. **Cron job** `marketplace-niveles.cron.ts`:
   - Corre 1 vez al día (madrugada, ej: 3am)
   - Itera todos los usuarios con al menos 1 artículo en MarketPlace en últimos 30 días
   - Llama `actualizarNivelUsuario(usuarioId)` para cada uno
   - Registra log de cuántos subieron / bajaron / sin cambio

4. **Endpoints:**

   - `POST /api/marketplace/articulos/:id/marcar-vendida`
     - Recibe opcionalmente `compradorId` en el body
     - Si no se envía: el sistema auto-detecta al comprador (usuario con más mensajes en la conversación de ese artículo)
     - Cambia estado a `vendida`
     - Si tiene `comprador_id` válido → dispara mensaje automático de confirmación en ChatYA al comprador (ver §5)

   - `POST /api/marketplace/articulos/:id/confirmar-compra`
     - Body: `{ confirma: boolean }`
     - Solo el comprador detectado puede llamar este endpoint
     - Si `confirma=true` → marca `venta_confirmada_por_comprador = true`
     - Si `confirma=false` → solo registra que dijo "no" pero la venta queda como auto-reportada

   - `GET /api/marketplace/usuarios/:id/nivel`
     - Devuelve detalles del nivel actual del usuario para tooltip:
       - Nivel actual (0-4) + nombre del nivel
       - Datos: ventas reportadas, ventas confirmadas, tiempo de respuesta promedio, antigüedad
       - Próximo nivel y qué falta para alcanzarlo

5. **Mensaje automático en ChatYA:**
   - Al marcar como vendida con `compradorId` válido → crear mensaje de tipo sistema en `chat_mensajes` con 2 botones interactivos
   - Estructura del mensaje (JSON en `contenido`):
     ```json
     {
       "tipo": "confirmacion_compra_marketplace",
       "articuloId": "...",
       "articuloTitulo": "Bicicleta vintage Rinos",
       "vendedorNombre": "Lucía R.",
       "estado": "pendiente"
     }
     ```
   - Render en `BurbujaMensaje.tsx` cuando `tipo === 'confirmacion_compra_marketplace'`:
     ```
     ┌────────────────────────────────┐
     │ Lucía marcó este artículo      │
     │ como vendido. ¿Confirmas que   │
     │ lo compraste?                  │
     │                                │
     │ [Sí, lo compré] [No fue conmigo]│
     └────────────────────────────────┘
     ```
   - Al hacer click en un botón → llamar `POST /confirmar-compra` y actualizar el mensaje a estado `confirmado` o `rechazado`
   - El mensaje queda visible pero sin botones después de responder

### Frontend

6. **Componente** `BadgeNivelVendedor.tsx`:
   - Recibe `nivel: 0 | 1 | 2 | 3 | 4` y `tamaño: 'pequeño' | 'mediano' | 'grande'`
   - Renderiza el badge según el nivel:
     - 0: nada (no renderiza)
     - 1: "✓ Vendedor activo" en gris discreto
     - 2: "Vendedor frecuente" en gris medio
     - 3: "Vendedor confiable" en teal
     - 4: "Recomendado" en teal con ícono de medalla simple (lucide: Award o similar)
   - Clickeable: abre tooltip explicativo

7. **Componente** `TooltipNivelVendedor.tsx`:
   - Mini-modal con explicación del nivel y datos del vendedor
   - Texto exacto según el nivel actual
   - Botón "Ver perfil completo" → navega al perfil

8. **Integración en CardArticulo:**
   - Mostrar badge solo en niveles 3 y 4 (los demás no se muestran en cards para no saturar)
   - Posición: esquina inferior izquierda de la imagen, sobre la foto

9. **Integración en Detalle del artículo:**
   - En la card del vendedor, mostrar el badge según el nivel
   - Niveles 1+ se muestran (en card del vendedor sí cabe el "Vendedor activo")

10. **Integración en Perfil del vendedor (P3):**
    - Mostrar el badge grande al lado del nombre
    - Tooltip explicativo clickeable

11. **Boost en búsqueda:**
    - En el endpoint `/api/marketplace/buscar` con `ordenar=recientes` (default), aplicar boost en orden:
      - Nivel 4: +40% prioridad (se traduce a un weight en la query)
      - Nivel 3: +20% prioridad
      - Niveles 0-2: sin boost
    - Implementación sugerida: agregar columna virtual de score y ordenar por score DESC, created_at DESC

## Lo que NO entra en este sprint

- Reseñas o calificaciones (descartadas en v1)
- Penalización por bajada de nivel (descartado, decisión explícita)
- Sistema de quejas o disputas

## Reglas obligatorias

- Paso a paso, plan primero.
- TypeScript estricto, NUNCA `any`.
- Idioma: español.
- `data-testid` obligatorio.
- Los niveles son **descriptivos**, no juicios — sin colores rojo/amarillo, sin penalización por bajar.
- El cron debe ser eficiente: si itera miles de usuarios, batchear o usar query agregada con CTE.
- El mensaje automático en ChatYA debe respetar el estilo de los mensajes de sistema existentes (si hay precedente) o crear uno nuevo limpio si no hay.
- Los botones del mensaje deben quedar deshabilitados después de responder (no permitir cambiar de opinión).

## Resultado esperado

1. El cron diario actualiza los niveles correctamente sin errores.
2. Cuando un vendedor sube de nivel, recibe notificación.
3. Marcar como vendida envía mensaje automático al comprador con 2 botones.
4. Confirmar compra desde ChatYA funciona y suma a "ventas confirmadas".
5. Los badges se muestran correctamente en cards (niveles 3-4), detalle (1-4) y perfil (1-4).
6. Los tooltips explicativos muestran datos reales y son útiles.
7. El boost en búsqueda da más visibilidad a niveles altos.
8. Todo es responsive.

## Plan de trabajo

Espera confirmación entre bloques:

1. Plan detallado
2. Migración SQL + schema Drizzle
3. Service `calcularNivel` + tests unitarios con casos límite
4. Cron diario con batching eficiente
5. Endpoints (marcar-vendida, confirmar-compra, nivel)
6. Mensaje automático en ChatYA (backend + frontend `BurbujaMensaje`)
7. Componentes BadgeNivelVendedor + TooltipNivelVendedor
8. Integración en CardArticulo / Detalle / Perfil del vendedor
9. Boost en buscador
10. QA con datos reales (puede requerir crear seed data para probar los 5 niveles)

**Empieza con el plan.**

---

## 💡 Si decides NO implementar este sprint en v1

Puedes marcar el módulo MarketPlace como **completado** después del Sprint 7. El sistema de niveles puede agregarse después sin tocar nada del trabajo previo, ya que toda la data necesaria (antigüedad, tiempo de respuesta, ventas, etc.) ya se está capturando desde el inicio. Lo único que faltaría sería correr el cron una primera vez con histórico para asignar niveles iniciales.
