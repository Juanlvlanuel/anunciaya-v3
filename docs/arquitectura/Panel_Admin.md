# 🛡️ Panel Admin — Arquitectura

**Última actualización:** 4 Junio 2026
**Estado:** 🚧 Diseño completo · Infraestructura backend mínima · UI sin construir
**Progreso:** Diseño 100% · Backend 10% · Frontend 0%

> Este documento reemplaza la versión anterior (que describía solo 2 roles y auth separada).
> El diseño de los 3 niveles, el motor de venta/comisiones y el mapa de territorios se
> cerró en sesión de diseño el 3 Jun 2026. La parte técnica heredada (Mantenimiento R2,
> convención de carpetas, patrón de auth) se conserva.

---

## ¿Qué es el Panel Admin?

Interfaz de administración del sistema AnunciaYA — **no confundir con Business Studio**.

| | Panel Admin | Business Studio |
|-|-------------|------------------|
| **Quién lo usa** | Equipo interno de AnunciaYA: SuperAdmin (dueño) + Gerentes Regionales + Vendedores | Comerciantes/dueños de negocios en la app |
| **Ámbito** | Toda la plataforma (cross-negocio), filtrado por región según el rol | Un solo negocio |
| **Dónde vive** | **Web aparte**, en `admin.anunciaya.mx` (navegador de escritorio) | Dentro de la app |
| **Ejemplos de uso** | Aprobar/suspender negocios, gestión de usuarios, venta de membresías, comisiones, métricas globales, mantenimiento, configuración | Gestionar catálogo, clientes, empleados de MI negocio |

El Panel Admin permite operaciones que **no pueden hacerse desde la UI pública** ni desde BS: aprobación/suspensión de negocios, bloqueo de usuarios, métricas globales, gestión de la red de vendedores y comisiones, configuración de la app, habilitación de ciudades, publicidad, y mantenimiento técnico.

---

## Modelo de acceso

**Decisión (3 Jun 2026):** mismo login para todos, una sola tabla de cuentas; el **rol decide el destino**.

- **Una persona = una cuenta.** El equipo interno usa su mismo correo y contraseña de la app. No hay cuentas separadas ni doble identidad.
- **El rol decide a dónde cae al iniciar sesión:**
  - SuperAdmin / Gerente Regional → directo al Panel (no necesitan la app de cliente)
  - Vendedor → al Panel, pero puede saltar a la app de cliente cuando lo necesite (para mostrarla a un negocio que está convenciendo)
  - Usuario normal → la app de siempre; nunca ve el Panel ni su URL
- **El rol de equipo es una capa INDEPENDIENTE del tipo de cuenta.** Una cuenta de AY es `personal` o `comercial` (ya existe en `usuarios.perfil`); el rol de equipo (superadmin / gerente / vendedor) se suma **encima**, no lo reemplaza:
  - **Vendedor → cuenta comercial** ligada al negocio demo (para mostrar Business Studio en vivo) **+ rol vendedor**. Ver §Demo de Business Studio.
  - **Gerente / SuperAdmin → cuenta personal + su rol** (no necesitan mostrar BS).
- **El Panel es una web aparte**, no una pantalla dentro de la app nativa. La app nativa (tiendas) es solo para usuarios y negocios. El Panel se actualiza sin pasar por las tiendas y mantiene el código admin fuera de la app pública.
  - **Producción:** `admin.anunciaya.mx` (subdominio en Namecheap + Vercel)
  - **Desarrollo:** ruta/puerto local mientras se construye
- **Autenticar ≠ autorizar.** Tener sesión iniciada no abre el Panel. El acceso revalida el rol de equipo en cada petición (lección de la ronda de seguridad del onboarding). Para operaciones sensibles (dinero, borrados, alta de cuentas) se puede exigir 2FA encima del rol.

---

## Los 3 niveles (jerarquía piramidal)

**Cadena de mando:** SuperAdmin → Gerente Regional → Vendedor.
Cada nivel manda sobre el de abajo y ve solo su pedazo. Entre más arriba, más plataforma.

