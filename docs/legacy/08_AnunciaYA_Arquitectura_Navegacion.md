# 🧭 AnunciaYA v3.0 - Arquitectura de Navegación

**Fecha de Actualización:** 18 Diciembre 2024

---

## 1. Estructura General

```
┌─────────────────────────────────────────────────────────────┐
│                  MAPA DE NAVEGACIÓN                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PÚBLICAS (Sin Login)                                       │
│  ────────────────────                                       │
│  /                    → Landing Page                        │
│  /registro            → Página de registro                  │
│  /registro-exito      → Confirmación post-registro          │
│                                                             │
│  PROTEGIDAS (Requieren Login)                               │
│  ─────────────────────────────                              │
│  /inicio              → Redirect a /negocios                │
│                                                             │
│  4 PILARES (BottomNav + Navbar)                             │
│  /negocios            → Directorio de negocios              │
│  /marketplace         → Compra-venta                        │
│  /ofertas             → Cupones y promociones               │
│  /dinamicas           → Sorteos y rifas                     │
│                                                             │
│  SECUNDARIAS (MenuDrawer + Navbar dropdown)                 │
│  /card                → CardYA - Tarjeta digital            │
│  /empleos             → Bolsa de trabajo                    │
│  /perfil              → Mi perfil y configuración           │
│                                                             │
│  COMERCIALES (Solo cuentas comerciales)                     │
│  /scan                → ScanYA - Punto de venta             │
│  /business/*          → Business Studio (layout propio)     │
│                                                             │
│  ADMIN (Solo staff)                                         │
│  /admin/*             → Panel de administración             │
│                                                             │
│  CHATYA (Sin ruta, overlay persistente)                     │
│  Se abre desde: botones, notificaciones, menú               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Rutas Detalladas

### 2.1 Públicas

| Ruta | Componente | Layout | Descripción |
|------|------------|--------|-------------|
| `/` | PaginaLanding | Ninguno | Landing page con CTA |
| `/registro` | PaginaRegistro | Ninguno | Formulario de registro |
| `/registro-exito` | PaginaRegistroExito | Ninguno | Confirmación |

### 2.2 Navegación Principal (5 Tabs)

| Ruta | Componente | Quién Publica | Geolocalizado |
|------|------------|---------------|---------------|
| `/negocios` | PaginaNegocios | Solo Comercial | ✅ Sí |
| `/marketplace` | PaginaMarketplace | Solo Personal | ✅ Sí |
| `/ofertas` | PaginaOfertas | Comercial (Business Studio) | ✅ Sí |
| `/dinamicas` | PaginaDinamicas | Todos | ✅ Sí |
| `/empleos` | PaginaEmpleos | Personal (servicios) / Comercial (vacantes) | ✅ Sí |

### 2.3 Secundarias (Acceso desde menú)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/card` | PaginaCardYA | Tarjeta digital, QR, puntos |
| `/perfil` | PaginaPerfil | Datos, publicaciones, config |
| `/perfil/datos` | SubPaginaDatos | Editar información personal |
| `/perfil/publicaciones` | SubPaginaPublicaciones | Mis posts en MarketPlace |
| `/perfil/puntos` | SubPaginaPuntos | Historial de puntos |
| `/perfil/seguridad` | SubPaginaSeguridad | 2FA, sesiones, contraseña |

> **ChatYA:** No tiene ruta, es un overlay que se abre desde el botón dedicado en Navbar/BottomNav

### 2.4 Comerciales

| Ruta | Componente | Requiere |
|------|------------|----------|
| `/scan` | PaginaScanYA | perfil: comercial |
| `/business` | BusinessDashboard | perfil: comercial |
| `/business/metricas` | BusinessMetricas | perfil: comercial |
| `/business/puntos` | BusinessPuntos | perfil: comercial |
| `/business/ofertas` | BusinessOfertas | perfil: comercial |
| `/business/empleados` | BusinessEmpleados | perfil: comercial |

---

## 3. Layouts

### 3.1 Sin Layout

Páginas públicas que no comparten estructura:
- PaginaLanding
- PaginaRegistro
- PaginaRegistroExito

### 3.2 MainLayout

Layout principal para todas las rutas protegidas:

```tsx
<MainLayout>
  ├── Desktop:
  │   ├── Navbar (fixed top)
  │   ├── ColumnaIzquierda (fixed left)
  │   ├── Content (<Outlet />)
  │   └── ColumnaDerecha (fixed right)
  │
  └── Móvil:
      ├── MobileHeader (fixed top)
      ├── Content (<Outlet />)
      └── BottomNav (fixed bottom)
  
  └── ChatOverlay (overlay, siempre montado)
</MainLayout>
```

### 3.3 BusinessLayout

Layout exclusivo para Business Studio:
- Sidebar de navegación específico
- Header con nombre del negocio
- Sin BottomNav en móvil
- Menú lateral colapsable

### 3.4 AdminLayout

Layout para panel de administración:
- Acceso solo staff de AnunciaYA
- Navegación administrativa
- Sin elementos de usuario

---

## 4. Componentes de Navegación

