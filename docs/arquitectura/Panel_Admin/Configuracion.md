# Panel Admin · Módulo Configuración ⚙️

> **En una frase:** es el **tablero económico** del Panel — la pantalla donde el SuperAdmin ajusta las
> **palancas del modelo de negocio** (la escalera de comisiones, el trial y el periodo de gracia) **sin
> tocar código ni pedir un despliegue**.
>
> **Cómo leer este documento:** dos capas. La primera (§1–§7) explica el módulo **en lenguaje de persona**.
> La segunda (**Apéndice técnico**) es la referencia para tocar el código.
>
> **Estado:** construido y en uso. Última actualización: 22 Junio 2026 (rediseño a pestañas + grupos de
> Membresía y Publicidad).
>
> Documento hermano: [`Panel_Admin.md`](Panel_Admin.md) (el Panel completo) · decisiones y pendientes de
> construcción en [`Configuracion_Pendientes.md`](Configuracion_Pendientes.md).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Hay un puñado de números que **deciden cuánto entra y cuánto sale** del negocio: cuánto gana un vendedor
por cada negocio activo, cuántos días se regala de prueba antes del primer cobro, cuánto se aguanta un
impago antes de suspender. Antes esos números vivían **clavados en el código** (o en la BD, sin forma de
tocarlos). Este módulo es donde el SuperAdmin los **mueve él mismo**, cuando la estrategia lo pide.

No es un cajón de ajustes técnicos. Es deliberadamente chico: **solo las palancas que tocan la caja**.

## 2. ¿Quién lo usa? (y quién no)

- **SuperAdmin** — único que entra. Ve y edita todos los valores.
- **Gerente Regional** y **Vendedor** — **no entran** (no les aparece en el menú y la API responde 403).

> Es dinero y estructura → solo el dueño del negocio. La ruta se monta **bajo el gate global de
> superadmin**, no antes (a diferencia de Negocios/Vendedores, que usan los tres roles).

## 3. Qué se puede ajustar (v1)

| Palanca | Qué decide | Tipo |
|---|---|---|
| **Escalera de comisiones** | Cuánto gana el vendedor: tramos por nº de negocios activos → monto fijo por activo/mes | tramos (JSON) |
| **Duración del trial** | Días de prueba gratis de un negocio nuevo antes del primer cobro | número (0–90) |
| **Periodo de gracia de cobro** | Días que un negocio sigue activo tras un cobro fallido antes de suspenderse | número (0–60) |

> **Lo que NO entra aquí** (a propósito): el **precio de la membresía** (vive en Stripe; cambiarlo +
> las promos de lanzamiento son un **sprint aparte** en Suscripciones), datos de **un** negocio
> (eso es de su dueño en Business Studio), secretos/infraestructura (van en `.env`) y textos de la app.

## 4. Qué se ve

Una pantalla de "ajustes" en **dos pestañas** (mismo patrón de pestañas que Métricas):

- **Membresía** — el modelo de suscripción del comercio: el **Precio de la membresía** (mensual + plan
  anual), **Pagos y comisiones** (escalera + comisión de alta) y **Prueba y gracia** (trial + periodo de
  gracia). Los dos últimos grupos van lado a lado.
- **Publicidad** — los **Precios de los carruseles** (Anuncios · Patrocinadores · Fundadores, en una fila
  de tarjetas) y **Reglas y límites** (multiplicador por ciudades, descuento del combo, máximos, vigencia
  y periodos de pago por adelantado).

Cada grupo lleva un encabezado (ícono + título) y, debajo, sus tarjetas en una **rejilla de dos columnas**
(las "tablas" —escalera, multiplicador, periodos— se muestran como filas de tramos, y se agrupan al final
para que se emparejen). Cada tarjeta tiene su ícono, una descripción corta, el **valor actual** y un botón
**Editar**; si el valor no se ha guardado nunca, lleva la etiqueta **"valor por defecto"**.

**Color de los íconos** (chip cuadrado, glifo en blanco): azul de marca en los **títulos de sección**, gris
neutro en las **tarjetas**, y el color de identidad de cada **carrusel** (Anuncios ámbar · Patrocinadores
azul · Fundadores violeta) — el único lugar donde el color identifica un producto. Centralizado en los
mapas `ACENTO_GRUPO` / `ACENTO_CLAVE` / `META_CARRUSEL` de `SeccionConfiguracion.tsx`.

