/**
 * useOnlineStatus.ts
 * ==================
 * Hook para detectar si hay conexión a internet.
 * 
 * ¿Qué hace?
 * - Escucha eventos 'online' y 'offline' del navegador
 * - Retorna true si hay conexión, false si no hay
 * 
 * ¿Dónde se usa?
 * - ScanYA: Indicador en header (🟢/🔴)
 * - AnunciaYA: Banner de "Sin conexión"
 * - Business Studio: Deshabilitar funciones offline
 * 
 * Ubicación: apps/web/src/hooks/useOnlineStatus.ts
 */

import { useState, useEffect } from 'react';

/**
 * Hook para detectar estado de conexión a internet
 * 
 * @returns boolean - true si hay conexión, false si no
 * 
 * @example
 * ```tsx
 * function MiComponente() {
 *   const online = useOnlineStatus();
 *   
 *   return (
 *     <div>
 *       {online ? '🟢 Conectado' : '🔴 Sin conexión'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  // Estado inicial basado en navigator.onLine
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Handlers para los eventos
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    // Registrar listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup: remover listeners al desmontar
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Sin dependencias - se ejecuta solo una vez

  return online;
}

export default useOnlineStatus;