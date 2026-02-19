/**
 * ListaConversaciones.tsx
 * ========================
 * Lista scrolleable de conversaciones del usuario.
 * Conversaciones fijadas aparecen arriba.
 * Incluye buscador por nombre.
 * Skeleton durante carga inicial.
 *
 * Se usa tanto en desktop (panel izquierdo del split) como en móvil (vista completa).
 *
 * UBICACIÓN: apps/web/src/components/chatya/ListaConversaciones.tsx
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, MessageSquarePlus } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ConversacionItem } from './ConversacionItem';
import type { ModoChatYA } from '../../types/chatya';

// =============================================================================
// COMPONENTE
// =============================================================================

export function ListaConversaciones() {
  const conversaciones = useChatYAStore((s) => s.conversaciones);
  const cargando = useChatYAStore((s) => s.cargandoConversaciones);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
  const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);

  const modoActivo = (useAuthStore((s) => s.usuario?.modoActivo) || 'personal') as ModoChatYA;

  const [busqueda, setBusqueda] = useState('');

  // Cargar conversaciones al montar y cuando cambia el modo
  useEffect(() => {
    cargarConversaciones(modoActivo);
  }, [modoActivo, cargarConversaciones]);

  // Filtrar y ordenar: fijadas primero, luego por fecha
  const conversacionesFiltradas = useMemo(() => {
    let lista = [...conversaciones];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      lista = lista.filter((c) => {
        const nombre = c.otroParticipante?.nombre?.toLowerCase() || '';
        const apellidos = c.otroParticipante?.apellidos?.toLowerCase() || '';
        const negocio = c.otroParticipante?.negocioNombre?.toLowerCase() || '';
        return nombre.includes(termino) || apellidos.includes(termino) || negocio.includes(termino);
      });
    }

    // Separar fijadas y no fijadas
    const fijadas = lista.filter((c) => c.fijada);
    const noFijadas = lista.filter((c) => !c.fijada);

    return [...fijadas, ...noFijadas];
  }, [conversaciones, busqueda]);

  // ---------------------------------------------------------------------------
  // Skeleton de carga
  // ---------------------------------------------------------------------------
  if (cargando && conversaciones.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
        {/* Buscador skeleton */}
        <div className="px-2.5 py-2 shrink-0">
          <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        {/* Items skeleton */}
        <div className="px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2.5">
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Estado vacío
  // ---------------------------------------------------------------------------
  if (conversaciones.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
          <MessageSquarePlus className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Sin conversaciones</p>
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          Inicia un chat desde el perfil de un negocio o contacto
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Buscador */}
      <div className="px-2.5 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar chat..."
            className="w-full pl-8 pr-3 py-[7px] bg-gray-100 border border-gray-200 rounded-lg text-[11px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {conversacionesFiltradas.length === 0 ? (
          <p className="text-[10px] text-gray-400 text-center py-6">
            No se encontraron resultados
          </p>
        ) : (
          conversacionesFiltradas.map((conv) => (
            <ConversacionItem
              key={conv.id}
              conversacion={conv}
              activa={conv.id === conversacionActivaId}
              onClick={() => abrirConversacion(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ListaConversaciones;