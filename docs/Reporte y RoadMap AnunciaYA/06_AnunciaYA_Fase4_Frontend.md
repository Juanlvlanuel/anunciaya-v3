# 🎨 AnunciaYA v3.0 - Fase 4: Frontend Base + Auth UI

**Estado:** 🔄 85% Completado  
**Fecha de Actualización:** 18 Diciembre 2024

---

## 1. Objetivo de la Fase

Implementar la interfaz de usuario completa:
- Setup de React + Vite + Tailwind CSS v4
- Sistema de rutas protegidas
- Stores globales con Zustand
- UI de autenticación completa
- Landing page con internacionalización
- Layout principal post-login
- Navegación responsiva
- Sistema de geolocalización

---

## 2. Estructura de Archivos

```
apps/web/
├── public/
│   ├── images/
│   │   ├── onboarding/
│   │   │   ├── comunidad.webp
│   │   │   ├── marketplace.webp
│   │   │   ├── puntos.webp
│   │   │   ├── sorteos.webp
│   │   │   └── tarjeta.webp
│   │   ├── secciones/
│   │   │   ├── dinamicas.webp
│   │   │   ├── marketplace.webp
│   │   │   ├── negocios-locales.webp
│   │   │   └── ofertas.webp
│   │   └── registro-hero.webp
│   ├── logo-anunciaya-blanco.webp
│   ├── logo-anunciaya.webp
│   └── og-image.webp
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── registro/
│   │   │   │   ├── BrandingColumn.tsx       # Columna izquierda registro desktop
│   │   │   │   ├── FormularioRegistro.tsx   # Formulario de registro
│   │   │   │   ├── ModalBienvenida.tsx      # Modal post-registro
│   │   │   │   ├── ModalVerificacionEmail.tsx # Verificación de email
│   │   │   │   └── index.ts
│   │   │   ├── vistas/
│   │   │   │   ├── Vista2FA.tsx             # Input para código TOTP
│   │   │   │   ├── VistaLogin.tsx           # Vista de login
│   │   │   │   └── VistaRecuperar.tsx       # Recuperar contraseña
│   │   │   ├── ModalLogin.tsx               # Modal principal de login
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx                # Navegación inferior móvil
│   │   │   ├── ChatOverlay.tsx              # Overlay de ChatYA
│   │   │   ├── ColumnaDerecha.tsx           # Sidebar derecho desktop
│   │   │   ├── ColumnaIzquierda.tsx         # Sidebar izquierdo desktop
│   │   │   ├── MainLayout.tsx               # Layout post-login
│   │   │   ├── MenuDrawer.tsx               # Menú lateral móvil
│   │   │   ├── MobileHeader.tsx             # Header móvil
│   │   │   ├── ModalUbicacion.tsx           # Selector de ciudad
│   │   │   ├── Navbar.tsx                   # Navegación desktop
│   │   │   └── index.ts
│   │   └── ui/
│   │       ├── Boton.tsx                    # Botón reutilizable
│   │       ├── Input.tsx                    # Input reutilizable
│   │       ├── Modal.tsx                    # Modal base
│   │       ├── SelectorIdioma.tsx           # Cambio ES/EN
│   │       ├── Spinner.tsx                  # Indicador de carga
│   │       └── index.ts
│   ├── config/
│   │   └── i18n.ts                          # Configuración i18next
│   ├── data/
│   │   ├── ciudadesPopulares.ts             # Catálogo de ciudades México
│   │   └── index.ts
│   ├── hooks/                               # Custom hooks (vacío por ahora)
│   ├── locales/
│   │   ├── en/
│   │   │   ├── auth.json                    # Traducciones auth inglés
│   │   │   ├── common.json                  # Traducciones comunes inglés
│   │   │   └── landing.json                 # Traducciones landing inglés
│   │   └── es/
│   │       ├── auth.json                    # Traducciones auth español
│   │       ├── common.json                  # Traducciones comunes español
│   │       └── landing.json                 # Traducciones landing español
│   ├── pages/
│   │   ├── private/
│   │   │   └── PaginaInicio.tsx             # Dashboard post-login
│   │   └── public/
│   │       ├── PaginaLanding.tsx            # Landing page
│   │       ├── PaginaRegistro.tsx           # Página de registro
│   │       └── PaginaRegistroExito.tsx      # Confirmación post-registro
│   ├── router/
│   │   ├── index.tsx                        # Definición de rutas
│   │   ├── RootLayout.tsx                   # Layout raíz
│   │   ├── RutaPrivada.tsx                  # Guard rutas protegidas
│   │   └── RutaPublica.tsx                  # Guard rutas públicas
│   ├── services/
│   │   ├── api.ts                           # Cliente Axios configurado
│   │   ├── authService.ts                   # Llamadas a /api/auth/*
│   │   └── pagoService.ts                   # Llamadas a /api/pagos/*
│   ├── stores/
│   │   ├── useAuthStore.ts                  # Estado de autenticación
│   │   ├── useGpsStore.ts                   # Estado de geolocalización
│   │   └── useUiStore.ts                    # Estado de UI (modales, etc.)
│   ├── utils/
│   │   └── notificaciones.ts                # Helpers SweetAlert2
│   ├── App.tsx                              # Componente raíz
│   ├── index.css                            # Tailwind CSS v4
│   ├── main.tsx                             # Entry point
│   └── vite-env.d.ts                        # Tipos de Vite
├── .env                                     # Variables de entorno
├── index.html                               # HTML principal
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Configuración Base

### 3.1 Tailwind CSS v4 (index.css)

```css
@import "tailwindcss";