### 4.1 Navbar (Desktop ≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🤝 AnunciaYA        │ 📍 Puerto Peñasco, Sonora ▼ │ 🔍 Buscar...                 │
│ Tu Comunidad Local  │                              │                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                     │ Negocios │ Market │ Ofertas │ Dinámicas │ Empleos │        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                     │                              │ [ChatYA] │ 🔔 │ 👤         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Logo + Slogan "Tu Comunidad Local..."
- Selector de ubicación (Ciudad, Estado)
- Barra de búsqueda
- Tabs de navegación: Negocios, Market, Ofertas, Dinámicas, Empleos
- Botón ChatYA (azul, con badge de mensajes)
- Notificaciones (badge)
- Avatar usuario

### 4.2 MobileHeader (Móvil <1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  🤝 AnunciaYA           │  📍  │  🏪  │  🔔  │  ☰  │
│  Tu Comunidad Local...  │      │      │  (3) │      │
└─────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Logo + Slogan "Tu Comunidad Local..."
- Icono ubicación (abre ModalUbicacion)
- Icono tienda/negocio
- Notificaciones con badge
- Menú hamburguesa (abre MenuDrawer)

### 4.3 BottomNav (Móvil <1024px)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                        💬 (ChatYA)                          │
│                       ────────────                          │
│  🏪        🛒         │  Badge  │       🏷️        🎁       │
│ Negocios  Market     └─────────┘     Ofertas   Dinámicas   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**5 elementos de navegación:**

| # | Icono | Label | Posición |
|---|-------|-------|----------|
| 1 | Store | Negocios | Izquierda |
| 2 | ShoppingCart | Market | Izquierda |
| 3 | MessageCircle | ChatYA | Centro (elevado) |
| 4 | Tag | Ofertas | Derecha |
| 5 | Gift | Dinámicas | Derecha |

**Características:**
- 5 elementos totales (4 + ChatYA central)
- Botón ChatYA elevado con badge de mensajes no leídos
- Fondo con efecto glass
- Safe area en iOS

### 4.4 MenuDrawer (Móvil)

```
┌───────────────────────────────┐
│  ┌──────┐                  X  │
│  │ 👤   │  Juan Valencia      │
│  │ foto │  Personal           │
│  └──────┘                     │
├───────────────────────────────┤
│  💬  ChatYA              (2)  │
├───────────────────────────────┤
│  💳  CardYA                   │
│  💼  Bolsa de Trabajo         │
│  👤  Mi Perfil           ›    │
├───────────────────────────────┤
│  (Solo comercial)             │
│  📱  ScanYA                   │
│  📊  Business Studio          │
├───────────────────────────────┤
│  🚪  Cerrar Sesión            │
└───────────────────────────────┘
```

---

## 5. ChatYA - Componente Transversal

> **Nota:** El componente que implementa ChatYA se llama `ChatOverlay.tsx`

### 5.1 Comportamiento

| Aspecto | Detalle |
|---------|---------|
| **Ruta** | NO tiene ruta dedicada |
| **Montaje** | Siempre montado en MainLayout |
| **Posición** | Overlay flotante |
| **Persistencia** | NO se cierra al navegar |
| **Cierre** | Solo con botón [X] |
| **Conexión** | Socket.io en tiempo real |

### 5.2 Cómo se Abre

| Trigger | Ubicación |
|---------|-----------|
| Botón "Contactar" | Perfil de negocio |
| Botón "Contactar vendedor" | Publicación marketplace |
| Botón "Aplicar" | Oferta de trabajo |
| Notificación push | Cualquier lugar |
| Icono mensajes | Header/Menú |
| Botón ChatYA | BottomNav (centro) |

### 5.3 Estado en Zustand

```typescript
// stores/useChatStore.ts
interface ChatState {
  isOpen: boolean;
  conversacionActiva: string | null;
  mensajesNoLeidos: number;
  
  abrirChat: (conversacionId?: string) => void;
  cerrarChat: () => void;
  setMensajesNoLeidos: (count: number) => void;
}
```

---

## 6. Geolocalización Global

### 6.1 Afecta a Todas las Secciones

| Sección | Comportamiento |
|---------|----------------|
| **Negocios** | Mostrar cercanos primero, filtrar por radio |
| **MarketPlace** | Publicaciones en tu zona |
| **Ofertas** | Cupones de negocios cercanos |
| **Dinámicas** | Locales primero, luego nacionales |
| **Bolsa de Trabajo** | Vacantes y servicios en tu zona |

### 6.2 Selector de Ubicación

**Ubicación en UI:**
- Navbar (desktop): Segundo elemento
- MobileHeader: Parte central

**Funcionalidad:**
- Muestra ciudad actual: "📍 Puerto Peñasco, Sonora"
- Al tocar abre ModalUbicacion
- Opciones:
  - Detectar automáticamente (GPS)
  - Seleccionar de lista
  - Buscar por nombre

**Persistencia:**
- Guardado en Zustand + localStorage
- Se restaura al recargar
- Auto-detección solo si no hay ciudad guardada

---

## 7. Permisos por Ruta

### 7.1 Middleware Frontend

