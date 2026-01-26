/**
 * index.ts
 * ========
 * Barrel export para los pasos del onboarding
 * 
 * Ubicación: apps/web/src/pages/private/business/onboarding/pasos/index.ts
 */

export { default as PasoCategoria } from './PasoCategoria';
export { default as PasoUbicacion } from './PasoUbicacion';
export { PasoContacto } from './PasoContacto';
export { PasoHorarios } from './PasoHorarios';
export { PasoImagenes } from './PasoImagenes';
export { PasoMetodosPago } from './PasoMetodosPago';
export { PasoPuntos } from './PasoPuntos';
export { PasoProductos } from './PasoProductos';

// TODO: Exportar los demás pasos conforme se vayan creando
// export { default as PasoProductos } from './PasoProductos';