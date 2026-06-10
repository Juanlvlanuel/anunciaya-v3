# 🛡️ Panel Admin — Arquitectura

**Última actualización:** 10 Junio 2026
**Estado:** 🚧 Diseño completo · Fase 0 (backend) completa · **Shell + Login del Panel construidos** · **Negocios (Entrega 1 VER + Entrega 2 ACTUAR + sucursales + filtro de región del superadmin) construida** (en producción) · **Alta manual de negocios sin Stripe (efectivo/transferencia/cortesía) + crear contraseña en primer ingreso construida** (en producción) · **Modelo ciudad↔región rediseñado** (completo en dev + prod, incluido el DROP del Paso 10) · 10 secciones internas restantes
**Progreso:** Diseño 100% · Backend Fase 0 100% · Frontend shell+login ✅ · Secciones internas: **Negocios (VER + ACTUAR) ✅** · **Alta manual sin Stripe ✅** · resto 0%

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
| **Ejemplos de uso** | Pausar/cancelar negocios, gestión de usuarios, venta de membresías, comisiones, métricas globales, mantenimiento, configuración | Gestionar catálogo, clientes, empleados de MI negocio |

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
- Ver todos los negocios de su región; **pausar membresía / bloquear** (NO cancelar — eso es del SuperAdmin)
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

### Concepto de "región" y "ciudad" (modelo separado — rediseñado 7 Jun 2026)
**Decisión:** se separan dos conceptos que antes vivían mezclados en `regiones`:
- **Ciudad** = lugar concreto (Puerto Peñasco, Caborca). Vive en la tabla **`ciudades`** (catálogo real poblado desde `ciudadesPopulares`: nombre, estado, país, coords, alias, `slug` único, `region_id`).
- **Región** = **agrupador** de ciudades con nombre operativo (ej. "Sonora-Norte"), al que el SuperAdmin asigna un Gerente. La tabla **`regiones` se adelgazó** a `(id, nombre, activa, created_at)` — **ya NO tiene `estado`/`pais`** (eso vive en `ciudades`); `unique(nombre)`.

Reglas del modelo:
- Cada **ciudad pertenece a UNA región** (`ciudades.region_id`, nullable hasta que el SuperAdmin la agrupe). Modelo 1, sin solapamiento.
- Un **negocio se ancla a una ciudad por cada sucursal** (`negocio_sucursales.ciudad_id`). Un negocio multi-sucursal puede tocar **varias regiones** (la de cada sucursal).
- Un **vendedor cubre una o varias ciudades** (tabla **`embajador_ciudades`**), todas de **una misma región** (lo garantiza un trigger).
- **Nadie guarda "región" a mano** en negocios/vendedores: la región se **deduce** subiendo ciudad → región. La única atadura directa que se conserva es `usuarios.region_id` del **Gerente Regional** (su zona de mando).
- **Alcance del Gerente** (deducido por sucursal→ciudad→región, con `EXISTS` para no duplicar negocios multi-zona): **visibilidad = mando**, ambos por la **sucursal MATRIZ** (`es_principal`). Un negocio aparece en el Panel **solo en la región de su matriz**; sobre todos los que ve, puede actuar (pausar/reactivar). Un negocio con sucursales secundarias en otra región **no** asoma en esa otra región — las sucursales se ven como **detalle de la ficha**, no como negocios sueltos (decisión 7 Jun: se unificó visibilidad y mando por matriz; antes la visibilidad era por cualquier sucursal).
- Extensible: partir/fusionar regiones reasignando ciudades, sin tocar negocios ni vendedores.

> **Migración (estado, 7 Jun 2026):** **COMPLETA en BD y código, dev + prod** (tabla `ciudades` poblada, `regiones` adelgazada, `embajador_ciudades` + trigger, `negocio_sucursales.ciudad_id`, alcance del Panel por matriz, atribución sin región). El **Paso 10** (DROP de `negocios.region_id` y `embajadores.region_id`) ya corrió en dev y prod — solo queda `usuarios.region_id`; las tablas de respaldo `_backup_*` se eliminaron. **Pendiente menor:** la UI del Panel para gestionar/agrupar ciudades. Detalle en `PENDIENTES_PanelAdmin.md`.

---

## Matriz de permisos (11 secciones × 3 niveles)

Leyenda: **Total** = plataforma completa · **Su región** = limitado a su región · **Lo suyo** = solo lo propio · **—** = sin acceso

| Sección | SuperAdmin | Gerente Regional | Vendedor |
|---|---|---|---|
| **Resumen / inicio** | Total | Su región | Lo suyo |
| **Métricas** | Total | Su región | Lo suyo |
| **Negocios** | Total (incl. cancelar) | Su región (pausar, NO cancelar) | Crear + ver lo suyo |
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
   - **Cola de pendientes (centro de trabajo, NO notificaciones tipo feed):** lista de tareas accionables del admin. Regla: si al hacer clic te lleva a HACER algo, entra; si solo informa, no. Items reales (todos dependen del Camino B/comisiones, aún por construir): **efectivo por confirmar** (entregas de vendedores), **negocios en gracia** (fallaron cobro, por suspenderse — el gerente puede salvarlos), **vendedores con faltante** (cobraron y no entregaron). **NO incluye "negocios por aprobar"** (no existe aprobación, los negocios se publican solos) ni avisos informativos (esos van a Sistema). Ícono: preferir "tareas/bandeja" sobre campana. En el esqueleto es visual con datos de muestra; la lógica se conecta al construir cada sección.
