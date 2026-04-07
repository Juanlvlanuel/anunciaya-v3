/**
 * PanelPerformance.tsx
 * =====================
 * Panel flotante de monitoreo de performance para Business Studio.
 * Solo visible cuando window.__PERF_BS__ === true.
 *
 * Detecta cambios de ruta interceptando history.pushState y el evento popstate,
 * sin depender de useLocation (el panel vive fuera del RouterProvider).
 *
 * Ubicación: apps/web/src/components/ui/PanelPerformance.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitor';

declare global {
  interface Window { __PERF_BS__?: boolean; }
}

export function PanelPerformance() {
  const [activo, setActivo] = useState(false);
  const [contadores, setContadores] = useState({ navegaciones: 0, llamadasAPI: 0 });
  const rutaRef = useRef(window.location.pathname);

  // Detectar cambios de ruta — polling cada 200ms (compatible con React Router v6)
  useEffect(() => {
    const intervaloRuta = setInterval(() => {
      const rutaActual = window.location.pathname;
      if (rutaActual !== rutaRef.current) {
        rutaRef.current = rutaActual;
        if (window.__PERF_BS__) {
          performanceMonitor.registrarNavegacion(rutaActual);
        }
      }
    }, 200);

    return () => clearInterval(intervaloRuta);
  }, []);

  // Polling: detectar activación y actualizar contadores cada segundo
  useEffect(() => {
    const intervalo = setInterval(() => {
      const estaActivo = !!window.__PERF_BS__;
      setActivo(estaActivo);
      if (estaActivo) {
        setContadores(performanceMonitor.obtenerContadores());
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  if (!activo) return null;

  function handleDescargar() {
    performanceMonitor.descargarReporte();
  }

  function handleLimpiar() {
    performanceMonitor.limpiar();
    setContadores({ navegaciones: 0, llamadasAPI: 0 });
  }

  return (
    <div
      className="fixed bottom-20 left-4 z-9999 w-52 rounded-xl bg-zinc-900/95 border border-zinc-700 shadow-2xl p-3 flex flex-col gap-2 text-xs font-mono"
      data-testid="panel-performance"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 font-semibold tracking-wide uppercase text-[10px]">
          Perf Monitor
        </span>
      </div>

      {/* Contadores */}
      <div className="flex flex-col gap-1 text-zinc-300">
        <div className="flex justify-between">
          <span className="text-zinc-500">Navegaciones</span>
          <span className="text-white font-bold">{contadores.navegaciones}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Llamadas API</span>
          <span className="text-white font-bold">{contadores.llamadasAPI}</span>
        </div>
      </div>

      {/* Separador */}
      <div className="border-t border-zinc-700" />

      {/* Botones */}
      <button
        data-testid="panel-performance-descargar"
        onClick={handleDescargar}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-2 text-[11px] font-semibold transition-colors"
      >
        Descargar reporte
      </button>
      <button
        data-testid="panel-performance-limpiar"
        onClick={handleLimpiar}
        className="w-full rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 py-1.5 px-2 text-[11px] transition-colors"
      >
        Limpiar
      </button>
    </div>
  );
}