## 5. Cómo se edita

- **Número (trial / gracia)** — un diálogo con un campo; valida en vivo contra su rango (no deja guardar
  fuera de 0–90 / 0–60).
- **Escalera** — un **editor de tramos**: defines los **cortes** (hasta cuántos activos llega cada tramo) y
  el **monto por activo**; agregas o quitas tramos. El inicio de cada tramo **se calcula solo** a partir del
  corte del anterior, así que **nunca quedan huecos ni solapes**. El último tramo siempre es "en adelante".
  Una **vista previa en vivo** muestra cómo queda (`0–9 → $0 · 10–24 → $30 · 25+ → $50`).
- **Rueda del mouse** — los tres campos numéricos suben/bajan con la rueda cuando están **enfocados**
  (igual que un input numérico nativo; requiere foco para no cambiar valores sin querer al scrollear).

## 6. Por qué importa (y por qué es chico)

El valor del módulo no está en *cuántas* perillas tiene, sino en que las **pocas que mueven dinero** estén
bajo control del SuperAdmin sin depender de un despliegue. La **escalera** es además el dato que **lee el
cálculo de comisiones** de "Vendedores y comisiones" (Fase 2): por eso este módulo se construyó **antes**,
para que esa escalera fuera configurable.

Crece **orgánicamente**: cuando una sección futura (p. ej. ScanYA/Puntos) tenga una palanca económica real,
se suma una clave aquí en vez de clavar el número en el código. La base ya está lista para ello.

## 7. Seguridad y rastro

Toda edición queda **auditada** (`admin_auditoria`: quién, cuándo, valor antes/después) y sella
`configuracion_sistema.actualizado_por`. El backend **revalida** todo lo que llega de la UI (defensa en
profundidad). Al guardar, se **resetea la caché** interna para que el resto del backend (cobros, gracia)
tome el valor nuevo de inmediato, sin esperar el TTL de 5 minutos.

---

# Apéndice técnico

## A. Arquitectura — archivos

**Backend**

| Archivo | Rol |
|---|---|
| `services/admin/configuracion.service.ts` | **Catálogo** `CONFIG_EDITABLE` (allow-list con meta: etiqueta, tipo, categoría, unidad, min/max, default) + `listarConfiguracion()` (une catálogo con el valor de BD; default si la clave no está sembrada). |
| `services/admin/configuracion-acciones.service.ts` | **Escritura** `actualizarConfig(panel, clave, valor)` + validadores exportados `validarNumero` / `validarEscalera`. UPSERT + auditoría + `resetearCacheConfig()`. |
| `controllers/admin/configuracion.controller.ts` | `listarConfiguracionController` (GET) · `actualizarConfiguracionController` (PATCH). |
| `routes/admin/configuracion.routes.ts` | `GET /` · `PATCH /:clave`. Montadas **bajo el gate global de superadmin** en `routes/admin/index.ts`. |
| `validations/admin/configuracion.schema.ts` | Body `{ valor: string }` (Zod). El valor viaja como string (número → "21"; escalera → JSON). |
| `services/configuracion.service.ts` | Helper interno **preexistente**: `obtenerConfigNumero/Texto/Booleano` + caché 5 min + `resetearCacheConfig()`. Lo consumen checkout/gracia. |

**Frontend** (`apps/admin`)

| Archivo | Rol |
|---|---|
| `services/configuracionService.ts` | `listarConfiguracion()` · `actualizarConfiguracion(clave, valor)` · `parsearEscalera()`. |
| `hooks/queries/useConfiguracionAdmin.ts` | `useConfiguracion()` (query) · `useActualizarConfiguracion()` (mutation: invalida la lista + toast). |
| `components/configuracion/SeccionConfiguracion.tsx` | La sección: dos pestañas (Membresía · Publicidad), grupos con encabezado, rejilla de 2 columnas, chips de color de los íconos, botón Editar y apertura del diálogo según el tipo. |
| `components/configuracion/TarjetaPrecioMembresia.tsx` | Tarjetas del precio de membresía (mensual + plan anual); toca Stripe (diálogo de cambio de precio + toggle del plan anual). |
| `components/configuracion/DialogosConfig.tsx` | `CampoNumero` (input + rueda del mouse) · `DialogoEditarNumero` · `DialogoEditarEscalera` (editor de tramos + vista previa). |

