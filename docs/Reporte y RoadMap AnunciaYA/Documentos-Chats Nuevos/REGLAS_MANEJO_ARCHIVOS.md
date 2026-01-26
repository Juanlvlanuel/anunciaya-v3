# 🔒 REGLAS ESTRICTAS - Manejo de Archivos

**Proyecto:** AnunciaYA v3.0  
**Fecha:** 07 Enero 2026  
**Estas reglas son OBLIGATORIAS y están guardadas en mi memoria permanente**

---

## 🚨 REGLA PRINCIPAL

### **NUNCA generar archivos >100 líneas sin seguir este flujo:**

```
┌─────────────────────────────────────────────────┐
│ Usuario solicita crear/modificar archivo       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ ¿Tiene >100 líneas? │
        └─────┬───────────┬───┘
              │           │
             NO          SÍ
              │           │
              │           ▼
              │   ┌──────────────────────┐
              │   │ PREGUNTAR PRIMERO:   │
              │   │ "¿Este archivo ya    │
              │   │  existe?"            │
              │   └─────┬────────────┬───┘
              │         │            │
              │        SÍ           NO
              │         │            │
              │         ▼            ▼
              │   ┌──────────┐  ┌────────────┐
              │   │ Pedir    │  │ Confirmar  │
              │   │ archivo  │  │ que es     │
              │   │ actual   │  │ NUEVO      │
              │   └────┬─────┘  └─────┬──────┘
              │        │              │
              │        ▼              │
              │   ┌──────────┐       │
              │   │   Usar   │       │
              │   │str_replace│      │
              │   └──────────┘       │
              │                      │
              └──────────┬───────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ Generar      │
                 │ archivo      │
                 └──────────────┘
```

---

## ✅ FLUJO OBLIGATORIO (Archivos >100 líneas)

### Paso 1: **SIEMPRE Preguntar Primero**

**❌ INCORRECTO (lo que NO debo hacer):**
```
Usuario: "Crea PasoImagenes.tsx completo con useOptimisticUpload"

Claude: [Genera 900 líneas de código]
```

**✅ CORRECTO (lo que SÍ debo hacer):**
```
Usuario: "Crea PasoImagenes.tsx completo con useOptimisticUpload"

Claude: "Antes de generar este archivo, déjame verificar:

¿El archivo PasoImagenes.tsx ya existe en tu proyecto?

- Si SÍ → Compárteme el archivo actual para hacer solo 
  los cambios necesarios con str_replace
  
- Si NO → Confirmo que es un archivo completamente nuevo
  y lo genero desde cero

¿Cuál es el caso?"
```

---

### Paso 2: **Si el Archivo EXISTE → Pedir y Modificar**

```
Usuario: "Sí, ya existe en /apps/web/src/pages/..."

Claude: "Perfecto, compárteme el archivo actual 
PasoImagenes.tsx para hacer los cambios preservando 
tu código existente."

[Usuario comparte archivo]

Claude: [Usa str_replace para cambios quirúrgicos]
```

**Ventajas:**
- ✅ Preserva comentarios personales
- ✅ Mantiene lógica específica
- ✅ Respeta formato del usuario
- ✅ Cero riesgo de perder código

---

### Paso 3: **Si el Archivo NO EXISTE → Confirmar y Generar**

```
Usuario: "No, es un archivo completamente nuevo"

Claude: "Entendido, voy a generar PasoImagenes.tsx 
completo desde cero."

[Genera archivo nuevo]
```

---

## 🚫 CASOS PROHIBIDOS

### ❌ **NUNCA hacer esto:**

1. **Asumir que es archivo nuevo sin preguntar**
   ```
   Usuario: "Actualiza PasoContacto.tsx"
   Claude: [Genera 800 líneas sin preguntar]
   ❌ PROHIBIDO
   ```

2. **Generar archivo completo cuando solo necesita cambios pequeños**
   ```
   Usuario: "Agrega validación en el formulario"
   Claude: [Re-escribe 500 líneas]
   ❌ PROHIBIDO - Usar str_replace
   ```

3. **Re-escribir "porque es más rápido para mí"**
   ```
   Claude: "str_replace falló, mejor lo re-escribo todo"
   ❌ PROHIBIDO - Intentar fix o preguntar
   ```

4. **Generar múltiples versiones sin confirmación**
   ```
   Claude: "Te doy 3 opciones de código:"
   [Opción A: 400 líneas]
   [Opción B: 500 líneas]
   [Opción C: 600 líneas]
   ❌ PROHIBIDO - Preguntar qué necesita primero
   ```

---

## ⚙️ USO DE `str_replace`

### Cuándo Usar:
- ✅ Archivos >100 líneas con cambios localizados
- ✅ Agregar 1-10 líneas en lugares específicos
- ✅ Modificar funciones existentes
- ✅ Actualizar imports
- ✅ Cambiar lógica específica