2. **Métricas** — detalle de actividad. De negocios (ventas ScanYA, clientes, canjes) y de usuarios. Lo medible **hoy** se construye ya; la analítica de comportamiento (tiempo por sección, recorridos de navegación) es un módulo posterior porque **hoy no se captura** — requiere instrumentar seguimiento de eventos.
3. **Negocios** — **ficha completa** de cada negocio (datos, contacto, estado, membresía, vendedor que lo trajo). **Los negocios se publican automáticamente** al pagar + completar onboarding — NO hay aprobación manual (decisión: Modelo A, publicación automática, sin fricción). Desde la ficha, **4 acciones** (detalle en §Las 4 acciones de la ficha de Negocios): **Marcar pagado** (activar la cuenta a mano, solo SuperAdmin), **Reasignar vendedor** (atribución manual), **Pausar membresía** y **Cancelar**. Pausar y Cancelar **sacan al negocio de circulación y cortan el cobro** — se diferencian en el cajón donde queda (pausado = "quizás vuelve"; archivado = "ya no vuelve, pero se guarda su historial"). Cada cambio queda en **auditoría** (es dinero: define quién cobra comisión y a quién se cobra).
   > **Estado:** **Entrega 1 (VER) + Entrega 2 (ACTUAR)** construidas y EN PRODUCCIÓN. **VER:** tabla (nombre/ciudad/vendedor/estado de pago/próximo cobro/**sucursales**/alta) con buscador + filtros (estado con conteos, vendedor, ciudad) + orden + paginado de servidor, y **ficha administrativa** (modal/bottom-sheet) con alcance por rol. **ACTUAR:** las **4 acciones operativas** con su lógica de Stripe y auditoría (Marcar pagado, Reasignar, Pausar membresía, Cancelar — ver §Las 4 acciones). El alcance del Gerente es por **sucursal matriz** (visibilidad = mando; ver §Concepto de "región" y "ciudad"). **Sucursales:** columna "Sucursales" Sí/No que despliega las secundarias (ciudad·región) y abre un **modal de detalle de sucursal** (sin membresía ni acciones; con su Gerente Asignado), en escritorio y móvil. **Filtro de región del superadmin:** un selector global en el header acota TODO el Panel a una región (ver §Filtro global de región).
4. **Usuarios** — **ficha completa** de cada usuario. Suspender, **bloquear acceso a toda la app**, reactivar — **solo SuperAdmin** (los usuarios-cliente no tienen región hoy; ver Cimientos). **Solo SuperAdmin:** botón para **promover** cuenta personal→comercial o **degradar** comercial→personal a mano.
5. **Suscripciones / membresías** — precio de membresía, promos de pago (ej. 3 meses con descuento, pago anual), regalar meses gratis a negocios puntuales, historial completo de pagos, y **tiempos configurables**: periodo de gracia para cobros vencidos y duración del trial (hoy 14 días → editable desde el Panel). Los tiempos viven en `configuracionSistema` (la tabla ya tiene `trial_duracion_dias=14` y otras configs de trials/pagos).
   - **Visibilidad para el negocio (feature firme):** cada negocio ve su **estado de membresía y fecha de vencimiento en su página de cuenta/perfil** ("activo hasta X") — **fuera del BS, accesible desde el modo Personal** (al vencer, la cuenta baja a personal). Es buena UX (el negocio quiere saber hasta cuándo pagó) **y** la defensa principal contra el robo invisible del efectivo: si pagó y ve "vencido", reclama a AnunciaYA. Reusa las 5 columnas de estado de membresía del webhook.
6. **Vendedores y comisiones** — la red completa: alta/baja, regiones, comisiones, cortes de efectivo. (Ver Motor de venta + Comisiones.)
7. **Publicidad** — **segunda fuente de ingresos.** Los comerciantes pagan por aparecer en los carruseles de la columna derecha de la app (Anuncios, Patrocinadores, Fundadores). **Asignación por ciudad, individual** — un negocio paga por aparecer en la ciudad X; puede también pagar por aparecer en **todas** las ciudades donde opera AY. **Precios configurables** (por ciudad, ya que no valen igual). **Métricas:** uso/KPIs de los carruseles, qué negocios pautan, y **cuánto generan**. El Gerente gestiona la publicidad de su región; los precios los fija el SuperAdmin.
8. **Ciudades** — habilitar/agregar ciudades para expandir la app **sin tocar código**, y **agruparlas en regiones** (asignar `ciudades.region_id`). La tabla **`ciudades` ya existe y está poblada** (desde `ciudadesPopulares`); falta solo la **UI del Panel** para gestionarlas y agruparlas. (Ver §Concepto de "región" y "ciudad".)
9. **Configuración** — valores editables sin código (textos/banners, toggles de funciones, límites/umbrales, **la escalera de comisiones**, **periodo de gracia de cobros** y **duración del trial**). Se apoyará en la tabla `configuracionSistema` (clave-valor, ya poblada) — pero hoy **es decorativa**: ningún código la lee y falta crear el helper `obtenerConfig()`. Conectarla es trabajo pendiente (ver Cimientos). Además, varios valores hoy están **hardcodeados** (ej. el trial cobra a 7 días aunque la tabla diga 14).
10. **Equipo y accesos** — crear/administrar las cuentas internas. Aquí viven los 3 niveles.
11. **Sistema** — Mantenimiento (reconcile R2, único operativo hoy) + Auditoría (bitácora de quién hizo qué).

---

## Las 4 acciones de la ficha de Negocios

Cuatro botones, dos propósitos: **dos mantienen viva la cuenta** (Marcar pagado, Reasignar) y **dos sacan al negocio de circulación cortando el cobro** (Pausar membresía, Cancelar). Las cuatro quedan registradas en auditoría.