/* Variables CSS para safe areas (móvil) */
:root {
  --sat: env(safe-area-inset-top);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
  --sar: env(safe-area-inset-right);
}

/* Scrollbar personalizado */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

### 3.2 Internacionalización (config/i18n.ts)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Español
import esAuth from '../locales/es/auth.json';
import esCommon from '../locales/es/common.json';
import esLanding from '../locales/es/landing.json';

// Inglés
import enAuth from '../locales/en/auth.json';
import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';

i18n.use(initReactI18next).init({
  resources: {
    es: {
      auth: esAuth,
      common: esCommon,
      landing: esLanding,
    },
    en: {
      auth: enAuth,
      common: enCommon,
      landing: enLanding,
    },
  },
  lng: 'es', // Idioma por defecto
  fallbackLng: 'es',
  ns: ['common', 'auth', 'landing'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

### 3.3 Cliente API (services/api.ts)

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Agregar token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor - Renovar token si expira
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        
        if (response.data?.exito) {
          const { accessToken, refreshToken: newRefresh } = response.data.datos;
          useAuthStore.getState().setTokens(accessToken, newRefresh);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout('sesion_expirada');
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## 4. Stores (Zustand)

### 4.1 useAuthStore

```typescript
// stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  perfil: 'personal' | 'comercial';
  membresia: number;
  avatarUrl?: string;
}

interface AuthState {
  usuario: Usuario | null;
  accessToken: string | null;
  refreshToken: string | null;
  cargando: boolean;
  
  // Actions
  setUsuario: (usuario: Usuario) => void;
  setTokens: (access: string, refresh: string) => void;
  login: (usuario: Usuario, accessToken: string, refreshToken: string) => void;
  logout: (razon?: string) => void;
  setCargando: (cargando: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      cargando: true,
      
      setUsuario: (usuario) => set({ usuario }),
      
      setTokens: (accessToken, refreshToken) => 
        set({ accessToken, refreshToken }),
      
      login: (usuario, accessToken, refreshToken) =>
        set({
          usuario,
          accessToken,
          refreshToken,
          cargando: false,
        }),
      
      logout: (razon) => {
        set({
          usuario: null,
          accessToken: null,
          refreshToken: null,
          cargando: false,
        });
        
        if (razon === 'sesion_expirada') {
          // Mostrar notificación
        }
      },
      
      setCargando: (cargando) => set({ cargando }),
    }),
    {
      name: 'anunciaya-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

### 4.2 useGpsStore

```typescript
// stores/useGpsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Coordenadas {
  latitud: number;
  longitud: number;
  precision?: number;
}

interface Ciudad {
  nombre: string;
  estado: string;
  nombreCompleto: string;
  coordenadas: { lat: number; lng: number };
}

interface GpsState {
  coordenadas: Coordenadas | null;
  ciudad: Ciudad | null;
  cargando: boolean;
  error: string | null;
  permisoSolicitado: boolean;
  
  // Actions
  obtenerUbicacion: () => Promise<Coordenadas | null>;
  setCiudad: (nombre: string, estado: string, coords: { lat: number; lng: number }) => void;
  limpiarCiudad: () => void;
}

// Helper para intentar obtener ubicación
async function intentarObtenerUbicacion(
  altaPrecision: boolean,
  timeout: number
): Promise<Coordenadas | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision: position.coords.accuracy,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: altaPrecision,
        timeout: timeout,
        maximumAge: 0,
      }
    );
  });
}