> **Diseñar como "niveles", no como 3 cajas fijas.** Hoy son 3, pero el modelo debe permitir
> insertar un nivel intermedio el día que haga falta (ej. un Admin entre SuperAdmin y Gerentes
> cuando haya 15–20 regiones). Insertar un eslabón ≠ reconstruir la cadena. Hoy NO se construye
> ese 4º nivel — no hay a quién poner ahí.

### 👑 SuperAdmin (Juan — dueño de la plataforma)
Manda sobre todo. Ve todas las regiones. Guarda las "llaves" que nadie más toca:
- Nombrar / quitar Gerentes Regionales y crear cuentas internas
- Crear y armar regiones (agrupar ciudades), habilitar ciudades nuevas
- Controlar el dinero: precio de membresía, promos de pago, meses gratis, escalera de comisiones
- Configuración global, publicidad a nivel plataforma, operaciones destructivas (mantenimiento R2)
- Cancelar negocios, fijar porcentajes/montos de comisión, confirmar entregas de efectivo de cualquier vendedor

### 🗺️ Gerente Regional (= "Administrador")
Dueño de **su región**. Su trabajo central es gestionar a **su equipo de vendedores**. Ve y opera solo lo de su región:
- Alta / baja de **sus** vendedores; asignar territorio (ver Vendedores v2)
- Ver todos los negocios de su región; **aprobar**, **suspender/bloquear** (NO cancelar — eso es del SuperAdmin)
- Suspender / bloquear **usuarios** de su región
- Ver métricas y desempeño de su región completa
- Ver el historial de suscripciones/pagos de los negocios de su región (solo lectura)
- Ver y dar seguimiento a las comisiones de su equipo (NO fija los montos)
- Confirmar entregas de efectivo de **sus** vendedores
- Gestionar la publicidad de **su región**

### 🤝 Vendedor
Trabaja bajo un Gerente Regional, dentro de su región. Sobre negocios:
- Registrar negocios nuevos (alta asistida; ver Motor de venta)
- Ver **su cartera**: negocios que firmó, fecha de vencimiento de su membresía, datos de contacto
- Configurar su **cuenta/tarjeta de banco** para recibir comisiones
- Ver sus comisiones **en tiempo real** (pagadas y pendientes)
- (v2) Mapa de su territorio, prospectos, recorrido
- ❌ No gestiona usuarios, no toca configuración, no ve otras regiones

### Concepto de "región"
**Decisión:** una región es **una caja con nombre donde el SuperAdmin mete las ciudades que quiera**, y a esa caja le asigna un Gerente. No está atada a una ciudad ni a un estado — el SuperAdmin agrupa por cercanía y por capacidad del gerente.
- Hoy "una sola caja global" de hecho; se arman tantas como se necesiten al crecer.
- Se apoya en la tabla `regiones` (ya existe, ver §Schema) + las ciudades habilitadas.
- Extensible: partir/fusionar regiones sin reestructurar.

---

## Matriz de permisos (11 secciones × 3 niveles)

Leyenda: **Total** = plataforma completa · **Su región** = limitado a su región · **Lo suyo** = solo lo propio · **—** = sin acceso

| Sección | SuperAdmin | Gerente Regional | Vendedor |
|---|---|---|---|
| **Resumen / inicio** | Total | Su región | Lo suyo |
| **Métricas** | Total | Su región | Lo suyo |
| **Negocios** | Total (incl. cancelar) | Su región (aprobar/suspender, NO cancelar) | Crear + ver lo suyo |
| **Usuarios** | Total | — | — |
| **Suscripciones** | Total | Solo ver (su región) | — |
| **Vendedores y comisiones** | Total (fija montos) | Su equipo (ve, NO fija montos) | Las suyas |
| **Publicidad** | Total | Su región | — |
| **Ciudades** | Total | — | — |
| **Configuración** | Total | — | — |
| **Equipo y accesos** | Total | Sus vendedores | — |
| **Sistema (mantenimiento + auditoría)** | Total | — | — |

Regla de fondo: lo que es **estructura o dinero** (ciudades, configuración, sistema, precios, escalera de comisiones, cancelar negocios) es **solo del SuperAdmin**. Lo operativo del día a día se delega al Gerente sobre su región.

