# Patrón de Scroll Lateral - AnunciaYA

## Fecha de implementación
30 de Diciembre, 2025

---

## Resumen

Este documento describe el patrón de scroll implementado en AnunciaYA donde:

- La **barra de scroll** aparece en el **borde derecho de la ventana** del navegador
- El scroll **solo mueve el contenido central**
- El **Navbar**, **ColumnaIzquierda** y **ColumnaDerecha** permanecen **fijos**

---

## Arquitectura Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NAVBAR (fixed, no se mueve)                     │
├────────────┬─────────────────────────────────────┬──────────────────┤
│            │                                     │                  │
│  COLUMNA   │                                     │     COLUMNA      │
│ IZQUIERDA  │        CONTENIDO CENTRAL            │     DERECHA      │
│  (fixed)   │         (se mueve con scroll)       │     (fixed)      │
│            │                                     │                  │
│            │                                     │                  │
│            │                                     │                ▲ │
│            │                                     │                █ │ ← Barra de scroll
│            │                                     │                █ │    (borde derecho)
│            │                                     │                ▼ │
└────────────┴─────────────────────────────────────┴──────────────────┘
```

---

## Archivos Modificados

### 1. `MainLayout.tsx`
**Ubicación:** `apps/web/src/components/layout/MainLayout.tsx`

**Cambios clave:**

```tsx
// HEADER - Fixed en desktop
<div className="sticky top-0 z-50 lg:fixed lg:left-0 lg:right-0">
  {esDesktop ? <Navbar /> : <MobileHeader />}
</div>

// CONTENIDO CENTRAL - Sin altura fija, con padding-top
<main className="lg:ml-[240px] 2xl:ml-[320px] lg:mr-[272px] 2xl:mr-[352px] lg:pt-[90px]">
  <Outlet />
</main>

// COLUMNAS LATERALES - Ya estaban fixed (sin cambios)
<aside className="fixed left-0 ..." style={{ top: '90px' }}>
  <ColumnaIzquierda />
</aside>

<aside className="fixed right-0 ..." style={{ top: '90px' }}>
  <ColumnaDerecha />
</aside>
```

### 2. `index.css`
**Ubicación:** `apps/web/src/index.css`

**Clase existente utilizada:**

```css
/* Ocultar scrollbar en elementos específicos */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## Patrones para Nuevas Páginas

### Tipo A: Páginas con Scroll Normal

Para páginas donde el contenido puede crecer verticalmente (listas, formularios, perfiles):

```tsx
// ✅ CORRECTO - Dejar que el contenido fluya naturalmente
function MiPaginaNueva() {
  return (
    <div className="p-4">
      {/* El contenido crece y el scroll del body lo maneja */}
      <h1>Título</h1>
      <div>Contenido largo...</div>
    </div>
  );
}
```

**Características:**
- No necesitas definir altura
- El scroll del navegador (borde derecho) se activa automáticamente
- Las columnas laterales permanecen fijas

---

### Tipo B: Páginas Fullscreen (Mapas, Editores)

Para páginas que necesitan ocupar TODO el espacio disponible (como PaginaNegocios con el mapa):

```tsx
// ✅ CORRECTO - Altura explícita basada en viewport
function MiPaginaFullscreen() {
  return (
    <div className="relative h-[calc(100vh-90px)] w-full">
      {/* 90px = altura del Navbar */}
      {/* El contenido ocupa todo el espacio sin scroll */}
      <MiMapaOEditor />
    </div>
  );
}
```

**Características:**
- Altura fija: `h-[calc(100vh-90px)]`
- El `90px` corresponde a la altura del Navbar
- No hay scroll en este tipo de página
- Ideal para mapas, editores de imagen, dashboards fullscreen

---

## Valores Importantes

| Elemento | Valor | Descripción |
|----------|-------|-------------|
| Altura Navbar | `90px` | Altura total del header en desktop |
| Margen izquierdo (lg) | `ml-[240px]` | Espacio para ColumnaIzquierda en laptop |
| Margen izquierdo (2xl) | `ml-[320px]` | Espacio para ColumnaIzquierda en desktop |
| Margen derecho (lg) | `mr-[272px]` | Espacio para ColumnaDerecha en laptop |
| Margen derecho (2xl) | `mr-[352px]` | Espacio para ColumnaDerecha en desktop |
| Breakpoint desktop | `1024px` | Donde cambia de móvil a desktop (lg) |

---

## Checklist para Nuevas Páginas

### ✅ Página con Scroll Normal
- [ ] No definir altura fija en el contenedor principal
- [ ] Usar padding/margin según necesites
- [ ] El scroll aparecerá automáticamente en el borde derecho

### ✅ Página Fullscreen (Mapa/Editor)
- [ ] Usar `h-[calc(100vh-90px)]` en el contenedor principal
- [ ] Agregar `relative` si tienes elementos posicionados
- [ ] Agregar `w-full` para ocupar todo el ancho

---

## Ejemplo Completo: Página Nueva con Scroll

```tsx
/**
 * MiNuevaPagina.tsx
 * Ejemplo de página que sigue el patrón de scroll lateral
 */

function MiNuevaPagina() {
  return (
    // Sin altura fija - el scroll del body maneja el overflow
    <div className="p-4 lg:p-6">
      
      {/* Header de la página */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mi Nueva Página</h1>
        <p className="text-slate-600">Descripción de la página</p>
      </div>
      
      {/* Contenido que puede crecer */}
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow">
            {item.nombre}
          </div>
        ))}
      </div>
      
    </div>
  );
}

export default MiNuevaPagina;
```

---

## Ejemplo Completo: Página Fullscreen

```tsx
/**
 * MiPaginaMapa.tsx
 * Ejemplo de página fullscreen que sigue el patrón
 */

function MiPaginaMapa() {
  return (
    // Altura fija basada en viewport menos el Navbar
    <div className="relative h-[calc(100vh-90px)] w-full">
      
      {/* Mapa o contenido fullscreen */}
      <div className="absolute inset-0">
        <MiComponenteMapa />
      </div>
      
      {/* Elementos flotantes sobre el mapa */}
      <div className="absolute top-4 left-4 z-10">
        <ControlesFlotantes />
      </div>
      
    </div>
  );
}

export default MiPaginaMapa;
```

---

## Errores Comunes a Evitar

### ❌ NO usar `h-full` sin contexto
```tsx
// ❌ INCORRECTO - h-full no tiene referencia de altura
<div className="h-full">
  <MiContenido />
</div>
```

### ❌ NO agregar `overflow-y-auto` al contenedor de página
```tsx
// ❌ INCORRECTO - Crea scroll interno, no lateral
<div className="h-screen overflow-y-auto">
  <MiContenido />
</div>
```

### ✅ CORRECTO - Dejar que el body maneje el scroll
```tsx
// ✅ CORRECTO - Sin altura fija ni overflow
<div className="p-4">
  <MiContenido />
</div>
```

---

## Notas Finales

1. **El scroll del navegador** (borde derecho de la ventana) es el que mueve el contenido central
2. **MainLayout.tsx** ya está configurado correctamente - no necesitas modificarlo
3. **Solo define altura explícita** (`h-[calc(100vh-90px)]`) para páginas fullscreen
4. **Para móvil** el comportamiento es diferente (sin columnas laterales)

---

## Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 30/12/2025 | Implementación inicial del patrón de scroll lateral |
