/**
 * IndicadorEscribiendo.tsx
 * =========================
 * Animación de 3 puntos que aparece cuando el otro participante está escribiendo.
 * Se posiciona como una burbuja del lado izquierdo (del otro).
 *
 * UBICACIÓN: apps/web/src/components/chatya/IndicadorEscribiendo.tsx
 */

export function IndicadorEscribiendo() {
  return (
    <div className="self-start bg-white px-3.5 py-2.5 rounded-[14px] rounded-bl-[5px] shadow-[0_1px_4px_rgba(15,29,58,0.08)] border border-gray-100 flex items-center gap-[5px]">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[typing_1.2s_infinite]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[typing_1.2s_0.15s_infinite]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[typing_1.2s_0.3s_infinite]" />
    </div>
  );
}

export default IndicadorEscribiendo;
