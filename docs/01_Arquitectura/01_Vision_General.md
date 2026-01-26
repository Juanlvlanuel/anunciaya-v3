# 🎯 AnunciaYA v3.0 - Visión General

**Última Actualización:** 26 Diciembre 2024  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [¿Qué es AnunciaYA?](#qué-es-anunciaya)
2. [Problema que Resuelve](#problema-que-resuelve)
3. [Modelo de Negocio](#modelo-de-negocio)
4. [Usuarios del Sistema](#usuarios-del-sistema)
5. [Secciones de la Aplicación](#secciones-de-la-aplicación)
6. [Flujos Principales](#flujos-principales)

---

## ¿Qué es AnunciaYA?

**AnunciaYA** es una app de comercio local para México que funciona como un sistema de lealtad y puntos similar a "OXXO Premia, pero para todos los negocios locales".

### Concepto Principal

Una plataforma unificada donde:
- **Usuarios** ganan puntos comprando en negocios locales
- **Negocios** fidelizan clientes y promocionan sus productos/servicios
- **Comunidad** accede a ofertas, rifas, marketplace y más

### Analogía Simple

> "Es como tener una tarjeta de puntos que funciona en TODOS los negocios de tu ciudad, más un directorio de negocios, más un marketplace, más una bolsa de trabajo, todo en una sola app."

---

## Problema que Resuelve

### Para Usuarios
| Problema | Solución AnunciaYA |
|----------|-------------------|
| Muchas tarjetas de lealtad | Una sola app para todos los negocios |
| No saber qué negocios hay cerca | Directorio geolocalizado |
| Buscar ofertas en varios lugares | Sección centralizada de ofertas |
| Comprar/vender cosas usadas | Marketplace integrado |

### Para Negocios Locales
| Problema | Solución AnunciaYA |
|----------|-------------------|
| Competir con grandes cadenas | Sistema de puntos accesible |
| Fidelizar clientes | CardYA + Cupones digitales |
| Visibilidad limitada | Directorio + Promociones |
| Marketing costoso | Plataforma económica ($449/mes) |

---

## Modelo de Negocio

### Estructura de Cuentas

```
1 Correo = 1 Cuenta = 2 Modos Posibles

┌─────────────────────────────────────────────┐
│                 CUENTA                       │
├──────────────────┬──────────────────────────┤
│   MODO PERSONAL  │    MODO COMERCIAL        │
│     (Gratis)     │    ($449 MXN/mes)        │
├──────────────────┼──────────────────────────┤
│ • Acumular puntos│ • Business Studio        │
│ • Usar cupones   │ • Publicar negocio       │
│ • Ver ofertas    │ • Gestionar productos    │
│ • Marketplace    │ • Crear ofertas/cupones  │
│ • Rifas          │ • Sistema de puntos      │
│ • CardYA         │ • ScanYA (POS)           │
└──────────────────┴──────────────────────────┘
```

### Flujo de Monetización

```
Usuario registra negocio
        ↓
Paga suscripción ($449 MXN/mes vía Stripe)
        ↓
Completa Onboarding (8 pasos)
        ↓
Negocio publicado y visible
        ↓
Renovación mensual automática
```

### Precios

| Plan | Precio | Incluye |
|------|--------|---------|
| Personal | Gratis | Puntos, cupones, marketplace, rifas |
| Comercial | $449 MXN/mes | Todo lo anterior + Business Studio completo |

---

## Usuarios del Sistema

### Tipos de Usuario

| Tipo | Descripción | Modo |
|------|-------------|------|
| **Usuario Personal** | Consumidor que acumula puntos | Personal |
| **Comerciante** | Dueño de negocio local | Comercial |
| **Empleado** | Staff del negocio (acceso limitado) | Comercial (sub-cuenta) |
| **Administrador** | Gestión de la plataforma | Admin |

### Roles y Permisos

```
USUARIO PERSONAL
├── Ver negocios, ofertas, marketplace
├── Acumular y canjear puntos
├── Participar en rifas
├── Publicar en marketplace
└── Chat con negocios

COMERCIANTE
├── Todo lo de Personal +
├── Business Studio completo
├── Gestionar negocio y sucursales
├── Crear ofertas y cupones
├── ScanYA (escanear compras)
└── Ver métricas y reportes

EMPLEADO
├── ScanYA (escanear compras)
├── Ver productos del negocio
└── Chat en nombre del negocio

ADMINISTRADOR
├── Gestión de usuarios
├── Gestión de categorías
├── Moderación de contenido
└── Métricas globales
```

---

## Secciones de la Aplicación

### 5 Secciones Principales

| # | Sección | Descripción | Acceso |
|---|---------|-------------|--------|
| 1 | **Negocios** | Directorio de negocios geolocalizado | Requiere login |
| 2 | **MarketPlace** | Compra-venta entre usuarios | Requiere login |
| 3 | **Ofertas** | Ofertas y descuentos de negocios | Requiere login |
| 4 | **Dinámicas** | Rifas y sorteos | Requiere login |
| 5 | **Bolsa de Trabajo** | Vacantes y empleos locales | Requiere login |

### Herramientas

| Herramienta | Descripción | Características |
|-------------|-------------|-----------------|
| **ChatYA** | Mensajería con negocios | Overlay persistente, no se cierra al navegar |

### Paneles

| Panel | Descripción | Acceso |
|-------|-------------|--------|
| **Business Studio** | Dashboard de gestión comercial | Requiere login + modo comercial |

### Business Studio (Modo Comercial)

| Sección | Función |
|---------|---------|
| **Dashboard** | Métricas y resumen |
| **Mi Negocio** | Editar información |
| **Productos** | CRUD productos/servicios |
| **Ofertas** | Crear promociones |
| **Cupones** | Gestionar cupones digitales |
| **Puntos** | Configurar sistema CardYA |
| **Empleados** | Gestionar staff |
| **Reportes** | Estadísticas detalladas |

### ScanYA (App POS)

Aplicación PWA para escanear compras en el punto de venta:

```
Cliente muestra CardYA (QR)
        ↓
Empleado escanea con ScanYA
        ↓
Registra monto de compra
        ↓
Sistema calcula puntos
        ↓
Cliente recibe puntos automáticamente
```

---

## Flujos Principales

### Flujo 1: Registro Usuario Personal

```
1. Usuario descarga app / entra a web
2. Click "Registrarse"
3. Selecciona "Personal"
4. Llena datos (nombre, correo, contraseña)
5. Verifica correo
6. Acceso completo a modo Personal
```

### Flujo 2: Registro Usuario Comercial

```
1. Usuario selecciona "Comercial" en registro
2. Se muestra modal de planes
3. Usuario paga suscripción (Stripe)
4. Se crea cuenta con tieneModoComercial: true
5. Se crea negocio en estado borrador
6. Redirige a /business/onboarding
7. Usuario completa 8 pasos del wizard:
   - Paso 1: Categorías
   - Paso 2: Ubicación
   - Paso 3: Contacto
   - Paso 4: Horarios
   - Paso 5: Imágenes
   - Paso 6: Métodos de pago
   - Paso 7: Sistema de puntos
   - Paso 8: Productos (mínimo 3)
8. Al finalizar: negocio publicado
9. Acceso completo a Business Studio
```

### Flujo 3: Compra con Puntos

```
1. Cliente va a negocio físico
2. Realiza compra
3. Muestra su CardYA (QR en app)
4. Empleado escanea con ScanYA
5. Ingresa monto de compra
6. Sistema calcula puntos según configuración
7. Puntos se acreditan al cliente
8. Cliente puede canjear puntos después
```

### Flujo 4: Canjear Cupón

```
1. Usuario ve oferta/cupón en la app
2. Click "Obtener cupón"
3. Se genera código único
4. Usuario muestra cupón en negocio
5. Negocio valida/escanea cupón
6. Se aplica descuento
7. Cupón marcado como usado
```

---

## Arquitectura Multi-Sucursal

Un negocio puede tener múltiples sucursales:

```
NEGOCIO (Ej: "Pizzería Roma")
│
├── Sucursal 1 (Centro)
│   ├── Dirección propia
│   ├── Horarios propios
│   └── Teléfono propio
│
├── Sucursal 2 (Norte)
│   ├── Dirección propia
│   ├── Horarios propios
│   └── Teléfono propio
│
└── Datos compartidos:
    ├── Logo y portada
    ├── Categorías
    ├── Productos (catálogo)
    ├── Sistema de puntos
    └── Ofertas y cupones
```

**Los puntos operan a nivel NEGOCIO**, no por sucursal.
El cliente acumula puntos del negocio sin importar en qué sucursal compre.

---

## Geolocalización

Toda la app está filtrada por ubicación:

```
Usuario abre app
        ↓
Se detecta ubicación (GPS → IP/WiFi fallback)
        ↓
TODAS las secciones muestran contenido de esa ciudad:
• Negocios cercanos
• Ofertas locales
• Marketplace local
• Empleos locales
        ↓
Usuario puede cambiar ciudad manualmente
        ↓
Todo se actualiza instantáneamente
```

---

## Tecnología (Resumen)

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind v4 |
| Backend | Node.js + Express + TypeScript |
| BD Principal | PostgreSQL + PostGIS + Drizzle ORM |
| BD Chat | MongoDB Atlas |
| Cache/Sessions | Upstash Redis |
| Imágenes | Cloudinary |
| Pagos | Stripe |
| Auth | JWT + Refresh Tokens + Google OAuth |
| Hosting | Railway (backend) + Vercel (frontend) |

> Ver documento [02_Stack_Tecnologico.md](02_Stack_Tecnologico.md) para detalles completos.

---

## Métricas Clave

| Métrica | Objetivo |
|---------|----------|
| Negocios activos | 50 en Beta |
| Usuarios registrados | 500 en Beta |
| Transacciones de puntos | 1,000/mes |
| Tiempo de onboarding | < 10 minutos |

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