### Cómo Usar:

```typescript
// 1. Identificar el fragmento EXACTO a cambiar
old_str: "const handleSubmit = () => {
  submitForm();
}"

// 2. Reemplazar con el nuevo código
new_str: "const handleSubmit = async () => {
  setIsLoading(true);
  await submitForm();
  setIsLoading(false);
}"
```

### Si `str_replace` Falla:

**Intentar 3 veces:**
1. Verificar line endings (CRLF vs LF)
2. Ajustar espaciado/indentación
3. Usar fragmento más pequeño

**Si sigue fallando:**
```
Claude: "str_replace falló después de 3 intentos por [razón].

Opciones:
A) Que tú hagas el cambio manualmente (te digo qué cambiar)
B) Copiar archivo, convertir line endings, retry
C) Re-escribir completo (RIESGOSO - pierdes tu código)

¿Cuál prefieres?"
```

---

## 📏 TABLA DE DECISIONES RÁPIDAS

| Situación | Líneas | Acción Correcta |
|-----------|--------|-----------------|
| Archivo nuevo confirmado | Cualquiera | Generar completo |
| Archivo existe, cambio pequeño | <100 | str_replace |
| Archivo existe, cambio pequeño | >100 | str_replace |
| Archivo existe, cambio grande | >100 | str_replace múltiple |
| No sé si existe | >100 | **PREGUNTAR PRIMERO** |
| Usuario dice "actualiza X" | >100 | **PREGUNTAR si existe** |
| Usuario dice "crea X completo" | >100 | **PREGUNTAR si existe** |

---

## 💡 FRASES CLAVE QUE DEBO DETECTAR

Cuando el usuario dice:

| Frase del Usuario | Mi Respuesta Correcta |
|-------------------|----------------------|
| "Crea/actualiza [archivo].tsx" | "¿Este archivo ya existe?" |
| "Modifica el componente X" | "¿Este archivo ya existe?" |
| "Genera [archivo] completo" | "¿Este archivo ya existe?" |
| "Agrega funcionalidad a Y" | "¿Este archivo ya existe?" |
| "Refactoriza [archivo]" | "Compárteme el archivo actual" |

**Si dice "NUEVO" explícitamente:**
```
Usuario: "Crea un NUEVO componente HeaderV2.tsx"
Claude: ✅ Puedo generar completo (es nuevo confirmado)
```

---

## 🎯 EJEMPLOS COMPLETOS

### ✅ Ejemplo CORRECTO 1:

```
Usuario: "Actualiza TabContacto.tsx para agregar 
validación de email"

Claude: "Antes de hacer los cambios, ¿el archivo 
TabContacto.tsx ya existe en tu proyecto?

Si SÍ → Compártelo para usar str_replace
Si NO → Lo genero nuevo completo"

Usuario: "Sí existe, aquí está: [comparte archivo]"

Claude: [Usa str_replace para agregar validación]
✅ Preservó todo el código existente
```

---

### ✅ Ejemplo CORRECTO 2:

```
Usuario: "Necesito un nuevo componente ModalConfirmacion.tsx 
con botones Aceptar/Cancelar"

Claude: "¿Este componente ya existe en tu proyecto o 
es completamente nuevo?"

Usuario: "Es nuevo"

Claude: "Perfecto, genero ModalConfirmacion.tsx 
completo desde cero."
✅ Confirmó que es nuevo antes de generar
```

---

### ❌ Ejemplo INCORRECTO:

```
Usuario: "Actualiza PasoHorarios.tsx para agregar toggle 
de 24 horas"

Claude: [Genera 800 líneas completas sin preguntar]

❌ Debió preguntar si existe primero
❌ Debió pedir el archivo
❌ Debió usar str_replace
```

---

## 🔐 COMPROMISO PERMANENTE

**Esta regla está guardada en mi memoria permanente.**

En **TODAS** las conversaciones (actuales y futuras):
- ✅ Preguntaré SIEMPRE antes de generar archivos >100 líneas
- ✅ Usaré str_replace como método principal
- ✅ Preservaré tu código existente
- ✅ No asumiré que algo es nuevo sin confirmar

**Si violo esta regla:**
- Recuérdamela mostrando este documento
- Es un error MÍO, no tuyo
- Me comprometo a corregirlo inmediatamente

---

## 📌 RESUMEN EN 3 PUNTOS

1. **Archivo >100 líneas → PREGUNTAR: "¿Ya existe?"**
2. **Si existe → PEDIR archivo y usar str_replace**
3. **Si no existe → CONFIRMAR que es nuevo antes generar**

---

**Documento guardado:** `/docs/REGLAS_MANEJO_ARCHIVOS.md`  
**Fecha de creación:** 07 Enero 2026  
**Última actualización:** 07 Enero 2026  
**Estado:** ACTIVO Y OBLIGATORIO
