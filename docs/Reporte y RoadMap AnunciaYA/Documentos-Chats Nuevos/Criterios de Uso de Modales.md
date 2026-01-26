# 📱 Criterios de Uso de Modales - AnunciaYA

**Proyecto:** AnunciaYA v3.0  
**Fecha de creación:** 14 Enero 2026  
**Última actualización:** 14 Enero 2026

---

## 📋 Resumen

AnunciaYA cuenta con **dos tipos de modales** que se usan según el contexto y dispositivo:

| Modal | Archivo | Comportamiento |
|-------|---------|----------------|
| **Modal** | `/components/ui/Modal.tsx` | Centrado tradicional (zoom-in/out) |
| **ModalBottom** | `/components/ui/ModalBottom.tsx` | Bottom Sheet desde abajo (slide-up con drag) |

---

## 🎯 Criterio Principal: Área de la App

| Área | Modal a Usar | Razón |
|------|--------------|-------|
| **Vista Pública** | Adaptativo (ambos) | Usuario final usa principalmente móvil |
| **Business Studio** | Solo `Modal.tsx` | Comerciante gestiona desde PC/Laptop |

---

## 📱 Vista Pública - Patrón Adaptativo

En las vistas públicas (`/components/negocios/`, páginas de consumidor), usamos el **hook `useBreakpoint()`** para mostrar el modal apropiado según el dispositivo:

| Dispositivo | Ancho | Modal | Razón |
|-------------|-------|-------|-------|
| **Móvil** | < 1024px | `ModalBottom` | Ergonómico, el pulgar alcanza los controles |
| **Laptop/PC** | ≥ 1024px | `Modal` | Profesional, mejor uso del espacio |

### Implementación

```tsx
import { Modal } from '@/components/ui/Modal';
import { ModalBottom } from '@/components/ui/ModalBottom';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function MiModal({ isOpen, onClose, data }) {
    const { esMobile } = useBreakpoint();

    // Contenido reutilizable
    const contenido = (
        <div>
            {/* Tu contenido aquí */}
        </div>
    );

    return (
        <>
            {esMobile ? (
                <ModalBottom
                    abierto={isOpen}
                    onCerrar={onClose}
                    titulo="Mi Título"
                >
                    {contenido}
                </ModalBottom>
            ) : (
                <Modal
                    abierto={isOpen}
                    onCerrar={onClose}
                    titulo="Mi Título"
                    ancho="lg"
                >
                    {contenido}
                </Modal>
            )}
        </>
    );
}
```

### Modales de Vista Pública (usar patrón adaptativo)

- `ModalOfertas.tsx` ✅ (ya implementado)
- `ModalCatalogo.tsx`
- `ModalHorarios.tsx`
- `ModalResenas.tsx`
- `ModalDetalleItem.tsx`

---

## 💼 Business Studio - Solo Modal Tradicional

En Business Studio, el comerciante gestiona su negocio principalmente desde **PC o Laptop**. Los formularios son complejos y largos, por lo que el modal centrado tradicional es más apropiado.

### Razones

1. **Dispositivo principal:** El comerciante trabaja desde escritorio
2. **Formularios largos:** Editar horarios, catálogo, configuración requieren espacio vertical
3. **Menos urgencia:** No es uso "en la calle" como el consumidor final
4. **Consistencia:** Interfaz de administración profesional

### Implementación (sin cambios)

```tsx
import { Modal } from '@/components/ui/Modal';

export default function ModalEditarProducto({ isOpen, onClose, producto }) {
    return (
        <Modal
            abierto={isOpen}
            onCerrar={onClose}
            titulo="Editar Producto"
            ancho="lg"
        >
            {/* Formulario aquí */}
        </Modal>
    );
}
```

---

## 🔧 Hook useBreakpoint

### Ubicación
```
apps/web/src/hooks/useBreakpoint.ts
```

### Valores Retornados

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `esMobile` | boolean | `true` si ancho < 1024px |
| `esLaptop` | boolean | `true` si ancho ≥ 1024px y < 1536px |
| `esDesktop` | boolean | `true` si ancho ≥ 1536px |
| `esEscritorio` | boolean | `true` si ≥ 1024px (laptop O desktop) |
| `breakpoint` | string | `'mobile'` \| `'laptop'` \| `'desktop'` |
| `ancho` | number | Ancho actual en pixels |

