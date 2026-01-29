import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * BotonInstalarScanYA
 * ====================
 * Botón simple que navega a /scanya/login donde el usuario puede instalar la PWA.
 * 
 * Ubicación: apps/web/src/components/scanya/BotonInstalarScanYA.tsx
 */
export function BotonInstalarScanYA() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/scanya/login');
  };

  return (
    <button 
      onClick={handleClick} 
      className="w-full relative group overflow-visible"
      aria-label="Ir a ScanYA"
    >
      <div className="flex items-center justify-center gap-2 lg:p-2.5 2xl:p-3 p-3 bg-linear-to-br from-gray-900 to-blue-600 hover:from-black hover:to-blue-800 text-white rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.03]">
        {/* Logo de ScanYA */}
        <img 
          src="/ScanYA-Blanco.webp" 
          alt="ScanYA" 
          className="h-7 lg:h-6 2xl:h-6 w-auto object-contain"
        />
        <ChevronRight className="lg:w-4 2xl:w-5 w-5 ml-auto group-hover:translate-x-1 transition-transform" />
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-white/40 to-transparent"></div>
    </button>
  );
}

export default BotonInstalarScanYA;