---

## Las 11 secciones

1. **Resumen / inicio** — tablero de bienvenida con los números gruesos (negocios activos, usuarios, ventas del mes, ingresos por membresías), filtrado por el alcance del rol.
2. **Métricas** — detalle de actividad. De negocios (ventas ScanYA, clientes, canjes) y de usuarios. Lo medible **hoy** se construye ya; la analítica de comportamiento (tiempo por sección, recorridos de navegación) es un módulo posterior porque **hoy no se captura** — requiere instrumentar seguimiento de eventos.
3. **Negocios** — **ficha completa** de cada negocio (datos, contacto, estado, membresía, vendedor que lo trajo). Crear (alta asistida), aprobar, suspender/bloquear, degradar. **Asignar / reasignar el vendedor** del negocio a mano — contraparte de la atribución automática: cubre negocios sin código, ventas en efectivo o correcciones. SuperAdmin sobre cualquier negocio; Gerente sobre los de su región; cada cambio queda en **auditoría** (es dinero: define quién cobra comisión). **Solo SuperAdmin:** cancelar, y un **botón para marcar la membresía como pagada a mano** (cortesías, pagos fuera de Stripe).
4. **Usuarios** — **ficha completa** de cada usuario. Suspender, **bloquear acceso a toda la app**, reactivar — **solo SuperAdmin** (los usuarios-cliente no tienen región hoy; ver Cimientos). **Solo SuperAdmin:** botón para **promover** cuenta personal→comercial o **degradar** comercial→personal a mano.
5. **Suscripciones / membresías** — precio de membresía, promos de pago (ej. 3 meses con descuento, pago anual), regalar meses gratis a negocios puntuales, historial completo de pagos, y **tiempos configurables**: periodo de gracia para cobros vencidos y duración del trial (hoy 7 días fijos → editable). Los tiempos viven en Configuración.
6. **Vendedores y comisiones** — la red completa: alta/baja, regiones, comisiones, cortes de efectivo. (Ver Motor de venta + Comisiones.)
7. **Publicidad** — **segunda fuente de ingresos.** Los comerciantes pagan por aparecer en los carruseles de la columna derecha de la app (Anuncios, Patrocinadores, Fundadores). **Asignación por ciudad, individual** — un negocio paga por aparecer en la ciudad X; puede también pagar por aparecer en **todas** las ciudades donde opera AY. **Precios configurables** (por ciudad, ya que no valen igual). **Métricas:** uso/KPIs de los carruseles, qué negocios pautan, y **cuánto generan**. El Gerente gestiona la publicidad de su región; los precios los fija el SuperAdmin.
8. **Ciudades** — habilitar/agregar ciudades para expandir la app **sin tocar código**. (Ver Cimientos: hoy las ciudades están hardcodeadas.)
9. **Configuración** — valores editables sin código (textos/banners, toggles de funciones, límites/umbrales, **la escalera de comisiones**, **periodo de gracia de cobros** y **duración del trial**). Se apoya en la tabla `configuracionSistema` (clave-valor, ya existe).
10. **Equipo y accesos** — crear/administrar las cuentas internas. Aquí viven los 3 niveles.
11. **Sistema** — Mantenimiento (reconcile R2, único operativo hoy) + Auditoría (bitácora de quién hizo qué).

---

## Motor de venta y cobro

Cómo nace una venta y cómo se enlaza un negocio a su vendedor. **Dos caminos, mismo destino** (negocio atribuido a su vendedor de por vida):

### Camino A — pago con tarjeta (link con referencia)
1. El vendedor convence al negocio y le pasa un **link de registro con su referencia** (ej. `?ref=<codigoReferido>`).
2. El negocio se registra y paga con su propia tarjeta → directo a Stripe.
3. El sistema **lee la referencia y graba la atribución** en el negocio.
- El vendedor nunca toca dinero. Limpio.