export const useGpsStore = create<GpsState>()(
  persist(
    (set) => ({
      coordenadas: null,
      ciudad: null,
      cargando: false,
      error: null,
      permisoSolicitado: false,
      
      obtenerUbicacion: async () => {
        set({ cargando: true, error: null });
        
        if (!navigator.geolocation) {
          set({ 
            cargando: false, 
            error: 'Tu navegador no soporta geolocalización' 
          });
          return null;
        }
        
        // Intento 1: Alta precisión (GPS) - 15s
        const coordsAlta = await intentarObtenerUbicacion(true, 15000);
        if (coordsAlta) {
          set({ coordenadas: coordsAlta, cargando: false });
          return coordsAlta;
        }
        
        // Intento 2: Baja precisión (IP/WiFi) - 10s
        const coordsBaja = await intentarObtenerUbicacion(false, 10000);
        if (coordsBaja) {
          set({ coordenadas: coordsBaja, cargando: false });
          return coordsBaja;
        }
        
        set({ 
          cargando: false, 
          error: 'No se pudo obtener tu ubicación' 
        });
        return null;
      },
      
      setCiudad: (nombre, estado, coordenadas) => {
        set({
          ciudad: {
            nombre,
            estado,
            nombreCompleto: `${nombre}, ${estado}`,
            coordenadas,
          },
        });
      },
      
      limpiarCiudad: () => set({ ciudad: null, coordenadas: null }),
    }),
    {
      name: 'anunciaya-gps',
      partialize: (state) => ({
        ciudad: state.ciudad,
      }),
    }
  )
);
```

### 4.3 useUiStore

```typescript
// stores/useUiStore.ts
import { create } from 'zustand';

interface UiState {
  modalAuthAbierto: boolean;
  vistaAuth: 'login' | 'registro' | '2fa' | 'recuperar';
  menuAbierto: boolean;
  modalUbicacionAbierto: boolean;
  
  // Actions
  abrirModalAuth: (vista?: 'login' | 'registro') => void;
  cerrarModalAuth: () => void;
  setVistaAuth: (vista: 'login' | 'registro' | '2fa' | 'recuperar') => void;
  toggleMenu: () => void;
  cerrarMenu: () => void;
  abrirModalUbicacion: () => void;
  cerrarModalUbicacion: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  modalAuthAbierto: false,
  vistaAuth: 'login',
  menuAbierto: false,
  modalUbicacionAbierto: false,
  
  abrirModalAuth: (vista = 'login') => 
    set({ modalAuthAbierto: true, vistaAuth: vista }),
  
  cerrarModalAuth: () => 
    set({ modalAuthAbierto: false }),
  
  setVistaAuth: (vista) => 
    set({ vistaAuth: vista }),
  
  toggleMenu: () => 
    set((state) => ({ menuAbierto: !state.menuAbierto })),
  
  cerrarMenu: () => 
    set({ menuAbierto: false }),
  
  abrirModalUbicacion: () => 
    set({ modalUbicacionAbierto: true }),
  