> **Nota de nombres (importante).** Lo que el usuario LEE en el botón puede diferir de cómo se llama el estado por dentro:
> - **"Pausar membresía"** es la etiqueta nueva del botón que controla el estado interno `estado_admin='suspendido'`. Se renombró desde "Suspender" porque ese término comunicaba mal: el propósito real es **pausar el cobro**, no castigar.
> - **"Cancelar"** controla `estado_admin='archivado'`.
> - No confundir `estado_admin` (lo administrativo, lo ponen estos botones) con `estado_membresia` (al_corriente / en_gracia / suspendido / cancelado), que es el **ciclo de pago automático de Stripe** y vive aparte. La **visibilidad** la manda siempre `negocios.activo` (ver §Negocio fuera de circulación).

### 1. Marcar pagado · SOLO SuperAdmin
**Seguro rápido para activar la cuenta de un comerciante a mano.** Pone el negocio en circulación (`estado_admin='activo'` + `activo=true`), lo deja al corriente y marca `metodo_cobro='manual'` (señal de "este cobro lo llevo yo, que Stripe no toque la tarjeta"). **Complementario al alta manual:** Marcar pagado actúa sobre un negocio que **ya existe** (renueva/extiende su vigencia), mientras que el **alta manual** (botón "Registrar negocio", ver §Motor de venta → Camino B) **crea el negocio desde cero** sin Stripe. Casos de uso:
- **Cortesías / meses gratis** a un negocio puntual.
- **Problemas de comunicación**: el cobro se hizo pero el sistema no lo registró → reactivar sin que el comerciante espere.
- **Robo de membresía del vendedor**: responderle al comerciante de inmediato reactivándole la cuenta, mientras se resuelve con el vendedor por separado.
- **Pagos en efectivo / fuera de Stripe** (Camino B).

> Es el contrapeso humano del cobro automático: cuando algo falla o se regala, el SuperAdmin activa a mano. Por ser dinero, **solo SuperAdmin** (separar quien cobra de quien autoriza). **Implementado (Parada 2):** el diálogo deja elegir el plazo (por meses o fecha exacta, mostrando el vencimiento actual) y, **solo si el negocio tiene suscripción de Stripe**, ofrece un toggle "pausar el cobro de la tarjeta" (apagado por defecto): apagado → la tarjeta sigue cobrándose y `metodo_cobro='tarjeta'`; encendido → pausa el cobro (`pause_collection`) y `metodo_cobro='manual'`. Sin suscripción → siempre manual, sin tocar Stripe.

### 2. Reasignar vendedor · SuperAdmin (cualquiera) / Gerente (su región)
Asigna o cambia el vendedor atribuido al negocio. Contraparte manual de la atribución automática del `?ref=`: cubre negocios sin código, ventas en efectivo o correcciones. Es dinero (define quién cobra comisión) → queda en auditoría. **No toca Stripe ni la visibilidad.**

### 3. Pausar membresía · SuperAdmin + Gerente (su región)
**Estado "quizás vuelve".** Pausa COMPLETAMENTE la membresía: **no más cobros.** El negocio sale de circulación (`estado_admin='suspendido'` + `activo=false`, se esconde de toda la app) y su suscripción de Stripe se **pausa** (`pause_collection`): la tarjeta deja de cobrarse mientras dure la pausa. Reactivar es un clic — el negocio reaparece (respetando el estado) y el cobro se **reanuda de ahí en adelante**, sin deuda acumulada ni mes perdonado.
- **Cuándo:** el negocio dijo de palabra "ya no quiero salir por ahora", una pausa por temporada, una disputa temporal mientras se resuelve.
- **Puntos del cliente:** los vales pendientes se **congelan** (siguen esperando; nadie los expira). Si se reactiva a tiempo, siguen vivos.
- **La cuenta del dueño NO se degrada:** sigue siendo comercial, solo queda bloqueada de entrar a Business Studio mientras está pausada (candado de modo comercial). Al reactivar, vuelve a entrar.
- **También desde el perfil del dueño (pendiente):** un negocio con tarjeta podrá pausarse a sí mismo desde su propia cuenta. El botón del dueño hará lo mismo que este; la decisión de hoy es su cimiento.

### 4. Cancelar · SOLO SuperAdmin
**Estado "ya no vuelve" (pero guardamos su historial).** Soft-delete recuperable: el negocio se archiva (`estado_admin='archivado'` + `activo=false`) y **NO se borran sus datos**. Corta la suscripción de Stripe de raíz (`cancel`) y, por ser una baja definitiva, además: **degrada la cuenta del dueño a personal** (pierde el acceso comercial; **nunca se le expulsa** — conserva su cuenta, sus puntos e historial como cliente) y **devuelve a los clientes los puntos** de los vales pendientes que tenían en ese negocio (ya no podrán canjear ahí).
- **Cuándo:** baja segura ("ya no vuelvo"), negocio que cerró o quebró, o expulsión (vetado / problemático).
- **Diferencia con Pausar:** ambas cortan el cobro; lo que cambia es el cajón donde queda el negocio y qué tan fácil vuelve. **Pausada = dormida**, vuelve con un clic. **Cancelada = archivada**; si el negocio se arrepiente, vuelve como **alta nueva** (la suscripción de Stripe ya no se reanuda — se contrata de nuevo).

> **La acción del Panel es la fuente de verdad.** Ella misma hace el corte en Stripe, la degradación de la cuenta y la devolución de puntos, de forma síncrona e idempotente; el webhook de Stripe queda solo como refuerzo. Así se cubre también a los negocios **sin Stripe** (efectivo/cortesía, donde el webhook nunca llega) y se evitan las carreras de tiempo. **Orden de operaciones:** cortar en Stripe → degradar cuenta / devolver puntos / archivar → limpiar el enlace de suscripción **al final** (si se borra antes, el webhook llega "ciego" y no hace su parte de refuerzo).

---

## Filtro global de región (superadmin) y región en el header

