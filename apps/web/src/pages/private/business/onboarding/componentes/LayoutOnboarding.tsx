/**
 * LayoutOnboarding.tsx - TODO CENTRADO Y AJUSTADO
 * =================================================
 * Layout con TODOS los cards ajustados al contenido
 * 
 * CARACTERÍSTICAS:
 * - Logo card ajustado al contenido
 * - Pasos card ajustado al contenido  
 * - Pausar button ajustado al contenido
 * - Content card ajustado al contenido
 * - TODO centrado horizontalmente en la pantalla
 * - LAPTOP (lg): Reducido al 65% con scale(0.65)
 */

import { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { IndicadorPasos } from './IndicadorPasos';
import { BotonesNavegacion } from './BotonesNavegacion';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

// =============================================================================
// TIPOS
// =============================================================================

interface LayoutOnboardingProps {
  /** Contenido del paso actual */
  children: ReactNode;
  /** Título del paso */
  tituloPaso: string;
  /** Descripción del paso */
  descripcionPaso: string;
  /** Ícono del paso (componente Lucide) */
  iconoPaso: ReactNode;
  /** Función al hacer clic en "Pausar" */
  onPausar: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function LayoutOnboarding({
  children,
  tituloPaso,
  descripcionPaso,
  iconoPaso,
  onPausar,
}: LayoutOnboardingProps) {
  const pasoActual = useOnboardingStore(state => state.pasoActual);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-slate-50 to-blue-50">

      {/* ===================================================================== */}
      {/* LAYOUT MÓVIL (Vertical) */}
      {/* ===================================================================== */}
      <div className="lg:hidden flex flex-col min-h-screen">

        {/* Logo Flotante */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src="/logo-anunciaya.webp"
                alt="AnunciaYA"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Botón Pausar - Móvil */}
            <button
              onClick={onPausar}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm hover:bg-white rounded-lg shadow-md border border-white/50 transition-all text-sm font-medium"
            >
              <Clock className="w-5 h-5 shrink-0" />
              <span>Pausar</span>
            </button>
          </div>
        </div>

        {/* Indicador de Pasos */}
        <div className="px-4 pb-3 mt-8">
          <IndicadorPasos />
        </div>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto px-4 pb-24">
          {/* Header del paso */}
          <div className="flex items-start gap-3 mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0 shadow-sm">
              <div className="text-blue-600">
                {iconoPaso}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {tituloPaso}
              </h2>
              <p className="text-xs text-slate-600">
                {descripcionPaso}
              </p>
            </div>
          </div>

          {/* Contenido del paso */}
          {children}
        </main>

        {/* Footer Fijo */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 pb-safe shadow-lg">
          <BotonesNavegacion />
        </footer>
      </div>

      {/* ===================================================================== */}
      {/* LAYOUT LAPTOP + DESKTOP - GRID COMPLETAMENTE FIJO CON SCALE */}
      {/* ===================================================================== */}
      <div className="hidden lg:grid lg:place-items-center lg:min-h-screen lg:h-screen lg:overflow-hidden 2xl:p-8">

        {/* 
          Contenedor con grid de anchos FIJOS - NO CAMBIA NUNCA 
          LAPTOP (lg): Aplicar scale(0.80) para reducir todo al 80%
          DESKTOP (2xl): Sin scale, tamaño normal
          lg:-mt-12: Mueve el contenido 48px hacia arriba solo en laptop
        */}
        <div className="grid grid-cols-[240px_800px] 2xl:grid-cols-[280px_900px] gap-6 2xl:gap-8 lg:scale-[0.80] 2xl:scale-100 origin-center lg:-mt-10 2xl:mt-0">

          {/* ================================================================= */}
          {/* COLUMNA IZQUIERDA - Cards con Anchos Fijos */}
          {/* ================================================================= */}
          <aside className="flex flex-col space-y-4 2xl:space-y-5 w-60 2xl:w-[280px]">

            {/* Logo Flotante - Ancho Fijo */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 px-4 py-3 2xl:px-5 2xl:py-4 w-full flex items-center justify-center">
              <img
                src="/logo-anunciaya.webp"
                alt="AnunciaYA"
                className="h-12 2xl:h-14 w-auto object-contain"
              />
            </div>

            {/* Indicador de Pasos Flotante - Ancho Fijo */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 px-8 py-4 2xl:px-10 2xl:py-5 w-full">
              <IndicadorPasos />
            </div>

            {/* Botón Pausar Flotante - Más alto */}
            <button
              onClick={onPausar}
              className="flex items-center justify-center gap-2 px-8 py-4 2xl:px-10 2xl:py-5 text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl shadow-lg border border-white/50 transition-all text-sm 2xl:text-base font-medium hover:shadow-xl w-full"
            >
              <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 shrink-0" />
              <span className="truncate">Pausar progreso</span>
            </button>
          </aside>

          {/* ================================================================= */}
          {/* COLUMNA DERECHA - Content Card con Dimensiones FIJAS */}
          {/* ================================================================= */}
          <main className="w-[800px] 2xl:w-[900px]">

            {/* Content Card - Altura FIJA ajustada */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden h-[720px] max-h-[720px] 2xl:h-[780px] 2xl:max-h-[780px] flex flex-col">

              {/* Header del Paso */}
              <header className="bg-linear-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-slate-200/50 px-5 lg:px-6 2xl:px-8 py-4 lg:py-5 2xl:py-6">
                <div className="flex items-start gap-3 2xl:gap-4">
                  {/* Ícono */}
                  <div className="w-12 h-12 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-xl 2xl:rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0 shadow-md">
                    <div className="text-blue-600">
                      {iconoPaso}
                    </div>
                  </div>

                  {/* Título y Descripción */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl lg:text-2xl 2xl:text-3xl font-bold text-slate-900">
                        {tituloPaso}
                      </h2>
                      <span className="text-xs 2xl:text-sm text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                        {pasoActual}/8
                      </span>
                    </div>
                    <p className="text-sm lg:text-sm 2xl:text-base text-slate-600">
                      {descripcionPaso}
                    </p>
                  </div>
                </div>
              </header>

              {/* Contenido del Paso - Flex-1 con scroll si es necesario */}
              <div className="flex-1 overflow-y-auto px-5 lg:px-6 2xl:px-8 py-4 lg:py-5 2xl:py-6">
                {children}
              </div>

              {/* Footer con Botones */}
              <footer className="bg-linear-to-r from-white/90 to-white/70 backdrop-blur-sm border-t border-slate-200/50 px-5 lg:px-6 2xl:px-8 py-3 lg:py-4 2xl:py-5">
                <BotonesNavegacion />
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default LayoutOnboarding;