  cerrarModalUbicacion: () => 
    set({ modalUbicacionAbierto: false }),
}));
```

---

## 5. Sistema de Rutas

### 5.1 AppRoutes.tsx

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Páginas públicas
import PaginaLanding from './pages/publicas/PaginaLanding';
import PaginaRegistro from './pages/publicas/PaginaRegistro';
import PaginaRegistroExito from './pages/publicas/PaginaRegistroExito';

// Páginas privadas
import PlaceholderPage from './pages/privadas/PlaceholderPage';

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario);
  
  if (!usuario) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<PaginaLanding />} />
      <Route path="/registro" element={<PaginaRegistro />} />
      <Route path="/registro-exito" element={<PaginaRegistroExito />} />

      {/* Protegidas */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Redirect inicial */}
        <Route path="/inicio" element={<Navigate to="/negocios" />} />
        
        {/* Navegación Principal (5 Tabs) */}
        <Route path="/negocios" element={<PlaceholderPage titulo="Negocios" icono="Store" />} />
        <Route path="/marketplace" element={<PlaceholderPage titulo="MarketPlace" icono="ShoppingCart" />} />
        <Route path="/ofertas" element={<PlaceholderPage titulo="Ofertas" icono="Tag" />} />
        <Route path="/dinamicas" element={<PlaceholderPage titulo="Dinámicas" icono="Gift" />} />
        <Route path="/empleos" element={<PlaceholderPage titulo="Empleos" icono="Briefcase" />} />
        
        {/* Secundarias */}
        <Route path="/card" element={<PlaceholderPage titulo="CardYA" icono="CreditCard" />} />
        <Route path="/perfil" element={<PlaceholderPage titulo="Mi Perfil" icono="User" />} />
        
        {/* Comerciales */}
        <Route path="/scan" element={<PlaceholderPage titulo="ScanYA" icono="QrCode" />} />
      </Route>

      {/* Business Studio (layout propio) */}
      <Route path="/business/*" element={<div>Business Studio</div>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
```

---

## 6. Landing Page

### 6.1 Características

- **Diseño móvil:** Onboarding tipo app (slides deslizables)
- **Diseño desktop:** Landing completa con secciones
- **Internacionalización:** Español/Inglés
- **Botones de acción:** Login, Registro, Google

### 6.2 Estructura de Slides (Móvil)

| # | Título | Descripción | Icono |
|---|--------|-------------|-------|
| 1 | Bienvenido | Intro a AnunciaYA | Logo |
| 2 | Gana Puntos | Acumula en negocios locales | CreditCard |
| 3 | Ofertas | Descubre promociones cerca | Tag |
| 4 | Dinámicas | Participa en sorteos | Gift |
| 5 | CTA | Botones de registro/login | - |

### 6.3 Secciones Desktop

1. Hero con CTA
2. Propuesta de valor
3. Cómo funciona (pasos)
4. Secciones de la app
5. Testimonios
6. FAQ
7. Footer

---

## 7. Layout Principal (Post-Login)

### 7.1 MainLayout.tsx

```typescript
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import ChatYA from '../chat/ChatYA';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop: Navbar */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Móvil: Header */}
      <div className="lg:hidden">
        <MobileHeader />
      </div>

      {/* Desktop: Sidebars + Content */}
      <div className="hidden lg:flex">
        {/* Columna Izquierda - Fixed */}
        <aside className="fixed left-0 top-16 bottom-0 w-56 border-r bg-white">
          <ColumnaIzquierda />
        </aside>

        {/* Main Content */}
        <main className="ml-56 mr-80 flex-1 pt-16 min-h-screen">
          <Outlet />
        </main>

        {/* Columna Derecha - Fixed */}
        <aside className="fixed right-0 top-16 bottom-0 w-80 border-l bg-white">
          <ColumnaDerecha />
        </aside>
      </div>

      {/* Móvil: Content + BottomNav */}
      <div className="lg:hidden">
        <main className="pt-16 pb-20">
          <Outlet />
        </main>
        <BottomNav />
      </div>

      {/* ChatYA - Overlay persistente */}
      <ChatOverlay />
    </div>
  );
}
```

### 7.2 Sistema de Breakpoints (Responsive Design)

#### Resoluciones Objetivo

| Prioridad | Resolución | Porcentaje Uso | Breakpoint | Estrategia |
|-----------|------------|----------------|------------|------------|
| 1 | Desktop (1920x1080) | ~35-40% | `2xl:` (1536px+) | Diseño espacioso, elementos grandes |
| 2 | Laptop (1366x768) | ~15-20% | `lg:` (1024px-1536px) | Diseño compacto, optimizar espacio vertical |
| 3 | Móvil (375x667 - 428x926) | ~40% | Sin prefijo (default) | Single column, navegación inferior |

#### Breakpoints Tailwind CSS

