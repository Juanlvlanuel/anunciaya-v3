/**
 * BarraBusquedaChat.tsx
 * ======================
 * Barra de búsqueda full-text dentro de una conversación.
 *
 * Se muestra al presionar la lupita 🔍 en el header de VentanaChat.
 * Reemplaza temporalmente el header normal con un input de búsqueda,
 * contador de resultados y flechas para navegar entre coincidencias.
 *
 * FLUJO:
 *   1. Usuario escribe → debounce 400ms → llama buscarMensajes() del store
 *   2. Resultados se muestran como highlight amarillo sobre las burbujas
 *   3. Flechas ↑↓ navegan entre coincidencias (scroll automático)
 *   4. X o ESC cierra la barra y limpia búsqueda
 *
 * BACKEND: GET /api/chatya/conversaciones/:id/buscar?texto=hola&limit=20
 *          Full-text search con to_tsvector('spanish')
 *
 * UBICACIÓN: apps/web/src/components/chatya/BarraBusquedaChat.tsx
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { X, ChevronUp, ChevronDown, Search, Loader2, ArrowLeft } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// =============================================================================
// TIPOS
// =============================================================================

interface BarraBusquedaChatProps {
  /** ID de la conversación activa donde buscar */
  conversacionId: string;
  /** Callback para cerrar la barra de búsqueda */
  onCerrar: () => void;
  /** Callback que emite el ID del mensaje actualmente seleccionado (para scroll + highlight) */
  onMensajeSeleccionado: (mensajeId: string | null) => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function BarraBusquedaChat({
  conversacionId,
  onCerrar,
  onMensajeSeleccionado,
}: BarraBusquedaChatProps) {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const resultadosBusqueda = useChatYAStore((s) => s.resultadosBusqueda);
  const totalResultadosBusqueda = useChatYAStore((s) => s.totalResultadosBusqueda);
  const cargandoBusqueda = useChatYAStore((s) => s.cargandoBusqueda);
  const buscarMensajes = useChatYAStore((s) => s.buscarMensajes);
  const limpiarBusqueda = useChatYAStore((s) => s.limpiarBusqueda);

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [texto, setTexto] = useState('');
  const [indiceActual, setIndiceActual] = useState(0);
  const { esMobile } = useBreakpoint();

  const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ---------------------------------------------------------------------------
  // Autofocus al montar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Limpiar al desmontar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      limpiarBusqueda();
      onMensajeSeleccionado(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [limpiarBusqueda, onMensajeSeleccionado]);

  // ---------------------------------------------------------------------------
  // Debounce: buscar después de 400ms sin escribir
  // ---------------------------------------------------------------------------
  const handleCambioTexto = useCallback(
    (valor: string) => {
      setTexto(valor);
      setIndiceActual(0);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (valor.trim().length < 2) {
        limpiarBusqueda();
        onMensajeSeleccionado(null);
        return;
      }

      debounceRef.current = setTimeout(() => {
        buscarMensajes(conversacionId, valor.trim());
      }, 400);
    },
    [conversacionId, buscarMensajes, limpiarBusqueda, onMensajeSeleccionado]
  );

  // ---------------------------------------------------------------------------
  // Emitir mensaje seleccionado cuando cambia el índice o los resultados
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (resultadosBusqueda.length > 0 && indiceActual < resultadosBusqueda.length) {
      onMensajeSeleccionado(resultadosBusqueda[indiceActual].id);
    } else {
      onMensajeSeleccionado(null);
    }
  }, [indiceActual, resultadosBusqueda, onMensajeSeleccionado]);

  // ---------------------------------------------------------------------------
  // Navegación entre resultados
  // ---------------------------------------------------------------------------
  const irAnterior = useCallback(() => {
    if (resultadosBusqueda.length === 0) return;
    setIndiceActual((prev) =>
      prev > 0 ? prev - 1 : resultadosBusqueda.length - 1
    );
  }, [resultadosBusqueda.length]);

  const irSiguiente = useCallback(() => {
    if (resultadosBusqueda.length === 0) return;
    setIndiceActual((prev) =>
      prev < resultadosBusqueda.length - 1 ? prev + 1 : 0
    );
  }, [resultadosBusqueda.length]);

  // ---------------------------------------------------------------------------
  // Atajos de teclado
  // ---------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Enter = siguiente resultado, Shift+Enter = anterior
        irSiguiente();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        irAnterior();
      }
    },
    [onCerrar, irSiguiente, irAnterior]
  );

  // ---------------------------------------------------------------------------
  // Texto del contador
  // ---------------------------------------------------------------------------
  const hayResultados = resultadosBusqueda.length > 0;
  const textoContador = texto.trim().length >= 2
    ? cargandoBusqueda
      ? ''
      : hayResultados
        ? `${indiceActual + 1} de ${totalResultadosBusqueda}`
        : 'Sin resultados'
    : '';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex items-center gap-0 min-w-0">
      {/* Flecha atrás — solo móvil (reemplaza la X) */}
      {esMobile && (
        <button
          onClick={onCerrar}
          className="w-8 h-9 -ml-2 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10 text-white/70 shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}

      {/* Input con fondo sutil */}
      <div className={`flex-1 flex items-center gap-2 px-3 ${esMobile ? 'h-11 bg-white/10' : 'h-10 bg-white/60 border border-slate-300'} rounded-full min-w-0`}>
        {/* Lupa — solo desktop */}
        {!esMobile && <Search className="w-4 h-4 text-slate-500 shrink-0" />}

        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={(e) => handleCambioTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar en la conversación..."
          className={`flex-1 text-[16px] font-medium bg-transparent outline-none min-w-0 ${esMobile ? 'text-white placeholder:text-white/40' : 'text-gray-700 placeholder:text-slate-400'}`}
        />

        {/* Spinner de carga */}
        {cargandoBusqueda && (
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
        )}

        {/* Contador de resultados */}
        {textoContador && (
          <span className={`text-xs whitespace-nowrap shrink-0 ${esMobile ? 'text-white/50' : 'text-slate-500'}`}>
            {textoContador}
          </span>
        )}

        {/* Flechas de navegación (solo si hay resultados) */}
        {hayResultados && (
          <>
            <button
              onClick={irAnterior}
              className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer ${esMobile ? 'text-white/50 hover:text-white active:text-blue-400 active:bg-white/10' : 'text-gray-500 hover:text-blue-500'}`}
              title="Anterior (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={irSiguiente}
              className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer ${esMobile ? 'text-white/50 hover:text-white active:text-blue-400 active:bg-white/10' : 'text-gray-500 hover:text-blue-500'}`}
              title="Siguiente (Enter)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Botón limpiar texto — solo móvil cuando hay texto */}
        {esMobile && texto.length > 0 && (
          <button
            onClick={() => handleCambioTexto('')}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Botón cerrar búsqueda — solo desktop (en móvil la flecha atrás lo reemplaza) */}
        {!esMobile && (
          <button
            onClick={onCerrar}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-400 cursor-pointer"
            title="Cerrar búsqueda (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default BarraBusquedaChat;