**Header del Panel (todos los roles):**
- **Gerente / Vendedor** → ven el **nombre real de su región** (ya no el placeholder "Tu región"). El backend lo resuelve en `GET /api/admin/yo` (`regionNombre`, deducido de `usuarios.region_id` del gerente o de `embajador_ciudades` del vendedor).
- **SuperAdmin** → un **selector de región** con las regiones reales (`GET /api/admin/regiones`) + "Toda la plataforma".

**Filtro global (solo superadmin):** al elegir una región, el Panel entero se acota a ella — *"ver el Panel como el gerente de esa región"* (**lente de visibilidad**):
- Es **solo de lectura/visibilidad**: el superadmin **conserva todas sus acciones** (las mutaciones usan su panel original, sin restricción). Un gerente **no** puede usar el override — su alcance es siempre su token (**validación estricta** en el backend).
- Viaja como `?regionId=` (interceptor de axios) y el backend lo aplica con `panelConFiltroRegion()` **solo a las lecturas** y **solo si el rol es superadmin** (lo trata como gerente de esa región).
- **Persiste** en `localStorage`; al cambiar, se refrescan las consultas dependientes. Hoy acota la sección Negocios (lo único construido); las futuras secciones lo heredan.

**Backend:** `GET /api/admin/regiones` (`controllers/admin/regiones.controller.ts` + `services/admin/regiones.service.ts`), montado tras el gate de superadmin; `panelConFiltroRegion()` en `services/admin/negocios.service.ts`. **Frontend:** stores `useFiltroRegion` + hook `useRegionesPanel` + el interceptor de `services/api.ts`.

---

## Motor de venta y cobro

Cómo nace una venta y cómo se enlaza un negocio a su vendedor. **Dos caminos, mismo destino** (negocio atribuido a su vendedor de por vida):

### Camino A — pago con tarjeta (link con referencia)
1. El vendedor convence al negocio y le pasa un **link de registro con su referencia** (ej. `?ref=<codigoReferido>`).
2. El negocio se registra y paga con su propia tarjeta → directo a Stripe.
3. El sistema **lee la referencia y graba la atribución** en el negocio.
- El vendedor nunca toca dinero. Limpio.

### Camino B — pago en efectivo (registro del vendedor)

> ✅ **YA CONSTRUIDO (10 Jun 2026) — el alta manual sin Stripe (botón "Registrar negocio"):** un negocio ya puede **nacer desde el Panel sin pasar por Stripe**. Lo puede dar de alta SuperAdmin, Gerente (su región) o Vendedor (su región, auto-atribuido). El negocio nace con `metodo_cobro='manual'` (sin `stripeCustomerId` ni `stripeSubscriptionId` — el webhook nunca le llega) y la cuenta del dueño nace **sin contraseña (modelo C)**: la define en su primer ingreso con un código por correo (ver §Seguridad). El **concepto** del pago es `efectivo`, `transferencia` o **`cortesia`** (alta gratis por X meses, monto NULL, sin `fecha_primer_pago`). Esto cubre el hueco que antes era bloqueante: **el "alta desde el inicio"** de un negocio que paga en efectivo (antes solo podía nacer pagando con tarjeta vía el webhook). Lo que sigue pendiente del Camino B es lo de **abajo**: el corte de caja, el "efectivo por entregar" y la comisión condicionada a la confirmación de la entrega.

1. El vendedor cobra en efectivo y **registra al negocio desde su Panel**.
2. **El negocio se ACTIVA de inmediato** al registrarse el cobro. El negocio pagó de buena fe (al representante de AnunciaYA) → su membresía corre normal, su reputación intacta. **NO depende de ninguna confirmación.**
3. Lo que queda "pendiente" NO es el negocio, es **la entrega del dinero por parte del vendedor**: el cobro queda como **"efectivo por entregar"** a nombre del vendedor.
4. **La comisión del vendedor** sí se libera solo cuando **confirma la entrega** del dinero (esto lo incentiva a entregarlo). Si no entrega: pierde su comisión, queda faltante a su nombre, se le despide. **El negocio nunca se ve afectado.**
5. **Quién confirma la entrega:** SuperAdmin (cualquiera) o el Gerente Regional (solo de sus vendedores).
- **Corte de caja por vendedor:** reportado vs. entregado vs. pendiente. Sin esto el efectivo es un agujero negro.
- Filosofía corregida: el riesgo del robo lo absorbe **AnunciaYA (tú)**, NO el negocio. "Roba una vez → pierde comisión + despido", pero el negocio que pagó queda activo siempre.

> **Por qué se permite el efectivo:** en el mercado objetivo, exigir tarjeta cierra puertas. El
> negocio que paga en efectivo está protegido (se activa al instante); el candado de "entrega
> pendiente + confirmación" recae sobre el **vendedor**, no sobre el negocio.

> ⚠️ **PENDIENTE a implementar en el Camino B — el "robo invisible":**
> El caso peor no es "registra y no entrega" (ese ya queda con faltante visible). Es el vendedor
> que **cobra en efectivo y NUNCA registra la venta** — para el sistema, esa venta no existe, y el
> negocio cree que pagó. El sistema no puede detectar un robo que nunca se registró.
>
> **Defensas ELEGIDAS (decisión tomada) — se construyen junto con el Camino B:**
> 1. **Comprobante automático al negocio** al registrar el cobro (recibo por correo/SMS/in-app: "recibimos tu pago de $X, tu membresía está activa hasta Y"). Hace que registrar sea inseparable de cobrar: si el negocio no recibe comprobante, esa es la señal de alarma.
> 2. **Visibilidad del estado de membresía en la página de cuenta/perfil del dueño** (ve "activo hasta X" con su fecha de vencimiento) — **fuera del BS, accesible desde el modo Personal**. Convierte al negocio en auditor: si pagó en efectivo y su BS dice "vencido", reclama a AnunciaYA (no al vendedor) → se cacha el robo. Reusa las 5 columnas de estado de membresía ya creadas.
>
> Estas dos atacan el robo de raíz: solo funciona si el negocio **no se entera**; con comprobante + visibilidad, **siempre se entera**.
>
> **Capa futura (no prioritaria):** conciliación contra el mapa/cartera del v2 (cruzar lo reportado por el vendedor vs. negocios visitados vs. lo que los negocios dicen haber pagado).
> **Descartado:** pedir que el negocio confirme cada pago — le da trabajo que no hará; las dos defensas elegidas ya lo cubren sin pedirle nada.
> El robo no se previene al 100% (riesgo inherente del efectivo, ya aceptado), pero estas defensas lo hacen **detectable y de una sola vez**.

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