| Prefijo | Min Width | Uso en AnunciaYA |
|---------|-----------|------------------|
| *ninguno* | 0px | ✅ Default mobile-first |
| `sm:` | 640px | ⚠️ Evitar (poco usado) |
| `md:` | 768px | ⚠️ Evitar (poco usado) |
| `lg:` | 1024px | ✅ **COMPACTO** (laptops) |
| `xl:` | 1280px | ⚠️ **NO USAR** |
| `2xl:` | 1536px | ✅ **NORMAL/GRANDE** (desktop) |

#### ⚠️ Por qué evitar `xl:`

```
Laptop 1366x768:
- Ancho: 1366px → Activa xl: ✓ (1366 > 1280)
- Alto: 768px → MUY POCO
- Resultado: Usa valores "grandes" en pantalla pequeña ✗
```

**Solución:** Saltar de `lg:` directamente a `2xl:`.

#### Patrón de 3 Niveles

```typescript
// Móvil (default) → Laptop (lg:) → Desktop (2xl:)

// Títulos
className="text-xl lg:text-2xl 2xl:text-3xl"

// Texto normal
className="text-sm lg:text-sm 2xl:text-base"

// Padding
className="p-4 lg:p-3 2xl:p-6"

// Iconos
className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5"

// Botones
className="py-2 lg:py-2.5 2xl:py-3.5"

// Grid responsive
className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 2xl:gap-6"
```

#### Consideraciones para Laptops (768px altura)

```typescript
// ❌ MAL: Se corta el contenido
<div className="lg:flex lg:items-center lg:h-screen">

// ✅ BIEN: Permitir scroll
<div className="lg:flex lg:items-start lg:h-screen lg:overflow-y-auto lg:pt-8">
```

#### Flujo de Desarrollo

```
1. Diseñar para Desktop (1920x1080) primero
2. Adaptar para Laptop con lg: (compacto)
3. Verificar en Móvil (default)
4. Probar en resoluciones reales
```

> **📋 Ver guía completa:** Archivo `Guía_de_Responsive_Design_-_AnunciaYA.md` en el proyecto

---

## 8. Navegación

### 8.1 BottomNav (Móvil)

**5 elementos de navegación:**

| # | Icono | Label | Posición |
|---|-------|-------|----------|
| 1 | Store | Negocios | Izquierda |
| 2 | ShoppingCart | Market | Izquierda |
| 3 | MessageCircle | ChatYA | Centro (elevado) |
| 4 | Tag | Ofertas | Derecha |
| 5 | Gift | Dinámicas | Derecha |

**Botón ChatYA:**
- Posición: Centro, elevado (-top-6)
- Estilo: Círculo azul
- Badge: Contador de mensajes no leídos

### 8.2 Navbar (Desktop)

- Logo + Slogan "Tu Comunidad Local..."
- Selector de ubicación (Ciudad, Estado)
- Barra de búsqueda
- Tabs de navegación: Negocios, Market, Ofertas, Dinámicas, Empleos
- Botón ChatYA (azul, con badge)
- Notificaciones (badge)
- Avatar usuario

### 8.3 MobileHeader

- Logo + Slogan "Tu Comunidad Local..."
- Icono ubicación (abre ModalUbicacion)
- Icono tienda/negocio
- Notificaciones (badge)
- Menú hamburguesa (abre MenuDrawer)

### 8.4 MenuDrawer

- Foto y nombre del usuario
- Icono mensajes con badge
- Links secundarios:
  - CardYA
  - Bolsa de Trabajo
  - Mi Perfil
- (Si comercial) ScanYA, Business Studio
- Cerrar Sesión

---

## 9. Sistema de Geolocalización

### 9.1 Estrategia de Fallback