> **El código se comparte solo por link, nunca se teclea (decisión 4 Jun 2026).** En el
> Panel, el vendedor copiará su link de registro con un botón ("copiar mi link"); el
> comerciante solo hace click. Como el código **nunca pasa por un teclado humano**, no
> hay riesgo de error de mayúsculas/tipeo: la resolución del referido
> (`resolverEmbajadorPorCodigo` en `pago.service.ts`) es **exacta / case-sensitive** y
> NO se normaliza a mayúsculas. Solo si algún día se agrega un campo donde el comerciante
> teclee el código a mano, ahí habría que normalizar (en captura y guardado).
>
> **Estado del código de referido:** el formato es libre (varchar 50, único). `JUAN01`
> y similares son solo ejemplos de prueba sembrados a mano en DEV; la generación/edición
> formal de códigos vivirá en el módulo de Vendedores del Panel.

### Camino B — pago en efectivo (registro del vendedor)
1. El vendedor cobra en efectivo y **registra al negocio desde su Panel**.
2. El cobro entra como **"efectivo pendiente de entrega"** — el negocio **NO** se activa todavía.
3. El negocio se activa y la comisión se libera **solo cuando se confirma la entrega** del dinero.
4. **Quién confirma:** SuperAdmin (cualquiera) o el Gerente Regional (solo de sus vendedores).
- **Corte de caja por vendedor:** reportado vs. entregado vs. pendiente. Sin esto el efectivo es un agujero negro.
- Filosofía: se permite el efectivo (abre más cierres). El robo se castiga solo — el negocio no se activa sin confirmar, el vendedor no cobra comisión y queda con faltante visible. "Roba una vez y pierde su recurrente."

> **Por qué se permite el efectivo:** en el mercado objetivo, exigir tarjeta cierra puertas. El
> candado de "pendiente de entrega + confirmación" honra la regla de "solo roba una vez" haciéndola
> mecánica, no un deseo.

### Atribución manual (contraparte obligatoria)
Como la venta **nunca se bloquea** por falta de código, un negocio puede nacer **sin vendedor** (`embajadorId` null) — link mal tecleado, registro directo, etc. Por eso la atribución se puede **asignar / reasignar a mano** desde la sección Negocios: SuperAdmin sobre cualquiera, Gerente sobre su región, con registro en auditoría. Sin esto, un negocio huérfano jamás podría pagarle a su vendedor real.

---

## 🎬 Demo de Business Studio (para vendedores)

El vendedor necesita **mostrar Business Studio en vivo** al negocio que está convenciendo (cómo se ve el dashboard, clientes, catálogo). Una cuenta personal no tiene BS; por eso el vendedor tiene **cuenta comercial ligada a un negocio demo + rol vendedor**.

**Decisión:** un solo **negocio demo "maestro"** que se mantiene impecable (precargado con datos de ejemplo atractivos), y **cada vendedor recibe una copia privada al abrirlo**.

- El vendedor **puede editar en vivo** (agregar una oferta, una foto) para mostrar lo fácil que es.
- Como cada quien trabaja sobre **su propia copia temporal**, los vendedores **no se pisan entre sí** aunque muestren al mismo tiempo en ciudades distintas.
- Las copias se **limpian solas** (al cerrar la sesión / nocturno); el maestro queda intacto.
- La **región no importa** en el demo: BS se ve igual en cualquier ciudad y los datos son de ejemplo.

**Quién lo crea y administra:** el **SuperAdmin**. El demo maestro es una **cuenta comercial normal marcada como "demo maestro"**:
- Se **crea** desde el Panel (mismo botón de alta de negocio que usan los vendedores) y se marca como demo.
- Se **administra con el Business Studio normal** — el SuperAdmin entra a esa cuenta y la deja atractiva (catálogo, ofertas, fotos), igual que cualquier comerciante. Así el demo se ve **idéntico** a un negocio real y nunca se desincroniza de cómo luce BS de verdad.
- Lo único técnico nuevo es la **marca de "demo maestro"** + el mecanismo de **copiar por sesión** del vendedor. Lo demás reúsa BS tal cual.

