/**
 * index.ts
 * =========
 * Barrel export de componentes del onboarding.
 * 
 * Permite importar así:
 *   import { LayoutOnboarding, IndicadorPasos } from './componentes';
 * 
 * En lugar de:
 *   import { LayoutOnboarding } from './componentes/LayoutOnboarding';
 *   import { IndicadorPasos } from './componentes/IndicadorPasos';
 * 
 * Ubicación: apps/web/src/pages/private/business/onboarding/componentes/index.ts
 */

export { LayoutOnboarding } from './LayoutOnboarding';
export { IndicadorPasos } from './IndicadorPasos';
export { BotonesNavegacion } from './BotonesNavegacion';
export { ModalPausar } from './ModalPausar';
export { ModalAgregarProducto } from './ModalAgregarProducto';