**Migración / verificación**

| Archivo | Rol |
|---|---|
| `docs/migraciones/sembrar_comision_escalera.sql` | Siembra `comision_escalera` (idempotente). **Opcional**: la 1ª edición desde la UI la siembra sola (UPSERT). La corre Juan. |
| `apps/api/scripts/probar-configuracion-lectura.ts` | Harness (SELECT) — estructura + valores del catálogo. |
| `apps/api/scripts/probar-configuracion-validacion.ts` | Harness (lógica pura) — la validación de escritura (rangos, huecos, solapes, tope, normalización). |

## B. La tabla `configuracion_sistema`

Clave-valor **tipado y validado**: `clave` (única) · `valor` (text) · `tipo` (numero/texto/booleano/**json**/tramos_ciudades/periodos_meses)
· `descripcion` · `categoria` (check: transacciones/notificaciones/seguridad/pagos/promociones/trials/general/**publicidad**)
· `unidad` · `valor_minimo`/`valor_maximo` · `actualizado_por` (FK usuarios, auditoría) · timestamps.

La **meta** que pinta la UI sale del **catálogo en código** (`CONFIG_EDITABLE`), no de la BD; de la BD solo
se toma el **valor** actual. Por eso la pantalla funciona aunque la clave aún no esté sembrada.

## C. La escalera de comisiones

Modelada como **una sola clave** `comision_escalera` con `tipo='json'` (sin tabla nueva). Forma:

```json
[{ "min": 0, "max": 9, "montoPorActivo": 0 },
 { "min": 10, "max": 24, "montoPorActivo": 30 },
 { "min": 25, "max": null, "montoPorActivo": 50 }]
```

Comisión recurrente del mes = `# negocios activos × montoPorActivo` del tramo donde cae el conteo.

**Validación** (en `validarEscalera`, espejada en el editor del front): array no vacío · primer tramo
empieza en 0 · cada tramo `min`/`max` enteros, `monto ≥ 0` · **contigüidad estricta** (`min[i] = max[i-1] + 1`,
sin huecos ni solapes) · solo el **último** tramo sin tope (`max: null`). Se reserializa para guardar limpio.

## D. Flujo de una edición

1. UI manda `PATCH /admin/configuracion/:clave` con `{ valor }` (string).
2. `actualizarConfig` busca la clave en el catálogo (404 si no es editable), valida según `tipo`
   (`validarNumero` / `validarEscalera`) → 400 con mensaje claro si falla.
3. Si no cambió respecto al valor actual, no escribe (idempotente).
4. **UPSERT** en `configuracion_sistema` (inserta con la meta del catálogo si no existía; si existe, solo
   actualiza `valor` + `actualizado_por` + `updated_at`).
5. `resetearCacheConfig()` → los lectores internos toman el valor nuevo ya.
6. `registrarAuditoria('config_actualizar', …)` con la clave + antes/después (best-effort).

## E. Estado de verificación

- `tsc` API ✅ · `tsc -b` + `vite build` del Panel ✅.
- Harness lectura **TODO VERDE** (catálogo + valores reales).
- Harness validación **TODO VERDE** (18 casos: rangos, vacío, huecos, solapes, tope final, normalización).
- **Persistencia end-to-end** (guardar desde la UI → BD + auditoría + caché): validada en dev. **Migración
  en prod**: pendiente de correr (idempotente).

## F. Referencias

- [`Panel_Admin.md`](Panel_Admin.md) — §9 Configuración + matriz maestra (Config = solo super).
- [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) — **lee** la escalera para el devengo (Fase 2).
- [`Suscripciones_Pendientes.md`](Suscripciones_Pendientes.md) — el **precio de membresía** (editable desde el Panel, Sprint de Stripe ✅) · promos/cupones **descartados** (§Cierre de alcance).
- [`Tokens_Panel.md`](Tokens_Panel.md) — diseño del Panel.