### Breakpoints (consistentes con Tailwind)

| Breakpoint | Ancho | Dispositivo |
|------------|-------|-------------|
| base | < 1024px | Móvil |
| lg: | ≥ 1024px | Laptop |
| 2xl: | ≥ 1536px | Desktop |

---

## 📦 Componentes de Modal

### Modal.tsx (Centrado Tradicional)

**Características:**
- Aparece en el centro de la pantalla
- Animación zoom-in / zoom-out
- Cierre con ESC, click fuera, botón X
- Bloqueo de scroll trasero

**Props principales:**
```tsx
interface ModalProps {
    abierto: boolean;
    onCerrar: () => void;
    titulo?: string;
    iconoTitulo?: ReactNode;
    children: ReactNode;
    ancho?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    cerrarAlClickFuera?: boolean;
    cerrarConEscape?: boolean;
    mostrarBotonCerrar?: boolean;
}
```

### ModalBottom.tsx (Bottom Sheet)

**Características:**
- Aparece desde abajo con efecto rebote
- Gesto drag para cerrar (arrastrar hacia abajo)
- Handle visual superior para indicar drag
- Altura máxima 65vh
- Overlay 50%
- Cierre con ESC, click fuera, botón X, drag

**Props principales:**
```tsx
interface ModalBottomProps {
    abierto: boolean;
    onCerrar: () => void;
    titulo?: string;
    iconoTitulo?: ReactNode;
    children: ReactNode;
    cerrarAlClickFuera?: boolean;
    cerrarConEscape?: boolean;
    mostrarBotonCerrar?: boolean;
}
```

---

## 📊 Tabla de Decisión Rápida

| Pregunta | Respuesta | Modal a usar |
|----------|-----------|--------------|
| ¿Es Business Studio? | Sí | `Modal.tsx` |
| ¿Es Vista Pública? | Sí | Hook + ambos |
| ¿Formulario largo/complejo? | Sí | `Modal.tsx` |
| ¿Lista/galería rápida? | Sí | Hook + ambos |
| ¿Confirmación simple? | Sí | `Modal.tsx` |

---

## 🚀 Cuándo usar ModalBottom (Bottom Sheet)

✅ **Ideal para:**
- Listas de items (ofertas, productos, reseñas)
- Galerías de imágenes
- Acciones rápidas (compartir, filtros)
- Selección de opciones
- Contenido de consulta (solo lectura)

❌ **Evitar para:**
- Formularios largos (muchos campos)
- Edición de datos complejos
- Wizards de múltiples pasos
- Contenido que necesita mucho espacio vertical

---

## 📁 Estructura de Archivos

```
apps/web/src/
├── components/
│   ├── ui/
│   │   ├── Modal.tsx          ← Modal centrado tradicional
│   │   └── ModalBottom.tsx    ← Bottom Sheet con drag
│   └── negocios/
│       ├── ModalOfertas.tsx   ← Usa patrón adaptativo ✅
│       ├── ModalCatalogo.tsx  ← Pendiente migrar
│       ├── ModalHorarios.tsx  ← Pendiente migrar
│       └── ModalResenas.tsx   ← Pendiente migrar
├── hooks/
│   └── useBreakpoint.ts       ← Hook para detectar dispositivo
└── pages/
    └── business-studio/       ← Solo usa Modal.tsx tradicional
```

---

## 📝 Checklist para Nuevos Modales

### Vista Pública
- [ ] Importar `Modal`, `ModalBottom` y `useBreakpoint`
- [ ] Extraer contenido a componente reutilizable
- [ ] Usar condicional `esMobile ? ModalBottom : Modal`
- [ ] Probar en ambos tamaños de pantalla

### Business Studio
- [ ] Usar solo `Modal.tsx`
- [ ] No requiere `useBreakpoint`
- [ ] Elegir `ancho` apropiado ('sm', 'md', 'lg', 'xl', 'full')

---

## 🎨 Consistencia Visual

Ambos modales comparten:
- Mismos nombres de props (`abierto`, `onCerrar`, `titulo`, etc.)
- Bloqueo de scroll trasero
- Cierre con ESC y click fuera
- Estilos responsive (base/lg/2xl)

---

**Documento creado:** 14 Enero 2026  
**Autor:** Claude (asistente de desarrollo)  
**Proyecto:** AnunciaYA v3.0