**Estados de membresía (4):** `al corriente` · `en gracia` · `suspendido` · `cancelado`.
- **En gracia** = le falló el cobro pero sigue dentro de su plazo de gracia. El negocio **sigue funcionando y visible**, marcado como "en riesgo" para que el vendedor corra a salvarlo.
- **Para comisiones:** `en gracia` **todavía cuenta como activo** (no se castiga al vendedor por un tropiezo temporal). Solo deja de contar cuando cae a `suspendido` (se acabó la gracia sin pagar).
- **Estado guardado en `negocios`** (5 columnas nuevas): `estado_membresia` + `fecha_vencimiento`, `fecha_proximo_cobro`, `fecha_inicio_gracia`, `fecha_limite_gracia`. La **fecha límite de gracia se calcula y se fija UNA VEZ** al entrar en gracia (no se deriva de la config cada vez): si se cambia el periodo de gracia en el Panel, los negocios que ya estaban en gracia conservan su plazo original; solo los nuevos usan el nuevo número.

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

Hallazgos del inventario (3 Jun 2026). **Actualización (4 Jun 2026): toda la Fase 0 ya está RESUELTA** (atribución Camino A, rol + auth del Panel, enforcement de estado, webhook, configs, región por rol) — marcadas ✅ abajo. Los renglones 🟧/🟦 siguen pendientes. Estado vivo en `docs/reportes/PENDIENTES_PanelAdmin.md`.

| Pendiente | Estado | Impacto |
|---|---|---|
| **Atribución vendedor↔negocio en el checkout** | ✅ Resuelto (Camino A) | El `?ref=` viaja por la metadata de Stripe y llena `negocios.embajadorId` + `usuarios.referidoPor`; un ref inválido nunca bloquea la venta. **Ya NO escribe `region_id`** (la región del negocio se deduce de la ciudad de su sucursal). Pendiente solo el **Camino B** (efectivo). |
| **Rol de equipo en cuentas + auth del Panel** | ✅ Resuelto | `usuarios.rol_equipo` + `region_id`, rol en el JWT, middleware `requierePanel` que revalida en BD (gate dual con `x-admin-secret` legacy). El Panel usa el mismo login + `GET /api/admin/yo`. Ver §Seguridad. |
| **Enforcement de `usuarios.estado`** | ✅ Resuelto | El login bloquea cuentas no-activas (403 `CUENTA_SUSPENDIDA`/`CUENTA_INACTIVA`), `requierePanel` corta al instante (revalida BD) y el refresh corta sesiones vivas. |
| **Webhook `subscription.updated`** | ✅ Resuelto | Estado de membresía (5 columnas + ciclo de 4 estados) + webhook real (`invoice.payment_succeeded`/`failed` + `subscription.*`) + cron diario de gracia. "Activo = al corriente" ya funciona. |
| **Configs decorativas + helper `obtenerConfig()`** | ✅ Resuelto | Helper `obtenerConfig()` (cache 5 min), clave nueva `periodo_gracia_cobro_dias=14`, trial y gracia a 14 días. `configuracionSistema` ya se lee. |
| **Región del miembro de equipo: una fuente por rol** | ✅ Implementado | `requierePanel` resuelve la región según el rol: **Gerente** → `usuarios.region_id`, **Vendedor** → deducida de `embajador_ciudades`, **SuperAdmin** → null. Sin replicar el dato (evita desincronización). |
| **`embajadores` tiene porcentajes viejos** | 🟧 ajuste | La tabla tiene `porcentaje_primer_pago` y `porcentaje_recurrente` del diseño viejo de %. La decisión es **monto fijo** → quitarlos al construir comisiones. `embajadores.region_id` **se elimina** (Paso 10 de la migración ciudad↔región): la región del vendedor ahora se deduce de **`embajador_ciudades`**. Mantener `codigo_referido`, `estado`. Revisar si `negocios_registrados` se guarda o se calcula. |
| **Migración de ciudades a BD** | ✅ Hecho (falta UI) | La tabla **`ciudades`** ya existe en BD y está poblada desde `ciudadesPopulares` (modelo ciudad↔región rediseñado). Falta la **UI del Panel** para habilitar/agrupar ciudades, y que el buscador del onboarding lea de BD (hoy aún lee del catálogo + mapea a `ciudad_id` al guardar). |
| **Seguridad: galería DELETE solo-dueño** | 🟧 parcial | Cierre parcial aplicado (commit `c3d5951`). Falta: permitir gerente + validar `imageId ∈ sucursal` en `eliminarImagenGaleria`. |
| **Seguridad: POST gemelos sin guard** | 🟧 pendiente | `POST /sucursal/:id/foto-perfil` y `POST /:id/logo` (subir) usan `req.params.id` sin guard de propiedad — mismo hueco que ya se cerró en los DELETE. |
| **Región/ciudad en `usuarios`** | 🟦 futuro | La tabla `usuarios` **no tiene** columna de ciudad/región (confirmado). Para delegar la gestión de usuarios a gerentes por región se necesita: crear la **página de perfil de usuario** (no existe; ahí irían género/avatar/ciudad), agregar la columna de ubicación y poblarla. Por eso **hoy suspender usuarios = solo SuperAdmin**. |
| **Defensas del efectivo (robo invisible)** | 🟦 futuro · Camino B | El negocio se activa al registrarse el cobro (NO depende de confirmación). El riesgo es el vendedor que cobra y **nunca registra**. **Defensas elegidas (decisión tomada), se construyen con el Camino B:** (1) **comprobante automático al negocio** al registrar el cobro, (2) **visibilidad del estado de membresía en la página de cuenta/perfil del dueño** (fuera del BS, accesible desde el modo Personal; el negocio se vuelve auditor). Conciliación contra el mapa = capa futura del v2. Pedir confirmación al negocio = descartado. Detalle en §Motor de venta → Camino B y §Suscripciones. |

