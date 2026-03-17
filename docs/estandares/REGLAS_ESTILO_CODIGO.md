# 📐 Reglas de Estilo y Buenas Prácticas - AnunciaYA

**Fecha de creación:** 08 de Enero de 2025  
**Versión:** 1.0  
**Proyecto:** AnunciaYA v3.0

---

## 🎨 1. Tailwind CSS v4 - Clases de Gradiente

### ✅ Usar: `bg-linear-to-*`

En Tailwind CSS v4, la nomenclatura moderna para gradientes usa `linear`:

```typescript
// ✅ CORRECTO - Tailwind v4
<div className="bg-linear-to-br from-blue-500 to-purple-600">

// ❌ INCORRECTO - Nomenclatura antigua
<div className="bg-gradient-to-br from-blue-500 to-purple-600">
```

### Variantes disponibles:
- `bg-linear-to-t` - De abajo hacia arriba
- `bg-linear-to-tr` - De abajo-izquierda a arriba-derecha
- `bg-linear-to-r` - De izquierda a derecha
- `bg-linear-to-br` - De arriba-izquierda a abajo-derecha ⭐
- `bg-linear-to-b` - De arriba hacia abajo
- `bg-linear-to-bl` - De arriba-derecha a abajo-izquierda
- `bg-linear-to-l` - De derecha a izquierda
- `bg-linear-to-tl` - De abajo-derecha a arriba-izquierda

### Razón del cambio:
- Tailwind v4 introduce `bg-linear-to-*` como el estándar
- Más consistente con la nomenclatura CSS nativa
- Mejor diferenciación entre gradientes lineales y radiales

---

## 📦 2. Flexbox - Propiedades Abreviadas

### ✅ Usar: `shrink-0`

Tailwind CSS v3+ introdujo versiones abreviadas de las propiedades flex:

```typescript
// ✅ CORRECTO - Versión moderna
<div className="shrink-0">

// ❌ INCORRECTO - Versión verbosa
<div className="flex-shrink-0">
```

### Otras propiedades abreviadas:
- `grow` en vez de `flex-grow`
- `grow-0` en vez de `flex-grow-0`
- `shrink` en vez de `flex-shrink`
- `shrink-0` en vez de `flex-shrink-0` ⭐
- `basis-*` en vez de `flex-basis-*`

### Razón del cambio:
- Código más limpio y conciso
- Mejor legibilidad
- Estándar actual de Tailwind CSS

---

## 🚫 3. TypeScript - Prohibición de `any`

### ❌ NUNCA usar `any`

El tipo `any` desactiva completamente el sistema de tipos de TypeScript, eliminando todos los beneficios de seguridad de tipos.

```typescript
// ❌ INCORRECTO - Desactiva type safety
function procesar(datos: any) {
  return datos.valor; // Sin validación
}

// ✅ CORRECTO - Opción 1: Tipar correctamente
interface DatosUsuario {
  valor: string;
  id: number;
}

function procesar(datos: DatosUsuario) {
  return datos.valor; // ✅ Type safe
}

// ✅ CORRECTO - Opción 2: Usar 'unknown' si el tipo es verdaderamente desconocido
function procesar(datos: unknown) {
  if (typeof datos === 'object' && datos !== null && 'valor' in datos) {
    return (datos as { valor: string }).valor;
  }
  throw new Error('Datos inválidos');
}

// ✅ CORRECTO - Opción 3: Usar generics
function procesar<T extends { valor: string }>(datos: T) {
  return datos.valor;
}
```

### Alternativas recomendadas:

#### 1. **Interfaces y Types**
```typescript
interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

const usuario: Usuario = {
  id: '123',
  nombre: 'Juan',
  email: 'juan@example.com'
};
```

#### 2. **Unknown (cuando el tipo es realmente desconocido)**
```typescript
function manejarError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else if (typeof error === 'string') {
    console.error(error);
  } else {
    console.error('Error desconocido');
  }
}
```