```
┌─────────────────────────────────────────────────────────────┐
│                    OBTENER UBICACIÓN                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Intento 1: Alta precisión (GPS)                            │
│  - enableHighAccuracy: true                                 │
│  - timeout: 15 segundos                                     │
│  - Precisión: 5-20 metros (móvil)                           │
│     ↓                                                       │
│  Si timeout o error → Intento 2                             │
│     ↓                                                       │
│  Intento 2: Baja precisión (IP/WiFi)                        │
│  - enableHighAccuracy: false                                │
│  - timeout: 10 segundos                                     │
│  - Precisión: 20m-50km (varía)                              │
│     ↓                                                       │
│  Resultado → Guardar en store + localStorage                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Auto-detección al Cargar

```typescript
// En Navbar.tsx y MobileHeader.tsx
useEffect(() => {
  // Solo detectar si NO hay ciudad guardada
  if (ciudad) return;

  const autoDetectar = async () => {
    const coordenadas = await obtenerUbicacion();
    
    if (coordenadas) {
      const { buscarCiudadCercana } = await import('../../data/ciudadesPopulares');
      const ciudadCercana = buscarCiudadCercana(
        coordenadas.latitud,
        coordenadas.longitud
      );
      
      if (ciudadCercana) {
        setCiudad(
          ciudadCercana.nombre,
          ciudadCercana.estado,
          ciudadCercana.coordenadas
        );
      }
    }
  };

  autoDetectar();
}, []); // Solo al montar
```

### 9.3 Catálogo de Ciudades

```typescript
// data/ciudadesPopulares.ts
export const ciudadesPopulares = [
  { nombre: 'Puerto Peñasco', estado: 'Sonora', coords: { lat: 31.3122, lng: -113.5465 } },
  { nombre: 'Hermosillo', estado: 'Sonora', coords: { lat: 29.0729, lng: -110.9559 } },
  { nombre: 'Tijuana', estado: 'Baja California', coords: { lat: 32.5149, lng: -117.0382 } },
  // ... más ciudades
];

export function buscarCiudadCercana(lat: number, lng: number) {
  // Fórmula Haversine para calcular distancia
  // Retorna ciudad más cercana
}
```

---

## 10. Modales de Autenticación

### 10.1 ModalLogin

- Login tradicional (email + password)
- Registro (redirige a PaginaRegistro)
- Google Sign-In
- Verificación 2FA
- Recuperación de contraseña

### 10.2 Flujo de Vistas

```
┌─────────────────────────────────────────────────────────────┐
│                    MODAL LOGIN                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  vistaAuth: 'login'                                         │
│  ├─ Email + Password                                        │
│  ├─ Botón Google                                            │
│  └─ Link a PaginaRegistro                                   │
│                                                             │
│  vistaAuth: '2fa'                                           │
│  ├─ Input 6 dígitos                                         │
│  └─ Link "Usar código de respaldo"                          │
│                                                             │
│  vistaAuth: 'recuperar'                                     │
│  ├─ Paso 1: Email                                           │
│  └─ Paso 2: Código + Nueva contraseña                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Safe Areas (iOS)

### 11.1 Variables CSS

```css
:root {
  --sat: env(safe-area-inset-top);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
  --sar: env(safe-area-inset-right);
}
```

### 11.2 Aplicación en Componentes

```tsx
// MobileHeader
<header className="pt-[var(--sat)] ...">

// BottomNav
<nav className="pb-[var(--sat)] ...">
```

### 11.3 index.html

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

---

## 12. Estado de Completado

### Completado ✅ (85%)

- [x] Setup React + Vite + Tailwind v4
- [x] Configuración TypeScript
- [x] Stores Zustand (auth, gps, ui)
- [x] Cliente API con interceptores
- [x] Sistema de rutas protegidas
- [x] Landing page con i18n
- [x] Modal de autenticación completo
- [x] Login tradicional + Google
- [x] Verificación 2FA
- [x] Recuperación de contraseña
- [x] MainLayout responsive
- [x] Navbar desktop
- [x] MobileHeader
- [x] BottomNav (5 elementos)
- [x] Sistema GPS con fallback
- [x] Auto-detección de ubicación
- [x] Safe areas configuradas
- [x] Scroll architecture (sidebars fijos)
- [x] PlaceholderPage para secciones

### Pendiente ⏳ (15%)

- [ ] MenuDrawer completo
- [ ] Sistema de notificaciones
- [ ] ColumnaIzquierda contenido
- [ ] ColumnaDerecha contenido
- [ ] ChatOverlay funcional

---

## 13. Próximos Pasos

1. **Completar Fase 4:**
   - MenuDrawer funcional
   - Notificaciones básicas
   - Sidebars con contenido

2. **Fase 5 (Secciones):**
   - Implementar /negocios
   - Implementar /marketplace
   - Implementar /ofertas
   - Implementar /dinamicas

3. **Integraciones:**
   - CardYA (QR dinámico)
   - ScanYA (escaneo)
   - Business Studio

---

*Fase 4 en progreso: 18 Diciembre 2024*
