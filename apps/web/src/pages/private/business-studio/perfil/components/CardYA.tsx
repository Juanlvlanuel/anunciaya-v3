/**
 * ============================================================================
 * COMPONENTE: CardYA
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/CardYA.tsx
 * 
 * PROPÓSITO:
 * Componente reutilizable para mostrar información y toggle de CardYA
 * 
 * MEJORAS MÓVIL:
 * - Acordeones colapsables para "Beneficios" y "¿Cómo Funciona?"
 * - Por defecto colapsado para reducir scroll
 * - Animaciones suaves
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CardYAProps {
  participaCardYA: boolean;
  onToggle: (valor: boolean) => void;
}

export default function CardYA({ participaCardYA, onToggle }: CardYAProps) {
  const navigate = useNavigate();
  
  // Estados para acordeones
  const [beneficiosAbierto, setBeneficiosAbierto] = useState(false);
  const [comoFuncionaAbierto, setComoFuncionaAbierto] = useState(false);

  return (
    <div className="bg-linear-to-br from-amber-50 to-orange-50/30 border-2 border-amber-300 rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden shadow-xl  origin-top">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-3 2xl:p-4 bg-white/50 border-b-2 border-amber-300">
        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
          <div className="w-12 h-12 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-lg lg:text-base 2xl:text-lg font-bold text-slate-900">CardYA</div>
            <div className="text-sm lg:text-xs 2xl:text-sm text-slate-600">Sistema de lealtad</div>
          </div>
        </div>
        
        {/* Toggle */}
        <button
          onClick={() => onToggle(!participaCardYA)}
          className={`
            relative inline-flex h-7 w-12 lg:h-7 lg:w-12 2xl:h-8 2xl:w-14 items-center rounded-full transition-all shadow-md cursor-pointer
            ${participaCardYA ? 'bg-amber-500' : 'bg-slate-300'}
          `}
        >
          <span className={`
            inline-block h-5.5 w-5.5 lg:h-5.5 lg:w-5.5 2xl:h-6.5 2xl:w-6.5 transform rounded-full bg-white transition-transform shadow-lg
            ${participaCardYA ? 'translate-x-5.5 lg:translate-x-5.5 2xl:translate-x-6.5' : 'translate-x-1'}
          `} />
        </button>
      </div>

      {/* Contenido */}
      {participaCardYA && (
        <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2.5 2xl:space-y-3">
          
          {/* Beneficios - ACORDEÓN EN MÓVIL / EXPANDIDO EN DESKTOP */}
          <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-green-300 shadow-md overflow-hidden">
            {/* Header - Clickable solo en móvil */}
            <button
              onClick={() => setBeneficiosAbierto(!beneficiosAbierto)}
              className="w-full flex items-center justify-between gap-2.5 lg:gap-2 2xl:gap-2.5 p-3 lg:p-2.5 2xl:p-3 hover:bg-green-50/50 lg:hover:bg-transparent transition-colors cursor-pointer lg:cursor-default"
            >
              <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5">
                <div className="w-8 h-8 lg:w-7.5 lg:h-7.5 2xl:w-8 2xl:h-8 rounded-lg lg:rounded-md 2xl:rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h4 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900">Beneficios</h4>
              </div>
              {/* Chevron solo visible en móvil */}
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform lg:hidden ${beneficiosAbierto ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Contenido - Condicional en móvil, siempre visible en desktop */}
            <ul className={`space-y-2.5 lg:space-y-2 2xl:space-y-2.5 px-3 pb-3 lg:px-2.5 lg:pb-2.5 2xl:px-3 2xl:pb-3 ${beneficiosAbierto ? 'block' : 'hidden'} lg:block`}>
              <li className="flex items-start gap-2.5 lg:gap-2 2xl:gap-2.5">
                <div className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">Clientes Recurrentes</div>
                  <div className="text-sm lg:text-xs 2xl:text-sm text-slate-600 mt-0.5">Los puntos incentivan a regresar</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5 lg:gap-2 2xl:gap-2.5">
                <div className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">Mayor Ticket Promedio</div>
                  <div className="text-sm lg:text-xs 2xl:text-sm text-slate-600 mt-0.5">Compran más para ganar puntos</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5 lg:gap-2 2xl:gap-2.5">
                <div className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">Sin Costo Adicional</div>
                  <div className="text-sm lg:text-xs 2xl:text-sm text-slate-600 mt-0.5">Incluido en tu membresía</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Cómo Funciona - ACORDEÓN EN MÓVIL / EXPANDIDO EN DESKTOP */}
          <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-blue-300 shadow-md overflow-hidden">
            {/* Header - Clickable solo en móvil */}
            <button
              onClick={() => setComoFuncionaAbierto(!comoFuncionaAbierto)}
              className="w-full flex items-center justify-between gap-2.5 lg:gap-2 2xl:gap-2.5 p-3 lg:p-2.5 2xl:p-3 hover:bg-blue-50/50 lg:hover:bg-transparent transition-colors cursor-pointer lg:cursor-default"
            >
              <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5">
                <div className="w-8 h-8 lg:w-7.5 lg:h-7.5 2xl:w-8 2xl:h-8 rounded-lg lg:rounded-md 2xl:rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900">¿Cómo Funciona?</h4>
              </div>
              {/* Chevron solo visible en móvil */}
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform lg:hidden ${comoFuncionaAbierto ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Contenido - Condicional en móvil, siempre visible en desktop */}
            <ol className={`space-y-2.5 lg:space-y-2 2xl:space-y-2.5 px-3 pb-3 lg:px-2.5 lg:pb-2.5 2xl:px-3 2xl:pb-3 ${comoFuncionaAbierto ? 'block' : 'hidden'} lg:block`}>
              <li className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
                <div className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-white">1</span>
                </div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800">Cliente compra en tu negocio</div>
              </li>
              <li className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
                <div className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-white">2</span>
                </div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800">Escaneas su código QR con ScanYA</div>
              </li>
              <li className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
                <div className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-white">3</span>
                </div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800">Puntos se acreditan automáticamente</div>
              </li>
              <li className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
                <div className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-white">4</span>
                </div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800">Cliente canjea puntos por descuentos</div>
              </li>
            </ol>
          </div>

          {/* CTA Configurar - DISEÑO SUTIL */}
          <button
            onClick={() => navigate('/business-studio/puntos')}
            className="w-full flex items-center justify-between gap-3 p-4 lg:p-3 2xl:p-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-blue-400 rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
              <div className="w-11 h-11 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 rounded-lg lg:rounded-md 2xl:rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">Configurar Puntos</div>
                <div className="text-sm lg:text-xs 2xl:text-sm text-slate-600">Define sistema de recompensas</div>
              </div>
            </div>
            <svg className="w-6 h-6 lg:w-5.5 lg:h-5.5 2xl:w-6 2xl:h-6 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

        </div>
      )}

    </div>
  );
}