---

## Schema relevante (estado actual)

Tablas ya creadas pero **dormidas** (base del Panel — no eliminar):

| Tabla / columna | Propósito | Estado |
|---|---|---|
| `ciudades` (id, nombre, estado, pais, `slug` único, lat/lng, alias, importancia, activa, region_id→regiones) | **Catálogo real de ciudades** (poblado desde `ciudadesPopulares`); `region_id` = región a la que pertenece | **viva** — poblada; falta UI de gestión |
| `regiones` (id, nombre **único**, activa, created_at) | **Agrupador** de ciudades (ej. "Sonora-Norte"). Ya **sin `estado`/`pais`** | viva — adelgazada (2 de ejemplo en dev) |
| `embajador_ciudades` (embajador_id, ciudad_id) PK compuesta + trigger "una región" | Cobertura del vendedor (1+ ciudades, misma región) | **viva** — poblada en dev |
| `negocio_sucursales.ciudad_id` (→ ciudades) | Ancla de la sucursal a una ciudad; la región se deduce | **viva** — poblada (41/43 en dev); se llena al guardar ubicación |
| `negocios.metodo_cobro` (tarjeta/manual) · `negocios.estado_admin` (activo/suspendido/archivado) | Eje administrativo del Panel (Parada 1/2) | **vivas** |
| `pagos_membresia` (monto, `concepto` efectivo/transferencia/cortesia, meses_cubiertos, periodo_hasta, registrado_por→usuarios, fecha_pago) · CHECK: en `cortesia` el monto debe ser NULL | Registra cada pago de membresía **manual** del alta sin Stripe (10 Jun 2026) | **viva** |
| `admin_auditoria` (actor, acción, entidad, antes/después, motivo) | Bitácora de acciones sensibles del Panel | **viva** |
| `embajadores` (usuarioId, codigoReferido, porcentajes viejos, estado, negociosRegistrados; `region_id` **se elimina** — Paso 10) | Vendedores con código referido; la región sale de `embajador_ciudades` | parcial — atribución activa, comisiones dormidas |
| `usuarios.esEmbajador` / `usuarios.referidoPor` (→ embajadores.id) | Marca de vendedor y referidor | `referidoPor` se llena en el checkout |
| `usuarios.region_id` | Zona de mando del **Gerente Regional** (se conserva) | viva |
| `negocios.embajadorId` (`negocios.region_id` **se elimina** — Paso 10) | **Atribución** al vendedor; la región del negocio se deduce de la ciudad de su sucursal | parcial |
| `embajadorComisiones` (embajadorId, negocioId, tipo, montoBase, montoComision, estado) | Comisiones | dormida — modela %, ajustar a monto fijo |
| `configuracionSistema` (clave-valor) | Config global sin código | poblada; el helper `obtenerConfig()` ya la lee (Ronda 3). Falta la **UI** de la sección Configuración |

> **Helper compartido `crearNegocioConDueno(ejecutor, datos)`** (`services/negocioManagement.service.ts`): crea usuario + negocio + sucursal en una transacción y nace la cuenta del dueño con `contrasenaHash=null` + `correoVerificado=true`. **Lo usan AMBOS flujos de alta** — el **alta con tarjeta** (webhook `checkout.session.completed` en `pago.service.ts`) y el **alta manual** sin Stripe — extraído del webhook sin regresión para no duplicar lógica.

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
│   ├── sesion.controller.ts                 ← existe (GET /api/admin/yo)
│   └── (futuro) negocios, usuarios, suscripciones, vendedores,
│       comisiones, metricas-globales, ciudades, configuracion,
│       publicidad, equipo, auditoria
├── services/admin/
│   └── mantenimiento.service.ts             ← existe
├── routes/admin/
│   ├── index.ts                             ← agregador (gate global + monta /yo antes)
│   ├── mantenimiento.routes.ts              ← existe
│   └── sesion.routes.ts                     ← existe (/yo, 3 roles)
├── middleware/
│   ├── panel.middleware.ts                  ← gate real por rol (requierePanel)
│   └── adminSecret.middleware.ts            ← legacy (gate temporal, dentro del dual)
└── utils/
    └── imageRegistry.ts                     ← transversal