#### 3. **Generics**
```typescript
function obtenerPrimero<T>(array: T[]): T | undefined {
  return array[0];
}

const numeros = [1, 2, 3];
const primero = obtenerPrimero(numeros); // Type: number | undefined
```

#### 4. **Type Guards**
```typescript
interface Perro {
  tipo: 'perro';
  ladrar: () => void;
}

interface Gato {
  tipo: 'gato';
  maullar: () => void;
}

type Mascota = Perro | Gato;

function esPerro(mascota: Mascota): mascota is Perro {
  return mascota.tipo === 'perro';
}

function hacerSonido(mascota: Mascota) {
  if (esPerro(mascota)) {
    mascota.ladrar(); // ✅ TypeScript sabe que es Perro
  } else {
    mascota.maullar(); // ✅ TypeScript sabe que es Gato
  }
}
```

#### 5. **Utility Types**
```typescript
// Partial - Hace todas las propiedades opcionales
interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

type UsuarioParcial = Partial<Usuario>;
// = { id?: string; nombre?: string; email?: string }

// Pick - Selecciona propiedades específicas
type UsuarioBasico = Pick<Usuario, 'id' | 'nombre'>;
// = { id: string; nombre: string }

// Omit - Omite propiedades específicas
type UsuarioSinId = Omit<Usuario, 'id'>;
// = { nombre: string; email: string }

// Record - Crea objeto con claves y valores tipados
type UsuariosPorId = Record<string, Usuario>;
// = { [key: string]: Usuario }
```

### Razones para NO usar `any`:

1. **Pérdida de Type Safety**
   - No hay validación en tiempo de compilación
   - Errores solo aparecen en runtime

2. **Peor experiencia de desarrollo**
   - Sin autocompletado del IDE
   - Sin documentación inline
   - Sin refactoring seguro

3. **Bugs ocultos**
   - Acceso a propiedades inexistentes
   - Llamadas a métodos incorrectos
   - Conversiones de tipo incorrectas

4. **Mantenibilidad reducida**
   - Código más difícil de entender
   - Cambios riesgosos
   - Debugging más complicado

### Casos excepcionales (usar con extrema precaución):

Si **absolutamente** no hay forma de tipar correctamente, documenta por qué:

```typescript
// ⚠️ EXCEPCIONAL - Solo si es imposible tipar
// Razón: Librería externa sin tipos disponibles
const resultado = (ventanaGlobal as any).funcionExterna();

// O mejor aún, crea una definición de tipos:
declare global {
  interface Window {
    funcionExterna: () => string;
  }
}

const resultado = window.funcionExterna(); // ✅ Ahora está tipado
```

---

## 🎯 4. Tailwind CSS - Clases Canónicas vs Valores Arbitrarios

### ✅ Usar: Clases canónicas cuando existan

Tailwind CSS recomienda usar clases predefinidas (canónicas) en lugar de valores arbitrarios cuando estén disponibles.

```typescript
// ❌ INCORRECTO - Valor arbitrario innecesario
<div className="z-[9999]">

// ✅ CORRECTO - Clase canónica
<div className="z-9999">
```

### Regla general:

**Si existe una clase predefinida, úsala. Los valores arbitrarios `[]` solo cuando no haya alternativa.**

### Ejemplos comunes:

#### Z-Index
```typescript
// ❌ INCORRECTO
className="z-[10]"
className="z-[9999]"
className="z-[50]"

// ✅ CORRECTO
className="z-10"
className="z-9999"
className="z-50"
```

#### Spacing (padding, margin)
```typescript
// ❌ INCORRECTO - Si existe la clase
className="p-[16px]"    // Existe p-4
className="m-[32px]"    // Existe m-8

// ✅ CORRECTO
className="p-4"         // 1rem = 16px
className="m-8"         // 2rem = 32px

// ✅ CORRECTO - Valor no estándar
className="p-[18px]"    // No existe en Tailwind
className="m-[33px]"    // No existe en Tailwind
```

