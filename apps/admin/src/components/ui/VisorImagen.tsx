/**
 * VisorImagen.tsx
 * ================
 * Visor reutilizable de UNA imagen a pantalla completa (lightbox) para el Panel.
 * Equivalente al `ModalImagenes` de la app pública (AY), adaptado al Panel: imagen
 * única (avatar, logo, evidencia), overlay oscuro, imagen en `object-contain`.
 *
 * Cierra con: botón ✕, clic en el fondo, o tecla Escape. Bloquea el scroll del body
 * mientras está abierto y se renderiza en un portal sobre `document.body` (encima de
 * cualquier modal). Pensado para escritorio (uso principal del Panel).
 *
 * Uso:
 *   <VisorImagen src={url} alt="Foto" abierto={abierto} onCerrar={() => setAbierto(false)} />
 *
 * Ubicación: apps/admin/src/components/ui/VisorImagen.tsx
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface VisorImagenProps {
  /** URL de la imagen. Si es null/vacía, el visor no se muestra. */
  src: string | null;
  alt?: string;
  abierto: boolean;
  onCerrar: () => void;
}

export function VisorImagen({ src, alt = '', abierto, onCerrar }: VisorImagenProps) {
  // Escape para cerrar + bloqueo de scroll del body mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = scrollPrevio;
    };
  }, [abierto, onCerrar]);

  if (!abierto || !src) return null;

  return createPortal(
    <div
      className="animar-entrada fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.86) 100%)' }}
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      data-testid="visor-imagen"
    >
      <button
        type="button"
        data-testid="visor-imagen-cerrar"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white/90 transition hover:bg-peligro hover:text-white"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] rounded-[14px] object-contain shadow-2xl"
      />
    </div>,
    document.body,
  );
}

export default VisorImagen;
