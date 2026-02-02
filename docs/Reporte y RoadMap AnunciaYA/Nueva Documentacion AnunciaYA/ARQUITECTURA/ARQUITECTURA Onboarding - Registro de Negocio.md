# 🚀 Onboarding - Registro de Negocio

> **Tipo:** Flujo multi-paso de configuración inicial  
> **Estado:** ✅ 100% Operacional (desde 20-26 Dic 2024)  
> **Última actualización:** 30 Enero 2026  
> **Versión:** 3.1.0 (Corregido contra código real)

---

## 📋 Índice

1. [¿Qué es el Onboarding?](#qué-es-el-onboarding)
2. [Los 8 Pasos del Onboarding](#los-8-pasos-del-onboarding)
3. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
4. [Sistema de Navegación](#sistema-de-navegación)
5. [Sistema de Sucursales](#sistema-de-sucursales)
6. [Flujos de Usuario](#flujos-de-usuario)
7. [Archivos del Proyecto](#archivos-del-proyecto)

---

## 🎯 ¿Qué es el Onboarding?

El Onboarding es un **proceso de 8 pasos** que ayuda y orienta a los comerciantes para crear su perfil comercial y poder estar público desde el inicio en la plataforma.

### Objetivo Principal

Guiar al comerciante en la configuración completa de su negocio para que:
- Cree su primera sucursal (principal)
- Configure toda la información necesaria
- Se haga visible públicamente en el directorio
- Obtenga acceso a Business Studio

### Al Completar el Onboarding

El sistema actualiza:
- `onboarding_completado = true`
- `es_borrador = false`  
- `modo_activo = 'comercial'`
- Redirección automática a `/business/dashboard`

---

## 📝 Los 8 Pasos del Onboarding

### Paso 1: Categorías (1/8)

**¿Qué contiene?**
- Input: Nombre del negocio (20-100 caracteres)
- Selector: Categoría principal (11 opciones con iconos)
  - 🍽️ Comida
  - 💊 Salud
  - 💄 Belleza
  - 🔧 Servicios
  - 🏪 Comercios
  - 🎪 Diversión
  - 🚗 Movilidad
  - 💼 Finanzas
  - 🎓 Educación
  - 🐶 Mascotas
  - ✈️ Turismo
- Checkboxes: Hasta 3 subcategorías (dinámicas según categoría)
- Contador visual: "2/3" muestra progreso

**Funcionalidades:**
- Búsqueda y filtrado de subcategorías
- Validación mínimo 1 subcategoría
- Guardado optimista (no espera respuesta del servidor)
- Estado persistente en store

**Validaciones:**
- Nombre único por ciudad
- Nombre entre 3-100 caracteres
- Categoría obligatoria
- Mínimo 1, máximo 3 subcategorías

---

### Paso 2: Ubicación (2/8)

**¿Qué contiene?**
- Input: Dirección completa (5-250 caracteres)
- Input: Ciudad (2-120 caracteres)
- Mapa Leaflet interactivo
- Marcador arrastrable
- Botón "Usar GPS" (detección automática)
- Zona horaria: Se calcula automáticamente según ubicación

**Funcionalidades:**
- Mapa interactivo para selección precisa
- Extracción de coordenadas PostGIS
- Validación de coordenadas dentro de México
- Guardado de ubicación geográfica

**Validaciones:**
- Dirección completa obligatoria (5-250 chars)
- Ciudad obligatoria (2-120 chars)
- Latitud: 14° - 33°
- Longitud: -118° - -86°
- Zona horaria: Calculada automáticamente según coordenadas

**Tecnología:**
- PostGIS para almacenar coordenadas
- Tipo de dato: `GEOGRAPHY(POINT, 4326)`
- Índice GIST para búsquedas espaciales

**Zonas Horarias (Detección Automática):**

El sistema calcula automáticamente la zona horaria basándose en las coordenadas geográficas:

- `America/Mexico_City` (default) - CDMX, centro del país
- `America/Hermosillo` - Sonora (sin horario de verano)
- `America/Tijuana` - Baja California
- `America/Cancun` - Quintana Roo
- `America/Mazatlan` - Sinaloa, BCS, Nayarit

El usuario NO selecciona manualmente la zona horaria; el backend la asigna según la ubicación del negocio.

---

### Paso 3: Contacto (3/8)

**¿Qué contiene?**
- Input: Teléfono con lada editable (+52, +1, +34, +593, etc.)
- Input: WhatsApp con lada editable
- Input: Correo electrónico
- Input: Sitio web (opcional)
- Checkbox: "Usar mismo número para WhatsApp"

**Funcionalidades:**
- Soporte internacional de ladas
- Validación de formato telefónico (10 dígitos)
- Sincronización automática teléfono/WhatsApp
- Al menos 1 método de contacto obligatorio

**Validaciones:**
- Teléfono: 10 dígitos + código país
- WhatsApp: formato internacional válido
- Email: formato válido
- Sitio web: URL válida (opcional)

---

### Paso 4: Horarios (4/8)

**¿Qué contiene?**
- Selector por día (Lunes - Domingo)
- Inputs: Hora de apertura y cierre
- Toggle "Abierto 24/7"
- Toggle "Cerrado" (por día)
- Checkbox "¿Tienes horario de comida/break?"
- Botón "Copiar horario a todos los días"

**Funcionalidades:**
- Configuración independiente por día
- Horario de pausa/comida opcional
- Validación de rangos horarios
- Guardado en formato JSONB

**Validaciones:**
- Al menos 1 día abierto
- Hora apertura < hora cierre
- Rangos horarios sin superposición

---

### Paso 5: Imágenes (5/8)

**¿Qué contiene?**

**Sección 1: Logo (Opcional)**
- Tamaño recomendado: 500x500px
- Drag & drop o click para subir
- Preview instantáneo

**Sección 2: Portada (Obligatorio)**
- Tamaño recomendado: 1600x900px
- Se muestra en parte superior del perfil
- Badge "✅ Guardado" cuando hay imagen

**Sección 3: Galería (Mínimo 1, Máximo 10)**
- Tamaño recomendado: 1200x1200px por imagen
- Drag & drop múltiple
- Grid de previsualizaciones
- Botón eliminar en cada imagen

**Funcionalidades:**
- Upload optimista (preview instantáneo antes de confirmar)
- Optimización automática a .webp (~90% ahorro de espacio)
- Upload diferido a Cloudinary (evita imágenes huérfanas)
- Eliminación dual (Cloudinary + Base de datos)

**Validaciones:**
- Portada obligatoria
- Mínimo 1 foto en galería
- Máximo 10 fotos en galería
- Formatos: JPG, PNG, WEBP

---

### Paso 6: Métodos de Pago (6/8)

**¿Qué contiene?**
- Checkbox: 💵 Efectivo
- Checkbox: 💳 Tarjeta (débito/crédito)
- Checkbox: 🏦 Transferencia bancaria
- Nota: "Solo informativo - Aparecerán como badges en tu perfil"

**Funcionalidades:**
- Selección múltiple
- Aparecen como badges en perfil público
- No procesa pagos (solo informativo)

**Validaciones:**
- Mínimo 1 método obligatorio

---

### Paso 7: Sistema de Puntos (7/8)

**¿Qué contiene?**

**Sección 1: Explicación CardYA**
"Es el sistema de lealtad de AnunciaYA donde tus clientes acumulan puntos por cada compra y pueden canjearlos por recompensas en tu negocio"

**Sección 2: Toggle Participación**
- Toggle: "¿Quieres participar en CardYA?"
- Label: "Tus clientes podrán ganar puntos"

**Sección 3: Beneficios**
- ✅ Clientes recurrentes
- ✅ Mayor ticket promedio
- ✅ Fidelización digital
- ✅ Sin costo adicional

**Sección 4: Cómo Funciona**
1. Cliente realiza compra
2. Negocio escanea QR del cliente con ScanYA
3. Puntos se acreditan automáticamente
4. Cliente canjea puntos por descuentos

**Sección 5: Configuración Posterior**
"Podrás definir cuántos puntos otorgas por peso gastado y las recompensas disponibles desde tu Business Studio"

**Funcionalidades:**
- Paso informativo/educativo
- Sin validación obligatoria
- Puede activar/desactivar

---

### Paso 8: Productos o Servicios (8/8)

**¿Qué contiene?**
- Botón "+ Agregar"
- Lista de productos agregados (con contador)
- Modal para agregar/editar producto

**Modal Agregar Producto:**
- Radio: Tipo (Producto físico / Servicio trabajo)
- Input: Nombre (obligatorio)
- Textarea: Descripción (0-1000 caracteres, opcional)
- Input: Precio en MXN (obligatorio)
- Upload: Imagen (opcional, optimizada a .webp)

**Por cada producto en lista:**
- Thumbnail de imagen
- Nombre
- Descripción (si tiene)
- Precio
- Badge: "Producto" o "Servicio"
- Botones: ✏️ Editar | 🗑️ Eliminar

**Funcionalidades:**
- Formulario agregar/editar productos
- Upload imagen por producto
- Editar productos existentes
- Eliminar productos
- Contador "11/3 mínimo agregados"

**Validaciones:**
- Mínimo 3 productos para PUBLICAR negocio
- Mínimo 1 producto para GUARDAR borrador
- Nombre obligatorio
- Precio obligatorio (> 0)
- Descripción máximo 1000 caracteres

**Botón Final:**
- "✅ Finalizar configuración" (habilitado con 3+ productos)
- Al hacer click: marca onboarding como completado y redirige a Business Studio

---

## 🏗️ Decisiones Arquitectónicas

### 1. ¿Por qué 8 pasos en lugar de 1 formulario largo?

**Problema identificado:**
- Formularios largos abruman al usuario
- Alta tasa de abandono
- Difícil de validar
- No se puede guardar progreso parcial

**Solución implementada:**
- 8 pasos cortos (~2-4 minutos cada uno)
- Sensación de progreso (indicador visual)
- Validación incremental
- Botón "Pausar progreso" permite continuar después
- Guardado automático después de cada paso

**Resultado:**
- Mayor tasa de completitud
- Menor fricción
- Mejor experiencia de usuario

---

### 2. Sistema de Sucursales desde el Inicio

**Cambio arquitectónico importante** (implementado Dic 2024):

**ANTES:**
```
negocio → dirección, teléfono, horarios (todo en tabla negocios)
```

**AHORA:**
```
negocio → ciudad general, correo, sitio_web
    └── sucursales (N)
        ├── Principal (creada en onboarding)
        │   └── dirección, teléfono, horarios, ubicación PostGIS
        └── Adicionales (futuras, desde Business Studio)
```

**Razones:**
- Preparar para negocios con múltiples ubicaciones
- Sistema de Puntos a nivel NEGOCIO (compartido entre sucursales)
- Transacciones/Canjes a nivel SUCURSAL (trazabilidad)
- Horarios independientes por sucursal
- Empleados asignados a sucursales específicas

**Impacto en Onboarding:**
- Crea automáticamente la SUCURSAL PRINCIPAL
- Usuario no necesita entender concepto de "sucursales"
- Configuración futura desde Business Studio

---

### 3. Negocios Solo Físicos (Actualizado 06/01/2026)

**Decisión:**
Todos los negocios requieren ubicación física obligatoria.

**Eliminado:**
- Tipo "Online"
- Columna `requiere_direccion`

**Agregado:**
- `tiene_servicio_domicilio` (boolean)
- `tiene_envio_domicilio` (boolean)

**Razón:**
- Simplifica la lógica del sistema
- AnunciaYA se enfoca en comercio local
- Paso de Ubicación (con mapa) es obligatorio
- Negocios pueden ofrecer envío, pero deben tener ubicación física

---

### 4. Optimización de Imágenes Client-Side

**Configuración implementada:**
```
Logo:      maxWidth 500px,  quality 0.85, format webp
Portada:   maxWidth 1600px, quality 0.85, format webp
Galería:   maxWidth 1200px, quality 0.85, format webp
Productos: maxWidth 800px,  quality 0.85, format webp
```

**Razón:**
- Reducción ~90% tamaño de archivo
- Carga más rápida en perfiles públicos
- Menor uso de ancho de banda
- Optimización antes de subir a Cloudinary

---

### 5. Upload Diferido (No Inmediato)

**Funcionamiento:**
1. Usuario selecciona imagen
2. Preview local instantáneo (`URL.createObjectURL`)
3. NO se sube a Cloudinary inmediatamente
4. Upload ocurre al hacer click en "Siguiente paso"
5. Si usuario cancela, no quedan imágenes huérfanas

**Razón:**
- Evita imágenes huérfanas en Cloudinary
- Usuario puede cambiar de opinión
- Mejor control de costos
- Experiencia más fluida (preview instantáneo)

---

### 6. Validación Flexible de Productos

**Dos niveles de validación:**
- **Guardar borrador:** Mínimo 1 producto
- **Publicar negocio:** Mínimo 3 productos

**Razón:**
- Permite guardar progreso aunque no tenga todo listo
- Publicar con 3+ productos da mejor impresión a clientes
- Balance entre flexibilidad y calidad

---

### 7. Paso de Puntos: Educativo, No Obligatorio

**Diseño del paso:**
- Explica qué es CardYA
- Muestra beneficios
- Explica cómo funciona
- Toggle opcional (no obligatorio)

**Razón:**
- Educación antes de decisión
- Usuario comprende beneficios del sistema de lealtad
- Puede activar/desactivar sin presión
- Configuración detallada después en Business Studio

---

## 🧭 Sistema de Navegación

### Indicador de Progreso

**Ubicación:** Sidebar izquierdo (visible en todos los pasos)

**Elementos:**
- Número de paso (1-8)
- Nombre descriptivo del paso
- Estado visual:
  - ✅ Completado (pasos anteriores)
  - 🔵 Activo (paso actual)
  - ⚪ Pendiente (pasos siguientes)

**Botón especial:**
- "⏸️ Pausar progreso" (sidebar)
  - Muestra confirmación
  - Guarda progreso actual
  - Redirige a `/inicio`

---

### Botones de Navegación

**Ubicación:** Footer de cada paso

**Botones:**
- "← Anterior" (habilitado desde paso 2)
- "Siguiente paso →" (validación antes de avanzar)
- "✅ Finalizar configuración" (solo paso 8, con 3+ productos)

**Comportamiento:**
- Validación frontend antes de avanzar
- Guardado automático al avanzar
- Notificación de éxito/error
- Deshabilitado durante guardado

---

### Guardado Automático

**Estrategia:** Guardar después de cada paso exitoso

**Flujo:**
1. Usuario completa campos del paso
2. Click en "Siguiente paso →"
3. Validación frontend
4. Guardado en backend
5. Actualización del store local
6. Notificación "✅ Paso X guardado"
7. Navegación al siguiente paso

**En caso de error:**
- No avanza al siguiente paso
- Muestra mensaje de error específico
- Usuario puede corregir y reintentar

---

### Reanudar Onboarding

**Escenario:** Usuario pausó y regresa días después

**Flujo:**
1. Usuario hace login
2. Sistema detecta:
   - `tieneModoComercial = true`
   - `onboardingCompletado = false`
3. Auto-redirige a `/business/onboarding`
4. Usuario continúa desde el último paso guardado
5. Datos previos intactos y cargados

---

## 🏢 Sistema de Sucursales

### Estructura Implementada

```
NEGOCIO (Tabla: negocios)
├── id
├── nombre
├── descripcion
├── ciudad_general
├── correo_general
├── sitio_web_general
└── SUCURSALES (Tabla: negocio_sucursales)
    ├── Principal (creada en onboarding)
    │   ├── direccion_completa
    │   ├── telefono
    │   ├── whatsapp
    │   ├── horarios (JSONB)
    │   ├── ubicacion (PostGIS)
    │   ├── logo
    │   ├── portada
    │   └── galeria (array)
    └── Adicionales (futuras)
```

### Creación Automática

**Durante Onboarding:**
- Al completar Paso 1 (Categorías):
  - Se crea registro en tabla `negocios`
  - Se crea automáticamente SUCURSAL PRINCIPAL
  - Usuario NO ve concepto de "sucursales"
- Pasos 2-8:
  - Actualizan datos de la SUCURSAL PRINCIPAL

### Futuro: Múltiples Sucursales

**Desde Business Studio** (después del onboarding):
- Agregar sucursales adicionales
- Cada sucursal con:
  - Dirección independiente
  - Horarios independientes
  - Empleados asignados
  - Teléfono/contacto propio
- Sistema de Puntos compartido entre todas las sucursales

---

## 🚶 Flujos de Usuario

### Flujo 1: Onboarding Completo en 1 Sesión

```
Usuario crea cuenta comercial
  ↓
Primera vez → Redirige a /business/onboarding
  ↓
Paso 1 → Categorías (3 min)
  ↓
Paso 2 → Ubicación (4 min, mapa interactivo)
  ↓
Paso 3 → Contacto (2 min)
  ↓
Paso 4 → Horarios (5 min, configurar 7 días)
  ↓
Paso 5 → Imágenes (6 min, subir y optimizar)
  ↓
Paso 6 → Métodos de Pago (2 min)
  ↓
Paso 7 → Sistema de Puntos (3 min, lectura)
  ↓
Paso 8 → Productos (5 min, agregar mínimo 3)
  ↓
Click "Finalizar configuración"
  ↓
Sistema marca onboarding_completado = true
  ↓
Notificación: "¡Felicidades! Tu negocio ya está público"
  ↓
Redirige a /business/dashboard
```

**Tiempo total estimado:** ~30 minutos

---

### Flujo 2: Pausar y Continuar Después

```
Usuario en Paso 4 (Horarios)
  ↓
Click "⏸️ Pausar progreso"
  ↓
Modal: "¿Pausar configuración? Tu progreso se guardará"
  ↓
Usuario confirma
  ↓
Sistema guarda:
  - Pasos 1-3 completados ✅
  - Paso 4 sin completar
  - onboarding_completado = false
  ↓
Redirige a /inicio (modo Personal)
  ↓
[Pasan 2 días]
  ↓
Usuario hace login nuevamente
  ↓
Sistema detecta: tieneModoComercial=true, onboardingCompletado=false
  ↓
Auto-redirige a /business/onboarding
  ↓
Carga Paso 4 con datos guardados
  ↓
Continúa desde donde quedó
```

---

### Flujo 3: Navegación con Botón "Anterior"

```
Usuario en Paso 5 (Imágenes)
  ↓
Click "← Anterior"
  ↓
Sistema guarda cambios del Paso 5 (si hay)
  ↓
Navega a Paso 4 (Horarios)
  ↓
Usuario corrige algo en horarios
  ↓
Click "Siguiente paso →"
  ↓
Guarda Paso 4 actualizado
  ↓
Vuelve a Paso 5 con imágenes intactas
```

---

### Flujo 4: Error de Validación

```
Usuario en Paso 1 (Categorías)
  ↓
Llena nombre: "AB" (muy corto, mínimo 20 caracteres)
  ↓
No selecciona ninguna subcategoría
  ↓
Click "Siguiente paso →"
  ↓
Validación frontend detecta errores:
  - Nombre muy corto (marca input en rojo)
  - Falta subcategoría (mensaje de error)
  ↓
NO avanza al siguiente paso
  ↓
Usuario corrige errores
  ↓
Validación pasa
  ↓
Avanza a Paso 2
```

---

### Flujo 5: Finalización

```
Usuario en Paso 8 (Productos)
  ↓
Ha agregado 5 productos ✅ (mínimo 3)
  ↓
Click "✅ Finalizar configuración"
  ↓
Backend recibe:
  POST /api/onboarding/:id/finalizar
  ↓
Backend actualiza:
  - onboarding_completado = true
  - es_borrador = false
  - modo_activo = 'comercial'
  ↓
Frontend:
  - Actualiza store de autenticación
  - Muestra notificación SweetAlert2:
    "¡Felicidades! 🎉
     Tu negocio ya está público en AnunciaYA"
  ↓
Redirige a /business/dashboard
  ↓
Usuario ve Dashboard de Business Studio por primera vez
```

---

## 📂 Archivos del Proyecto

### Estructura Frontend Real

**Ubicación:** `apps/web/src/`

#### Páginas y Componentes de Onboarding

```
pages/private/business/onboarding/
├── PaginaOnboarding.tsx                  (Página principal, coordina los 8 pasos)
│
├── componentes/
│   ├── BotonesNavegacion.tsx            (Botones Anterior/Siguiente)
│   ├── IndicadorPasos.tsx               (Sidebar con progreso 1-8)
│   ├── LayoutOnboarding.tsx             (Layout estilo Stripe)
│   ├── ModalAgregarProducto.tsx         (Modal para Paso 8)
│   ├── ModalPausar.tsx                  (Confirmación pausar progreso)
│   └── index.ts
│
└── pasos/
    ├── PasoCategoria.tsx                (Paso 1: Nombre + Categorías)
    ├── PasoUbicacion.tsx                (Paso 2: Mapa + Dirección)
    ├── PasoContacto.tsx                 (Paso 3: Teléfono + Email + Web)
    ├── PasoHorarios.tsx                 (Paso 4: Lun-Dom + Breaks)
    ├── PasoImagenes.tsx                 (Paso 5: Logo + Portada + Galería)
    ├── PasoMetodosPago.tsx              (Paso 6: Efectivo/Tarjeta/Transfer)
    ├── PasoPuntos.tsx                   (Paso 7: Toggle CardYA)
    ├── PasoProductos.tsx                (Paso 8: Lista productos, min 3)
    └── index.ts
```

#### Stores

```
stores/
└── useOnboardingStore.ts                (Estado global del onboarding)
```

#### Hooks

```
hooks/
├── useCategorias.ts                     (Cargar categorías)
├── useSubcategorias.ts                  (Cargar subcategorías dinámicas)
└── useOptimisticUpload.ts               (Upload optimista Cloudinary)
```

#### Services

```
services/
└── negociosService.ts                   (API calls hacia backend)
```

---

### Estructura Backend Real

**Ubicación:** `apps/api/src/`

#### Controllers

```
controllers/
├── onboarding.controller.ts             (15 endpoints onboarding)
├── negocios.controller.ts               (CRUD negocios)
├── categorias.controller.ts             (Categorías y subcategorías)
└── articulos.controller.ts              (Productos del Paso 8)
```

#### Services

```
services/
├── onboarding.service.ts                (Lógica negocio onboarding)
├── negocios.service.ts                  (Búsquedas y queries)
├── negocioManagement.service.ts         (15 funciones CRUD compartidas)
├── categorias.service.ts                (Lógica categorías)
├── articulos.service.ts                 (CRUD productos)
└── cloudinary.service.ts                (Upload/delete imágenes)
```

**Nota:** `negocioManagement.service.ts` contiene las 15 funciones CRUD que son reutilizadas tanto por Onboarding como por Business Studio (evita duplicación de lógica).

#### Routes

```
routes/
├── onboarding.routes.ts                 (15 rutas onboarding)
├── negocios.routes.ts                   (Rutas negocios)
├── categorias.routes.ts                 (Rutas categorías)
└── articulos.routes.ts                  (Rutas productos)
```

#### Validations

```
validations/
├── onboarding.schema.ts                 (Schemas Zod para onboarding)
└── articulos.schema.ts                  (Schemas Zod para productos)
```

#### Database

```
db/
├── schemas/
│   ├── schema.ts                        (Definiciones Drizzle ORM)
│   └── relations.ts                     (Relaciones entre tablas)
│
├── index.ts                             (Cliente PostgreSQL)
├── mongo.ts                             (Cliente MongoDB)
└── redis.ts                             (Cliente Redis)
```

#### Config

```
config/
├── cloudinary.ts                        (Configuración Cloudinary)
└── env.ts                               (Variables de entorno)
```

### Endpoints Implementados

Documentados en el RoadMap y verificados contra código real:

**CATEGORÍAS:**
```
GET  /api/categorias                    → Lista 11 categorías
GET  /api/categorias/:id/subcategorias  → Lista subcategorías dinámicas
```

**ONBOARDING - Endpoints Principales (13):**
```
GET  /api/onboarding/mi-negocio                    → Obtener negocio del usuario
POST /api/onboarding/:negocioId/paso1              → Paso 1: Nombre + Subcategorías
PUT  /api/onboarding/:negocioId/sucursal           → Paso 2: Ubicación (actualiza sucursal existente)
POST /api/onboarding/:negocioId/contacto           → Paso 3: Teléfono, WhatsApp, email, web
POST /api/onboarding/:negocioId/horarios           → Paso 4: Horarios 7 días
POST /api/onboarding/:negocioId/logo               → Paso 5a: Logo
POST /api/onboarding/:negocioId/portada            → Paso 5b: Portada
POST /api/onboarding/:negocioId/galeria            → Paso 5c: Galería (1-10 fotos)
POST /api/onboarding/:negocioId/metodos-pago       → Paso 6: Métodos de pago
POST /api/onboarding/:negocioId/puntos             → Paso 7: Participación CardYA
POST /api/onboarding/:negocioId/articulos          → Paso 8: Productos (mín 3 para publicar)
POST /api/onboarding/:negocioId/finalizar          → Publicar negocio
GET  /api/onboarding/:negocioId/progreso           → Estado del onboarding
```

**ONBOARDING - Endpoints Borrador (10):**

Sistema "Pausar progreso" - Guardan datos parciales SIN validación completa:

```
PATCH /api/onboarding/:negocioId/paso1/draft             → Borrador Paso 1
PATCH /api/onboarding/:negocioId/sucursal/draft          → Borrador Paso 2
PATCH /api/onboarding/:negocioId/contacto/draft          → Borrador Paso 3
PATCH /api/onboarding/:negocioId/horarios/draft          → Borrador Paso 4
PATCH /api/onboarding/:negocioId/logo/draft              → Borrador Paso 5a
PATCH /api/onboarding/:negocioId/portada/draft           → Borrador Paso 5b
PATCH /api/onboarding/:negocioId/galeria/draft           → Borrador Paso 5c
PATCH /api/onboarding/:negocioId/metodos-pago/draft      → Borrador Paso 6
PATCH /api/onboarding/:negocioId/puntos/draft            → Borrador Paso 7
PATCH /api/onboarding/:negocioId/articulos/draft         → Borrador Paso 8
```

**Nota sobre endpoints PATCH /draft:**  
Estos endpoints permiten guardar progreso parcial sin validar campos obligatorios, 
implementando la funcionalidad "Pausar progreso" documentada en los flujos de usuario.

**IMÁGENES - Eliminar (Business Studio):**
```
DELETE /api/negocios/:id/logo
DELETE /api/negocios/:id/portada
DELETE /api/negocios/:id/galeria/:imagenId
```

**Total Onboarding:** 23 endpoints (13 principales + 10 borrador)

---

## 📊 Estado del Proyecto

**Fase 5.1:** ✅ 100% Completado (Dic 2024)

**Componentes implementados:**
- ✅ Layout estilo Stripe
- ✅ Indicador de 8 pasos
- ✅ BotonesNavegacion con validación
- ✅ ModalPausar con guardado
- ✅ useOnboardingStore completo
- ✅ 8 pasos funcionando al 100%
- ✅ Sistema de Finalización
- ✅ Redirección según onboardingCompletado
- ✅ JWT incluye `onboardingCompletado`
- ✅ Cloudinary upload/delete optimista

**Tiempo de implementación:**
- Backend: ~3 días (Dic 20, 2024)
- Frontend: ~6 días (Dic 21-26, 2024)

---

## 📚 Referencias

### Documentos relacionados en el proyecto:

- `AnunciaYA_-_RoadMap_29-01-2026.md` → Información completa de implementación
- `PostgreSQL_NegociosLocales.html` → Estructura de tablas
- `ACTUALIZACION_DE_BASE_DE_DATOS_AnunciaYA.md` → Sistema de sucursales
- `AnunciaYA_Decisiones_Finales_del_Proyecto.html` → Decisiones arquitectónicas

---

**Última actualización:** 30 Enero 2026  
**Autor:** Equipo AnunciaYA  
**Versión:** 3.1.0 (Corregido contra código real)

**Cambios v3.1.0:**
- ✅ Validaciones corregidas contra schemas Zod reales
- ✅ 23 endpoints documentados (vs 15 anterior)
- ✅ Sistema draft (10 endpoints PATCH) agregado
- ✅ Zona horaria agregada (Paso 2)
- ✅ 100% verificado contra código backend
