# INSTRUCCIONES GENERALES DE TRABAJO - AnunciaYA

## 🎯 Proceso de Decisión

- Este prompt es una **guía orientativa**, no un mandato absoluto
- Las decisiones finales las tomaremos juntos en la conversación
- Pregunta antes de proceder con cambios importantes

---

## 💻 Generación de Código y Archivos

### Modificación de Archivos

- Para archivos largos existentes: **proporcionar instrucciones escritas** o usar `str_replace` (ver REGLAS_MANEJO_ARCHIVOS.md)
- 🚫 **PROHIBIDO ESTRICTAMENTE** regenerar archivos completos sin autorización previa

**IMPORTANTE - Dos escenarios:**

#### Escenario A: Juan hará los cambios
- Claude proporciona **instrucciones escritas** detalladas
- Claude NO genera código completo
- Juan aplicará los cambios manualmente

#### Escenario B: Claude hará los cambios
- Claude puede **ejecutar todos los cambios al mismo tiempo**
- Usar `str_replace` para archivos largos
- Generar archivos completos si son nuevos

---

## 🧩 Sistema de Notificaciones

- Usar **siempre** el sistema de notificaciones personalizado (`notificaciones.ts`)
- **NUNCA** usar `alert()`, `confirm()` o `prompt()` de JavaScript nativo
- El sistema ya está configurado y debe usarse en todo el proyecto

---

## 📋 Flujo de Trabajo Requerido

### ⚠️ REGLA CRÍTICA: Siempre Pedir Archivos Directamente

1. **NUNCA buscar en la memoria del proyecto primero**
2. **SIEMPRE pedir archivos directamente a Juan**
3. **Razón:** La memoria del proyecto puede contener:
   - Archivos viejos o desactualizados
   - Información falsa o inconsistente
   - Código que ya fue modificado

**Flujo correcto:**
```
Usuario solicita modificar archivo
    ↓
Claude: "Compárteme el archivo actual [nombre].tsx"
    ↓
Juan comparte el archivo
    ↓
Claude revisa código REAL y actualizado
    ↓
Claude genera cambios basados en código real
```

**Flujo INCORRECTO ❌:**
```
Usuario solicita modificar archivo
    ↓
Claude busca en memoria del proyecto
    ↓
Claude encuentra versión vieja
    ↓
Claude genera cambios basados en código desactualizado ❌
```

### Proceso General

1. **SIEMPRE pedir archivos directamente a Juan** antes de generar código
2. Ver el contexto real del código existente (no confiar en memoria)
3. NO inventar ni suponer código que no existe
4. Consultar la estructura de carpetas para decidir ubicaciones

---

## 📚 Documentos de Referencia OBLIGATORIOS

Leer antes de generar cualquier código:

### 1. `Guia_Responsive_Laptop_AnunciaYA.md`
Reglas de diseño responsive para:
- 📱 Móvil
- 💻 Laptop
- 🖥️ PC FullHD

### 2. `REGLAS_ESTILO_CODIGO.md`
Buenas prácticas, ESLint y TypeScript

### 3. `REGLAS_MANEJO_ARCHIVOS.md`
Reglas estrictas para manejo de archivos >100 líneas

---

## ⚡ Orden de Ejecución

1. ✅ **Solicitar archivos directamente a Juan** (NO usar memoria del proyecto)
2. ✅ Revisar código REAL actualizado
3. ✅ Revisar documentación aplicable
4. ✅ Proponer solución
5. ✅ Esperar aprobación
6. ✅ Generar código

---

## 📝 Reglas de Estilo de Código

### ⚠️ CRÍTICO: Evitar Errores de ESLint y TypeScript

**Claude debe generar código limpio desde el inicio, sin errores de linter.**

#### 1. TypeScript - NUNCA usar `any`

```typescript
// ❌ INCORRECTO
function procesar(datos: any) { }

// ✅ CORRECTO - Usar tipos específicos
interface DatosUsuario {
  id: string;
  nombre: string;
}
function procesar(datos: DatosUsuario) { }

// ✅ CORRECTO - Usar unknown si el tipo es desconocido
function procesar(datos: unknown) { }
```

**Alternativas permitidas:**
- `interface` y `type` para tipos específicos
- `unknown` cuando el tipo es realmente desconocido
- `Generics` para funciones reutilizables
- `Utility Types` (Partial, Pick, Omit, Record)

#### 2. Catch sin Variable de Error

```typescript
// ❌ INCORRECTO - Variable definida pero no usada
catch (err) { }
catch (_err) { }

// ✅ CORRECTO - Catch sin parámetro
catch {
  notificar.error('Error al procesar');
}

// ✅ CORRECTO - Solo si usas el error
catch (error) {
  console.error('Error:', error);
  notificar.error('Error al procesar');
}
```

#### 3. Variables y Funciones No Usadas

```typescript
// ❌ INCORRECTO - Función definida pero nunca usada
const funcionNoUsada = () => { };

// ✅ CORRECTO - Eliminar código muerto
// (simplemente no incluir la función)
```

**Regla:** Si defines algo, úsalo. Si no lo usas, elimínalo.

#### 4. Tailwind CSS v4

```typescript
// ❌ INCORRECTO - Sintaxis antigua
className="bg-gradient-to-br flex-shrink-0"

// ✅ CORRECTO - Sintaxis v4
className="bg-linear-to-br shrink-0"
```

**Reglas de Tailwind:**
- Usar `bg-linear-to-*` en lugar de `bg-gradient-to-*`
- Usar `shrink-0` en lugar de `flex-shrink-0`
- Preferir clases canónicas sobre valores arbitrarios: `z-9999` en vez de `z-[9999]`

#### 5. Formularios - Atributos Obligatorios

```tsx
// ❌ INCORRECTO - Sin id/name
<label>Email</label>
<input type="email" />

// ✅ CORRECTO - Con id, name y htmlFor
<label htmlFor="input-email">Email</label>
<input
  id="input-email"
  name="input-email"
  type="email"
/>
```

**Importante:** Todos los campos de formulario deben tener `id` y `name` para:
- Autocompletado del navegador
- Accesibilidad
- Evitar warnings en DevTools

#### 6. Labels de Grupo vs Labels de Campo

```tsx
// ❌ INCORRECTO - <label> para título de sección
<label>Subcategorías</label>

// ✅ CORRECTO - <span> para títulos de grupo
<span>Subcategorías</span>
```

**Regla:** `<label>` solo para campos individuales, `<span>` para títulos de grupo/sección.

---

## 📝 Reglas Adicionales

- Seguir estrictamente las guías de responsive design
- Mantener consistencia con patrones existentes
- Aplicar buenas prácticas de código en todo momento
- **Generar código sin errores de ESLint/TypeScript desde el inicio**
- Usar el sistema de notificaciones personalizado (`notificaciones.ts`)

---

## 🔗 Estructura del Proyecto

Para consultar la estructura completa de carpetas, revisar el archivo:
- `estructura-nueva.txt` en la raíz del proyecto

Para ver los componentes reutilizables disponibles:
- Revisar `/apps/web/src/components/ui/`

---

**Última actualización:** 18 Enero 2026  
**Versión:** 2.0  
**Proyecto:** AnunciaYA v3.0  
**Desarrollador:** Juan
