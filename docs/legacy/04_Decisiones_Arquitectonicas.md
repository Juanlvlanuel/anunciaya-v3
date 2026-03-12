# 🧠 AnunciaYA v3.0 - Decisiones Arquitectónicas

**Última Actualización:** 26 Diciembre 2024  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Propósito de este Documento](#propósito-de-este-documento)
2. [Decisiones de Arquitectura General](#decisiones-de-arquitectura-general)
3. [Decisiones de Base de Datos](#decisiones-de-base-de-datos)
4. [Decisiones de Frontend](#decisiones-de-frontend)
5. [Decisiones de Backend](#decisiones-de-backend)
6. [Decisiones de Infraestructura](#decisiones-de-infraestructura)
7. [Decisiones de UX/UI](#decisiones-de-uxui)
8. [Decisiones Pendientes](#decisiones-pendientes)

---

## Propósito de este Documento

Este documento registra las **decisiones técnicas importantes** tomadas durante el desarrollo de AnunciaYA, incluyendo:

- **Qué** se decidió
- **Por qué** se tomó esa decisión
- **Alternativas** consideradas
- **Consecuencias** de la decisión

Esto permite:
- Entender el contexto de decisiones pasadas
- Evitar re-discutir temas ya resueltos
- Onboardear nuevos desarrolladores más rápido

---

## Decisiones de Arquitectura General

### ADR-001: Monorepo con pnpm Workspaces

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Necesitamos organizar frontend, backend y código compartido.

**Decisión:**  
Usar monorepo con pnpm workspaces.

**Alternativas Consideradas:**
| Opción | Pros | Contras |
|--------|------|---------|
| Monorepo (pnpm) | Código compartido fácil, una instalación | Mayor complejidad inicial |
| Repos separados | Independencia total | Duplicación, sincronización difícil |
| Nx/Turborepo | Herramientas avanzadas | Overhead, curva de aprendizaje |

**Consecuencias:**
- ✅ Tipos compartidos entre frontend y backend
- ✅ Una sola instalación de dependencias
- ✅ Desarrollo más ágil
- ⚠️ Deploy requiere configuración específica

---

### ADR-002: Sistema de Modos (Personal/Comercial)

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Los usuarios pueden ser consumidores (Personal) o comerciantes (Comercial).

**Decisión:**  
Un usuario = Una cuenta = Dos modos posibles con el mismo correo.

**Alternativas Consideradas:**
| Opción | Pros | Contras |
|--------|------|---------|
| 1 correo = 2 modos | UX simple, un login | Lógica más compleja |
| 2 cuentas separadas | Separación clara | 2 correos, 2 logins |
| Roles jerárquicos | Flexibilidad | Muy complejo |

**Modelo Implementado:**
```typescript
interface Usuario {
  tieneModoComercial: boolean;  // ¿Pagó suscripción?
  modoActivo: 'personal' | 'comercial';
}
```

**Consecuencias:**
- ✅ Usuario alterna modos con un toggle
- ✅ Un solo login para todo
- ✅ ChatYA unificado entre modos
- ⚠️ UI debe cambiar dinámicamente según modo

---

### ADR-003: Arquitectura Multi-Sucursal

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Un negocio puede tener múltiples ubicaciones físicas.

**Decisión:**  
Separar datos del negocio de datos por sucursal.

**Modelo Implementado:**
```
NEGOCIO (datos comunes)
├── nombre, logo, categorías
├── sistema de puntos
└── ofertas y cupones

SUCURSAL (datos por ubicación)
├── dirección, coordenadas
├── horarios
└── teléfono, contacto
```

**Consecuencias:**
- ✅ Un negocio puede tener N sucursales
- ✅ Puntos acumulan a nivel negocio
- ✅ Búsqueda geográfica por sucursal
- ⚠️ Onboarding crea sucursal principal automáticamente

---

### ADR-004: Sistema Dual de Onboarding

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Hay negocios físicos (requieren ubicación) y negocios online (no requieren).

**Decisión:**  
Campo `requiereDireccion` determina flujo de 7 u 8 pasos.

| Tipo Negocio | Pasos | Incluye Mapa |
|--------------|-------|--------------|
| Presencial | 8 | ✅ Sí |
| Online | 7 | ❌ No |

**Consecuencias:**
- ✅ Experiencia adaptada al tipo de negocio
- ✅ Negocios online no llenan datos innecesarios
- ⚠️ Indicador de pasos debe ser dinámico

---

## Decisiones de Base de Datos

### ADR-005: PostgreSQL + MongoDB (Híbrido)

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Diferentes tipos de datos requieren diferentes características.

**Decisión:**  
- **PostgreSQL:** Datos estructurados (usuarios, negocios, transacciones)
- **MongoDB:** Chat (mensajes, conversaciones)

**Razones:**
| Tipo de Dato | Necesita | Base Elegida |
|--------------|----------|--------------|
| Usuarios, negocios | Relaciones, integridad | PostgreSQL |
| Transacciones | ACID, consistencia | PostgreSQL |
| Geolocalización | PostGIS | PostgreSQL |
| Mensajes de chat | Flexibilidad, escala | MongoDB |

**Consecuencias:**
- ✅ Cada BD hace lo que mejor sabe
- ✅ Chat escala independientemente
- ⚠️ Dos conexiones que mantener
- ⚠️ Sin joins entre PostgreSQL y MongoDB

---

### ADR-006: Drizzle ORM sobre Prisma

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Necesitamos un ORM type-safe para PostgreSQL.

**Decisión:**  
Usar Drizzle ORM.

**Comparación:**
| Criterio | Prisma | Drizzle |
|----------|--------|---------|
| Type-safety | ✅ Excelente | ✅ Excelente |
| Performance | Buena | Mejor |
| Control SQL | Abstracto | Directo |
| Bundle size | ~2MB | ~50KB |
| Curva aprendizaje | Media | Baja (si sabes SQL) |

**Configuración Clave:**
```typescript
// drizzle.config.ts
export default {
  schema: './src/db/schemas/schema.ts',
  dialect: 'postgresql',
  casing: 'snake_case',  // ← Transforma automáticamente
};
```

**Consecuencias:**
- ✅ Queries más cercanas a SQL
- ✅ Mejor performance
- ✅ Transformación automática snake_case ↔ camelCase
- ⚠️ Migraciones manuales (más control)

---

### ADR-007: PostGIS para Geolocalización

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Necesitamos búsquedas por proximidad geográfica.

**Decisión:**  
Usar PostGIS con tipo `geography` para coordenadas.

**Funciones Usadas:**
```sql
-- Buscar negocios en radio de X metros
ST_DWithin(ubicacion, ST_MakePoint(lng, lat)::geography, radio)

-- Extraer coordenadas
ST_X(ubicacion::geometry)  -- Longitud
ST_Y(ubicacion::geometry)  -- Latitud
```

**Consecuencias:**
- ✅ Búsquedas espaciales eficientes
- ✅ Cálculos de distancia precisos
- ⚠️ PostGIS retorna WKB binario (requiere ST_X/ST_Y para extraer)

---

### ADR-008: Naming Convention snake_case en BD

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
PostgreSQL usa convencionalmente snake_case, TypeScript usa camelCase.

**Decisión:**  
- BD: snake_case (`negocio_id`, `created_at`)
- Código: camelCase (`negocioId`, `createdAt`)
- Drizzle transforma automáticamente

**Consecuencias:**
- ✅ BD sigue convención estándar
- ✅ Código sigue convención TypeScript
- ✅ Transformación automática sin esfuerzo

---

## Decisiones de Frontend

### ADR-009: React + Vite sobre Next.js

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Elegir framework/build tool para el frontend.

**Decisión:**  
React con Vite (SPA), no Next.js.

**Razones:**
| Criterio | Next.js | React + Vite |
|----------|---------|--------------|
| SSR/SSG | Incluido | No necesario |
| Complejidad | Mayor | Menor |
| Velocidad dev | Rápida | Muy rápida |
| SEO server-side | ✅ | ❌ (no necesario) |

**Consecuencias:**
- ✅ Desarrollo más simple y rápido
- ✅ Menor curva de aprendizaje
- ⚠️ Sin SEO server-side (aceptable para app)

---

### ADR-010: Zustand sobre Redux

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Necesitamos gestión de estado global.

**Decisión:**  
Usar Zustand.

**Comparación:**
| Criterio | Redux | Zustand |
|----------|-------|---------|
| Boilerplate | Mucho | Mínimo |
| Performance | Buena | Excelente |
| DevTools | ✅ | ✅ |
| Tamaño | ~2KB | ~1KB |

**Stores Creados:**
- `useAuthStore` - Usuario y sesión
- `useGpsStore` - Ubicación
- `useOnboardingStore` - Wizard de onboarding
- `useUiStore` - Estado de UI
- `useNotificacionesStore` - Notificaciones

**Consecuencias:**
- ✅ Código más limpio
- ✅ Menos archivos
- ✅ Fácil de entender

---

### ADR-011: Tailwind CSS v4

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Elegir sistema de estilos CSS.

**Decisión:**  
Tailwind CSS v4 (utility-first).

**Consecuencias:**
- ✅ Desarrollo rápido
- ✅ Consistencia visual
- ✅ Bundle optimizado (purge CSS)
- ⚠️ HTML con muchas clases (aceptable)

---

### ADR-012: Breakpoints Responsive

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Definir breakpoints para responsive design.

**Decisión:**  
Solo usar 3 breakpoints:

| Breakpoint | Tamaño | Uso |
|------------|--------|-----|
| default | < 1024px | Móvil (base) |
| `lg:` | ≥ 1024px | Laptop (1366x768) |
| `2xl:` | ≥ 1536px | Desktop (1920x1080+) |

**NO usar:** `sm:`, `md:`, `xl:`

**Razón:**  
Simplifica el desarrollo y cubre los dispositivos objetivo.

**Consecuencias:**
- ✅ Menos código responsive
- ✅ Fácil de mantener
- ⚠️ `xl:` evitado por altura limitada de laptops

---

## Decisiones de Backend

### ADR-013: API Responses en Inglés

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Estandarizar formato de respuestas API.

**Decisión:**  
Todas las respuestas usan estructura:
```typescript
{
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}
```

**Consecuencias:**
- ✅ Frontend sabe qué esperar
- ✅ Manejo de errores consistente
- ✅ Fácil de debuggear

---

### ADR-014: JWT + Refresh Tokens

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Implementar autenticación segura.

**Decisión:**  
- Access Token: JWT, expira en 1 hora
- Refresh Token: Almacenado en Redis, expira en 7 días

**Flujo:**
```
Login → Access Token (1h) + Refresh Token (7d)
    ↓
Access Token expira
    ↓
Refresh Token → Nuevo Access Token
    ↓
Refresh Token expira
    ↓
Re-login requerido
```

**Consecuencias:**
- ✅ Sesiones seguras
- ✅ Sin re-login frecuente
- ✅ Revocación de sesiones posible

---

### ADR-015: Validación con Zod

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Validar datos de entrada en backend.

**Decisión:**  
Usar Zod para validación de schemas.

**Ejemplo:**
```typescript
const articuloSchema = z.object({
  nombre: z.string().min(1).max(100),
  precio: z.number().positive(),
  descripcion: z.string().optional(),
});
```

**Consecuencias:**
- ✅ Validación type-safe
- ✅ Errores claros
- ✅ Mismo schema en frontend y backend

---

## Decisiones de Infraestructura

### ADR-016: Railway + Vercel + Atlas

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Elegir servicios de hosting económicos.

**Decisión:**

| Componente | Servicio | Costo |
|------------|----------|-------|
| Backend + PostgreSQL | Railway | ~$5-10/mes |
| Frontend | Vercel | $0 |
| MongoDB | Atlas M0 | $0 |
| Redis | Upstash | $0 |
| Imágenes | Cloudinary | $0 |

**Costo Total:** ~$5-20 USD/mes

**Consecuencias:**
- ✅ Costo mínimo para MVP
- ✅ Escala cuando sea necesario
- ⚠️ Dependencia de múltiples servicios

---

### ADR-017: Optimización de Imágenes Client-Side

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Las imágenes subidas pueden ser muy pesadas.

**Decisión:**  
Optimizar ANTES de subir a Cloudinary:
- Conversión a WebP
- Redimensionamiento según tipo
- Compresión quality 0.85

**Configuración:**
| Tipo | Max Width | Quality |
|------|-----------|---------|
| Logo | 500px | 0.85 |
| Portada | 1600px | 0.85 |
| Galería | 1200px | 0.85 |
| Productos | 800px | 0.85 |

**Resultados:**
- JPG 2.8MB → WebP 61KB (~97% reducción)

**Consecuencias:**
- ✅ Uploads más rápidos
- ✅ Menor uso de Cloudinary
- ✅ Mejor UX

---

### ADR-018: Upload Diferido de Imágenes

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Evitar imágenes huérfanas en Cloudinary.

**Decisión:**  
Preview local primero, upload solo al confirmar.

**Flujo:**
```
Seleccionar imagen
    ↓
Preview local (URL.createObjectURL)
    ↓
Usuario confirma
    ↓
Upload a Cloudinary
```

**Consecuencias:**
- ✅ Sin imágenes huérfanas
- ✅ Preview instantáneo
- ✅ Usuario puede cancelar sin subir

---

## Decisiones de UX/UI

### ADR-019: Actualizaciones Optimistas

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
La app debe sentirse rápida y responsiva.

**Decisión:**  
Todas las acciones usan actualizaciones optimistas:
1. UI se actualiza inmediatamente
2. Request se envía en background
3. Si falla, se revierte

**Consecuencias:**
- ✅ App se siente instantánea
- ✅ Mejor UX
- ⚠️ Lógica de rollback necesaria

---

### ADR-020: Sin Transiciones Lentas

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Las animaciones lentas hacen sentir la app lenta.

**Decisión:**  
- ❌ No usar `transition-all duration-300`
- ✅ Usar transiciones muy cortas o instantáneas
- ✅ Todo debe sentirse "snappy"

**Consecuencias:**
- ✅ App se siente rápida
- ✅ Usuarios más satisfechos

---

### ADR-021: Sistema de Notificaciones (notificaciones.ts)

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Sistema de notificaciones unificadas y consistentes en toda la app.

**Decisión:**  
Crear wrapper `notificaciones.ts` sobre SweetAlert2 con funciones predefinidas.

**Ubicación:** `apps/web/src/utils/notificaciones.ts`

**Uso:**
```typescript
import { notificar } from '@/utils/notificaciones';

// Toasts (desaparecen automáticamente en 3 segundos)
notificar.exito('Cuenta creada exitosamente');
notificar.error('Correo ya registrado');
notificar.advertencia('Tu sesión expirará en 5 minutos');
notificar.info('Código enviado a tu correo');

// Diálogos de confirmación (requieren interacción)
const confirmado = await notificar.confirmar('¿Eliminar cuenta?', 'Esta acción no se puede deshacer');
if (confirmado) { /* proceder */ }

// Sesión expirada (modal bloqueante)
await notificar.sesionExpirada();
```

**Funciones Disponibles:**

| Función | Tipo | Uso |
|---------|------|-----|
| `notificar.exito(mensaje)` | Toast verde | Operación completada correctamente |
| `notificar.error(mensaje)` | Toast rojo | Algo salió mal |
| `notificar.advertencia(mensaje)` | Toast naranja | Aviso importante |
| `notificar.info(mensaje)` | Toast azul | Información general |
| `notificar.confirmar(titulo, desc?)` | Modal | Confirmación antes de acciones peligrosas |
| `notificar.sesionExpirada()` | Modal bloqueante | Sesión expirada, requiere re-login |

**Características:**
- ✅ Colores oscuros consistentes con el diseño de AnunciaYA
- ✅ Responsive: toasts más pequeños en móvil (< 640px)
- ✅ Timer de 3 segundos con barra de progreso
- ✅ Pausa al pasar el mouse encima
- ✅ Soporte i18n para botones de confirmación

**Estilos por Tipo:**
```typescript
exito:      { background: '#14532d', color: '#bbf7d0', iconColor: '#22c55e' }
error:      { background: '#7f1d1d', color: '#fecaca', iconColor: '#ef4444' }
advertencia: { background: '#78350f', color: '#fef3c7', iconColor: '#f59e0b' }
info:       { background: '#1e3a5f', color: '#bfdbfe', iconColor: '#3b82f6' }
```

**Consecuencias:**
- ✅ Notificaciones consistentes en toda la app
- ✅ No repetir configuración de SweetAlert2
- ✅ Fácil de usar con una sola línea
- ✅ Centralizado para cambios futuros

**⚠️ IMPORTANTE:** 
Siempre usar `notificar` en lugar de llamar a `Swal.fire()` directamente.

---

### ADR-022: Componentes UI Base Reutilizables

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementada

**Contexto:**  
Necesitamos componentes UI consistentes en toda la aplicación.

**Decisión:**  
Crear componentes base en `components/ui/` que DEBEN usarse en todo el desarrollo.

**Ubicación:** `apps/web/src/components/ui/`

**Uso:**
```typescript
import { Boton, Input, Modal, Spinner } from '@/components/ui';
```

---

#### Boton.tsx

Botón reutilizable con variantes, tamaños y estado de carga.

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `children` | ReactNode | - | Contenido del botón |
| `variante` | string | `'primario'` | Estilo visual |
| `tamanio` | string | `'md'` | Tamaño |
| `cargando` | boolean | `false` | Muestra spinner y deshabilita |
| `fullWidth` | boolean | `false` | Ocupar todo el ancho |
| `iconoIzquierda` | ReactNode | - | Icono a la izquierda |
| `iconoDerecha` | ReactNode | - | Icono a la derecha |
| `disabled` | boolean | `false` | Deshabilitado |

**Variantes:**
| Variante | Descripción |
|----------|-------------|
| `primario` | Azul con gradiente y sombra (acción principal) |
| `secundario` | Gris claro (acción secundaria) |
| `outline` | Borde azul, fondo transparente |
| `outlineGray` | Borde gris, fondo transparente |
| `ghost` | Sin fondo ni borde |
| `danger` | Rojo con gradiente (acciones peligrosas) |
| `success` | Verde con gradiente (confirmaciones) |

**Tamaños:** `sm`, `md`, `lg`

**Ejemplos:**
```tsx
<Boton onClick={handleClick}>Guardar</Boton>
<Boton variante="secundario" cargando={enviando}>Enviar</Boton>
<Boton variante="danger" iconoIzquierda={<Trash />}>Eliminar</Boton>
<Boton variante="outline" fullWidth>Cancelar</Boton>
```

---

#### Input.tsx

Campo de texto con label, iconos, validación visual y errores.

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `label` | string | - | Etiqueta del campo |
| `error` | string | - | Mensaje de error |
| `icono` | ReactNode | - | Icono a la izquierda |
| `elementoDerecha` | ReactNode | - | Elemento a la derecha |
| `ayuda` | string | - | Texto de ayuda |
| `isValid` | boolean \| null | `null` | Estado de validación |
| `tamaño` | string | `'md'` | Tamaño |
| `type` | string | `'text'` | Tipo de input |

**Estados de Validación:**
| Valor | Visual |
|-------|--------|
| `null` | Neutral (borde gris) |
| `true` | Válido (borde verde, fondo verde claro) |
| `false` | Inválido (borde rojo, fondo rojo claro) |

**Tamaños:** `sm`, `md`, `lg`

**Características:**
- Toggle mostrar/ocultar para `type="password"`
- Icono cambia de color según validación
- Muestra error solo cuando `isValid === false`

**Ejemplos:**
```tsx
<Input
  label="Correo Electrónico"
  type="email"
  placeholder="tu@email.com"
  icono={<Mail />}
  isValid={validacion.correo}
  error="Ingresa un correo válido"
/>

<Input
  label="Contraseña"
  type="password"
  isValid={validacion.password}
/>
```

---

#### Modal.tsx

Modal genérico con overlay, animaciones y comportamiento configurable.

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `abierto` | boolean | - | ¿Está abierto? |
| `onCerrar` | function | - | Función para cerrar |
| `titulo` | string | - | Título del modal |
| `iconoTitulo` | ReactNode | - | Icono junto al título |
| `children` | ReactNode | - | Contenido |
| `ancho` | string | `'md'` | Ancho máximo |
| `cerrarAlClickFuera` | boolean | `true` | Cerrar al clic en overlay |
| `cerrarConEscape` | boolean | `true` | Cerrar con tecla Escape |
| `mostrarBotonCerrar` | boolean | `true` | Mostrar botón X |
| `mostrarHeader` | boolean | `true` | Mostrar header |
| `paddingContenido` | string | `'md'` | Padding del contenido |

**Anchos:** `sm`, `md`, `lg`, `xl`, `full`

**Padding Contenido:** `none`, `sm`, `md`, `lg`

**Características:**
- Bloquea scroll del body cuando está abierto
- Animación fade + scale al abrir
- Responsive (ajusta tamaños en móvil/desktop)

**Ejemplos:**
```tsx
<Modal
  abierto={mostrar}
  onCerrar={() => setMostrar(false)}
  titulo="Confirmar Acción"
>
  <p>¿Estás seguro de continuar?</p>
  <Boton onClick={handleConfirmar}>Confirmar</Boton>
</Modal>

<Modal
  abierto={mostrar}
  onCerrar={onCerrar}
  ancho="lg"
  cerrarAlClickFuera={false}
  paddingContenido="none"
>
  {/* Contenido sin padding */}
</Modal>
```

---

#### Spinner.tsx

Indicador de carga (círculo girando).

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `tamanio` | string | `'md'` | Tamaño |
| `color` | string | `'primary'` | Color |
| `className` | string | `''` | Clases adicionales |

**Tamaños:** `sm` (16px), `md` (24px), `lg` (40px)

**Colores:** `primary` (azul), `white`, `gray`

**Ejemplos:**
```tsx
<Spinner />
<Spinner tamanio="lg" color="white" />
<Spinner tamanio="sm" color="gray" />
```

---

**Consecuencias:**
- ✅ UI consistente en toda la app
- ✅ Cambios de estilo centralizados
- ✅ Accesibilidad integrada (aria-labels, roles)
- ✅ Responsive por defecto
- ✅ Estados de carga y validación incluidos

**⚠️ REGLAS OBLIGATORIAS:** 
- NO usar `<button>` nativo → usar `<Boton>`
- NO usar `<input>` nativo → usar `<Input>`
- NO crear modales custom → usar `<Modal>`
- NO crear spinners custom → usar `<Spinner>`

---

## Decisiones Pendientes

### Pendiente: Limpieza de Cloudinary al Eliminar

**Estado:** ⏳ Documentado para Fase 6

**Problema:**  
Al eliminar negocio de BD, imágenes quedan en Cloudinary.

**Solución Propuesta:**
1. Antes de DELETE en BD
2. Obtener todas URLs de imágenes
3. Eliminar de Cloudinary
4. Luego DELETE en BD

**Decisión:** Implementar a nivel NEGOCIO (no usuario).

---

### Pendiente: Endpoint DELETE Usuario

**Estado:** ⏳ Fase 6

**Contexto:**  
No existe forma de eliminar usuario completo.

**Consideraciones:**
- CASCADE elimina datos relacionados
- Limpiar Cloudinary
- Revocar sesiones
- Cancelar suscripción Stripe

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
