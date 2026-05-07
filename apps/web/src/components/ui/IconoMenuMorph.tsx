/**
 * IconoMenuMorph.tsx
 * ===================
 * Icono "hamburguesa → X → hamburguesa" en loop sutil. Reemplaza el Menu
 * de lucide en los headers de las 3 secciones públicas (Negocios, Ofertas,
 * MarketPlace) para llamar la atención del usuario sobre el menú lateral
 * sin ser intrusivo.
 *
 * Animación: ~5s. Pasa la mayor parte del tiempo como hamburguesa,
 * brevemente se transforma en X, vuelve a hamburguesa.
 *
 * Tamaño: width="24" height="24" (igual que `<Menu className="w-6 h-6" />`).
 *
 * Ubicación: apps/web/src/components/ui/IconoMenuMorph.tsx
 */

interface Props {
  className?: string;
}

export function IconoMenuMorph({ className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 ${className}`}
      aria-hidden="true"
    >
      <span className="relative w-[18px] h-[14px]">
        {/* Tres barras absolutas: top / mid / bot. Las animaciones rotan
            top/bot ±45° y desplazan al centro durante la fase X. */}
        <span
          className="absolute left-0 right-0 h-[2.5px] rounded-full bg-current origin-center"
          style={{ top: 0, animation: 'menumorph-top 5s ease-in-out infinite' }}
        />
        <span
          className="absolute left-0 right-0 h-[2.5px] rounded-full bg-current origin-center"
          style={{ top: '50%', marginTop: '-1.25px', animation: 'menumorph-mid 5s ease-in-out infinite' }}
        />
        <span
          className="absolute left-0 right-0 h-[2.5px] rounded-full bg-current origin-center"
          style={{ bottom: 0, animation: 'menumorph-bot 5s ease-in-out infinite' }}
        />
      </span>
      <style>{`
        @keyframes menumorph-top {
          0%, 30%, 90%, 100% { transform: translateY(0) rotate(0deg); }
          45%, 75% { transform: translateY(5.75px) rotate(45deg); }
        }
        @keyframes menumorph-bot {
          0%, 30%, 90%, 100% { transform: translateY(0) rotate(0deg); }
          45%, 75% { transform: translateY(-5.75px) rotate(-45deg); }
        }
        @keyframes menumorph-mid {
          0%, 30%, 90%, 100% { opacity: 1; transform: scaleX(1); }
          45%, 75% { opacity: 0; transform: scaleX(0); }
        }
      `}</style>
    </span>
  );
}

export default IconoMenuMorph;