> **Nota técnica (importante para construir):** hoy la relación es **un negocio = un dueño**
> (`negocios.usuarioId` / `usuarios.negocioId`, uno-a-uno). El demo **NO** se enlaza a varios
> vendedores a la vez — eso no cabe en la estructura actual. En su lugar:
> - El **demo maestro** no tiene dueño-vendedor; lo administra el SuperAdmin (es una plantilla).
> - Al abrirlo, cada vendedor recibe una **copia temporal** que se enlaza **solo a él** — respeta
>   el uno-a-uno de siempre. Hay una copia por vendedor, no un demo compartido.
> - Las copias se limpian al cerrar la sesión / nocturno.
>
> Así NO hay que rediseñar la tabla a muchos-dueños-por-negocio. El costo es el mecanismo de
> clonar el maestro por sesión y limpiar las copias.

> Implica más trabajo que un demo compartido simple (el sistema debe clonar el demo por sesión y limpiar las copias), pero es lo que permite editar en vivo sin choques. Construcción: junto con el módulo de Vendedores.

---

## Comisiones

El vendedor cobra **dos cosas distintas**:

### 1. Comisión de alta (al firmar)
Pago único por cada negocio nuevo que firma y que **se concreta** (tarjeta pagada, o efectivo confirmado).

### 2. Comisión recurrente (mensual, condicionada)
- **Monto FIJO** por cada negocio activo, **no porcentaje**. (Más claro de comunicar y blinda el costo si sube el precio de la membresía.)
- Se calcula con una **escalera de escalones** por número de negocios activos. Ejemplo ilustrativo (montos/tramos reales los define el SuperAdmin):
  - < 10 activos → no cobra recurrente
  - 10–24 activos → $X por negocio activo
  - 25+ activos → $Y por negocio activo
- **Se recalcula cada mes** según los activos de ese mes. El negocio es del vendedor **de por vida** (atribución no se borra), pero **el pago se gana mes a mes**: si cae bajo su mínimo, ese mes no cobra; si remonta, se reactiva solo.
- **"Activo" = membresía pagada al corriente.** Así el cálculo es automático: pagó = cuenta; no pagó = no cuenta. El incentivo natural del vendedor es que no se le caiga ningún negocio → eso ES el "mantenimiento" buscado, sin medirlo a mano.

### Configuración de la escalera
- **Una escalera global**, editable **solo por SuperAdmin** (vive en Configuración).
- Diseñada para poder tener **varias** en el futuro (por zona o por vendedor) sin reconstruir — hoy una sola, global.

> **Filosofía detrás de la recurrente vitalicia condicionada:** convertir al vendedor en
> cuenta-habiente, no cazador. Cobra de por vida por cuidar su cartera, pero solo mientras cumple
> su escalera. Premia mantener, no dormir.

---

## Vendedores v2 — Mapa de territorios

**Diseñado completo (3 Jun 2026). Construcción DIFERIDA** — se hace después del motor de venta.
Razón: es el módulo más pesado del Panel y solo aporta cuando hay varios vendedores coordinándose. Diseñarlo hoy, construirlo cuando el motor ya gire.

### Cómo el Gerente reparte el territorio
- El Gerente **dibuja zonas simples a mano** sobre el mapa de su ciudad (encerrar un área con pocos toques, ponerle nombre) y las asigna a sus vendedores.
- **No depende de datos externos** (no requiere límites de colonias cargados) → funciona en cualquier ciudad habilitada.
- Cada negocio **cae en la zona donde está su ubicación** (punto-en-polígono).
- Se apoya en infraestructura ya disponible: **PostGIS** (¿punto dentro de área?) y **MapLibre** (dibujo de mapas).

### Qué ve y hace el Vendedor sobre su zona
- Ve dos tipos de pin, distinguidos por color:
  - **Negocios registrados** (su cartera a cuidar)
  - **Prospectos** (changarros sin registrar que él va sembrando)
- **Suelta un prospecto de un toque** (captura mínima: ubicación + quizá nombre) y lo **enriquece después** (teléfono, notas, seguimiento) → mini-CRM sin fricción en el momento del cierre.
- **Marca estado** de cada prospecto: ya pasé / me falta / lo está pensando / dijo que no.
- **Convierte** un prospecto en venta (por Camino A o B del motor).