```

El **frontend** del Panel vive en su propia app: `apps/admin/` (ver §Frontend del Panel).

**Regla:** sub-carpeta `admin/` cuando hay 2+ archivos o el dominio es puramente admin. Middleware/utils transversales → carpeta raíz.

---

## Seguridad / Autenticación

### Auth real con rol — IMPLEMENTADA (Fase 0)
El gate del Panel ya **no** depende solo del `x-admin-secret`. Construido:
1. **Rol de equipo** (`usuarios.rol_equipo`: superadmin / gerente / vendedor) + `usuarios.region_id`, sobre la misma tabla `usuarios` (sin tabla separada ni login aparte). El rol viaja en el JWT (login + refresh).
2. Middleware **`requierePanel(roles[])`** (`apps/api/src/middleware/panel.middleware.ts`): **revalida el rol contra la BD** en cada petición (quitar/cambiar el rol surte efecto al instante), corta cuentas no-activas (enforcement de `usuarios.estado`), y resuelve la región según el rol (gerente→`usuarios.region_id`, vendedor→deducida de `embajador_ciudades`, superadmin→null). Deja `req.usuarioPanel = { usuarioId, rolEquipo, regionId, viaSecret }`.
3. **Gate dual durante la transición** (`routes/admin/index.ts`): acepta `x-admin-secret` (legacy, reconcile R2) **O** un JWT con rol válido. El `requireAdminSecret` original se conserva dentro del dual y se retira cuando todo migre al rol.
4. **`GET /api/admin/yo`** (`controllers/admin/sesion.controller.ts` + `routes/admin/sesion.routes.ts`): identidad del Panel. Responde a los **3 roles** (se monta **antes** del gate global de superadmin) y devuelve `rolEquipo` + `regionId` + datos básicos. Es el guard que usa el frontend para decidir el acceso: si la cuenta no tiene rol de equipo → 403.

### Cuenta sin contraseña (modelo C — alta manual) — IMPLEMENTADA (10 Jun 2026)
La cuenta del dueño dada de alta **manualmente** desde el Panel nace **sin contraseña** (`contrasenaHash=null`, `correoVerificado=true`, perfil comercial): la define en su **primer ingreso** con un código por correo, sin que el vendedor maneje credenciales.
- **Login (`auth.service.ts → loginUsuario`):** una cuenta sin contraseña que **no** es de Google responde **409 `CUENTA_SIN_CONTRASENA`**; el frontend la lleva a la vista "Crea tu contraseña".
- **Recuperación (`solicitarRecuperacion`):** también envía el código a estas cuentas y elige la **plantilla** según `contrasenaHash`: "crear contraseña" si es `null` (alta manual) vs. "restablecer contraseña" si ya tenía una. Plantillas en `utils/email.ts` (`enviarCodigoCrearContrasena`).

### 2FA del Panel — IMPLEMENTADA (opcional, por cuenta)
Verificación en dos pasos (TOTP, Google Authenticator) **en la puerta del Panel**, **separada** del 2FA general de AnunciaYA para no afectar el login de la app:
- **Columnas propias** en `usuarios`: `panel_2fa_habilitado` + `panel_2fa_secreto` (migración `docs/migraciones/2026-06-04-panel-2fa.sql`). NO se reusa `doble_factor_*`. **Sin códigos de respaldo** (salida de emergencia = apagar `panel_2fa_habilitado` en BD a mano).
- **Opcional para los 3 roles:** cada cuenta de equipo (superadmin / gerente / vendedor) lo prende o apaga desde **Mi cuenta → Seguridad**.
- **Candado real "en la puerta":** el JWT lleva un claim `panel2fa` que solo ponen los tokens emitidos por `/api/admin/2fa/verificar`; el refresh lo **propaga**. `requierePanel` **exige** ese claim cuando la cuenta tiene el 2FA prendido (segundo parámetro `{ exigir2FA }`, default `true`). **Exentas:** `/yo` y `/2fa/verificar` (para poder descubrir y completar el 2FA). Tener la contraseña + un token sin la marca **no** abre el Panel.
- **Endpoints** (`controllers/admin/seguridad.controller.ts` + `services/admin/seguridad.service.ts` + `routes/admin/seguridad.routes.ts`): `POST /2fa/generar` (QR), `/2fa/activar` (confirma y prende), `/2fa/desactivar`, `/2fa/verificar` (en la puerta), `GET /2fa/estado`. Reusa `otplib` + `qrcode` (mismo patrón que el 2FA general).
- **Activar y verificar emiten tokens ya marcados** (`panel2fa: true`) para que la cuenta no quede bloqueada a sí misma tras prender el 2FA.

---

## Frontend del Panel (`apps/admin`)

App web **aparte**, espejo de `apps/web`, construida en la sesión del 4 Jun 2026.

- **Stack/cableado:** React 19 + Vite + Tailwind v4 (tokens vía `@theme` en `index.css`) + React Query + Zustand, **versiones idénticas a `apps/web`**. Puerto dev **3100**, proxy `/api` → backend local (sin CORS en dev). `tsconfig` extiende `tsconfig.base.json`; alias `@` y `@anunciaya/shared`. `vercel.json` con rewrite SPA. Tipografía **IBM Plex Sans**.
- **Sesión aislada:** prefijo de localStorage propio (`ayadmin_`) + store propio (`useAuthPanelStore`), independiente de la sesión de la app pública.
- **Login (`/`):** acceso real contra `/auth/login`; tras autenticar, valida el rol con `GET /api/admin/yo` (sin rol → "sin acceso al Panel"). **Recuperar contraseña** funciona (código de 6 dígitos por correo, reusa `/auth/olvide-contrasena` + `/auth/restablecer-contrasena`). **2FA del Panel** cableado: si la cuenta lo tiene prendido, tras la contraseña se pide el TOTP. "Recordar mi correo" guarda **solo el correo**.
- **Refresh automático:** el axios del Panel renueva el token con `/auth/refresh` ante un 401 (con cola para refresh simultáneos); si falla, cierra sesión. La sesión ya no se cae sola.
- **Seguridad (Mi cuenta):** pantalla con el interruptor del **2FA del Panel**, accesible desde el menú del **avatar** (sidebar escritorio / cajón móvil), para los 3 roles.
- **Shell (`/inicio`) — RESPONSIVE (no por rol):** en pantalla grande (`lg:`+) vista **escritorio** (header negro + sidebar + panel flotante "inset"); en móvil vista **móvil** (header + saludo/región + **tab-bar** inferior, o **cajón** vía "Más" cuando el rol ve >5 secciones). El **rol solo filtra** el menú/alcance (qué secciones, etiquetas "Mi cartera"/"Mis comisiones", selector de región vs región fija).
- **Tema claro/oscuro** con toggle (variables CSS por `data-tema`).
- **Nombres de región: REALES** (gerente/vendedor ven su región vía `/api/admin/yo`; superadmin filtra por regiones reales de `GET /api/admin/regiones` — ver §Filtro global de región). **Aún demo (placeholder):** contadores del menú y la bandeja de pendientes (se conectan al construir cada sección).
- **Estructura:** `pages/` (PaginaLogin, PaginaPanel), `components/acceso/` (login), `components/shell/` (layouts, header, sidebar, tab-bar, cajón, selector de región, pendientes), `data/menuPanel.ts` (menú + roles + demo), `router/` (RutaPanel guard), `services/` (api aislado, authPanel, sesionPanel), `stores/`, `hooks/`, `config/`, `utils/`.

> **Despliegue (pendiente, manual):** proyecto Vercel propio con Root Directory `apps/admin`; subdominio `admin.anunciaya.mx` (Namecheap + Vercel); sumar ese origen al CORS de `apps/api` (en dev no hace falta: el proxy de Vite lo evita).

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
- **El efectivo nunca afecta al negocio.** Un negocio que paga en efectivo se activa de inmediato (pagó de buena fe). El riesgo del robo lo absorbe AnunciaYA, no el negocio: lo condicionado a la entrega es la **comisión del vendedor**, no la activación. Contra el "robo invisible" (cobrar y no registrar) se eligieron dos defensas: **comprobante automático al negocio** + **visibilidad del estado de membresía en su página de cuenta/perfil** (fuera del BS, accesible desde el modo Personal; el negocio como auditor). Pedir confirmación al negocio se descartó; la conciliación contra el mapa queda para el v2.
- **Sin aprobación de negocios (Modelo A).** Los negocios se publican automáticamente al pagar + completar onboarding; ningún admin los revisa antes. Menos fricción, coherente con cómo ya funciona el sistema. Por eso "negocios por aprobar" NO existe como tarea ni en la cola de pendientes.
- **Cola de pendientes = centro de trabajo, no notificaciones.** El Panel no tiene feed de notificaciones (eso es de la app de cliente). Tiene una cola de tareas accionables: efectivo por confirmar, negocios en gracia, vendedores con faltante. Regla: si lleva a hacer algo, entra; si solo informa, va a Sistema.

### Nuevas (10 Jun 2026)
- **Alta manual de negocios sin Stripe.** Un negocio puede nacer desde el Panel (botón "Registrar negocio") sin pasar por Stripe, con `metodo_cobro='manual'`. **Quién:** SuperAdmin, Gerente (su región) y Vendedor (su región). **Atribución:** el vendedor que da el alta se **auto-atribuye**; gerente/superadmin eligen al vendedor de una lista (candado de región para el gerente) y sin vendedor no bloquea. **Concepto:** `efectivo`, `transferencia` o **`cortesia`** (alta gratis por X meses, monto NULL, sin `fecha_primer_pago`). Cubre el "alta desde el inicio" del Camino B que antes era bloqueante.
- **Cuenta del dueño sin contraseña (modelo C).** En el alta manual la cuenta nace sin contraseña (`contrasenaHash=null`, `correoVerificado=true`); el dueño la define en su **primer ingreso** con un código por correo. El login devuelve **409 `CUENTA_SIN_CONTRASENA`** y `solicitarRecuperacion` elige plantilla "crear" vs. "restablecer". Así el vendedor nunca maneja credenciales del comerciante.

### Heredadas (se conservan)
- **Sub-carpeta `admin/` en cada capa:** mantiene la convención del proyecto (archivos por tipo) agrupando por sub-dominio cuando crece el volumen.
- **El log de reconcile no registra GET:** un GET es lectura; solo las ejecuciones POST crean fila → log limpio.
- **Multi-BD en el reconcile:** bucket R2 compartido dev/prod; solo se marca huérfano lo que NADA en NINGÚN ambiente referencia. Ver `Mantenimiento_R2.md`.

---

## Archivos clave (existentes)

| Archivo | Propósito |
|---------|-----------|
| `apps/admin/` | **Frontend del Panel** (app aparte; ver §Frontend del Panel) |
| `apps/admin/src/components/negocios/DialogoRegistrarNegocio.tsx` | **Formulario "Registrar negocio"** (Panel) — alta manual sin Stripe (Negocio/Dueño/Cobro/Vendedor) |
| `apps/api/src/services/admin/altaManualNegocio.service.ts` | **Lógica del alta manual** — transacción usuario+negocio+sucursal, sella fechas, inserta `pagos_membresia`, auditoría y correo de bienvenida; `listarCatalogoCiudades` |
| `apps/api/src/validations/admin/altaManualNegocio.schema.ts` | **Validación Zod** del alta manual (correo×2, concepto, monto/cortesía, meses, embajador) |
| `apps/api/src/services/negocioManagement.service.ts` | Servicio CRUD centralizado + **helper `crearNegocioConDueno`** (compartido por alta-tarjeta y alta-manual) |
| `apps/api/src/middleware/panel.middleware.ts` | **Gate real por rol** (`requierePanel`) — revalida en BD, resuelve región |
| `apps/api/src/controllers/admin/sesion.controller.ts` | `GET /api/admin/yo` — identidad del Panel (3 roles) |
| `apps/api/src/routes/admin/sesion.routes.ts` | Ruta `/yo` (montada antes del gate global) |
| `apps/api/src/middleware/adminSecret.middleware.ts` | Gate legacy (dentro del gate dual) |
| `apps/api/src/routes/admin/index.ts` | Agregador — gate global + monta `/yo` antes, registra sub-rutas |
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
