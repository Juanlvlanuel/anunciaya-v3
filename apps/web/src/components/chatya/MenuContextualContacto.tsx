/**
 * MenuContextualContacto.tsx
 * ===========================
 * Menú contextual para items de la lista de contactos.
 * Se activa con clic derecho o long press.
 * Opciones: Editar alias, Quitar contacto.
 *
 * UBICACIÓN: apps/web/src/components/chatya/MenuContextualContacto.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Pencil, UserMinus, X, Check } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import type { Contacto } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface MenuContextualContactoProps {
  contacto: Contacto;
  posicion: { x: number; y: number };
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function MenuContextualContacto({ contacto, posicion, onCerrar }: MenuContextualContactoProps) {
  const eliminarContacto = useChatYAStore((s) => s.eliminarContacto);
  const editarAliasContacto = useChatYAStore((s) => s.editarAliasContacto);

  const [editando, setEditando] = useState(false);
  const [valorAlias, setValorAlias] = useState(contacto.alias || '');

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Nombre a mostrar como referencia en modo edición
  const nombreReal = contacto.negocioNombre
    ? contacto.negocioNombre
    : `${contacto.nombre || ''} ${contacto.apellidos || ''}`.trim();

  // ---------------------------------------------------------------------------
  // Cerrar al hacer click fuera
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCerrar();
      }
    }
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 150);
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick); };
  }, [onCerrar]);

  // Focus al input cuando entra modo edición
  useEffect(() => {
    if (editando) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editando]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleEditarAlias = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValorAlias(contacto.alias || '');
    setEditando(true);
  };

  const handleGuardar = async () => {
    const aliasLimpio = valorAlias.trim() || null;
    onCerrar();
    await editarAliasContacto(contacto.id, aliasLimpio);
  };

  const handleEliminar = async () => {
    onCerrar();
    await eliminarContacto(contacto.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGuardar();
    if (e.key === 'Escape') onCerrar();
  };

  // ---------------------------------------------------------------------------
  // Posición ajustada para no salirse de la pantalla
  // ---------------------------------------------------------------------------
  const style: React.CSSProperties = {
    position: 'fixed',
    left: posicion.x,
    top: posicion.y,
    zIndex: 50,
  };

  // ---------------------------------------------------------------------------
  // Render — modo edición
  // ---------------------------------------------------------------------------
  if (editando) {
    return (
      <div
        ref={menuRef}
        style={style}
        className="w-64 bg-white rounded-xl shadow-2xl border border-black/8 overflow-hidden"
      >
        {/* Header con info del contacto */}
        <div className="px-3.5 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Pencil className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-gray-800 truncate">{nombreReal}</p>
            {contacto.sucursalNombre && (
              <p className="text-[12px] text-gray-400 font-medium truncate">suc. {contacto.sucursalNombre}</p>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="px-3.5 py-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={valorAlias}
              onChange={(e) => setValorAlias(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un alias..."
              maxLength={60}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white transition-colors pr-7"
            />
            {valorAlias && (
              <button
                onClick={() => setValorAlias('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={onCerrar}
              className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[12px] font-medium hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="flex-1 py-1.5 rounded-lg bg-blue-500 text-white text-[12px] font-semibold hover:bg-blue-600 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — menú principal
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={menuRef}
      style={style}
      className="w-44 bg-white rounded-xl shadow-2xl border border-black/8 py-1 overflow-hidden"
    >
      <button
        onClick={handleEditarAlias}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
      >
        <Pencil className="w-4 h-4 text-gray-400 shrink-0" />
        Editar alias
      </button>
      <div className="border-t border-gray-100 mx-2" />
      <button
        onClick={handleEliminar}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-red-500 hover:bg-red-50 cursor-pointer"
      >
        <UserMinus className="w-4 h-4 text-red-400 shrink-0" />
        Quitar contacto
      </button>
    </div>
  );
}

export default MenuContextualContacto;