### Prospectos (embudo completo — opción B)
El Panel lleva el embudo: prospectos por vendedor, conversión, desempeño. No solo cierres.

---

## ⚠️ Cimientos y pendientes críticos (antes de construir)

Hallazgos del inventario (3 Jun 2026). Varios son **base** del Panel, no adornos:

| Pendiente | Estado | Impacto |
|---|---|---|
| **Atribución vendedor↔negocio en el checkout** | 🟩 Camino A hecho (4 Jun 2026) | El link `?ref=<codigoReferido>` ya se captura en el registro, viaja en la metadata de Stripe y, en el webhook (`pago.service.ts` → `manejarCheckoutCompletado` + helper `resolverEmbajadorPorCodigo`), resuelve el embajador activo y llena `negocios.embajadorId`, `negocios.regionId` y `usuarios.referidoPor` en la misma operación. Si el código falta o es inválido, el negocio entra sin atribución (campos en `null`) — una venta nunca se bloquea. **Pendiente:** Camino B (upgrade personal→comercial) y la creación de embajadores desde el Panel (hoy se siembran a mano en DEV). Ver §Motor de venta. |
| **Rol de equipo en cuentas + auth del Panel** | 🟥 NO existe | Hoy solo el secreto `x-admin-secret`. Falta el concepto de rol (superadmin/gerente/vendedor) y el login del Panel que lo revalida. |
| **Enforcement de `usuarios.estado`** | 🟥 decorativo | Los campos `estado/motivoCambioEstado/fechaCambioEstado` existen pero **ningún código los lee**. Suspender/bloquear no tiene efecto hasta que el login/middleware lo chequee. |
| **Webhook `subscription.updated`** | 🟥 sin implementar | Renovaciones/fallos de pago no actualizan estado → "activo = al corriente" no funciona sin esto. Base de las comisiones recurrentes. |
| **Comisiones: schema en % vs decisión en monto fijo** | 🟧 ajuste | El schema dormido (`embajadores.porcentaje_recurrente`, `embajador_comisiones.porcentaje`) modela **porcentaje**. La decisión es **monto fijo + escalera**. Requiere ajustar schema (escalera de escalones, recurrente como monto) al despertar el módulo. |
| **Migración de ciudades a BD** | 🟧 hardcodeado | La lista de ciudades vive en `apps/web/src/data/ciudadesPopulares` (frontend). Para habilitar ciudades desde el Panel hay que **mudarla a BD** (tabla `regiones`/ciudades) y que el buscador lea de ahí. |
| **Seguridad: galería DELETE solo-dueño** | 🟧 parcial | Cierre parcial aplicado (commit `c3d5951`). Falta: permitir gerente + validar `imageId ∈ sucursal` en `eliminarImagenGaleria`. |
| **Seguridad: POST gemelos sin guard** | 🟧 pendiente | `POST /sucursal/:id/foto-perfil` y `POST /:id/logo` (subir) usan `req.params.id` sin guard de propiedad — mismo hueco que ya se cerró en los DELETE. |
| **Región/ciudad en `usuarios`** | 🟦 futuro | La tabla `usuarios` **no tiene** columna de ciudad/región (confirmado). Para delegar la gestión de usuarios a gerentes por región se necesita: crear la **página de perfil de usuario** (no existe; ahí irían género/avatar/ciudad), agregar la columna de ubicación y poblarla. Por eso **hoy suspender usuarios = solo SuperAdmin**. |

---

## Schema relevante (estado actual)

Tablas ya creadas pero **dormidas** (base del Panel — no eliminar):

| Tabla / columna | Propósito | Estado |
|---|---|---|
| `regiones` (id, nombre, estado, activa) | Regiones/ciudades; unique(nombre, estado) | dormida — base de regiones + ciudades |
| `embajadores` (usuarioId, regionId, codigoReferido, porcentajePrimerPago=30, porcentajeRecurrente=15, estado, negociosRegistrados) | Vendedores con código referido | dormida — sin lógica |
| `usuarios.esEmbajador` / `usuarios.referidoPor` (→ embajadores.id) | Marca de vendedor y referidor | dormida |
| `negocios.embajadorId` / `negocios.regionId` | **Atribución** del negocio a su vendedor y región | dormida — el checkout no la llena |
| `embajadorComisiones` (embajadorId, negocioId, tipo[primer_pago/recurrente], porcentaje, montoBase, montoComision, estado[pendiente/pagada/cancelada]) | Comisiones | dormida — modela %, hay que ajustar a monto fijo |
| `configuracionSistema` (clave-valor) | Config global sin código | **se usa** — base de la sección Configuración |