```typescript
// Verificar perfil
function RequireComercial({ children }) {
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  
  if (perfil !== 'comercial') {
    return <Navigate to="/negocios" />;
  }
  
  return children;
}

// Uso
<Route 
  path="/scan" 
  element={
    <RequireComercial>
      <PaginaScanYA />
    </RequireComercial>
  } 
/>
```

### 7.2 Matriz de Acceso

| Ruta | Personal | Comercial | Staff |
|------|----------|-----------|-------|
| /negocios | ✅ Ver | ✅ Ver + Publicar | ✅ |
| /marketplace | ✅ Ver + Publicar | ✅ Ver | ✅ |
| /ofertas | ✅ Ver | ✅ Ver (publicar en /business) | ✅ |
| /dinamicas | ✅ Todo | ✅ Todo | ✅ |
| /card | ✅ | ❌ | ✅ |
| /scan | ❌ | ✅ | ✅ |
| /business/* | ❌ | ✅ | ✅ |
| /admin/* | ❌ | ❌ | ✅ |

---

## 8. PWA - CardYA y ScanYA

### 8.1 Instalables como PWA

| App | URL | Login |
|-----|-----|-------|
| CardYA | `/card` | Sesión compartida con AnunciaYA |
| ScanYA | `/scan` | Login separado (empleados) |

### 8.2 Características PWA

- Icono propio en home screen
- Pantalla completa (sin barra navegador)
- Funciona offline (QR, sincronizar después)
- Notificaciones push

### 8.3 manifest.json (CardYA)

```json
{
  "name": "CardYA - Mi Tarjeta",
  "short_name": "CardYA",
  "start_url": "/card",
  "display": "standalone",
  "theme_color": "#f59e0b",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/cardya-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## 9. Flujos de Navegación

### 9.1 Primer Uso (Usuario Nuevo)

```
Landing (/)
    ↓ Clic "Registrarse"
Modal Registro
    ↓ Completa formulario
Verifica email (código 6 dígitos)
    ↓ Código correcto
/registro-exito
    ↓ Clic "Iniciar sesión"
Modal Login
    ↓ Credenciales correctas
/negocios (Navegación Principal)
```

### 9.2 Uso Normal (Usuario Existente)

```
Landing (/)
    ↓ Clic "Iniciar sesión"
Modal Login
    ↓ Credenciales correctas
/negocios
    ↓ Navega por la app
/marketplace, /ofertas, /dinamicas
    ↓ Quiere ver sus puntos
/card
    ↓ Quiere chatear con negocio
ChatYA overlay (sin cambiar ruta)
```

### 9.3 Comerciante

```
/negocios
    ↓ Menú lateral
/business (Business Studio)
    ↓ Ver métricas, configurar
/business/puntos, /business/ofertas
    ↓ Atender cliente
/scan (ScanYA)
    ↓ Escanear QR
Registrar venta
```

---

## 10. URLs y Deep Linking

### 10.1 URLs Limpias

| Tipo | Formato |
|------|---------|
| Negocio | `/negocios/tacos-el-guero-abc123` |
| Publicación | `/marketplace/iphone-venta-xyz789` |
| Oferta | `/ofertas/2x1-pizza-def456` |
| Dinámica | `/dinamicas/sorteo-navidad-ghi012` |
| Perfil | `/perfil/juan-valencia` |

### 10.2 Compartir Contenido

```typescript
function compartir(tipo: string, id: string, titulo: string) {
  const url = `${window.location.origin}/${tipo}/${slugify(titulo)}-${id}`;
  
  if (navigator.share) {
    navigator.share({ title: titulo, url });
  } else {
    navigator.clipboard.writeText(url);
  }
}
```

---

## 11. Safe Areas y Responsive

### 11.1 Sistema de Breakpoints

| Prioridad | Resolución | Breakpoint | Estrategia |
|-----------|------------|------------|------------|
| 1 | Desktop (1920x1080) | `2xl:` (1536px+) | Diseño espacioso |
| 2 | Laptop (1366x768) | `lg:` (1024px-1536px) | Diseño compacto |
| 3 | Móvil | Sin prefijo (default) | Single column |

**Breakpoints a usar:**
- ✅ `lg:` → Laptops (compacto)
- ✅ `2xl:` → Desktop (espacioso)
- ⚠️ **NO usar `xl:`** → Activa en laptops pero con altura insuficiente

**Patrón de 3 niveles:**
```typescript
// Móvil (default) → Laptop (lg:) → Desktop (2xl:)
className="text-sm lg:text-sm 2xl:text-base"
className="p-4 lg:p-3 2xl:p-6"
```

> **📋 Ver guía completa:** `Guía_de_Responsive_Design_-_AnunciaYA.md`

### 11.2 Safe Areas iOS

```css
:root {
  --sat: env(safe-area-inset-top);
  --sab: env(safe-area-inset-bottom);
}
```

```tsx
// MobileHeader
<header className="pt-[var(--sat)] h-16 ...">

// BottomNav
<nav className="pb-[var(--sab)] h-16 ...">
```

---

*Documento actualizado: 18 Diciembre 2024*
