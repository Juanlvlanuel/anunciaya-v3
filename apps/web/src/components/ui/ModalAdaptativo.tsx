/**
 * ModalAdaptativo.tsx (v2.0 - FIX TIPOS REACT)
 * ============================================
 * Wrapper que renderiza automáticamente el modal correcto según dispositivo:
 *   - Móvil (< 1024px)  → ModalBottom (bottom sheet, drag para cerrar)
 *   - Escritorio (≥ 1024px) → Modal (centrado, fade+scale)
 *
 * CAMBIOS v2.0:
 * - ✅ titulo cambiado de string a ReactNode (acepta JSX)
 * - ✅ Ahora permite títulos complejos con elementos React
 * - ✅ Corrige warning: "El tipo 'Element' no se puede asignar al tipo 'string'"
 *
 * ¿Por qué existe?
 *   Modal.tsx y ModalBottom.tsx siguen existiendo por separado para casos
 *   donde se necesita forzar uno u otro (ej: modal sobre modal en móvil
 *   debe ser centrado). ModalAdaptativo es el componente por defecto
 *   para nuevos modales y formularios.
 *
 * Prop especial:
 *   centrado → Fuerza Modal centrado sin importar el dispositivo.
 *              Útil para modales hijos que abren encima de un ModalBottom.
 *
 * Uso:
 *   <ModalAdaptativo abierto={...} onCerrar={...} titulo="Editar" ancho="lg">
 *     <form>...</form>
 *   </ModalAdaptativo>
 *
 *   // Con título JSX:
 *   <ModalAdaptativo 
 *     abierto={...} 
 *     onCerrar={...} 
 *     titulo={<div className="flex gap-2"><span>Editar</span><Badge>Nuevo</Badge></div>}
 *   >
 *     <form>...</form>
 *   </ModalAdaptativo>
 *
 *   // Modal hijo forzado centrado (encima de bottom sheet):
 *   <ModalAdaptativo abierto={...} onCerrar={...} titulo="Confirmar" centrado>
 *     <p>¿Estás seguro?</p>
 *   </ModalAdaptativo>
 *
 * Ubicación: apps/web/src/components/ui/ModalAdaptativo.tsx
 */

import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { ModalBottom } from './ModalBottom';
import useBreakpoint from '../../hooks/useBreakpoint';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalAdaptativoProps {
  /** ¿Está abierto? */
  abierto: boolean;
  /** Función para cerrar el modal */
  onCerrar: () => void;
  /** Título del modal (opcional) - Acepta string o JSX */
  titulo?: ReactNode;
  /** Icono junto al título (opcional) - Acepta cualquier elemento React */
  iconoTitulo?: ReactNode;
  /** Contenido del modal */
  children: ReactNode;
  /** ¿Cerrar al hacer clic fuera? (default: true) */
  cerrarAlClickFuera?: boolean;
  /** ¿Cerrar con tecla Escape? (default: true) */
  cerrarConEscape?: boolean;
  /** ¿Mostrar botón de cerrar (X)? (default: true) */
  mostrarBotonCerrar?: boolean;
  /** ¿Mostrar header? (default: true) */
  mostrarHeader?: boolean;
  /** Clases CSS adicionales */
  className?: string;

  // --- Props exclusivas de Modal (escritorio) ---

  /** Ancho máximo en escritorio: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Padding del contenido en escritorio */
  paddingContenido?: 'none' | 'sm' | 'md' | 'lg';

  // --- Props exclusivas de ModalBottom (móvil) ---

  /** ¿Desactivar scroll interno en móvil? */
  sinScrollInterno?: boolean;
  /** Altura máxima en móvil: 'sm' | 'md' | 'lg' */
  alturaMaxima?: 'sm' | 'md' | 'lg';

  // --- Prop especial ---

  /** Fuerza Modal centrado sin importar dispositivo (ej: modal sobre modal) */
  centrado?: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalAdaptativo({
  abierto,
  onCerrar,
  titulo,
  iconoTitulo,
  children,
  cerrarAlClickFuera,
  cerrarConEscape,
  mostrarBotonCerrar,
  mostrarHeader,
  className,
  // Props Modal (escritorio)
  ancho = 'md',
  paddingContenido = 'md',
  // Props ModalBottom (móvil)
  sinScrollInterno = false,
  alturaMaxima = 'lg',
  // Especial
  centrado = false,
}: ModalAdaptativoProps) {
  const { esMobile } = useBreakpoint();

  // Si es móvil Y no se fuerza centrado → ModalBottom
  if (esMobile && !centrado) {
    return (
      <ModalBottom
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={titulo}
        iconoTitulo={iconoTitulo}
        cerrarAlClickFuera={cerrarAlClickFuera}
        cerrarConEscape={cerrarConEscape}
        mostrarBotonCerrar={mostrarBotonCerrar}
        mostrarHeader={mostrarHeader}
        sinScrollInterno={sinScrollInterno}
        alturaMaxima={alturaMaxima}
      >
        {children}
      </ModalBottom>
    );
  }

  // Escritorio O forzado centrado → Modal
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      iconoTitulo={iconoTitulo}
      ancho={ancho}
      paddingContenido={paddingContenido}
      cerrarAlClickFuera={cerrarAlClickFuera}
      cerrarConEscape={cerrarConEscape}
      mostrarBotonCerrar={mostrarBotonCerrar}
      mostrarHeader={mostrarHeader}
      className={className}
    >
      {children}
    </Modal>
  );
}

export default ModalAdaptativo;