#### Width/Height
```typescript
// ❌ INCORRECTO - Si existe la clase
className="w-[100%]"    // Existe w-full
className="h-[50%]"     // Existe h-1/2

// ✅ CORRECTO
className="w-full"
className="h-1/2"

// ✅ CORRECTO - Valor específico
className="w-[380px]"   // Valor custom necesario
```

### Razones para usar clases canónicas:

1. **Mejor legibilidad**
   - Más fácil de leer y entender
   - Nomenclatura consistente

2. **Optimización del bundle**
   - Clases predefinidas están optimizadas
   - Mejor tree-shaking

3. **Autocompletado del IDE**
   - Mejores sugerencias
   - Menos errores de escritura

4. **Mantenibilidad**
   - Más fácil buscar y reemplazar
   - Código más consistente

### Cuándo SÍ usar valores arbitrarios `[]`:

```typescript
// ✅ CORRECTO - Valores que no existen en Tailwind
className="w-[380px]"           // Ancho específico del diseño
className="h-[calc(100vh-64px)]" // Cálculo custom
className="top-[73px]"          // Posición exacta
className="bg-[#FF6B35]"        // Color específico de marca
className="text-[17px]"         // Tamaño de fuente custom
```

### Cómo verificar si existe una clase canónica:

1. **Consultar la documentación**: [Tailwind CSS Docs](https://tailwindcss.com/docs)
2. **Autocompletado del IDE**: Si aparece en el autocompletado, existe
3. **Warning del linter**: Si VSCode sugiere cambiar a canónica, hazlo

### ⚠️ Importante:

El warning `suggestCanonicalClasses` indica que estás usando un valor arbitrario cuando existe una clase predefinida. **Siempre corrígelo.**

```typescript
// VSCode Warning: "The class `z-[9999]` can be written as `z-9999`"
// ❌ Ignorar el warning
<div className="z-[9999]">

// ✅ Corregir inmediatamente
<div className="z-9999">
```

---

## 🏷️ 5. Formularios - Accesibilidad y Atributos `id`, `name`, `htmlFor`

### ✅ Regla Principal

Todos los campos de formulario (`<input>`, `<select>`, `<textarea>`) deben tener atributos `id` y `name`, y sus labels deben estar correctamente asociados.

### Por qué importa:

1. **Autocompletado del navegador** - Chrome/Safari pueden recordar datos del usuario
2. **Accesibilidad** - Lectores de pantalla funcionan correctamente
3. **Consola limpia** - Sin advertencias "Violating node" en DevTools

---

### 5.1 Inputs con Labels

```tsx
// ❌ INCORRECTO - Sin id/name, label sin htmlFor
<label className="...">
  Correo Electrónico
</label>
<input
  type="email"
  value={email}
  onChange={...}
/>

// ✅ CORRECTO - Con id, name y htmlFor
<label htmlFor="input-email" className="...">
  Correo Electrónico
</label>
<input
  id="input-email"
  name="input-email"
  type="email"
  value={email}
  onChange={...}
/>
```

---

### 5.2 Componente `<Input>` Reutilizable

Si usas el componente `Input.tsx` de `/components/ui/`, el `id`, `name` y `htmlFor` se generan **automáticamente** desde el `label`:

```tsx
// ✅ Automático - genera id="input-correo-electronico"
<Input 
  label="Correo Electrónico" 
  type="email" 
  value={email}
/>
```

---

### 5.3 Checkboxes y Selects

#### Opción A: Anidado dentro de `<label>` (válido)

```tsx
// ✅ CORRECTO - Input anidado dentro del label
<label className="flex items-center gap-2 cursor-pointer">
  <input
    id="checkbox-acepto"
    name="checkbox-acepto"
    type="checkbox"
    checked={acepto}
    onChange={...}
  />
  <span>Acepto los términos</span>
</label>
```

#### Opción B: Separado con `htmlFor`

```tsx
// ✅ CORRECTO - Label separado con htmlFor
<div className="flex items-center gap-2">
  <input
    id="checkbox-acepto"
    name="checkbox-acepto"
    type="checkbox"
    checked={acepto}
    onChange={...}
  />
  <label htmlFor="checkbox-acepto">
    Acepto los términos
  </label>
</div>
```

---

### 5.4 Labels de Grupo vs Labels de Campo

#### ❌ INCORRECTO - `<label>` para título de sección

```tsx
// ❌ NO usar label para títulos de grupo/sección
<label className="font-bold text-slate-700">
  Subcategorías (máx 3) *
</label>
<div className="grid grid-cols-2">
  {/* checkboxes aquí */}
</div>
```

#### ✅ CORRECTO - `<span>` para título de sección

```tsx
// ✅ Usar span para títulos que NO son campos individuales
<span className="font-bold text-slate-700">
  Subcategorías (máx 3) *
</span>
<div className="grid grid-cols-2">
  {/* checkboxes aquí */}
</div>
```

---

### 5.5 Convención de Nombres para IDs

| Tipo de Campo | Formato de ID | Ejemplo |
|---------------|---------------|---------|
| Input texto | `input-{descripcion}` | `input-nombre-negocio` |
| Input email | `input-{descripcion}` | `input-email-contacto` |
| Checkbox | `checkbox-{descripcion}` | `checkbox-acepto-terminos` |
| Select | `select-{descripcion}` | `select-categoria` |
| Textarea | `textarea-{descripcion}` | `textarea-descripcion` |

### Generar IDs desde labels (función helper):

```typescript
const generarIdDesdeLabel = (label: string): string => {
  return 'input-' + label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')    // Solo alfanuméricos
    .replace(/\s+/g, '-')            // Espacios → guiones
    .trim();
};

// "Correo Electrónico" → "input-correo-electronico"
// "Nombre del Negocio" → "input-nombre-del-negocio"
```

---

### 5.6 Resumen Rápido

| Elemento | Requiere `id` | Requiere `name` | Label asociado |
|----------|---------------|-----------------|----------------|
| `<input type="text">` | ✅ Sí | ✅ Sí | `htmlFor` o anidado |
| `<input type="checkbox">` | ✅ Sí | ✅ Sí | `htmlFor` o anidado |
| `<select>` | ✅ Sí | ✅ Sí | `htmlFor` o anidado |
| `<textarea>` | ✅ Sí | ✅ Sí | `htmlFor` o anidado |
| Título de sección | — | — | Usar `<span>` |

---

## 📝 Resumen de Reglas

| Categoría | ❌ NO usar | ✅ SÍ usar |
|-----------|-----------|-----------|
| Gradientes | `bg-gradient-to-*` | `bg-linear-to-*` |
| Flexbox | `flex-shrink-0` | `shrink-0` |
| TypeScript | `any` | `interface`, `type`, `unknown`, `generics` |
| Valores Arbitrarios | `z-[9999]` (si existe canónica) | `z-9999` (clase canónica) |
| Formularios | `<input>` sin `id`/`name` | `<input id="..." name="...">` |
| Labels | `<label>` sin `htmlFor` | `<label htmlFor="...">` |
| Títulos de sección | `<label>` para grupos | `<span>` para grupos |
| Catch sin usar error | `catch (err)` o `catch (_err)` | `catch` (sin parámetro) |
| Código no usado | Dejar definido | Eliminar completamente |

---

## 🔍 Verificación en Código Existente

### Buscar usos incorrectos:

```bash
# Buscar bg-gradient-to-
grep -r "bg-gradient-to-" apps/web/src/

# Buscar flex-shrink-0
grep -r "flex-shrink-0" apps/web/src/

# Buscar any en TypeScript
grep -r ": any" apps/web/src/

# Buscar valores arbitrarios comunes (revisar si existe clase canónica)
grep -r "z-\[" apps/web/src/
grep -r "w-\[100%\]" apps/web/src/
grep -r "h-\[50%\]" apps/web/src/

# Buscar inputs sin id (posibles problemas de accesibilidad)
grep -rn "<input" apps/web/src/ | grep -v "id="

# Buscar labels sin htmlFor (que no contengan inputs anidados)
grep -rn "<label" apps/web/src/ | grep -v "htmlFor"
```

---

## 🎯 Enforcement

Estas reglas deben aplicarse en:

1. ✅ **Código nuevo** - Siempre seguir estas reglas
2. ✅ **Code reviews** - Rechazar PRs que no cumplan
3. ✅ **Refactoring** - Corregir gradualmente código existente
4. ✅ **ESLint** - Configurar regla `@typescript-eslint/no-explicit-any: "error"`

---

## 🔧 6. ESLint - Reglas Adicionales

### 6.1 Catch sin Variable de Error

Cuando no necesitas usar el objeto de error en un bloque `catch`, omite el parámetro completamente.

```typescript
// ❌ INCORRECTO - Variable definida pero no usada
try {
  await navigator.clipboard.writeText(url);
} catch (err) {
  notificar.error('No se pudo copiar');
}

// ❌ INCORRECTO - Prefijo underscore tampoco funciona
try {
  await navigator.clipboard.writeText(url);
} catch (_err) {
  notificar.error('No se pudo copiar');
}

// ✅ CORRECTO - Catch sin parámetro (ES2019+)
try {
  await navigator.clipboard.writeText(url);
} catch {
  notificar.error('No se pudo copiar');
}
```

**Nota:** Si necesitas el error para logging, úsalo:
```typescript
} catch (error) {
  console.error('Error:', error);
  notificar.error('No se pudo copiar');
}
```

---

### 6.2 Variables y Funciones No Usadas

ESLint marca error cuando defines variables o funciones que nunca se usan. **Siempre elimínalas.**

```typescript
// ❌ INCORRECTO - Función definida pero nunca llamada
const compartirNativo = async () => {
  // ... código
};

// ✅ CORRECTO - Eliminar código muerto
// (simplemente no incluir la función)
```

---

### 6.3 Resumen Rápido - ESLint

| Situación | ❌ Incorrecto | ✅ Correcto |
|-----------|---------------|-------------|
| Catch sin usar error | `catch (err)` | `catch` |
| Variable con underscore | `catch (_err)` | `catch` |
| Función no usada | Dejar definida | Eliminar |
| Variable no usada | `const x = 5;` (sin usar) | Eliminar |

---

## 🧩 12. React — No definir componentes dentro de otros componentes

### ❌ Nunca definir un componente React dentro de otro componente

Cuando un componente se define dentro de otro, React crea una **nueva referencia** en cada render. Esto causa:
- **Pérdida de focus** en inputs
- **Remount completo** del componente hijo (se destruye y recrea)
- **Pérdida de estado interno** del hijo

```typescript
// ❌ INCORRECTO — componente definido dentro de otro
export default function PaginaPerfil() {
  const MiInput = ({ value }: { value: string }) => {
    return <input value={value} />;
  };

  return <MiInput value="hola" />;
}

// ✅ CORRECTO — componente a nivel de módulo
function MiInput({ value }: { value: string }) {
  return <input value={value} />;
}

export default function PaginaPerfil() {
  return <MiInput value="hola" />;
}
```

### Regla:
- **Componentes React** (con JSX, hooks o estado): SIEMPRE a nivel de módulo
- **Funciones helper puras** (sin JSX ni hooks): pueden estar dentro si solo se usan ahí
- Si el componente necesita datos del padre, pasarlos como **props**

---

## 📚 Referencias

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Deep Dive - Avoid Any](https://basarat.gitbook.io/typescript/type-system/avoid-any)

---

**Última actualización:** 13 de Enero de 2026  
**Mantenedor:** Equipo AnunciaYA