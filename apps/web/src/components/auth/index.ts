/**
 * Exportaciones de componentes de autenticación
 *
 * Ubicación: apps/web/src/components/auth/index.ts
 */

// Login y modales existentes
export { ModalLogin } from './ModalLogin';
export type { VistaAuth, DatosAuth } from './ModalLogin';

// Vistas individuales
export { VistaLogin } from './vistas/VistaLogin';
export { Vista2FA } from './vistas/Vista2FA';
export { VistaRecuperar } from './vistas/VistaRecuperar';
export { ModalInactividad } from './ModalInactividad';

// Componentes de registro
export {
  BrandingColumn,
  FormularioRegistro,
  ModalVerificacionEmail,
  ModalBienvenida,
} from './registro';