Tablas/columnas **nuevas a crear** (conceptos; nombres exactos a definir en implementación):
- Rol de equipo en cuentas (superadmin / gerente / vendedor), independiente de `usuarios.perfil`
- Escalera de comisiones (tramos por # activos → monto fijo)
- Efectivo pendiente de entrega + cortes de caja por vendedor
- Negocio demo maestro + copias temporales por sesión de vendedor
- Publicidad: pauta por negocio × ciudad + precios por ciudad + registro de ingresos
- (futuro) Columna ciudad/región en `usuarios` — para delegar usuarios por región
- (v2) Zonas/territorios dibujados + prospectos con estado

---

## Convención de carpetas

Los archivos del Panel Admin viven en sub-carpetas `admin/` dentro de las 3 capas:

```
apps/api/src/
├── controllers/admin/
│   ├── mantenimiento.controller.ts          ← existe
│   └── (futuro) negocios, usuarios, suscripciones, vendedores,
│       comisiones, metricas-globales, ciudades, configuracion,
│       publicidad, equipo, auditoria
├── services/admin/
│   └── mantenimiento.service.ts             ← existe
├── routes/admin/
│   ├── index.ts                             ← agregador (aplica el gate global)
│   └── mantenimiento.routes.ts              ← existe
├── middleware/
│   └── adminSecret.middleware.ts            ← transversal (gate temporal)
└── utils/
    └── imageRegistry.ts                     ← transversal
```

**Regla:** sub-carpeta `admin/` cuando hay 2+ archivos o el dominio es puramente admin. Middleware/utils transversales → carpeta raíz.

---

## Seguridad / Autenticación

### Hoy — gate temporal `requireAdminSecret`
`apps/api/src/middleware/adminSecret.middleware.ts` valida el header `x-admin-secret` contra `env.ADMIN_SECRET`: sin la env → `503`; sin/mal header → `401`; ok → `next()`. Aplicado global a `/api/admin/*` desde `routes/admin/index.ts`. Hoy solo cubre Mantenimiento R2. Por defecto el Panel está **apagado** si no existe `ADMIN_SECRET`.

### Futuro — auth real con rol (reemplaza la idea anterior de tabla/JWT separados)
**Decisión actualizada:** NO se crea una tabla `admin_usuarios` ni un login separado. En su lugar:
1. Agregar **rol de equipo** al concepto de cuenta existente (superadmin / gerente / vendedor), sobre la misma tabla `usuarios`.
2. El Panel (`admin.anunciaya.mx`) usa el **mismo login**; al entrar, un middleware (`verificarRolPanel` / similar) **revalida el rol** y, para gerente/vendedor, **filtra por región** (equivalente al patrón multi-sucursal donde el gerente solo ve su sucursal).
3. Reemplazar `requireAdminSecret` por ese middleware en la ruta agregadora.
4. **Los controllers y services NO cambian** — solo cambia el middleware de `routes/admin/index.ts`. Cambio quirúrgico.
- Operaciones sensibles (dinero, borrados, alta de cuentas) pueden exigir 2FA encima del rol.

---

## Orden de construcción (fases)

> Diseño completo hoy; **construcción por etapas**. El mapa (v2) está diseñado pero se teclea al final.

- **Fase 0 — Cimientos:** rol de equipo + auth del Panel · atribución en checkout · enforcement de `usuarios.estado` · webhook `subscription.updated`.
- **Fase 1 — Motor (lo que genera ingreso):** Negocios · Usuarios · Suscripciones · Vendedores + comisiones (despertar `embajadores`/`embajador_comisiones`, ajustar a monto fijo + escalera) · Equipo y accesos.
- **Fase 1.5 — Operación:** Métricas (lo medible hoy) · Resumen · Ciudades (migración + UI) · Configuración · Publicidad.
- **Fase 2 — Vendedores v2:** mapa de territorios, prospectos, recorrido.

---

## Decisiones de diseño registradas

### Nuevas (3 Jun 2026)
- **3 niveles, no 2.** Se parte el antiguo "Admin" en SuperAdmin + Gerente Regional. No se agrega un 4º nivel hoy (no hay a quién poner), pero el modelo se diseña como "niveles" insertables.
- **Mismo login, rol decide.** Más simple que cuentas separadas; el equipo ya vive en la app (sobre todo el vendedor). El Panel es web aparte por practicidad (escritorio, sin pasar por tiendas, código admin fuera de la app pública).
- **Región = caja de ciudades armada a mano.** No atada a ciudad ni estado; se adapta a cercanía y capacidad del gerente; extensible.
- **Efectivo permitido con candado.** "Pendiente de entrega" + confirmación de SuperAdmin/Gerente hace mecánica la regla "solo roba una vez".
- **Recurrente = monto fijo + escalera, vitalicia condicionada.** Atribución de por vida; pago mes a mes según escalera; "activo" = membresía al corriente. Una escalera global, extensible.
- **Mapa de territorios = v2.** Diseñado completo; construcción diferida hasta que el motor gire.
- **Rol de equipo ≠ tipo de cuenta.** El rol (superadmin/gerente/vendedor) es una capa encima de `personal`/`comercial`. El vendedor es cuenta comercial (para mostrar BS); gerente/superadmin, personal.
- **Demo de BS: maestro + copias por sesión.** Un solo demo impecable; cada vendedor edita su copia privada en vivo sin pisar a otros. Cuesta más que un demo compartido, pero evita choques.
- **Suspender usuarios = solo SuperAdmin.** Los usuarios-cliente no tienen región hoy; bloquear abusivos es tema de plataforma, no de zona. Delegarlo a gerentes requiere primero ubicación en `usuarios`.
- **Publicidad = segunda fuente de ingresos.** Pauta por ciudad (o todas), precios configurables por el SuperAdmin, con métricas de cuánto genera.
- **Atribución manual además de la automática.** La venta nunca se bloquea por falta de código → un negocio puede entrar sin vendedor; su atribución se asigna/reasigna luego desde Negocios (SuperAdmin / Gerente su región), con auditoría.

### Heredadas (se conservan)
- **Sub-carpeta `admin/` en cada capa:** mantiene la convención del proyecto (archivos por tipo) agrupando por sub-dominio cuando crece el volumen.
- **El log de reconcile no registra GET:** un GET es lectura; solo las ejecuciones POST crean fila → log limpio.
- **Multi-BD en el reconcile:** bucket R2 compartido dev/prod; solo se marca huérfano lo que NADA en NINGÚN ambiente referencia. Ver `Mantenimiento_R2.md`.

---

## Archivos clave (existentes)

| Archivo | Propósito |
|---------|-----------|
| `apps/api/src/middleware/adminSecret.middleware.ts` | Gate temporal del Panel |
| `apps/api/src/routes/admin/index.ts` | Agregador — aplica gate global, registra sub-rutas |
| `apps/api/src/routes/admin/mantenimiento.routes.ts` | Rutas de Mantenimiento |
| `apps/api/src/controllers/admin/mantenimiento.controller.ts` | Controllers de Mantenimiento |
| `apps/api/src/services/admin/mantenimiento.service.ts` | Lógica del reconcile R2 |
| `apps/api/src/db/reconcileConnections.ts` | Conexiones multi-BD para reconcile |
| `apps/api/src/utils/imageRegistry.ts` | Fuente única de columnas con URLs de imágenes |
| `docs/arquitectura/Mantenimiento_R2.md` | Doc técnica del reconcile |

---

## Env vars requeridas

```bash
# .env (backend)
ADMIN_SECRET=<string aleatorio de 16+ caracteres>   # gate temporal; se retira al haber auth por rol
```
